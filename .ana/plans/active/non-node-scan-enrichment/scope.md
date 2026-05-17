# Scope: Non-Node Scan Enrichment (Application Shape + Python AI SDK)

**Created by:** Ana
**Date:** 2026-05-16

## Intent

The scan engine produces no application shape and no AI SDK detection for non-Node projects. A Python FastAPI project gets `shape: 'unknown'` and `aiSdk: null` even when the framework and AI dependencies are correctly detected. Two independent gaps, same disease: the engine detects non-Node signals but discards or never routes them to shape and AI SDK classification.

This scope fixes both. Issue E (application shape) replaces a `return { shape: 'unknown' }` early-return with a framework-to-shape lookup. Issue B (Python AI SDK) adds an enrichment block following the proven `detectNonNodeTesting` pattern at line 809-813 of scan-engine.ts. Together they make the scan's non-Node output materially more useful — shape feeds skill matching, AI SDK feeds gotcha selection and the scan's core value prop for AI-product users.

## Complexity Assessment
- **Kind:** feature
- **Size:** small — two isolated additions, both additive-only
- **Files affected:**
  - `packages/cli/src/engine/detectors/applicationShape.ts` — replace early-return with lookup table (~12 lines)
  - `packages/cli/src/engine/detectors/dependencies.ts` — new exported function `detectNonNodeAiSdk` (~20 lines)
  - `packages/cli/src/engine/scan-engine.ts` — enrichment call after line 813 (~4 lines)
  - `packages/cli/tests/engine/detectors/applicationShape.test.ts` — new tests for non-Node shape mapping
  - `packages/cli/tests/engine/detectors/ai-sdk-detection.test.ts` — new tests for Python AI SDK detection
- **Blast radius:** Zero for Node projects. Shape lookup only runs when `projectType !== 'node'` (Node returns before reaching it). AI SDK enrichment only fires when `!stack.aiSdk && projectTypeResult.type !== 'node'`. Neither path can alter results for any project currently detected correctly.
- **Estimated effort:** 1-2 hours including tests
- **Multi-phase:** no

## Approach

Two additive enrichments that fill gaps where detection data exists but isn't routed to the right output field.

**Issue E (Application Shape):** Replace the early-return `{ shape: 'unknown' }` at line 127-129 of `applicationShape.ts` with a `FRAMEWORK_TO_SHAPE` lookup table. Framework detection already produces correct results for Python, Go, and Rust — the early-return just throws them away. The fix is removal (delete the bail-out) plus a minimal mapping. The existing Node detection path is untouched.

**Issue B (Python AI SDK):** Add a new exported function `detectNonNodeAiSdk(deps: string[]): string | null` in `dependencies.ts`. It checks a `deps` array (lowercase bare package names from Python parsers) against a priority-ordered list of Python AI packages. An enrichment block in `scan-engine.ts` calls it after line 813, gated on `!stack.aiSdk && projectTypeResult.type !== 'node'`. This follows the `detectNonNodeTesting` pattern exactly — same gate structure, same positional placement, same "fill only when empty" semantics. The function is exported (unlike `detectNonNodeTesting`) because it's pure and should be tested directly.

Both changes create foundation: once AI SDK enrichment works for Python, database and auth enrichment follow the same pattern mechanically.

## Acceptance Criteria

- AC1: A non-Node project with a detected framework gets a shape from the lookup table (e.g., FastAPI → `'api-server'`, Typer → `'cli'`).
- AC2: A non-Node project with NO detected framework still gets `shape: 'unknown'` (graceful fallback).
- AC3: All existing Node shape detection is unchanged — the Node code path is never reached by the new lookup.
- AC4: A pure Python project with `openai` in requirements.txt reports `aiSdk: 'OpenAI'`.
- AC5: A pure Python project with `langchain` + `openai` reports `aiSdk: 'LangChain'` (meta-framework priority).
- AC6: A pure Python project with `crewai` reports `aiSdk: 'CrewAI'`.
- AC7: A Node project's `aiSdk` detection is unchanged — the enrichment only fires when `stack.aiSdk` is null AND type is non-Node.
- AC8: All existing tests pass without modification.
- AC9: New tests cover: each framework-to-shape mapping, unknown framework fallback, each Python AI package, priority ordering, empty deps array.

## Edge Cases & Risks

- **Framework return string mismatch:** The lookup map keys MUST match the exact strings returned by framework detectors. Confirmed values: Python returns `'fastapi'`, `'django'`, `'django-drf'`, `'flask'`, `'typer'`, `'click'`. Go returns `'gin'`, `'echo'`, `'chi'`, `'cobra-cli'`, `'fiber'`. Rust returns `'axum'`, `'actix-web'`, `'rocket'`, `'clap-cli'`. The map must include ALL of these. The requirements file was missing `'django-drf'` — it maps to `'api-server'`.
- **Python gotcha text:** If a Python project now correctly reports `aiSdk: 'Anthropic'`, the existing Anthropic gotcha references Node.js SDK patterns. This is not harmful (gotchas require additional trigger conditions) but is a known imperfection. Not addressed in this scope.
- **Polyglot repos (litellm, langflow):** These still detect as `type: 'node'` because polyglot detection (Issue C) is a separate scope. The `type !== 'node'` gate means these repos won't benefit from B until C ships. This is correct — B helps the 4 pure Python repos immediately, and C unblocks the polyglot repos later.
- **`detectNonNodeAiSdk` re-reads deps:** The scan-engine already has `deps` overwritten to Python deps at line 663. The enrichment passes this existing variable — no additional file reads.

