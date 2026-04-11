# Anatomia CLI — Architecture

A **map**, not a manual. Every file path and code identifier below is verified against the codebase; if something here doesn't match the code, the code is right.

Anatomia scans a project, detects stack + conventions + patterns, and writes AI-ready context (CLAUDE.md, AGENTS.md, `.ana/`, `.claude/skills/`) so AI coding tools get project-specific guidance. 9 commands; the heart is `ana scan` (pure read) and `ana init` (writes). Every display surface reads from a single unified result type — `EngineResult`.

---

## Module Layout

```
packages/cli/src/
  index.ts                          — CLI entry: registers all 9 commands

  commands/                         — Command handlers (one file per command)
    init/                           — `ana init` split into 6 files (Item 14c)
      index.ts                      — Orchestrator + command registration
      types.ts                      — InitCommandOptions, InitState
      preflight.ts                  — validateInitPreconditions
      assets.ts                     — directory creation, scaffolds, hook scripts
      state.ts                      — runAnalyzer, saveScanJson, success display
      skills.ts                     — scaffoldAndSeedSkills, SKILL_INJECTORS
    scan.ts                         — `ana scan`
    setup.ts                        — `ana setup` (check / index / complete sub-commands)
    artifact.ts                     — `ana artifact save / save-all`
    work.ts                         — `ana work status / complete`
    proof.ts                        — `ana proof`
    pr.ts                           — `ana pr`
    agents.ts                       — `ana agents`
    verify.ts                       — `ana verify pre-check` (renamed from verify-precheck, Item 23b)
    check.ts                        — validateSetupCompletion (shared internal)
    symbol-index.ts                 — createIndexCommand (shared internal)

  engine/                           — Detection + analysis engine
    index.ts                        — Legacy analyze() orchestrator (WASM-deferred dynamic imports)
    scan-engine.ts                  — scanProject(): the public entry point for `ana scan`

    analyzers/
      conventions/                  — naming, imports, indentation (4 files)
      patterns/                     — 4 files: index, dependencies, confirmation, confidence (Item 14a)
      structure/                    — 6 files: index, entry-points, architecture, test-locations, tree-builder, config-files (Item 14b)

    detectors/
      framework.ts                  — detectFramework() dispatches to per-language registry
      node/                         — 5 detector files + framework-registry.ts (Item 17)
      python/                       — 4 detector files + framework-registry.ts (Item 17)
      go.ts                         — detectGoFramework (single-function)
      rust.ts                       — detectRustFramework (single-function)
      commands.ts                   — detectCommands (build/test/lint/dev scripts)
      dependencies.ts               — detectFromDeps, detectAiSdk, AI_PACKAGES
      deployment.ts                 — detectDeployment (Vercel/Docker/Fly.io/Railway/…), detectCI
      git.ts                        — detectGitInfo
      monorepo.ts                   — detectMonorepo (see "Known Debt")
      packageManager.ts             — detectPackageManager
      projectType.ts                — detectProjectType

    types/                          — Zod schemas + inferred TS types
      engineResult.ts               — EngineResult interface + createEmptyEngineResult factory
      conventions.ts                — ConventionAnalysis, NamingConventionResult
      patterns.ts                   — PatternAnalysis, PatternConfidence, MultiPattern, getPatternLibrary, isMultiPattern
      parsed.ts                     — ParsedFile, ParsedAnalysis (tree-sitter output)
      structure.ts                  — StructureResult
      index.ts                      — AnalysisResult, ProjectType, createEmptyAnalysisResult

    parsers/
      treeSitter.ts                 — ParserManager, parseProjectFiles
      node.ts, python.ts, go.ts,    — Dependency file readers (readNodeDependencies, etc.)
      rust.ts, ruby.ts, php.ts
      node/, python/                — Language-specific sub-parsers
      queries.ts                    — tree-sitter query strings

    utils/
      routeHandlers.ts              — isRouteHandlerFile, isHttpMethodName (Item 9)
      serviceAnnotation.ts          — annotateServiceRoles (Item 5)
      confidence.ts, directory.ts, file.ts, importScanner.ts

    cache/astCache.ts               — ASTCache (disk + memory cache for parsed trees)
    errors/                         — DetectionCollector, DetectionError
    sampling/                       — File sampling logic for tree-sitter

  types/                            — Cross-command types (Item 13)
    proof.ts                        — ProofChainEntry
    symbol-index.ts                 — SymbolEntry, SymbolIndex

  utils/                            — Shared utilities (not engine-specific)
    git-operations.ts               — readArtifactBranch, getCurrentBranch (Item 13)
    gotchas.ts                      — matchGotchas (compound-trigger matching against GOTCHAS)
    displayNames.ts                 — language/framework/pattern display name maps
    scaffold-generators.ts          — CLAUDE.md/AGENTS.md/context scaffolds
    validators.ts                   — getProjectName, fileExists
    file-writer.ts                  — atomic write helper
    fileCounts.ts                   — source/test/config file counting
    proofSummary.ts                 — generateProofSummary

  data/
    gotchas.ts                      — GOTCHAS: pre-populated trigger-based gotchas

  constants.ts                      — CORE_SKILLS, CONDITIONAL_SKILL_TRIGGERS, computeSkillManifest, getStackSummary
```

