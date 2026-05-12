# Spec: Fix worktree branch parsing

**Created by:** AnaPlan
**Date:** 2026-05-12
**Scope:** .ana/plans/active/fix-worktree-branch-parsing/scope.md

## Approach

`git branch -a` marks worktree-checked-out branches with `+ ` (plus-space). Two parsing sites strip `* ` (current branch) but not `+ `. The fix widens both to strip either marker using a character class regex `[*+] `.

**work.ts:144** — already uses `.replace(/^\* /, '')`. Change to `.replace(/^[*+] /, '')`. One character class widening, same chain position.

**git.ts:109** — uses `if (name.startsWith('* ')) name = name.slice(2)`. Replace with `name = name.replace(/^[*+] /, '')`. This removes the if-statement entirely — both a fix and a simplification.

**Test infrastructure** — extend `createWorkTestProject` with `worktree: true` on slug options. When set, uses `git worktree add` instead of `git checkout -b`. The test proves the full integration path: real worktree output → `getWorkStatus` from main tree → clean branch name in JSON. The top-level `afterEach` gains worktree cleanup (modeled on `worktree.test.ts:27-54`) to handle worktree removal before directory deletion.

## Output Mockups

Before fix — `getWorkStatus({ json: true })` with active worktree:
```json
{
  "items": [{
    "slug": "my-feature",
    "workBranch": "+ feature/my-feature",
    "stage": "build-in-progress"
  }]
}
```

After fix:
```json
{
  "items": [{
    "slug": "my-feature",
    "workBranch": "feature/my-feature",
    "stage": "ready-for-verify"
  }]
}
```

## File Changes

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Line 144 — widen the marker-stripping regex from `/^\* /` to `/^[*+] /`.
**Pattern to follow:** Same `.replace()` chain, same position. Only the regex changes.
**Why:** Without this, every worktree branch returns `"+ feature/slug"` — an invalid git ref that breaks pipeline stage detection, build report visibility, and `--merge`.

### `packages/cli/src/engine/detectors/git.ts` (modify)
**What changes:** Line 109 — replace `if (name.startsWith('* ')) name = name.slice(2)` with `name = name.replace(/^[*+] /, '')`.
**Pattern to follow:** Same approach as work.ts — regex replace instead of conditional slice.
**Why:** Consistency. Both files parse the same `git branch` output. Leaving one unfixed creates divergent parsing rules. The scan's branch list would contain `+ `–prefixed names.

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** Three things: (1) extend `createWorkTestProject` slug options with `worktree: true`, (2) add worktree cleanup to the top-level `afterEach`, (3) add integration test for the fix.
**Pattern to follow:** Existing `featureBranch: true` path at lines 83-96 for the helper extension. `worktree.test.ts:27-54` for cleanup. Line 717-732 for the test structure (test through `getWorkStatus({ json: true })`, assert on `json.items[0].workBranch`).
**Why:** Without a test exercising real worktree output, this bug class can regress silently. The `featureBranch: true` path uses `git checkout -b` which never produces the `+` prefix.

## Acceptance Criteria

- [ ] AC1: `getWorkBranch` returns a clean branch name (no `+` prefix) when the branch is checked out in a linked worktree
- [ ] AC2: `getWorkBranch` continues to return a clean branch name (no `*` prefix) when the branch is the current branch
- [ ] AC3: `getWorkBranch` does not strip legitimate `+` characters in branch names (e.g., `feature/c++fixes`)
- [ ] AC4: `detectBranches()` in `git.ts` strips both `*` and `+` markers from branch names
- [ ] AC5: `createWorkTestProject` accepts `worktree: true` on slug options — uses `git worktree add` instead of `git checkout -b`
- [ ] AC6: When `worktree: true`, feature artifacts are written and committed inside the worktree directory, and the main tree remains on the artifact branch
- [ ] AC7: A test uses `worktree: true` to create a real worktree with a build report on the branch, then calls `getWorkStatus({ json: true })` from the main tree — `workBranch` has no `+` prefix and stage is not stuck at `build-in-progress`
- [ ] AC8: The `afterEach` cleanup properly removes worktrees created by the helper (no stale worktrees between tests)
- [ ] AC9: Existing tests that don't use `worktree: true` are completely unaffected
- [ ] AC10: No existing tests break. Test count increases.
- [ ] Tests pass: `(cd packages/cli && pnpm vitest run)`
- [ ] No build errors: `pnpm run build`

