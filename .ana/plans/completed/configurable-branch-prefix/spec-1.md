# Spec: Configurable branch prefix — Phase 1 (Foundation)

**Created by:** AnaPlan
**Date:** 2026-04-24
**Scope:** .ana/plans/active/configurable-branch-prefix/scope.md

## Approach

Add `branchPrefix` as a first-class config field in `ana.json`. Three changes, all additive:

1. **Schema** — add `branchPrefix` to `AnaJsonSchema` with `.optional().default('feature/').catch('feature/')`. Follows the same fail-soft pattern as every other field. The `.strip()` constraint means this MUST be in the schema or re-init deletes it.

2. **Init writer** — add `branchPrefix: 'feature/'` to the `anaConfig` object in `createAnaJson()`. Must be added alongside `artifactBranch` — the schema and writer must stay in sync per the documented invariant at `anaJsonSchema.ts:19-23`.

3. **Reader helper** — add `readBranchPrefix()` to `git-operations.ts`. Follows the `readArtifactBranch()` shape but returns `'feature/'` as fallback instead of calling `process.exit(1)`. Every existing install lacks `branchPrefix`, so the fallback is the common path on upgrade.

Phase 1 is a no-op for existing behavior. Fresh installs get `branchPrefix: "feature/"` written. Existing installs get it preserved through re-init (the `preserveUserState` merge reads through `AnaJsonSchema`, which now has the field). The reader returns `"feature/"` for both old and new installs. No consumer changes — those are Phase 2.

## Output Mockups

After `ana init`, the `ana.json` file includes:
```json
{
  "anaVersion": "0.2.0",
  "name": "my-project",
  "language": "TypeScript",
  "framework": null,
  "packageManager": "pnpm",
  "commands": { ... },
  "coAuthor": "Ana <build@anatomia.dev>",
  "artifactBranch": "main",
  "branchPrefix": "feature/",
  "lastScanAt": "2026-04-24T..."
}
```

## File Changes

### `src/commands/init/anaJsonSchema.ts` (modify)
**What changes:** Add `branchPrefix` field to the Zod schema object, between `artifactBranch` and `setupPhase`.
**Pattern to follow:** The `artifactBranch` field on the line above — same shape: `z.string().optional().default('feature/').catch('feature/')`.
**Why:** Without this, `.strip()` at line 47 silently deletes `branchPrefix` on every re-init. The schema and writer must enumerate the same fields.

### `src/commands/init/state.ts` (modify)
**What changes:** Add `branchPrefix: 'feature/'` to the `anaConfig` object in `createAnaJson()`, placed after `artifactBranch`.
**Pattern to follow:** The `artifactBranch: detectArtifactBranch(result)` line. `branchPrefix` is simpler — it's always `'feature/'` on fresh init, no detection needed.
**Why:** Without this, fresh installs lack the field. The schema provides it on parse, but the written file should be explicit so users can discover and edit it.

### `src/utils/git-operations.ts` (modify)
**What changes:** Add `readBranchPrefix()` function below `readArtifactBranch()`.
**Pattern to follow:** `readArtifactBranch()` at lines 26-49 — same structure (read ana.json, parse, extract field). The difference: return `'feature/'` as default instead of `process.exit(1)` when the field is missing.
**Why:** Central reader with fallback. Every consumer in Phase 2 will import this instead of hardcoding `'feature/'`.

### `tests/utils/git-operations.test.ts` (create)
**What changes:** Unit tests for `readBranchPrefix()` covering: field present, field absent (fallback), file missing (fallback), empty string prefix.
**Pattern to follow:** Test structure from `tests/commands/work.test.ts` — temp directory, ana.json fixture, cleanup in afterEach.
**Why:** The reader is the foundation for all Phase 2 migration. Its fallback behavior must be proven before consumers depend on it.

## Acceptance Criteria

