# Spec: Monorepo Root Commands

**Created by:** AnaPlan
**Date:** 2026-05-17
**Scope:** .ana/plans/active/monorepo-root-commands/scope.md

## Approach

In monorepos, `createAnaJson` scopes `build` and `test` commands to the primary package but discards the root-level commands. The root commands are needed for project-wide operations (compile all workspace packages in dependency order, run all tests). The data already exists in `result.commands.build` / `result.commands.test` before the monorepo scoping block overwrites them.

Capture the root commands as `buildRoot` and `testRoot` inside the `commands` object before scoping runs. The worktree's `runBuildCommand` prefers `buildRoot` over `build` — this ensures `pnpm run build` (turbo across all packages) runs instead of `(cd packages/cli && pnpm run build)` which misses dependency packages. `getBuildCommandString` gets the same fallback chain for display consistency.

No schema changes to `anaJsonSchema.ts` — the `commands` field is `z.record(z.string(), z.unknown())` which handles new keys via passthrough. The work is in state.ts (write), worktree.ts (consume), preserveUserState (sanitize), and templates (clarify).

`testRoot` is written to ana.json for agent consumption (agents read it to choose between root-level and package-scoped test runs) but has no mechanical consumer in code yet. No `runTestCommand` exists in the worktree — that's future work.

## Output Mockups

### ana.json for monorepo (after init)

```json
{
  "commands": {
    "build": "(cd packages/cli && pnpm run build)",
    "test": "(cd packages/cli && pnpm vitest run)",
    "lint": "(cd packages/cli && pnpm run lint)",
    "dev": "pnpm run dev",
    "buildRoot": "pnpm run build",
    "testRoot": "pnpm run test"
  }
}
```

### ana.json for single-package project (unchanged)

```json
{
  "commands": {
    "build": "pnpm run build",
    "test": "pnpm vitest run",
    "lint": "pnpm run lint",
    "dev": "pnpm run dev"
  }
}
```

No `buildRoot` or `testRoot` keys appear — they are only added when the project is a monorepo AND root-level scripts exist.

### worktree-context.md Build Status (monorepo)

```
Build command `pnpm run build` succeeded. Artifacts should be present.
```

Previously this showed the scoped command. Now it shows the root command (via `buildRoot`), which is what actually ran.

## File Changes

### `packages/cli/src/commands/init/state.ts` (modify)

**What changes:** Before the monorepo scoping block, capture `result.commands.build` and `result.commands.test` as `buildRootCmd` and `testRootCmd`. After scoping, if the project is a monorepo and the root commands exist, add them as `buildRoot` and `testRoot` in the commands object. Also add `'buildRoot'` and `'testRoot'` to the blank-string sanitization list in `preserveUserState`.

**Pattern to follow:** The existing monorepo scoping block at lines 415-450 — same conditional structure, same variables. The sanitization follows the existing `for (const key of ['test', 'build', 'lint'])` pattern at line 558.

**Why:** Without this, root commands are lost during scoping. The worktree builds only the primary package, missing dependency packages that cross-package work requires.

### `packages/cli/src/utils/worktree.ts` (modify)

**What changes:** `runBuildCommand` reads `config?.commands?.buildRoot` first, falls back to `config?.commands?.build`. `getBuildCommandString` gets the same fallback: `buildRoot` → `build` → `'pnpm run build'`.

**Pattern to follow:** The existing null check at line 454 (`if (typeof buildCmd !== 'string' || !buildCmd.trim())`). Apply the same guard to the resolved command after the fallback chain.

**Why:** Without this, the worktree runs the scoped build command which misses dependency packages. The display function must agree with the execution function on which command ran.

### `packages/cli/templates/.claude/agents/ana-build.md` (modify)

