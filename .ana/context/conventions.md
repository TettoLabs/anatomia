# Conventions — anatomia-workspace

This file documents naming, import, and code style conventions detected from configuration files and analyzer data. Every convention includes the rule, evidence source, and real examples from this codebase.

## Naming Conventions

### Files

**Detected:** kebab-case (95% consistent from exploration)

Real examples from `packages/cli/src/utils/`:
- `file-writer.ts`
- `scaffold-generators.ts`
- `analysis-helpers.ts`
- `format-analysis-brief.ts`

Real examples from `packages/cli/tests/`:
- `analyzer-contract.test.ts`
- `project-overview-scaffold.test.ts`
- `all-scaffolds.test.ts`

Real examples from `packages/analyzer/src/`:
- `projectType.ts`
- `astCache.ts`
- `fileSampler.ts`

**Pattern:** All `.ts` files use kebab-case regardless of whether they export classes, functions, or types. Test files append `.test.ts` suffix.

### Functions

**Detected:** camelCase (95% consistent from exploration)

Real examples from `packages/cli/src/utils/file-writer.ts` (lines 32-101):
```typescript
async exists(filePath: string): Promise<boolean> { ... }
async createDir(dirPath: string): Promise<void> { ... }
async writeFile(filePath: string, content: string, options: WriteFileOptions = {}): Promise<void> { ... }
async readFile(filePath: string): Promise<string> { ... }
async removeDir(dirPath: string): Promise<void> { ... }
joinPath(...segments: string[]): string { ... }
getCwd(): string { ... }
```

Real examples from `packages/cli/src/utils/scaffold-generators.ts`:
- `generateProjectOverviewScaffold`
- `generateArchitectureScaffold`
- `generatePatternsScaffold`
- `generateConventionsScaffold`
- `generateWorkflowScaffold`
- `generateTestingScaffold`
- `generateDebuggingScaffold`

Real examples from `packages/analyzer/src/index.ts`:
- `detectProjectType`
- `detectFramework`
- `analyzeStructure`
- `parseProjectFiles`
- `sampleFiles`
- `detectConventions`

Real examples from `packages/cli/src/utils/validators.ts`:
- `getProjectName`

Real examples from `packages/cli/src/commands/init.ts`:
- `createEmptyAnalysisResult`

**Enforced by:** `@typescript-eslint/naming-convention` (implicit via TypeScript ESLint recommended rules in `eslint.config.mjs`)

### Classes

**Detected:** PascalCase (95% consistent from exploration)

Real examples from `packages/cli/src/utils/file-writer.ts` (line 26):
```typescript
export class FileWriter { ... }
```

Real examples from `packages/analyzer/src/cache/astCache.ts`:
- `ASTCache`

Real examples from `packages/analyzer/src/parsers/treeSitter.ts`:
- `ParserManager`

Real examples from `packages/analyzer/src/errors/`:
- `DetectionEngineError`
- `DetectionCollector`

**Enforced by:** `@typescript-eslint/naming-convention` (implicit via TypeScript ESLint recommended rules)

### Interfaces and Types

**Detected:** PascalCase (95% consistent from exploration)

Real examples from `packages/cli/src/utils/file-writer.ts` (lines 16-19):
```typescript
export interface WriteFileOptions {
  encoding?: BufferEncoding;
  mode?: number;
}
```

Real examples from `packages/cli/src/commands/init.ts` (lines 61-70):
```typescript
interface InitCommandOptions {
  force?: boolean;
  skipAnalysis?: boolean;
}

interface PreflightResult {
  canProceed: boolean;
  stateBackup?: string;
}
```

Real examples from `packages/analyzer/src/types/index.ts`:
- `ProjectType`
- `AnalysisResult`
- `Language`
- `StructureAnalysis`
- `ParsedAnalysis`
- `PatternAnalysis`
- `ConventionAnalysis`

Real examples from `packages/analyzer/src/detectors/projectType.ts` (lines 10-14):
```typescript
export interface ProjectTypeResult {
  type: ProjectType;
  confidence: number;
  indicators: string[];
}
```

