# Patterns — anatomia-workspace

This document shows how code is written in THIS codebase with real examples. These patterns apply to the Anatomia monorepo (CLI + analyzer packages).

---

## Error Handling

**Detected:** Custom error classes + graceful degradation pattern — Confidence: 0.95

**User confirmed:** WASM memory in tree-sitter, verification hook loops, ESM path confusion, and framework detection edge cases are key debugging areas.

### Error Class Structure

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

**Pattern:** Structured error interface with machine-readable code, user message, severity level, optional file context, and suggestions. All errors include timestamps for debugging.

### Custom Error Class

Example from `packages/analyzer/src/errors/DetectionError.ts` (lines 45-101):
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

  /**
   * Convert to DetectionError interface
   */
  toDetectionError(): DetectionError {
    const error: DetectionError = {
      code: this.code,
      message: this.message,
      severity: this.severity,
      timestamp: new Date(),
    };

    if (this.file) error.file = this.file;
    if (this.line) error.line = this.line;
    if (this.suggestion) error.suggestion = this.suggestion;
    if (this.phase) error.phase = this.phase;
    if (this.cause) error.cause = this.cause as Error;

    return error;
  }
}
```

**Pattern:** Custom error class extends Error with Error.captureStackTrace for proper stack traces. Includes toDetectionError() serializer for logging/aggregation.

### Error Codes Registry

Example from `packages/analyzer/src/errors/DetectionError.ts` (lines 106-133):
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

  // Monorepo
  MONOREPO_DETECTED: 'MONOREPO_DETECTED',

  // System
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;
```

**Pattern:** Centralized error code registry as const object. Grouped by category (file, parsing, detection, system).

### Error Collection Pattern

Example from `packages/analyzer/src/errors/DetectionCollector.ts` (lines 9-46):
```typescript
export class DetectionCollector {
  private errors: DetectionError[] = [];
  private warnings: DetectionError[] = [];
  private info: DetectionError[] = [];

  /**
   * Add error (blocks functionality)
   */
  addError(error: DetectionEngineError | DetectionError): void {
    const detectionError =
      error instanceof DetectionEngineError ? error.toDetectionError() : error;
    this.errors.push(detectionError);
  }

  /**
   * Add warning (concerning but continues)
   */
  addWarning(error: DetectionEngineError | DetectionError): void {
    const detectionError =
      error instanceof DetectionEngineError ? error.toDetectionError() : error;
    this.warnings.push(detectionError);
  }

  /**
   * Add info message
   */
  addInfo(error: DetectionEngineError | DetectionError): void {
    const detectionError =
      error instanceof DetectionEngineError ? error.toDetectionError() : error;
    this.info.push(detectionError);
  }

  /**
   * Get all errors
   */
  getAllErrors(): DetectionError[] {
    return [...this.errors, ...this.warnings, ...this.info];
  }
```

**Pattern:** DetectionCollector aggregates errors by severity during multi-phase operations. Allows graceful degradation (continue on warnings, fail on errors).

### Graceful Degradation Pattern

**User confirmed:** Deliberate architecture choice for graceful degradation with optional analysis phases.

Example from `packages/analyzer/src/index.ts` (lines 269-276):
```typescript
  } catch (error) {
    // Critical failure - return empty result
    if (options.strictMode) {
      throw error;
    }
    return createEmptyAnalysisResult();
  }
}
```

**Pattern:** Try-catch at orchestration level returns empty/default results on failure (unless strictMode). Prevents crashes from partial failures in detection phases.

### CLI Error Handling

Example from `packages/cli/src/index.ts` (lines 38-45):
```typescript
async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}
```

**Pattern:** Top-level CLI handler catches all errors, logs message, exits with status 1. Uses console.error for user-facing errors (no logging library).

### When to use

- **DetectionEngineError**: For analyzer errors with context (file, line, suggestions)
- **DetectionCollector**: For multi-phase operations that should continue on warnings
- **Graceful degradation**: When partial results are acceptable (skip failed phases)
- **ERROR_CODES**: Reference error codes for consistent error handling across analyzer
- **CLI error handling**: Catch at top level, log with chalk colors, exit with status code

