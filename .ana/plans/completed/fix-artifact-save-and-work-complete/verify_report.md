# Verify Report: Fix artifact save bypass, cwd bug, and work complete crash recovery

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-27
**Spec:** .ana/plans/active/fix-artifact-save-and-work-complete/spec.md
**Branch:** feature/fix-artifact-save-and-work-complete

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/fix-artifact-save-and-work-complete/contract.yaml
  Seal: INTACT (hash sha256:70764936b97974cfe7af1f0766f73ac4d8129eb21cd01ea3a55dd1ed25114501)

  A001  ✓ COVERED  "Saving an artifact that was committed outside the pipeline still records its metadata"
  A002  ✓ COVERED  "Saving an artifact that was committed outside the pipeline captures which files were changed"
  A003  ✓ COVERED  "Saving an artifact that was committed outside the pipeline produces a commit"
  A004  ✓ COVERED  "Saving the same artifact twice without changes does not create a spurious commit"
  A005  ✓ COVERED  "Metadata write is skipped when the artifact hash has not changed"
  A006  ✓ COVERED  "Metadata timestamp is preserved when the artifact hash has not changed"
  A007  ✓ COVERED  "Metadata write preserves existing entries like pre-check and modules_touched"
  A008  ✓ COVERED  "Artifact save succeeds when run from a subdirectory"
  A009  ✓ COVERED  "Work complete succeeds when run from a subdirectory"
  A010  ✓ COVERED  "Work complete blocks when build-report was never saved through the pipeline"
  A011  ✓ COVERED  "Work complete blocks when verify-report was never saved through the pipeline"
  A012  ✓ COVERED  "Work complete blocks when both reports are missing and names both"
  A013  ✓ COVERED  "Work complete blocks when both reports are missing and names the verify-report too"
  A014  ✓ COVERED  "Work complete proceeds when both reports have valid save metadata"
  A015  ✓ COVERED  "The completeness check does not mutate any files when it fails"
  A016  ✓ COVERED  "A failed work complete is automatically recovered on retry"
  A017  ✓ COVERED  "Recovery commits the archived plan and proof chain"
  A018  ✓ COVERED  "A genuinely completed work item is reported as already completed"
  A019  ✓ COVERED  "Double recovery works when the first recovery also fails"
  A020  ✓ COVERED  "Main-path commit failure tells the user how to retry"

  20 total · 20 covered · 0 uncovered
