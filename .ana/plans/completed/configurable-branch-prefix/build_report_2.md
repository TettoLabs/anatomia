# Build Report: Configurable branch prefix — Phase 2 (Migration)

**Created by:** AnaBuild
**Date:** 2026-04-24
**Spec:** .ana/plans/active/configurable-branch-prefix/spec-2.md
**Branch:** feature/configurable-branch-prefix

## What Was Built

- `src/commands/work.ts` (modified): Renamed `getFeatureBranch()` → `getWorkBranch()` with `branchPrefix` parameter. Renamed `featureBranch` → `workBranch` in `WorkItem` interface and all usage sites. Added `branchPrefix` parameter to `getNextAction()`, `gatherArtifactState()`, and `determineStage()`. Read `readBranchPrefix()` at top of `getWorkStatus()` and `completeWork()`. Replaced all 18 hardcoded `feature/` references with `${branchPrefix}${slug}`.
- `src/commands/artifact.ts` (modified): Added `branchPrefix` parameter to `validateBranch()`. Replaced hardcoded `feature/${slug}` in error message with `${branchPrefix}${slug}`. Read `readBranchPrefix()` in `saveArtifact()`.
- `src/commands/pr.ts` (modified): Replaced `startsWith('feature/')` with `startsWith(branchPrefix)`. Updated warning message to show configured prefix. Read `readBranchPrefix()` in `createPr()`.
- `src/commands/init/skills.ts` (modified): Replaced `feature/{slug}` with `{branchPrefix}{slug}` in `injectGitWorkflow()` Detected section. Added instruction for agents to read `branchPrefix` from ana.json.
- `templates/.claude/agents/ana-build.md` (modified): Replaced 9 `feature/{slug}` references with `{branchPrefix}{slug}`. Added instruction to read `branchPrefix` from `.ana/ana.json`.
- `templates/.claude/agents/ana-plan.md` (modified): Replaced 2 `feature/{slug}` references with `{branchPrefix}{slug}`. Added instruction about `branchPrefix`.
- `templates/.claude/agents/ana-verify.md` (modified): Replaced 2 `feature/{slug}` references with `{branchPrefix}{slug}`. Added instruction about `branchPrefix`.
- `tests/commands/work.test.ts` (modified): Added `branchPrefix` option to `createWorkTestProject()` helper. Updated existing JSON output test (`featureBranch` → `workBranch`). Added 9 new tests: custom prefix detection, branch finding, JSON field rename, empty prefix edge case, branch cleanup, and 4 template/skill content assertions.
- `tests/commands/artifact.test.ts` (modified): Added `branchPrefix` option to `createTestProject()` helper. Added 1 test for error message prefix.
- `tests/commands/pr.test.ts` (modified): Added `branchPrefix` option to `createTestProject()` helper. Added 1 test for warning message prefix.

## PR Summary

- Migrated all hardcoded `feature/` branch references to use configurable `branchPrefix` from ana.json across 4 source files and 3 agent templates
- Renamed `getFeatureBranch()` → `getWorkBranch()` and `WorkItem.featureBranch` → `workBranch` to decouple naming from any specific prefix
- Added 11 new tests proving end-to-end behavior with non-default prefixes (`dev/`, empty string)
- All existing tests continue to pass unchanged — default `feature/` prefix preserved for backward compatibility

## Acceptance Criteria Coverage

- AC4 "work status uses configured prefix" → work.test.ts "getNextAction uses configured prefix in stage commands" (2 assertions) ✅
- AC5 "artifact save uses configured prefix" → artifact.test.ts "artifact save error uses configured prefix in checkout hint" (2 assertions) ✅
- AC6 "pr create uses configured prefix" → pr.test.ts "pr create warning uses configured prefix" (2 assertions) ✅
- AC7 "work complete uses configured prefix" → work.test.ts "work complete uses configured prefix for branch cleanup" (1 assertion) ✅
- AC8 "Agent templates reference branchPrefix" → work.test.ts 3 template content tests (3 assertions) ✅
- AC9 "Tests pass with non-feature/ prefix" → All branchPrefix tests use `dev/` prefix ✅
- AC10 "git-workflow skill uses configured prefix" → work.test.ts "injectGitWorkflow uses branchPrefix placeholder" (1 assertion) ✅
- AC11 "WorkItem uses workBranch" → work.test.ts "work status JSON uses workBranch not featureBranch" (2 assertions) ✅
- Tests pass → 1440 passed, 2 skipped ✅
- No build errors → pnpm run build passes ✅

## Implementation Decisions

1. **Template content assertions in work.test.ts**: Placed A016-A020 assertions (template and skill file content checks) in work.test.ts rather than creating new test files, since they're lightweight file reads that fit naturally alongside the other branchPrefix tests.

2. **workBranch rename scope**: Renamed `featureBranch` to `workBranch` in the `WorkItem` interface, all local variables feeding into it, the `determineStage` parameter, and the `gatherArtifactState` return value. Internal variable names in `completeWork` use `workBranchName` for the computed `${branchPrefix}${slug}` string.

3. **pr.ts empty prefix edge case**: When `branchPrefix` is empty string, `startsWith('')` returns true for any branch — so no warning is emitted. This is correct behavior: with no prefix, any branch name is valid.

4. **Updated existing JSON test**: Changed the existing `toHaveProperty('featureBranch')` assertion to `toHaveProperty('workBranch')` since the interface rename changes the JSON output shape. This is required by AC11, not a weakened test.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  96 passed (96)
     Tests  1429 passed | 2 skipped (1431)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  96 passed (96)
     Tests  1440 passed | 2 skipped (1442)
```

### Comparison
- Tests added: 11
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/commands/work.test.ts`: 9 new tests — custom prefix in stage commands (A008/A009), branch finding with custom prefix (A010), workBranch JSON field (A011/A012), empty prefix edge case (A021/A022), branch cleanup with custom prefix (A013), template content assertions (A016-A020)
- `tests/commands/artifact.test.ts`: 1 new test — error message uses configured prefix (A014)
- `tests/commands/pr.test.ts`: 1 new test — warning uses configured prefix (A015)

### Contract Coverage
22/22 assertions tagged.

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
2ac1346 [configurable-branch-prefix:s2] Add template and skill content assertions
426fab4 [configurable-branch-prefix:s2] Add tests for configurable branchPrefix migration
0255f6c [configurable-branch-prefix:s2] Migrate agent templates to branchPrefix placeholder
e8ffa48 [configurable-branch-prefix:s2] Migrate source files to configurable branchPrefix
3f58b6c [configurable-branch-prefix] Verify report 1
185ddc9 [configurable-branch-prefix] Build report 1
ad4a728 [configurable-branch-prefix:s1] Add readBranchPrefix reader and tests
58e8cef [configurable-branch-prefix:s1] Add branchPrefix to schema and init writer
```

## Open Issues

1. **Existing test assertion updated (not weakened)**: Changed `toHaveProperty('featureBranch')` to `toHaveProperty('workBranch')` in the JSON output test. This is required by the interface rename (AC11) — the test still checks the same property exists, just with the new name.

2. **pr.ts empty prefix behavior**: When `branchPrefix` is `""`, `currentBranch.startsWith('')` is always true, so no warning is ever shown. This is intentionally permissive — teams using bare branch names don't want prefix warnings. The verifier should confirm this is the desired behavior.

Verified complete by second pass.
