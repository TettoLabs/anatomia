# Spec: Fix artifact save bypass, cwd bug, and work complete crash recovery

**Created by:** AnaPlan
**Date:** 2026-04-27
**Scope:** .ana/plans/active/fix-artifact-save-and-work-complete/scope.md

## Approach

Four fixes, one disease: the system trusted instead of verifying. It trusted agents to use `ana artifact save`. It trusted the user's cwd. It trusted that the commit would succeed after irreversible mutations.

**INFRA-061 (cwd):** Add `cwd: projectRoot` to every `execSync`/`spawnSync` git call in `saveArtifact` and `completeWork` that's missing it. `saveAllArtifacts` already has it on every call — match that pattern exactly.

**INFRA-060 (save bypass):** Restructure the save flow so metadata is written and staged *before* the no-changes check. Make `writeSaveMetadata` idempotent via hash comparison — if the computed hash matches the existing entry, skip the write and return `false`. Move `captureModulesTouched` before the commit in `saveArtifact` (it already runs before staging in `saveAllArtifacts`). This eliminates the bypass by removing the ordering gap.

**Completeness check (closes INFRA-060 loop):** Before the directory move in `completeWork`, read `.saves.json` and verify that both `build-report` and `verify-report` entries exist with `saved_at` and `hash`. If either is missing, exit with an error naming the specific missing artifact(s) and the exact command to run. Nothing mutates if this check fails.

**INFRA-062 (crash recovery):** Refine the "already completed" check in `completeWork`. When `completedPath` exists but `activePath` doesn't, check `git status --porcelain .ana/` for uncommitted changes. If found, retry the commit. If clean, it's genuinely completed.

**coAuthor hoisting:** The coAuthor read is currently scoped inside the step 10 try block in `completeWork`. The recovery path (step 5) needs the same value. Hoist the coAuthor read to the top of `completeWork`, alongside `projectRoot`/`artifactBranch`/`branchPrefix`, so both the main commit path and the recovery path share it.

## Output Mockups

### Bypass recovery — artifact committed outside `save`
```
$ ana artifact save build-report my-feature
✓ Saved Build Report for `my-feature` on `feature/my-feature`.
```
The commit contains only `.saves.json` metadata — the artifact file itself was already committed.

### Idempotent re-save — artifact unchanged
```
$ ana artifact save build-report my-feature
No changes to save — artifact is already up to date.
```

### Save from subdirectory
```
$ cd packages/cli
$ ana artifact save build-report my-feature
✓ Saved Build Report for `my-feature` on `feature/my-feature`.
```

### Completeness check failure
```
$ ana work complete my-feature
Error: build-report was not saved through the pipeline.
Run: ana artifact save build-report my-feature
```

When both are missing:
```
$ ana work complete my-feature
Error: Artifacts not saved through the pipeline:
  - build-report: run `ana artifact save build-report my-feature`
  - verify-report: run `ana artifact save verify-report my-feature`
```

### Crash recovery
```
$ ana work complete my-feature
Recovering incomplete completion — retrying commit...
✓ PASS — My Feature
  5/5 covered · 5/5 satisfied · 0 deviations
  Chain: 4 runs · 1 active finding
```

### Genuinely already completed
```
$ ana work complete my-feature
Work item `my-feature` was already completed.
```

## File Changes

### `packages/cli/src/commands/artifact.ts` (modify)

**What changes:**

1. **`writeSaveMetadata` becomes idempotent.** Before writing, compute the hash and compare against the existing entry's `hash` field. If they match, skip the write. Return type changes from `void` to `boolean` (true = wrote, false = skipped). The comparison must use the full `sha256:${hex}` format — that's what the existing code stores.

2. **`saveArtifact` flow reorder.** Move the `.saves.json` write + `captureModulesTouched` + `.saves.json` staging to BEFORE the no-changes check. The sequence becomes: stage artifact → write metadata → capture modules_touched (if build-report) → stage .saves.json → check for staged changes → commit. Remove the post-commit `captureModulesTouched` call.

