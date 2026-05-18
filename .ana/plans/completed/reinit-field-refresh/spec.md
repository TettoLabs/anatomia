# Spec: Re-init mechanical field refresh

**Created by:** AnaPlan
**Date:** 2026-05-18
**Scope:** .ana/plans/active/reinit-field-refresh/scope.md

## Approach

Extend the existing refresh pattern in `preserveUserState`. The merge block at state.ts:561-565 already overrides `anaVersion` and `lastScanAt` from `newAnaConfig` after spreading old values. Add four more overrides to the same object literal: `name`, `language`, `framework`, `packageManager`. These fields come from `createAnaJson` which reads the fresh scan — same source as `anaVersion` and `lastScanAt`.

Update the doc comment at state.ts:520-523 that serves as the preservation contract. It currently says "only anaVersion and lastScanAt refresh" — must list all six fields.

Update the project-context.md Re-init Preservation Contract section (line 85) which also says "Only `anaVersion` and `lastScanAt` refresh mechanically" — must match the new behavior.

Commands stay PRESERVE. The scope documents the rationale: three existing safeguards (blank sanitization, new key propagation, `config set`) cover the command edge cases. Full command refresh risks destroying user tuning.

## Output Mockups

No user-visible output changes. The merge happens silently during `ana init` re-runs. The only observable effect: `ana.json` after re-init contains fresh scan values for `name`, `language`, `framework`, `packageManager` instead of stale old values.

Before (re-init after language change):
```json
{
  "anaVersion": "1.1.0",
  "name": "old-project-name",
  "language": "JavaScript",
  "framework": null,
  "packageManager": "npm",
  "commands": { "test": "npm test" }
}
```

After:
```json
{
  "anaVersion": "1.1.0",
  "name": "new-project-name",
  "language": "TypeScript",
  "framework": "Next.js",
  "packageManager": "pnpm",
  "commands": { "test": "npm test" }
}
```

## File Changes

### `packages/cli/src/commands/init/state.ts` (modify)
**What changes:** Two locations. (1) The merge object literal gains four fields: `name`, `language`, `framework`, `packageManager` — all reading from `newAnaConfig`, same pattern as the existing `anaVersion`/`lastScanAt` overrides. (2) The doc comment block above the function updates to list all six refresh fields and removes the "separate design decision for a later sprint" note.
**Pattern to follow:** The existing `anaVersion: newAnaConfig['anaVersion']` override on line 563.
**Why:** Without this, re-init preserves stale metadata from the old config even though a fresh scan produced correct values.

### `packages/cli/tests/commands/init.test.ts` (modify)
**What changes:** Add tests in the `preserveUserState` describe block (after the learn-state test at line 767). Three test cases covering: (1) metadata fields refresh from new scan, (2) PRESERVE fields survive alongside the refresh, (3) null refresh — new scan returns null for a field that was non-null in old config.
**Pattern to follow:** The learn-state preservation test at lines 731-767. Same setup: create existingAnaPath with known ana.json values, create tmpAnaPath via `createDirectoryStructure`, call `preserveUserState`, assert results by reading the written ana.json.
**Why:** No existing test covers metadata field behavior during re-init. These tests verify the behavioral change and prevent regression.

### `.ana/context/project-context.md` (modify)
**What changes:** Update the Re-init Preservation Contract bullet (line 85) to list `name`, `language`, `framework`, `packageManager` as refreshed fields alongside `anaVersion` and `lastScanAt`.
**Why:** The context file is read by all agents. Stale documentation here would mislead future scoping and planning.

## Acceptance Criteria

- [ ] AC1: After re-init, `name` in ana.json matches the value from the fresh scan, not the old config
- [ ] AC2: After re-init, `language` in ana.json matches the value from the fresh scan
- [ ] AC3: After re-init, `framework` in ana.json matches the value from the fresh scan
- [ ] AC4: After re-init, `packageManager` in ana.json matches the value from the fresh scan
- [ ] AC5: After re-init, PRESERVE fields (`coAuthor`, `artifactBranch`, `branchPrefix`, `setupPhase`, `custom`, `commands`) retain their old values
- [ ] AC6: After re-init, a user-tuned command (e.g., custom `test` command) survives unchanged
- [ ] AC7: The `preserveUserState` doc comment lists all six refresh fields: `anaVersion`, `lastScanAt`, `name`, `language`, `framework`, `packageManager`
- [ ] AC8: All existing tests pass. Test count does not decrease.
- [ ] AC9: Unknown passthrough keys in old ana.json survive the merge with the new overrides
- [ ] AC10: project-context.md Re-init Preservation Contract matches the new behavior

