# Spec: Clear the Deck

**Created by:** AnaPlan
**Date:** 2026-04-26
**Scope:** .ana/plans/active/clear-the-deck/scope.md

## Approach

Seven corrections in two commits. Commit 1: foundation types + quality floor + config. Commit 2: save-all pipeline extraction + new tests. Both commits pass the pre-commit hook independently. The save-all fix is the riskiest item — isolating it means the builder debugs one thing if the hook fails.

**Commit 1 (Clusters A + B):**
- Centralize `ProofChain` to `types/proof.ts`, `ContractAssertion`/`ContractSchema`/`ContractFileChange` to new `types/contract.ts`
- Add `ProofChainStats` named interface to `types/proof.ts`
- ESLint test block + atomic unused import cleanup across 3 test files
- Fix dead test assertions in `artifact.test.ts` and ghost fixture data in `pr.test.ts`
- Add `custom` namespace to `anaJsonSchema.ts` and `createAnaJson`
- Add truncation to `ana proof context` callout summaries

**Commit 2 (Cluster C):**
- Extract `runPreCheckAndStore` and `captureModulesTouched` from `saveArtifact` into shared functions
- Wire both into `saveAllArtifacts`
- Add tests: TAMPERED blocking, pre-check data in `.saves.json`, modules_touched capture

**Key design decisions:**

The extracted pre-check function returns `ContractPreCheckResult` — callers handle their own console output. This follows the "separate data from presentation" principle. The `.saves.json` writing for pre-check data is part of the extracted function since both callers write identical structures.

The `captureModulesTouched` function takes `slug`, `projectRoot`, and `slugDir` and writes directly to `.saves.json`. In `saveArtifact`, this runs AFTER the commit (source files are committed). In `saveAllArtifacts`, this runs BEFORE the artifact commit — but the diff uses `git diff merge-base HEAD` which reads committed source files, not staged artifacts. Both paths produce correct results.

## Output Mockups

**ESLint after Commit 1** (no output = clean):
```
$ pnpm lint
> eslint src/ tests/
```

**ana proof context truncation:**
```
Callouts:
  [quality] FILE_ANCHOR — The `ContractAssertion` interface in artifact.ts marks `id` as optional, but runtime validation at line 367 enforces it as required. The type definition disagrees with...
         From: seal-hash-simplification
```
(Truncated at 250 chars on word boundary with ellipsis)

**save-all TAMPERED blocking:**
```
$ ana artifact save-all my-feature
ERROR: Contract tampered since plan commit. Cannot save verify report.
The contract was modified after it was sealed by the planner.
This invalidates the verification. Re-plan or restore the contract.
```

## File Changes

### `src/types/contract.ts` (create)
**What changes:** New file with canonical `ContractAssertion`, `ContractFileChange`, and `ContractSchema` interfaces. `id: string` and `says: string` are required (matching verify.ts and runtime validation).
**Pattern to follow:** `src/types/proof.ts` — same layering (types depend on nothing command-level).
**Why:** Eliminates the type divergence where artifact.ts said `id?: string` (lied) while verify.ts said `id: string` (truth). Single source of truth for contract types used by both commands.

### `src/types/proof.ts` (modify)
**What changes:** Add `ProofChain` interface (`{ entries: ProofChainEntry[] }`) and `ProofChainStats` interface (`{ runs: number; callouts: number }`). Both moved from their duplicate locations.
**Pattern to follow:** Existing `ProofChainEntry` already lives here with the CROSS-CUTTING comment.
**Why:** `ProofChain` is duplicated in `proof.ts` and `work.ts`. `ProofChainStats` is an inline return type on `writeProofChain`. Named types in the canonical location.