3. **`saveArtifact` cwd fix.** Add `cwd: projectRoot` to every git call that's missing it. The calls at the pull block (step 7), stage commands (step 8), and commit (step 9) need it. Match the `saveAllArtifacts` pattern.

4. **`saveAllArtifacts` flow reorder.** Move the `.saves.json` write loop + staging from after the no-changes check to before it. `captureModulesTouched` already runs before staging (step 3c) — no change needed there.

**Pattern to follow:** `saveAllArtifacts` git call pattern — every `execSync` has `{ cwd: projectRoot }` in options.
**Why:** Without these changes, `save` silently produces incomplete metadata when agents bypass it, and fails from subdirectories.

### `packages/cli/src/commands/work.ts` (modify)

**What changes:**

1. **coAuthor read hoisting.** Move the coAuthor read from inside the step 10 try block to the top of `completeWork`, after `branchPrefix` is read. The pattern is the same — read `ana.json`, parse, extract `coAuthor` with fallback. Both the main commit path and recovery path use this hoisted value.

2. **Recovery detection.** Replace the unconditional "already completed" message at step 5 with: if `completedPath` exists and `activePath` doesn't, run `git status --porcelain .ana/` with `cwd: projectRoot`. If uncommitted changes exist, this is a failed prior run — log "Recovering incomplete completion — retrying commit...", then stage `.ana/plans/` + `.ana/proof_chain.json` + `.ana/PROOF_CHAIN.md` (with `cwd: projectRoot`), commit using the hoisted `coAuthor`, push, and continue to the success summary. If no uncommitted changes, print the existing "already completed" message and exit.

3. **Completeness check.** After verify-report validation (step 8) and before directory move (step 9), read `.saves.json` from `activePath`. Check for `saves['build-report']` and `saves['verify-report']`. Each must have both `saved_at` (truthy string) and `hash` (truthy string). If one is missing, exit with a single-artifact error message. If both are missing, exit with a multi-artifact error listing both commands. Nothing mutates if this check fails.

4. **cwd fix.** Add `cwd: projectRoot` to the `git add`, `git commit`, `git push`, `git branch -d`, and `git push origin --delete` calls in steps 10-12 that are missing it. Also add it to the `git fetch --prune origin` call in step 6.

**Pattern to follow:** The existing `cwd: projectRoot` pattern already used in `saveAllArtifacts`.
**Why:** Without cwd fix, `work complete` fails from subdirectories. Without recovery, a commit failure after directory move leaves the work item in limbo. Without the completeness check, bypassed saves produce proof chain entries with null timing.

## Acceptance Criteria

- [ ] AC1: Running `ana artifact save build-report {slug}` when the artifact was committed outside `save` writes `.saves.json` metadata (hash, timestamp), captures `modules_touched`, and commits the metadata.
- [ ] AC2: Running `ana artifact save build-report {slug}` twice on an unchanged artifact still exits with "already up to date" and creates no spurious commit.
- [ ] AC3: Running `ana artifact save` from a subdirectory succeeds — all git operations resolve against the project root.
- [ ] AC4: Running `ana work complete` from a subdirectory succeeds — all git operations resolve against the project root.
- [ ] AC5: Running `ana work complete` after a previously failed completion (plan moved to `completed/`, proof chain written, but commit failed) recovers automatically by retrying the commit.
- [ ] AC6: After successful recovery (AC5), the proof chain entry and plan archive are committed and the work item is fully completed.
- [ ] AC7: All existing tests pass. No test count decrease.
- [ ] AC8: When `work complete` commit fails in the main path, the error message directs the user to retry `ana work complete {slug}`.
- [ ] AC9: `work complete` reads `.saves.json` before the directory move and verifies that both `build-report` and `verify-report` entries exist with `saved_at` and `hash`. If either is missing, exits with an error directing the user to run the specific `ana artifact save` command. Nothing mutates if this check fails.
- [ ] Tests pass with `pnpm vitest run`
- [ ] No build errors with `pnpm run build`

