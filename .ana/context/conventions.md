# Conventions — anatomia-workspace

This document captures naming, import, and code style conventions for the Anatomia monorepo. Every convention includes the rule, evidence source, and real examples from this codebase.

---

## Naming Conventions

### Files

**Detected:** Mixed naming patterns with two primary conventions.

**kebab-case for most source files** (from `packages/analyzer/src/`, `packages/cli/src/`):
- `analysis-helpers.ts`
- `file-writer.ts`
- `scaffold-generators.ts`
- `format-analysis-brief.ts`

**PascalCase for error classes** (from `packages/analyzer/src/errors/`):
```
DetectionError.ts
DetectionCollector.ts
```

**Detected:** Test files always use kebab-case with `.test.ts` suffix (from `packages/cli/tests/`, `packages/analyzer/tests/`):
- `setup.test.ts`
- `validators.test.ts`
- `setup-complete-integration.test.ts`

**Inferred:** The pattern suggests kebab-case is the standard, with PascalCase used only when the file exports a single class of the same name.

### Functions

**Detected:** camelCase (confidence: 0.91 from exploration)

Real examples from `packages/cli/src/commands/setup.ts` (lines 30-36):
```typescript
function isValidSetupTier(tier: string): tier is typeof VALID_SETUP_TIERS[number] {
  return VALID_SETUP_TIERS.includes(tier as typeof VALID_SETUP_TIERS[number]);
}
```

From `packages/analyzer/src/types/index.ts` (lines 103-117):
```typescript
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

Additional examples from `packages/cli/src/utils/validators.ts`:
- `validateStructure`
- `validateContent`
- `validateCrossReferences`
- `validateQuality`
- `getProjectName`
- `fileExists`

### Classes

**Detected:** PascalCase (confidence: 1.00 from exploration)

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
    // ...
  }
}
```

Other examples from source code:
- `DetectionCollector` (from `packages/analyzer/src/errors/DetectionCollector.ts`)
- `ParserManager` (mentioned in exploration)
- `ASTCache` (from `packages/analyzer/src/cache/astCache.ts`)

### Constants

**Detected:** UPPER_SNAKE_CASE consistently used.

From `packages/cli/src/constants.ts` (lines 7-23):
```typescript
/** Scaffold marker (first line of every context file scaffold) */
export const SCAFFOLD_MARKER = '<!-- SCAFFOLD - Setup will fill this file -->';

/** Validation thresholds */
export const MIN_FILE_SIZE_WARNING = 20; // Lines
export const MAX_FILE_SIZE_WARNING = 1500; // Lines
export const MIN_DEBUGGING_FILE_SIZE = 15; // Lines

/** Pattern categories (synchronized with analyzer) */
export const PATTERN_CATEGORIES = [
  'errorHandling',
  'validation',
  'database',
  'auth',
  'testing',
] as const;
```

More examples from `packages/cli/src/constants.ts`:
- `REQUIRED_CONTEXT_FILES`
- `MODE_FILES`
- `SETUP_FILES`
- `VALID_SETUP_TIERS`
- `META_VERSION`

