# Build Report: Add `ana context status` command

**Created by:** AnaBuild
**Date:** 2026-03-30
**Spec:** .ana/plans/active/context-status/spec.md
**Branch:** feature/context-status

## What Was Built

- `packages/cli/src/constants.ts` (modified): Added `STALENESS_THRESHOLD = 5` constant for context file staleness detection.
- `packages/cli/src/commands/context.ts` (created): New command file implementing `context` parent with `status` subcommand. Shows health of context files (fresh/stale/scaffold/missing), supports JSON output, gracefully degrades without git.
- `packages/cli/src/index.ts` (modified): Imported and registered `contextCommand`.
- `packages/cli/tests/commands/context.test.ts` (created): Comprehensive test suite with 29 tests covering all acceptance criteria.

## PR Summary

- Add `ana context status` command to display health information for context files
- Each file shows status (fresh/stale/scaffold/missing), age, and commits since last update
- Files with 5+ commits since last committed are marked stale
- Supports `--json` flag for programmatic consumption and updates `lastHealth` in `.meta.json`
- Graceful degradation when git unavailable or `.meta.json` missing

## Acceptance Criteria Coverage

- AC1 "displays all 7 setup files" → context.test.ts:133 "shows all 7 setup files when present" (7 assertions)
- AC2 "each file shows existence, age, commits, status" → context.test.ts:161 "includes all required fields per setup file" (7 assertions)
- AC3 "files with >= 5 commits marked stale" → context.test.ts:181 "marks files with 5+ commits as stale" (2 assertions) + context.test.ts:241 "counts commits accurately" (2 assertions) + context.test.ts:254 "respects boundary at 4 commits" (2 assertions)
- AC4 "scaffold files detected by SCAFFOLD_MARKER" → context.test.ts:157 "shows scaffold files with scaffold status" (2 assertions)
- AC5 "analysis.md shown separately with label" → context.test.ts:297-319 (3 tests, 4 assertions)
- AC6 "JSON output matches display data" → context.test.ts:322-377 (3 tests, 15 assertions)
- AC7 "updates lastHealth in .meta.json" → context.test.ts:380-413 (2 tests, 8 assertions)
- AC8 "graceful degradation without git" → context.test.ts:418-443 (2 tests, 4 assertions)
- AC9 "graceful degradation without .meta.json" → context.test.ts:446-461 (2 tests, 2 assertions)
- AC10 "error when no .ana/ directory" → context.test.ts:464-470 (1 test, 1 assertion)
- AC11 "output is clear and scannable" → context.test.ts:501-536 (3 tests, 4 assertions) — judgment criterion verified via output structure
- AC12 "always exits 0" → context.test.ts:474-498 (3 tests) — verified function doesn't throw
- AC13 "tests pass" → ✅ 318 tests pass (see below)
- AC14 "no build errors" → ✅ build passes

## Implementation Decisions

1. **Staleness counting approach:** The spec mentioned using `git log --since` with file mtime, but this had timing issues in tests. Changed to use `git rev-list --count {commit}..HEAD` to count commits since the file was last committed, which is more semantically correct for "how stale is this documentation" and works reliably regardless of timestamp precision.

2. **Summary header format:** Used a flexible format that adapts to available data - shows "fresh/stale/scaffold/missing" breakdown when git is available, or "present/missing" when git unavailable.

3. **Test setup pattern:** Created a `createContextTestProject` helper matching the pattern from `work.test.ts` but specialized for context file scenarios.

## Deviations from Spec

### Deviation D1: Staleness counting mechanism
- **Spec said:** Use `git log --oneline --follow -- {file}` with `--since` based on file mtime
- **What I did:** Use `git log -1 --format=%H -- "{file}"` to find last commit touching the file, then `git rev-list --count {commit}..HEAD` to count commits since
- **Why:** The `--since` approach has timing issues when commits happen in quick succession (same second). The rev-list approach is deterministic regardless of timestamp resolution.
- **Alternatives considered:** Adding 1 second offset to mtime (too fragile), setting file mtime in tests (complex and slow with waits)
- **Coverage impact:** None - the behavior is semantically equivalent ("count commits since file was last updated")
- **Test skeleton impact:** None - all skeleton assertions pass with the new approach

## Test Results

### Baseline (before changes)
```
pnpm --filter anatomia-cli test -- --run
Test Files  25 passed (25)
Tests  289 passed (289)
Duration  6.13s
```

### After Changes
```
pnpm --filter anatomia-cli test -- --run
Test Files  26 passed (26)
Tests  318 passed (318)
Duration  5.92s
```

### Comparison
- Tests added: 29
- Tests removed: 0
- Regressions: none

### New Tests Written
- `packages/cli/tests/commands/context.test.ts`: 29 tests covering setup file display, staleness detection with boundary tests, analysis.md handling, JSON output, meta.json persistence, graceful degradation scenarios, exit codes, and output formatting.

## Verification Commands
```bash
pnpm --filter anatomia-cli build
pnpm --filter anatomia-cli test -- --run
pnpm --filter anatomia-cli lint
```

## Git History
```
da4ec07 [context-status] Add context status tests
da2d228 [context-status] Add context status command
81b6c0c [context-status] Add STALENESS_THRESHOLD constant
```

## Open Issues

None — verified by second pass. Implementation follows spec exactly except for the documented staleness counting deviation (D1), which is semantically equivalent and more robust.
