# Patterns — anatomia-workspace

## Error Handling

**Detected:** Custom error classes with error collector pattern for graceful degradation (from `packages/analyzer/src/errors/`)

### Custom Error Classes

**User confirmed:** Pain points include silent graceful degradation that can make failures hard to debug

Example from `packages/analyzer/src/errors/DetectionError.ts` (lines 45-81):
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

**When to use:** Create `DetectionEngineError` instances with machine-readable codes from `ERROR_CODES` registry (lines 106-133 in same file). Include file/line context when available and actionable suggestions to help users resolve issues.

### Error Collector Pattern

**Detected:** Graceful degradation through error aggregation without halting execution

Example from `packages/analyzer/src/errors/DetectionCollector.ts` (lines 9-90):
```typescript
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

**When to use:** Pass `DetectionCollector` instance through detection pipeline phases. Use `addWarning()` for non-critical issues, `addError()` for critical failures. Check `hasCriticalErrors()` to decide whether to fail fast or continue with degraded results.

### CLI Error Handling

**Detected:** Process exit on unhandled errors with colored console output

Example from `packages/cli/src/index.ts` (lines 37-46):
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

**When to use:** Wrap top-level async command handlers in try-catch. Use `process.exit(1)` for fatal errors. Use chalk for user-facing error messages (see `setup.ts` for examples of colored error output with suggestions).

### Multi-Phase Error Handling

**Detected:** Structured 4-phase validation with separate blocking vs warning errors

Example from `packages/cli/src/commands/setup.ts` (lines 95-118):
```typescript
// Phase 1: Structural validation
console.log(chalk.gray('Checking file structure...'));
const structuralErrors = await validateStructure(anaPath);

// Phase 2: Content validation
console.log(chalk.gray('Checking required sections...'));
const contentErrors = await validateContent(anaPath);

// Phase 3: Cross-reference validation
console.log(chalk.gray('Cross-referencing with analyzer data...'));
const crossRefErrors = await validateCrossReferences(anaPath, snapshot);

// Phase 4: Quality checks
console.log(chalk.gray('Running quality checks...'));
const warnings = await validateQuality(anaPath);

// Check for blocking failures
const allErrors = [...structuralErrors, ...contentErrors, ...crossRefErrors];

if (allErrors.length > 0) {
  console.log(chalk.red('\n❌ Validation failed\n'));
  displayValidationFailures(allErrors);
  process.exit(1);
}
```

**When to use:** Separate validation phases when order matters. Collect blocking errors separately from warnings. Display warnings but don't halt execution. Process all validation phases before exiting to show users complete error context.

### Graceful Degradation Pattern

**Detected:** Optional `strictMode` flag to control fail-fast vs continue-on-error behavior

Example from `packages/analyzer/src/index.ts` (lines 269-275):
```typescript
} catch (error) {
  // Critical failure - return empty result
  if (options.strictMode) {
    throw error;
  }
  return createEmptyAnalysisResult();
}
```

**When to use:** Default to graceful degradation (return empty/partial results) for analyzer operations. Provide `strictMode: true` option for tests or when caller needs to know about failures. **Unexamined:** This pattern can make debugging harder since errors are silently swallowed — consider logging degraded paths.

---

## Validation

**Detected:** Zod schema validation for runtime type safety with TypeScript inference

### Zod Schema Definition

**Detected:** Define schemas with constraints, infer TypeScript types from schemas

Example from `packages/analyzer/src/types/index.ts` (lines 36-53):
```typescript
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

/**
 * Confidence score for a detection
 * Range: 0.0 (no confidence) to 1.0 (certain)
 */