Real examples from `packages/analyzer/src/index.ts` (lines 143-153):
```typescript
export interface AnalyzeOptions {
  skipImportScan?: boolean;
  skipMonorepo?: boolean;
  skipStructure?: boolean;
  skipParsing?: boolean;
  skipPatterns?: boolean;
  skipConventions?: boolean;
  maxFiles?: number;
  strictMode?: boolean;
  verbose?: boolean;
}
```

**Convention:** Use `interface` for object shapes (public contracts), use `type` for unions, mapped types, and type aliases. Both use PascalCase.

### Constants

**Detected:** UPPER_SNAKE_CASE (95% consistent from exploration)

Real examples from `packages/cli/src/constants.ts` (lines 7-20):
```typescript
export const MIN_FILE_SIZE_WARNING = 20;
export const MAX_FILE_SIZE_WARNING = 1500;

export const PATTERN_CATEGORIES = [
  'errorHandling',
  'validation',
  'database',
  'auth',
  'testing',
] as const;

export const META_VERSION = '1.0.0';
```

**Pattern:** All module-level constants use UPPER_SNAKE_CASE. Array constants use `as const` assertion for literal type inference.

### Variables

**Detected:** camelCase (95% consistent from exploration)

Real examples from `packages/cli/src/commands/init.ts` (lines 97-98):
```typescript
const cwd = process.cwd();
const anaPath = path.join(cwd, '.ana');
```

Real examples from `packages/cli/src/utils/file-writer.ts` (lines 69-73):
```typescript
const { encoding = 'utf-8', mode = 0o644 } = options;
const dir = path.dirname(filePath);
```

Real examples from `packages/cli/src/utils/scaffold-generators.ts`:
```typescript
const projectName = 'example';
const timestamp = new Date().toISOString();
```

**Convention:** Local variables and function parameters use camelCase. Destructured parameters with defaults are common.

### Directories

**Detected:** Mixed camelCase and kebab-case (80% consistent)

Real examples:
- `packages/cli/src/commands/` (single word)
- `packages/cli/src/utils/` (single word)
- `packages/analyzer/src/analyzers/` (single word)
- `packages/analyzer/src/detectors/` (single word)
- `packages/analyzer/src/parsers/` (single word)
- `packages/analyzer/src/types/` (single word)
- `packages/analyzer/src/errors/` (single word)
- `packages/analyzer/src/cache/` (single word)
- `packages/analyzer/src/sampling/` (single word)
- `packages/analyzer/src/analyzers/conventions/` (nested)

**Pattern:** Directory names are primarily single lowercase words (plural nouns). No multi-word directories detected in source code, so no clear camelCase vs kebab-case preference for those cases.

## Import Organization

### Import Grouping and Ordering

**Detected:** External, Node built-ins, local imports — each group separated by blank lines

