# Build Report: Security Hardening — Phase 2: runGit Utility & execSync Elimination

**Created by:** AnaBuild
**Date:** 2026-05-04
**Spec:** .ana/plans/active/security-hardening/spec-2.md
**Branch:** feature/security-hardening

## What Was Built
- `packages/cli/src/utils/git-operations.ts` (modified): Added `runGit()` utility wrapping `spawnSync('git', args)` with `RunGitResult` interface. Migrated `getCurrentBranch()` to use it. Removed `execSync` import.
- `packages/cli/src/commands/artifact.ts` (modified): Migrated ~18 `execSync` calls to `runGit()`. Removed `execSync` import.
- `packages/cli/src/commands/work.ts` (modified): Migrated ~25 `execSync` calls to `runGit()` or `spawnSync`. `fileExistsOnBranch()`, `readFileOnBranch()`, `getWorkBranch()` now use `runGit()`. `gh pr view` uses `spawnSync('gh', [...])` directly.
- `packages/cli/src/commands/proof.ts` (modified): Migrated ~14 `execSync` calls to `runGit()`. Removed `execSync` import.
- `packages/cli/src/commands/init/preflight.ts` (modified): Migrated 2 `execSync` calls to `runGit()`. Replaced `execSync` import with `runGit` import.
- `packages/cli/src/utils/proofSummary.ts` (modified): Migrated 2 `execSync` calls (`git config user.name/email`) to `runGit()`. Replaced `execSync` import with `runGit` import.
- `packages/cli/src/engine/detectors/documentation.ts` (modified): Migrated 1 `execSync` call to `spawnSync` with array args. Engine boundary preserved — no `runGit` import.
- `packages/cli/tests/utils/git-operations.test.ts` (modified): Added 6 tests: 5 for `runGit()` (success, failure, cwd, empty output, stderr) + 1 grep enforcement test.

## PR Summary

- Introduced `runGit()` utility in `git-operations.ts` that wraps `spawnSync('git', args)` with a clean `{ stdout, stderr, exitCode }` API
- Migrated ~60 `execSync` calls across 6 source files to array-based argument passing, eliminating shell interpolation as a vulnerability class
- Engine boundary maintained: `documentation.ts` uses `spawnSync` directly, not `runGit`
- Added grep enforcement test that verifies zero `execSync` usage in `src/commands/` and `src/utils/`
- All existing tests pass unmodified — behavioral backward-compatibility confirmed

## Acceptance Criteria Coverage

- AC9 "Zero execSync in src/commands/ or src/utils/" → git-operations.test.ts "zero execSync in commands and utils" (grep enforcement test)
- AC11 "All existing tests pass without modification" → Full suite: 1839 passed, 0 failed
- AC12 "New tests cover runGit() utility" → git-operations.test.ts:305-352 (5 test cases: success, failure, cwd, empty output, stderr)
- AC "documentation.ts uses spawnSync directly, not runGit" → Verified: `spawnSync` imported from `node:child_process`, no `runGit` import
- AC "gh pr view uses spawnSync('gh', [...])" → work.ts uses `spawnSync('gh', ['pr', 'view', workBranchName, '--json', 'state', '-q', '.state'])`
- AC "No execSync import statements remain" → Verified: zero `execSync` in imports or calls in commands/ and utils/

## Implementation Decisions

1. **`runGit` trims stdout/stderr by default.** All callers previously called `.trim()` on execSync output. Building trim into the utility eliminates repetition.
2. **Pull failure detection uses `exitCode` + `stderr` inspection** instead of try/catch. The old pattern caught exceptions from `execSync`; the new pattern checks `runGit` result fields. Same logic, different control flow.
3. **Block scoping for pull sections.** Used `{ const remotes = ... }` blocks to avoid `remotes` variable conflicts in functions with multiple pull patterns (work.ts `complete`).
4. **`gh pr view` stays as `spawnSync('gh', [...])`** — not wrapped in `runGit` since it's not a git command. Follows the `pr.ts:278` pattern explicitly.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  94 passed (94)
     Tests  1833 passed | 2 skipped (1835)
  Duration  55.77s
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  94 passed (94)
     Tests  1839 passed | 2 skipped (1841)
  Duration  52.20s
```

### Comparison
- Tests added: 6
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/utils/git-operations.test.ts`: 5 runGit unit tests (success/failure/cwd/empty/stderr) + 1 grep enforcement test

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
grep -r 'execSync' packages/cli/src/commands/ packages/cli/src/utils/
```

## Git History
```
5b5a646 [security-hardening:s2] Migrate preflight, proofSummary, documentation
85a323d [security-hardening:s2] Migrate artifact, work, proof to runGit
55b0252 [security-hardening:s2] Add runGit utility and enforcement test
56b8291 [security-hardening] Verify report 1
9a013ee [security-hardening] Build report
acc8f9d [security-hardening:s1] Wire validation into command entry points
015fe0a [security-hardening:s1] Add .git containment check to findProjectRoot
19850ef [security-hardening:s1] Harden config readers against injection
e11aa21 [security-hardening:s1] Add shared input validators
```

## Open Issues

1. **Pre-existing lint warning in git-operations.ts:169** — "Unused eslint-disable directive (no-control-regex)". This directive was added in Phase 1 for the `readCoAuthor` regex. Not introduced by this phase but now visible in lint output. The eslint-disable comment guards against a potential ESLint change; leaving it is intentional defensive coding.

2. **The grep enforcement test uses `spawnSync('grep', ...)` which is platform-dependent.** On Windows this would fail. The project is macOS/Linux-only currently (CLI tool), so this is acceptable but worth noting.

Verified complete by second pass.
