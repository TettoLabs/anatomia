# Spec: Add deep-tier hook/composable detection to patterns analyzer

**Created by:** AnaPlan
**Date:** 2026-04-16
**Scope:** .ana/plans/active/add-hook-detection/scope.md

## Approach

Add three new pattern categories to PatternAnalysis: `dataFetching`, `stateManagement`, `formHandling`. These follow the same 3-stage pipeline as existing categories:

1. **Stage 1 (dependencies.ts):** Detect from package dependencies with 0.75 baseline confidence
2. **Stage 3 (confirmation.ts):** Confirm via tree-sitter import checking, boost to 0.90-0.95, calculate dominance

**Key design decisions:**

- **MultiPattern for competing libraries:** When 2+ libraries in the same category cross the present threshold (>=10% of component files), use MultiPattern to preserve architectural signal. Example: react-query (dominant, 40%) + SWR (present, 15%) indicates intentional coexistence. Single library → plain PatternConfidence.

- **Dominance thresholds as named constants:** `DOMINANCE_THRESHOLD_DOMINANT = 0.30` and `DOMINANCE_THRESHOLD_PRESENT = 0.10` at module top. Evidence strings include classification and raw counts.

- **Nuxt auto-import via regex:** ParsedFile.functions captures definitions, not call expressions. For the 6 known Nuxt composables (`useFetch`, `useAsyncData`, `useState`, `useRoute`, `useRouter`, `useRuntimeConfig`), scan raw file content with regex when framework is `nuxt`. Framework-gated, bounded set.

- **Import-file counting for dominance:** Count files with hook imports as fraction of total component files in `parsedFiles`. Consistent with existing confirmers.

## Output Mockups

**Scan output (coding-standards Detected section):**
```
- Data fetching: react-query (dominant)
- State management: zustand (present)
- Form handling: react-hook-form (dominant)
```

**MultiPattern evidence (when 2+ libraries present):**
```
- Data fetching: react-query (primary), swr (also detected)
```

**Evidence strings in scan.json:**
```json
{
  "dataFetching": {
    "library": "react-query",
    "confidence": 0.95,
    "evidence": [
      "@tanstack/react-query in dependencies",
      "useQuery imports in 23/47 component files (dominant)",
      "useMutation imports in 12 files"
    ]
  }
}
```

**Nuxt project evidence:**
```json
{
  "dataFetching": {
    "library": "nuxt-composables",
    "confidence": 0.90,
    "evidence": [
      "Nuxt framework detected",
      "useFetch calls in 15/32 component files (dominant)",
      "useAsyncData calls in 8 files"
    ]
  }
}
```

## File Changes

### `packages/cli/src/engine/types/patterns.ts` (modify)

**What changes:** Add 3 new optional fields to PatternAnalysisSchema: `dataFetching`, `stateManagement`, `formHandling`. Each typed as `z.union([PatternConfidenceSchema, MultiPatternSchema]).optional()`.

**Pattern to follow:** Existing category fields (lines 191-195). Identical shape.

**Why:** Schema must accept the new categories for Zod validation. Optional fields don't require changes to createEmptyPatternAnalysis().

### `packages/cli/src/engine/analyzers/patterns/dependencies.ts` (modify)

**What changes:** Add three new detect* helpers: `detectDataFetchingPattern`, `detectStateManagementPattern`, `detectFormHandlingPattern`. Call them from `detectFromDependencies`. Each returns PatternConfidence | null.

**Pattern to follow:** `detectDatabasePattern` (lines 174-268). Same structure: check deps array for known packages, return PatternConfidence with library name, 0.75 confidence, evidence string.

**Why:** Stage 1 detection establishes baseline confidence from dependencies.

### `packages/cli/src/engine/analyzers/patterns/confirmation.ts` (modify)

**What changes:** Add three new confirm* helpers: `confirmDataFetchingPattern`, `confirmStateManagementPattern`, `confirmFormHandlingPattern`. Add dominance threshold constants at module top. Add helper to count hook-importing files and classify dominance. Add Nuxt auto-import regex scanner.

**Pattern to follow:** `confirmDatabasePattern` (lines 333-500) and `detectMultipleDatabasePatterns` (lines 666-764). The database confirmer shows multi-pattern detection; the multi-pattern helper shows how to construct MultiPattern objects.

**Why:** Stage 3 confirmation boosts confidence based on actual code usage. Dominance classification provides actionable signal for Build agents.

### `packages/cli/src/engine/analyzers/patterns/index.ts` (modify)

**What changes:** Add the 3 new category fields to the result construction in `inferPatterns` (lines 118-130). Spread `dataFetching`, `stateManagement`, `formHandling` from `filteredPatterns` into the result object.

**Pattern to follow:** Lines 120-124 where existing categories are spread.

