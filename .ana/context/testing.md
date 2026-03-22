# Testing — anatomia-workspace

## Test Framework

**Detected:** Vitest 2.0+ with globals enabled across CLI and analyzer packages

**CLI package configuration** from `packages/cli/vitest.config.ts` (lines 1-25):
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

**Analyzer package configuration** from `packages/analyzer/vitest.config.ts` (lines 1-25):
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
- **Local run:** `pnpm test` from package directory or root (via Turborepo)
- **Coverage:** `pnpm test:coverage` (analyzer package only)
- **CI run:** `pnpm test --run` (non-watch mode, from `.github/workflows/test.yml`, line 42)

**Detected:** V8 coverage provider with text, JSON, and HTML reporters

**Detected:** Node environment (not jsdom) for all tests — CLI and analyzer are Node.js tools, not browser code

## Test Structure

**Detected:** Package-level test organization with feature-based subdirectories

**CLI package** (`packages/cli/tests/`):
- `/scaffolds/` — Scaffold generator tests (8 files for each scaffold + all-scaffolds.test.ts)
- `/commands/` — Command tests (init.test.ts, setup.test.ts, check.test.ts, setup-complete-integration.test.ts)
- `/e2e/` — End-to-end tests (init-flow.test.ts — spawns real CLI process)
- `/contract/` — Analyzer contract tests (analyzer-contract.test.ts — validates analyzer API stability)
- `/performance/` — Performance benchmarks (benchmarks.test.ts)
- `/utils/` — Utility function tests (validators.test.ts, format-analysis-brief.test.ts)
- `/templates/` — Template rendering tests (cross-platform.test.ts)
- `/cleanup/` — Old system removal verification (old-system-removed.test.ts)

**Analyzer package** (`packages/analyzer/tests/`):
- `/parsers/` — Parser tests (node.test.ts, python.test.ts, go-rust.test.ts, ruby-php.test.ts, node-package.test.ts, detectLanguage.test.ts, error-handling.test.ts, extraction.test.ts, parserManager.test.ts, parsing.test.ts)
- `/detectors/` — Framework detection tests (node-frameworks.test.ts, python-frameworks.test.ts, go-rust-frameworks.test.ts)
- `/analyzers/` — Feature analysis tests organized by analyzer type:
  - `/patterns/` — Pattern detection (confidence.test.ts, confirmation.test.ts, dependencies.test.ts, integration.test.ts, multiPattern.test.ts, performance.test.ts)
  - `/architecture-*.test.ts` — Architecture detection (layered-ddd.test.ts, microservices-etc.test.ts)
  - `/entryPoints-*.test.ts` — Entry point detection per language
  - `/testLocations.test.ts` — Test directory detection
- `/cache/` — AST cache tests (astCache.test.ts)
- `/conventions/` — Convention detection (naming.test.ts, imports.test.ts, indentation.test.ts, docstrings.test.ts, typeHints.test.ts, edge-cases.test.ts, integration.test.ts)
- `/integration/` — Integration tests (structure-analysis.test.ts, edge-cases.test.ts, parsed-integration.test.ts)
- `/performance/` — Performance tests (parsing-performance.test.ts)
- `/*-backward-compat.test.ts` — Backward compatibility tests for API stability

**File naming:** All tests use `*.test.ts` suffix

**Test discovery:** `include: ['tests/**/*.test.ts']` in vitest.config.ts

## Fixture Patterns

**Detected:** Two fixture approaches — factory functions for test data and file-based fixtures for parser tests

### Factory Functions for Test Data

**Detected:** Shared factory in CLI tests creates empty analysis results

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

**Usage:** Scaffold tests use this factory to test edge cases (analyzer failures, minimal data scenarios)

**Detected:** Inline object construction for rich test data

