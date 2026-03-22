# Patterns — anatomia-workspace

## Error Handling

**Detected:** Custom error classes with structured error objects (from `packages/analyzer/src/errors/DetectionError.ts`, lines 13-40):

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

**Detected:** Custom error class extending Error with rich context (from `packages/analyzer/src/errors/DetectionError.ts`, lines 45-101):

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

**Detected:** Error codes registry for machine-readable error identification (from `packages/analyzer/src/errors/DetectionError.ts`, lines 106-133):

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

**Detected:** Try-catch with contextual error messages (from `packages/cli/src/utils/file-writer.ts`, lines 46-54):

```typescript
async createDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create directory '${dirPath}': ${error.message}`);
    }
    throw error;
  }
}
```

**Detected:** Try-catch with error re-wrapping pattern (from `packages/cli/src/utils/file-writer.ts`, lines 64-84):

```typescript
async writeFile(
  filePath: string,
  content: string,
  options: WriteFileOptions = {}
): Promise<void> {
  const { encoding = 'utf-8', mode = 0o644 } = options;

  try {
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    await this.createDir(dir);

    // Write file
    await fs.writeFile(filePath, content, { encoding, mode });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to write file '${filePath}': ${error.message}`);
    }
    throw error;
  }
}
```

**Detected:** Error collector and formatter utilities (from `packages/analyzer/src/errors/index.ts`, lines 1-9):

```typescript
export type { DetectionError } from './DetectionError.js';
export { DetectionEngineError, ERROR_CODES } from './DetectionError.js';
export { DetectionCollector } from './DetectionCollector.js';
export { formatError, formatAllErrors, formatErrorSummary } from './formatter.js';
```

**Detected:** Graceful degradation with fallback (from `packages/cli/src/commands/init.ts`, lines 256-298):

```typescript
async function runAnalyzer(
  rootPath: string,
  options: InitCommandOptions
): Promise<AnalysisResult | null> {
  // Skip if --skip-analysis flag
  if (options.skipAnalysis) {
    console.log(chalk.gray('\nSkipping analyzer (--skip-analysis flag)'));
    console.log(chalk.yellow('  Scaffolds will have no pre-populated data\n'));
    return null;
  }

  const spinner = ora('Analyzing project...').start();

  try {
    // Dynamic import - only loads analyzer when actually needed
    const { analyze } = await import('anatomia-analyzer');

    const result = await analyze(rootPath, {
      skipImportScan: false,
      strictMode: false,
      verbose: false,
    });

    spinner.succeed('Analysis complete');

    // Display detection summary
    displayDetectionSummary(result);

    return result;
  } catch (error) {
    spinner.warn('Analyzer failed — continuing with empty scaffolds');
    console.log(chalk.yellow('  Setup will work but scaffolds will have no pre-populated data'));

    if (error instanceof Error) {
      console.log(chalk.gray(`  Reason: ${error.message}`));
    }
    console.log();

    return null;
  }
}
```

**When to use:**
- Use `DetectionEngineError` for analyzer errors with machine-readable codes
- Use `ERROR_CODES` registry for consistent error identification
- Wrap file system operations with try-catch and contextual messages
- Return `null` for graceful degradation when operations can safely fail
- Use error collectors for batch operations that should continue on partial failures

## Validation

**Detected:** Zod schemas for runtime type validation (from `packages/analyzer/src/types/index.ts`, lines 36-45):

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
```

**Detected:** Confidence score validation with range constraints (from `packages/analyzer/src/types/index.ts`, lines 47-53):

```typescript
/**
 * Confidence score for a detection
 * Range: 0.0 (no confidence) to 1.0 (certain)
 */
export const ConfidenceScoreSchema = z.number().min(0.0).max(1.0);
```

**Detected:** Complex object schemas with optional fields (from `packages/analyzer/src/types/index.ts`, lines 64-96):

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
    projectType: z.array(z.string()), // Files found: ["package.json", "package-lock.json"]
    framework: z.array(z.string()), // Signals found: ["next in dependencies", "next.config.js exists"]
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
```

**Detected:** Runtime validation function with ZodError handling (from `packages/analyzer/src/types/index.ts`, lines 120-126):

```typescript
/**
 * Validate AnalysisResult at runtime
 * Throws ZodError if invalid
 */
export function validateAnalysisResult(data: unknown): AnalysisResult {
  return AnalysisResultSchema.parse(data);
}
```

**Detected:** Custom validation interfaces (from `packages/cli/src/utils/validators.ts`, lines 22-28):

```typescript
export interface ValidationError {
  type: 'BLOCKING' | 'WARNING';
  rule: string;
  file: string;
  message: string;
}
```

**Detected:** Pattern counting validator (from `packages/cli/src/utils/validators.ts`, lines 42-56):

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

**Detected:** File existence validation (from `packages/cli/src/utils/validators.ts`, lines 212-225):

```typescript
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
```

**Detected:** Structural validation with multiple checks (from `packages/cli/src/utils/validators.ts`, lines 240-260):

```typescript
export async function validateStructure(anaPath: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  for (const file of REQUIRED_CONTEXT_FILES) {
    const filePath = path.join(anaPath, file);
    if (!(await fileExists(filePath))) {
      errors.push({ type: 'BLOCKING', rule: 'BF2', file, message: `Missing: ${file}` });
    }
  }
  return errors;
}
```

**When to use:**
- Use Zod schemas for all external data validation (JSON files, API responses, analyzer output)
- Create TypeScript types from Zod schemas using `z.infer<typeof Schema>`
- Use `ConfidenceScoreSchema` pattern for any 0.0-1.0 range values
- Mark optional fields with `.optional()` instead of `| undefined` in types
- Return `ValidationError[]` arrays for multi-check validations (enables batch error reporting)
- Use guard clauses at function start for null/undefined checks before accessing nested properties

## Database

**Detected:** No database access patterns found in this project. This is a CLI tool with file system storage only.

The project uses:
- File system for storage (`.ana/` directory structure)
- JSON files for state (`.state/snapshot.json`, `.meta.json`)
- No SQL/NoSQL database dependencies detected

**When to use:** Not applicable — document via teach mode if database patterns are added in future versions.

## Authentication

**Detected:** No authentication patterns found. This is a local CLI tool with no auth requirements.

The project has:
- No auth dependencies (no JWT libraries, passport, etc.)
- No user/session management
- No API authentication patterns

**When to use:** Not applicable — this is a local development tool without auth needs.

## Testing

**Detected:** Vitest with describe/it/expect structure (from `packages/cli/tests/scaffolds/all-scaffolds.test.ts`, lines 13-25):

```typescript
describe('all scaffolds integration', () => {
  const analysis = createEmptyAnalysisResult();
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';

  it('all 7 generators produce valid scaffolds', () => {
    const scaffolds = [
      generateProjectOverviewScaffold(analysis, projectName, timestamp, version),
      generateArchitectureScaffold(analysis, projectName, timestamp, version),
      // ... 5 more generators
    ];
    scaffolds.forEach((scaffold) => expect(scaffold).toContain(projectName));
  });
});
```

**Detected:** Test fixture pattern with factory functions (from `packages/analyzer/tests/fixtures.ts`, lines 12-33):

```typescript
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

**Detected:** Parser testing pattern with inline code fixtures (from `packages/analyzer/tests/parsers/extraction.test.ts`, lines 8-17):

```typescript
describe('Python extraction', () => {
  const parser = ParserManager.getInstance().getParser('python');

  it('extracts function name', () => {
    const code = 'def hello():\n    pass';
    const tree = parser.parse(code);
    const functions = extractFunctions(tree, code, 'python');

    expect(functions).toHaveLength(1);
    expect(functions[0]?.name).toBe('hello');
    expect(functions[0]?.line).toBe(1);
    expect(functions[0]?.async).toBe(false);
  });
});
```

**Detected:** Multiple test suites per language (from `packages/analyzer/tests/parsers/extraction.test.ts`, lines 50-81):

```typescript
describe('TypeScript extraction', () => {
  const parser = ParserManager.getInstance().getParser('typescript');

  it('extracts function name', () => {
    const code = 'function greet(name: string): void {}';
    const tree = parser.parse(code);
    const functions = extractFunctions(tree, code, 'typescript');

    expect(functions).toHaveLength(1);
    expect(functions[0]?.name).toBe('greet');
    expect(functions[0]?.line).toBe(1);
  });

  it('extracts class name', () => {
    const code = 'class User {}';
    const tree = parser.parse(code);
    const classes = extractClasses(tree, code, 'typescript');

    expect(classes).toHaveLength(1);
    expect(classes[0]?.name).toBe('User');
    expect(classes[0]?.line).toBe(1);
  });

  it('extracts imports', () => {
    const code = 'import { Controller } from "@nestjs/common";';
    const tree = parser.parse(code);
    const imports = extractImports(tree, code, 'typescript');

    expect(imports).toHaveLength(1);
    expect(imports[0]?.module).toBe('@nestjs/common');
  });
});
```

**Detected:** Optional chaining in test assertions (from `packages/analyzer/tests/parsers/extraction.test.ts`, lines 14-16):

```typescript
expect(functions).toHaveLength(1);
expect(functions[0]?.name).toBe('hello');
expect(functions[0]?.line).toBe(1);
expect(functions[0]?.async).toBe(false);
```

**When to use:**
- Use `describe` for test suites, `it` for individual tests (Vitest globals enabled)
- Use optional chaining (`?.`) in assertions when accessing array elements or nested properties
- Inline small code fixtures directly in tests (< 5 lines)
- Extract larger fixtures to `tests/fixtures/` directory with `loadFixture()` helper
- Group tests by language/feature using nested `describe` blocks
- Use `createEmpty*()` factory functions for test data (pattern from `packages/analyzer/src/types/index.ts`)
- Keep assertion chains focused: one logical verification per `expect()` call

## Framework Patterns

### Singleton Pattern

**Detected:** Singleton parser manager for expensive resource reuse (from `packages/analyzer/src/parsers/treeSitter.ts`, lines 42-84):

```typescript
export class ParserManager {
  private static instance: ParserManager;
  private parsers = new Map<Language, Parser>();

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

  /**
   * Get parser for language
   *
   * Returns cached parser if exists, creates new parser if first time.
   * Each language has separate parser (cannot share).
   *
   * @param language - Language to parse
   * @returns Parser instance with language set
   *
   * @throws Error if language unsupported
   */
  getParser(language: Language): Parser {
    if (!this.parsers.has(language)) {
      const parser = new Parser();
      parser.setLanguage(this.getGrammar(language));
      this.parsers.set(language, parser);
    }
    return this.parsers.get(language)!;
  }
}
```

**Detected:** Singleton instance export for convenience (from `packages/analyzer/src/parsers/treeSitter.ts`, lines 141-143):

```typescript
// Export singleton instance for convenience
export const parserManager = ParserManager.getInstance();
```

**When to use:**
- Use singleton pattern for expensive resource initialization (tree-sitter parsers: 5-10ms per instance)
- Export both class (for testing via `getInstance()`) and instance (for convenience)
- Make constructor private to prevent direct instantiation
- Use lazy initialization (create on first `getInstance()` call)

### Factory Pattern

**Detected:** Empty result factory functions for fallbacks (from `packages/analyzer/src/types/index.ts`, lines 100-118):

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

**Detected:** Factory usage in graceful degradation (from `packages/cli/src/commands/init.ts`, lines 80-89):

```typescript
function createEmptyAnalysisResult(): AnalysisResult {
  return {
    projectType: 'unknown',
    framework: null,
    confidence: { projectType: 0, framework: 0 },
    indicators: { projectType: [], framework: [] },
    detectedAt: new Date().toISOString(),
    version: '0.0.0',
  } as AnalysisResult;
}
```

**When to use:**
- Use factory functions for creating complex objects with sensible defaults
- Name factories `createEmpty*()` for fallback/test data
- Name factories `create*()` for primary object construction
- Export factories alongside type definitions

### Command Pattern

**Detected:** CLI commands as separate modules (from exploration results):

```
packages/cli/src/commands/
├── init.ts        — Initialize .ana/ framework
├── setup.ts       — Setup orchestrator (calls agents)
├── analyze.ts     — Run analyzer
├── mode.ts        — Mode file operations
└── check.ts       — Validation and quality checks
```

**Detected:** Command registration pattern (from `packages/cli/src/commands/init.ts`, lines 92-148):

```typescript
export const initCommand = new Command('init')
  .description('Initialize .ana/ context framework')
  .option('-f, --force', 'Overwrite existing .ana/ (preserves .state/)')
  .option('--skip-analysis', 'Skip analyzer, create empty scaffolds')
  .action(async (options: InitCommandOptions) => {
    const cwd = process.cwd();
    const anaPath = path.join(cwd, '.ana');

    // Phase 1: Pre-flight checks
    const preflight = await validateInitPreconditions(anaPath, options);
    if (!preflight.canProceed) {
      return; // Exit already handled in validation
    }

    // Phase 2-9: Atomic operation
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-init-'));
    const tmpAnaPath = path.join(tmpDir, '.ana');

    try {
      // All operations in temp directory
      const analysisResult = await runAnalyzer(cwd, options);
      await createDirectoryStructure(tmpAnaPath);
      await generateAnalysisMd(tmpAnaPath, analysisResult, cwd);
      await generateScaffolds(tmpAnaPath, analysisResult, cwd);
      await copyStaticFilesWithVerification(tmpAnaPath);
      await copyHookScripts(tmpAnaPath);
      await createMetaJson(tmpAnaPath, analysisResult);
      await storeSnapshot(tmpAnaPath, analysisResult);

      // Restore .state/ if --force was used
      if (preflight.stateBackup) {
        const stateDir = path.join(tmpAnaPath, '.state');
        await fs.rm(stateDir, { recursive: true, force: true });
        await fs.rename(preflight.stateBackup, stateDir);
      }

      // SUCCESS: Atomic rename
      await atomicRename(tmpAnaPath, anaPath);

      // Create .claude/ configuration (outside temp directory - handles merge)
      await createClaudeConfiguration(cwd);

      // Display success
      displaySuccessMessage(analysisResult);
    } catch (error) {
      // FAILURE: Cleanup temp, no changes made
      await fs.rm(tmpDir, { recursive: true, force: true });

      if (error instanceof Error) {
        console.error(chalk.red(`\n❌ Init failed: ${error.message}`));
        console.error(chalk.gray('No changes made to your project.'));
      }
      process.exit(1);
    }
  });
```

**When to use:**
- Each CLI command is a separate file in `commands/` directory
- Export `Command` instance with `.description()`, `.option()`, `.action()`
- Use typed options interfaces for command options
- Implement commands as multi-phase operations with clear comments
- Use temp directories for atomic operations that must fully succeed or fully fail

### Caching Pattern

**Detected:** Cache interface with get/set/stats (from `packages/analyzer/src/parsers/treeSitter.ts`, lines 710-747):

```typescript
export async function parseFile(
  filePath: string,
  language: string,
  cache?: ASTCache  // Cache now functional (CP2)
): Promise<ParsedFile> {
  // Check cache first (CP2 integration)
  if (cache) {
    const cached = await cache.get(filePath);
    if (cached) {
      // Cache hit - return cached data (fast path: 5-10ms)
      return {
        file: filePath,
        language,
        functions: cached.functions,
        classes: cached.classes,
        imports: cached.imports,
        exports: cached.exports,
        decorators: cached.decorators,
        parseTime: cached.parseTime,
        parseMethod: 'cached',
        errors: 0,  // Cached data was valid when stored
      };
    }
  }

  // Cache miss - parse file (slow path: 50-150ms)
  const content = await readFile(filePath);

  // Get parser for language
  const parser = parserManager.getParser(language as any);

  // Parse code → tree
  const startTime = performance.now();
  const tree = parser.parse(content);
  const parseTime = performance.now() - startTime;

  // ... extraction logic ...
}
```

**When to use:**
- Use optional cache parameter (`cache?: ASTCache`) for graceful degradation
- Check cache before expensive operations (parsing: 50-150ms per file)
- Store results after expensive operations for future runs
- Return `parseMethod: 'cached'` metadata to track cache hits
- Use file-based cache (`.ana/.cache/`) for persistence across runs

### Atomic Operations Pattern

**Detected:** Temp directory + atomic rename for all-or-nothing operations (from `packages/cli/src/commands/init.ts`, lines 106-148):

```typescript
// Phase 2-9: Atomic operation
const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-init-'));
const tmpAnaPath = path.join(tmpDir, '.ana');

try {
  // All operations in temp directory
  const analysisResult = await runAnalyzer(cwd, options);
  await createDirectoryStructure(tmpAnaPath);
  await generateAnalysisMd(tmpAnaPath, analysisResult, cwd);
  await generateScaffolds(tmpAnaPath, analysisResult, cwd);
  await copyStaticFilesWithVerification(tmpAnaPath);
  await copyHookScripts(tmpAnaPath);
  await createMetaJson(tmpAnaPath, analysisResult);
  await storeSnapshot(tmpAnaPath, analysisResult);

  // SUCCESS: Atomic rename
  await atomicRename(tmpAnaPath, anaPath);

  // Create .claude/ configuration
  await createClaudeConfiguration(cwd);

  // Display success
  displaySuccessMessage(analysisResult);
} catch (error) {
  // FAILURE: Cleanup temp, no changes made
  await fs.rm(tmpDir, { recursive: true, force: true });

  if (error instanceof Error) {
    console.error(chalk.red(`\n❌ Init failed: ${error.message}`));
    console.error(chalk.gray('No changes made to your project.'));
  }
  process.exit(1);
}
```

**Detected:** Cross-filesystem fallback in atomic rename (from `packages/cli/src/commands/init.ts`, lines 859-884):

```typescript
async function atomicRename(tmpAnaPath: string, anaPath: string): Promise<void> {
  try {
    // Try atomic rename (works if same filesystem)
    await fs.rename(tmpAnaPath, anaPath);
  } catch (error) {
    // Handle cross-filesystem case
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EXDEV') {
      // Rename failed - different filesystems
      // Fallback: recursive copy + delete temp
      await fs.cp(tmpAnaPath, anaPath, { recursive: true });
      await fs.rm(path.dirname(tmpAnaPath), { recursive: true, force: true });
    } else {
      // Other error - rethrow
      throw error;
    }
  }
}
```

**When to use:**
- Use temp directory for multi-step operations that must fully succeed or fully fail
- Create temp dir with `fs.mkdtemp()` for unique names
- Perform ALL mutations in temp directory
- Only move to final location after all steps succeed (atomic rename)
- Clean up temp directory on any error
- Handle EXDEV error (cross-filesystem rename) with copy + delete fallback

### Barrel Export Pattern

**Detected:** Index file re-exports for clean public API (from `packages/analyzer/src/types/index.ts`, lines 128-206):

```typescript
// Export structure analysis types (STEP_1.2)
export type {
  StructureAnalysis,
  EntryPointResult,
  ArchitectureResult,
  TestLocationResult,
} from './structure.js';
export {
  StructureAnalysisSchema,
  EntryPointResultSchema,
  ArchitectureResultSchema,
  TestLocationResultSchema,
  createEmptyStructureAnalysis,
} from './structure.js';

// Export parsed analysis types (STEP_1.3)
export type {
  ParsedAnalysis,
  ParsedFile,
  FunctionInfo,
  ClassInfo,
  ImportInfo,
  ExportInfo,
  DecoratorInfo,
} from './parsed.js';
export {
  ParsedAnalysisSchema,
  ParsedFileSchema,
  FunctionInfoSchema,
  ClassInfoSchema,
  ImportInfoSchema,
  ExportInfoSchema,
  DecoratorInfoSchema,
  createEmptyParsedAnalysis,
} from './parsed.js';
```

**When to use:**
- Create `index.ts` barrel files in package root and major subdirectories
- Re-export types using `export type { ... }`
- Re-export runtime values using `export { ... }`
- Group exports by feature with comments
- Consumers import from barrel: `import { AnalysisResult } from 'anatomia-analyzer'`

---

*Last updated: 2026-03-22T03:32:08Z*
