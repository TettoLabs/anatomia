# Testing — anatomia-workspace

## Test Framework

**Detected:** Vitest 2.0+ (CLI) and Vitest 4.0+ (Analyzer) with Node environment

**Test runner config (analyzer):** `packages/analyzer/vitest.config.ts` (lines 1-25):
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

**Test runner config (CLI):** `packages/cli/vitest.config.ts` (lines 1-26):
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

**User confirmed:** CI via GitHub Actions runs tests on multi-platform matrix (Linux/Mac/Windows, Node 20/22)

**Detected:** Test commands from `package.json`:
- `pnpm test` — Run all tests in workspace
- `vitest` — Run tests in specific package (from package directories)
- `vitest --coverage` — Run with coverage report (analyzer package)

**Detected:** Global test helpers enabled via `globals: true` — no need to import `describe`, `it`, `expect` in test files

## Test Structure

**Detected:** Tests organized in `tests/` directory parallel to `src/` in each package

**Directory structure (CLI package):** `packages/cli/tests/`:
```
tests/
├── commands/           # Command unit tests
│   ├── check.test.ts
│   ├── index.test.ts
│   ├── init.test.ts
│   ├── setup.test.ts
│   └── setup-complete-integration.test.ts
├── contract/           # Contract tests for analyzer API
│   └── analyzer-contract.test.ts
├── e2e/               # End-to-end tests
│   └── init-flow.test.ts
├── performance/       # Performance benchmarks
│   └── benchmarks.test.ts
├── scaffolds/         # Scaffold validation tests
│   ├── all-scaffolds.test.ts
│   ├── architecture-scaffold.test.ts
│   ├── conventions-scaffold.test.ts
│   ├── debugging-scaffold.test.ts
│   ├── patterns-scaffold.test.ts
│   ├── project-overview-scaffold.test.ts
│   ├── testing-scaffold.test.ts
│   ├── workflow-scaffold.test.ts
│   └── test-types.ts  # Shared test types
├── templates/         # Template cross-platform tests
│   └── cross-platform.test.ts
└── utils/             # Utility unit tests
    ├── format-analysis-brief.test.ts
    └── validators.test.ts
```

**Directory structure (Analyzer package):** `packages/analyzer/tests/`:
```
tests/
├── analyzers/         # Analysis logic tests
│   ├── patterns/      # Pattern inference tests
│   │   ├── confidence.test.ts
│   │   ├── confirmation.test.ts
│   │   ├── dependencies.test.ts
│   │   ├── integration.test.ts
│   │   ├── multiPattern.test.ts
│   │   ├── performance.test.ts
│   │   └── fixtures/testProjects.ts
│   ├── architecture-*.test.ts  # Architecture detection
│   ├── entryPoints-*.test.ts   # Entry point detection
│   └── testLocations.test.ts
├── cache/             # AST caching tests
│   └── astCache.test.ts
├── conventions/       # Convention detection tests
│   ├── docstrings.test.ts
│   ├── edge-cases.test.ts
│   ├── imports.test.ts
│   ├── indentation.test.ts
│   ├── integration.test.ts
│   ├── naming.test.ts
│   └── typeHints.test.ts
├── detectors/         # Framework/project type detection
│   ├── go-rust-frameworks.test.ts
│   ├── node-frameworks.test.ts
│   ├── projectType.test.ts
│   └── python-frameworks.test.ts
├── integration/       # Integration tests
│   ├── edge-cases.test.ts
│   ├── parsed-integration.test.ts
│   ├── structure-analysis.test.ts
│   └── wasm-smoke.test.ts
├── parsers/           # Tree-sitter parser tests
│   ├── detectLanguage.test.ts
│   ├── error-handling.test.ts
│   ├── extraction.test.ts
│   ├── go-rust.test.ts
│   ├── node-package.test.ts
│   ├── node.test.ts
│   ├── parserManager.test.ts
│   ├── parsing.test.ts
│   ├── python.test.ts
│   └── ruby-php.test.ts
├── performance/       # Performance benchmarks
│   └── parsing-performance.test.ts
└── *-backward-compat.test.ts  # Backward compatibility tests
```

**Naming convention:** `*.test.ts` for all test files

**Grouping strategy:** Tests mirror source structure — `src/commands/setup.ts` → `tests/commands/setup.test.ts`

**Test types detected:**
- **Unit tests:** Individual function/module tests (validators.test.ts, naming.test.ts)
- **Integration tests:** Multi-component tests (patterns/integration.test.ts, structure-analysis.test.ts)
- **Contract tests:** API contract validation (contract/analyzer-contract.test.ts)
- **E2E tests:** Full workflow tests (e2e/init-flow.test.ts)
- **Performance tests:** Benchmarks with time gates (performance/benchmarks.test.ts, parsing-performance.test.ts)
- **Backward compatibility tests:** Ensure old snapshots still parse (*-backward-compat.test.ts)

## Fixture Patterns

**Detected:** Multiple fixture approaches depending on test type

