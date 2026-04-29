# Scope: Diff-Scoped Tag Search

**Created by:** Ana
**Date:** 2026-04-29

## Intent

Tag collision (INFRA-064) is the most recurring finding in the proof system — 7 instances across 7 runs. Every contract generates `A001`, `A002`, etc. After 25+ pipeline runs, test files accumulate `@ana A001` tags from dozens of different contracts. Pre-check matches any of them, producing false COVEREDs that degrade the signal.

The disease: pre-check searches full file content of changed files. Old `@ana` tags from prior features live in those files alongside new tags from the current feature. Pre-check can't distinguish them.

The fix: search only the ADDED lines from `git diff merge-base..HEAD`. Old tags exist on both branches — they don't appear as additions. Only tags Build wrote for THIS feature show up. The tool gets smarter; agents stay simple. Zero template changes, zero agent burden.

Secondary fix: pre-check currently matches `@ana` inside string literals in test fixtures (e.g., `content: '// @ana A001\ntest()'`). Since the diff approach processes individual lines, filtering to actual comment lines (`//` or `#`) is a natural ~2-line addition that eliminates this pre-existing false-positive class.

## Complexity Assessment

- **Size:** small
- **Files affected:**
  - `packages/cli/src/commands/verify.ts` — scoped search path rewritten from file-content to diff-line search
  - `packages/cli/tests/commands/verify.test.ts` — new tests for diff-scoped behavior, string-literal filtering
- **Blast radius:** Low. The change is contained to the scoped search path (lines 127–155 and 160–183). The global fallback (lines 189–211) and no-git fallback (lines 148–155) are unchanged. No template changes. No schema changes. No agent instruction changes.
- **Estimated effort:** ~30 minutes pipeline time
- **Multi-phase:** no

## Approach

Replace the scoped search implementation. Currently: get changed file list from `git diff --name-only`, read each file's full content, regex-match. New: get the full diff with `git diff merge-base..HEAD -U0`, parse added lines per file, match `@ana` tags only in comment lines.

One `git diff` command replaces `git diff --name-only` + N `readFileSync` calls. The `-U0` flag suppresses context lines, keeping output minimal — only headers and changed lines. Added lines (prefixed with `+`) are the search corpus. Comment-line filter (line starts with `//` or `#` after whitespace) eliminates string-literal false positives.

The existing regex (`@ana\s+[\w,\s]*\b{id}\b`) is unchanged. The `testFiles` array and per-file `readFileSync` loop in the scoped path are replaced by the diff-parsed data structure.

