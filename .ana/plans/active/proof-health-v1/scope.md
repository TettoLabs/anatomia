# Scope: Proof Health V1

**Created by:** Ana
**Date:** 2026-04-29

## Intent

The developer wants to see quality trajectory across pipeline runs. `ana proof health` computes severity-weighted metrics, identifies hot modules, surfaces promotion candidates, and reports on promotion effectiveness. The `work complete` output gains a change-driven fourth line that surfaces health insights when something shifted since the last run. Health is the measurement layer that validates the severity taxonomy, informs promotion decisions, and provides the north star metric (risks/run trending down).

## Complexity Assessment
- **Size:** medium
- **Files affected:**
  - `packages/cli/src/commands/proof.ts` — new `health` subcommand registration, terminal display
  - `packages/cli/src/utils/proofSummary.ts` — `computeHealthReport` function (trajectory, hot modules, candidates), extend `ChainHealth` or new `HealthReport` type
  - `packages/cli/src/commands/work.ts` — fourth line in `completeWork` output (both human and JSON paths)
  - `packages/cli/src/types/proof.ts` — `HealthReport` result type if needed
  - Test files: `tests/commands/proof.test.ts`, `tests/utils/proofSummary.test.ts`, `tests/commands/work.test.ts`
- **Blast radius:** Low-medium. Health is a new read-only command. The fourth line modifies `completeWork` output (both terminal and `--json`). No schema changes. No proof chain mutations. No template changes.
- **Estimated effort:** One pipeline scope
- **Multi-phase:** no

## Approach

Health V1 has two surfaces: the `ana proof health` command and the fourth line in `work complete`.

**The command** is a read-only subcommand on `proof`, following the same pattern as `audit` and `context`. It reads `proof_chain.json`, computes trajectory, groups findings by file for hot modules, groups by `suggested_action` for promotion candidates, and checks for existing promotions. Terminal output is a structured dashboard. `--json` follows the four-key envelope contract.

**The computation** lives in `proofSummary.ts` as a pure function — same layering as `computeChainHealth`. The command calls the function and formats the output. The function is independently testable with synthetic chain data.

**The fourth line** in `work complete` appears when something CHANGED since the previous entry — not when conditions merely exist. A line that's always there becomes invisible. A line that appears when something shifts gets read. The computation reuses the health function, comparing the current entry's contribution to the previous trajectory.

**The trajectory** is computed per-entry, not per-time-period. `risks_per_run` = average count of `severity: risk` findings per entry over the last N entries. "Last 5" is the recent window. "All" is lifetime. Trend compares last 5 to previous 5: rising, improving, or stable (within 15%). Entries don't happen at regular intervals, but the metric is per-run quality, not per-day — so entry-based averaging is correct.

**Change detection** for the fourth line doesn't require persisting previous health state. The chain IS the history. Compare the trajectory computed with the new entry vs without it (or vs the trajectory at the previous entry). If the trend direction changed, or a new module crossed the hot threshold, or new `promote` candidates appeared that weren't in the previous entry's cumulative set — show the fourth line.

## Acceptance Criteria
- AC1: `ana proof health` displays severity breakdown, action breakdown, trajectory (risks/run last 5, lifetime, trend), hot modules (top 5 by active finding count), and promotion candidates (findings with `suggested_action: promote`, plus recurring `scope` findings)
- AC2: `ana proof health --json` outputs the four-key envelope with `command: "proof health"` and `results` containing runs, severity, actions, trajectory, hot_modules, promotion_candidates, promotions
- AC3: `work complete` (non-JSON) displays a fourth line when health detects a change: trajectory direction shift, new promote candidates, or a module crossing the hot threshold (3+ active findings from 2+ entries)
- AC4: `work complete --json` includes health change data in the `results` object (a `quality` key or similar) so AI consumers can read it without parsing terminal text
- AC5: `ana proof health` with an empty chain outputs zeros and no errors
- AC6: `ana proof health` with pre-backfill data (findings lacking severity) counts them as `unclassified` in the trajectory — the metric is computed on classified findings only, unclassified are reported separately
- AC7: Promotion effectiveness section displays "tracking..." for promoted findings with fewer than 5 subsequent entries, and computes reduction percentage when data is sufficient
- AC8: The fourth line does NOT appear when nothing changed — if trajectory is stable, no new candidates, no new hot modules, the third line (chain summary) is the last line

