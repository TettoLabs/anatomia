# Verify Report: Fix CI Test Failures

**Result:** FAIL
**Created by:** AnaVerify
**Date:** 2026-05-02
**Spec:** .ana/plans/active/fix-ci-failures/spec.md
**Branch:** feature/fix-ci-failures

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/fix-ci-failures/contract.yaml
  Seal: INTACT (hash sha256:3c58f5bc464fecc7829f508b74bf4c61b37f43a44416ae73fd52d08542166da1)
```

Seal status: **INTACT**

Tests: 1804 passed, 0 failed, 2 skipped (93 test files, all pass). Build: success. Lint: 14 warnings (0 errors, all pre-existing `@typescript-eslint/no-explicit-any`).

## Contract Compliance

| ID   | Says                                                              | Status         | Evidence |
|------|-------------------------------------------------------------------|----------------|----------|
| A001 | Git detection tests pass without global git config                | ✅ SATISFIED    | `packages/cli/tests/engine/detectors/git-detection.test.ts:35-36` — sets user.email and user.name after git init, test passes |
| A002 | Git branch detection works in fresh repos without global config   | ✅ SATISFIED    | `packages/cli/tests/engine/detectors/git-detection.test.ts:86-87` — same git config pattern in branch list test, test passes |
| A003 | Scan project detects git info without relying on global config    | ✅ SATISFIED    | `packages/cli/tests/engine/scanProject.test.ts:70-71` — git config set between init and commit, test passes |
| A004 | Go and Rust entry point tests use platform-safe temp directories  | ✅ SATISFIED    | `packages/cli/tests/engine/analyzers/entryPoints-go-rust.test.ts:12,18` — imports `tmpdir` from `node:os`, uses `mkdtemp(join(tmpdir(), ...))` |
| A005 | Structure analysis integration test uses platform-safe temp dir   | ✅ SATISFIED    | `packages/cli/tests/engine/integration/structure-analysis.test.ts:9,15` — imports `tmpdir` from `node:os`, uses `mkdtemp(join(tmpdir(), ...))` |
| A006 | No test file contains hardcoded /tmp/ paths                       | ❌ UNSATISFIED  | Grep for `/tmp/` in test files returns 12+ matches. See Independent Findings for breakdown. |
| A007 | Architecture detection normalizes paths before matching patterns  | ✅ SATISFIED    | `packages/cli/src/engine/analyzers/structure/architecture.ts:138` — `const normalized = directories.map(d => d.replace(/\\/g, '/'))` before all classifier calls |
| A008 | Architecture correctly detects microservices with backslash input  | ✅ SATISFIED    | Source inspection: normalization at line 138 feeds `normalized` into `isMicroservices()` at line 141. Backslash paths become forward-slash before regex `^services\/\w+` runs. |
| A009 | Proportional sampler returns forward-slash paths on all platforms  | ✅ SATISFIED    | `packages/cli/src/engine/sampling/proportionalSampler.ts:141` — `.replace(/\\/g, '/')` applied to all output paths after `path.join` |
| A010 | Sampler path filtering works regardless of platform separators    | ✅ SATISFIED    | `packages/cli/tests/engine/sampling/proportional-sampler.test.ts:89` — `f.startsWith('apps/web')` filter works because source normalizes to forward slashes. Test passes. |
| A011 | Documentation detector returns forward-slash paths for monorepo   | ✅ SATISFIED    | `packages/cli/src/engine/detectors/documentation.ts:137` — `path: relativePath.replace(/\\/g, '/')` in `checkFile()`. Test at `documentation.test.ts:121` asserts `packages/api/README.md` with forward slashes. |
| A012 | Documentation dogfood test does not depend on file modification recency | ✅ SATISFIED | `packages/cli/tests/engine/detectors/documentation.test.ts:284` — `expect(websiteReadme!.lastModifiedDays).toBeGreaterThanOrEqual(0)`. Contract requires `greater than -1`; `>= 0` satisfies this for integer days. |
| A013 | Git activity dogfood test accepts markdown files anywhere in repo  | ✅ SATISFIED    | `packages/cli/tests/engine/detectors/git-activity.test.ts:196-203` — `.md` files allowed with no path restriction. The string `startsWith('src/')` does not appear in the assertion. |
| A014 | All existing tests continue to pass after fixes                   | ✅ SATISFIED    | 1804 tests passed > 1800 threshold |
| A015 | No new test files were created                                    | ✅ SATISFIED    | `find tests -name '*.test.ts' | wc -l` returns 93, matches contract value |

## Independent Findings

### Predictions (Step 3) — resolved

1. **Predicted: Builder used destructured `tmpdir()` instead of `os.tmpdir()`.** Confirmed. `entryPoints-go-rust.test.ts` and `structure-analysis.test.ts` use `import { tmpdir } from 'node:os'` and call `tmpdir()`. The contract value says `os.tmpdir()` which doesn't appear as a literal string. Functionally identical — the contract was imprecise about import style.

2. **Predicted: documentation.ts might miss normalization at line 101.** Not found. Builder placed normalization inside `checkFile()` at line 137, which covers ALL doc paths (root, GitHub templates, API specs, monorepo packages). This is more comprehensive than the spec's one-line fix at line 283.

3. **Predicted: architecture.ts library check uses unnormalized `directories`.** Confirmed. See Code finding below.

4. **Predicted: git-activity dogfood test might be too permissive.** Partially confirmed. The test now allows `.md` files anywhere in the churn list, matching the spec's intent. The original restriction (`startsWith('src/')` for `.md`) was the thing that broke.

**Production risk: What would break that the spec didn't address?**
- The 3 remaining test files with hardcoded `/tmp/` filesystem paths (`testLocations.test.ts`, `entryPoints-node.test.ts`, `entryPoints-python.test.ts`) will still fail on Windows CI. These weren't in scope but are the same disease.
- The library detection branch in `architecture.ts` uses unnormalized paths — library projects could be misclassified on Windows.

### Over-building check

No over-building detected. All changes are one-liners matching the spec. No new exports, no new abstractions, no extra error handling beyond what the spec called for. The documentation normalization in `checkFile` is slightly broader than spec (covers all paths, not just line 283) but this is a better engineering choice, not scope creep.

## AC Walkthrough

- **AC1: All 6 CI matrix jobs pass** — ⚠️ PARTIAL. Local tests pass (93 files, 1804 tests). CI matrix not verified in this session — requires push and CI run. The fixes address all 6 failure categories.
- **AC2: git-detection tests set user.name/email before committing** — ✅ PASS. Lines 35-36 and 86-87 in `git-detection.test.ts`.
- **AC3: No test file uses hardcoded `/tmp/` paths** — ❌ FAIL. 3 test files outside the build scope still use hardcoded `/tmp/` for filesystem access: `testLocations.test.ts:10`, `entryPoints-node.test.ts:15`, `entryPoints-python.test.ts:15`. Additionally, mock data in `census.test.ts`, `applicationShape.test.ts`, and `types/census.test.ts` contains `/tmp/` string literals.
- **AC4: Architecture detection works on Windows (forward-slash normalization)** — ✅ PASS. `architecture.ts:138` normalizes before all three classifiers.
- **AC5: Proportional sampler output uses forward slashes on all platforms** — ✅ PASS. `proportionalSampler.ts:141` normalizes after `path.join`.
- **AC6: Dogfood tests are resilient to repo state changes** — ✅ PASS. `documentation.test.ts:284` uses `>= 0` instead of `> 30`. `git-activity.test.ts:196-203` allows `.md` files anywhere.
- **AC7: Documentation tests work on Windows (path normalization in source)** — ✅ PASS. `documentation.ts:137` normalizes all doc paths in `checkFile`.
- **AC8: Zero new test files — all fixes in existing files** — ✅ PASS. 93 test files, unchanged.
- **AC9: Local test suite still passes (no regressions)** — ✅ PASS. 1804 passed, 0 failed, 2 skipped.
- **AC10: scanProject.test.ts git test sets user config before committing** — ✅ PASS. Lines 70-71 in `scanProject.test.ts`.

## Blockers

A006 is UNSATISFIED: the contract asserts `grep.count equals 0` for `/tmp/` across all test files, but 12+ matches remain. The builder fixed the 2 files listed in `file_changes` correctly. The remaining matches are:

**Filesystem access (would fail on Windows):**
- `packages/cli/tests/engine/analyzers/testLocations.test.ts:10` — `const testDir = '/tmp/test-locations'`
- `packages/cli/tests/engine/analyzers/entryPoints-node.test.ts:15` — `const testDir = '/tmp/test-entry-points-node'`
- `packages/cli/tests/engine/analyzers/entryPoints-python.test.ts:15` — `const testDir = '/tmp/test-entry-points-python'`

**Mock data (harmless, no filesystem access):**
- `packages/cli/tests/engine/census.test.ts:44,66`
- `packages/cli/tests/engine/detectors/applicationShape.test.ts:333`
- `packages/cli/tests/engine/types/census.test.ts:8,18,28,39,93,104`

This is a contract-vs-scope mismatch. The contract assertion A006 expects codebase-wide cleanup, but the `file_changes` only lists 2 files. The builder did what the spec said. Options:
1. Fix the 3 remaining filesystem-access files (same `mkdtemp` pattern) and leave mock data strings as-is, then narrow A006 to exclude mock data.
2. Accept that the contract overreaches and the actual scope was the 2 listed files.

## Findings

- **Code — Library detection uses unnormalized paths:** `packages/cli/src/engine/analyzers/structure/architecture.ts:172` — The `if (entryPoints.length === 0)` fallback at line 172 uses the original `directories` parameter instead of `normalized`. On Windows, `d.startsWith('lib/')` would fail for backslash paths like `lib\\foo`. Pre-existing issue exposed by reviewing the builder's normalization fix — the fix covers the three classifiers but misses this branch. Not a regression (was broken before), but same disease.

- **Test — Remaining hardcoded /tmp/ filesystem paths in out-of-scope files:** `packages/cli/tests/engine/analyzers/testLocations.test.ts:10`, `packages/cli/tests/engine/analyzers/entryPoints-node.test.ts:15`, `packages/cli/tests/engine/analyzers/entryPoints-python.test.ts:15` — Three test files use hardcoded `/tmp/` for actual filesystem operations (`mkdirSync`, `writeFileSync`). These will fail on Windows CI. Same disease as the fixed files but not in the build scope.

- **Test — Mock data strings trigger /tmp/ grep:** `packages/cli/tests/engine/census.test.ts`, `packages/cli/tests/engine/types/census.test.ts`, `packages/cli/tests/engine/detectors/applicationShape.test.ts` — Test fixture objects use `/tmp/` in `absolutePath` fields. These never access the filesystem and won't cause Windows failures. They do trigger the A006 grep check. Not a real problem — contract should exclude mock data from the count.

- **Upstream — Contract A006 scope exceeds file_changes:** The contract asserts codebase-wide zero `/tmp/` matches, but `file_changes` only lists `entryPoints-go-rust.test.ts` and `structure-analysis.test.ts` for Category 2 fixes. The planner wrote an assertion broader than the defined scope. The builder followed the scope correctly.

- **Code — Documentation normalization placed at output boundary:** `packages/cli/src/engine/detectors/documentation.ts:137` — Builder placed `.replace(/\\/g, '/')` inside `checkFile()` rather than at the two call sites the spec identified. This is architecturally better — normalizes once at the output boundary rather than at each caller. A good judgment call that diverges from the spec's specific guidance.

- **Upstream — Contract A004/A005 value uses `os.tmpdir()` but implementation uses destructured `tmpdir()`:** The contract value `os.tmpdir()` doesn't match the import style used (`import { tmpdir } from 'node:os'`). Both are semantically identical. The `says` field (platform-safe temp directories) is satisfied. Contract precision issue — future contracts should specify behavior, not import style.

## Deployer Handoff

This branch fixes 6 categories of CI test failures: missing git config, hardcoded `/tmp/`, Windows path separators in 3 source files, and brittle dogfood assertions. All 93 test files pass locally with 1804 tests green.

The source fixes (`architecture.ts`, `proportionalSampler.ts`, `documentation.ts`) change production behavior on Windows — they normalize backslash paths to forward slashes. On Unix these are no-ops. These are correct production fixes, not test-only changes.

Three test files outside this build's scope still have hardcoded `/tmp/` filesystem paths that will fail on Windows. These should be addressed in a follow-up scope.

After merging, push the branch and verify all 6 CI matrix jobs go green. If the 3 out-of-scope `/tmp/` files cause Windows CI failures, they'll need the same `mkdtemp(join(tmpdir(), ...))` fix.

## Verdict
**Shippable:** NO

A006 is UNSATISFIED — the contract says zero `/tmp/` grep matches across test files, and 12+ remain. 14 of 15 contract assertions are satisfied. All 10 ACs pass except AC3. The builder correctly fixed every file in scope. The blocker is a contract-vs-scope mismatch: A006 overreaches the defined `file_changes`.

The developer should decide: either (1) fix the 3 remaining filesystem-access `/tmp/` files (15 minutes of work, same pattern), or (2) acknowledge the contract assertion was too broad and accept the build as-is.
