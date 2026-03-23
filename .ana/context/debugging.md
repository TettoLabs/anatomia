# Debugging — anatomia-workspace

## Logging

**Detected:** CLI uses chalk for colored console output (from `packages/cli/package.json`) — Confidence: 0.95

No structured logging library detected. The CLI uses direct console output with chalk for formatting.

Example from `packages/cli/src/commands/setup.ts` (lines 62-70):

```typescript
console.log(chalk.blue('\n🔍 Validating setup...\n'));

// Check .ana/ exists
if (!(await fileExists(anaPath))) {
  console.error(chalk.red('Error: .ana/ directory not found'));
  console.error(
    chalk.gray('Run `ana init` first to create .ana/ structure.')
  );
  process.exit(1);
}
```

**Color conventions:**
- `chalk.blue()` → Informational headers
- `chalk.gray()` → Progress/status messages
- `chalk.red()` → Errors and failures
- `chalk.yellow()` → Warnings
- `chalk.green()` → Success messages

**Unexamined:** No log levels, no file-based logging. Appropriate for CLI tool but lacks verbose/quiet modes.

**Recommendation:** Add `--verbose` and `--quiet` flags for debug/error-only output.

## Error Tracing

**Detected:** Custom error classes with structured fields (from `packages/analyzer/src/errors/DetectionError.ts`)

Example from `packages/analyzer/src/errors/DetectionError.ts` (lines 13-40):

```typescript
export interface DetectionError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  file?: string | undefined;
  line?: number | undefined;
  suggestion?: string | undefined;
  phase?: string | undefined;
  cause?: Error | undefined;
  timestamp: Date;
}
```

**Detected:** Error collector pattern for graceful degradation (from `packages/analyzer/src/errors/DetectionCollector.ts`, lines 9-69):

```typescript
export class DetectionCollector {
  private errors: DetectionError[] = [];
  private warnings: DetectionError[] = [];
  private info: DetectionError[] = [];

  addError(error: DetectionEngineError | DetectionError): void {
    // Adds to errors array (blocks functionality)
  }

  addWarning(error: DetectionEngineError | DetectionError): void {
    // Adds to warnings array (continues execution)
  }

  hasCriticalErrors(): boolean {
    return this.errors.length > 0;
  }
}
```

**Pattern:** Three-tier severity system (error, warning, info) allows partial success.

**User confirmed:** Silent graceful degradation can make failures hard to diagnose.

**No error tracking service detected** — No Sentry, Bugsnag, or Rollbar dependencies.

## Common Failure Modes

**User confirmed:** These four areas cause the most debugging time.

### Failure: WASM Memory Management

**Symptom:** Memory leaks or crashes when parsing many files

**Cause:** Tree-sitter WASM parsers allocate memory that JavaScript GC cannot free. Each `parser.parse()` creates a tree requiring manual `tree.delete()`.

**User confirmed:** WASM parsing and memory management requires explicit initialization and cleanup.

**Detected:** Critical cleanup pattern (from `packages/analyzer/src/parsers/treeSitter.ts`, lines 967-971):

```typescript
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
```

**Diagnosis:**
1. Check if `tree.delete()` is called in finally block after parsing
2. Run with `node --expose-gc` to confirm WASM leak vs JS leak
3. Check for early returns that skip finally block
4. In tests, verify ParserManager.resetFull() between suites

**Fix:**
- Always call `tree.delete()` in finally block
- Never store tree objects long-term — extract and delete immediately
- Use try-finally for all parsing operations

**Prevention:**
- Code comment at every parse call: "// CRITICAL: Free WASM memory"
- Memory profiling in CI for large file test suites

**Detected:** Parser initialization requirement (from `packages/analyzer/src/parsers/treeSitter.ts`, lines 141-180):

```typescript
async initialize(): Promise<void> {
  if (this.initialized) return;

  // Initialize WASM runtime
  await TSParser.init({ locateFile(scriptName: string) { ... } });

  // Pre-load all grammars
  for (const [lang, [pkg, wasm]] of Object.entries(grammarPaths)) {
    const wasmPath = resolveWasmPath(pkg, wasm);
    const language = await TSLanguage.load(wasmPath);
    this.languages.set(lang, language);
  }

  this.initialized = true;
}
```

**CRITICAL:** Must call `ParserManager.initialize()` once before any parsing, or all parse operations fail.

### Failure: Multi-Phase Validation Complexity

**Symptom:** Validation fails but error message doesn't clearly indicate which phase or what to fix

**Cause:** Setup runs 4 sequential phases (structural, content, cross-reference, quality). Errors aggregated without clear phase context.

