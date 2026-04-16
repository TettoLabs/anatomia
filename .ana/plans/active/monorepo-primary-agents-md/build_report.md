# Build Report: Monorepo Primary Package AGENTS.md

**Created by:** AnaBuild
**Date:** 2026-04-16
**Spec:** .ana/plans/active/monorepo-primary-agents-md/spec.md
**Branch:** feature/monorepo-primary-agents-md

## What Was Built

- `packages/cli/src/commands/init/assets.ts` (modified): Added `generatePrimaryPackageAgentsMd()` as an exported async function. Added two call sites in `createClaudeConfiguration()` — one in the fresh-install branch (after `generateAgentsMd`), one in the merge branch (after `generateAgentsMd`). Both gated on monorepo + primaryPackage. Function creates minimal AGENTS.md in the primary package directory with package name heading, identity line, commands section (when available), and pointer to root AGENTS.md.

- `packages/cli/tests/scaffolds/all-scaffolds.test.ts` (modified): Added 13 new tests in a `describe('generatePrimaryPackageAgentsMd')` block covering all contract assertions. Tests use temp directories and verify file creation, content, relative paths, skip conditions, and overwrite protection.

## PR Summary

- Add `generatePrimaryPackageAgentsMd()` function to create package-level AGENTS.md files for monorepos
- Wire the function into both fresh-install and merge branches of `createClaudeConfiguration()`
- Include package name, identity line, commands (with non-interactive test), and pointer to root AGENTS.md
- Calculate correct relative path based on package nesting depth (e.g., `../../AGENTS.md` for `packages/cli`)
- Add comprehensive tests covering all 13 contract assertions

## Acceptance Criteria Coverage

- AC1 "Running ana init on a monorepo with detected primary package creates {primaryPackage.path}/AGENTS.md" → all-scaffolds.test.ts:103 "creates AGENTS.md in primary package directory" (2 assertions)
- AC2 "Generated file contains package name, identity line, commands, pointer" → all-scaffolds.test.ts:127 "includes package name heading", :147 "identifies as primary package", :167 "includes commands section", :212 "includes pointer to root AGENTS.md" (multiple assertions)
- AC3 "Existing file is not overwritten" → all-scaffolds.test.ts:273 "does not overwrite existing file" (2 assertions)
- AC4 "Non-monorepo projects and monorepos without primary package are unaffected" → all-scaffolds.test.ts:297 "skips non-monorepo projects", :315 "skips when primaryPackage is null" (2 assertions)
- AC5 "Tests pass with cd packages/cli && pnpm vitest run" → Verified: 1150 tests pass
- AC6 "No TypeScript or lint errors" → Verified: Pre-commit hook passed (tsc --noEmit, eslint)

## Implementation Decisions

1. **Relative path calculation:** Used `pkg.path.split('/').filter(Boolean).length` to count nesting depth and generate the correct number of `../` segments. This handles both `packages/cli` (depth 2 → `../../`) and `cli` (depth 1 → `../`).

2. **Return value:** Function returns the generated content string (or `null` if skipped) to enable direct testing without filesystem mocking in most cases. File existence tests still use temp directories.

3. **Commands section:** Used the same `makeTestCommandNonInteractive` helper as `generateAgentsMd` to ensure test commands don't require interactive input. Only build/test/lint included (no dev) since dev commands aren't useful in package context.

4. **Test structure:** Used `createEmptyEngineResult()` spread pattern to ensure type compatibility while overriding only the fields needed for each test case.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
cd packages/cli && pnpm vitest run
 Test Files  86 passed (86)
      Tests  1137 passed (1137)
   Duration  15.43s
```

### After Changes
```
cd packages/cli && pnpm vitest run
 Test Files  86 passed (86)
      Tests  1150 passed (1150)
   Duration  13.91s
```

### Comparison
- Tests added: 13
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/scaffolds/all-scaffolds.test.ts`: Added 13 tests in `describe('generatePrimaryPackageAgentsMd')` block covering:
  - A001: File creation in primary package directory
  - A002: Package name heading
  - A003: Primary package identity line
  - A004: Commands section with available commands
  - A005: Non-interactive test command
  - A006: Pointer to root AGENTS.md
  - A007: Correct relative path for two-level nesting (../../AGENTS.md)
  - A008: Correct relative path for single-level nesting (../AGENTS.md)
  - A009: No overwrite of existing file
  - A010: Skip non-monorepo projects
  - A011: Skip when primaryPackage is null
  - A012: Omit commands section when no commands detected
  - A013: Handle null engineResult gracefully

### Contract Coverage
Contract coverage: 13/13 assertions tagged.

## Verification Commands
```bash
pnpm run build
cd packages/cli && pnpm vitest run
pnpm run lint
```

## Git History
```
2b3a3de [monorepo-primary-agents-md] Add primary package AGENTS.md generation
```

## Open Issues

None — verified by second pass.