## Testing Strategy

- **Integration test:** Create a real worktree via `createWorkTestProject` with `worktree: true` and a build report as a feature artifact. Call `getWorkStatus({ json: true })` from the main tree. Assert `workBranch` has no `+` prefix and stage reflects correct pipeline progression (not stuck at `build-in-progress`).
- **Regression coverage:** The existing `featureBranch: true` tests (line 717-732) continue to prove `*` stripping works. The new `worktree: true` test proves `+` stripping works.
- **Edge case — legitimate `+` in branch name:** The regex `[*+] ` requires a trailing space. Branch names like `feature/c++fixes` appear as `  feature/c++fixes` in `git branch` output (space-padded, no marker). The `trim()` before the regex handles the padding, and the regex won't match because there's no space after the `+`. This is verified by the scope's analysis and doesn't need a separate test — it's a property of the regex, not of the code path.

## Dependencies

None. Both fix sites and the test infrastructure exist.

## Constraints

- The regex `[*+] ` must include the trailing space — without it, legitimate `+` in branch names would be stripped.
- The `afterEach` cleanup must run `git worktree remove` before `fs.rm(tempDir)` — if the directory is removed first, git's worktree metadata becomes orphaned.

## Gotchas

- **`git worktree add` requires at least one commit.** The test repo must have an initial commit before creating a worktree. `createWorkTestProject` already does this (line 62), so the worktree path can be added after.
- **The `+` prefix only appears when listing from outside the worktree.** The test must `process.chdir(tempDir)` (the main tree), not the worktree path. `createWorkTestProject` already returns with cwd at the main tree.
- **Worktree artifact paths differ from checkout paths.** With `featureBranch: true`, artifacts are at `tempDir/.ana/plans/active/{slug}/`. With `worktree: true`, the worktree is at a separate filesystem path and artifacts inside it are at `{wtPath}/.ana/plans/active/{slug}/`. The helper must write feature artifacts to the worktree path and commit with `cwd: wtPath`.
- **`afterEach` ordering matters.** `git worktree remove` must complete before `fs.rm(tempDir)`. The cleanup from `worktree.test.ts:27-54` handles this correctly — copy that pattern.
- **Don't use `tempDir/.ana/worktrees/{slug}` for the worktree path in tests.** That path is inside the main tree's `.ana/` directory which is already committed. Use a sibling path like `path.join(path.dirname(tempDir), 'wt-' + slug)` or `path.join(tempDir, '..', 'wt-' + slug)` to avoid path conflicts. Alternatively, use a path outside the repo like `os.tmpdir()` — but make sure it's tracked for cleanup. The simplest approach: create the worktree inside tempDir at a non-`.ana` path like `tempDir/worktrees/{slug}`.

## Build Brief

### Rules That Apply
- All local imports use `.js` extensions. `import { foo } from './bar.js'`.
- Always pass `--run` flag when invoking Vitest to avoid watch mode hang.
- Test behavior through public API (`getWorkStatus`), not internal functions (`getWorkBranch`).
- Prefer real implementations over mocks — use `git worktree add` to produce real output.
- Assert on specific expected values: `expect(workBranch).toBe('feature/test-slug')`, not `.toBeDefined()`.
- Tests that create git repos must force branch name with `git branch -M main` after first commit.
- Engine files (`src/engine/`) have zero CLI dependencies.

### Pattern Extracts

**work.ts:144 — the line to fix:**
```typescript
// packages/cli/src/commands/work.ts:144
const branches = result.stdout.split('\n').map(b => b.trim().replace(/^\* /, '').replace(/^remotes\//, ''));
```

