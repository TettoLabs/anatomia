# Testing — anatomia-workspace

## Test Framework

**Detected:** Vitest for both CLI and analyzer packages with different coverage thresholds

**CLI configuration** from `packages/cli/vitest.config.ts` (lines 1-25):
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'dist/**',
        '**/*.test.ts',
        'src/test-*.ts', // Validation scripts
        'src/index.ts',  // CLI entry (just imports)
      ],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
});
```

**Analyzer configuration** from `packages/analyzer/vitest.config.ts` (lines 1-25):
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'dist/**',
        '**/*.test.ts',
        'src/index.ts', // Entry point (just exports)
      ],
      thresholds: {
        lines: 85,
        branches: 80,
        functions: 85,
        statements: 85,
      },
    },
  },
});
```

**Test execution:**
- **Detected:** `pnpm test` runs all tests via Turborepo (from root `package.json`)
- **Detected:** `vitest` command in package scripts runs in watch mode for development
- **Detected:** `vitest --coverage` generates coverage reports (from analyzer `package.json`)
- **Detected:** `globals: true` eliminates need to import `describe`, `it`, `expect` in test files

**Framework versions:**
- **Detected:** CLI uses Vitest 2.0.0
- **Detected:** Analyzer uses Vitest 4.0.18
- **Inferred:** Version difference suggests analyzer was upgraded more recently

**CI integration** from `.github/workflows/test.yml` (lines 20-35):
- Tests run on 3 operating systems (Ubuntu, Windows, macOS)
- Tests run on Node 20 and 22
- Coverage uploaded to Codecov (Ubuntu + Node 20 only)
- Command: `pnpm test --run` (disables watch mode in CI)

## Test Structure

**Directory layout:**

```
packages/
├── cli/
│   ├── src/              # Source code
│   └── tests/            # Test files mirror src/ structure
│       ├── commands/     # Command tests (setup.test.ts, init.test.ts)
│       ├── contract/     # Cross-package contract tests
│       ├── scaffolds/    # Scaffold generator tests
│       ├── utils/        # Utility function tests
│       ├── performance/  # Performance benchmarks
│       ├── e2e/          # End-to-end tests
│       └── cleanup/      # Cleanup validation tests
└── analyzer/
    ├── src/              # Source code
    └── tests/            # Test files mirror src/ structure
        ├── analyzers/    # Analyzer function tests
        ├── parsers/      # Parser tests (language-specific)
        ├── detectors/    # Detection logic tests
        ├── conventions/  # Convention detection tests
        ├── integration/  # Integration tests
        ├── performance/  # Performance tests
        ├── cache/        # Cache mechanism tests
        └── fixtures/     # Language-specific fixture files
            ├── go/
            ├── node/
            ├── python/
            ├── ruby/
            ├── rust/
            └── php/
```

**Detected:** 64 test files total across both packages

**Naming convention:**
- **Detected:** `*.test.ts` pattern for all test files
- **Detected:** Test file names match source file names (e.g., `patterns.ts` → `patterns/dependencies.test.ts`)
- **Detected:** Descriptive test names for integration tests (e.g., `edge-cases.test.ts`, `wasm-smoke.test.ts`)

**Test categories:**

1. **Unit tests:** Test individual functions and modules
   - **Detected:** `packages/analyzer/tests/parsers/node.test.ts` — parser unit tests
   - **Detected:** `packages/cli/tests/utils/validators.test.ts` — utility function tests

2. **Integration tests:** Test cross-module interactions
   - **Detected:** `packages/analyzer/tests/integration/edge-cases.test.ts` — 12 critical edge cases
   - **Detected:** `packages/analyzer/tests/integration/structure-analysis.test.ts` — structure detection
   - **Detected:** `packages/cli/tests/commands/setup-complete-integration.test.ts` — full setup flow

3. **Contract tests:** Validate interface contracts between packages
   - **Detected:** `packages/cli/tests/contract/analyzer-contract.test.ts` — CLI/analyzer interface contract
   - **User confirmed:** Contract tests validate 38 fields from AnalysisResult, fail at compile time if analyzer renames fields

4. **Scaffold tests:** Validate generated markdown scaffolds
   - **Detected:** `packages/cli/tests/scaffolds/all-scaffolds.test.ts` — tests all 7 scaffold generators
   - **Detected:** Individual scaffold tests for each context file type

5. **Performance tests:** Validate speed and efficiency
   - **Detected:** `packages/analyzer/tests/performance/parsing-performance.test.ts` — parser speed benchmarks
   - **Detected:** `packages/cli/tests/performance/benchmarks.test.ts` — CLI performance

