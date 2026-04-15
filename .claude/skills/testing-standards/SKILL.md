---
name: testing-standards
description: "Invoke when writing tests, reviewing test quality, or setting up test infrastructure. Contains project-specific testing framework conventions, fixture patterns, and coverage expectations."
---

# Testing Standards

## Detected
- Framework: Vitest (87 test files)
- Test command: pnpm run test -- --run
- Testing patterns: vitest
- Test location: dedicated test directory

## Rules
- Test behavior, not implementation. Assert on what the code returns or produces — not which internal functions it calls. Tests should survive refactoring when behavior is unchanged.
- Prefer real implementations over mocks. Mock only what you can't control: network calls, time, randomness. Every mock is a lie about how the system actually behaves.
- Cover the error path, not just the happy path. For each feature test, write at least one test for invalid input, missing data, or service failure.
- Assert on specific expected values from real inputs. `expect(status).toBe(200)` not `expect(status).toBeDefined()`. A test that passes regardless of whether the feature works catches nothing.
- Never weaken a test to make it pass. If a test fails, fix the code or fix the expectation — never broaden assertions or catch exceptions to force green.
- Tests use real temp directories for isolation. Create with `fs.mkdtemp()` in `beforeEach`, clean up with `fs.rm()` in `afterEach`. Never write to the real project directory from tests.
- Tests that change the working directory (`process.chdir`) must save the original cwd and restore it in `afterEach`. A test that doesn't restore cwd breaks every subsequent test in the suite.
- Use `createEmptyEngineResult()` for test fixtures that need an EngineResult. Never construct EngineResult manually — the factory provides all required defaults. Override specific fields with spread: `{ ...createEmptyEngineResult(), stack: { ...result.stack, framework: 'Next.js' } }`.
- E2e tests run the compiled CLI binary (`dist/index.js`), not source files. The test path is `path.join(__dirname, '..', '..', 'dist', 'index.js')`. Run `pnpm build` before e2e tests if you've changed source code.

## Gotchas
- Vitest defaults to watch mode. Always pass `--run` in CI and non-interactive environments (e.g., `pnpm run test -- --run`).
- Adding a field to EngineResult breaks tests that use `createEmptyEngineResult()` unless you also add the default value to the factory function (bottom of `engineResult.ts`). The type error appears in TEST files, not source — look for "Property X is missing in type" in the typecheck output.
- Many command tests require a `.git` directory in the fixture. If your test fails with "Not a git repository," add `await fs.mkdir(path.join(tempDir, '.git'), { recursive: true })` to setup — or `execSync('git init', { cwd: tempDir })` if you need real git operations.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
