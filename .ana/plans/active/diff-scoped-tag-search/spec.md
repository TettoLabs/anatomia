# Spec: Diff-Scoped Tag Search

**Created by:** AnaPlan
**Date:** 2026-04-29
**Scope:** .ana/plans/active/diff-scoped-tag-search/scope.md

## Approach

Replace the scoped search implementation in `runContractPreCheck` so it searches only *added comment lines* from `git diff`, instead of reading full file content of changed files.

The current flow:
1. `git diff --name-only merge-base..HEAD` → list of changed file paths
2. `readFileSync` each file → full content
3. Regex match `@ana` tags against full content

The new flow:
1. `git diff merge-base..HEAD -U0` → raw diff output (additions only, no context lines)
2. Parse the diff into a `Map<string, string[]>` — file path to added comment lines
3. Regex match `@ana` tags against only the added comment lines

Extract the diff-parsing logic into a pure exported helper function `parseDiffAddedCommentLines(diffOutput: string): Map<string, string[]>`. This function takes raw `git diff -U0` output and returns the map. It lives in verify.ts alongside the existing code. It is pure — no git calls, no filesystem reads — making it testable with synthetic diff strings.

The comment-line filter is applied during parsing: after stripping the `+` prefix from each added line, only lines whose trimmed content starts with `//` or `#` enter the map. This eliminates false positives from `@ana` tags inside string literals.

The `testFiles` variable (used by the global fallback to compute `outsideScope`) is derived from the map keys — the list of files that have additions in the diff. This preserves the fallback's behavior without a separate `git diff --name-only` call.

The global fallback path (currently lines 189-211) and no-git fallback path (currently lines 148-155) are unchanged. The tag-matching regex is unchanged.

## Output Mockups

No user-visible output changes. The same pre-check result structure is returned. The only behavioral difference is that stale `@ana` tags from prior features no longer produce false COVEREDs, and string-literal `@ana` content no longer matches.

Before (false positive):
```
  A001  ✓ COVERED  "Creates payment intent"    ← matched old tag in file
```

After (correct):
```
  A001  ✗ UNCOVERED  "Creates payment intent"
  ⚠ A001 tag found in tests/old-feature.test.ts (outside feature branch changes)
```

## File Changes

### packages/cli/src/commands/verify.ts (modify)
**What changes:** The scoped search path (currently lines 126-183) is rewritten. A new exported pure function `parseDiffAddedCommentLines` is added. The scoped search calls `git diff -U0` instead of `git diff --name-only`, parses the result with the new helper, and searches added comment lines instead of full file content. The tag-matching loop iterates the map values instead of calling `readFileSync` per file.
**Pattern to follow:** The existing `execSync` usage at the same location — same encoding, cwd, stdio options.
**Why:** The current approach reads full file content, matching stale `@ana` tags from prior features. The diff approach searches only added lines, eliminating tag collision (INFRA-064).

