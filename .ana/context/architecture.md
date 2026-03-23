# Architecture — anatomia-workspace

## Architecture Pattern

**Type:** Modular monorepo with analyzer/CLI separation — Confidence: 0.95

**User confirmed:** "Deliberately architected following written technical spec, phased MVP approach, analyzer/CLI separation by design" (from Q&A)

**Detected:** Turborepo monorepo with 3 packages organized by domain responsibility (from `pnpm-workspace.yaml`, `turbo.json`)

Example from `pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
  - 'website'
```

Example from `turbo.json` (lines 1-8):
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "env": ["NODE_ENV"]
    },
```

### Package Structure

**Detected:** 3 core packages with clear separation of concerns:

1. **packages/analyzer** — Pure analysis engine (71 .ts files)
   - Zero CLI dependencies
   - Domain: Code parsing, pattern detection, AST analysis
   - Consumed by: CLI package

2. **packages/cli** — User-facing commands (14 .ts files)
   - Depends on: analyzer package
   - Domain: Commands, user interaction, file I/O

3. **packages/generator** — Template generation (alpha)
   - Domain: Markdown template interpolation

Example from `packages/analyzer/src/index.ts` (lines 15-23):
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

Example from `packages/cli/src/commands/setup.ts` (lines 8-21):
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
```

### Architecture Flow

**Detected:** Unidirectional dependency flow:

```
CLI (anatomia-cli)
  ↓ imports
Analyzer (anatomia-analyzer)
  ↓ no external dependencies (just tree-sitter, zod)
Pure functions
```

**Trade-off:** Clean boundaries vs extra package overhead. Worth it for:
- Analyzer reusable by other tools
- Independent versioning (CLI 0.2.0, analyzer 0.1.0)
- Clear test isolation (different coverage thresholds)

**Detected:** Task dependency graph in `turbo.json` (lines 4-5):
```json
"build": {
  "dependsOn": ["^build"],
```

The `^build` syntax means "build this package's dependencies first" — enforces analyzer → CLI build order.

### Why This Pattern

**User stated:** "Deliberately architected monorepo with intentional design choices documented in master_plan/IMPLEMENTATION/TECHNICAL_ARCHITECTURE.md. Planned 'MVP phased approach' with separate analyzer and CLI packages, strict TypeScript with Zod schemas + custom error collectors." (from Q&A)

**Detected:** 2,166-line technical specification at `master_plan/IMPLEMENTATION/TECHNICAL_ARCHITECTURE.md` defines the entire system design before implementation.

**Inferred:** The analyzer/CLI split enables:
- Analyzer as standalone library (importable by other tools)
- CLI focused on UX (commander, chalk, ora for user interaction)
- Analyzer focused on correctness (strict TypeScript, Zod validation)

### Alternatives Considered

**Unexamined:** No documentation of why this was chosen over:
- Single package (simpler, but mixes concerns)
- Full microservices (over-engineered for CLI tool)
- Separate repos (harder to coordinate changes)

## System Boundaries

### Internal Components

**Detected:** Core components organized by responsibility:

#### 1. Analyzer Engine (packages/analyzer/src/)

**Domain directories:**
- `analyzers/` — High-level analysis (structure, patterns)
- `parsers/` — Tree-sitter integration, dependency file readers
- `detectors/` — Project type, framework, monorepo detection
- `cache/` — AST cache, query cache (performance optimization)
- `errors/` — Custom error classes with collector pattern
- `types/` — Zod schemas for runtime validation
- `sampling/` — File sampling to avoid parsing entire codebases

Example from `packages/analyzer/src/index.ts` (lines 26-57):
```typescript
// Import for internal use
import { detectProjectType } from './detectors/projectType.js';
import { detectFramework } from './detectors/framework.js';
import { analyzeStructure } from './analyzers/structure.js';

// Export detectors
export { detectProjectType } from './detectors/projectType.js';
export type { ProjectTypeResult } from './detectors/projectType.js';
export { detectFramework } from './detectors/framework.js';
export type { FrameworkResult } from './detectors/framework.js';

// Export parsers (placeholders for CP1)
export {
  readPythonDependencies,
  readNodeDependencies,
  readGoDependencies,
  readRustDependencies,
  readRubyDependencies,
  readPhpDependencies,
} from './parsers/index.js';

// Export utilities
export { exists, readFile, isDirectory, joinPath } from './utils/file.js';

// Export structure analysis functions (STEP_1.2)
export {
  analyzeStructure,
  findEntryPoints,
  classifyArchitecture,
  findTestLocations,
  buildAsciiTree,
  findConfigFiles,
} from './analyzers/structure.js';
```

