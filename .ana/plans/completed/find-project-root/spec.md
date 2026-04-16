# Spec: Add findProjectRoot utility for subdirectory support

**Created by:** AnaPlan
**Date:** 2026-04-16
**Scope:** .ana/plans/active/find-project-root/scope.md

## Approach

Add a synchronous `findProjectRoot()` function to `validators.ts` that walks up the directory tree from a starting point looking for a directory containing `.ana/`. Commands that need project context call this at their entry point instead of `process.cwd()`.

The function signature is `findProjectRoot(startDir: string = process.cwd()): string`. The parameter enables hermetic testing without mocking `process.cwd()`. Commands call it bare; tests pass explicit paths.

The walk uses `fs.existsSync(path.join(current, '.ana'))` at each level, ascending via `path.dirname()`. The loop terminates when `path.dirname(current) === current` (filesystem root reached). If no `.ana/` is found, throw an `Error` with the message from AC3.

`readArtifactBranch` in `git-operations.ts` also hardcodes `process.cwd()`. Since commands will resolve the root via `findProjectRoot()` and then call `readArtifactBranch()`, the two would disagree on root when running from a subdirectory. Fix: add an optional `projectRoot` parameter to `readArtifactBranch` so callers can pass their resolved root. Default stays `process.cwd()` for backward compatibility.

Two commands intentionally stay at CWD and must NOT use `findProjectRoot`:
- `init` — creates `.ana/` at the target location
- `scan` — operates on a target path argument

## Output Mockups

**Success (silent):** No output change. Commands behave identically when run from the project root.

**From subdirectory:** `ana work status` from `packages/cli/src/` walks up, finds `.ana/` at project root, proceeds normally.

**No .ana/ in tree:**
```
Error: No .ana/ found in /Users/dev/random-dir or any parent directory. Run ana init from your project root.
```

## File Changes

### packages/cli/src/utils/validators.ts (modify)
**What changes:** Add `findProjectRoot()` — a sync function that walks up from `startDir` looking for `.ana/`. Requires adding `import * as fsSync from 'node:fs'` since the existing file only imports `node:fs/promises`.
**Pattern to follow:** Same file's JSDoc style. The function is sync (unlike the existing async helpers) because it's called at command entry points that need the result immediately.
**Why:** Without this, every command that uses `process.cwd()` fails when run from a subdirectory.

### packages/cli/src/utils/git-operations.ts (modify)
**What changes:** Add optional `projectRoot` parameter to `readArtifactBranch(projectRoot?: string)`. Replace the hardcoded `process.cwd()` on line 26 with the parameter, defaulting to `process.cwd()`. No behavioral change for callers that don't pass it.
**Pattern to follow:** Same function's existing style.
**Why:** If commands resolve root via `findProjectRoot()` but `readArtifactBranch` still uses `process.cwd()`, the two disagree on project root when running from a subdirectory.

### packages/cli/src/commands/artifact.ts (modify)
**What changes:** Import `findProjectRoot`. Replace `process.cwd()` calls with `findProjectRoot()` at function entry points. Pass the resolved root to `readArtifactBranch()`. There are two main entry points in this file: the single-save flow (around line 630) and save-all (around line 742), plus standalone `process.cwd()` calls at lines 543, 683, 703. Each entry point resolves the root once and threads it through.
**Pattern to follow:** The save-all flow already assigns `const projectRoot = process.cwd()` — change the right side to `findProjectRoot()`.
**Why:** Artifact commands are the most frequently used pipeline commands and have the most `process.cwd()` calls.

### packages/cli/src/commands/work.ts (modify)
**What changes:** Import `findProjectRoot`. In `getWorkStatus` (line 581) and `completeWork` (line 798), resolve root via `findProjectRoot()` and pass to `readArtifactBranch()`. Replace `process.cwd()` usage in `discoverSlugs` (line 196) and other locations with the resolved root threaded from the caller.
**Pattern to follow:** `pr.ts` pattern — `const projectRoot = findProjectRoot()` at function top.
**Why:** `ana work status` is the command most likely to be run from a subdirectory.

