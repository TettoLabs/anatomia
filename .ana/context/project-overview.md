# Project Overview — Anatomia

## What This Project Is

**User confirmed:** CLI tool for generating AI context files from codebase analysis

**Target users:** **User confirmed:** Developers using AI coding assistants who want consistent AI-generated code matching team standards

**Problem solved:** Eliminates the need to re-explain codebase patterns, conventions, and architecture in every AI conversation. Instead, developers reference structured mode files that persist project knowledge.

**Detected:** From `README.md` (lines 11-19):
> Anatomia generates `.ana/` folders that help AI assistants understand your project. Instead of re-explaining your patterns every conversation, reference mode files in chat.
>
> **Example:**
> ```
> @.ana/modes/code.md "Implement user authentication"
> ```
>
> AI reads your patterns and writes code that matches your team's standards.

**Current focus:** Building a comprehensive code analysis engine with tree-sitter AST parsing and multi-language support (TypeScript, Python, Go, Rust, Ruby, PHP). The analyzer package drives automated setup, while the CLI provides user-facing commands.

**Detected:** Published as `anatomia-cli` on npm (from `packages/cli/package.json` line 2). Version 0.2.0 indicates early but active development.

## Tech Stack

### Core Technologies

**Detected:** From `package.json` (line 23):
```json
"packageManager": "pnpm@9.0.0"
```

**Detected:** From `package.json` (lines 19-21):
```json
"engines": {
  "node": ">=20.0.0",
  "pnpm": ">=9.0.0"
}
```

**Language:** TypeScript 5.7.0 with strict mode + extra checks (all packages use ESM)

**Detected:** From `tsconfig.base.json` (lines 6-15):
```json
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

**Runtime:** Node.js 20+ (ES2022 target)

**Build orchestration:** Turborepo 2.3.0 + pnpm 9.0.0 workspaces

**Detected:** From `turbo.json` (lines 4-29) — Task pipeline with build dependencies, caching for test/lint/type-check, persistent dev mode.

### Monorepo Architecture

**Detected:** From `pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
  - 'website'
```

**Structure:** 3 packages + documentation website

1. **anatomia-cli** (v0.2.0) — Main CLI tool published to npm
2. **anatomia-analyzer** (v0.1.0) — Code analysis engine (library)
3. **anatomia-generator** (alpha) — Template generation (minimal implementation)

**Detected:** Internal dependencies use `workspace:*` protocol (from `packages/cli/package.json` line 51):
```json
"anatomia-analyzer": "workspace:*"
```

### CLI Package Dependencies

**Detected:** From `packages/cli/package.json` (lines 50-56):
```json
"dependencies": {
  "anatomia-analyzer": "workspace:*",
  "chalk": "^5.3.0",
  "commander": "^12.0.0",
  "glob": "^10.3.0",
  "ora": "^8.0.0"
}
```

- **commander** (12.0.0) — CLI framework for command parsing and help generation
- **chalk** (5.3.0) — Terminal color formatting for user-facing output
- **ora** (8.0.0) — Spinner UI for long-running operations
- **glob** (10.3.0) — File pattern matching for template discovery

**Build tool:** tsup 8.0.0 (fast TypeScript bundler for Node.js)

**Detected:** From `packages/cli/package.json` (line 44):
```json
"build": "tsup && cp -r templates dist/"
```

### Analyzer Package Dependencies

**Detected:** From `packages/analyzer/package.json` (lines 59-65):
```json
"dependencies": {
  "chalk": "^5.3.0",
  "glob": "^10.3.0",
  "js-yaml": "^4.1.1",
  "web-tree-sitter": "0.25.10",
  "zod": "^4.3.6"
}
```

- **web-tree-sitter** (0.25.10) — WASM-based AST parsing for accurate code analysis
- **zod** (4.3.6) — Runtime validation for all analyzer output types
- **js-yaml** (4.1.1) — YAML parsing for dependency files (go.mod, .gitlab-ci.yml, etc.)
- **glob** (10.3.0) — File discovery for analysis

**Detected:** From `packages/analyzer/package.json` (lines 66-71):
```json
"optionalDependencies": {
  "tree-sitter-go": "0.25.0",
  "tree-sitter-javascript": "0.25.0",
  "tree-sitter-python": "0.25.0",
  "tree-sitter-typescript": "0.23.2"
}
```

**Inferred:** Optional dependencies avoid hard failures when C++ compiler is unavailable. Analyzer gracefully degrades if tree-sitter parsers fail to install.

**Build tool:** TypeScript compiler (tsc) with incremental compilation

**Detected:** From `packages/analyzer/package.json` (line 46):
```json
"build": "tsc"
```

### Testing Stack

**Framework:** Vitest 2.0.0 (CLI) / 4.0.18 (analyzer)

**Coverage:** v8 provider with strict thresholds (85% lines, 80% branches, 85% functions/statements)

**Detected:** Comprehensive test organization with 64 test files across packages (unit, integration, contract, E2E, performance, benchmarks).

### Development Tools

**Linter:** ESLint 10.1.0 with TypeScript plugin and JSDoc plugin

**Formatter:** Prettier 3.4.0 (2 spaces, single quotes, 100 char line length, ES5 trailing commas)

**CI/CD:** GitHub Actions with multi-platform testing (Linux/Mac/Windows × Node 20/22)

## Directory Structure

### Root Structure

```
anatomia/
├── packages/              # Monorepo packages
│   ├── cli/              # Main CLI tool (anatomia-cli v0.2.0)
│   ├── analyzer/         # Code analysis engine (anatomia-analyzer v0.1.0)
│   └── generator/        # Template generation (alpha, minimal code)
├── website/              # Documentation site (Next.js)
├── tests/                # Shared/integration tests
├── master_plan/          # Project planning artifacts (gitignored)
├── .ana/                 # Self-hosting: Anatomia context for itself
├── .github/workflows/    # CI/CD (test.yml)
├── turbo.json            # Monorepo build orchestration
├── pnpm-workspace.yaml   # Workspace configuration
└── tsconfig.base.json    # Shared TypeScript config
```

### Package: CLI (packages/cli/)

**Entry point:** `src/index.ts` — Commander.js CLI with 4 commands

**Detected:** From `packages/cli/package.json` (lines 5-6):
```json
"bin": {
  "ana": "./dist/index.js"
}
```

**Detected:** From `packages/cli/src/index.ts` (lines 15-32):
```typescript
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { modeCommand } from './commands/mode.js';
import { analyzeCommand } from './commands/analyze.js';
import { setupCommand } from './commands/setup.js';

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