6. **End-to-end tests:** Test complete user workflows
   - **Detected:** `packages/cli/tests/e2e/init-flow.test.ts` — full init command flow

7. **Backward compatibility tests:** Ensure data format stability
   - **Detected:** `packages/analyzer/tests/backward-compat.test.ts` — validates result format stability
   - **Detected:** `packages/analyzer/tests/structure-backward-compat.test.ts`
   - **Detected:** `packages/analyzer/tests/patterns-backward-compat.test.ts`
   - **Detected:** `packages/analyzer/tests/parsed-backward-compat.test.ts`

**Test organization pattern:**
- **Detected:** `describe()` blocks group related tests by feature or module
- **Detected:** Nested `describe()` blocks for sub-categories (e.g., "FastAPI project patterns", "Edge cases")
- **Detected:** `it()` blocks describe specific behaviors in plain English

## Fixture Patterns

**Fixture directory structure:**

**Detected:** Language-specific fixture directories at `packages/analyzer/tests/fixtures/`:
- `go/` — Go code samples
- `node/` — Node.js projects (contains `package.json`)
- `python/` — Python code samples
- `ruby/` — Ruby code samples
- `rust/` — Rust code samples
- `php/` — PHP code samples

**Detected:** Fixture files are minimal but realistic (e.g., `node/package.json` for dependency parsing tests)

**Temporary directory pattern:**

The most common fixture pattern is **dynamic temporary directory creation** for isolated test environments.

Example from `packages/analyzer/tests/analyzers/patterns/dependencies.test.ts` (lines 9-20):
```typescript
describe('Dependency-based pattern detection', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temp directory for each test
    testDir = await mkdtemp(join(tmpdir(), 'pattern-test-'));
  });

  afterEach(async () => {
    // Cleanup
    await rm(testDir, { recursive: true, force: true });
  });
```

**Why this pattern:**
- **Detected:** Tests create real files in temp directories to validate file system operations
- **Detected:** `mkdtemp()` from Node.js `fs/promises` creates unique temp directories (prevents test collisions)
- **Detected:** `afterEach()` cleanup ensures tests don't leave artifacts
- **Detected:** `rm(..., { recursive: true, force: true })` safely removes temp directories even if contents exist

**Factory pattern for test data:**

Example from `packages/cli/tests/scaffolds/test-types.ts` (lines 89-104):
```typescript
export function createEmptyAnalysisResult(): AnalysisResult {
  return {
    projectType: 'unknown',
    framework: null,
    confidence: {
      projectType: 0.0,
      framework: 0.0,
    },
    indicators: {
      projectType: [],
      framework: [],
    },
    detectedAt: new Date().toISOString(),
    version: '0.1.0',
  };
}
```

**Purpose:**
- **Detected:** Factory functions create valid test data structures
- **Detected:** Shared across multiple scaffold tests to ensure consistency
- **Detected:** Tests can override specific fields via object spread (e.g., `{ ...createEmptyAnalysisResult(), projectType: 'node' }`)

**Inline file creation pattern:**

Example from `packages/analyzer/tests/integration/edge-cases.test.ts` (lines 45-61):
```typescript
it('handles empty directory with no dependency files', async () => {
  // Create empty directory
  const emptyDir = path.join(tempDir, 'empty-project');
  await fs.mkdir(emptyDir);

  // Should not crash, return empty array
  const pythonDeps = await readPythonDependencies(emptyDir, collector);
  expect(pythonDeps).toEqual([]);

  const nodeDeps = await readNodeDependencies(emptyDir);
  expect(nodeDeps).toEqual([]);

  // Check that info message was logged
  const info = collector.getInfo();
  expect(info.some(e => e.code === 'NO_DEPENDENCIES')).toBe(true);
});
```

**Pattern:** Tests create minimal project structures inline using `fs.writeFile()` and `fs.mkdir()` rather than relying on static fixture files. This makes tests self-documenting — the exact input is visible in the test code.

**beforeAll/afterAll pattern:**

Example from `packages/analyzer/tests/parsers/node.test.ts` (lines 7-18):
```typescript
describe('readNodeDependencies', () => {
  let tempDir: string;

  beforeAll(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'node-parser-test-'));
  });

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });
```

**Difference from beforeEach/afterEach:**
- **Detected:** `beforeAll()` creates temp directory once per test suite (more efficient for read-only fixtures)
- **Detected:** `beforeEach()` creates temp directory per test (necessary when tests mutate files)
- **Detected:** Both patterns use `afterAll()` or `afterEach()` for cleanup

## Mocking Approach

