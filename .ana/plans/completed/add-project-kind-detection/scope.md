# Scope: Add project kind detection to scan

**Created by:** Ana
**Date:** 2026-04-15

## Intent
The scan detects language ecosystem (`node`, `python`, `go`) and framework (`Next.js`, `Express`), but has no concept of what a project fundamentally *is* — CLI tool, library, web app, API server, or full-stack app. A Node CLI, a Node web app, and a Node library all produce the same scan identity. Downstream consumers (skills, scaffolds, context generation) can't tailor advice because they don't know what kind of thing they're advising on. The deployment skill gives web-app guidance to a CLI tool. The project description says "TypeScript project" for anything without a recognized framework.

Add a `projectKind` classification to the scan engine. Node ecosystem only in this phase; other ecosystems expand later.

## Complexity Assessment
- **Size:** small–medium
- **Files affected:**
  - `packages/cli/src/engine/detectors/projectKind.ts` (new — the detector)
  - `packages/cli/src/engine/types/engineResult.ts` (add `projectKind` field)
  - `packages/cli/src/engine/types/engineResult.ts` (`createEmptyEngineResult` — populate default)
  - `packages/cli/src/engine/scan-engine.ts` (call detector, wire into result)
  - `packages/cli/src/engine/types/census.ts` (expose `bin` field on `SourceRoot`)
  - `packages/cli/src/engine/census.ts` (read `bin` from packageJson)
  - `packages/cli/src/utils/scaffold-generators.ts` (use `projectKind` in description synthesis)
  - `packages/cli/tests/engine/detectors/projectKind.test.ts` (new — unit tests)
- **Blast radius:** Low. New field, additive. Existing fields unchanged. Skill template updates are a follow-up scope.
- **Estimated effort:** ~2 hours
- **Multi-phase:** no (skill template updates are a separate follow-up scope)

## Approach
Add a new pure-function detector that classifies Node projects by interpreting signals already available in the census and dependency data: the `bin` field in package.json (CLI), `main`/`module`/`exports` without `bin` (library), framework detection results (web-app, api-server, full-stack), and CLI-specific dependency signatures (commander, yargs, meow, oclif, clipanion, cac, citty). The result is a new `projectKind` field on `EngineResult` — orthogonal to `projectType` (language) and `framework`. Scaffold generators use it for better project descriptions. Skills can condition on it in a follow-up.

