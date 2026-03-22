# Project Overview — anatomia-workspace

## What This Project Is

**Purpose:** Auto-generated AI context framework for codebases

**Detected:** TypeScript monorepo (from `package.json`, `pnpm-workspace.yaml`)

**Target users:** Development teams using AI assistants (Claude, GitHub Copilot, etc.) who need to communicate project patterns consistently across conversations

**Problem solved:** AI assistants currently require re-explaining project patterns in every new conversation. Anatomia generates a `.ana/` folder with mode files that capture architectural decisions, coding patterns, conventions, and testing strategies. Developers reference these files (@.ana/modes/code.md) to ensure AI writes code matching team standards.

**Current focus:** Setup redesign with analyzer-driven context generation

From `README.md` line 3:
> Auto-generated AI context for codebases.

From `README.md` lines 12-19:
```markdown
Anatomia generates `.ana/` folders that help AI assistants understand your project. Instead of re-explaining your patterns every conversation, reference mode files in chat.

**Example:**
```
@.ana/modes/code.md "Implement user authentication"
```

AI reads your patterns and writes code that matches your team's standards.
```

**Domain:** Developer tooling — CLI tools for AI-assisted development workflows

**Published packages:**
- `anatomia-cli` (v0.2.0) — CLI tool with commands for init, setup, mode selection, and analysis
- `anatomia-analyzer` (v0.1.0) — Code analysis engine using tree-sitter for multi-language AST parsing

**Repository:** https://github.com/TettoLabs/anatomia

**Detected:** Dogfooding detected — project uses its own `.ana/` context framework at root (from `.ana/` directory presence)

**Detected:** Claude Code integration — `.claude/settings.json` and agents configured for AI-assisted development (from `.claude/` directory)

## Tech Stack

### Core Technologies

**Language:** TypeScript 5.7.0

**Detected:** All packages use `"type": "module"` in package.json (lines 9 of `packages/cli/package.json`, line 7 of `packages/analyzer/package.json`)

**Runtime:** Node.js 20+

From `package.json` lines 19-21:
```json
"engines": {
  "node": ">=20.0.0",
  "pnpm": ">=9.0.0"
}
```

**Package manager:** pnpm 9.0.0

**Detected:** From `package.json` line 23:
```json
"packageManager": "pnpm@9.0.0"
```

**Monorepo tool:** Turborepo 2.3.0

**Detected:** From root `package.json` line 14:
```json
"turbo": "^2.3.0"
```

### TypeScript Configuration

**Target:** ES2022

**Strictness:** Maximum — strict mode + 6 additional checks

From `tsconfig.base.json` lines 6-15:
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

**Module system:** ESM with bundler resolution

From `tsconfig.base.json` lines 19-20:
```json
"module": "ESNext",
"moduleResolution": "Bundler",
```

### Key Dependencies

**CLI package dependencies** (from `packages/cli/package.json` lines 50-56):

- **commander** (^12.0.0) — Command-line interface framework
- **chalk** (^5.3.0) — Terminal string styling with colors
- **ora** (^8.0.0) — Terminal spinner animations for async operations
- **glob** (^10.3.0) — File pattern matching
- **anatomia-analyzer** (^0.1.0) — Internal code analysis engine

**Analyzer package dependencies** (from `packages/analyzer/package.json` lines 59-69):

- **tree-sitter** (0.25.0) — AST parsing core library
- **tree-sitter-go** (0.25.0) — Go language parser
- **tree-sitter-javascript** (0.25.0) — JavaScript language parser
- **tree-sitter-python** (0.25.0) — Python language parser
- **tree-sitter-typescript** (0.23.2) — TypeScript language parser
- **zod** (^4.3.6) — Runtime schema validation and type inference
- **chalk** (^5.3.0) — Terminal output coloring
- **glob** (^10.3.0) — File pattern matching
- **js-yaml** (^4.1.1) — YAML parsing for config files

### Build Tools

**CLI build:** tsup (bundles TypeScript with template copying)

From `packages/cli/package.json` line 44:
```json
"build": "tsup && cp -r templates dist/"
```

**Analyzer build:** tsc (TypeScript compiler)