From `packages/analyzer/src/errors/DetectionError.ts` (lines 106-133):
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
  PARSE_ERROR: 'PARSE_ERROR',
  // ...
} as const;
```

### Interfaces and Types

**Detected:** PascalCase (confidence: 0.95 from exploration)

From `packages/analyzer/src/types/index.ts` (lines 36-47):
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

From `packages/analyzer/src/errors/DetectionError.ts` (lines 13-40):
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

Additional examples:
- `AnalysisResult`
- `StructureAnalysis`
- `ParsedAnalysis`
- `PatternAnalysis`
- `ConventionAnalysis`
- `ValidationError`

### Variables

**Detected:** camelCase consistently used in local and exported variables.

From `packages/cli/src/commands/setup.ts` (lines 58-60):
```typescript
const cwd = process.cwd();
const anaPath = path.join(cwd, '.ana');
```

From `packages/cli/src/index.ts` (line 21):
```typescript
const program = new Command();
```

### Enum-like Patterns

**Detected:** Const arrays with `as const` assertion instead of TypeScript enums.

From `packages/cli/src/constants.ts` (lines 16-22):
```typescript
export const PATTERN_CATEGORIES = [
  'errorHandling',
  'validation',
  'database',
  'auth',
  'testing',
] as const;
```

From `packages/cli/src/constants.ts` (lines 87-88):
```typescript
export const VALID_SETUP_TIERS = ['quick', 'guided', 'complete'] as const;
```

**Inferred:** This pattern avoids TypeScript enums in favor of const arrays, which is a common practice in modern TypeScript for better type inference and smaller bundle size.

### Directory Naming

**Detected:** lowercase, often plural for collections.

From `packages/analyzer/src/` structure:
- `analyzers/` (collection of analyzer modules)
- `detectors/` (collection of detector modules)
- `parsers/` (collection of parser modules)
- `errors/` (error-related code)
- `types/` (type definitions)
- `cache/` (caching utilities)
- `utils/` (utility functions)

From `packages/cli/src/` structure:
- `commands/` (CLI commands)
- `utils/` (utility functions)

**Detected:** Subdirectories may be organized by language or domain (from `packages/analyzer/src/`):
- `parsers/python/`
- `parsers/node/`
- `detectors/python/`
- `detectors/node/`
- `analyzers/conventions/`

---

## Import Organization

### Import Style

**Detected:** Relative imports with `.js` extensions (ESM requirement)

**Confidence:** 1.00 (from exploration: absolute 0%, relative 100%)

From `packages/cli/src/index.ts` (lines 15-19):
```typescript
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { modeCommand } from './commands/mode.js';
import { analyzeCommand } from './commands/analyze.js';
import { setupCommand } from './commands/setup.js';
```

**User confirmed:** ESM-first architecture requires `.js` extensions even for `.ts` files.

**Detected:** This is a common source of confusion (from Q&A log, Q4: "ESM import paths — .js extensions for .ts files").

### Import Grouping

**Detected:** Typical grouping pattern observed (confidence: 0.80 from exploration):

From `packages/cli/src/commands/setup.ts` (lines 7-22):
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
} from '../utils/validators.js';
import { VALID_SETUP_TIERS, META_VERSION } from '../constants.js';
import { createCheckCommand } from './check.js';
import { createIndexCommand } from './index.js';
```

**Detected:** The observed pattern is:
1. External dependencies (commander, chalk)
2. Node built-ins with `node:` prefix (node:path, node:fs/promises)
3. Internal workspace packages (anatomia-analyzer)
4. Local relative imports (./commands/, ../utils/)

**Inferred:** This grouping is not mechanically enforced (no import sorting plugin detected in ESLint config), but appears consistently across source files.

### Type-Only Imports

**Detected:** Uses `import type` syntax for type-only imports.

From `packages/cli/src/commands/setup.ts` (line 11):
```typescript
import type { AnalysisResult } from 'anatomia-analyzer';
```

From `packages/analyzer/src/analyzers/structure.ts` (line 18):
```typescript
import type { ProjectType } from '../types/index.js';
```

**Detected:** Mixed inline type imports within regular imports (from `packages/cli/src/commands/setup.ts` line 19):
```typescript
import {
  validateStructure,
  // ... other imports
  type ValidationError,
} from '../utils/validators.js';
```

**Inferred:** Both `import type` and inline `type` keywords are used, suggesting no strict preference.

### Node Built-in Imports

**Detected:** Consistent use of `node:` protocol prefix.

From `packages/cli/src/commands/setup.ts` (lines 9-10):
```typescript
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
```

From `packages/analyzer/src/analyzers/structure.ts` (line 26):
```typescript
import { basename } from 'node:path';
```

**Inferred:** The `node:` prefix is a best practice for Node.js ESM to explicitly differentiate built-ins from npm packages.

### Workspace Package Imports

**Detected:** Uses package name directly (workspace:* protocol is in package.json, not import statements).

