# Step 5: Write testing.md

## Goal

Document test framework, structure, patterns from actual test files.

**What this file captures:** How this project tests (framework, fixtures, mocking, coverage expectations, real test examples).

**Automation level:** 85% (framework + structure from exploration, coverage from Q11 or config)

**Time:** 5-7 minutes

---

## Inputs

1. **Read `.ana/.setup_exploration.md` → Testing section**
   - Test files found (or "No tests detected")
   - Test framework detected

2. **Read scaffold:** `context/testing.md`
   - Has 6 section headers
   - Has analyzer testing pattern data (library, confidence)
   - 50% head start

3. **Read templates.md section "6. testing.md Template"**
   - GOOD shows: Complete test file with fixtures, assertions, real test structure
   - BAD shows: Generic "write test functions"

4. **Read rules.md:** Line limit 400-600 lines (Quick: 50-600 if no tests)

---

## What to Search For

**If tests exist (from exploration):**

### Test Config
- vitest.config.ts, jest.config.js, pytest.ini, go.mod (test packages)
- Extract: test command, coverage settings, test patterns, setup files

### Test Structure
**FIND:** How tests are organized (directory structure, naming, grouping)

**LOOK FOR (framework-specific):**
- Python/pytest: `class Test`, `def test_`, `conftest.py`, `@pytest.fixture`, `@pytest.mark`
- TypeScript/Vitest: `describe(`, `it(`, `test(`, `beforeEach(`, `afterEach(`
- TypeScript/Jest: `describe(`, `it(`, `test(`, `beforeAll(`, `jest.mock(`
- Go: `func Test`, `func Benchmark`, `testing.T`, `testify/assert`

### Fixture Patterns
**FIND:** How test data is set up

**LOOK FOR:**
- Python: `@pytest.fixture`, `conftest.py`, `factory_boy`, `faker`
- TypeScript: `beforeEach(` with setup, factory functions, `createMock`
- Go: `TestMain`, helper functions, table-driven test data

**EXTRACT:** One fixture example (10-20 lines) showing setup pattern

### Mocking Approach
**FIND:** How external dependencies are replaced in tests

**LOOK FOR:**
- Python: `@patch`, `MagicMock`, `mock.patch`, `monkeypatch`
- TypeScript/Vitest: `vi.mock(`, `vi.spyOn(`, `vi.fn(`
- TypeScript/Jest: `jest.mock(`, `jest.spyOn(`, `jest.fn(`
- Go: interface-based mocking, mock structs

**EXTRACT:** One mocking example (10-20 lines) showing how project mocks dependencies

### Coverage Settings
- Check test config for coverage thresholds (.coveragerc, jest coverageThreshold, vitest coverage)
- Check CI config (.github/workflows/) for coverage requirements
- Check package.json scripts for coverage commands

---

## Questions (Tier + Stage Dependent)

**QUICK MODE:** No questions (infer from test config if tests exist)

**GUIDED MODE - STAGE CONDITIONAL:**

**Stage 1 Guided:** Ask Q11
**Stage 2+ Guided:** SKIP Q11 (replaced by venting QV in debugging step)

**Q11 (VALUE 2.0) - for Stage 1 Guided and ALL Complete:**
```
What's your test coverage target and is it enforced?

Examples:
  • "80% required, CI fails below that"
  • "No hard requirement, just test critical paths"

(Press Enter to skip - I'll infer from test config if present)
```

**COMPLETE MODE:** Always asks Q11

---

## Writing Instructions

**If tests exist:**

Write all 6 sections:

### Test Framework
```markdown
## Test Framework

**Framework:** [from exploration: pytest/Vitest/Jest/Go testing]
**Config:** [from test config file if found]
**Test command:** [from package.json scripts or config: `npm test`, `pytest`, `go test ./...`]
**Test runner:** [if different from framework: e.g., "Vitest with UI mode"]
```

### Test Structure
```markdown
## Test Structure

**Organization:** [describe from test file analysis]
- Test directory: [tests/, __tests__/, colocated]
- Naming: [test_*.py, *.test.ts, *_test.go]
- Grouping: [by feature, by layer, by file]

**Example structure:**
[Show 1 test file's organization — describe/it nesting or class/method structure]
```

### Fixture Patterns
```markdown
## Fixture Patterns

**Approach:** [from extraction: conftest fixtures, beforeEach setup, factory functions, table-driven]

**Example from `[test file path]` (lines [X]-[Y]):**
```[language]
[extracted fixture code — 10-20 lines]
```

[If no fixtures found: "Tests use inline setup (no shared fixtures detected)"]
```

### Mocking Approach
```markdown
## Mocking Approach

**Tools:** [vi.mock / jest.mock / @patch / interface mocking]

**Example from `[test file path]` (lines [X]-[Y]):**
```[language]
[extracted mocking code — 10-20 lines]
```

[If no mocking found: "No mocking detected (tests may use real dependencies or be integration tests)"]
```

### Coverage Expectations
```markdown
## Coverage Expectations

**Target:** [from Q11 or config: "80% enforced in CI" / "No formal target"]
**Current:** [from coverage config if found, or "Not measured"]
**Enforcement:** [CI blocks below threshold / Not enforced]
```

### Example Test Structure
**Pick the test that shows the MOST about this project's testing approach.**

Selection criteria (in priority order):
1. A test that uses fixtures AND assertions (shows both patterns)
2. A test that tests a real feature (not a utility or helper)
3. An async test if the project is async (shows async testing pattern)
4. An integration/API test over a unit test (shows more project structure)

**The goal:** a developer reading this ONE test understands how to write the next one.

```markdown
## Example Test Structure

**From `[test file path]`:**
```[language]
[Complete test — 30-60 lines showing imports, setup, test case, assertions]
```

**Pattern shown:** [What this test demonstrates: fixtures, mocking, async, API testing, etc.]
```

**If NO tests (from exploration):**

Write placeholder sections:

```markdown
## Test Framework

**Detected:** None

**Note:** No test files detected. This is common for early-stage projects.

**Recommendation:** Add [appropriate framework for language: Vitest for Next.js/TypeScript, pytest for Python, testing package for Go] when stabilizing features.

## Test Structure

Not applicable (no tests yet).

## Fixture Patterns

Not applicable.

## Mocking Approach

Not applicable.

## Coverage Expectations

Not set (no tests yet).

**Recommendation:** Target 60-80% coverage for healthy codebase. Start with critical path tests.

## Example Test Structure

Not applicable. When adding tests, follow [framework] conventions for test structure.
```

Honest placeholder. Provides recommendations. Better than fabricated test methodology.

---

## When Project Is Flat/Minimal

If exploration indicated projectShape = "minimal" AND no tests:

- Use honest placeholder (above)
- Emphasize recommendation: "Add tests when stabilizing for production"
- Note testing framework appropriate for detected language/framework
- Shorter file (50-100 lines vs 400-600 for tested projects)

---

## Verify

1. **Read back:** `context/testing.md`

2. **Count headers:** Expect 6

3. **Line count:** 400-600 (no tests: 50-600 acceptable)

4. **If tests exist:** Check for real test file citation in Example Test Structure section

5. **No placeholders:** Search for "TODO", "..." → expect 0

6. **If Q11 answered:** Coverage target should be in Coverage Expectations section

**If all pass:** Continue.

**If any fail:** Rewrite.

---

## Complete

Report:
```
✓ testing.md complete ([X] lines) [— from test files / — placeholder (no tests)]

[5 of 7 files complete]
```

Proceed to Step 6 (workflow.md).

**Read:** `context/setup/steps/06_workflow.md`