### packages/cli/src/commands/verify.ts (modify)
**What changes:** Import `findProjectRoot`. Replace the default parameter `projectRoot: string = process.cwd()` in `runContractPreCheck` (line 74) with `projectRoot: string = findProjectRoot()`. Also update line 309/316 area if there are other `process.cwd()` references.
**Pattern to follow:** Same function signature style, just different default.
**Why:** Verify is a pipeline command that should work from subdirectories.

### packages/cli/src/commands/pr.ts (modify)
**What changes:** Import `findProjectRoot`. Replace `const projectRoot = process.cwd()` (line 150) with `const projectRoot = findProjectRoot()`. Pass to `readArtifactBranch(projectRoot)`.
**Pattern to follow:** Simplest change — one line replacement.
**Why:** PR creation is a pipeline command.

### packages/cli/src/commands/check.ts (modify)
**What changes:** Import `findProjectRoot`. Replace `const cwd = process.cwd()` (line 1447) with `const cwd = findProjectRoot()`.
**Pattern to follow:** Same variable name, different source.
**Why:** Check validates context files relative to project root.

### packages/cli/src/commands/setup.ts (modify)
**What changes:** Import `findProjectRoot`. Replace `const cwd = process.cwd()` (line 54) with `const cwd = findProjectRoot()`.
**Pattern to follow:** Same variable name, different source.
**Why:** Setup operates on `.ana/` structure.

### packages/cli/src/commands/proof.ts (modify)
**What changes:** Import `findProjectRoot`. Replace `process.cwd()` in the path.join on line 225 with a `findProjectRoot()` call at the top of the action handler.
**Pattern to follow:** Assign to `const projectRoot` at handler top, use throughout.
**Why:** Proof reads from `.ana/proof_chain.json`.

### packages/cli/src/commands/agents.ts (modify)
**What changes:** Import `findProjectRoot`. Replace `process.cwd()` (line 59) with `findProjectRoot()`.
**Pattern to follow:** Same inline replacement pattern.
**Why:** Agents lists from `.claude/agents` relative to project root.

### packages/cli/src/commands/symbol-index.ts (modify)
**What changes:** Import `findProjectRoot`. Replace `const cwd = process.cwd()` (lines 434-435) with `const cwd = findProjectRoot()`.
**Pattern to follow:** Same variable name, different source.
**Why:** Symbol index operates on `.ana/state`.

### packages/cli/tests/utils/findProjectRoot.test.ts (create)
**What changes:** Unit tests for `findProjectRoot()` covering: CWD has `.ana/`, subdirectory walk, filesystem root (no `.ana/`), nested `.ana/` (finds nearest).
**Pattern to follow:** `proofSummary.test.ts` — `fs.mkdtemp` in `beforeEach`, `fs.rm` in `afterEach`, real filesystem assertions.
**Why:** Core utility needs direct coverage. The command-level behavior is tested indirectly via existing command tests.

## Acceptance Criteria

- [ ] AC1: `findProjectRoot()` returns the directory containing `.ana/` when called from any subdirectory
- [ ] AC2: `findProjectRoot()` returns CWD when `.ana/` exists in CWD
- [ ] AC3: `findProjectRoot()` throws with message "No .ana/ found in {startDir} or any parent directory. Run ana init from your project root." when no `.ana/` exists in the tree
- [ ] AC4: Commands artifact, work, verify, pr, check, setup, proof, agents, symbol-index use `findProjectRoot()` instead of `process.cwd()` for project root
- [ ] AC5: Commands init and scan continue to use CWD/target path directly (no walking)
- [ ] AC6: Running `ana work status` from a subdirectory of an initialized project succeeds
- [ ] AC7: `readArtifactBranch` accepts optional `projectRoot` parameter
- [ ] AC8: No behavioral change when commands are run from the project root (existing behavior preserved)
- [ ] AC9: All existing tests pass without modification

## Testing Strategy