Example from `packages/cli/tests/scaffolds/project-overview-scaffold.test.ts` (lines 12-40):
```typescript
const richAnalysis: AnalysisResult = {
  projectType: 'python',
  framework: 'fastapi',
  confidence: { projectType: 1.0, framework: 0.95 },
  indicators: {
    projectType: ['pyproject.toml'],
    framework: ['fastapi in dependencies'],
  },
  detectedAt: timestamp,
  version: '0.2.0',
  structure: {
    architecture: 'layered',
    confidence: { architecture: 0.85 },
    entryPoints: ['src/main.py', 'src/api/app.py'],
    testLocation: 'tests/',
    directories: { src: 'src/', tests: 'tests/', api: 'src/api/' },
    configFiles: ['pyproject.toml', 'pytest.ini'],
  },
  patterns: {
    testing: {
      library: 'pytest',
      confidence: 1.0,
      evidence: ['pytest in dependencies'],
    },
    sampledFiles: 20,
    detectionTime: 5000,
    threshold: 0.7,
  },
};
```

**Pattern:** Build complete test data inline when testing scaffold generation — tests full rendering, not simplified edge cases

### File-Based Fixtures for Parser Tests

**Detected:** Fixture loader utility for tree-sitter parser tests

Example from `packages/analyzer/tests/fixtures.ts` (lines 1-34):
```typescript
/**
 * Fixture loader utility for parser tests
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load fixture file content
 */
export async function loadFixture(
  language: string,
  format: string,
  name: string
): Promise<string> {
  const fixturePath = path.join(
    __dirname,
    'fixtures',
    language,
    format,
    `${name}.txt`
  );

  try {
    return await fs.readFile(fixturePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to load fixture: ${fixturePath}`);
  }
}
```

**Organization:** Fixtures stored in `tests/fixtures/{language}/{format}/{name}.txt` directory structure

**Purpose:** Parser tests load real code samples to verify AST extraction across languages (Python, TypeScript, JavaScript, Go)

### Temporary Directory Pattern for Integration Tests

**Detected:** E2E and cache tests create isolated temp directories with beforeEach/afterEach cleanup

Example from `packages/cli/tests/e2e/init-flow.test.ts` (lines 23-38):
```typescript
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

afterEach(async () => {
  await fs.rm(tmpProject, { recursive: true, force: true });
});
```

**Pattern:** Each test gets fresh temp directory, executes real CLI commands, verifies file creation, then cleans up

Example from `packages/analyzer/tests/cache/astCache.test.ts` (lines 13-29):
```typescript
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

**Pattern:** Unique temp dir per test (timestamp + random suffix prevents collisions), real file creation for cache validation tests

## Mocking Approach

**Detected:** Minimal mocking — tests use real implementations where possible

**No vi.mock or jest.mock detected** — Tests execute real code paths

**Primary testing strategies:**
1. **Real execution with test data** — Scaffold tests pass real AnalysisResult objects to generators
2. **Temporary filesystems** — E2E tests create real temp directories and execute real CLI
3. **Singleton pattern testing** — Parser manager tests verify singleton behavior without mocking

Example from `packages/analyzer/tests/parsers/parserManager.test.ts` (lines 5-10):
```typescript
it('getInstance returns singleton', () => {
  const instance1 = ParserManager.getInstance();
  const instance2 = ParserManager.getInstance();

  expect(instance1).toBe(instance2);  // Same instance
});
```

**Pattern:** Test real singleton behavior by calling getInstance() twice and verifying reference equality

Example from `packages/analyzer/tests/parsers/parserManager.test.ts` (lines 12-18):
```typescript
it('creates Python parser', () => {
  const manager = ParserManager.getInstance();
  const parser = manager.getParser('python');

  expect(parser).toBeDefined();
  expect(typeof parser.parse).toBe('function');
});
```

**Pattern:** Tests verify real tree-sitter parser creation — no mocks for native modules

**Why no mocking?**
- Tree-sitter parsers are critical path — must test real behavior across platforms
- Scaffold generators are pure functions — easy to test with real data
- Cache behavior depends on real filesystem mtime — mocking would hide bugs

**Exception — subprocess execution:**

Example from `packages/cli/tests/e2e/init-flow.test.ts` (lines 42-44):
```typescript
await execFileAsync('node', [cliPath, 'init', '--skip-analysis'], {
  cwd: tmpProject,
});
```

**Pattern:** E2E tests spawn real CLI process with execFileAsync (promisified child_process.execFile) — not mocked, but isolated in temp directory

## Coverage Expectations

**Detected:** Different thresholds per package based on testability

### CLI Package Coverage

