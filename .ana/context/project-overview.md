# Project Overview — anatomia-workspace

## What This Project Is

**Purpose:** Anatomia generates `.ana/` context directories that help AI assistants understand project patterns without repeated explanation. Instead of re-describing architecture in every conversation, developers reference mode files (architect, code, debug, docs, test) that combine project-specific patterns with task-specific guidance.

**Target users:** User confirmed: YC founders and vibe coders with AI-built MVPs who need their AI assistant to understand patterns they didn't consciously choose.

**Domain:** Developer tooling for AI-assisted development — specifically context generation and codebase analysis.

**Current focus:** Self-dogfooding the setup redesign (SideSprint/setup-redesign branch) to improve the orchestrated setup process with better citation verification, Q&A validation, and writer agent quality gates.

**Detected:** Monorepo TypeScript CLI tool with tree-sitter powered static analysis engine (from `package.json`, `pnpm-workspace.yaml`, and analyzer package dependencies).

User confirmed: Anatomia generates .ana/ context files so AI assistants understand project patterns without repeated explanation.

## Tech Stack

### Core Technologies

**Detected:** From root `package.json` (lines 19-23):
```json
"engines": {
  "node": ">=20.0.0",
  "pnpm": ">=9.0.0"
},
"packageManager": "pnpm@9.0.0"
```

**Language:** TypeScript 5.7.0 with strict mode + 6 additional checks enabled

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

**Runtime:** Node.js ≥20.0.0 (required for ESM, modern V8 features)

**Package manager:** pnpm 9.0.0+ with workspace support

**Monorepo orchestration:** Turborepo 2.3.0 with dependency graph and incremental builds

**Detected:** From `turbo.json` (lines 4-8):
```json
"build": {
  "dependsOn": ["^build"],
  "outputs": ["dist/**", ".next/**"],
  "env": ["NODE_ENV"]
},
```

### Package-Specific Stack

**CLI Package (anatomia-cli v0.2.0):**

**Detected:** From `packages/cli/package.json` (lines 50-55):
```json
"dependencies": {
  "anatomia-analyzer": "^0.1.0",
  "chalk": "^5.3.0",
  "commander": "^12.0.0",
  "glob": "^10.3.0",
  "ora": "^8.0.0"
```

- **Build tool:** tsup 8.0.0 (ESM bundler for Node 20 target)
- **CLI framework:** Commander 12.0.0 (command parser with async action support)
- **Terminal UI:** chalk 5.3.0 (colors), ora 8.0.0 (spinners)
- **File matching:** glob 10.3.0
- **Testing:** Vitest 2.0.0 with 80% coverage threshold

**Build process note:** Custom post-build step copies templates to dist/

**Detected:** From `packages/cli/package.json` (line 44):
```json
"build": "tsup && cp -r templates dist/",
```

User stated: Key pain points are tree-sitter native module loading across platforms, tsup template copy failures, and framework detection disambiguation. (Tsup template copy can fail, wiping templates if copy step errors out.)

**Analyzer Package (anatomia-analyzer v0.1.0):**

**Detected:** From `packages/analyzer/package.json` (lines 59-69):
```json
"dependencies": {
  "chalk": "^5.3.0",
  "glob": "^10.3.0",
  "js-yaml": "^4.1.1",
  "tree-sitter": "0.25.0",
  "tree-sitter-go": "0.25.0",
  "tree-sitter-javascript": "0.25.0",
  "tree-sitter-python": "0.25.0",
  "tree-sitter-typescript": "0.23.2",
  "zod": "^4.3.6"
}
```

- **Build tool:** tsc (TypeScript compiler with declaration files)
- **Static analysis:** tree-sitter 0.25.0 with language grammars for TypeScript, JavaScript, Python, Go
- **Validation:** Zod 4.3.6 (runtime schema validation)
- **Config parsing:** js-yaml 4.1.1
- **Testing:** Vitest 4.0.18 with 85% coverage threshold

User stated: Tree-sitter native module loading breaks on certain Node versions and platforms.

**Website Package (demo-site v0.1.0):**

**Detected:** From `website/package.json` (lines 11-18):
```json
"dependencies": {
  "lucide-react": "^0.562.0",
  "motion": "^12.26.2",
  "next": "16.1.1",
  "next-themes": "^0.4.6",
  "react": "19.2.3",
  "react-dom": "19.2.3"
}
```