**User confirmed:** Multi-phase validation complexity makes failures hard to trace.

**Detected:** Four validation phases (from `packages/cli/src/commands/setup.ts`, lines 95-112):

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

const allErrors = [...structuralErrors, ...contentErrors, ...crossRefErrors];
```

**Diagnosis:**
1. Check error.rule field to determine which phase failed
2. If cross-reference fails, compare snapshot.json with context files
3. If quality fails, check file size and section count
4. Run `ana setup check [filename]` to validate individual files

**Fix:**
- Run `ana setup check` for isolated file validation
- Re-run `ana init` if structural validation fails (missing files)
- Check .ana/.meta.json setupStatus field

### Failure: Silent Graceful Degradation

**Symptom:** Analysis completes with partial results without clearly indicating what was skipped

**Cause:** DetectionCollector accumulates errors/warnings without halting. Detector failures logged as warnings, analysis continues with incomplete data.

**User confirmed:** Silent graceful degradation can make failures hard to diagnose.

**Detected:** Graceful failure in monorepo detection (from `packages/analyzer/src/detectors/monorepo.ts`, lines 62-77):

```typescript
try {
  const content = await readFile(pnpmPath);
  const config = yaml.load(content) as { packages?: string[] };
  // ... process config ...
  return { isMonorepo: true, tool: 'pnpm', workspacePatterns: patterns };
} catch (error) {
  collector.addWarning(
    new DetectionEngineError(
      ERROR_CODES.INVALID_YAML,
      'Failed to parse pnpm-workspace.yaml',
      'warning',
      { suggestion: 'Check YAML syntax with yamllint' }
    )
  );
  // Continue to next detector
}
```

**Diagnosis:**
1. Check snapshot.json for empty/null fields (e.g., `framework: null`)
2. Enable verbose logging to see DetectionCollector warnings
3. Check DetectionCollector.getCounts() for warning count

**Fix:**
- Add `strictMode` option to fail fast on errors (already implemented in analyzer)
- Review warnings before accepting partial results
- Re-run after fixing environment issues (missing files, permissions)

### Failure: Monorepo Detection Fallbacks

**Symptom:** Monorepo not detected, wrong tool detected, or incomplete package discovery

**Cause:** 6-layer fallback strategy (pnpm → turbo → nx → lerna → npm workspaces → recursive scan). Earlier detector failures can cascade to wrong results.

**User confirmed:** Monorepo detection with 6 fallback strategies can fail in subtle ways.

**Detected:** Six-layer detection priority (from `packages/analyzer/src/detectors/monorepo.ts`, lines 24-260):

1. pnpm-workspace.yaml (pnpm)
2. turbo.json (Turborepo)
3. nx.json (Nx)
4. lerna.json (Lerna)
5. package.json workspaces (npm/yarn)
6. Recursive package.json scan (fallback)

**Detected:** Recursive scan with depth limit (from `packages/analyzer/src/detectors/monorepo.ts`, lines 262-276):

```typescript
async function discoverPackages(
  rootPath: string,
  collector: DetectionCollector,
  depth: number = 0,
  maxDepth: number = 4,
  visited: Set<string> = new Set()
): Promise<string[]> {
  if (depth > maxDepth || visited.has(rootPath)) {
    return [];
  }
  // ... scan directories, recurse into subdirectories ...
}
```

**Diagnosis:**
1. Check snapshot.json monorepo field for detected tool
2. Verify config files exist and are valid (pnpm-workspace.yaml, turbo.json)
3. Run `yamllint` or `jsonlint` on config files
4. Check for permission errors preventing traversal
5. Verify maxDepth (4 levels) is sufficient

**Fix:**
- Fix syntax errors in monorepo config files
- Grant read permissions to all project directories
- Increase maxDepth if packages nested deeper than 4 levels

## Debugging Workflow

### Local Development

**Detected:** tsx for running TypeScript directly (from `packages/cli/package.json`)

```bash
# Watch mode development
cd packages/cli && pnpm dev  # tsup watch
cd packages/analyzer && pnpm dev  # tsc watch

# Link CLI for local testing
cd packages/cli && npm link

# Debug TypeScript directly
tsx packages/cli/src/index.ts init
tsx packages/cli/src/index.ts setup complete

# Run tests
pnpm test  # All packages
cd packages/analyzer && pnpm test:coverage  # With coverage
```

**Unexamined:** No .vscode/launch.json detected. Developers debug via console.log or tsx.

**Recommendation:** Add .vscode/launch.json.example for VSCode debugging.

### Test Debugging

**Detected:** Vitest with high coverage thresholds (CLI: 80%, Analyzer: 85%)

```bash
# Watch mode
cd packages/analyzer && pnpm test

