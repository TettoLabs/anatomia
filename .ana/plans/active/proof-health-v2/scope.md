# Scope: Proof Health V2

**Created by:** Ana
**Date:** 2026-05-02

## Intent
The health dashboard is the proof system's face. It's what a founder screenshots for their co-founder, what a developer checks before scoping work, what Learn reads at startup. Three gaps: the stats don't tell the full story (no verification effectiveness, no pipeline velocity), the timing data lies (think and plan show identical values), and nothing stops failed work from entering the proof chain. Three phases, one goal: the dashboard tells the truth and the proof chain guards its own integrity.

## Complexity Assessment
- **Size:** medium
- **Files affected:**
  - Phase 1: `packages/cli/src/commands/proof.ts` (health display rewrite ~60 lines changed), `packages/cli/src/utils/proofSummary.ts` (new `computeFirstPassRate` function ~15 lines, timing section data)
  - Phase 2: `packages/cli/src/commands/work.ts` (new `start` subcommand ~40 lines, timing guard in `completeWork`), `packages/cli/src/utils/proofSummary.ts` (`computeTiming` fix ~10 lines changed), Think template + dogfood copy (Step 1 rewrite ~3 lines)
  - Phase 3: `packages/cli/src/commands/work.ts` (`completeWork` FAIL guard ~10 lines)
  - Tests for each phase
- **Blast radius:** Phase 1 is display-only (no data model changes). Phase 2 adds a new CLI command and modifies timing computation. Phase 3 adds a guard to an existing command. Each phase is independently shippable.
- **Estimated effort:** ~2-3 hours pipeline time across 3 phases
- **Multi-phase:** yes

## Approach

### Phase 1: Health Stats Polish

Reshape the health dashboard output. No computation changes — same data, better presentation.

**Rename sections:**
- "Trajectory" → "Quality"
- "Hot Modules" → "Hot Spots"
- "Recurring" + "Promote" → "Next Actions" (merged into one section)

**Add sections:**
- "Verification" — first-pass rate + total issues caught before shipping. Computed from `rejection_cycles` and `previous_failures` already in the proof chain. `first_pass_count / total_entries` for the rate. Sum of `max(rejection_cycles, previous_failures.length)` for the catch count.
- "Pipeline" — median total time + phase breakdown (scope Xm · build Ym · verify Zm). Computed from existing `timing` data on entries. Uses median (not average) to avoid outlier skew.

**Remove:**
- `(62 unclassified excluded)` parenthetical from Quality section — bookkeeping detail
- "Promotion Effectiveness" section — too meta for default dashboard, available in `--json`

**Merge logic for Next Actions:**
Combine promotion candidates (`suggested_action: promote`) and recurring scope findings (same finding appearing in 2+ entries) into one list. Each item gets an action verb: "Fix..." for scope items, "Promote..." for promote items. Cap at 5 items. Sort by recurrence count descending.

The `--json` output structure is unchanged — raw data stays in `promotion_candidates`, `hot_modules`, etc. The display reshapes it.

### Phase 2: Timing Fix

**New command: `ana work start {slug}`**

Replaces the manual `mkdir -p .ana/plans/active/{slug}` in Think's template. Does everything Think's Step 1 currently does, plus more:

1. **Validate branch.** Error if not on artifact branch: "Switch to {artifactBranch}: `git checkout {artifactBranch} && git pull`"
2. **Validate slug format.** Reject non-kebab-case: "Invalid slug. Use kebab-case: fix-auth-timeout"
3. **Validate slug uniqueness.** Check both `active/` and `completed/`: "Slug '{slug}' already exists in {active|completed} plans. Choose a different name."
4. **Pull latest.** `git pull --rebase` on the artifact branch (same pattern as `saveArtifact`).
5. **Create directory.** `mkdir -p .ana/plans/active/{slug}`
6. **Record start time.** Write `{ "work_started_at": "{ISO timestamp}" }` to `.ana/plans/active/{slug}/.saves.json`
7. **Confirm.** "Started work item `{slug}`. Write your scope, then run `ana artifact save scope {slug}`."

Registration: `ana work start` as a third subcommand alongside `status` and `complete`.

**Fix `computeTiming` in proofSummary.ts:**

```
// Current (broken)
think = contractTime - scopeTime   // same as plan
plan  = contractTime - scopeTime   // same as think

// Fixed
think = scopeTime - workStartedTime   // how long Think took (scope save - work start)
plan  = contractTime - scopeTime      // how long Plan took (contract save - scope save)
```

If `work_started_at` is missing (old entries), fall back to current behavior (think = plan = contractTime - scopeTime). New entries get accurate timing.

Combine think+plan into "scope" for the display: `scope Xm` instead of `think Xm · plan Ym`. The underlying data stays as separate fields for `--json` consumers, but the terminal display shows one number because they're sequential phases of scope definition.

