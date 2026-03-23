# Conventions — anatomia-workspace

**Detected:** This document captures naming, import, and code style conventions extracted from configuration files and analyzer data, with real examples from the codebase.

## Naming Conventions

### Files

**Pattern:** kebab-case.ts — Confidence: 0.90

**Detected:** Real examples from `packages/cli/src/utils/` and `packages/analyzer/src/`:
- `file-writer.ts`
- `scaffold-generators.ts`
- `format-analysis-brief.ts`
- `analysis-helpers.ts`
- `import-scanner.ts`

**Exception:** PascalCase for class-as-file pattern — Confidence: 0.85

**Detected:** Examples from `packages/analyzer/src/errors/`:
- `DetectionCollector.ts` (exports DetectionCollector class)
- `DetectionError.ts` (exports DetectionEngineError and DetectionError)
- `ASTCache.ts` (exports ASTCache class)
- `ParserManager.ts` (exports ParserManager class)

**User confirmed:** Methodical and quality-focused TypeScript development approach

### Functions and Variables

**Pattern:** camelCase — Confidence: 0.95

**Detected:** Examples from analyzer public API (`packages/analyzer/src/index.ts`, lines 26-28):
```typescript
import { detectProjectType } from './detectors/projectType.js';
import { detectFramework } from './detectors/framework.js';
import { analyzeStructure } from './analyzers/structure.js';
```

**Detected:** Additional examples from `packages/cli/src/commands/setup.ts`:
- `validateStructure` (line 14)
- `validateContent` (line 15)
- `validateCrossReferences` (line 16)
- `validateQuality` (line 17)
- `getProjectName` (line 18)
- `fileExists` (line 19)

**Detected:** More examples from analyzer exports (lines 51-56):
- `findEntryPoints`
- `classifyArchitecture`
- `findTestLocations`
- `buildAsciiTree`
- `findConfigFiles`

### Classes

**Pattern:** PascalCase — Confidence: 0.95

**Detected:** Examples from `packages/analyzer/src/` exports:
- `DetectionCollector` (from `errors/DetectionCollector.ts`)
- `DetectionEngineError` (from `errors/DetectionError.ts`)
- `ParserManager` (from `parsers/treeSitter.ts`)
- `ASTCache` (from `cache/astCache.ts`)
- `QueryCache` (from `parsers/queries.ts`)
- `FileWriter` (from `packages/cli/src/utils/file-writer.ts`, line 26)

**Detected:** Example class definition from `packages/analyzer/src/errors/DetectionCollector.ts` (lines 9-12):
```typescript
export class DetectionCollector {
  private errors: DetectionError[] = [];
  private warnings: DetectionError[] = [];
  private info: DetectionError[] = [];
```

### Interfaces and Types

**Pattern:** PascalCase — Confidence: 0.95

**Detected:** Examples from type exports (`packages/analyzer/src/index.ts`, lines 82-90):
```typescript
export type {
  ParsedAnalysis,
  ParsedFile,
  FunctionInfo,
  ClassInfo,
  ImportInfo,
  ExportInfo,
  DecoratorInfo,
} from './types/parsed.js';
```

**Detected:** Interface example from `packages/cli/src/utils/file-writer.ts` (lines 16-19):
```typescript
export interface WriteFileOptions {
  encoding?: BufferEncoding;
  mode?: number;
}
```

**Detected:** Additional type examples from `packages/cli/src/commands/setup.ts`:
- `ValidationError` (line 20)
- `SetupCompleteOptions` (line 26)
- `AnalysisResult` (line 12)

### Constants

**Pattern:** SCREAMING_SNAKE_CASE — Confidence: 0.95

**Detected:** Examples from `packages/cli/src/constants.ts` (lines 7-13):
```typescript
/** Scaffold marker (first line of every context file scaffold) */
export const SCAFFOLD_MARKER = '<!-- SCAFFOLD - Setup will fill this file -->';

/** Validation thresholds */
export const MIN_FILE_SIZE_WARNING = 20; // Lines
export const MAX_FILE_SIZE_WARNING = 1500; // Lines
export const MIN_DEBUGGING_FILE_SIZE = 15; // Lines
```

**Detected:** Array constants also use SCREAMING_SNAKE_CASE (lines 15-22):
```typescript
/** Pattern categories (synchronized with analyzer) */
export const PATTERN_CATEGORIES = [
  'errorHandling',
  'validation',
  'database',
  'auth',
  'testing',
] as const;
```