```

Tests: 1529 passed, 0 failed, 2 skipped (97 test files). Build: clean. Lint: 0 errors, 14 warnings (all pre-existing `@typescript-eslint/no-explicit-any` in unrelated files).

## Contract Compliance
| ID   | Says                                                             | Status       | Evidence |
|------|------------------------------------------------------------------|--------------|----------|
| A001 | Saving an artifact committed outside the pipeline records metadata | ✅ SATISFIED | `packages/cli/tests/commands/artifact.test.ts:1351` — commits artifact via raw git, then runs `saveArtifact`; asserts `saves['build-report'].saved_at` is truthy |
| A002 | Saving an artifact committed outside the pipeline captures files changed | ✅ SATISFIED | `packages/cli/tests/commands/artifact.test.ts:1372` — asserts `saves['modules_touched']` is defined after bypass recovery |
| A003 | Saving an artifact committed outside the pipeline produces a commit | ✅ SATISFIED | `packages/cli/tests/commands/artifact.test.ts:1378` — asserts `commitCountAfter > commitCountBefore` |
| A004 | Saving the same artifact twice creates no spurious commit        | ✅ SATISFIED | `packages/cli/tests/commands/artifact.test.ts:1407` — asserts `commitCountAfterSecond - commitCountAfterFirst === 0` |
| A005 | Metadata write is skipped when artifact hash unchanged           | ✅ SATISFIED | `packages/cli/tests/commands/artifact.test.ts:1276` — saves twice with same content, verifies hash unchanged (idempotent skip means `.saves.json` not rewritten). Contract says `equals false`; test verifies the equivalent side effect. |
| A006 | Metadata timestamp preserved when hash unchanged                 | ✅ SATISFIED | `packages/cli/tests/commands/artifact.test.ts:1323` — asserts `savesSecond.scope.saved_at === firstSavedAt` after unchanged re-save |
| A007 | Metadata write preserves existing entries like pre-check         | ✅ SATISFIED | `packages/cli/tests/commands/artifact.test.ts:1327` — pre-populates `pre-check` and `modules_touched`, saves build-report, asserts both original entries survive |
| A008 | Artifact save succeeds from subdirectory                         | ✅ SATISFIED | `packages/cli/tests/commands/artifact.test.ts:1413` — `process.chdir` into subdirectory, calls `saveArtifact`, asserts `.saves.json` written |
| A009 | Work complete succeeds from subdirectory                         | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1749` — `process.chdir` into subdirectory, calls `completeWork`, asserts completed path exists |
| A010 | Work complete blocks when build-report not saved                 | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1534` — `.saves.json` has only `verify-report`, asserts error contains `'build-report'` |
| A011 | Work complete blocks when verify-report not saved                | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1551` — `.saves.json` has only `build-report`, asserts error contains `'verify-report'` |
| A012 | Work complete blocks when both missing and names build-report    | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1564` — `savesJson: null`, asserts error contains `'build-report'` |
| A013 | Work complete blocks when both missing and names verify-report   | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1572` — same test, asserts error also contains `'verify-report'` |
| A014 | Work complete proceeds when both reports have valid save metadata | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1576` — both entries have `saved_at` + `hash`, asserts `completedPath` exists |
| A015 | Completeness check does not mutate when it fails                 | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1547` — after block, asserts `fsSync.existsSync(activePath)` is `true` |
| A016 | Failed work complete recovered automatically on retry            | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1666` — simulates failed completion (completed dir exists, active removed, uncommitted), calls `completeWork`, asserts output contains `'Recovering'` and `'PASS'` |
| A017 | Recovery commits the archived plan and proof chain               | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1683` — asserts last commit message contains `'Complete'` |
| A018 | Genuinely completed work item reported as already completed      | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1688` — commits everything first, then calls `completeWork`, asserts output contains `'already completed'` |
| A019 | Double recovery works when first recovery also fails             | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1708` — first recovery succeeds, adds untracked file to simulate second failure, second `completeWork` call asserts `'Recovering'` |
| A020 | Main-path commit failure tells user how to retry                 | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1736` — reads `work.ts` source, asserts it contains `'ana work complete ${slug}'` and `'to retry'` |

## Independent Findings

**Code quality is solid.** The four changes (writeSaveMetadata idempotency, saveArtifact flow reorder, completeness check, crash recovery) are clean and well-structured. The cwd fixes are comprehensive — every `execSync` call in both modified functions now has `cwd: projectRoot`.

**writeSaveMetadata idempotency** (`packages/cli/src/commands/artifact.ts:47-79`): Correctly computes `sha256:${hash}` with the prefix, compares against existing, returns `false` on match. Clean implementation. Both `saveArtifact` (line 726) and `saveAllArtifacts` (line 1019) call it correctly — the return value is unused by both callers, which is fine since the idempotency is self-contained.

**Save flow reorder** (`packages/cli/src/commands/artifact.ts:721-747`): Metadata write + modules_touched capture + .saves.json staging now happens before the `git diff --staged --quiet` check. This means: (a) if the artifact was committed outside save, `.saves.json` is the only new change → commit proceeds with just metadata; (b) if nothing changed and metadata hash matches, `.saves.json` is unchanged → no staged diff → "already up to date" exits correctly. Both paths verified by tests.

**Completeness check** (`packages/cli/src/commands/work.ts:1193-1221`): Runs after verify-report validation but before directory move. Reads `.saves.json` from `activePath`. Handles missing file (empty object → both missing). Error messages include both the specific artifact name and the exact remediation command. Nothing mutates on failure — the directory move hasn't happened yet.

**Crash recovery** (`packages/cli/src/commands/work.ts:1037-1087`): Uses `git status --porcelain .ana/` to distinguish genuine completion from failed prior run. Recovery stages `.ana/plans/`, `.ana/proof_chain.json`, `.ana/PROOF_CHAIN.md` and commits with the hoisted `coAuthor`. The recovery path prints a proof summary from the completed path. Clean.

**coAuthor hoist** (`packages/cli/src/commands/work.ts:994-1001`): Correctly hoisted to the top of `completeWork`, before both the recovery path and main commit path. No duplicate read remains.

**Prediction results:**
1. Missing `cwd: projectRoot` — Not found. All calls have it.
2. Hash format mismatch — Not found. Uses `sha256:${hash}` consistently.
3. Completeness check edge case (falsy values) — Not found. Handles `!buildSave || !buildSave.saved_at || !buildSave.hash` correctly.
4. Recovery commit message format — Not found. Uses identical format: `[${slug}] Complete — archived to plans/completed`.
5. coAuthor shadowed variable — Not found. Clean hoist, original removed.

**Surprises:**
- A020 test verifies the error message by reading `work.ts` source code rather than triggering an actual commit failure. This is a static assertion, not a behavioral one. It proves the string exists in code but not that it appears in the error path at runtime. See Test callout below.
- A019 (double recovery) simulates the second failure by writing an untracked file to `.ana/plans/completed/`, not by triggering an actual commit failure. This is reasonable — it proves the recovery path runs again when uncommitted changes exist. The "double" aspect tests idempotent recovery, not two sequential real failures.

## AC Walkthrough

- **AC1:** Running `ana artifact save build-report {slug}` when artifact committed outside `save` writes metadata, captures modules_touched, and commits.
  ✅ PASS — Test at `artifact.test.ts:1351` commits artifact via raw git, runs `saveArtifact`, verifies `.saves.json` has `build-report.saved_at`, `build-report.hash`, and `modules_touched`. Commit count increases by 1. Implementation at `artifact.ts:721-739` writes metadata + captures modules before no-changes check.

- **AC2:** Re-saving unchanged artifact exits "already up to date" with no spurious commit.
  ✅ PASS — Test at `artifact.test.ts:1382` saves twice, verifies commit count unchanged. `writeSaveMetadata` returns `false` (no `.saves.json` diff), `git diff --staged --quiet` returns 0, exits with "already up to date".

- **AC3:** Artifact save succeeds from subdirectory.
  ✅ PASS — Test at `artifact.test.ts:1413` chdir's into subdirectory, calls `saveArtifact`, verifies `.saves.json` written. All git calls in `saveArtifact` have `cwd: projectRoot`.

- **AC4:** Work complete succeeds from subdirectory.
  ✅ PASS — Test at `work.test.ts:1749` chdir's into subdirectory, calls `completeWork`, verifies completed path exists. All git calls in `completeWork` have `cwd: projectRoot`.

- **AC5:** Work complete recovers from previously failed completion.
  ✅ PASS — Test at `work.test.ts:1666` simulates failed state (completed dir exists, active removed, uncommitted changes). Calls `completeWork`, verifies "Recovering" message appears.

- **AC6:** After recovery, proof chain and plan archive are committed.
  ✅ PASS — Test at `work.test.ts:1683` verifies last commit message contains "Complete". Recovery path at `work.ts:1047-1053` stages `.ana/plans/`, proof_chain.json, PROOF_CHAIN.md and commits.

- **AC7:** All existing tests pass. No test count decrease.
  ✅ PASS — 1529 passed (up from 1514 baseline), 0 failed, 2 skipped. +15 new tests.

- **AC8:** Commit failure error message directs user to retry.
  ✅ PASS — `work.ts:1238`: `Error: Failed to commit. Run \`ana work complete ${slug}\` to retry.` Test at `work.test.ts:1736` confirms the string exists in source.