**Detected:** Barrel exports pattern — controlled public API surface via `src/index.ts`, hiding implementation details.

#### 2. CLI Commands (packages/cli/src/commands/)

**Commands implemented:**
- `setup` — Multi-phase setup validation (structure, content, cross-refs, quality)
- `check` — Individual context file validation
- `index` — Symbol index generation

Example from `packages/cli/src/commands/setup.ts` (lines 95-100):
```typescript
// Phase 1: Structural validation
console.log(chalk.gray('Checking file structure...'));
const structuralErrors = await validateStructure(anaPath);

// Phase 2: Content validation
console.log(chalk.gray('Checking required sections...'));
```

**Unexamined:** 4-phase validation approach (structure → content → cross-refs → quality) was chosen, but no documentation of why 4 phases vs 1 comprehensive pass. Likely for clear error messages and fail-fast on structural issues.

#### 3. Build Orchestration (Turborepo)

**Detected:** Task pipeline with caching (from `turbo.json`):
- Build depends on upstream packages building first
- Tests depend on build completing
- Outputs cached: `dist/**`, `coverage/**`, `.next/**`
- Global dependencies tracked: `tsconfig.base.json`, `pnpm-lock.yaml`

Example from `turbo.json` (lines 31-34):
```json
"globalDependencies": [
  "tsconfig.base.json",
  "pnpm-lock.yaml"
],
```

**Inferred:** Any change to shared tsconfig or lockfile invalidates all caches — conservative but correct.

### External Services

**Detected:** No external services (from package.json dependencies, exploration findings)

**Evidence:**
- No database libraries (Prisma, TypeORM, Sequelize)
- No auth providers (Auth0, Clerk, Supabase Auth)
- No cloud SDKs (AWS SDK, Google Cloud, Azure)
- No payment processors (Stripe, PayPal)
- No email services (SendGrid, Postmark)

**Pattern:** Local-first CLI tool. All operations are filesystem-based.

**Future:** Technical architecture document describes optional Supabase integration for MVP3 (cloud sync, pattern sharing), but not implemented yet.

### External Dependencies

**Detected:** Minimal, focused external dependencies:

**CLI package (packages/cli/package.json):**
- `commander@12.0.0` — Command parsing
- `chalk@5.3.0` — Terminal colors
- `ora@8.0.0` — Spinners
- `glob@10.3.0` — File pattern matching
- `anatomia-analyzer` — Internal analyzer package

**Analyzer package (packages/analyzer/package.json):**
- `web-tree-sitter@0.25.10` — AST parsing (multi-language)
- `zod@4.3.6` — Runtime validation + type inference
- `js-yaml@4.1.1` — YAML parsing (for frontmatter)

**Inferred:** Dependency choices prioritize:
- Stability (chalk, commander are mature)
- Performance (tree-sitter is fastest parser)
- Type safety (Zod for runtime validation)

### Data Stores

**Detected:** Filesystem-only storage:

**Git-tracked:**
- `.ana/context/*.md` — Generated context files
- `.ana/modes/*.md` — Mode definitions
- `.ana/.meta.json` — Setup metadata

**Gitignored:**
- `.ana/.state/cache/` — AST caches
- `.ana/.state/snapshot.json` — Analysis snapshot
- `.ana/.state/symbol-index.json` — Symbol index

Example from `.gitignore`:
```
.ana/.state/cache/
```

**Trade-off:** File-based vs database:
- ✓ Zero infrastructure setup
- ✓ Works offline
- ✓ Git-trackable (see what changed)
- ✗ No ACID guarantees
- ✗ No concurrent access control

**User confirmed:** Acceptable for CLI tool with single-user local operation.

