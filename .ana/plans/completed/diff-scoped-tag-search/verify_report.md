# Verify Report: Diff-Scoped Tag Search

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-29
**Spec:** .ana/plans/active/diff-scoped-tag-search/spec.md
**Branch:** feature/diff-scoped-tag-search

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/diff-scoped-tag-search/contract.yaml
  Seal: INTACT (hash sha256:37cabad3bf6dc7d7830bec8f746745ec31e9c6ee111d51900e5ec26a361661b4)

  A001  ✓ COVERED  "Scoped search uses git diff output instead of reading file contents"
  A002  ✓ COVERED  "Only added lines from the diff are searched for tags"
  A003  ✓ COVERED  "Deleted lines in the diff are not searched"
  A004  ✓ COVERED  "Only comment lines are searched for tags"
  A005  ✓ COVERED  "String literals containing @ana tags do not produce false matches"
  A006  ✓ COVERED  "Old tags from prior features do not produce false covered results"
  A007  ✓ COVERED  "New tags added on the feature branch are correctly detected"
  A008  ✓ COVERED  "Tags in newly created test files are detected"
  A009  ✓ COVERED  "Assertions without matching tags report uncovered"
  A010  ✓ COVERED  "Test fixture strings with @ana inside them do not count as coverage"
  A011  ✓ COVERED  "Out-of-scope tags are still detected via the global fallback"
  A012  ✓ COVERED  "Pre-check still works when git merge-base is unavailable"
  A013  ✓ COVERED  "The diff parser correctly extracts file paths from diff headers"
  A014  ✓ COVERED  "The diff parser handles multiple files in a single diff"
  A015  ✓ COVERED  "The diff parser skips diff header lines that start with plus signs"
  A016  ✓ COVERED  "The diff parser handles diffs with only deletions"
  A017  ✓ COVERED  "The diff parser includes Python-style hash comments"

  17 total · 17 covered · 0 uncovered
```

Tests: 1642 passed, 0 failed, 2 skipped (97 files). Build: success (typecheck clean). Lint: 0 errors, 14 warnings (all pre-existing `@typescript-eslint/no-explicit-any` in unrelated files).

## Contract Compliance
| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Scoped search uses git diff output instead of reading file contents | ✅ SATISFIED | `verify.ts:189` uses `git diff ${mergeBase}..HEAD -U0`; unit test at `verify.test.ts:912` parses diff output and extracts paths/lines |
| A002 | Only added lines from the diff are searched for tags | ✅ SATISFIED | `verify.test.ts:933` — diff with `-// old comment` and `+// @ana A001`: only added lines appear in result |
| A003 | Deleted lines in the diff are not searched | ✅ SATISFIED | `verify.test.ts:952` — diff with 3 deleted `@ana` lines and 1 added: `expect(lines).toEqual(['// replacement comment'])` |
| A004 | Only comment lines are searched for tags | ✅ SATISFIED | `verify.test.ts:969` — includes `//`, `#`, indented `//`; excludes `const x = 1;` and `export function foo() {}` |
| A005 | String literals containing @ana tags do not produce false matches | ✅ SATISFIED | `verify.test.ts:991` — string literal lines (`const fixture = '// @ana A001...'`, template literal, content property) produce `lines.toHaveLength(0)` |
| A006 | Old tags from prior features do not produce false covered results | ✅ SATISFIED | `verify.test.ts:547` — old `@ana A001` on main, feature branch adds untagged file, asserts `status === 'UNCOVERED'` |
| A007 | New tags added on the feature branch are correctly detected | ✅ SATISFIED | `verify.test.ts:601` — old tag on main, NEW tag added on feature branch, asserts `status === 'COVERED'` |
| A008 | Tags in newly created test files are detected | ✅ SATISFIED | `verify.test.ts:654` — brand new test file on feature branch, asserts `status === 'COVERED'` |
| A009 | Assertions without matching tags report uncovered | ✅ SATISFIED | `verify.test.ts:802` — feature branch adds code without `@ana` tags, asserts `status === 'UNCOVERED'` |
| A010 | Test fixture strings with @ana inside them do not count as coverage | ✅ SATISFIED | `verify.test.ts:703` — fixture file `const fixture = '// @ana A001\\ntest()'`, asserts `status === 'UNCOVERED'` |
| A011 | Out-of-scope tags are still detected via the global fallback | ✅ SATISFIED | `verify.test.ts:851` — old tag on main, feature branch changes code only, asserts `outOfScope.length > 0` and `outOfScope[0].file` contains `old-feature.test.ts` |
| A012 | Pre-check still works when git merge-base is unavailable | ✅ SATISFIED | `verify.test.ts:1117` — no ana.json so readArtifactBranch fails, global fallback reads full file, asserts `status === 'COVERED'` |
| A013 | The diff parser correctly extracts file paths from diff headers | ✅ SATISFIED | `verify.test.ts:912` — parses diff, asserts `result.size > 0` and `result.get('tests/feature.test.ts')` is defined |
| A014 | The diff parser handles multiple files in a single diff | ✅ SATISFIED | `verify.test.ts:1007` — two-file diff, asserts `result.size === 2` with correct content per file |
| A015 | The diff parser skips diff header lines that start with plus signs | ✅ SATISFIED | `verify.test.ts:1027` — `+++ b/tests/feature.test.ts` not included, asserts `lines.toEqual(['// actual comment'])` |
| A016 | The diff parser handles diffs with only deletions | ✅ SATISFIED | `verify.test.ts:1042` — deletion-only diff, asserts `lines.toHaveLength(0)`. Note: contract says `parsedMap.size equals 0` but implementation returns size 1 (entry with empty array) — the test verifies behavioral intent (no comment lines extracted) rather than the contract's literal mechanical spec. See Findings. |
| A017 | The diff parser includes Python-style hash comments | ✅ SATISFIED | `verify.test.ts:1061` — `# @ana A001` and `    # @ana A002` both included, `def test_feature():` excluded |

