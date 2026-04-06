# Debugging — anatomia-workspace

## Logging

**Detected:** Console-based logging with chalk formatting (from `packages/cli/src/commands/setup.ts`, `packages/cli/src/index.ts`)

No structured logging library. The project uses direct `console.log`, `console.error`, and `console.warn` calls with chalk color formatting for CLI output.

Example from `packages/cli/src/index.ts` (lines 40-44):
```typescript
} catch (error) {
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  }
  process.exit(1);
}
```

Example from `packages/cli/src/commands/setup.ts` (lines 115-127):
```typescript
if (allErrors.length > 0) {
  console.log(chalk.red('\n❌ Validation failed\n'));
  displayValidationFailures(allErrors);
  process.exit(1);
}

// Display soft warnings (don't block)
if (warnings.length > 0) {
  console.log(chalk.yellow('\n⚠️  Quality warnings:\n'));
  warnings.forEach((w) => {
    console.log(chalk.yellow(`  ${w.message}`));
  });
  console.log();
}
```

**Detected:** Debug verbosity controlled by environment variables (from `packages/analyzer/src/analyzers/patterns.ts`, `packages/analyzer/src/errors/formatter.ts`)

The analyzer supports two environment variables for debug output:
- `VERBOSE` - Enables detailed timing and detection logs
- `DEBUG` - Shows info-level messages in error formatting

Example from `packages/analyzer/src/analyzers/patterns.ts` (lines 573-576):
```typescript
if (process.env['VERBOSE']) {
  console.log(`[Pattern Inference] Stage 1 (dependencies): ${stage1Duration}ms`);
  console.log(`[Pattern Inference] Detected ${Object.keys(dependencyPatterns).length} patterns from dependencies`);
}
```

Example from `packages/analyzer/src/errors/formatter.ts` (lines 70-74):
```typescript
// Info messages (only if DEBUG or verbose mode)
if (info.length > 0 && process.env['DEBUG']) {
  lines.push(chalk.cyan.bold(`\n${info.length} Info Message(s):\n`));
  info.forEach((e) => lines.push(formatError(e)));
}
```

**Usage:**
```bash
# Enable verbose analyzer output
VERBOSE=1 ana init

# Enable debug-level error messages
DEBUG=1 ana setup complete
```

**Inferred:** No log rotation, no persistent logs — all output is ephemeral to stdout/stderr. Suitable for a CLI tool but makes post-mortem debugging difficult for user-reported issues.

## Error Tracing

**Detected:** Custom error classes with structured metadata (from `packages/analyzer/src/errors/DetectionError.ts`)

The analyzer defines `DetectionEngineError` class and `DetectionError` interface with machine-readable codes, severity levels, and context.

Example from `packages/analyzer/src/errors/DetectionError.ts` (lines 12-40):
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

**Detected:** Error codes registry for common failures (from `packages/analyzer/src/errors/DetectionError.ts`, lines 106-133):
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

**Detected:** Chalk-formatted error output with context grouping (from `packages/analyzer/src/errors/formatter.ts`, lines 12-42):
```typescript
export function formatError(error: DetectionError): string {
  const lines: string[] = [];

  // Level indicator with color
  const levelColor = {
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.cyan,
  }[error.severity];

  const level = error.severity.toUpperCase();
  lines.push(levelColor.bold(`${level}: ${error.message}`));
  lines.push('');

  // Context
  if (error.file || error.line || error.phase) {
    lines.push(chalk.gray('Context:'));
    if (error.file) lines.push(chalk.gray(`  • File: ${error.file}`));
    if (error.line) lines.push(chalk.gray(`  • Line: ${error.line}`));
    if (error.phase) lines.push(chalk.gray(`  • Phase: ${error.phase}`));
    lines.push('');
  }

  // Suggestion
  if (error.suggestion) {
    lines.push(chalk.gray('How to fix:'));
    lines.push(chalk.gray(`  ${error.suggestion}`));
    lines.push('');
  }

  return lines.join('\n');
}
```

**Detected:** No error tracking service (Sentry, Bugsnag, Rollbar) in dependencies (from `packages/*/package.json`)

**Unexamined:** Stack traces are only visible when errors bubble up uncaught. Most errors are caught in try-catch blocks with graceful degradation, which hides stack traces from users. This is intentional for user experience but makes remote debugging harder when users report issues without stack traces.

## Failure Modes

**User confirmed:** Key debugging areas from Q&A: WASM memory in tree-sitter, verification hook loops, ESM path confusion, framework detection edge cases

