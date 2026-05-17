# Spec: Non-Node Scan Enrichment (Application Shape + Python AI SDK)

**Created by:** AnaPlan
**Date:** 2026-05-16
**Scope:** .ana/plans/active/non-node-scan-enrichment/scope.md

## Approach

Two additive enrichments that fill gaps where detection data already exists but isn't routed to the correct output field. Neither change touches the Node detection path.

**Issue E (Application Shape):** Replace the early-return at `applicationShape.ts:127-129` with a `FRAMEWORK_TO_SHAPE` lookup table. The function already receives `frameworkName` and `projectType` — the early-return just discards them for non-Node. The fix: when `projectType !== 'node'`, look up `frameworkName` in the map instead of returning `'unknown'`. Unmapped frameworks still fall through to `'unknown'`.

**Issue B (Python AI SDK):** Add `detectNonNodeAiSdk(deps: string[]): string | null` as an exported function in `dependencies.ts`. It checks a `string[]` of bare package names against a priority-ordered list of Python AI packages. An enrichment block in `scan-engine.ts` calls it after the non-Node testing enrichment (after line 814), gated on `!stack.aiSdk && projectTypeResult.type !== 'node'`.

## Output Mockups

Before this change, a Python FastAPI project with `openai` in requirements.txt produces:
```json
{
  "applicationShape": "unknown",
  "stack": { "aiSdk": null }
}
```

After:
```json
{
  "applicationShape": "api-server",
  "stack": { "aiSdk": "OpenAI" }
}
```

A Python Typer CLI with `langchain` + `anthropic`:
```json
{
  "applicationShape": "cli",
  "stack": { "aiSdk": "LangChain" }
}
```

## File Changes

### `packages/cli/src/engine/detectors/applicationShape.ts` (modify)
**What changes:** Replace the non-Node early-return (lines 126-128) with a `FRAMEWORK_TO_SHAPE` lookup table and a conditional that uses it.
**Pattern to follow:** The existing priority chain structure in the same file (lines 131-197). The new code is a simple map lookup that returns early — same style as the other branches.
**Why:** Without this, non-Node projects always get `shape: 'unknown'` even when framework detection correctly identifies the framework.

The `FRAMEWORK_TO_SHAPE` map must include ALL framework detector return strings. The exhaustive set:

| Framework string | Shape |
|---|---|
| `fastapi` | `api-server` |
| `django` | `full-stack` |
| `django-drf` | `api-server` |
| `flask` | `api-server` |
| `typer` | `cli` |
| `click` | `cli` |
| `gin` | `api-server` |
| `echo` | `api-server` |
| `chi` | `api-server` |
| `cobra-cli` | `cli` |
| `fiber` | `api-server` |
| `axum` | `api-server` |
| `actix-web` | `api-server` |
| `rocket` | `api-server` |
| `clap-cli` | `cli` |

Place a comment above the map listing the source files that produce these strings: `python/framework-registry.ts`, `go.ts`, `rust.ts`. This documents the maintenance coupling.

The logic: if `projectType !== null && projectType !== 'node'`, look up `input.frameworkName` in the map. If found, return that shape. If not found (or `frameworkName` is null), return `{ shape: 'unknown' }`.

### `packages/cli/src/engine/detectors/dependencies.ts` (modify)
**What changes:** Add a new exported function `detectNonNodeAiSdk` and its backing constant `PYTHON_AI_SDK_PACKAGES`.
**Pattern to follow:** The existing `AI_SDK_PACKAGES` array and `detectAiSdk` function at lines 194-217. Same structure: ordered array of `[packageName, displayName]` tuples, first-match wins.
**Why:** `detectAiSdk` uses property access on `Record<string, string>` — incompatible with Python's `string[]` deps format. A separate function with the right signature is cleaner than wrapping.

