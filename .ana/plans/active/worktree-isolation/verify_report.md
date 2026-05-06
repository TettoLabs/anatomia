# Verify Report: Worktree Isolation

**Result:** FAIL
**Created by:** AnaVerify
**Date:** 2026-05-06
**Spec:** .ana/plans/active/worktree-isolation/spec.md
**Branch:** feature/worktree-isolation

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/worktree-isolation/contract.yaml
  Seal: INTACT (hash sha256:bd850d83d0dd9f47973e390afdbe0bcd201b71484595d37f5f769d0f40e14efb)
```

Tests: 1911 passed, 2 skipped (1913 total). Build: clean. Lint: 0 errors, 1 pre-existing warning (unused eslint-disable in git-operations.ts).

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Starting work on a new slug creates its directory and records the start time | ✅ SATISFIED | Source: work.ts:1396-1400, creates dir + writes `work_started_at`. Existing tests at work.test.ts:2845-2858 verify directory creation. |
| A002 | Starting work on a slug with only a scope records the plan start time | ✅ SATISFIED | Source: work.ts:1432, calls `writeTimestamp(activePath, 'plan_started_at')` in the scope-only branch. No tagged test — verified by source inspection. |
| A003 | Starting work on a slug with only a scope validates the artifact branch | ✅ SATISFIED | Source: work.ts:1418-1427, checks `currentBranch !== artifactBranch` and exits with code 1. No tagged test — verified by source inspection. |
| A004 | Starting work on a slug with spec and contract creates a worktree | ✅ SATISFIED | worktree.test.ts:158-169 (`@ana A004`), asserts `worktreePath` exists and `isWorktreeDirectory` returns true. |
| A005 | The created worktree is on the correct feature branch | ✅ SATISFIED | worktree.test.ts:158 (`@ana A005`), asserts `result.branch` equals `'feature/test-slug'` which contains `feature/`. |
| A006 | Starting work records the build start time before worktree creation | ✅ SATISFIED | Source: work.ts:1523-1526, `writeTimestamp` called BEFORE `worktreeExists` check and `createWorktree` call. No tagged test — verified by source inspection. |
| A007 | Starting work on a slug with build report prints the existing worktree path | ✅ SATISFIED | Source: work.ts:1466-1468, verify phase calls `printExistingWorktree` which outputs "Worktree exists for" at work.ts:1583. No tagged test — verified by source inspection. |
| A008 | Starting work for verify records the verify start time | ✅ SATISFIED | Source: work.ts:1467, calls `writeTimestamp(activePath, 'verify_started_at')`. No tagged test — verified by source inspection. |
| A009 | Starting work after a failed verify prints the worktree path for fixing | ✅ SATISFIED | Source: work.ts:1482-1484, fix phase calls `printExistingWorktree` which outputs "Worktree exists" at work.ts:1583. No tagged test — verified by source inspection. |
| A010 | Starting work from inside the same worktree shows the current path | ✅ SATISFIED | Source: work.ts:1365, outputs "Already in worktree for \`{slug}\`." No tagged test — verified by source inspection. |
| A011 | Starting work on a different slug from inside a worktree is rejected | ✅ SATISFIED | Source: work.ts:1372, outputs "Switch to the main project directory first." No tagged test — verified by source inspection. |
| A012 | Worktree creation installs dependencies | ✅ SATISFIED | worktree.test.ts:172-187 (`@ana A012`), verifies `depsInstalled` is boolean. Test uses `typeof` assertion — weak but present. |
| A013 | Worktree creation symlinks environment files from the main tree | ✅ SATISFIED | worktree.test.ts:189-213 (`@ana A013, A035`), verifies `.env` and `.env.local` in `envFilesLinked` and files exist in worktree. |
| A014 | Worktree creation writes a context file with contract assertions | ✅ SATISFIED | worktree.test.ts:215-233 (`@ana A014, A038`), verifies `contextFileWritten` is true, file exists, content contains "## Contract Assertions" and assertion IDs. |
| A015 | If worktree creation fails partway through, the worktree directory is removed | ✅ SATISFIED | worktree.test.ts:235-245 (`@ana A015`), creates existing worktree then expects `createWorktree` to throw. |
| A016 | If worktree creation fails and a new branch was created, the branch is also removed | ✅ SATISFIED | worktree.test.ts:247-271 (`@ana A016`), creates blocking file, verifies branch doesn't exist after failure via `git branch --list`. |
| A017 | If the feature branch already existed before worktree creation, rollback preserves it | ✅ SATISFIED | worktree.test.ts:273-291 (`@ana A017`), creates pre-existing branch, verifies `branchExists` returns true after rollback. |
| A018 | When a feature branch exists but no worktree, a worktree is created from the existing branch | ✅ SATISFIED | worktree.test.ts:293-303 (`@ana A018`), verifies `branchIsNew` is false and worktree exists. |
| A019 | Completing work removes the worktree before deleting the branch | ✅ SATISFIED | worktree.test.ts:327-337 (`@ana A019`), verifies worktree directory doesn't exist after `removeWorktree`. |
| A020 | Completing work succeeds even if the worktree was already removed manually | ✅ SATISFIED | worktree.test.ts:339-344 (`@ana A020`), verifies `removeWorktree` returns false for nonexistent. |
| A021 | Completing work writes worktree metadata to the proof chain entry | ❌ UNSATISFIED | No code in `completeWork` or `writeProofChain` writes `worktree.used`, `worktree.created_at`, `worktree.completed_at`, or `worktree.commit_count` to the proof chain entry. The function at work.ts:752 (`writeProofChain`) is not modified. |
| A022 | Pipeline status commands no longer include git checkout prefixes | ✅ SATISFIED | Source: work.ts:499-541, all `getNextAction` return paths no longer include `git checkout`. Tests at work.test.ts:170/187/230 assert `not.toContain('git checkout')`. |
| A023 | The ready-to-merge action still shows the review command without git checkout | ✅ SATISFIED | Source: work.ts:514-516, returns `"Review PR, then: ana work complete ${slug}"` — no git checkout. |
| A024 | Pipeline status shows worktree path when one exists | ✅ SATISFIED | Source: work.ts:616, outputs `"Worktree: {path}"`. worktree.test.ts:349 (`@ana A024`) verifies `getWorktreeInfo` returns path. |
| A025 | Pipeline status flags stale worktrees with zero commits after 14 days | ✅ SATISFIED | Source: work.ts:618, outputs `"⚠ stale"` when `wt.isStale`. worktree.test.ts:369-383 (`@ana A025`) verifies `isStale` is false for fresh worktree. Stale logic (`commitCount === 0 && lastActivityDays >= 14`) verified by source at worktree.ts:278. |
| A026 | The worktree detection utility returns true when inside a worktree | ✅ SATISFIED | worktree.test.ts:99-105 (`@ana A026`), creates real worktree and asserts `isWorktreeDirectory(wtPath)` is `true`. |
| A027 | The worktree detection utility returns false in a normal git repo | ✅ SATISFIED | worktree.test.ts:92-97 (`@ana A027`), asserts `isWorktreeDirectory(tempDir)` is `false` in initialized git repo. |
| A028 | Running init from a worktree is rejected with a clear message | ✅ SATISFIED | Source: init/index.ts:62-65, checks `isWorktreeDirectory()` and outputs "Run init from the main project directory". No tagged test — verified by source inspection. |
| A029 | Running proof commands from a worktree is rejected with a worktree-aware message | ✅ SATISFIED | Source: proof.ts:731-733/981-983/1251-1253/1590-1592, all 4 `WRONG_BRANCH` formatHint locations add "You're in a worktree" when `isWorktreeDirectory()`. No tagged test — verified by source inspection. |
| A030 | Running setup complete from a worktree is rejected with a clear message | ✅ SATISFIED | Source: setup.ts:55-58, checks `isWorktreeDirectory()` and outputs "Run setup from the main project directory". No tagged test — verified by source inspection. |
| A031 | Running work complete from inside a worktree is rejected with a worktree-aware message | ✅ SATISFIED | Source: work.ts:968-971, checks `isWorktreeDirectory()` and outputs "Run work complete from the main project directory". No tagged test — verified by source inspection. |
| A032 | Running scan --save from a worktree shows a warning | ✅ SATISFIED | Source: scan.ts:382-384, checks `isWorktreeDirectory()` and outputs "probably not intended". No tagged test — verified by source inspection. |
| A033 | Saving artifacts from a worktree only processes build-verify category items | ✅ SATISFIED | Source: artifact.ts:1298-1310, filters to `build-verify` when on non-artifact branch and replaces artifacts list. No tagged test — verified by source inspection. |
| A034 | The init gitignore template includes worktrees directory | ✅ SATISFIED | Source: init/assets.ts:75, template includes `worktrees/`. worktree.test.ts:305-314 (`@ana A034`) verifies `.gitignore` contains `worktrees/` after createWorktree. |
| A035 | Environment files from the main tree are linked into the worktree | ✅ SATISFIED | worktree.test.ts:189-213 (`@ana A013, A035`), verifies `.env` exists in worktree after creation. |
| A036 | When symlinks fail, environment files are copied instead | ✅ SATISFIED | Source: worktree.ts:369-374, catch block falls back to `copyFile`. worktree.test.ts:416-428 (`@ana A036`) verifies env file exists after creation (though doesn't force symlink failure). |
| A037 | Submodules are initialized in the worktree when gitmodules exists | ✅ SATISFIED | worktree.test.ts:401-413 (`@ana A037`), creates `.gitmodules`, verifies `submodulesInitialized` is boolean. |
| A038 | The worktree context file summarizes what Build should do | ✅ SATISFIED | worktree.test.ts:215-233 (`@ana A014, A038`), verifies content contains "## Contract Assertions". |
| A039 | The build template no longer instructs agents to run git checkout | ✅ SATISFIED | Source: `grep 'git checkout' templates/.claude/agents/ana-build.md` — only occurrence is in the NEVER warning at line 111. Template contains no `git checkout -b`. |
| A040 | The build template tells agents to enter the worktree | ✅ SATISFIED | Source: templates/.claude/agents/ana-build.md:103 contains "### 4. Enter the Worktree". |
| A041 | The verify template tells agents to enter the worktree | ✅ SATISFIED | Source: templates/.claude/agents/ana-verify.md:53 contains "### 3. Enter the Worktree". |
| A042 | The build template warns against running git checkout from the worktree | ✅ SATISFIED | Source: templates/.claude/agents/ana-build.md:111 contains "**NEVER run `git checkout". |
| A043 | Dogfood build agent matches the template exactly | ✅ SATISFIED | `diff` between `packages/cli/templates/.claude/agents/ana-build.md` and `.claude/agents/ana-build.md` shows IDENTICAL. |
| A044 | Dogfood verify agent matches the template exactly | ✅ SATISFIED | `diff` between `packages/cli/templates/.claude/agents/ana-verify.md` and `.claude/agents/ana-verify.md` shows IDENTICAL. |
| A045 | All existing tests continue to pass after changes | ✅ SATISFIED | 1911 passed > 1882 baseline (28 new tests added). 2 skipped (same as baseline). |