### Failure: WASM Memory Leaks in Tree-sitter Parsing

**Symptom:** Memory usage grows with repeated parsing, potentially causing OOM crashes on large codebases

**Cause:** Tree-sitter returns WASM-allocated Tree objects that must be manually freed with `.delete()`. Forgetting to call `tree.delete()` leaks WASM memory.

**Detected:** Manual cleanup enforced with try-finally (from `packages/analyzer/src/parsers/treeSitter.ts`, lines 967-971):
```typescript
  return result;
} finally {
  // CRITICAL: Free WASM memory
  tree.delete();
}
```

**Diagnosis:**
1. Check if memory grows linearly with number of files parsed
2. Look for tree-sitter Tree objects that escape the parseFile() function without `.delete()` call
3. Search codebase for `parser.parse()` calls — every tree MUST be deleted

**Fix:** Ensure every `parser.parse()` call is followed by `tree.delete()` in a finally block

**Prevention:** Code comment at every parse site warns about WASM memory (line 100 in treeSitter.ts: "CRITICAL: Free WASM memory")

**Detected:** ParserManager documentation includes cleanup warning (from `packages/analyzer/src/parsers/treeSitter.ts`, lines 91-105):
```typescript
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
 * // ... extract data from tree2 ...
 * tree2.delete();
 * ```
 */
```

### Failure: Verification Hook Infinite Loops

**Symptom:** `ana setup complete` hangs or repeatedly fails with "Check failed" message, blocking completion

**Cause:** SubagentStop hook (`.ana/hooks/subagent-verify.sh`) runs after every Write tool call during setup. If a context file fails quality checks, the hook exits with code 2, blocking the agent from finishing. If the agent doesn't fix the issue or reads the wrong result file, it can loop.

**Detected:** Hook verification logic (from `.ana/hooks/subagent-verify.sh`, lines 44-59):
```bash
# Run check on ONLY this agent's file
RESULT=$(bash "$HOOK_DIR/run-check.sh" "$ASSIGNED_FILE" --json 2>&1)
CHECK_EXIT=$?

# Write detailed results to disk for the writer to read
RESULT_DIR="$PROJECT_ROOT/.ana/.state"
mkdir -p "$RESULT_DIR"
echo "$RESULT" > "$RESULT_DIR/check_result_${ASSIGNED_FILE}"

if [ $CHECK_EXIT -ne 0 ]; then
  PASSED=$(echo "$RESULT" | grep -o '"overall":[[:space:]]*true' | head -1)
  if [ -z "$PASSED" ]; then
    echo "Check failed for $ASSIGNED_FILE. Read .ana/.state/check_result_${ASSIGNED_FILE} for details." >&2
    exit 2
  fi
