# Debugging — anatomia-workspace

## Logging

**Detected:** Console-based output with chalk colors — no structured logging library

The CLI uses direct `console.log()`, `console.error()`, and `console.warn()` calls for all output (from packages/cli/src/commands/):
- 136 console statements across 5 command files (check.ts: 24, mode.ts: 23, setup.ts: 35, init.ts: 47, analyze.ts: 7)
- chalk ^5.3.0 for colored output (packages/cli/package.json line 52)
- ora ^8.0.0 for terminal spinners (packages/cli/package.json line 55)

### Output Conventions

**Detected:** Color-coded severity system (from packages/cli/src/commands/):

```typescript
// Success messages (green checkmarks)
console.log(chalk.green(`${result.file}: 5/5 checks passed`));

// Errors (red text)
console.error(chalk.red('Error: .ana/context/ directory not found'));

// Warnings (yellow text)
console.log(chalk.yellow('  Setup will work but scaffolds will have no pre-populated data'));

// Details/context (gray text)
console.log(chalk.gray(`  Reason: ${error.message}`));
```

Example from `packages/cli/src/commands/check.ts` (lines 271-285):

```typescript
const lineIcon = result.line_count.pass ? chalk.green('✓') : chalk.red('✗');
console.log(`${lineIcon} Line count: ${result.line_count.count} lines`);

const headerIcon = result.headers.pass ? chalk.green('✓') : chalk.red('✗');
console.log(`${headerIcon} Required headers: ${result.headers.found.length}/${result.headers.required.length}`);
```

### Spinner Pattern

**Detected:** Ora spinners for long operations (from packages/cli/src/commands/init.ts):

```typescript
// Start operation
const spinner = ora('Creating directory structure...').start();

// Success outcome
spinner.succeed('Directory structure created');

// Warning (non-fatal)
spinner.warn('Analyzer failed — continuing with empty scaffolds');
```

Spinner examples from init.ts (lines 323, 330, 407, 438, 485):
- Analysis: "Analyzing codebase..." → succeed/warn
- Generation: "Generating scaffolds..." → succeed with line count
- File ops: "Copying static files..." → succeed with file count

### No Structured Logging

**Detected:** No logging library dependencies

From `packages/cli/package.json` (lines 50-56) and `packages/analyzer/package.json` (lines 59-69):
- No winston, pino, bunyan, or similar frameworks
- No log levels beyond console methods
- No log file persistence or rotation

**Inferred:** Logging design prioritizes human-readable CLI output over machine-parseable logs, appropriate for developer-facing terminal tool.

### Debug Mode

**Detected:** Verbose option for analyzer (from AnalyzeOptions type):

The `AnalyzeOptions` interface includes a `verbose?: boolean` field enabling diagnostic output during analysis.

## Error Tracing

**Detected:** Custom error classes with structured data (from packages/analyzer/src/errors/DetectionError.ts)

### Error Interface

Example from `packages/analyzer/src/errors/DetectionError.ts` (lines 13-40):

```typescript
export interface DetectionError {
  /** Machine-readable error code */
  code: string;
  /** User-friendly message */
  message: string;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  /** File that caused error (optional) */
  file?: string | undefined;
  /** Line number in file (optional) */
  line?: number | undefined;
  /** How to resolve (optional) */
  suggestion?: string | undefined;
  /** Detection phase that failed (optional) */
  phase?: string | undefined;
  /** Underlying error (optional) */
  cause?: Error | undefined;
  /** When error occurred */
  timestamp: Date;
}
```

### DetectionEngineError Class

Example from `packages/analyzer/src/errors/DetectionError.ts` (lines 45-80):

```typescript
export class DetectionEngineError extends Error {
  code: string;
  severity: 'error' | 'warning' | 'info';
  file?: string | undefined;
  line?: number | undefined;
  suggestion?: string | undefined;
  phase?: string | undefined;

  constructor(
    code: string,
    message: string,
    severity: 'error' | 'warning' | 'info' = 'error',
    options?: {
      file?: string;
      line?: number;
      suggestion?: string;
      phase?: string;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'DetectionEngineError';
    this.code = code;
    this.severity = severity;
    this.file = options?.file;
    this.line = options?.line;
    this.suggestion = options?.suggestion;
    this.phase = options?.phase;
    if (options?.cause) {
      this.cause = options.cause;
    }
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}
```

**Detected:** Stack trace capture using `Error.captureStackTrace(this, this.constructor)` from Node.js best practices (line 79)

### Error Code Registry

**Detected:** 18 error codes in ERROR_CODES constant (from packages/analyzer/src/errors/DetectionError.ts lines 106-133):