**What changes:** Three sections get clarified:
1. **Step 1 (Load Context, ~line 34):** Change "Note `commands` (for baseline tests and checkpoint commands)" to clarify that `commands.buildRoot` or `commands.build` is for baseline build, and the spec's Build Brief checkpoint commands are for focused testing.
2. **Step 4 (Baseline, ~line 105):** Clarify: use `buildRoot` (if present) or `build` from ana.json for the initial build. Use Build Brief checkpoint commands for test runs — not `commands.test`.
3. **Build Report template (lines 369-373):** Replace `{build command from ana.json commands.build}` / `{test command from ana.json commands.test}` with guidance to use the commands from the spec's Build Brief checkpoint section, plus `buildRoot` or `build` for the build step.

**Pattern to follow:** The existing Build Brief reference pattern already in the template (line 44, 107, 194).

**Why:** Agents currently see competing instructions — ana.json `commands.test` vs Build Brief checkpoint commands. The Build Brief has the right scope for the current work; ana.json has the right scope for project-wide baseline.

### `packages/cli/templates/.claude/agents/ana-verify.md` (modify)

**What changes:** Two sections:
1. **Step 5 (Load Context, ~line 81):** Clarify that `commands` has build/lint for project-wide runs, but the spec's Build Brief checkpoint commands should be used for focused test verification.
2. **Step 2 (Run tests, lines 170-174):** Change the template block to: use `buildRoot` or `build` for the build step, Build Brief checkpoint commands for the test step, ana.json `commands.lint` for lint.

**Pattern to follow:** The existing template placeholder style (`{...}`).

**Why:** Verify currently runs `commands.test` which tests the whole project. For cross-package work, this is correct. But for focused verification of a specific feature, Build Brief checkpoint commands target the right package and test files.

### `.claude/agents/ana-build.md` (modify)

**What changes:** Identical to the product template change. These files are currently in sync (verified by diff — 0 differences, 536 lines each).

**Why:** Dogfood must match product. Edit product template first, then copy verbatim to dogfood.

### `.claude/agents/ana-verify.md` (modify)

**What changes:** Identical to the product template change. Currently in sync (548 lines each, 0 diff).

**Why:** Same as above.

## Acceptance Criteria

- [ ] AC1: For monorepos with root-level build/test scripts, `ana init` produces ana.json with `buildRoot` and `testRoot` fields alongside the existing scoped `build` and `test`.
- [ ] AC2: For single-package projects, ana.json has no `buildRoot` or `testRoot` fields. Behavior is identical to current.
- [ ] AC3: `runBuildCommand` in worktree.ts uses `buildRoot` when present, falls back to `build` when not, returns null when neither exists.
- [ ] AC4: Existing ana.json files without `buildRoot`/`testRoot` survive re-init — `preserveUserState` handles the new fields correctly via passthrough.
- [ ] AC5: The Build template distinguishes baseline commands (ana.json `buildRoot`/`build`) from focused commands (Build Brief checkpoint commands). No competing instructions.
- [ ] AC6: The Verify template uses Build Brief checkpoint commands for test runs, not `commands.test` from ana.json.
- [ ] AC7: The Build report Verification Commands section references the commands Verify should actually run (Build Brief checkpoint commands), not hardcoded ana.json references.
- [ ] Tests pass with `(cd packages/cli && pnpm vitest run)`
- [ ] No lint errors with `pnpm run lint`
- [ ] `getBuildCommandString` prefers `buildRoot` over `build`, matching `runBuildCommand`
- [ ] Dogfood templates match product templates after changes

## Testing Strategy

- **Unit tests (state.ts):** Add to `monorepoCommandScoping.test.ts` — the structural analog. New cases: monorepo with root build script produces `buildRoot`, monorepo with root test script produces `testRoot`, single-repo has no `buildRoot`/`testRoot`, monorepo without root scripts has no `buildRoot`/`testRoot`.
- **Unit tests (worktree.ts):** `runBuildCommand` and `getBuildCommandString` are internal (not exported), so test via the existing integration pattern in `worktree.test.ts` — create a test project with ana.json containing `buildRoot`, verify the worktree build uses it. Alternatively, if the functions remain unexported, test behavior through `createWorktree` which calls `runBuildCommand` internally.
- **Unit tests (schema):** Add to `anaJsonSchema.test.ts` — verify that `buildRoot`/`testRoot` inside commands survive parse via passthrough (they should already, but the test documents the contract).
- **Unit tests (preserveUserState):** Verify that blank `buildRoot`/`testRoot` strings get sanitized to fresh values, matching the existing pattern for `build`/`test`/`lint`.
- **Edge cases:** Monorepo with root build but no root test (only `buildRoot` set). Root package.json with no scripts at all (neither field set). `buildRoot` set to empty string in existing ana.json (sanitized on re-init).

