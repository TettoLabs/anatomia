# Architecture — anatomia-workspace

## Architecture Pattern

**Type:** Layered monorepo with package isolation — confidence 0.92

**Detected:** Three-tier structure separates CLI interface, analysis engine, and template generation into distinct packages (from `pnpm-workspace.yaml`, lines 1-3):
```yaml
packages:
  - 'packages/*'
  - 'website'
```

**User confirmed:** Monorepo separates concerns so analyzer can be reused as standalone npm package by other tools

**How it works:**
The project uses a layered dependency graph enforced by pnpm workspaces and Turborepo:

1. **Analyzer layer** (`packages/analyzer/`) — Pure analysis engine with zero CLI dependencies
2. **CLI layer** (`packages/cli/`) — Depends on analyzer package, adds commands and user interface
3. **Generator layer** (`packages/generator/`) — Alpha-stage template engine (currently unused)
4. **Website layer** (`website/`) — Independent Next.js documentation site

**Detected:** Dependency flow enforced by package.json references (from `packages/cli/package.json`, lines 50-51):
```json
"dependencies": {
  "anatomia-analyzer": "^0.1.0",
```

**Detected:** Analyzer exports pure API with no CLI coupling (from `packages/analyzer/package.json`, lines 38-43):
```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  }
}
```

**Trade-off:** Monorepo complexity (multiple package.json files, workspace dependencies, Turborepo config) vs. reusability — acceptable because analyzer publishable to npm without CLI baggage.

**Enforced by:** pnpm workspace protocol prevents cross-package imports outside declared dependencies. Turborepo task graph enforces build order (`"dependsOn": ["^build"]` from `turbo.json`, line 5).

### Alternatives Considered

**Not documented** — No ADR files or decision logs detected in codebase.

## System Boundaries

### Internal Components

**Detected:** Four workspace packages plus shared configuration (from root `package.json` and `pnpm-workspace.yaml`):

1. **anatomia-cli** (v0.2.0) — CLI interface
   - Entry: `packages/cli/src/index.ts` (bin: `ana`)
   - Commands: init, setup, analyze, mode, check
   - Dependencies: anatomia-analyzer, commander, chalk, ora
   - Build: tsup → ESM bundle with templates copied to dist/

2. **anatomia-analyzer** (v0.1.0) — Analysis engine
   - Entry: `packages/analyzer/src/index.ts`
   - Core: Detectors, parsers, analyzers, AST cache
   - Dependencies: tree-sitter + language grammars, Zod, glob
   - Build: tsc → ESM with .d.ts declarations

3. **@anatomia/generator** (v0.1.0-alpha) — Template engine (alpha)
   - Entry: `packages/generator/src/index.ts`
   - Status: Alpha, minimal implementation
   - Build: tsc

4. **demo-site** (v0.1.0) — Documentation website
   - Entry: `website/app/page.tsx` (Next.js App Router)
   - Framework: Next.js 16.1.1 + React 19.2.3 + Tailwind CSS 4
   - Build: Next.js production build → `.next/`