```typescript
export const ERROR_CODES = {
  // File operations
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  IS_DIRECTORY: 'IS_DIRECTORY',
  ENCODING_ERROR: 'ENCODING_ERROR',
  // Parsing
  INVALID_JSON: 'INVALID_JSON',
  INVALID_YAML: 'INVALID_YAML',
  INVALID_TOML: 'INVALID_TOML',
  PARSE_ERROR: 'PARSE_ERROR',
  // Detection
  NO_SOURCE_FILES: 'NO_SOURCE_FILES',
  NO_DEPENDENCIES: 'NO_DEPENDENCIES',
  FRAMEWORK_DETECTION_FAILED: 'FRAMEWORK_DETECTION_FAILED',
  MISSING_MANIFEST: 'MISSING_MANIFEST',
  CIRCULAR_DEPENDENCY: 'CIRCULAR_DEPENDENCY',
  IMPORT_SCAN_FAILED: 'IMPORT_SCAN_FAILED',
  // System
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;
```

### Error Collector Pattern

**Detected:** Non-fatal error aggregation (from packages/analyzer/src/errors/DetectionCollector.ts lines 1-47):

```typescript
/**
 * Collects errors during detection process
 * Enables graceful degradation with error aggregation
 */
export class DetectionCollector {
  private errors: DetectionError[] = [];
  private warnings: DetectionError[] = [];
  private info: DetectionError[] = [];

  addError(error: DetectionEngineError | DetectionError): void {
    const detectionError =
      error instanceof DetectionEngineError ? error.toDetectionError() : error;
    this.errors.push(detectionError);
  }

  addWarning(error: DetectionEngineError | DetectionError): void {
    const detectionError =
      error instanceof DetectionEngineError ? error.toDetectionError() : error;
    this.warnings.push(detectionError);
  }

  hasCriticalErrors(): boolean {
    return this.errors.length > 0;
  }

  getCounts() {
    return {
      errors: this.errors.length,
      warnings: this.warnings.length,
      info: this.info.length,
      total: this.getAllErrors().length,
    };
  }
}
```

**Inferred:** Collector pattern allows analysis to proceed when non-critical components fail, accumulating diagnostics for final report instead of failing fast.

### CLI Error Handling

**Detected:** Graceful degradation in init command (from packages/cli/src/commands/init.ts lines 329-339):

```typescript
} catch (error) {
  spinner.warn('Analyzer failed — continuing with empty scaffolds');
  console.log(chalk.yellow('  Setup will work but scaffolds will have no pre-populated data'));

  if (error instanceof Error) {
    console.log(chalk.gray(`  Reason: ${error.message}`));
  }
  console.log();

  return null;
}
```

**Detected:** Analyzer failures don't crash the CLI. The init command creates empty scaffolds instead of aborting.

Pattern: Try/catch with spinner.warn() instead of spinner.fail(), allowing setup to complete with degraded functionality.

### No Error Tracking Service

**Detected:** No Sentry, Bugsnag, Rollbar, or similar service

From dependency analysis:
- No error tracking dependencies in packages/cli/package.json
- No error tracking dependencies in packages/analyzer/package.json

**Inferred:** As a CLI tool run locally by developers, remote error tracking may not be necessary. Errors are visible immediately in terminal output.

## Failure Modes

### TypeScript Compilation Failures

**Symptom:** Build fails with type errors
**Cause:** TypeScript strict mode with 6 additional strictness flags
**Diagnosis:** Check compiler output for type error locations. Strict mode catches: noUncheckedIndexedAccess, noImplicitOverride, noPropertyAccessFromIndexSignature, noImplicitReturns, noFallthroughCasesInSwitch, exactOptionalPropertyTypes
**Fix:** Address type errors — strict mode is intentional, don't disable checks
**Prevention:** Run `pnpm build` before committing

### Tree-sitter Parser Failures

**Symptom:** Analysis produces empty results or missing pattern data
**Cause:** Tree-sitter parsing fails silently on malformed code or unsupported syntax
**Diagnosis:** Check if analyzer returns null/undefined for patterns (exploration results line 43-46). Enable verbose mode. Check file encoding (tree-sitter expects UTF-8)
**Fix:** Parser failures trigger graceful degradation — empty scaffolds are created
**Prevention:** Test on sample codebases with known good structure

Example from `packages/cli/src/utils/validators.ts` (lines 43-46):

```typescript
// Scenario B guard: analyzer may return null/undefined when tree-sitter fails
if (!analysis || !analysis.patterns) {
  return 0;
}
```

### Test Coverage Threshold Failures

**Symptom:** CI fails on coverage check
**Cause:** Code changes drop coverage below thresholds (80% lines, 75% branches, 80% functions, 80% statements)
**Diagnosis:** Run `pnpm test:coverage` locally. Check coverage report in coverage/ directory (HTML format). Identify uncovered lines in v8 report
**Fix:** Add test cases for uncovered code paths
**Prevention:** Check coverage before pushing

Thresholds from `packages/cli/vitest.config.ts` (lines 17-22):

