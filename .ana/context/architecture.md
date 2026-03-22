# Architecture

This document explains WHY Anatomia is designed this way — the architectural decisions, system boundaries, and trade-offs that shape the codebase.

## Architecture Pattern

**Type:** Layered monorepo with package separation — confidence 0.95

**Detected:** Three-layer architecture with clear separation of concerns (from monorepo structure):

1. **CLI Layer** (`packages/cli/`) - User interface and orchestration
2. **Analyzer Layer** (`packages/analyzer/`) - Core analysis engine
3. **Website Layer** (`website/`) - Documentation and marketing

**Detected:** The analyzer is designed as a standalone library that the CLI consumes (from `packages/analyzer/package.json`):
```json
{
  "name": "anatomia-analyzer",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "sideEffects": false
}
```

**Detected:** CLI depends on analyzer as a published package (from `packages/cli/package.json`):
```json
{
  "dependencies": {
    "anatomia-analyzer": "^0.1.0"
  }
}
```

**Inferred:** This separation enables:
- Independent versioning and releases
- Analyzer reuse in other tools
- Clear responsibility boundaries
- Parallel development of CLI features and analyzer capabilities

**Detected:** Turborepo orchestrates build dependencies (from `turbo.json` lines 4-6):
```json
{
  "build": {
    "dependsOn": ["^build"],
    "outputs": ["dist/**", ".next/**"]
  }
}
```

The `^build` dependency ensures packages build in topological order — analyzer builds before CLI that depends on it.

### Monorepo Organization

**Detected:** pnpm workspace with 3 packages + website (from `pnpm-workspace.yaml` lines 1-3):
```yaml
packages:
  - 'packages/*'
  - 'website'
```

**Detected:** Shared TypeScript configuration via base config (from exploration, tsconfig.base.json reference):
- All packages extend `tsconfig.base.json`
- Consistent strictness across monorepo
- ES2022 target, ESM module system

**Detected:** Turborepo caching for build optimization (from `turbo.json` lines 31-37):
```json
{
  "globalDependencies": [
    "tsconfig.base.json",
    "pnpm-lock.yaml"
  ],
  "globalEnv": [
    "NODE_ENV"
  ]
}
```

**Inferred:** Global dependencies trigger cache invalidation when base config or lockfile changes, ensuring builds stay synchronized.

### Analyzer Pipeline Architecture

**Detected:** Seven-phase analysis pipeline with progressive enhancement (from `packages/analyzer/src/index.ts` lines 158-166):
```typescript
/**
 * Orchestrates all detection phases:
 * 1. Monorepo detection (STEP_1.1)
 * 2. Project type detection (STEP_1.1)
 * 3. Framework detection (STEP_1.1)
 * 4. Structure analysis (STEP_1.2)
 * 5. Tree-sitter parsing (STEP_1.3)
 * 6. Pattern inference (STEP_2.1)
 * 7. Convention detection (STEP_2.2 - NEW)
 */
```

**Detected:** Each phase is optional via skip flags (from `packages/analyzer/src/index.ts` lines 143-152):
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

**Inferred:** Progressive enhancement allows fast basic detection or deep analysis depending on needs. Each phase builds on previous results.

**Detected:** Graceful degradation on analyzer failure (from `packages/analyzer/src/index.ts` lines 269-275):
```typescript
} catch (error) {
  // Critical failure - return empty result
  if (options.strictMode) {
    throw error;
  }
  return createEmptyAnalysisResult();
}
```

**Detected:** CLI continues even if analyzer fails (from exploration results):
> "Graceful degradation" — Confidence: 0.9
> Evidence: packages/cli/src/commands/init.ts lines 330-339
> Pattern: Analyzer failures don't crash CLI, creates empty scaffolds instead

**Inferred:** This design prioritizes availability over completeness — better to generate minimal scaffolds than crash on analysis errors.

### CLI Command Architecture

**Detected:** Commander.js command pattern with separate command files (from `packages/cli/src/index.ts` lines 21-32):
```typescript
const program = new Command();

program
  .name('ana')
  .description('Auto-generated AI context for codebases')
  .version('0.1.0', '-v, --version', 'Display version number');

// Register commands
program.addCommand(initCommand);
program.addCommand(modeCommand);
program.addCommand(analyzeCommand);
program.addCommand(setupCommand);
```

