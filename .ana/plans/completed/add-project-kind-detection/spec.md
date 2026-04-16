# Spec: Add project kind detection to scan

**Created by:** AnaPlan
**Date:** 2026-04-15
**Scope:** .ana/plans/active/add-project-kind-detection/scope.md

## Approach

Add a `projectKind` field to `EngineResult` via a new pure-function detector following the `deployment.ts` pattern. The detector classifies Node projects by interpreting signals already in the census and framework result: the `bin` field in package.json (CLI), library export markers (`main`/`module`/`exports`), framework detection results (web-app, api-server, full-stack), and CLI-specific dependency signatures.

**Signal priority (highest wins):**
1. `bin` field present in primary source root's package.json → `cli`
2. CLI dependency detected (commander, yargs, meow, etc.) → `cli`
3. Browser UI framework (Next.js, Remix, React, Vue, Angular, Svelte, Nuxt, Astro) → `web-app`
4. Server framework without browser UI deps (Express, Fastify, Koa, Hono, NestJS) → `api-server`
5. Server framework WITH browser UI deps → `full-stack`
6. Library markers (`main`, `module`, or `exports` in package.json) without bin/framework → `library`
7. None of the above → `unknown`

**`hasBin` on SourceRoot:** Add a `hasBin: boolean` field to the `SourceRoot` interface. Census already reads `packageJson` from `@manypkg/get-packages` — extract `!!packageJson.bin` with a runtime truthiness check (packageJson is typed as `Record<string, unknown>`).

**`main`/`module`/`exports` NOT added to SourceRoot** — only projectKind cares about these. Read them at the call site in scan-engine from the primary source root's package.json via census, and pass them into the detector.

**Monorepo handling:** Classify based on primary source root only, consistent with framework detection scoping (ANA-SCAN-058).

**Non-Node projects:** Return `unknown`. The detector should check `projectType` and short-circuit for non-node types.

## Output Mockups

After this change, scanning Anatomia produces `projectKind: 'cli'` in the EngineResult. In `scan.json`:

```json
{
  "projectProfile": {
    "type": "TypeScript",
    "projectKind": "cli",
    ...
  }
}
```

Wait — `projectKind` is top-level on EngineResult, not inside projectProfile:

```json
{
  "projectKind": "cli",
  "projectProfile": {
    "type": "TypeScript",
    ...
  }
}
```

scaffold-generators.ts description synthesis changes from:

```
**Detected:** TypeScript project. 120 source files, 87 test files.
```

to:

```
**Detected:** TypeScript CLI tool. 120 source files, 87 test files.
```

Kind-to-label mapping:
- `cli` → `"{language} CLI tool"`
- `library` → `"{language} library"`
- `web-app` → `"{language} web application"` (or `"{framework} web application"` if framework exists — existing behavior)
- `api-server` → `"{language} API server"` (or `"{framework} API server"`)
- `full-stack` → `"{language} full-stack application"` (or `"{framework} full-stack application"`)
- `unknown` → falls through to existing logic (unchanged)

## File Changes

### `packages/cli/src/engine/types/census.ts` (modify)
**What changes:** Add `hasBin: boolean` to the `SourceRoot` interface.
**Pattern to follow:** Existing fields on `SourceRoot` — all JSON-serializable primitives.
**Why:** The detector needs to know if the primary source root declares CLI binaries.

### `packages/cli/src/engine/census.ts` (modify)
**What changes:** Extract `bin` from `packageJson` when building each `SourceRoot`. Use `!!pkg.packageJson.bin` — runtime truthiness check because `@manypkg/get-packages` types `packageJson` as `Record<string, unknown>`.
**Pattern to follow:** The existing `deps` and `devDeps` extraction at the same location (census.ts lines 308-329).
**Why:** Threads the `bin` signal through to the detector via census.

### `packages/cli/src/engine/detectors/projectKind.ts` (create)
**What changes:** New detector module. Exports a `ProjectKindResult` interface and a `detectProjectKind()` pure function.
**Pattern to follow:** `detectors/deployment.ts` — same shape (pure function, typed input/output, no filesystem reads). The input interface should accept: `hasBin`, `hasMain`, `hasExports`, `frameworkName` (string | null), `projectType` (string | null), `deps` (string array).
**Why:** Core new functionality — the classification logic.

