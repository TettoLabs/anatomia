# Scope: Add deep-tier hook/composable detection to patterns analyzer

**Created by:** Ana
**Date:** 2026-04-16

## Intent
The scan knows what libraries a project installs but not how those libraries shape the client-side architecture. `@tanstack/react-query` in deps doesn't tell Build agents "use `useQuery` for all fetching" — it just says the package exists, which deps already show. Tree-sitter confirmation of actual hook/composable call sites bridges the gap between "installed" and "this is how the project works."

Three new framework-agnostic pattern categories — `dataFetching`, `stateManagement`, `formHandling` — surface which hooks/composables are actually used and how dominant they are across the codebase. React hooks, Vue composables, and Nuxt auto-imports are all treated as the same pattern shape: hook-style architectural signals in component frameworks.

## Complexity Assessment
- **Size:** medium
- **Files affected:** ~8-10
  - `packages/cli/src/engine/types/patterns.ts` — add 3 new optional categories to PatternAnalysisSchema
  - `packages/cli/src/engine/analyzers/patterns/dependencies.ts` — Stage 1 detectors for dataFetching, stateManagement, formHandling
  - `packages/cli/src/engine/analyzers/patterns/confirmation.ts` — Stage 3 confirmers with import-file counting + Nuxt function-call path
  - `packages/cli/src/engine/analyzers/patterns/index.ts` — wire new categories into result construction
  - `packages/cli/src/engine/types/engineResult.ts` — no structural change (PatternAnalysis flows through), but createEmptyEngineResult already returns `patterns: null` so no update needed
  - `packages/cli/src/commands/init/skills.ts` — surface new categories in coding-standards Detected section
  - `packages/cli/tests/engine/analyzers/patterns/dependencies.test.ts` — Stage 1 tests
  - `packages/cli/tests/engine/analyzers/patterns/confirmation.test.ts` — Stage 3 tests
  - `packages/cli/tests/engine/types/census.test.ts` — may need PatternAnalysis schema validation test updates
- **Blast radius:** moderate — PatternAnalysis is consumed by scan-engine.ts, skills.ts, and assets.ts. The 3 new fields are optional on PatternAnalysis (same as the existing 5), so consumers that don't destructure them are unaffected. But skills.ts needs explicit updates to display them.
- **Estimated effort:** 150-200 LoC of production code across deps/confirmation/skills, plus ~200-300 LoC of tests. Not a one-session item — closer to a focused half-day.
- **Multi-phase:** no

## Approach
Add three new pattern categories to PatternAnalysis using the same 3-stage pipeline every existing category follows: dependency detection (Stage 1, 0.75 baseline) → tree-sitter confirmation (Stage 3, boost to 0.90-0.95). Categories are framework-agnostic — React's `useQuery` and Nuxt's `useFetch` both resolve to `dataFetching`. Include a dominance signal: count hook-importing files as a fraction of total component files sampled, classify as dominant (>=30%), present (10-30%), or incidental (<10%). Surface results in the coding-standards skill Detected section alongside existing error handling and validation patterns.

Special handling for Nuxt auto-imports: when framework is Nuxt, match function calls for a bounded known set (`useFetch`, `useAsyncData`, `useState`, `useRoute`, `useRouter`, `useRuntimeConfig`) since tree-sitter won't see import statements for auto-imported composables.

