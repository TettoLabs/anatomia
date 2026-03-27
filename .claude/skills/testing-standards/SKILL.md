---
name: testing-standards
description: "Anatomia testing standards. Invoke when writing tests, reviewing test coverage, verifying test quality, or checking acceptance criteria."
---

# Testing Standards — Anatomia

## Framework
Vitest across all packages. Config at `packages/*/vitest.config.ts`. Run with `pnpm test` (all packages) or `pnpm --filter anatomia-cli test` (single package).

## Coverage
85% threshold enforced in vitest config. Never drop below. Check with `pnpm test -- --coverage`. CI runs coverage on every push.

## Test Location
- CLI tests: `packages/cli/tests/`
- Analyzer tests: `packages/analyzer/tests/`
- Mirror source structure: `src/commands/init.ts` → `tests/commands/init.test.ts`

## What to Test
- Every new CLI command gets integration tests (invoke command, check output/files)
- Every new analyzer detector gets unit tests with fixture projects
- Every hook script gets a test verifying exit codes and output
- Edge cases: empty repos, monorepos, missing files, malformed config, binary files

## Test Patterns
- Use vitest `describe`/`it` blocks with descriptive names
- Test names describe the scenario: `it("returns partial results when one detector fails")`
- Use fixtures in `tests/fixtures/` for codebase simulation
- Scaffold tests verify generated files match expected structure

## Specs and Tests
Don't invent test infrastructure in specs. Point to existing test patterns by referencing the test file to follow. AnaBuild reads the actual test files and decides helpers, utilities, and structure. Specs provide the test matrix (scenario, setup, expected result) — not the implementation.

## Before Marking Complete
```bash
pnpm test          # All packages, all tests
pnpm build         # Build succeeds (catches type errors tests miss)
pnpm lint          # No linter violations
```
All three must pass. No exceptions.
