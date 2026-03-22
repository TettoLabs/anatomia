# Debugging — anatomia-workspace

This file documents how to investigate issues in Anatomia — logging setup, error tracing, common failures, and debugging workflow. Captures tribal knowledge from development.

## Logging

**Detected:** Console-based logging with chalk for colors and ora for progress spinners.

No structured logging framework detected. CLI uses direct console output with formatting utilities:

- **chalk 5.3.0** — Terminal color formatting (from `packages/cli/package.json`)
- **ora 8.0.0** — Terminal spinners for long-running operations (from `packages/cli/package.json`)

Example from `packages/cli/src/commands/init.ts` (lines 96-98):

```typescript
const cwd = process.cwd();
const anaPath = path.join(cwd, '.ana');

// Phase 1: Pre-flight checks
```

Spinners used in init.ts and analyze.ts for progress indication during analysis and file generation.

**Detected:** Verbose mode available via `--verbose` flag in analyze command (from `packages/cli/src/commands/analyze.ts`, line 25):

```typescript
.option('-v, --verbose', 'Show all signals and details')
```

**Detected:** DEBUG environment variable controls info-level messages (from `packages/analyzer/src/errors/formatter.ts`, lines 70-74):

```typescript
// Info messages (only if DEBUG or verbose mode)
if (info.length > 0 && process.env['DEBUG']) {
  lines.push(chalk.cyan.bold(`\n${info.length} Info Message(s):\n`));
  info.forEach((e) => lines.push(formatError(e)));
}
```

### Log Levels

**Detected:** Three severity levels in error handling:

From `packages/analyzer/src/errors/DetectionError.ts` (lines 13-21):

```typescript
export interface DetectionError {
  /** Machine-readable error code */
  code: string;

  /** User-friendly message */
  message: string;

  /** Severity level */
  severity: 'error' | 'warning' | 'info';
```

Output formatting by severity from `packages/analyzer/src/errors/formatter.ts` (lines 15-22):

```typescript
// Level indicator with color
const levelColor = {
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.cyan,
}[error.severity];

const level = error.severity.toUpperCase();
lines.push(levelColor.bold(`${level}: ${error.message}`));
```

### Enabling Debug Output

**Inferred:** Set `DEBUG=1` environment variable to see info-level messages during analyzer runs.

**Inferred:** Use `ana analyze --verbose` to see detailed detection signals and confidence scores.

## Error Tracing

**Detected:** Custom error handling infrastructure with structured error objects, not third-party error tracking service.

### Error Architecture