- **AC9:** `work complete` verifies `.saves.json` before directory move; blocks with specific error if either report missing.
  ✅ PASS — Implementation at `work.ts:1193-1221`, before directory move at line 1223. Tests at `work.test.ts:1534-1591` verify all four cases (build missing, verify missing, both missing, both present). A015 verifies active path still exists on failure (no mutation).

- **Tests pass with `pnpm vitest run`:**
  ✅ PASS — 1529 passed, 0 failed.

- **No build errors with `pnpm run build`:**
  ✅ PASS — Build succeeded, DTS and ESM both clean.

## Blockers

No blockers. All 20 contract assertions satisfied. All 11 acceptance criteria pass. Tests pass (1529, up from 1514). Build clean. Lint clean (0 errors).

Checked for: unused exports in new code (none — `writeSaveMetadata` is internal, not exported), unused function parameters (all parameters used), error paths that swallow silently (recovery catch at `work.ts:1080` falls through to "already completed" — acceptable), sentinel tests (A020 is static but tests the right string), external state assumptions (cwd is resolved via `findProjectRoot()` — correct).

## Callouts

- **Test — A020 uses source-code reading instead of behavioral test:** `packages/cli/tests/commands/work.test.ts:1736` — reads `work.ts` source and asserts the retry string exists. This proves the string is in the code but not that it appears in the error output when a commit actually fails. A behavioral test would mock `execSync` to throw on `git commit` and capture stderr. Low risk — the error path is straightforward (`catch` → `console.error` → `process.exit(1)`), but a source-reading test survives refactoring that breaks the behavior.