**Why:** If you add fields to PatternAnalysisSchema but forget to spread them here, they're silently dropped. This is the gotcha the scope called out.

### `packages/cli/src/commands/init/skills.ts` (modify)

**What changes:** Add display logic for new categories in `injectCodingStandards`. Show after error handling, before UI. Include dominance classification in parentheses.

**Pattern to follow:** Lines 213-218 where errorHandling is displayed. Use `getPatternLibrary` and `isMultiPattern` helpers.

**Why:** New patterns must surface in the coding-standards skill Detected section for agents to use them.

### `packages/cli/tests/engine/analyzers/patterns/dependencies.test.ts` (modify)

**What changes:** Add test cases for Stage 1 detection of all three categories. Cover React, Vue/Nuxt, and edge cases.

**Pattern to follow:** Existing test structure (lines 18-45 FastAPI example). Create deps array, call detectFromDependencies, assert on patterns['dataFetching'].

**Why:** Stage 1 detection needs test coverage for each library in each category.

### `packages/cli/tests/engine/analyzers/patterns/confirmation.test.ts` (modify)

**What changes:** Add test cases for Stage 3 confirmation of all three categories. Test dominance classification, MultiPattern construction, Nuxt auto-import path.

**Pattern to follow:** Existing test structure (lines 37-76 Pydantic example). Create mock ParsedFile arrays with imports, call confirmPatternsWithTreeSitter, assert on confidence boost and evidence strings.

**Why:** Stage 3 confirmation and dominance calculation need test coverage.

## Acceptance Criteria

From scope:
- [ ] AC1: PatternAnalysis type has three new optional fields: `dataFetching`, `stateManagement`, `formHandling`, each typed as `PatternConfidence | MultiPattern | undefined`
- [ ] AC2: Stage 1 detects from dependencies — at minimum: `@tanstack/react-query` / `swr` / `@nuxtjs/composition-api` → dataFetching; `zustand` / `jotai` / `recoil` / `@pinia/nuxt` / `pinia` / `@reduxjs/toolkit` / `vuex` → stateManagement; `react-hook-form` / `formik` / `vee-validate` → formHandling. Baseline confidence 0.75.
- [ ] AC3: Stage 3 confirms via tree-sitter — scans parsed imports for specific hook/composable names, boosts confidence based on file count, includes dominance classification in evidence strings
- [ ] AC4: Nuxt auto-import path — when framework is `nuxt`, confirms via regex matching for the bounded set: `useFetch`, `useAsyncData`, `useState`, `useRoute`, `useRouter`, `useRuntimeConfig`
- [ ] AC5: Dominance thresholds — >=30% of component files = dominant, 10-30% = present, <10% = incidental. Evidence strings include the classification and raw counts
- [ ] AC6: Results surface in coding-standards skill Detected section (skills.ts injectCodingStandards), following existing pattern display format
- [ ] AC7: createEmptyPatternAnalysis() unchanged (new fields are optional)
- [ ] AC8: Existing pattern tests pass unchanged; new tests cover Stage 1 and Stage 3 for all three categories
- [ ] AC9: No changes to census type or buildCensus()

Implementation criteria:
- [ ] All tests pass: `cd packages/cli && pnpm vitest run`
- [ ] No lint errors: `pnpm run lint`
- [ ] MultiPattern used when 2+ libraries cross present threshold (>=10%)

## Testing Strategy

- **Unit tests (dependencies.test.ts):**
  - React project with @tanstack/react-query → dataFetching detected
  - React project with zustand → stateManagement detected
  - React project with react-hook-form → formHandling detected
  - Vue project with pinia → stateManagement detected
  - Project with multiple data-fetching libs (react-query + swr) → both detected
  - Empty deps → no hook patterns detected

- **Unit tests (confirmation.test.ts):**
  - useQuery imports boost dataFetching confidence
  - Dominance classification: >30% files → "dominant" in evidence
  - Dominance classification: 10-30% files → "present" in evidence
  - Dominance classification: <10% files → "incidental" in evidence
  - MultiPattern construction when 2+ libraries >=10%
  - Nuxt useFetch calls detected via regex (framework-gated)
  - No boost when imports not found

- **Edge cases:**
  - Vue Composition API (raw ref/reactive) → NOT detected as stateManagement (too universal)
  - User function named `useFetch` in non-Nuxt project → NOT detected (framework-gated)
  - Single library at 15% → plain PatternConfidence, not MultiPattern

## Dependencies

- Tree-sitter WASM must be available for confirmation tests
- Existing pattern infrastructure (PatternConfidenceSchema, MultiPatternSchema, isMultiPattern, getPatternLibrary)

## Constraints

- Engine files have zero CLI dependencies (no chalk, no ora)
- All imports use `.js` extensions
- Use `import type` for type-only imports
- Explicit return types on exported functions
- Confidence values capped at 1.0