### Temp Directory Fixtures (CLI tests)

**Pattern:** Create temporary directories in `beforeEach`, clean up in `afterEach`

Example from `packages/cli/tests/commands/setup.test.ts` (lines 23-33):
```typescript
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-test-'));
  anaPath = path.join(tmpDir, '.ana');
  await fs.mkdir(anaPath, { recursive: true });
  await fs.mkdir(path.join(anaPath, 'context'), { recursive: true });
  await fs.mkdir(path.join(anaPath, '.state'), { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});
```

**Pattern usage:** All command tests that need filesystem state use this pattern

### Factory Functions (Test data creation)

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

**Pattern usage:** Tests use factory to create baseline objects, then override specific fields:
```typescript
const analysis: AnalysisResult = {
  ...createEmptyAnalysisResult(),
  patterns: {
    errorHandling: { library: 'exceptions', confidence: 0.9, evidence: [] },
    validation: { library: 'pydantic', confidence: 0.9, evidence: [] },
    testing: { library: 'pytest', confidence: 1.0, evidence: [] },
    sampledFiles: 20,
    detectionTime: 5000,
    threshold: 0.7,
  },
};
```

### Test Project Fixtures (Analyzer tests)

**Detected:** 30 test projects with ground truth labels in `packages/analyzer/tests/analyzers/patterns/fixtures/testProjects.ts`

Example from `testProjects.ts` (lines 32-46):
```typescript
export const testProjects: TestProject[] = [
  {
    name: 'fastapi-users',
    url: 'https://github.com/fastapi-users/fastapi-users',
    language: 'python',
    framework: 'fastapi',
    description: 'FastAPI authentication library',
    expected: {
      validation: 'pydantic',
      database: 'sqlalchemy',
      databaseVariant: 'async',
      auth: 'jwt',
      testing: 'pytest',
      errorHandling: 'exceptions',
    }
  },
  // ... 29 more projects
];
```

**Pattern usage:** Integration tests validate detection accuracy against real open-source projects (30 total: 10 Python, 10 Node.js, 5 Go, 5 Rust)

### No Shared Fixture Files

**Detected:** Tests use inline setup (beforeEach) or factory functions, not separate fixture files like `conftest.py` or `tests/fixtures/*.ts`

## Mocking Approach

**Detected:** Vitest mocking with `vi.mock()` for filesystem and I/O operations

### Module Mocking Pattern

Example from `packages/analyzer/tests/detectors/node-frameworks.test.ts` (lines 16-29):
```typescript
// Mock modules
vi.mock('../../src/utils/importScanner.js', () => ({
  scanForImports: vi.fn(),
}));

vi.mock('../../src/utils/file.js', () => ({
  exists: vi.fn(),
}));

// Import mocked functions
import { scanForImports } from '../../src/utils/importScanner.js';
import { exists } from '../../src/utils/file.js';

const mockScanForImports = vi.mocked(scanForImports);
const mockExists = vi.mocked(exists);
```

**Pattern usage:** Mock filesystem checks and import scanning to avoid hitting real filesystem

### Mock Implementation Pattern

Example from `packages/analyzer/tests/detectors/node-frameworks.test.ts` (lines 56-66):
```typescript
it('detects nextjs with next.config.js (0.95 confidence)', async () => {
  mockExists.mockImplementation(async (path: string) => {
    return path === '/test/project/next.config.js';
  });

  const result = await detectNextjs('/test/project', ['next']);

  expect(result.framework).toBe('nextjs');
  expect(result.confidence).toBeCloseTo(0.95, 2);
  expect(result.indicators).toContain('next in dependencies');
  expect(result.indicators).toContain('next.config.* found');
});
```

**Pattern usage:** Mock returns different values based on input arguments to simulate filesystem state

### Mock Reset Pattern

Example from `packages/analyzer/tests/detectors/node-frameworks.test.ts` (lines 32-34):
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

**Pattern usage:** Reset all mocks before each test to avoid state leakage between tests

### Minimal Mocking Philosophy

**Detected:** Tests prefer real code over mocks when possible

**Evidence:** Integration tests run against actual project (analyzer tests itself):
```typescript
it('includes patterns when skipPatterns=false', async () => {
  // Test on analyzer package itself
  const result = await analyze('.', { skipPatterns: false });

  expect(result.patterns).toBeDefined();
  expect(result.patterns?.threshold).toBe(0.7);
});
```

**Pattern:** Unit tests mock I/O, integration tests use real filesystem and real code

## Coverage Expectations

**Detected:** Different coverage thresholds for CLI and Analyzer packages

### Analyzer Package (Strict)

**Config:** `packages/analyzer/vitest.config.ts` (lines 16-21):
```typescript
thresholds: {
  lines: 85,
  branches: 80,
  functions: 85,
  statements: 85,
}
```

**Target:** 85% lines, 80% branches, 85% functions, 85% statements

