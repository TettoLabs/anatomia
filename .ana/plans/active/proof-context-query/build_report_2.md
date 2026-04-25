# Build Report: Add `ana proof context` query command

**Created by:** AnaBuild
**Date:** 2026-04-24
**Spec:** .ana/plans/active/proof-context-query/spec-2.md
**Branch:** feature/proof-context-query

## What Was Built
- `packages/cli/src/utils/proofSummary.ts` (modified): Added `getProofContext()` function with three-tier file matching (exact, path-suffix, basename). Also added `fileMatches()` helper and `ProofContextResult` type. Zero CLI dependencies — returns structured data only.
- `packages/cli/src/commands/proof.ts` (modified): Added `context` subcommand to `proofCommand` via `proofCommand.addCommand()`. Accepts variadic file arguments and `--json` flag. Added `formatContextResult()` for human-readable output with chalk formatting.
- `packages/cli/tests/utils/proofSummary.test.ts` (modified): Added `getProofContext` describe block with 14 unit tests covering all matching tiers, null-file exclusion, build concerns, touch count, last-touched date, multiple files, missing chain file, and no-CLI-dependency assertion.
- `packages/cli/tests/commands/proof.test.ts` (modified): Added 5 integration tests for `ana proof context` covering basic query, `--json` output, no-data clean message, missing proof chain, and multiple files.

## PR Summary

- Added `ana proof context <files...>` command that queries proof chain for callouts and build concerns related to specific files
- Implemented three-tier file matching (exact path, path-suffix, basename) with path-boundary checks to prevent false positives
- `getProofContext()` utility function lives in `proofSummary.ts` with zero CLI dependencies, returning structured data for both human and JSON consumers
- `--json` flag produces structured output with callouts, build concerns, touch count, and last-touched date per queried file
- 19 new tests (14 unit + 5 integration) covering all matching scenarios and CLI output modes

## Acceptance Criteria Coverage

- AC5 "`ana proof context census.ts` returns all callouts and build concerns" -> proofSummary.test.ts "returns callouts for queried file (full path match)" + proof.test.ts "shows callout text for queried file" (5 assertions)
- AC6 "`ana proof context census.ts --json` returns structured JSON" -> proof.test.ts "returns valid parseable JSON" (4 assertions)
- AC7 "No data produces clean message" -> proof.test.ts "shows clean message for file with no data" (2 assertions)
- AC8 "Missing proof_chain.json produces clean message" -> proof.test.ts "shows clean message when no proof_chain.json exists" (2 assertions)
- AC9 "Query function importable without CLI deps" -> proofSummary.test.ts "getProofContext has no CLI dependencies" (2 assertions)
- AC10 "Matching handles full paths, partial paths, basenames" -> proofSummary.test.ts full-path, basename-to-full, full-to-basename, and boundary tests (4 tests, 5 assertions)
- Tests pass with `pnpm vitest run` -> verified below
- No build errors from `pnpm run build` -> verified below

## Implementation Decisions

1. **Commander `--json` option passthrough:** The parent `proof` command defines `--json`, which Commander consumes before routing to the `context` subcommand. Solved by checking `proofCommand.opts()['json']` in the context action handler, so `--json` works regardless of whether Commander routes it to parent or child.

2. **`fileMatches()` as module-private helper:** The matching function is not exported — it's only used by `getProofContext`. If future commands need the same matching, it can be exported then.

3. **Entries without `completed_at`:** The spec's gotcha warned about missing dates. Entries without `completed_at` contribute callouts but not touch count or last-touched date — an empty string date is never added to the touch dates list.

4. **Separator between multiple files:** Used `───` separator between file results in human-readable output, matching the spec mockup.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
cd packages/cli && pnpm vitest run
Test Files  96 passed (96)
     Tests  1448 passed | 2 skipped (1450)
```

### After Changes
```
cd packages/cli && pnpm vitest run
Test Files  96 passed (96)
     Tests  1467 passed | 2 skipped (1469)
```

### Comparison
- Tests added: 19 (14 unit + 5 integration)
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/utils/proofSummary.test.ts`: getProofContext suite — full-path match, basename-to-full-path suffix, full-path-to-basename legacy, basename-to-basename legacy, path-boundary false positive prevention, null-file exclusion, build concerns, empty result, missing chain file, multiple files, touch count, last-touched date, no CLI dependencies, entries without completed_at
- `tests/commands/proof.test.ts`: context subcommand suite — basic query with callout text, --json parseable output, no-data clean message, missing proof chain clean message, multiple file arguments

## Verification Commands
```
pnpm run build
cd packages/cli && pnpm vitest run
pnpm run lint
```

## Git History
```
d9de881 [proof-context-query:s2] Add proof context CLI subcommand
99b46cd [proof-context-query:s2] Add getProofContext query function
0124c36 [proof-context-query] Update: Verify report 1
db3f2d5 [proof-context-query] Update: Build report 1
505ecfc [proof-context-query] Fix: Add @ana A007 tag for backfill assertion coverage
6707d70 [proof-context-query] Verify report 1
28cbfee [proof-context-query] Build report 1
c52650f [proof-context-query] Wire resolveCalloutPaths into writeProofChain
bafa74e [proof-context-query] Add resolveCalloutPaths function with tests
```

## Open Issues

1. **Commander `--json` inheritance is fragile:** The `context` subcommand checks `proofCommand.opts()['json']` to detect when Commander routes `--json` to the parent. This works but couples the subcommand to the parent's option state. If more subcommands are added to `proof`, each would need the same workaround. A cleaner approach would be `enablePositionalOptions()` on both the root program and `proofCommand`, but that would require changes to `index.ts` and could affect all other commands.

2. **`ProofChainEntryForContext` duplicates type knowledge:** The interface duplicates field types from `ProofChainEntry` in `types/proof.ts`. This is intentional (same pattern as `ProofChainEntryForIndex` in the same file) to avoid importing command-layer types into utils, but means field additions need updating in both places.

Verified complete by second pass.