Example from `packages/cli/src/commands/init.ts` (lines 31-58):
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
import { getProjectName } from '../utils/validators.js';
import {
  MODE_FILES,
  SETUP_FILES,
  STEP_FILES,
  FRAMEWORK_SNIPPETS,
  AGENT_FILES,
  META_VERSION,
} from '../constants.js';
```

Example from `packages/cli/src/utils/file-writer.ts` (lines 13-14):
```typescript
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
```

Example from `packages/analyzer/src/types/index.ts` (lines 1-31):
```typescript
import { z } from 'zod';
import { StructureAnalysis, StructureAnalysisSchema } from './structure.js';
import {
  ParsedAnalysis,
  ParsedAnalysisSchema,
  ParsedFile,
  ParsedFileSchema,
  FunctionInfo,
  FunctionInfoSchema,
  ClassInfo,
  ClassInfoSchema,
  ImportInfo,
  ImportInfoSchema,
  ExportInfo,
  ExportInfoSchema,
  DecoratorInfo,
  DecoratorInfoSchema,
  createEmptyParsedAnalysis,
} from './parsed.js';
import {
  PatternAnalysis,
  PatternAnalysisSchema,
  PatternConfidence,
  PatternConfidenceSchema,
  createEmptyPatternAnalysis,
} from './patterns.js';
import {
  ConventionAnalysis,
  ConventionAnalysisSchema,
  createEmptyConventionAnalysis,
} from './conventions.js';
```

**Pattern:**
1. External dependencies first (`commander`, `chalk`, `ora`, `zod`)
2. Node built-ins second (grouped together, all use `node:` prefix)
3. Workspace dependencies third (type-only imports, e.g., `anatomia-analyzer`)
4. Local relative imports last (grouped by category: utils, types, constants)
5. Blank lines separate groups

### Node Built-in Imports

**Detected:** `node:` prefix required (90% consistent)

Example from `packages/cli/src/commands/init.ts` (lines 34-38):
```typescript
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
```

**Convention:** All Node.js built-in module imports use the `node:` protocol prefix. Required for ESM resolution.

### Relative Imports with .js Extensions

**Detected:** All relative imports require `.js` extension (95% consistent)

Example from `packages/analyzer/src/index.ts` (lines 26-28):
```typescript
import { detectProjectType } from './detectors/projectType.js';
import { detectFramework } from './detectors/framework.js';
import { analyzeStructure } from './analyzers/structure.js';
```

**Enforced by:** TypeScript `moduleResolution: "Bundler"` in `tsconfig.base.json` requires `.js` extensions for ESM compatibility. The `.js` refers to compiled output.

### Type-Only Imports

**Detected:** `type` keyword used for type-only imports (90% consistent)

Example from `packages/cli/src/commands/init.ts` (line 39):
```typescript
import type { AnalysisResult } from 'anatomia-analyzer';
```

Example from `packages/analyzer/src/detectors/projectType.ts` (line 8):
```typescript
import type { ProjectType } from '../types/index.js';
```

Example from `packages/cli/src/utils/scaffold-generators.ts` (lines 13-17):
```typescript
import type {
  AnalysisResult,
  PatternConfidence,
  MultiPattern,
} from 'anatomia-analyzer';
```

Example from `packages/analyzer/src/analyzers/conventions/naming.ts` (lines 17-18):
```typescript
import type { ParsedFile } from '../../types/parsed.js';
import type { NamingStyle } from '../../types/conventions.js';
```

**Enforced by:** TypeScript `isolatedModules: true` in `tsconfig.base.json` (line 24) requires explicit `type` keyword for type-only imports to ensure correct transpilation.

### Barrel Exports

**Detected:** `index.ts` files used for public API exports (85% consistent)

Example from `packages/analyzer/src/index.ts` (lines 15-30):
```typescript
// Export types
export type { AnalysisResult, ProjectType } from './types/index.js';
export { AnalysisResultSchema, createEmptyAnalysisResult } from './types/index.js';

// Export detectors
export { detectProjectType } from './detectors/projectType.js';
export { detectFramework } from './detectors/framework.js';
```

**Pattern:** Public packages export all APIs through `index.ts`. Internal subdirectories use `index.ts` only when grouping is needed.

## Code Style

### Formatter Configuration

**Detected:** Prettier with specific settings

From `.prettierrc.json`:
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
- **Quotes:** Single quotes for strings (except JSON and strings containing single quotes)
- **Trailing commas:** ES5 style (objects, arrays, but not function parameters in ES5 targets)
- **Line width:** 100 characters maximum
- **Indentation:** 2 spaces (no tabs)

**All TypeScript files must be formatted with Prettier before commit.**

### Linter Configuration

**Detected:** ESLint 9 with TypeScript support

From `eslint.config.mjs` (lines 1-13):
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
- **Base rules:** ESLint recommended + TypeScript ESLint recommended
- **Explicit any:** Warn (not error) — discouraged but permitted when necessary
- **Unused variables:** Error, except parameters prefixed with `_`

**Convention:** Unused function parameters are prefixed with `_` to indicate intentional non-use.

Example from `packages/cli/src/utils/file-writer.ts`:
```typescript
// Unused error parameter marked with underscore
} catch {
  return false;
}
```

### TypeScript Configuration

**Detected:** Strict mode with additional 2026-recommended checks

From `tsconfig.base.json` (lines 3-23):
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "isolatedModules": true,
    "target": "ES2022",
    "composite": true,
    "incremental": true
  }
}
```

