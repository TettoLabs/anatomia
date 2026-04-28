# Build Report: Clean Ground for Foundation 3

**Created by:** AnaBuild
**Date:** 2026-04-28
**Spec:** .ana/plans/active/clean-ground/spec.md
**Branch:** feature/clean-ground

## What Was Built

- `packages/cli/src/utils/proofSummary.ts` (modified): Added optional `globCache` parameter to `resolveFindingPaths` with default `new Map()`. Cache is checked before `globSync` and stored after. JSDoc updated with `@param globCache`.
- `packages/cli/src/commands/work.ts` (modified): Removed `|| []` from new-entry `resolveFindingPaths` calls (lines 831-832). Declared shared `const globCache = new Map<string, string[]>()` at line 828. Passed `globCache` to all four `resolveFindingPaths` calls (new entry at 831-832, backfill at 847-848). Backfill `|| []` preserved.
- `packages/cli/tests/commands/artifact.test.ts` (modified): Deleted `expect(saves.scope.commit).toBeUndefined()` (was line 1243) and `expect(saves[type].commit).toBeUndefined()` (was line 1707).
- `packages/cli/tests/utils/proofSummary.test.ts` (modified): Added `vi.mock('glob')` with spread to make exports writable. Added `vi` and `glob` imports. Added 2 tests in `glob cache` describe block — cache reuse with `globSync` call-count spy assertion, and default behavior without explicit cache.

## PR Summary

- Remove dead `|| []` fallbacks from new-entry `resolveFindingPaths` calls in `writeProofChain` — the entry fields are always arrays
- Add glob cache to `resolveFindingPaths` so repeated calls share filesystem scan results instead of re-globbing per basename
- Wire shared `Map<string, string[]>` through all four `resolveFindingPaths` invocations in `writeProofChain`
- Delete two stale `commit` assertions from artifact tests that tested `undefined === undefined`
- Add two tests verifying cache reuse (with `globSync` call-count assertion) and backward-compatible default behavior

## Acceptance Criteria Coverage

- AC1 "resolveFindingPaths at work.ts:828 passes entry.modules_touched directly without || []" → work.ts:831 confirmed, no `|| []` (contract A001)
- AC2 "resolveFindingPaths at work.ts:829 passes entry.build_concerns and entry.modules_touched directly without || []" → work.ts:832 confirmed, no `|| []` (contract A002)
- AC3 "Both stale commit assertions removed" → artifact.test.ts lines deleted (contract A004)
- AC4 "resolveFindingPaths accepts optional globCache parameter" → proofSummary.ts signature updated (contract A005, A006)
- AC5 "globCache checked before globSync, stored after" → proofSummary.ts cache logic added (contract A007, A008)
- AC6 "writeProofChain creates one shared Map and passes to all calls" → work.ts:828 declaration, passed to lines 831, 832, 847, 848 (contract A009)
- AC7 "Test verifies repeated calls with same cache reuse glob results" → proofSummary.test.ts `reuses cached glob results across multiple calls` with `expect(spy).toHaveBeenCalledTimes(1)` (contract A010)
- AC8 "Test verifies calling without cache parameter still resolves correctly" → proofSummary.test.ts `resolves paths correctly without explicit cache parameter` (contract A011)
- AC9 "All existing tests pass without modification (except deleted assertions)" → ✅ 1575 passed, 2 skipped
- Tests pass with `cd packages/cli && pnpm vitest run` → ✅
- No build errors from `pnpm run build` → ✅ (verified via pre-commit hook)
- No lint errors from `pnpm run lint` → ✅ (14 pre-existing warnings, 0 errors)

## Implementation Decisions

- **`vi.mock('glob')` with spread for spyable exports.** The `glob` module's ESM exports are non-writable, so `vi.spyOn(glob, 'globSync')` fails with `Cannot redefine property`. Using `vi.mock('glob', async (importOriginal) => ({ ...await importOriginal() }))` creates a writable proxy. The spy then intercepts the actual `globSync` calls from `resolveFindingPaths`.
- **Line numbers shifted.** Spec referenced lines 828-829 for the `resolveFindingPaths` calls and 844-845 for backfill. After adding the `globCache` declaration, new-entry calls are at 831-832 and backfill at 847-848. The contract targets `work.ts:828` etc. by original line — the assertions are satisfied by content, not line number.

## Fix History

- **Round 1 (initial build):** All code changes implemented. A010 test used `vi.spyOn({ globSync }, 'globSync')` on a throwaway object — spy never intercepted actual calls. No call-count assertion.
- **Round 2 (this fix):** Replaced throwaway-object spy with `vi.mock('glob')` + `vi.spyOn(glob, 'globSync')` on the module namespace. Added `expect(spy).toHaveBeenCalledTimes(1)` assertion. All 1575 tests pass.

## Deviations from Contract

None — contract followed exactly. The A010 spy now targets the actual `glob` module via `vi.mock` + `vi.spyOn`, and the call-count assertion matches the contract's `test.globSpy.callCount equals 1`.

## Test Results

### Baseline (before changes)
```
cd packages/cli && pnpm vitest run
Test Files  97 passed (97)
     Tests  1573 passed | 2 skipped (1575)
  Duration  17.57s
```

### After Changes
```
cd packages/cli && pnpm vitest run
Test Files  97 passed (97)
     Tests  1575 passed | 2 skipped (1577)
  Duration  16.32s
```

### Comparison
- Tests added: 2
- Tests removed: 0 (2 assertions removed from existing tests, not test functions)
- Regressions: none

### New Tests Written
- `tests/utils/proofSummary.test.ts`: `glob cache > reuses cached glob results across multiple calls` — verifies shared cache produces correct resolution, stores results, and `globSync` called exactly once (spy call-count assertion). `glob cache > resolves paths correctly without explicit cache parameter` — verifies default behavior preserved when no cache arg provided.

## Verification Commands
```
pnpm run build
cd packages/cli && pnpm vitest run
pnpm run lint
```

## Git History
```
4eac52d [clean-ground] Fix: spy on glob module for cache-reuse call-count assertion
234f6a6 [clean-ground] Verify report
20f8bc2 [clean-ground] Build report
0e0fe7c [clean-ground] Add glob cache tests for resolveFindingPaths
48f5edb [clean-ground] Delete stale commit assertions from artifact tests
966b7a5 [clean-ground] Remove dead fallbacks, add glob cache to resolveFindingPaths
```

## Open Issues

- **`vi.mock('glob')` scope covers entire test file.** The mock applies to all tests in `proofSummary.test.ts`, not just the glob cache tests. Since the mock returns `{ ...original }` (all real implementations), this has no behavioral effect on other tests — but it's a broader mock scope than strictly necessary.
- **Pre-existing lint warnings (14) in unrelated test files** — `@typescript-eslint/no-explicit-any` in analyzer-contract, confirmation, imports, and ai-sdk-detection tests. Not introduced by this build.

Verified complete by second pass.
