# Build Report: Add project kind detection

**Created by:** AnaBuild
**Date:** 2026-04-15
**Spec:** .ana/plans/active/add-project-kind-detection/spec.md
**Branch:** feature/add-project-kind-detection

## What Was Built
- `packages/cli/src/engine/types/census.ts` (modified): Added `hasBin: boolean` field to `SourceRoot` interface.
- `packages/cli/src/engine/census.ts` (modified): Populated `hasBin` from package.json `bin` field in all 3 source root construction paths (no-pkg, single-repo, monorepo). Used `(pkg.packageJson as unknown as Record<string, unknown>)['bin']` cast because `@manypkg/get-packages` types `PackageJSON` without a `bin` property.
- `packages/cli/src/engine/detectors/projectKind.ts` (created): Pure function detector with `ProjectKind` type union, `ProjectKindInput` interface, and `detectProjectKind()` implementing the 7-level priority chain. Includes `CLI_DEPS`, `BROWSER_FRAMEWORKS`, and `SERVER_FRAMEWORKS` sets.
- `packages/cli/src/engine/types/engineResult.ts` (modified): Added `ProjectKind` type import, `projectKind` field to `EngineResult` interface, and `projectKind: 'unknown'` default in `createEmptyEngineResult()`.
- `packages/cli/src/engine/scan-engine.ts` (modified): Imported `detectProjectKind`, reads `main`/`module`/`exports` from primary root's package.json via `fs.readFile`, calls detector after framework detection, adds `projectKind` to returned result.
- `packages/cli/src/utils/scaffold-generators.ts` (modified): Added projectKind-based description branch before existing fallback chain. Maps kind to labels (CLI tool, library, web application, API server, full-stack application) with framework/language prefix.
- `packages/cli/tests/engine/detectors/projectKind.test.ts` (created): 32 unit tests covering all 6 classification outcomes, priority rules, non-Node short-circuit, pure function verification, factory default, and Anatomia-shape integration.
- `packages/cli/tests/contract/analyzer-contract.test.ts` (modified): Added `projectKind` to expected top-level keys list.
- `packages/cli/tests/engine/types/census.test.ts` (modified): Added `hasBin: false` to all 4 SourceRoot fixtures.
- `packages/cli/tests/engine/sampling/proportional-sampler.test.ts` (modified): Added `hasBin: false` to `makeRoot()` fixture helper.

## PR Summary

- Add `projectKind` classification to the scan engine, detecting CLI tools, libraries, web apps, API servers, and full-stack applications from package.json signals and framework detection
- Implement pure-function detector (`detectProjectKind`) with 7-level priority chain: bin field > CLI deps > browser framework > server framework > full-stack > library markers > unknown
- Thread `hasBin` through census SourceRoot so the detector can identify CLI projects from their package.json `bin` field
- Update scaffold description synthesis to produce accurate labels like "TypeScript CLI tool" instead of generic "TypeScript project"
- 32 new unit tests covering all classification outcomes, priority rules, and non-Node short-circuit

## Acceptance Criteria Coverage

