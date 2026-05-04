# Spec: Security Hardening — Phase 2: runGit Utility & execSync Elimination

**Created by:** AnaPlan
**Date:** 2026-05-04
**Scope:** .ana/plans/active/security-hardening/scope.md

## Approach

Create a `runGit()` utility in `git-operations.ts` that wraps `spawnSync('git', args)` with array arguments, then migrate every `execSync` call in `src/commands/` and `src/utils/` to use either `runGit()` (for git calls) or `spawnSync` directly (for non-git calls like `gh`). After migration, the enforcement rule is: `execSync` in `src/commands/` and `src/utils/` = zero grep matches.

The `runGit()` API returns `{ stdout: string; stderr: string; exitCode: number }`. One shape covers all three usage patterns: stdout capture (`result.stdout`), success check (`result.exitCode === 0`), and error inspection (`result.stderr`). Callers destructure what they need. This follows the proven `spawnSync` result pattern already in `pr.ts:278`.

`documentation.ts` is in `src/engine/` — the engine has zero CLI dependencies. Its single `execSync` call gets migrated to `spawnSync` directly (imported from `node:child_process`), not `runGit` from utils. This maintains the architectural boundary.

Phase 1 (validators + config hardening) must be complete before this phase begins. All inputs reaching `runGit()` are already validated at entry points.

## Output Mockups

No user-visible output changes. All commands produce identical output — the migration is internal. The only observable difference: commands that previously failed silently on shell metacharacters in file paths now work correctly because `spawnSync` array args handle special characters natively.

## File Changes

### `src/utils/git-operations.ts` (modify)
**What changes:** Add `runGit()` function. Migrate `getCurrentBranch()` to use it. Remove the `execSync` import (replaced by `spawnSync`).
**Pattern to follow:** `pr.ts:278-282` — `spawnSync('gh', [...args])` with stdio pipe, encoding utf-8, exit code check. `runGit` generalizes this for git.
**Why:** Central utility that makes `execSync` mechanically unnecessary for git calls. After this, the import doesn't need to exist.

### `src/commands/artifact.ts` (modify)
**What changes:** Migrate all `execSync` calls to `runGit()` or `spawnSync`. This file has ~20 `execSync` calls: `git remote`, `git pull`, `git add`, `git push`, `git ls-files`, `git merge-base`, `git diff`. Replace the `execSync` import with `runGit` import from `git-operations.ts`. Keep `spawnSync` import for the existing commit calls.
**Pattern to follow:** The existing `spawnSync('git', ['commit', '-m', msg])` calls at lines 1051 and 1366 — same stdio/encoding pattern.
**Why:** 6 of these calls interpolate variables (`relFilePath`, `relCompanionPath`, `relPlanPath`, `savesPath`, file paths from `path.relative`). Even with validated slugs, file paths from `path.relative` could theoretically contain shell metacharacters. Array args eliminate the class of vulnerability entirely.

### `src/commands/work.ts` (modify)
**What changes:** Migrate all `execSync` calls to `runGit()` or `spawnSync`. This file has ~20 `execSync` calls. Includes the `gh pr view` call at line 1115 — migrate to `spawnSync('gh', ['pr', 'view', workBranchName, '--json', 'state', '-q', '.state'])`. Migrate `fileExistsOnBranch()`, `readFileOnBranch()`, `getWorkBranch()` private functions. Remove the `execSync` import.
**Pattern to follow:** The existing `spawnSync('git', ['commit', '-m', msg])` calls in the same file.
**Why:** `fileExistsOnBranch` and `readFileOnBranch` interpolate `branch` and `filePath` into shell strings. `getWorkBranch` interpolates `slug`. `gh pr view` interpolates `workBranchName` (which includes `branchPrefix` from config). All are injection vectors.

### `src/commands/proof.ts` (modify)
**What changes:** Migrate all `execSync` calls to `runGit()`. This file has ~14 `execSync` calls across three subcommands (close, promote, strengthen): `git remote`, `git pull`, `git add`, `git push`, `git diff`. The `git add` calls at lines 1133 and 1456 interpolate `skillRelPath` — these are the injection-relevant ones. Remove the `execSync` import.
**Pattern to follow:** The existing `spawnSync('git', ['commit', '-m', msg])` calls at lines 783, 1138, 1458.
**Why:** `git add ${skillRelPath}` and `git diff -- ${skillRelPath}` interpolate a path derived from `options.skill`. Even though Phase 1 validates skill names, Layer 2 ensures the execution path is inherently safe.