## Design Decisions

### Decision 1: Monorepo with Turborepo

**Context:** Need to share types between analyzer and CLI, coordinate releases.

**Decision:** Use Turborepo monorepo with pnpm workspaces.

**Detected:** `pnpm-workspace.yaml` defines workspace, `turbo.json` orchestrates builds.

**Rationale (Inferred):** Enables:
- Shared TypeScript config (`tsconfig.base.json`)
- Type-safe cross-package imports
- Single `pnpm install` for all packages
- Parallel builds with caching

**Alternative considered (Unexamined):** Lerna or Nx not mentioned. Turborepo likely chosen for speed and simplicity.

**Evidence:** GitHub Actions CI runs `pnpm build` once, Turbo handles dependency ordering (from `.github/workflows/test.yml`).

### Decision 2: Tree-sitter for AST Parsing

**Context:** Need to parse TypeScript, Python, Go, Rust, Ruby, PHP code for pattern detection.

**Decision:** Use web-tree-sitter instead of language-specific parsers.

**Detected:** `web-tree-sitter@0.25.10` in analyzer dependencies.

**Rationale (from technical architecture doc):**
> "tree-sitter - AST parsing (Python, TS, Go, Rust)"
> "Fast development, npm ecosystem (tree-sitter bindings, file ops)"

**Trade-off:** Single parser for all languages vs language-specific parsers:
- ✓ Consistent API across languages
- ✓ Fast incremental parsing
- ✓ Battle-tested (used by GitHub, Atom)
- ✗ WASM binary (requires initialization, manual memory management)
- ✗ Query syntax learning curve

**User confirmed:** "Tree-sitter WASM parsing and memory management (requires explicit init and tree.delete())" is a known pain point (from Q&A).

Example pain point (Unexamined): Need to call `tree.delete()` manually to avoid memory leaks in long-running processes.

### Decision 3: Zod for Runtime Validation

**Context:** TypeScript provides compile-time types, but analyzer outputs need runtime validation.

**Decision:** Use Zod schemas with type inference.

**Detected:** All analyzer types defined with Zod schemas in `packages/analyzer/src/types/index.ts`.

Example from exploration findings:
```typescript
export const ConfidenceScoreSchema = z.number().min(0.0).max(1.0);
export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;
```

**Rationale (Inferred):**
- Single source of truth (schema = runtime validator + TypeScript type)
- Catch bugs at package boundary (CLI consuming analyzer)
- Self-documenting (schema shows constraints)

**Alternative considered (Unexamined):** io-ts, Yup, AJV not mentioned. Zod likely chosen for TypeScript-first API.

### Decision 4: Graceful Degradation with Error Collector

**Context:** Analysis should continue even if some files fail to parse.

**Decision:** DetectionCollector class accumulates errors without halting execution.

**Detected:** `packages/analyzer/src/errors/DetectionCollector.ts` (lines 9-60):
```typescript
export class DetectionCollector {
  private errors: DetectionError[] = [];
  private warnings: DetectionError[] = [];
  private info: DetectionError[] = [];

  /**
   * Add error (blocks functionality)
   */
  addError(error: DetectionEngineError | DetectionError): void {
    const detectionError =
      error instanceof DetectionEngineError ? error.toDetectionError() : error;
    this.errors.push(detectionError);
  }

  /**
   * Add warning (concerning but continues)
   */
  addWarning(error: DetectionEngineError | DetectionError): void {
    const detectionError =
      error instanceof DetectionEngineError ? error.toDetectionError() : error;
    this.warnings.push(detectionError);
  }
```

**Rationale (Inferred):**
- Don't fail entire analysis if one file is malformed
- Distinguish severity (error vs warning vs info)
- Return partial results with error context

**Trade-off:** Silent failures possible if errors not checked. Mitigated by severity tracking and explicit error inspection.

**User confirmed:** "Graceful degradation can make failures silent" is a known debugging pain point (from Q&A).

### Decision 5: ESM-Only with .js Extensions

**Context:** Modern Node.js supports ESM natively.

**Decision:** Use `type: "module"` in all package.json files, `.js` extensions in imports.

