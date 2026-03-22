# Conventions — anatomia-workspace

This document describes code conventions, style rules, and naming patterns used in the anatomia-workspace monorepo. All conventions are derived from configuration files and codebase analysis.

## Naming Conventions

### Files

**Detected:** kebab-case.ts for all TypeScript files (from codebase file listing)

Examples from `packages/cli/src/utils/`:
- `file-writer.ts` — File operations utility class
- `scaffold-generators.ts` — Scaffold creation functions
- `format-analysis-brief.ts` — Analyzer output formatter
- `analysis-helpers.ts` — Analysis utility functions

Examples from `packages/analyzer/src/`:
- `projectType.ts` — Project type detector
- `importScanner.ts` — Import statement scanner
- `fileSampler.ts` — File sampling for performance

### Functions

**Detected:** camelCase for all functions (from codebase analysis)

Examples from `packages/cli/src/commands/init.ts` (lines 1-49):
- `generateProjectOverviewScaffold` — Creates project overview scaffold
- `generateArchitectureScaffold` — Creates architecture scaffold
- `generatePatternsScaffold` — Creates patterns scaffold
- `formatAnalysisBrief` — Formats analyzer output

Examples from `packages/cli/src/utils/validators.ts` (lines 1-49):
- `countDetectedPatterns` — Counts patterns in analysis result
- `getProjectName` — Extracts project name from config

Examples from `packages/analyzer/src/detectors/framework.ts` (lines 1-39):
- `detectFastAPI` — Detects FastAPI framework
- `detectDjango` — Detects Django framework
- `detectNextjs` — Detects Next.js framework
- `detectExpress` — Detects Express framework

### Classes

**Detected:** PascalCase for all classes (from codebase analysis)

Examples from `packages/cli/src/utils/file-writer.ts` (lines 1-60):
```typescript
export class FileWriter {
  async exists(filePath: string): Promise<boolean> { ... }
  async createDir(dirPath: string): Promise<void> { ... }
  async writeFile(filePath: string, content: string, options?: WriteFileOptions): Promise<void> { ... }
}
```

Examples from `packages/analyzer/src/errors/DetectionError.ts` (lines 45-101):
```typescript
export class DetectionEngineError extends Error {
  code: string;
  severity: 'error' | 'warning' | 'info';
  file?: string | undefined;
  line?: number | undefined;
  suggestion?: string | undefined;
  phase?: string | undefined;

  constructor(code: string, message: string, severity: 'error' | 'warning' | 'info' = 'error', options?: {...}) {
    super(message);
    this.name = 'DetectionEngineError';
    // ...
  }
}
```

Additional class examples from `packages/analyzer/src/`:
- `DetectionCollector` — Accumulates non-fatal errors during analysis
- `ParserManager` — Manages tree-sitter parsers with lazy loading
- `QueryCache` — Caches tree-sitter queries
- `ASTCache` — Caches parsed ASTs

### Interfaces

**Detected:** PascalCase for all interfaces (from codebase analysis)

Examples from `packages/cli/src/utils/file-writer.ts` (lines 15-18):
```typescript
export interface WriteFileOptions {
  encoding?: BufferEncoding;
  mode?: number;
}
```

Examples from `packages/cli/src/utils/validators.ts` (lines 22-27):
```typescript
export interface ValidationError {
  type: 'BLOCKING' | 'WARNING';
  rule: string;
  file: string;
  message: string;
}
```

Examples from `packages/analyzer/src/errors/DetectionError.ts` (lines 13-40):
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

Additional interface examples:
- `InitCommandOptions` — CLI command options
- `PreflightResult` — Pre-execution validation result
- `AnalysisResult` — Analyzer output structure
- `ProjectTypeResult` — Project type detection result
- `FrameworkResult` — Framework detection result
- `SamplingOptions` — File sampling configuration

### Constants

**Detected:** SCREAMING_SNAKE_CASE for all constants (from codebase analysis)

Examples from `packages/cli/src/constants.ts` (lines 1-91):
```typescript
export const SCAFFOLD_MARKER = '<!-- SCAFFOLD - Setup will fill this file -->';
export const MIN_FILE_SIZE_WARNING = 20; // Lines
export const MAX_FILE_SIZE_WARNING = 1500; // Lines
export const MIN_DEBUGGING_FILE_SIZE = 15; // Lines

export const PATTERN_CATEGORIES = [
  'errorHandling',
  'validation',
  'database',
  'auth',
  'testing',
] as const;

export const MODE_FILES = [
  'architect.md',
  'code.md',
  'debug.md',
  'docs.md',
  'test.md',
  'general.md',
  'setup.md',
  'setup-quick.md',
  'setup-guided.md',
  'setup-complete.md',
] as const;

export const META_VERSION = '1.0.0';
```

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

