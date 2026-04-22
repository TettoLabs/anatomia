---
name: testing-standards
description: "Invoke when writing tests, reviewing test quality, or setting up test infrastructure. Contains project-specific testing framework conventions, fixture patterns, and coverage expectations."
---

<!-- ENRICHMENT GUIDE:
  Purpose: Build and Verify read this to know how to write and run tests.
  
  Read: Up to 3 test files — ideally one e2e test, one unit test, and 
  one that uses a factory/fixture function. Different test types reveal 
  different mechanism patterns. Find candidates from 
  git.recentActivity.highChurnFiles ending in .test.ts or .test.js. 
  If no high-churn test files, read from the tests/ or __tests__/ 
  directory. Also read vitest.config or jest.config if it exists.
  
  Look for:
  - Temp directory patterns (os.tmpdir, mkdtemp, cleanup in afterEach)
  - Factory/fixture functions (createEmpty*, buildMock*, make*)
  - E2e vs unit split (separate directories? different configs?)
  - Assertion style (expect chains, custom matchers, snapshot usage)
  - Setup/teardown patterns (beforeAll, beforeEach, afterEach patterns)
  - Test isolation (each test creates own state vs shared state)
  
  Write to: ## Rules — add MECHANISM rules for patterns found.
  Template rules are PHILOSOPHY (universal, correct for all projects).
  Enrichment rules are MECHANISM (project-specific, from code reading).
  Keep the philosophy rules. Add mechanism rules alongside them.
  Each rule should change how Build writes tests. The decision test:
  "Would Build write a different test without this rule?"
  
  Skip if: files.test === 0 (no test infrastructure to codify)
  Expect: 2-4 rules added.
-->

# Testing Standards

## Detected
<!-- Populated by scan during init. Do not edit manually. -->

## Rules
- Test behavior, not implementation. Assert on what the code returns or produces — not which internal functions it calls. Tests should survive refactoring when behavior is unchanged.
- Prefer real implementations over mocks. Mock only what you can't control: network calls, time, randomness. Every mock is a lie about how the system actually behaves.
- Cover the error path, not just the happy path. For each feature test, write at least one test for invalid input, missing data, or service failure.
- Assert on specific expected values from real inputs. `expect(status).toBe(200)` not `expect(status).toBeDefined()`. A test that passes regardless of whether the feature works catches nothing. Never write tautological tests — `expect(true).toBe(true)` proves nothing. If you can't determine the specific expected value, read the contract's `matcher`/`value` fields before falling back to a weak assertion.
- Never weaken a test to make it pass. If a test fails, fix the code or fix the expectation — never broaden assertions or catch exceptions to force green.

## Gotchas
*Not yet captured. Add as you discover them during development.*

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