**Think template change:**

Current Step 1:
```
### Step 1: Verify branch and create the directory
Verify you're on the artifact branch before creating scope artifacts. If not: `git checkout {artifactBranch} && git pull`. Then:
\`\`\`bash
mkdir -p .ana/plans/active/{slug}
\`\`\`
Slug is kebab-case: `fix-auth-timeout`, `add-export-csv`, `refactor-user-service`.
```

New Step 1:
```
### Step 1: Start the work item
\`\`\`bash
ana work start {slug}
\`\`\`
This validates the branch, checks slug format and uniqueness, creates the plan directory, and records the start time. Slug is kebab-case: `fix-auth-timeout`, `add-export-csv`, `refactor-user-service`.
```

Same change in dogfood copy `.claude/agents/ana.md`.

### Phase 3: Guard Proof Chain Entry

Add a check in `completeWork` before writing the proof chain entry:

```typescript
if (proof.result === 'FAIL') {
  console.error(chalk.red('Error: Cannot complete work with a FAIL verification result.'));
  console.error(chalk.gray('The verify report says FAIL. Fix the issues and re-verify before completing.'));
  console.error(chalk.gray(`Run: claude --agent ana-build to fix, then claude --agent ana-verify`));
  process.exit(1);
}
```

Insert after `generateProofSummary` is called (around line 783) and before the proof chain entry is constructed. If the final verify report says FAIL, block completion with a clear error message.

UNKNOWN result stays as a warning (already exists at line 776) — it doesn't block, just warns. FAIL blocks.

## Acceptance Criteria

### Phase 1
- AC1: Health display section "Trajectory" is renamed to "Quality"
- AC2: Health display section "Hot Modules" is renamed to "Hot Spots"
- AC3: "Recurring" and "Promote" sections are merged into "Next Actions"
- AC4: "Verification" section shows first-pass rate and total issues caught
- AC5: "Pipeline" section shows median total time with phase breakdown
- AC6: `(N unclassified excluded)` parenthetical is removed from Quality section
- AC7: Promotion Effectiveness section does not appear on default output
- AC8: `--json` output structure is unchanged

### Phase 2
- AC9: `ana work start {slug}` creates the plan directory
- AC10: `ana work start` rejects non-kebab-case slugs
- AC11: `ana work start` rejects slugs that exist in active or completed plans
- AC12: `ana work start` validates artifact branch
- AC13: `ana work start` writes `work_started_at` to `.saves.json`
- AC14: `computeTiming` uses `work_started_at` for Think when available
- AC15: Think and Plan show different timing values for new entries
- AC16: Old entries without `work_started_at` fall back to current behavior
- AC17: Think template Step 1 uses `ana work start` instead of `mkdir`
- AC18: Dogfood Think template matches shipped template

### Phase 3
- AC19: `ana work complete` blocks with error when verify result is FAIL
- AC20: `ana work complete` still allows UNKNOWN result (existing warning behavior)
- AC21: Error message tells the developer what to do next (fix + re-verify)

## Edge Cases & Risks

- **Phase 1: No rejection data.** A new project with 0 rejection cycles shows "First-pass: 100% · 0 issues caught." That's correct — no issues were caught because none existed. The section still appears (it's reassuring, not alarming).
- **Phase 1: Insufficient timing data.** Pipeline section only appears when 3+ entries have timing data. Below that, omit the section entirely.
- **Phase 2: Slug collision with completed.** `ana work start fix-auth-bug` should fail if `completed/fix-auth-bug/` exists. A reused slug would confuse proof chain entries. The uniqueness check covers both `active/` and `completed/`.
- **Phase 2: Work start on wrong branch.** The command errors before creating anything — no partial state. Same pattern as `saveArtifact`'s branch validation.
- **Phase 2: Resave of scope.** `scope.saved_at` updates on resave (new hash). `work_started_at` does NOT update — it's set once at directory creation. Think time = `scope.saved_at - work_started_at` gets longer with each resave, which is accurate — Think took longer because the scope was revised.
- **Phase 3: Multi-phase with mixed results.** If Phase 1 verify says PASS and Phase 2 verify says FAIL, the overall result is FAIL. `completeWork` reads the overall proof summary result, which aggregates all phases. The guard catches this correctly.
- **Phase 3: Developer wants to force-complete FAIL work.** No `--force` flag in v1. If needed later, add it. For now, FAIL blocks unconditionally. The developer should fix and re-verify.

## Rejected Approaches

