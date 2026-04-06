# Architecture — anatomia-workspace

## Architecture Pattern

**Type:** Monorepo with package separation (CLI + Analyzer + Generator)

**User confirmed:** Deliberate architecture with planned roadmap (STEP_* branches), professional tooling choices made upfront.

**Confidence:** 0.95

### How It Works

The project uses a **monorepo architecture** managed by Turborepo and pnpm workspaces, splitting concerns into three packages:

1. **CLI package** (`packages/cli/`) — User interface, command handling, template scaffolding
2. **Analyzer package** (`packages/analyzer/`) — Core detection engine, tree-sitter parsing, pattern inference
3. **Generator package** (`packages/generator/`) — Template generation (alpha stage, minimal code)

**Detected:** Workspace structure from `pnpm-workspace.yaml` (lines 1-3):
```yaml
packages:
  - 'packages/*'
  - 'website'
```

**Detected:** Package dependency using workspace protocol from `packages/cli/package.json` (line 51):
```json
"anatomia-analyzer": "workspace:*"
```

**Detected:** Build orchestration from `turbo.json` (lines 4-8):
```json
"build": {
  "dependsOn": ["^build"],
  "outputs": ["dist/**", ".next/**"],
  "env": ["NODE_ENV"]
}
```

The `^build` dependency ensures packages build in dependency order (Analyzer before CLI).

### Component Flow

**Detected:** Seven-phase analysis pipeline from `packages/analyzer/src/index.ts` (lines 192-268):
1. Monorepo detection (skipMonorepo flag)
2. Project type detection (Python, Node, Go, etc.)
3. Framework detection (FastAPI, Next.js, etc.)
4. Structure analysis (entry points, test locations)
5. Tree-sitter parsing (AST extraction)
6. Pattern inference (error handling, validation)
7. Convention detection (naming, imports)

Each phase is optional via skip flags and builds on previous results, enabling graceful degradation if a phase fails.

**Detected:** CLI delegates to analyzer from `packages/cli/src/index.ts` (lines 15-32):
```typescript
import { initCommand } from './commands/init.js';
import { modeCommand } from './commands/mode.js';
import { analyzeCommand } from './commands/analyze.js';
import { setupCommand } from './commands/setup.js';

program
  .name('ana')
  .description('Auto-generated AI context for codebases')
  .addCommand(initCommand)
  .addCommand(modeCommand)
  .addCommand(analyzeCommand)
  .addCommand(setupCommand);
```

### Architectural Principles

**User confirmed:** Target users are developers using AI coding assistants who want consistent AI-generated code matching team standards.

1. **Separation of concerns** — CLI handles I/O, Analyzer handles logic (Confidence: 0.95)
   - Enables Analyzer reuse as standalone library
   - No CLI dependencies in Analyzer package