**Detected:** DetectionEngineError class for analyzer errors (from `packages/analyzer/src/errors/DetectionError.ts`, lines 44-81):

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
```

### Error Codes Registry

**Detected:** Comprehensive error code constants (from `packages/analyzer/src/errors/DetectionError.ts`, lines 106-133):

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

### Error Context

**Detected:** Errors include file, line, suggestion, and phase context (from `packages/analyzer/src/errors/DetectionError.ts`, lines 22-39):

```typescript
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
```

### Error Formatting

**Detected:** User-friendly error formatter with context and suggestions (from `packages/analyzer/src/errors/formatter.ts`, lines 12-43):

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

### Error Collection Pattern

**Detected:** DetectionCollector for aggregating errors during multi-phase analysis (from `packages/analyzer/src/errors/index.ts`):

```typescript
export { DetectionCollector } from './DetectionCollector.js';
export { formatError, formatAllErrors, formatErrorSummary } from './formatter.js';
```

**Inferred:** Errors are collected during analysis phases rather than failing fast, allowing complete diagnostic output.

### Third-Party Error Tracking

**Not detected** — No error tracking service (Sentry, Bugsnag, Rollbar) in dependencies.

**Inferred:** For production CLI use, consider adding Sentry for crash reporting and analytics.

## Common Failure Modes

**User stated:** Three main pain points encountered during development.

### Failure: Tree-sitter Native Module Loading

**Symptom:** Parser initialization fails with native module load errors, especially on certain Node versions or non-Linux platforms.

**Cause:** tree-sitter native modules (CommonJS) incompatible with some Node versions or platforms (Windows/macOS differences).

**Detected:** Native module imports via createRequire (from `packages/analyzer/src/parsers/treeSitter.ts`, lines 18-26):

```typescript
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Import using require for native modules (they use CommonJS)
import Parser from 'tree-sitter';
const Python = require('tree-sitter-python');
const TypeScriptGrammar = require('tree-sitter-typescript');
const JavaScript = require('tree-sitter-javascript');
const Go = require('tree-sitter-go');
```

**Diagnosis:**
1. Check Node.js version (must be >=20.0.0 per `package.json` engines field)
2. Verify platform-specific native bindings exist in `node_modules/tree-sitter-*/builds/`
3. Check for native compilation errors in `pnpm install` output
4. Test with `node --version` to confirm version matches CI matrix

**Fix:**
- **For developers:** Ensure Node 20 or 22 (tested versions per CI matrix)
- **For CI failures:** Check matrix job logs for native compilation errors
- **For users:** Recommend prebuilt binaries or Node version downgrade

**Prevention:**
- CI tests on 3 OS × 2 Node versions = 6 combinations (from `.github/workflows/test.yml`, lines 17-18)
- fail-fast disabled to see all platform failures (line 15: `fail-fast: false`)

### Failure: Template Copy Step in Build

**Symptom:** CLI crashes at runtime with "template not found" errors after build.

**Cause:** tsup cleans dist/ before build (clean: true), then template copy may fail, leaving dist/ without templates/ directory.

**Detected:** Build script with chained commands (from `packages/cli/package.json`, line 44):

```json
"build": "tsup && cp -r templates dist/"
```

**Detected:** tsup config with clean flag (from `packages/cli/tsup.config.ts`, lines 3-11):

```typescript
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  shims: true,
  clean: true,
  dts: true,
  external: ['anatomia-analyzer'], // Don't bundle dependency
});
```

**Diagnosis:**
1. Check if `dist/templates/` exists after build
2. Look for "cp: cannot create directory" errors in build output
3. Test template access in CLI: `ana init` should find mode files

**Fix:**
- **During development:** Run `pnpm build` from CLI package root, not monorepo root
- **If templates missing:** Manually `cp -r templates dist/` to restore
- **For packaging:** Verify `files` field in package.json includes both dist and templates (lines 38-42)

**Prevention:**
- Add build verification step to CI that checks `dist/templates/` exists
- Consider moving templates to separate published package
- Or use tsup's copy plugin instead of shell command

**Inferred:** Template copy failure is silent (cp may succeed but copy incomplete files), making debugging harder.

### Failure: Framework Detection Disambiguation

**Symptom:** Project detected as wrong framework (e.g., React instead of Next.js, Express instead of Nest.js).

**Cause:** Multiple frameworks present in dependencies — detection priority order matters.

**Detected:** Priority-based framework detection (from `packages/analyzer/src/detectors/framework.ts`, lines 88-116):

```typescript
/**
 * Detect Node framework (priority order)
 * CRITICAL: Next before React, Nest before Express
 */