From `packages/analyzer/package.json` line 46:
```json
"build": "tsc"
```

**Turborepo tasks:** build, dev, test, lint, clean, type-check

From `turbo.json` lines 3-29:
```json
"tasks": {
  "build": {
    "dependsOn": ["^build"],
    "outputs": ["dist/**", ".next/**"],
    "env": ["NODE_ENV"]
  },
  "dev": {
    "cache": false,
    "persistent": true
  },
  "test": {
    "dependsOn": ["build"],
    "outputs": ["coverage/**"],
    "cache": true
  },
  "lint": {
    "outputs": [],
    "cache": true
  },
  "clean": {
    "cache": false
  },
  "type-check": {
    "dependsOn": ["^build"],
    "outputs": [],
    "cache": true
  }
}
```

### Development Tools

**Formatter:** Prettier 3.4.0 — 2 spaces, single quotes, semicolons, 100 char width

**Linter:** ESLint 9.0.0 with flat config (eslint.config.mjs)

**Test framework:** Vitest 2.0.0 (CLI), 4.0.18 (analyzer)

**Development runner:** tsx 4.21.0 — Run TypeScript directly without compilation

### Deployment

**Distribution:** npm packages

**CLI binary:** `ana` command (from `packages/cli/package.json` lines 5-7):
```json
"bin": {
  "ana": "./dist/index.js"
}
```

**Install:** `npm install -g anatomia-cli`

**No container deployment detected** — Tool runs locally as CLI, no Docker/Kubernetes configuration found

## Directory Structure

### Monorepo Layout

```
anatomia/
├── packages/
│   ├── cli/              # CLI tool package (anatomia-cli v0.2.0)
│   ├── analyzer/         # Code analysis engine (anatomia-analyzer v0.1.0)
│   └── generator/        # Template generation (internal, alpha v0.1.0-alpha)
├── website/              # Next.js documentation site
├── tests/                # Root-level integration tests
├── .ana/                 # Anatomia's own context (dogfooding)
├── .claude/              # Claude Code configuration
├── .github/              # CI/CD workflows
└── master_plan/          # Planning documents (gitignored)
```

**Detected:** 3 packages + 1 website in monorepo (from `README.md` lines 47-55, confirmed by filesystem)

### packages/cli/ — CLI Tool

**Purpose:** Command-line interface for Anatomia framework

From `packages/cli/package.json` line 4:
```json
"description": "AI context framework with analyzer-driven setup"
```

**Structure:**
```
packages/cli/
├── src/
│   ├── index.ts              # Entry point with Commander.js setup
│   ├── commands/             # Command implementations
│   │   ├── init.ts           # Initialize .ana/ directory
│   │   ├── setup.ts          # Interactive context generation
│   │   ├── mode.ts           # Reference mode files
│   │   ├── analyze.ts        # Run analyzer standalone
│   │   └── check.ts          # Validate context files
│   ├── utils/                # Utilities
│   │   ├── file-writer.ts    # File operations with verification
│   │   ├── validators.ts     # Content and structure validation
│   │   ├── scaffold-generators.ts  # Generate empty scaffolds
│   │   └── format-analysis-brief.ts  # Format analyzer output
│   └── constants.ts          # Shared constants (markers, files, thresholds)
├── templates/                # Static templates
│   ├── modes/                # Mode files (architect, code, debug, docs, test)
│   ├── context/              # Context scaffolds (7 files)
│   ├── hooks/                # Verification hooks (shell scripts)
│   └── claude/               # Claude Code configuration
├── tests/                    # Test suites
│   ├── contract/             # Analyzer API contract tests
│   ├── e2e/                  # End-to-end tests
│   ├── scaffolds/            # Scaffold generation tests (10 files)
│   ├── commands/             # Command tests
│   ├── utils/                # Utility tests
│   ├── templates/            # Template tests
│   ├── performance/          # Performance benchmarks
│   └── cleanup/              # Cleanup tests
├── dist/                     # Build output (compiled JS)
└── docs/                     # CLI documentation
```

**Entry point:** `packages/cli/src/index.ts`