- [ ] AC1: Fresh `ana init` writes `branchPrefix: "feature/"` to `ana.json`
- [ ] AC2: Re-init on an existing project preserves a user-modified `branchPrefix` value
- [ ] AC3: `readBranchPrefix()` returns `"feature/"` when `branchPrefix` is absent from `ana.json` (backward compatibility)
- [ ] AC3a: `readBranchPrefix()` returns the configured value when `branchPrefix` is present
- [ ] AC3b: `readBranchPrefix()` returns `"feature/"` when ana.json is missing entirely
- [ ] AC3c: `readBranchPrefix()` returns `""` when `branchPrefix` is explicitly set to empty string
- [ ] Tests pass: `(cd packages/cli && pnpm vitest run)`
- [ ] No build errors: `pnpm run build`

## Testing Strategy

- **Unit tests for `readBranchPrefix()`:**
  - Returns configured value when field exists (`"dev/"`)
  - Returns `"feature/"` when field is absent (old install)
  - Returns `"feature/"` when ana.json is missing
  - Returns `""` when branchPrefix is empty string
  - Returns `"feature/"` when branchPrefix is non-string (number, null)
- **Schema tests:** Verify `AnaJsonSchema.parse()` preserves `branchPrefix` through round-trip, defaults missing field to `"feature/"`, and `.catch()` recovers from invalid values.
- **No integration tests needed in Phase 1** — `createAnaJson` is tested indirectly via existing init tests. The field is additive and follows an established pattern.

## Dependencies

None. Phase 1 is fully self-contained.

## Constraints

- `branchPrefix` must include the trailing separator if desired. `"feature/"` not `"feature"`. The consumer code will concatenate `${prefix}${slug}` directly — no separator insertion.
- The field must appear in both `AnaJsonSchema` and `createAnaJson`. If one but not the other, it's a bug per the documented invariant.

## Gotchas

- **`AnaJsonSchema.strip()` is the biggest risk.** If you add the field to `createAnaJson` but forget the schema, re-init silently deletes it every time. Build the schema change first, then the writer.
- **`preserveUserState` merge semantics.** The merge at `state.ts:457-461` spreads `parsed.data` then overwrites `anaVersion` and `lastScanAt`. Since `branchPrefix` is in the schema and not in the overwrite list, a user-modified value survives re-init automatically. No changes needed to `preserveUserState`.
- **Default value duplication.** The default `'feature/'` appears in three places: schema default, `createAnaJson` literal, and `readBranchPrefix` fallback. This is intentional — each serves a different purpose (parse recovery, fresh init, runtime fallback). Don't try to DRY them into a constant — the coupling would be worse than the duplication.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer named exports.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Early returns over nested conditionals.
- Error handling: commands surface with chalk.red + process.exit(1); utils return defaults.

### Pattern Extracts

`readArtifactBranch()` from `src/utils/git-operations.ts:26-49` — the structural analog:

```typescript
export function readArtifactBranch(projectRoot?: string): string {
  const anaJsonPath = path.join(projectRoot ?? process.cwd(), '.ana', 'ana.json');

  if (!fs.existsSync(anaJsonPath)) {
    console.error(chalk.red('Error: No .ana/ana.json found. Run `ana init` first.'));
    process.exit(1);
  }

  let config: Record<string, unknown>;
  try {
    const content = fs.readFileSync(anaJsonPath, 'utf-8');
    config = JSON.parse(content);
  } catch {
    console.error(chalk.red('Error: Failed to read .ana/ana.json. File may be corrupted.'));
    process.exit(1);
  }

  if (!config['artifactBranch']) {
    console.error(chalk.red('Error: No artifactBranch configured in ana.json. Run `ana init` first.'));
    process.exit(1);
  }

  return config['artifactBranch'] as string;
}
```

`readBranchPrefix()` follows this shape but replaces the three `process.exit(1)` paths with `return 'feature/'`.

Schema field pattern from `anaJsonSchema.ts:40`:
```typescript
    artifactBranch: z.string().optional().catch(undefined),
```

`branchPrefix` uses `.default('feature/')` instead of `.optional()` — the field should always resolve to a string, never undefined.

### Checkpoint Commands

- After schema + writer changes: `pnpm run build` — Expected: clean build, no type errors
- After reader + tests: `(cd packages/cli && pnpm vitest run)` — Expected: 1417+ tests pass (baseline: 1417 passed, 2 skipped)
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1417 passed, 2 skipped (95 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected 1417 + ~6 new tests in 96 test files
- Regression focus: `tests/commands/init.test.ts` (if it exists and tests ana.json shape)
