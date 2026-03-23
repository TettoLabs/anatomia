# Project Overview — Anatomia

## What This Project Is

**Purpose:** CLI tool that automatically generates AI context documentation for codebases by analyzing source code structure, patterns, and architecture. Solves the problem of repeatedly re-explaining project patterns to AI assistants in every conversation.

**User confirmed:** CLI tool for generating AI context documentation to onboard AI assistants to codebases

**Target users:** Solo developers and small engineering teams (2-5 people) who work with Claude Code or AI-assisted development workflows, building TypeScript/Node.js applications in monorepo setups. Methodical and quality-focused developers.

**User confirmed:** Target users are solo/small teams using AI-assisted development workflows, quality-focused TypeScript developers

**Current focus:** Redesigning the setup system to use analyzer-driven scaffolding and guided Q&A (active work on `SideSprint/setup-redesign` branch)

**Detected:** From `packages/cli/package.json` (lines 2-4):
```json
"name": "anatomia-cli",
"version": "0.2.0",
"description": "AI context framework with analyzer-driven setup"
```

**Detected:** Binary command name from `packages/cli/package.json` (lines 5-7):
```json
"bin": {
  "ana": "./dist/index.js"
}
```

**Detected:** From `README.md` (lines 10-19):
```markdown
## What is this?

Anatomia generates `.ana/` folders that help AI assistants understand your project. Instead of re-explaining your patterns every conversation, reference mode files in chat.

**Example:**
```
@.ana/modes/code.md "Implement user authentication"
```

AI reads your patterns and writes code that matches your team's standards.
```

**Value proposition:** Instead of manually documenting patterns in every AI conversation, developers run `ana init` once, fill context files, then reference mode files (`.ana/modes/*.md`) in chat. AI assistants read the standardized context and produce code matching team conventions.

**Domain:** Developer tooling, code analysis, AI-assisted development

**Organization:** TettoLabs

**Detected:** From `packages/cli/package.json` (line 34):
```json
"author": "TettoLabs"
```

**Repository:** https://github.com/TettoLabs/anatomia

**Detected:** From `packages/cli/package.json` (lines 25-28):
```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/TettoLabs/anatomia.git",
  "directory": "packages/cli"
}
```

## Tech Stack

### Core Technologies

**Language:** TypeScript 5.7.0 with strict mode enabled

**Detected:** From `package.json` (line 15):
```json
"typescript": "^5.7.0"
```

**Detected:** Strict TypeScript configuration from `tsconfig.base.json` (lines 4-15):
```json
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
```

**Runtime:** Node.js 20+ (required minimum)

**Detected:** From `package.json` (lines 19-21):
```json
"engines": {
  "node": ">=20.0.0",
  "pnpm": ">=9.0.0"
}
```

**Module system:** ESM (ECMAScript modules) — all packages use `"type": "module"`, import/export syntax, .js extensions in relative imports

**Detected:** From `packages/cli/package.json` (line 9):
```json
"type": "module"
```

**Package manager:** pnpm 9.0.0 with workspaces

**Detected:** From `package.json` (line 23):
```json
"packageManager": "pnpm@9.0.0"
```

**Detected:** Workspace configuration from `pnpm-workspace.yaml` (lines 1-3):
```yaml
packages:
  - 'packages/*'
  - 'website'
```

**Monorepo orchestration:** Turborepo 2.3.0 for build caching and task pipelines

**Detected:** From `package.json` (line 14):
```json
"turbo": "^2.3.0"
```

**Detected:** Build pipeline from `turbo.json` (lines 3-30):
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

### Key Dependencies

**CLI package** (`anatomia-cli`):

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

- **commander** (12.0.0) — CLI argument parsing and command routing
- **chalk** (5.3.0) — Colored terminal output for user-facing messages
- **ora** (8.0.0) — Terminal spinners for long-running operations
- **glob** (10.3.0) — File pattern matching for template operations
- **anatomia-analyzer** (workspace package) — Code analysis engine

