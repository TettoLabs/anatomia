# Scope: Walk-up root resolution for ana commands

**Created by:** Ana
**Date:** 2026-04-16

## Intent
When build agents run tests from a package subdirectory (`cd packages/cli && pnpm vitest run`), subsequent ana commands like `ana artifact save` fail with "No .ana/ana.json found" because every command assumes `process.cwd()` is the project root. Ana should find `.ana/` from any subdirectory, the same way git finds `.git/` from anywhere inside a repo.

## Complexity Assessment
- **Size:** medium
- **Files affected:**
  - `packages/cli/src/utils/git-operations.ts` — add `findProjectRoot()`, update `readArtifactBranch()` to use it
  - `packages/cli/src/commands/artifact.ts` — 5 callsites
  - `packages/cli/src/commands/work.ts` — 8 callsites
  - `packages/cli/src/commands/verify.ts` — 3 callsites
  - `packages/cli/src/commands/pr.ts` — 1 callsite
  - `packages/cli/src/commands/check.ts` — 1 callsite
  - `packages/cli/src/commands/setup.ts` — 1 callsite
  - `packages/cli/src/commands/proof.ts` — 1 callsite
  - `packages/cli/src/commands/agents.ts` — 1 callsite
  - `packages/cli/src/commands/symbol-index.ts` — 1 callsite
  - Tests for `findProjectRoot()`
- **Blast radius:** Low. Behavioral change only when cwd is a subdirectory — existing behavior (cwd = project root) is unchanged because the walk-up finds `.ana/` immediately. `init` and `scan` are explicitly excluded.
- **Estimated effort:** ~2 hours
- **Multi-phase:** no

## Approach
Add a `findProjectRoot()` utility that walks up from `process.cwd()` looking for `.ana/ana.json`, returning the directory that contains it. Replace `process.cwd()` with `findProjectRoot()` in all commands except `init` and `scan`. Update `readArtifactBranch()` to accept an optional root parameter (defaulting to `findProjectRoot()`), since it already hardcodes the same `process.cwd()` assumption.

The function lives in `utils/git-operations.ts` alongside the existing root-dependent utilities. No new files needed — it's a leaf utility in the same family as `readArtifactBranch` and `getCurrentBranch`.

## Acceptance Criteria
- AC1: `findProjectRoot()` returns the nearest ancestor directory containing `.ana/ana.json`, starting from cwd
- AC2: `findProjectRoot()` called from the project root returns the project root (no behavior change for existing usage)
- AC3: When no `.ana/ana.json` exists in any ancestor, the error message is: "No .ana/ found in {cwd} or any parent directory. Run `ana init` from your project root."
- AC4: `ana artifact save` works from `packages/cli/` subdirectory
- AC5: `ana work status` works from `packages/cli/` subdirectory
- AC6: `ana init` still uses `process.cwd()` — never walks up
- AC7: `ana scan` still uses its target path argument or `process.cwd()` — never walks up
- AC8: `readArtifactBranch()` uses the resolved root, not `process.cwd()`
- AC9: All 9 affected commands (artifact, work, verify, pr, check, setup, proof, agents, symbol-index) use the resolved root

## Edge Cases & Risks
- **Filesystem root** — walk-up must stop at `/` (or drive root on Windows), not loop infinitely. `path.dirname()` returns the same path at root, which is the termination signal.
- **Nested `.ana/` directories** — unlikely but possible (monorepo with per-package `.ana/`). Nearest-ancestor wins, matching git's behavior. This is correct — the innermost `.ana/` is the one the user intended.
- **Symlinks** — `path.resolve()` already resolves symlinks in cwd. No special handling needed.
- **Performance** — walk-up is O(depth), max ~20 `existsSync` calls. Negligible.
- **Commands that also use cwd for other purposes** — `agents.ts` uses `process.cwd()` for `.claude/agents` which is project-root-relative too, so it should also use the resolved root.

## Rejected Approaches
- **Resolve once at CLI entry, pass via Commander context** — Cleaner long-term but changes the `register*Command` contract for every command. Overkill for this fix. Can be refactored later if the pattern grows.
- **Environment variable (`ANA_ROOT`)** — Adds configuration surface. The walk-up is deterministic and sufficient.
- **Using `git rev-parse --show-toplevel`** — Ties ana to git. The `.ana/` walk-up is independent and works in non-git projects.

## Open Questions
- None — all items resolved during scoping.

## Exploration Findings

### Patterns Discovered
- `git-operations.ts`: Two existing utilities (`readArtifactBranch`, `getCurrentBranch`) — both leaf functions, both assume cwd is root. `findProjectRoot()` fits naturally here.
- `readArtifactBranch()` hardcodes `path.join(process.cwd(), '.ana', 'ana.json')` at line 26 — this is the function that produces the exact error message the user reported.
- Commands use two patterns: `const cwd = process.cwd()` then reference `cwd`, or inline `process.cwd()` directly. Both need updating.
- `verify.ts` line 74 already has `projectRoot: string = process.cwd()` as a default parameter — cleanest callsite to update, just change the default.

### Constraints Discovered
- [OBSERVED] `init` must NOT walk up — it creates `.ana/` at cwd. Walking up would find a parent project's `.ana/` and skip initialization.
- [OBSERVED] `scan` takes an explicit target path argument. It works without `.ana/` entirely (line 9: "Works without .ana/ directory"). Must not walk up.
- [OBSERVED] `readArtifactBranch()` calls `process.exit(1)` on failure — `findProjectRoot()` should follow the same fail-hard pattern since it's called from the same command entry points.

### Test Infrastructure
- No existing tests for `git-operations.ts` utilities
- Command tests in `packages/cli/tests/commands/`

## For AnaPlan

### Structural Analog
`readArtifactBranch()` in `packages/cli/src/utils/git-operations.ts` — same shape: read filesystem, validate, return value or exit with error. `findProjectRoot()` is the same pattern but walks up instead of reading a single path.

### Relevant Code Paths
- `packages/cli/src/utils/git-operations.ts` — home for the new utility
- `packages/cli/src/commands/artifact.ts` — heaviest consumer (5 callsites at lines 543, 630, 683, 703, 742)
- `packages/cli/src/commands/work.ts` — second heaviest (8 callsites at lines 196, 245, 264, 265, 700, 833, 834, 920, 933)
- `packages/cli/src/commands/verify.ts` — 3 callsites (lines 74, 309, 316)

### Patterns to Follow
- Match `readArtifactBranch()` style: sync, `process.exit(1)` on failure, `chalk.red` error message
- Export from `utils/git-operations.ts`

### Known Gotchas
- `readArtifactBranch()` must be updated to use `findProjectRoot()` internally — otherwise it's a parallel path that still breaks from subdirectories
- `agents.ts` uses `process.cwd()` for `.claude/agents` path (line 59) — this is also project-root-relative and needs the resolved root
- Some commands assign `process.cwd()` to a local variable early then use it throughout — planner should identify whether each local variable is "project root" (needs resolution) or "working directory" (stays as cwd)

### Things to Investigate
- Whether `findProjectRoot()` should also be usable as a pure function (return null instead of exiting) for contexts where the caller wants to handle the missing-root case themselves. `readArtifactBranch` exits, but a test helper might want the nullable version.