**Exclusions:**
- `dist/**` — Build output
- `**/*.test.ts` — Test files
- `src/index.ts` — Entry point (just exports)

### CLI Package (Moderate)

**Config:** `packages/cli/vitest.config.ts` (lines 17-22):
```typescript
thresholds: {
  lines: 80,
  branches: 75,
  functions: 80,
  statements: 80,
}
```

**Target:** 80% lines, 75% branches, 80% functions, 80% statements

**Exclusions:**
- `dist/**` — Build output
- `**/*.test.ts` — Test files
- `src/test-*.ts` — Validation scripts
- `src/index.ts` — CLI entry (just imports)

### Coverage Provider

**Detected:** V8 coverage provider (native Node.js coverage)

**Reporters:** Text (terminal), JSON (CI), HTML (local browsing)

### CI Enforcement

**User confirmed:** GitHub Actions CI runs tests on multi-platform matrix (Linux/Mac/Windows, Node 20/22)

**Detected:** Coverage uploaded to Codecov from Ubuntu + Node 20 job only (from `.github/workflows/test.yml` lines 44-50, per exploration results)

**Enforcement:** Coverage thresholds enforced locally during test runs (fail if below threshold), but Codecov upload is optional (doesn't fail CI)

## Example Test Structure

**Complete test example** showing fixtures, assertions, and async handling:

From `packages/cli/tests/e2e/init-flow.test.ts` (lines 40-79):
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
}, 30000); // 30s timeout
```

**Pattern breakdown:**
1. **Setup:** `beforeEach` creates temp directory with package.json
2. **Test:** Execute real CLI command via `execFileAsync`
3. **Assertions:** Loop through expected files/directories, assert existence
4. **Async:** All I/O operations use `await`
5. **Cleanup:** `afterEach` removes temp directory
6. **Timeout:** Long timeout (30s) for E2E test that compiles and runs CLI
7. **Custom matchers:** `expect(exists, 'Directory missing: ${dir}')` provides context on failure

**Unit test example** with mocking and precise assertions:

From `packages/analyzer/tests/detectors/node-frameworks.test.ts` (lines 80-92):
```typescript
it('detects nextjs with app directory - App Router (1.0 confidence)', async () => {
  mockExists.mockImplementation(async (path: string) => {
    return path === '/test/project/next.config.js' || path === '/test/project/app';
  });

  const result = await detectNextjs('/test/project', ['next']);

  expect(result.framework).toBe('nextjs');
  expect(result.confidence).toBe(1.0);
  expect(result.indicators).toContain('next in dependencies');
  expect(result.indicators).toContain('next.config.* found');
  expect(result.indicators).toContain('app/ directory (App Router)');
});
```

**Pattern breakdown:**
1. **Mock setup:** Configure mock to return true for specific paths
2. **Execute:** Call function under test with mocked dependencies
3. **Assertions:** Validate exact values (framework, confidence) and array contents (indicators)
4. **Precision:** `toBe(1.0)` for exact match, `toContain()` for array membership

**Performance test example** with time gates:

From `packages/analyzer/tests/performance/parsing-performance.test.ts` (lines 14-56):
```typescript
it('parses 20 files in ≤5 seconds', async () => {
  const projectRoot = process.cwd();
  const analysis = await analyze(projectRoot, { skipParsing: true });

  if (!analysis.structure) {
    console.log('⏭️  Skipping (no structure analysis available)');
    return;
  }

  const files = await sampleFiles(projectRoot, analysis, { maxFiles: 20 });

  if (files.length === 0) {
    console.log('⏭️  Skipping (no parseable files found)');
    return;
  }

  const startTime = performance.now();

  for (const file of files) {
    const absolutePath = joinPath(projectRoot, file);
    const language = detectLanguage(absolutePath);
    if (language) {
      try {
        await parseFile(absolutePath, language);
      } catch {
        // Skip files that fail to parse
        continue;
      }
    }
  }

  const elapsed = performance.now() - startTime;

  console.log(`\n📊 Performance Benchmark:`);
  console.log(`   Files parsed: ${files.length}`);
  console.log(`   Total time: ${elapsed.toFixed(0)}ms`);
  console.log(`   Average: ${(elapsed / files.length).toFixed(1)}ms per file`);
  console.log(`   Target: ≤5000ms (5 seconds)`);
  console.log(`   Result: ${elapsed < 5000 ? '✅ PASS' : '❌ FAIL'}`);

  expect(elapsed).toBeLessThan(5000);  // Strict gate
}, 10000);  // 10s timeout
```

**Pattern breakdown:**
1. **Graceful skip:** If test preconditions not met, log skip reason and return early
2. **Timing:** `performance.now()` before and after operation
3. **Logging:** Print detailed benchmark results to console (files, time, average, result)
4. **Assertion:** Strict time gate with `expect(elapsed).toBeLessThan(5000)`
5. **Timeout:** Test timeout (10s) higher than strict gate (5s) to allow cleanup

---

*Last updated: 2026-03-24T19:00:00Z*