---

## Validation

**Detected:** Zod runtime validation + custom validators — Confidence: 0.95

**User confirmed:** Zod validation is a deliberate architecture choice.

### Zod Schema Pattern

Example from `packages/analyzer/src/types/index.ts` (lines 36-46):
```typescript
/**
 * Project types supported by Anatomia detection
 */
export const ProjectTypeSchema = z.enum([
  'python',
  'node',
  'go',
  'rust',
  'ruby',
  'php',
  'mixed', // Monorepo with multiple languages
  'unknown', // No indicators found
]);

export type ProjectType = z.infer<typeof ProjectTypeSchema>;
```

**Pattern:** Every type has Schema + type export. Type is inferred from schema (single source of truth).

### Confidence Scoring Pattern

Example from `packages/analyzer/src/types/index.ts` (lines 50-53):
```typescript
/**
 * Confidence score for a detection
 * Range: 0.0 (no confidence) to 1.0 (certain)
 */
export const ConfidenceScoreSchema = z.number().min(0.0).max(1.0);
```

**Pattern:** All detections include 0.0-1.0 confidence scores. Runtime-validated with Zod min/max constraints.

### Runtime Validation Function

Example from `packages/analyzer/src/types/index.ts` (lines 121-126):
```typescript
/**
 * Validate AnalysisResult at runtime
 * Throws ZodError if invalid
 */
export function validateAnalysisResult(data: unknown): AnalysisResult {
  return AnalysisResultSchema.parse(data);
}
```

**Pattern:** Every schema has validateX() helper that throws ZodError on invalid data. Used at package boundaries.

### Empty Value Factory Pattern

Example from `packages/analyzer/src/types/index.ts` (lines 103-118):
```typescript
/**
 * Helper to create empty AnalysisResult (for tests, placeholders)
 */
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

**Pattern:** Every type has createEmptyX() factory for safe defaults in tests and error fallbacks. Avoids scattered null/undefined initialization.

### Multi-Phase Validation Pattern

Example from `packages/cli/src/utils/validators.ts` (lines 22-28):
```typescript
/** Validation error type */
export interface ValidationError {
  type: 'BLOCKING' | 'WARNING';
  rule: string;
  file: string;
  message: string;
}
```

**Pattern:** Validation errors separate BLOCKING (fail) vs WARNING (note but continue). Each error tagged with rule code (BF1, SW3, etc.) for debugging.

### Validation Phases

Example from `packages/cli/src/commands/setup.ts` (lines 95-100):
```typescript
    // Phase 1: Structural validation
    console.log(chalk.gray('Checking file structure...'));
    const structuralErrors = await validateStructure(anaPath);

    // Phase 2: Content validation
    console.log(chalk.gray('Checking required sections...'));
