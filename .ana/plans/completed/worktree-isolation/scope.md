# Scope: Worktree Isolation

**Created by:** Ana
**Date:** 2026-05-06

## Intent

The pipeline shares a single working directory and git index across all agents. The branch dance — switching, stashing, validating, recovering — is template-enforced, not mechanically enforced. 30+ lines of branch management instructions tell agents what to do. Nothing prevents them from doing it wrong. This produced a real data corruption incident (ANA-CLI-034: two Plan agents shared a git index, one committed the other's staged files) and creates daily friction (stashing, blocking, wrong-branch errors).

The fix: Build and Verify operate in git worktrees. The main tree stays on the artifact branch. The worktree is on the feature branch. Isolation is topological, not instructional. The proof chain is physically unreachable from the worktree. The sealed contract is committed before the worktree exists. Template instructions shrink by 37 lines.

This scope absorbs the completed `phase-aware-work-start` scope — same function, same file, one scope.

## Complexity Assessment
- **Size:** large
- **Files affected:** `src/commands/work.ts`, NEW `src/utils/worktree.ts`, `src/commands/artifact.ts`, `src/utils/proofSummary.ts`, `src/commands/proof.ts`, `src/commands/init/index.ts`, `src/commands/init/assets.ts`, `templates/.claude/agents/ana-build.md`, `templates/.claude/agents/ana-verify.md`, `.claude/agents/ana-build.md`, `.claude/agents/ana-verify.md`
- **Blast radius:** `startWork` gains phase detection + worktree creation. `completeWork` gains worktree removal + metadata. `getNextAction` simplifies (removes `git checkout` prefixes). `saveAllArtifacts` gains category filter for worktree context. Template branch management instructions are replaced with worktree awareness. `computeTiming` changes ship later (schema designed now, data accumulates).
- **Estimated effort:** 3-4 days
- **Multi-phase:** no

## Approach

Two worlds: the main tree holds institutional artifacts (scope, spec, contract, proof chain). The worktree holds transient work (code, build reports, verify reports). The PR merge is the one-way valve — transient becomes institutional only after independent verification and human review.

`ana work start {slug}` becomes the universal entry point. Every agent calls it. The CLI detects the phase from what artifacts exist and does the right thing: Think creates a directory, Plan records a timestamp, Build creates a worktree, Verify prints the existing worktree path. Phase detection replaces template-level branch logic. Worktree existence replaces state machines.

The worktree persists through Build → Verify → fix → re-verify cycles. Context accumulates. Agents resume, not restart. Removed only at `work complete`.

A new `worktree.ts` module encapsulates all worktree operations: create (atomic with rollback), remove, detect, path resolution, .env handling, context file generation. The main tree commands (`init`, `proof` mutations, `setup complete`, `work start {other-slug}`) refuse to run from inside a worktree with clear error messages.

No configuration flag. No fallback to branch checkout. Worktrees or error. The elegant solution is the one that removes — maintaining both paths is the disease alongside the cure.

## Acceptance Criteria

- AC1: `ana work start {slug}` on a new slug creates the directory and records `work_started_at` (existing Think behavior, unchanged)
- AC2: `ana work start {slug}` on an existing slug with scope (no plan) records `plan_started_at`, validates artifact branch
- AC3: `ana work start {slug}` on an existing slug with spec+contract (no build report) creates a worktree at `.ana/worktrees/{slug}/`, installs deps, symlinks .env files, writes worktree-context.md, records `build_started_at` on artifact branch before creation, and prints a rich summary
- AC4: `ana work start {slug}` on an existing slug with build report (no verify report) prints the existing worktree path and records `verify_started_at` in the worktree
- AC5: `ana work start {slug}` on an existing slug with verify report (FAIL) prints the existing worktree path and records `build_started_at` (Build fix phase)
- AC6: `ana work start {slug}` on an existing slug from inside the worktree for that same slug prints the path and records the appropriate timestamp (resume case)
- AC7: `ana work start {other-slug}` from inside a worktree exits with "You're in worktree {current-slug}. Switch to the main project directory first."
- AC8: Worktree creation is atomic — if any step fails (git worktree add, dep install, .env link, context file, submodule init), rollback removes the worktree directory AND the branch created by `-b` (only if newly created)
- AC9: In-flight migration: when `feature/{slug}` branch exists but no worktree, `work start` creates a worktree from the existing branch (no `-b`)
- AC10: `ana work complete {slug}` removes the worktree (from main tree, never from inside), archives the plan, writes the proof chain entry with worktree metadata (`used`, `created_at`, `completed_at`, `commit_count`), commits, pushes, deletes the branch
- AC11: `work complete` handles the case where the worktree was already removed manually — skips removal silently
- AC12: `work complete` verifies `.saves.json` completeness after directory move — checks expected keys, logs warning if missing, proceeds with available data
- AC13: `getNextAction` returns agent commands without `git checkout` prefixes for all worktree-aware stages
- AC14: `ana work status` shows worktree path, commit count, and last activity when a worktree exists; flags worktrees with 0 commits and 14+ days as stale
- AC15: `isWorktreeDirectory()` utility correctly detects worktree context by checking `.git` is a file, not a directory
- AC16: `ana init` from a worktree exits with "Run init from the main project directory, not from a worktree."
- AC17: `ana scan --save` from a worktree warns that saving to the worktree's scan.json is probably not intended
- AC18: `ana proof close/lesson/promote/strengthen` from a worktree exits with "You're in a worktree. Proof commands modify the proof chain on the artifact branch. Run from the main project directory."
- AC19: `ana setup complete` from a worktree exits with "Run setup from the main project directory, not from a worktree."
- AC20: `ana work complete` from a worktree exits with "Run work complete from the main project directory, not from a worktree." (existing branch check catches it, but error message must be worktree-aware)
- AC21: `saveAllArtifacts` from a non-artifact branch (worktree) filters to build-verify category artifacts only, skipping the planning-artifacts-require-artifact-branch check for artifacts that are build-verify category
- AC22: `.ana/.gitignore` includes `worktrees/` in the hardcoded template at init/assets.ts; worktree creation also ensures the entry exists for projects that haven't re-run init
- AC23: Worktree-context.md written inside the worktree at creation contains: contract assertions, proof findings for target files, one-paragraph summary of what Build is expected to do
- AC24: .env files (`.env*` patterns) detected in main tree are symlinked into the worktree; on symlink failure (Windows without developer mode), falls back to copy
- AC25: Submodule handling: if `.gitmodules` exists, `git submodule update --init --recursive` runs in the worktree after creation
- AC26: Build template removes ~28 lines of branch management, adds ~15 lines of worktree awareness per TEMPLATE_CHANGES.md
- AC27: Verify template removes ~9 lines, adds ~5 lines per TEMPLATE_CHANGES.md
- AC28: Dogfood copies (`.claude/agents/`) are byte-identical to templates after changes
- AC29: All existing tests pass; ~50-55 new tests cover worktree lifecycle, phase detection, guards, rollback, resume, migration, and template verification
- AC30: Test cleanup calls `git worktree remove` BEFORE `fs.rm(tempDir)` to prevent dangling worktree metadata

## Edge Cases & Risks

**pnpm workspace resolution in nested worktree.** The worktree is physically at `.ana/worktrees/{slug}/` — inside the outer project's directory tree. If pnpm walks up looking for a workspace root, it may find the outer project's `pnpm-workspace.yaml` and install into the wrong location. Needs actual testing during Build. If it's a problem: `pnpm install --ignore-workspace` or explicit `PNPM_WORKSPACE_ROOT` env var. Document as known edge case for the spec.

**Pre-commit hook silent bypass.** If `pnpm install` failed silently (it shouldn't — Decision 20 makes it a hard error with rollback), `.husky/_/` won't exist in the worktree and git silently skips hooks. Commits proceed with zero quality checks. The fix is already in Decision 20: install failure triggers rollback. Document that partial install (process killed mid-install) could leave this state. Recovery: re-run `pnpm install` manually.

**`saveAllArtifacts` planning artifact false positive.** The worktree inherits scope.md, spec.md, contract.yaml from the branch point. `saveAllArtifacts` scans the plan directory, finds planning artifacts alongside build artifacts, and the `hasPlanningArtifacts` check at artifact.ts:1295 triggers, rejecting the save. Fix: when on a non-artifact branch, filter the artifacts list to build-verify category before the branch check.

**Squash merge and `.saves.json`.** If the PR is squash-merged, git doesn't preserve individual commits. The `.saves.json` from the feature branch arrives as part of the squash. If the artifact branch modified `.saves.json` after the branch point (another scope started), the squash merge may conflict on the JSON closing brace. Decision 16's programmatic verification at `work complete` is the safety net.

**`git checkout {artifactBranch}` from inside worktree.** Produces `fatal: '{artifactBranch}' is already checked out at '/path/to/main'`. Not data corruption, but wastes the session. Templates must include the "NEVER run git checkout" warning. This is the #1 production bug identified by both Risk agents.

**Nested worktrees.** Claude Code's `isolation: "worktree"` creates its own worktrees. If Build uses `isolation: "worktree"` for subagents while already in an Anatomia worktree, nested worktrees occur — known problematic per Claude Code issue #47548. Templates must warn: "Do not use `isolation: 'worktree'` for subagent calls."

**Abandoned worktrees.** The system allocates disk for worktrees. If a build is abandoned, the worktree persists. `work status` flags worktrees with 0 commits and 14+ days as stale. No auto-cleanup — just visibility. `work complete --force` for manual cleanup is a future enhancement.

**Windows symlinks.** `fs.symlinkSync` requires developer mode or admin privileges on Windows. The implementation tries symlink first, catches `EPERM`, falls back to `copyFileSync`. Not ideal (copies go stale), but functional.

## Rejected Approaches

| Approach | Why rejected |
|----------|-------------|
| `useWorktrees` config flag | Scaffolding. Two code paths forever. Config is the disease alongside the cure. (Principle: the elegant solution removes.) |
| Silent fallback to branch checkout | No scenario where worktree fails but checkout succeeds. Same git, same disk, same permissions. |
| Worktree per agent | Wastes accumulated context. Verify needs Build's environment — test output, build artifacts, code changes. |
| Symlinks for node_modules | Fragile on Windows, fragile in monorepos with per-package node_modules. pnpm's content-addressable store deduplicates — install is fast and reliable. |
| Auto-merge artifact branch at Verify phase | Introduces code that neither Build nor the developer reviewed. The sealed contract protects the spec, not against code-level interactions. (Principle: verified over trusted.) |
| Baseline testing at worktree creation | Duplicate of Build template's baseline testing step. |
| Separate phase-aware-work-start scope | Same function, same file, one scope. Splitting creates overhead exceeding the work. |
| `.saves.json` split into separate files | File proliferation. Programmatic verification at `work complete` is cleaner. |
| Worktrees at project root | Adds a new top-level dotfile. `.ana/worktrees/` keeps everything in one system directory. |
| Two-scope split (CLI then templates) | Fatal split scenario: if templates ship without `getNextAction` changes, `work status` prints `git checkout feature/slug` — running that from main when a worktree is checked out produces `fatal: already checked out`. The system actively tells the user to do something that fails. |

## Open Questions

- The pnpm workspace resolution in nested worktree paths needs actual testing during Build. If it fails, the fix is known (`--ignore-workspace` or env var), but the spec should account for it.
- `computeTiming` changes for the new `_started_at` timestamps are deferred to a follow-up dogfood scope. The schema is designed now, data accumulates from the start. The spec should confirm this deferral or include the changes if trivial.

## Exploration Findings

### Patterns Discovered
- `work.ts:1296-1367`: existing `startWork` — creates directory, writes `work_started_at`. The "slug already exists" exit at line 1324 becomes the phase detection entry point.
- `work.ts:481-531`: `getNextAction` has 9 return paths. 7 currently prefix `git checkout`. These simplify to just the agent command.
- `work.ts:1196-1225`: `completeWork` sequence — directory move → proof chain → commit → push → branch delete. Worktree removal inserts before branch delete (git constraint: can't delete a branch checked out in a worktree).
- `artifact.ts:1292-1299`: `saveAllArtifacts` checks `hasPlanningArtifacts && currentBranch !== artifactBranch`. From a worktree, planning artifacts exist (inherited), triggering a false rejection. Fix: filter artifact list by category before the branch check.
- `validators.ts:169-197`: `findProjectRoot` already handles worktree `.git` file. Test at findProjectRoot.test.ts:106-112 covers this.
- `init/assets.ts:72-76`: `.gitignore` is hardcoded and overwritten on every init. No merge logic needed — add `worktrees/` to the template.
- `init/state.ts:430-506`: `preserveUserState` does NOT preserve `.gitignore` — it's regenerated fresh. Confirms the hardcoded approach.
- `.husky/pre-commit:21`: `cd packages/cli` — works from worktree because it's a full checkout. But requires `pnpm install` to have completed (`.husky/_/` must exist).
- `proofSummary.ts:1476-1516`: `computeTiming` reads named keys via `getTime()`, ignores unknown keys. New `_started_at` fields won't break it.
- `proof.ts`: 5 `WRONG_BRANCH` error locations (close, lesson, promote, strengthen, and their formatDetails). All use `Run: git checkout {artifactBranch}` — need worktree-aware messages.

### Constraints Discovered
- [TYPE-VERIFIED] `findProjectRoot` checks `existsSync('.git')` which returns true for both files (worktrees) and directories (main repos) (validators.ts:175)
- [VERIFIED] `getCurrentBranch` uses `git rev-parse --abbrev-ref HEAD` — returns the worktree's branch when run from worktree cwd (git-operations.ts:178-180)
- [VERIFIED] `captureModulesTouched` uses `merge-base artBranch HEAD` then `git diff` — correct from worktree (HEAD is feature branch, merge-base is branch point) (artifact.ts:136-167)
- [VERIFIED] `gatherArtifactState` discovers build/verify artifacts via `fileExistsOnBranch(workBranch, ...)` using `git show` — works whether branch is in a worktree or not (work.ts:309-329)
- [VERIFIED] `pr.ts` runs `gh pr create` with `{ cwd: projectRoot }` from worktree. git and gh both resolve `.git` file → actual repo. Should work but needs testing.
- [VERIFIED] `computeTiming` ignores unknown `.saves.json` keys — new timestamp fields are additive (proofSummary.ts:1476-1516)
- [OBSERVED] `.saves.json` keys are disjoint between artifact branch (work_started_at, scope, plan, spec, contract, build_started_at) and worktree (build-report, verify-report, build-data, verify-data, pre-check, modules_touched, verify_started_at). Merge conflict risk is at JSON structure level, not key collision.
- [INFERRED] pnpm workspace resolution in nested paths is the highest-risk unknown. The worktree's absolute path is inside the outer project's directory tree. pnpm may resolve the wrong workspace root.

### Test Infrastructure
- `work.test.ts`: `createWorkTestProject` helper creates temp repos with git, .ana config, slugs, and feature branches. Cleanup uses `fs.rm(tempDir)`. Worktree tests must call `git worktree remove` before `fs.rm` to prevent dangling metadata.
- Test helper needs extension: `worktree?: boolean` option on slug config to create a worktree after the feature branch.
- `git worktree add` works in temp repos created with `git init`. Verified by investigation agents.

## For AnaPlan

### Structural Analog
`startWork` at work.ts:1296-1367 IS the structural analog. Phase detection extends it — same branch check, same pull, same timestamp write, conditional on what artifacts exist. The "slug already exists" exit at line 1324 becomes the entry point for phase detection rather than the end.

For the worktree utility functions, the closest analog is the atomic operations in `init/state.ts` (preserveUserState, atomicRename) — same pattern of multi-step operation with rollback on failure.

### Relevant Code Paths
- `src/commands/work.ts:1296-1367` — `startWork` (phase detection + worktree creation)
- `src/commands/work.ts:1196-1225` — `completeWork` (worktree removal before branch delete)
- `src/commands/work.ts:481-531` — `getNextAction` (simplify 7 return paths)
- `src/commands/work.ts:539-611` — `printHumanReadable` (worktree display)
- `src/commands/work.ts:351-471` — `determineStage` (needs-fixes detection for phase table)
- `src/commands/artifact.ts:1292-1299` — `saveAllArtifacts` branch check (category filter fix)
- `src/commands/artifact.ts:44-76` — `writeSaveMetadata` (writes to correct location from worktree)
- `src/commands/artifact.ts:136-167` — `captureModulesTouched` (verified correct from worktree)
- `src/utils/validators.ts:169-197` — `findProjectRoot` (already handles worktree `.git` file)
- `src/utils/proofSummary.ts:1476-1516` — `computeTiming` (safe with new keys, changes deferred)
- `src/commands/proof.ts:729,748,976,995,1243,1284,1579,1620` — `WRONG_BRANCH` messages (5 check locations + 4 formatDetails)
- `src/commands/init/assets.ts:72-76` — `.gitignore` template (add `worktrees/`)
- `src/commands/init/index.ts` — init entry (add worktree guard)
- `src/commands/setup.ts` — setup complete (add worktree guard)
- `packages/cli/tests/commands/work.test.ts` — test infrastructure
- `templates/.claude/agents/ana-build.md` — build template (line-by-line edits in TEMPLATE_CHANGES.md)
- `templates/.claude/agents/ana-verify.md` — verify template (line-by-line edits in TEMPLATE_CHANGES.md)

### Patterns to Follow
- `work_started_at` read pattern at proofSummary.ts:1482-1486 — `typeof === 'string'` check for raw ISO strings in `.saves.json`
- Branch validation at work.ts:1315-1318 — reuse for Plan phase, relax for Resume case
- Pull logic at work.ts:1334-1347 — shared across all phases
- Atomic operations pattern from init/state.ts — try/catch with rollback
- Error message pattern from proof.ts WRONG_BRANCH — structured exit with `exitError` code + message

### Known Gotchas
- `git worktree add -b` creates both a worktree directory AND a branch. `git worktree remove` only removes the directory. Rollback must delete the branch too (only if newly created). This is the #1 implementation gotcha — 3 independent validators found it.
- The "slug already exists in active" error at line 1324 is the current behavior. Phase detection changes it to "detect phase and continue." Think phase must still work for new slugs (directory doesn't exist).
- `saveAllArtifacts` at artifact.ts:1295 will falsely reject from worktree because inherited planning artifacts trigger `hasPlanningArtifacts`. The fix: filter to build-verify category when `currentBranch !== artifactBranch`.
- `cd packages/cli` in the pre-commit hook works from the worktree only if `pnpm install` completed. Decision 20 (install failure = hard error with rollback) covers this. But partial install (process killed) could leave `.husky/_/` missing — git silently skips the hook.
- Template push commands (`git push -u origin {branchPrefix}{slug}`) stay — push still works from the worktree.
- The `getNextAction` simplification must not remove the `ready-to-merge` path (which doesn't have `git checkout`).

### Things to Investigate
- pnpm workspace resolution when the worktree is physically nested inside the outer project. Test `pnpm install` from `.ana/worktrees/{slug}/` and verify it uses the worktree's own lockfile, not the outer project's.
- Whether `gh pr create` from a worktree (where `.git` is a file) works correctly. git resolves it, but gh may not follow the indirection.
- Whether `computeTiming` changes are trivial enough to include in this spec or should remain deferred. The new `_started_at` keys use the same `typeof === 'string'` pattern — possibly 15 LoC.

### Implementation Ordering (within the spec)
1. `worktree.ts` utility functions (pure, testable, no coupling)
2. `startWork` phase detection + worktree creation (highest risk)
3. `completeWork` worktree removal + metadata (capture before removal)
4. `saveAllArtifacts` category filter fix (small, targeted)
5. `getNextAction` simplification + `printHumanReadable` worktree display (high impact, low risk)
6. Guards and error messages (lowest risk)
7. Templates last (after CLI is solid)

### Reference Documents
The full investigation, locked decisions, and line-by-line template edits are at:
- `anatomia_reference/WORKTREE_DEEP_INVESTIGATION/WORKTREE_REQUIREMENTS.md` — 22 locked decisions, sizing, scope decomposition
- `anatomia_reference/WORKTREE_DEEP_INVESTIGATION/TEMPLATE_CHANGES.md` — exact edit operations for Build and Verify templates
- `anatomia_reference/WORKTREE_INVESTIGATION.md` — original investigation with industry research