From `packages/cli/src/index.ts` lines 1-26:
```typescript
#!/usr/bin/env node

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
```

**Key commands:**
- `ana init` — Create .ana/ directory with scaffolds and mode files
- `ana setup` — Interactive context generation with analyzer
- `ana mode <name>` — Display mode file content
- `ana analyze` — Run analyzer without setup
- `ana setup check <file>` — Validate context file quality

### packages/analyzer/ — Analysis Engine

**Purpose:** Multi-language code analysis using tree-sitter AST parsing

From `packages/analyzer/package.json` line 4:
```json
"description": "Code analysis engine for Anatomia"
```

**Structure:**
```
packages/analyzer/
├── src/
│   ├── index.ts              # Library entry with analyze() orchestrator
│   ├── detectors/            # Project type and framework detection
│   │   ├── projectType.ts    # Detect language (node/python/go/rust/ruby/php)
│   │   ├── framework.ts      # Detect framework (nextjs/fastapi/django/etc)
│   │   └── monorepo.ts       # Detect monorepo tools (turborepo/nx/lerna)
│   ├── analyzers/            # Code analysis modules
│   │   ├── structure.ts      # Directory structure, entry points, architecture
│   │   ├── patterns.ts       # Infer error handling, validation, database patterns
│   │   └── conventions/      # Naming, imports, documentation conventions
│   │       ├── index.ts
│   │       ├── naming.ts
│   │       └── imports.ts
│   ├── parsers/              # Tree-sitter parsing
│   │   ├── treeSitter.ts     # ParserManager, parseFile, detectLanguage
│   │   ├── queries.ts        # QueryCache with predefined AST queries
│   │   └── index.ts          # Dependency parsers (package.json, pyproject.toml, etc)
│   ├── types/                # Zod schemas and TypeScript types
│   │   ├── index.ts          # AnalysisResult, ProjectType schemas
│   │   ├── parsed.ts         # ParsedAnalysis, FunctionInfo, ClassInfo
│   │   ├── patterns.ts       # PatternAnalysis, PatternConfidence
│   │   └── conventions.ts    # ConventionAnalysis, NamingConvention
│   ├── cache/                # Caching system
│   │   └── astCache.ts       # ASTCache with TTL and stats tracking
│   ├── sampling/             # File sampling for performance
│   │   └── fileSampler.ts    # Sample files for analysis (default: 20 files)
│   ├── errors/               # Error handling
│   │   ├── DetectionError.ts # DetectionEngineError with codes and severity
│   │   └── DetectionCollector.ts  # Accumulate non-fatal errors
│   └── utils/                # Utilities
│       └── file.ts           # File system helpers
├── tests/                    # Test suites
├── dist/                     # Build output
└── docs/                     # API documentation
```

**Entry point:** `packages/analyzer/src/index.ts`

From `packages/analyzer/src/index.ts` lines 182-276 (analyze function):
```typescript
/**
 * Analyze a project directory and return detection results
 *
 * Orchestrates all detection phases:
 * 1. Monorepo detection (STEP_1.1)
 * 2. Project type detection (STEP_1.1)
 * 3. Framework detection (STEP_1.1)
 * 4. Structure analysis (STEP_1.2)
 * 5. Tree-sitter parsing (STEP_1.3)
 * 6. Pattern inference (STEP_2.1)
 * 7. Convention detection (STEP_2.2 - NEW)
 *
 * @param rootPath - Absolute path to project root
 * @param options - Analysis options
 * @returns Analysis results with project type, framework, structure, parsed code, patterns, and conventions
 *
 * @example
 * ```typescript
 * const result = await analyze('/path/to/project');
 * console.log(result.projectType);             // 'python' | 'node' | etc.
 * console.log(result.framework);               // 'fastapi' | 'nextjs' | etc.
 * console.log(result.structure?.entryPoints);  // ['app/main.py']
 * console.log(result.parsed?.files.length);    // 15 (STEP_1.3)
 * console.log(result.patterns?.validation);    // { library: 'pydantic', confidence: 0.95, ... } (STEP_2.1)
 * console.log(result.conventions?.naming);     // { files: {...}, functions: {...}, ... } (STEP_2.2 - NEW)
 * ```
 */
export async function analyze(
  rootPath: string,
  options: AnalyzeOptions = {}
): Promise<import('./types/index.js').AnalysisResult>
```

