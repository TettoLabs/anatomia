# Build Report: Resolve callout file paths at write time

**Created by:** AnaBuild
**Date:** 2026-04-24
**Spec:** .ana/plans/active/proof-context-query/spec-1.md
**Branch:** feature/proof-context-query

## What Was Built

- `packages/cli/src/utils/proofSummary.ts` (modified): Added exported `resolveCalloutPaths` function. Takes an array of `{ file: string | null }` objects and an array of module paths. For each item where `file` is non-null and contains no `/`, finds matching modules using path-boundary check (`module.endsWith('/' + file)`). If exactly one match, replaces `file` with the full path. Mutates in place. Idempotent.
- `packages/cli/src/commands/work.ts` (modified): Added import of `resolveCalloutPaths`. In `writeProofChain()`, before `chain.entries.push(entry)`: resolves the new entry's callouts and build_concerns against its `modules_touched`, then resolves ALL existing entries' callouts and build_concerns against their own `modules_touched` (backfill).
- `packages/cli/tests/utils/proofSummary.test.ts` (modified): Added 8 unit tests for `resolveCalloutPaths` covering: single match resolves, zero match stays, multiple match stays, already-resolved skipped, null file skipped, build_concerns resolved, empty modules array, path-boundary prevents false matches.

## PR Summary

- Added `resolveCalloutPaths()` utility that upgrades callout/build_concern file basenames to full relative paths using path-boundary matching against `modules_touched`
- Wired resolution into `writeProofChain()` for both new and existing entries (backfill on every write)
- Path-boundary checking (`endsWith('/' + basename)`) prevents false matches like `route.ts` matching `subroute.ts`
- 8 unit tests cover all resolution branches including edge cases (null file, already-resolved, ambiguous matches)

## Acceptance Criteria Coverage

- AC1 "basename matching one module → full path" → proofSummary.test.ts "resolves single-match basename to full path" (1 assertion)
- AC2 "zero or 2+ matches → stays as-is" → proofSummary.test.ts "keeps basename when no modules match" + "keeps basename when multiple modules match" (2 tests, 1 assertion each)
- AC3 "build concerns resolved same as callouts" → proofSummary.test.ts "resolves build concern file paths" (1 assertion)
- AC4 "existing entries backfilled" → Wired in work.ts before `chain.entries.push(entry)`. No integration test (would require mocking writeProofChain). Function-level coverage via idempotency test — calling resolveCalloutPaths on already-resolved items is a no-op, proving backfill safety.
- AC5 "Tests pass" → ✅ 1448 passed, 2 skipped
- AC6 "No build errors" → ✅ Pre-commit hook passes (typecheck + lint)

## Implementation Decisions

- Placed `resolveCalloutPaths` immediately before the `CalloutWithFeature` interface block in proofSummary.ts, keeping it adjacent to `extractFileRefs` since both are file-reference operations.
- Used `void` return type (mutates in place) per spec's guidance: "Don't clone — it's unnecessary overhead."
- Backfill loop resolves ALL existing entries on every write, not just those with unresolved basenames. The idempotency guarantee makes this safe and avoids tracking which entries have been resolved.

## Deviations from Contract

None — contract followed exactly for phase 1 assertions (A001-A008).

## Test Results

### Baseline (before changes)
```
pnpm vitest run
 Test Files  96 passed (96)
      Tests  1440 passed | 2 skipped (1442)
   Duration  12.91s
```

### After Changes
```
pnpm vitest run
 Test Files  96 passed (96)
      Tests  1448 passed | 2 skipped (1450)
   Duration  14.55s
```

### Comparison
- Tests added: 8
- Tests removed: 0
- Regressions: none

### New Tests Written
- `packages/cli/tests/utils/proofSummary.test.ts`: `describe('resolveCalloutPaths')` — 8 tests covering single match, zero match, multiple match, already-resolved, null file, build concerns, empty modules, path-boundary checking.

## Verification Commands
```
pnpm run build
cd packages/cli && pnpm vitest run
pnpm run lint
```

## Git History
```
c52650f [proof-context-query] Wire resolveCalloutPaths into writeProofChain
bafa74e [proof-context-query] Add resolveCalloutPaths function with tests
```

## Open Issues

1. **AC4 backfill has no integration test:** The backfill wiring in `writeProofChain` is not tested at the integration level — only the underlying `resolveCalloutPaths` function is unit-tested. An integration test would require either a real `.ana/` directory with proof chain data or mocking `writeProofChain`'s file I/O. The function-level tests prove correctness; the wiring is 4 lines of straightforward calls.

2. **Pre-check @ana tag collisions with existing features:** A007 is tagged COVERED partly because existing `@ana A007` tags from the `generateActiveIssuesMarkdown` tests (a previous feature) happen to share the same ID. The new A007 backfill assertion is addressed by the wiring code and function tests, but the tag match is coincidental. This is a known limitation of the @ana tag system when assertion IDs are reused across features.

Verified complete by second pass.