**Detected:** Shared TypeScript config via root tsconfig (from `tsconfig.base.json`, lines 3-23):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "composite": true,
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "forceConsistentCasingInFileNames": true
  }
}
```

### External Services

**Detected:** Tree-sitter native modules for AST parsing (from `packages/analyzer/package.json`, lines 63-67):
```json
"tree-sitter": "0.25.0",
"tree-sitter-go": "0.25.0",
"tree-sitter-javascript": "0.25.0",
"tree-sitter-python": "0.25.0",
"tree-sitter-typescript": "0.23.2",
```

**User stated:** Pain point — tree-sitter native module loading breaks on certain Node versions and platforms

**Detected:** No external API dependencies — all dependencies are npm packages (from package.json files)

**Detected:** No database or persistent storage — state stored in local `.ana/.state/` directory

**Detected:** GitHub Actions CI/CD (from `.github/workflows/test.yml`) — external service for testing

### Data Stores

**Detected:** File-system based storage only:

1. **Project analysis cache:** `.ana/.state/cache/` — AST cache with mtime-based invalidation (from `packages/analyzer/src/cache/astCache.ts`, line 88):
   ```typescript
   constructor(projectRoot: string) {
     this.cacheDir = join(projectRoot, '.ana/.state/cache');
   }
   ```

2. **Framework metadata:** `.ana/.meta.json` — version and timestamp tracking

3. **Analysis snapshot:** `.ana/.state/snapshot.json` — baseline analyzer results

4. **Generated context:** `.ana/context/*.md` — markdown files with project documentation

**Detected:** No external database, no cloud storage, no remote state

### Boundary Enforcement

**Detected:** Package boundaries enforced by:
1. pnpm workspaces — cannot import across packages without declared dependency
2. Turborepo task graph — build order enforced (from `turbo.json`, line 5):
   ```json
   "dependsOn": ["^build"]
   ```
3. tsup externals — analyzer not bundled into CLI (from `packages/cli/tsup.config.ts`, line 10):
   ```typescript
   external: ['anatomia-analyzer'], // Don't bundle dependency
   ```

**Detected:** No import linting rules detected (ESLint config has no import/boundaries plugin)

## Design Decisions

### Decision: Monorepo with Package Isolation

**Context:** CLI needs analyzer, but analyzer should be standalone npm package

**User confirmed:** Monorepo separates concerns so analyzer can be reused as standalone npm package by other tools

**Decision:** Use pnpm workspaces + Turborepo for monorepo orchestration

**Rationale:** Allows single-repo development workflow while maintaining clean package boundaries for npm publishing

**Detected implementation:** Workspace dependencies in `packages/cli/package.json` (line 51):
```json
"anatomia-analyzer": "^0.1.0",
```

**Trade-off:** More complex build setup vs. code reusability — acceptable for library extraction goal

---

### Decision: Tree-sitter for AST Parsing

**Context:** Need to extract functions, classes, imports from source code across multiple languages

**Decision:** Use tree-sitter with language-specific grammars

**Detected implementation:** ParserManager singleton pattern (from `packages/analyzer/src/parsers/treeSitter.ts`, lines 62-84):
```typescript
export class ParserManager {
  private static instance: ParserManager;
  private parsers = new Map<Language, Parser>();

  private constructor() {}

  static getInstance(): ParserManager {
    if (!ParserManager.instance) {
      ParserManager.instance = new ParserManager();
    }
    return ParserManager.instance;
  }

  getParser(language: Language): Parser {
    if (!this.parsers.has(language)) {
      const parser = new Parser();
      parser.setLanguage(this.getGrammar(language));
      this.parsers.set(language, parser);
    }
    return this.parsers.get(language)!;
  }
}
```

**User stated:** Pain point — tree-sitter native module loading breaks on certain Node versions and platforms

**Trade-off:** Native module complexity vs. accurate cross-language parsing — chosen for accuracy, but causes deployment issues

**Not yet documented:** Why tree-sitter over alternatives (babel, esprima, AST explorer APIs)

---

### Decision: AST Caching with mtime-based Invalidation

**Context:** Parsing 20 files takes ~500ms — too slow for responsive CLI

**Decision:** Cache extracted data (not tree objects) with file modification time invalidation

**Detected implementation:** Two-tier cache (from `packages/analyzer/src/cache/astCache.ts`, lines 51-89):
```typescript
/**
 * AST cache with mtime-based invalidation
 *
 * Two-tier cache:
 * - Memory: Fast access (Map<filePath, entry>)
 * - Disk: Persistent across runs (JSON files in .ana/.state/cache/)
 *
 * Invalidation: mtime-based (if file.mtimeMs !== cached.mtimeMs → reparse)
 *
 * Performance:
 * - Cache hit: 5-10ms (read JSON)
 * - Cache miss: 50-150ms (parse + extract)
 * - Speedup: 80-90% on second run
 */