**Detected:** No mocking libraries or frameworks used (no `vi.mock`, `jest.mock`, or mock dependencies in package.json)

**Pattern:** Real file system operations with temporary directories instead of mocks

**Why no mocking:**
- **Inferred:** Code analysis tools must work with real file systems — mocking would miss edge cases
- **Detected:** Tests use `mkdtemp()` to create isolated temp directories, achieving test isolation without mocks
- **Detected:** Tests validate real Tree-sitter WASM parsing, which cannot be easily mocked
- **User confirmed:** Tree-sitter WASM parsing is a known complexity area requiring real integration tests

**Fake data pattern (not mocking, but similar):**

Example from `packages/cli/tests/contract/analyzer-contract.test.ts` (lines 18-32):
```typescript
it('accesses 8 required fields without errors', () => {
  const minimal: AnalysisResult = {
    projectType: 'node',
    framework: 'nextjs',
    confidence: {
      projectType: 1.0,
      framework: 0.95,
    },
    indicators: {
      projectType: ['package.json'],
      framework: ['next in dependencies'],
    },
    detectedAt: '2026-03-19T10:00:00Z',
    version: '0.2.0',
  };
```

**Pattern:** Tests create fake `AnalysisResult` objects as plain TypeScript objects rather than calling actual analysis functions. This validates type contracts without requiring full analysis runs.

**Error collector pattern (dependency injection for testability):**

Example from `packages/analyzer/tests/integration/edge-cases.test.ts` (lines 27-34):
```typescript
describe('Edge Case Integration Tests', () => {
  let tempDir: string;
  let collector: DetectionCollector;

  beforeEach(async () => {
    // Create isolated temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'anatomia-test-'));
    collector = new DetectionCollector();
  });
```

**Purpose:**
- **Detected:** `DetectionCollector` is injected into detection functions to capture errors/warnings
- **Detected:** Tests can inspect `collector.getErrors()`, `collector.getWarnings()`, `collector.getInfo()`
- **Detected:** This is a form of test-friendly design, not traditional mocking

**WASM smoke test (integration without mocks):**