## Rejected Approaches

- **Extending `detectAiSdk(allDeps)` to accept both formats:** Rejected because `detectAiSdk` takes `Record<string, string>` (property access), while Python deps are `string[]` (includes check). Wrapping one to look like the other adds complexity for no gain. A separate function with the right signature is cleaner.
- **Putting `detectNonNodeAiSdk` as a private function in scan-engine.ts:** Rejected because unlike `detectNonNodeTesting` (which reads files via `readPythonDependencies`), this function is pure — it takes `string[]` and returns `string | null`. Pure functions should be exported and tested directly. `dependencies.ts` is the natural home.
- **Adding confidence gating to shape mapping:** Considered gating on `frameworkResult.confidence >= 0.85` to avoid mapping low-confidence detections (e.g., `clap-cli` at 0.80). Rejected because the current shape detection for Node doesn't gate on confidence either, and a possibly-wrong shape is better than `'unknown'` for non-Node. The qdrant `clap-cli` vs `actix-web` issue is a framework detection problem upstream, not a shape mapping problem.

## Open Questions

- None. All investigable questions resolved during exploration.

## Exploration Findings

### Patterns Discovered
- `scan-engine.ts:68-88`: `detectNonNodeTesting` — private async function, reads deps by project type, returns enrichment. The exact structural analog for B's enrichment call site.
- `dependencies.ts:212-217`: `detectAiSdk(allDeps)` — pure function, first-match priority from ordered array. The functional analog for B's detection logic (different input type).
- `applicationShape.ts:127-129`: The early-return that discards non-Node projects. Line of code to replace.

### Constraints Discovered
- [TYPE-VERIFIED] Framework return strings (see Edge Cases) — exact lowercase/hyphenated strings confirmed by reading all 4 detector files
- [TYPE-VERIFIED] Python parser output — lowercase, version-stripped, extras-stripped bare package names (requirements.ts:76-85, pyproject.ts)
- [OBSERVED] `detectAiSdk` uses property access (`allDeps[pkg]`), Python deps are arrays (`.includes(pkg)`) — incompatible signatures, separate function required
- [OBSERVED] `confidence` field from `detectProjectType` is not consumed anywhere in scan-engine.ts — purely informational

### Test Infrastructure
- `tests/engine/detectors/ai-sdk-detection.test.ts`: Existing tests for `detectAiSdk` with per-package assertions. New `detectNonNodeAiSdk` tests follow same pattern with `string[]` input instead of `Record<string, string>`.
- `tests/engine/detectors/applicationShape.test.ts`: Needs to exist or be created for shape mapping tests.

## For AnaPlan

### Structural Analog
`detectNonNodeTesting` at scan-engine.ts:68-88 and its call site at scan-engine.ts:809-813. The AI SDK enrichment follows this pattern exactly: private-or-exported function that checks deps, called after stack construction, gated on "nothing found yet AND non-Node."

### Relevant Code Paths
- `packages/cli/src/engine/detectors/applicationShape.ts:125-129` — the early-return to replace
- `packages/cli/src/engine/detectors/dependencies.ts:194-217` — existing `detectAiSdk` and `AI_SDK_PACKAGES` array (functional analog for the new function's structure)
- `packages/cli/src/engine/scan-engine.ts:809-814` — the `detectNonNodeTesting` enrichment block (call site analog)
- `packages/cli/src/engine/scan-engine.ts:759-777` — stack construction (where `aiSdk` is initially set)
- `packages/cli/src/engine/detectors/python/framework-registry.ts` — framework detection order for Python
- `packages/cli/src/engine/detectors/go.ts` — Go framework return strings
- `packages/cli/src/engine/detectors/rust.ts` — Rust framework return strings

### Patterns to Follow
- Priority ordering in `AI_SDK_PACKAGES` array (dependencies.ts:194-206) — meta-frameworks before providers
- Gate pattern: `if (!stack.field && projectTypeResult.type !== 'node')` — additive enrichment only
- `ApplicationShapeInput` interface (applicationShape.ts:35-42) — the function already receives `frameworkName` and `projectType`, no new parameters needed

### Known Gotchas
- The `FRAMEWORK_TO_SHAPE` map keys must be EXACT matches to framework detector return strings. If a framework detector is later added or renamed, the map silently falls through to `'unknown'`. Consider a comment listing the source files that produce these strings.
- `detectNonNodeAiSdk` takes `string[]` (from Python/Go/Rust parsers). `detectAiSdk` takes `Record<string, string>` (from census). Do not attempt to unify them — the input shapes are fundamentally different.
- The enrichment block position matters: it must go AFTER line 813 (after non-Node testing enrichment) so the pattern reads top-to-bottom: testing → AI SDK. Future enrichments (database, auth) would continue the sequence.

### Things to Investigate
- Whether an `applicationShape.test.ts` file already exists or needs to be created from scratch.