### `packages/cli/src/engine/types/engineResult.ts` (modify)
**What changes:** (1) Import `ProjectKindResult` type. (2) Add `projectKind` field to `EngineResult` interface. Type it as the string union `'cli' | 'library' | 'web-app' | 'api-server' | 'full-stack' | 'unknown'` — define this union type in the detector file and import it here. (3) Add `projectKind: 'unknown'` to `createEmptyEngineResult()`.
**Pattern to follow:** The 4-location cross-cutting rule documented in the file header comment.
**Why:** Missing the factory default causes test failures.

### `packages/cli/src/engine/scan-engine.ts` (modify)
**What changes:** (1) Import `detectProjectKind`. (2) After `frameworkResult` detection (~line 542), extract `main`/`module`/`exports` from the primary source root's packageJson. Call `detectProjectKind()` with the assembled input. (3) Add `projectKind` to the returned EngineResult object (~line 778).
**Pattern to follow:** The existing `detectDeployment`/`detectCI` call pattern — call detector, spread/assign result into the final object.
**Why:** Wires the detector into the scan pipeline.

### `packages/cli/src/utils/scaffold-generators.ts` (modify)
**What changes:** Update the description synthesis in `generateProjectContextScaffold()` to use `projectKind` for better labels. When `projectKind` is not `unknown`, use the kind-to-label mapping from Output Mockups above instead of the current fallback chain. When `projectKind` is `unknown`, fall through to existing logic unchanged.
**Pattern to follow:** The existing fallback chain at lines 33-42 — same structure, new branch at the top.
**Why:** This is the first consumer — makes project descriptions accurate ("CLI tool" not "project").

### `packages/cli/tests/engine/detectors/projectKind.test.ts` (create)
**What changes:** Unit tests for `detectProjectKind()`. Cover all 6 classification outcomes with representative inputs. Test the priority rules (bin wins over library markers, CLI deps win over library markers, etc.). Test the non-Node short-circuit.
**Pattern to follow:** Unlike `projectType.test.ts` (which uses temp dirs because that detector reads the filesystem), this detector is a pure function — tests pass plain objects. Use `describe`/`it`/`expect` with Vitest. No temp dirs needed.
**Why:** AC6 requires coverage of all 6 outcomes.

## Acceptance Criteria

