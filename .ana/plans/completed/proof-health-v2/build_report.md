# Build Report: Health Stats Polish

**Created by:** AnaBuild
**Date:** 2026-05-02
**Spec:** .ana/plans/active/proof-health-v2/spec-1.md
**Branch:** feature/proof-health-v2

## What Was Built

- `packages/cli/src/types/proof.ts` (modified): Added `VerificationStats` and `PipelineStats` interfaces. Extended `HealthReport` with optional `verification` and `pipeline` fields (with `| undefined` for `exactOptionalPropertyTypes`).
- `packages/cli/src/utils/proofSummary.ts` (modified): Widened `computeHealthReport` entry type to include `rejection_cycles`, `previous_failures`, and `timing`. Added `computeFirstPassRate` (exported), `computePipelineStats`, and `floorMedian` helper. New fields feed into HealthReport return.
- `packages/cli/src/commands/proof.ts` (modified): Rewrote `formatHealthDisplay` — renamed Trajectory → Quality, Hot Modules → Hot Spots, merged Promote + Recurring → Next Actions (capped at 5, sorted by recurrence descending). Added Verification section (first-pass rate + catch count). Added Pipeline section (median total with scope/build/verify breakdown). Removed unclassified parenthetical from Quality. Removed Promotions effectiveness from terminal. Updated zero-runs JSON default to include verification field.
- `packages/cli/tests/commands/proof.test.ts` (modified): Updated 8 existing tests for renamed/removed sections. Added 11 new tests covering Verification, Pipeline, Next Actions cap, removed sections, and JSON additive fields.

## PR Summary

- Reshape the `ana proof health` terminal display: rename Trajectory → Quality, Hot Modules → Hot Spots, merge Promote + Recurring into Next Actions
- Add Verification section showing first-pass rate and total issues caught before shipping
- Add Pipeline section showing median timing with scope/build/verify phase breakdown
- Remove unclassified parenthetical from Quality section and Promotions effectiveness from terminal (kept in `--json`)
- 11 new tests covering all new sections and edge cases; 8 existing tests updated for renames

## Acceptance Criteria Coverage

- AC1 "Trajectory renamed to Quality" → proof.test.ts "displays Quality section header" (1 assertion) ✅
- AC2 "Hot Modules renamed to Hot Spots" → proof.test.ts "displays Hot Spots section header" (1 assertion) ✅
- AC3 "Recurring and Promote merged into Next Actions" → proof.test.ts "shows Next Actions for promote-action candidates" + "shows recurring candidates in Next Actions as Fix items" (4 assertions) ✅
- AC4 "Verification section shows first-pass rate and total issues caught" → proof.test.ts "displays first-pass rate" + "displays catch count" (5 assertions) ✅
- AC5 "Pipeline section shows median total time with phase breakdown" → proof.test.ts "displays median pipeline time with phase breakdown" (5 assertions) ✅
- AC6 "Unclassified parenthetical removed" → proof.test.ts "does not show unclassified excluded text" (1 assertion) ✅
- AC7 "Promotion Effectiveness section not on default output" → proof.test.ts "does not display Promotions section on terminal" (1 assertion) ✅
- AC8 "--json output structure unchanged (new fields additive)" → proof.test.ts "JSON includes verification and pipeline fields" + "preserves JSON output structure" (7 assertions) ✅
- Tests pass → 1773 passed ✅
- No build errors → build clean ✅

## Implementation Decisions

- **Pipeline uses `think` field as proxy for scope timing.** The timing structure has `think` but not `scope`. Per `computeTiming` in proofSummary.ts, `think` and `plan` are computed from `(contractTime - scopeTime)`. The spec mockup shows "scope Xm" in the breakdown. Used `think` as the scope proxy since it measures the scope→contract phase. Falls through to `scope` field if it exists for future compatibility.
- **Floor median for even-count arrays.** Spec says "use the lower of the two middle values." Implemented as `sorted[Math.floor((length - 1) / 2)]` which gives the lower middle for even counts.
- **Next Actions Promote format uses `Promote: [severity] summary`.** Spec mockup shows `Promote: [debt] summary — file`. This differs from the old `[severity · promote]` format — the new format puts the action verb first as a prefix, matching the `Fix:` prefix for recurring items.
- **Zero-runs JSON default includes `verification` but not `pipeline`.** Pipeline is omitted when < 3 entries (which includes 0). Verification is always computed (returns 100% / 0 caught for empty chain).

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
Tests  1762 passed | 2 skipped (1764)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
Tests  1773 passed | 2 skipped (1775)
```

### Comparison
- Tests added: 11
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/commands/proof.test.ts`: Quality header, Hot Spots header, first-pass rate display, catch count display, 100% first-pass, pipeline median with breakdown, pipeline omitted insufficient data, pipeline omitted zero minutes, Next Actions cap at 5, Next Actions empty, JSON verification+pipeline fields

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
495b68b [proof-health-v2:s1] Update health tests for new display layout
9e8657d [proof-health-v2:s1] Rewrite formatHealthDisplay for new section layout
89df74d [proof-health-v2:s1] Add verification and pipeline types and computation
```

## Open Issues

- **`computeFirstPassRate` is exported but `computePipelineStats` and `floorMedian` are not.** The spec says to add `computeFirstPassRate` as a named function. `computePipelineStats` and `floorMedian` are implementation details — kept private. If Phase 2/3 need pipeline computation independently, they'd need to be exported.
- **Existing @ana tags in tests (A001-A029) from previous build cycle are now stale.** The old A001 tag was on "displays box header" but contract A001 is "Quality section replaces Trajectory." I added new tests with correct @ana tags for the Phase 1 contract assertions (A001-A014), but did not remove the pre-existing @ana tags from tests written before this contract existed — removing them would be deleting test metadata from a previous scope.
- **The `think` → `scope` proxy in pipeline computation is a semantic mismatch.** The timing field `think` measures scope→contract time, which is the think+plan phase combined. The spec mockup shows "scope 8m" but the actual value comes from `think` which includes planning time. Phase 2 introduces better timing granularity which may resolve this.

Verified complete by second pass.