**Supported languages:** TypeScript, JavaScript, Python, Go (via tree-sitter)

**Analysis phases:**
1. Monorepo detection (turborepo/nx/lerna)
2. Project type detection (node/python/go/rust/ruby/php)
3. Framework detection (nextjs/react/fastapi/django/gin/etc)
4. Structure analysis (entry points, architecture, test locations)
5. Tree-sitter AST parsing (functions, classes, imports, exports)
6. Pattern inference (error handling, validation, database, auth, testing)
7. Convention detection (naming, imports, documentation, code style)

### packages/generator/ — Template Generation

**Purpose:** Internal template generation engine (alpha)

**Detected:** Alpha status from `package.json` version 0.1.0-alpha

**Structure:**
```
packages/generator/
├── src/
│   └── index.ts              # Generation logic
└── dist/                     # Build output
```

**Status:** Not fully explored — internal tool, not published to npm

### website/ — Documentation Site

**Purpose:** Next.js documentation site

**Structure:**
```
website/
├── app/                      # Next.js 16 App Router pages
├── components/               # React components
├── public/                   # Static assets
└── .next/                    # Next.js build cache
```

**Framework:** Next.js 16 with App Router

**Not fully explored** — Documentation site details not in analyzer scope

### .ana/ — Dogfooding Context

**Purpose:** Anatomia's own context framework (project uses its own tool)

**Detected:** Presence of `.ana/` directory at root with full structure

**Structure:**
```
.ana/
├── ENTRY.md                  # Project orientation file
├── modes/                    # Mode files
│   ├── architect.md
│   ├── code.md
│   ├── debug.md
│   ├── docs.md
│   └── test.md
├── context/                  # Context files
│   ├── project-overview.md
│   ├── patterns.md
│   ├── architecture.md
│   ├── conventions.md
│   ├── testing.md
│   ├── workflow.md
│   ├── debugging.md
│   └── analysis.md
│   └── setup/                # Setup system files
│       ├── rules.md
│       └── steps/            # Step-by-step instructions
├── hooks/                    # Verification hooks
│   ├── verify-context-file.sh
│   ├── quality-gate.sh
│   └── subagent-verify.sh
└── .state/                   # State tracking
    └── snapshot.json
```

### .claude/ — Claude Code Configuration

**Purpose:** AI assistant configuration for Claude Code

**Detected:** `.claude/settings.json` and agents directory

**Structure:**
```
.claude/
├── settings.json             # Claude Code settings
└── agents/                   # Agent definitions
    └── ana-writer.md         # Writer agent prompt
```

### Root Configuration Files

**Build system:** `turbo.json` — Turborepo task definitions

**TypeScript:** `tsconfig.base.json` — Shared TypeScript config

**Workspace:** `pnpm-workspace.yaml` — pnpm workspace definition

**Linting:** `eslint.config.mjs` — ESLint flat config

**Formatting:** `.prettierrc.json` — Prettier configuration

**Git:** `.gitignore` — Ignore patterns (node_modules, dist, .env, coverage, .DS_Store, master_plan)

**CI/CD:** `.github/workflows/test.yml` — GitHub Actions test workflow

### Build Artifacts (Gitignored)