- **Unit tests:** Test `findProjectRoot()` directly with controlled temp directory trees. Four scenarios: `.ana/` in startDir, `.ana/` two levels up, no `.ana/` anywhere (throws), nested `.ana/` directories (finds nearest). Each test creates a temp dir tree with `fs.mkdtemp`, creates `.ana/` at the right level, calls `findProjectRoot(deepSubDir)`, and asserts the return value.
- **Integration:** Existing command tests serve as integration coverage. AC9 confirms no regressions — if commands still work from project root, the default `process.cwd()` path is correct.
- **Edge cases:** Filesystem root test — create a temp dir without `.ana/`, call `findProjectRoot(tempDir)`, expect the throw. This covers the "walk stops at root" behavior without actually walking to `/`.

## Dependencies

None. `validators.ts` already exists. All command files already exist.

## Constraints

- Sync only. No async. The function is called at command entry points that need the result before proceeding.
- The error must be an `Error` throw, not `process.exit(1)`. Commands catch it and handle the exit. The utility should not have CLI concerns (chalk, process.exit).
- `init` and `scan` must not be touched. They intentionally operate on CWD/target path.

## Gotchas

- **verify.ts default parameter:** Line 74 uses `process.cwd()` as a default parameter value: `projectRoot: string = process.cwd()`. Changing this to `findProjectRoot()` means the function call happens at call time, not definition time. This is correct behavior but verify that no caller passes an explicit empty string or undefined expecting the default to kick in.
- **`discoverSlugs` in work.ts uses a relative path:** Line 192 starts with `const plansPath = '.ana/plans/active'` then joins with `process.cwd()` on line 196. The function receives no `projectRoot` parameter — it needs one added, or the caller must set up context. Thread `projectRoot` from `getWorkStatus` into `discoverSlugs`.
- **artifact.ts has two separate flows:** Single-save (around line 630) and save-all (around line 742) each independently assign `projectRoot`. Both need updating. There are also standalone `process.cwd()` calls at lines 543, 683, 703 that live in different functions — trace each one to its entry point.
- **Import naming for sync fs:** `validators.ts` currently imports `node:fs/promises` as `fs`. The new function needs sync `existsSync`. Import `node:fs` under a different name (e.g., `import * as fsSync from 'node:fs'`) or use the pattern from `git-operations.ts` which imports `node:fs` directly. Since `findProjectRoot` is the only sync function in validators.ts, match whatever keeps the file clean.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer named exports. No default exports.
- Prefer early returns over nested conditionals.
- Explicit return types on all exported functions.
- Tests use real temp directories for isolation — `fs.mkdtemp()` in `beforeEach`, `fs.rm()` in `afterEach`.
- Tests that change the working directory must save and restore original cwd in `afterEach`.

### Pattern Extracts

**validators.ts — JSDoc and function style (lines 64-87):**
```typescript
/**
 * Check if a filesystem path exists (file OR directory).
 *
 * Uses `fs.access()`, which returns true for any existing entry — regular
 * files, directories, symlinks, etc. Use this when the caller doesn't care
 * whether the path is a file or a directory, only whether something lives
 * at that path.
 *
 * @param targetPath - Path to check (file or directory)
 * @returns true if anything exists at the path, false otherwise
 */
export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}
```

**git-operations.ts — readArtifactBranch signature and process.cwd() usage (lines 25-48):**
```typescript
export function readArtifactBranch(): string {
  const anaJsonPath = path.join(process.cwd(), '.ana', 'ana.json');

  if (!fs.existsSync(anaJsonPath)) {
    console.error(chalk.red('Error: No .ana/ana.json found. Run `ana init` first.'));
    process.exit(1);
  }
  // ...
  return config['artifactBranch'] as string;
}
```

**proofSummary.test.ts — temp dir test pattern (lines 1-19):**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('generateProofSummary', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'proof-summary-test-'));
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });
```

### Checkpoint Commands

- After adding `findProjectRoot` to validators.ts: `(cd packages/cli && pnpm vitest run tests/utils/findProjectRoot.test.ts)` — Expected: new tests pass
- After all command wiring: `(cd packages/cli && pnpm vitest run)` — Expected: all 1137+ tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1137 passed
- Current test files: 86 passed
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1145 tests in 87 files (1 new test file with ~8 tests)
- Regression focus: Any command tests that mock or assert on `process.cwd()` behavior