- **Framework:** Next.js 16.1.1 (App Router)
- **UI library:** React 19.2.3
- **Styling:** Tailwind CSS 4
- **Animation:** Framer Motion 12.26.2 (via "motion" package)
- **Icons:** lucide-react 0.562.0
- **Theming:** next-themes 0.4.6

### Development Tools

**Code quality:**
- ESLint 9.0.0 with flat config + TypeScript rules
- Prettier 3.4.0 (2-space indent, single quotes, ES5 trailing commas, 100-char line width)
- Vitest for testing with V8 coverage provider

**Detected:** From `.prettierrc.json` in project root (verified via exploration results):
- Indentation: 2 spaces
- Semicolons: required
- Quotes: single quotes
- Trailing commas: ES5
- Line width: 100 characters

**CI/CD:**
- GitHub Actions with matrix testing (3 OS × 2 Node versions = 6 combinations)
- Coverage upload to Codecov (Ubuntu + Node 20 only)

**Detected:** From exploration results (lines 314-318):
```
Matrix testing: 3 OS (Ubuntu, Windows, macOS) × 2 Node versions (20, 22) = 6 combinations — Confidence: 1.0
Fail-fast disabled (run all combinations) — Confidence: 0.95
Coverage upload to Codecov (Ubuntu + Node 20) — Confidence: 0.9
Triggers: push to main/staging/effort/*, PRs to main/staging — Confidence: 0.9
```

## Directory Structure

### Workspace Root

```
anatomia/
├── packages/          # Monorepo packages (cli, analyzer, generator)
├── website/           # Next.js documentation site
├── tests/             # Possibly integration tests (not explored in detail)
├── .github/           # CI/CD workflows (test.yml)
├── .ana/              # Self-dogfooding context directory
├── .claude/           # Claude Code settings
├── master_plan/       # Planning documents (excluded from git)
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── package.json
└── README.md
```

**Detected:** Workspace packages defined in `pnpm-workspace.yaml` (lines 1-3):
```yaml
packages:
  - 'packages/*'
  - 'website'
```

**Monorepo rationale:** User confirmed: Separation of concerns so analyzer can be reused as standalone npm package by other tools.

### Package: CLI (anatomia-cli)

**Purpose:** Command-line interface for generating .ana/ context directories.

```
packages/cli/
├── src/
│   ├── commands/       # Command implementations
│   │   ├── init.ts     # Initialize .ana/ directory (9-phase orchestrator)
│   │   ├── setup.ts    # Interactive setup process (orchestrator + agents)
│   │   ├── analyze.ts  # Run analyzer and show results
│   │   ├── mode.ts     # Print mode file contents
│   │   └── check.ts    # Verify citation quality in setup output
│   ├── utils/          # Shared utilities
│   │   ├── file-writer.ts         # File writing with error handling
│   │   ├── validators.ts          # Project name and file validation
│   │   ├── scaffold-generators.ts # Generate scaffold content for context files
│   │   └── analysis-helpers.ts    # Analysis result processing
│   ├── index.ts        # CLI entry point (Commander program)
│   └── constants.ts    # Shared constants (MODE_FILES, SETUP_FILES, etc.)
├── templates/          # Template files for .ana/ generation
│   ├── modes/          # 7 mode files (architect, code, debug, docs, test, general, setup)
│   ├── context/setup/  # Setup process templates (steps/, rules.md, tier files)
│   └── ENTRY.md        # Entry point template
├── tests/              # Vitest test files
│   ├── scaffolds/      # Scaffold generator tests
│   ├── commands/       # Command tests
│   ├── e2e/            # End-to-end tests
│   └── contract/       # Analyzer contract tests
└── dist/               # Build output (tsup + copied templates)
```

**Entry point:** `src/index.ts` → bin command `ana`

**Detected:** From `packages/cli/src/index.ts` (lines 1-26):
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

**Available commands:**
- `ana init` — Initialize .ana/ directory with scaffolds
- `ana setup` — Interactive setup with orchestrator and agents
- `ana analyze` — Run analyzer and display results
- `ana mode <name>` — Print mode file contents
- `ana setup check` — Verify citation quality (current development focus)

### Package: Analyzer (anatomia-analyzer)

**Purpose:** Code analysis engine for detecting project type, framework, structure, patterns, and conventions.

