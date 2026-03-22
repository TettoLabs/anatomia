# Testing — anatomia-workspace

## Test Framework

**Detected:** Vitest 2.0.0 (CLI package) and Vitest 4.0.18 (analyzer package) with Node.js environment (from `packages/cli/vitest.config.ts` and `packages/analyzer/vitest.config.ts`)

**Configuration** from `packages/cli/vitest.config.ts` (lines 1-25):
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

**Configuration** from `packages/analyzer/vitest.config.ts` (lines 1-25):
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

**Test commands:**
- `pnpm test` — Run all tests across all packages (from root `package.json`)
- `pnpm test` in package — Run package-specific tests via Vitest
- `pnpm test:coverage` — Generate coverage reports (if configured)

**Key configuration features:**
- **Global APIs enabled** (`globals: true`) — `describe`, `it`, `expect` available without imports
- **Node.js environment** — Tests run in Node runtime, not browser or jsdom
- **Test pattern** — All files matching `tests/**/*.test.ts`
- **Coverage provider** — v8 (Node.js native coverage)
- **Coverage reporters** — text (console), json (CI), html (local viewing)

**Detected:** Higher coverage thresholds in analyzer package (85% lines/functions/statements) vs CLI package (80% lines/functions/statements, 75% branches) — suggests core analysis engine held to stricter quality bar

## Test Structure

**Test directories:**

CLI package (`packages/cli/tests/`):
- `contract/` — Analyzer API contract tests (1 file)
- `e2e/` — End-to-end command execution tests (1 file)
- `scaffolds/` — Scaffold generation tests (8 files)
- `commands/` — Command logic tests (4 files)
- `utils/` — Utility function tests (2 files)
- `templates/` — Template validation tests (1 file)
- `performance/` — Performance benchmark tests (1 file)
- `cleanup/` — Legacy system removal tests (1 file)

Analyzer package (`packages/analyzer/tests/`):
- `parsers/` — Tree-sitter parser tests (8 files)
- `detectors/` — Project type and framework detection (3 files)
- `analyzers/` — Structure, patterns, conventions analysis (8 files)
- `analyzers/patterns/` — Pattern inference subsystem (6 files)
- `conventions/` — Convention detection (7 files)
- `cache/` — AST caching system (1 file)
- `integration/` — Integration tests (3 files)
- `*-backward-compat.test.ts` — Backward compatibility tests (4 files)
- `types.test.ts` — Type validation tests (1 file)

**Test file naming:**
- Convention: `*.test.ts` (all test files)
- Pattern: `{feature}.test.ts` — e.g., `validators.test.ts`, `parserManager.test.ts`
- Pattern: `{feature}-backward-compat.test.ts` — backward compatibility tests
- Pattern: `{scope}-{variant}.test.ts` — e.g., `node-frameworks.test.ts`, `python.test.ts`

**Test grouping:**
- Top-level `describe()` blocks group related tests by feature
- Nested `describe()` blocks for sub-features or scenarios
- `it()` blocks describe specific behaviors

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
});
```

**Organizational principles:**
1. **Feature-based grouping** — Tests organized by feature area, not file structure
2. **Layered testing** — Unit tests (parsers, detectors), integration tests (full analysis), E2E tests (CLI commands)
3. **Scenario-based grouping** — Tests grouped by edge cases (e.g., "Scenario B — analyzer returned no/minimal data")
4. **Backward compatibility isolation** — Separate files for API stability tests

## Fixture Patterns

**Factory functions for test data:**

**Detected:** `createEmptyAnalysisResult()` factory in `packages/cli/tests/scaffolds/test-types.ts` (lines 89-104):
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

**Purpose:** Avoids importing anatomia-analyzer in CLI tests (prevents tree-sitter native module dependency issues), provides clean baseline for testing scaffold generation with empty data

**Detected:** Scenario-specific factories in `packages/cli/tests/utils/validators.test.ts` (lines 36-60):
```typescript
/**
 * Create minimal AnalysisResult for Scenario B testing
 * Simulates what analyzer returns when tree-sitter fails
 */
function createScenarioBSnapshot(): AnalysisResult {
  return {
    projectType: 'unknown',
    framework: null,
    confidence: { projectType: 0, framework: 0 },
    indicators: { projectType: [], framework: [] },
    detectedAt: new Date().toISOString(),
    version: '0.1.0',
    // patterns: undefined - not present
  };
}

/**
 * Create AnalysisResult with framework = "none" (string)
 */
