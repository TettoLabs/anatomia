# Build Report: Learn V3 Phase 2 — Strengthen Subcommand

**Created by:** AnaBuild
**Date:** 2026-05-01
**Spec:** .ana/plans/active/learn-v3-cli-commands/spec-2.md
**Branch:** feature/learn-v3-cli-commands

## What Was Built

- `packages/cli/src/commands/proof.ts` (modified): Added `strengthen` subcommand between promote and audit. Follows close/promote structure: branch check → pull → read chain → find findings → mutate status to `promoted` with `promoted_to` → write chain → regenerate dashboard → git stage (skill file + proof chain + dashboard) → commit with `[learn]` prefix → push → output. Validates `--skill` and `--reason` required, checks uncommitted changes via both `git diff --name-only` and `git diff --name-only --cached`, supports `--force` for closed findings, variadic IDs, JSON envelope output.
- `packages/cli/tests/commands/proof.test.ts` (modified): Added 18 strengthen tests with `createStrengthenTestProject` helper that extends the promote helper pattern — creates git repo with proof chain and skill file, then modifies skill file after initial commit to create uncommitted changes. Tests cover: success path, no uncommitted changes error (human + JSON), skill not found, finding not found, already promoted, already closed with/without `--force`, variadic, wrong branch, JSON envelope, commit message format (`[learn]` prefix), co-author trailer, staged files verification, all IDs invalid, mixed valid/invalid IDs, missing `--reason`, missing `--skill`.

## PR Summary

- Added `ana proof strengthen <ids...> --skill <name> --reason "..."` subcommand that commits Learn's skill file edits and marks findings as promoted atomically
- Command verifies uncommitted changes to the specific skill file before proceeding, preventing the ISSUE-29 failure mode
- Uses `[learn]` commit prefix (not `[proof]`) to distinguish Learn maintenance commits from proof system commits
- Supports variadic IDs, `--force` for closed findings, and `--json` output matching the existing envelope pattern
- 18 new integration tests covering all acceptance criteria and edge cases

## Acceptance Criteria Coverage

- AC1 "strengthen succeeds with uncommitted changes" → proof.test.ts: "marks finding as promoted with skill path" (4 assertions) ✅
- AC2 "verifies uncommitted changes via git diff" → Implementation checks both `git diff --name-only` and `git diff --name-only --cached` ✅
- AC3 "exits with error when no uncommitted changes" → proof.test.ts: "exits with NO_UNCOMMITTED_CHANGES error" + JSON variant (3 assertions) ✅
- AC4 "status set to promoted with promoted_to" → proof.test.ts: "marks finding as promoted with skill path" checks `status === 'promoted'` and `promoted_to` path ✅
- AC5 "--force allows strengthening closed findings" → proof.test.ts: "rejects closed finding without --force" + "succeeds with --force flag" (4 assertions) ✅
- AC6 "variadic works" → proof.test.ts: "strengthens multiple findings in one commit" (4 assertions) ✅
- AC7 "commit message format [learn]" → proof.test.ts: "uses [learn] prefix, not [proof]" (4 assertions) ✅
- AC8 "commit includes co-author trailer" → proof.test.ts: "includes co-author in commit body" (1 assertion) ✅
- AC9 "--json returns structured output" → proof.test.ts: "returns valid JSON envelope" (8 assertions) ✅
- AC10 "git stages skill file, proof_chain.json, and PROOF_CHAIN.md" → proof.test.ts: "commit includes the skill file, proof chain, and dashboard" (3 assertions) ✅
- AC11 "all new commands have tests" → 18 new tests ✅
- AC12 "vitest run passes with no regressions" → 1737 passed, 0 regressions ✅
- AC13 "no build errors" → build + typecheck pass ✅

## Implementation Decisions

- Placed the uncommitted changes check before the pull/read chain sequence, so the "edit first" error appears immediately without network delay.
- Used both `git diff --name-only` (unstaged) and `git diff --name-only --cached` (staged) as the spec's Gotchas section recommended, accepting either as valid uncommitted changes.
- Test helper `createStrengthenTestProject` is self-contained rather than calling `createPromoteTestProject` — the promote helper doesn't support the `noUncommittedChanges` or `coAuthor` options needed for strengthen tests, and extending it would have required modifying shared test infrastructure.
- Multi-word `--reason` values in tests are wrapped in escaped double quotes (`'"reason text"'`) to match the pattern used by promote's `--text` option tests, since `runProof` joins args with spaces in a shell command.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1719 passed | 2 skipped (1721)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1737 passed | 2 skipped (1739)
```

### Comparison
- Tests added: 18
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/commands/proof.test.ts`: 18 strengthen tests covering success, error paths (no uncommitted changes, skill not found, finding not found, already promoted, already closed, wrong branch, missing required options, all IDs invalid), force flag, variadic, JSON output, commit message format, co-author trailer, staged files.

## Verification Commands
```bash
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
e4f8ba0 [learn-v3-cli-commands:s2] Add proof strengthen subcommand
ad96bc9 [learn-v3-cli-commands] Verify report 1
e8406c0 [learn-v3-cli-commands] Build report 1
064dddd [learn-v3-cli-commands:s1] Make proof promote variadic with co-author trailers
5e104c9 [learn-v3-cli-commands:s1] Make proof close variadic with --dry-run
2934bbe [learn-v3-cli-commands:s1] Replace inline coAuthor reads with readCoAuthor()
45beabd [learn-v3-cli-commands:s1] Add readCoAuthor to git-operations.ts
```

## Open Issues

Verified complete by second pass.