## Independent Findings

**Predictions resolved:**

1. **File paths with spaces** — Not found. The regex `/ b\/(.+)$/` handles spaces via greedy `(.+)`.
2. **A016 map size mismatch** — Confirmed. The `diff --git` header creates a map entry even for deletion-only files, so `parsedMap.size` is 1, not 0 as the contract specifies. The test verifies empty lines (correct behavior) rather than the contract's literal `size equals 0`. This is a contract imprecision, not a code bug.
3. **scopedSearch fallback for code-only diffs** — Not a problem. Map entries exist from diff headers, `scopedSearch` is true, search finds nothing in empty arrays. Correct behavior.
4. **testFiles including non-test files** — Not a problem. The `outsideScope` filter at line 264 intersects with `allTestFiles` (only test file patterns), so non-test files in `testFiles` are harmless.
5. **Block comments** — Spec-by-design gap. `/* @ana A001 */` won't match the `//` or `#` filter. This is the spec's intent (spec line 23: "only lines whose trimmed content starts with `//` or `#`") not a bug. All existing `@ana` tags in this codebase use `//` style.

**Surprise finding:** Four pre-existing `@ana` tags on main (from the original pre-check contract) reuse IDs that overlap with this contract's IDs. The old `@ana A005` at line 757 tags a merge-base fallback test, `@ana A006` at line 350 tags a UNVERIFIABLE test, `@ana A010` at line 376 tags a formatted output test, `@ana A011` at line 406 tags a UNVERIFIABLE message test. These are noise from a previous feature's contract. This is exactly the collision scenario this feature fixes — the scoped search correctly ignores them.

**Production risk:** No size guard on `git diff` output. A branch with thousands of changed files will load the entire diff into memory. Not a concern for typical feature branches but worth noting for long-lived branches.

