# Spec: Fix scan branch detection — remove local branches from shared intelligence

**Created by:** AnaPlan
**Date:** 2026-05-15
**Scope:** .ana/plans/active/fix-scan-branch-detection/scope.md

## Approach

Two changes in `packages/cli/src/engine/detectors/git.ts`, both following the pattern already established by `detectBranchPatterns()` in the same file:

1. **`detectBranches()` switches from `git branch -a` to `git branch -r`.** Before running `-r`, check `git remote` to determine if any remote exists. If no remote: fall back to `git branch` (local only). If remote exists: use `git branch -r`, strip `origin/` prefix, skip HEAD pointer lines, skip bot-prefixed branches. The dedup Set and sort are reusable as-is.

2. **`detectBranchPatterns()` filters bot prefixes.** Before counting slash-delimited prefixes, skip branches whose name starts with any known bot prefix. This prevents `dependabot/` from dominating the `prefixes` map and being selected as `primary`.

Both functions already use `gitExec()`. No new dependencies. No interface changes — `branches` stays `string[] | null`, `branchPatterns` stays `{ prefixes: Record<string, number>; primary: string | null }`.

**Why `git remote` for fallback detection:** `git branch -r` returns empty string (exit 0) in both "no remote configured" and "remote exists but no branches pushed." These are different situations — no-remote repos should fall back to local branches (the data contamination disease doesn't exist without a remote to share through), while a remote with no branches should return an empty list. Running `git remote` (returns remote names or empty) distinguishes the two cases cleanly.

## Output Mockups

**Before fix — scan.json branches field (repo with remote):**
```json
"branches": [
  "dependabot/npm_and_yarn/typescript-5.8.3",
  "dependabot/npm_and_yarn/vitest-3.2.1",
  "experiment-ryan-local",
  "feature/add-proof-chain",
  "feature/fix-scan-branch-detection",
  "main",
  "old-sprint-3-wip",
  "renovate/eslint-9.x"
]
```

**After fix — same repo:**
```json
"branches": [
  "feature/add-proof-chain",
  "feature/fix-scan-branch-detection",
  "main"
]
```

Local-only branches (`experiment-ryan-local`, `old-sprint-3-wip`) and bot branches (`dependabot/...`, `renovate/...`) are gone. Only shared, human branches remain.

**Before fix — branchPatterns (bot branches dominating):**
```json
"branchPatterns": {
  "prefixes": { "dependabot/": 12, "feature/": 5, "renovate/": 3 },
  "primary": "dependabot/"
}
```

**After fix:**
```json
"branchPatterns": {
  "prefixes": { "feature/": 5 },
  "primary": "feature/"
}
```

## File Changes

### `packages/cli/src/engine/detectors/git.ts` (modify)
**What changes:** Two functions modified, one constant added.

1. Add a `BOT_BRANCH_PREFIXES` Set constant at module scope (near `SOURCE_EXTENSIONS` on line 257). Contains: `'dependabot/'`, `'renovate/'`, `'snyk-'`, `'greenkeeper/'`, `'imgbot/'`.

2. `detectBranches()` (line 100-118): Replace `git branch -a` with remote-aware logic:
   - Run `git remote` via `gitExec`. If output is falsy (no remote), run `git branch` (local only) and return those branches — same parsing as today minus the `remotes/origin/` stripping.
   - If remote exists, run `git branch -r`. Parse lines: trim, skip HEAD pointer lines (`includes(' -> ')`), strip `origin/` prefix, skip branches matching any `BOT_BRANCH_PREFIXES` entry, add to Set, sort.

3. `detectBranchPatterns()` (line 148-175): After stripping `origin/` prefix and before counting slash prefixes, skip branches where the name starts with any entry in `BOT_BRANCH_PREFIXES`.

**Pattern to follow:** `detectBranchPatterns()` at lines 148-175 in the same file — it already reads `git branch -r`, strips `origin/`, and skips HEAD pointers. The branch parsing loop structure is the template.

**Why:** Local branches in shared intelligence produce non-deterministic scan.json across developers. Bot branches pollute branching convention signal. Both are the same disease: non-shared state leaking into shared intelligence.

### `packages/cli/tests/engine/detectors/git-detection.test.ts` (modify)
**What changes:** Existing test continues to work (no-remote fallback path). Two new tests added.

1. **Existing test at line 82-99 ("returns branch list for local repo with commits"):** This test creates a repo with no remote and checks that local branches appear. With the fix, `detectBranches()` checks `git remote` → falsy → falls back to `git branch`. Test continues to pass with no changes.

2. **New test: "excludes local-only branches when remote exists"** — Creates a temp repo, adds a remote (can use `git remote add origin <dummy-url>` — `git branch -r` doesn't contact the remote), creates local branches, pushes nothing. Verifies that `detectBranches()` returns only remote-tracking branches (empty list in this case), not local ones. This is the core disease test.

3. **New test: "excludes bot prefixes from branchPatterns"** — Tests `detectBranchPatterns()` output on the Anatomia repo itself. Since this repo has `dependabot/` and `renovate/` remote branches, verify that `branchPatterns.prefixes` does not contain any key starting with `dependabot/`, `renovate/`, `snyk-`, `greenkeeper/`, or `imgbot/`. If the repo happens to have no bot branches at test time, create a test that mocks the scenario using a temp repo with a local remote containing bot-named branches.

**Pattern to follow:** The existing tests in this file — `fs.mkdtempSync` for temp dirs, `execSync` for git setup, try/finally with `fs.rmSync` for cleanup.

**Why:** AC4 requires existing test passes. AC5 and AC6 require new tests for the two new behaviors.

## Acceptance Criteria

- [ ] AC1: `detectBranches()` uses `git branch -r` when a remote exists, producing a branch list that is deterministic across developers who share the same remote.
- [ ] AC2: `detectBranches()` falls back to `git branch` (local only) when no remote exists, preserving branch detection for local-only repos.
- [ ] AC3: `detectBranchPatterns()` excludes known bot prefixes (`dependabot/`, `renovate/`, `snyk-`, `greenkeeper/`, `imgbot/`) from the `prefixes` map and `primary` selection.
- [ ] AC4: Existing test for no-remote branch detection continues to pass (with fallback behavior).
- [ ] AC5: New test verifies that local-only branches are excluded when a remote exists.
- [ ] AC6: New test verifies that bot prefixes are excluded from `branchPatterns`.
- [ ] Tests pass: `(cd packages/cli && pnpm vitest run)`
- [ ] No build errors: `(cd packages/cli && pnpm run build)`

## Testing Strategy

- **Unit tests:** All tests in `git-detection.test.ts`. Follow existing pattern: temp git repos via `fs.mkdtempSync`, git commands via `execSync`, cleanup in `finally` block.
- **Integration tests:** The test "returns non-empty array on Anatomia repo" (line 65-69) is already an integration test against the real repo. It continues to work — `main` is a remote branch.
- **Edge cases:**
  - No-remote repo with local branches → fallback returns local branches (existing test covers this)
  - Remote exists but no branches pushed → returns empty array, not null
  - Bot branch filtering doesn't affect non-bot branches with slashes (e.g., `feature/foo` is kept)

For the "excludes local-only branches when remote exists" test: create a temp repo, set up a local bare remote with `git init --bare`, add it as origin, push main. Then create a local-only branch. Run `detectGitInfo`. Verify that `branches` contains `main` but not the local-only branch. This approach avoids network calls while testing real remote behavior.

## Dependencies

None. All changes are in existing files with no new imports.

## Constraints

- No changes to `GitInfo` interface — `branches` stays `string[] | null`, `branchPatterns` type unchanged.
- No changes to any consumer (`state.ts`, work.ts, or downstream).
- Engine file: no chalk, no ora, no CLI dependencies.
- Bot prefix list is a simple hardcoded Set, not configurable. Acceptable per scope analysis.

## Gotchas

- **`git branch -r` vs `git remote` in no-remote repos:** Both return empty string (exit 0). `gitExec` returns `''` (falsy). The fallback logic must check `git remote` first to decide which `git branch` variant to run — don't try `-r` first and then fall back on empty output, because empty output from `-r` is ambiguous (no remote vs. remote with no branches).
- **Local bare remote for testing:** To test remote behavior without network calls, create a bare repo with `git init --bare`, add it as origin, and push. `git branch -r` then shows `origin/main`. This is the standard pattern for testing remote git behavior in unit tests.
- **`git remote add` without push:** Adding a remote doesn't create remote-tracking branches. `git branch -r` returns empty even though a remote exists. The test for "local branches excluded when remote exists" needs to push at least one branch to the bare remote to have remote-tracking refs to verify against.
- **Bot prefix matching:** `snyk-` uses a dash, not a slash. The filter should use `startsWith` for each prefix, which handles both `dependabot/npm_and_yarn/foo` and `snyk-fix/bar` correctly.
- **Existing test assertion on Anatomia repo:** The test at line 65-69 asserts `branches.length > 0` and `branches.includes('main')`. After the fix, the count drops significantly (local branches removed), but both assertions still hold because `main` is a remote branch. No test changes needed.

## Build Brief

### Rules That Apply
- ESM imports with `.js` extension on all relative imports.
- `import type` separate from value imports.
- Early returns over nested conditionals.
- Engine files: zero CLI dependencies (no chalk/ora). Empty catch blocks are intentional graceful degradation — don't add logging.
- Explicit return types on exported functions. Internal helpers can use inference.
- `| null` for checked-and-empty fields. `git remote` returning empty → means "no remote configured."
- Use `node:` prefix for built-in imports.
- Temp directories in tests: `fs.mkdtempSync` + try/finally with `fs.rmSync({ recursive: true, maxRetries: 3, retryDelay: 200 })`.

### Pattern Extracts

**`detectBranchPatterns()` — the structural analog (git.ts:148-175):**
```typescript
function detectBranchPatterns(cwd: string): GitInfo['branchPatterns'] {
  const output = gitExec('git branch -r', cwd);
  if (!output) return { prefixes: {}, primary: null };

  const prefixes: Record<string, number> = {};
  for (const line of output.split('\n')) {
    const name = line.trim().replace(/^origin\//, '');
    if (!name || name.includes(' -> ') || name === 'HEAD') continue;
    // Extract prefix: feature/foo → feature/, fix/bar → fix/
    const slashIdx = name.indexOf('/');
    if (slashIdx > 0) {
      const prefix = name.slice(0, slashIdx + 1);
      prefixes[prefix] = (prefixes[prefix] || 0) + 1;
    }
  }

  // Primary = most frequent prefix
  let primary: string | null = null;
  let maxCount = 0;
  for (const [prefix, count] of Object.entries(prefixes)) {
    if (count > maxCount) {
      primary = prefix;
      maxCount = count;
    }
  }

  return { prefixes, primary };
}
```

**Existing test pattern (git-detection.test.ts:82-99):**
```typescript
it('returns branch list for local repo with commits', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-branches-'));
  try {
    execSync('git init -b main', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'hello');
    execSync('git add . && git commit -m "init"', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git checkout -b feature', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git checkout main', { cwd: tmpDir, stdio: 'pipe' });

    const result = await detectGitInfo(tmpDir);
    expect(result.branches).toContain('main');
    expect(result.branches).toContain('feature');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, maxRetries: 3, retryDelay: 200 });
  }
});
```

### Proof Context
- `git.ts`: One active finding — `execSync` is architecturally correct for engine boundary but is the last non-test `execSync` in the codebase. Not relevant to this build (we're not changing the exec pattern, just the git commands passed to it).
- `git-detection.test.ts`: No active proof findings.

### Checkpoint Commands

- After modifying `detectBranches()`: `(cd packages/cli && pnpm vitest run tests/engine/detectors/git-detection.test.ts --run)` — Expected: existing tests pass
- After all changes: `(cd packages/cli && pnpm vitest run --run)` — Expected: 2339+ tests pass (2336 existing + 3 new)
- Lint: `pnpm run lint`
- Build: `(cd packages/cli && pnpm run build)`

### Build Baseline
- Current tests: 2336 passed, 2 skipped (2338 total)
- Current test files: 104
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected 2339+ tests in 104 files (new tests added to existing file)
- Regression focus: `tests/engine/detectors/git-detection.test.ts` — all existing branch tests must continue to pass
