# Project Context - Anatomia

## Overview

Anatomia is a CLI tool that auto-generates `.ana/` folders (structured AI context for codebases). Helps AI assistants understand projects instantly by providing mode files (architect, code, debug, docs, test with strict boundaries) and context files (patterns, conventions, architecture). Currently Week 2 of development: manual templates complete (STEP_0.2), now validating before building auto-generation engine (STEP_1-2, Week 3-4).

**Purpose:** Generate AI context folders automatically by detecting project patterns
**Status:** Alpha - manual templates working, auto-generation planned
**Team:** Solo developer building in public

## Architecture

**Type:** pnpm monorepo with Turborepo build orchestration

**Structure:**
```
anatomia/
├── packages/
│   ├── cli/              # Commander.js CLI (user-facing, 0.1.0)
│   │   ├── src/
│   │   │   ├── index.ts           # Entry (45 lines, Commander setup)
│   │   │   ├── commands/          # init.ts (268 lines), mode.ts (120 lines)
│   │   │   └── utils/             # template-loader.ts (99 lines), file-writer.ts (134 lines)
│   │   ├── templates/             # 10 files (7 .hbs, 3 .md)
│   │   ├── tests/                 # 7 test files, 100 tests
│   │   └── dist/                  # Build output (10.58 KB + templates/)
│   ├── analyzer/         # Pattern detection (STEP_1, placeholder)
│   ├── generator/        # Auto-generation (STEP_1, placeholder)
│   └── shared/           # Common types (placeholder)
└── website/              # Next.js 15 marketing (anatomia.dev)
```

**Build dependency graph (from turbo.json):**
- shared builds first (no dependencies)
- analyzer/generator/cli build after shared (depends on ^build)
- website builds after cli (optional dependency)
- test task depends on build (runs after compilation)

## Tech Stack

**Language:** TypeScript 5.7
- Strict mode enabled globally (tsconfig.base.json)
- Additional 2026 checks: noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitReturns
- ESM modules (type: "module" in package.json, .js extensions in imports)

**CLI Framework:**
- **commander 12.0.0:** Command structure (program.addCommand pattern)
- **inquirer 10.0.2:** Interactive prompts (input, list, confirm types with validation)
- **handlebars 4.7.8:** Template engine (variables, conditionals, 'eq' helper for framework matching)
- **chalk 5.3.0:** Terminal colors (blue for info, green for success, red for errors, gray for hints)
- **ora 8.0.0:** Spinners ("Creating .ana/ structure..." while files write)

**Build Tools:**
- **pnpm 9.0.0:** Package manager (workspace protocol, faster than npm/yarn)
- **Turborepo 2.3.0:** Task orchestration (parallel builds, aggressive caching)
- **tsup 8.0.0:** CLI bundler (preserves shebang, adds ESM shims for __dirname, 400ms builds)
- **vitest 2.0.0:** Test runner (100 tests in 1.5s, v8 coverage provider)

**Monorepo Dependencies:**
- Workspace protocol: `"@anatomia/shared": "workspace:*"` enables cross-package imports
- Turbo caching: Second build <1s (FULL TURBO when nothing changed)
- Global dependencies: tsconfig.base.json and pnpm-lock.yaml invalidate all caches when changed

## Directory Structure