## Independent Findings

**Prediction resolution:**

1. **CONFIRMED:** A021 (worktree metadata in proof chain) — not implemented. No code writes `worktree.used`, `worktree.created_at`, `worktree.completed_at`, or `worktree.commit_count` to the proof chain entry. The `writeProofChain` function at work.ts:752 was not modified.

2. **CONFIRMED:** Phase detection paths (A001-A003, A006-A011) have no dedicated tagged tests. The implementation is correct (verified by source inspection) but 11 contract assertions rely entirely on source inspection rather than test evidence. This is a test coverage gap — the most critical new functionality (phase detection) has zero dedicated tests.

3. **CONFIRMED:** Guard tests (A028-A032) have no tagged tests. All 5 guards are implemented correctly in source. The guards use `isWorktreeDirectory()` which is well-tested in isolation, but the integration path (command → guard → error output) is untested.

4. **CONFIRMED:** Template tests (A039-A044) have no tagged tests. All verified by source inspection and diff comparison.

5. **Not a bug, but a risk:** `isWorktreeDirectory()` checks if `.git` is a file. Git submodules ALSO use `.git` files. If a user runs `ana init` from inside a submodule checkout, the guard would block it with a misleading "not from a worktree" error. Monitoring recommended.

**Surprise finding:** `detectWorktreeSlug()` at worktree.ts:76 uses string path matching (`.ana/worktrees/{slug}/`). If the project itself lives at a path containing `.ana/worktrees/` (e.g., `/home/user/.ana/worktrees/my-project/`), the function would false-positive and return a wrong slug. Low probability, but the path-based detection is fragile.

