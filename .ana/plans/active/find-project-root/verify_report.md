# Verify Report: findProjectRoot utility for subdirectory support

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-16
**Spec:** .ana/plans/active/find-project-root/spec.md
**Branch:** feature/find-project-root

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/find-project-root/contract.yaml
  Seal: INTACT (commit 3f9ddfa, hash sha256:e4011e2a4a638...)

  A001  ✓ COVERED  "Finding project root from the project directory returns that directory"
  A002  ✓ COVERED  "Finding project root from a nested subdirectory walks up and finds the project"
  A003  ✓ COVERED  "Finding project root from a deeply nested subdirectory still finds the project"
  A004  ✓ COVERED  "A clear error is thrown when no project is found in any parent directory"
  A005  ✓ COVERED  "The error message tells the user to run ana init"
  A006  ✓ COVERED  "When two nested projects exist, the closest one is found"
  A007  ✓ COVERED  "The utility is exported and importable from validators"
  A008  ✓ COVERED  "readArtifactBranch accepts a project root parameter"
  A009  ✓ COVERED  "All existing tests continue to pass after the wiring changes"

  9 total · 9 covered · 0 uncovered
```

Seal: INTACT. All 9 assertions COVERED.

Tests: 1156 passed, 2 failed, 0 skipped. Build: SUCCESS (turbo cached). Lint: SUCCESS.

The 2 failures are census.test.ts (cal.com, dub monorepo detection) — **pre-existing**, unmodified by this branch. The 4 proof.test.ts regressions from the previous cycle are fixed.

## Contract Compliance
| ID   | Says                                           | Status         | Evidence |
|------|------------------------------------------------|----------------|----------|
| A001 | Finding project root from the project directory returns that directory | ✅ SATISFIED | findProjectRoot.test.ts:20-23, creates `.ana/` in tempDir, asserts `result === tempDir` |
| A002 | Finding project root from a nested subdirectory walks up and finds the project | ✅ SATISFIED | findProjectRoot.test.ts:27-33, creates `packages/cli` subdir, starts from subdir, asserts `result === tempDir` |
| A003 | Finding project root from a deeply nested subdirectory still finds the project | ✅ SATISFIED | findProjectRoot.test.ts:37-43, creates 4-level deep dir `packages/cli/src/commands`, asserts `result === tempDir` |
| A004 | A clear error is thrown when no project is found in any parent directory | ✅ SATISFIED | findProjectRoot.test.ts:49, `.toThrow('No .ana/ found in')` — contains matcher matches contract |
| A005 | The error message tells the user to run ana init | ✅ SATISFIED | findProjectRoot.test.ts:50-52, `.toThrow('Run ana init from your project root')` — contains matcher matches contract |
| A006 | When two nested projects exist, the closest one is found | ✅ SATISFIED | findProjectRoot.test.ts:56-68, creates outer+inner `.ana/`, starts from `inner/src`, asserts `result === innerProjectDir` |
| A007 | The utility is exported and importable from validators | ✅ SATISFIED | findProjectRoot.test.ts:72-73, `typeof findProjectRoot === 'function'` — exists matcher. Import at line 5 is the real proof. |
| A008 | readArtifactBranch accepts a project root parameter | ✅ SATISFIED | findProjectRoot.test.ts:77-87, creates temp `.ana/ana.json` with `{ artifactBranch: 'main' }`, calls `readArtifactBranch(tempDir)`, asserts `result === 'main'` |
| A009 | All existing tests continue to pass after the wiring changes | ✅ SATISFIED | Suite run: 1156 passed, 2 failed (pre-existing census.test.ts only). No new regressions. The tagged test at line 90-95 is `expect(true).toBe(true)` (a tautology — see Callouts), but the suite-level result independently confirms no regressions. |

## Independent Findings

### 1. proof.test.ts regression FIXED
Builder commit b823449 added `await fs.mkdir(path.join(tempDir, '.ana'), { recursive: true })` to the 4 previously-failing test setups (lines 218, 260, 519, 529). Each test now creates `.ana/` so `findProjectRoot()` succeeds, then the command proceeds to its own missing-proof-chain handling. All 4 tests pass. The fix matches the pattern from agents.test.ts.

### 2. work.ts merge-base simplification GONE
The previous cycle's callout about removed `git fetch --prune` + remote branch existence checks in `completeWork` is no longer present. The rebase onto main restored the original merge-base logic. The diff now shows only the expected `process.cwd()` → `projectRoot` threading — no behavioral changes beyond scope.

### 3. No over-building detected
All 10 new imports of `findProjectRoot` are used. `discoverSlugs` and `gatherArtifactState` in work.ts received `projectRoot` parameters — necessary for threading. `writeProofChain` also received `projectRoot` — necessary for the same reason. No unused exports, no dead code paths, no extra functionality beyond spec.

### 4. Prediction resolution
| # | Prediction | Result |
|---|-----------|--------|
| 1 | proof.test.ts fix is minimal and correct | ✅ Confirmed — 4 `mkdir .ana/` additions, all tests pass |
| 2 | A009 still `expect(true).toBe(true)` | ✅ Confirmed — see Callouts |
| 3 | work.ts merge-base simplification still present | ❌ Not found — rebase cleaned it up, only process.cwd threading remains |
| 4 | Stale `.ana/` dir issue still present | ✅ Confirmed — not a spec violation |
| 5 | No new regressions | ✅ Confirmed — 1156 passed, 2 pre-existing failures only |

No surprise findings this cycle.

## Previous Findings Resolution

### Previously UNSATISFIED Assertions
| ID | Previous Issue | Current Status | Resolution |
|----|----------------|----------------|------------|
| A009 | Sentinel test `expect(true).toBe(true)` + 4 proof.test.ts regressions | ✅ SATISFIED | Builder fixed proof.test.ts regressions (b823449). Suite now passes: 1156 passed, 2 pre-existing failures. The tautology test remains (see Callouts) but the suite result independently confirms no regressions. |

### Previous Callouts
| Callout | Status | Notes |
|---------|--------|-------|
| `findProjectRoot` checks `.ana/` not `.ana/ana.json` — stale dirs cause wrong root | Still present | `packages/cli/src/.ana/` still exists with only `state/`. Not a spec violation — noted again in Callouts. |
| `saveArtifact` calls `findProjectRoot()` twice | Fixed | Resolved once at line ~504, reused throughout. |
| `slugDir` declared twice in `saveArtifact` | Still present | `slugDir` at line ~547, `slugDir2` at line ~708. Cosmetic, not a blocker. |
| A008/A009 tags in wrong file (projectKind.test.ts) | Fixed | Tags now in findProjectRoot.test.ts:77 and :90. |
| A007 test weak (`typeof` check) | Still present | Import at line 5 is the real verification. Not a blocker. |
| A009 meta-assertion is tautology | Still present | `expect(true).toBe(true)` — see Callouts. Suite result serves as independent verification. |
| work.ts merge-base simplification beyond scope | No longer applicable | Rebase onto main removed the behavioral change. Diff now shows only process.cwd threading. |

## AC Walkthrough

- **AC1:** ✅ PASS — `findProjectRoot()` walks up from subdirectory. Tests A002/A003 verify with 2-level and 4-level deep dirs. Live test: `ana work status` from `.github/` succeeds.
- **AC2:** ✅ PASS — Returns CWD when `.ana/` exists. Test A001 verifies at findProjectRoot.test.ts:20-23.
- **AC3:** ✅ PASS — Error message: `"No .ana/ found in /private/tmp or any parent directory. Run ana init from your project root."` Live test from `/tmp` confirmed. Tests A004/A005 verify.
- **AC4:** ✅ PASS — All 9 specified commands use `findProjectRoot()`: artifact (lines 504, 745), work (line 586), verify (lines 75, 310), pr (line 151), check (line 1448), setup (line 54), proof (line 226), agents (line 60), symbol-index (line 435). Grep confirmed zero `process.cwd()` remaining in these files.
- **AC5:** ✅ PASS — `init` uses `process.cwd()` at init/index.ts:68. `scan` receives target path argument. Neither imports `findProjectRoot`. `git diff main..HEAD` confirms neither file modified.
- **AC6:** ✅ PASS — Live test: `cd .github && node ../packages/cli/dist/index.js work status` returns "No active work." from subdirectory.
- **AC7:** ✅ PASS — `readArtifactBranch(projectRoot?: string)` at git-operations.ts:26. Uses `projectRoot ?? process.cwd()` fallback. Test A008 verifies with explicit path.
- **AC8:** ✅ PASS — Default parameters preserve existing behavior: `findProjectRoot(startDir = process.cwd())` at validators.ts:101, `readArtifactBranch(projectRoot?: string)` with `?? process.cwd()` at git-operations.ts:27.
- **AC9:** ✅ PASS — 1156 tests passed. 2 failures are pre-existing (census.test.ts cal.com + dub, file unmodified). No new regressions.

## Blockers

No blockers. All 9 contract assertions satisfied. All 9 acceptance criteria pass. No regressions.

Checked: no unused exports in new code (all 10 `findProjectRoot` imports accounted for), no unused parameters (every `projectRoot` param threaded to `path.join` or `readArtifactBranch`), no unhandled error paths (`findProjectRoot` throws on missing `.ana/` — commands surface this as a CLI error), no sentinel test patterns beyond the known A009 tautology (which is mitigated by suite-level verification).

## Callouts

- **Code:** `findProjectRoot` checks for `.ana/` directory existence (validators.ts:105), not `.ana/ana.json`. A stale `.ana/` directory containing only `state/` (like `packages/cli/src/.ana/`) causes the function to return the wrong root. `readArtifactBranch` then fails with "No .ana/ana.json found." Checking `fs.existsSync(path.join(current, '.ana', 'ana.json'))` would be more robust. Not a spec violation — the spec explicitly says "looking for a directory containing `.ana/`" — but a production fragility worth addressing in a future cycle.

- **Code:** `slugDir2` in artifact.ts saveArtifact (line ~708) renamed from `slugDir` to avoid shadowing the pre-check block's `slugDir` (line ~547). Symptom of a long function — cosmetic, not functional. Carried from previous cycles.

- **Test:** A009 test at findProjectRoot.test.ts:90-95 is `expect(true).toBe(true)` — a tautology that passes regardless of suite health. The builder's comment claims "if wiring broke existing tests, this file wouldn't reach execution," but Vitest executes test files independently. This test proves nothing. The suite-level result (1156 passed, 2 pre-existing failures) is the real evidence for A009, not this tagged test. Future contracts should express regression requirements as suite-run checks, not per-test tautologies.

- **Test:** A007 test at findProjectRoot.test.ts:72-73 uses `typeof findProjectRoot === 'function'` — this passes for any function. The import statement at line 5 would throw `ERR_MODULE_NOT_FOUND` if the export didn't exist, which is the real verification. The typeof check adds no signal beyond the import.

- **Upstream:** A009 as a contract assertion ("all existing tests continue to pass") is inherently untestable at the unit level. It's a suite-level property. Tagging a single test with `@ana A009` creates pressure to write a sentinel. Future contracts should either omit suite-level regression assertions or express them as "test command exits 0" verified during the build step, not as tagged tests.

## Deployer Handoff

Clean merge. All command files wire `findProjectRoot()` at their entry points and thread `projectRoot` through internal helpers. No behavioral changes beyond the spec's intent.

Known pre-existing failures: 2 in census.test.ts (cal.com + dub monorepo detection) — unrelated to this branch.

The `packages/cli/src/.ana/` stale directory is a latent issue — if someone runs `ana work status` from `packages/cli/src/`, they'll hit "No .ana/ana.json found" instead of walking up to the real project root. This is cosmetic for now (developers typically run from project root or recognized subdirectories), but worth a follow-up to either delete the stale dir or check for `ana.json` instead of just `.ana/`.

## Verdict
**Shippable:** YES
All 9 contract assertions satisfied. All 9 acceptance criteria pass. 1156 tests pass with 2 pre-existing failures only. No regressions. The 4 proof.test.ts failures from the previous cycle are fixed. Live-tested success path (subdirectory → walks up) and error path (no `.ana/` → clear error message). The A009 tautology and stale-dir fragility are callouts, not blockers.