export class ASTCache {
  private memoryCache = new Map<string, ASTCacheEntry>();
  private cacheDir: string;
  private stats = { hits: 0, misses: 0 };

  constructor(projectRoot: string) {
    this.cacheDir = join(projectRoot, '.ana/.state/cache');
  }
```

**Rationale:** 80-90% speedup on subsequent runs (500ms → 50-100ms)

**Trade-off:** Disk space vs. performance — acceptable (cache typically <1MB)

**Alternative considered:** Content-hash invalidation — rejected for simplicity (mtime sufficient for single-developer workflow)

---

### Decision: Priority-based Framework Detection

**Context:** Next.js includes React, Nest.js includes Express — naive detection causes false positives

**Decision:** Check higher-level frameworks first, skip if detected

**User stated:** Pain point — framework detection disambiguation when multiple frameworks in dependencies

**Detected implementation:** Ordered detection with short-circuit (from `packages/analyzer/src/detectors/framework.ts`, lines 88-116):
```typescript
async function detectNodeFramework(rootPath: string): Promise<FrameworkResult> {
  const deps = await readNodeDependencies(rootPath);

  // 1. Next.js (BEFORE React)
  const nextjs = await detectNextjs(rootPath, deps);
  if (nextjs.framework) return nextjs;

  // 2. Nest.js (BEFORE Express)
  const nestjs = await detectNestjs(rootPath, deps);
  if (nestjs.framework) return nestjs;

  // 3. Express
  const express = await detectExpress(rootPath, deps);
  if (express.framework) return express;

  // 4. React
  const react = await detectReact(rootPath, deps);
  if (react.framework) return react;

  // 5. Other
  const other = await detectOtherNodeFrameworks(deps);
  if (other.framework) return other;

  return { framework: null, confidence: 0.0, indicators: [] };
}
```

**Rationale:** Prevents "detected React" when project is actually Next.js

**Trade-off:** Order matters — requires maintenance as new frameworks added

---

### Decision: tsup for CLI Bundling, tsc for Analyzer

**Context:** CLI needs single executable file, analyzer needs .d.ts for library consumers

**Decision:** Different build tools per package based on use case

**Detected implementation:**
- CLI uses tsup with template copy (from `packages/cli/package.json`, line 44):
  ```json
  "build": "tsup && cp -r templates dist/",
  ```
- Analyzer uses tsc with declarations (from `packages/analyzer/package.json`, line 46):
  ```json
  "build": "tsc",
  ```

**User stated:** Pain point — tsup wipes templates if copy step fails

**Trade-off:** Tool-specific complexity vs. optimal output for each package type

**Not yet documented:** Why not use tsc for both, or tsup for both

---

### Decision: Zod for Runtime Validation

**Context:** Analysis results from external code must be validated at runtime

**Decision:** Use Zod schemas for all analyzer output types

**Detected implementation:** Schema exports from types (from `packages/analyzer/src/types/index.ts`, lines 18-23):
```typescript
export {
  AnalysisResultSchema,
  ProjectTypeSchema,
  ConfidenceScoreSchema,
  createEmptyAnalysisResult,
  validateAnalysisResult,
```

**Rationale:** TypeScript types provide compile-time safety, Zod provides runtime validation

**Trade-off:** Schema maintenance overhead vs. runtime safety

---

### Decision: Commander.js for CLI Framework

**Context:** Need argument parsing, subcommands, help generation

**Decision:** Use commander.js with async action handlers

**Detected implementation:** Command registration pattern (from `packages/cli/src/index.ts`, lines 21-32):
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

**Detected:** Critical comment about async handlers (from `packages/cli/src/index.ts`, lines 35-36):
```typescript
// CRITICAL: Use parseAsync() not parse() for async action handlers
// See: https://github.com/tj/commander.js#async-action-handlers
```

**Not yet documented:** Why commander over alternatives (yargs, oclif, cac)

---

### Decision: ESM-only Codebase

**Context:** Modern Node.js supports ESM, ecosystem moving away from CommonJS

**Decision:** Use `"type": "module"` in all package.json files

**Detected implementation:** All packages use ESM (from `packages/cli/package.json`, line 9 and `packages/analyzer/package.json`, line 7):
```json
"type": "module",
```

**Detected challenge:** Tree-sitter requires CommonJS-style imports (from `packages/analyzer/src/parsers/treeSitter.ts`, lines 18-26):
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

**Trade-off:** ESM benefits vs. CommonJS interop complexity for native modules

---

### Decision: Strict TypeScript with Additional Checks

**Context:** Need type safety for analyzer reliability

**Decision:** Enable strict mode plus optional strict checks

**Detected implementation:** Root tsconfig (from `tsconfig.base.json`, lines 6-14):
```json
"strict": true,
"noUncheckedIndexedAccess": true,
"noImplicitOverride": true,
"noPropertyAccessFromIndexSignature": true,
"allowUnusedLabels": false,
"allowUnreachableCode": false,
```

**Rationale:** `noUncheckedIndexedAccess` prevents undefined access bugs, worth the extra null checks

**Trade-off:** More verbose code vs. fewer runtime errors

## Trade-Offs

### What We Optimize For

**Detected:** Analyzer reusability prioritized over simplicity
- Monorepo overhead accepted to keep analyzer publishable
- Clean package boundaries maintained even in single-repo development
- User confirmed this is intentional design goal

**Detected:** Parser performance via caching
- 80-90% speedup on second run (from cache comments in `astCache.ts`)
- Memory cache + disk cache for multi-run persistence
- mtime invalidation trades accuracy for speed (sufficient for local dev)

**Detected:** Type safety over convenience
- Strict TypeScript with additional checks enabled
- Zod runtime validation for external data
- Explicit return types required

**Detected:** Multi-language support over specialization
- Tree-sitter supports Python, TypeScript, JavaScript, Go
- Framework detectors for 18+ frameworks across 4 ecosystems
- Complexity cost accepted for broader use case coverage

### What We Sacrifice

**Detected:** Build complexity for package isolation
- tsup for CLI, tsc for analyzer — requires two build configs
- Template copy step fragile (user-stated pain point)
- Turborepo adds orchestration layer

**User stated:** Deployment reliability for native module accuracy
- Tree-sitter causes platform/version issues
- Native module loading pain point mentioned explicitly
- Accuracy prioritized over ease of installation

**Inferred:** Documentation completeness for development velocity
- No ADR files detected
- Design rationale not documented in codebase
- Project still pre-1.0 (v0.2.0), prioritizing features over docs

**Detected:** Framework detection simplicity for disambiguation accuracy
- Priority-based ordering required (Next before React, Nest before Express)
- User-stated pain point about disambiguation
- Trade-off: maintenance burden vs. false positive prevention

### Why These Trade-Offs Are Acceptable

**User confirmed:** Analyzer reusability is core goal — monorepo complexity worth it for standalone npm package

**Inferred:** Pre-1.0 project still finding product-market fit — documentation gaps acceptable at this stage

**Detected:** High test coverage requirements (80-85%) compensate for strict TypeScript overhead

**Detected:** Caching system makes parser performance acceptable despite native module overhead

**Inferred:** Self-dogfooding (`.ana/` present in repo) validates pain point priorities — tree-sitter issues and framework disambiguation affect own development

### Technical Debt

**User stated:** Template copy failures in CLI build process

**User stated:** Tree-sitter native module loading issues across platforms

**Detected:** Generator package in alpha state (v0.1.0-alpha, minimal implementation)

**Not yet documented:** Why ParserManager uses singleton pattern vs. dependency injection

**Not yet documented:** No benchmarks for claimed performance improvements (80-90% speedup, 5-10ms parser reuse)

**Not yet documented:** No error recovery strategy when tree-sitter parsing fails

---

*Last updated: 2026-03-21T03:35:00.000Z*