From `packages/cli/src/commands/setup.ts` (line 11):
```typescript
import type { AnalysisResult } from 'anatomia-analyzer';
```

**Detected:** Package dependencies defined with workspace protocol in `packages/cli/package.json` (from exploration, line 51):
```json
"anatomia-analyzer": "workspace:*"
```

---

## Code Style

### Formatting Configuration

**Detected:** Prettier configuration enforces all code style rules.

From `.prettierrc.json` (complete file):
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

### Indentation

**Detected:** 2 spaces (confidence: 1.00 from config file)

**Enforced by:** `.prettierrc.json` (tabWidth: 2)

### Quotes

**Detected:** Single quotes for strings

**Enforced by:** `.prettierrc.json` (singleQuote: true)

Example from `packages/cli/src/constants.ts` (line 8):
```typescript
export const SCAFFOLD_MARKER = '<!-- SCAFFOLD - Setup will fill this file -->';
```

### Semicolons

**Detected:** Always required

**Enforced by:** `.prettierrc.json` (semi: true)

### Line Length

**Detected:** 100 characters maximum

**Enforced by:** `.prettierrc.json` (printWidth: 100)

### Trailing Commas

**Detected:** ES5 style (in arrays and objects, not in function parameters)

**Enforced by:** `.prettierrc.json` (trailingComma: "es5")

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

### TypeScript Configuration

**Detected:** Strict mode with additional checks enabled.

From `tsconfig.base.json` (lines 6-15):
```json
{
  "compilerOptions": {
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

**Detected:** Comments in tsconfig.base.json cite sources for configuration choices (lines 4-5, 8-9):
```json
// Strict Mode - All strict checks enabled
// See: https://www.typescriptlang.org/tsconfig/strict.html

// Additional Strict Checks (2026 recommended, not included in strict flag)
// See: https://www.totaltypescript.com/tsconfig-cheat-sheet
```

### ESLint Rules

**Detected:** TypeScript ESLint configuration with specific rules.

From `eslint.config.mjs` (complete file):
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

**Detected:** `no-explicit-any` is a warning, not an error. This allows `any` in prototyping but signals it should be replaced.

**Detected:** Unused variables prefixed with `_` are allowed (argsIgnorePattern: '^_'). Common pattern for callback parameters that must be declared but aren't used.

### Module System

**Detected:** ESM with modern resolution.

From `tsconfig.base.json` (lines 17-24):
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "isolatedModules": true
  }
}
```

**User confirmed:** "ESM-first with .js extensions" is a deliberate architecture choice (from Q&A log, Q3).

### Type Safety Features

**Detected:** Monorepo-optimized TypeScript configuration.

From `tsconfig.base.json` (lines 39-42):
```json
{
  "compilerOptions": {
    // Monorepo Support - Critical for caching
    "composite": true,
    "incremental": true
  }
}
```

**Detected:** Comments reference Turborepo documentation (lines 18, 40):
```json
// See: https://turborepo.dev/docs/guides/tools/typescript
```

---

## Additional Conventions

### Documentation Style

**Detected:** JSDoc comments for public APIs and complex functions.

From `packages/cli/src/index.ts` (lines 1-13):
```typescript
/**
 * Anatomia CLI - Auto-generated AI context for codebases
 *
 * Usage:
 *   ana --version       Show version
 *   ana --help          Show help
 *   ana init            Initialize .ana/ context
 *   ana mode <name>     Reference a mode file
 *
 * @packageDocumentation
 */
```

From `packages/cli/src/constants.ts` (lines 1-5):
```typescript
/**
 * Shared constants for CLI
 *
 * Centralizes magic strings and numbers for maintainability.
 */
```

From `packages/analyzer/src/analyzers/structure.ts` (lines 0-14):
```typescript
/**
 * Structure analysis for Anatomia
 *
 * Analyzes project directory structure to detect:
 * - Entry points (where execution starts)
 * - Test locations (where tests live)
 * - Architecture pattern (layered, domain-driven, microservices, etc.)
 * - Directory tree (ASCII representation)
 *
 * Implementation status:
 * - CP0: Interfaces and placeholders ✓
 * - CP1: Entry point detection (in progress)
 * - CP2: Architecture classification (planned)
 * - CP3: Test location + integration (planned)
 */
```