## Dependencies

None. All source data (`result.commands.build`, `result.commands.test`) already exists in the scan pipeline.

## Constraints

- `commands` schema stays as `z.record(z.string(), z.unknown())` — no type narrowing.
- Template changes must work for all project types (not just TypeScript monorepos). Template text must be generic enough for Python, Go, Rust projects.
- Dogfood templates must be byte-identical to product templates after changes.
- `testRoot` has no mechanical consumer — it's agent-readable only. Don't add a `runTestCommand`.

## Gotchas

- **Capture root commands BEFORE scoping overwrites them.** `buildCmd` is initialized from `result.commands.build` at line 418, then overwritten inside the monorepo scoping block. The root value must be saved to a separate variable before the scoping conditional.
- **`result.commands.test` vs `testCmd`.** The test command goes through `makeTestCommandNonInteractive` first (line 400), then gets scoped. The ROOT test command is `result.commands.test` (or its non-interactive variant) — not `testCmd` after scoping. For `testRoot`, use the root-level command from `result.commands.test` (processed through `makeTestCommandNonInteractive` but NOT scoped to primary package).
- **Don't add `buildRoot`/`testRoot` when values are null.** If the root package.json has no build script, `result.commands.build` is null. Don't write `buildRoot: null` — just omit the key. The worktree fallback chain handles absence naturally.
- **`preserveUserState` sanitizes by key name inside `commands`.** The loop at line 558 iterates `['test', 'build', 'lint']`. Add `'buildRoot'` and `'testRoot'` to this array. If a user accidentally blanks them via `ana config set`, re-init restores the detected value.
- **Template prose, not code.** The Build report template at lines 369-373 is guidance text that AnaBuild fills in. It's not executed code. The "fix" is rewording the placeholder text, not changing program behavior.
- **`runBuildCommand` and `getBuildCommandString` are both unexported.** They're internal to worktree.ts. Testing them requires going through the public API (`createWorktree`) or adding targeted unit tests with mocked fs reads.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer early returns over nested conditionals.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Always use `--run` with `pnpm vitest` to avoid watch mode hang.
- Co-author trailer: `Ana <build@anatomia.dev>`

### Pattern Extracts

**state.ts lines 415-450 — monorepo scoping block (the insertion point):**

```typescript
  // Scope build and lint commands to primary package in monorepos.
  // Unlike test scoping (which maps framework → direct runner), build/lint
  // reads the primary package's package.json to find the actual script key.
  let buildCmd = result.commands.build || null;
  let lintCmd = result.commands.lint || null;

  if (cwd && result.monorepo.isMonorepo && result.monorepo.primaryPackage) {
    const pkg = result.monorepo.primaryPackage;
    const pm = result.commands.packageManager || 'pnpm';
    const prefix = pm === 'npm' ? 'npm run' : `${pm} run`;

    try {
      const pkgJsonPath = path.join(cwd, pkg.path, 'package.json');
      const pkgContent = await fs.readFile(pkgJsonPath, 'utf-8');
      const pkgJson = JSON.parse(pkgContent);
      const scripts = pkgJson.scripts || {};

      // Build: first match — same key order as detectCommands
      for (const key of ['build', 'compile', 'tsc']) {
        if (scripts[key]) {
          buildCmd = `(cd ${pkg.path} && ${prefix} ${key})`;
          break;
        }
      }
    } catch {
      // Missing or malformed package.json — keep root commands
    }
  }
```