Example from `packages/analyzer/tests/integration/wasm-smoke.test.ts` (lines 7-34):
```typescript
describe('WASM smoke test', () => {
  it('analyze() parses real files and returns extracted data', async () => {
    // Create minimal project with parseable code
    const testDir = join(tmpdir(), `ana-wasm-smoke-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    await writeFile(join(testDir, 'package.json'), '{"name":"test","version":"1.0.0"}');
    await writeFile(join(testDir, 'index.ts'), `
      import { readFile } from 'node:fs/promises';
      export function hello(name: string): string { return name; }
      export class Greeter { greet() { return 'hi'; } }
    `);

    try {
      const result = await analyze(testDir);

      // WASM must produce actual parsed data, not empty results
      expect(result.parsed).toBeDefined();
      expect(result.parsed!.totalParsed).toBeGreaterThan(0);
      expect(result.parsed!.files.length).toBeGreaterThan(0);

      const file = result.parsed!.files[0]!;
      expect(file.functions.length).toBeGreaterThan(0);
      expect(file.imports.length).toBeGreaterThan(0);
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  }, 30000);
});
```

**Why 30 second timeout:**
- **Detected:** `30000` millisecond timeout (line 33) allows WASM initialization and parsing
- **User confirmed:** WASM parsing requires explicit init and memory management, can be slow
- **Detected:** Default Vitest timeout would be too short for this integration test

**Summary:** This project uses **integration testing with real file systems** instead of mocking. Test isolation comes from temporary directories, not from mocked dependencies.

## Coverage Expectations

**CLI package thresholds** from `packages/cli/vitest.config.ts` (lines 17-22):
```typescript
thresholds: {
  lines: 80,
  branches: 75,
  functions: 80,
  statements: 80,
},
```

**Analyzer package thresholds** from `packages/analyzer/vitest.config.ts` (lines 16-21):
```typescript
thresholds: {
  lines: 85,
  branches: 80,
  functions: 85,
  statements: 85,
},
```

**Detected:** Analyzer has higher coverage requirements (85% vs 80%) — likely because it's the core engine with more critical logic

**Coverage enforcement:**
- **Detected:** Tests fail if coverage drops below thresholds
- **Detected:** CI runs coverage checks on every push/PR (from `.github/workflows/test.yml`)
- **Detected:** Coverage uploaded to Codecov for tracking over time

**Coverage exclusions** (CLI):
- `dist/**` — build output
- `**/*.test.ts` — test files themselves
- `src/test-*.ts` — validation scripts
- `src/index.ts` — CLI entry point (just imports)

**Coverage exclusions** (analyzer):
- `dist/**` — build output
- `**/*.test.ts` — test files themselves
- `src/index.ts` — entry point (just exports)

**Detected:** Both packages exclude entry points from coverage because they're thin wrappers (imports/exports only)

**Coverage reporters:**
- **Detected:** `text` — console output during test runs
- **Detected:** `json` — machine-readable format for CI/tooling
- **Detected:** `html` — browsable coverage report (likely in `coverage/` directory)

**Coverage provider:**
- **Detected:** `v8` — Node.js built-in coverage (faster than Istanbul, more accurate)

**No coverage for:**
- **Detected:** No code review enforcement visible (e.g., no GitHub PR status checks configured)
- **Inferred:** Coverage thresholds are the primary enforcement mechanism

**Test count (estimated from test files):**
- **Detected:** 64 test files across both packages
- **Inferred:** Likely 200-500 individual test cases based on file structure

## Example Test Structure

This example shows fixture setup, error collection validation, and graceful degradation testing — representative of this project's testing philosophy.

**Complete test example** from `packages/analyzer/tests/integration/edge-cases.test.ts` (lines 26-61):

```typescript
describe('Edge Case Integration Tests', () => {
  let tempDir: string;
  let collector: DetectionCollector;

  beforeEach(async () => {
    // Create isolated temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'anatomia-test-'));
    collector = new DetectionCollector();
  });

  afterEach(async () => {
    // Cleanup temp directory (force + recursive)
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // ============================================================
  // FILE SYSTEM ERRORS (5 tests)
  // ============================================================

  describe('File System Edge Cases', () => {
    it('handles empty directory with no dependency files', async () => {
      // Create empty directory
      const emptyDir = path.join(tempDir, 'empty-project');
      await fs.mkdir(emptyDir);

      // Should not crash, return empty array
      const pythonDeps = await readPythonDependencies(emptyDir, collector);
      expect(pythonDeps).toEqual([]);

      const nodeDeps = await readNodeDependencies(emptyDir);
      expect(nodeDeps).toEqual([]);

      // Check that info message was logged
      const info = collector.getInfo();
      expect(info.some(e => e.code === 'NO_DEPENDENCIES')).toBe(true);
    });
```

**Key patterns in this test:**

1. **beforeEach/afterEach isolation:**
   - **Detected:** Each test gets a fresh temp directory
   - **Detected:** `mkdtemp()` creates unique directories (prevents parallel test collisions)
   - **Detected:** Cleanup uses `{ recursive: true, force: true }` to handle any state

2. **Real file system operations:**
   - **Detected:** `fs.mkdir()` creates actual directories
   - **Detected:** No mocking — tests validate real behavior

3. **Error collector validation:**
   - **Detected:** `collector` injected to capture errors/warnings/info
   - **Detected:** Tests verify specific error codes (e.g., `'NO_DEPENDENCIES'`)
   - **Detected:** Validates graceful degradation — no crashes, returns empty arrays

4. **Multiple assertions per test:**
   - **Detected:** Tests validate both Python and Node dependency reading
   - **Detected:** Tests check both return values AND logged info messages
   - **Inferred:** Comprehensive validation ensures no side effects

**Second example: Dependency pattern detection with confidence scoring**

Example from `packages/analyzer/tests/analyzers/patterns/dependencies.test.ts` (lines 22-66):

```typescript
describe('FastAPI project patterns', () => {
  it('detects pydantic, sqlalchemy async, pytest, JWT auth, HTTPException', async () => {
    // Create requirements.txt with FastAPI dependencies
    await writeFile(
      join(testDir, 'requirements.txt'),
      `fastapi==0.115.0
pydantic==2.10.0
sqlalchemy==2.0.36
asyncpg==0.30.0
pytest==8.3.4
python-jose[cryptography]==3.3.0
uvicorn==0.34.0`
    );

    const patterns = await detectFromDependencies(testDir, 'python', 'fastapi');

    // Validation pattern
    expect(patterns['validation']).toBeDefined();
    expect(patterns['validation']?.library).toBe('pydantic');
    expect(patterns['validation']?.confidence).toBe(0.75);
    expect(patterns['validation']?.evidence).toContain('pydantic in dependencies');

    // Database pattern with async variant
    expect(patterns['database']).toBeDefined();
    expect(patterns['database']?.library).toBe('sqlalchemy');
    expect(patterns['database']?.variant).toBe('async');  // asyncpg detected
    expect(patterns['database']?.confidence).toBeCloseTo(0.85, 2);  // With companion boost (floating point tolerance)
    expect(patterns['database']?.evidence.some(e => e.includes('async driver'))).toBe(true);

    // Auth pattern
    expect(patterns['auth']).toBeDefined();
    expect(patterns['auth']?.library).toBe('jwt');
    expect(patterns['auth']?.confidence).toBe(0.75);

    // Testing pattern
    expect(patterns['testing']).toBeDefined();
    expect(patterns['testing']?.library).toBe('pytest');
    expect(patterns['testing']?.confidence).toBe(0.75);

    // Error handling pattern
    expect(patterns['errorHandling']).toBeDefined();
    expect(patterns['errorHandling']?.library).toBe('exceptions');
    expect(patterns['errorHandling']?.variant).toBe('fastapi-httpexception');
    expect(patterns['errorHandling']?.confidence).toBe(0.80);
  });
});
```

**Key patterns:**

1. **Inline fixture creation:**
   - **Detected:** Test creates `requirements.txt` inline with exact dependency versions
   - **Detected:** Self-documenting — reader sees exact input without checking external fixtures

2. **Multi-pattern validation:**
   - **Detected:** Single test validates 5 patterns (validation, database, auth, testing, error handling)
   - **Detected:** Each pattern checks: existence, library name, confidence score, evidence

3. **Variant detection:**
   - **Detected:** Tests verify variant detection (e.g., SQLAlchemy async vs sync)
   - **Detected:** `toBe('async')` validates companion library detection (asyncpg triggers async variant)

4. **Floating point tolerance:**
   - **Detected:** `toBeCloseTo(0.85, 2)` handles floating point precision (2 decimal places)
   - **Detected:** Necessary because confidence scores may involve calculations

5. **Evidence validation:**
   - **Detected:** Tests check `evidence` array contains expected strings
   - **Detected:** Uses `.some()` for partial matches (e.g., "async driver" substring)

**Third example: Scaffold validation**

Example from `packages/cli/tests/scaffolds/all-scaffolds.test.ts` (lines 13-44):

```typescript
describe('all scaffolds integration', () => {
  const analysis = createEmptyAnalysisResult();
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('all 7 generators produce valid scaffolds', () => {
    const scaffolds = [
      generateProjectOverviewScaffold(analysis, projectName, timestamp, version),
      generateArchitectureScaffold(analysis, projectName, timestamp, version),
      generatePatternsScaffold(analysis, projectName, timestamp, version),
      generateConventionsScaffold(analysis, projectName, timestamp, version),
      generateWorkflowScaffold(analysis, projectName, timestamp, version),
      generateTestingScaffold(analysis, projectName, timestamp, version),
      generateDebuggingScaffold(analysis, projectName, timestamp, version),
    ];

    // All should have scaffold marker
    scaffolds.forEach((scaffold) => {
      expect(scaffold).toContain('<!-- SCAFFOLD - Setup will fill this file -->');
    });

    // All should have project name in title
    scaffolds.forEach((scaffold) => {
      expect(scaffold).toContain(projectName);
    });

    // All should have timestamp or version in footer
    scaffolds.forEach((scaffold) => {
      expect(scaffold).toContain(timestamp);
    });
  });
```

**Key patterns:**

1. **Shared test data:**
   - **Detected:** `createEmptyAnalysisResult()` factory creates consistent test data
   - **Detected:** All 7 generators called with identical inputs

2. **Bulk validation:**
   - **Detected:** All 7 scaffolds validated with `forEach()` loops
   - **Detected:** Ensures consistent structure across all generators

3. **String content validation:**
   - **Detected:** Tests check generated markdown contains expected markers
   - **Detected:** Validates scaffold marker, project name, timestamp

4. **No filesystem operations:**
   - **Detected:** Tests work entirely in-memory (no temp directories)
   - **Inferred:** Scaffold generation is pure function (no side effects)

---

**Writing new tests: Key takeaways**

1. **Use temporary directories** for file system tests (not mocks)
2. **Inject `DetectionCollector`** to validate error handling
3. **Create fixtures inline** when possible (self-documenting)
4. **Validate confidence scores** with `toBeCloseTo()` for floating point values
5. **Check both return values AND side effects** (e.g., logged errors)
6. **Use `beforeEach/afterEach`** for test isolation with cleanup
7. **Use `describe()` nesting** to organize related tests
8. **Write descriptive test names** in plain English
9. **Add timeouts** for slow operations (WASM parsing, large projects)
10. **Test edge cases explicitly** (empty files, corrupted JSON, permission errors)

---

*Last updated: 2026-03-23T20:38:22.875Z*