**Detected:** Additional examples from `packages/cli/src/constants.ts`:
- `REQUIRED_CONTEXT_FILES` (line 25)
- `MODE_FILES` (line 36)
- `SETUP_FILES` (line 50)
- `STEP_FILES` (line 57)
- `FRAMEWORK_SNIPPETS` (line 69)
- `AGENT_FILES` (line 79)
- `VALID_SETUP_TIERS` (line 87)
- `META_VERSION` (line 90)

**Detected:** Examples from `packages/cli/src/commands/setup.ts`:
- `VALID_SETUP_TIERS` (imported and used, line 22)
- `META_VERSION` (imported and used, line 22)

### Enum Values and Literal Types

**Pattern:** PascalCase for schemas, lowercase strings for values — Confidence: 0.90

**Detected:** Example from `packages/analyzer/src/types/index.ts` (lines 36-45):
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

**Detected:** Schema naming pattern: `{Type}Schema` convention
- `ProjectTypeSchema`
- `ConfidenceScoreSchema`
- `AnalysisResultSchema`
- `StructureAnalysisSchema`
- `ParsedAnalysisSchema`
- `PatternAnalysisSchema`

**Enforced by:** Zod runtime validation library — all schemas use `z.infer<typeof Schema>` pattern for type safety

## Import Organization

### Import Ordering

**Pattern:** External dependencies first, internal imports second, grouped by source — Confidence: 0.90

**Detected:** Example from `packages/cli/src/commands/setup.ts` (lines 8-24):
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

**Grouping breakdown:**
1. External npm packages (commander, chalk)
2. Node.js built-ins with `node:` protocol
3. External workspace packages (anatomia-analyzer)
4. Relative internal imports (../utils/, ../constants.js, ./check.js)

**Detected:** Type imports inline with regular imports, using `type` keyword for type-only imports (line 12, line 20)

### Node.js Built-in Protocol

**Pattern:** Node built-ins use `node:` protocol — Confidence: 0.95

**Detected:** Examples from `packages/cli/src/commands/setup.ts` (lines 10-11):
```typescript
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
```

**Detected:** Example from `packages/cli/src/utils/file-writer.ts` (lines 13-14):
```typescript
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
```

**Enforced by:** ESM module system (type: "module" in all package.json files)

### ESM File Extensions

**Pattern:** .js extensions in relative imports (ESM requirement) — Confidence: 0.95

**Detected:** All relative imports end with .js extension, even for TypeScript source files

**Detected:** Examples from `packages/cli/src/commands/setup.ts` (lines 21-24):
```typescript
import { VALID_SETUP_TIERS, META_VERSION } from '../constants.js';
import { createCheckCommand } from './check.js';
import { createIndexCommand } from './index.js';
```

**Detected:** Examples from `packages/analyzer/src/errors/DetectionCollector.ts` (line 6):
```typescript
import { DetectionEngineError } from './DetectionError.js';
```

**Detected:** Examples from analyzer index exports (line 26):
```typescript
import { detectProjectType } from './detectors/projectType.js';
```

**Enforced by:** TypeScript moduleResolution: "Bundler" with ESM output (from `tsconfig.base.json`)

### Import Style Distribution

**Pattern:** Mixed absolute and relative imports — Confidence: 0.90

**Absolute imports:** Used for cross-package references within monorepo
- Example: `import type { AnalysisResult } from 'anatomia-analyzer';` (CLI importing from analyzer)

**Relative imports:** Used for same-package references
- Example: `import { validateStructure } from '../utils/validators.js';`

**No path aliases detected** — TypeScript paths not configured in tsconfig

## Code Style

### Formatter Configuration

**Formatter:** Prettier — Confidence: 0.95

**Detected:** Configuration from `.prettierrc.json` (lines 1-7):
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Rules breakdown:**
- **Semicolons:** Required (`semi: true`)
- **Quotes:** Single quotes (`singleQuote: true`)
- **Trailing commas:** ES5 style (objects, arrays, not function parameters)
- **Line length:** 100 characters max
- **Indentation:** 2 spaces

### Indentation

**Pattern:** 2 spaces, no tabs — Confidence: 0.95

**Detected:** From `.prettierrc.json` (line 6):
```json
"tabWidth": 2
```

**Enforced by:** Prettier formatting on all files

### Linter Configuration