**packages/cli/src/index.ts (45 lines):**
- Commander program setup (name, description, version from package.json)
- Command registration (initCommand, modeCommand)
- parseAsync() for async action handlers (CRITICAL: parse() doesn't await, use parseAsync())
- Error handling (try/catch, process.exit(1) on failure)

**packages/cli/src/commands/init.ts (268 lines):**
- Creates .ana/ folder structure (directories: context/, modes/)
- Renders 10 templates with Handlebars (ENTRY.md, node.json, 5 modes, 3 contexts)
- Inquirer prompts (7 questions: projectName, nodeId, projectType, framework, language, federation, useDefaults)
- FileWriter operations (createDir, writeFile with path.join)
- Ora spinners (visual feedback during file creation)
- Success message lists all 10 created files with descriptions

**packages/cli/src/utils/template-loader.ts (99 lines):**
- loadTemplate(name): Reads .hbs file from templates/, compiles with Handlebars
- renderTemplate(name, data): Renders template with variables
- listTemplates(): Returns available template files
- Handles dev vs prod context (src/templates/ vs dist/templates/)
- Registers 'eq' helper: `Handlebars.registerHelper('eq', (a, b) => a === b)`
- Used for conditionals: `{{#if (eq framework "fastapi")}}...{{/if}}`

**packages/cli/src/utils/file-writer.ts (134 lines):**
- FileWriter class with 6 methods:
  - exists(path): Check file/directory exists (fs.access, catch returns false)
  - createDir(path): Recursive mkdir (mkdir with recursive: true)
  - writeFile(path, content): Write with parent dir creation (ensures parent exists first)
  - readFile(path): Read as UTF-8 string
  - removeDir(path): Recursive delete (rm with recursive + force)
  - joinPath(...segments): Platform-specific path joining
- ALWAYS uses path.join() (never hardcoded slashes)
- Error handling: Wraps errors with context (`Failed to write file '${path}': ${message}`)

**packages/cli/templates/ (10 files, ~1300 lines total):**
- **ENTRY.md.hbs (114 lines):** Orientation contract, 7 principles, mode list, federation conditional
- **node.json.hbs (11 lines):** Project metadata JSON (name, nodeId, federation.queryable)
- **architect.md.hbs (222 lines):** System design mode, 4-layer structure, 5 good + 5 bad examples, FastAPI/Next.js/Express conditionals
- **code.md.hbs (160 lines):** Implementation mode, delegates architecture, Python/TypeScript/Go conditionals
- **debug.md.hbs (125 lines):** Root cause analysis, never implements fixes
- **docs.md.hbs (125 lines):** Documentation writing, never implements features
- **test.md.hbs (128 lines):** Test writing, never implements features, 80% coverage goal
- **main.md (53 lines):** Context template with 6 TODO sections, 18 inline examples
- **patterns.md (55 lines):** Pattern template with 7 TODO sections, 21 inline examples
- **conventions.md (55 lines):** Convention template with 7 TODO sections, 21 inline examples

## Key Dependencies

**templates/tsup.config.ts workaround:**
- publicDir: 'templates' copies templates/ to dist/templates/ during build
- onSuccess hook re-copies templates after DTS (workaround for tsup issue #1366 where DTS deletes publicDir)

## Key Concepts

**Modes:** Specialized AI behavior profiles with strict boundaries
- architect: System design only (NEVER writes implementation code)
- code: Implementation only (NEVER designs architecture)
- debug: Root cause analysis only (NEVER implements fixes)
- docs: Documentation only (NEVER implements features)
- test: Test writing only (NEVER implements features)

**Templates:** Handlebars files that render to mode/context files
- .hbs extension: Handlebars templates with variable substitution
- .md extension: Static markdown copied as-is
- Framework conditionals: `{{#if (eq framework "fastapi")}}...{{/if}}`

**Context files:** Project-specific information filled by user
- main.md: Overview, architecture, tech stack
- patterns.md: Coding patterns, abstractions
- conventions.md: Naming, formatting, git conventions

## Current State

**Completed:**
- ✅ STEP_0.1: Monorepo infrastructure, CLI scaffold, anatomia.dev deployed
- ✅ STEP_0.2: Manual template system (10 templates, 100 tests, 582 lines docs)
- ✅ STEP_0.3: Website content (production-ready, GitHub links, install instructions)
- 🔄 STEP_0.4: Template validation (THIS - dogfooding in progress)

**Next:**
- STEP_1: Pattern detection engine (analyzer package, detects framework/language/patterns)
- STEP_2: Auto-generation (generator package, creates .ana/ without manual filling)

## Development Workflow

**Install:**
```bash
pnpm install  # Installs all workspace dependencies
```

**Build:**
```bash
pnpm build    # Turborepo builds all packages in dependency order
```

**Test:**
```bash
pnpm test     # Runs vitest across all packages
```

**Dev mode:**
```bash
cd packages/cli
pnpm dev      # tsup watch mode (rebuilds on change)
```

**Test CLI locally:**
```bash
cd packages/cli
pnpm build
npm link
ana --version  # Should show 0.1.0
```

---

*This context enables AI to understand Anatomia's architecture, make consistent recommendations, and follow established patterns.*
