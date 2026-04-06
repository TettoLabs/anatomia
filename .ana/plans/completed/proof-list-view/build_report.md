# Build Report: Proof List View

**Created by:** AnaBuild
**Date:** 2026-04-05
**Spec:** .ana/plans/active/proof-list-view/spec.md
**Branch:** feature/proof-list-view

## What Was Built

- `packages/cli/src/commands/proof.ts` (modified): Made `<slug>` argument optional `[slug]`. Added early branch when slug is undefined: reads proof_chain.json and renders either a chalk+padEnd summary table (human-readable) or raw JSON (`--json`). Missing/empty file handled gracefully — "No proofs yet." (exit 0) for human, `{ "entries": [] }` for JSON. Detail view code unchanged. Added `formatListTable()` function with reverse-chronological sorting (undefined `completed_at` pushed to end).
- `packages/cli/tests/commands/proof.test.ts` (modified): Added 14 new integration tests covering: table headers (Slug/Result/Assertions/Date), entry data in rows, reverse chronological sort, assertion ratio (satisfied/total), missing file handling (exit 0), empty entries handling (exit 0), JSON list output, JSON with missing file, single entry rendering, undefined completed_at sorting, detail view unchanged, detail JSON unchanged.

## PR Summary

- Add summary table view to `ana proof` when called with no slug argument — displays proof history with slug, result, assertion ratio, and date columns
- Make Commander argument optional (`[slug]`), with early branch for list view that handles missing/empty proof_chain.json gracefully (exit 0)
- Support `--json` flag in list mode, outputting raw proof_chain.json contents (empty entries array when file missing)
- Sort entries most-recent-first with undefined `completed_at` pushed to end
- 14 new integration tests covering all list view behaviors; all 24 existing detail view tests pass unchanged

## Acceptance Criteria Coverage

- AC1 "table with columns: slug, result, assertion ratio, date" -> proof.test.ts "displays summary table" (4 assertions across 3 tests checking Slug, Result, Assertions, Date headers + stripe-payments slug + 2026-04-01 date) ✅
- AC2 "sorted most-recent-first" -> proof.test.ts "sorts entries reverse chronological" (1 test, indexOf comparison) ✅
- AC3 "assertion ratio shows satisfied/total" -> proof.test.ts "shows assertion ratio" (1 test, checks "20/22") ✅
- AC4 "missing or empty → No proofs yet., exit 0" -> proof.test.ts "handles missing proof_chain.json" + "handles empty entries array" (2 tests, check stdout + exitCode) ✅
- AC5 "ana proof --json outputs full proof_chain.json" -> proof.test.ts "outputs JSON list with --json flag" (1 test, parses JSON, checks entries array) ✅
- AC6 "detail card unchanged" -> proof.test.ts "detail view unchanged" (1 test, checks exitCode 0 + feature name) + all 24 existing tests pass ✅
- AC7 "detail JSON unchanged" -> proof.test.ts "detail JSON unchanged" (1 test, checks json.slug) ✅
- Tests pass: pnpm run test ✅
- No build errors: pnpm run build ✅
- Lint clean: pnpm run lint (0 errors, 17 pre-existing warnings) ✅

## Implementation Decisions

- **Pad-then-color for table alignment:** Used `entry.result.padEnd(9)` then wrapped with chalk color, rather than coloring first then padding. Prevents ANSI escape codes from breaking column alignment in real terminal output while still passing FORCE_COLOR=0 tests.
- **Corrupt file handling in list view:** Added try/catch around JSON.parse in the list view branch that treats corrupt files as empty (`{ entries: [] }`), since list view should never error on missing data per spec.
- **Sort comparator:** Used string `localeCompare` on ISO 8601 `completed_at` strings directly — lexicographic comparison is correct for ISO 8601 format, no need to parse to Date objects.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
$ pnpm run test -- --run
 Test Files  74 passed (74)
      Tests  932 passed (932)
   Start at  19:37:07
   Duration  16.76s
```

### After Changes
```
$ pnpm run test -- --run
 Test Files  74 passed (74)
      Tests  946 passed (946)
   Start at  19:39:31
   Duration  14.98s
```

### Comparison
- Tests added: 14
- Tests removed: 0
- Regressions: none

### New Tests Written
- `packages/cli/tests/commands/proof.test.ts`: 14 new tests covering list view table output (headers, slug, date, title), reverse chronological sort, assertion ratio, missing file (human + JSON), empty entries (human), JSON list output, single entry, undefined completed_at sorting, detail view unchanged, detail JSON unchanged.

## Verification Commands
```bash
pnpm run build
pnpm run test -- --run
pnpm run lint
```

## Git History
```
12950cc [proof-list-view] Add summary table view when proof called with no slug
```

## Open Issues

- The `padEnd` approach for the Result column pads the plain string before coloring. With `FORCE_COLOR=0` (test env), chalk is a no-op so columns align by character count. In a real terminal, ANSI codes are zero-width so this also works. However, if a future result value is longer than "FAIL" (4 chars), the 9-char pad would need updating. Currently only PASS/FAIL exist, so this is fine.
- The `ProofChain` interface is duplicated in proof.ts (line 28) and work.ts (line ~674) as noted in the spec's Gotchas. Not addressed by this spec — no change needed, just awareness.

Verified complete by second pass.