## AC Walkthrough

- AC1: ✅ PASS — `startWork` creates directory + records `work_started_at` (source: work.ts:1396-1400, test: work.test.ts:2845-2858)
- AC2: ✅ PASS — Phase detection records `plan_started_at`, validates branch (source: work.ts:1414-1434)
- AC3: ✅ PASS — Build phase creates worktree, installs deps, symlinks .env, writes context, records timestamp, prints summary (source: work.ts:1507-1558, test: worktree.test.ts:157-323)
- AC4: ✅ PASS — Verify phase prints worktree path and records `verify_started_at` (source: work.ts:1466-1468)
- AC5: ✅ PASS — Fix phase prints worktree path and records `build_started_at` (source: work.ts:1480-1484)
- AC6: ✅ PASS — Resume from inside worktree prints path and message (source: work.ts:1354-1369)
- AC7: ✅ PASS — Cross-slug rejection with correct message (source: work.ts:1371-1374)
- AC8: ✅ PASS — Rollback removes dir + new branch; preserves existing branch (tests: worktree.test.ts:235-291)
- AC9: ✅ PASS — In-flight migration creates worktree from existing branch without `-b` (test: worktree.test.ts:293-303)
- AC10: ❌ FAIL — `completeWork` removes the worktree (work.ts:1222-1226) and archives the plan, but does NOT write worktree metadata (`used`, `created_at`, `completed_at`, `commit_count`) to the proof chain entry. A021 UNSATISFIED.
- AC11: ✅ PASS — `completeWork` skips removal if worktree already removed (source: work.ts:1226-1227). `removeWorktree` returns false for nonexistent (test: worktree.test.ts:339-344).
- AC12: ✅ PASS — `.saves.json` completeness check at work.ts:1193-1220 verifies expected keys and exits with error if missing.
- AC13: ✅ PASS — `getNextAction` returns commands without `git checkout` for all stages (source: work.ts:483-541, tests: work.test.ts:170/187/230 with `not.toContain`)
- AC14: ✅ PASS — `printHumanReadable` shows worktree path, commit count, activity, stale flag (source: work.ts:613-620, test: worktree.test.ts:349-383)
- AC15: ✅ PASS — `isWorktreeDirectory` checks `.git` is file vs directory (source: worktree.ts:54-63, tests: worktree.test.ts:93-110)
- AC16: ✅ PASS — Init guard rejects worktree (source: init/index.ts:62-65)
- AC17: ✅ PASS — Scan warns in worktree (source: scan.ts:382-384)
- AC18: ✅ PASS — Proof formatHint adds worktree-aware message at 4 WRONG_BRANCH locations (source: proof.ts:731/981/1251/1590)
- AC19: ✅ PASS — Setup guard rejects worktree (source: setup.ts:55-58)
- AC20: ✅ PASS — Work complete guard rejects from worktree (source: work.ts:968-971)
- AC21: ✅ PASS — `saveAllArtifacts` filters to build-verify on non-artifact branch (source: artifact.ts:1298-1310)
- AC22: ✅ PASS — `.gitignore` template includes `worktrees/` (source: assets.ts:75). `ensureGitignoreEntry` adds it for existing projects (source: worktree.ts:509-524, test: worktree.test.ts:305-314).
- AC23: ✅ PASS — Context file contains `## Contract Assertions` and summary (test: worktree.test.ts:215-233)
- AC24: ✅ PASS — `.env*` files symlinked; copy fallback in catch block (source: worktree.ts:365-374, test: worktree.test.ts:189-213)
- AC25: ✅ PASS — Submodule init runs when `.gitmodules` exists (source: worktree.ts:392-404, test: worktree.test.ts:401-413)
- AC26: ⚠️ PARTIAL — Build template removes branch management and adds worktree awareness. Diff shows -38/+38 lines changed. The spec says "removes ~28 lines, adds ~15 lines" — actual change is larger in both directions, but the content is correct.
- AC27: ⚠️ PARTIAL — Verify template changes are correct but diff shows -12/+12 vs spec estimate of "removes ~9 lines, adds ~5 lines."
- AC28: ✅ PASS — Dogfood copies are byte-identical (verified by `diff` command)
- AC29: ⚠️ PARTIAL — 28 new tests added (1911 - 1883 baseline). Spec estimated 50-55. Worktree utility tests are thorough; phase detection, guard, and template tests are absent.
- AC30: ✅ PASS — Test afterEach calls `git worktree remove` before `fs.rm(tempDir)` (test: worktree.test.ts:30-53)
- Tests pass: ✅ PASS — `(cd packages/cli && pnpm vitest run)` — 1911 passed, 2 skipped
- Build: ✅ PASS — `pnpm run build` clean
- Lint: ✅ PASS — `pnpm run lint` — 0 errors (1 pre-existing warning)