```

**Pattern:** Validation split into phases (structure → content → cross-reference → quality). Each phase returns ValidationError[] for aggregation.

### Type Guard Pattern

Example from `packages/cli/src/commands/setup.ts` (lines 35-37):
```typescript
function isValidSetupTier(tier: string): tier is typeof VALID_SETUP_TIERS[number] {
  return VALID_SETUP_TIERS.includes(tier as typeof VALID_SETUP_TIERS[number]);
}
```

**Pattern:** Type guards validate string literals against const arrays. Enables TypeScript narrowing after runtime check.

### Validation Helper Pattern

Example from `packages/cli/src/utils/validators.ts` (lines 42-56):
```typescript
export function countDetectedPatterns(analysis: AnalysisResult): number {
  // Scenario B guard: analyzer may return null/undefined when tree-sitter fails
  if (!analysis || !analysis.patterns) {
    return 0;
  }

  let count = 0;
  if (analysis.patterns.errorHandling) count++;
  if (analysis.patterns.validation) count++;
  if (analysis.patterns.database) count++;
  if (analysis.patterns.auth) count++;
  if (analysis.patterns.testing) count++;

  return count;
}
```

**Pattern:** Validation helpers check nullable fields with guards, aggregate counts for comparison logic. Comment "Scenario B" marks edge cases from real debugging.

### When to use

- **Zod schemas**: At package boundaries (analyzer exports, CLI inputs, file parsing)
- **createEmptyX()**: For test fixtures, error fallbacks, default values
- **ValidationError[]**: For multi-phase validation that needs aggregation
- **Type guards**: For runtime validation of string literal types
- **Confidence scores**: For all detection results (0.0-1.0 range)

---

## Database

**Detected:** Not applicable (CLI tool, no database) — Confidence: 0.95

This project is a CLI tool that uses file-based state storage instead of a database.

### File-Based State Pattern

**Detected:** State stored in `.ana/.state/snapshot.json` and `.ana/.meta.json` (from exploration)

**When to use:** CLI tools, local-first applications, version-controlled state.

**Trade-offs:**
- Pro: Simple, no DB setup, version-controllable
- Pro: Fast read/write for small datasets
- Con: No concurrency safety
- Con: Manual serialization/deserialization

---

## Authentication

**Detected:** Not applicable (CLI tool, no authentication) — Confidence: 0.95

This project is a local CLI tool with no network authentication or user sessions.

---

## Testing

**Detected:** Vitest with comprehensive test types — Confidence: 0.95

### Test Framework Configuration

Example from `packages/analyzer/vitest.config.ts` (lines 4-24):
```typescript
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

**Pattern:** Vitest with strict coverage thresholds (85% lines, 80% branches). v8 provider for accurate coverage. Excludes entry points and test files from coverage.

### Test Setup/Teardown Pattern

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

**Pattern:** beforeEach creates temp directory, afterEach cleans up. Uses fs.mkdtemp for unique temp paths. Ensures test isolation.

### Integration Test Pattern

Example from `packages/analyzer/tests/analyzers/patterns/integration.test.ts` (lines 8-18):
```typescript
  describe('analyze() integration', () => {
    it('includes patterns when skipPatterns=false', async () => {
      // Test on analyzer package itself
      const result = await analyze('.', { skipPatterns: false });

      // Should have patterns field
      expect(result.patterns).toBeDefined();
      expect(result.patterns?.threshold).toBe(0.7);
      expect(result.patterns?.sampledFiles).toBeGreaterThanOrEqual(0);
      expect(result.patterns?.detectionTime).toBeGreaterThanOrEqual(0);
    });
```

**Pattern:** Integration tests use real codebase (analyze('.')). Tests against actual package structure. Validates end-to-end behavior.

### Performance Test Pattern

Example from `packages/analyzer/tests/analyzers/patterns/integration.test.ts` (lines 161-194):
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

**Pattern:** Performance tests measure execution time with Date.now(). Assert duration < threshold. Uses mock data to isolate performance target.

### Test Assertion Patterns

Example from `packages/cli/tests/commands/setup.test.ts` (lines 88-103):
```typescript
  describe('validateStructure - BF1', () => {
    it('fails when scaffold marker present', async () => {
      const file = path.join(anaPath, 'context/project-overview.md');
      await fs.writeFile(file, '<!-- SCAFFOLD - Setup will fill this file -->\n\nContent here');

      // Create other required files
      const files = ['architecture', 'patterns', 'conventions', 'workflow', 'testing', 'debugging'];
      for (const f of files) {
        await fs.writeFile(path.join(anaPath, `context/${f}.md`), 'Content');
      }

      const errors = await validateStructure(anaPath);
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe('BF1');
      expect(errors[0].file).toBe('context/project-overview.md');
    });
```

**Pattern:** Test names describe expected behavior ("fails when..."). Setup creates specific state. Assertions check both count and content of errors.

### Backward Compatibility Test Pattern

