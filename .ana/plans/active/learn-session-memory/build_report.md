# Build Report: Learn Session Memory

**Created by:** AnaBuild
**Date:** 2026-05-17
**Spec:** .ana/plans/active/learn-session-memory/spec.md
**Branch:** feature/learn-session-memory

## What Was Built

- `packages/cli/src/commands/learn.ts` (created): New `ana learn end` command — writes timestamp to `.ana/learn/state.json`, commits, pushes. Branch enforcement, JSON output, creates missing directory.
- `packages/cli/src/commands/init/assets.ts` (modified): `createDirectoryStructure` creates `.ana/learn/` with seeded `state.json` (`{ "last_session_at": null }`).
- `packages/cli/src/commands/init/state.ts` (modified): `preserveUserState` copies `learn/` directory on re-init (step 6, before plans/active).
- `packages/cli/src/commands/proof.ts` (modified): Added `--new` and `--since` options to audit. Post-collection filters using entry `completed_at` map. Matrix enrichment adds `new_since_last` and `last_session_at` when session exists. Exported `commitAndPushProofChanges` and `pullBeforeRead` for reuse.
- `packages/cli/src/index.ts` (modified): Registered `registerLearnCommand` in INTELLIGENCE group after proof.
- `packages/cli/templates/.claude/agents/ana-learn.md` (modified): Session-aware startup (new findings count), session boundary expectation-setting, wrap-up flow with `ana learn end`, added to Reference commands.
- `.claude/agents/ana-learn.md` (modified): Synced with template (dogfood parity test requires it).
- `README.md` (modified): Added `ana proof audit --new`, `ana proof audit --since`, and `ana learn end` to command table.
- `website/content/docs/guides/using-ana-learn.mdx` (modified): Added "New since last session" to mock output, mentioned `--new` in session flow, noted `ana learn end` at wrap-up.
- `website/content/docs/concepts/toolbelt.mdx` (modified): Updated ana-learn row with `--new` and `ana learn end`.
- `packages/cli/tests/commands/learn.test.ts` (created): 6 tests covering learn end (timestamp write, commit, branch rejection, findings count, missing directory, JSON output).
- `packages/cli/tests/commands/proof.test.ts` (modified): 16 tests covering --new, --since, filter composition, matrix enrichment (JSON and human-readable).
- `packages/cli/tests/commands/init.test.ts` (modified): 2 tests covering learn directory creation and re-init preservation.

## PR Summary

- Add `ana learn end` command that marks session boundaries by writing a timestamp, committing, and pushing
- Add `--new` and `--since` flags to `ana proof audit` for session-aware finding filtering
- Enrich `--matrix` output with `new_since_last` count when a session timestamp exists
- Update Learn template with session-aware startup and explicit wrap-up flow
- Seed `.ana/learn/state.json` during `ana init` and preserve it on re-init

## Acceptance Criteria Coverage

- AC1 "init creates learn directory" → init.test.ts "creates .ana/learn/state.json with null last_session_at" (1 assertion)
- AC2 "re-init preserves state.json" → init.test.ts "preserves existing learn state with non-null timestamp" (2 assertions)
- AC3 "--new filters after last_session_at" → proof.test.ts "shows only findings from entries completed after last session" (1 assertion)
- AC4 "--new with null shows all" → proof.test.ts "shows all findings when no session recorded" (1 assertion)
- AC5 "--since filters after date" → proof.test.ts "shows only findings from entries completed after the date" (1 assertion)
- AC6 "--new composes with --severity" → proof.test.ts "returns intersection of --new and --severity filters" (2 assertions)
- AC7 "--matrix ignores --new and --since" → proof.test.ts 2 tests (1 assertion each)
- AC8 "matrix includes new_since_last when set" → proof.test.ts "includes new_since_last count in matrix JSON" (1 assertion)
- AC9 "matrix omits when null" → proof.test.ts "omits new_since_last when no session recorded" (1 assertion)
- AC10 "learn end writes timestamp and commits" → learn.test.ts 2 tests (timestamp write + commit message)
- AC11 "learn end enforces branch" → learn.test.ts "exits with error when not on artifact branch" (2 assertions)
- AC12 "learn end shows findings count" → learn.test.ts "shows how many findings will be old next time" (2 assertions)
- AC13 "template references --new count" → template contains "new findings since last session" (verified by content)
- AC14 "template communicates session boundaries" → template contains `ana learn end` in startup and wrap-up
- AC15 "--new and --since with --json" → proof.test.ts 2 tests (verified JSON envelope and counts)
- "Tests pass" → ✅ 2482 passed
- "No build errors" → ✅ pnpm run build succeeds
- "Lint passes" → ✅ (1 pre-existing warning in git-operations.ts)
- "README, guide, toolbelt updated" → ✅ All three files modified

## Implementation Decisions

1. **Exported `commitAndPushProofChanges` and `pullBeforeRead` from proof.ts** rather than extracting to git-operations.ts. Minimal change, avoids moving functions and potentially breaking internal references.
2. **Matrix session enrichment reads `state.json` synchronously** (fs.existsSync + readFileSync) matching the existing pattern in proof.ts where all file I/O is synchronous.
3. **`--new`/`--since` placed after `--entry` filter** in the post-collection filter chain. Filters compose additively: severity → entry → new/since.
4. **`wrapJsonResponse` for learn end** passed `{ entries: [] }` as the chain parameter since learn end has no chain context. This produces a zeroed `meta` health block — acceptable for a non-proof command.
5. **Dogfood sync**: Test `agent-proof-context.test.ts:A008` enforces template ↔ dogfood parity. Updated `.claude/agents/ana-learn.md` to match.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  107 passed (107)
     Tests  2458 passed | 2 skipped (2460)
  Duration  40.44s
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  108 passed (108)
     Tests  2482 passed | 2 skipped (2484)
  Duration  44.17s
```

### Comparison
- Tests added: 24 (6 in learn.test.ts, 16 in proof.test.ts, 2 in init.test.ts)
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/commands/learn.test.ts`: learn end writes timestamp, commits, rejects wrong branch, shows findings count, creates missing directory, JSON output
- `tests/commands/proof.test.ts`: --new filter (3 cases), --since filter (3 cases), composition, matrix ignores both flags, matrix enrichment JSON/human (6 cases), --new/--since with --json (2 cases)
- `tests/commands/init.test.ts`: learn directory creation, re-init preservation

## Verification Commands
```bash
(cd packages/cli && pnpm run build)
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
b28015be [learn-session-memory] Sync dogfood ana-learn.md with template
666def55 [learn-session-memory] Update template and documentation
dfdf3caa [learn-session-memory] Add ana learn end command
b6a97e6c [learn-session-memory] Add --new and --since audit flags with matrix enrichment
358f8ebd [learn-session-memory] Add learn directory to init and re-init
```

## Open Issues

- Pre-existing lint warning in `packages/cli/src/utils/git-operations.ts:198` — "Unused eslint-disable directive (no-control-regex)" — not introduced by this build.
- `commitAndPushProofChanges` is now exported from proof.ts. Future work may want to extract it to git-operations.ts for cleaner module boundaries (spec's dependency section noted this). Kept in proof.ts to minimize diff.

Verified complete by second pass.