## Blockers

1. **A021 not implemented.** Contract requires `proofEntry.worktree.used` equals `true`. No code writes worktree metadata to the proof chain entry. `writeProofChain` (work.ts:752) was not modified. The `completeWork` function adds worktree removal (work.ts:1222-1226) but does not pass worktree info to the proof chain writer.

## Findings

- **Code — A021 not implemented:** `packages/cli/src/commands/work.ts:1237` — `writeProofChain` is called without any worktree metadata. The contract requires `proofEntry.worktree.used` equals `true`, plus `created_at`, `completed_at`, `commit_count`. None of these are written. This is the sole blocker.

- **Test — Phase detection has no dedicated tests:** `packages/cli/tests/commands/work.test.ts` — 11 contract assertions (A001-A003, A006-A011) about startWork's new phase detection logic have no tagged tests. The existing `startWork` tests were updated (A019 changed from "rejects active slug" to "resumes active slug") but no new tests exercise the scope-only, build, verify, fix, or resume paths. These paths are verified by source inspection but represent a test coverage gap in the most critical new functionality.

- **Test — Guards have no dedicated tests:** `packages/cli/src/commands/init/index.ts:62`, `setup.ts:55`, `scan.ts:382`, `proof.ts:731` — Five guards added across four files (init, setup, scan, proof). All are simple `isWorktreeDirectory()` + error/warning patterns. None have tagged tests. The individual guard implementations are trivial and the `isWorktreeDirectory` function is well-tested in isolation, but the integration paths are untested.