**Detected:** All packages have `"type": "module"` (from exploration).

Example from exploration findings:
```typescript
import { validateStructure, ... } from '../utils/validators.js';
import { VALID_SETUP_TIERS, META_VERSION } from '../constants.js';
```

**Rationale (Inferred):**
- Future-proof (ESM is JavaScript standard)
- Top-level await support
- Better tree-shaking

**Trade-off:** `.js` extensions in TypeScript imports look wrong but are required:
- TypeScript compiles `.ts` → `.js`
- ESM requires file extensions in imports
- Must import `.js` even though source is `.ts`

**Alternative considered (Unexamined):** CommonJS would avoid `.js` extension issue but is legacy.

### Decision 6: Strict TypeScript Configuration

**Context:** Need type safety across packages.

**Decision:** Enable all strict checks + extra safety flags.

**Detected:** From `tsconfig.base.json` (via exploration):
```json
"strict": true,
"noUncheckedIndexedAccess": true,
"noImplicitOverride": true,
"noPropertyAccessFromIndexSignature": true,
"noImplicitReturns": true,
"noFallthroughCasesInSwitch": true,
"exactOptionalPropertyTypes": true
```

**Rationale (Inferred):**
- Catch bugs at compile time
- Force explicit error handling
- Prevent index access bugs (`array[i]` could be undefined)

**Trade-off:** More verbose code (`array[i]!` or optional chaining required) but fewer runtime errors.

**Evidence:** Project maturity — high test coverage (80-85% thresholds), multi-OS CI, suggests strictness is valued over speed.

### Decision 7: Multi-Phase Validation in Setup

**Context:** Setup validation needs to check structure, content, cross-references, quality.

**Decision:** 4 separate validation phases run sequentially.

**Detected:** From `packages/cli/src/commands/setup.ts` (lines 95-100):
```typescript
// Phase 1: Structural validation
console.log(chalk.gray('Checking file structure...'));
const structuralErrors = await validateStructure(anaPath);

// Phase 2: Content validation
console.log(chalk.gray('Checking required sections...'));
```

**Rationale (Inferred):**
- Fail fast (structural errors block content validation)
- Clear user feedback (4 progress messages)
- Separation of concerns (each phase is independent function)

**Unexamined:** Why 4 phases specifically? Could be 2 (structure + semantics) or 6 (more granular). Likely based on feedback needs.

### Decision 8: Coverage Thresholds by Package

**Context:** Analyzer is core logic, CLI is user-facing.

**Decision:** Higher coverage for analyzer (85%) than CLI (80%).

**Detected:** From exploration findings (vitest.config.ts in each package):
- CLI: 80% lines/functions
- Analyzer: 85% lines/functions

**Rationale (Inferred):**
- Analyzer errors affect all consumers (bugs propagate)
- CLI errors are visible to users (easier to catch in manual testing)
- 5% difference signals priority without being dogmatic

**Trade-off:** Arbitrary thresholds vs measured risk. These are reasonable but not scientifically derived.

## Trade-Offs

### What We Optimized For

**1. Correctness over speed**

**Detected:** Strict TypeScript, Zod validation, high test coverage, 4-phase validation.

**User confirmed:** "Methodical and quality-focused" team approach (from Q&A).

**Evidence:**
- All strict TypeScript checks enabled
- Runtime validation with Zod (performance cost)
- Multi-phase validation (slower but clearer errors)

**2. Modularity over simplicity**

**Detected:** 3-package monorepo instead of single package.

**Trade-off:** More complex setup (Turborepo, workspace configuration) but cleaner boundaries.

**Rationale (Inferred):** Enables analyzer reuse by other tools, independent versioning.

**3. Type safety over flexibility**

**Detected:** Explicit types everywhere, no `any`, Zod schemas for runtime.

**Example:** `noUncheckedIndexedAccess` forces all array access to account for undefined.

**Trade-off:** More verbose code but fewer runtime errors.

**4. Developer experience over user onboarding**

**Detected:** CLI uses commander, chalk, ora for nice UX. Analyzer uses tree-sitter (requires WASM setup).

**Trade-off:** Users need Node 20+, tree-sitter WASM binaries. But developers get fast, multi-language parsing.

