# Build Report: Strengthen Weak Test Assertions

**Created by:** AnaBuild
**Date:** 2026-05-02
**Spec:** .ana/plans/active/strengthen-weak-test-assertions/spec.md
**Branch:** feature/strengthen-weak-test-assertions

## What Was Built
For each file created or modified:
- `packages/cli/tests/commands/proof.test.ts` (modified): AC1 — added commit count before/after dry-run assertion. AC2 — added `promoted_to` contains 'coding-standards' for both findings in variadic strengthen. AC3 — replaced source-content test (`uses MIN_ENTRIES_FOR_TREND constant`) with two behavioral boundary tests (9 entries → insufficient data, 10 entries → actual trend). AC4 — replaced `not.toContain('Promotions')` terminal check with `--json` output check verifying empty promotions array.
- `packages/cli/tests/commands/work.test.ts` (modified): AC6 — replaced `toBeDefined()` + `toBeGreaterThan(0)` with ISO format check (`toContain('T')`) and recency window assertion. AC7 — added `process.exit` mock + `console.error` capture to multi-phase FAIL test, asserts error contains 'FAIL' and 'ana-build'. AC8 — redesigned fixture from decreasing risk (indeterminate) to stable 1-risk-per-entry → 0-risk new entry (deterministic stable→improving), removed `if (output.includes('Health:'))` guard, asserts `Health:` appears and no nudge suggestions. AC10 — new UNVERIFIED fallback test: creates contract with assertions, verify report with PASS but no compliance table, asserts proof chain assertion status is 'UNVERIFIED'.
- `packages/cli/tests/utils/proofSummary.test.ts` (modified): AC5 — replaced three `toBeGreaterThan(0)` with `toBe(2)` (two fixtures have 2 findings for census.ts) and `toBe(1)` (legacy has 1). AC9 — added `toContain('file-0.ts')` and `not.toContain('file-30.ts')` to cap test.

## PR Summary

- Strengthened 11 weak test assertions across 3 test files — no production code changes
- Replaced source-content assertion (reading proof.ts source) with behavioral boundary tests at the 9/10 entry threshold
- Added UNVERIFIED fallback coverage for assertions missing compliance table data
- Removed conditional `if (output.includes('Health:'))` guard with deterministic stable→improving fixture
- Replaced vacuous `toBeDefined`/`toBeGreaterThan(0)` with exact value assertions matching fixture data

## Acceptance Criteria Coverage

- AC1 "Dry-run no commit" → proof.test.ts:1249 "shows what would happen without mutating" — commit count before/after comparison (2 assertions)
- AC2 "Variadic promoted_to" → proof.test.ts:3345 "strengthens multiple findings in one commit" — `f1.promoted_to` and `f2.promoted_to` contain 'coding-standards' (2 assertions)
- AC3 "Behavioral boundary test" → proof.test.ts:2397 "shows insufficient data with 9 classified entries" + proof.test.ts:2407 "shows actual trend with 10 classified entries" (2 tests, 2 assertions)
- AC4 "JSON promotions check" → proof.test.ts:2299 "omits promotions when empty" — `json.results.promotions` is defined and has length 0 (2 assertions)
- AC5 "toBe(1) replacements" → proofSummary.test.ts:1106, 1116, 1130 — three `toBeGreaterThan(0)` → `toBe(2)`, `toBe(2)`, `toBe(1)` (3 assertions)
- AC6 "Timestamp specificity" → work.test.ts:2679 "writes work_started_at to saves.json" — ISO `toContain('T')` + recency window (3 assertions)
- AC7 "Multi-phase FAIL error message" → work.test.ts:871 "errors when multi-spec phase 1 shows FAIL" — error output contains 'FAIL' and 'ana-build' (2 assertions)
- AC8 "Conditional guard removal" → work.test.ts:2338 "no nudge for informational triggers only" — deterministic fixture, direct assertions without guard (3 assertions)
- AC9 "Cap specificity" → proofSummary.test.ts:1459 "caps active findings at 30" — file-0.ts present, file-30.ts absent (2 assertions)
- AC10 "UNVERIFIED fallback" → work.test.ts:1137 "UNVERIFIED fallback when assertions lack verify status" — assertion status is 'UNVERIFIED' (3 assertions)
- AC11 "All existing tests pass" → Full suite: 1798 passed, 2 skipped, 93 files ✅