```typescript
thresholds: {
  lines: 80,
  branches: 75,
  functions: 80,
  statements: 80,
},
```

### CI Matrix Test Failures

**Symptom:** Tests pass locally but fail on specific OS or Node version in CI
**Cause:** Platform-specific file path handling, line ending differences, or Node.js API changes
**Diagnosis:** Check GitHub Actions logs for failing OS/Node combination. Matrix tests: ubuntu/windows/macos × Node 20/22. fail-fast: false means all combinations run
**Fix:** Test locally on matching OS/Node version or add platform-specific handling
**Prevention:** Use node:path for cross-platform paths, configure git line endings

From `.github/workflows/test.yml` (lines 14-18):

```yaml
strategy:
  fail-fast: false  # CRITICAL: Run all combinations even if one fails
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [20, 22]
```

### Validation Check Failures

**Symptom:** `ana setup check [file]` reports blocking failures (BF1-BF6) or warnings (SW1-SW4)
**Cause:** Context file doesn't meet quality standards
**Diagnosis:** Run `ana setup check [filename] --json` for structured output

From `packages/cli/src/utils/validators.ts` (lines 22-28):

```typescript
export interface ValidationError {
  type: 'BLOCKING' | 'WARNING';
  rule: string;
  file: string;
  message: string;
}
```

Common failures:
- Line count below minimum threshold
- Required H2 headers missing
- Scaffold markers not removed during setup
- Citations reference non-existent files
- Cross-reference mismatches (patterns.md vs analyzer snapshot)

**Fix:** Address each validation error — blocking failures must be fixed
**Prevention:** Run check command after writing context files

### AST Cache Corruption

**Symptom:** Analysis produces inconsistent results between runs
**Cause:** Corrupted cache entries in .ana/.state/cache/
**Diagnosis:** Check mtime-based invalidation logic. Cache mismatches if file.mtimeMs !== cached.mtimeMs
**Fix:** Delete .ana/.state/cache/ directory to force re-parsing
**Prevention:** Cache invalidation is automatic via mtime checks

From `packages/analyzer/src/cache/astCache.ts` (lines 30-39):

```typescript
export interface ASTCacheEntry {
  mtimeMs: number;                    // File modification timestamp (invalidation key)
  functions: FunctionInfo[];          // Extracted functions
  classes: ClassInfo[];               // Extracted classes
  imports: ImportInfo[];              // Extracted imports
  exports?: ExportInfo[];             // TypeScript/JavaScript only
  decorators?: DecoratorInfo[];       // Python/TypeScript only
  parseTime: number;                  // Parse duration (for metrics)
  cachedAt: string;                   // ISO timestamp (debugging)
}
```

### Monorepo Detection Issues

**Symptom:** Analyzer treats monorepo root incorrectly
**Cause:** MONOREPO_DETECTED error code triggered
**Diagnosis:** Check if workspace root has package.json with workspaces field. Verify pnpm-workspace.yaml or lerna.json presence
**Fix:** Run analysis from individual package directory, not monorepo root
**Prevention:** Document monorepo usage in project README

## Debugging Workflow

### Local Development

**Detected:** Development workflow from package.json scripts

From `packages/cli/package.json` (lines 43-48):

```json
"scripts": {
  "build": "tsup && cp -r templates dist/",
  "dev": "tsup --watch",
  "test": "vitest",
  "lint": "eslint src/",
  "lint:fix": "eslint src/ --fix"
}
```

Steps:
1. **Build:** `pnpm build` — Compiles TypeScript to dist/
2. **Watch mode:** `pnpm dev` — Auto-rebuild on changes
3. **Test:** `pnpm test` — Vitest in watch mode
4. **Type check:** TypeScript compiler catches errors at compile time
5. **Lint:** `pnpm lint` — ESLint with typescript-eslint rules

### CLI Debugging

**Detected:** Direct execution via tsx (from packages/cli/package.json devDependencies line 64):

```bash
# Run CLI without building
tsx packages/cli/src/index.ts [command]

# Or test built version
node packages/cli/dist/index.js [command]
```

**Inferred:** tsx allows running TypeScript directly during development, avoiding build step for faster iteration.

### Analyzer Debugging

**Detected:** Contract tests verify API stability (from packages/cli/tests/contract/analyzer-contract.test.ts)

Pattern: Contract tests ensure analyzer exports remain stable across versions, catching breaking API changes.

### Test Debugging

**Detected:** Vitest configuration (from packages/cli/vitest.config.ts):

```typescript
export default defineConfig({
  test: {
    globals: true,              // describe/it/expect available without imports
    environment: 'node',        // Node.js test environment
    include: ['tests/**/*.test.ts'],
  },
});
```