**Analyzer package** (`anatomia-analyzer`):

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

- **web-tree-sitter** (0.25.10) — WASM-based AST parsing for multi-language code analysis
- **zod** (4.3.6) — Runtime type validation with TypeScript inference
- **js-yaml** (4.1.1) — YAML parsing for config files
- **glob** (10.3.0) — File discovery and pattern matching
- **chalk** (5.3.0) — Error message formatting

**Detected:** Optional tree-sitter grammars from `packages/analyzer/package.json` (lines 66-71):
```json
"optionalDependencies": {
  "tree-sitter-go": "0.25.0",
  "tree-sitter-javascript": "0.25.0",
  "tree-sitter-python": "0.25.0",
  "tree-sitter-typescript": "0.23.2"
}
```

### Build Tools

**CLI:** tsup (ESM bundler for Node.js) — fast esbuild-based bundler

**Detected:** From `packages/cli/package.json` (line 44):
```json
"build": "tsup && cp -r templates dist/"
```

**Analyzer:** tsc (TypeScript compiler) — standard TypeScript compilation

**Detected:** From `packages/analyzer/package.json` (line 46):
```json
"build": "tsc"
```

**Target:** ES2022 (Node 20+ supports ES2022 natively)

**Detected:** From `tsconfig.base.json` (lines 36-37):
```json
"target": "ES2022",
"lib": ["ES2022"]
```

### Testing Stack

**Framework:** Vitest (2.0.0 for CLI, 4.0.18 for analyzer)

**Detected:** From `packages/cli/package.json` (line 66):
```json
"vitest": "^2.0.0"
```

**Detected:** From `packages/analyzer/package.json` (line 57):
```json
"vitest": "^4.0.18"
```

**Coverage provider:** v8

**Detected:** From `packages/cli/vitest.config.ts` (line 9):
```typescript
provider: 'v8'
```

**Coverage thresholds:**

**Detected:** CLI thresholds from `packages/cli/vitest.config.ts` (lines 17-22):
```typescript
thresholds: {
  lines: 80,
  branches: 75,
  functions: 80,
  statements: 80,
}
```

**Detected:** Analyzer thresholds from `packages/analyzer/vitest.config.ts` (lines 16-21):
```typescript
thresholds: {
  lines: 85,
  branches: 80,
  functions: 85,
  statements: 85,
}
```

- **CLI:** 80% lines, 75% branches, 80% functions, 80% statements
- **Analyzer:** 85% lines, 80% branches, 85% functions, 85% statements

### Tooling

**Linter:** ESLint 10.1.0 with flat config format (@typescript-eslint plugin)

**Detected:** From `packages/cli/package.json` (lines 59-60):
```json
"@typescript-eslint/eslint-plugin": "^8.57.1",
"@typescript-eslint/parser": "^8.57.1"
```

**Formatter:** Prettier 3.4.0

**Detected:** From `package.json` (line 16):
```json
"prettier": "^3.4.0"
```

**Development runtime:** tsx for running TypeScript directly

**Detected:** From `packages/cli/package.json` (line 64):
```json
"tsx": "^4.21.0"
```

## Directory Structure

### Monorepo Layout

```
anatomia/
├── packages/
│   ├── cli/              # Main CLI tool (anatomia-cli v0.2.0)
│   ├── analyzer/         # Code analysis engine (anatomia-analyzer v0.1.0)
│   └── generator/        # Template generator (alpha, not published)
├── website/              # Next.js documentation site (not yet active)
├── tests/                # Root-level integration tests
├── .ana/                 # Anatomia's own context (dogfooding)
├── .claude/              # Claude Code agent definitions
│   └── agents/           # ana-explorer, ana-writer, ana-verifier, ana-question-formulator
├── .github/workflows/    # GitHub Actions CI configuration
└── master_plan/          # Product planning docs (vision, architecture)
```

