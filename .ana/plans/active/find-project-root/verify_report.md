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
  Seal: INTACT (commit 3f9ddfa, hash sha256:e4011e2a4a638...)

  A001  ✓ COVERED  "Finding project root from the project directory returns that directory"
  A002  ✓ COVERED  "Finding project root from a nested subdirectory walks up and finds the project"
  A003  ✓ COVERED  "Finding project root from a deeply nested subdirectory still finds the project"
  A004  ✓ COVERED  "A clear error is thrown when no project is found in any parent directory"
  A005  ✓ COVERED  "The error message tells the user to run ana init"
  A006  ✓ COVERED  "When two nested projects exist, the closest one is found"
  A007  ✓ COVERED  "The utility is exported and importable from validators"
  A008  ✗ UNCOVERED  "readArtifactBranch accepts a project root parameter"
  A009  ✗ UNCOVERED  "All existing tests continue to pass after the wiring changes"

  9 total · 7 covered · 2 uncovered

  ⚠ A008 tag found in packages/cli/tests/engine/detectors/projectKind.test.ts (outside feature branch changes)
  ⚠ A009 tag found in packages/cli/tests/engine/detectors/projectKind.test.ts (outside feature branch changes)
```

Tests: 1141 passed, 2 failed, 0 skipped (6 new tests in findProjectRoot.test.ts). Build: SUCCESS (typecheck + tsup). Lint: SUCCESS.

The 2 test failures are in `tests/engine/census.test.ts` (cal.com and dub monorepo detection) — pre-existing failures not introduced by this build. The file is unmodified by this branch.

## Contract Compliance
| ID   | Says                                           | Status         | Evidence |
|------|------------------------------------------------|----------------|----------|
| A001 | Finding project root from the project directory returns that directory | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:19-23, asserts `result === tempDir` when `.ana/` exists in CWD |
| A002 | Finding project root from a nested subdirectory walks up and finds the project | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:26-33, creates `packages/cli` subdir, asserts walks up to tempDir |
| A003 | Finding project root from a deeply nested subdirectory still finds the project | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:36-43, creates 4-level deep dir, asserts walks up to tempDir |
| A004 | A clear error is thrown when no project is found in any parent directory | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:48, `expect(() => findProjectRoot(tempDir)).toThrow('No .ana/ found in')` — contains matcher matches |
| A005 | The error message tells the user to run ana init | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:49-51, `.toThrow('Run ana init from your project root')` — contains matcher matches |
| A006 | When two nested projects exist, the closest one is found | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:55-68, creates outer `.ana/` and inner `.ana/`, starts from inner/src, asserts `result === innerProjectDir` |
| A007 | The utility is exported and importable from validators | ✅ SATISFIED | tests/utils/findProjectRoot.test.ts:71-73, `expect(typeof findProjectRoot).toBe('function')` — exists matcher matches |
| A008 | readArtifactBranch accepts a project root parameter | ❌ UNCOVERED | No tagged test in feature branch files. Tag found in unrelated file (projectKind.test.ts). Function signature is correct (`projectRoot?: string` at git-operations.ts:26) but no test verifies it. |
| A009 | All existing tests continue to pass after the wiring changes | ❌ UNCOVERED | No tagged test. Meta-assertion verified by running full suite: 1141 pass, 2 pre-existing failures. No regressions introduced. |

## Independent Findings

### 1. `readArtifactBranch()` in artifact.ts still uses `process.cwd()` fallback (2 locations)

In `saveArtifact` (artifact.ts:504), `readArtifactBranch()` is called without `projectRoot` **before** `findProjectRoot()` is resolved (which happens at line 544 and again at line 632). When run from a subdirectory, this call will use `process.cwd()` and fail to find `ana.json`.

In `saveAllArtifacts` (artifact.ts:924), `readArtifactBranch()` is called without `projectRoot` even though `projectRoot = findProjectRoot()` is already resolved at line 743 (beginning of function). This is a straightforward miss.

Both locations break the feature's purpose: running from subdirectories.

### 2. Branch validation removed from `saveAllArtifacts`

The diff shows the builder deleted a 7-line guard block (old lines 857-867) that validated planning artifacts were being saved on the artifact branch:
```
if (hasPlanningArtifacts && currentBranch && currentBranch !== artifactBranch) {
  console.error(...);
  process.exit(1);
}
```

The spec asked to replace `process.cwd()` with `findProjectRoot()` — not to remove branch validation. This removes a guardrail that prevents planning artifacts from being committed on feature branches. The builder moved `readArtifactBranch()` and `getCurrentBranch()` down to the push step (line 924-925) but dropped the validation logic entirely.

### 3. `findProjectRoot` checks for `.ana/` directory, not `.ana/ana.json`

The function checks `fs.existsSync(path.join(current, '.ana'))` — any directory named `.ana/` triggers a match, even if it contains no `ana.json`. In practice, stale `.ana/` directories (from test runs or partial inits) exist at `packages/cli/src/.ana`, `packages/cli/.ana`, and `website/.ana`. These trick `findProjectRoot` into returning the wrong root.

Live test from `.github/` (no stale `.ana/`): ✅ `ana work status` succeeds.
Live test from `packages/cli/src/` (has stale `.ana/`): ❌ returns wrong root, `readArtifactBranch` fails.

This isn't a spec violation (spec says "looking for `.ana/`"), but it's a production fragility.

### 4. Prediction resolution

| # | Prediction | Result |
|---|-----------|--------|
| 1 | A008/A009 tagged in wrong file | ✅ Confirmed — tags in projectKind.test.ts, not in feature test files |
| 2 | Some process.cwd() calls missed | ✅ Confirmed — readArtifactBranch() at artifact.ts:504 and :924 |
| 3 | Doesn't handle stale .ana/ or non-existent startDir | ✅ Confirmed — stale .ana/ dirs return wrong root |
| 4 | Missed one of artifact.ts's many locations | ✅ Confirmed — two readArtifactBranch calls, plus branch validation deletion |
| 5 | init.ts and scan.ts correctly not touched | ✅ Confirmed — git diff shows no changes |

**Surprise finding:** Branch validation removal in saveAllArtifacts — an unasked-for behavior change that removes a guardrail.

## AC Walkthrough

- **AC1:** ✅ PASS — `findProjectRoot()` walks up from subdirectory. Tests A002/A003 verify. Live test from `.github/` succeeds.
- **AC2:** ✅ PASS — returns CWD when `.ana/` exists. Test A001 verifies.
- **AC3:** ✅ PASS — error message exactly matches. Tests A004/A005 verify. Error: `"No .ana/ found in {startDir} or any parent directory. Run ana init from your project root."`
- **AC4:** ❌ FAIL — `artifact.ts` has 2 calls to `readArtifactBranch()` without `projectRoot` (lines 504, 924). All other 8 commands (work, verify, pr, check, setup, proof, agents, symbol-index) are fully wired.
- **AC5:** ✅ PASS — `init` and `scan` not modified. Verified via `git diff main -- packages/cli/src/commands/init/ packages/cli/src/commands/scan.ts` (empty output).
- **AC6:** ⚠️ PARTIAL — works from subdirectories without stale `.ana/` (tested from `.github/`). Fails from subdirectories with stale `.ana/` (environmental, not a code bug). However, artifact commands would fail from ANY subdirectory due to the `readArtifactBranch()` issue in Finding #1.
- **AC7:** ✅ PASS — `readArtifactBranch(projectRoot?: string)` at git-operations.ts:26. Uses `projectRoot ?? process.cwd()` fallback.
- **AC8:** ❌ FAIL — behavioral regression. `saveAllArtifacts` lost its branch validation guard block. Planning artifacts can now be committed on wrong branches without warning. The spec did not ask for this removal.
- **AC9:** ✅ PASS — 1141 tests pass. 2 failures in census.test.ts are pre-existing (file not modified). The builder correctly adapted agents.test.ts to create `.ana/` in temp dirs (agents.test.ts:31).

## Blockers

1. **artifact.ts:504 — `readArtifactBranch()` missing `projectRoot`:** Called before `findProjectRoot()` is resolved in `saveArtifact`. Will fail from subdirectories. Fix: resolve `projectRoot = findProjectRoot()` before line 504 and pass it.

2. **artifact.ts:924 — `readArtifactBranch()` missing `projectRoot`:** In `saveAllArtifacts`, `projectRoot` is already in scope (resolved at line 743). Just needs `readArtifactBranch(projectRoot)`.

3. **artifact.ts — branch validation removed:** The guard that prevented planning artifacts from being saved on the wrong branch was deleted. This is a behavioral regression not requested by the spec. Fix: restore the validation block using the already-resolved `projectRoot`.

## Callouts

- **Code:** `findProjectRoot` checks for `.ana/` directory existence, not `.ana/ana.json`. Stale empty `.ana/` directories (from test runs, partial inits) at `packages/cli/src/.ana`, `packages/cli/.ana`, `website/.ana` cause the function to return the wrong root. Not a spec violation, but a production fragility worth addressing in a future cycle. The check `fs.existsSync(path.join(current, '.ana', 'ana.json'))` would be more robust.

- **Code:** `saveArtifact` calls `findProjectRoot()` twice — once at line 544 (`artProjectRoot`) inside the contract pre-check block, and again at line 632 (`projectRoot`). Should resolve once at function top and reuse.

- **Code:** `slugDir` is declared twice in `saveArtifact` — once at line 545 as `slugDir` and again at line 703 as `slugDir2`. The renaming was needed because the original variable was scoped to the pre-check block. This is a symptom of the function being too long (200+ lines) — the two blocks that need slugDir are far apart.

- **Test:** A008 and A009 tags exist in `projectKind.test.ts`, an unrelated file from a different feature. The builder may have assumed pre-existing tags would satisfy coverage, but pre-check correctly flags them as "outside feature branch changes." The tags need to be in the feature's own test file.

- **Test:** A007 ("utility is exported and importable") tests `typeof findProjectRoot === 'function'`. This is a weak assertion — it would pass even if the import resolved to any function. The import itself at line 5 is the real test; the typeof check adds nothing. Not a blocker but a sentinel-like pattern.

- **Upstream:** The contract assertion A009 ("All existing tests continue to pass") is a meta-assertion that doesn't map naturally to a tagged test. Future contracts should express regression requirements as test-suite-level checks rather than per-test tags.

## Deployer Handoff

Three fixes needed in `artifact.ts` before merge:
1. Pass `projectRoot` to `readArtifactBranch()` at line 504 (resolve `findProjectRoot()` earlier in `saveArtifact`)
2. Pass `projectRoot` to `readArtifactBranch()` at line 924 (already in scope in `saveAllArtifacts`)
3. Restore the branch validation guard block that was removed from `saveAllArtifacts` (old step 4)

After fixes: re-run `(cd packages/cli && pnpm vitest run)` — expect 1143 tests, 2 pre-existing failures. Clean stale `.ana/` dirs from `packages/cli/src/`, `packages/cli/`, and `website/` if you want to test subdirectory behavior locally.

## Verdict
**Shippable:** NO
Two incomplete `readArtifactBranch()` wiring points in artifact.ts break `ana artifact save` from subdirectories — the core use case this feature enables. Plus a behavioral regression (branch validation removal) that weakens an existing guardrail. All three issues are localized to artifact.ts and straightforward to fix.