Priority order for `PYTHON_AI_SDK_PACKAGES` (meta-frameworks before providers):
1. `langchain` → `'LangChain'`
2. `crewai` → `'CrewAI'`
3. `autogen` → `'AutoGen'`
4. `anthropic` → `'Anthropic'`
5. `openai` → `'OpenAI'`
6. `google-generativeai` → `'Google AI'`
7. `cohere` → `'Cohere'`

Place this constant and function immediately after the existing `detectAiSdk` function (after line 217).

### `packages/cli/src/engine/scan-engine.ts` (modify)
**What changes:** Add an enrichment block after line 814 that calls `detectNonNodeAiSdk`.
**Pattern to follow:** The `detectNonNodeTesting` enrichment at lines 809-813. Same gate structure, same positional placement, same "fill only when empty" semantics.
**Why:** Without this, `stack.aiSdk` stays null for non-Node projects even when Python AI packages are present in deps.

The enrichment block:
- Gate: `if (!stack.aiSdk && projectTypeResult.type !== 'node')`
- Call: `detectNonNodeAiSdk(deps)` — the `deps` variable at this point already holds the language-specific deps (overwritten at line 663 for Python/Go/Rust)
- Assignment: `stack.aiSdk = result` (only when non-null)
- Add `detectNonNodeAiSdk` to the import from `./detectors/dependencies.js`

### `packages/cli/tests/engine/detectors/applicationShape.test.ts` (modify)
**What changes:** Add a new `describe` block for non-Node shape mapping covering each framework-to-shape entry and the unknown fallback.
**Pattern to follow:** The existing test structure in this file — uses `makeInput()` helper with overrides, asserts on `result.shape`.
**Why:** AC1, AC2, AC3 require test coverage for the lookup table behavior.

### `packages/cli/tests/engine/detectors/ai-sdk-detection.test.ts` (modify)
**What changes:** Add a new `describe` block for `detectNonNodeAiSdk` covering each Python package, priority ordering, and empty array.
**Pattern to follow:** The existing `detectAiSdk` tests in this file — per-package assertions, priority test with multiple packages present.
**Why:** AC4, AC5, AC6, AC9 require test coverage for the new function.

## Acceptance Criteria

- [ ] AC1: A non-Node project with a detected framework gets a shape from the lookup table (e.g., FastAPI → `'api-server'`, Typer → `'cli'`).
- [ ] AC2: A non-Node project with NO detected framework still gets `shape: 'unknown'` (graceful fallback).
- [ ] AC3: All existing Node shape detection is unchanged — the Node code path is never reached by the new lookup.
- [ ] AC4: A pure Python project with `openai` in requirements.txt reports `aiSdk: 'OpenAI'`.
- [ ] AC5: A pure Python project with `langchain` + `openai` reports `aiSdk: 'LangChain'` (meta-framework priority).
- [ ] AC6: A pure Python project with `crewai` reports `aiSdk: 'CrewAI'`.
- [ ] AC7: A Node project's `aiSdk` detection is unchanged — the enrichment only fires when `stack.aiSdk` is null AND type is non-Node.
- [ ] AC8: All existing tests pass without modification.
- [ ] AC9: New tests cover: each framework-to-shape mapping, unknown framework fallback, each Python AI package, priority ordering, empty deps array.
- [ ] No build errors
- [ ] Tests pass with `pnpm vitest run`

## Testing Strategy

- **Unit tests (applicationShape.test.ts):** New `describe('non-Node shape mapping')` block. Test each of the 15 framework strings maps to the correct shape. Test `frameworkName: null` with non-Node projectType returns `'unknown'`. Test an unmapped framework string returns `'unknown'`. Use the existing `makeInput()` helper with `projectType: 'python'` (or `'go'`, `'rust'`).
- **Unit tests (ai-sdk-detection.test.ts):** New `describe('detectNonNodeAiSdk')` block. Test each of the 7 Python packages returns correct display name. Test priority: `['langchain', 'openai']` → `'LangChain'`. Test empty array returns null. Test array with no AI packages returns null.
- **Regression:** Existing tests confirm Node paths are unaffected (AC3, AC7, AC8).