## Testing Strategy

- **Unit tests (artifact.test.ts):**
  - Save bypass recovery: commit artifact via raw `git add && git commit`, then run `saveArtifact`. Verify `.saves.json` gets metadata and a commit is produced.
  - Idempotent re-save: run `saveArtifact` twice on unchanged artifact. Second call exits with "already up to date" and no new commit.
  - Subdirectory cwd: `process.chdir` into a subdirectory before calling `saveArtifact`. Verify success.
  - `writeSaveMetadata` idempotency: call twice with same content, verify it returns `false` on second call and `.saves.json` `saved_at` is unchanged.

- **Unit tests (work.test.ts):**
  - Completeness check — missing build-report: create a merged project without `.saves.json`, call `completeWork`. Verify it exits with error naming `build-report` and suggesting the save command.
  - Completeness check — missing verify-report entry: create `.saves.json` with only `build-report` entry. Verify error names `verify-report`.
  - Completeness check — both missing: verify error lists both.
  - Completeness check — passes: create `.saves.json` with both entries having `saved_at` and `hash`. Verify `completeWork` proceeds.
  - Recovery: simulate failed completion (copy to `completed/`, remove `active/`, leave uncommitted) then call `completeWork`. Verify it commits and succeeds.
  - Double recovery: same as above but the recovery commit also fails. Second retry should work.
  - Subdirectory cwd: `process.chdir` into subdirectory, call `completeWork`. Verify success.

- **Edge cases:**
  - `writeSaveMetadata` preserves existing entries (e.g., `pre-check`, `modules_touched`) when writing new entries.
  - Recovery false positive: genuinely completed item (all committed) still shows "already completed."

## Dependencies

None — all changes are to existing commands with no new external dependencies.

## Constraints

- `writeProofChain` reads `.saves.json` from `completed/` path — the plan must be copied to `completed/` before proof chain generation. This ordering constraint is pre-existing and unchanged.
- `captureModulesTouched` uses `cwd: projectRoot` internally — no additional cwd fix needed inside it.
- Pre-commit hooks run `tsc --noEmit` — all changes must type-check.
- Test count must not decrease from 1514.

## Gotchas

- **`writeSaveMetadata` is shared.** Both `saveArtifact` and `saveAllArtifacts` call it. The return type change (void → boolean) affects both callers. `saveAllArtifacts` calls it in a loop for multiple artifacts — verify the loop still works when some return true and some return false.
- **Hash format.** The comparison must use `sha256:${hash}`, not just `${hash}`. The existing code stores `sha256:` prefix. A bare hex comparison would never match.
- **`saveAllArtifacts` modules_touched.** It already calls `captureModulesTouched` at step 3c before staging. The metadata reorder should integrate with that, not duplicate it. No additional `captureModulesTouched` call needed.
- **The no-changes check after reorder.** After the reorder, `.saves.json` is staged alongside the artifact. If the artifact is unchanged but `.saves.json` was updated (bypass recovery), `git diff --staged --quiet` correctly detects changes. If both are unchanged (true re-save with idempotent metadata), the check correctly detects no changes. Verify both paths.
- **Recovery commit message.** The recovery path in `completeWork` needs the same commit message format as the main path: `[{slug}] Complete — archived to plans/completed`. Use the hoisted `coAuthor` variable.
- **coAuthor read location.** Currently at work.ts:1156-1162, inside the step 10 try block. Hoist to after line 992 (after `branchPrefix`). Remove the original. Both the recovery path (step 5) and the main commit path (step 10) use the hoisted value.
- **`process.exit(1)` in the main commit failure path (step 10).** The scope's AC8 requires the error message to include the slug and suggest retrying. The current message is generic. Update it to: `Error: Failed to commit. Run \`ana work complete ${slug}\` to retry.`
- **Completeness check reads from activePath.** The check runs before the directory move, so `.saves.json` is at `activePath`, not `completedPath`.
- **`.saves.json` may not exist.** If no `save` was ever run, the file doesn't exist at all. Treat missing file the same as missing entries — both build-report and verify-report are missing.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Early returns over nested conditionals.
- Error handling: commands surface errors with `chalk.red` + `process.exit(1)`.