Example from `packages/analyzer/tests/analyzers/patterns/integration.test.ts` (lines 197-210):
```typescript
  describe('Backward compatibility', () => {
    it('maintains STEP_1 compatibility (patterns optional)', async () => {
      // Analyze without pattern inference
      const result = await analyze('.', { skipPatterns: true });

      // Should still be valid AnalysisResult without patterns
      expect(result.projectType).toBeDefined();
      expect(result.framework).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.indicators).toBeDefined();
      expect(result.detectedAt).toBeDefined();
      expect(result.version).toBeDefined();
    });
  });
```

**Pattern:** Backward compatibility tests ensure new features don't break old APIs. Tests optional fields can be omitted. Validates all required fields still present.

### When to use

- **beforeEach/afterEach**: For tests needing isolated temp directories
- **Integration tests**: Test against real codebase (self-hosting pattern)
- **Performance tests**: When you have specific time budgets (e.g., <10s)
- **Backward compatibility tests**: When adding optional fields to existing APIs
- **expect().toHaveLength()**: For array validation
- **expect().toBeDefined()**: For optional fields that should exist in this scenario

---

## Framework Patterns

### Monorepo Architecture

**Detected:** Turborepo + pnpm workspaces — Confidence: 0.95

**User confirmed:** Deliberate architecture with monorepo structure for clean package boundaries.

**Workspace protocol pattern:**

Example from `packages/cli/package.json` (dependency on analyzer):
```json
"dependencies": {
  "anatomia-analyzer": "workspace:*"
}
```

**Pattern:** Use `workspace:*` protocol for internal monorepo dependencies. Enables local development with automatic linking.

### Singleton Pattern

Example from `packages/analyzer/src/parsers/treeSitter.ts` (lines 107-131):
```typescript
export class ParserManager {
  private static instance: ParserManager;
  private parsers = new Map<Language, TSParser>();
  private languages = new Map<Language, TSLanguage>();
  private initialized = false;

  /**
   * Private constructor - prevents direct instantiation
   * Forces use of getInstance() for singleton pattern
   */
  private constructor() {}

  /**
   * Get singleton instance
   *
   * Creates instance on first call, returns same instance on subsequent calls.
   *
   * @returns ParserManager singleton instance
   */
  static getInstance(): ParserManager {
    if (!ParserManager.instance) {
      ParserManager.instance = new ParserManager();
    }
    return ParserManager.instance;
  }
```

**Pattern:** Private constructor prevents direct instantiation. Static getInstance() creates singleton. Reuses expensive resources (tree-sitter parsers).

**Performance:** Saves 100-200ms over 20 files by reusing parser instances (5-10ms per parser initialization avoided).

**Unexamined:** Singleton pattern detected but no user confirmation on whether this is the intended design vs. accidental global state.

### WASM Memory Management Pattern

**User confirmed:** WASM memory in tree-sitter is a key debugging area.

Example from `packages/analyzer/src/parsers/treeSitter.ts` (lines 91-105):
```typescript
 * WASM Migration (SS-10):
 * - Must call initialize() once before any parsing
 * - Grammars are pre-loaded during initialization
 * - getParser() is sync after initialization
 *
 * @example
 * ```typescript
 * const manager = ParserManager.getInstance();
 * await manager.initialize(); // Required once before parsing
 * const pythonParser = manager.getParser('python');
 *
 * // Reuse parser for multiple files
 * const tree1 = pythonParser.parse(file1Code);
 * // ... extract data from tree1 ...
 * tree1.delete(); // CRITICAL: Free WASM memory
 *
 * const tree2 = pythonParser.parse(file2Code);
```

**Pattern:** Manual tree.delete() calls required to free WASM memory. No automatic garbage collection for tree-sitter tree objects. Document this in JSDoc with CRITICAL marker.

**Debugging note:** WASM memory leaks are subtle. Always call .delete() on Tree objects after extracting data.

### Caching Pattern

**User confirmed:** AST cache in memory only is intentional (trade-off accepted).

Example from `packages/analyzer/src/cache/astCache.ts` (lines 77-105):
```typescript
export class ASTCache {
  private memoryCache = new Map<string, ASTCacheEntry>();
  private cacheDir: string;
  private stats = { hits: 0, misses: 0 };