### `src/commands/init/preflight.ts` (modify)
**What changes:** Migrate 2 `execSync` calls (`git rev-parse --verify HEAD`, `git remote`) to `runGit()`. Both are hardcoded strings with no interpolation, but the enforcement rule requires zero `execSync` in commands/utils.
**Pattern to follow:** Same `runGit()` pattern as other migrations.
**Why:** Convention enforcement — grep check must show zero `execSync` in `src/commands/` and `src/utils/`.

### `src/utils/proofSummary.ts` (modify)
**What changes:** Migrate 2 `execSync` calls (`git config user.name`, `git config user.email`) to `runGit()`. Both are hardcoded strings, no interpolation.
**Pattern to follow:** Same `runGit()` pattern.
**Why:** Convention enforcement — zero `execSync` in `src/utils/`.

### `src/engine/detectors/documentation.ts` (modify)
**What changes:** Migrate 1 `execSync` call (`git log --format="%ct" -1 -- "${relativePath}"`) to `spawnSync` with array args. Import `spawnSync` from `node:child_process`. Do NOT import `runGit` — engine has zero CLI/utils dependencies.
**Pattern to follow:** Direct `spawnSync('git', ['log', '--format=%ct', '-1', '--', relativePath])` with the same error handling (try/catch, fallback to fs.stat).
**Why:** `relativePath` comes from filesystem traversal during scan. A filename with shell metacharacters (unlikely but possible) could inject. Array args eliminate the risk. Engine boundary stays clean.

### `tests/utils/git-operations.test.ts` (modify)
**What changes:** Add tests for `runGit()`: successful command returns stdout and exitCode 0, failing command returns non-zero exitCode, output capture works correctly.
**Pattern to follow:** The existing temp-directory test pattern in this file.
**Why:** `runGit()` is the security-critical utility — it needs direct tests beyond just testing it through callers.

## Acceptance Criteria

- [ ] AC9: Zero `execSync` calls remain in `src/commands/` or `src/utils/` (grep verification: `execSync` matches zero lines in those directories, excluding import type statements)
- [ ] AC11: All existing tests pass without modification (behavioral backward-compatibility for valid inputs)
- [ ] AC12: New tests cover `runGit()` utility (success, failure, output capture)
- [ ] `documentation.ts` uses `spawnSync` directly, not `runGit` (engine boundary preserved)
- [ ] `gh pr view` at work.ts uses `spawnSync('gh', [...])` with array args (no shell interpolation)
- [ ] No `execSync` import statements remain in `src/commands/` or `src/utils/` files

## Testing Strategy

- **Unit tests for `runGit()`:** Create a temp directory with `git init`. Run `runGit(['rev-parse', '--is-inside-work-tree'])` — expect stdout `'true'`, exitCode 0. Run `runGit(['log', '--oneline', '-1'])` on a repo with commits — expect non-empty stdout. Run `runGit(['branch', '--list', 'nonexistent'])` — expect empty stdout, exitCode 0. Run `runGit` with an invalid subcommand — expect non-zero exitCode. Test the `cwd` option works correctly.
- **Integration verification:** All 1807+ existing tests pass. These tests use real git repos in temp directories and exercise the actual `spawnSync` behavior — they're the best possible integration tests for this migration.
- **Grep verification test:** Consider a test that greps `src/commands/` and `src/utils/` for `execSync` and asserts zero matches. This makes the enforcement rule part of the test suite, not just a one-time check.

## Dependencies

Phase 1 must be complete — validators and config reader hardening must be in place.

## Constraints

- Engine files (`src/engine/`) have zero CLI dependencies. `documentation.ts` uses `spawnSync` directly, not `runGit`.
- `runGit()` must accept a `cwd` option — many callers pass `{ cwd: projectRoot }` or `{ cwd: proofRoot }`.
- The `git add` command accepts multiple paths — `runGit(['add', file1, file2, file3])` replaces `execSync(\`git add ${f1} ${f2} ${f3}\`)`. Each file is a separate array element.
- `git show branch:path` is a single argument to git (the colon-separated ref:path syntax). In spawnSync: `runGit(['show', \`${branch}:${filePath}\`])`. The colon joins branch and path in one array element — this is git syntax, not shell syntax.

## Gotchas