**Detected:** Inline comments explain "why" and reference design decisions.

From `packages/cli/src/index.ts` (lines 35-36):
```typescript
// CRITICAL: Use parseAsync() not parse() for async action handlers
// See: https://github.com/tj/commander.js#async-action-handlers
```

From `packages/analyzer/src/analyzers/structure.ts` (lines 30-35):
```typescript
/**
 * Entry point patterns per project type (priority-ordered)
 *
 * Checked in order - first match wins.
 * Percentages from analyzing 50+ real projects per framework.
 *
 * Source: START_HERE_PART1.md lines 508-599 (validated against real projects)
 */
```

**Inferred:** Comments frequently cite external documentation or internal design docs, making architectural decisions traceable.

### Commit Message Format

**User confirmed:** Feature branch workflow with structured naming and bracket-prefix commits (from Q&A log, Q6).

**Detected:** Bracket-prefix pattern for commit messages.

From git log (recent commits):
```
[SS-14] Remove test artifacts before merge
[SS-13.4] Universal file sampler — **/*.ts with merged exclusion list
[SS-13.3] Widen trade-off trigger beyond web-only, update writer hook documentation
[SS-13.2] Fix parallel writer hook isolation — silent PostToolUse, scoped SubagentStop
[SS-13.1b] Read setupMode from .meta.json as fallback when .setup_tier missing
[SS-13.1] Fix BF1 scaffold marker false positive in code blocks
[SS-13.0] MI-51/52/53/54/55: preflight changes
[SS-12.4c] detectProjectType tests (14), app/ directory sampling fix
[MI-18] CLAUDE.md signpost generation
```

**Detected:** Merge commit pattern.

From git log:
```
Merge SideSprint/setup-redesign: sub-agent architecture, hook system, WASM migration, symbol index, 9 test cycles
```

**Detected:** Bracket prefixes follow patterns:
- `[SS-N]` or `[SS-N.M]` — SideSprint work (urgent/unplanned work)
- `[MI-N]` — Unknown pattern (possibly "Minor Issue" or milestone)
- `[STEP_N.M]` — Planned work in roadmap phases

**Inferred:** Not using Conventional Commits (feat:, fix:) but a custom ticket-based system.

### Branch Naming

**User confirmed:** Feature branches with structured naming: `effort/STEP_*`, `SideSprint/*` (from Q&A log, Q6).

**Detected:** Branch naming patterns from exploration:
- `effort/STEP_X_Y_FEATURE` for planned work (11 branches detected)
- `SideSprint/*` for urgent work (1 branch detected)
- `ux/*` for UX fixes (1 branch detected)

**Detected:** Main branch is `main` (not `master`, `develop`, or `staging`).

**User confirmed:** "PR-based merges, bracket-prefix commits, CI-enforced quality (no local pre-commit hooks)" (from Q&A log, Q6).

### File Organization

**Detected:** Tests mirror source structure.

From exploration:
- `packages/cli/src/commands/setup.ts` ↔ `packages/cli/tests/commands/setup.test.ts`
- `packages/cli/src/utils/validators.ts` ↔ `packages/cli/tests/utils/validators.test.ts`

**Detected:** Test file naming: `*.test.ts` (not `*.spec.ts`)

### Error Handling Documentation

**Detected:** Error classes document their design influences.

From `packages/analyzer/src/errors/DetectionError.ts` (lines 1-8):
```typescript
/**
 * Error handling for Anatomia detection engine
 *
 * Based on research:
 * - Vercel CLI error structure
 * - Next.js error patterns
 * - Node.js Error best practices
 */
```

**Inferred:** The codebase values citing prior art and design influences, making decisions auditable.

### Const Declarations

**Detected:** Exported constants include JSDoc comments explaining purpose.

