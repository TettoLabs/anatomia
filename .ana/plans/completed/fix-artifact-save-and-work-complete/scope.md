# Scope: Fix artifact save bypass, cwd bug, and work complete crash recovery

**Created by:** Ana
**Date:** 2026-04-27

## Intent

Three interrelated bugs surfaced during the findings-lifecycle-foundation completion (2026-04-27). Build manually committed `build_report.md` via `git add && git commit`, bypassing `ana artifact save`. Save reported "already up to date" and skipped its entire metadata pipeline. Then `work complete` ran from `packages/cli/` (a subdirectory), causing `git add .ana/plans/` to fail on a relative path. `process.exit(1)` fired after the plan directory was already moved and proof chain already written. A second `work complete` said "already completed" because `active/` was empty.

Result: proof chain entry #19 has permanent data gaps — empty `modules_touched`, null build/verify timing, null `seal_commit`.

All three bugs violate the same principle: the system trusted instead of verifying. It trusted agents to use `ana artifact save`. It trusted the user's cwd. It trusted that the commit would succeed after irreversible mutations.

Backlog references: ANA-INFRA-060, ANA-INFRA-061, ANA-INFRA-062.

## Complexity Assessment
- **Size:** medium
- **Files affected:**
  - `packages/cli/src/commands/artifact.ts` (INFRA-060 structural reorder + INFRA-061 cwd)
  - `packages/cli/src/commands/work.ts` (INFRA-061 cwd + INFRA-062 recovery)
- **Blast radius:** `saveArtifact`, `saveAllArtifacts`, and `completeWork` are the three functions that commit to git on behalf of the pipeline. All three are affected. `writeSaveMetadata` gains idempotency (hash comparison). No changes to types, engine, templates, or proof summary generation.
- **Estimated effort:** 2-3 hours including tests
- **Multi-phase:** no

## Approach

Four fixes, one coherent rationale: verify, don't trust.

**INFRA-061 (cwd):** Add `cwd: projectRoot` to every `execSync`/`spawnSync` git call in `saveArtifact` and `completeWork` that's missing it. `saveAllArtifacts` already does this correctly — match its pattern. Mechanical, no design judgment needed.

**INFRA-060 (save bypass):** Restructure the save flow in both `saveArtifact` and `saveAllArtifacts` so metadata is written and staged *before* the no-changes check, not after. Make `writeSaveMetadata` idempotent by comparing hashes — skip the write when the hash matches the existing entry. Move `captureModulesTouched` before the commit (safe because the merge-base diff excludes `.ana/` files, and `saveAllArtifacts` already captures it pre-commit at line 948). This eliminates the bypass by removing the ordering gap rather than adding detection logic.

