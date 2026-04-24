# Verify Report: Configurable branch prefix — Phase 2 (Migration)

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-24
**Spec:** .ana/plans/active/configurable-branch-prefix/spec-2.md
**Branch:** feature/configurable-branch-prefix

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/configurable-branch-prefix/contract.yaml
  Seal: INTACT (commit 0ba7752, hash sha256:a8c31f91bfa46...)

  A001  ✓ COVERED  "Fresh installs include a branch prefix setting in the config file"
  A002  ✓ COVERED  "Re-initializing preserves a user-modified branch prefix"
  A003  ✓ COVERED  "The config reader returns the configured prefix when present"
  A004  ✓ COVERED  "Older installs without a prefix setting get the default automatically"
  A005  ✓ COVERED  "A missing config file does not crash the prefix reader"
  A006  ✓ COVERED  "Teams using bare branch names can set an empty prefix"
  A007  ✓ COVERED  "The schema recovers gracefully from a corrupted prefix value"
  A008  ✓ COVERED  "Pipeline status commands show the configured prefix in branch instructions"
  A009  ✓ COVERED  "Pipeline status commands do not show the old hardcoded prefix"
  A010  ✓ COVERED  "Branch detection finds branches under the configured prefix"
  A011  ✓ COVERED  "The status JSON output uses the new workBranch field name"
  A012  ✓ COVERED  "The old featureBranch field name is removed from status output"
  A013  ✓ COVERED  "Completing a work item cleans up the branch under the configured prefix"
  A014  ✓ COVERED  "Artifact save error messages show the configured prefix in checkout hint"
  A015  ✓ COVERED  "PR creation warns when branch does not match the configured prefix"
  A016  ✓ COVERED  "Build agent template references the configurable prefix placeholder"
  A017  ✓ COVERED  "Build agent template no longer hardcodes the feature prefix"
  A018  ✓ COVERED  "Plan agent template references the configurable prefix placeholder"
  A019  ✓ COVERED  "Verify agent template references the configurable prefix placeholder"
  A020  ✓ COVERED  "The git-workflow skill shows the configurable prefix instead of hardcoded feature/"
  A021  ✓ COVERED  "An empty prefix produces branch names with just the slug"
  A022  ✓ COVERED  "An empty prefix does not produce a leading slash in branch names"

  22 total · 22 covered · 0 uncovered