**Detected:** From `README.md` (lines 46-55):
```markdown
## Project Structure

```
anatomia/
├── packages/
│   ├── cli/          # CLI tool
│   └── analyzer/     # Code analysis engine
└── website/          # Documentation
```
```

### CLI Package Structure (`packages/cli/`)

```
cli/
├── src/
│   ├── index.ts          # CLI entry point with commander setup
│   ├── commands/         # Command implementations (init, mode, analyze, setup)
│   │   ├── init.ts       # Initialize .ana/ structure
│   │   ├── mode.ts       # Reference mode files
│   │   ├── analyze.ts    # Run analyzer and display results
│   │   └── setup.ts      # Guided setup with Q&A and scaffolding
│   ├── utils/            # Utility functions (validators, formatters, file-writer)
│   └── constants.ts      # Shared constants
├── templates/            # Template files copied to user projects
│   ├── .ana/             # Context structure templates
│   │   ├── hooks/        # Quality gate bash scripts
│   │   └── modes/        # Task mode templates
│   └── context/          # Context file templates (7 files)
├── tests/                # Vitest tests mirroring src/ structure
│   ├── commands/         # Command tests
│   ├── scaffolds/        # Scaffold generator tests
│   ├── contract/         # Analyzer contract tests
│   ├── e2e/              # End-to-end tests
│   └── performance/      # Performance benchmarks
├── dist/                 # Build output (gitignored)
└── docs/                 # Package documentation
```

**Detected:** Entry point from `packages/cli/src/index.ts` (lines 1-49):
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

// Register commands
program.addCommand(initCommand);
program.addCommand(modeCommand);
program.addCommand(analyzeCommand);
program.addCommand(setupCommand);