From `packages/cli/src/constants.ts` (lines 7-13):
```typescript
/** Scaffold marker (first line of every context file scaffold) */
export const SCAFFOLD_MARKER = '<!-- SCAFFOLD - Setup will fill this file -->';

/** Validation thresholds */
export const MIN_FILE_SIZE_WARNING = 20; // Lines
export const MAX_FILE_SIZE_WARNING = 1500; // Lines
export const MIN_DEBUGGING_FILE_SIZE = 15; // Lines
```

**Detected:** Inline comments provide context (e.g., `// Lines` clarifies the unit).

### Object/Record Conventions

**Detected:** Record types with string mappings use explicit typing and comments.

From `packages/analyzer/src/analyzers/structure.ts` (lines 39-99):
```typescript
/**
 * Directory purpose mapping (basename → purpose description)
 */
const DIRECTORY_PURPOSES: Record<string, string> = {
  // Source code
  'src': 'Source code',
  'lib': 'Library code',
  'app': 'Application code',
  // ...
  // Tests
  'tests': 'Tests',
  'test': 'Tests',
  '__tests__': 'Jest tests',
  // ...
}
```

**Inferred:** Comment headers group related entries in large objects.

### Type Guards

**Detected:** Type guard functions follow `isX` naming pattern.

From `packages/cli/src/commands/setup.ts` (lines 30-36):
```typescript
/**
 * Type guard to check if string is valid setup tier
 * @param tier - Setup tier to validate
 * @returns true if valid setup tier
 */
function isValidSetupTier(tier: string): tier is typeof VALID_SETUP_TIERS[number] {
  return VALID_SETUP_TIERS.includes(tier as typeof VALID_SETUP_TIERS[number]);
}
```

**Detected:** Type guards include JSDoc with `@param` and `@returns` tags.

### Zod Schema Patterns

**Detected:** Every type has a corresponding Zod schema and helper function.

From `packages/analyzer/src/types/index.ts` (pattern across file):
```typescript
// Pattern: Schema + Type + Helper
export const AnalysisResultSchema = z.object({ /* ... */ });
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export function createEmptyAnalysisResult(): AnalysisResult { /* ... */ }

export const ProjectTypeSchema = z.enum([/* ... */]);
export type ProjectType = z.infer<typeof ProjectTypeSchema>;
```

**Inferred:** Schema naming: `TypeNameSchema` (not `typeNameSchema` or `TYPE_NAME_SCHEMA`)

**Inferred:** Helper function naming: `createEmptyTypeName` for factory functions

### Optional Property Syntax

**Detected:** Uses `| undefined` explicitly rather than `?` alone.

From `packages/analyzer/src/errors/DetectionError.ts` (lines 22-30):
```typescript
export interface DetectionError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';

  /** File that caused error (optional) */
  file?: string | undefined;

  /** Line number in file (optional) */
  line?: number | undefined;
}
```

**Detected:** This is required by `exactOptionalPropertyTypes` in tsconfig.base.json (line 15).

### Version Documentation

**Detected:** Metadata version constant defined centrally.

From `packages/cli/src/constants.ts` (lines 90-91):
```typescript
/** .meta.json version */
export const META_VERSION = '1.0.0';
```

**Inferred:** This centralizes version management for metadata files, avoiding magic strings.

### Code Comments for Context

**Detected:** Comments often explain implementation status and planned features.

From `packages/analyzer/src/analyzers/structure.ts` (lines 9-14):
```typescript
/**
 * Implementation status:
 * - CP0: Interfaces and placeholders ✓
 * - CP1: Entry point detection (in progress)
 * - CP2: Architecture classification (planned)
 * - CP3: Test location + integration (planned)
 */
```

**Inferred:** `CP` prefix appears to indicate "Checkpoint" or development phase.

### No Editor Config

**Detected:** No `.editorconfig` file present.

**Inferred:** All formatting rules are in `.prettierrc.json` and `tsconfig.base.json`. No redundant editor-specific configuration.

---

*Last updated: 2026-03-24*
