# Scope: Fix worktree branch parsing

**Created by:** Ana
**Date:** 2026-05-12

## Intent

`git branch -a` marks branches checked out in linked worktrees with a `+ ` prefix. `getWorkBranch()` at `work.ts:144` strips the `* ` prefix (current branch) but not the `+ ` prefix (worktree branch). The result: when a worktree is active, `getWorkBranch` returns `"+ feature/slug"` — an invalid git ref — to every caller. Build reports become invisible, pipeline stage detection breaks, `--merge` fails, and `work status` shows wrong stages for every work item with an active worktree.

This was latent since the original commit but activated by the kind-aware-branch-prefixes PR (`9423cbd`), which changed matching from exact equality (which rejected the `+`-prefixed string) to `endsWith` (which accepts it). The same gap exists in `git.ts:109` for scan branch detection.

## Complexity Assessment
- **Kind:** fix
- **Size:** small — 2 regex changes, 1 new test
- **Files affected:**
  - `packages/cli/src/commands/work.ts:144` — change `replace(/^\* /, '')` to `replace(/^[*+] /, '')`
  - `packages/cli/src/engine/detectors/git.ts:109` — change `if (name.startsWith('* ')) name = name.slice(2)` to `name = name.replace(/^[*+] /, '')`
  - `packages/cli/tests/commands/work.test.ts` — new test: create a `git worktree add`, run `getWorkBranch` from the main tree, verify clean branch name returned
- **Blast radius:** Low. The regex `[*+] ` (with trailing space) only matches git's two-character marker prefix. A legitimate `+` in a branch name (e.g., `feature/c++fixes`) appears as `  feature/c++fixes` (space-prefixed, no space after `+`), so `trim()` + the regex won't strip it. Verified: `"feature/c++fixes".trim().replace(/^[*+] /, '')` returns `"feature/c++fixes"` unchanged.
- **Estimated effort:** ~20 minutes
- **Multi-phase:** no

## Approach

Strip both git branch markers (`*` for current branch, `+` for worktree-checked-out branch) using a character class regex. The fix is two lines — one per file. Same pattern, same regex, applied consistently.

## Acceptance Criteria

- AC1: `getWorkBranch` returns a clean branch name (no `+` prefix) when the branch is checked out in a linked worktree
- AC2: `getWorkBranch` continues to return a clean branch name (no `*` prefix) when the branch is the current branch
- AC3: `getWorkBranch` does not strip legitimate `+` characters in branch names (e.g., `feature/c++fixes`)
- AC4: `detectBranches()` in `git.ts` strips both `*` and `+` markers from branch names
- AC5: A test creates a real worktree (via `git worktree add`) with a build report committed on the worktree branch, then runs `getWorkStatus({ json: true })` from the main tree — the `workBranch` field has no `+` prefix and the stage is not stuck at `build-in-progress`
- AC6: No existing tests break. Test count increases.

## Edge Cases & Risks

- **Legitimate `+` in branch names.** Git allows `+` in branch names. The regex `[*+] ` requires a space after the marker — git's marker format is always `"+ "` or `"* "` (marker + space). A branch containing `+` without a trailing space (e.g., `c++fixes`) won't match. Verified by testing.
- **Future git marker changes.** If git adds a third marker character in a future version, this regex would miss it. The `--format=%(refname:short)` alternative eliminates this class entirely but is a refactor. Recorded as an observation for future consideration, not addressed in this fix.
- **The `git.ts` fix is in the scan engine.** `detectBranches()` feeds `scan.json`'s branch list. A `+`-prefixed branch name in scan data is cosmetically wrong but doesn't break any consumer — branch names in scan.json are informational. The fix is correct to include anyway for consistency.

## Rejected Approaches