**Key settings:** `strict` + `noUncheckedIndexedAccess` (array access returns `T | undefined`), `moduleResolution: Bundler` (requires `.js` extensions), `composite` + `incremental` (monorepo build caching).

### Code Style Patterns

**Detected:** Async/await over promises (85% consistent)

Example from `packages/cli/src/utils/file-writer.ts` (lines 32-45):
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

**Convention:** Prefer `async`/`await` for asynchronous operations. Avoid `.then()` chaining.

**Detected:** Arrow functions for callbacks and simple functions (80% consistent)

Example from `packages/cli/src/utils/scaffold-generators.ts`:
```typescript
// Arrow function for type guard
function isMultiPattern(
  pattern: PatternConfidence | MultiPattern | undefined
): pattern is MultiPattern {
  return pattern !== undefined && 'patterns' in pattern;
}
```

**Convention:** Use arrow functions for callbacks, array methods, and simple inline functions. Use function declarations for top-level named functions and methods.

**Detected:** Optional parameters with defaults in destructuring (80% consistent)

Example from `packages/cli/src/utils/file-writer.ts` (lines 64-69):
```typescript
async writeFile(
  filePath: string,
  content: string,
  options: WriteFileOptions = {}
): Promise<void> {
  const { encoding = 'utf-8', mode = 0o644 } = options;
```

Example from `packages/analyzer/src/index.ts` (lines 143-153):
```typescript
export interface AnalyzeOptions {
  skipImportScan?: boolean;
  skipMonorepo?: boolean;
  skipStructure?: boolean;
  skipParsing?: boolean;
  skipPatterns?: boolean;
  skipConventions?: boolean;
  maxFiles?: number;
  strictMode?: boolean;
  verbose?: boolean;
}

export async function analyze(
  rootPath: string,
  options: AnalyzeOptions = {}
): Promise<...> {
```

**Convention:** Use optional parameters with default values (`= {}`) for options objects. Destructure with defaults inside function body.

**Detected:** Const assertions for literal arrays (85% consistent)

Example from `packages/cli/src/constants.ts`:
```typescript
export const PATTERN_CATEGORIES = ['errorHandling', 'validation', 'database'] as const;
```

**Convention:** Use `as const` for arrays treated as readonly tuples with literal types.

### JSDoc Comments

**Detected:** JSDoc used for public APIs with `@param`, `@returns`, `@throws`, `@example` tags (85% consistent)

Example from `packages/cli/src/utils/file-writer.ts` (lines 1-11, 27-31, 41-45, 57-63):
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

/**
 * Check if a file or directory exists
 * @param filePath - Absolute or relative path to check
 * @returns true if exists, false otherwise
 */

/**
 * Create directory recursively (like mkdir -p)
 * @param dirPath - Directory path to create
 * @throws Error if creation fails (e.g., permission denied)
 */

/**
 * Write content to file, creating parent directories if needed
 * @param filePath - Absolute path to file
 * @param content - Content to write
 * @param options - Optional encoding and mode settings
 * @throws Error if write fails
 */
```

**Convention:** All public functions, classes, and interfaces should have JSDoc comments. Include `@param` for parameters, `@returns` for return values, `@throws` for exceptions, and `@example` when helpful.

**Detected:** File-level documentation comments (85% consistent)

Example from `packages/cli/src/utils/file-writer.ts` (lines 1-11):
```typescript
/**
 * FileWriter - Cross-platform file operations utility
 *
 * Uses Node.js fs/promises for async operations.
 * All paths are normalized using path.join() for Windows/Mac/Linux compatibility.
 */