**Linter:** ESLint with TypeScript plugin — Confidence: 0.95

**Detected:** Configuration from `eslint.config.mjs` (lines 1-13):
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

**Custom rules:**
- `no-explicit-any`: Warning (not error) — allows `any` but discourages it
- `no-unused-vars`: Error, but ignores variables starting with `_` (common TypeScript convention for intentionally unused parameters)

**Config format:** ESLint flat config (new format as of ESLint 9+)

### TypeScript Strictness

**Pattern:** Strict TypeScript with extensive additional checks — Confidence: 0.95

**Detected:** Configuration from `tsconfig.base.json` (lines 4-15):
```json
{
  "compilerOptions": {
    // Strict Mode - All strict checks enabled
    // See: https://www.typescriptlang.org/tsconfig/strict.html
    "strict": true,

    // Additional Strict Checks (2026 recommended, not included in strict flag)
    // See: https://www.totaltypescript.com/tsconfig-cheat-sheet
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
```

**Strict mode includes:**
- `noImplicitAny`
- `strictNullChecks`
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `noImplicitThis`
- `alwaysStrict`

**Additional strict checks beyond standard `strict` flag:**
- `noUncheckedIndexedAccess` — array/object indexing returns `T | undefined`
- `noImplicitOverride` — requires `override` keyword on subclass methods
- `noPropertyAccessFromIndexSignature` — enforces bracket notation for index signatures
- `noImplicitReturns` — all code paths must return a value
- `noFallthroughCasesInSwitch` — switch cases must have break/return
- `exactOptionalPropertyTypes` — optional properties cannot be set to `undefined`

**User confirmed:** Quality-focused development approach with deliberate architecture choices

### Type Annotation Style

**Pattern:** Explicit types for public APIs, inference for internal variables — Confidence: 0.85

**Detected:** Public API example from `packages/analyzer/src/errors/DetectionCollector.ts` (lines 17, 26, 35):
```typescript
addError(error: DetectionEngineError | DetectionError): void
addWarning(error: DetectionEngineError | DetectionError): void
addInfo(error: DetectionEngineError | DetectionError): void
```

**Detected:** Function return type annotations from same file (lines 44, 51, 55, 59, 66, 73):
```typescript
getAllErrors(): DetectionError[]
getErrors(): DetectionError[]
getWarnings(): DetectionError[]
getInfo(): DetectionError[]
hasCriticalErrors(): boolean
getCounts()  // return type inferred
```

**Pattern:** Zod schemas for runtime validation + type inference — Confidence: 0.90

**Detected:** Example from `packages/analyzer/src/types/index.ts` (lines 50-53):
```typescript
/**
 * Confidence score for a detection
 * Range: 0.0 (no confidence) to 1.0 (certain)
 */
export const ConfidenceScoreSchema = z.number().min(0.0).max(1.0);
```

**Usage pattern:** `z.infer<typeof Schema>` for deriving TypeScript types from Zod schemas

**Detected:** Type inference example (line 47):
```typescript
export type ProjectType = z.infer<typeof ProjectTypeSchema>;
```

### Module System

**Pattern:** Pure ESM — Confidence: 0.95

**Detected:** All package.json files contain `"type": "module"`

**Detected:** TypeScript config from `tsconfig.base.json` (lines 17-24):
```json
{
  // Module Resolution - Modern ESM-first
  // See: https://turborepo.dev/docs/guides/tools/typescript
  "module": "ESNext",
  "moduleResolution": "Bundler",
  "resolveJsonModule": true,
  "allowSyntheticDefaultImports": true,
  "esModuleInterop": true,
  "isolatedModules": true,
```

**Implications:**
- All imports/exports use ESM syntax (`import`/`export`, not `require`)
- `.js` file extensions required in relative imports
- Top-level `await` supported
- No `__dirname` or `__filename` globals (use `import.meta.url`)

### Documentation Style

**Pattern:** JSDoc comments for public APIs — Confidence: 0.85

**Detected:** Example from `packages/cli/src/utils/file-writer.ts` (lines 1-11):
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

**Detected:** JSDoc with tags from same file (lines 27-31, 42-45):
```typescript
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
```

**Detected:** Package-level documentation from `packages/cli/src/index.ts` (line 1):
```typescript
/**
 * @packageDocumentation
```

