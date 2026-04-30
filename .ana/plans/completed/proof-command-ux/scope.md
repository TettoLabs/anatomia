# Scope: Proof Command UX

**Created by:** Ana
**Date:** 2026-04-30

## Intent
The proof system computes quality intelligence — severity classifications, suggested actions, promotion candidates, trend trajectories. The CLI commands that surface this data (`ana proof audit`, `work complete`) show the data but don't tell developers what to do with it. "71 active findings across 23 files" is a number. "5 risk, 4 promote, 9 closeable" is a decision surface. "Health: trend worsened" is a fact. "Health: trend worsened → ana proof audit" is a nudge. Two display additions (~25 lines of production code) that transform proof output from data dumps into action surfaces.

## Complexity Assessment
- **Size:** small
- **Files affected:** 2 production (`proof.ts`, `work.ts`), 2 test (`proof.test.ts`, `work.test.ts`)
- **Blast radius:** Terminal display only for Fix 1. Terminal display + JSON contract (additive field) for Fix 2. No changes to computation, data model, or proof chain structure.
- **Estimated effort:** 1 pipeline run
- **Multi-phase:** no

## Approach
Two independent display fixes that use data already computed and in memory.

**Fix 1 (Audit summary):** After the audit header line, insert two summary lines — one for severity breakdown, one for action breakdown. Count from the `activeFindings` array (active-only, not from `computeChainHealth` meta which includes closed/lesson). Handle unclassified findings (`severity: '—'`) gracefully: show an `unclassified` bucket when present, skip both summary lines entirely when ALL findings are unclassified. The `(closeable)` hint on `accept` teaches vocabulary inline.

**Fix 2 (Health nudge):** Append an action suggestion to the health fourth line when specific triggers fire. Priority: `new_candidates` → `→ claude --agent ana-learn`, `trend_worsened` → `→ ana proof audit`, all others → no nudge. One nudge maximum. Add `suggested_action` to the JSON `quality` object using abstract names (`'run_learn'` | `'run_audit'` | `null`) — the JSON contract is machine-readable and outlives any specific CLI surface.

## Acceptance Criteria
- AC1: `ana proof audit` displays severity summary line between header and first file group: `N risk · N debt · N observation`
- AC2: `ana proof audit` displays action summary line: `N promote · N scope · N monitor · N accept (closeable)`
- AC3: Summary counts are from active findings only, not from `computeChainHealth` meta
- AC4: With zero active findings, the summary lines do not appear
- AC5: When all active findings have unclassified severity (`'—'`), both summary lines are skipped
- AC6: When some findings are unclassified, the severity line includes an `unclassified` bucket
- AC7: `--json` output is unchanged — summary is terminal display only
- AC8: `work complete` health fourth line appends `→ claude --agent ana-learn` when `new_candidates` trigger fires
- AC9: `work complete` health fourth line appends `→ ana proof audit` when `trend_worsened` trigger fires (and no `new_candidates`)
- AC10: `work complete` health fourth line has NO nudge when only `trend_improved` or `new_hot_module` fires
- AC11: When multiple triggers fire, only the highest-priority nudge appears (candidates > worsened)
- AC12: `work complete --json` `results.quality` gains `suggested_action` field: `'run_learn'` | `'run_audit'` | `null`
- AC13: `suggested_action` is `null` when no actionable trigger fires
- AC14: All existing tests pass
- AC15: Lint passes

## Edge Cases & Risks
**Audit with all-unclassified findings.** Before Phase E backfill, findings may have `severity: '—'` and `suggested_action: '—'`. The summary handles this by: (a) counting `'—'` severity as `unclassified`, (b) omitting `'—'` from the action line, (c) skipping both lines entirely if all findings are unclassified. This is a 4-line guard that works permanently regardless of whether backfill runs.

**Health nudge on first run.** First entry has no previous state — the fourth line doesn't appear (existing behavior). No nudge possible. Correct by construction.

**Nudge when Learn agent doesn't exist.** If a team runs a CLI version with health but not Learn, the nudge says `→ claude --agent ana-learn` but the agent isn't found. Acceptable — the nudge is aspirational, upgrading is the fix. No command-existence check needed.

**`suggested_action` JSON contract permanence.** The field is a permanent addition to `results.quality`. Once shipped, `null` | `'run_learn'` | `'run_audit'` are the contract values. Future triggers add values additively (e.g., `'run_promote'`).

**`healthLine` is `const`.** Line 1358 declares `const healthLine = ...`. The nudge append requires `let`. Mechanical fix.