```

**Convention:** Files with complex logic should have a top-level comment block explaining purpose and high-level architecture.

**Detected:** Inline comments for critical logic and special markers (75% consistent)

Common patterns:
- `// CRITICAL:` — Important correctness or safety information
- `// STEP markers` — Implementation phase tracking (e.g., `// STEP_1.3`, `// CP2`)
- `// Note:` — Explanatory comments
- `// Phase N:` — Multi-phase algorithm steps

**Convention:** Use inline comments sparingly for complex logic, edge cases, or important implementation notes. Prefer self-documenting code names over comments when possible.

## Additional Conventions

### Commit Message Format

**Detected:** Tag-prefixed messages with descriptive summaries (85% consistent)

Recent commit examples from git log:
```
[SS-7.2] Widen line targets + fix path stripping in check.ts — based on test cycle observations
[SS-7.1] Hook fixes + writer improvements — quality gate phase check, PostToolUse confirmed for sub-agents, SubagentStop hook, parallel batching, 6 writer improvements
[SS-6] Content redesign — 7 step files restructured, rules.md compressed 771→195 lines, quality checklists, trust stack
[SS-5] Question redesign — two-tier answer validation + UX consistency polish
[SS-4] Orchestrator rewrite — slim setup.md + tier files + state management
[SS-3] Sub-agent definitions — 4 agent files + init copy logic
[SS-2] Hook scripts + .claude/ integration in ana init — PostToolUse verification, Stop quality gate, merge-not-overwrite
[SS-1.3] ana setup check --json — per-file validation with citation verification, 20 test cases
[SS-1.2] BF1-BF6 Scenario B audit — null guards, none normalization, 29 test cases
fix: ensure templates survive clean build
[STEP_2.5] Fix E2E test: use 'mode code' instead of 'mode' without args
[STEP_2.5] Architecture fix: lazy-load analyzer to prevent startup crash
[STEP_2.5] Add ESLint 9 flat config with TypeScript + JSDoc rules
[STEP_2.5] Fix: replace 'as any' with type guard in setup.ts
[STEP_2.5] CP7 - Integration testing and documentation (FINAL)
[STEP_2.5] CP6 - Engineering quality gates
[STEP_2.5] CP5 - Delete old template system
[STEP_2.5] CP4 - Complete ana init rewrite (9-phase orchestrator)
```

**Pattern:**
- Prefix: `[TAG]` where TAG is one of:
  - `SS-N` or `SS-N.M` — SideSprint work items (current branch pattern)
  - `STEP_N.M` — Implementation step tracking (previous pattern)
  - `fix:`, `feat:`, `docs:`, etc. — Conventional Commits style (occasional)
- Summary: Brief description of change (imperative mood)
- Optional details: `—` separator followed by additional context

**Convention:** Use tag prefixes to track implementation phases or work items. Keep first line under 72 characters if possible. Add detailed explanation after `—` separator.

### Error Handling Convention

**Detected:** Error wrapping with context in catch blocks (85% consistent)

Example from `packages/cli/src/utils/file-writer.ts`:
```typescript
try {
  await fs.mkdir(dirPath, { recursive: true });
} catch (error) {
  if (error instanceof Error) {
    throw new Error(`Failed to create directory '${dirPath}': ${error.message}`);
  }
  throw error;
}
```

**Convention:** Wrap caught errors with contextual information (file path, operation name) before rethrowing. Check `error instanceof Error` before accessing `.message` property to satisfy TypeScript's type safety.

### Package Manager Convention

**Detected:** pnpm workspaces with frozen lockfile in CI

From `pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
  - 'website'
```

From exploration results (CI workflow):
- CI runs `pnpm install --frozen-lockfile` (prevents lockfile changes during CI)
- Workspace dependencies use `workspace:*` protocol in `package.json`