From `packages/cli/vitest.config.ts` (lines 17-22):
```typescript
thresholds: {
  lines: 80,
  branches: 75,
  functions: 80,
  statements: 80,
},
```

**Target:** 80% lines/functions/statements, 75% branches

**Exclusions:**
- `dist/**` (build output)
- `**/*.test.ts` (tests themselves)
- `src/test-*.ts` (validation scripts)
- `src/index.ts` (CLI entry point — just imports)

### Analyzer Package Coverage

From `packages/analyzer/vitest.config.ts` (lines 17-22):
```typescript
thresholds: {
  lines: 85,
  branches: 80,
  functions: 85,
  statements: 85,
},
```

**Target:** 85% lines/functions/statements, 80% branches

**Inferred:** Higher thresholds for analyzer (85% vs 80%) because it's a library with well-defined API surface — fewer UI paths, more deterministic logic

**Exclusions:**
- `dist/**` (build output)
- `**/*.test.ts` (tests themselves)
- `src/index.ts` (entry point — just exports)

### CI Coverage Enforcement

From `.github/workflows/test.yml` (lines 44-50):
```yaml
- name: Upload coverage (Ubuntu + Node 20 only)
  if: matrix.os == 'ubuntu-latest' && matrix.node-version == 20
  uses: codecov/codecov-action@v4
  with:
    files: ./packages/cli/coverage/coverage-final.json
    fail_ci_if_error: false
    token: ${{ secrets.CODECOV_TOKEN }}
```

**Detected:** Coverage uploaded to Codecov from Ubuntu + Node 20 matrix combination only (avoids duplicate uploads)

**Detected:** `fail_ci_if_error: false` — coverage upload failures don't block CI (Codecov outages won't break builds)

**Inferred:** Vitest coverage thresholds enforce coverage locally and in CI (test command fails if below threshold) — Codecov upload is for tracking/visualization, not enforcement

## Example Test Structure

**Complete test example** showing fixture setup, multiple test cases, and async file operations

From `packages/analyzer/tests/cache/astCache.test.ts` (lines 1-93):
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, rm, mkdir, stat, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ASTCache } from '../../src/cache/astCache.js';
import type { ASTCacheEntry } from '../../src/cache/astCache.js';

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

  describe('Cache miss behavior', () => {
    it('get() returns null on cache miss (file not in cache)', async () => {
      // Given: Cache is empty
      const stats = cache.getStats();
      expect(stats.files).toBe(0);

      // When: Getting non-cached file
      const result = await cache.get(testFilePath);

      // Then: Returns null and increments misses
      expect(result).toBeNull();
      expect(cache.getStats().misses).toBe(1);
      expect(cache.getStats().hits).toBe(0);
    });
  });

  describe('Memory cache behavior', () => {
    it('set() stores data in memory cache', async () => {
      // Given: Cache entry data
      const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'hello', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        exports: [],
        decorators: [],
        parseTime: 42,
      };

      // When: Storing in cache
      await cache.set(testFilePath, cacheData);

      // Then: Memory cache contains the entry
      const stats = cache.getStats();
      expect(stats.files).toBe(1);
    });

    it('get() returns cached data on hit (memory cache)', async () => {
      // Given: Data stored in cache
      const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'hello', line: 1, async: false, decorators: [] }],
        classes: [{ name: 'World', line: 5, superclasses: [], methods: [], decorators: [] }],
        imports: [{ module: 'os', names: ['path'], line: 1 }],
        parseTime: 42,
      };
      await cache.set(testFilePath, cacheData);

      // When: Getting cached file
      const result = await cache.get(testFilePath);

      // Then: Returns cached data and increments hits
      expect(result).not.toBeNull();
      expect(result!.functions).toHaveLength(1);
      expect(result!.functions[0].name).toBe('hello');
      expect(result!.classes).toHaveLength(1);
      expect(result!.classes[0].name).toBe('World');
      expect(result!.imports).toHaveLength(1);
      expect(result!.imports[0].module).toBe('os');
      expect(result!.parseTime).toBe(42);
      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(0);
    });
  });
});
```

**Key patterns demonstrated:**
1. **Global test state** — `let` declarations at describe scope, initialized in beforeEach
2. **Async setup/teardown** — beforeEach/afterEach both return promises for file operations
3. **Unique temp directories** — Timestamp + random suffix prevents test collisions
4. **Given/When/Then comments** — Explicit test phase markers for readability
5. **Nested describes** — Group related tests by feature area
6. **Type safety** — `Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'>` for partial test data
7. **Non-null assertions** — `result!.functions` after null check (TypeScript strict mode)
8. **Multiple assertions per test** — Verify both return value and side effects (stats)