**git.ts:105-114 — the block to fix:**
```typescript
// packages/cli/src/engine/detectors/git.ts:105-114
  const seen = new Set<string>();
  for (const line of output.split('\n')) {
    let name = line.trim();
    if (!name) continue;
    // Strip leading "* " from current branch
    if (name.startsWith('* ')) name = name.slice(2);
    // Skip HEAD pointer lines like "remotes/origin/HEAD -> origin/main"
    if (name.includes(' -> ')) continue;
    // Strip remote prefix
    name = name.replace(/^remotes\/origin\//, '');
```

**work.test.ts:83-96 — existing featureBranch path to mirror:**
```typescript
// packages/cli/tests/commands/work.test.ts:83-96
        if (slug.featureBranch) {
          const prefix = branchPrefix !== undefined ? branchPrefix : 'feature/';
          execSync(`git checkout -b ${prefix}${slug.slug}`, { cwd: tempDir, stdio: 'ignore' });

          if (slug.featureArtifacts) {
            for (const artifact of slug.featureArtifacts) {
              const content = artifact.content || `# ${artifact.file}`;
              await fs.writeFile(path.join(slugPath, artifact.file), content, 'utf-8');
            }
            execSync('git add -A && git commit -m "add feature artifacts"', { cwd: tempDir, stdio: 'ignore' });
          }

          execSync(`git checkout ${artifactBranch}`, { cwd: tempDir, stdio: 'ignore' });
        }
```

**work.test.ts:717-732 — test pattern to follow:**
```typescript
// packages/cli/tests/commands/work.test.ts:717-732
    // @ana A010
    it('getWorkBranch finds branch with custom prefix', async () => {
      const planContent = `# Plan\n## Phases\n- [ ] Phase 1\n  Spec: spec.md`;
      await createWorkTestProject({
        slugs: [{
          slug: 'test-slug',
          artifacts: ['scope.md', 'plan.md', 'spec.md'],
          planContent,
          featureBranch: true,
        }],
        branchPrefix: 'dev/',
      });

      const output = await captureOutput(async () => await getWorkStatus({ json: true }));
      const json = JSON.parse(output);
      expect(json.items[0].workBranch).toContain('dev/');
    });
```

**worktree.test.ts:27-54 — cleanup pattern:**
```typescript
// packages/cli/tests/utils/worktree.test.ts:27-54
  afterEach(async () => {
    process.chdir(originalCwd);
    // Clean up any worktrees before removing tempDir
    try {
      const result = execSync('git worktree list --porcelain', {
        cwd: tempDir,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      const worktrees = result
        .split('\n')
        .filter(l => l.startsWith('worktree '))
        .map(l => l.replace('worktree ', ''));
      // Remove all worktrees except the main one
      for (const wt of worktrees) {
        if (wt !== tempDir) {
          try {
            execSync(`git worktree remove "${wt}" --force`, { cwd: tempDir, stdio: 'ignore' });
          } catch {
            // Force-remove directory
          }
        }
      }
    } catch {
      // Not a git repo — nothing to clean
    }
    await fs.rm(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  });
```

### Proof Context

**work.ts** — relevant finding: `getWorkBranch glob pattern *${slug} may over-match for short slugs`. Known issue from kind-aware-branch-prefixes, not addressed in this fix (different bug). No overlap with current contract assertions.

**git.ts** — finding: `retains execSync` (architectural note, not relevant to this fix).

**work.test.ts** — no findings overlap with current contract assertions. Multiple test quality findings exist but are about other test blocks.

### Checkpoint Commands

- After fixing work.ts + git.ts: `(cd packages/cli && pnpm vitest run tests/commands/work.test.ts --run)` — Expected: existing work tests pass
- After adding the new test: `(cd packages/cli && pnpm vitest run tests/commands/work.test.ts --run)` — Expected: all work tests pass including the new one
- Full suite: `(cd packages/cli && pnpm vitest run)` — Expected: 2178+ tests pass (2177 baseline + at least 1 new)
- Build: `pnpm run build` — Expected: clean build, no errors

### Build Baseline
- Current tests: 2177 passed, 2 skipped (2179 total)
- Current test files: 100
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected 2178+ passed in 100 test files
- Regression focus: `tests/commands/work.test.ts` — the file being modified. Run it first after each change.