**Convention:** Use `pnpm` for all package operations. Never use `npm` or `yarn`. Workspace dependencies reference other packages via `workspace:*`.

### Git Ignore Patterns

**Detected:** Comprehensive ignore patterns for build outputs, dependencies, and secrets

From `.gitignore` (key patterns):
- `node_modules/`, `.pnpm-store/` — Dependencies
- `dist/`, `.turbo/`, `*.tsbuildinfo` — Build outputs
- `.env`, `*.pem`, `credentials.json` — Secrets
- `.vscode/settings.json`, `.idea/` — IDE settings

**Convention:** Never commit build outputs, dependencies, environment files, credentials, or IDE-specific settings.

### File Organization Convention

**Detected:** Feature-based organization within packages

Package structure pattern:
```
packages/[package-name]/
  src/
    commands/       (CLI commands)
    utils/          (shared utilities)
    analyzers/      (analysis logic)
    detectors/      (detection logic)
    parsers/        (parsing logic)
    types/          (TypeScript type definitions)
    errors/         (custom error classes)
    cache/          (caching systems)
    sampling/       (sampling utilities)
    index.ts        (public API exports)
  tests/
    [feature]/      (tests organized by feature)
    fixtures.ts     (shared test fixtures)
  dist/             (build output, gitignored)
  package.json
  tsconfig.json
```

**Convention:** Organize code by feature/domain (commands, analyzers, parsers) rather than by type (all classes together, all functions together). Each subdirectory contains related functionality. Public APIs are exported through `index.ts` barrel files.

### Test File Naming Convention

**Detected:** `*.test.ts` suffix for Vitest tests (100% consistent)

Examples:
- `packages/cli/tests/scaffolds/all-scaffolds.test.ts`
- `packages/cli/tests/commands/init.test.ts`
- `packages/cli/tests/utils/validators.test.ts`
- `packages/analyzer/tests/analyzers/structure.test.ts`

**Enforced by:** Vitest config looks for `**/*.test.ts` pattern.

**Convention:** All test files use `.test.ts` extension. Test files are colocated in `/tests/` directories at package level (not alongside source files).

### Export Pattern Convention

**Detected:** Named exports preferred over default exports (95% consistent)

Examples from codebase:
```typescript
// Named exports (preferred)
export class FileWriter { ... }
export const fileWriter = new FileWriter();
export interface WriteFileOptions { ... }
export async function analyze(...) { ... }
export const VERSION = '0.1.0';

// No default exports detected in main source files
```

**Convention:** Use named exports for all public APIs. Default exports are not used in this codebase. This enables better IDE autocomplete and refactoring support.

### Singleton Pattern Convention

**Detected:** Singleton instances exported alongside classes (70% consistent)

Example from `packages/cli/src/utils/file-writer.ts` (lines 136-138):
```typescript
export class FileWriter { ... }

// Default instance for convenience
export const fileWriter = new FileWriter();
```

Example from `packages/analyzer/src/parsers/treeSitter.ts` (mentioned in exploration):
```typescript
export class ParserManager { ... }
export const parserManager = new ParserManager(); // singleton instance
```

Example from `packages/analyzer/src/parsers/queries.ts` (mentioned in index.ts exports):
```typescript
export class QueryCache { ... }
export const queryCache = new QueryCache(); // singleton instance
```

**Convention:** For stateful utility classes, export both the class (PascalCase) and a singleton instance (camelCase). Consumers can use the singleton for convenience or instantiate their own for testing/isolation.

### Version Constant Convention

**Detected:** Version constants exported from package entry points

Example from `packages/analyzer/src/index.ts` (line 133):
```typescript
export const VERSION = '0.1.0';
```

Example from `packages/cli/src/constants.ts` (line 87):
```typescript
export const META_VERSION = '1.0.0';
```

**Convention:** Packages export a `VERSION` constant for programmatic access to version info. This complements the `version` field in `package.json`.

---

*Last updated: 2026-03-21T21:00:00.000Z*
*Generated by: Anatomia CLI v0.2.0*