---

## Data Flow: `ana scan`

`scan.ts` → `scanProject()` at `src/engine/scan-engine.ts:322`. The function runs an 11-step pipeline, each step feeding into the `EngineResult` return value:

1. `getProjectName()` — `package.json` / `go.mod` / directory name
2. `detectMonorepoInfo()` — workspace tool + sub-packages
3. `detectPackageManager()` — lockfile signal
4. `readDependencies()` + `detectFromDeps()` — stack candidates (aggregated across monorepo packages)
5. Dynamic `import('./index.js')` → `analyze()` — project type, framework, structure, parsed files, patterns, conventions
6. **Stack construction** — 8 `stack.*` fields assigned at construction; analyzer enriches gaps; TypeScript override for Node.js projects with tsconfig
7. `countFiles()` — source/test/config/total
8. Structure extraction from analyzer result
9. `detectCommands()` — build/test/lint/dev + `all` map
10. `detectGitInfo()` — head/branch/commits/contributors
11. `detectExternalServices()` + `detectSchemas()` + `detectSecrets()` + `detectDeployment()` + `detectCI()`; then `annotateServiceRoles()` marks each service with its stack roles (empty array = standalone)

Returns a fully-typed `EngineResult`. `scan.ts` either prints human output, writes JSON (`--json`), or saves to `.ana/scan.json` (`--save`).

## Data Flow: `ana init`

`commands/init/index.ts:39` → `registerInitCommand()`. 9-phase atomic operation:

1. **Pre-scan validation** — `validateInitPreconditions()` in `preflight.ts`
2. **Temp directory** — all writes go to `/tmp/ana-init-<rand>/`; nothing touches the real project until phase 9
3. `createDirectoryStructure()` in `assets.ts` — builds `.ana/context/`, `.ana/state/`, `.ana/plans/`
4. **Scan** — `runAnalyzer()` in `state.ts` runs the scan engine against the project
5. **Scaffolds** — `generateScaffolds()` writes `.ana/context/*.md` from templates
6. **Skills** — `scaffoldAndSeedSkills()` in `skills.ts` copies skill templates, injects `## Detected` sections using `SKILL_INJECTORS`, pre-populates `## Gotchas` on fresh installs via `matchGotchas()`
7. **Artifacts** — `saveScanJson()`, `createAnaJson()`, `buildSymbolIndexSafe()`, `copyHookScripts()`
8. **Preservation** — if `--force`, restore state/ backup, context/ backup, and ana.json backup
9. **Atomic rename** — `atomicRename()` swaps tmp → real; then `createClaudeConfiguration()` writes CLAUDE.md + AGENTS.md + `.claude/` config outside the temp dir

On failure: the tmp dir is removed, the project is unchanged.

---

## The `EngineResult` Source of Truth

Every display surface (CLAUDE.md, AGENTS.md, skill Detected sections, init success, `ana scan` output) reads a single `EngineResult` from `scanProject()`. Type at `src/engine/types/engineResult.ts:15`; factory `createEmptyEngineResult()` at line 252 is the single edit point for adding fields (tsc enforces completeness).

Five sub-fields compose their detector types directly (Phase 1 unification):

- `commands: DetectedCommands & { packageManager: string }` — `detectors/commands.ts`
- `git: GitInfo` — `detectors/git.ts`
- `deployment: DetectedDeployment & DetectedCI` — `detectors/deployment.ts`
- `patterns: PatternAnalysis | null` — `engine/types/patterns.ts`
- `conventions: ConventionAnalysis | null` — `engine/types/conventions.ts`

Each composition has a compile-time assertion in `tests/engine/types.test.ts` that fails if the field regresses to an inline type.

---

## Extension Points

### Add a framework detector

**Location:** `src/engine/detectors/<language>/<framework>.ts` + `src/engine/detectors/<language>/framework-registry.ts`

1. Create `detectors/<language>/<name>.ts` exporting `async detect<Name>(rootPath: string, deps: string[]): Promise<Detection>`.
2. Add the import + function reference to the registry array in `framework-registry.ts`.
3. Priority order matters — first match wins. Put disambiguating frameworks before their parents (e.g., Next.js before React, Nest.js before Express).

Go and Rust currently have single-function detectors (`detectors/go.ts`, `detectors/rust.ts`) and no registry — when either grows multiple detector files, add a `framework-registry.ts` alongside.

### Add a service

**Location:** `src/engine/scan-engine.ts:107` → `EXTERNAL_SERVICE_PACKAGES: Record<string, { name: string; category: string }>`

Add one entry per npm package name. Naming convention (Item 18): for multi-provider SDKs, use the branded name in stack and parenthesized variants in services (e.g., stack shows `Vercel AI`, services show `Vercel AI (Anthropic)`, `Vercel AI (OpenAI)`). The exact-match filter in `injectAiPatterns` relies on this split.