## AC Walkthrough
- [x] AC1: Scoped search uses `git diff merge-base..HEAD -U0` — ✅ PASS. Verified at `verify.ts:189-192`, replaces `--name-only` with `-U0`.
- [x] AC2: Only `+` lines searched — ✅ PASS. `verify.ts:82` skips non-`+` lines. Unit test at line 933 confirms.
- [x] AC3: Only comment lines searched, string literals excluded — ✅ PASS. `verify.ts:91` filters to `//` and `#`. Unit tests at lines 969 and 991 confirm.
- [x] AC4: Collision resistance — ✅ PASS. Integration test at line 547: old tag on main → UNCOVERED. Test at line 601: new tag on feature → COVERED.
- [x] AC5: New file scenario — ✅ PASS. Integration test at line 654: brand new file → COVERED.
- [x] AC6: UNCOVERED reporting — ✅ PASS. Integration test at line 802: no tags in added lines → UNCOVERED.
- [x] AC7: String literal false positive — ✅ PASS. Integration test at line 703: string literal fixture → UNCOVERED.
- [x] AC8: Global fallback unchanged — ✅ PASS. Integration test at line 851: out-of-scope tags detected via global fallback. Global fallback code (`verify.ts:229-242`) uses same `readFileSync` pattern as before.
- [x] AC9: No-git fallback unchanged — ✅ PASS. Integration test at line 1117: no ana.json → global fallback finds tag. Fallback glob patterns at `verify.ts:201-206` unchanged.
- [x] AC10: Existing regex unchanged — ✅ PASS. `verify.ts:215`: `@ana\\s+[\\w,\\s]*\\b${assertion.id}\\b` — confirmed identical to main via diff.
- [x] AC11: Tests pass — ✅ PASS. 1642 passed, 0 failed, 2 skipped (97 files).
- [x] AC12: Lint passes — ✅ PASS. 0 errors, 14 warnings (all pre-existing).

## Blockers
No blockers. All 17 contract assertions satisfied. All 12 ACs pass. No regressions (1642 tests, same as baseline + 19 new tests). Checked: no unused exports in new code (`parseDiffAddedCommentLines` imported in test file and called internally), no unhandled error paths (diff parse failures fall through to empty results gracefully), no assumptions about external state beyond git availability (which has the existing fallback), no spec gaps requiring unspecified decisions.

## Findings

- **Upstream — Contract A016 value imprecise:** Contract specifies `parsedMap.size equals 0` for deletion-only diffs, but `parseDiffAddedCommentLines` creates a map entry from the `diff --git` header before processing lines, yielding size 1 with an empty array. The test correctly verifies behavioral intent (no comment lines) rather than the contract literal. The behavior is correct; the contract's mechanical spec is slightly off. Update contract on next seal.

- **Test — Pre-existing @ana tag collision on 4 assertions:** `packages/cli/tests/commands/verify.test.ts:350,376,406,757` — Four tests from the original pre-check contract still carry `@ana A005`, `A006`, `A010`, `A011` tags that now collide with this contract's assertion IDs. These are correctly ignored by the new scoped search (they're on main, not in the diff). No functional impact, but they create false coverage signals if the scoped search ever falls back to global. This is exactly the problem this feature solves — the old tags are proof the feature works.

- **Code — Comment filter excludes block comments:** `packages/cli/src/commands/verify.ts:91` — Only `//` and `#` comment styles match. A `/* @ana A001 */` or `/** @ana A001 */` block comment in an added line would be silently ignored. This is by spec design, and all existing `@ana` tags in this codebase use `//` style, but it's a latent assumption. If a future builder uses block comment style, coverage would silently fail.

- **Code — No size guard on diff output:** `packages/cli/src/commands/verify.ts:189` — `execSync` loads the entire `git diff -U0` output into memory. For typical feature branches this is fine (kilobytes). A branch with thousands of changed files could produce megabytes of diff. The `execSync` default `maxBuffer` is 1MB in Node; exceeding it throws, which falls to the catch and triggers global fallback — so it fails safely, not silently. Acceptable.

- **Test — Integration test setup duplication:** `packages/cli/tests/commands/verify.test.ts:547-907` — Eight new integration tests each create a git repo, contract, hash, and .saves.json from scratch. The existing `createContractProject` helper (line 120) handles most of this but doesn't support the two-branch scenario. A helper for "create main + feature branch" would reduce ~40 lines per test. Not blocking — the tests are correct and readable.

## Deployer Handoff
Straightforward merge. Two files changed: `verify.ts` (new pure function + rewritten scoped search) and `verify.test.ts` (19 new tests). No config changes, no new dependencies, no migration needed. The behavioral change: scoped pre-check now searches only added comment lines from git diff instead of full file content. This eliminates false COVEREDs from stale @ana tags. The global and no-git fallbacks are unchanged. After merge, the old @ana tags from prior contracts on main will be correctly ignored by scoped search in future builds.

## Verdict
**Shippable:** YES

17/17 contract assertions satisfied. 12/12 ACs pass. 1642 tests pass, 0 regressions. Build and lint clean. The implementation is focused — one new pure function, one rewritten search path, fallbacks preserved. The A016 contract imprecision is cosmetic (behavior is correct). The code does what the spec says and nothing more.