```

Tests: 1440 passed, 0 failed, 2 skipped (96 test files). Build: clean. Lint: clean.

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Fresh installs include a branch prefix setting in the config file | ✅ SATISFIED | git-operations.test.ts:91 — `AnaJsonSchema.parse({name:'test'})` asserts `branchPrefix === 'feature/'` |
| A002 | Re-initializing preserves a user-modified branch prefix | ✅ SATISFIED | git-operations.test.ts:98 — parses `{branchPrefix:'dev/'}`, asserts result is `'dev/'`. Preservation mechanism verified: `preserveUserState` at state.ts:458 spreads `parsed.data` which includes schema-parsed `branchPrefix` |
| A003 | The config reader returns the configured prefix when present | ✅ SATISFIED | git-operations.test.ts:43 — writes `{branchPrefix:'dev/'}`, asserts `readBranchPrefix() === 'dev/'` |
| A004 | Older installs without a prefix setting get the default automatically | ✅ SATISFIED | git-operations.test.ts:49 — writes `{artifactBranch:'main'}` (no branchPrefix), asserts result `=== 'feature/'` |
| A005 | A missing config file does not crash the prefix reader | ✅ SATISFIED | git-operations.test.ts:55 — calls `readBranchPrefix` on empty tempDir, asserts result `=== 'feature/'` |
| A006 | Teams using bare branch names can set an empty prefix | ✅ SATISFIED | git-operations.test.ts:60 — writes `{branchPrefix:''}`, asserts result `=== ''` |
| A007 | The schema recovers gracefully from a corrupted prefix value | ✅ SATISFIED | git-operations.test.ts:107 — parses `{branchPrefix:12345}`, asserts `parsed.branchPrefix === 'feature/'` |
| A008 | Pipeline status commands show the configured prefix in branch instructions | ✅ SATISFIED | work.test.ts:424 — creates project with `branchPrefix:'dev/'`, asserts human-readable output `toContain('dev/')` |
| A009 | Pipeline status commands do not show the old hardcoded prefix | ✅ SATISFIED | work.test.ts:438 — same test asserts output `not.toContain('feature/')` |
| A010 | Branch detection finds branches under the configured prefix | ✅ SATISFIED | work.test.ts:442 — creates project with `branchPrefix:'dev/'` and `featureBranch:true` (creates `dev/test-slug` branch), JSON output asserts `workBranch` contains `'dev/'` |
| A011 | The status JSON output uses the new workBranch field name | ✅ SATISFIED | work.test.ts:460 — JSON output asserts `toHaveProperty('workBranch')` |
| A012 | The old featureBranch field name is removed from status output | ✅ SATISFIED | work.test.ts:473 — JSON output asserts `not.toHaveProperty('featureBranch')`. Contract matcher `not_equals` with value `"defined"` semantically matches — property is absent |
| A013 | Completing a work item cleans up the branch under the configured prefix | ✅ SATISFIED | work.test.ts:533 — creates `dev/test-slug` branch, merges, runs `completeWork('test-slug')`, asserts `git branch` output `not.toContain('dev/test-slug')` |
| A014 | Artifact save error messages show the configured prefix in checkout hint | ✅ SATISFIED | artifact.test.ts:316 — creates project with `branchPrefix:'dev/'` on main branch, triggers error, asserts error output `toContain('dev/test-slug')` |
| A015 | PR creation warns when branch does not match the configured prefix | ✅ SATISFIED | pr.test.ts:140 — creates project with `branchPrefix:'dev/'` on `feature/test-feature` branch, asserts log output `toContain('dev/')` and contains the warning message |
| A016 | Build agent template references the configurable prefix placeholder | ✅ SATISFIED | work.test.ts:496 — reads `ana-build.md`, asserts `toContain('{branchPrefix}')` |
| A017 | Build agent template no longer hardcodes the feature prefix | ✅ SATISFIED | work.test.ts:502 — asserts `not.toContain('feature/{slug}')`. Verified independently: `grep` on the template returns no matches |
| A018 | Plan agent template references the configurable prefix placeholder | ✅ SATISFIED | work.test.ts:506 — reads `ana-plan.md`, asserts `toContain('{branchPrefix}')` |
| A019 | Verify agent template references the configurable prefix placeholder | ✅ SATISFIED | work.test.ts:515 — reads `ana-verify.md`, asserts `toContain('{branchPrefix}')` |
| A020 | The git-workflow skill shows the configurable prefix instead of hardcoded feature/ | ✅ SATISFIED | work.test.ts:524 — reads `skills.ts` source, asserts `toContain('{branchPrefix}')`. Source code at skills.ts:355 confirms the placeholder is in the returned string |
| A021 | An empty prefix produces branch names with just the slug | ✅ SATISFIED | work.test.ts:477 — creates project with `branchPrefix:''`, asserts output `toContain('git checkout test-slug')` |
| A022 | An empty prefix does not produce a leading slash in branch names | ✅ SATISFIED | work.test.ts:492 — same test asserts output `not.toContain('/test-slug')` |

## Independent Findings

**Prediction resolution:**

1. **Not found** — All 18 `feature/` references in work.ts were replaced. Grep confirms zero remaining `feature/${slug}` template literals in work.ts, artifact.ts, pr.ts, and skills.ts source code. Only JSDoc examples remain (e.g., work.ts:93 `"feature/slug"` in a `@param` docstring).
2. **Not found** — Empty prefix in `completeWork` constructs `workBranchName = '' + slug` = bare slug, which works for `git branch -d`. The `git push origin --delete` with a bare slug also works correctly.
3. **Partially confirmed** — A018/A019 only check `toContain('{branchPrefix}')` without verifying old `feature/{slug}` is gone. However, the contract only requires `contains`, not `not_contains`, for these assertions. Verified independently via grep: both templates are clean of `feature/{slug}`.
4. **Not found** — Zero `featureBranch` references remain in work.ts (source). The test file's `createWorkTestProject` helper still uses `featureBranch: true` as a boolean option name (meaning "create a branch for this slug"), which is a test-internal option name, not a source code artifact.
5. **Not found** — skills.ts uses `{branchPrefix}{slug}` consistently with templates.

**Code quality observations:**

- The work.ts diff is clean and systematic — `getFeatureBranch` → `getWorkBranch`, `featureBranch` → `workBranch` throughout, `branchPrefix` parameter threaded from the top-level readers through all call sites.
- The `completeWork` function constructs `workBranchName = \`${branchPrefix}${slug}\`` once at line 937 and reuses it for all 4 git operations (remote list, merge-base check, branch delete, remote delete). Clean and DRY.
- `preserveUserState` correctly preserves `branchPrefix` via the schema spread at state.ts:458.
- Empty prefix edge case in `pr.ts`: `currentBranch.startsWith('')` is always true in JavaScript, so no warning is emitted when `branchPrefix` is `''`. This is correct behavior — with an empty prefix, any branch name is valid.

