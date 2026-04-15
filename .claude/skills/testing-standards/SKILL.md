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

## Gotchas
- Vitest defaults to watch mode. Always pass `--run` in CI and non-interactive environments (e.g., `pnpm run test -- --run`).

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
