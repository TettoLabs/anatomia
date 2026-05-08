# Scope: CI path filtering for artifact-only commits

**Created by:** Ana
**Date:** 2026-05-07

## Intent

Pipeline artifact saves (scope, plan, spec, contract, build-report, verify-report) and work completions push to main but only touch `.ana/` files. Every push triggers the full GitHub Actions test matrix — 6 test runners + 1 website check — against completely unchanged source code. 36% of the last 50 CI runs (18 of 50) were triggered by artifact-only commits. The pre-commit hook already skips these correctly; GitHub Actions does not.

## Complexity Assessment
- **Kind:** chore
- **Size:** small
- **Files affected:** `.github/workflows/test.yml` (1 file)
- **Blast radius:** CI behavior only. No code changes. No runtime impact.
- **Estimated effort:** < 15 minutes
- **Multi-phase:** no

## Approach

Add `paths-ignore` for `.ana/**` and `.claude/**` to both the `push` and `pull_request` triggers in `test.yml`. This mirrors the pre-commit hook's existing skip logic (`.husky/pre-commit` lines 12-18) at the CI layer. Commits that only modify pipeline artifacts skip CI entirely. Commits that include any source, config, or test file changes still trigger the full matrix.

## Acceptance Criteria
- AC1: Pushing a commit that only modifies files under `.ana/` does not trigger the Test Suite workflow
- AC2: Pushing a commit that only modifies files under `.claude/` does not trigger the Test Suite workflow
- AC3: Pushing a commit that modifies any file outside `.ana/` and `.claude/` triggers the full Test Suite workflow as before
- AC4: Pull requests with code changes continue to trigger the full Test Suite workflow
- AC5: The `release.yml` workflow is unchanged (already scoped to `v*` tags)
- AC6: No other workflow files are created or modified

## Edge Cases & Risks

**Required checks on skipped jobs:** If a PR contained *only* `.ana/` file changes, CI would skip and GitHub would block the merge (required check never ran). In practice this never happens — PRs from feature branches always contain code changes from Build. Planning artifacts are committed directly to main, not via PR. Work completions are direct commits to main. Proof commands are direct commits to main. No PR pathway produces an `.ana/`-only diff.

**Mixed commits:** A commit touching both `.ana/scope.md` and `src/foo.ts` correctly triggers CI — `paths-ignore` only skips when *all* changed files match the ignore patterns.

**Future `.ana/` files:** Any new file type added under `.ana/` automatically inherits the skip behavior. This is correct — `.ana/` is pipeline metadata by definition.

## Rejected Approaches

**`[skip ci]` in commit messages:** Would require code changes to `artifact.ts` (lines 1172-1173), `work.ts` (completion commits), and `proof.ts` (`commitAndPushProofChanges`). Fragile — any manual commit or new commit site forgets it. `paths-ignore` is declarative and automatic.

**`dorny/paths-filter` action:** Solves the required-checks-on-skipped-jobs problem by keeping jobs always-running with conditional steps. Unnecessary here — the required-checks problem doesn't apply to `.ana/`-only commits (they're pushes to main, not PRs). Adds an external dependency for no benefit.

**Bundling D1 (CLI-vs-website path filtering):** Different disease. Website-only PRs triggering CLI tests costs ~35s on rare PRs. `.ana/`-only pushes triggering full CI costs 7 jobs on 36% of all pushes. D1 also has the required-checks gotcha that this scope doesn't. Separate scope if pursued.

**Removing pushes from artifact/proof commands:** ANA-CLI-091 proposes removing `git push` from proof commands (~10 roundtrips per Learn session). Complementary but different — that removes the pushes entirely; this scope makes the remaining pushes harmless to CI. Both are independently valuable.

## Open Questions

None.

## Exploration Findings

### Patterns Discovered
- `.husky/pre-commit` lines 12-18: existing path-based skip logic for `.ana/`, `.claude/`, `website/` files
- `test.yml`: no path filtering on either trigger — fires on every push to main/staging and every PR

### Constraints Discovered
- [TYPE-VERIFIED] GitHub `paths-ignore` semantics — skips only when ALL changed files match ignore patterns. Mixed commits (artifact + code) correctly trigger CI.
- [OBSERVED] 18 of last 50 CI runs (36%) were artifact-only commits to main — all triggered full 7-job matrix
- [OBSERVED] All artifact save commits follow the pattern `[slug] Save:` or `[slug] Scope` — only `.ana/` files in the diff (verified via `git show --stat`)

### Test Infrastructure
- No test changes needed. CI config changes are verified by observing subsequent workflow behavior.

## For AnaPlan

### Structural Analog
`.husky/pre-commit` — same pattern (path-based skip), same file sets (`.ana/`, `.claude/`), already working correctly at the local layer. The CI change mirrors this logic at the remote layer.

### Relevant Code Paths
- `.github/workflows/test.yml` lines 3-6: the `on:` trigger block that needs `paths-ignore`
- `.husky/pre-commit` lines 12-18: the structural analog with the existing skip pattern

### Patterns to Follow
- The pre-commit hook's skip list (`.ana/`, `.claude/`, `website/`). For CI, only `.ana/` and `.claude/` are skipped — website changes should still trigger the website CI job.

### Known Gotchas
- Do NOT add `website/` to `paths-ignore` in `test.yml`. The pre-commit hook skips website files because there are no local website checks worth running. But `test.yml` has a dedicated `website:` job that SHOULD run on website changes.

### Things to Investigate
- None. The implementation is a 4-line config addition.