### `src/commands/artifact.ts` (modify)
**What changes:** (1) Remove local `ContractAssertion`, `ContractFileChange`, `ContractSchema` interfaces (lines 289-315). Import from `../types/contract.js`. (2) Extract pre-check execution + `.saves.json` writing (lines 553-606) into a shared function. (3) Extract modules_touched capture (lines 728-752) into a shared function. (4) Call both shared functions from `saveAllArtifacts`.
**Pattern to follow:** `writeSaveMetadata` (lines 44-68) for the shared-function-called-by-both-paths pattern.
**Why:** Clusters A and C. Type centralization eliminates the `id?: string` lie. Shared extraction gives save-all the same data quality as save.

### `src/commands/verify.ts` (modify)
**What changes:** Remove local `ContractAssertion` and `ContractSchema` interfaces (lines 48-66). Import from `../types/contract.js`.
**Pattern to follow:** Already imports `runContractPreCheck` export pattern.
**Why:** Single source of truth for contract types.

### `src/commands/proof.ts` (modify)
**What changes:** (1) Remove local `ProofChain` interface (lines 32-34). Import from `../types/proof.js`. (2) Add truncation to `formatContextResult` for callout summaries — truncate at 250 chars with word-boundary awareness and ellipsis.
**Pattern to follow:** `proofSummary.ts` lines 444-448 for the truncation pattern.
**Why:** Eliminates duplicate `ProofChain` + prevents long callout summaries from flooding terminal output.

### `src/commands/work.ts` (modify)
**What changes:** (1) Remove local `ProofChain` interface (lines 732-734). Import from `../types/proof.js`. (2) Change `writeProofChain` return type from `Promise<{ runs: number; callouts: number }>` to `Promise<ProofChainStats>`, importing `ProofChainStats` from types.
**Pattern to follow:** Existing `ProofChainEntry` import already comes from `../types/proof.js`.
**Why:** Eliminates duplicate `ProofChain` + names the inline return type.

### `src/commands/init/anaJsonSchema.ts` (modify)
**What changes:** Add `custom: z.record(z.string(), z.unknown()).optional().default({}).catch({})` after `lastScanAt` and before `.strip()`.
**Pattern to follow:** Existing per-field `.catch()` + `.default()` pattern in the same file.
**Why:** Configurability gate — `custom` namespace for user data that survives `.strip()`.

### `src/commands/init/state.ts` (modify)
**What changes:** Add `custom: {}` to the `anaConfig` object in `createAnaJson`, after `lastScanAt`.
**Pattern to follow:** Existing field ordering in the same function.
**Why:** Schema/creator parity contract documented at anaJsonSchema.ts lines 19-23. Field exists in schema but not creator = fresh inits missing it.

### `packages/cli/package.json` (modify)
**What changes:** Change `"lint": "eslint src/"` to `"lint": "eslint src/ tests/"`. Change `"lint:fix": "eslint src/ --fix"` to `"lint:fix": "eslint src/ tests/ --fix"`. Lines 47-48.
**Pattern to follow:** Existing script entries in the same file.
**Why:** Without this, `pnpm lint` (and the pre-commit hook that runs it) never passes test files to ESLint. The config block alone is dead config that no automated check invokes. This is load-bearing for AC1 — lint passes clean because it never looks at tests, not because tests are clean.

### `eslint.config.js` (modify)
**What changes:** Add a test override block before the ignores block. Rules: `no-unused-vars: error` (with `_` ignore patterns), `no-explicit-any: warn`, JSDoc rules off, `no-warning-comments: off`. Remove `tests/` from the ignores array.
**Pattern to follow:** The engine-code relaxation block (lines 37-51) — same "override rules for a specific directory" pattern.
**Why:** Tests enter lint scope. 100 test files gain baseline quality enforcement. Paired with the package.json change — config defines the rules, package.json makes the pre-commit hook invoke them.

### `tests/utils/findProjectRoot.test.ts` (modify)
**What changes:** Remove two tests: (1) "is exported from validators module" (line 85-87, `typeof` tautology — `expect(typeof findProjectRoot).toBe('function')`), (2) "all existing tests continue to pass" (lines 103-108, `expect(true).toBe(true)` meta-assertion). Both prove nothing.
**Pattern to follow:** N/A — deletion.
**Why:** Dead assertions that pass regardless of behavior.