// Parse arguments with async support
// CRITICAL: Use parseAsync() not parse() for async action handlers
async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
```

### Analyzer Package Structure (`packages/analyzer/`)

```
analyzer/
├── src/
│   ├── index.ts          # Public API exports
│   ├── analyzers/        # High-level analyzers (structure, dependencies, patterns, conventions)
│   │   ├── conventions/  # Naming, formatting, import style analysis
│   │   └── patterns/     # Error handling, validation, auth pattern detection
│   ├── detectors/        # Project type detection (Node, Python, Go, etc.)
│   │   ├── node/         # Node/npm/yarn detection
│   │   └── python/       # Python/pip detection
│   ├── parsers/          # Language-specific AST parsers
│   │   ├── go/           # Go parser
│   │   ├── node/         # JavaScript/TypeScript parser
│   │   ├── php/          # PHP parser
│   │   ├── python/       # Python parser
│   │   ├── ruby/         # Ruby parser
│   │   └── rust/         # Rust parser
│   ├── cache/            # AST and query caching (ParserManager, ASTCache, QueryCache)
│   ├── sampling/         # File sampling strategies
│   ├── errors/           # Custom error classes (DetectionError, DetectionCollector)
│   ├── types/            # Zod schemas and TypeScript types
│   └── utils/            # Helper functions
├── tests/                # Vitest tests (64 test files total)
│   ├── fixtures/         # Test fixtures by language (go/, node/, python/, ruby/, rust/, php/)
│   ├── analyzers/        # Analyzer tests
│   ├── detectors/        # Detector tests
│   ├── parsers/          # Parser tests
│   ├── integration/      # Integration tests
│   └── performance/      # Performance tests
├── dist/                 # Build output (gitignored)
└── docs/                 # Package documentation
```

### Special Directories

**.ana/** — Anatomia's own context (dogfooding the CLI)

**Detected:** Self-referential setup showing how the tool documents itself. Contains context files for patterns, conventions, architecture, testing, workflow, debugging, and analysis.

**.claude/** — Claude Code agent definitions

**Detected:** Custom agents for the setup process:
- `ana-explorer.md` — Explores codebase and generates exploration results
- `ana-writer.md` — Writes individual context files with verified citations
- `ana-verifier.md` — Validates context files against quality checks
- `ana-question-formulator.md` — Generates Q&A questions for user

**master_plan/** — Product planning and vision documents

**Detected:** Contains technical architecture specs (2,166+ lines), implementation roadmaps, and core product documents. Shows deliberate architectural planning.

### Entry Points

**CLI binary:** `packages/cli/dist/index.js` (invoked as `ana` command)

**Detected:** From `packages/cli/package.json` (lines 5-7):
```json
"bin": {
  "ana": "./dist/index.js"
}
```

**CLI commands:**
- `ana init` — Initialize `.ana/` folder structure with templates
- `ana setup` — Run guided setup with analyzer-driven scaffolding and Q&A
- `ana mode <name>` — Display a mode file for referencing in AI chat
- `ana analyze` — Run code analysis and display results

**Analyzer entry:** `packages/analyzer/dist/index.js` — Public API for code analysis

**Detected:** From `packages/analyzer/package.json` (lines 5-6):
```json
"main": "./dist/index.js",
"types": "./dist/index.d.ts"
```

### Build Outputs

**dist/** — TypeScript compilation output (gitignored in all packages)

**Detected:** tsup generates `dist/` for CLI (bundled), tsc generates `dist/` for analyzer (unbundled)

**.turbo/** — Turborepo cache (gitignored)

**Detected:** Stores task output hashes and cached build artifacts for faster rebuilds

**coverage/** — Vitest coverage reports (gitignored)

**Detected:** Generated by v8 coverage provider, includes text/json/html reports

## Current Status

### Development Stage

**Maturity:** Alpha/early beta — actively developed with structured phased approach

**User confirmed:** Phased branching (effort/STEP_*, SideSprint/*), PR workflow with merge commits, structured commit tags

**Version:** 0.2.0 (CLI), 0.1.0 (analyzer)

**Detected:** From package.json files showing pre-1.0 versions

**License:** MIT

**Detected:** From `packages/cli/package.json` (line 10):
```json
"license": "MIT"
```

### Active Work (as of 2026-03-23)

**Current branch:** `SideSprint/setup-redesign`

**Recent focus:** Redesigning setup command to use analyzer-driven scaffolding with guided Q&A system. Recent commits include:

**Detected:** From git status and exploration results:
- [SS-13.0] Preflight changes for MI-51-55 (Q6 git workflow, Q7 business flow, .gitignore, explorer git targets)
- [SS-12.4c] detectProjectType tests (14 tests), app/ directory sampling fix
- [SS-12.4] Analyzer detectProjectType() implementation
- [SS-11] AST symbol index (582 symbols from 152 files)

**Inferred:** The "SS-" prefix indicates "SideSprint" work, showing parallel development stream alongside main effort/* branches

### What's Working

**Core functionality:**
- ✅ `ana init` command — generates `.ana/` folder with 10 template files
- ✅ Multi-language AST parsing (TypeScript, JavaScript, Python, Go via tree-sitter WASM)
- ✅ Project type detection (Node, Python, Go with 6 fallback strategies)
- ✅ Dependency analysis (package.json, requirements.txt, go.mod)
- ✅ Pattern detection (error handling, validation, testing patterns)
- ✅ Convention analysis (naming, formatting, import organization)
- ✅ Symbol indexing (582 symbols from 152 files demonstrated)
- ✅ Multi-OS CI testing (Windows, macOS, Linux × Node 20, 22)
- ✅ Monorepo setup with pnpm + Turborepo
- ✅ High test coverage (80-85% thresholds enforced)

**Detected:** Exploration results show extensive analyzer capabilities with confidence scores 0.85-0.95 for most detections

### What's In Progress

**Active development:**
- 🚧 Setup command redesign (analyzer-driven, guided Q&A, quote-then-write protocol)
- 🚧 Context file verification system (quality gates, citation validation)
- 🚧 CLAUDE.md signpost generation (marker-based merge for AI orientation)
- 🚧 Improved monorepo detection (6 fallback strategies being refined)

**Detected:** From recent commit messages showing iterative improvements to setup system, verification hooks, and analyzer detection accuracy

**User confirmed:** Pain points are WASM memory management, multi-phase validation complexity, silent graceful degradation, monorepo detection fallbacks

### Known Limitations

**Detected:** From exploration findings and user confirmation:

1. **Tree-sitter WASM complexity** — Requires explicit initialization and manual memory management (tree.delete() calls), can cause subtle bugs if not handled correctly

2. **4-phase validation complexity** — Setup command has structural, content, cross-reference, and quality validation phases that can be hard to debug

3. **Silent failures** — Graceful degradation pattern (DetectionCollector accumulates errors without halting) can make failures invisible unless explicitly checked

4. **Monorepo detection edge cases** — 6 fallback strategies indicate detection complexity, still being refined

5. **Website not active** — Documentation site exists in codebase but not yet deployed/functional

**Detected:** From `README.md` showing website/ directory but no live site link

### Distribution

**npm packages:**
- `anatomia-cli` — Published to npm registry
- `anatomia-analyzer` — Published to npm registry (also usable as library)

**Detected:** From `packages/cli/package.json` (lines 25-32):
```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/TettoLabs/anatomia.git",
  "directory": "packages/cli"
},
"homepage": "https://github.com/TettoLabs/anatomia",
"bugs": {
  "url": "https://github.com/TettoLabs/anatomia/issues"
}
```

**Installation:** `npm install -g anatomia-cli`

**Detected:** From `README.md` (lines 24-27):
```bash
## Install

