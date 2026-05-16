# Verify Report: Fix scan branch detection

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-15
**Spec:** .ana/plans/active/fix-scan-branch-detection/spec.md
**Branch:** feature/fix-scan-branch-detection

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/fix-scan-branch-detection/contract.yaml
  Seal: INTACT (hash sha256:fc88f6bdb9ee0f290801fd4b3de475d80f3dd1c78f9b237419c0156541b10dbc)
```

Tests: 2339 passed, 0 failed, 2 skipped. Build: clean (typecheck + tsup). Lint: 1 pre-existing warning in `git-operations.ts` (unused eslint-disable directive, not in changed files).

## Contract Compliance
| ID   | Says                                           | Status       | Evidence |
|------|------------------------------------------------|--------------|----------|
| A001 | Branch list on a repo with a remote contains only remote-tracking branches | ✅ SATISFIED | `git-detection.test.ts:172` — `not.toContain('local-only-branch')` in test "excludes bot branches from branch list" |
| A002 | Branch list includes branches that exist on the remote | ✅ SATISFIED | `git-detection.test.ts:169` — `toContain('main')` |
| A003 | Local-only repos still get their branches detected | ✅ SATISFIED | `git-detection.test.ts:95` — `toContain('main')` in "returns branch list for local repo with commits" |
| A004 | Local-only repos include all local branches in the list | ✅ SATISFIED | `git-detection.test.ts:96` — `toContain('feature')` |
| A005 | Dependency bot branches are excluded from branching convention analysis | ✅ SATISFIED | `git-detection.test.ts:219` — `not.toHaveProperty('dependabot/')` in "excludes bot prefixes from branchPatterns" |
| A006 | Dependency bot branches are excluded from branching convention analysis | ✅ SATISFIED | `git-detection.test.ts:220` — `not.toHaveProperty('renovate/')` |
| A007 | Human branch prefixes are still detected after bot filtering | ✅ SATISFIED | `git-detection.test.ts:223` — `toHaveProperty('feature/')` |
| A008 | The primary branching convention is never a bot prefix | ✅ SATISFIED | `git-detection.test.ts:227-228` — `toBe('feature/')` and `not.toBe('dependabot/')` |
| A009 | Branches that only exist locally are not included when a remote is configured | ✅ SATISFIED | `git-detection.test.ts:127` — `not.toContain('local-experiment')` in "excludes local-only branches when remote exists" |
| A010 | Remote branches are still included when local-only branches are filtered | ✅ SATISFIED | `git-detection.test.ts:126` — `toContain('main')` |
| A011 | Bot branches are excluded from the branch list, not just from pattern analysis | ✅ SATISFIED | `git-detection.test.ts:171` — `not.toContain('dependabot/npm/typescript-5.8')` |

## Independent Findings

**Predictions before reading code:**
1. "Builder probably hardcoded `origin/` prefix stripping" — **Confirmed.** Line 146 uses `replace(/^origin\//, '')`. For repos with only an `origin` remote (the vast majority), this is correct. For multi-remote repos, branches from non-origin remotes would appear as `upstream/main` instead of `main`. However, the pre-existing `detectBranchPatterns()` at line 189 already had the same pattern, so this is pre-existing behavior, not a regression.
2. "Edge case: remote exists but no branches pushed returns wrong value" — **Not found.** Line 142 correctly returns `[]` (empty array, not null) when remote exists but `git branch -r` is empty. Semantics are clean: `null` = no git, `[]` = remote exists but nothing published.
3. "Test assertions might be weak (toBeDefined instead of specific values)" — **Not found.** All test assertions use specific matchers: `toContain`, `not.toContain`, `toHaveProperty`, `toBe`. The branchPatterns test even checks `prefixes['feature/']` equals exactly `2`. Strong assertions throughout.
4. "Builder might over-build with unnecessary abstractions" — **Not found.** The `isBotBranch` helper is justified — used by both `detectBranches` and `detectBranchPatterns`. `BOT_BRANCH_PREFIXES` is module-scoped, not exported. No dead code.
5. "Spec guidance on bare remote testing might lead to complex test setup" — **Confirmed but acceptable.** Tests use bare repos with push/pull, which is the right approach. Setup is verbose but follows the existing test pattern exactly.

**Production risk predictions:**
1. "Multi-remote repos break prefix stripping" — Present (see finding below) but pre-existing pattern.
2. "`git remote` returning error vs empty" — `gitExec` wraps in try/catch, returns null on error. `git remote` with no remote returns empty string (falsy). Both paths handled correctly.

**Over-building check:** No new exports. No unused functions. `BOT_BRANCH_PREFIXES` and `isBotBranch` are module-private. `detectGitInfo` and `GitInfo` are the only exports, unchanged. No scope creep.

## AC Walkthrough
- **AC1:** `detectBranches()` uses `git branch -r` when remote exists → ✅ PASS — `git.ts:141`, confirmed by test creating bare remote and asserting only remote-tracking branches returned.
- **AC2:** `detectBranches()` falls back to `git branch` when no remote → ✅ PASS — `git.ts:124-137`, existing test at line 83-100 passes (creates repo with no remote, asserts local branches returned).
- **AC3:** `detectBranchPatterns()` excludes bot prefixes → ✅ PASS — `git.ts:191` adds `isBotBranch(name)` check. Test creates 3 dependabot + 1 renovate branches, verifies neither appears in prefixes.
- **AC4:** Existing test for no-remote branch detection continues to pass → ✅ PASS — "returns branch list for local repo with commits" (line 83-100) still passes. Now exercises the no-remote fallback path.
- **AC5:** New test verifies local-only branches excluded when remote exists → ✅ PASS — "excludes local-only branches when remote exists" (line 103-132). Creates bare remote, pushes main, creates local-only branch, asserts it's excluded.
- **AC6:** New test verifies bot prefixes excluded from branchPatterns → ✅ PASS — "excludes bot prefixes from branchPatterns" (line 182-233). Creates 4 bot branches + 2 human branches, asserts bot prefixes absent and human prefixes present with exact count.
- **Tests pass:** ✅ PASS — 2339 passed, 2 skipped (2341 total). Up from 2336 baseline (3 new tests added).
- **No build errors:** ✅ PASS — typecheck + tsup clean.

## Blockers
No blockers. All 11 contract assertions satisfied. All 8 acceptance criteria pass. Test count increased from 2336 to 2339 (3 new tests in 1 file). No regressions. Checked: no unused exports in new code (grep confirmed `isBotBranch` and `BOT_BRANCH_PREFIXES` are used and not exported), no unused parameters in any new/modified function, no error paths that swallow silently beyond existing `gitExec` pattern, no external state assumptions beyond git commands.

## Findings

- **Code — Multi-remote prefix stripping assumes `origin`:** `packages/cli/src/engine/detectors/git.ts:146` — `replace(/^origin\//, '')` only strips the `origin/` prefix. Branches from non-origin remotes (e.g., `upstream/main`) would appear with their remote prefix intact. Pre-existing pattern (same logic in `detectBranchPatterns` at line 189), not a regression. Most repos use only `origin`. Low risk, worth noting for the engineer who adds multi-remote support someday.

- **Test — Bot prefix coverage is partial:** `packages/cli/tests/engine/detectors/git-detection.test.ts:199` — Tests exercise `dependabot/` and `renovate/` filtering but not `snyk-`, `greenkeeper/`, or `imgbot/`. The filtering logic is a trivial `startsWith` loop, so testing 2 of 5 prefixes is sufficient to prove the pattern. The missing coverage is debt, not risk — the untested prefixes would only fail if someone changed the Set contents and broke a specific entry.

- **Code — Duplicate `git branch -r` subprocess calls:** `packages/cli/src/engine/detectors/git.ts:141` and `:184` — `detectBranches` and `detectBranchPatterns` each independently run `git branch -r` and parse the output. Same subprocess, same parsing, called separately from `detectGitInfo`. Merging them would halve the subprocess count for this detection. Pre-existing pattern for `detectBranchPatterns`; the new `detectBranches` adds a second call. Not a performance concern for a CLI scan, but structural duplication worth knowing about.

## Deployer Handoff
Clean change. Two functions modified in `git.ts`, one constant and one helper added (both module-private). Three new tests in `git-detection.test.ts`. No interface changes — `branches` stays `string[] | null`, `branchPatterns` type unchanged. No new dependencies. No consumer changes needed.

After merge, the next `ana scan` on any repo with a remote will produce a cleaner `scan.json` — fewer branches (no local-only, no bot), and `branchPatterns.primary` will reflect human branching conventions. The `scan.json` in this repo's main branch will update on next scan.

## Verdict
**Shippable:** YES
All 11 contract assertions satisfied. All 8 acceptance criteria verified with evidence. 2339 tests pass. Build and lint clean. The implementation follows the spec precisely — remote-aware branch detection with bot filtering, local fallback for no-remote repos. Three findings documented (multi-remote prefix, partial bot prefix test coverage, duplicate subprocess calls) — none are blockers. I'd ship this.