function createFrameworkNoneSnapshot(): AnalysisResult {
  return {
    projectType: 'node',
    framework: 'none',
    confidence: { projectType: 0.5, framework: 0 },
    indicators: { projectType: ['package.json'], framework: [] },
    detectedAt: new Date().toISOString(),
    version: '0.1.0',
  };
}
```

**Purpose:** Tests edge cases where analyzer returns minimal data (Scenario B — empty scaffolds path)

**Temporary file system fixtures:**

**Detected:** `beforeEach`/`afterEach` pattern for isolated test environments in `packages/analyzer/tests/cache/astCache.test.ts` (lines 13-29):
```typescript
describe('ASTCache', () => {
  let tempDir: string;
  let cache: ASTCache;
  let testFilePath: string;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = join(tmpdir(), `ana-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });

    // Create ASTCache instance
    cache = new ASTCache(tempDir);

    // Create a test file with real content
    testFilePath = join(tempDir, 'test.py');
    await writeFile(testFilePath, 'def hello():\n    print("Hello")\n', 'utf8');
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });
```

**Pattern:** Each test gets isolated temporary directory with unique name (timestamp + random suffix), guaranteed cleanup even if test fails

**Detected:** Inline fixture creation for integration tests in `packages/analyzer/tests/analyzers/patterns/integration.test.ts` (lines 46-60):
```typescript
it('returns PatternAnalysis with metadata', async () => {
  // Create mock analysis
  const mockAnalysis: AnalysisResult = {
    projectType: 'python',
    framework: 'fastapi',
    confidence: { projectType: 0.95, framework: 0.90 },
    indicators: { projectType: [], framework: [] },
    detectedAt: new Date().toISOString(),
    version: '0.1.0',
    parsed: {
      files: [],
      totalParsed: 0,
      cacheHits: 0,
      cacheMisses: 0,
    },
  };

  const patterns = await inferPatterns('.', mockAnalysis);
```

**Pattern:** Fixtures built inline within test — clear intent, no shared mutable state

**No centralized fixture directories detected** — Fixtures created on-demand within tests or via factory functions

## Mocking Approach

**No mocking library detected** — Tests use real implementations where possible

**Detected:** Tests avoid mocking by:
1. **Using real temporary file systems** — E2E tests create actual temp directories
2. **Testing with actual CLI binary** — E2E tests execute compiled CLI via `execFile`
3. **Factory functions for test data** — Avoids complex mocking setup
4. **Dependency injection via parameters** — Functions accept dependencies as parameters (e.g., `ASTCache` passed to `parseFile`)

**Type-level mocking for testing invalid inputs:**

**Detected:** TypeScript `@ts-expect-error` comments bypass type checking in `packages/cli/tests/utils/validators.test.ts` (lines 64-84):
```typescript
it('returns 0 when analysis is null', () => {
  // @ts-expect-error - testing null input
  expect(countDetectedPatterns(null)).toBe(0);
});

it('returns 0 when analysis is undefined', () => {
  // @ts-expect-error - testing undefined input
  expect(countDetectedPatterns(undefined)).toBe(0);
});

it('returns 0 when analysis.patterns is null', () => {
  const snapshot = createScenarioBSnapshot();
  // @ts-expect-error - testing null patterns
  snapshot.patterns = null;
  expect(countDetectedPatterns(snapshot as never)).toBe(0);
});
```

**Purpose:** Validates runtime error handling for inputs TypeScript would normally reject

**Singleton pattern for reusable resources:**

**Detected:** ParserManager singleton tested in `packages/analyzer/tests/parsers/parserManager.test.ts` (lines 4-10):
```typescript
describe('ParserManager', () => {
  it('getInstance returns singleton', () => {
    const instance1 = ParserManager.getInstance();
    const instance2 = ParserManager.getInstance();

    expect(instance1).toBe(instance2);  // Same instance
  });
```

**Pattern:** Tests verify singleton behavior (same instance returned), then tests use the real singleton for parsing tests

**Process execution mocking:**

**Detected:** E2E tests execute real commands via `execFile` from `packages/cli/tests/e2e/init-flow.test.ts` (lines 17-34):
```typescript
const execFileAsync = promisify(execFile);

describe('ana init E2E', () => {
  let tmpProject: string;
  let cliPath: string;

  beforeEach(async () => {
    tmpProject = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-e2e-'));

    // Get path to built CLI
    cliPath = path.join(__dirname, '..', '..', 'dist', 'index.js');

    // Create minimal package.json in test project
    await fs.writeFile(
      path.join(tmpProject, 'package.json'),
      JSON.stringify({ name: 'test-project', version: '1.0.0' })
    );
  });
```

**Pattern:** Real CLI execution in isolated temp directories — no command mocking, tests actual behavior

**Key insight:** Project prefers integration testing with real implementations over unit testing with mocks — higher confidence in actual behavior

## Coverage Expectations

**CLI package thresholds** (from `packages/cli/vitest.config.ts`, lines 17-22):
```typescript
thresholds: {
  lines: 80,
  branches: 75,
  functions: 80,
  statements: 80,
},
```

**Analyzer package thresholds** (from `packages/analyzer/vitest.config.ts`, lines 17-22):
```typescript
thresholds: {
  lines: 85,
  branches: 80,
  functions: 85,
  statements: 85,
},
```

**Enforcement:**
- **Local enforcement** — Vitest fails test run if coverage below thresholds
- **CI enforcement** — GitHub Actions workflow runs tests with coverage on every push/PR
- **Coverage upload** — Codecov integration for ubuntu+node20 combination only (from exploration findings)

**Coverage exclusions:**
- `dist/**` — Build output (both packages)
- `**/*.test.ts` — Test files themselves (both packages)
- `src/test-*.ts` — Validation scripts (CLI only)
- `src/index.ts` — Entry point files that only import/export (both packages)

**Detected:** Matrix testing in CI runs tests on:
- **Operating systems:** ubuntu, windows, macos
- **Node versions:** 20, 22
- **fail-fast:** false (all combinations run even if one fails)

**Coverage gaps intentionally accepted:**
- Entry points (just imports/exports, no logic to test)
- Validation scripts used for one-off development tasks
- Platform-specific edge cases (different test coverage on different OSes)

## Example Test Structure

**Complete test demonstrating multiple patterns** from `packages/analyzer/tests/cache/astCache.test.ts` (lines 262-288):

```typescript
describe('mtime-based invalidation', () => {
  it('cache invalidates when file is modified', async () => {
    // Given: File cached
    const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
      functions: [{ name: 'original', line: 1, async: false, decorators: [] }],
      classes: [],
      imports: [],
      parseTime: 30,
    };
    await cache.set(testFilePath, cacheData);

    // Verify cache hit
    let result = await cache.get(testFilePath);
    expect(result).not.toBeNull();
    expect(result!.functions[0].name).toBe('original');
    expect(cache.getStats().hits).toBe(1);

    // When: File is modified (changing mtime)
    await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different mtime
    await writeFile(testFilePath, 'def modified():\n    print("Modified")\n', 'utf8');

    // Then: Cache miss (mtime mismatch)
    result = await cache.get(testFilePath);
    expect(result).toBeNull();
    expect(cache.getStats().misses).toBe(1);
  });
});
```

**Test structure breakdown:**
1. **Given-When-Then comments** — Clarifies test phases (setup, action, assertion)
2. **beforeEach setup** — Creates temp directory and cache instance (not shown, see lines 13-29)
3. **Explicit typing** — `Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'>` makes expectations clear
4. **Multiple assertions** — Verify both positive case (cache hit) and negative case (cache miss)
5. **Statistics tracking** — Validates not just return values but also internal state
6. **Real file operations** — Uses actual file system, not mocks
7. **Async/await** — All async operations properly awaited
8. **afterEach cleanup** — Removes temp directory (not shown, see lines 26-29)

**Contract test example** from `packages/cli/tests/contract/analyzer-contract.test.ts` (lines 42-61):

```typescript
it('catches field renames at compile time', () => {
  // These assignments will fail TypeScript compilation if fields renamed
  const result: AnalysisResult = createEmptyAnalysisResult();

  // Required field access
  const _type: string = result.projectType;
  const _fw: string | null = result.framework;
  const _conf: { projectType: number; framework: number } = result.confidence;
  const _indicators: { projectType: string[]; framework: string[] } = result.indicators;
  const _version: string = result.version;
  const _detectedAt: string = result.detectedAt;

  // Prevents unused variable warnings
  expect(_type).toBeDefined();
  expect(_conf).toBeDefined();
  expect(_indicators).toBeDefined();
  expect(_version).toBeDefined();
  expect(_detectedAt).toBeDefined();
});
```

**Purpose:** Validates CLI can access all required fields from analyzer's `AnalysisResult` type — if analyzer renames a field, this test fails at compile time, not runtime

**E2E test example** from `packages/cli/tests/e2e/init-flow.test.ts` (lines 40-80):

```typescript
it('creates all 40 files in .ana/ (27 static + 8 generated + 2 JSON + 3 hooks)', async () => {
  // Run ana init with --skip-analysis (faster, deterministic)
  await execFileAsync('node', [cliPath, 'init', '--skip-analysis'], {
    cwd: tmpProject,
  });

  const anaPath = path.join(tmpProject, '.ana');

  // Verify directories (7 including hooks/)
  const dirs = [
    'modes',
    'hooks',
    'context',
    'context/setup',
    'context/setup/steps',
    'context/setup/framework-snippets',
    '.state',
  ];

  for (const dir of dirs) {
    const exists = await dirExists(path.join(anaPath, dir));
    expect(exists, `Directory missing: ${dir}`).toBe(true);
  }

  // Verify generated files (8)
  const generatedFiles = [
    'context/analysis.md',
    'context/project-overview.md',
    'context/architecture.md',
    'context/patterns.md',
    'context/conventions.md',
    'context/workflow.md',
    'context/testing.md',
    'context/debugging.md',
  ];

  for (const file of generatedFiles) {
    const exists = await fileExists(path.join(anaPath, file));
    expect(exists, `Generated file missing: ${file}`).toBe(true);
  }

  // Count total files in .ana/
  const allFiles = await findAllFiles(anaPath);
  // 8 generated + 27 copied + 2 JSON + 3 hooks = 40
  expect(allFiles.length).toBe(40);
}, 30000); // 30s timeout
```

**E2E test characteristics:**
1. **Real CLI execution** — `execFileAsync` runs actual compiled binary
2. **Isolated environment** — Temp directory per test
3. **End-to-end validation** — Checks filesystem state after command completes
4. **Descriptive expectations** — Custom failure messages (`Directory missing: ${dir}`)
5. **Extended timeout** — 30s timeout for slow operations (default is 5s)
6. **Helper functions** — `dirExists`, `fileExists`, `findAllFiles` encapsulate common checks

**Performance test example** from `packages/analyzer/tests/analyzers/patterns/integration.test.ts` (lines 160-195):

```typescript
describe('Performance validation', () => {
  it('completes pattern inference within budget (<10s)', async () => {
    const mockAnalysis: AnalysisResult = {
      projectType: 'python',
      framework: 'fastapi',
      confidence: { projectType: 0.95, framework: 0.90 },
      indicators: { projectType: [], framework: [] },
      detectedAt: new Date().toISOString(),
      version: '0.1.0',
      parsed: {
        files: Array.from({ length: 20 }, (_, i) => ({
          file: `file${i}.py`,
          language: 'python',
          functions: [],
          classes: [],
          imports: [{ module: 'pydantic', names: ['BaseModel'], line: 1 }],
          decorators: [],
          parseTime: 0,
          parseMethod: 'cached' as const,
          errors: 0,
        })),
        totalParsed: 20,
        cacheHits: 20,
        cacheMisses: 0,
      },
    };

    const start = Date.now();
    const patterns = await inferPatterns('.', mockAnalysis);
    const duration = Date.now() - start;

    // Should complete quickly (dependency reading + confirmation)
    expect(duration).toBeLessThan(10000);  // <10s
    expect(patterns).toBeDefined();
  });
});
```

**Performance test pattern:**
1. **Setup realistic data** — 20 parsed files with imports (typical scenario)
2. **Measure execution time** — `Date.now()` before and after
3. **Assert performance budget** — `expect(duration).toBeLessThan(10000)`
4. **Validate correctness too** — Not just fast, but also returns valid data

**Edge case testing example** from `packages/cli/tests/utils/validators.test.ts` (lines 137-165):

```typescript
describe('validateCrossReferences — BF5 with no patterns', () => {
  let tempDir: string;
  let anaPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'validators-test-'));
    anaPath = tempDir;
    await fs.mkdir(path.join(anaPath, 'context'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('passes when snapshot is null (skips cross-reference check)', async () => {
    // Create minimal patterns.md
    await fs.writeFile(
      path.join(anaPath, 'context/patterns.md'),
      '# Patterns\n\nNo patterns detected by analyzer.\n'
    );
    await fs.writeFile(
      path.join(anaPath, 'context/project-overview.md'),
      '# Project Overview\n\n**Framework:** None detected\n'
    );

    // @ts-expect-error - testing null snapshot
    const errors = await validateCrossReferences(anaPath, null);
    expect(errors).toEqual([]);
  });
});
```

**Edge case testing pattern:**
1. **Scenario-based grouping** — "BF5 with no patterns" describes specific edge case
2. **Real file system** — Creates actual files to test validation logic
3. **Explicit null testing** — Tests handling of unexpected inputs
4. **Validation focus** — Tests error collection, not just success paths

**Test writing guidelines (inferred from examples):**
1. **One assertion per logical concept** — Multiple `expect()` calls OK if testing related aspects
2. **Descriptive test names** — "cache invalidates when file is modified" vs "test cache"
3. **AAA pattern** — Arrange (Given), Act (When), Assert (Then)
4. **Real implementations preferred** — Use mocks only when necessary
5. **Clean up after yourself** — `afterEach` removes temp files/directories
6. **Test both happy and sad paths** — Verify success cases and error handling
7. **Use TypeScript strictly** — Explicit types for test data, catch regressions at compile time

---

*Last updated: 2026-03-22T15:56:15.803Z*