Test workflow:
1. **Run specific test:** `vitest tests/scaffolds/patterns.test.ts`
2. **Run with filter:** `vitest -t "pattern name"`
3. **Watch mode:** `vitest` (default)
4. **Coverage:** `pnpm test:coverage` (analyzer only)

### Error Investigation

**Detected:** Error fields for debugging

When investigating failures:
1. **error.message** — User-friendly description
2. **error.code** — Machine-readable code from ERROR_CODES
3. **error.file and error.line** — Location context if available
4. **error.suggestion** — Resolution guidance if provided
5. **error.cause** — Underlying error for chained failures
6. **error.phase** — Which detection phase failed

Example from `packages/cli/src/commands/analyze.ts` (lines 90-92):

```typescript
console.error(chalk.red(`\nError: ${error.message}`));
if (options.verbose) {
  console.error(chalk.gray(error.stack));
}
```

### Validation Debugging

**Detected:** Check command provides JSON output for programmatic validation

Validation check categories (from packages/cli/src/commands/check.ts):
1. **Line count:** Within min/max thresholds
2. **Headers:** Required H2 sections present
3. **Scaffold markers:** Removed after setup
4. **Citations:** Referenced files exist, line numbers valid

### CI/CD Debugging

**Detected:** GitHub Actions test workflow (from .github/workflows/test.yml)

CI workflow from `.github/workflows/test.yml` (lines 35-42):

```yaml
- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Build packages
  run: pnpm build

- name: Run tests
  run: pnpm test --run
```

Debugging steps:
1. **Check job logs** — Each matrix combination has separate logs
2. **Compare failing combinations** — Identify OS/Node-specific issues
3. **Review coverage** — Ubuntu + Node 20 uploads to Codecov
4. **Verify lockfile** — `--frozen-lockfile` ensures reproducible installs

## Observability

### No APM Tools

**Detected:** No observability dependencies in any package

From dependency analysis:
- No Datadog APM
- No New Relic agent
- No Sentry SDK
- No Prometheus client
- No OpenTelemetry instrumentation

**Inferred:** CLI tools typically don't need APM — each invocation is short-lived, runs locally, and output is visible in terminal.

### Test Coverage as Quality Metric

**Detected:** Coverage thresholds enforced (from packages/cli/vitest.config.ts lines 8-23):

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'dist/**',
    '**/*.test.ts',
    'src/test-*.ts',
    'src/index.ts',
  ],
  thresholds: {
    lines: 80,
    branches: 75,
    functions: 80,
    statements: 80,
  },
},
```

Coverage tracking:
- **Lines:** 80% minimum
- **Branches:** 75% minimum
- **Functions:** 80% minimum
- **Statements:** 80% minimum
- **Provider:** v8 (native Node.js coverage)
- **Reporters:** text, json, html

**Detected:** Codecov integration from .github/workflows/test.yml (lines 44-50):

```yaml
- name: Upload coverage (Ubuntu + Node 20 only)
  if: matrix.os == 'ubuntu-latest' && matrix.node-version == 20
  uses: codecov/codecov-action@v4
  with:
    files: ./packages/cli/coverage/coverage-final.json
    fail_ci_if_error: false
```

### AST Cache Performance

**Detected:** Cache statistics tracking (from packages/analyzer/src/cache/astCache.ts lines 42-48):

```typescript
export interface CacheStats {
  hits: number;      // Cache hits (fast path)
  misses: number;    // Cache misses (slow path - had to parse)
  files: number;     // Files in memory cache
}
```

**Detected:** Performance documented (from packages/analyzer/src/cache/astCache.ts line 7):

> Performance: 80-90% speedup on second run (500ms → 50-100ms for 20 files)

### Build Performance

**Detected:** Turborepo caching for monorepo builds

From turbo.json:
- Task cache in .turbo/ directory
- Output caching for dist/** and .next/** directories
- Dependency graph optimization (dependsOn: ["^build"])
- Global dependencies tracked (tsconfig.base.json, pnpm-lock.yaml)

**Inferred:** `turbo build` shows cache hit/miss summary, providing build performance visibility.

### No Metrics Collection

**Detected:** No metrics libraries in dependencies

- No statsd client
- No Prometheus client
- No custom metrics implementation

**Inferred:** For a local CLI tool, structured metrics may be unnecessary. Terminal spinners and console output provide sufficient visibility.

### Recommendations for Production Scale

If Anatomia grows to process very large codebases or run as a service:

1. **Structured logging** — Consider pino for JSON-formatted logs with log levels
2. **Error tracking** — Sentry for stack trace aggregation and error trends
3. **Performance tracing** — OpenTelemetry for distributed tracing
4. **Metrics** — Prometheus for analysis duration, cache hit rates, error rates
5. **Health checks** — Health endpoints if running as a service

**Current state is appropriate:** Simple console output with colors is ideal for developer-facing CLI tools.

---

*Last updated: 2026-03-22T16:30:00.000Z*