## Dependencies

None. Both changes are additive to existing infrastructure.

## Constraints

- The `FRAMEWORK_TO_SHAPE` map keys must exactly match framework detector return strings (lowercase, hyphenated).
- Python package names must match what `readPythonDependencies` produces: lowercase, version-stripped, extras-stripped bare names.
- The enrichment block must go AFTER line 814 (after non-Node testing) to maintain the sequential enrichment pattern.
- Engine files: no chalk, no commander, no ora.

## Gotchas

- The `deps` variable in scan-engine is already overwritten to Python/Go/Rust deps at line 663 — don't re-read dependencies in the enrichment block.
- `detectNonNodeAiSdk` takes `string[]` (`.includes()` check). `detectAiSdk` takes `Record<string, string>` (property access). Don't try to unify them.
- The `ApplicationShape` type is a closed union. The lookup table returns values already in that union (`'api-server'`, `'cli'`, `'full-stack'`) — no type extension needed.
- `django` maps to `'full-stack'` (not `'api-server'`) because Django includes templates, ORM, admin — it's a batteries-included framework. `django-drf` is API-only, hence `'api-server'`.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions: `import { detectNonNodeAiSdk } from './detectors/dependencies.js'`
- Use `import type` for type-only imports, separate from value imports.
- Prefer named exports. `detectNonNodeAiSdk` is exported.
- Explicit return types on exported functions: `detectNonNodeAiSdk(deps: string[]): string | null`
- Use `| null` for "checked and found empty" — the function returns `string | null`.
- Early returns over nested conditionals.
- Engine files have zero CLI dependencies.
- Exported functions require `@param` and `@returns` JSDoc tags.

### Pattern Extracts

From `dependencies.ts:194-217` (functional analog):
```typescript
const AI_SDK_PACKAGES: Array<[string, string]> = [
  ['@anthropic-ai/sdk', 'Anthropic'],
  ['openai', 'OpenAI'],
  ['@ai-sdk/core', 'Vercel AI'],
  ['ai', 'Vercel AI'],
  ['@google/generative-ai', 'Google AI'],
  ['langchain', 'LangChain'],
  ['@langchain/core', 'LangChain'],
  ['@ai-sdk/anthropic', 'Vercel AI'],
  ['@ai-sdk/openai', 'Vercel AI'],
  ['@ai-sdk/google', 'Vercel AI'],
  ['@ai-sdk/mistral', 'Vercel AI'],
];

export function detectAiSdk(allDeps: Record<string, string>): string | null {
  for (const [pkg, name] of AI_SDK_PACKAGES) {
    if (allDeps[pkg]) return name;
  }
  return null;
}
```

From `scan-engine.ts:809-814` (structural analog — enrichment call site):
```typescript
  if (stack.testing.length === 0 && projectTypeResult.type !== 'unknown') {
    const nonNodeTesting = await detectNonNodeTesting(rootPath, projectTypeResult.type);
    if (nonNodeTesting.length > 0) {
      stack.testing = nonNodeTesting;
    }
  }
```

### Proof Context
No active proof findings for affected files.

### Checkpoint Commands

- After applicationShape.ts change: `(cd packages/cli && pnpm vitest run tests/engine/detectors/applicationShape.test.ts)` — Expected: all existing + new non-Node tests pass
- After dependencies.ts change: `(cd packages/cli && pnpm vitest run tests/engine/detectors/ai-sdk-detection.test.ts)` — Expected: all existing + new detectNonNodeAiSdk tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 2366+ tests pass, 0 failures
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 2366 passed, 2 skipped (2368 total)
- Current test files: 106
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~2390+ tests in 106 files (new tests added to existing files)
- Regression focus: `applicationShape.test.ts` (existing Node tests must still pass), `ai-sdk-detection.test.ts` (existing detectAiSdk tests must still pass)