**worktree.ts lines 446-471 — runBuildCommand (the fallback target):**

```typescript
function runBuildCommand(wtPath: string): boolean | null {
  const anaJsonPath = path.join(wtPath, '.ana', 'ana.json');

  try {
    const raw = fs.readFileSync(anaJsonPath, 'utf-8');
    const config = JSON.parse(raw);
    const buildCmd = config?.commands?.build;

    if (typeof buildCmd !== 'string' || !buildCmd.trim()) {
      return null;
    }

    const result = spawnSync(buildCmd, {
      cwd: wtPath,
      stdio: 'pipe',
      encoding: 'utf-8',
      shell: true,
      timeout: 300000,
    });

    return result.status === 0;
  } catch {
    return null;
  }
}
```

**worktree.ts lines 425-434 — getBuildCommandString:**

```typescript
function getBuildCommandString(wtPath: string): string {
  try {
    const raw = fs.readFileSync(path.join(wtPath, '.ana', 'ana.json'), 'utf-8');
    const config = JSON.parse(raw);
    const cmd = config?.commands?.build;
    return typeof cmd === 'string' ? cmd : 'pnpm run build';
  } catch {
    return 'pnpm run build';
  }
}
```

**preserveUserState sanitization (state.ts lines 553-563):**

```typescript
    const mergedCommands = merged.commands as Record<string, unknown> | undefined;
    if (mergedCommands) {
      const freshCommands = (newAnaConfig['commands'] ?? {}) as Record<string, unknown>;
      for (const key of ['test', 'build', 'lint']) {
        if (mergedCommands[key] === '') {
          mergedCommands[key] = freshCommands[key] ?? null;
        }
      }
    }
```

**monorepoCommandScoping.test.ts — test helper pattern (the structural analog for new tests):**

```typescript
  function makeMonorepoResult(overrides?: {
    pm?: string;
    pkgPath?: string;
    build?: string | null;
    lint?: string | null;
    dev?: string | null;
    testing?: string[];
  }) {
    const pm = overrides?.pm ?? 'pnpm';
    const pkgPath = overrides?.pkgPath ?? 'packages/cli';
    const result = createEmptyEngineResult();
    result.commands = {
      build: overrides?.build ?? `${pm} run build`,
      test: `${pm} run test`,
      lint: overrides?.lint ?? `${pm} run lint`,
      dev: overrides?.dev ?? `${pm} run dev`,
      packageManager: pm,
      all: { test: 'turbo run test' },
    };
    // ...
  }
```

### Proof Context

- `state.ts` — finding `monorepo-build-scoping-C5`: pkg.path injected into shell command without sanitization. Known issue, out of scope. Don't introduce new unsanitized paths.
- `worktree.ts` — finding `worktree-build-step-C3`: `getBuildCommandString` re-reads ana.json with misleading fallback. This spec partially addresses it by making the fallback chain match `runBuildCommand`. The duplicate I/O remains (separate fix).

### Checkpoint Commands

- After state.ts changes: `(cd packages/cli && pnpm vitest run tests/commands/init/monorepoCommandScoping.test.ts)` — Expected: existing 12 tests pass + new tests pass
- After worktree.ts changes: `(cd packages/cli && pnpm vitest run tests/utils/worktree.test.ts)` — Expected: existing tests pass + new tests pass
- After schema test additions: `(cd packages/cli && pnpm vitest run tests/commands/init/anaJsonSchema.test.ts)` — Expected: existing 12 tests pass + new tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: all tests pass, no regressions
- Lint: `pnpm run lint`

### Build Baseline

- Current tests: 2458 passed, 2 skipped (2460 total)
- Current test files: 107
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~2475+ tests in 107 files (new tests added to existing test files)
- Regression focus: `monorepoCommandScoping.test.ts` (existing 12 tests verify scoping behavior that this change extends), `worktree.test.ts` (existing tests verify worktree creation which calls `runBuildCommand`), `anaJsonSchema.test.ts` (existing passthrough tests)
