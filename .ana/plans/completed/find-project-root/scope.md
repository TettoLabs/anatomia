# Scope: Add findProjectRoot utility for subdirectory support

**Created by:** Ana
**Date:** 2026-04-16

## Intent

Running `ana work status` (or any pipeline command) from a subdirectory like `packages/cli/src/` fails because it looks for `.ana/` only in CWD. The CLI should walk up the directory tree to find the project root, matching how git and other tools behave.

Two commands intentionally stay at CWD:
- `init` — creates `.ana/` where you are (that's the point)
- `scan` — operates on a target path argument, scans what you point it at

Everything else should find the project root.

## Complexity Assessment

- **Size:** medium
- **Files affected:**
  - `packages/cli/src/utils/validators.ts` (add function)
  - `packages/cli/src/commands/artifact.ts`
  - `packages/cli/src/commands/work.ts`
  - `packages/cli/src/commands/verify.ts`
  - `packages/cli/src/commands/pr.ts`
  - `packages/cli/src/commands/check.ts`
  - `packages/cli/src/commands/setup.ts`
  - `packages/cli/src/commands/proof.ts`
  - `packages/cli/src/commands/agents.ts`
  - `packages/cli/src/commands/symbol-index.ts`
- **Blast radius:** Low — mechanical replacement of `process.cwd()` with utility call. No behavioral change when run from project root.
- **Estimated effort:** 1-2 hours
- **Multi-phase:** no

## Approach

Add a synchronous `findProjectRoot()` utility that walks up from CWD looking for a directory containing `.ana/`. Commands that need project context call this utility instead of using `process.cwd()` directly. The utility throws with a clear error message if no `.ana/` is found.

Sync is appropriate here — commands call this early and the check is a single `existsSync` per directory level. Async would add complexity for no benefit.

## Acceptance Criteria

- AC1: `findProjectRoot()` returns the directory containing `.ana/` when called from any subdirectory
- AC2: `findProjectRoot()` returns CWD when `.ana/` exists in CWD
- AC3: `findProjectRoot()` throws with message "No .ana/ found in {startDir} or any parent directory. Run ana init from your project root." when no `.ana/` exists in the tree
- AC4: Commands artifact, work, verify, pr, check, setup, proof, agents, symbol-index use `findProjectRoot()` instead of `process.cwd()` for project root
- AC5: Commands init and scan continue to use CWD/target path directly (no walking)
- AC6: Running `ana work status` from a subdirectory of an initialized project succeeds

## Edge Cases & Risks

- **Filesystem root:** Walk should stop at filesystem root, not infinite loop. Standard `path.dirname()` behavior handles this (returns same path when at root).
- **Symlinks:** If user is in a symlinked directory, walk follows the real path. This matches git behavior.
- **Permission errors:** If a parent directory is unreadable, the walk will fail. This is rare and acceptable — the error will surface naturally.
- **Multiple .ana/ directories:** Walk finds the nearest one (closest ancestor). This is correct — nested projects should use their own context.

## Rejected Approaches

- **Async implementation:** Added complexity for no benefit. The check is fast and commands need the result immediately.
- **Caching the result:** Over-engineering. The walk is cheap and commands don't call it repeatedly in hot paths.
- **Environment variable override:** Adds configuration surface for a rare use case. Users can `cd` to project root if needed.

## Open Questions

None.

## Exploration Findings

### Patterns Discovered

- `utils/validators.ts` (lines 1-87): Contains `pathExists()` async helper — good home for `findProjectRoot()`
- `utils/git-operations.ts`: Pattern for utility functions called from multiple commands

### Constraints Discovered

- [OBSERVED] Commands use `process.cwd()` directly — no abstraction exists today
- [OBSERVED] Error messages vary — `setup.ts` says "Run \`ana init\` first to create .ana/ structure", `verify.ts` says "Run \`ana init\` first"

### Test Infrastructure

- Tests live in `packages/cli/tests/` with Vitest
- Unit tests for utilities should go in `tests/utils/`

## For AnaPlan

### Structural Analog

`utils/git-operations.ts` — utility functions (`readArtifactBranch`, `getCurrentBranch`) exported and called from multiple commands. Same pattern: export from utils, import in commands.

### Relevant Code Paths

- `packages/cli/src/utils/validators.ts` — add `findProjectRoot()` here
- `packages/cli/src/commands/work.ts` lines 196, 245, 264, 700, 833, 834, 920 — multiple `process.cwd()` calls
- `packages/cli/src/commands/artifact.ts` lines 543, 630, 683, 703, 742, 858 — multiple `process.cwd()` calls
- `packages/cli/src/commands/verify.ts` lines 74, 309, 316 — uses `process.cwd()` as default param
- `packages/cli/src/commands/pr.ts` line 150 — `const projectRoot = process.cwd()`
- `packages/cli/src/commands/check.ts` line 1447 — `const cwd = process.cwd()`
- `packages/cli/src/commands/setup.ts` line 54 — `const cwd = process.cwd()`
- `packages/cli/src/commands/proof.ts` line 225 — `process.cwd()` in path join
- `packages/cli/src/commands/agents.ts` line 59 — `process.cwd()` in path join
- `packages/cli/src/commands/symbol-index.ts` lines 434-435 — `const cwd = process.cwd()`

### Patterns to Follow

- `validators.ts` for the utility signature and JSDoc style
- `git-operations.ts` for the export/import pattern across commands

### Known Gotchas

- `verify.ts` line 74 uses `process.cwd()` as a default parameter value. Replace with explicit call inside function body.
- Some commands have multiple `process.cwd()` calls — ensure all are replaced consistently.
- Error message standardization: use the exact message from AC3, replacing varied messages.

### Things to Investigate

- Whether any commands intentionally support running from outside the project (none should, but verify during implementation)