```
packages/analyzer/
├── src/
│   ├── detectors/      # Project type and framework detection
│   │   ├── projectType.ts  # Detect language from manifest files
│   │   ├── framework.ts    # Detect framework from dependencies
│   │   └── monorepo.ts     # Detect monorepo tools
│   ├── analyzers/      # Structure, pattern, and convention analysis
│   │   ├── structure.ts    # Directory structure, entry points, architecture
│   │   ├── patterns.ts     # Pattern inference from dependencies + code
│   │   └── conventions/    # Naming, imports, formatting conventions
│   ├── parsers/        # Dependency file parsers + tree-sitter integration
│   │   ├── treeSitter.ts   # AST parsing orchestrator
│   │   ├── queries.ts      # Tree-sitter query definitions
│   │   └── index.ts        # Dependency manifest parsers (package.json, pyproject.toml, etc.)
│   ├── types/          # TypeScript type definitions with Zod schemas
│   │   ├── index.ts        # AnalysisResult, ProjectType, etc.
│   │   ├── patterns.ts     # PatternAnalysis, MultiPattern
│   │   ├── conventions.ts  # ConventionAnalysis, NamingConvention
│   │   └── parsed.ts       # ParsedFile, FunctionInfo, ClassInfo
│   ├── errors/         # Custom error classes and collection
│   │   ├── DetectionError.ts  # Structured error with code, severity, suggestion
│   │   └── DetectionCollector.ts # Collect multiple errors during analysis
│   ├── cache/          # AST caching system
│   │   └── astCache.ts     # Cache parsed trees to avoid re-parsing
│   ├── sampling/       # File sampling utilities
│   │   └── fileSampler.ts  # Smart file sampling for large projects
│   ├── utils/          # File system and utility functions
│   └── index.ts        # Public API exports + analyze() orchestrator
├── tests/              # Vitest test files
│   ├── analyzers/      # Feature tests by analyzer type
│   ├── cache/          # Cache system tests
│   ├── integration/    # Integration tests
│   └── performance/    # Performance tests
└── dist/               # Build output (tsc with declaration files)
```

**Entry point:** `src/index.ts` → exports `analyze()` function and all public APIs

**Detected:** From `packages/analyzer/src/index.ts` (lines 182-185):
```typescript
export async function analyze(
  rootPath: string,
  options: AnalyzeOptions = {}
): Promise<import('./types/index.js').AnalysisResult> {
```

**Analysis phases (orchestrated by `analyze()`):**
1. Monorepo detection (optional, skipped by default)
2. Project type detection (language from manifest files)
3. Framework detection (from dependencies and file structure)
4. Structure analysis (entry points, architecture, test locations, config files)
5. Tree-sitter parsing (AST parsing with caching and sampling)
6. Pattern inference (validation, error handling, database, auth patterns)
7. Convention detection (naming, imports, formatting)

**Detected:** From `packages/analyzer/src/index.ts` (lines 156-166):
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
```

### Package: Generator (alpha)

**Purpose:** Template generation engine (planned, currently alpha stage).

**Detected:** From exploration results (line 336):
```
Generator package is alpha (0.1.0-alpha) — Confidence: 1.0
```

```
packages/generator/
├── src/            # Template generation logic (alpha)
└── dist/           # Build output
```

### Website (demo-site)

**Purpose:** Next.js documentation site for Anatomia.

```
website/
├── app/            # Next.js App Router pages
├── components/     # React components
├── public/         # Static assets
└── .next/          # Next.js build output (gitignored)
```

**Detected:** From `website/package.json` (lines 6-9):
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
```

## Current Status

**Development stage:** Mid-stage active development (version 0.2.0, pre-1.0)

**Detected:** From `packages/cli/package.json` (line 3):
```json
"version": "0.2.0",
```

**Current branch:** SideSprint/setup-redesign (ahead 1 commit from origin)

**Recent focus:** Setup process redesign with improved quality gates

**Detected:** From git status and recent commit messages:
```
3e70247 [SS-7.2] Widen line targets + fix path stripping in check.ts — based on test cycle observations
0e86655 [SS-7.1] Hook fixes + writer improvements — quality gate phase check, PostToolUse confirmed for sub-agents, SubagentStop hook, parallel batching, 6 writer improvements
be1c38b [SS-6] Content redesign — 7 step files restructured, rules.md compressed 771→195 lines, quality checklists, trust stack
cdb91bb [SS-5] Question redesign — two-tier answer validation + UX consistency polish
e38df20 [SS-4] Orchestrator rewrite — slim setup.md + tier files + state management
```

### What's Working