- **`git diff` with `:(exclude)` pathspec** — `artifact.ts:156` uses `git diff ${mergeBase} --name-only -- . ":(exclude).ana"`. In spawnSync array args, the exclude pathspec is just another element: `['diff', mergeBase, '--name-only', '--', '.', ':(exclude).ana']`. No shell quoting needed — git handles pathspecs natively.
- **`git log --format='%ct'`** — the single quotes are shell quoting, not part of the format string. In spawnSync: `['log', '--format=%ct', '-1', '--', relativePath]`. Drop the quotes.
- **`git add` with multiple files** — `execSync('git add .ana/plans/ .ana/proof_chain.json .ana/PROOF_CHAIN.md')` becomes `runGit(['add', '.ana/plans/', '.ana/proof_chain.json', '.ana/PROOF_CHAIN.md'])`. Each path is a separate array element.
- **`git push origin --delete branchName`** — `runGit(['push', 'origin', '--delete', workBranchName])`. The branch name is already validated by Phase 1.
- **`git branch -d branchName`** — `runGit(['branch', '-d', workBranchName])`. Same validation applies.
- **`git fetch origin branchName --quiet`** — `runGit(['fetch', 'origin', artifactBranch, '--quiet'])`. The `--quiet` flag goes at the end.
- **`git rev-list branch..origin/branch --count`** — `runGit(['rev-list', \`${artifactBranch}..origin/${artifactBranch}\`, '--count'])`. The range is git syntax (one element), not shell interpolation.
- **`git merge-base --is-ancestor branch HEAD`** — exit code is the signal (0 = ancestor, 1 = not). Check `result.exitCode`, not stdout.
- **Import cleanup** — after migration, each file should remove its `execSync` import from `node:child_process`. Some files keep `spawnSync` for commit calls or `gh` calls. Files that only used `execSync` can remove the entire `child_process` import if they now use `runGit` exclusively (which re-exports through the utility).
- **The `gh pr view` call wraps the entire spawnSync differently.** This is not `runGit` — it's `spawnSync('gh', [...])` directly, since `runGit` is specifically for git. Follow the existing `pr.ts:278` pattern.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions: `import { runGit } from '../utils/git-operations.js'`
- Use `node:` prefix for built-ins: `import { spawnSync } from 'node:child_process'`
- Exported functions require `@param` and `@returns` JSDoc tags
- Engine files have zero CLI dependencies — `documentation.ts` imports from `node:child_process` only
- Prefer early returns over nested conditionals
- Tests use `fs.mkdtemp` for temp directories, cleaned in `afterEach`

### Pattern Extracts

The structural analog — `pr.ts:278-286` — spawnSync with array args, exit code check, error handling:
```typescript
// pr.ts:278-286
  const ghResult = spawnSync(
    'gh',
    ['pr', 'create', '--base', artifactBranch, '--head', currentBranch, '--title', prTitle, '--body', prBody],
    { cwd: projectRoot, stdio: 'pipe', encoding: 'utf-8' }
  );

  if (ghResult.status !== 0) {
    const errorOutput = ghResult.stderr || ghResult.stdout || '';
```

The existing safe commit pattern — `artifact.ts:1051-1056`:
```typescript
// artifact.ts:1051-1056
    const commitResult = spawnSync('git', ['commit', '-m', commitMessage], { stdio: 'pipe', cwd: projectRoot });
    if (commitResult.status !== 0) throw new Error(commitResult.stderr?.toString() || 'Commit failed');
```

The documentation.ts call to migrate — `documentation.ts:103-107`:
```typescript
// documentation.ts:100-107
  const relativePath = relative(rootPath, filePath);
  try {
    const output = execSync(`git log --format="%ct" -1 -- "${relativePath}"`, {
      cwd: rootPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
```

### Proof Context
No active proof findings for affected files.

### Checkpoint Commands

- After `runGit()` added: `(cd packages/cli && pnpm vitest run --run tests/utils/git-operations.test.ts)` — Expected: all tests pass including new runGit tests
- After `artifact.ts` migration: `(cd packages/cli && pnpm vitest run --run tests/commands/artifact.test.ts)` — Expected: all artifact tests pass
- After `work.ts` migration: `(cd packages/cli && pnpm vitest run --run tests/commands/work.test.ts)` — Expected: all work tests pass
- After `proof.ts` migration: `(cd packages/cli && pnpm vitest run --run tests/commands/proof.test.ts)` — Expected: all proof tests pass
- After all migrations: `(cd packages/cli && pnpm vitest run --run)` — Expected: 1840+ tests pass (Phase 1 count + runGit tests)
- Grep verification: `grep -r 'execSync' packages/cli/src/commands/ packages/cli/src/utils/` — Expected: zero matches
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1807 passed, 2 skipped (from Phase 1 this will be higher — use Phase 1's final count)
- Current test files: 93 (may be 94 after Phase 1)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected Phase 1 count + ~8-12 runGit tests + grep enforcement test
- Regression focus: `tests/commands/artifact.test.ts`, `tests/commands/work.test.ts`, `tests/commands/proof.test.ts`, `tests/commands/verify.test.ts` (has an import-ban test at line 267 that checks verify.ts doesn't import execSync — our migration supports this)