AI services have a second registration site: `AI_PACKAGES` in `src/engine/detectors/dependencies.ts:72`.

### Add a gotcha

**Location:** `src/data/gotchas.ts:17` → `GOTCHAS: GotchaEntry[]`

Each entry has:
- `id` — unique slug
- `triggers` — `Record<string, string>` mapping stack field to expected value. **ALL** triggers must match for the gotcha to fire. Compound triggers (e.g., `framework: 'Next.js' AND database: 'Supabase'`) make the gotcha precise.
- `skill` — which skill file to inject into (`coding-standards`, `testing-standards`, `data-access`, etc.)
- `text` — the gotcha body line

The matcher is `matchGotchas()` at `src/utils/gotchas.ts:16` — called by `scaffoldAndSeedSkills` only on fresh installs. Re-inits do NOT re-inject gotchas (user edits are preserved; see `allowGotchaInjection` flag in `skills.ts`).

### Add a skill template

**Location:** `packages/cli/templates/.claude/skills/<skill>/SKILL.md` + `src/constants.ts` + `src/commands/init/skills.ts`

1. Create the template file with `## Detected`, `## Rules`, `## Gotchas`, `## Examples` sections.
2. If the skill is always scaffolded, add to `CORE_SKILLS` at `constants.ts:49`.
3. If the skill is conditional (e.g., only for projects with AI SDK), add a predicate to `CONDITIONAL_SKILL_TRIGGERS` at `constants.ts:60`.
4. To inject project-specific data into the `## Detected` section, add an injector function to `SKILL_INJECTORS` at `commands/init/skills.ts:152`.

`computeSkillManifest()` at `constants.ts:73` combines core + matched conditional skills — this is what `scaffoldAndSeedSkills` iterates.

### Add a command

**Location:** `src/commands/<name>.ts` + `src/index.ts`

1. Export `function registerXCommand(program: Command): void` — all 9 existing commands follow this pattern (Item 22 standardization).
2. Import and call from `src/index.ts`.

---

## Design Decisions

**One type per concept, zero mapping functions.** Phase 1 unified 5 type pairs (conventions, patterns, commands, git, deployment). Inline duplicates + hand-written mapping functions silently dropped fields on drift; now composed directly, enforced by compile-time assertions in `tests/engine/types.test.ts`. Adding a field to a detector flows through automatically.

**Exact match over substring.** `annotateServiceRoles` at `src/engine/utils/serviceAnnotation.ts:28` replaced 4 copies of substring dedup that broke on the "Vercel AI" / "Vercel" collision. Exact match + "X Auth" suffix special case for Supabase-as-auth. Display filters standalone services via `stackRoles.length === 0`.

**File-scoped HTTP filter.** `isRouteHandlerFile` at `src/engine/utils/routeHandlers.ts:54` suppresses `GET`/`POST`/etc. from naming stats **only** inside `app/**/route.ts` (Next.js) and `src/routes/**/+server.ts` (SvelteKit). Elsewhere, a function named `GET` counts as SCREAMING_SNAKE_CASE.

**Dynamic imports for WASM deferral.** `analyze()` at `engine/index.ts:52` uses `await import(...)` because tree-sitter loads native WASM at module-evaluation time — top-level imports would crash `ana --help`. String-literal specifiers are grep/madge invisible; see the inline comment in `analyze()` for the rename hazard.

**Phantom code gets deleted.** Item 4 removed `typeHints.ts` and `docstrings.ts` — they read nonexistent fields via `as unknown as` and always returned zeros. **Do not recreate** without real tree-sitter extraction.

**tsc is the enforcement layer.** `pnpm build` runs `tsc --noEmit` before `tsup`. Husky pre-commit runs typecheck + typecheck:tests + lint. CI runs the same three on Ubuntu/macOS/Windows × Node 20/22. No path for untyped code to reach main.

---

## Known Debt

Full rationale in `APRIL_10_PHASE2_TESTING_REPORT.md`. Short form:

- **Parallel monorepo detection** — `detectMonorepo` (detectors/monorepo.ts, dynamic-import consumer) vs inline `detectMonorepoInfo` in `scan-engine.ts`. Different signatures, different consumers. S19 unification.
- **Unreachable catch in `parsers/node.ts`** — outer `try/catch` can't fire; `utils/file.ts:readFile` and `parsePackageJson` both swallow upstream. Delete or surface errors.
- **`tests/scaffolds/test-types.ts`** — drifted inline copy of `EngineResult` with stricter shape. Item 19 worked around it; real fix is deletion.
- **`FrameworkResult` vs `Detection`** — structurally identical interfaces in two files. Works via structural assignability; cosmetic drift trap.
- **`stack.workspace` not in Stack line** — `getStackSummary` at `constants.ts:98` excludes it deliberately. UX decision pending.

---

*State after S18 Phase 3. Re-verify every reference in this file against the codebase when you edit it.*