## Rejected Approaches
**Audit summary in `--json`.** The severity/action counts are derivable from the findings array in the JSON response. Adding a separate summary object duplicates data. Terminal-only is correct.

**Nudge on every health line appearance.** A nudge that's always there becomes invisible. Only actionable triggers get nudges. Informational triggers (improvement, new hot module) don't.

**Multiple stacked nudges.** Too noisy. One nudge per line, highest priority wins.

**Nudge as a separate fifth line.** The nudge belongs ON the health line — it's the action the health data suggests. Separating breaks the data-to-action connection.

**Command strings in JSON `suggested_action`.** `'claude --agent ana-learn'` couples the JSON contract to Claude Code's invocation syntax. Abstract names (`'run_learn'`) let any consumer — web dashboard, CI bot, different CLI — decide how to present the action.

**Trust Phase E backfill for unclassified handling.** Relying on backfill having already classified everything means the audit displays misleading zeros if someone runs before backfill or on a project with legacy findings. A 4-line defensive guard works forever.

## Open Questions
None.

## Exploration Findings

### Patterns Discovered
- proof.ts:1006-1007: Header prints, then `console.log('')` for blank separator. Summary lines insert between these two.
- proof.ts:974: `SEVERITY_WEIGHT` already defines the severity ordering — reusable for summary counting.
- proof.ts:941-942: Fallback `'—'` for missing severity/suggested_action. This is the source of unclassified findings.
- work.ts:1358: `const healthLine` — needs `let` for append.
- work.ts:1340-1344: `quality` object in JSON results — `suggested_action` is additive alongside existing `changed`, `trajectory`, `triggers`.
- proofSummary.ts:1030-1053: Trigger strings are `'trend_improved'`, `'trend_worsened'`, `'new_hot_module'`, `'new_candidates'` — typed in `HealthChange` interface at types/proof.ts:171.

### Constraints Discovered
- [TYPE-VERIFIED] HealthChange triggers (types/proof.ts:171) — union type `'trend_improved' | 'trend_worsened' | 'new_hot_module' | 'new_candidates'`. The nudge logic checks against these exact strings.
- [TYPE-VERIFIED] activeFindings severity/action (proof.ts:904-905) — typed as open `string`, not a union. Fallback `'—'` at lines 941-942 means any value is possible.
- [OBSERVED] Audit JSON path unchanged — Fix 1 is terminal-only. Fix 2 adds one field to an existing object.

### Test Infrastructure
- work.test.ts:2177-2255: `health fourth line` describe block with chain fixtures producing classified findings. Good foundation for nudge tests — same setup, assert on appended `→` text.
- proof.test.ts: Audit tests exist. Summary line assertions extend the existing terminal output tests.

## For AnaPlan

### Structural Analog
The audit summary follows the same pattern as the per-file display loop at proof.ts:1009-1021 — iterate `activeFindings`, format with `chalk.dim`, indent with 2 spaces. The health nudge follows the existing health fourth line at work.ts:1356-1360 — conditional string construction, `chalk.gray` output.

### Relevant Code Paths
- `packages/cli/src/commands/proof.ts:895-948` — `activeFindings` array construction (Fix 1 source data)
- `packages/cli/src/commands/proof.ts:1003-1007` — audit terminal header area (Fix 1 insertion point)
- `packages/cli/src/commands/work.ts:1356-1360` — health fourth line construction (Fix 2 insertion point)
- `packages/cli/src/commands/work.ts:1327-1346` — JSON results construction (Fix 2 `suggested_action`)
- `packages/cli/src/types/proof.ts:168-173` — `HealthChange` interface (trigger type union)

### Patterns to Follow
- proof.ts:1013 — `chalk.dim(...)` for secondary display text, 2-space indent for summary lines under the header
- work.ts:1358-1359 — string construction for health line, `chalk.gray(...)` for output
- work.ts:1340-1344 — object literal for JSON quality, additive field pattern

### Known Gotchas
- **Active-only counts.** `computeChainHealth`'s `by_severity` and `by_action` count ALL findings including closed/lesson. The audit summary must count from the `activeFindings` array. Don't reuse meta counts.
- **`const` → `let` for healthLine.** Line 1358 is `const`. The nudge append requires `let`. Don't miss this.
- **Open `string` type on severity/action.** Not a union — any value passes the type checker. The summary must handle `'—'` explicitly, not assume all values are known classifications.

### Things to Investigate
- Whether the `SEVERITY_WEIGHT` map at proof.ts:974 should be extracted and reused for the summary count loop, or whether a simple inline counter is cleaner given the different purpose (sorting vs. counting).