# Specific file
pnpm test parsers/treeSitter.test.ts

# Verbose output
pnpm test --reporter=verbose

# Coverage report
pnpm test:coverage
# Open coverage/index.html
```

### End User Debugging

**Context:** CLI tool distributed via npm, runs on users' machines.

```bash
# Validate context files
ana setup check
ana setup check patterns.md

# Inspect analyzer output
cat .ana/.state/snapshot.json | jq .

# Fresh start
rm -rf .ana && ana init

# Common issues:
# - Missing package.json → cannot detect project type
# - File permissions → cannot read source files
# - WASM init failure → parsers unavailable
```

**Unexamined:** No error reporting mechanism. Users file GitHub issues manually.

**Recommendation:** Add `ana doctor` command to check Node version, WASM parsers, permissions, and output diagnostic report.

## Observability

**No APM detected** — No Sentry, Datadog, New Relic, Prometheus dependencies.

**Context:** Local CLI tool, traditional APM not applicable.

**Unexamined:** No telemetry. Maintainers have no visibility into command usage, failure rates, or performance across users.

**Recommendation:** Opt-in telemetry (anonymous usage, crash reports, feature metrics).

**Development observability:**

1. **Git history as audit log:**
   - Commit format: [TAG] Brief — Details
   - Branch structure: effort/STEP_*, SideSprint/*
   - GitHub Actions CI logs

2. **Test coverage as health metric:**
   - Codecov integration
   - 80-85% coverage thresholds

3. **Turborepo cache:**
   - .turbo/ caches build outputs
   - Cache hits = stable builds

**Detected:** GitHub Actions multi-platform CI (from exploration):
- 3 OS (Ubuntu, Windows, macOS)
- 2 Node versions (20, 22)
- Frozen lockfile enforced
- Coverage uploaded to Codecov

**Metrics available:**
- Test pass rate across matrix
- Coverage trends
- Build time trends
- Dependency update frequency

## Security Posture

**Note:** All findings tagged **Unexamined** unless user confirmed in Q&A.

### Input Validation

**Unexamined:** File paths use Node.js path utilities without additional sanitization. No path traversal protection.

**Risk:** Low — CLI runs with user's permissions, cannot escalate. Worst case is performance from analyzing huge directories.

### Secrets Detection

**Detected:** .gitignore includes `.env`, `*.pem`, `credentials.json`

**Unexamined:** No active scanning for committed secrets (API keys, tokens).

**Recommendation:** Add pre-commit hook with git-secrets or gitleaks.

### Dependency Security

**Unexamined:** No automated dependency vulnerability scanning in CI.

**Detected:** pnpm lockfile pins exact versions, prevents supply chain drift.

**Recommendation:** Add Dependabot and `pnpm audit` to CI.

### Error Information Leakage

**Detected:** Error messages include file paths and stack traces.

**Context:** Appropriate for CLI tool used by developers. Not a concern like it would be for web apps.

### WASM Security

**Unexamined:** Tree-sitter WASM parsers run in Node WASM runtime. No sandboxing beyond WASM memory isolation.

**Detected:** WASM files loaded from node_modules (from `packages/analyzer/src/parsers/treeSitter.ts`, lines 56-74):

```typescript
function resolveWasmPath(packageName: string, wasmFileName: string): string {
  const candidates = [
    join(__dirname, '..', '..', 'node_modules', packageName, wasmFileName),
    join(__dirname, '..', '..', '..', '..', 'node_modules', packageName, wasmFileName),
  ];
  // ... check candidates, throw if not found ...
}
```

**Unexamined:** No integrity checks (checksum verification) on WASM files. Relies on npm package integrity.

### File System Access

**Unexamined:** CLI has full read/write access to user's filesystem (inherits user permissions). No sandboxing.

**Context:** Appropriate for CLI tool. Users expect filesystem access. Sandboxing would break functionality.

**Unexamined:** No audit log of file operations.

**Recommendation:** Add `--dry-run` mode:
```bash
ana setup complete --dry-run  # Show what would be written
ana init --dry-run            # Show files to be created
```

### Summary

**Key insight:** Traditional web security concerns (rate limiting, CORS, SQL injection) don't apply. Security model:

1. **User is developer** — error details are helpful, not leakage
2. **Local execution** — no network attack surface
3. **User permissions** — runs with user's filesystem access
4. **Dependency trust** — relies on npm ecosystem (same as any Node project)

**Appropriate measures for this context:**
- Dependency vulnerability scanning
- Secrets scanning in commits
- Input validation for paths (future)
- Dry-run mode (future)

---

*Last updated: 2026-03-23*