## Gotchas

- **inferPatterns manual spread:** The result construction in index.ts (lines 118-131) manually lists every category field. If you add fields to PatternAnalysisSchema but forget to spread them in inferPatterns, they'll be silently dropped. The Zod schema won't catch this because the fields are optional.

- **ParsedFile.functions is definitions, not calls:** Don't try to use ParsedFile.functions for Nuxt auto-import detection. It captures `function useFetch()` definitions, not `useFetch()` call sites. Use regex on raw file content instead.

- **Framework detection for Nuxt:** The framework field may be `nuxt` or `nuxt3`. Check for both when gating the auto-import regex path.

- **Component file heuristic:** For dominance calculation, "component files" means files in parsedFiles with `.tsx`, `.jsx`, `.vue` extensions, or files in `components/`, `pages/`, `app/` directories. Don't count utility files or test files.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions: `import { isMultiPattern } from '../../types/patterns.js'`
- Use `import type` for type-only imports, separate from value imports
- Engine files have zero CLI dependencies — no chalk, ora, or commander in patterns/
- Explicit return types on all exported functions
- Early returns over nested conditionals
- Never disable lint rules inline

### Pattern Extracts

**Stage 1 detector pattern (dependencies.ts:174-200):**
```typescript
function detectDatabasePattern(
  deps: string[],
  framework: string | null,
  schemaFiles: SchemaFileEntry[],
): PatternConfidence | null {
  // Python database libraries
  if (deps.includes('sqlalchemy')) {
    // Detect async variant by checking for async drivers
    const hasAsyncDrivers = deps.some(d =>
      d.includes('asyncpg') ||
      d.includes('aiomysql') ||
      d.includes('aiosqlite')
    );

    const baseConfidence = 0.80;
    const companionBoost = hasAsyncDrivers ? 0.05 : 0;
    const confidence = baseConfidence + companionBoost;

    return {
      library: 'sqlalchemy',
      variant: hasAsyncDrivers ? 'async' : 'sync',
      confidence,
      evidence: hasAsyncDrivers
        ? ['sqlalchemy in dependencies', 'async driver detected']
        : ['sqlalchemy in dependencies'],
    };
  }
  // ... more checks
  return null;
}
```

**Stage 3 confirmer with multi-pattern (confirmation.ts:666-763):**
```typescript
export async function detectMultipleDatabasePatterns(
  parsedFiles: ParsedFile[]
): Promise<MultiPattern | PatternConfidence | null> {
  const detected: PatternConfidence[] = [];

  // Count AsyncSession usage
  const asyncSessionFiles = parsedFiles.filter(f =>
    f.imports.some(imp =>
      imp.module.includes('sqlalchemy.ext.asyncio') &&
      (imp.names.includes('AsyncSession') || imp.names.includes('create_async_engine'))
    )
  ).length;

  if (asyncSessionFiles > 0) {
    detected.push({
      library: 'sqlalchemy',
      variant: 'async',
      confidence: 0.80 + (asyncSessionFiles >= 5 ? 0.15 : 0.10),
      evidence: [`AsyncSession imports in ${asyncSessionFiles} file(s)`],
      primary: true,
    });
  }

  // Single pattern → PatternConfidence
  if (detected.length === 1) {
    return detected[0];
  }

  // Multiple patterns → MultiPattern
  if (detected.length > 1) {
    const primary = detected.find(p => p.primary) || detected[0];
    return {
      patterns: detected,
      primary,
      confidence: primary.confidence,
    };
  }

  return null;
}
```

**Skills display pattern (skills.ts:213-218):**
```typescript
const ehLib = getPatternLibrary(result.patterns?.errorHandling);
if (ehLib) {
  const eh = result.patterns?.errorHandling;
  const variant = eh && !isMultiPattern(eh) && eh.variant ? ` (${eh.variant})` : '';
  lines.push(`- Error handling: ${ehLib}${variant}`);
}
```

### Checkpoint Commands

- After Stage 1 changes (dependencies.ts): `cd packages/cli && pnpm vitest run tests/engine/analyzers/patterns/dependencies.test.ts` — Expected: all existing tests pass
- After Stage 3 changes (confirmation.ts): `cd packages/cli && pnpm vitest run tests/engine/analyzers/patterns/confirmation.test.ts` — Expected: all existing tests pass
- After all changes: `cd packages/cli && pnpm vitest run` — Expected: 1137+ tests pass
- Lint: `pnpm run lint`

### Build Baseline

- Current tests: 1137 passed (86 test files)
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected 1137 + ~25-35 new tests
- Regression focus: `tests/engine/analyzers/patterns/*.test.ts`, `tests/commands/init/skills.test.ts`