- **`git branch --format=%(refname:short)`.** Eliminates all prefix parsing. Available since git 2.13 (May 2017). Rejected for this scope because: it changes the contract for branch listing, affects two files with different patterns, and is a refactor rather than a targeted fix. Recorded as a proof chain observation — if another git parsing bug surfaces, this becomes the prescription.
- **Only fixing `work.ts`.** The `git.ts:109` fix is cosmetic (scan data, not pipeline-critical) but leaving it unfixed creates inconsistency — two files parsing the same git output with different rules. Fix both.

## Open Questions

None. The fix is verified and the edge cases are tested.

## Exploration Findings

### Patterns Discovered
- `work.ts:144`: `.trim().replace(/^\* /, '').replace(/^remotes\//, '')` — the trim handles leading spaces, the first replace handles `* `, the second handles `remotes/`. Adding `+` to the first replace is the minimal change.
- `git.ts:109`: `if (name.startsWith('* ')) name = name.slice(2)` — imperative style. Changing to `name = name.replace(/^[*+] /, '')` is both a fix and a simplification (removes the if-statement).
- The `+` prefix was verified live: `git branch -a | od -c` on the `hygiene-debt-cleanup` worktree shows `+ feature/hygiene-debt-cleanup` with `+` and space as the first two bytes.

### Constraints Discovered
- [VERIFIED] `git branch -a` uses exactly two markers: `* ` (current) and `+ ` (worktree). From `git-branch(1)`: "the current branch will be highlighted in green and marked with an asterisk. Any branches checked out in linked worktrees will be highlighted in cyan and marked with a plus sign."
- [VERIFIED] `git branch -r` (remote-only listing) uses no markers — the `detectBranchPatterns()` at `git.ts:149` is unaffected.
- [VERIFIED] `branchExists()` at `worktree.ts:373` uses `rev-parse --verify refs/heads/` — no `git branch` parsing, unaffected.
- [VERIFIED] The `endsWith` matching in `getWorkBranch` (from kind-aware-branch-prefixes) is correct once the input is clean. The bug is in parsing, not matching.

### Test Infrastructure
- `tests/commands/work.test.ts`: The existing test helper `createWorkTestProject` creates branches with `git checkout -b`. No test uses `git worktree add`. The new test must create a real worktree in a temp repo to produce the `+` prefix in `git branch` output.
- Pattern: create temp repo → commit → `git worktree add -b feature/slug .ana/worktrees/slug` → from main tree, verify `getWorkBranch('slug')` returns `'feature/slug'` (no `+`).

## For AnaPlan

### Structural Analog
`packages/cli/src/commands/work.ts:144` — the line being fixed. The existing `.replace(/^\* /, '')` is the pattern; the fix widens it to `.replace(/^[*+] /, '')`.

### Relevant Code Paths
- `packages/cli/src/commands/work.ts:139-149` — `getWorkBranch()`, the primary fix site
- `packages/cli/src/engine/detectors/git.ts:100-118` — `detectBranches()`, the secondary fix site
- `packages/cli/tests/commands/work.test.ts` — test file for the new worktree test

### Patterns to Follow
- The existing `replace(/^\* /, '')` at `work.ts:144` — same pattern, wider character class
- The existing `getWorktreeInfo` test setup at `worktree.test.ts` — creates real git repos with worktrees in temp directories

### Known Gotchas
- **`git worktree add` in tests requires a commit first.** You can't create a worktree from an empty repo — git needs at least one commit. The test must create a temp repo, make an initial commit, then `git worktree add`.
- **The test must run from the main tree's cwd, not from inside the worktree.** The `+` prefix only appears when listing branches from outside the worktree. From inside, the branch is `*` (current).
- **Test through `getWorkStatus`, not `getWorkBranch` directly.** `getWorkBranch` is private. The existing test at `work.test.ts:717` already exercises it through `getWorkStatus({ json: true })` and asserts `json.items[0].workBranch`. Follow that same pattern — call `getWorkStatus` with JSON output, assert the `workBranch` field has no `+` prefix and the stage is correct.