**Detected:** Each command in separate file with exported Command instance (from `packages/cli/src/index.ts` line 16):
```typescript
import { initCommand } from './commands/init.js';
```

**Inferred:** Modular command structure allows independent command development without bloating main entry point.

**Detected:** Async command handler support (from `packages/cli/src/index.ts` lines 35-40):
```typescript
// CRITICAL: Use parseAsync() not parse() for async action handlers
// See: https://github.com/tj/commander.js#async-action-handlers
async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
```

**Detected:** Global error handling at program level (from `packages/cli/src/index.ts` lines 40-45):
```typescript
} catch (error) {
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  }
  process.exit(1);
}
```

### Tree-sitter Parser Architecture

**Detected:** Singleton parser manager for parser reuse (from `packages/analyzer/src/parsers/treeSitter.ts` lines 43-61):
```typescript
/**
 * Parser manager singleton
 *
 * Creates tree-sitter parsers once per language, reuses for all files.
 * Prevents expensive parser initialization (5-10ms) on every file.
 *
 * Pattern: Singleton with getInstance() - ensures one global instance
 *
 * Performance: Saves 100-200ms over 20 files (5-10ms × 20 files avoided)
 */
export class ParserManager {
  private static instance: ParserManager;
  private parsers = new Map<Language, Parser>();

  /**
   * Private constructor - prevents direct instantiation
   * Forces use of getInstance() for singleton pattern
   */
  private constructor() {}
```

**Detected:** Five languages supported (from `packages/analyzer/src/parsers/treeSitter.ts` line 40):
```typescript
export type Language = 'python' | 'typescript' | 'tsx' | 'javascript' | 'go';
```

**Detected:** Native module loading via CommonJS require (from `packages/analyzer/src/parsers/treeSitter.ts` lines 18-26):
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

**Inferred:** Mixed ESM/CommonJS approach handles tree-sitter's native modules while maintaining ESM in rest of codebase.

## System Boundaries

### Internal Components

**CLI Package** (`packages/cli/`)
- **Purpose:** User-facing tool for initializing and managing .ana/ context
- **Entry point:** `dist/index.js` (from package.json bin field)
- **Key responsibilities:**
  - Command orchestration via Commander.js
  - Analyzer integration and result formatting
  - File generation (scaffolds, modes, hooks)
  - User interaction (spinners, colored output)
  - Validation and verification

**Detected:** CLI exports binary command (from `packages/cli/package.json` lines 5-7):
```json
{
  "bin": {
    "ana": "./dist/index.js"
  }
}
```

**Analyzer Package** (`packages/analyzer/`)
- **Purpose:** Code analysis engine for project detection
- **Entry point:** `dist/index.js` (library export)
- **Key responsibilities:**
  - Project type detection (Python, Node, Go, Rust, Ruby, PHP)
  - Framework detection (FastAPI, Next.js, Django, etc.)
  - Structure analysis (entry points, architecture patterns, test locations)
  - Tree-sitter AST parsing
  - Pattern inference (error handling, validation, database, auth, testing)
  - Convention detection (naming, imports, formatting)

**Detected:** Analyzer exports comprehensive API (from `packages/analyzer/src/index.ts` lines 15-130, barrel export pattern):
```typescript
// Export types
export type { AnalysisResult, ProjectType } from './types/index.js';
export {
  AnalysisResultSchema,
  ProjectTypeSchema,
  ConfidenceScoreSchema,
  createEmptyAnalysisResult,
  validateAnalysisResult,
} from './types/index.js';

// Export detectors
export { detectProjectType } from './detectors/projectType.js';
export type { ProjectTypeResult } from './detectors/projectType.js';
export { detectFramework } from './detectors/framework.js';
export type { FrameworkResult } from './detectors/framework.js';
```

**Website Package** (`website/`)
- **Purpose:** Documentation and marketing site
- **Framework:** Next.js 16 App Router
- **Key responsibilities:**
  - Product documentation
  - Installation guides
  - API reference
  - Example projects

**Generator Package** (`packages/generator/`)
- **Purpose:** Template generation engine (alpha, internal use)
- **Status:** Not yet published to npm (version 0.1.0-alpha)
- **Inferred:** Likely handles dynamic scaffold generation logic

### External Services

**Detected:** No external service dependencies found in package.json files.

**Detected:** Tool operates entirely on local filesystem — no API calls, databases, or third-party services.