- AC1 "`projectKind` field exists on `EngineResult`" -> projectKind.test.ts "createEmptyEngineResult includes projectKind" (1 assertion) + analyzer-contract.test.ts key list (compile-time + runtime)
- AC2 "Scanning Anatomia produces `projectKind: 'cli'`" -> projectKind.test.ts "classifies Anatomia-like project (bin + commander) as cli" (1 assertion, unit-level verification with Anatomia's signal shape)
- AC3 "Detection is a pure function" -> projectKind.test.ts "does not import node:fs" (1 assertion reading source file)
- AC4 "`createEmptyEngineResult()` includes `projectKind: 'unknown'`" -> projectKind.test.ts "defaults to unknown" (1 assertion)
- AC5 "Scaffold generator uses `projectKind`" -> projectKind.test.ts "includes kind label when projectKind is set" + "uses framework as prefix when available" (4 assertions total)
- AC6 "Unit tests cover all 6 classification outcomes" -> projectKind.test.ts covers cli (4 tests), web-app (4 tests), api-server (3 tests), full-stack (3 tests), library (3 tests), unknown (1 test)
- AC7 "Non-Node projects return `'unknown'`" -> projectKind.test.ts "returns unknown for non-node project type" (3 assertions: python, go, rust)

## Implementation Decisions

1. **`main`/`module`/`exports` read via `fs.readFile` in scan-engine** — The spec said to read these "from the primary source root's package.json via census," but census doesn't expose raw packageJson. Rather than threading 3 new fields through census (which only projectKind cares about), I read the primary root's package.json directly in scan-engine. This keeps census clean and matches the spec's intent that these fields NOT be added to SourceRoot.

2. **`PackageJSON` cast path** — `@manypkg/get-packages` types `PackageJSON` as a specific interface without `bin`. TypeScript rejected both `as Record<string, unknown>` and `.bin` dot access. Used `(pkg.packageJson as unknown as Record<string, unknown>)['bin']` — double cast via `unknown` is the standard escape for non-overlapping types, and bracket notation satisfies the index signature requirement.

3. **`module` folded into `hasMain`** — The spec mentions `main`/`module`/`exports` but the detector input only has `hasMain` and `hasExports`. I set `hasMain = !!pkgRaw['main'] || !!pkgRaw['module']` since both indicate a library entry point. This matches the spec's intent (library markers) without adding a third boolean.

4. **Full-stack detection via dep names** — The detector checks if a server framework project also has browser deps by looking at the dep list for package names like `react`, `vue`, `next`, etc. This is independent of `projectProfile.hasBrowserUI` (which is assembled later in scan-engine), matching the spec's note that the detector should compute browser UI presence internally.

## Deviations from Contract

None — both A015 and A016 deviations resolved in post-verify fix commit.

## Test Results

### Baseline (before changes)
```
pnpm test -- --run (via cd packages/cli)
Test Files  85 passed (85)
     Tests  1074 passed (1074)
```

### After Changes (post-verify fix)
```
pnpm test -- --run (via cd packages/cli)
Test Files  86 passed (86)
     Tests  1108 passed (1108)
Duration  14.81s
```

### Comparison
- Tests added: 34 (32 original + 2 verify fixes)
- Tests removed: 0
- Regressions: none

### New Tests Written
- `packages/cli/tests/engine/detectors/projectKind.test.ts`: All 6 classification outcomes (cli via bin, cli via dep, web-app, api-server, full-stack, library, unknown), priority rules (bin > library, CLI dep > library), non-Node short-circuit (python, go, rust), pure function verification (no fs import), factory default check, Anatomia-shape integration, SourceRoot hasBin type check.

### Contract Coverage
Contract coverage: 16/16 assertions tagged.

## Verification Commands
```bash
pnpm run build
cd packages/cli && pnpm test -- --run
pnpm run lint
```

## Git History
```
2240804 [add-project-kind-detection] Fix: A015 scaffold test and A016 sentinel replacement
b7b2e5d [add-project-kind-detection] Add projectKind unit tests
ff33f14 [add-project-kind-detection] Use projectKind in scaffold descriptions
ee99901 [add-project-kind-detection] Add projectKind detector and wire into scan pipeline
792593b [add-project-kind-detection] Add hasBin to SourceRoot and census
```

## Fixes Applied (post-verify)

Two test gaps identified by AnaVerify:

1. **A015 — scaffold description test added:** Two new tests in `projectKind.test.ts` exercise `generateProjectContextScaffold()` with `projectKind: 'cli'` (asserts output contains 'CLI tool' and 'TypeScript') and `projectKind: 'web-app'` with `framework: 'Next.js'` (asserts output contains 'Next.js web application').

2. **A016 — sentinel replaced:** Removed `expect(buildCensus).toBeDefined()` sentinel. Replaced with type-safe `SourceRoot` construction (imported the interface, built a complete object with `hasBin: true`) and runtime assertions: `toHaveProperty('hasBin')`, `typeof === 'boolean'`, and `toBe(true)`.

## Open Issues

1. **`module` folded into `hasMain`** — The spec lists `main`/`module`/`exports` as three separate signals but the detector input has only `hasMain` and `hasExports`. I combined `main` and `module` into `hasMain` since both serve the same purpose (library entry point). If they need separate semantics later, the input interface would need a `hasModule` field.

2. **Turbo pipe hang** — Running `pnpm run test -- --run 2>&1 | grep ...` from the workspace root caused hanging due to turbo's streaming output buffering. Tests must be run via `cd packages/cli && pnpm test -- --run` or without pipe filters. This is pre-existing infrastructure behavior, not introduced by this build.

Verified complete by second pass.