async function detectNodeFramework(rootPath: string): Promise<FrameworkResult> {
  const deps = await readNodeDependencies(rootPath);

  // 1. Next.js (BEFORE React)
  const nextjs = await detectNextjs(rootPath, deps);
  if (nextjs.framework) return nextjs;

  // 2. Nest.js (BEFORE Express)
  const nestjs = await detectNestjs(rootPath, deps);
  if (nestjs.framework) return nestjs;

  // 3. Express
  const express = await detectExpress(rootPath, deps);
  if (express.framework) return express;

  // 4. React
  const react = await detectReact(rootPath, deps);
  if (react.framework) return react;

  // 5. Other
  const other = await detectOtherNodeFrameworks(deps);
  if (other.framework) return other;

  // 6. Fallback
  return { framework: null, confidence: 0.0, indicators: [] };
}
```

**Diagnosis:**
1. Run `ana analyze --verbose` to see all detected frameworks and confidence scores
2. Check which dependencies are present: `cat package.json | grep -E "(next|react|express|nestjs)"`
3. Look for framework-specific files: `next.config.js`, `nest-cli.json`, etc.
4. Review detection indicators in verbose output

**Fix:**
- **For Next.js false negative:** Ensure `next` in dependencies and `next.config.js` exists
- **For Nest.js false negative:** Check for `@nestjs/core` dependency and NestJS decorators in code
- **For React false positive:** If using Next.js, remove standalone `react-scripts` or CRA config

**Prevention:**
- Framework detectors check both dependencies AND file-system evidence (config files, imports)
- Priority order ensures superset frameworks detected before subset frameworks
- Confidence scoring helps surface ambiguous cases

**Inferred:** Add test cases for multi-framework projects to catch priority regressions.

### Failure: Citation Verification in Setup Process

**Symptom:** Writer agent creates context files with fabricated code examples or wrong line numbers, failing verification hook.

**Cause:** Writer agent cites code without reading files first, or guesses line numbers.

**Diagnosis:**
1. Check `.ana/.setup_qa_log.md` for writer agent's claimed sources
2. Read the source file and verify line numbers match
3. Look for "Citation failed" errors in setup output

**Fix:**
- **During setup redesign:** Writer agent MUST read file before citing (Quote-Then-Write protocol)
- **For failed verification:** Re-run `ana setup check` after fixing citations in context files
- **For users:** Use `ana setup teach` to manually correct fabricated content

**Prevention:**
- PostToolUse hook runs verification automatically after every Write
- Step files include citation protocol instructions
- Rules.md emphasizes Read-Before-Cite requirement

**Inferred:** This is current work focus, not historical pain point — from recent SideSprint commits.

## Debugging Workflow

**Detected:** Local development workflow with hot reload and global linking.

### Local Development Setup

From README.md and package structure:

1. **Clone and install:**
   ```bash
   git clone https://github.com/TettoLabs/anatomia.git
   cd anatomia
   pnpm install
   ```

2. **Build packages:**
   ```bash
   pnpm build  # Turborepo builds all packages in dependency order
   ```

3. **Link CLI globally:**
   ```bash
   cd packages/cli
   pnpm link --global
   ```

4. **Test in any project:**
   ```bash
   cd ~/your-project
   ana init
   ```

### Development Mode (Watch)

**Detected:** Dev mode with watch enabled (from root `package.json` and Turborepo config):

```bash
pnpm dev  # Runs tsup --watch for CLI, tsc --watch for analyzer
```

**Inferred:** File changes rebuild automatically, but requires re-running `ana` command to test (no live reload for CLI).

### Debugging Tests

**Detected:** Vitest test suite with coverage (from `packages/cli/vitest.config.ts`, lines 4-23):

```typescript
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
}
```

**Run tests:**
```bash
pnpm test              # Run all tests with watch mode
pnpm test --run        # Single run (CI mode)
pnpm test --coverage   # Generate coverage report
```

**Detected:** Coverage thresholds enforced: 80% lines, 75% branches for CLI; 85% lines, 80% branches for analyzer.

### Debugging Analyzer Detection

**Use analyze command with verbose flag:**

```bash
ana analyze --verbose
```

**Inferred:** Verbose mode shows:
- All framework detectors run
- Confidence scores for each detection
- Indicators (files/dependencies) that triggered detection
- Errors and warnings from detection phases

### Debugging CI Failures

**Detected:** GitHub Actions matrix testing (from `.github/workflows/test.yml`, lines 14-18):

```yaml
strategy:
  fail-fast: false  # CRITICAL: Run all combinations even if one fails
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [20, 22]
```

**Workflow:**
1. Check which OS/Node combination failed in GitHub Actions
2. Reproduce locally with matching Node version
3. Look for platform-specific issues (Windows path separators, macOS file permissions)
4. Run `pnpm test --run` locally to match CI environment

**Detected:** Coverage uploaded only from Ubuntu + Node 20 (lines 44-50):

```yaml
- name: Upload coverage (Ubuntu + Node 20 only)
  if: matrix.os == 'ubuntu-latest' && matrix.node-version == 20
  uses: codecov/codecov-action@v4