### Data Stores

**Detected:** Filesystem-based persistence only.

**Key data locations:**
- `.ana/` - Generated context framework
  - `modes/` - 7 mode files (architect, code, debug, docs, review, onboard, test)
  - `context/` - 7 context files (project-overview, architecture, patterns, conventions, workflow, testing, debugging)
  - `hooks/` - Claude Code verification hooks
  - `.meta.json` - Framework metadata
  - `.state/snapshot.json` - Analyzer baseline results

**Detected:** Metadata structure (from `packages/cli/src/commands/init.ts` line 57):
```typescript
META_VERSION,
```

**Detected:** Snapshot persists analyzer results (from `packages/cli/src/commands/init.ts` line 24):
```typescript
*   └── .state/
*       └── snapshot.json         (analyzer baseline)
```

**Inferred:** Snapshot enables:
- Detection drift tracking
- Baseline comparison for quality checks
- Reproducible analysis results

### Dependencies

**CLI Runtime Dependencies** (5 total):
- `anatomia-analyzer` ^0.1.0 - Analysis engine
- `chalk` ^5.3.0 - Terminal colors
- `commander` ^12.0.0 - CLI framework
- `glob` ^10.3.0 - File pattern matching
- `ora` ^8.0.0 - Terminal spinners

**Analyzer Runtime Dependencies** (8 total):
- `chalk` ^5.3.0 - Colored output
- `glob` ^10.3.0 - File globbing
- `js-yaml` ^4.1.1 - YAML parsing
- `tree-sitter` 0.25.0 - AST parsing core
- `tree-sitter-go` 0.25.0 - Go grammar
- `tree-sitter-javascript` 0.25.0 - JavaScript grammar
- `tree-sitter-python` 0.25.0 - Python grammar
- `tree-sitter-typescript` 0.23.2 - TypeScript/TSX grammar
- `zod` ^4.3.6 - Schema validation

**Inferred:** Minimal dependency footprint reduces:
- Installation time
- Security surface area
- Version conflict risk
- Bundle size

**Detected:** No framework dependencies (Express, FastAPI, React in analyzer/CLI) — these are detection targets, not runtime dependencies.

### Build Dependencies

**Detected:** Shared build tooling across packages (from root `package.json`):
```json
{
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.0",
    "prettier": "^3.4.0",
    "eslint": "^9.0.0"
  }
}
```

**Detected:** Package-specific build tools (from exploration):
- CLI: tsup (fast TypeScript bundler)
- Analyzer: tsc (TypeScript compiler only)
- Generator: tsc
- Website: next build

**Inferred:** CLI uses tsup for optimized bundling while analyzer uses plain tsc for library compilation with type definitions.

## Design Decisions

### Decision: Separate analyzer as independent package

**Context:** Analyzer could have been internal to CLI package.

**Rationale:**
- **Detected:** Analyzer published separately to npm as `anatomia-analyzer` (from package.json files)
- **Inferred:** Enables third-party tools to use analysis engine without CLI overhead
- **Inferred:** Allows independent versioning — analyzer updates don't require CLI updates
- **Inferred:** Clearer testing boundaries — analyzer tests run in isolation

**Trade-offs:**
- **Gain:** Reusability, modularity, independent releases
- **Cost:** Monorepo coordination overhead, two packages to maintain
- **Unexamined:** Is the analyzer currently used by any external tools? If not, was separate package premature?

### Decision: Tree-sitter for AST parsing instead of language-specific parsers

**Context:** Could use Python's `ast` module, TypeScript's compiler API, etc.

**Rationale:**
- **Detected:** Single unified API for 5 languages (from `packages/analyzer/src/parsers/treeSitter.ts`)
- **Detected:** Query-based extraction pattern consistent across languages
- **Inferred:** Adding new languages requires only grammar package, not new parser integration
- **Inferred:** Native performance via tree-sitter's C implementation

**Trade-offs:**
- **Gain:** Unified API, multi-language support, performance
- **Cost:** Native module complexity (CommonJS require in ESM codebase), less mature than language-native parsers
- **Unexamined:** Do query results match quality of language-specific parsers for edge cases?

**Detected:** Performance optimization via singleton pattern (from `packages/analyzer/src/parsers/treeSitter.ts` lines 48-50):
```typescript
/**
 * Pattern: Singleton with getInstance() - ensures one global instance
 *
 * Performance: Saves 100-200ms over 20 files (5-10ms × 20 files avoided)
 */
```