**Over-building check:**

- No new exports beyond `readBranchPrefix` (Phase 1). Phase 2 adds no new functions, only modifies existing signatures with the `branchPrefix` parameter.
- No unnecessary abstractions — the builder inlined `branchPrefix` reads at each call site rather than creating a wrapper or config object.
- No dead code paths in new code. Every `if` block in `getNextAction` serves a distinct stage.

## AC Walkthrough

- **AC4** (`ana work status` uses configured prefix): ✅ PASS — work.ts:642 reads `branchPrefix`, passes through `gatherArtifactState` and `getNextAction`. Test at work.test.ts:424 proves `dev/` appears in output with no `feature/`.
- **AC5** (`ana artifact save` uses configured prefix): ✅ PASS — artifact.ts:510 reads `branchPrefix`, passes to `validateBranch`. Error message at line 484 uses `${branchPrefix}${slug}`. Test at artifact.test.ts:316 confirms.
- **AC6** (`ana pr create` uses configured prefix): ✅ PASS — pr.ts:155 reads `branchPrefix`, `startsWith` check at line 164 uses it. Warning message at line 165 uses it. Test at pr.test.ts:140 confirms.
- **AC7** (`ana work complete` uses configured prefix): ✅ PASS — work.ts:887 reads `branchPrefix`, constructs `workBranchName` at line 937, used for merge verification (lines 952-965), branch deletion (line 1073), and remote deletion (line 1079). Test at work.test.ts:533 confirms branch cleanup under `dev/` prefix.
- **AC8** (Agent templates reference `{branchPrefix}` placeholder): ✅ PASS — ana-build.md: 9 replacements verified (diff shows 9 `feature/{slug}` → `{branchPrefix}{slug}` + instruction added). ana-plan.md: 2 replacements + instruction. ana-verify.md: 2 replacements + instruction. All templates verified clean of `feature/{slug}` via grep.
- **AC9** (Tests pass with non-`feature/` prefix): ✅ PASS — Tests at work.test.ts:424 (dev/), work.test.ts:477 (empty prefix), work.test.ts:533 (dev/ in complete), artifact.test.ts:316 (dev/), pr.test.ts:140 (dev/) all pass with non-default prefixes. Full suite: 1440 passed.
- **AC10** (git-workflow skill uses configured prefix): ✅ PASS — skills.ts:355 changed from `feature/{slug}` to `{branchPrefix}{slug}` with explanation. Test at work.test.ts:524 confirms.
- **AC11** (`WorkItem` interface uses `workBranch`): ✅ PASS — work.ts:75 changed from `featureBranch` to `workBranch`. Tests at work.test.ts:460-473 verify JSON output has `workBranch` and lacks `featureBranch`. Existing test at work.test.ts:373 also updated from `featureBranch` to `workBranch`.
- **Tests pass**: ✅ PASS — 1440 passed, 2 skipped (pre-existing), 96 test files.
- **No build errors**: ✅ PASS — `pnpm run build` succeeded clean.