### packages/cli/tests/commands/verify.test.ts (modify)
**What changes:** New unit tests for `parseDiffAddedCommentLines` with synthetic diff strings. Updated integration tests for the collision scenario (old tags don't match) and new-file scenario (entire file is additions). New test for string-literal false-positive elimination.
**Pattern to follow:** The existing test structure — `createContractProject` helper, `runContractPreCheck` direct calls, `describe`/`it` blocks.
**Why:** The search mechanism changes fundamentally — tests must verify the new behavior and the new pure function.

## Acceptance Criteria

- [ ] AC1: Scoped search uses a single `git diff merge-base..HEAD -U0` command to extract added lines, not `git diff --name-only` + file reads.
- [ ] AC2: Only lines starting with `+` in the diff output are searched (added lines only).
- [ ] AC3: Only comment lines are searched — trimmed line starts with `//` or `#`. String literals containing `@ana` tags do not match.
- [ ] AC4: Pre-check correctly reports COVERED when Build adds `// @ana A001` to a file that also contains old `// @ana A001` tags from prior features (the old tags are on both branches, only the new tag is an addition).
- [ ] AC5: Pre-check correctly reports COVERED when Build creates a new test file (entire file is additions).
- [ ] AC6: Pre-check correctly reports UNCOVERED when no added comment line contains the assertion's `@ana` tag.
- [ ] AC7: String literal `content: '// @ana A001\ntest()'` in a test fixture does NOT produce a false COVERED.
- [ ] AC8: Global fallback path behavior is unchanged.
- [ ] AC9: No-git fallback path behavior is unchanged.
- [ ] AC10: Existing pre-check regex (`[\w,\s]*`) is unchanged.
- [ ] AC11: Tests pass: `(cd packages/cli && pnpm vitest run)`
- [ ] AC12: Lint passes: `pnpm lint`

## Testing Strategy

**Unit tests for `parseDiffAddedCommentLines`:**

Test the pure function with synthetic diff strings. No git repos needed. Test matrix:

| Scenario | Input | Expected |
|----------|-------|----------|
| Single file, one added comment | Standard diff with `+// @ana A001` | Map with 1 entry, 1 line |
| New file (all additions) | Diff for a newly created file | Map with 1 entry, all comment lines |
| Mixed code and comment lines | `+const x = 1` and `+// @ana A001` | Only the comment line in the map |
| String literal false positive | `+  content: '// @ana A001\ntest()'` | Line excluded — doesn't start with `//` or `#` after trim |
| Multiple files in one diff | Two `diff --git` sections | Map with 2 entries |
| Renamed file | `rename from`/`rename to` headers | File path from `b/` path in header |
| No added lines | Diff with only deletions | Empty map |
| Python-style comments | `+# @ana A001` | Line included |
| Hunk header lines | `@@ -1,0 +1,3 @@` | Not included (not `+` lines) |
| `+++ b/path` header | The diff file header | Not included (it's a header, not an added line) |

**Integration tests (real git repos):**

- Collision scenario (AC4): main has a test with `// @ana A001`, feature branch adds a NEW `// @ana A001` line to a different file. Only the new one matches.
- New file scenario (AC5): Feature branch creates an entirely new test file. All lines are additions. Tags are found.
- String-literal scenario (AC7): Feature branch adds a test fixture with `@ana` inside a string literal. Not matched.

Existing integration tests for scoped search will need updates — the "scopes search to files changed since merge-base" test currently relies on file-content matching. Under the new behavior, the test setup is the same but the mechanism differs (diff lines vs file reads). The existing test at line 435 ("scopes search to files changed since merge-base") should continue to pass as-is — it creates a file on a branch without the tag, which won't have matching added comment lines either.

**Edge cases:**
- Empty diff output (no changes) → scoped search finds nothing, falls through to no-git fallback or returns UNCOVERED
- Binary files in diff → no `+` lines with `//` or `#`, harmlessly ignored

## Dependencies

None. All dependencies already exist in verify.ts (`execSync`, `readArtifactBranch`).

## Constraints

- The `readFileSync` calls in the global fallback path (lines 189-211) must not be changed. That path reads full file content intentionally.
- The tag-matching regex `@ana\s+[\w,\s]*\b{id}\b` must not be changed.
- The `ContractPreCheckResult` interface must not be changed.
- `parseDiffAddedCommentLines` must be a pure function — no `execSync`, no `fs` calls. Input is a string, output is a `Map`.

## Gotchas

- **The `+++ b/path` header line starts with `+`.** The diff parser must skip lines starting with `+++` (and `---`). These are file path headers, not added content. Filter them before checking for `+` prefix.
- **The `diff --git a/path b/path` header provides the file path.** Parse the `b/` path — it's the destination path, which is correct for additions and renames.
- **`testFiles` is used by the global fallback.** The scoped file list (currently `testFiles`) must still be derived for the fallback's `outsideScope` filter at line 198. Use the map keys (converted to absolute paths) as the replacement for `testFiles`.
- **The existing test at line 435 creates a branch scenario.** The test adds a file WITHOUT the tag and expects UNCOVERED. This test should pass unchanged under the new implementation — no added comment line will contain the tag. But verify it still passes.
- **`readArtifactBranch()` calls `process.exit(1)` on missing ana.json.** The existing `try/catch` around the merge-base block catches the thrown error from the mocked `process.exit`. This behavior is unchanged.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Prefer early returns over nested conditionals.
- Always pass `--run` flag when invoking Vitest.
- Test behavior, not implementation. Assert on specific expected values.
- Prefer real implementations over mocks.

### Pattern Extracts

Current `execSync` usage in verify.ts (lines 130-137) — follow same options:
```typescript
    const artBranch = readArtifactBranch(projectRoot);
    const mergeBase = execSync(
      `git merge-base ${artBranch} HEAD`,
      { encoding: 'utf-8', cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    const diffOutput = execSync(
      `git diff ${mergeBase}..HEAD --name-only`,
      { encoding: 'utf-8', cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
```

Current tag-matching loop (lines 160-176) — the regex stays, the iteration target changes:
```typescript
  for (const assertion of contract.assertions) {
    if (!assertion.id || !assertion.says) continue;

    const pattern = new RegExp(`@ana\\s+[\\w,\\s]*\\b${assertion.id}\\b`);
    let found = false;

    for (const testFile of testFiles) {
      try {
        const content = fs.readFileSync(testFile, 'utf-8');
        if (pattern.test(content)) {
          found = true;
          break;
        }
      } catch {
        // Skip unreadable files
      }
    }
```

Test helper pattern (verify.test.ts lines 120-171) — `createContractProject` with git init, ana.json, contract, and test files:
```typescript
    async function createContractProject(options: {
      slug: string;
      contract: string;
      testFiles?: Array<{ path: string; content: string }>;
      saveContract?: boolean;
    }): Promise<void> {
      // Create git repo
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });
      // ...
    }
```

### Proof Context

One active finding for verify.ts:
- [code] `execSync` import retained — the existing `execSync` calls for merge-base/diff are intentional and stay. The new `git diff -U0` call follows the same pattern. No concern.

No active findings for verify.test.ts.

### Checkpoint Commands

- After adding `parseDiffAddedCommentLines`: `(cd packages/cli && pnpm vitest run tests/commands/verify.test.ts)` — Expected: existing tests pass (some may need updates if they relied on file-read scoped search behavior)
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 1623+ tests pass (97 files + new tests)
- Lint: `pnpm lint`

### Build Baseline
- Current tests: 1623 passed, 2 skipped (97 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected 1623 + new tests (estimate 10-15 new tests for pure function + integration scenarios)
- Regression focus: `tests/commands/verify.test.ts` — all existing scoped search tests