- [x] AC1: `projectKind` field exists on `EngineResult` with values `'cli' | 'library' | 'web-app' | 'api-server' | 'full-stack' | 'unknown'`
- [ ] AC2: Scanning Anatomia itself (a Node CLI with `bin` field and commander dep) produces `projectKind: 'cli'`
- [ ] AC3: Detection is a pure function — receives census/dep/framework data, no filesystem reads
- [ ] AC4: `createEmptyEngineResult()` includes `projectKind: 'unknown'` default
- [ ] AC5: Scaffold generator uses `projectKind` to produce descriptions like "TypeScript CLI tool" instead of "TypeScript project"
- [ ] AC6: Unit tests cover all 6 classification outcomes with representative package.json shapes
- [ ] AC7: Non-Node projects return `'unknown'` (no false classifications for ecosystems we haven't built signals for)
- [ ] Tests pass with `pnpm run test -- --run`
- [ ] No build errors with `pnpm run build`
- [ ] No lint errors with `pnpm run lint`

## Testing Strategy

- **Unit tests:** Test `detectProjectKind()` as a pure function with plain object inputs. No temp dirs, no filesystem. Each test constructs a minimal input object and asserts the output kind. Group by classification outcome.
- **Test matrix:**
  - `cli` via `hasBin: true` (with and without CLI deps)
  - `cli` via CLI dep (commander) without `hasBin`
  - `library` via `hasMain: true` without bin/framework
  - `library` via `hasExports: true` without bin/framework
  - `web-app` via framework (Next.js, React)
  - `api-server` via framework (Express) without browser UI deps
  - `full-stack` via server framework + browser UI dep
  - `unknown` for non-Node project type
  - `unknown` for Node project with no signals
  - Priority: `hasBin` wins over `hasMain` (the esbuild case)
  - Priority: CLI dep wins over library markers
- **Integration:** AC2 is verified by the existing `ana scan` integration tests — scanning Anatomia itself should show `projectKind: 'cli'` in the result. No new integration test needed if the field appears in the returned EngineResult.
- **Edge cases:** Covered in unit tests above — ambiguous signals, non-Node, no signals.

## Dependencies

None. All required data (census, framework result, dependency list) already exists in the scan pipeline.

## Constraints

- Engine files have zero CLI dependencies (no chalk, no commander, no ora).
- `@manypkg/get-packages` types `packageJson` as `Record<string, unknown>` — all field access needs runtime checks, not type assertions.
- Non-Node ecosystems must return `unknown` — we have no test projects to verify Python/Go/Rust kind detection.

## Gotchas

- **The 4-location rule:** Adding `projectKind` to `EngineResult` requires updating the type, the factory (`createEmptyEngineResult`), scan-engine (population), and at least one consumer. Miss the factory and tests break.
- **Census `packageJson` typing:** `bin`, `main`, `module`, `exports` are all `unknown` from `@manypkg/get-packages`. Use truthiness checks (`!!pkg.packageJson.bin`), not type narrowing or assertions.
- **3 code paths in census.ts for building SourceRoots:** No-package-json path (line 297), single-repo path (line 308), and monorepo path (line 318). The `hasBin` field must be added to all three. The no-package-json path always gets `hasBin: false`.
- **`projectProfile.hasBrowserUI` already exists** — the detector can use the same logic (browser framework list) but should compute it internally rather than depending on `projectProfile`, since `projectProfile` is assembled later in scan-engine.
- **Import path needs `.js` extension** — `import { detectProjectKind } from './detectors/projectKind.js'` or the built CLI crashes at runtime.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer named exports. No default exports.
- Never use `any`. Use `unknown` and narrow with type guards.
- Use `| null` for fields that were checked and found empty.
- Engine files have zero CLI dependencies.
- Explicit return types on all exported functions.
- Always use `--run` flag with `pnpm test` to avoid watch mode hang.

### Pattern Extracts

**Structural analog — `detectors/deployment.ts` (full file, 47 lines):**
```typescript
// packages/cli/src/engine/detectors/deployment.ts
import type { DeploymentEntry, CiWorkflowEntry } from '../types/census.js';

export interface DetectedDeployment {
  platform: string | null;
  configFile: string | null;
}

export interface DetectedCI {
  ci: string | null;
}

export function detectDeployment(deployments: DeploymentEntry[]): DetectedDeployment {
  if (deployments.length > 0) {
    const first = deployments[0]!;
    return { platform: first.platform, configFile: first.path };
  }
  return { platform: null, configFile: null };
}

export function detectCI(ciWorkflows: CiWorkflowEntry[]): DetectedCI {
  if (ciWorkflows.length > 0) {
    return { ci: ciWorkflows[0]!.system };
  }
  return { ci: null };
}
```

**Census SourceRoot construction — single-repo path (census.ts:306-316):**
```typescript
  } else if (isSingleRepo) {
    const pkg = result.rootPackage!;
    sourceRoots = [{
      absolutePath: normalizedRoot,
      relativePath: '.',
      packageName: pkg.packageJson.name ?? null,
      fileCount: countSourceFiles(normalizedRoot),
      isPrimary: true,
      deps: (pkg.packageJson.dependencies ?? {}) as Record<string, string>,
      devDeps: (pkg.packageJson.devDependencies ?? {}) as Record<string, string>,
    }];
```

**Scaffold description synthesis — current fallback chain (scaffold-generators.ts:32-42):**
```typescript
  const descParts: string[] = [];
  if (result.monorepo.isMonorepo) {
    const tool = result.monorepo.tool || 'monorepo';
    descParts.push(`${tool} monorepo`);
  } else if (result.projectProfile?.hasBrowserUI && result.stack.framework) {
    descParts.push(`${result.stack.framework} web application`);
  } else if (result.stack.framework) {
    descParts.push(`${result.stack.framework} application`);
  } else if (result.stack.language) {
    descParts.push(`${result.stack.language} project`);
  }
```

### Checkpoint Commands

- After census.ts + census types: `pnpm run build` — Expected: compiles cleanly
- After detector + engineResult + scan-engine: `pnpm run test -- --run` — Expected: all existing tests pass (new field populated)
- After test file: `pnpm run test -- --run packages/cli/tests/engine/detectors/projectKind.test.ts` — Expected: all new tests pass
- After all changes: `pnpm run test -- --run` — Expected: 1074+ tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1074 passed
- Current test files: 85 passed
- Command used: `pnpm run test -- --run`
- After build: expected ~1085+ tests in 86 files (1 new test file, ~11+ new tests)
- Regression focus: `tests/engine/types.test.ts` (compile-time assertions on EngineResult shape), any test using `createEmptyEngineResult()`
