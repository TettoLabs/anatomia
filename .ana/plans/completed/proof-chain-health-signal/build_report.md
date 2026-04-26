# Build Report: Proof chain health signal

**Created by:** AnaBuild
**Date:** 2026-04-25
**Spec:** .ana/plans/active/proof-chain-health-signal/spec.md
**Branch:** feature/proof-chain-health-signal

## What Was Built

- `packages/cli/src/commands/work.ts` (modified): Changed `writeProofChain` return type from `Promise<void>` to `Promise<{ runs: number; callouts: number }>`. Added chain health computation (runs from `chain.entries.length`, callouts summed defensively with `(e.callouts || []).length`). Updated call site to destructure return value. Replaced static `Proof saved to chain.` with dynamic `Chain: N run(s) · M callout(s)` using `chalk.gray()`. Updated JSDoc `@returns` tag.
- `packages/cli/tests/commands/work.test.ts` (modified): Updated `prints proof summary line` assertions — removed `Proof saved to chain` check, added `Chain: 1 run · 0 callouts` assertion. Added new `prints cumulative chain balance with existing entries` test using `existingChain: true` that asserts `Chain: 2 runs · 0 callouts`.

## PR Summary

- Replace static "Proof saved to chain." with dynamic chain balance showing cumulative run and callout counts
- `writeProofChain` now returns `{ runs, callouts }` — clean data boundary, no re-reading files
- Chain balance line uses `chalk.gray()` and the established `·` separator convention
- Defensive `(e.callouts || []).length` handles older entries missing the callouts array
- Added cumulative chain balance test covering the `existingChain` path

## Acceptance Criteria Coverage

- AC1 "chain balance shows correct counts" → work.test.ts:1090 `toContain('Chain: 1 run · 0 callouts')` (1 assertion)
- AC2 "old text removed" → work.test.ts:1093 `not.toContain('Proof saved to chain')` (1 assertion)
- AC3 "first run singular and correct callout count" → work.test.ts:1090 `toContain('Chain: 1 run · 0 callouts')` (1 assertion)
- AC4 "zero callouts no inflation" → work.test.ts:1090 `toContain('0 callouts')` — fixture has no callouts section (1 assertion)
- AC5 "cumulative totals" → work.test.ts:1109 `toContain('Chain: 2 runs · 0 callouts')` (1 assertion)
- AC6 "existing test passes" → ✅ `prints proof summary line` passes with updated assertions
- AC7 "no regressions" → ✅ 1476 passed, 0 failed (was 1475)
- AC8 "writeProofChain returns { runs, callouts }" → Verified indirectly through output; function is not exported

## Implementation Decisions

- A008/A009 contract assertions test `writeProofChain` return value directly, but the function is internal (not exported). Verified indirectly: if the output contains "Chain: 1 run · 0 callouts", the function necessarily returned `{ runs: 1, callouts: 0 }`. This avoids exporting an internal function solely for testing.

## Deviations from Contract

### A008: writeProofChain returns run and callout counts
**Instead:** Verified through output assertion (`Chain: 1 run`) rather than direct return value check
**Reason:** `writeProofChain` is not exported — testing the return value directly would require exporting an internal function
**Outcome:** Functionally equivalent — the output line is derived directly from the return value

### A009: Returned callout count sums across all entries defensively
**Instead:** Verified through output assertion (`0 callouts` with existingChain fixture that has no callouts array)
**Reason:** Same as A008 — function is internal
**Outcome:** Functionally equivalent — defensive `|| []` path is exercised by the existingChain fixture

## Test Results

### Baseline (before changes)
```
cd packages/cli && pnpm vitest run
Test Files  97 passed (97)
     Tests  1475 passed | 2 skipped (1477)
```

### After Changes
```
cd packages/cli && pnpm vitest run
Test Files  97 passed (97)
     Tests  1476 passed | 2 skipped (1478)
```

### Comparison
- Tests added: 1
- Tests removed: 0
- Regressions: none

### New Tests Written
- `packages/cli/tests/commands/work.test.ts`: `prints cumulative chain balance with existing entries` — verifies 2 runs / 0 callouts when appending to an existing chain

## Verification Commands
```
pnpm run build
cd packages/cli && pnpm vitest run
pnpm run lint
```

## Git History
```
65f115d [proof-chain-health-signal] Update tests for chain balance output
6ffcd5c [proof-chain-health-signal] Return chain health counts from writeProofChain
```

## Open Issues

- A008/A009 are verified indirectly through output assertions rather than direct return value checks. The function is internal and exporting it solely for testing would weaken the module boundary. The verifier should assess whether indirect verification is sufficient or if the function should be exported.

Verified complete by second pass.
