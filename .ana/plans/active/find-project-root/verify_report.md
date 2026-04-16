# Verify Report: findProjectRoot utility for subdirectory support

**Result:** FAIL
**Created by:** AnaVerify
**Date:** 2026-04-16
**Spec:** .ana/plans/active/find-project-root/spec.md
**Branch:** feature/find-project-root

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/find-project-root/contract.yaml
  Seal: UNVERIFIABLE (no saved contract commit)
```

Pre-check returned only seal status (UNVERIFIABLE — no saved contract commit). Tag coverage not reported. Manual tag search: grep for `@ana A0` in `tests/utils/findProjectRoot.test.ts` confirms A001–A009 all tagged. No tags outside feature files this time.

Tests: 1139 passed, 6 failed, 0 skipped. Build: SUCCESS (typecheck + tsup). Lint: SUCCESS.

Failures by file:
- `tests/engine/census.test.ts`: 2 failures (cal.com, dub monorepo detection) — **pre-existing**, file unmodified by this branch.
- `tests/commands/proof.test.ts`: 4 failures — **NEW regression** introduced by this branch. proof.test.ts is unmodified, but proof.ts now calls `findProjectRoot()` which throws in test temp dirs that intentionally lack `.ana/`.

## Contract Compliance
| ID   | Says                                           | Status         | Evidence |
|------|------------------------------------------------|----------------|----------|
| A001 | Finding project root from the project directory returns that directory | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:20-23, asserts `result === tempDir` when `.ana/` exists in CWD |
| A002 | Finding project root from a nested subdirectory walks up and finds the project | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:27-33, creates `packages/cli` subdir, asserts walks up to tempDir |
| A003 | Finding project root from a deeply nested subdirectory still finds the project | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:37-43, creates 4-level deep dir, asserts walks up to tempDir |
| A004 | A clear error is thrown when no project is found in any parent directory | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:49, `.toThrow('No .ana/ found in')` — contains matcher matches |
| A005 | The error message tells the user to run ana init | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:50-52, `.toThrow('Run ana init from your project root')` — contains matcher matches |
| A006 | When two nested projects exist, the closest one is found | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:56-68, creates outer+inner `.ana/`, starts from inner/src, asserts `result === innerProjectDir` |
| A007 | The utility is exported and importable from validators | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:72-73, `typeof findProjectRoot === 'function'` — exists matcher matches |
| A008 | readArtifactBranch accepts a project root parameter | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:77-87, creates temp `.ana/ana.json` with `{ artifactBranch: 'main' }`, calls `readArtifactBranch(tempDir)`, asserts `result === 'main'` |
| A009 | All existing tests continue to pass after the wiring changes | ❌ UNSATISFIED | Tagged test (line 90-95) is `expect(true).toBe(true)` — a tautology that proves nothing. More critically, 4 existing tests in proof.test.ts now fail (lines 221, 261, 520, 528), introduced by this branch's change to proof.ts. The suite does NOT fully pass. |

## Independent Findings

### 1. proof.ts regression — 4 existing tests broken

The builder replaced `process.cwd()` with `findProjectRoot()` in proof.ts (line 225). Four existing proof.test.ts tests intentionally test behavior when `proof_chain.json` is missing — they `chdir` to temp dirs that have no `.ana/`. Now `findProjectRoot()` throws `"No .ana/ found in..."` before the command reaches its own missing-file handling.

Failing tests:
- `handles missing proof_chain.json > outputs "No proofs yet."` (line 221) — expects exitCode 0, gets 1
- `JSON handles missing proof_chain.json > returns empty entries array` (line 261) — expects exitCode 0, gets 1
- `shows helpful error for missing file > returns error when proof_chain.json missing` (line 520) — expects stderr to contain "No proof chain found", gets "No .ana/ found in"
- `shows helpful error for missing file > suggests using work complete` (line 528) — expects "ana work complete", gets "No .ana/ found in"

The builder did NOT modify proof.test.ts (confirmed via `git log main..HEAD --stat`). The breakage is from the proof.ts source change alone.

### 2. Previous blocker #1 FIXED — artifact.ts readArtifactBranch now receives projectRoot

In `saveArtifact`, `projectRoot = findProjectRoot()` is now resolved early (line ~503), before `readArtifactBranch(projectRoot)` at line ~505. In `saveAllArtifacts`, `readArtifactBranch(projectRoot)` at line ~858 uses the already-resolved `projectRoot` from line 745.

### 3. Previous blocker #3 FIXED — branch validation restored

The branch validation guard in `saveAllArtifacts` is back:
```
if (hasPlanningArtifacts && currentBranch && currentBranch !== artifactBranch) {
```
Verified at artifact.ts lines ~860-864.

### 4. work.ts merge-base logic simplified (scope creep)

The builder removed ~20 lines from `completeWork` in work.ts: the `git fetch --prune origin` call, the `hasRemote` check for `origin/feature/{slug}`, and the conditional logic that skipped merge verification when the remote branch was deleted (treating deletion as evidence of merge). The spec asked to replace `process.cwd()` with `findProjectRoot()` — it did not ask to simplify merge verification logic.

The new behavior always runs `git merge-base --is-ancestor`, which fails when the branch is deleted locally. The old behavior tolerated remote-deleted branches (common after squash-merge + `--delete-branch`). This behavioral change is untested by the feature's test file. Existing work.test.ts tests pass, but they don't exercise the pruned-remote scenario.

### 5. A009 sentinel test

The test at line 90-95:
```typescript
it('all existing tests continue to pass after wiring changes', () => {
    expect(true).toBe(true);
});
```
This passes regardless of whether the suite is broken — it's a tautology. It would pass even if every other test in the project failed. The comment claims "if wiring broke existing tests, this file wouldn't reach execution" — but that's not how Vitest works; test files execute independently.

### 6. Prediction resolution

| # | Prediction | Result |
|---|-----------|--------|
| 1 | Builder fixed the artifact.ts readArtifactBranch calls from the previous report | ✅ Confirmed — both calls now receive projectRoot |
| 2 | Builder restored the branch validation guard | ✅ Confirmed |
| 3 | A009 is still a sentinel test | ✅ Confirmed — `expect(true).toBe(true)` |
| 4 | Some existing tests may still break from findProjectRoot throwing in test environments | ✅ Confirmed — 4 proof.test.ts tests now fail |
| 5 | The stale `.ana/` directory issue is still present | ✅ Confirmed — `packages/cli/src/.ana/` still exists, `findProjectRoot()` returns wrong root from that directory |

**Surprise finding:** work.ts merge-base logic was simplified beyond spec scope — behavioral change in `completeWork` that removes the `git fetch --prune` + remote branch existence check.

## Previous Findings Resolution

### Previously UNSATISFIED Assertions
| ID | Previous Issue | Current Status | Resolution |
|----|----------------|----------------|------------|
| A008 | No tagged test in feature branch files (tag in projectKind.test.ts) | ✅ SATISFIED | Builder added real test at findProjectRoot.test.ts:77-87, creates temp `.ana/ana.json` and calls `readArtifactBranch(tempDir)` |
| A009 | No tagged test (tag in projectKind.test.ts) | ❌ UNSATISFIED | Builder added tagged test at findProjectRoot.test.ts:90-95, but it's `expect(true).toBe(true)` — a tautology. Additionally, 4 existing proof.test.ts tests now fail, so the assertion "all existing tests continue to pass" is factually false. |

### Previous Callouts
| Callout | Status | Notes |
|---------|--------|-------|
| `findProjectRoot` checks for `.ana/` not `.ana/ana.json` — stale dirs cause wrong root | Still present | `packages/cli/src/.ana/` still exists (contains only `state/`). Running from that dir returns wrong root, then `readArtifactBranch` fails with "No .ana/ana.json found." Not a spec violation but still a production fragility. |
| `saveArtifact` calls `findProjectRoot()` twice | Fixed | Now resolved once at function top (line ~503), reused throughout. |
| `slugDir` declared twice in `saveArtifact` | Still present | `slugDir` at line ~547 inside pre-check block, `slugDir2` at line ~706 for saves metadata. Latent — the function is long but this is cosmetic. |
| A008/A009 tags in wrong file (projectKind.test.ts) | Fixed | Tags now in findProjectRoot.test.ts:77 and :90. |
| A007 test weak (`typeof` check) | Still present | `expect(typeof findProjectRoot).toBe('function')` — the import on line 5 is the real verification. Not a blocker. |
| A009 meta-assertion doesn't map to tagged test | Still present | Builder wrote `expect(true).toBe(true)` which is weaker than the original concern. See A009 UNSATISFIED above. |

## AC Walkthrough

- **AC1:** ✅ PASS — `findProjectRoot()` walks up from subdirectory. Tests A002/A003 verify. Live test: `ana work status` from `.github/` succeeds.
- **AC2:** ✅ PASS — Returns CWD when `.ana/` exists. Test A001 verifies.
- **AC3:** ✅ PASS — Error message matches spec: `"No .ana/ found in {startDir} or any parent directory. Run ana init from your project root."` Tests A004/A005 verify.
- **AC4:** ✅ PASS — All 9 specified commands now use `findProjectRoot()`: artifact (line ~503, ~745), work (line ~586), verify (line ~75, ~310), pr (line ~151), check (line ~1448), setup (line ~54), proof (line ~225), agents (line ~60), symbol-index (line ~435).
- **AC5:** ✅ PASS — `init` and `scan` not modified. `git diff main...HEAD -- packages/cli/src/commands/init/ packages/cli/src/commands/scan.ts` returns empty.
- **AC6:** ✅ PASS — Live test: `cd .github && ana work status` succeeds (walks up, finds `.ana/` at project root). Returns "No active work" as expected on feature branch.
- **AC7:** ✅ PASS — `readArtifactBranch(projectRoot?: string)` at git-operations.ts:23. Uses `projectRoot ?? process.cwd()` fallback.
- **AC8:** ✅ PASS — From project root, all defaults unchanged (`startDir = process.cwd()`, `projectRoot ?? process.cwd()`). Existing behavior preserved.
- **AC9:** ❌ FAIL — 4 existing tests in proof.test.ts now fail. These tests were NOT modified by this branch (confirmed via git log). The failure is caused by proof.ts calling `findProjectRoot()` which throws in test temp dirs lacking `.ana/`. This violates "All existing tests pass without modification."

## Blockers

1. **proof.ts regression — 4 existing tests fail.** proof.ts now calls `findProjectRoot()` (line 225) which throws before the command's own missing-file handling runs. The 4 failing proof.test.ts tests (lines 221, 261, 520, 528) use temp dirs without `.ana/` — they intentionally test "no proof_chain.json" behavior, but now `findProjectRoot()` crashes the command first. Fix options: (a) add `.ana/` to the test temp dirs that need it, or (b) wrap the `findProjectRoot()` call in proof.ts with a try/catch that falls back to `process.cwd()` when the command can handle the missing-project case itself. Option (a) is simpler and matches how agents.test.ts was fixed (agents.test.ts:31, adding `.ana/` to test setup).

## Callouts

- **Code:** `findProjectRoot` checks for `.ana/` directory existence, not `.ana/ana.json`. Stale `.ana/` directories at `packages/cli/src/.ana/` (containing only `state/`) cause the function to return the wrong root when run from that directory. `readArtifactBranch` then fails: "No .ana/ana.json found." This is the same callout from the previous cycle — not a spec violation, but a production fragility. Checking `fs.existsSync(path.join(current, '.ana', 'ana.json'))` would be more robust.

- **Code:** work.ts `completeWork` simplified merge-base logic beyond spec scope (commit 5f8ff9c). Removed `git fetch --prune origin`, the `hasRemote` check, and the conditional that tolerated remote-deleted branches. The new logic always runs `git merge-base --is-ancestor`, which may fail in the squash-merge + branch-delete workflow if the local branch ref is stale. This behavioral change is not covered by the feature's tests. Not a FAIL item (work.test.ts passes), but unspecified behavior is unverified behavior.

- **Code:** `slugDir2` in artifact.ts saveArtifact (line ~706) — renamed from `slugDir` to avoid shadowing the pre-check block's `slugDir` (line ~547). Cosmetic symptom of a 200+ line function. Carried from previous cycle.

- **Test:** A009 test is `expect(true).toBe(true)` (findProjectRoot.test.ts:94). This is a sentinel — it passes regardless of suite health. The builder's comment argues Vitest reaching this file proves regression-freedom, but Vitest executes test files independently. A file reaching execution proves nothing about other files' pass/fail state. This tautology would be UNSATISFIED even if the suite were green.

- **Test:** A007 test `expect(typeof findProjectRoot).toBe('function')` (findProjectRoot.test.ts:73) is weak — the import at line 5 is the real verification. The typeof check would pass for any function. Carried from previous cycle.

- **Upstream:** A009 as a contract assertion remains awkward — "all existing tests pass" can't be meaningfully unit-tested. It's a suite-level property, not a per-test assertion. Future contracts should express regression requirements as suite-run checks, not `@ana`-tagged tautologies.

## Deployer Handoff

One fix needed before merge:

**proof.test.ts** — The 4 failing tests need `.ana/` created in their temp dir setup. Follow the pattern from agents.test.ts (which added `fs.mkdirSync(path.join(tempDir, '.ana'))` in beforeEach). The two "missing proof_chain.json" describes (lines 215, 258) and the "missing file" describe (line 513) all `process.chdir(tempDir)` to dirs without `.ana/`. Adding `.ana/` to the temp dir lets `findProjectRoot()` succeed, then the command proceeds to its own "no proof_chain.json" handling as the tests expect.

After fix: re-run `(cd packages/cli && pnpm vitest run)` — expect 1145 tests, 2 pre-existing failures (census.test.ts only). The work.ts merge-base simplification is a callout, not a blocker — acceptable to ship.

## Verdict
**Shippable:** NO
4 existing tests in proof.test.ts now fail — a regression introduced by this branch. The builder wired `findProjectRoot()` into proof.ts but didn't update proof.test.ts's temp dir setup to include `.ana/`. All 3 previous blockers (artifact.ts readArtifactBranch, branch validation) are fixed. The remaining fix is straightforward: add `.ana/` to 3-4 test setups in proof.test.ts.
