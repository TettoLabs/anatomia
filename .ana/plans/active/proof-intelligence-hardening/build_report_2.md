# Build Report: Infrastructure Extraction (Phase 2)

**Created by:** AnaBuild
**Date:** 2026-05-04
**Spec:** .ana/plans/active/proof-intelligence-hardening/spec-2.md
**Branch:** feature/proof-intelligence-hardening

## What Was Built

- `packages/cli/src/utils/proofSummary.ts` (modified): Added exported `truncateSummary(text, maxLength)` function with word-boundary truncation logic and JSDoc.
- `packages/cli/src/commands/proof.ts` (modified): 
  - Added `createExitError` factory function at module level with hints map + formatHint callback pattern.
  - Replaced 3 inline exitError definitions (close, promote, strengthen) with factory calls.
  - Replaced 2 inline `MAX_SUMMARY` patterns in health display with `truncateSummary(c.summary, 100)`.
  - Replaced 1 inline truncation pattern in audit context display with `truncateSummary(finding.summary, 250)`.
  - Added `truncateSummary(p.summary, 100)` to promote output (single-ID and multi-ID paths).
  - Added `truncateSummary(s.summary, 100)` to strengthen output (single-ID and multi-ID paths).
- `packages/cli/tests/utils/proofSummary.test.ts` (modified): Added 6 unit tests for `truncateSummary` covering short text, exact-length, word boundary, hard-cut, custom maxLength, and empty string.

## PR Summary

- Extract `truncateSummary` utility for consistent word-boundary text truncation across all proof display commands
- Replace 3 duplicated inline `exitError` definitions with a shared `createExitError` factory using hints map + callback pattern
- Add summary truncation to promote and strengthen output which previously displayed untruncated text
- Unify truncation on word-boundary behavior (previously health display used hard-cut, audit used word-boundary)

## Acceptance Criteria Coverage

- AC3 "exitError is defined once and consumed by close, promote, and strengthen" → proofSummary.test.ts not directly tested (factory is internal), but proof.test.ts:200 tests exercise all error paths unchanged ✅
- AC7 "Summary truncation applies consistently in health, promote, and strengthen displays" → proofSummary.test.ts truncateSummary tests (6 assertions), and behavior verified through existing proof.test.ts passing ✅
- "All existing proof command tests pass unchanged" → 200 tests pass, zero changes to test assertions ✅
- "No TypeScript errors" → `pnpm run build` passes ✅
- "No lint errors" → `pnpm run lint` passes (only pre-existing warnings) ✅

## Implementation Decisions

1. **Factory placement:** `createExitError` is module-level (not exported) rather than inside `registerProofCommand`. This makes it available to all subcommands without nesting. The spec said "module-level function (not exported)" — followed exactly.

2. **formatHint callback vs pure hints map:** The spec suggested a `formatHint` callback for complex cases. I used both: static `hints` map for simple code→lines mappings, and `formatHint` for context-dependent cases (ALREADY_CLOSED checking `context['closed_by']`, SKILL_NOT_FOUND reading filesystem). The callback returns `null` to fall through to the static hints map.

3. **Truncation unification:** The spec noted that health display used `.slice(0, 100) + '...'` (hard-cut) while audit used `lastIndexOf(' ', 250)` (word-boundary). Unified on word-boundary per spec: "Unify on word-boundary (the cleaner behavior)". This may change a few health display truncation points by a character or two.

4. **Return type `never`:** The factory's return type is `(code, message, context?) => never` because `process.exit(1)` makes the return type `never`. TypeScript infers this correctly from `process.exit(1)`.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  94 passed (94)
     Tests  1844 passed | 2 skipped (1846)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  94 passed (94)
     Tests  1850 passed | 2 skipped (1852)
```

### Comparison
- Tests added: 6
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/utils/proofSummary.test.ts`: truncateSummary describe block — short text passthrough, exact-length passthrough, word-boundary truncation with ellipsis, hard-cut when no spaces, custom maxLength parameter (53 chars), empty string handling.

## Verification Commands
```bash
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
d3d4880 [proof-intelligence-hardening:s2] Extract createExitError factory
faa055c [proof-intelligence-hardening:s2] Add truncateSummary helper and replace inline truncation
```

## Open Issues

1. **Health display truncation behavior change:** Previously health display used hard-cut `.slice(0, 100) + '...'`. Now uses word-boundary truncation. This means some summaries that were cut at exactly 100 chars will now cut at the last space before 100. The spec explicitly authorized this: "Unify on word-boundary — this may change a few truncation points by a character or two, which is acceptable." No tests assert exact truncation output for the health display.

Verified complete by second pass.