## Acceptance Criteria
- AC1: PatternAnalysis type has three new optional fields: `dataFetching`, `stateManagement`, `formHandling`, each typed as `PatternConfidence | MultiPattern | undefined` (same union as existing categories)
- AC2: Stage 1 detects from dependencies — at minimum: `@tanstack/react-query` / `swr` / `@nuxtjs/composition-api` → dataFetching; `zustand` / `jotai` / `recoil` / `@pinia/nuxt` / `pinia` / `@reduxjs/toolkit` / `vuex` → stateManagement; `react-hook-form` / `formik` / `vee-validate` → formHandling. Baseline confidence 0.75.
- AC3: Stage 3 confirms via tree-sitter — scans parsed imports for specific hook/composable names (useQuery, useMutation, useSWR, useForm, useFormik, etc.), boosts confidence based on file count, includes dominance classification in evidence strings
- AC4: Nuxt auto-import path — when framework is `nuxt` or `nextjs-app-dir` (Nuxt detection), confirms via function-call matching for the bounded set: `useFetch`, `useAsyncData`, `useState`, `useRoute`, `useRouter`, `useRuntimeConfig`
- AC5: Dominance thresholds — >=30% of component files = dominant, 10-30% = present, <10% = incidental. Evidence strings include the classification and raw counts (e.g., "useQuery imports in 23/47 component files (dominant)")
- AC6: Results surface in coding-standards skill Detected section (skills.ts injectCodingStandards), following existing pattern display format
- AC7: createEmptyPatternAnalysis() updated if needed (new fields are optional, so likely no change)
- AC8: Existing pattern tests pass unchanged; new tests cover Stage 1 and Stage 3 for all three categories across React and Vue/Nuxt
- AC9: No changes to census type or buildCensus() — this is purely deep-tier pattern detection