```bash
npm install -g anatomia-cli
```
```

**User confirmed:** CI via GitHub Actions for testing, manual npm publish for releases, no deployment environments (CLI tool)

### Team and Contributors

**Organization:** TettoLabs

**Primary contributor:** Ryan Smith

**Team size:** Solo/small team (2 identities in git history)

**Detected:** From exploration results showing 2 contributors (Ryan Smith, TettoLabs org account)

**User confirmed:** Target users are solo/small teams using AI-assisted development workflows, quality-focused TypeScript developers

### Development Workflow

**Branch strategy:**
- `main` — Main integration branch
- `effort/STEP_{phase}_{checkpoint}_{name}` — Phased development branches (STEP_0_* through STEP_2_*)
- `SideSprint/*` — Parallel feature work (e.g., setup-redesign)
- `ux/*` — UX improvements (e.g., fix-copy)

**Detected:** From exploration results listing 13 effort/* branches and active SideSprint branch

**Commit format:** `[TAG] Brief — Details`
- Tags: SS-* (SideSprint), MI-* (Milestone/Issue), STEP_* (effort tracking)
- Structured with em dash separator

**Detected:** From exploration results showing consistent commit message format across recent history

**PR workflow:** Pull request-based with merge commits to main

**Detected:** From exploration results mentioning "Merge pull request #4" commits

**User confirmed:** Phased branching (effort/STEP_*, SideSprint/*), PR workflow with merge commits, structured commit tags, GitHub Actions CI matrix

### Quality Standards

**TypeScript strictness:** Maximal — strict mode plus 6 additional strict checks

**Detected:** From `tsconfig.base.json` showing all strict flags enabled

**Test coverage:** 80-85% enforced via CI

**Detected:** From vitest config files showing coverage thresholds

**Multi-platform testing:** 3 operating systems × 2 Node versions = 6 CI jobs

**Detected:** From exploration results describing GitHub Actions test matrix

**Code quality:** ESLint + Prettier enforced, JSDoc for public APIs

**Detected:** From exploration results showing comprehensive linting/formatting setup

### Codebase Metrics

**Total TypeScript lines:** ~29,339 (packages only)

**Source files:** 71 .ts files in src/ directories

**Test files:** 64 .test.ts files

**Detected:** From exploration results showing comprehensive code analysis

**Inferred:** Test-to-source ratio (~0.9) indicates strong testing discipline

---

*Generated by Anatomia v0.2.0 on 2026-03-23*