## Blockers

No blockers. All 22 contract assertions satisfied. All 10 ACs pass. No regressions (1440 tests, up from 1417 baseline = +23 new tests across both phases). No remaining hardcoded `feature/` in source code. No unused exports in new code. No unhandled error paths — `readBranchPrefix` handles missing file, corrupted JSON, and wrong type with graceful fallback.

## Callouts

- **Test — A020 tests source code, not function output:** `work.test.ts:524` — reads `skills.ts` source file and checks for `{branchPrefix}` string presence. A behavioral test would call `injectGitWorkflow()` and assert the returned string contains the placeholder. The test proves the source has the right string, but if the `lines.push` were dead code or behind an unreachable branch, it would still pass. In practice, the function is a straight-line string builder with no branches, so this is cosmetic — but it's a weaker test pattern than the other assertions.

- **Test — A018/A019 don't verify removal of old hardcoded references:** `work.test.ts:506-521` — These tests check `toContain('{branchPrefix}')` but don't check `not.toContain('feature/{slug}')` like A017 does. The contract only requires `contains`, so this matches the contract. Verified independently: both templates are clean. But if someone added a `feature/{slug}` reference back, only A017 (ana-build) would catch it.

- **Code — `createWorkTestProject` still uses `featureBranch: true` option name:** `work.test.ts:431` — The test helper option `featureBranch: true` means "create a branch for this slug." The name is a holdover from the pre-migration interface. Since the branch is now created with the configured prefix (`dev/` or `''`), the option name is misleading. Renaming to `createBranch: true` would be clearer, but this is test-internal and doesn't affect behavior.

- **Upstream — No validation that branchPrefix ends with a separator:** `readBranchPrefix` accepts any string — `"dev"` (no trailing slash) would produce branch names like `devmy-slug`. The Zod schema uses `.string()` with no format validation. The spec doesn't require separator validation, and teams might intentionally use `"dev-"` or `""`. But there's no guardrail if someone accidentally sets `"dev"` instead of `"dev/"`. A future cycle could add a warning during init if the prefix is non-empty and doesn't end with `/` or `-`.

- **Code — Empty prefix suppresses `pr.ts` warning entirely:** `pr.ts:164` — `currentBranch.startsWith('')` is always true in JavaScript, so with `branchPrefix: ''`, the "not on expected branch" warning never fires. This is defensible (with an empty prefix, any branch name is valid), but it's an implicit behavior that isn't documented or tested. A test proving this intentional behavior would strengthen confidence.

## Deployer Handoff

This is phase 2 of a 2-phase feature. Phase 1 (Foundation) was already verified and merged into this branch. The `WorkItem` interface rename (`featureBranch` → `workBranch`) changes the JSON output shape of `ana work status --json`. No known external consumers — the only consumer is the CLI's own human-readable formatter. If anyone scripts against the JSON output, `featureBranch` is gone and `workBranch` replaces it. The feature is backward-compatible: existing installs without `branchPrefix` in ana.json get `feature/` automatically. Template changes affect newly-initialized projects only — existing projects keep their installed templates.

## Verdict
**Shippable:** YES

All 22 contract assertions satisfied. All 10 acceptance criteria pass. 1440 tests pass (+23 from baseline). Build and lint clean. No residual hardcoded `feature/` in source code. The migration is systematic, the edge cases (empty prefix, missing field, corrupted value) are handled with graceful fallbacks, and the test coverage exercises non-default prefixes end-to-end. The callouts are style and robustness observations, not correctness issues.