The global fallback path (Build tagged a file it didn't modify) stays as-is. It's a diagnostic signal (`outOfScope`), not a primary COVERED/UNCOVERED determination. Collision risk on this path is accepted — it's rare and the output is clearly labeled.

The no-git fallback stays as-is. Already degraded.

## Acceptance Criteria

- AC1: Scoped search uses a single `git diff merge-base..HEAD -U0` command to extract added lines, not `git diff --name-only` + file reads.
- AC2: Only lines starting with `+` in the diff output are searched (added lines only).
- AC3: Only comment lines are searched — trimmed line starts with `//` or `#`. String literals containing `@ana` tags do not match.
- AC4: Pre-check correctly reports COVERED when Build adds `// @ana A001` to a file that also contains old `// @ana A001` tags from prior features (the old tags are on both branches, only the new tag is an addition).
- AC5: Pre-check correctly reports COVERED when Build creates a new test file (entire file is additions).
- AC6: Pre-check correctly reports UNCOVERED when no added comment line contains the assertion's `@ana` tag.
- AC7: String literal `content: '// @ana A001\ntest()'` in a test fixture does NOT produce a false COVERED.
- AC8: Global fallback path (lines 189–211) behavior is unchanged.
- AC9: No-git fallback path behavior is unchanged.
- AC10: Existing pre-check regex (`[\w,\s]*`) is unchanged.
- AC11: Tests pass: `(cd packages/cli && pnpm vitest run)`
- AC12: Lint passes: `pnpm lint`

## Edge Cases & Risks

- **Large diff output.** A feature branch with 50 modified files produces a large diff. `-U0` minimizes this by suppressing context. The actual data extracted is tiny — only `+` lines matching `@ana`. String parsing of a large diff is fast; it's one pass, no random access.
- **Binary files in diff.** `git diff` can include binary file markers. These won't contain `@ana` comment lines, so they're harmlessly ignored during parsing.
- **Renamed files.** `git diff` shows renames with `rename from`/`rename to` headers. The `diff --git a/path b/path` header still works for file attribution. Added lines in renamed files are correctly attributed.
- **Merge commits on the branch.** `merge-base..HEAD` covers all commits from the branch point. Merge commits that bring in other branches' test files could introduce their `@ana` tags as additions. This is an existing risk with the file-scoped approach too — the diff approach doesn't make it worse, and in practice feature branches don't merge other feature branches.
- **`@ana` in non-JS comment styles.** Python uses `#`, Ruby uses `#`, CSS uses `/* */`, HTML uses `<!-- -->`. The filter covers `//` and `#` which handles TypeScript, JavaScript, Python, Ruby, Shell. Multi-line comment styles (`/* */`, `<!-- -->`) are not covered, but `@ana` tags are single-line by convention. This is sufficient.

## Rejected Approaches

- **Namespaced assertion IDs (Phase C, abandoned).** Prefixes (`HGCC-A001`) fix collision by making IDs globally unique. Works everywhere including fallback paths. But adds agent burden: Plan generates prefixes, Build uses them, Verify recognizes them, templates change, collision avoidance logic needed. The diff approach fixes the problem at the tool level with zero agent burden. Agents keep writing `A001`. The tool is smarter instead of making agents work harder.
- **Per-file git diff calls.** One `git diff merge-base..HEAD -- {file}` per changed file. O(n) git invocations vs O(1) for the single-diff approach. Simpler parsing but worse performance on large branches. Not worth the tradeoff.
- **Separate scope for string-literal filtering.** The comment-line filter is ~2 lines of code that falls naturally out of processing individual diff lines. Splitting it into a separate scope adds pipeline overhead for no benefit.

## Open Questions

None.

## Exploration Findings

### Patterns Discovered

- Pre-check regex at verify.ts:163 and verify.ts:200: `new RegExp('@ana\\s+[\\w,\\s]*\\b' + assertion.id + '\\b')`. Both locations use the same pattern. Only the scoped search path (163) changes behavior; the global fallback (200) keeps reading full file content.
- `git diff -U0` output structure: `diff --git a/{path} b/{path}` headers separate files, `+` lines are additions, `-` lines are deletions. Hunk headers (`@@`) appear but are irrelevant for this use case.
- Comment-line classification: 100% of real `@ana` tags in the test suite are on dedicated comment lines (`// @ana ...`). 100% of false positives are on code lines containing `@ana` inside string literals. The filter is clean.

### Constraints Discovered

- [TYPE-VERIFIED] Scoped search path (verify.ts:127-155) — uses `git diff --name-only` for file list + `readFileSync` for content. This entire section is replaced.
- [TYPE-VERIFIED] Tag matching loop (verify.ts:160-183) — iterates `testFiles`, reads each, regex-matches. Replaced by searching parsed diff lines.
- [OBSERVED] Global fallback (verify.ts:189-211) — only runs when scoped search reports UNCOVERED. Searches all test files outside scope. Unchanged.
- [OBSERVED] `readArtifactBranch()` (verify.ts:129) — reads artifact branch from ana.json. Still needed for merge-base calculation.

### Test Infrastructure

- Pre-check tests in `verify.test.ts` use `createContractProject()` helper to set up temp directories with contracts and test files. The helper creates the directory structure; tests call `runContractPreCheck()` directly. New tests need git repos (init + commit + branch) to produce meaningful diffs, or the function needs to accept the diff content as a parameter for testability.

## For AnaPlan

### Structural Analog

The current scoped search implementation (verify.ts:127-183) is the structural analog — it's being rewritten, not extended. The replacement follows the same control flow (try scoped → fall back to global) but changes the data source from file reads to diff parsing.

### Relevant Code Paths

- `packages/cli/src/commands/verify.ts:127-155` — scoped file discovery + no-git fallback (the section being rewritten)
- `packages/cli/src/commands/verify.ts:160-183` — tag matching loop (changes from file-content search to diff-line search)
- `packages/cli/src/commands/verify.ts:189-211` — global fallback (unchanged, but understand it to avoid breaking)
- `packages/cli/src/commands/verify.ts:129` — `readArtifactBranch()` call (still used)

### Patterns to Follow

- `execSync` usage pattern already in verify.ts (lines 130-137) — same encoding, cwd, stdio options for the new `git diff -U0` call
- Test patterns in verify.test.ts — `createContractProject()` helper for setup, direct `runContractPreCheck()` calls for assertions

### Known Gotchas

- The tag matching loop (lines 160-183) currently iterates `testFiles` and reads each file. The replacement needs a different data structure — likely a `Map<string, string[]>` mapping file paths to their added comment lines, or simply a flat array of added comment lines (file attribution only matters for the `outOfScope` diagnostic, not for COVERED/UNCOVERED).
- Tests that validate scoped search behavior currently rely on the file-system approach. The new tests need actual git repos with branches and commits to produce real diffs. The planner should decide whether to use real git repos in tests or to extract the diff-parsing logic into a pure function that can be tested with synthetic diff strings. The pure-function approach is more testable.
- The `testFiles` array is referenced by the global fallback path (line 198: `outsideScope = allTestFiles.filter(f => !testFiles.includes(f))`). The scoped file list is still needed for the fallback even though the search method changes. The planner should preserve this.

### Things to Investigate

- Should the diff-parsing and comment-filtering logic be extracted into a helper function, or inlined in the pre-check flow? The function is already long. A helper like `getAddedTagLines(mergeBase: string, cwd: string): Map<string, string[]>` would be cleaner and independently testable.