### Type Exports

**Detected:** Explicit `type` keyword for type-only exports (from codebase analysis)

Examples from `packages/analyzer/src/index.ts` (lines 14-22):
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
```

Additional examples:
```typescript
export type { ProjectTypeResult } from './detectors/projectType.js';
export type { FrameworkResult } from './detectors/framework.js';
export type { Language } from './parsers/treeSitter.js';
export type { SamplingOptions } from './sampling/fileSampler.js';
export type { QueryType } from './parsers/queries.js';
export type { ASTCacheEntry, CacheStats } from './cache/astCache.js';
```

### Directories

**Detected:** Mixed kebab-case and lowercase (from codebase directory listing)

Kebab-case examples:
- `context/setup/framework-snippets/` — Framework-specific code examples

Lowercase examples:
- `src/commands/` — CLI command implementations
- `src/utils/` — Utility functions
- `src/detectors/` — Detection logic
- `src/parsers/` — File parsers
- `src/analyzers/` — Analysis engines

## Import Organization

### Module System

**Detected:** ESM with .js extensions in internal imports (from `tsconfig.base.json` lines 19-24 and codebase analysis)

TypeScript configuration from `tsconfig.base.json`:
```json
{
  "module": "ESNext",
  "moduleResolution": "Bundler",
  "resolveJsonModule": true,
  "allowSyntheticDefaultImports": true,
  "esModuleInterop": true,
  "isolatedModules": true
}
```

All packages declare `"type": "module"` in package.json for native ESM support.

### Import Extensions

**Detected:** .js extensions on internal imports, even though source files are .ts (from codebase analysis)

Example from `packages/cli/src/commands/init.ts` (lines 30-48):
```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import type { AnalysisResult } from 'anatomia-analyzer';
import { formatAnalysisBrief } from '../utils/format-analysis-brief.js';
import {
  generateProjectOverviewScaffold,
  generateArchitectureScaffold,
  generatePatternsScaffold,
  generateConventionsScaffold,
  generateWorkflowScaffold,
  generateTestingScaffold,
  generateDebuggingScaffold,
} from '../utils/scaffold-generators.js';
```

**Pattern:** TypeScript compiles .ts to .js, so imports must reference .js for runtime compatibility.

### Node Built-ins

**Detected:** node: prefix for all Node.js built-in imports (from codebase analysis)

Examples from `packages/cli/src/commands/init.ts` (lines 33-37):
```typescript
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
```

Examples from `packages/cli/src/utils/file-writer.ts` (lines 12-13):
```typescript
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
```

Examples from `packages/cli/src/utils/validators.ts` (lines 10-11):
```typescript
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
```

**Pattern:** Modern Node.js best practice for explicit built-in module identification.

### Import Ordering

**Detected:** Three-tier ordering pattern (from codebase analysis)

Pattern observed in `packages/cli/src/commands/init.ts` (lines 30-48):
1. **External packages:** commander, chalk, ora (third-party dependencies)
2. **Node built-ins:** node:path, node:fs/promises, node:os, node:url, node:crypto
3. **Internal imports:** ../utils/\*.js, type imports from anatomia-analyzer

Pattern observed in `packages/analyzer/src/analyzers/patterns.ts` (lines 11-17):
1. **Internal parsers:** ../parsers/python.js, ../parsers/node.js, ../parsers/go.js
2. **Internal utilities:** ../utils/file.js
3. **Internal types:** ../types/index.js, ../types/patterns.js

**Inferred:** No strict enforcement, but general pattern is external → node: → internal.

### Type-Only Imports

**Detected:** Explicit `import type` for types (from codebase analysis)

Examples:
```typescript
import type { AnalysisResult } from 'anatomia-analyzer';
import type { ProjectType, ParsedFile } from '../types/index.js';
import type { PatternConfidence, MultiPattern } from '../types/patterns.js';
```

**Pattern:** Separates runtime imports from type-only imports for tree-shaking and clarity.

### Barrel Exports

**Detected:** index.ts files for public API re-exports (from `packages/analyzer/src/index.ts`)

Example from `packages/analyzer/src/index.ts` (lines 1-79) shows comprehensive barrel exports:
- Grouped by category (detectors, parsers, utilities, types)
- Comments marking sections
- Re-exports 100+ items from single entry point

**Pattern:** Packages expose public APIs through index.ts, private modules remain unexported.

## Code Style

### Formatting Configuration

**Detected:** Prettier with specific settings enforced project-wide (from `.prettierrc.json`)

Configuration from `.prettierrc.json`:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Rules enforced:**
- **Semicolons:** Required on all statements
- **Quotes:** Single quotes for strings
- **Trailing commas:** ES5 style (multiline arrays/objects only, no trailing comma on last function parameter)
- **Line width:** 100 characters maximum
- **Indentation:** 2 spaces (no tabs)

### Linting Configuration

**Detected:** ESLint 9 flat config with TypeScript (from `eslint.config.mjs`)

Configuration from `eslint.config.mjs`:
```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];
```

**Rules enforced:**
- **no-explicit-any:** Warning (discouraged but not blocked)
- **no-unused-vars:** Error, but allows unused parameters starting with underscore (`_param`)
- **TypeScript recommended rules:** All enabled from typescript-eslint

### TypeScript Configuration

**Detected:** Maximum strictness enabled (from `tsconfig.base.json`)

Configuration from `tsconfig.base.json` (lines 4-15):
```json
{
  "compilerOptions": {
    // Strict Mode - All strict checks enabled
    "strict": true,

    // Additional Strict Checks (2026 recommended, not included in strict flag)
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Strictness levels:**
1. **strict: true** — Enables all basic strict checks (noImplicitAny, strictNullChecks, etc.)
2. **6 additional strict checks** — Beyond the strict flag, enforcing best practices:
   - `noUncheckedIndexedAccess` — Array/object access might be undefined
   - `noImplicitOverride` — Require explicit override keyword
   - `noPropertyAccessFromIndexSignature` — Index signature properties must use bracket notation
   - `noImplicitReturns` — All code paths must return a value
   - `noFallthroughCasesInSwitch` — Switch cases must break/return
   - `exactOptionalPropertyTypes` — Optional properties cannot be set to undefined

Additional settings from `tsconfig.base.json` (lines 35-42):
```json
{
  "target": "ES2022",
  "lib": ["ES2022"],
  "composite": true,
  "incremental": true
}
```

**Target:** ES2022 (Node.js 20+ supports this natively)
**Monorepo optimization:** Composite + incremental compilation for Turborepo caching

### Code Patterns

**Detected:** async/await over promises (from codebase analysis)

Example from `packages/cli/src/utils/file-writer.ts` (lines 31-37):
```typescript
async exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
```

**Inferred:** No .then() chains found in sampled code; async/await used consistently throughout.

**Detected:** Early returns for validation (from codebase analysis)

Example from `packages/cli/src/utils/validators.ts` (lines 41-49):
```typescript
export function countDetectedPatterns(analysis: AnalysisResult): number {
  // Scenario B guard: analyzer may return null/undefined when tree-sitter fails
  if (!analysis || !analysis.patterns) {
    return 0;
  }

  let count = 0;
  if (analysis.patterns.errorHandling) count++;
  if (analysis.patterns.validation) count++;
  // ...
}
```

**Detected:** const over let (from codebase analysis)

Example from `packages/analyzer/src/analyzers/patterns.ts` (lines 36-40):
```typescript
const patterns: Partial<Record<string, PatternConfidence>> = {};

// Get dependencies using STEP_1.1 parsers
let deps: string[] = [];
let devDeps: string[] = [];
```

**Pattern:** Use `const` by default, `let` only when mutation needed. No `var` keyword (TypeScript strict mode prevents it).

**Detected:** Optional chaining and nullish coalescing (from codebase analysis)

Examples:
```typescript
options?.file
result.patterns?.validation
pkg.name || 'unknown'
framework ?? null
```

**Detected:** Type guards for runtime validation (from codebase analysis)

Example from `packages/cli/src/utils/scaffold-generators.ts` (lines 24-37):
```typescript
/**
 * Type guard to check if pattern is multi-pattern
 */
function isMultiPattern(
  pattern: PatternConfidence | MultiPattern | undefined
): pattern is MultiPattern {
  return pattern !== undefined && 'patterns' in pattern;
}
```

Additional examples:
```typescript
if (error instanceof Error) { ... }
if (typeof value === 'string') { ... }
```

### Documentation Style

**Detected:** JSDoc comments on all public functions (from codebase analysis)

Example from `packages/cli/src/utils/file-writer.ts` (lines 1-10):
```typescript
/**
 * FileWriter - Cross-platform file operations utility
 *
 * Uses Node.js fs/promises for async operations.
 * All paths are normalized using path.join() for Windows/Mac/Linux compatibility.
 *
 * @example
 * const writer = new FileWriter();
 * await writer.createDir('/path/to/.ana');
 * await writer.writeFile('/path/to/.ana/node.json', '{}');
 */
```

Example from `packages/cli/src/utils/validators.ts` (lines 29-40):
```typescript
/**
 * Count how many patterns analyzer detected
 *
 * Used for BF5 validation (patterns.md must document all detected patterns)
 *
 * @param analysis - AnalysisResult from snapshot.json
 * @returns Number of non-null pattern categories (0-5)
 *
 * @example
 * const snapshot = { patterns: { errorHandling: {...}, validation: {...} } };
 * countDetectedPatterns(snapshot); // Returns: 2
 */
```

**Tags used:**
- `@param` — Parameter descriptions
- `@returns` — Return value descriptions
- `@throws` — Exception documentation
- `@example` — Usage examples
- `@module` — Module-level documentation

**Detected:** File header comments (from codebase analysis)

Example from `packages/cli/src/commands/init.ts` (lines 0-28):
```typescript
/**
 * ana init - Initialize .ana/ context framework
 *
 * Complete rewrite for STEP 2.5 - integrates analyzer, no prompts.
 *
 * Creates:
 *   .ana/
 *   ├── modes/                    (7 mode files)
 *   ├── hooks/                    (CC hook scripts)
 *   │   ├── verify-context-file.sh
 *   │   └── quality-gate.sh
 *   ├── context/
 *   │   ├── analysis.md           (generated from analyzer)
 *   │   ...
 */
```

**Pattern:** File headers describe purpose, behavior, and created artifacts.

**Detected:** Inline comments for complex logic (from codebase analysis)

Example from `packages/cli/src/utils/validators.ts` (lines 42-44):
```typescript
// Scenario B guard: analyzer may return null/undefined when tree-sitter fails
if (!analysis || !analysis.patterns) {
  return 0;
}
```

Example from `packages/analyzer/src/analyzers/patterns.ts` (lines 8):
```typescript
// Based on: START_HERE_PART1.md sections 1-5, START_HERE_PART2.md lines 40-540
```

**Pattern:** Comments explain WHY (reasoning, edge cases, references), not WHAT (code is self-documenting).

## Additional Conventions

### Version Control

**Detected:** Git with branch naming conventions (from git status and exploration results)

Current branch: `SideSprint/setup-redesign`

Recent branch patterns from exploration results:
- `effort/STEP_2_5_CLI_CODE` — Work-in-progress branches prefixed with effort/
- `SideSprint/setup-redesign` — Sprint-based branches prefixed with SideSprint/

**Pattern:** Prefix-based branch naming (effort/, SideSprint/) with descriptive names.

### Commit Message Format

**Detected:** Ticket-prefix format with descriptive messages (from git log)

Recent commit examples:
```
[MI-3] Add tier files to MODE_FILES constant — setup-quick, setup-guided, setup-complete now copied by ana init
[SS-8] Scenario B validation — test cycle 3 baseline documented. 7/7 at 9/10, 4521 lines, zero fabrications.
[SS-7.3] Quality gates + init UX + determinism — Bash self-check, tier prompt, locked questions, SubagentStop verification
[SS-7.2] Widen line targets + fix path stripping in check.ts — based on test cycle observations
[SS-7.1] Hook fixes + writer improvements — quality gate phase check, PostToolUse confirmed for sub-agents
[SS-6] Content redesign — 7 step files restructured, rules.md compressed 771→195 lines, quality checklists
[STEP_2.5] Architecture fix: lazy-load analyzer to prevent startup crash
[STEP_2.5] Fix: replace 'as any' with type guard in setup.ts
```

**Format:** `[TICKET-ID] Description` with optional "—" separator for additional context

**Ticket prefixes observed:**
- `[MI-N]` — Main Issue tickets
- `[SS-N]` — Side Sprint tickets
- `[STEP_N]` — Step-based work items

**Pattern:** Descriptive first line, focuses on WHAT changed and WHY. Technical details included after "—" separator.

### .gitignore Patterns

**Detected:** Comprehensive ignore rules (from `.gitignore`)

Categories from `.gitignore`:
1. **Dependencies:** node_modules/, .pnpm-store/, .npm/
2. **Build outputs:** .next/, dist/, build/, .turbo/, \*.tsbuildinfo
3. **Environment & Secrets:** .env, .env\*.local, \*.pem, \*.key, credentials.json
4. **IDE & OS:** .DS_Store, .vscode/settings.json, .idea/, \*.swp, \*.swo
5. **Logs:** \*.log, npm-debug.log\*, pnpm-debug.log\*
6. **Testing:** coverage/, test-results/
7. **Temporary:** \*.tmp, .temp/, master_plan/

**Pattern:** Organized by category with comments, prevents accidental commits of secrets/build artifacts.

### Monorepo Conventions

**Detected:** Turborepo + pnpm workspaces (from package.json and turbo.json references in exploration results)

**Package manager:** pnpm 9.0.0 (enforced via packageManager field)

**Workspace structure:**
- `packages/cli/` — CLI tool (anatomia-cli)
- `packages/analyzer/` — Analysis engine (anatomia-analyzer)
- `packages/generator/` — Template generator (@anatomia/generator, alpha)
- `website/` — Next.js documentation site

**Build orchestration:** Turborepo manages task dependencies and caching

**Pattern:** Each package has independent package.json, shared base TypeScript config via tsconfig.base.json.

### File Organization

**Detected:** Feature-based organization within packages (from directory structure)

CLI structure:
- `src/commands/` — Command implementations (init.ts, setup.ts, mode.ts, analyze.ts, check.ts)
- `src/utils/` — Shared utilities (file-writer.ts, validators.ts, scaffold-generators.ts)
- `templates/` — Static templates copied during initialization
- `tests/` — Test suites (contract/, e2e/, scaffolds/, commands/, utils/, performance/)

Analyzer structure:
- `src/detectors/` — Framework and project type detection
- `src/parsers/` — Dependency file parsers (language-specific subdirectories)
- `src/analyzers/` — Code analysis engines (patterns, conventions, structure)
- `src/types/` — Zod schemas and TypeScript types
- `src/cache/` — Caching layer (AST, query)
- `src/utils/` — Shared utilities

**Pattern:** Clear separation of concerns, language-specific code in subdirectories, tests mirror source structure.

### Const Assertions

**Detected:** as const for literal type inference (from codebase analysis)

Example from `packages/cli/src/constants.ts` (lines 16-22):
```typescript
export const PATTERN_CATEGORIES = [
  'errorHandling',
  'validation',
  'database',
  'auth',
  'testing',
] as const;
```

Example from `packages/cli/src/constants.ts` (lines 36-47):
```typescript
export const MODE_FILES = [
  'architect.md',
  'code.md',
  'debug.md',
  'docs.md',
  'test.md',
  'general.md',
  'setup.md',
  'setup-quick.md',
  'setup-guided.md',
  'setup-complete.md',
] as const;
```

**Pattern:** Use `as const` on arrays/objects to get literal types instead of widened types (enables exhaustive switch checking, stricter validation).

### Factory Functions

**Detected:** createEmpty\* factory pattern for default states (from codebase analysis and exploration results)

Examples from exploration results:
- `createEmptyAnalysisResult()` — Empty analysis result for graceful degradation
- `createEmptyParsedAnalysis()` — Empty parsed analysis
- `createEmptyPatternAnalysis()` — Empty pattern analysis (from `packages/analyzer/src/types/patterns.ts`)
- `createEmptyConventionAnalysis()` — Empty convention analysis

**Pattern:** Used alongside Zod schemas for type-safe defaults and testing utilities.

### Singleton Exports

**Detected:** Class instances exported as singletons (from codebase analysis)

Example from exploration results:
```typescript
export const fileWriter = new FileWriter();
export const queryCache = new QueryCache();
export const parserManager = new ParserManager();
```

**Pattern:** Export both class (for testing with mocks) and singleton instance (for production use).

### Error Handling Convention

**Detected:** Graceful degradation with try/catch (from exploration results and patterns analysis)

Pattern from exploration:
- Analyzer failures don't crash CLI
- Try/catch with fallback to empty results
- Console warnings instead of hard failures

**Pattern:** Non-fatal errors are collected, fatal errors have structured error codes and suggestions.

---

*Last updated: 2026-03-22*
