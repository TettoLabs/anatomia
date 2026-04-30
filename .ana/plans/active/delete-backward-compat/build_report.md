# Build Report: Delete backward-compatibility code

**Created by:** AnaBuild
**Date:** 2026-04-30
**Spec:** .ana/plans/active/delete-backward-compat/spec.md
**Branch:** feature/delete-backward-compat

## What Was Built

- `src/commands/work.ts` (modified): Deleted migration block (callouts rename, status backfill, severity migration, scope_summary backfill, seal_commit deletion), reopen-wrongly-closed loop, phase ordering comment, `lessonsClassified` counter. Simplified maintenance stats condition to `autoClosed > 0`. Removed unused `extractScopeSummary` import.
- `src/types/proof.ts` (modified): Removed `lessons_classified` from `ProofChainStats.maintenance` type.
- `src/utils/proofSummary.ts` (modified): Replaced regex `## (?:Callouts|Findings)` with `## Findings` in `parseFindings`. Updated docstring from "Callouts" to "Findings". Replaced backward-compat guard `if (finding.status && finding.status !== 'active') continue` with explicit `if (finding.status !== 'active') continue` in `generateActiveIssuesMarkdown`.
- `src/engine/types/index.ts` (modified): Rewrote comment on `AnalysisResultSchema` to reference actual consumers (`types.test.ts` and `parsed-integration.test.ts`).
- `src/commands/scan.ts` (modified): Deleted re-export of display name functions.
- `tests/commands/scan.test.ts` (modified): Changed import from `../../src/commands/scan.js` to `../../src/utils/displayNames.js`.
- `tests/engine/backward-compat.test.ts` (deleted)
- `tests/engine/parsed-backward-compat.test.ts` (deleted)
- `tests/engine/patterns-backward-compat.test.ts` (deleted)
- `tests/engine/structure-backward-compat.test.ts` (deleted)
- `tests/commands/work.test.ts` (modified): Deleted 5 tests for removed migration/reopen behavior. Added `status: 'active'` to 4 staleness test fixtures. Changed `## Callouts` to `## Findings` in verify report test data.
- `tests/utils/proofSummary.test.ts` (modified): Changed all `## Callouts` to `## Findings` in test data. Deleted backward-compat test for `## Callouts` heading. Deleted backward-compat test for findings without status. Added `status: 'active'` to all `generateActiveIssuesMarkdown` test fixtures.

## PR Summary

- Delete all migration code from `writeProofChain` — callouts rename, status backfill, severity migration, scope_summary backfill, seal_commit deletion, and reopen-wrongly-closed loop. These ran on every `work complete` matching zero data.
- Remove `Callouts` regex branch from `parseFindings` and undefined guard from `generateActiveIssuesMarkdown` — both existed for states that no longer occur.
- Delete 4 backward-compat engine test files (418 lines) that tested `AnalysisResultSchema` through migration paths with zero production callers.
- Remove `lessonsClassified` counter and `lessons_classified` from `ProofChainStats` type — dead after migration deletion.
- Fix `scan.test.ts` to import display name functions directly from `displayNames.js` instead of through `scan.ts` re-export.

## Acceptance Criteria Coverage

- AC1 "migration block removed" → work.ts source: callouts rename, status backfill, severity migration, scope_summary backfill, seal_commit deletion all deleted. ✅
- AC2 "reopen loop deleted" → work.ts source: no `closed_by === 'mechanical'` reopen logic remains. ✅
- AC3 "parseFindings matches Findings only" → proofSummary.ts: regex is `## Findings`, no `Callouts` branch. ✅
- AC4 "undefined guard removed" → proofSummary.ts: `if (finding.status !== 'active') continue` — explicit, no undefined fallback. ✅
- AC5 "4 backward-compat test files deleted" → All 4 files deleted (421 lines in git diff). ✅
- AC6 "scan.ts no re-export; scan.test.ts imports directly" → Re-export deleted, import changed to `displayNames.js`. ✅
- AC7 "AnalysisResultSchema comment rewritten" → Now references `types.test.ts` and `parsed-integration.test.ts`. ✅
- AC8 "resolveFindingPaths and staleness survive" → Both still present in work.ts loop. ✅
- AC9 "All remaining tests pass" → 1711 passed, 2 skipped, 0 failed. ✅
- AC10 "Build compiles" → Pre-commit hook runs typecheck successfully on all 3 commits. ✅
- AC11 "Lint passes" → 0 errors, 14 pre-existing warnings. ✅
- AC12 "Test count decreases" → 97 → 93 test files. ✅
- AC13 "lessonsClassified deleted" → Counter, condition, type field all removed. ✅

## Implementation Decisions

1. **Spec didn't list `work.test.ts` or `proofSummary.test.ts` in File Changes**, but both contained tests for deleted migration behavior and test data using `## Callouts` heading. 5 migration/reopen tests deleted from work.test.ts; 2 backward-compat tests deleted from proofSummary.test.ts. 4 staleness tests and all `generateActiveIssuesMarkdown` tests updated to include explicit `status: 'active'` in test fixtures (previously set by the migration backfill that was deleted). All `## Callouts` headings in test data changed to `## Findings`.

2. **Removed unused `extractScopeSummary` import from work.ts** — the only call site was inside the deleted scope_summary backfill block. Lint would have flagged it.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
cd packages/cli && pnpm vitest run
Test Files  97 passed (97)
     Tests  1733 passed | 2 skipped (1735)
```

### After Changes
```
cd packages/cli && pnpm vitest run
Test Files  93 passed (93)
     Tests  1711 passed | 2 skipped (1713)
```

### Comparison
- Tests added: 0
- Tests removed: 22 (5 in work.test.ts for deleted migration/reopen, 2 in proofSummary.test.ts for backward-compat, ~15 across 4 deleted test files)
- Regressions: none

### New Tests Written
None — pure deletion build. No new tests required.

## Verification Commands
```
pnpm run build
cd packages/cli && pnpm vitest run
pnpm run lint
```

## Git History
```
71507c3 [delete-backward-compat] Delete scan.ts re-export and 4 backward-compat test files
f47cb18 [delete-backward-compat] Remove backward-compat patterns from proofSummary
c3c6d0a [delete-backward-compat] Delete migration block and reopen loop from writeProofChain
```

## Open Issues

1. The `## Callouts` heading in verify reports generated by older AnaVerify runs still exists in proof_chain.json historical data. `parseFindings` now only matches `## Findings`. This is correct — old verify reports are not re-parsed — but if any workflow re-parses historical verify reports, those findings would be silently dropped. Severity: observation.

2. Findings in existing proof_chain.json entries that lack a `status` field (from before the backfill migration existed) will now be treated as non-active by `generateActiveIssuesMarkdown` (since `undefined !== 'active'`). This is correct behavior — the migration was a transitional bridge — but existing chains with very old entries may show fewer active issues in ACTIVE_ISSUES.md. Severity: observation.

Verified complete by second pass.
