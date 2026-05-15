# Spec: Fix CI Matrix and Broken Tests

**Created by:** AnaPlan
**Date:** 2026-05-14
**Scope:** .ana/plans/active/fix-ci-matrix-and-broken-tests/scope.md

## Approach

Two problems, one change set: a wasteful CI matrix and 4 tests that depend on environment-specific behavior (`ps` process table, real git remote conflicts).

**CI matrix:** Reduce from 3 OS × 2 Node (6 runners) to Ubuntu-only × 2 Node (2 runners). Remove `staging` from branch triggers. Bump `pnpm/action-setup` from `@v4` to `@v6` in all three locations. Simplify the coverage upload condition (remove the `matrix.os` check — it's always `ubuntu-latest` now).

**Broken tests:** Extract 4 tests from `work.test.ts` into a new `work-ci-mocked.test.ts`. These tests need `vi.mock('node:child_process')` at module level, which would affect all 2290+ other tests in the file. Follow the exact pattern from `work-merge.test.ts`, which was separated for the same reason.

The 4 tests to extract:
1. `getClaudePid` — "resolves Claude PID from process tree" (A001 in current file)
2. `getClaudePid` — "returns null when ps command fails" (A002)
3. `getClaudePid` — "returns null when ps output is not a valid number" (A003)
4. `exits on pull conflict` — "exits with code 1 on rebase conflict" (A005-A007)

The fix for each:
- **getClaudePid tests:** Mock `spawnSync` to return controlled output when the command is `ps`. Route all other calls through `realSpawnSync`. This makes tests deterministic regardless of the CI runner's process namespace.
- **Conflict test:** Instead of creating real bare remotes, clones, and divergent commits (which fail silently in CI and leak temp directories), mock `spawnSync` to return `{ status: 128, stdout: '', stderr: 'CONFLICT (content): Merge conflict in file\ncould not apply abc1234' }` when it sees a `git pull --rebase` call. **Critical:** `completeWork` checks `runGit(['remote']).stdout` at line 1243 — if it returns empty, the pull block is skipped and the mock never fires. The test must add a real remote via `realExecSync('git remote add origin https://example.com/fake.git', { cwd: tempDir, stdio: 'ignore' })` after `createMergedProject` so the remote check passes. The mock then intercepts the subsequent `git pull --rebase` call before it reaches the network.

**Branch protection:** The `gh api` command to update required status checks is documented below. The developer must run this before or after merge — it cannot be automated in the workflow file.

## Output Mockups

CI matrix after change (test.yml):
```yaml
strategy:
  fail-fast: false
  matrix:
    node-version: [20, 22]
```

Job name: `Test (ubuntu-latest, Node 20)` and `Test (ubuntu-latest, Node 22)` — these are the new required check names for branch protection. The job `name:` field keeps the `${{ matrix.os }}` reference with `runs-on: ubuntu-latest` hardcoded, so the rendered name includes `ubuntu-latest`.

The job name must use a hardcoded OS string since `matrix.os` no longer exists: `name: Test (ubuntu-latest, Node ${{ matrix.node-version }})`. This matches the branch protection check names in AC4.

Coverage upload condition after change:
```yaml
if: matrix.node-version == 20
```

Branch trigger after change (remove `staging`):
```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

## File Changes

### `.github/workflows/test.yml` (modify)
**What changes:** Matrix reduced to Ubuntu-only + Node 20/22. `pnpm/action-setup` bumped to `@v6` in both jobs (test line 33, website line 85). `staging` removed from branch triggers. Coverage upload `if:` simplified. Job name updated.
**Pattern to follow:** The existing workflow structure — just reduce the matrix and update versions.
**Why:** 4 runners are burning billable minutes on platforms with zero OS-specific code paths. Windows runners intermittently timeout. The `staging` branch doesn't exist on remote (proof chain flagged this).

### `.github/workflows/release.yml` (modify)
**What changes:** `pnpm/action-setup` bumped from `@v4` to `@v6` (line 19).
**Pattern to follow:** Same version bump as test.yml.
**Why:** Consistency. Same June 2 Node 20 deprecation deadline applies.

### `packages/cli/tests/commands/work-ci-mocked.test.ts` (create)
**What changes:** New test file housing 4 tests extracted from `work.test.ts`. Uses `vi.hoisted()` + `vi.mock('node:child_process')` pattern from `work-merge.test.ts`.
**Pattern to follow:** `work-merge.test.ts` lines 1-32 (mock setup), lines 46-73 (beforeEach/afterEach), lines 118-125 (mock routing by command name).
**Why:** `vi.mock` is hoisted to module scope — adding it to `work.test.ts` would break 2290+ tests that depend on real `spawnSync`/`execSync`.

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** Remove the 4 tests that moved to `work-ci-mocked.test.ts`. The `getClaudePid` describe block (3 tests) and the `exits on pull conflict` describe block (1 test) are deleted from this file. No other changes.
**Pattern to follow:** Clean removal — no dead imports or empty describe blocks left behind.
**Why:** These tests cannot coexist with the rest of work.test.ts once they require `vi.mock('node:child_process')`.

### `.claude/skills/deployment/SKILL.md` (modify)
**What changes:** Update Rules section: "3 OS × 2 Node versions (ubuntu, windows, macos × Node 20, 22)" → "2 runners: Ubuntu × Node 20, 22". Remove the Windows path separator gotcha (no longer relevant — no Windows runners).
**Pattern to follow:** Existing skill format.
**Why:** Documentation must reflect actual CI matrix or it misleads agents.

### `packages/cli/ARCHITECTURE.md` (modify)
**What changes:** Line 225: "Ubuntu/macOS/Windows x Node 20/22" → "Ubuntu x Node 20/22".
**Pattern to follow:** Inline text replacement.
**Why:** Same — documentation accuracy.

### `packages/cli/CONTRIBUTING.md` (modify)
**What changes:** Lines 398 and 414: "Ubuntu/macOS/Windows x Node 20/22" → "Ubuntu x Node 20/22".
**Pattern to follow:** Inline text replacement.
**Why:** Same — documentation accuracy.

## Acceptance Criteria

- [ ] AC1: All tests pass on Ubuntu Node 20 and Ubuntu Node 22 in CI (the 4 extracted tests fixed via mocking)
- [ ] AC2: CI matrix is Ubuntu-only with Node 20 and Node 22 (4 runners removed: windows-latest ×2, macos-latest ×2)
- [ ] AC3: `pnpm/action-setup` bumped to `@v6` in test.yml (both jobs) and release.yml
- [ ] AC4: Branch protection required status checks updated to only require `Test (ubuntu-latest, Node 20)` and `Test (ubuntu-latest, Node 22)` — developer runs `gh api` command manually before merge
- [ ] AC5: `staging` removed from CI branch triggers (both push and pull_request)
- [ ] AC6: Coverage upload condition simplified to `if: matrix.node-version == 20`
- [ ] AC7: No test count decrease — 4 tests removed from `work.test.ts`, 4 tests added to `work-ci-mocked.test.ts`. Total stays at 2297 passed + 2 skipped across 104 test files (103 → 104 because new file).
- [ ] AC8: Documentation updated to reflect Ubuntu-only matrix: deployment skill, ARCHITECTURE.md, CONTRIBUTING.md
- [ ] Tests pass with `pnpm vitest run`
- [ ] No build errors with `pnpm --filter anatomia-cli build`

## Testing Strategy

- **Unit tests:** The 4 extracted tests ARE the fix. They verify the same behavior as before but with mocked boundaries:
  - `getClaudePid` tests mock `spawnSync` to return controlled `ps` output — no dependency on CI process namespace
  - Conflict test mocks `spawnSync` to simulate `git pull --rebase` returning conflict stderr — no real bare repos or clones
- **Integration tests:** No new integration tests needed. The remaining 2290+ tests in `work.test.ts` continue to use real `execSync`/`spawnSync` unchanged.
- **Edge cases:** The conflict test should verify the error message contains both "conflict" (case-insensitive match in `work.ts:1338`) and "Resolve conflicts and try again" (the user-facing instruction).
- **Regression focus:** Run the full `work.test.ts` suite after removal to ensure no test relied on the deleted blocks.

## Dependencies

None. All changes are to CI config, test files, and documentation.

## Constraints

- The `vi.mock('node:child_process')` pattern is hoisted to module scope by Vitest. It affects ALL tests in the file. This is why extraction to a separate file is mandatory — not optional.
- Branch protection must be updated in lockstep with the matrix change. If the workflow changes land first, old check names stop reporting and the PR can't merge.
- `pnpm/action-setup@v6` reads `packageManager` from `package.json` — same behavior as v4. The project already has `"pnpm@9.0.0"` in `packageManager`.

## Gotchas

- **Three `pnpm/action-setup` locations.** test.yml has TWO (test job line 33, website job line 85). release.yml has ONE (line 19). All three must be bumped. Missing the website job is the most likely oversight.
- **Job name template.** After removing `os` from the matrix, `${{ matrix.os }}` in the job name becomes undefined. Replace with hardcoded `ubuntu-latest` string or remove the OS from the name. The branch protection check names must match exactly.
- **The conflict test's `createMergedProject` in work.test.ts takes an options object** (`{ slug, phases }`) while `work-merge.test.ts` has a simpler version taking just a string. The new file needs the options-object version since the conflict test uses `createMergedProject({ slug: 'conflict-test', phases: 1 })`.
- **Leaked directory cleanup is eliminated.** The current conflict test creates `bare-remote-*` and `clone-*` dirs as siblings of `tempDir`. The mocked version doesn't create these, so the leak is fixed by removing the cause, not by adding cleanup.
- **`getClaudePid` import.** The new test file must import `getClaudePid` from `../../src/commands/work.js`. This is already exported — confirmed at line 2159.
- **Deployment skill gotcha removal.** The Windows path separator gotcha in `SKILL.md` should be removed entirely (not just updated) — there are no Windows runners to trigger it.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins
- Use `import type` for type-only imports, separate from value imports
- Always use `--run` with `pnpm vitest` to avoid watch mode hang
- Co-author trailer: `Ana <build@anatomia.dev>`

### Pattern Extracts

From `work-merge.test.ts` lines 16-32 — the mock setup pattern to follow exactly:

```typescript
// Capture real implementations before vi.mock hoists
const { realExecSync, realSpawnSync } = vi.hoisted(() => {
  const cp = require('node:child_process');
  return {
    realExecSync: cp.execSync as typeof import('node:child_process').execSync,
    realSpawnSync: cp.spawnSync as typeof import('node:child_process').spawnSync,
  };
});

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawnSync: spawnMock,
  };
});
```

From `work-merge.test.ts` lines 60-63 — default mock routing in beforeEach:

```typescript
// Default: pass all spawnSync calls through to real implementation
spawnMock.mockImplementation((...args: Parameters<typeof realSpawnSync>) => {
  return realSpawnSync(...args);
});
```

From `work-merge.test.ts` lines 118-125 — command-based mock routing:

```typescript
function mockGh(handler: (args: string[]) => { status: number | null; stdout: string; stderr: string }) {
  spawnMock.mockImplementation(((command: string, args?: readonly string[], options?: object) => {
    if (command === 'gh') {
      return handler(args as string[]);
    }
    // Pass through to real spawnSync for git and everything else
    return realSpawnSync(command, args, options);
```

For the new file, the routing intercepts `ps` (for getClaudePid) and `git` with `pull` args (for conflict test) instead of `gh`.

### Proof Context

Relevant active findings for affected files:

- **work.test.ts:** "Conditional PID guard makes 8 tests potential no-ops in environments where getClaudePid() returns null" — directly addressed by this spec; mocking makes tests deterministic.
- **work.test.ts:** "Conflict test creates bareDir and cloneDir as siblings of tempDir — afterEach only cleans tempDir, so these directories leak on each test run" — directly addressed; mocked version eliminates the leaked directories.
- **test.yml:** "staging branch in trigger list is a no-op — branch does not exist on remote" — directly addressed by AC5.

### Checkpoint Commands

- After test.yml + release.yml changes: `(cd packages/cli && pnpm vitest run)` — Expected: 2297 passed, 2 skipped (no test changes yet)
- After work-ci-mocked.test.ts created + work.test.ts trimmed: `(cd packages/cli && pnpm vitest run)` — Expected: 2297 passed, 2 skipped, 104 test files
- Lint: `pnpm run lint`
- Build: `(cd packages/cli && pnpm run build)`

### Build Baseline

- Current tests: 2297 passed | 2 skipped (2299 total)
- Current test files: 103 passed
- Command used: `cd packages/cli && pnpm vitest run`
- After build: 2297 passed | 2 skipped in 104 files (net zero test change, +1 file)
- Regression focus: `work.test.ts` — ensure no test in this file depended on the removed blocks

### Branch Protection Update

The developer must run this command before or after merging (AC4). Document in the spec for reference — the builder does NOT run this:

```bash
gh api -X PUT repos/TettoLabs/anatomia/branches/main/protection/required_status_checks \
  --input - <<'EOF'
{
  "strict": true,
  "contexts": [
    "Test (ubuntu-latest, Node 20)",
    "Test (ubuntu-latest, Node 22)"
  ]
}
EOF
```
