# Step 5: Write testing.md

## Goal

Document test practices — framework, structure, fixtures, mocks, coverage. An AI mode reading this file should be able to write a new test that fits seamlessly with existing tests. If no tests exist, provide honest placeholder with recommendations.

## Quality Checklist

Before finishing, verify:
- [ ] Test framework identified with config file location
- [ ] Test structure explained (directory layout, naming, grouping)
- [ ] Fixture pattern documented with real example code
- [ ] Mocking approach shown with real example code
- [ ] Coverage expectations documented (target %, enforcement)
- [ ] One complete test example that shows how to write new tests
- [ ] All 6 sections present (or marked "Not applicable" if no tests)

## Example

**BAD (generic):**
> ## Test Framework
> Uses Vitest for testing. Write tests in the tests/ directory.

**GOOD (specific with examples):**
> ## Test Framework
> **Detected:** Vitest 2.0 with jsdom environment (from `vitest.config.ts`, lines 1-15)
> **Test command:** `pnpm test` (from `package.json` scripts)
> **Coverage:** 80% threshold enforced in CI (from `.github/workflows/test.yml`, line 23)
>
> **Example fixture** from `tests/helpers/factory.ts` (lines 10-25):
> ```typescript
> export function createMockUser(overrides?: Partial<User>): User {
>   return { id: 'test-123', email: 'test@example.com', ...overrides };
> }
> ```

## Extraction Targets

<target name="test_framework">
  Search: Test config files, test commands in package.json
  Files: vitest.config.*, jest.config.*, pytest.ini, conftest.py, *_test.go
  Extract: Framework name + version, config location, test command
  <if_not_found>Write: "No tests detected — recommend adding [framework] when stabilizing"</if_not_found>
</target>

<target name="test_structure">
  Search: Test directories, test file naming patterns
  Files: tests/**/*, __tests__/**/*, *.test.*, *.spec.*
  Extract: Directory layout, naming convention, grouping strategy
  <if_not_found>Write: "Not applicable (no tests)"</if_not_found>
</target>

<target name="fixture_patterns">
  Search: Setup functions, factory patterns, shared fixtures
  Files: conftest.py, tests/fixtures/*, tests/helpers/*, beforeEach blocks
  Extract: One fixture example (10-20 lines) showing setup pattern
  <if_not_found>Write: "Tests use inline setup (no shared fixtures)"</if_not_found>
</target>

<target name="mocking_approach">
  Search: Mock imports, spy functions, dependency replacement
  Files: Test files with vi.mock, jest.mock, @patch, MagicMock
  Extract: One mocking example (10-20 lines) showing mock pattern
  <if_not_found>Write: "No mocking detected (tests may use real dependencies)"</if_not_found>
</target>

<target name="coverage">
  Search: Coverage config, CI coverage requirements
  Files: vitest.config.*, jest.config.*, .coveragerc, CI workflow files
  Extract: Target percentage, enforcement mechanism
  <if_not_found>Write: "No coverage target configured"</if_not_found>
</target>

## Structure

- 6 H2 sections: Test Framework, Test Structure, Fixture Patterns, Mocking Approach, Coverage Expectations, Example Test
- Example Test: Pick ONE test that shows fixtures + assertions + async if applicable
- Each section with tests must cite file paths and line numbers
- Target: 400-600 lines (no tests: 50-150 acceptable)

## Citation Protocol

Read test files BEFORE citing them. Quote exact test code. Use format:
```
Example from `tests/services/user.test.ts` (lines 15-45):
```

If no tests exist, be honest and recommend appropriate framework for the stack.

## References

- Exploration results: `.ana/.setup_exploration.md`
- Q&A log: `.ana/.setup_qa_log.md`
- Rules: `.ana/context/setup/rules.md`