**Detected:** Inline comment style from `packages/cli/src/commands/setup.ts` (lines 95-109):
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
```

**Pattern:** Inline comments for phase markers and complex logic explanations

## Additional Conventions

### Git Commit Format

**Pattern:** Structured commits with tags and em dash separator — Confidence: 0.85

**User confirmed:** Phased branching strategy (effort/STEP_*, SideSprint/*)

**Detected:** Format structure from git log (last 20 commits):
```
[TAG] Brief summary — Detailed description
```

**Tag patterns:**
- `[SS-*]` — SideSprint work (e.g., `[SS-13.0]`, `[SS-12.4c]`)
- `[MI-*]` — Milestone/Issue tracking (e.g., `[MI-18]`, `[MI-3]`)
- `[STEP_*]` — Effort tracking (implied from branch names)

**Detected:** Real commit examples from git log:
```
[SS-13.0] MI-51/52/53/54/55: preflight changes — Q6 git workflow, Q7 business flow, What's Next print, .gitignore, explorer git targets
[SS-12.4c] detectProjectType tests (14), app/ directory sampling fix, tetto 6→20 files parsed
[SS-12.4b] Fix analysis.md formatter field names — totalParsed, computed functions/classes from files array
[MI-18] CLAUDE.md signpost generation — marker-based merge, concierge ENTRY.md, 3 edge case tests passed
[SS-11] AST symbol index — 582 symbols from 152 files, citation verification checks function/class names, conservative extraction, graceful fallback
```

**Separator:** Em dash (—) separates brief summary from detailed description

**Descriptive details:** After dash, includes specifics like:
- Changed components
- File/line counts
- Test results
- Implementation approach
- Concrete changes made

**Conventional Commits:** Not used — custom format with tag prefixes instead

### Branch Naming

**User confirmed:** Phased development workflow with PR-based merging

**Detected:** Branch naming patterns from git history:

**Primary branches:**
- `main` — Main development branch

**Feature branches:**
- `effort/STEP_{phase}_{checkpoint}_{NAME}` — Phased development work
  - Examples: `effort/STEP_0_1_FOUNDATION`, `effort/STEP_1_1_DETECTION`, `effort/STEP_2_5_CLI_CODE`

**Sprint branches:**
- `SideSprint/{feature}` — Parallel sprint work
  - Example: `SideSprint/setup-redesign`

**UX branches:**
- `ux/{feature}` — UX-focused changes
  - Example: `ux/fix-copy`

**Detected:** 13+ effort/* branches tracked, indicating methodical phased approach

### Code Organization

**Pattern:** Domain-driven directory structure — Confidence: 0.90

**Detected:** Analyzer package structure:
```
packages/analyzer/src/
├── analyzers/        # Analysis logic (structure, patterns, conventions)
├── parsers/          # Language-specific parsers
├── detectors/        # Project type and framework detection
├── types/            # TypeScript types and Zod schemas
├── cache/            # Caching infrastructure (ASTCache)
├── errors/           # Error handling (DetectionCollector, DetectionError)
├── utils/            # Utilities (file ops, confidence scoring)
└── sampling/         # File sampling logic
```

**Detected:** CLI package structure:
```
packages/cli/src/
├── commands/         # CLI commands (setup, check, index, init)
├── utils/            # Utilities (validators, file-writer, scaffolds)
└── constants.ts      # Shared constants
```

**Pattern:** Barrel exports (index.ts files) — Confidence: 0.85

**Detected:** Public API controlled via barrel exports
- `packages/analyzer/src/index.ts` — Comprehensive public API (100+ lines of exports)
- `packages/cli/src/commands/index.ts` — Command aggregation
- Subdirectory index files (parsers/index.ts, detectors/index.ts, errors/index.ts)

**Detected:** Controlled public surface area from `packages/analyzer/src/index.ts` (lines 15-23):
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

### Error Handling Conventions

**Pattern:** Try-catch with process.exit(1) in CLI commands — Confidence: 0.80

**Detected:** Example from `packages/cli/src/commands/setup.ts` (lines 84-93):
```typescript
try {
  const content = await fs.readFile(snapshotPath, 'utf-8');
  snapshot = JSON.parse(content);
} catch (error) {
  console.error(chalk.red('Error: Failed to parse snapshot.json'));
  if (error instanceof Error) {
    console.error(chalk.gray(error.message));
  }
  process.exit(1);
}
```

**Pattern:** User-friendly error messages with chalk coloring
- Red for errors: `chalk.red('Error: ...')`
- Gray for details: `chalk.gray('...')`
- Yellow for warnings: `chalk.yellow('⚠️  ...')`
- Green for success: `chalk.green('✅ ...')`

**Detected:** Error display formatting (lines 170-178):
```typescript
function displayValidationFailures(errors: ValidationError[]): void {
  errors.forEach((error) => {
    console.log(chalk.red(`  [${error.rule}] ${error.file}`));
    console.log(chalk.gray(`      ${error.message}`));
    console.log();
  });

  console.log(chalk.gray('Fix the issues above and run `ana setup complete` again.'));
  console.log();
}
```

### Testing Conventions

See testing.md for comprehensive testing patterns and conventions.

**Detected:** Test file naming from exploration results:
- Pattern: `*.test.ts`
- Location: `tests/` directory mirrors `src/` structure
- 64 total test files across packages

**Detected:** Test framework: Vitest with globals enabled (no import of describe/it/expect needed)

### Package Script Conventions

**Pattern:** Turborepo orchestration for monorepo tasks — Confidence: 0.95

**Detected:** Root package.json scripts delegate to Turborepo:
```json
"build": "turbo run build"
"dev": "turbo run dev"
"test": "turbo run test"
"lint": "turbo run lint"
```

**Pattern:** Per-package scripts use package-specific tools

**CLI package:**
- Build: `tsup` (ESM bundler) with template copying
- Dev: `tsup --watch`
- Test: `vitest`

**Analyzer package:**
- Build: `tsc` (TypeScript compiler)
- Dev: `tsc --watch`
- Test: `vitest`
- Coverage: `vitest --coverage`

### .gitignore Structure

**Pattern:** Categorized ignore rules with comments — Confidence: 0.95

**Detected:** Structure from `.gitignore`:
```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
.next/, dist/, build/, .turbo/