## Edge Cases & Risks
- **Nuxt auto-imports produce false positives** — a function named `useFetch` in user code (not from Nuxt) could match. Mitigated by gating on framework detection: only use function-call matching when framework is Nuxt.
- **Multiple data-fetching libraries in one project** — e.g., react-query in the app, SWR in a legacy section. The MultiPattern type already handles this (same as SQLAlchemy sync+async). Plan should decide whether to use MultiPattern or pick the dominant one.
- **Vue Composition API without a library** — projects using raw `ref`/`reactive`/`computed` from `vue` for state management. This is too universal to classify as a stateManagement "pattern" (same reason we don't flag useState). Only flag third-party state libraries.
- **Dominance thresholds are arbitrary** — 30%/10% are starting points based on intuition, not empirical data. Plan should note these as tunable constants, not magic numbers buried in logic.
- **Sampling bias** — proportional sampler selects ~500 files. If the project has 3000 component files and sampling picks 50, the dominance percentage may not be representative. This is an inherent limitation of the existing sampling approach, not introduced by this feature. Note as a known limitation.

## Rejected Approaches
- **Adding to census** — census reads config files only, never source. Hook detection requires tree-sitter parsed files. Wrong layer.
- **Single flat `hooks` category** — loses architectural signal. "useQuery for data fetching and react-hook-form for forms" is actionable for Build; a flat list of hook names is trivia.
- **Call-site counting (AST-walking for invocations)** — more precise dominance data but inconsistent with how all 5 existing confirmers work (they check imports on ParsedFile). Import-file counting is nearly as informative and consistent with the codebase. Future refinement.
- **Separate scope for Vue/Nuxt** — user explicitly rejected splitting. React hooks and Vue composables are the same pattern shape and the implementation is ~20% more code, not 2x.
- **New "architecture patterns" skill section** — scope creep. Coding-standards Detected section already shows error handling and validation. Add hook patterns there. Revisit if the section gets crowded.

## Open Questions
None — all resolved in conversation.

## Exploration Findings

### Patterns Discovered
- Pattern categories follow a consistent 3-stage pipeline: dependencies.ts (Stage 1) → confirmation.ts (Stage 3) → index.ts (orchestrator). Adding a category = one detect* helper + one confirm* helper + wiring in inferPatterns.
- PatternAnalysis uses Zod schema with optional fields. New categories are additive — no breaking change to consumers that don't access them.
- Tree-sitter ParsedFile gives us `imports` (module + names + line) and `functions` (name + line + async + decorators). Import checking is trivial; function-call matching (for Nuxt) requires checking `functions` or walking the AST for call expressions — Plan needs to investigate what ParsedFile exposes for call sites vs definitions.
- skills.ts injectCodingStandards already has a pattern for displaying PatternConfidence via getPatternLibrary/isMultiPattern helpers. New categories follow the same display shape.
- Dominance calculation is new — no existing category does file-ratio classification. This is the genuinely novel part.

### Constraints Discovered
- [OBSERVED] PatternAnalysisSchema (patterns.ts:188-201) — 5 optional category fields, each `z.union([PatternConfidenceSchema, MultiPatternSchema]).optional()`. New fields follow identical shape.
- [OBSERVED] confirmPatternsWithTreeSitter (confirmation.ts:42-62) — calls each confirm* helper sequentially, mutating the patterns object. New confirmers slot in the same way.
- [OBSERVED] inferPatterns (index.ts:118-131) — manually spreads each category from filteredPatterns into the result object. New categories need explicit assignment here.
- [OBSERVED] createEmptyPatternAnalysis (patterns.ts:210-216) — returns only metadata fields, no category fields. Optional fields don't need defaults. No change needed.
- [INFERRED] Nuxt function-call matching may need ParsedFile.functions — but functions captures definitions, not call expressions. Plan must investigate whether tree-sitter extraction captures call sites or if a new extraction pass is needed.

### Test Infrastructure
- dependencies.test.ts — tmpdir-based, tests detectFromDependencies with dep arrays. Pattern: `const patterns = await detectFromDependencies(deps, devDeps, projectType, framework, testDir)` then assert on patterns['category'].
- confirmation.test.ts — creates mock ParsedFile arrays, tests confirmPatternsWithTreeSitter. Pattern: build initial patterns from Stage 1, pass with mock parsed files, assert confidence boost and evidence strings.

## For AnaPlan

### Structural Analog
`detectDatabasePattern` in dependencies.ts + `confirmDatabasePattern` in confirmation.ts — same shape (dep detection → tree-sitter confirmation → confidence boost), similar complexity (multiple libraries per category, variant detection).

### Relevant Code Paths
- `packages/cli/src/engine/types/patterns.ts` — PatternAnalysisSchema definition (line 188), createEmptyPatternAnalysis (line 210)
- `packages/cli/src/engine/analyzers/patterns/dependencies.ts` — detectFromDependencies (line 30), individual detect* helpers (lines 68-514)
- `packages/cli/src/engine/analyzers/patterns/confirmation.ts` — confirmPatternsWithTreeSitter (line 42), individual confirm* helpers (lines 78-640)
- `packages/cli/src/engine/analyzers/patterns/index.ts` — inferPatterns result construction (lines 118-131)
- `packages/cli/src/commands/init/skills.ts` — injectCodingStandards (line 175), getPatternLibrary usage pattern (lines 213-218)
- `packages/cli/src/engine/types/parsed.ts` — ParsedFile shape (line 179), ImportInfo (line 97), FunctionInfo (line 28)

### Patterns to Follow
- dependencies.ts: one private detect* function per category, called from detectFromDependencies. Returns PatternConfidence | null.
- confirmation.ts: one private async confirm* function per category, mutates patterns object. Checks parsedFiles imports/classes/functions.
- skills.ts: getPatternLibrary + isMultiPattern helpers for display. Format: `- Category: libraryName (variant)`.

### Known Gotchas
- inferPatterns (index.ts:118-131) manually lists every category field. If you add fields to PatternAnalysisSchema but forget to spread them in inferPatterns, they'll be silently dropped. The Zod schema won't catch this because the fields are optional.
- ParsedFile.functions captures function *definitions*, not call expressions. For Nuxt auto-import detection, you may need to check if tree-sitter's extraction captures top-level function calls (e.g., `const data = useFetch('/api/...')`) or only `function` / `const fn =` declarations. If it doesn't capture call sites, Plan needs to decide: (a) add call-expression extraction to the tree-sitter parser, or (b) use a simpler regex pass over the raw file content for the Nuxt-specific case. Option (b) is more pragmatic for a bounded set of 6 known hooks.
- Dominance thresholds (30%/10%) should be named constants, not inline magic numbers. First-pass values, expected to tune with real project data.

### Things to Investigate
- What does tree-sitter's ParsedFile actually expose for function call sites (not definitions)? This determines the Nuxt auto-import implementation strategy. If calls aren't in ParsedFile, Plan chooses between extending the parser or a regex fallback for the 6 known Nuxt hooks.
- Should MultiPattern be used for the data-fetching category when multiple libraries coexist (react-query + SWR), or should we just pick the dominant one? The existing multi-pattern infrastructure handles this cleanly but adds complexity.