### `tests/commands/artifact.test.ts` (modify)
**What changes:** (1) Fix scope immutability test (lines 1222-1243): change `scopeCommit = savesAfterScope.scope.commit` to `scopeHash = savesAfterScope.scope.hash`, and `expect(savesAfterSpec.scope.commit).toBe(scopeCommit)` to compare `hash`. (2) Add new save-all tests for Commit 2: TAMPERED blocking, pre-check data written to `.saves.json`, modules_touched capture.
**Pattern to follow:** Existing save-all test helpers (`createTestProject`, `captureError`, `createArtifact`). New tests for build-verify artifacts need feature branch setup — follow the `saveArtifact` pre-check tests which create a feature branch before saving.
**Why:** The `commit` field no longer exists (removed in seal-hash-simplification). `hash` is the correct immutability marker. New tests verify Cluster C behavioral changes.

### `tests/commands/pr.test.ts` (modify)
**What changes:** (1) Remove `vi` from the vitest import (line 1). (2) Remove `commit: 'abc123'` and `commit: 'def456'` from `.saves.json` fixture data (lines 273, 278).
**Pattern to follow:** N/A — cleanup.
**Why:** `vi` is imported but never used. `commit` fields are ghost data from the pre-simplification schema.

### `tests/commands/symbol-index.test.ts` (modify)
**What changes:** Remove `beforeAll` from the vitest import (line 1).
**Pattern to follow:** N/A — cleanup.
**Why:** `beforeAll` is imported but never called.

### `tests/engine/analyzers/patterns/dependencies.test.ts` (modify)
**What changes:** Remove `writeFile` and `mkdir` from the `fs/promises` import (line 3). Keep `mkdtemp` and `rm`.
**Pattern to follow:** N/A — cleanup.
**Why:** `writeFile` and `mkdir` are imported but never used in the file body.

### `tests/engine/integration/wasm-smoke.test.ts` (verify)
**What changes:** Scope identified `readFile` as unused here, but `readFile` is not imported — it only appears inside a string literal on line 19 (test fixture content). All three actual imports (`writeFile`, `mkdir`, `rm`) are used. Run ESLint on this file after the config change; if it passes clean, no changes needed.
**Pattern to follow:** N/A.
**Why:** Included for completeness. The builder should confirm ESLint produces no errors for this file.

## Acceptance Criteria

- [ ] AC1: ESLint config includes `tests/**/*.ts` with `no-unused-vars: error`, `no-explicit-any: warn`, JSDoc off, `no-warning-comments: off`. `pnpm lint` passes with zero errors.
- [ ] AC2: `ProofChain` interface exists only in `types/proof.ts`. No duplicate in `proof.ts` or `work.ts`.
- [ ] AC3: `ContractAssertion`, `ContractSchema`, and `ContractFileChange` exist in `types/contract.ts` with `id: string` and `says: string` (required). `artifact.ts` and `verify.ts` import from there. No local definitions remain.
- [ ] AC4: `ProofChainStats` is a named interface in `types/proof.ts`. `writeProofChain` uses it as its return type.
- [ ] AC5: `findProjectRoot.test.ts` has no `expect(true).toBe(true)` or `typeof` tautology tests.
- [ ] AC6: `artifact.test.ts` scope immutability test compares `hash` (a real field), not `commit` (a ghost field).
- [ ] AC7: `pr.test.ts` fixture has no `commit` fields in `.saves.json` mock data.
- [ ] AC8: `AnaJsonSchema` includes `custom: z.record(z.string(), z.unknown()).optional().default({}).catch({})`. `custom` field round-trips through parse. `createAnaJson` outputs `custom: {}`.
- [ ] AC9: `ana proof context` terminal output truncates callout summaries at 250 characters with word-boundary awareness and ellipsis.
- [ ] AC10: `saveAllArtifacts` runs `runContractPreCheck` when a verify-report and contract.yaml are present. Pre-check data (seal, assertions, coverage) is written to `.saves.json`.
- [ ] AC11: `saveAllArtifacts` captures `modules_touched` via git diff when a build-report is present, written to `.saves.json`.
- [ ] AC12: `saveAllArtifacts` blocks with error on TAMPERED seal, matching `saveArtifact` behavior.
- [ ] AC13: Pre-check and modules_touched logic is extracted into shared functions called by both save paths. No duplication between `saveArtifact` and `saveAllArtifacts`.
- [ ] AC14: Tests pass: `(cd packages/cli && pnpm vitest run)`
- [ ] AC15: Lint passes: `pnpm lint`
- [ ] AC16: No build errors: `pnpm run build`

