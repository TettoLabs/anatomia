---
name: testing-standards
description: "Anatomia testing standards. Invoke when writing tests, reviewing test coverage, verifying test quality, or checking acceptance criteria."
---

# Testing Standards — Anatomia

## Framework
Vitest with v8 coverage provider across both packages. Config at `packages/*/vitest.config.ts`.

Run commands:
The exact test command is stored in `.meta.json` `commands.test`. Use it as-is, including all flags.

- All packages: `pnpm test`
- Single package: `pnpm --filter anatomia-cli test` or `pnpm --filter anatomia-analyzer test`
- Coverage: `vitest --coverage` (analyzer also has `pnpm test:coverage`)

## Coverage Thresholds
Different per package:
- **CLI:** lines 80%, branches 75%, functions 80%, statements 80%
- **Analyzer:** lines 85%, branches 80%, functions 85%, statements 85%

Never drop below. CI enforces on every push across 3 OS × 2 Node versions (ubuntu/windows/macos × Node 20/22).

## Test Location
Mirror source structure:
- `src/commands/init.ts` → `tests/commands/init.test.ts`
- `src/analyzers/patterns.ts` → `tests/analyzers/patterns.test.ts`

CLI tests: `packages/cli/tests/` (20 files, 181 tests)
Analyzer tests: `packages/analyzer/tests/` (44 files, 503 tests)

## Testing Approach
Integration-focused. Real file I/O, not mocks. Tests create real temp directories, write real files, invoke real commands, and verify real output. This catches filesystem behavior that mocks would miss.

**Temp directory pattern:**
- Create in `beforeEach` with `fs.mkdtemp()`
- Clean up in `afterEach` with `fs.rm(recursive: true)`
- Never share temp dirs across tests
- Never leak test state

**Fixtures:**
- Analyzer uses fixture directories (`tests/fixtures/` with go, node, php, python, ruby, rust)
- CLI generates content in temp dirs on the fly — more flexible, no static fixture maintenance

**Test helpers:**
- Inline per file. Each test file has its own `dirExists`, `fileExists`, `runCheck` etc.
- No shared test utils directory. Duplication is accepted for now.

## Test Naming
Describe/it blocks with descriptive scenario sentences:
- `it("creates all 47 files in .ana/")`
- `it("returns partial results when one detector fails")`
- `it("gives helpful error when .ana/context/ does not exist")`

The name describes the scenario, not the implementation. Read the test name and know what it verifies.

## What to Test
- Every new CLI command gets integration tests (invoke command, check output and files)
- Every new analyzer detector gets unit tests with fixture projects
- Every hook script gets a test verifying exit codes and output
- Edge cases: empty repos, missing files, malformed config, out-of-bounds, permission errors, empty content

## Specs and Tests
Don't invent test infrastructure in specs. Point to existing test patterns by referencing the test file to follow. AnaBuild reads the actual test files and decides helpers, utilities, and structure. Specs provide the test matrix (scenario, setup, expected result) — not the implementation.

## Before Marking Complete
```bash
pnpm build         # Build succeeds (catches type errors tests miss)
pnpm test          # All packages, all tests pass
pnpm lint          # No linter violations
```
All three must pass. No exceptions. CI runs the same checks across the full OS/Node matrix.

## Future Improvements
- **Shared test helpers:** When command test files exceed 5+, extract common helpers (`runCommand`, `createContextFile`, `createTempProject`) to `tests/helpers/`. Not worth it yet.
- **CLI coverage command:** Add `"test:coverage": "vitest --coverage"` to CLI package.json to match analyzer.
- **Align thresholds:** Consider raising CLI thresholds to match analyzer (85/80/85/85) as test coverage matures.

## Commands
```bash
# Build (all packages)
pnpm build

# Test (CLI package, non-watch mode)
pnpm --filter anatomia-cli test -- --run

# Test (specific test file)
pnpm --filter anatomia-cli test -- --run {path}

# Lint (all source)
pnpm lint

# Lint (specific files only)
cd packages/cli && pnpm eslint {files}
```