**User confirmed:** "Tree-sitter WASM parsing and memory management" is a pain point (from Q&A).

### What We Sacrificed

**1. Simplicity**

**Cost:** Monorepo adds complexity (Turborepo config, workspace setup, task dependencies).

**Why acceptable:** Team is small (solo/2 people) and technically skilled. Can handle the complexity for long-term benefits.

**User confirmed:** "Solo/small teams using AI-assisted development workflows, quality-focused TypeScript developers" (from Q&A).

**2. Performance (in some areas)**

**Cost:** Runtime validation with Zod, 4-phase validation, strict TypeScript compilation.

**Why acceptable:** CLI tool runs locally, not latency-sensitive. Correctness more important than milliseconds.

**Unexamined:** No benchmarks for validation overhead. Likely negligible for typical codebases.

**3. Backward compatibility**

**Cost:** ESM-only, Node 20+ requirement, strict TypeScript.

**Why acceptable:** Modern greenfield project. Target users are early adopters with modern toolchains.

**Detected:** `"engines": { "node": ">=20.0.0" }` in package.json (from exploration).

**4. Immediate feature completeness**

**Cost:** Generator package in alpha, federation features planned but not implemented.

**Why acceptable:** Phased MVP approach. Ship analyzer + CLI first, add federation later.

**User confirmed:** "Phased MVP approach, analyzer/CLI separation by design" (from Q&A).

**Detected:** Implementation status comments in analyzer:
```typescript
/**
 * Implementation status:
 * - CP0: Types and infrastructure ✓
 * - CP1: Dependency parsers (planned)
 * - CP2: Framework detection (planned)
 * - CP3: Edge case handling (planned)
 * - CP4: CLI integration (planned)
 */
```

### Technical Debt

**1. WASM memory management**

**Debt:** Tree-sitter requires manual `tree.delete()` calls, explicit parser initialization.

**User confirmed:** "Tree-sitter WASM parsing and memory management (requires explicit init and tree.delete())" (from Q&A).

**Mitigation:** ParserManager class centralizes lifecycle management.

**Unexamined:** No automated cleanup or finalizers. Risk of memory leaks in long-running processes.

**2. Silent graceful degradation**

**Debt:** Errors collected but might not be surfaced to users.

**User confirmed:** "Graceful degradation can make failures silent" (from Q&A).

**Mitigation:** DetectionCollector tracks severity, CLI checks error counts.

**Unexamined:** No metrics on how often partial results are returned with hidden errors.

**3. 4-phase validation complexity**

**Debt:** Setup validation has 4 sequential phases (structure, content, cross-refs, quality).

**User confirmed:** "Multi-phase validation complexity" is a pain point (from Q&A).

**Trade-off:** Clear error messages vs execution complexity. Chosen clarity over simplicity.

**Unexamined:** Could phases be parallelized? Likely not — content validation requires structure to be valid first.

**4. Monorepo detection fallback strategies**

**Debt:** 6 fallback strategies for monorepo detection (from exploration).

**User confirmed:** "Monorepo detection fallbacks" is a pain point (from Q&A).

**Rationale (Inferred):** Different monorepo tools (Turborepo, Nx, Lerna, pnpm workspaces, Yarn workspaces) require different detection logic.

**Unexamined:** Which fallback is most common? Are all 6 necessary, or could some be dropped?

### Future Trade-Off Decisions

**1. Federation (MVP2+)**

**Upcoming decision:** File-based vs network-based node communication.

**Technical architecture specifies:** File-based (write to `.ana/federation/inbox/*.json`).

**Trade-off:** Zero infrastructure but slower, async, human-in-loop vs real-time but requires networking.

**2. Cloud sync (MVP3+)**

**Upcoming decision:** Local-first vs cloud-enabled by default.

**Technical architecture specifies:** Opt-in Supabase sync.

**Trade-off:** Privacy/offline vs collaboration features.

**3. Plugin system (Post-MVP3)**

**Upcoming decision:** Extensibility vs security.

**Unexamined:** How to sandbox plugins? Load order? Version compatibility?

---

*Last updated: 2026-03-23*
