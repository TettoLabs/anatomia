---
name: testing-standards
description: "Team testing standards. Invoke when writing tests, reviewing coverage, or checking acceptance criteria."
---

# Testing Standards

## Framework
<!-- Your test framework, config location, run commands -->

## Coverage
<!-- Coverage thresholds and how they're enforced -->

## Test Location
<!-- Where tests live relative to source -->

## What to Test
<!-- What requires tests: features, fixes, edge cases -->

## Test Patterns
<!-- Describe/it style, fixtures, mocking conventions -->

## Specs and Tests
Don't invent test infrastructure in specs. Point to existing test patterns. Specs provide the test matrix — not the implementation.

## Before Marking Complete
<!-- Commands that must all pass before work is done -->

## Commands
<!-- Add your exact runnable commands here. AnaBuild reads these to know how to build, test, and lint your project.
```bash
# Build
your-build-command

# Test (non-watch mode)
your-test-command

# Test (specific file)
your-test-command {path}

# Lint (all source)
your-lint-command

# Lint (specific files)
your-lint-command {files}
```
-->