## Testing Strategy

- **Unit tests:** Three new tests in the `preserveUserState` describe block of `init.test.ts`:
  1. **Metadata fields refresh:** Old ana.json has stale values for all four fields + old commands. New config has fresh values. Assert all four metadata fields match new config. Assert commands match old config. Assert a passthrough key (e.g., `myCustomKey: true`) survives.
  2. **PRESERVE fields survive:** Same setup but explicitly verify `coAuthor`, `artifactBranch`, `branchPrefix`, `custom` retain old values after merge.
  3. **Null refresh:** Old config has `language: "TypeScript"`, `framework: "Express"`. New config has `language: null`, `framework: null`. Assert the merged result has `null` — the scan is the source of truth.
- **Edge cases:** The passthrough key assertion (in test 1) covers the `.passthrough()` interaction. The null test covers the degenerate case where a scan produces empty results.

## Dependencies

None. The merge block and test infrastructure already exist.

## Constraints

- The post-merge command sanitization block (lines 567-586) must not be disturbed. The four new fields go in the merge object literal only.
- Test count must not decrease. Current: 2486 passed, 2 skipped across 108 files.

## Gotchas

- The `newAnaConfig` parameter is typed `Record<string, unknown>`. Access the four fields with bracket notation (`newAnaConfig['name']`) matching the existing pattern for `anaVersion` and `lastScanAt`.
- The doc comment at state.ts:520-523 IS the preservation contract that future developers read. If the comment doesn't match the code, someone will "fix" the code to match the comment. Update it thoroughly.
- `name` has type `string` (not nullable) in the schema, with default `'unknown'`. The other three are `string | null`. The merge handles this correctly because the spread + override pattern doesn't care about nullability — it just replaces the value.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer early returns over nested conditionals.
- Explicit return types on all exported functions.
- Always use `--run` with pnpm vitest to avoid watch mode hang.

### Pattern Extracts

The merge block to extend (state.ts:561-565):
```typescript
    const merged = {
      ...parsed.data,
      anaVersion: newAnaConfig['anaVersion'],
      lastScanAt: newAnaConfig['lastScanAt'],
    };
```

The test pattern to follow (init.test.ts:731-767):
```typescript
  describe('re-init preserves learn state.json', () => {
    it('preserves existing learn state with non-null timestamp', async () => {
      // Set up existing .ana with a learn state that has a timestamp
      const existingAnaPath = path.join(tmpDir, '.ana-existing');
      await fs.mkdir(path.join(existingAnaPath, 'learn'), { recursive: true });
      const existingTimestamp = '2026-05-15T14:30:00Z';
      await fs.writeFile(
        path.join(existingAnaPath, 'learn', 'state.json'),
        JSON.stringify({ last_session_at: existingTimestamp }),
      );

      // Create tmp .ana with fresh seed
      const tmpAnaPath = path.join(tmpDir, '.ana-tmp');
      await createDirectoryStructure(tmpAnaPath);

      // Create minimal ana.json for preserveUserState
      await fs.writeFile(
        path.join(existingAnaPath, 'ana.json'),
        JSON.stringify({ artifactBranch: 'main' }),
      );
      const newConfig = { anaVersion: '1.0.0', lastScanAt: new Date().toISOString() };

      // Run preserveUserState
      await preserveUserState(existingAnaPath, tmpAnaPath, newConfig);

      // Verify the timestamp was preserved
      const preservedState = JSON.parse(
        await fs.readFile(path.join(tmpAnaPath, 'learn', 'state.json'), 'utf-8'),
      );
      expect(preservedState.last_session_at).toBe(existingTimestamp);
    });
  });
```

### Proof Context
Active findings for `state.ts` are about `pkg.path` injection without sanitization in `createAnaJson` — unrelated to the merge block. No build concerns for this change.

No proof findings for `init.test.ts`.

### Checkpoint Commands
- After state.ts change: `(cd packages/cli && pnpm vitest run tests/commands/init.test.ts)` — Expected: all existing init tests pass
- After test additions: `(cd packages/cli && pnpm vitest run tests/commands/init.test.ts)` — Expected: existing + 3 new tests pass
- After all changes: `pnpm run test -- --run` — Expected: 2489+ tests pass across 108 files
- Lint: `(cd packages/cli && pnpm run lint)`

### Build Baseline
- Current tests: 2486 passed | 2 skipped (2488 total) in 108 files
- Command used: `pnpm run test -- --run`
- After build: expected 2489+ tests (2486 + 3 new) in 108 files
- Regression focus: `packages/cli/tests/commands/init.test.ts` — the only test file being modified