### Pattern Extracts

**`saveAllArtifacts` cwd pattern (artifact.ts:986-988) — the correct pattern:**
```typescript
    for (const artifactPath of artifactPaths) {
      execSync(`git add ${artifactPath}`, { stdio: 'pipe', cwd: projectRoot });
    }
```

**`saveAllArtifacts` metadata write + staging (artifact.ts:1009-1019) — will be reordered to before the no-changes check:**
```typescript
  // 7b. Write .saves.json and stage it alongside artifacts.
  for (const artifact of artifacts) {
    const content = fs.readFileSync(artifact.path, 'utf-8');
    writeSaveMetadata(planDir, artifact.typeInfo.baseType, content);
  }
  const savesPathAll = path.join(planDir, '.saves.json');
  if (fs.existsSync(savesPathAll)) {
    try {
      execSync(`git add ${path.relative(projectRoot, savesPathAll)}`, { stdio: 'pipe', cwd: projectRoot });
    } catch { /* */ }
  }
```

**`completeWork` coAuthor read (work.ts:1156-1162) — to be hoisted:**
```typescript
    const anaJsonPath = path.join(projectRoot, '.ana', 'ana.json');
    let coAuthor = 'Ana <build@anatomia.dev>';
    try {
      const anaJsonContent = fs.readFileSync(anaJsonPath, 'utf-8');
      const config: { coAuthor?: string } = JSON.parse(anaJsonContent);
      coAuthor = config.coAuthor || 'Ana <build@anatomia.dev>';
    } catch { /* fallback to default */ }
```

**`completeWork` recovery location (work.ts:1028-1036) — the block to refine:**
```typescript
  if (!fs.existsSync(activePath)) {
    // Check if already completed
    if (fs.existsSync(completedPath)) {
      console.log(chalk.gray(`Work item \`${slug}\` was already completed.`));
      process.exit(0);
    }
    console.error(chalk.red(`Error: No active work found for \`${slug}\`.`));
    process.exit(1);
  }
```

**Test helper pattern — `captureError` (artifact.test.ts:1329-1354):**
```typescript
  function captureError(fn: () => void): string {
    const originalExit = process.exit;
    const originalError = console.error;
    const errors: string[] = [];

    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    };

    process.exit = ((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as typeof process.exit;

    try {
      fn();
      return errors.join('\n');
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('process.exit')) {
        return errors.join('\n');
      }
      throw error;
    } finally {
      console.error = originalError;
      process.exit = originalExit;
    }
  }
```

### Checkpoint Commands

- After `writeSaveMetadata` idempotency change: `(cd packages/cli && pnpm vitest run tests/commands/artifact.test.ts --run)` — Expected: existing artifact tests pass
- After `saveArtifact` reorder + cwd: same command — Expected: all artifact tests pass
- After `completeWork` changes: `(cd packages/cli && pnpm vitest run tests/commands/work.test.ts --run)` — Expected: existing work tests pass
- After all changes + new tests: `(cd packages/cli && pnpm vitest run --run)` — Expected: 1514+ tests pass, 0 failures
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1514 passed, 2 skipped (97 test files)
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected ~1530+ tests (approximately 16+ new tests across artifact and work test files)
- Regression focus: `tests/commands/artifact.test.ts`, `tests/commands/work.test.ts` — existing save and complete tests must not break from the reorder
