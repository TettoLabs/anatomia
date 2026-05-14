# Build Report: Fix pipeline timing accuracy for multi-phase and rejection cycles

**Created by:** AnaBuild
**Date:** 2026-05-14
**Spec:** .ana/plans/active/fix-timing-accuracy/spec.md
**Branch:** feature/fix-timing-accuracy

## What Was Built

- `packages/cli/src/commands/artifact.ts` (modified): Added optional `history` field to `SaveMetadata` interface. Modified `writeSaveMetadata()` to preserve previous `{ saved_at, hash }` in a history array before overwriting when content hash differs. Exported `writeSaveMetadata` for direct testing.
- `packages/cli/src/utils/proofSummary.ts` (modified): Added optional `history` field to `SaveEntry` interface. Rewrote `computeTiming()` with three paths: (1) multi-phase segment summation using numbered keys, (2) rejection-cycle segment summation using history arrays, (3) existing endpoint-subtraction fallback. Consolidated `MAX_PHASE_MS` from two declarations to one at function top. Added `getNumberedPhases()` helper with exact `{baseKey}-{N}` pattern matching to exclude companion data keys.
- `packages/cli/tests/utils/proofSummary.test.ts` (modified): Added 14 new tests across two describe blocks covering history preservation (5 tests) and segment-based timing computation (9 tests).

## PR Summary

- Add timestamp history preservation to `writeSaveMetadata` so rejection cycle timestamps survive overwrite
- Implement segment-based timing computation in `computeTiming` for multi-phase builds and rejection cycles
- Consolidate duplicate `MAX_PHASE_MS` declarations to single const at function top
- Preserve full backward compatibility: existing single-phase proofs use unchanged endpoint-subtraction fallback
- 14 new tests covering history write behavior, multi-phase segment summation, rejection cycles, data key exclusion, and stale segment filtering

## Acceptance Criteria Coverage

- AC1 "writeSaveMetadata preserves previous {saved_at, hash} in history on overwrite" -> proofSummary.test.ts:3719 "preserves history when overwriting with different content" (2 assertions on history[0].saved_at and history[0].hash)
- AC2 "SaveEntry type includes optional history" -> proofSummary.test.ts:3752 "SaveMetadata type includes optional history field" + proofSummary.test.ts:3775 "SaveEntry type includes optional history field" (type-level tests)
- AC3 "computeTiming produces accurate build/verify splits for multi-phase" -> proofSummary.test.ts:3790 "computes accurate build time for 2-phase pipeline" (build=45, verify=22) + proofSummary.test.ts:3816 "computes accurate timing for 3-phase pipeline" (build=45, verify=20)
- AC4 "computeTiming produces accurate build/verify splits for rejection cycles" -> proofSummary.test.ts:3839 "computes accurate timing for rejection cycle with history" (build=60, verify=20)
- AC5 "computeTiming falls back to existing endpoint-subtraction" -> proofSummary.test.ts:3866 "falls back to existing computation for old proofs" (build=60, verify=30)
- AC6 "Existing tests pass, new tests cover scenarios" -> 220 existing tests pass + 14 new = 234 total
- AC7 "Proof chain timing schema unchanged" -> proofSummary.test.ts:3880 "timing schema is unchanged" (shape verification)
- AC8 "No build errors, pnpm run build passes" -> Build passes (verified)
- AC9 "Idempotent re-save does NOT create history" -> proofSummary.test.ts:3761 "does not create history on idempotent re-save" (result=false, history undefined)

## Implementation Decisions

1. **Exported `writeSaveMetadata`**: The function was internal to artifact.ts. Exported it to enable direct testing of history behavior (A001-A004). The alternative was testing through `saveArtifact` which requires git repo setup — direct testing is cleaner and more focused.

2. **History push placement**: The spec said "inserts between the idempotency check (line 65) and the overwrite (line 70)." I used an if/else structure — if existing entry exists with saved_at and hash, preserve history then overwrite; else first write without history. This is clearer than injecting into the middle of the existing assignment.

3. **Segment computation detection order**: Multi-phase check runs before rejection-history check. A proof could theoretically have both numbered keys AND history (a multi-phase proof that was rejected), but the numbered keys path is more specific and should take precedence. Documented as the intended behavior.

4. **`getNumberedPhases` regex**: Uses escaped `baseKey` + `-(\\d+)$` pattern. This is tighter than the existing `getLatestTime` regex which uses `startsWith` + `/\d+$/` — the new pattern prevents matching hypothetical keys like `build-report-data-1`.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts)
Test Files  1 passed (1)
     Tests  220 passed (220)
  Duration  800ms
```
Tests: 220 passed, 0 failed, 0 skipped

### After Changes
```
(cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts)
Test Files  1 passed (1)
     Tests  234 passed (234)
  Duration  2.26s
```
Tests: 234 passed, 0 failed, 0 skipped

### Comparison
- Tests added: 14
- Tests removed: 0
- Regressions: none

### New Tests Written
- `proofSummary.test.ts` describe "writeSaveMetadata history preservation": 5 tests covering overwrite with history (A001-A002), accumulation (A003), idempotent skip (A004), type shape (A005)
- `proofSummary.test.ts` describe "computeTiming segment-based computation": 9 tests covering SaveEntry type (A006), 2-phase (A007-A008, A011), 3-phase (A009-A010), rejection cycle (A012-A013), backward compat (A014-A015), schema shape (A016), data key exclusion (A017), stale segment (A018), MAX_PHASE_MS single declaration (A019), _started_at precedence

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
4321d0b4 [fix-timing-accuracy] Add tests for history preservation and segment timing
bccdbd1e [fix-timing-accuracy] Add history preservation and segment-based timing
```

## Open Issues

1. **`writeSaveMetadata` exported for testing**: Was internal, now exported. This expands the public API surface of artifact.ts. If this is undesirable, the tests could be restructured to test through `saveArtifact` integration (requires git repo setup) or the export could be marked with a `@internal` JSDoc tag.

2. **Pre-existing lint warning**: `git-operations.ts:198` has an unused eslint-disable directive. Not introduced by this build.

3. **Pre-existing test failures**: 7 test files (283 tests) fail in baseline due to MODULE_NOT_FOUND errors in check.test.ts and related files. Not related to this change — proofSummary.test.ts is fully green.

Verified complete by second pass.