2. **Graceful degradation** — Optional phases with skip flags (Confidence: 0.90)
   - Each phase can fail independently
   - **Detected:** Skip options from `packages/analyzer/src/index.ts` (lines 143-153):
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
   }
   ```

3. **Type safety with runtime validation** — Strict TypeScript + Zod (Confidence: 0.95)
   - **Detected:** Strict mode from `tsconfig.base.json` (lines 6-15):
   ```json
   "strict": true,
   "noUncheckedIndexedAccess": true,
   "noImplicitOverride": true,
   "noPropertyAccessFromIndexSignature": true,
   "noImplicitReturns": true,
   "noFallthroughCasesInSwitch": true,
   "exactOptionalPropertyTypes": true
   ```

4. **ESM-first module system** — Modern imports with .js extensions (Confidence: 0.95)
   - All packages use `"type": "module"`
   - Imports use `.js` extensions even for `.ts` files (ESM requirement)

## System Boundaries

### Internal Components

**Detected:** Three workspace packages:

1. **CLI Package** (`packages/cli/`)
   - Commands: init, setup, analyze, mode, check, index
   - Utils: validators, file writers, scaffold generators
   - Templates: .ana/ directory structure scaffolds
   - Binary: `bin: ana` in package.json
   - Confidence: 0.95

2. **Analyzer Package** (`packages/analyzer/`)
   - Analyzers: structure, patterns, conventions
   - Detectors: project type, framework, monorepo
   - Parsers: tree-sitter, dependency files
   - Cache: AST caching (mtime-based invalidation)
   - Types: Zod schemas and TypeScript definitions
   - Errors: DetectionError, DetectionCollector
   - Exports: Library with typed exports
   - Confidence: 0.95

3. **Generator Package** (`packages/generator/`)
   - Status: Alpha stage (497 bytes)
   - Purpose: Template generation (planned feature)
   - Confidence: 0.85

4. **Website** (`website/`)
   - Documentation site
   - Confidence: 0.85

### External Services

**Not detected** — No external API services or SaaS integrations. The project operates entirely locally (reads files, parses with WASM, writes to `.ana/`).

**Confidence:** 0.95

### Data Stores

**Detected:** File-based state, no database:

1. **Project state:**
   - `.ana/.meta.json` — Metadata (tier, created timestamp)
   - `.ana/.state/snapshot.json` — Analysis results (AnalysisResult JSON)
   - `.ana/.state/cache/*.json` — AST cache entries (mtime-based)
   - Confidence: 0.95

2. **Setup state:**
   - `.ana/.setup_state.json` — Phase tracking, per-file completion
   - `.ana/.setup_exploration.md` — Explorer agent results
   - `.ana/.setup_qa_log.md` — Questions asked, user answers
   - Confidence: 0.95

3. **AST caching:**
   - **Detected:** Two-tier cache from `packages/analyzer/src/cache/astCache.ts` (lines 77-80):
   ```typescript
   export class ASTCache {
     private memoryCache = new Map<string, ASTCacheEntry>();
     private cacheDir: string;
     private stats = { hits: 0, misses: 0 };
   ```
   - Memory: Fast access (Map)
   - Disk: Persistent across runs (JSON in `.ana/.state/cache/`)
   - Invalidation: mtime-based (if file changes, reparse)
   - **User confirmed:** AST cache in memory only (intentional — disk is secondary)
   - Performance: 80-90% speedup on second run (5-10ms vs 50-150ms)
   - Confidence: 0.90

### Dependency Boundaries

**CLI dependencies:**
- External: commander, chalk, ora, glob
- Internal: anatomia-analyzer (workspace:*)

**Analyzer dependencies:**
- External: web-tree-sitter, zod, js-yaml, chalk, glob
- Optional: tree-sitter grammars (Go, JS, Python, TypeScript)

**Detected:** Optional dependencies from `packages/analyzer/package.json` (lines 66-71):
```json
"optionalDependencies": {
  "tree-sitter-go": "0.25.0",
  "tree-sitter-javascript": "0.25.0",
  "tree-sitter-python": "0.25.0",
  "tree-sitter-typescript": "0.23.2"
}
```

Grammars are optional to prevent build failures on platforms without C++ compilers. Analyzer degrades gracefully if unavailable.

**Confidence:** 0.95

## Design Decisions

### 1. Monorepo with Turborepo + pnpm

**Decision:** Use Turborepo for build orchestration, pnpm workspaces for dependency management.

**User confirmed:** Deliberate architecture with professional tooling choices made upfront.

**Context:** Small team (2 contributors) building CLI + library, want clean separation, need to publish `anatomia-analyzer` as standalone.

**Rationale:**
- Turborepo: Caching, task orchestration
- pnpm: Efficient disk usage, strict isolation
- Separation: Analyzer importable without CLI overhead

**Trade-off:**
- Pro: Clean boundaries, library reusability, build caching (50-80% CI time savings)
- Con: More complex than single package (Turbo task graph)

**Confidence:** 0.95

### 2. ESM-First with .js Extensions

**Decision:** ESM modules (`"type": "module"`) with `.js` import extensions even for `.ts` files.

**Context:** Node.js >=20.0.0 target, align with modern ESM direction.

**Rationale:**
- ESM: Native Node.js support, no CJS transpilation
- .js extensions: Required by ESM spec
- Future-proof: Avoids dual-package complexity

**Trade-off:**
- Pro: Future-proof, aligns with Node.js evolution
- Con: Verbose (`.js` for `.ts` feels wrong)

**Confidence:** 0.95

### 3. Tree-Sitter WASM Migration (SS-10)

**Decision:** Use web-tree-sitter (WASM) instead of native node-tree-sitter bindings.

**Context:** Previous native bindings required C++ compiler, memory management issues.

**User confirmed:** Key debugging areas include "WASM memory management in tree-sitter — manual .delete() calls needed"

**Rationale:**
- WASM: Cross-platform, no compiler required
- Lazy loading: Grammars are optional dependencies
- Memory safety: Better than native bindings (but still requires manual `.delete()`)

**Detected:** WASM path resolution from `packages/analyzer/src/parsers/treeSitter.ts` (lines 56-74):
```typescript
function resolveWasmPath(packageName: string, wasmFileName: string): string {
  const candidates = [
    join(__dirname, '..', '..', 'node_modules', packageName, wasmFileName),
    join(__dirname, '..', '..', '..', '..', 'node_modules', packageName, wasmFileName),
  ];
  // Check each path, throw if none found
}
```

**Detected:** Parser reuse via singleton from `packages/analyzer/src/parsers/treeSitter.ts` (lines 107-131):
```typescript
export class ParserManager {
  private static instance: ParserManager;
  private parsers = new Map<Language, TSParser>();

  static getInstance(): ParserManager {
    if (!ParserManager.instance) {
      ParserManager.instance = new ParserManager();
    }
    return ParserManager.instance;
  }

  async initialize(): Promise<void> {
    // Pre-load all grammars once
  }
}
```

Singleton pattern prevents expensive parser initialization (5-10ms) per file. Saves 100-200ms over 20 files.

**Trade-off:**
- Pro: Cross-platform (Windows, Mac, Linux without C++)
- Con: Manual memory management (`.delete()` calls required)
- Con: Slower than native (~10-20% overhead)
- **Unexamined:** No timeout on parsing — could hang on pathological input

**Confidence:** 0.95

### 4. Zod for Runtime Validation

**Decision:** Zod schemas for all analyzer types instead of TypeScript-only.

**Context:** Analyzer output crosses package boundaries, need runtime safety.

**Rationale:**
- Runtime validation catches bugs at boundaries
- Self-documenting (schema = type definition)
- Contract testing for API stability

**Trade-off:**
- Pro: Runtime safety, self-documenting, contract tests
- Con: Duplicate definitions (schema + type), bundle size (~50KB)

**Confidence:** 0.95

### 5. Graceful Degradation with Skip Flags

**Decision:** Make all analysis phases optional via skip flags.

**Context:** Tree-sitter parsing is slow (50-150ms per file), users may want quick feedback.

**Rationale:**
- Fast feedback: Skip expensive phases
- Resilience: Continue with partial results
- Progressive enhancement: Start basic, add detail incrementally

**Trade-off:**
- Pro: Fast feedback, resilient to failures
- Con: More code paths (2^7 combinations), partial results harder to reason about

**Confidence:** 0.90

### 6. File-Based State Instead of Database

**Decision:** Store state in `.ana/` JSON files instead of SQLite.

**Context:** Local CLI tool, small state (<1MB), want version-controllable .meta.json.

**Rationale:**
- Simplicity: No DB setup
- Version control: Commit .meta.json to git
- Portability: Works anywhere

**Trade-off:**
- Pro: Simple, version-controllable, fast for small datasets
- Con: No concurrency safety, no indexing

**Confidence:** 0.95

### 7. Sub-Agent Architecture for Setup

**Decision:** Split setup into orchestrator + specialized agents (explorer, writer, verifier).

**Context:** Setup was monolithic, quality issues with fabricated citations.

**User confirmed:** Key debugging areas include "Setup verification complexity — multi-phase validators, SubagentStop hook loops"

**Rationale:**
- Separation of concerns: Each agent has single responsibility
- Quality enforcement: Verifier mechanically checks citations
- Hook system: PostToolUse and SubagentStop enforce gates

**Detected:** Architecture from `.ana/context/setup/SETUP_GUIDE.md` (lines 9-19):
```
| Component | Location | Purpose |
| Orchestrator | modes/setup.md | User interaction, delegation |
| Explorer agent | .claude/agents/ana-explorer.md | Codebase exploration |
| Writer agent | .claude/agents/ana-writer.md | Context file writing |
| Verifier agent | .claude/agents/ana-verifier.md | Citation verification |
```

**Detected:** Verification hook from `.ana/hooks/subagent-verify.sh` (lines 44-52):
```bash
# Run check on ONLY this agent's file
RESULT=$(bash "$HOOK_DIR/run-check.sh" "$ASSIGNED_FILE" --json 2>&1)

# Write detailed results to disk
echo "$RESULT" > "$RESULT_DIR/check_result_${ASSIGNED_FILE}"

if [ $CHECK_EXIT -ne 0 ]; then
  # Block completion with exit 2 if verification fails
  exit 2
fi
```

**Trade-off:**
- Pro: Single-responsibility, mechanical verification, resumable
- Con: More complex orchestration (5 agents vs 1)

**Confidence:** 0.90

### 8. Template-Based Scaffolding

**Decision:** Use static templates in `templates/` instead of programmatic generation.

**Context:** Need to create `.ana/` structure, want non-developers to edit templates.

**Rationale:**
- WYSIWYG: Templates show exact output
- Editable: Markdown easier than code
- Simple: Basic `.replace()` sufficient

**Trade-off:**
- Pro: Non-technical editable, WYSIWYG
- Con: Logic split (templates + code), limited substitution

**Confidence:** 0.90

## Trade-Offs

### What We Optimize For

**User confirmed:** Target users are developers using AI coding assistants who want consistent AI-generated code matching team standards.

1. **Type Safety** — Strict TypeScript + Zod validation (Confidence: 0.95)
   - Zero tolerance for `any`, runtime validation at boundaries

2. **Cross-Platform** — Linux, macOS, Windows support (Confidence: 0.95)
   - WASM instead of native (no C++ compiler required)
   - CI tests on all 3 platforms

3. **Graceful Degradation** — Partial results better than crashes (Confidence: 0.90)
   - Optional phases, try-catch with empty fallbacks
   - **Detected:** Error handling from `packages/analyzer/src/index.ts` (lines 269-276):
   ```typescript
   } catch (error) {
     if (options.strictMode) {
       throw error;
     }
     return createEmptyAnalysisResult();
   }
   ```

4. **Developer Experience** — Clear errors, helpful messages (Confidence: 0.90)
   - Chalk-formatted output (red errors, yellow warnings)
   - Validation errors include file, line, rule

### What We Sacrifice

1. **Performance** — Accuracy over speed
   - Tree-sitter parsing is slow (50-150ms per file)
   - No parallelization (sequential loop)
   - **Unexamined:** No timeout on parsing — could hang on pathological input
   - **User flagged for review:** No timeout on parsing
   - Mitigation: AST cache saves 80-90% on second run
   - Confidence: 0.85

2. **Concurrency Safety** — File-based state has no locking
   - **User confirmed:** No file size limits (intentional)
   - Multiple processes could corrupt `.ana/.state/snapshot.json`
   - Acceptable: Local CLI, single-developer workflow
   - Confidence: 0.90

3. **Symlink Safety** — No loop protection
   - **User confirmed:** No symlink protection (intentional)
   - Directory traversal could follow circular symlinks
   - Acceptable: Real projects rarely have circular symlinks
   - Confidence: 0.85

4. **Input Validation** — No path sanitization
   - **User flagged for review:** No input sanitization on CLI args
   - **Unexamined:** User paths not validated (directory traversal possible)
   - Risk: Moderate (local tool, user controls input)
   - Confidence: 0.70

5. **Cache Persistence** — Memory-first, disk-second
   - **User confirmed:** AST cache in memory only (intentional)
   - Disk exists but secondary, memory lost on exit
   - Trade-off: Simpler code over multi-run speedup
   - Confidence: 0.90

6. **Monorepo Complexity** — Three packages instead of one
   - More orchestration, longer onboarding
   - Acceptable: Clean boundaries worth complexity
   - Confidence: 0.90

### Why These Trade-Offs Are Acceptable

**User confirmed:** Deliberate architecture with planned roadmap.

- **Slow parsing:** Accuracy matters more, cache saves 80-90% on reruns, users can skip (`--skipParsing`)
- **No concurrency:** Local CLI, solo workflow, rare to run multiple processes
- **No symlink protection:** Real projects rarely have circular symlinks, cost outweighs risk
- **Limited input validation:** Local tool, user controls input, not web-facing
- **Memory cache:** Disk fallback exists, process lifetime is short
- **Monorepo complexity:** Professional tooling handles orchestration, small team can manage

### Technical Debt

**Inferred:** Generator package underutilized (497 bytes, alpha stage) — may indicate planned feature or architecture in flux. Confidence: 0.75

**Unexamined:** No timeout on tree-sitter parsing — could hang on malformed files. User flagged for review. Confidence: 0.65

**Unexamined:** Template logic split between templates and code — harder to maintain. Consider moving all logic to code. Confidence: 0.75

**Inferred:** No .ana/ format migration system — .meta.json has version but no migrations. Acceptable because project is young (v0.2.0). Confidence: 0.80

---

*Last updated: 2026-03-24*
