# Build Report: Learn V3 Phase 1 — readCoAuthor + Variadic Close/Promote

**Created by:** AnaBuild
**Date:** 2026-05-01
**Spec:** .ana/plans/active/learn-v3-cli-commands/spec-1.md
**Branch:** feature/learn-v3-cli-commands

## What Was Built

- `packages/cli/src/utils/git-operations.ts` (modified): Added `readCoAuthor()` export — reads coAuthor from `.ana/ana.json`, falls back to `'Ana <build@anatomia.dev>'`. Same pattern as `readBranchPrefix()`.
- `packages/cli/src/commands/artifact.ts` (modified): Replaced 2 inline coAuthor reads with `readCoAuthor()` import (in `saveArtifact` and `saveAllArtifacts`).
- `packages/cli/src/commands/work.ts` (modified): Replaced 1 inline coAuthor read with `readCoAuthor()` import (in `completeWork`).
- `packages/cli/src/commands/pr.ts` (modified): Replaced 1 inline coAuthor read with `readCoAuthor()` import (in `createPr`).
- `packages/cli/src/commands/proof.ts` (modified): Rewrote close subcommand — `<id>` → `<ids...>`, added `--dry-run` flag, variadic loop with result collection, batch commit with co-author trailer via `readCoAuthor()`. Backward-compatible single-ID output (both human and JSON). Rewrote promote subcommand — same variadic pattern, one rule appended per batch using first finding's summary, batch commit with co-author trailer.
- `packages/cli/tests/utils/git-operations.test.ts` (modified): Added 4 tests for `readCoAuthor` — reads config, falls back on missing file, falls back on missing field, falls back on corrupt JSON.
- `packages/cli/tests/commands/proof.test.ts` (modified): Added 13 tests — close variadic (multi-ID, partial failure, all invalid, dry-run, dry-run JSON, JSON envelope, already-closed skip, co-author trailer, single-ID backward compat), promote variadic (multi-ID with single rule, co-author trailer, all invalid, single-ID backward compat).

## PR Summary

- Extract `readCoAuthor()` into `git-operations.ts` and replace 5 inline copies across artifact.ts, work.ts, pr.ts, and proof.ts
- Make `proof close` variadic — close multiple findings with one command, one commit; add `--dry-run` flag for preview without mutation
- Make `proof promote` variadic — promote multiple findings with one command, one rule appended, one commit
- Add co-author trailers to close and promote commits via `readCoAuthor()`
- Full backward compatibility for single-ID invocations (human output and JSON envelope shapes preserved)

## Acceptance Criteria Coverage

- AC1 "`readCoAuthor()` exists in `git-operations.ts`, exported, with JSDoc" → git-operations.test.ts "reads coAuthor from ana.json when present" (1 assertion) ✅
- AC2 "All 5 inline coAuthor reads replaced" → verified via `grep 'let coAuthor|config\.coAuthor' src/` returning 0 matches ✅
- AC3 "`ana proof close F001 --reason "test"` still works" → proof.test.ts "single ID still works after variadic change" (2 assertions) ✅
- AC4 "`ana proof close F001 F002 --reason "test"` closes both, one commit" → proof.test.ts "closes two findings with one command and one commit" (4 assertions) ✅
- AC5 "`ana proof close F001 F999 --reason "test"` closes F001, reports F999 as skipped" → proof.test.ts "closes valid IDs and skips invalid ones" (3 assertions) ✅
- AC6 "`ana proof close F001 --dry-run --reason "test"` shows what would happen" → proof.test.ts "shows what would happen without mutating" (4 assertions) ✅
- AC7 "Close commit message includes co-author trailer" → proof.test.ts "includes co-author in commit body" (1 assertion) ✅
- AC8 "`ana proof promote F001 --skill coding-standards` still works" → proof.test.ts "single ID still works after variadic change" (2 assertions) ✅
- AC9 "`ana proof promote F001 F002 --skill coding-standards` promotes both, one rule appended" → proof.test.ts "promotes two findings with one rule appended" (5 assertions) ✅
- AC10 "Promote commit message includes co-author trailer" → proof.test.ts "includes co-author in commit body" (1 assertion) ✅
- AC11 "Close and promote JSON output returns per-finding results" → proof.test.ts "returns per-finding results in JSON" + "returns dry_run: true in JSON envelope" ✅
- AC12 "All new/modified commands have tests" → 17 new tests added ✅
- AC13 "`(cd packages/cli && pnpm vitest run)` passes with no regressions" → 1719 passed, 0 regressions ✅
- AC14 "No build errors" → typecheck + build + lint all pass ✅

## Implementation Decisions

- Single-ID backward compatibility for JSON output: When exactly one ID is passed and it succeeds, the JSON envelope uses the original `finding`/`previous_status`/`new_status` shape. Multi-ID uses `closed[]`/`skipped[]` arrays. This preserves existing agent integrations.
- Close dry-run skips branch check: Dry run is read-only, so requiring artifact branch would prevent previewing from feature branches. Spec didn't specify; chose permissive.
- Close with mix of active and already-closed: Already-closed findings are reported as "already closed" in the skipped array. The command still succeeds (exit 0) as long as at least one ID was closed.
- Promote uses first finding's summary as default rule text for variadic: Spec said "first ID's summary as default `--text`" — implemented exactly.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1702 passed | 2 skipped (1704)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1719 passed | 2 skipped (1721)
```

### Comparison
- Tests added: 17
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/utils/git-operations.test.ts`: readCoAuthor — reads from config, falls back on missing file, falls back on missing field, falls back on corrupt JSON (4 tests)
- `tests/commands/proof.test.ts`: close variadic — multi-ID, partial failure, all invalid, dry-run, dry-run JSON, JSON envelope, already-closed skip, co-author trailer, single-ID backward compat (9 tests); promote variadic — multi-ID with single rule, co-author trailer, all invalid, single-ID backward compat (4 tests)

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
064dddd [learn-v3-cli-commands:s1] Make proof promote variadic with co-author trailers
5e104c9 [learn-v3-cli-commands:s1] Make proof close variadic with --dry-run
2934bbe [learn-v3-cli-commands:s1] Replace inline coAuthor reads with readCoAuthor()
45beabd [learn-v3-cli-commands:s1] Add readCoAuthor to git-operations.ts
```

## Open Issues

- Close dry-run skips branch check — this is a deliberate choice for usability (preview from any branch), but verify may flag it as a deviation from close's normal branch-enforcement behavior.
- Promote variadic uses first finding's summary for the single rule regardless of how many findings are promoted. If the findings cover different concerns, the rule text may not represent all of them. The `--text` flag provides an override.

Verified complete by second pass.