## Testing Strategy

- **Unit tests (Commit 1):** Add `custom` round-trip test in `anaJsonSchema.test.ts` — parse an object with `custom: { myKey: 'value' }`, verify it survives and defaults to `{}` when missing. Follow existing drift test pattern.
- **Unit tests (Commit 2):** Three new tests in the `artifact.test.ts` save-all describe block:
  1. TAMPERED blocking: create project on feature branch, add verify-report + contract.yaml, modify contract after staging, run save-all, verify `process.exit(1)` with TAMPERED error message.
  2. Pre-check data: create project on feature branch with verify-report + contract.yaml + tagged test files, run save-all, verify `.saves.json` contains `pre-check` with seal, assertions, coverage.
  3. modules_touched: create project on feature branch with build-report + source files committed, run save-all, verify `.saves.json` contains `modules_touched` array with the changed files.
- **Edge cases:** Commit 2 tests need feature branch setup (not main). The existing save-all tests run on main because they only test planning artifacts. Follow the `saveArtifact` pre-check test pattern which creates a feature branch.
- **Existing tests:** Lines 1208 and 1500 (`expect(saves.scope.commit).toBeUndefined()` and `expect(saves[type].commit).toBeUndefined()`) are preserved — they verify the seal-hash-simplification removal landed. Do not remove them.

## Dependencies

None. All referenced modules exist. `runContractPreCheck` is already exported from verify.ts.

## Constraints

- ESLint config change, package.json lint script change, and unused import cleanup are atomic — all three MUST be in the same commit. The config defines the rules, the package.json change makes `pnpm lint` invoke them, and the import cleanup prevents immediate lint failures. If any piece lands without the others, the pre-commit hook either doesn't enforce tests (missing package.json) or rejects commits (missing cleanup).
- Pre-commit hook runs `tsc --noEmit`, `eslint`, and tests. Both commits must pass all three independently.
- Test count must not decrease. Current: 1478 passed, 97 files.
- `createAnaJson` returns `Record<string, unknown>`, not `AnaJson`. Adding `custom: {}` doesn't require a type change.
- `yaml.parse()` returns `unknown`. Making `ContractAssertion.id` required doesn't change runtime behavior — the validation function at artifact.ts line 367 is the real enforcement.

## Gotchas

- The `custom` field goes AFTER `lastScanAt` and BEFORE `.strip()` in the schema chain. It's a field definition, not a modifier. `.strip()` removes fields NOT in the schema — `custom` must be defined before `.strip()` to survive.
- `saveAllArtifacts` tests currently run on `main` (artifact branch). The new Cluster C tests need a feature branch because build-verify artifacts require one. The `saveArtifact` pre-check test suite already does this — create the feature branch after the initial commit on main.
- The scope immutability test fix (lines 1233/1242) changes variable name from `scopeCommit` to `scopeHash` and field access from `.commit` to `.hash`. This is a rename across 3 lines in a single test.
- `ContractPreCheckResult` is defined in verify.ts (line 29). It is NOT exported. The extracted pre-check function in artifact.ts should import and call `runContractPreCheck` (which IS exported) and work with the return type via inference. If type export is needed, export `ContractPreCheckResult` from verify.ts.
- In `saveAllArtifacts`, the modules_touched capture runs BEFORE the artifact commit (around line 996-1006, where `.saves.json` is written). The `git diff merge-base HEAD` compares against the last commit on HEAD, which contains the committed source files. This produces the correct file list.
- The `dependencies.test.ts` file uses bare `'fs/promises'` import (no `node:` prefix) and bare `'path'` and `'os'`. This is existing — don't change the import style in a cleanup commit. Only remove the unused specifiers.