## Acceptance Criteria
- AC1: `projectKind` field exists on `EngineResult` with values `'cli' | 'library' | 'web-app' | 'api-server' | 'full-stack' | 'unknown'`
- AC2: Scanning Anatomia itself (a Node CLI with `bin` field and commander dep) produces `projectKind: 'cli'`
- AC3: Detection is a pure function — receives census/dep/framework data, no filesystem reads
- AC4: `createEmptyEngineResult()` includes `projectKind: 'unknown'` default
- AC5: Scaffold generator uses `projectKind` to produce descriptions like "TypeScript CLI tool" instead of "TypeScript project"
- AC6: Unit tests cover all 6 classification outcomes with representative package.json shapes
- AC7: Non-Node projects return `'unknown'` (no false classifications for ecosystems we haven't built signals for)

## Edge Cases & Risks
- **Monorepo sub-packages:** In a monorepo, different packages may have different kinds (CLI + library). Detection should classify the *primary* source root's kind. Monorepo-level classification could be `'unknown'` or derived from primary — AnaPlan decides.
- **Ambiguous signals:** A project with both `bin` and `main`/`exports` (e.g., a CLI that also exports a programmatic API like `esbuild`) — `bin` should win since it's the stronger identity signal.
- **Framework-only detection:** Express alone doesn't mean API server — it could be a full-stack app with SSR. But Express *without* any UI framework deps is a strong API-server signal.
- **No signals at all:** A Node project with no `bin`, no `main`/`exports`, no framework, and no CLI deps → `'unknown'` is the honest answer.

## Rejected Approaches
- **Extend `projectProfile.type`** — This field currently stores `frameworkResult.framework || projectTypeResult.type`, mixing two dimensions. Overloading it further would make it harder to reason about. A dedicated orthogonal field is cleaner.
- **All ecosystems at once** — We can only test against this project (Node). Python/Go/Rust would ship untested against real projects. Node-first, expand later.
- **Skill template updates in this scope** — That's where the deployment-gives-wrong-advice problem actually gets fixed, but it's a separate concern. Ship the signal first, consume it second.

## Open Questions
None — all factual questions resolved during investigation.

## Exploration Findings

### Patterns Discovered
- `detectors/deployment.ts`: Pure-function detector pattern — receives pre-read data, returns typed result, composed into EngineResult by scan-engine.ts. Lines 31-47.
- `scan-engine.ts:714-722`: `projectProfile` construction — the current "what is this project" attempt, uses boolean flags but no categorical classification.
- `scaffold-generators.ts:33-42`: Description synthesis fallback chain — `hasBrowserUI + framework` → "web application", `framework` → "application", `language` → "project". No CLI or library path.

### Constraints Discovered
- [TYPE-VERIFIED] Census exposes `packageJson` via `@manypkg/get-packages` (census.ts:291,311,314-315) — `bin` field is available but not yet threaded through to `SourceRoot`
- [TYPE-VERIFIED] `EngineResult` cross-cutting rule (engineResult.ts:8-13) — adding a field requires changes in 4 locations: type, factory, scan-engine, consumers
- [OBSERVED] `projectProfile.type` stores `frameworkResult.framework || projectTypeResult.type` (scan-engine.ts:715) — conflates framework and language identity

### Test Infrastructure
- `tests/engine/detectors/projectType.test.ts`: Uses real temp directories with `fs.mkdtemp`, writes marker files, tests detection. Same pattern works for projectKind.
- All detector tests use Vitest with `describe`/`it`/`expect`.

## For AnaPlan

### Structural Analog
`packages/cli/src/engine/detectors/deployment.ts` — closest structural match. Pure function, receives pre-read data (census entries), returns a typed result interface, composed into EngineResult by scan-engine.ts via object spread. 47 lines, simple dispatch logic. ProjectKind follows the same shape but with richer signal interpretation.

### Relevant Code Paths
- `packages/cli/src/engine/types/census.ts` — `SourceRoot` interface needs `bin` field (lines 14-22)
- `packages/cli/src/engine/census.ts` — `buildCensus()` reads `packageJson`, needs to extract `bin` (line 311-315)
- `packages/cli/src/engine/scan-engine.ts` — detector composition site, see lines 491-800 for the full flow
- `packages/cli/src/engine/types/engineResult.ts` — `EngineResult` type + `createEmptyEngineResult()` factory
- `packages/cli/src/engine/detectors/framework.ts` — `FrameworkResult` is an input to kind detection (framework implies shape)
- `packages/cli/src/engine/detectors/dependencies.ts` — CLI dep packages may already be in the dependency maps
- `packages/cli/src/utils/scaffold-generators.ts` — description synthesis logic to update (lines 30-56)

### Patterns to Follow
- Follow `detectors/deployment.ts` for the detector shape (pure function, typed input/output)
- Follow `projectType.test.ts` for the test pattern (temp dirs, real files)
- Follow the 4-location cross-cutting rule from `engineResult.ts` header comment

### Known Gotchas
- `scan-engine.ts` uses dynamic imports for tree-sitter (lines 556-594) — projectKind does NOT need tree-sitter, so place the call with the other synchronous/surface-tier detectors (around line 519-542)
- Census `packageJson` comes from `@manypkg/get-packages` which types it as `Record<string, unknown>` — the `bin` field extraction needs a runtime check, not a type assertion
- `EngineResult` additions require `createEmptyEngineResult()` update or tests fail (line 317)

### Things to Investigate
- Whether `bin` should be typed as `string | Record<string, string> | undefined` on SourceRoot (npm supports both `"bin": "./cli.js"` and `"bin": { "cmd": "./cli.js" }`) — pick the representation that serves the detector without over-modeling
