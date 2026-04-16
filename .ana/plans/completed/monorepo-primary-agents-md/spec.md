# Spec: Monorepo Primary Package AGENTS.md

**Created by:** AnaPlan
**Date:** 2026-04-16
**Scope:** .ana/plans/active/monorepo-primary-agents-md/scope.md

## Approach

Add a new `generatePrimaryPackageAgentsMd()` function in assets.ts that produces a minimal AGENTS.md inside the primary package directory when the project is a monorepo. The function follows the exact same shape as the existing `generateAgentsMd()`: check if file exists → build lines array → write file.

The function is called from `createClaudeConfiguration()` in both the fresh-install and merge-existing branches, immediately after the root `generateAgentsMd()` call. It's gated on `engineResult?.monorepo.isMonorepo && engineResult.monorepo.primaryPackage`.

**Commands derivation:** The root-level `engineResult.commands` are already scoped to the primary package (e.g., `cd packages/cli && pnpm vitest run`). For the package-local AGENTS.md, strip the `cd {primaryPackage.path} && ` prefix to produce commands that work from inside the package directory. If a command doesn't have the prefix, include it unchanged — still useful context.

**Content scope:** Package identity, package-local commands, pointer to root AGENTS.md. No conventions, services, or constraints — those belong at root only.

Export the function so it can be unit tested directly, matching the pattern of `generateProjectContextScaffold` in scaffold-generators.ts.

## Output Mockups

For a monorepo with primary package `packages/cli` named `anatomia-cli`:

```
# anatomia-cli

Primary package in anatomia-workspace.

## Commands
- Build: `pnpm run build`
- Test: `pnpm vitest run`
- Lint: `pnpm run lint`

## Full Project Context
See [AGENTS.md](../../AGENTS.md) at the project root for conventions, services, and constraints.
```

When the primary package has no package-scoped commands (all commands lack the `cd` prefix and none are detected), the Commands section is omitted:

```
# anatomia-cli

Primary package in anatomia-workspace.

## Full Project Context
See [AGENTS.md](../../AGENTS.md) at the project root for conventions, services, and constraints.
```

## File Changes

### `packages/cli/src/commands/init/assets.ts` (modify)
**What changes:** Add `generatePrimaryPackageAgentsMd()` as an exported async function. Add two call sites in `createClaudeConfiguration()` — one in the fresh-install branch (after `generateAgentsMd`), one in the merge branch (after `generateAgentsMd`). Both gated on monorepo + primaryPackage.
**Pattern to follow:** `generateAgentsMd()` at lines 318–438 — same fileExists guard, same lines-array builder, same fs.writeFile at end.
**Why:** This is where all init asset generation lives. Adding it elsewhere would fragment the file-generation logic.

### `packages/cli/tests/scaffolds/all-scaffolds.test.ts` (modify)
**What changes:** Add a new `describe('generatePrimaryPackageAgentsMd')` block that tests the generator function directly. Uses `createEmptyEngineResult()` with monorepo fields populated.
**Pattern to follow:** The existing `generateProjectContextScaffold` tests in the same file — create a result, call the function, assert on the returned string content.
**Why:** This test file already covers scaffold generators. The new function is a scaffold generator.

## Acceptance Criteria
- [ ] AC1: Running `ana init` on a monorepo with a detected primary package creates `{primaryPackage.path}/AGENTS.md`
- [ ] AC2: The generated file contains: package name, "Primary package in {project-name}", package-scoped commands (build/test/lint where available), and a pointer to root AGENTS.md
- [ ] AC3: If `{primaryPackage.path}/AGENTS.md` already exists, it is not overwritten
- [ ] AC4: Non-monorepo projects and monorepos without a detected primary package are unaffected
- [ ] AC5: Tests pass with `cd packages/cli && pnpm vitest run`
- [ ] AC6: No TypeScript or lint errors

## Testing Strategy

- **Unit tests:** Test `generatePrimaryPackageAgentsMd()` directly. The function should return the generated string (or accept a write callback) so tests don't need filesystem mocking. If the existing `generateAgentsMd` writes directly, match that pattern and use a temp directory instead.
  - Monorepo with primary package and all commands → full output with commands section
  - Monorepo with primary package and no commands → output without commands section
  - Non-monorepo (isMonorepo: false) → returns early / produces nothing
  - Primary package is null → returns early / produces nothing
  - File already exists → does not overwrite (needs filesystem for this case)
  - Relative path pointer is correct for different nesting depths (e.g., `packages/cli` → `../../AGENTS.md`, `apps/web` → `../../AGENTS.md`, `src` → `../AGENTS.md`)