export const ConfidenceScoreSchema = z.number().min(0.0).max(1.0);
```

**When to use:** Define Zod schemas for all public API types. Use `z.infer<typeof Schema>` to derive TypeScript types from runtime schemas. Export both schema and type for consumers.

### Complex Object Validation

**Detected:** Nested object schemas with optional fields and strict typing

Example from `packages/analyzer/src/types/index.ts` (lines 64-96):
```typescript
export const AnalysisResultSchema = z.object({
  // Project identification (STEP_1.1)
  projectType: ProjectTypeSchema,
  framework: z.string().nullable(), // null if no framework detected

  // Confidence scores (STEP_1.1)
  confidence: z.object({
    projectType: ConfidenceScoreSchema,
    framework: ConfidenceScoreSchema,
  }),

  // Indicators (STEP_1.1)
  indicators: z.object({
    projectType: z.array(z.string()),
    framework: z.array(z.string()),
  }),

  // Metadata (STEP_1.1)
  detectedAt: z.string(), // ISO timestamp
  version: z.string(), // Tool version (e.g., "0.1.0-alpha")

  // STEP_1.2 adds structure analysis (optional field)
  structure: StructureAnalysisSchema.optional(),

  // STEP_1.3 adds tree-sitter parsing (optional field)
  parsed: ParsedAnalysisSchema.optional(),

  // STEP_2.1 adds pattern inference (optional field)
  patterns: PatternAnalysisSchema.optional(),

  // STEP_2.2 adds convention detection (optional field)
  conventions: ConventionAnalysisSchema.optional(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
```

**When to use:** Use `.optional()` for fields added in later phases or features. Use `.nullable()` when null is semantically meaningful (no framework detected vs framework field missing). Document which phase/step adds each field.

### Runtime Validation Function

**Detected:** Explicit validation functions that throw `ZodError` on invalid data

Example from `packages/analyzer/src/types/index.ts` (lines 120-126):
```typescript
/**
 * Validate AnalysisResult at runtime
 * Throws ZodError if invalid
 */
export function validateAnalysisResult(data: unknown): AnalysisResult {
  return AnalysisResultSchema.parse(data);
}
```

**When to use:** Export validation functions for external data (JSON files, API responses). Let ZodError propagate to caller for detailed error messages. Use `.parse()` when you want exceptions, `.safeParse()` when you want `{ success: boolean, data/error }` result.

### Multi-Phase Content Validation

**Detected:** Phase-based validation with specific structural checks

Example from `packages/cli/src/utils/validators.ts` (lines 241-312):
```typescript
export async function validateStructure(anaPath: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  const requiredFiles = REQUIRED_CONTEXT_FILES;

  // Pre-check: Detect if setup not run yet (all files still scaffolded)
  let scaffoldCount = 0;
  for (const file of requiredFiles) {
    const filePath = path.join(anaPath, file);
    if (await fileExists(filePath)) {
      const content = await fs.readFile(filePath, 'utf-8');
      if (content.includes(SCAFFOLD_MARKER)) {
        scaffoldCount++;
      }
    }
  }

  // If ALL files have scaffold markers, setup hasn't been run
  if (scaffoldCount === requiredFiles.length) {
    return [
      {
        type: 'BLOCKING',
        rule: 'BF1',
        file: 'all',
        message:
          'Setup not yet run. All context files still have scaffold markers.\n' +
          '       Run @.ana/modes/setup.md in Claude Code first.',
      },
    ];
  }

  // Per-file validation
  for (const file of requiredFiles) {
    const filePath = path.join(anaPath, file);

    // BF2: Check file exists
    if (!(await fileExists(filePath))) {
      errors.push({
        type: 'BLOCKING',
        rule: 'BF2',
        file,
        message: `Required context file missing: ${file}`,
      });
      continue;
    }

    const content = await fs.readFile(filePath, 'utf-8');

    // BF1: Check scaffold marker removed
    if (content.includes(SCAFFOLD_MARKER)) {
      errors.push({
        type: 'BLOCKING',
        rule: 'BF1',
        file,
        message: `${file} still has scaffold marker. Setup not completed.`,
      });
    }

    // BF3: Check not empty
    const cleaned = content.replace(/<!-- SCAFFOLD.*?-->\n?/g, '').trim();
    if (cleaned.length === 0) {
      errors.push({
        type: 'BLOCKING',
        rule: 'BF3',
        file,
        message: `${file} is empty. No content written.`,
      });
    }
  }

  return errors;
}
```

**When to use:** Collect all validation errors before failing (don't fail on first error). Use structured error objects with `type` (BLOCKING vs WARNING), `rule` code, `file`, and `message`. Return empty array when validation passes.

---

## Database

**Detected:** No database usage — CLI tool with filesystem-based operations only

**Evidence:** No database dependencies in `package.json` files (packages/cli, packages/analyzer, workspace root). All data persisted to `.ana/` directory as JSON and markdown files.

**When to use:** This project stores analysis results as JSON snapshots (`.ana/.state/snapshot.json`) and cache data (`.ana/.state/cache/`). For similar CLI tools, prefer filesystem storage over databases for simplicity and portability.

---

## Authentication

**Detected:** No authentication — local-only CLI tool with no network operations

**Evidence:** No auth libraries in dependencies. No API endpoints or remote services requiring authentication.

**When to use:** Not applicable to this project. This is a local-first tool that operates entirely on the user's filesystem.

---

## Testing

**Detected:** Vitest with comprehensive test coverage requirements and fixture-based testing

### Test Framework Configuration

**Detected:** Vitest with different coverage thresholds per package

Example from `packages/analyzer/vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['dist/**', '**/*.test.ts', 'src/index.ts'],
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

**Detected:** CLI package has lower thresholds (80% lines/functions) than analyzer (85%)

**When to use:** Set higher coverage thresholds for core analysis logic (analyzer package) than user-facing CLI commands. Use `globals: true` to avoid importing `describe`/`it`/`expect` in every test file.

### Test Organization Pattern

**Detected:** Tests mirror source structure with `.test.ts` suffix

Example from `packages/cli/tests/scaffolds/all-scaffolds.test.ts` (lines 1-44):
```typescript
import { describe, it, expect } from 'vitest';
import {
  generateProjectOverviewScaffold,
  generateArchitectureScaffold,
  generatePatternsScaffold,
  generateConventionsScaffold,
  generateWorkflowScaffold,
  generateTestingScaffold,
  generateDebuggingScaffold,
} from '../../src/utils/scaffold-generators.js';
import { createEmptyAnalysisResult } from './test-types.js';

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

**When to use:** Group related tests in `describe` blocks. Use clear test descriptions that explain what's being validated. Test multiple related outputs in a single test when they share setup.

### Fixture-Based Testing

**Detected:** Temporary directory creation with cleanup in `beforeEach`/`afterEach` hooks

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

**When to use:** Create isolated temp directories for tests that write files. Use Node's `mkdtemp()` with OS temp directory for cross-platform compatibility. Always clean up in `afterEach` to avoid test pollution.

### Comprehensive Test Coverage

**Detected:** Tests for happy path, edge cases, and error scenarios in same suite

Example from `packages/analyzer/tests/analyzers/patterns/dependencies.test.ts` (lines 212-260):
```typescript
describe('Edge cases', () => {
  it('returns empty patterns when no dependency files exist', async () => {
    // Empty directory - no requirements.txt, package.json, go.mod
    const patterns = await detectFromDependencies(testDir, 'python', null);

    expect(Object.keys(patterns)).toHaveLength(0);
  });

  it('handles malformed dependency files gracefully', async () => {
    // Corrupted JSON
    await writeFile(join(testDir, 'package.json'), '{ invalid json }');

    const patterns = await detectFromDependencies(testDir, 'node', 'express');

    // Should not crash
    expect(patterns).toBeDefined();
    // Error handling still detected from framework knowledge
    expect(patterns['errorHandling']?.library).toBe('exceptions');
    expect(patterns['errorHandling']?.variant).toBe('express');
    // But other patterns not detected (require valid dependency parsing)
    expect(patterns['validation']).toBeUndefined();
    expect(patterns['database']).toBeUndefined();
  });

  it('detects mixed dependencies correctly', async () => {
    // Project with both Joi AND Zod (migration scenario)
    const packageJson = {
      dependencies: {
        joi: '^17.13.3',
        zod: '^3.24.1',
      },
    };

    await writeFile(join(testDir, 'package.json'), JSON.stringify(packageJson));

    const patterns = await detectFromDependencies(testDir, 'node', null);

    // Should detect Zod (checked first in current implementation)
    expect(patterns['validation']).toBeDefined();
    expect(['zod', 'joi']).toContain(patterns['validation']?.library);
  });

  it('handles unknown project type gracefully', async () => {
    const patterns = await detectFromDependencies(testDir, 'rust', null);

    // Unsupported project type - returns empty
    expect(Object.keys(patterns)).toHaveLength(0);
  });
});
```

**When to use:** Create dedicated "Edge cases" describe block. Test empty inputs, malformed data, unsupported types, and migration scenarios. Verify graceful degradation (no crashes, sensible defaults).

### Contract Testing

**Detected:** Contract tests ensure CLI expectations match analyzer outputs

Example from `packages/cli/tests/contract/analyzer-contract.test.ts`:
```typescript
// Contract test: Verify CLI can consume analyzer's AnalysisResult shape
// Prevents breaking changes when analyzer evolves
```

**When to use:** Add contract tests between packages in monorepo. Verify interface compatibility without full integration tests. **Inferred:** Contract tests act as early warning when cross-package interfaces drift.

---

## Framework Patterns

### Monorepo Organization

**Detected:** Turborepo + pnpm workspaces with package interdependencies

**Structure:**
- `packages/cli` — User-facing CLI tool (depends on analyzer)
- `packages/analyzer` — Core analysis engine (standalone)
- `packages/generator` — Template generation (alpha)

**Build orchestration:** Turborepo with dependency-aware caching (from `turbo.json` pipeline configuration)

**When to use:** CLI imports analyzer as internal workspace dependency: `import { analyze } from 'anatomia-analyzer'`. Use `pnpm build` to build all packages in dependency order. Turborepo caches build outputs in `.turbo/` directory.

### Singleton Pattern for Expensive Resources

**Detected:** ParserManager singleton with lazy initialization and instance reuse

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
   */
  static getInstance(): ParserManager {
    if (!ParserManager.instance) {
      ParserManager.instance = new ParserManager();
    }
    return ParserManager.instance;
  }
}

// Export singleton instance for convenience
export const parserManager = ParserManager.getInstance();
```

**When to use:** Use singleton for expensive initialization (tree-sitter WASM loading takes 50-100ms). **Inferred:** Saves 100-200ms over 20 files by reusing parser instances. **Unexamined:** Singleton makes testing harder — ParserManager provides `reset()` and `resetFull()` methods for test isolation, but this is a workaround rather than dependency injection.

### WASM Memory Management

**Detected:** Explicit tree deletion required to free WASM memory

**User confirmed:** WASM memory management is a known pain point that requires careful cleanup

Example from `packages/analyzer/src/parsers/treeSitter.ts` (lines 865-972):
```typescript
export async function parseFile(
  filePath: string,
  language: string,
  cache?: ASTCache
): Promise<ParsedFile> {
  // ... parsing logic ...

  const parser = parserManager.getParser(language as Language);
  const startTime = performance.now();
  const tree = parser.parse(content);
  const parseTime = performance.now() - startTime;

  try {
    // Extract elements using queries
    let functions = extractFunctions(tree, content, language);
    let classes = extractClasses(tree, content, language);
    // ... more extraction ...

    return result;
  } finally {
    // CRITICAL: Free WASM memory
    tree.delete();
  }
}
```

**When to use:** Always wrap tree operations in try-finally block. Call `tree.delete()` in finally clause to ensure cleanup even on exceptions. **User confirmed:** Forgetting to delete trees causes memory leaks in long-running analysis sessions.

### Commander.js Async Action Pattern

**Detected:** Async command handlers with `parseAsync()` instead of `parse()`

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

**When to use:** Use `program.parseAsync()` when command `.action()` handlers are async functions. Wrap in async main function with top-level error handler. Call `process.exit(1)` on unhandled errors to set proper exit code.

### Query Caching Pattern

**Detected:** Query compilation caching to avoid repeated tree-sitter query creation

Example from `packages/analyzer/src/parsers/queries.ts`:
```typescript
export class QueryCache {
  private cache = new Map<string, Query>();

  getQuery(language: Language, queryType: QueryType, tsLanguage: TSLanguage): Query {
    const key = `${language}:${queryType}`;

    if (!this.cache.has(key)) {
      const queryString = QUERIES[language]?.[queryType];
      if (!queryString) {
        throw new Error(`No ${queryType} query for ${language}`);
      }
      const query = tsLanguage.query(queryString);
      this.cache.set(key, query);
    }

    return this.cache.get(key)!;
  }
}

export const queryCache = new QueryCache();
```

**When to use:** Cache compiled tree-sitter queries to avoid repeated compilation overhead. Use composite keys (`language:queryType`) for cache lookup. **Inferred:** Query compilation is expensive (5-10ms per query) — caching provides 50-100ms savings over 20 files.

### ESM Import Extensions

**Detected:** Explicit `.js` extensions in relative imports despite writing `.ts` files

Example from `packages/cli/src/commands/setup.ts` (lines 10-24):
```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { AnalysisResult } from 'anatomia-analyzer';
import {
  validateStructure,
  validateContent,
  validateCrossReferences,
  validateQuality,
  getProjectName,
  fileExists,
  type ValidationError,
} from '../utils/validators.js';  // .js extension, not .ts
import { VALID_SETUP_TIERS, META_VERSION } from '../constants.js';
import { createCheckCommand } from './check.js';
import { createIndexCommand } from './index.js';
```

**When to use:** Always use `.js` extensions for relative imports in TypeScript ESM projects. TypeScript compiler doesn't rewrite import paths. Node.js ESM loader requires explicit extensions. Use `node:` protocol for built-in modules (`node:fs`, `node:path`).

### Build-Time Path Resolution

**Detected:** Runtime detection of bundled vs development context for template paths

Example from `packages/cli/src/commands/setup.ts` (lines 196-250):
```typescript
async function generateEntryMd(anaPath: string, cwd: string): Promise<void> {
  // Get CLI version - detect bundle vs dev context
  const moduleUrl = new URL('.', import.meta.url);
  const isBundle = !moduleUrl.pathname.includes('/src/');
  const cliPkgPath = isBundle
    ? new URL('../package.json', import.meta.url) // dist/index.js → ../package.json
    : new URL('../../package.json', import.meta.url); // src/commands/setup.ts → ../../package.json

  const templatesDir = getTemplatesDir();
  const templatePath = path.join(templatesDir, 'ENTRY.md');
  // ...
}

function getTemplatesDir(): string {
  const fileUrl = import.meta.url;
  const __filename = new URL(fileUrl).pathname;
  const __dirname = path.dirname(__filename);

  const isBuilt = __dirname.includes('dist');

  return isBuilt
    ? path.join(__dirname, 'templates') // dist/ → dist/templates/
    : path.join(__dirname, '..', '..', 'templates'); // src/commands/ → templates/
}
```

**When to use:** Use `import.meta.url` for ESM-compatible path resolution. Detect bundled vs development context by checking for `dist` or `/src/` in module path. Adjust relative paths accordingly for templates and assets.

---

*Last updated: 2026-03-23T14:45:00Z*