## Build Brief

### Rules That Apply
- ESM imports with `.js` extension: `import type { ProofChain } from '../types/proof.js'`
- `import type` for type-only imports, separate from value imports
- Explicit return types on exported functions
- `--run` flag on all vitest invocations to avoid watch mode hang
- Per-field `.catch()` + `.default()` for new schema fields (anaJsonSchema.ts pattern)
- Test behavior not implementation — new save-all tests assert on `.saves.json` content and error messages, not internal function calls

### Pattern Extracts

**Truncation pattern** (`src/utils/proofSummary.ts` lines 444-448):
```typescript
let truncatedSummary = callout.summary;
if (truncatedSummary.length > 250) {
  const lastSpace = truncatedSummary.lastIndexOf(' ', 250);
  const cutPoint = lastSpace > 0 ? lastSpace : 250;
  truncatedSummary = truncatedSummary.substring(0, cutPoint) + '...';
}
```

**writeSaveMetadata pattern** (`src/commands/artifact.ts` lines 44-68):
```typescript
function writeSaveMetadata(slugDir: string, artifactType: string, content: string): void {
  const savesPath = path.join(slugDir, '.saves.json');
  let saves: Record<string, SaveMetadata> = {};
  if (fs.existsSync(savesPath)) {
    try {
      saves = JSON.parse(fs.readFileSync(savesPath, 'utf-8'));
    } catch {
      saves = {};
    }
  }
  const hash = createHash('sha256').update(content).digest('hex');
  saves[artifactType] = {
    saved_at: new Date().toISOString(),
    hash: `sha256:${hash}`,
  };
  fs.writeFileSync(savesPath, JSON.stringify(saves, null, 2));
}
```

**ESLint engine-code override block** (`eslint.config.js` lines 37-51):
```javascript
{
  files: ['src/engine/**/*.ts'],
  rules: {
    'jsdoc/require-jsdoc': 'off',
    'jsdoc/require-description': 'off',
    'jsdoc/require-param': 'off',
    'jsdoc/require-returns': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],
  },
},
```

**Pre-check block to extract** (`src/commands/artifact.ts` lines 553-606) — the block starting at `if (typeInfo.baseType === 'verify-report')` after format validation, through the `.saves.json` write. Extract the logic from line 560 (contract path construction) through line 605 (saves write). Keep the format validation (lines 553-558) in-place — only the pre-check + TAMPERED blocking + saves writing moves to the shared function.

**modules_touched block to extract** (`src/commands/artifact.ts` lines 728-752) — the full `if (typeInfo.baseType === 'build-report')` block. The function takes projectRoot and slugDir, reads artifact branch, computes merge-base, runs git diff, writes to `.saves.json`.

### Checkpoint Commands

- After Commit 1 (types + quality): `(cd packages/cli && pnpm vitest run)` — Expected: 1476+ tests pass (2 tautology tests removed, 1 custom test added = net -1), 97 files. `pnpm lint` — Expected: clean (0 errors).
- After Commit 2 (save-all): `(cd packages/cli && pnpm vitest run)` — Expected: 1479+ tests pass (3 new save-all tests), 97 files. `pnpm lint` — Expected: clean.
- Full check: `pnpm run build` — Expected: clean build.

### Build Baseline
- Current tests: 1478 passed, 2 skipped, 97 test files
- Command used: `(cd packages/cli && pnpm vitest run)`
- Current lint: clean (0 errors)
- Command used: `pnpm lint` (currently runs `eslint src/` — tests not yet in scope)
- After build: expected 1480+ tests in 97 files
- Regression focus: `tests/commands/artifact.test.ts` (save-all tests touch shared code), `tests/commands/pr.test.ts` (fixture change), `tests/utils/findProjectRoot.test.ts` (test removal)
