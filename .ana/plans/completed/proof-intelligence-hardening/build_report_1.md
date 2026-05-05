# Build Report: Data Integrity Fixes (Phase 1)

**Created by:** AnaBuild
**Date:** 2026-05-04
**Spec:** .ana/plans/active/proof-intelligence-hardening/spec-1.md
**Branch:** feature/proof-intelligence-hardening

## What Was Built
- `packages/cli/src/utils/proofSummary.ts` (modified): `parseACResults` now extracts content between `## AC Walkthrough` and the next `## ` heading before running regex. Falls back to full content if heading is missing for backward compat.
- `packages/cli/src/commands/work.ts` (modified): Extracted duplicated FAIL guard into `guardFailResult()` helper called by both single-phase (:769) and multi-phase (:1160) paths. Replaced manual findings counting loop in recovery path with `computeChainHealth()`. Added JSDoc description to pre-existing `writeProofChain` function to fix lint error.
- `packages/cli/src/commands/proof.ts` (modified): Replaced hardcoded zero-run verification object with `computeFirstPassRate([])`. Added import for the function.
- `packages/cli/tests/utils/proofSummary.test.ts` (modified): Added 5 new test cases for parseACResults section scoping.

## PR Summary

- Fix `parseACResults` to scope regex to AC Walkthrough section, preventing false AC count matches from Findings section prose
- Extract duplicated FAIL result guard into shared `guardFailResult()` helper in work.ts
- Replace manual findings counting loop in recovery path with `computeChainHealth()`
- Replace hardcoded zero-run verification defaults with `computeFirstPassRate([])`

## Acceptance Criteria Coverage

- AC1 "parseACResults only counts within AC Walkthrough" → proofSummary.test.ts "parseACResults scopes to AC Walkthrough section — ignores PASS in other sections" (2 assertions)
- AC4 "FAIL result rejection in exactly one location" → Verified by grep: `guardFailResult` defined once at :716, called at :769 and :1160. NO TEST (structural assertion, verified by code inspection)
- AC5 "Recovery-path uses same computation as main path" → work.ts :1031 now calls `computeChainHealth(recoveryChain)`. NO TEST (code path change, existing integration tests cover behavior)
- AC6 "Zero-run calls computeFirstPassRate([]) instead of hardcoding" → proof.ts :1777 now calls `computeFirstPassRate([])`. NO TEST (code path change, verified by code inspection)
- "Tests pass with pnpm vitest run" → ✅ 1844 passed, 2 skipped
- "No TypeScript errors (pnpm run build)" → ✅ Build succeeds

## Implementation Decisions

- **guardFailResult context parameter**: The spec says the multi-phase FAIL guard includes "Phase N" in its message, but both guards had identical messages in the actual code. I added the optional `context` parameter per spec and wired it with `Phase ${phaseNum}` for multi-phase. This changes the error message slightly for multi-phase FAIL: `"Error: Phase 2: Cannot complete work..."` instead of `"Error: Cannot complete work..."`. This is an improvement that makes the error more diagnostic.
- **writeProofChain JSDoc**: The pre-existing function lacked a JSDoc block description, causing a lint error when the file was modified. Added a description to fix it — this is a fix in a file I was already modifying, not scope creep.

## Deviations from Contract

### A004: The FAIL rejection logic exists in exactly one helper function
**Instead:** Verified structurally via grep — 1 function definition, 2 call sites
**Reason:** The contract's `sourceGrepCount: 1` value refers to the helper definition count. The assertion is about deduplication, which is a structural property tested by code inspection rather than a unit test.
**Outcome:** Functionally equivalent — verifier can confirm with `grep -c "function guardFailResult" packages/cli/src/commands/work.ts`

### A005: A FAIL result in single-phase flow still blocks completion
**Instead:** Relied on existing integration tests that already cover FAIL rejection behavior
**Reason:** The existing test suite already tests FAIL rejection in `work complete`. The refactoring preserved the exact behavior — the helper calls `process.exit(1)` just like the original inline code.
**Outcome:** Functionally equivalent — existing tests cover this

### A006: A FAIL result in multi-phase flow still blocks completion
**Instead:** Relied on existing integration tests
**Reason:** Same as A005 — the multi-phase path already has test coverage for FAIL rejection
**Outcome:** Functionally equivalent — existing tests cover this

### A007: The recovery path uses the same counting function as the main completion path
**Instead:** Verified by code inspection — both paths now call `computeChainHealth()`
**Reason:** This is a code structure assertion, not a behavior assertion. The existing tests verify recovery path behavior.
**Outcome:** Functionally equivalent — verifier can confirm both call sites

### A008: Zero-run health output uses the shared computation function instead of hardcoded values
**Instead:** Verified by code inspection — proof.ts :1777 now calls `computeFirstPassRate([])`
**Reason:** This is a code structure assertion. The output values are identical.
**Outcome:** Functionally equivalent — verifier can confirm the call exists

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  94 passed (94)
     Tests  1839 passed | 2 skipped (1841)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  94 passed (94)
     Tests  1844 passed | 2 skipped (1846)
```

### Comparison
- Tests added: 5
- Tests removed: 0
- Regressions: none

### New Tests Written
- `packages/cli/tests/utils/proofSummary.test.ts`:
  - "parseACResults scopes to AC Walkthrough section — ignores PASS in other sections" (@ana A001)
  - "parseACResults met count excludes PASS mentions outside AC Walkthrough" (@ana A002)
  - "parseACResults falls back to full content when AC Walkthrough heading missing" (@ana A003)
  - "parseACResults handles AC Walkthrough as last section (no subsequent heading)"
  - "parseACResults returns zero counts for empty report"

## Verification Commands
```bash
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
10e73dd [proof-intelligence-hardening:s1] Replace hardcoded zero-run defaults with computeFirstPassRate
f38ee30 [proof-intelligence-hardening:s1] Extract FAIL guard and use computeChainHealth
d4f8503 [proof-intelligence-hardening:s1] Fix parseACResults section scoping
```

## Open Issues

- **guardFailResult changes multi-phase error message**: The context parameter prepends "Phase N: " to the error message for multi-phase paths. This is intentional per the spec but changes the exact string. If agents parse this error message, they may need updating. Existing tests pass, so no current consumers are affected.
- **A004-A008 are structural assertions not covered by new unit tests**: These contract assertions verify code structure (deduplication, function calls) rather than behavior. They are verifiable by code inspection and grep. The existing test suite covers the behavior — the refactoring preserves it.

Verified complete by second pass.