```

### Debugging TypeScript Issues

**Detected:** Source maps enabled for debugging (from `tsconfig.base.json`):

```json
{
  "compilerOptions": {
    "sourceMap": true,
    "declarationMap": true
  }
}
```

**Use Node debugger:**
```bash
node --inspect-brk ./packages/cli/dist/index.js init
```

**Or use tsx for TypeScript source debugging:**
```bash
tsx --inspect-brk ./packages/cli/src/index.ts init
```

### Debugging File Writer Errors

**Detected:** FileWriter class wraps errors with context (from `packages/cli/src/utils/file-writer.ts`, lines 78-83):

```typescript
} catch (error) {
  if (error instanceof Error) {
    throw new Error(`Failed to write file '${filePath}': ${error.message}`);
  }
  throw error;
}
```

**Common file write errors:**
- Permission denied → Check file mode (default: 0o644)
- Parent directory missing → FileWriter creates recursively, but check disk space
- Encoding error → Verify content is valid UTF-8

### Debugging Build Issues

**Check build outputs:**

```bash
ls -la packages/cli/dist/
ls -la packages/analyzer/dist/
```

**Verify templates copied:**

```bash
ls -la packages/cli/dist/templates/modes/
```

**Clean rebuild:**

```bash
pnpm clean  # Remove all dist/ directories
pnpm build  # Rebuild from scratch
```

## Observability

**Not detected** — No APM or monitoring tools in dependencies.

### Current State

**Detected:** Development-stage project (version 0.2.0) with basic logging only.

- No application performance monitoring (APM)
- No distributed tracing
- No metrics collection
- No alerting system
- No health check endpoints (CLI tool, not server)

### Error Tracking Infrastructure

**Detected:** Custom error handling foundation is present:

- Structured error objects with codes, severity, context
- Error collection during multi-phase operations
- Formatted error output with suggestions
- Error summary reporting

**Inferred:** This error infrastructure could integrate with Sentry or similar service for production monitoring.

### Recommended for Production

**For CLI distribution:**
1. **Sentry** — Crash reporting and release tracking
   - Capture unhandled exceptions
   - Track CLI version adoption
   - Monitor error rates by platform (Windows/macOS/Linux)

2. **Telemetry** — Usage analytics (opt-in)
   - Command usage statistics
   - Performance metrics (analysis duration, file counts)
   - Framework detection success rates

3. **Debug logging** — Structured logs to file
   - Replace console.log with winston or pino
   - Write logs to `~/.anatomia/logs/` for debugging user issues
   - Rotate logs to prevent disk fill

**For website (Next.js):**
- Vercel Analytics (already hosted on Vercel per domain)
- Error tracking via Sentry
- Web Vitals monitoring

### Test Coverage as Observability

**Detected:** High test coverage requirements act as quality gate:

- CLI: 80% lines, 75% branches
- Analyzer: 85% lines, 80% branches
- CI reports coverage on every push
- Coverage uploaded to Codecov for tracking over time

**Inferred:** Coverage trends indicate code quality and regression risk.

### CI/CD as Observability

**Detected:** GitHub Actions provides build/test health visibility:

- 6 platform combinations tested on every push
- Test failures visible in PR checks
- Build success/failure tracked per commit
- Manual review of test logs for debugging

**Inferred:** CI matrix serves as "canary" for platform-specific issues.

---

**Last updated:** 2026-03-21T03:32:08Z (setup process)