# Environment & Secrets
.env, *.pem, credentials.json

# IDE & OS
.DS_Store, .vscode/settings.json

# Testing
coverage/, test-results/

# Temporary
*.tmp, master_plan/, .ana/.state/cache/
```

**Detected:** Comprehensive coverage of:
- Dependencies (node_modules, pnpm-store)
- Build artifacts (dist, .turbo, .next)
- Secrets (.env, *.pem, credentials.json)
- IDE/OS files (.DS_Store, .vscode/settings.json)
- Testing outputs (coverage/, test-results/)
- Temporary files (*.tmp, cache/)

### Custom Tooling Conventions

**Detected:** Custom bash hooks in `.ana/hooks/` (not Husky) — Confidence: 0.90

**Purpose:** Anatomia's own setup validation hooks
- `quality-gate.sh` — Blocks session completion if context files fail
- `run-check.sh` — Wrapper for validation checks
- `subagent-verify.sh` — Sub-agent verification
- `verify-context-file.sh` — Individual file verification

**Not standard pre-commit hooks** — No .husky/ directory detected

### Template Variable Replacement

**Pattern:** Simple string replacement with `{{variable}}` syntax — Confidence: 0.85

**Detected:** From `packages/cli/src/commands/setup.ts` (lines 216-220):
```typescript
// Replace variables (simple string replacement, not Handlebars)
const generated = template
  .replace(/\{\{projectName\}\}/g, projectName)
  .replace(/\{\{timestamp\}\}/g, timestamp)
  .replace(/\{\{version\}\}/g, cliVersion);
```

**Variables used in ENTRY.md template:**
- `{{projectName}}` — From package.json or directory name
- `{{timestamp}}` — Current ISO timestamp
- `{{version}}` — CLI version from package.json

**Not using Handlebars or other templating engine** — Plain JavaScript string replacement

### File Path Handling

**Pattern:** Node.js path module for cross-platform compatibility — Confidence: 0.90

**Detected:** From `packages/cli/src/utils/file-writer.ts` comment (lines 3-5):
```typescript
/**
 * Uses Node.js fs/promises for async operations.
 * All paths are normalized using path.join() for Windows/Mac/Linux compatibility.
```

**Convention:** Always use `path.join()` for path construction, never string concatenation

**Absolute vs relative:** Prefer absolute paths when possible to avoid cwd ambiguity

---

*Last updated: 2026-03-23*

**Coverage:** This file documents naming conventions (6 categories with real examples), import organization (4 patterns), code style (9 aspects with config files), and 12 additional conventions including git workflow, error handling, and tooling patterns. All conventions cite configuration files or real codebase examples.