  /** Static override for cache directory (used during init to write to temp) */
  private static cacheOverrideDir: string | null = null;

  /**
   * Set cache directory override
   *
   * Used during `ana init` to write cache to temp directory instead of
   * project root (avoids creating .ana/ before atomic rename).
   *
   * @param dir - Override directory, or null to reset
   */
  static setCacheDir(dir: string | null): void {
    ASTCache.cacheOverrideDir = dir;
  }

  /**
   * Create cache instance
   *
   * @param projectRoot - Absolute path to project root
   */
  constructor(projectRoot: string) {
    // Use override if set, otherwise default
    this.cacheDir = ASTCache.cacheOverrideDir || join(projectRoot, '.ana/.state/cache');
  }
```

**Pattern:** Two-tier cache (memory Map + disk JSON). Static override for testing/atomic operations. mtime-based invalidation.

**Performance:** 80-90% speedup on second run (500ms → 50-100ms for 20 files).

**CRITICAL Pattern from ASTCache documentation (lines 9-10):**
```typescript
 * CRITICAL: Cache extracted DATA (JavaScript objects), NOT tree objects
 * (prevents memory leak from tree-sitter research)
```

**Pattern:** Never cache tree-sitter Tree objects (memory leak risk). Cache extracted data (functions, classes, imports) as plain JavaScript objects.

### ESM Import Pattern

**User confirmed:** ESM path confusion is a key debugging area.

**Detected:** All imports use .js extensions even for .ts files (ESM requirement).

Example from `packages/cli/src/index.ts` (lines 15-19):
```typescript
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { modeCommand } from './commands/mode.js';
import { analyzeCommand } from './commands/analyze.js';
import { setupCommand } from './commands/setup.js';
```

**Pattern:** ESM requires explicit .js extensions in imports, even when importing from .ts files. TypeScript compiler resolves .ts → .js during build.

**Debugging note:** Common error: forgetting .js extension on relative imports. Results in "Cannot find module" at runtime.

### Optional Analysis Phases Pattern

**Detected:** Options object with skip flags for performance — Confidence: 0.90

Example from `packages/analyzer/src/index.ts` (lines 143-153):
```typescript
export interface AnalyzeOptions {
  skipImportScan?: boolean;
  skipMonorepo?: boolean;
  skipStructure?: boolean;
  skipParsing?: boolean;      // Skip tree-sitter parsing (STEP_1.3)
  skipPatterns?: boolean;     // Skip pattern inference (STEP_2.1)
  skipConventions?: boolean;  // Skip convention detection (STEP_2.2 - NEW)
  maxFiles?: number;          // Max files to parse (default: 20)
  strictMode?: boolean;
  verbose?: boolean;
}
```

**Pattern:** Optional analysis phases controlled by skip flags. Enables fast feedback (skip slow phases) and graceful degradation (continue with partial data).

**Trade-offs:**
- Pro: Fast feedback, resilient to failures
- Con: Partial results harder to reason about, more code paths to test

### Commander.js Async Pattern

Example from `packages/cli/src/index.ts` (lines 34-48):
```typescript
// Parse arguments with async support
// CRITICAL: Use parseAsync() not parse() for async action handlers
// See: https://github.com/tj/commander.js#async-action-handlers
async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
```

**Pattern:** Use parseAsync() not parse() for async command handlers. Wrap in async main() for top-level await. Catch errors at top level for clean exit.

### When to use

- **Singleton pattern**: For expensive resources (parsers, connections) that should be reused
- **WASM memory management**: Always call .delete() on tree-sitter Tree objects after use
- **Two-tier caching**: When you need both fast access (memory) and persistence (disk)
- **Skip flags**: For optional expensive operations that may fail or take too long
- **ESM .js extensions**: Required for all relative imports in ESM projects
- **parseAsync()**: Required for Commander.js commands with async action handlers

---

*Last updated: 2026-03-24*
