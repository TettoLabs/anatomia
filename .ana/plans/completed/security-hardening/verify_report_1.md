# Verify Report: Security Hardening — Phase 1: Validators & Config Reader Hardening

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-04
**Spec:** .ana/plans/active/security-hardening/spec-1.md
**Branch:** feature/security-hardening

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/security-hardening/contract.yaml
  Seal: INTACT (hash sha256:b9e52761c704d63c7b994a80f9d8f93ea891f6d1ed3b47d0eeda621586017969)
```

Seal status: **INTACT**

Tests: 1833 passed, 0 failed, 2 skipped (1835 total). Baseline was 1807 passed — +26 new tests.
Build: success (ESM, tsup).
Lint: 0 errors, 15 warnings (all pre-existing `@typescript-eslint/no-explicit-any`).

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Slugs with shell injection characters are rejected before any operation | ✅ SATISFIED | `packages/cli/tests/utils/validators.test.ts:22` — asserts throw with message containing "Invalid slug" for `;`, `\|`, backtick, `$()`, `\n` |
| A002 | Slugs attempting path traversal are rejected | ✅ SATISFIED | `packages/cli/tests/utils/validators.test.ts:30` — asserts throw for `../../../tmp`, `foo/../bar`, URL-encoded traversal |
| A003 | Valid kebab-case slugs pass validation | ✅ SATISFIED | `packages/cli/tests/utils/validators.test.ts:6` — returns pass-through for `fix-auth-timeout`, `a`, `security-hardening` |
| A004 | Slugs with numbers like fix-v2 pass validation | ✅ SATISFIED | `packages/cli/tests/utils/validators.test.ts:14` — returns pass-through for `fix-v2`, `add-export-v3`, `v1` |
| A005 | Branch names with shell injection characters are rejected | ✅ SATISFIED | `packages/cli/tests/utils/validators.test.ts:79` — asserts throw with "invalid" for `;`, `\|`, backtick, `$()`, `\n` |
| A006 | Valid branch names with slashes pass validation | ✅ SATISFIED | `packages/cli/tests/utils/validators.test.ts:62` — returns pass-through for `feature/my-branch`, `origin/main`, `remotes/origin/main` |
| A007 | Empty string is accepted as a valid branch prefix | ✅ SATISFIED | `packages/cli/tests/utils/validators.test.ts:69` — `validateBranchName('')` returns `''` |
| A008 | Skill names with shell injection characters are rejected | ✅ SATISFIED | `packages/cli/tests/utils/validators.test.ts:98` — asserts throw with "invalid" for `;`, `\|`, backtick, `$()`, `/` |
| A009 | Valid skill names with hyphens pass validation | ✅ SATISFIED | `packages/cli/tests/utils/validators.test.ts:89` — returns pass-through for `coding-standards`, `api-patterns`, `git-workflow` |
| A010 | Malicious artifact branch values in config cause an error exit | ✅ SATISFIED | `packages/cli/tests/utils/git-operations.test.ts:156` — mocks process.exit, asserts exitCode === 1 and error contains "Invalid artifactBranch" |
| A011 | Malicious branch prefix values in config fall back to the safe default | ✅ SATISFIED | `packages/cli/tests/utils/git-operations.test.ts:202` — `readBranchPrefix` with `"x; echo pwned/"` returns `"feature/"` |
| A012 | Control characters in co-author values are stripped before use | ✅ SATISFIED | `packages/cli/tests/utils/git-operations.test.ts:238` — asserts `not.toContain('\n')`, `not.toContain('\r')`, `not.toContain('\x00')` |
| A013 | Normal co-author values with angle brackets pass through unchanged | ✅ SATISFIED | `packages/cli/tests/utils/git-operations.test.ts:248` — asserts `toContain('<')` and exact value `'Ana <build@anatomia.dev>'` |
| A014 | Directories with config but no git repository are not treated as project roots | ✅ SATISFIED | `packages/cli/tests/utils/findProjectRoot.test.ts:91` — creates `.ana/ana.json` without `.git/`, asserts throw "No .ana/ found" |
| A015 | Directories with both config and git repository are accepted as project roots | ✅ SATISFIED | `packages/cli/tests/utils/findProjectRoot.test.ts:98` — creates `.ana/ana.json` + `.git/`, asserts returns tempDir |
| A016 | Saving an artifact with an injection slug is rejected immediately | ✅ SATISFIED | Source: `packages/cli/src/commands/artifact.ts:797` — `validateSlug(slug)` + `process.exit(1)`. Live test: `ana artifact save scope "foo; echo pwned"` → exit 1 with "Invalid slug format" |
| A017 | Completing work with an injection slug is rejected immediately | ✅ SATISFIED | Source: `packages/cli/src/commands/work.ts:964` — `validateSlug(slug)` + `process.exit(1)`. Live test: `ana work complete "../../../tmp"` → exit 1 with "Invalid slug format" |
| A018 | Creating a PR with an injection slug is rejected immediately | ✅ SATISFIED | Source: `packages/cli/src/commands/pr.ts:154` — `validateSlug(slug)` + `process.exit(1)`. Live test: `ana pr create "foo; echo pwned"` → exit 1 with "Invalid slug format" |
| A019 | Strengthening a finding with an injection skill name is rejected | ✅ SATISFIED | Source: `packages/cli/src/commands/proof.ts:1293` — `validateSkillName(options.skill)` + `exitError()`. Validator tested in `validators.test.ts:98` |
| A026 | All existing tests continue to pass after security hardening | ✅ SATISFIED | Test run: 1833 passed, 0 failed, 2 skipped. Baseline: 1807 passed. No regressions. |
| A027 | Empty branch prefix remains a valid configuration | ✅ SATISFIED | `packages/cli/tests/utils/git-operations.test.ts:208` — `readBranchPrefix` with `""` returns `""` |

**Note on A016-A019:** These assertions have no dedicated integration tests. The `@ana A016-A019` tags in `work.test.ts:495-520` point to pre-existing branchPrefix template tests from a prior build cycle — they do not test command entry point validation. Assertions are marked SATISFIED based on source inspection (validation wiring is visible at each entry point) and live CLI testing (all three slug-accepting commands correctly reject injection payloads with exit code 1). See Findings for the test coverage gap.

## Independent Findings

**Prediction resolution:**
1. Slug edge cases — Not found. Regex handles all cases correctly.
2. findProjectRoot .git as file (worktree) — Not found. Test at `findProjectRoot.test.ts:106` explicitly covers this. Well done.
3. readCoAuthor control chars — Not found. Regex `[\x00-\x1f\x7f]` is comprehensive.
4. Command entry point integration tests — **Confirmed.** No dedicated tests exist for A016-A019. Tags collide with prior cycle.
5. Duplicate SLUG_PATTERN — Not found. Properly removed from work.ts.

**Surprise finding:** The `@ana` tag system has no namespacing. Tags from different build cycles share the same ID space (A001, A002, etc.), creating ambiguity when multiple contracts have been built on the same codebase. Prior-cycle tags in `git-operations.test.ts` and `findProjectRoot.test.ts` made initial assertion tracking confusing.

**Over-building check:** No scope creep detected. All new code serves the spec. `saveAllArtifacts` at `artifact.ts:1139` also received validation — not explicitly in the spec's file changes list but a correct addition since it's another slug-accepting entry point.

**YAGNI check:** `SLUG_PATTERN` is exported from `validators.ts` but only imported in the test file (`validators.test.ts:2`). No source file imports the raw regex — all use `validateSlug()` instead. This is spec-directed ("Export the existing SLUG_PATTERN") and provides testability, so not a concern.

## AC Walkthrough

| AC | Criterion | Status | Evidence |
|----|-----------|--------|----------|
| AC1 | `ana artifact save scope "foo; echo pwned"` exits with "Invalid slug format" error before any filesystem or git operation | ✅ PASS | Live test: `node packages/cli/dist/index.js artifact save scope "foo; echo pwned"` → "Error: Invalid slug format. Use kebab-case: fix-auth-timeout, add-export-csv", exit 1 |
| AC2 | `ana pr create "foo; echo pwned"` exits with "Invalid slug format" error | ✅ PASS | Live test: `node packages/cli/dist/index.js pr create "foo; echo pwned"` → same error, exit 1 |
| AC3 | `ana work complete "../../../tmp"` exits with "Invalid slug format" error | ✅ PASS | Live test: `node packages/cli/dist/index.js work complete "../../../tmp"` → same error, exit 1 |
| AC4 | `readArtifactBranch()` exits with error for injection payload | ✅ PASS | Test `git-operations.test.ts:156` — exitCode 1, error mentions "Invalid artifactBranch" |
| AC5 | `readBranchPrefix()` returns `'feature/'` fallback for injection payload | ✅ PASS | Test `git-operations.test.ts:202` — returns `"feature/"` for `"x; echo pwned/"` |
| AC6 | `readBranchPrefix()` continues to accept empty string `""` | ✅ PASS | Test `git-operations.test.ts:208` — returns `""` |
| AC7 | `readCoAuthor()` strips newlines and control characters | ✅ PASS | Test `git-operations.test.ts:238` — strips `\n`, `\r`, `\x00`, result is `"Ana<build@anatomia.dev>"` |
| AC8 | `ana proof strengthen --skill "foo; echo pwned"` exits with validation error | ✅ PASS | Source: `proof.ts:1293` validates with `validateSkillName()` then `exitError('INVALID_SKILL', ...)`. Validator tested in `validators.test.ts:98` |
| AC10 | `findProjectRoot()` rejects directory with `.ana/ana.json` but no `.git` | ✅ PASS | Test `findProjectRoot.test.ts:91` — throws "No .ana/ found" |
| AC11 | All existing tests pass without modification | ✅ PASS | 1833 passed, 0 failed, 2 skipped. +26 new tests from baseline of 1807 |
| New tests | Cover slug, branch name, skill name validation, findProjectRoot containment, config reader rejection | ✅ PASS | `validators.test.ts`: 15 tests. `git-operations.test.ts`: 10 new tests across 3 describe blocks. `findProjectRoot.test.ts`: 4 new tests |

## Blockers

No blockers. All 21 phase-1 contract assertions are SATISFIED. All 11 acceptance criteria pass. Tests pass with zero failures and +26 new tests. Build and lint clean. No regressions.

Checked for: unused exports in new code (`SLUG_PATTERN` exported for tests only — acceptable), unused parameters in validator functions (all parameters used), error paths without test coverage (A016-A019 entry points lack dedicated tests but are verified by source inspection + live testing), external assumptions (validators are pure functions — no environment dependencies), spec gaps (builder correctly added `saveAllArtifacts` validation not explicitly listed in spec).

## Findings

- **Test — A016-A019 @ana tags point to wrong tests:** `packages/cli/tests/commands/work.test.ts:495-520` — Tags `@ana A016`, `A017`, `A018`, `A019` are attached to pre-existing branchPrefix template content tests, not command entry point validation tests. The assertions were verified by source inspection and live CLI testing, but no dedicated integration tests exercise the `validateSlug`/`validateSkillName` calls at `saveArtifact`, `completeWork`, `createPr`, and `strengthen` entry points. Next cycle should add 4 tests: pass injection payload to each command function, assert exit/error.

- **Test — No integration tests for command entry point validation:** The validators are thoroughly unit-tested in `validators.test.ts`, and the config readers are tested in `git-operations.test.ts`. But the wiring — "command X calls validateSlug at its entry point" — is verified only by source inspection and live testing, not by automated tests. A refactor that accidentally removes the `validateSlug` call from `saveArtifact` would not be caught by the test suite.

- **Upstream — @ana tag IDs collide across build cycles:** `packages/cli/tests/utils/git-operations.test.ts:37-57` and `packages/cli/tests/utils/findProjectRoot.test.ts:33-66` have `@ana A001-A008` tags from prior contract cycles. These match completely different assertions in the current security-hardening contract. The tag system has no per-contract namespacing, making automated tag lookup unreliable across builds.

- **Code — getCurrentBranch still uses bare execSync:** `packages/cli/src/utils/git-operations.ts:144` — `execSync('git rev-parse --abbrev-ref HEAD', ...)` remains unhardened. This is Phase 2 scope (execSync elimination), so not a blocker for Phase 1, but it's the last remaining `execSync` call in this file.

- **Code — SLUG_PATTERN exported but unused in source:** `packages/cli/src/utils/validators.ts:19` — Exported per spec instruction, but no source file imports the raw regex. All callers use `validateSlug()`. The export serves test visibility only. Acceptable as-is.

- **Test — A010 process.exit mock allows post-exit execution:** `packages/cli/tests/utils/git-operations.test.ts:156` — The mock replaces `process.exit` with a no-op that records the exit code. After the mock "exit," `readArtifactBranch` continues and returns the invalid branch string. In production, `process.exit` terminates so this path never runs. The test correctly verifies exit code 1, but the pattern could mask bugs if post-exit code has side effects. Standard testing pattern — not a blocker.

## Deployer Handoff

Phase 1 of 2. This PR adds input validation at all user-facing entry points and hardens config readers. Safe to merge — all tests pass, no behavior changes for valid inputs.

After merging, Phase 2 (`spec-2.md`) replaces `execSync` calls with a `runGit()` utility using `spawnSync`. Phase 2 depends on Phase 1 — the validators established here are prerequisites for safe argument passing.

The `.git` containment check in `findProjectRoot` is the one behavioral change users might notice: projects with `.ana/ana.json` but no `.git/` directory will now get an error instead of being treated as project roots. This is correct behavior — Ana requires git.

## Verdict

**Shippable:** YES

All 21 contract assertions SATISFIED. All 11 acceptance criteria PASS. 1833 tests pass, +26 new, 0 regressions. Implementation is clean — validators are well-structured, config reader hardening follows existing patterns, entry points are wired correctly. The missing integration tests for A016-A019 are a test coverage debt item, not a shipping blocker — the behavior is verified by live CLI testing and the validators themselves are thoroughly unit-tested. Would I stake my name on this shipping? Yes.