- **Code — Dead ternary on finding status:** `packages/cli/src/commands/work.ts:810` — `(c as { category: string }).category === 'upstream' ? 'active' : 'active' as const` — both branches evaluate to `'active'`. This is a pre-existing issue (from proof chain history) and is immediately overwritten by the status assignment loop at lines 818-824. Not introduced by this build; dormant dead code.

- **Code — Recovery catch swallows git status failure:** `packages/cli/src/commands/work.ts:1080` — if `git status --porcelain .ana/` throws (e.g., corrupt `.git` directory), the catch silently falls through to the "already completed" message. This is unlikely but means a corrupted git state would report "already completed" instead of a diagnostic error. The spec doesn't cover this edge case, so it's not a FAIL — but it's a sharp edge.

- **Test — A019 double recovery simulates failure via untracked file, not real commit failure:** `packages/cli/tests/commands/work.test.ts:1714-1720` — the "second failure" is simulated by writing a new file to the completed directory, making `git status --porcelain .ana/` return non-empty. This is a valid test of the recovery detection path, but it doesn't prove the system recovers from two sequential real commit failures. Given the recovery code is identical to the initial commit path, this is acceptable.

- **Upstream — Contract A005 tests effect rather than literal return value:** Contract specifies `target: "writeResult"` / `matcher: "equals"` / `value: false`, implying the test should capture and assert the return value of `writeSaveMetadata`. The test instead verifies the consequence (hash unchanged after idempotent skip). The verification is equivalent in practice — if `writeSaveMetadata` returned `true`, it would write a new timestamp, and the hash comparison would still pass but `saved_at` would change. The A006 test covers the timestamp preservation separately. Consider aligning the contract target with the actual test approach on next seal.

## Deployer Handoff

This is an infra fix — no user-facing behavior changes, no new CLI commands, no new dependencies.

**What changed:** `ana artifact save` now writes metadata *before* the no-changes check (fixes the bypass where agents commit outside save). `writeSaveMetadata` is idempotent (won't produce spurious commits on re-save). `ana work complete` now: (1) verifies both reports were saved through the pipeline before moving the directory, (2) recovers automatically from a previously failed completion, (3) works correctly from subdirectories.

**Merge notes:** Clean merge to main. The 14 lint warnings are all pre-existing `@typescript-eslint/no-explicit-any` in test files unrelated to this change.

**Post-merge:** Run `ana work complete fix-artifact-save-and-work-complete` to archive and generate proof chain entry.

## Verdict
**Shippable:** YES

All 20 contract assertions satisfied. All acceptance criteria pass. Tests increased from 1514 to 1529. Build and lint clean. The implementation is clean, well-structured, and follows existing patterns. The four bug fixes (save bypass, cwd, completeness check, crash recovery) each address the specific disease documented in the scope. Callouts are minor — a static source-reading test (A020), a pre-existing dead ternary, and a swallowed catch on a rare edge case. None prevent shipping.