## Edge Cases & Risks

**Trajectory with few entries.** With < 5 entries, "last 5" is "all." With < 10, "previous 5" doesn't exist for trend comparison. Handle gracefully: trend is "insufficient data" until 10 entries exist.

**All findings unclassified.** Before Phase E backfill completes, most findings lack severity. Trajectory should report the unclassified count prominently and compute risks/run on classified findings only. If zero classified findings exist, trajectory reports "no classified data" not "0 risks/run."

**Hot module with only observations.** A module with 8 active findings all classified as `observation` is technically hot but not actionable. The hot module display shows the severity breakdown per module so the developer can distinguish "hot with risks" from "hot with observations."

**Fourth line on first run.** Entry #1 has no previous entry to compare against. No fourth line on the first run. The fourth line is about change, and there's no baseline yet.

**Promotion effectiveness with no promotions.** The section simply doesn't appear. No "0 promotions" message — that's noise.

**`--json` fourth line data.** The `work complete --json` output must include health change data in `results`, not just in terminal display. AI consumers read JSON, not chalk-formatted text. The `quality` key (or similar) in results should contain: whether a change was detected, the trajectory, and any specific trigger that fired.

## Rejected Approaches

**Health as a separate file (health.ts).** proof.ts is 795 lines with close, audit, context, list, detail. Health adds ~80 lines of display code. The computation lives in proofSummary.ts. Adding health to proof.ts keeps it under 900 lines — acceptable. A separate file creates an import/registration pattern that doesn't exist for other proof subcommands. Follow the established pattern.

**Trajectory weighted by time.** Entries don't happen at regular intervals. A burst of 5 runs in a day followed by a week gap would distort time-weighted averages. Per-entry averaging is the right model because the metric is "how many risks does a typical pipeline run produce" — not "how many risks per calendar day."

**State-driven fourth line triggers.** "Show when risk findings exist" would fire on almost every run, making the line permanent and invisible. Change-driven triggers (trajectory shift, new candidates, threshold crossing) only fire when something is different. This is the "surface what matters, not what checks a box" principle — the line earns its appearance by having something new to say.

**Persisted health baseline.** Storing previous health output in `.ana/health-baseline.json` for change detection. Unnecessary — the chain entries ARE the history. Computing health with and without the latest entry gives the before/after comparison without a separate file.

## Open Questions

Design decisions resolved in the F4 requirements session. No open questions for Plan.

## Exploration Findings

### Patterns Discovered
- `computeChainHealth` (proofSummary.ts:701-756) already iterates every finding and counts by severity/action. Health extends this with per-entry trajectory computation and grouping operations.
- `wrapJsonResponse` (proofSummary.ts:767) wraps any results in the four-key envelope. Health uses this identically to close and audit.
- Audit subcommand (proof.ts:569-736) is the structural analog — read-only, read chain, compute, format terminal + JSON. ~170 lines for the subcommand registration + display.
- `completeWork` (work.ts:1015-1349) has the terminal output at lines 1341-1348 (3 lines: status, contract, chain summary). The fourth line goes after line 1347. The JSON output at lines 1316-1339 needs a `quality` key in `jsonResults`.