**Key directories:**
- **src/commands/** — Command implementations (init, setup, analyze, mode, check, index)
- **src/utils/** — Helpers (validators, file-writer, scaffold-generators)
- **templates/** — Template files (modes/, context/, ENTRY.md, hooks/, agents/)
- **tests/** — Vitest test suite (contract, scaffolds, commands, e2e, performance)

**Build output:** `dist/` — Bundled JavaScript + templates directory

### Package: Analyzer (packages/analyzer/)

**Entry point:** `src/index.ts` — Public API with type exports and orchestration functions

**Detected:** From `packages/analyzer/src/index.ts` (lines 1-12):
```typescript
/**
 * @anatomia/analyzer
 * Code analysis engine for Anatomia CLI
 *
 * Detects project type, framework, and structure from codebase.
 *
 * Implementation status:
 * - CP0: Types and infrastructure ✓
 * - CP1: Dependency parsers (planned)
 * - CP2: Framework detection (planned)
 * - CP3: Edge case handling (planned)
 * - CP4: CLI integration (planned)
 */
```

**Key directories:**
- **src/analyzers/** — Structure, patterns, conventions analysis
- **src/detectors/** — Project type, framework, monorepo detection
- **src/parsers/** — Tree-sitter parsers, dependency file parsers (node/, python/, go/, php/, ruby/, rust/)
- **src/cache/** — AST caching layer (in-memory)
- **src/types/** — Zod schemas and TypeScript types
- **src/errors/** — Error handling (DetectionError, DetectionCollector)
- **src/utils/** — File utilities
- **tests/** — Comprehensive test suite with fixtures for each language

**Build output:** `dist/` — Compiled JavaScript + type declarations

### Package: Generator (packages/generator/)

**Status:** Alpha stage, minimal implementation (497 bytes in index.ts)

**Inferred:** Reserved for future template generation features. Not yet integrated into main workflow.

### Website (website/)

**Purpose:** Documentation site (not documented in exploration; minimal evidence)

**Detected:** From root structure listing, appears to be a Next.js site based on turbo.json outputs configuration (`.next/**`).

### Self-Hosting Context

**Detected:** `.ana/` directory in root — Anatomia uses its own context system for development (dogfooding).

**Contents:**
- **context/** — Project patterns, conventions, architecture documentation
- **modes/** — Task-specific mode files (code, debug, architect, etc.)
- **.state/** — Setup state and validation results
- **hooks/** — Custom validation and workflow hooks

## Current Status

### Development Stage

**Detected:** Version 0.2.0 (pre-1.0, early but stable API)

**User confirmed:** Deliberate architecture with planned roadmap (STEP_* branches), professional tooling choices made upfront

**Detected:** From git history — 135 commits over 2 months (Jan 19 - Mar 24, 2026). High commit velocity (~2 commits/day average).

**Detected:** From git branch structure — Feature branches use structured naming:
- `effort/STEP_*` for planned work (11 branches)
- `SideSprint/*` for urgent fixes (1 branch)
- `ux/*` for UX improvements (1 branch)

**Inferred:** Structured branch naming suggests multi-phase roadmap with clear milestones.

### What's Working

**Detected:** Core functionality implemented and tested:

1. **Project detection** — Language, framework, project type detection with confidence scoring
2. **Structure analysis** — Directory tree generation with purpose annotations
3. **Dependency parsing** — Multi-language dependency extraction (Node, Python, Go, Rust, Ruby, PHP)
4. **Pattern detection** — Error handling, validation, testing patterns
5. **CLI commands** — `ana init`, `ana analyze`, `ana mode`, `ana setup check`, `ana setup complete`
6. **Template system** — Mode files and context scaffolds with variable substitution
7. **Validation** — Multi-phase validator with blocking/warning separation
8. **AST parsing** — Tree-sitter integration with in-memory caching

**Detected:** Test coverage enforced at 85% lines, 80% branches (from `packages/analyzer/vitest.config.ts`). 64 test files include unit, integration, contract, E2E, and performance tests.

**Detected:** Multi-platform CI passing on Linux/Mac/Windows × Node 20/22 (from `.github/workflows/test.yml`).

### What's In Progress

**Detected:** From analyzer comments (CP1-CP4 planned):
- Dependency parser enhancements (CP1)
- Framework detection improvements (CP2)
- Edge case handling (CP3)
- Full CLI integration (CP4)

**Inferred:** Generator package at alpha stage suggests template generation features are planned but not complete.

**Detected:** From git activity — Recent commits focus on:
- Hook system implementation (SubagentStop, verification hooks)
- Setup redesign with sub-agent architecture
- WASM migration for tree-sitter
- Symbol indexing
- Explorer agent directory exclusions

### Known Issues and Limitations

**User confirmed:** Key debugging areas identified:
1. WASM memory management in tree-sitter (manual `.delete()` calls required)
2. Setup verification complexity (multi-phase validators, SubagentStop hook loops)
3. ESM import path confusion (.js extensions for .ts files)
4. Framework detection edge cases (multiple frameworks cause low confidence)

**Detected:** From Q&A trade-off review:
- **Intentional:** No file size limits (user confirmed)
- **Intentional:** No symlink protection (user confirmed)
- **Intentional:** AST cache in memory only (user confirmed)
- **For review:** No timeout on parsing (user flagged)
- **For review:** No input sanitization on CLI args (user flagged)

**Inferred:** Tool is designed for local development use, not web-facing or untrusted input scenarios. Security trade-offs favor simplicity and performance over defense-in-depth.

### Maturity Indicators

**High quality for early stage:**
- Strict TypeScript with all recommended checks enabled
- Zod runtime validation for all analyzer outputs
- Comprehensive test coverage with multiple test types
- Professional monorepo tooling (Turborepo, pnpm)
- Multi-platform CI/CD
- Self-documenting code (JSDoc on public APIs)
- Self-hosting (uses own .ana/ context)

**Active development:**
- Small team (2 contributors: Ryan Smith, TettoLabs)
- Frequent merge commits (10 in last 20 commits) suggest PR-based workflow
- Recent focus on architectural improvements (hooks, agents, WASM)

**Planned evolution:**
- Structured roadmap (STEP_* branches)
- master_plan/ directory (gitignored, contains planning artifacts)
- Comment references to design docs (START_HERE.md, etc.)

### Publishing Status

**Detected:** Published to npm as two packages:
1. **anatomia-cli** — Main user-facing tool (v0.2.0)
2. **anatomia-analyzer** — Reusable analysis engine (v0.1.0)

**User confirmed:** Manual npm publishing process (build locally, bump version, publish manually). No automated release pipeline.

**Detected:** From `packages/cli/package.json` (lines 38-42):
```json
"files": [
  "dist",
  "templates",
  "docs"
]
```

**Inferred:** Published packages include compiled code, templates, and documentation. Source code excluded from npm bundle.

---

*Generated by Anatomia v0.2.0 on 2026-03-24*