- **Test — A012 and A037 use weak assertions:** `packages/cli/tests/utils/worktree.test.ts:186,412` — Both tests assert `typeof result.depsInstalled === 'boolean'` and `typeof result.submodulesInitialized === 'boolean'` instead of asserting specific values. These pass regardless of whether deps installed or submodules initialized. The contract says `depsInstalled` matcher is `truthy` and `submoduleInitRan` matcher is `truthy`, so these tests are technically SATISFIED but the assertions are weaker than the contract specifies.

- **Code — proof.ts WRONG_BRANCH error message still misleading in worktree:** `packages/cli/src/commands/proof.ts:752` — The main error message still says "Switch to `main` to close findings" even when `isWorktreeDirectory()` is true. The formatHint below it correctly says "You're in a worktree..." but the primary error text is confusing. The spec mentioned 5 WRONG_BRANCH locations but only 4 exist (close, lesson, promote, strengthen — each has formatHint + exitError, but only the formatHint was updated).

- **Code — isWorktreeDirectory false-positive risk in submodules:** `packages/cli/src/utils/worktree.ts:54` — `.git` is a file in both worktrees AND submodules. If a user runs `ana init` from inside a git submodule, the guard would block with "not from a worktree" — misleading. Currently Anatomia doesn't specifically support submodule workflows, so impact is low. Monitor.

- **Code — detectWorktreeSlug path-based detection is fragile:** `packages/cli/src/utils/worktree.ts:76` — Uses `.ana/worktrees/` as a path marker. If the project root itself contains `.ana/worktrees/` in its path, this function returns a wrong slug. Low probability but the detection strategy is brittle.

- **Code — branchExists exported for test use:** `packages/cli/src/utils/worktree.ts:526` — Internal helper exported purely for test imports. Not used by any production code. Over-building beyond spec — minor.

- **Upstream — Spec test count estimate was aggressive:** Spec estimated 50-55 new tests. Build delivered 28 (all in worktree.test.ts). The builder chose a utility-focused test strategy rather than integration tests for phase detection, guards, and templates. The utility tests are thorough; the gap is in command-level integration tests.

## Deployer Handoff

1. **A021 must be implemented before merge.** The proof chain entry needs worktree metadata fields (`worktree.used`, `worktree.created_at`, `worktree.completed_at`, `worktree.commit_count`). This data is available from `.saves.json` timestamps and `getWorktreeInfo` — it needs to be threaded through to `writeProofChain`.

2. **Phase detection tests are absent.** The most critical new code (startWork's phase detection) has no integration tests. Consider adding at minimum: one test for scope-only phase, one for build phase (worktree creation path), one for verify phase (existing worktree path). These would catch regressions in the branching logic.

3. **The build template (.claude/agents/ana-build.md) changed.** This is the template that tells Build agents how to operate. After merge, the next Build agent session will pick up the worktree workflow. The current session used the old template (branch-based), which is why this build created the feature branch directly rather than using a worktree.

4. **Pre-existing lint warning** in git-operations.ts is unrelated to this build.

## Verdict

**Shippable:** NO

A021 is a hard contract failure. The proof chain is Anatomia's memory — every pipeline cycle should record how the work was done. Skipping worktree metadata means the proof chain can't answer "was this built in isolation?" The implementation (worktree removal, guard, status display) is solid. The metadata recording is the gap.