**Completeness check (closes the INFRA-060 loop):** The reorder makes `save` correct whenever it runs. The completeness check ensures `save` ran. Before the directory move in `completeWork`, read `.saves.json` and verify that both `build-report` and `verify-report` entries exist with `saved_at` and `hash`. If either is missing, exit with an error directing the user to run the specific `ana artifact save` command. This check is two key lookups before the phase loop — not per-phase, because all phases share one key per artifact type (phase 2 overwrites phase 1). Nothing mutates if the check fails. The key-scheme limitation (can't detect partial-phase bypass in multi-spec features) is a known gap for a future scope.

**INFRA-062 (crash recovery):** Refine the existing "already completed" check in `completeWork` (lines 1028-1036). When the slug exists in `completed/` but not `active/`, verify whether the completion was actually committed. If uncommitted changes exist in `.ana/`, this is a failed prior run — recover by retrying the commit step. On commit failure in the main path, the error message directs the user to retry `ana work complete`.

## Acceptance Criteria
- AC1: Running `ana artifact save build-report {slug}` when the artifact was committed outside `save` writes `.saves.json` metadata (hash, timestamp), captures `modules_touched`, and commits the metadata.
- AC2: Running `ana artifact save build-report {slug}` twice on an unchanged artifact still exits with "already up to date" and creates no spurious commit.
- AC3: Running `ana artifact save` from a subdirectory (e.g., `packages/cli/`) succeeds — all git operations resolve against the project root.
- AC4: Running `ana work complete` from a subdirectory succeeds — all git operations resolve against the project root.
- AC5: Running `ana work complete` after a previously failed completion (plan moved to `completed/`, proof chain written, but commit failed) recovers automatically by retrying the commit.
- AC6: After successful recovery (AC5), the proof chain entry and plan archive are committed and the work item is fully completed.
- AC7: All existing tests pass. No test count decrease.
- AC8: When `work complete` commit fails in the main path, the error message directs the user to retry `ana work complete {slug}`.
- AC9: `work complete` reads `.saves.json` before the directory move and verifies that both `build-report` and `verify-report` entries exist with `saved_at` and `hash`. If either is missing, exits with an error directing the user to run the specific `ana artifact save` command. Nothing mutates if this check fails.

## Edge Cases & Risks
- **Double recovery:** User runs `work complete`, commit fails, runs again (recovery), commit fails again. Second recovery should also work — the detection logic must be re-entrant.
- **Partial .saves.json:** If `writeSaveMetadata` is called for build-report but a previous run already wrote a `pre-check` entry, the new write must preserve existing entries. Current code already handles this (reads existing file first). Verify this survives the reorder.
- **Race with `saveAllArtifacts`:** Both `saveArtifact` and `saveAllArtifacts` need the same reorder. Ensure `saveAllArtifacts` doesn't double-capture `modules_touched` (it already calls `captureModulesTouched` at line 948 before staging — the metadata reorder should integrate with that, not duplicate it).
- **`writeSaveMetadata` idempotency edge case:** The hash comparison must use the full `sha256:{hex}` string, not just the hex. Current code stores `sha256:${hash}` — the comparison must match that format.
- **Recovery false positive:** A legitimately completed work item (committed, pushed) shouldn't trigger recovery. The detection must verify uncommitted `.ana/` changes exist, not just that `completed/` has the slug.
- **Branch-deleted modules_touched:** If the feature branch was squash-merged and auto-deleted before the developer runs `save` (post-merge recovery from AC9 block), `captureModulesTouched` diffs `merge-base main HEAD` — both are main, diff is empty, `modules_touched` is `[]`. This is correct, not a defect — the branch is gone, the diff is unrecoverable. Empty array is the honest answer.
- **Key-scheme limitation in multi-spec:** All phases write to the same `.saves.json` key (`build-report`, `verify-report`) because `writeSaveMetadata` uses `typeInfo.baseType`. Phase 2 overwrites phase 1. The completeness check catches total bypass but not partial-phase bypass (e.g., phase 1 bypassed save, phase 2 used save correctly). Fixing the key scheme to use numbered keys affects `computeTiming`, proof summary generation, and downstream consumers — separate scope.

## Rejected Approaches

**Detect-and-recover for INFRA-060 (backlog Option 1).** The backlog proposed: if "no changes," check `.saves.json` for a matching entry, and if missing, warn and recover. This works but adds detection logic on top of an ordering gap. Restructuring the flow to eliminate the gap is simpler and follows "the elegant solution is the one that removes" — we remove the gap rather than watching for its effects.

**Pre-commit hook for INFRA-060 (backlog Option 2).** Prevents the bypass entirely via hook infrastructure. Heavier than the problem demands. The structural reorder handles the actual failure mode without adding infrastructure.

**Commit-first / transactional approach for INFRA-062 (backlog Option 1).** Stage the deletion of `active/` via `git rm --cached` (index only), commit atomically, then delete from filesystem. On failure, `git reset HEAD` to rollback. Principled but fragile — the rollback itself can fail, creating a worse state than the original problem. Also requires changing `writeProofChain` to read `.saves.json` from `active/` instead of hardcoded `completed/`.

**Full rollback for INFRA-062 (backlog Option 2).** On commit failure, move the plan back, undo proof chain writes. The proof chain write involves backfill mutations on existing entries (finding lifecycle resolution, auto-close). Reversing those is non-trivial and error-prone.

**Warning on empty modules_touched.** Considered as AC10, dropped. After the INFRA-060 reorder, `modules_touched` is captured as part of `save`. If `save` ran (AC9 passes), `captureModulesTouched` ran. If the array is empty afterward, it's because the feature branch was already merged before the recovery save (diff against self is empty) or the feature had no non-`.ana/` file changes. Warning on either case is noise — the most common recovery path (post-merge) would always trigger a false alarm.

**`--force` flag to skip completeness check.** If we add `--force`, agents will learn to use it. Prompts will include it as a convenience. The guardrail erodes. The fix is always "run `save`" — and with the INFRA-060 reorder, `save` always works, even after merge.

## Open Questions

None — all design decisions resolved during investigation.

## Exploration Findings

### Patterns Discovered
- `saveAllArtifacts` consistently uses `cwd: projectRoot` on all git calls (lines 987, 1003, 1017, 1027, 1036, 1046). `saveArtifact` uses it on some calls (669, 711, 791, 804) but not others (696, 702, 726, 744). The inconsistency is the bug — `saveAllArtifacts` is the correct pattern.
- `saveAllArtifacts` already calls `captureModulesTouched` before staging (line 948), contradicting the comment in `saveArtifact` that claims it must run after commit. The merge-base diff excludes `.ana/` files, so the artifact commit doesn't affect the result.
- `writeSaveMetadata` unconditionally writes `saved_at: new Date().toISOString()`, making every call produce different content. This is why the original author put it after the no-changes check. Making it hash-idempotent resolves this tension.
- The `completeWork` recovery path at lines 1028-1033 already checks `completedPath` existence. The enhancement is: instead of unconditionally saying "already completed," verify the completion was committed.

### Constraints Discovered
- [TYPE-VERIFIED] `writeProofChain` reads `.saves.json` from `completed/` path (work.ts:764) — the plan must be copied to `completed/` before proof chain generation. This constraint prevents a commit-first approach without refactoring `writeProofChain`.
- [OBSERVED] `captureModulesTouched` uses `cwd: projectRoot` (artifact.ts:145-149) — it already handles cwd correctly internally.
- [OBSERVED] `generateProofSummary` takes an arbitrary directory path (proofSummary.ts:802) — no hardcoded active/completed assumption. Called with `completedPath`.

### Test Infrastructure
- Existing artifact tests in `packages/cli/tests/commands/artifact.test.ts` — uses temp git repos. Pattern to follow for save-bypass and cwd tests.
- Existing work tests in `packages/cli/tests/commands/work.test.ts` — uses temp dirs with mocked git. Pattern to follow for recovery tests.

## For AnaPlan

### Structural Analog
`saveAllArtifacts` in `artifact.ts` (lines 827-1057). It has the correct cwd pattern, already calls `captureModulesTouched` before staging, and its metadata-writing flow is the template for how `saveArtifact` should be restructured. The fix for `saveArtifact` is largely "make it match `saveAllArtifacts`."

### Relevant Code Paths
- `artifact.ts:45-69` — `writeSaveMetadata`. Needs hash-comparison guard to become idempotent. Return type should change to boolean (whether it wrote).
- `artifact.ts:556-820` — `saveArtifact`. Lines 694-755 need reordering: metadata + modules_touched + staging before the no-changes check. Lines 696, 702, 726, 744 need `cwd: projectRoot`.
- `artifact.ts:827-1057` — `saveAllArtifacts`. Lines 1009-1019 (metadata writing) need to move before lines 1002-1007 (no-changes check). Already has correct cwd on all git calls.
- `work.ts:988-1199` — `completeWork`. Lines 1028-1036 need recovery detection. Lines 1154, 1164 need `cwd: projectRoot`. Lines 1172, 1180, 1186 need `cwd: projectRoot` (push/branch-delete — not strictly path-dependent but should be consistent). Completeness check goes after verify-report validation (line 1140) and before directory move (line 1142).
- `work.ts:739-870` — `writeProofChain`. Read-only for this scope — understand its `completed/` path dependency but don't modify.
- `utils/proofSummary.ts:752-779` — `computeTiming`. Read-only — understand that it reads `build-report.saved_at` from `.saves.json`, which is what goes null on bypass.

### Patterns to Follow
- Follow `saveAllArtifacts` git call pattern (every `execSync` has `{ cwd: projectRoot }` in options).
- Follow `saveAllArtifacts` modules_touched capture placement (before staging, not after commit).
- The recovery check in `completeWork` should mirror the existing pattern at lines 1028-1033 — same location, refined logic.

### Known Gotchas
- `writeSaveMetadata` is called by both `saveArtifact` and `saveAllArtifacts`. Making it idempotent affects both callers. Verify `saveAllArtifacts` flow still works correctly — it writes metadata for multiple artifact types in a loop (line 1010-1013).
- The no-changes check uses `spawnSync('git', ['diff', '--staged', '--quiet'])`. After the reorder, `.saves.json` will be staged alongside the artifact. If the artifact is unchanged but `.saves.json` was updated (bypass recovery case), this check correctly detects changes. If both are unchanged (true re-save), this check correctly detects no changes. Verify both paths.
- `completeWork` recovery must re-read `coAuthor` from `ana.json` for the commit message. The variable is currently scoped inside the try block at line 1156-1162. The recovery path needs its own read or the read should be hoisted.
- `git status --porcelain .ana/` in the recovery detection should use `cwd: projectRoot` (eat your own dog food).
- The completeness check reads `.saves.json` from `activePath` (before the move). Two key lookups: `saves['build-report']` and `saves['verify-report']`. Each must have `saved_at` (string) and `hash` (string). Don't check per-phase — the key scheme makes it pointless. Note: `.saves.json` may also contain `pre-check`, `modules_touched`, and planning artifact entries — don't require those, only build-report and verify-report.
- `computeTiming` (proofSummary.ts:760) reads `saves['build-report']` — same key the completeness check validates. If AC9 passes, timing will have data. The completeness check is the upstream guarantee that `computeTiming` won't produce nulls.

### Things to Investigate
- Determine the minimal `git status` check that distinguishes "completed and committed" from "completed but uncommitted." Consider: `git status --porcelain .ana/plans/completed/{slug}` vs broader `.ana/` check. The narrower check is more precise but might miss uncommitted proof chain changes. The broader check is safer.
- The completeness check error message should name the specific missing artifact(s): "build-report was not saved through the pipeline. Run `ana artifact save build-report {slug}`." Not a generic "metadata incomplete." If both are missing, list both commands.
