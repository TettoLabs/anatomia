# Scope: Fix CI Matrix and Broken Tests

**Created by:** Ana
**Date:** 2026-05-14

## Intent

CI has been red for 50+ consecutive runs. Three tests in `work.test.ts` have never passed in CI since they were added (May 13-14). Windows runners intermittently timeout on top of that. The entire user base runs on macOS/Linux (Claude Code doesn't run natively on Windows), and the CLI has zero OS-specific code paths. We're burning billable minutes and developer attention on platforms that don't serve our users, and the constant red masks real regressions.

## Complexity Assessment
- **Kind:** fix
- **Size:** small — workflow configs, a new test file (extracted from work.test.ts), and documentation updates
- **Files affected:** `.github/workflows/test.yml`, `.github/workflows/release.yml`, `packages/cli/tests/commands/work.test.ts` (remove 3 tests), new file `packages/cli/tests/commands/work-ci-mocked.test.ts` (or similar — houses extracted tests), `.claude/skills/deployment/SKILL.md`, `packages/cli/ARCHITECTURE.md`, `packages/cli/CONTRIBUTING.md`
- **Blast radius:** CI configuration and 3 test assertions. No production code changes. Branch protection rules must be updated in lockstep with the matrix change or PRs cannot merge.
- **Estimated effort:** 1-2 hours
- **Multi-phase:** no

## Approach

Two problems, one scope: broken tests and a wasteful matrix. Fix the tests by mocking at the boundary (`node:child_process`) instead of depending on CI-specific environment behavior. Trim the matrix to Ubuntu-only (the platform our users are on) and bump the action runtime before the June 2 deadline. Update documentation that references the old OS matrix.

Critical constraint: mocking `node:child_process` requires `vi.mock` at module level, which affects every test in the file. The 3 broken tests must be extracted to a new test file (same pattern as `work-merge.test.ts`, which was separated from `work.test.ts` for the same reason).

The branch protection rules are the other critical sequencing constraint. They must be updated to match the new matrix, or PRs block on checks that will never report.

## Acceptance Criteria

- AC1: All tests pass on Ubuntu Node 20 and Ubuntu Node 22 in CI (the 3 currently-broken tests fixed)
- AC2: CI matrix is Ubuntu-only with Node 20 and Node 22 (4 runners removed: windows-latest x2, macos-latest x2)
- AC3: `pnpm/action-setup` bumped to `@v6` in test.yml (both jobs) and release.yml
- AC4: Branch protection required status checks updated to only require `Test (ubuntu-latest, Node 20)` and `Test (ubuntu-latest, Node 22)` (4 removed checks)
- AC5: `staging` removed from CI branch triggers
- AC6: Coverage upload condition simplified (remove redundant `matrix.os` check)
- AC7: No test count decrease — broken tests fixed (moved to new file), not deleted
- AC8: Documentation updated to reflect Ubuntu-only matrix: deployment skill, ARCHITECTURE.md, CONTRIBUTING.md (root + cli)

## Edge Cases & Risks

- **Branch protection timing:** If the workflow changes land before branch protection is updated, the old check names stop reporting and the PR itself can't merge. The build agent should update branch protection first (via `gh api`), then push the workflow changes, or do both in the same PR and have the developer update protection manually before merge.
- **pnpm/action-setup@v6 compatibility:** v6 reads `packageManager` from package.json (we have `"pnpm@9.0.0"`) — same behavior as v4. No breaking change expected.
- **Dead Windows guard in scan.test.ts:443:** The `if (process.platform === 'win32') return` in the chmod test becomes unreachable. Leave it — removing it is cosmetic and risks the scope.
- **Leaked temp directories in conflict test:** The current test creates `bare-remote-*` and `clone-*` dirs in `/tmp/` outside the test's tempDir. If the fix mocks runGit, these directories are no longer created. If the fix keeps real git operations, add cleanup in afterEach.
- **Future OS-specific code:** If someone adds `process.platform` branching later, they'll need to add the runners back. The static `cross-platform.test.ts` will catch hardcoded path separators but not runtime-conditional logic. This is an acceptable tradeoff — we add complexity when the code demands it, not prophylactically.
- **Test file extraction:** The 3 broken tests move to a new file. The test count must not decrease — `work.test.ts` loses 3 tests, the new file gains 3 tests. The 2 skipped tests (WASM availability) remain in their original files.

## Rejected Approaches

**Fix the environment instead of the tests.** Considered making CI match local behavior (configure `ps` behavior, set up safe.directory for bare repos). Rejected because it treats the symptom — these tests should mock at the boundary, not depend on OS-level process table behavior or git config state.

**Keep macOS, remove only Windows.** macOS runners cost 10x in billable minutes (~50 of ~78 per run). Zero OS-specific code paths exist. The WASM smoke test (web-tree-sitter) has never failed on any platform. Keeping macOS for theoretical coverage of a platform-independent runtime is not worth the cost.

**Delete the broken tests instead of fixing them.** The `getClaudePid` tests verify a real utility function. The rebase conflict test covers an important error path in `completeWork`. Both test real behavior worth verifying — they just need to mock at the right boundary.

**Add Node 24 to the matrix now.** Out of scope. The action runtime forcing (June 2) is about GitHub's internal JS, not our test code. Our `engines: >=20` contract is validated by Node 20 + 22. Node matrix changes belong in a separate scope after this lands.

## Open Questions

None. All investigative questions resolved during research.

## Exploration Findings

### Patterns Discovered
- `work.test.ts`: Uses `process.chdir(tempDir)` in `beforeEach` to set working directory for `completeWork` calls. All git operations use `execSync` with `cwd: tempDir`.
- `work.test.ts:3317-3370`: Rebase conflict test creates bare remote, clone, and divergent commits all with `stdio: 'ignore'` — silent failures in CI cause the conflict to never materialize.
- `work.ts:1335-1346`: Conflict detection checks `pullResult.stderr` for `'conflict'`, `'Cannot rebase'`, or `'could not apply'`. Falls through to a non-exiting warning path if none match.

### Constraints Discovered
- [TYPE-VERIFIED] Branch protection requires all 6 check names (`gh api` confirmed) — must update in lockstep with matrix change
- [TYPE-VERIFIED] `pnpm/action-setup@v4` triggers Node 20 deprecation warning — v6 is current (`gh api` confirmed latest is v6.0.8)
- [OBSERVED] `getClaudePid` tests return PID 2799 in CI instead of null — `ps` behavior differs in CI runner's process namespace
- [OBSERVED] Windows `Run tests` step shows `in_progress` (never completes) on ~40% of May 13 runs — timeout at 15 minutes
- [OBSERVED] The 3 broken tests have never passed in any CI run since introduction (verified commit ancestry against all green runs)

### Test Infrastructure
- `work.test.ts`: `createMergedProject()` helper (line 1085) sets up full git repo with slug artifacts. `createWorkTestProject()` (line 60) for simpler scenarios. Both use `execSync` with `cwd: tempDir` for git operations.
- `vitest.config.ts`: `testTimeout: 15000` in CI, `5000` locally. `hookTimeout: 15000` in CI.

## For AnaPlan

### Structural Analog
`packages/cli/tests/commands/work.test.ts` lines 3186-3312 — the `UNKNOWN verify result` test block. Same pattern: creates a merged project, spies on `process.exit`, calls `completeWork`, asserts on exit behavior. This test PASSES in CI because it doesn't depend on real git remotes or process table lookups.

### Relevant Code Paths
- `.github/workflows/test.yml` — CI matrix definition, action versions, coverage upload condition, branch triggers
- `.github/workflows/release.yml` — `pnpm/action-setup@v4` (line 19), needs same bump
- `packages/cli/tests/commands/work.test.ts:3315-3370` — rebase conflict test
- `packages/cli/tests/commands/work.test.ts:4665-4702` — getClaudePid tests (A001-A003)
- `packages/cli/src/commands/work.ts:2159-2177` — `getClaudePid()` implementation
- `packages/cli/src/commands/work.ts:1335-1346` — conflict detection in `completeWork`
- `packages/cli/src/utils/git-operations.ts:37-49` — `runGit()` returns `{ stdout, stderr, exitCode }`

### Patterns to Follow
- **`work-merge.test.ts` is THE pattern.** It was separated from `work.test.ts` specifically because mocking `node:child_process` requires `vi.mock` at module level (hoisted), which affects all tests in the file. Lines 1-32 show: `vi.hoisted()` captures real implementations, `vi.mock('node:child_process')` replaces `spawnSync`, the mock routes git calls through `realSpawnSync` and intercepts target calls. The new test file should follow this exact pattern.
- The `UNKNOWN verify result` tests (line 3186) demonstrate the working pattern for testing `completeWork` error paths — but note they DO add a remote (invalid URL), they just don't create real conflicts

### Known Gotchas
- Branch protection update must happen via `gh api -X PATCH repos/TettoLabs/anatomia/branches/main/protection/required_status_checks` — cannot be done through the workflow file itself
- The conflict test creates directories outside `tempDir` (lines 3321, 3327) using `path.join(tempDir, '..', ...)` — if keeping real git, add cleanup. If mocking, these are eliminated.
- `pnpm/action-setup@v6` appears in TWO places in test.yml (test job line 33, website job line 85) and ONE place in release.yml (line 19) — all three must be bumped
- **Module-level mock constraint:** `vi.mock('node:child_process')` is hoisted to the top of the file and applies to ALL tests. This is why `work-merge.test.ts` exists as a separate file. The 3 broken tests MUST be extracted — you cannot add `vi.mock` to `work.test.ts` without breaking 2290+ other tests that depend on real `spawnSync`/`execSync`.

### Documentation that needs OS matrix references updated
- `.claude/skills/deployment/SKILL.md:12` — "3 OS × 2 Node versions (ubuntu, windows, macos × Node 20, 22)" → Ubuntu-only. Also remove Windows gotcha section (no longer relevant).
- `packages/cli/ARCHITECTURE.md:225` — "Ubuntu/macOS/Windows x Node 20/22" → "Ubuntu x Node 20/22"
- `packages/cli/CONTRIBUTING.md:398` — "Ubuntu/macOS/Windows x Node 20/22" → "Ubuntu x Node 20/22"
- `packages/cli/CONTRIBUTING.md:414` — same
- Note: Node version references (20 → 22) are scope 2's responsibility. This scope only fixes OS references.

### Things to Investigate
None — the mock approach is now determined. Use the `work-merge.test.ts` pattern: extract to new file, `vi.hoisted` + `vi.mock('node:child_process')`, route real git calls through `realSpawnSync`.