- **Edge cases:**
  - Command with no `cd` prefix (pass through unchanged)
  - Command with `cd` prefix for a different path (pass through unchanged — only strip matching prefix)
  - Primary package path with single segment (`cli` → `../AGENTS.md`)

## Dependencies
None — all required data already exists on `EngineResult`.

## Constraints
- Merge-not-overwrite: never clobber an existing file. The `fileExists()` guard is mandatory.
- The function must handle `engineResult` being null (skip silently).
- No chalk/ora in the generator function itself — it's called from within the `createClaudeConfiguration` spinner context.

## Gotchas
- `generateAgentsMd` is currently a private function (not exported). The new function MUST be exported for testability. Add it to the module's exports.
- `primaryPackage.path` is relative to project root (e.g., `packages/cli`), NOT absolute. The output path is `path.join(cwd, primaryPackage.path, 'AGENTS.md')`.
- `path.relative()` from the package dir back to cwd will produce `../..` — then join with `AGENTS.md` for the pointer link. Use `path.posix.join` or manual string concatenation for the markdown link (forward slashes), not `path.join` which produces backslashes on Windows.
- The `cd packages/cli && ` prefix stripping must match EXACTLY what the command scoping produces. Check `state.ts` line ~341 for the pattern: it prepends `cd ${pkg.path} && `. The strip regex should be `new RegExp('^cd ' + escapeRegExp(pkg.path) + ' && ')` or a simple `startsWith` + slice.
- `makeTestCommandNonInteractive` is already applied to the root commands — don't apply it again when stripping the prefix. The commands in `engineResult.commands` are raw (pre-scoping). The `cd` prefix is added in `state.ts` for ana.json, not stored on engineResult. Re-read this: the root AGENTS.md uses `engineResult.commands` directly and calls `makeTestCommandNonInteractive` inline. The package AGENTS.md should do the same — call `makeTestCommandNonInteractive` on `engineResult.commands.test`, then show the result. There is NO `cd` prefix to strip because `engineResult.commands` doesn't have one. The `cd` prefix only exists in ana.json. This simplifies the approach significantly — just use the raw commands directly.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer named exports.
- Use `| null` for fields that were checked and found empty.
- Prefer early returns over nested conditionals.
- Explicit return types on all exported functions.
- No chalk/ora in engine files (this function is in commands/, so chalk is available, but the function itself doesn't need it — it runs inside an existing spinner).

### Pattern Extracts

Structural analog — `generateAgentsMd()` in assets.ts (lines 318–338, showing the shape):

```typescript
// assets.ts:318-338
async function generateAgentsMd(cwd: string, engineResult: EngineResult | null): Promise<void> {
  const destPath = path.join(cwd, 'AGENTS.md');
  if (await fileExists(destPath)) return;

  const projectName = await getProjectName(cwd);
  const lines: string[] = [];

  lines.push(`# ${projectName}`);
  lines.push('');

  if (engineResult) {
    const stackParts = getStackSummary(engineResult);
    if (stackParts.length > 0) {
      lines.push(`${stackParts.join(' · ')}`);
      lines.push('');
    }
  }
```

Call site pattern — both branches of `createClaudeConfiguration()`:

```typescript
// assets.ts:192 (fresh install branch)
    await generateAgentsMd(cwd, engineResult);  // Cross-tool AI standard

// assets.ts:240 (merge branch)
    await generateAgentsMd(cwd, engineResult);
```

`makeTestCommandNonInteractive` usage in the same function (assets.ts:341):

```typescript
      const testCmd = makeTestCommandNonInteractive(cmds.test, engineResult.stack.testing, cmds.all?.['test']);
      cmdLines.push(`- Test: \`${testCmd}\``);
```

### Checkpoint Commands

- After adding the function: `cd packages/cli && pnpm vitest run` — Expected: 1137 tests pass (no regressions)
- After adding tests: `cd packages/cli && pnpm vitest run` — Expected: 1137 + new tests pass
- Lint: `pnpm run lint`
- Type check: pre-commit hook runs `tsc --noEmit`

### Build Baseline
- Current tests: 1137 passed
- Current test files: 86 passed
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected ~1145+ tests in 86 files (new tests added to existing file)
- Regression focus: `tests/scaffolds/all-scaffolds.test.ts`, `tests/commands/injectors.test.ts` (both reference AGENTS.md generation)