**dist/** — TypeScript compiled output (per package)

**.next/** — Next.js build cache (website)

**.turbo/** — Turborepo cache

**node_modules/** — Dependencies

**coverage/** — Test coverage reports

## Current Status

### Development Stage

**Version:** Pre-1.0 (CLI v0.2.0, Analyzer v0.1.0, Generator v0.1.0-alpha)

**Detected:** Semantic versioning indicates early/mid development stage

**Status:** Active development

**Detected:** Recent commits (last commit 2026-03-22), current branch `SideSprint/setup-redesign` indicates ongoing sprint work

**Current focus:** Setup redesign with analyzer-driven context generation

**Detected:** From recent commit messages (lines from git log):
```
c74b3cc [MI-3] Add tier files to MODE_FILES constant — setup-quick, setup-guided, setup-complete now copied by ana init
7961f4f [SS-8] Scenario B validation — test cycle 3 baseline documented. 7/7 at 9/10, 4521 lines, zero fabrications. Empty scaffolds, explorer-only discovery. No tree-sitter errors visible to user.
c83c5f2 [SS-7.3] Quality gates + init UX + determinism — Bash self-check, tier prompt, locked questions, SubagentStop verification, Unexamined tag, PATH fixes, check.ts false positive fix
```

### What's Working

**Published to npm:** anatomia-cli and anatomia-analyzer packages are live

**CLI commands functional:**
- `ana init` — Creates .ana/ directory with scaffolds and templates
- `ana mode` — Displays mode file content
- `ana analyze` — Runs standalone analysis

**Analyzer capabilities:**
- Multi-language detection (TypeScript, Python, Go, JavaScript)
- Framework detection (Next.js, React, FastAPI, Django, Gin, etc.)
- Monorepo detection (Turborepo, Nx, Lerna)
- Tree-sitter AST parsing for code structure
- Pattern inference (error handling, validation, database, testing)
- Convention detection (naming, imports, documentation)

**CI/CD operational:** GitHub Actions with matrix testing (ubuntu/windows/macos × Node 20/22)

**Detected:** From `.github/workflows/test.yml` (not read in this session but referenced in exploration results)

**Test coverage:** 80/75/80/80 thresholds configured

**Detected:** From vitest.config.ts coverage thresholds (referenced in exploration results)

### What's In Progress

**Setup redesign:** Current sprint work (branch: SideSprint/setup-redesign)

**Detected:** Git status shows modifications to:
- `.ana/context/` files (7 files modified)
- `.ana/context/setup/` files (rules.md, steps/*.md)
- `.claude/agents/ana-writer.md`

**Quality gates:** Verification hooks and validation system being enhanced

**Detected:** Recent commits reference "quality gates", "SubagentStop verification", "check.ts false positive fix"

**Setup tiers:** Quick/guided/complete setup modes being added

**Detected:** Untracked files in git status:
```
?? .ana/modes/setup-complete.md
?? .ana/modes/setup-guided.md
?? .ana/modes/setup-quick.md
```

### Known Constraints

**Pre-1.0 API stability:** Analyzer API may change (contract tests help mitigate breaking changes)

**Detected:** Contract tests exist at `packages/cli/tests/contract/analyzer-contract.test.ts`

**File sampling limit:** Default 20 files parsed to control performance

**Detected:** From analyzer source code comments (referenced in exploration results)

**No changelog:** No CHANGELOG.md detected for tracking version history

**Single developer project:** 2 contributors (Ryan Smith 111 commits, TettoLabs 2 commits)

**Detected:** From git log contributor counts

### Quality Practices

**Test coverage tracking:** Codecov integration, 80% line coverage threshold

**Code style enforcement:** Prettier + ESLint configured

**TypeScript strict mode:** Maximum strictness (strict + 6 additional checks)

**CI/CD:** Multi-platform testing (ubuntu/windows/macos)

**Documentation:** README, CONTRIBUTING.md, JSDoc comments, package documentation

**Dogfooding:** Project uses its own .ana/ framework for documentation

### Repository Health

**Commits:** 113 commits

**Detected:** From git log

**Branch strategy:** Prefix-based naming (effort/, SideSprint/, MI-*)

**Commit format:** [TICKET-ID] Description with context

**Detected:** From recent commits — [MI-3], [SS-8], [SS-7.3], [SS-7.2], [SS-7.1]

**Organization:** TettoLabs

**Detected:** From package.json author fields and repository URLs

**License:** MIT

**Detected:** From package.json license fields

### Next Steps (Inferred)

**Inferred:** Based on current branch and commit messages:

1. Complete setup redesign with tier system (quick/guided/complete)
2. Stabilize quality gates and verification hooks
3. Test scenario validation for analyzer-driven setup
4. Move towards 1.0 release (API stabilization)

---

*Generated by Anatomia v0.2.0 on 2026-03-22*