**Core functionality:**
- CLI commands (init, setup, analyze, mode) operational
- Analyzer detects project types (Python, Node, Go, Rust, Ruby, PHP)
- Framework detection for major frameworks
- Tree-sitter AST parsing with caching
- Pattern inference from dependencies and code
- Convention detection (naming, imports, formatting)
- Monorepo with workspace dependencies and build orchestration
- CI/CD matrix testing across 3 OS and 2 Node versions
- Test coverage: 80% (CLI), 85% (analyzer)

**Detected:** From exploration results (lines 255-258):
```
Coverage requirements:
- CLI package: 80% lines, 75% branches, 80% functions, 80% statements — Confidence: 1.0
- Analyzer package: 85% lines, 80% branches, 85% functions, 85% statements — Confidence: 1.0
```

**Self-dogfooding:**
- `.ana/` directory present in repo
- Setup process being tested on Anatomia itself

**Detected:** From exploration results (line 39):
```
/.ana/ — Anatomia context directory (present, indicating self-dogfooding) — Confidence: 1.0
```

### What's In Progress

**Current sprint (SideSprint/setup-redesign):**
- Citation verification improvements (check.ts path stripping fix)
- Writer agent quality gates (PostToolUse hooks, verification after Write)
- Content redesign (step files restructured, rules.md compression from 771→195 lines)
- Q&A validation (two-tier answer validation)
- Orchestrator state management improvements

**Known active development areas:**
- Generator package (alpha, version 0.1.0-alpha)
- Framework detection disambiguation (user confirmed pain point)

User stated: Framework detection disambiguation when multiple frameworks in dependencies causes issues.

### Known Issues & Pain Points

User stated: Main pain points: (1) tree-sitter native module loading — breaks on certain Node versions and platforms, (2) CLI template/build system — tsup wipes templates if copy step fails, (3) framework detection disambiguation when multiple frameworks in dependencies.

**1. Tree-sitter native module loading:**
- Breaks on certain Node versions and platforms
- Native modules (.node files) have platform-specific build requirements

**2. CLI template/build system:**
- tsup wipes templates if copy step fails in `build` script
- Build script combines bundling and file copying: `"build": "tsup && cp -r templates dist/"`
- If `cp -r` fails, templates directory is missing from dist/

**3. Framework detection disambiguation:**
- Projects with multiple frameworks in dependencies (e.g., Next.js + React Native in monorepo)
- Analyzer needs better heuristics to distinguish primary framework

**Note:** Citation verification in setup process is current work (not historical pain point).

### Project Maturity Signals

**Code quality indicators:**
- TypeScript strict mode with 6 additional checks
- High test coverage requirements (80-85%)
- Comprehensive JSDoc comments
- Custom error handling infrastructure
- ESLint and Prettier configured

**Git activity:**
- 107 total commits
- Primary contributor: Ryan Smith (108 commits)
- Secondary contributor: TettoLabs (2 commits)
- Active development with structured commit messages (tags like [SS-7.2], [STEP_2.5])

**Detected:** From exploration results (lines 299-304):
```
Git history:
- Total commits: 107 — Confidence: 1.0
- Contributors: 2 (Ryan Smith: 108 commits, TettoLabs: 2 commits) — Confidence: 1.0
  - Primary developer: Ryan Smith — Confidence: 0.95
- Recent activity: Active development on SideSprint/setup-redesign branch — Confidence: 1.0
- Commit message discipline: Structured with tags and descriptive messages — Confidence: 0.85
```

**Documentation:**
- 133 markdown files in project
- README.md in root and each package
- CONTRIBUTING.md with setup instructions
- API documentation (STRUCTURE_API.md referenced in analyzer)
- Template documentation in CLI package

**Detected:** From exploration results (lines 320-325):
```
Documentation:
- 133 markdown files (excluding node_modules, .next) — Confidence: 1.0
- README.md in root and each package — Confidence: 1.0
- CONTRIBUTING.md with setup instructions — Confidence: 1.0
- API documentation (STRUCTURE_API.md reference in analyzer README) — Confidence: 0.8
- Template documentation in CLI package — Confidence: 0.9
```

**Published packages:**
- anatomia-cli on npm (v0.2.0)
- anatomia-analyzer on npm (v0.1.0)

**Detected:** From README.md (lines 106-107):
```markdown
- **CLI Package:** [anatomia-cli on npm](https://www.npmjs.com/package/anatomia-cli)
- **Analyzer Package:** [anatomia-analyzer on npm](https://www.npmjs.com/package/anatomia-analyzer)
```

---

*Generated by Anatomia v0.2.0 on 2026-03-22T03:27:48.525Z*
*Updated by setup writer agent on 2026-03-22*