### Constraints Discovered
- [TYPE-VERIFIED] `ChainHealth` (proofSummary.ts:644) is the meta block type. Health's full report is a superset — trajectory, hot modules, candidates are NOT in ChainHealth. Health needs its own result type that includes ChainHealth plus the new fields.
- [OBSERVED] `computeChainHealth` counts ALL findings (active + closed + lesson). Trajectory should count risk findings on NEW entries only (the findings produced by that run), not cumulative active risks. Otherwise trajectory doesn't measure "is each run getting cleaner" — it measures "is the total growing."
- [OBSERVED] The `completeWork` function has two output paths: terminal (lines 1341-1348) and JSON (lines 1316-1339). Both need the fourth line / quality data. The recovery path (lines 1108-1128) also has output — it should NOT include the fourth line (recovery is re-committing, not a new run).
- [OBSERVED] proof.ts subcommands get `--json` from both own options and parent `proofCommand.opts()` (see context and close implementations). Health follows the same pattern.

### Test Infrastructure
- `tests/utils/proofSummary.test.ts:2018-2144` — `computeChainHealth` tests with synthetic chain data. Health computation tests follow the same pattern: construct chain, call function, assert results.
- `tests/commands/proof.test.ts` — subcommand tests. The close and audit test patterns show how to test a proof subcommand with a temp directory and synthetic proof_chain.json.
- `tests/commands/work.test.ts` — `completeWork` tests. The fourth line needs tests here — construct a chain with trajectory data, run complete, verify the output.

## For AnaPlan

### Structural Analog
`audit` subcommand in proof.ts (lines 569-736). Same shape: read-only, reads proof_chain.json, computes over findings, formats terminal dashboard + JSON envelope. No git operations, no mutations.

### Relevant Code Paths
- `packages/cli/src/utils/proofSummary.ts:701-756` — `computeChainHealth`. The counting foundation. Health computation function lives next to this.
- `packages/cli/src/commands/proof.ts:569-736` — audit subcommand. The display pattern to follow.
- `packages/cli/src/commands/work.ts:1316-1348` — `completeWork` output. Where the fourth line integrates.
- `packages/cli/src/commands/work.ts:1108-1128` — recovery path output. Do NOT add fourth line here.
- `packages/cli/src/types/proof.ts` — `ProofChainEntry` type with all fields health reads.

### Patterns to Follow
- `wrapJsonResponse` for the JSON envelope (proofSummary.ts:767)
- Parent `--json` inheritance pattern (proof.ts:360-361 in context, proof.ts:390-391 in close)
- Subcommand registration pattern: `new Command('health')` → `.description()` → `.option('--json')` → `.action()` → `proofCommand.addCommand(healthCommand)`
- Pure computation function in proofSummary.ts, display in proof.ts. Same layering as `computeChainHealth` / `formatHumanReadable`.

### Known Gotchas
- `computeChainHealth` counts by severity across ALL findings including closed/lesson. Trajectory needs to count by severity per ENTRY (the findings that entry produced), not across the cumulative set. These are different iterations with different semantics.
- The `completeWork` JSON output constructs `jsonResults` inline (work.ts:1326-1338). The quality data needs to be added to this object BEFORE it's passed to `wrapJsonResponse`. Don't add it to the meta block — meta is chain health (what exists), quality is trajectory change (what shifted).
- proof.ts uses `spawnSync` for git in close. Health has no git operations — simpler. Don't accidentally add git patterns from close.

### Things to Investigate
- The hot module threshold: the scope says "3+ active findings from 2+ entries." Plan should verify this produces a useful hot list against the current data (proofSummary.ts has 11 active findings — would this threshold surface it? Yes, easily). The threshold should be a constant, not hardcoded in a comparison.
- How to compute "new promote candidates since last run" for the fourth line trigger. One approach: count promote-action findings on the new entry. If any exist, it's a new candidate. Another: compare promote-action count across all active findings before and after the new entry. The simpler approach (new entry has promote findings) is probably right.
- Whether the `HealthReport` type should extend `ChainHealth` or compose it. Compose is cleaner — `meta` already carries `ChainHealth`, and `results` carries the health-specific data. Don't mix the two.