### Decision: Graceful degradation instead of strict failure

**Context:** Analyzer errors could crash the CLI.

**Rationale:**
- **Detected:** Empty scaffolds generated if analyzer fails (from exploration)
- **Detected:** Optional strictMode throws errors instead (from `packages/analyzer/src/index.ts` line 271)
- **Inferred:** User gets usable .ana/ structure even on analysis failure
- **Inferred:** Better to have empty scaffolds users can fill than block initialization

**Trade-offs:**
- **Gain:** Availability, user experience, works in edge cases
- **Cost:** Silent failures may confuse users, harder to debug analyzer issues
- **Mitigation:** Verbose mode and strict mode available for debugging

### Decision: Turborepo for monorepo orchestration

**Context:** Could use Nx, Lerna, or manual scripts.

**Rationale:**
- **Detected:** Turborepo configured with task pipelines (from `turbo.json`)
- **Detected:** Dependency-aware builds via `^build` notation
- **Detected:** Aggressive caching for build/test/lint tasks
- **Inferred:** Minimal configuration compared to Nx
- **Inferred:** Fast incremental builds for local development

**Trade-offs:**
- **Gain:** Fast builds, simple config, good DX
- **Cost:** Less flexible than Nx, fewer features (no affected commands visible in config)
- **Unexamined:** Does caching work reliably across CI and local? Any cache invalidation issues observed?

### Decision: pnpm over npm/yarn

**Context:** Three major package managers available.

**Rationale:**
- **Detected:** Strict pnpm requirement (from `package.json` line 23):
```json
{
  "packageManager": "pnpm@9.0.0"
}
```
- **Detected:** pnpm-workspace.yaml defines workspace structure
- **Inferred:** pnpm's hard linking saves disk space in monorepo
- **Inferred:** Stricter dependency resolution prevents phantom dependencies

**Trade-offs:**
- **Gain:** Faster installs, less disk usage, stricter correctness
- **Cost:** Contributors must install pnpm, less familiar than npm
- **Unexamined:** Has strict resolution caused any compatibility issues with dependencies?

### Decision: ESM-only module system

**Context:** Could support CommonJS or dual exports.

**Rationale:**
- **Detected:** All packages declare `"type": "module"` (from package.json files)
- **Detected:** Imports use .js extensions (from exploration)
- **Detected:** Node built-ins use node: prefix (from exploration)
- **Inferred:** Modern Node.js best practices
- **Inferred:** Aligns with TypeScript 5.x ESM improvements

**Trade-offs:**
- **Gain:** Cleaner imports, future-proof, standard alignment
- **Cost:** Node.js 20+ required, no CommonJS fallback for older tools
- **Mitigation:** Engines field enforces `node >= 20.0.0`

**Detected:** Mixed ESM/CommonJS for tree-sitter native modules (from `packages/analyzer/src/parsers/treeSitter.ts`):
```typescript
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
```

**Inferred:** Pragmatic exception for native modules that only export CommonJS.

### Decision: Zod for runtime validation

**Context:** Could use TypeScript types only, or alternatives like Yup, io-ts.

**Rationale:**
- **Detected:** All analyzer types have Zod schemas (from `packages/analyzer/src/types/index.ts`)
- **Detected:** Runtime validation via `.parse()` throws ZodError
- **Inferred:** Validates analyzer output against expected structure
- **Inferred:** TypeScript types derived from Zod schemas (single source of truth)

**Trade-offs:**
- **Gain:** Runtime safety, schema as documentation, type derivation
- **Cost:** Bundle size increase, runtime validation overhead
- **Unexamined:** Is validation overhead measurable in analyzer performance? Are errors surfaced clearly to users?

### Decision: Maximum TypeScript strictness

**Context:** Could use default strict mode or looser settings.

**Rationale:**
- **Detected:** Strict mode plus 6 additional checks (from exploration):
  - `noUncheckedIndexedAccess`
  - `noImplicitOverride`
  - `noPropertyAccessFromIndexSignature`
  - `noImplicitReturns`
  - `noFallthroughCasesInSwitch`
  - `exactOptionalPropertyTypes`
- **Inferred:** Catches more bugs at compile time
- **Inferred:** Forces explicit handling of undefined/null cases