- **Quality score (letter grade or numeric).** Three design advisors split on this. Trend word ("improving") is the headline — a composite score creates a formula to defend and a number to argue about. Deferred.
- **`work status --session` ping for phase timing.** Explored in depth. Polluted by manual status checks. `work start` + save-to-save gaps is simpler and fixes the actual bug (think == plan).
- **Session-start timestamps in agent templates.** Puts mechanical work on agents. Agents should do judgment work. The CLI should do mechanical work.
- **Shipping stats (features per week).** Velocity is a different concern from health. Available from `ana proof` list view with dates. Not a health dashboard stat.

## Open Questions

None.

## Exploration Findings

### Patterns Discovered
- `registerWorkCommand` at work.ts:1318 registers `status` and `complete`. `start` is a natural third subcommand.
- `computeTiming` at proofSummary.ts:1303 reads timestamps from `.saves.json` via `getTime(key)`. Adding `work_started_at` is one new `getTime` call.
- `writeSaveMetadata` is hash-idempotent — resaves don't update `saved_at` if content hasn't changed. `work_started_at` is written once by `work start`, not by `writeSaveMetadata`, so resaves never touch it.
- Health display terminal code starts at proof.ts:1599. The `--json` path returns early at line 1596 — display changes don't affect JSON output.
- First-pass rate is computable from existing data: `rejection_cycles` and `previous_failures` on each proof chain entry.

### Constraints Discovered
- [TYPE-VERIFIED] `ProofSummary['timing']` has optional fields: `think?`, `plan?`, `build?`, `verify?`. Adding computation for `work_started_at` is backward-compatible — old entries without it get the existing fallback.
- [OBSERVED] Median timing: sorted list of 35 entries with data, median = 53m. Average is 142m (skewed by 774m outlier). Median is the right stat.
- [OBSERVED] First-pass rate: 31 of 40 entries have 0 rejection cycles (78%). 12 total catches across 8 entries.
- [OBSERVED] `completeWork` does NOT currently check verify result before writing the proof chain entry. The UNKNOWN warning at line 776 is the only existing check.

### Test Infrastructure
- Health display tests in `proof.test.ts` assert on output strings. Phase 1 changes display text — tests need updating.
- `work.ts` tests in `work.test.ts` — need new tests for `start` subcommand and FAIL guard.
- `computeTiming` tests in `proofSummary.test.ts` — need test for `work_started_at` path.

## For AnaPlan

### Structural Analog
- Phase 1: The health-display-polish scope (entry #37) — same file, same display rewrite pattern. That scope added box headers and section dividers. This scope reshapes sections.
- Phase 2: `ana work complete` registration at work.ts:1329 — same Commander subcommand pattern for `start`.
- Phase 3: The UNKNOWN warning at work.ts:776 — same guard pattern, different result value.

### Relevant Code Paths
- `proof.ts:1555-1679` — health subcommand (Phase 1 display)
- `proof.ts:1596` — `--json` early return (unchanged)
- `proofSummary.ts:1303-1330` — `computeTiming` (Phase 2 fix)
- `proofSummary.ts:881` — `detectHealthChange` has `rejection_cycles` data available (Phase 1 first-pass computation)
- `work.ts:1318-1341` — command registration (Phase 2 new subcommand)
- `work.ts:776-781` — UNKNOWN result warning (Phase 3 pattern)
- `work.ts:783` — proof chain entry construction start (Phase 3 insertion point)
- Think template line 168-173 — Step 1 to replace (Phase 2)

### Patterns to Follow
- Display sections use `BOX.horizontal` for dividers (established in health-display-polish)
- Commander subcommands follow the pattern at lines 1322-1335 (option + argument + action)
- `.saves.json` writes follow `writeSaveMetadata` pattern but `work_started_at` is a standalone write (not hash-gated)

### Known Gotchas
- Phase 1: The `--json` path returns before display code. Don't accidentally move json logic into the display block.
- Phase 2: `work_started_at` goes in `.saves.json` as a top-level key, NOT inside a `{ saved_at, hash }` object. It's a timestamp, not an artifact save.
- Phase 2: The kebab-case validation regex must handle numbers and single-letter words: `fix-v2`, `add-a-thing`, `a`. All valid kebab-case.
- Phase 2: Think's dogfood copy must match the template after the Step 1 change.
- Phase 3: The FAIL guard must go AFTER `generateProofSummary` (which reads the verify report result) and BEFORE the proof chain entry construction. Between lines 783 and 784.
- Phase 3: Multi-phase entries — `proof.result` is the OVERALL result aggregated by `generateProofSummary`. If any phase FAILs, the overall is FAIL. The guard uses the aggregated result, not per-phase.

### Things to Investigate
- Whether the median computation should exclude entries with timing.total_minutes = 0 (entries missing timing data). Likely yes — 0 means "no data," not "instant build."
- Whether `ana work start` should also `git pull --rebase` before creating the directory (matching `saveArtifact`'s pattern). Likely yes — ensures the developer has latest plans from other team members.
