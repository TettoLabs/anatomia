---
name: testing-standards
description: "Invoke when writing tests, reviewing test quality, or setting up test infrastructure. Contains project-specific testing framework conventions, fixture patterns, and coverage expectations."
---

# Testing Standards

## Detected
- Framework: Vitest (78 test files)
- Test command: pnpm run test -- --run
- Test location: co-located with source

## Rules

- Co-locate test files with source: `foo.test.ts` next to `foo.ts`.
- Use `describe`/`it` blocks, not standalone `test()` calls.
- Prefer real I/O over mocks when feasible — mock only external services and time-dependent behavior.
- Each test must be isolated: create its own fixtures, clean up after itself, never depend on run order.
- Coverage minimum: 80% statements. Don't chase 100% — focus coverage on business logic and edge cases.

## Gotchas
- Vitest defaults to watch mode. Always pass `--run` in CI and non-interactive environments (e.g., `pnpm run test -- --run`).

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