**Trade-offs:**
- **Gain:** Fewer runtime errors, safer refactoring
- **Cost:** More verbose code (type guards, assertions), slower development
- **Unexamined:** Has strictness caught significant bugs, or just added ceremony?

### Decision: Console-based logging over structured logging

**Context:** Could use Winston, Pino, or other structured loggers.

**Rationale:**
- **Detected:** 137 console.log/error/warn calls across CLI (from exploration)
- **Detected:** Chalk for colors, Ora for spinners
- **Inferred:** CLI is interactive tool, not long-running service
- **Inferred:** Human-readable output more valuable than machine-parseable logs

**Trade-offs:**
- **Gain:** Simple implementation, great UX with colors/spinners, no dependencies
- **Cost:** No log levels, no structured data, harder to debug in CI
- **Unexamined:** Would structured logs help debug CI failures?

### Decision: File sampling with 20-file default limit

**Context:** Could parse all files or use different sampling strategy.

**Rationale:**
- **Detected:** maxFiles option with default 20 (from `packages/analyzer/src/index.ts` line 150)
- **Detected:** File sampling implementation (from exploration)
- **Inferred:** Balances accuracy vs speed for large codebases
- **Inferred:** 20 files sufficient to detect patterns in most projects

**Trade-offs:**
- **Gain:** Fast analysis on large projects, predictable performance
- **Cost:** May miss patterns in unsampled files
- **Unexamined:** Is 20 the right default? Should sampling be stratified (e.g., ensure test files included)?

## Trade-Offs

### Optimized for: Development speed and user experience

**Evidence:**
- Graceful degradation prioritizes availability over correctness
- Console-based logging optimizes for human readability
- Minimal dependencies reduce installation friction
- Empty scaffolds let users start immediately

**Sacrificed:**
- Complete analysis coverage (file sampling limit)
- Structured observability (no logging library)
- Backward compatibility (Node 20+ only, ESM only)

**Why acceptable:**
- Target users are developers with modern tooling
- CLI use case is interactive, not production service
- Fast iteration more valuable than comprehensive detection

### Optimized for: Modularity and reusability

**Evidence:**
- Analyzer as separate package enables third-party use
- Monorepo structure allows independent versioning
- Barrel exports provide clean public APIs
- Tree-sitter abstraction supports multi-language

**Sacrificed:**
- Simpler single-package architecture
- Faster initial development (monorepo coordination)
- Some duplicate dependencies (chalk in both packages)

**Why acceptable:**
- Enables future ecosystem growth around analyzer
- Clearer boundaries improve testability
- Independent releases allow patch updates without full rebuild

### Optimized for: Type safety and correctness

**Evidence:**
- Maximum TypeScript strictness catches more bugs
- Zod schemas validate runtime data
- ESM-only reduces module system complexity
- Parser singleton prevents initialization bugs

**Sacrificed:**
- Development velocity (more type annotations needed)
- Bundle size (Zod validation runtime)
- Backward compatibility (older Node.js versions)

**Why acceptable:**
- Tool generates code context — errors would mislead AI
- Better to fail early than generate incorrect scaffolds
- Target users have modern Node.js

### Unexamined: Performance vs accuracy

**Question:** Is 20-file sampling sufficient for pattern detection?

**Evidence:**
- Default maxFiles: 20
- ParserManager saves ~100-200ms
- No benchmarks visible for detection accuracy vs sample size

**Why matters:** Undersampling could miss critical patterns, but oversampling degrades UX.

**Next steps:** Add telemetry to track detection confidence vs sample size in real projects.

### Unexamined: Monorepo coordination overhead

**Question:** Do separate packages provide enough value vs coordination cost?

**Evidence:**
- Analyzer published separately to npm
- No visible external consumers yet
- CLI always depends on latest analyzer version

**Why matters:** If analyzer not reused externally, separate package adds complexity without benefit.

**Next steps:** Track external analyzer usage, consider merging packages if unused after 6 months.

### Unexamined: Cache invalidation reliability

**Question:** Does Turborepo caching work correctly across environments?

**Evidence:**
- Global dependencies tracked (tsconfig, lockfile)
- Output caching enabled for build/test/lint tasks
- No documented cache issues

**Why matters:** Bad caching breaks CI or causes stale local builds.

**Next steps:** Add cache debugging to CI, monitor for "clean fixes it" bug reports.

---

*Last updated: 2026-03-22*