## Implementation Decisions

1. **AC5 values are `toBe(2)` not `toBe(1)` for full-path and basename tests.** The spec says "replace with `toBe(1)`" but the `baseEntry` fixture has 2 findings for census.ts (drizzle-C1 and drizzle-C2). Using `toBe(1)` fails. Used `toBe(2)` to match fixture reality. The legacy test uses its own single-finding entry so `toBe(1)` works there. Documented as contract deviation for A007/A008.

2. **AC8 nudge assertion uses `not.toContain('→ claude')` and `not.toContain('→ ana proof')` instead of `not.toContain('→')`.** The health line format `risks/run 1 → 0.8` contains a `→` character as a metric change indicator. The nudge suggestions use `→ claude --agent ana-learn` or `→ ana proof audit`. Asserting against the bare `→` would fail because the metric display uses it too.

3. **AC4 asserts `promotions` array exists and is empty rather than asserting it's absent.** The `computeHealthReport` always returns a `promotions` array — it's empty when no findings are promoted. Checking `.toBeDefined()` + `.toHaveLength(0)` is more specific than the original terminal-output assertion.

## Deviations from Contract

### A007: Full-path file query returns exactly one finding per matching entry
**Instead:** Asserted `toBe(2)` — baseEntry fixture has 2 findings for census.ts
**Reason:** Contract value of 1 doesn't match the existing test fixture which has 2 findings (drizzle-C1, drizzle-C2) for the queried file
**Outcome:** Functionally equivalent — assertion is now specific (`toBe(2)` instead of `toBeGreaterThan(0)`), just a different exact value than contract specified

### A008: Basename query returns exactly one finding per matching entry
**Instead:** Asserted `toBe(2)` — same baseEntry fixture with 2 findings
**Reason:** Same as A007 — fixture reality doesn't match contract's assumed value of 1
**Outcome:** Functionally equivalent — specific assertion matching actual fixture

### A014: Informational health triggers do not show a nudge arrow
**Instead:** Asserted `not.toContain('→ claude')` and `not.toContain('→ ana proof')` instead of `not.toContain('→')`
**Reason:** The health line format uses `→` for metric display (`risks/run 1 → 0.8`), making bare `→` assertion impossible
**Outcome:** Functionally equivalent — tests the actual nudge absence, not the character

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1796 passed | 2 skipped (1798)
  Duration  28.33s
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1798 passed | 2 skipped (1800)
  Duration  29.02s
```

### Comparison
- Tests added: 2 (+1 AC3 boundary test, +1 AC10 UNVERIFIED test)
- Tests removed: 0
- Tests replaced: 1 (AC3 source-content → 2 boundary tests = net +1)
- Regressions: none

### New Tests Written
- `proof.test.ts`: "shows insufficient data with 9 classified entries" (AC3 boundary), "shows actual trend with 10 classified entries" (AC3 boundary)
- `work.test.ts`: "UNVERIFIED fallback when assertions lack verify status" (AC10)

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
58bac65 [strengthen-weak-test-assertions] Replace source-content and terminal assertions
a51f0b6 [strengthen-weak-test-assertions] Strengthen work test assertions
c6308b9 [strengthen-weak-test-assertions] Replace weak assertions in proofSummary tests
fc3738d [strengthen-weak-test-assertions] Strengthen dry-run and variadic assertions
```

## Open Issues

1. **AC5 contract values assumed wrong fixture shape.** Contract assertions A007 and A008 specify `value: 1` but the existing `baseEntry` test fixture has 2 findings for census.ts. The contract was written assuming 1 finding per file, but the fixture predates the contract. The `toBe(2)` assertion is correct for the fixture; the contract value was inaccurate.

2. **AC8 metric arrow collision.** The health line format `risks/run N → M` uses the same `→` character as nudge suggestions. This means any test checking for the absence of nudge arrows cannot use the bare character. The nudge-specific check (`→ claude`, `→ ana proof`) is functionally correct but less elegant.

Verified complete by second pass.
