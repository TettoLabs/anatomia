# Scope: Wrong-Tree Artifact Save

**Created by:** Ana
**Date:** 2026-05-06

## Intent

Build and Verify agents work in git worktrees. When they write `build_report.md` or `verify_report.md`, they sometimes resolve the path to the main tree instead of the worktree. The agent then runs `ana artifact save` and gets stuck: from the worktree "file not found," from main "wrong branch." The CLI should detect this mistake mechanically and relocate the file, not block the pipeline.

The user wants zero manual intervention when the agent writes to the wrong tree. The pipeline should self-correct and warn so the agent improves next time.

## Complexity Assessment
- **Size:** small-medium
- **Files affected:** `packages/cli/src/commands/artifact.ts`, `packages/cli/src/utils/worktree.ts`, new tests
- **Blast radius:** only affects `saveArtifact` for build-verify category artifacts. Planning artifacts unchanged. `saveAllArtifacts` unchanged (only used by Plan for planning artifacts).
- **Estimated effort:** 1-2 hours implementation, ~50-60 LoC net
- **Multi-phase:** no

## Approach

Add worktree-aware resolution to `artifact save`. Two insertion points:

1. **Branch validation** (Scenario A): when the agent runs from main and a worktree exists for the slug, check if the file is on main. If so, relocate it to the worktree, switch the effective project root to the worktree, and continue the save. The branch check becomes a relocation trigger, not a hard stop.

2. **File-exists check** (Scenario B): when the agent runs from the worktree but the file isn't found, check the main tree. If found there, relocate and continue.

Both paths warn with the worktree path so the agent knows where to write next time. Companion YAML files are relocated alongside their reports.

A new `getMainTreeRoot()` utility parses the worktree's `.git` file to find the main tree root. This is the foundation primitive for any future cross-tree awareness.

## Acceptance Criteria
- AC1: When Build writes `build_report.md` to main tree and a worktree exists, `artifact save build-report` relocates the file to the worktree, warns, and completes the save successfully
- AC2: When Build writes `build_report.md` to the worktree, `artifact save` works normally (no change to existing behavior)
- AC3: When no worktree exists, `artifact save` works normally (no change to existing behavior)
- AC4: Companion YAML files (`build_data.yaml`, `verify_data.yaml`) are relocated alongside their reports
- AC5: Planning artifacts (scope, spec, contract) are NEVER relocated — they stay on main
- AC6: The commit after relocation targets the feature branch (worktree's git context), not main
- AC7: Error messages include the worktree path when a worktree exists, so the agent knows where to write next time
- AC8: When file exists in BOTH trees, worktree copy is preferred and main copy is warned about but not deleted

## Edge Cases & Risks

- **File in both trees:** Use worktree copy (correct git context). Warn about orphan on main. Don't delete — might be from previous workflow.
- **No worktree exists:** All new code is guarded by `worktreeExists()`. Zero behavior change.
- **Planning artifacts:** Category check prevents relocation. They belong on main by design.
- **`fs.renameSync` across mounts:** `.ana/worktrees/` is a subdirectory of project root (same filesystem), but use `copyFileSync` + `unlinkSync` for defensive robustness.
- **`projectRoot` is `const`:** Must change to `let` at line 876 so Scenario A can reassign after relocation.
- **Success message uses stale `currentBranch`:** After Scenario A relocation, `currentBranch` is still "main" but commit went to feature branch. Fix the message to show the actual target branch.

## Rejected Approaches

**Prompting-only fix:** The V2 agent already had "write to the worktree" instructions and still wrote to main. Prompting is Layer 1 (necessary) but not sufficient. Verified over trusted.

**Fail with better error message only (no relocation):** Forces the agent to self-correct by copying the file. Agents are unreliable at multi-step recovery. The CLI should make the mistake impossible to persist, not just easier to diagnose.

**Modify `saveAllArtifacts`:** Only used by Plan agent for planning artifacts on main. The wrong-tree problem doesn't apply. Confirmed by reading `ana-plan.md` template.

## Open Questions

None. The requirements document resolved all design questions through two-agent scrutiny with full code trace.

## Exploration Findings

### Patterns Discovered
- `artifact.ts`: line 876 declares `const projectRoot` — all downstream operations use this variable by name
- `artifact.ts`: lines 843-848 branch validation hard-exits with incorrect advice ("git checkout" fails when branch is in worktree)
- `artifact.ts`: line 989 `deriveCompanionFileName()` computes companion name from report type
- `worktree.ts`: `worktreeExists()` and `getWorktreePath()` already available
- `worktree.ts`: `isWorktreeDirectory()` already parses `.git` file for worktree detection — same pattern needed for `getMainTreeRoot()`

### Constraints Discovered
- [TYPE-VERIFIED] `projectRoot` is `const` (artifact.ts:876) — must change to `let`
- [OBSERVED] Companion check at line 999 runs AFTER file resolution — relocation must move both files before this check
- [OBSERVED] Success message at line 1208 uses `currentBranch` — stale after Scenario A relocation
- [OBSERVED] `captureModulesTouched`, `runPreCheckAndStore`, `validateVerifyDataFormat` all work correctly with reassigned `projectRoot` (verified by requirements trace)

### Test Infrastructure
- Existing artifact tests in `packages/cli/tests/` — follow existing patterns for mocking git and filesystem

## For AnaPlan

### Structural Analog
`isWorktreeDirectory()` in `packages/cli/src/utils/worktree.ts` (lines 54-68) — parses `.git` file to detect worktree context. `getMainTreeRoot()` uses the same parse but walks up to find the main tree root instead of returning a boolean.

### Relevant Code Paths
- `packages/cli/src/commands/artifact.ts` lines 843-848 — branch validation (Scenario A insertion point)
- `packages/cli/src/commands/artifact.ts` lines 892-894 — file path resolution
- `packages/cli/src/commands/artifact.ts` lines 988-999 — companion YAML discovery
- `packages/cli/src/commands/artifact.ts` line 1208 — success message
- `packages/cli/src/utils/worktree.ts` lines 54-68 — `.git` file parsing pattern
- `packages/cli/src/utils/worktree.ts` lines 106-118 — `getWorktreePath()` and `worktreeExists()`

### Patterns to Follow
- `isWorktreeDirectory()` for `.git` file parsing
- All git operations use `{ cwd: projectRoot }` — this is what makes the reassignment work
- `deriveCompanionFileName()` for companion name computation

### Known Gotchas
- `projectRoot` reassignment must happen BEFORE companion check (line 989) and BEFORE `captureModulesTouched` — both depend on the variable
- The `git checkout` suggestion in current error messages is wrong (git prevents two worktrees on same branch) — replace with `cd` to worktree
- `filePath` must also be reassigned after relocation (it's derived from `projectRoot`)

### Things to Investigate
- Whether the relocation warning should be structured differently for agent consumption vs. human consumption (agents parse stderr for recovery instructions)
