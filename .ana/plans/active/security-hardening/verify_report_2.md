# Verify Report: Security Hardening — Phase 2: runGit Utility & execSync Elimination

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-04
**Spec:** .ana/plans/active/security-hardening/spec-2.md
**Branch:** feature/security-hardening

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/security-hardening/contract.yaml
  Seal: INTACT (hash sha256:b9e52761c704d63c7b994a80f9d8f93ea891f6d1ed3b47d0eeda621586017969)
```
Seal status: **INTACT**

Tests: 1839 passed, 2 skipped (94 test files). Build: ✅ (cached). Lint: ✅ (15 warnings, 0 errors).

## Contract Compliance
| ID   | Says                                           | Status       | Evidence |
|------|------------------------------------------------|--------------|----------|
| A020 | The git wrapper utility successfully executes git commands and captures output | ✅ SATISFIED | `packages/cli/tests/utils/git-operations.test.ts:320-324`, asserts `result.stdout` contains `'true'` and `result.exitCode` is 0 on `rev-parse --is-inside-work-tree` |
| A021 | The git wrapper utility reports failure exit codes | ✅ SATISFIED | `packages/cli/tests/utils/git-operations.test.ts:327-331`, asserts `result.exitCode` is not 0 on `git log` in empty repo |
| A022 | The git wrapper utility respects the working directory option | ✅ SATISFIED | `packages/cli/tests/utils/git-operations.test.ts:334-341`, runs `git status --porcelain` with `{ cwd: tempDir }`, asserts exitCode 0 |
| A023 | No direct shell execution calls remain in command or utility files | ✅ SATISFIED | `packages/cli/tests/utils/git-operations.test.ts:357-379`, greps `src/commands/` and `src/utils/` for `execSync`, filters comments, asserts zero matches. Independent verification: `grep -r execSync packages/cli/src/commands/` and `packages/cli/src/utils/` both return zero non-comment hits |
| A024 | The engine documentation detector uses safe array-based process spawning | ✅ SATISFIED | Source inspection: `packages/cli/src/engine/detectors/documentation.ts:10` imports `spawnSync`, line 103 uses `spawnSync('git', ['log', '--format=%ct', '-1', '--', relativePath], ...)` with array args |
| A025 | The engine documentation detector does not import CLI utilities | ✅ SATISFIED | Source inspection: `packages/cli/src/engine/detectors/documentation.ts` has zero occurrences of `runGit` (grep confirmed). Imports only `node:child_process`, `node:fs`, `node:path`, `glob`, and engine type |
| A026 | All existing tests continue to pass after security hardening | ✅ SATISFIED | Full suite: 1839 passed, 2 skipped, 0 failed. 94 test files all green |
| A027 | Empty branch prefix remains a valid configuration | ✅ SATISFIED | `packages/cli/tests/utils/git-operations.test.ts:210-215`, writes `{ branchPrefix: '' }`, asserts `readBranchPrefix` returns `''` |

## Independent Findings

**Prediction resolution:**

1. *"Inconsistent error handling between runGit callers"* — Investigated. Callers use different patterns (exitCode check, stdout emptiness, both) appropriate to their context. `artifact.ts` checks `mbResult.exitCode === 0` before using stdout. `work.ts:fileExistsOnBranch` checks exitCode. Pattern is appropriate, not inconsistent.

2. *"git show branch:path colon syntax split incorrectly"* — Not found. `work.ts:100` correctly uses `runGit(['show', \`${branch}:${filePath}\`])` — colon-joined in a single array element as git syntax requires.

3. *"grep enforcement test is a sentinel"* — Partially confirmed. The test at line 357-379 does assert on source code content (greps `.ts` files). Testing standards say "never assert on source code content." However, the spec explicitly requested this pattern, and it's the only practical way to enforce the zero-execSync convention. Finding documented below.

4. *"documentation.ts might import CLI utils"* — Not found. Clean engine boundary maintained: only `node:child_process` and `node:` imports.

5. *"Some runGit callers don't use stderr"* — Confirmed but expected. Most callers check only `exitCode` and `stdout`. Stderr is available for error cases where callers need it (e.g., `work.ts:972` checks `pullResult`). The interface correctly provides all three fields for callers that need them.

**Production risk resolution:**

1. *"runGit returns empty stdout vs execSync throwing"* — All callers check `exitCode` before using stdout. No behavioral regression from execSync error paths.

2. *"Exit code mapping mismatch"* — runGit maps `result.status ?? 1` correctly. `spawnSync.status` is the process exit code, mapped to `exitCode` in the return type.

**Over-building check:** No exported functions that aren't imported elsewhere. `runGit` is imported by `artifact.ts`, `work.ts`, `proof.ts`, `preflight.ts`, `proofSummary.ts`. `RunGitResult` interface is exported and used by callers for type annotations. No YAGNI violations detected.

**Dead code check:** Every `if` block in `runGit` serves a purpose (null coalescing for stdout/stderr/status). No dead branches found in the utility itself. The enforcement test's comment-filter heuristic has a theoretical gap (see findings) but all code paths are exercised.

## AC Walkthrough

- ✅ PASS **AC9** — Zero `execSync` calls remain in `src/commands/` or `src/utils/`. Verified: `grep -r execSync packages/cli/src/commands/` returns zero matches. `grep -r execSync packages/cli/src/utils/` returns only a JSDoc comment at `git-operations.ts:30`. No import statements remain.
- ✅ PASS **AC11** — All existing tests pass without modification. 1839 passed, 2 skipped, 0 failed across 94 test files.
- ✅ PASS **AC12** — New tests cover `runGit()` utility. `git-operations.test.ts:304-354`: success case (stdout capture, exitCode 0), failure case (non-zero exitCode), cwd option, empty output, stderr capture — 5 tests total.
- ✅ PASS **documentation.ts uses spawnSync directly, not runGit** — Source inspection confirms: line 10 imports `spawnSync` from `node:child_process`, line 103 uses `spawnSync('git', [...])`. Zero occurrences of `runGit` or `git-operations` in the file.
- ✅ PASS **gh pr view uses spawnSync('gh', [...])** — `work.ts:1086`: `spawnSync('gh', ['pr', 'view', workBranchName, '--json', 'state', '-q', '.state'], ...)` with array args, no shell interpolation.
- ✅ PASS **No execSync import statements remain** — Grep for `import.*execSync` in `src/commands/` and `src/utils/` returns zero matches.

## Blockers

No blockers. All 8 Phase 2 contract assertions SATISFIED. All 6 acceptance criteria pass. No regressions (1839 tests pass). Checked for: unused exports in new code (RunGitResult is used by callers), unhandled error paths (runGit returns defaults for null status/stdout/stderr), external assumptions (cwd option properly forwarded), spec gaps (none — migration is mechanical).

## Findings

- **Test — Enforcement test asserts on source code content:** `packages/cli/tests/utils/git-operations.test.ts:358` — The execSync enforcement test greps `.ts` files and asserts on string content, violating the testing-standards rule "never assert on source code content." However, the spec explicitly requested this pattern, and convention enforcement is inherently a source-level property. Acceptable.

- **Code — git.ts retains execSync:** `packages/cli/src/engine/detectors/git.ts:56` — The git detector in `src/engine/` still uses `execSync`. This is architecturally correct (engine has zero CLI deps, so `runGit` from utils is off-limits), but it's the last remaining `execSync` in the codebase outside tests. Future hardening could migrate this to `spawnSync` for consistency, same pattern as `documentation.ts`.

- **Test — Comment-filter heuristic has edge case:** `packages/cli/tests/utils/git-operations.test.ts:371` — The enforcement test filters comments by checking if a trimmed line starts with `//`, `*`, or `/*`. A hypothetical `execSync` on a line that starts with a comment-like pattern but has code after it could be missed. Low probability given codebase conventions (consistent indentation, no inline comment mixing), but the heuristic is imperfect.

- **Code — runGit maps null status to 1:** `packages/cli/src/utils/git-operations.ts:47` — When `spawnSync` returns `null` for `status` (process killed by signal), runGit defaults to exitCode 1. Callers cannot distinguish "command failed with exit code 1" from "process was killed by SIGKILL." Acceptable for CLI use — signal kills are rare and exit code 1 is a safe failure default.

## Deployer Handoff

This is Phase 2 of a 2-phase security hardening. Phase 1 (validators + config hardening) was verified previously. Phase 2 eliminates all `execSync` calls from `src/commands/` and `src/utils/` by migrating to `runGit()` (for git) or `spawnSync` (for `gh` CLI). The engine boundary is preserved — `documentation.ts` uses `spawnSync` directly without CLI deps.

After merge:
- `git.ts` in `src/engine/detectors/` is the only remaining `execSync` user outside tests. Consider migrating in a future cycle for completeness.
- The enforcement test at `git-operations.test.ts:358` will catch any future `execSync` introductions in commands/utils.
- All existing tests pass. No behavioral changes for valid inputs. The migration is internal — user-visible output is identical.

## Verdict
**Shippable:** YES

All 8 Phase 2 contract assertions SATISFIED. All 6 acceptance criteria pass. 1839 tests pass, zero failures. Zero `execSync` in commands/utils. Engine boundary preserved. Migration is clean and mechanical — array args eliminate shell interpolation by construction.