**Another complete example** showing pattern detection with confidence scoring

From `packages/analyzer/tests/analyzers/patterns/confidence.test.ts` (lines 10-38):
```typescript
describe('Confidence Scoring and Filtering', () => {
  describe('filterByConfidence', () => {
    it('includes patterns ≥ threshold', () => {
      const patterns: Partial<Record<string, PatternConfidence>> = {
        validation: { library: 'pydantic', confidence: 0.95, evidence: [] },
        database: { library: 'sqlalchemy', confidence: 0.70, evidence: [] },  // Exactly at threshold
        auth: { library: 'jwt', confidence: 0.80, evidence: [] },
      };

      const filtered = filterByConfidence(patterns, 0.7);

      expect(filtered['validation']).toBeDefined();  // 0.95 ≥ 0.7 ✓
      expect(filtered['database']).toBeDefined();    // 0.70 ≥ 0.7 ✓ (edge case)
      expect(filtered['auth']).toBeDefined();        // 0.80 ≥ 0.7 ✓
    });

    it('excludes patterns < threshold', () => {
      const patterns: Partial<Record<string, PatternConfidence>> = {
        validation: { library: 'pydantic', confidence: 0.95, evidence: [] },
        database: { library: 'sqlalchemy', confidence: 0.68, evidence: [] },
        auth: { library: 'jwt', confidence: 0.45, evidence: [] },
      };

      const filtered = filterByConfidence(patterns, 0.7);

      expect(filtered['validation']).toBeDefined();    // 0.95 ≥ 0.7 ✓
      expect(filtered['database']).toBeUndefined();    // 0.68 < 0.7 ✗
      expect(filtered['auth']).toBeUndefined();        // 0.45 < 0.7 ✗
    });
  });
});
```

**Key patterns demonstrated:**
1. **Nested describe blocks** — Organize by function/feature, then by test case
2. **Partial type for test data** — `Partial<Record<string, PatternConfidence>>` avoids full object construction
3. **Inline comments as assertions** — `// 0.95 ≥ 0.7 ✓` documents expected behavior
4. **Edge case testing** — Explicitly test threshold boundary (0.70 exactly at threshold)
5. **toBeDefined/toBeUndefined** — Test presence/absence in filtered object

**E2E test example** showing real CLI execution and file verification

From `packages/cli/tests/e2e/init-flow.test.ts` (lines 40-129):
```typescript
it('creates all 36 files in .ana/ (24 static + 8 generated + 2 JSON + 2 hooks)', async () => {
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

  // Verify .meta.json
  const metaExists = await fileExists(path.join(anaPath, '.meta.json'));
  expect(metaExists).toBe(true);

  const metaContent = await fs.readFile(path.join(anaPath, '.meta.json'), 'utf-8');
  const meta = JSON.parse(metaContent);
  expect(meta.setupStatus).toBe('pending');
  expect(meta.version).toBe('1.0.0');

  // Count total files in .ana/
  const allFiles = await findAllFiles(anaPath);
  // 8 generated + 24 copied + 2 JSON + 2 hooks = 36
  expect(allFiles.length).toBe(36);
}, 30000); // 30s timeout
```

**Key patterns demonstrated:**
1. **Real CLI execution** — `execFileAsync('node', [cliPath, 'init', '--skip-analysis'])` spawns real process
2. **Array-driven assertions** — Loop through expected dirs/files to verify creation
3. **Custom error messages** — `expect(exists, \`Directory missing: ${dir}\`).toBe(true)` for debugging
4. **File content verification** — Read JSON, parse, verify structure
5. **Recursive file counting** — Verify total file count with helper function
6. **Extended timeout** — `30000` (30s) for slower E2E operations
7. **Helper functions** — `dirExists`, `fileExists`, `findAllFiles` extracted to bottom of file

---

*Last updated: 2026-03-21*