fi
```

**Diagnosis:**
1. Check `.ana/.state/check_result_*.md` files for the failing context file
2. Look for quality failures: line count, missing sections, placeholders, scaffold markers
3. Verify the agent is reading the correct result file (matches the file it just wrote)

**Fix:**
- Read the specific check result file mentioned in the hook error message
- Address the quality failures (add content, remove placeholders, add missing sections)
- Re-run the check manually: `bash .ana/hooks/run-check.sh <filename> --json`

**Prevention:** Setup instructions now tell the writer agent to verify output before finishing. Hook only fires for specific agent patterns (not explorer).

### Failure: ESM Import Path Resolution

**Symptom:** Import errors like "Cannot find module './module'" or "ERR_MODULE_NOT_FOUND" despite file existing

**Cause:** ESM requires `.js` extensions in import paths, even when importing `.ts` files. TypeScript compiles `.ts → .js`, but import paths are NOT rewritten. Writing `import { x } from './module'` fails at runtime.

**Detected:** All imports use `.js` extensions in source code (from `packages/cli/src/index.ts`, lines 14-18):
```typescript
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { modeCommand } from './commands/mode.js';
import { analyzeCommand } from './commands/analyze.js';
import { setupCommand } from './commands/setup.js';
```

**Diagnosis:**
1. Check error message for "ERR_MODULE_NOT_FOUND" with a path missing `.js`
2. Search imports: `grep -r "from './" --include="*.ts"` — all should end in `.js`
3. Check tsconfig.json has `"module": "ESNext"` and `"moduleResolution": "bundler"`

**Fix:** Add `.js` extension to import path (even in `.ts` files)

**Prevention:** ESLint could enforce this, but currently not configured. Convention documented in conventions.md.

### Failure: Framework Detection Ambiguity

**Symptom:** Analyzer returns low confidence scores (<0.7) or wrong framework (e.g., detects "express" when using Fastify)

**Cause:** Multiple frameworks have overlapping dependency patterns. Presence of `express` in `package.json` doesn't mean it's the primary framework — might be a dev dependency or sub-dependency.

**Detected:** Framework detection uses dependency presence + import frequency (from exploration results: detectors/projectType.ts, analyzers/patterns.ts)

**Diagnosis:**
1. Check `.ana/.state/snapshot.json` → `framework.confidence` score
2. Look at `analysis.framework.name` and compare to actual framework in use
3. Run with `VERBOSE=1` to see detection reasoning
4. Check if multiple frameworks are in dependencies (e.g., both Next.js and Express)

**Fix:**
- If confidence is low but correct: acceptable, document in project-overview.md
- If framework is wrong: may need to explicitly configure framework (future feature)
- Workaround: Remove unused framework dependencies to reduce ambiguity

**Prevention:** Confidence scoring flags ambiguity. Analyzer returns confidence with every detection.

### Failure: ParserManager Not Initialized

**Symptom:** Error: "ParserManager not initialized — call initialize() first"

**Cause:** Tree-sitter WASM runtime must be initialized before any parsing. Calling `parserManager.getParser()` or `parserManager.getLanguage()` before `await parserManager.initialize()` throws.

**Detected:** Initialization check in ParserManager methods (from `packages/analyzer/src/parsers/treeSitter.ts`, lines 199-207):
```typescript
getLanguage(language: Language): TSLanguage {
  if (!this.initialized) {
    throw new Error('ParserManager not initialized — call initialize() first');
  }
  const lang = this.languages.get(language);
  if (!lang) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return lang;
}
```

**Diagnosis:**
1. Search stack trace for first `getParser()` or `getLanguage()` call
2. Check if `await parserManager.initialize()` was called earlier in the execution path
3. Common in tests — ensure test setup calls `initialize()` in `beforeEach` or `beforeAll`

**Fix:** Call `await parserManager.initialize()` once before any parsing operations

**Prevention:** `parseProjectFiles()` checks and initializes automatically (lines 1001-1004 in treeSitter.ts):
```typescript
// Ensure parser is initialized
if (!parserManager.isInitialized()) {
  await parserManager.initialize();
}
```

### Failure: WASM File Not Found

**Symptom:** Error: "WASM file not found: tree-sitter-python/tree-sitter-python.wasm. Checked: [paths]"

**Cause:** Tree-sitter grammar WASM files are optionalDependencies. If npm/pnpm install skips them (e.g., `--no-optional` flag, or install failure), the WASM files won't exist.

**Detected:** WASM path resolution with multiple fallbacks (from `packages/analyzer/src/parsers/treeSitter.ts`, lines 56-74):
```typescript
function resolveWasmPath(packageName: string, wasmFileName: string): string {
  const candidates = [
    // packages/analyzer/node_modules/<pkg>/<file>.wasm
    join(__dirname, '..', '..', 'node_modules', packageName, wasmFileName),
    // monorepo root node_modules/<pkg>/<file>.wasm (pnpm hoists)
    join(__dirname, '..', '..', '..', '..', 'node_modules', packageName, wasmFileName),
  ];

  for (const candidate of candidates) {
    try {
      accessSync(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(`WASM file not found: ${packageName}/${wasmFileName}. Checked: ${candidates.join(', ')}`);
}
```

**Diagnosis:**
1. Check error message for list of checked paths
2. Verify `node_modules/tree-sitter-python/*.wasm` exists (or other language)
3. Check package.json has tree-sitter-* in optionalDependencies
4. Look for install warnings about optional dependencies failing

**Fix:**
```bash
# Reinstall optional dependencies
pnpm install --include=optional

# Or install specific grammar manually
pnpm add -D tree-sitter-python
```

**Prevention:** Documentation should warn about optional dependencies requirement. README includes installation instructions.

## Debugging Workflow

**Detected:** No VSCode launch.json or debug configuration files in repository

**Inferred:** Manual debugging workflow using console.log and Node.js inspector

### Local Development Debugging

1. **Enable verbose logging:**
   ```bash
   VERBOSE=1 ana init
   DEBUG=1 ana setup complete
   ```

2. **Run with Node inspector:**
   ```bash
   node --inspect node_modules/.bin/ana init
   # Then open chrome://inspect in Chrome
   ```

3. **Check analyzer output:**
   ```bash
   ana analyze --json > analysis.json
   # Inspect analysis.json for detection results
   ```

4. **Examine state files:**
   ```bash
   cat .ana/.state/snapshot.json | jq .
   cat .ana/.meta.json | jq .
   ls -la .ana/.state/check_result_*
   ```

### Test Debugging

**Detected:** Vitest test framework (from `packages/*/vitest.config.ts`)

```bash
# Run single test file
pnpm test packages/analyzer/tests/parsers/treeSitter.test.ts

# Run with verbose output
pnpm test -- --reporter=verbose

# Run in watch mode
pnpm test -- --watch

# Debug specific test
node --inspect-brk node_modules/.bin/vitest run --no-coverage [test-file]
```

### Production Debugging (User-Reported Issues)

**Unexamined:** No built-in telemetry or crash reporting. When users report issues, debugging relies on:
1. User-provided error messages (may not include stack traces if caught)
2. Reproduction steps
3. Asking user to re-run with `VERBOSE=1` and share output

**Inferred:** Lack of error tracking service means production debugging is reactive and manual. Consider adding opt-in telemetry or encouraging users to share verbose logs.

### Hook Debugging

**Detected:** Hook scripts run during Claude Code agent execution (from `.ana/hooks/*.sh`)

To debug hook failures:

1. **Check hook output:**
   ```bash
   # Hooks write to stderr, but Claude Code captures it
   # Check result files instead
   cat .ana/.state/check_result_*.md
   ```

2. **Run hook manually:**
   ```bash
   bash .ana/hooks/run-check.sh debugging.md --json
   bash .ana/hooks/subagent-verify.sh < /dev/null
   ```

3. **Disable hooks temporarily:**
   ```bash
   # Rename hook to prevent execution
   mv .ana/hooks/subagent-verify.sh .ana/hooks/subagent-verify.sh.disabled
   ```

## Observability

**Detected:** No APM or monitoring tools in dependencies (checked `package.json` for newrelic, datadog, prometheus, @sentry/node, pino, winston)

**Detected:** Performance timing for internal operations (from `packages/analyzer/src/analyzers/patterns.ts`, lines 565-607):
```typescript
const stage1Start = Date.now();
const dependencyPatterns = await detectFromDependencies(
  rootPath,
  analysis.projectType,
  analysis.framework
);
const stage1Duration = Date.now() - stage1Start;

if (process.env['VERBOSE']) {
  console.log(`[Pattern Inference] Stage 1 (dependencies): ${stage1Duration}ms`);
  console.log(`[Pattern Inference] Detected ${Object.keys(dependencyPatterns).length} patterns from dependencies`);
}
```

**Detected:** Test performance benchmarks (from `packages/analyzer/tests/performance/parsing-performance.test.ts`)

Performance targets documented in tests:
- Total parsing time: ≤5000ms (5 seconds) for 20 files
- Cache speedup: ≥70% reduction on warm cache

**Detected:** Parse-level timing included in results (from `packages/analyzer/src/parsers/treeSitter.ts`, lines 897-899):
```typescript
const startTime = performance.now();
const tree = parser.parse(content);
const parseTime = performance.now() - startTime;
```

**Inferred:** CLI tool design means traditional APM (request tracing, uptime monitoring) is not applicable. Observability focuses on:
- Execution time (parse time, detection time, total time)
- Confidence scores (detection quality)
- Cache hit rates (performance optimization)

### Metrics Available

**Detected:** ParsedAnalysis includes cache statistics (from exploration: packages/analyzer/src/types/parsed.ts):
```typescript
{
  files: ParsedFile[],
  totalParsed: number,
  cacheHits: number,
  cacheMisses: number
}
```

**Detected:** PatternAnalysis includes detection metadata (from exploration: packages/analyzer/src/types/patterns.ts):
```typescript
{
  sampledFiles: number,
  detectionTime: number,
  threshold: number
}
```

**Detected:** All detections include confidence scores (0.0-1.0) for self-assessment

### Health Checks

**Not applicable** — CLI tool has no persistent process, no HTTP endpoints, no background jobs

### Recommended Observability Improvements

**Inferred:** For a CLI tool at this maturity level, observability improvements could include:

1. **Opt-in telemetry** — Anonymous usage stats (command frequency, error rates, execution time)
2. **Performance profiling mode** — `ana init --profile` writes timing breakdown to file
3. **Error report generation** — `ana diagnose` command that collects environment info, versions, recent errors
4. **Verbose JSON output** — `ana init --json` for machine-readable logs

**User flagged for review:** No timeout on parsing (could hang on pathological input)
**User flagged for review:** No input sanitization on CLI args (path traversal risk)

---

*Last updated: 2026-03-24*
