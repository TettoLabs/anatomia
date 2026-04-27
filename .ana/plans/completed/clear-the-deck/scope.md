# Scope: Clear the Deck

**Created by:** Ana
**Date:** 2026-04-26

## Intent

The proof chain identified bugs in its own codebase. We're fixing them. 6 of 7 items trace directly to proof chain callouts or the deep strategic audit. The 7th (the `custom` namespace) ships a configurability gate that prevents future foreclosure.

This is the first mechanical turn of the learning loop: the system found issues, we fix them through the pipeline, the proof chain records the fix. The narrative matters for the product — "Anatomia's proof chain found bugs in itself, and we fixed all of them in one pipeline run."

## Complexity Assessment

- **Size:** medium (7 independent items batched into one scope)
- **Files affected:**
  - `eslint.config.js` (config change)
  - `src/types/proof.ts` (add ProofChain, ProofChainStats)
  - `src/types/contract.ts` (new file — canonical ContractAssertion, ContractSchema, ContractFileChange)
  - `src/commands/artifact.ts` (import change + extract shared pre-check/modules functions)
  - `src/commands/verify.ts` (import change)
  - `src/commands/proof.ts` (import change + truncation)
  - `src/commands/work.ts` (import change + return type)
  - `src/commands/init/anaJsonSchema.ts` (add custom field)
  - `src/commands/init/state.ts` (add custom to createAnaJson)
  - `tests/utils/findProjectRoot.test.ts` (delete 2 tests)
  - `tests/commands/artifact.test.ts` (replace dead assertion + new save-all tests)
  - `tests/commands/pr.test.ts` (remove ghost fixture fields + remove unused import)
  - `tests/commands/init/anaJsonSchema.test.ts` (add custom round-trip test)
  - 4 test files with unused import cleanup (pr.test.ts, symbol-index.test.ts, dependencies.test.ts, wasm-smoke.test.ts)
- **Blast radius:** The ESLint change affects all 100 test files (they enter lint scope). The save-all pre-check adds TAMPERED blocking to a path that previously didn't have it (behavioral change, correct). Everything else is zero behavior change.
- **Estimated effort:** 2-3 build commits, ~150 lines changed net
- **Multi-phase:** no

## Approach

Seven corrections batched under one thesis: clean the foundation, prove the flywheel, ship a configurability gate.

The items split into three natural clusters for the planner:

**Cluster A — Foundation types.** Centralize duplicated types to `types/proof.ts` and new `types/contract.ts`. Reconcile the ContractAssertion divergence (artifact.ts says optional, verify.ts says required, runtime enforces required — make the type honest). Add ProofChainStats named type. Pure refactor, zero behavior change, but establishes the single-source-of-truth pattern for every type that crosses command boundaries.

**Cluster B — Quality floor + config.** Add ESLint test coverage (new config block for `tests/**/*.ts` with relaxed rules). Clean dead test assertions and ghost fixture data. Add `custom` namespace to ana.json. Add proof context terminal truncation. These are all independent and low-risk.

**Cluster C — Save pipeline parity.** Extract pre-check execution and modules_touched capture into shared functions. Call them from both `saveArtifact` and `saveAllArtifacts`. This is the highest-value and highest-risk item — it fixes data quality for every future pipeline run, but it adds TAMPERED blocking to save-all (a behavioral change) and needs new tests.

Plan should investigate whether to deliver these as 2 or 3 commits. The clusters are independent and could be separate specs in a multi-spec plan, or phases within one spec.

## Acceptance Criteria

- AC1: ESLint config includes `tests/**/*.ts` with `no-unused-vars: error`, `no-explicit-any: warn`, JSDoc off, `no-warning-comments: off`. `pnpm lint` passes with zero errors.
- AC2: `ProofChain` interface exists only in `types/proof.ts`. No duplicate in `proof.ts` or `work.ts`.
- AC3: `ContractAssertion`, `ContractSchema`, and `ContractFileChange` exist in `types/contract.ts` with `id: string` and `says: string` (required). `artifact.ts` and `verify.ts` import from there. No local definitions remain.
- AC4: `ProofChainStats` is a named interface in `types/proof.ts`. `writeProofChain` uses it as its return type.
- AC5: `findProjectRoot.test.ts` has no `expect(true).toBe(true)` or `typeof` tautology tests.
- AC6: `artifact.test.ts` scope immutability test compares `hash` (a real field), not `commit` (a ghost field).
- AC7: `pr.test.ts` fixture has no `commit` fields in `.saves.json` mock data.
- AC8: `AnaJsonSchema` includes `custom: z.record(z.string(), z.unknown()).optional().default({}).catch({})`. `custom` field round-trips through parse. `createAnaJson` outputs `custom: {}`.
- AC9: `ana proof context` terminal output truncates callout summaries at 250 characters with word-boundary awareness and ellipsis, matching the Active Issues pattern.
- AC10: `saveAllArtifacts` runs `runContractPreCheck` when a verify-report and contract.yaml are present. Pre-check data (seal, assertions, coverage) is written to `.saves.json`.
- AC11: `saveAllArtifacts` captures `modules_touched` via git diff when a build-report is present, written to `.saves.json`.
- AC12: `saveAllArtifacts` blocks with error on TAMPERED seal, matching `saveArtifact` behavior.
- AC13: Pre-check and modules_touched logic is extracted into shared functions called by both save paths. No duplication between `saveArtifact` and `saveAllArtifacts`.

## Edge Cases & Risks

**ESLint blast radius.** 100 test files enter lint scope. 4-5 files have genuinely unused imports (`vi` in pr.test.ts, `beforeAll` in symbol-index.test.ts, `writeFile`/`mkdir` in dependencies.test.ts, `readFile` in wasm-smoke.test.ts). These MUST be cleaned in the same commit as the config change, or the pre-commit hook will reject the next commit touching any test file. Plan should note this as a sequencing constraint: config change + import cleanup are atomic.

**14 `as any` usages in tests.** Set to `warn` not `error`, so they don't block commits. Mostly `result as any` for partial mock objects — legitimate in tests. Don't fix in this scope.

**ContractAssertion optionality.** Making `id` required in the canonical type is correct (runtime enforces it). But `artifact.ts` uses `yaml.parse()` which returns `unknown` — the assignment to `ContractSchema` is an implicit type assertion. TypeScript won't catch malformed YAML input regardless of the type definition. The validation function handles this at runtime. No behavior change.

**save-all TAMPERED blocking.** This is a behavioral change. A developer whose contract was accidentally modified will now get an error from `save-all` that they didn't get before. This is the CORRECT behavior (matches `saveArtifact`), but the plan should note it. The error message already exists and is clear.

**save-all test setup.** Existing save-all tests run on `main` (artifact branch). Build-verify artifacts require a feature branch. New tests need a different setup — create a feature branch before saving verify-report/build-report. Follow the pattern from the `saveArtifact` test suite which already does this.

**`custom` namespace naming.** Deliberate choice over `extensions` (cargo-cult from VS Code plugin model) and `.passthrough()` removal (loses typo detection and orphan cleanup). `custom` is an honest contract: "this bucket is yours, we preserve it, we don't validate it." Top-level `.strip()` stays — typos and orphaned fields from version upgrades are still caught.

## Rejected Approaches

**`eslint-plugin-vitest` in this scope.** The `expect-expect` rule would catch tautological tests mechanically. Deferred because adding a dependency increases scope and the vitest plugin's full rule set hasn't been evaluated. Ship ESLint coverage first, evaluate the plugin after.

**`Pick<ProofChainEntry, ...>` for ProofChainEntryForIndex/ForContext.** These narrow projections in proofSummary.ts COULD be derived from ProofChainEntry. Deferred — they're local, serve as documentation of what each function needs, and converting them creates a coupling that auto-propagates field additions. Not worth the risk for local types.

**`.passthrough()` instead of `custom` namespace.** Removes `.strip()` entirely. Simpler, but surrenders the schema's protection against typos and orphaned fields from version upgrades. 3 independent sub-agents unanimously chose `custom` over passthrough.

**`validateSetupCompletion` null scanJson fix.** Originally item 4 in this scope. Dropped because the scenario is narrow — re-scan between init and setup completion is uncommon. The check exists for completeness, not for a high-probability failure mode. Doesn't earn its place alongside the other items.

**Splitting CLI-030 into a separate scope.** Considered because it's the highest-risk item. Kept because it's the highest-value item and the shared function extraction actually REDUCES code in artifact.ts — it makes the file cleaner, not messier. The extraction is the "elegant solution that removes" duplication.

## Open Questions

None. All items have been verified against source code with line-level precision. Design decisions (custom vs passthrough, warn vs error for any, truncation limit) are resolved.

## Exploration Findings

### Patterns Discovered

- `eslint.config.js`: Three-block flat config pattern — src rules, engine relaxation, ignores. Test block follows this pattern naturally as a fourth block.
- `types/proof.ts`: CROSS-CUTTING comment at lines 16-21 documents the 4+ location change requirement for new fields. This is the right place for shared proof types.
- `proofSummary.ts:444-448`: Proven truncation pattern (250 chars, word boundary, ellipsis). Reuse in proof.ts.
- `saveArtifact` lines 553-606 and 728-752: Pre-check and modules_touched capture logic. These are the blocks to extract.
- `writeSaveMetadata` at artifact.ts:44-68: Shared helper that save-all already uses for basic metadata. Pre-check and modules_touched are additional data that needs the same treatment.

### Constraints Discovered

- [TYPE-VERIFIED] ESLint unused imports (4-5 files) — `vi`, `beforeAll`, `writeFile`, `mkdir`, `readFile` imported but unused. Must clean atomically with config change.
- [TYPE-VERIFIED] ContractAssertion divergence — artifact.ts:289 `id?: string` vs verify.ts:48 `id: string`. Runtime validation at artifact.ts:367 enforces required. Type lies.
- [TYPE-VERIFIED] save-all pre-check gap — `saveAllArtifacts` lines 893-899 validate verify-report format but don't run `runContractPreCheck`. Lines 996-1006 write only basic metadata via `writeSaveMetadata`.
- [TYPE-VERIFIED] save-all modules_touched gap — `saveAllArtifacts` has no build-report-specific handling. The `git diff` capture at `saveArtifact` lines 728-752 has no equivalent.
- [OBSERVED] `createAnaJson` at state.ts:375-391 does not include `custom` — needs addition per the schema/creator parity contract documented at anaJsonSchema.ts:19-23.

### Test Infrastructure

- `tests/commands/artifact.test.ts`: save-all describe block starts at line 1275. Has `createTestProject` helper, `captureError` for process.exit testing. Runs on `main` (artifact branch). New tests for verify-report/build-report need feature branch setup — pattern exists in the `saveArtifact` tests.
- `tests/commands/init/anaJsonSchema.test.ts`: 169 lines. Four describe blocks (happy path, drift, defaults, catch isolation, enum values). Add a new test for `custom` round-trip alongside the existing drift tests.

## For AnaPlan

### Structural Analog

`saveArtifact` in artifact.ts (lines 491-810) is the structural analog for the save-all fix. Both functions scan for artifacts, validate them, stage them, write metadata, commit. The single-save path has pre-check and modules_touched logic that save-all lacks. The extraction creates shared functions both paths call.

For the ESLint config block, the engine-code relaxation at eslint.config.js lines 37-51 is the structural analog — same "override rules for a specific directory" pattern.

### Relevant Code Paths

- `eslint.config.js` — full file, 55 lines. Third block at line 52 is the ignores.
- `src/types/proof.ts` — full file, 46 lines. ProofChainEntry + CROSS-CUTTING comment.
- `src/commands/artifact.ts:44-68` — `writeSaveMetadata` (existing shared helper)
- `src/commands/artifact.ts:289-315` — local ContractAssertion/Schema/FileChange (to be moved)
- `src/commands/artifact.ts:553-606` — pre-check block in saveArtifact (to be extracted)
- `src/commands/artifact.ts:728-752` — modules_touched capture in saveArtifact (to be extracted)
- `src/commands/artifact.ts:824-1044` — full saveAllArtifacts function
- `src/commands/artifact.ts:893-899` — verify-report validation in save-all (missing pre-check)
- `src/commands/artifact.ts:996-1006` — save metadata writing in save-all (missing pre-check and modules)
- `src/commands/verify.ts:29-43` — ContractPreCheckResult type
- `src/commands/verify.ts:48-66` — local ContractAssertion/Schema (to be moved)
- `src/commands/proof.ts:32-34` — local ProofChain (to be moved)
- `src/commands/proof.ts:345-387` — formatContextResult (needs truncation)
- `src/commands/work.ts:732-734` — local ProofChain (to be moved)
- `src/commands/work.ts:744` — inline return type (to be named)
- `src/commands/init/anaJsonSchema.ts` — full file, 51 lines
- `src/commands/init/state.ts:375-391` — createAnaJson config object
- `src/utils/proofSummary.ts:444-448` — truncation pattern to reuse

### Patterns to Follow

- `types/proof.ts` for shared type centralization
- `eslint.config.js` engine-code block (lines 37-51) for relaxed-rules pattern
- `proofSummary.ts:444-448` for truncation
- `writeSaveMetadata` for the shared-function-called-by-both-paths pattern
- `anaJsonSchema.ts` per-field `.catch()` + `.default()` for the `custom` field

### Known Gotchas

- ESLint config change + unused import cleanup MUST be atomic. If the config lands without the cleanup, pre-commit hook blocks the next commit touching any of the 4-5 affected test files.
- `saveAllArtifacts` tests run on `main` (artifact branch). Build-verify artifact tests need a feature branch. Pattern exists in saveArtifact tests — copy the branch setup.
- `yaml.parse()` returns `unknown`. Making `ContractAssertion.id` required in the type doesn't change runtime behavior — the validation function is the real enforcement.
- `createAnaJson` returns `Record<string, unknown>`, not `AnaJson`. Adding `custom: {}` doesn't require a type change on the function.
- The `custom` field should go BEFORE `.strip()` in the schema chain — it's a field definition, not a modifier. Place it after `lastScanAt` and before the `.strip()` call.

### Things to Investigate

- **Commit strategy:** Should this be 2 commits (types + quality in one, save-all fix in another) or 3 (types, quality+config, save-all)? The clusters are independent. The question is whether Verify benefits from smaller contracts per commit or a single comprehensive pass. Plan should decide based on contract complexity.
- **Pre-check extraction boundary:** The pre-check block in `saveArtifact` (lines 553-606) includes console output (TAMPERED error, UNCOVERED warning) alongside the `.saves.json` writing. Should the extracted function include the console output, or should it return the result and let each caller handle display? Returning the result is cleaner (separates data from presentation) but requires both callers to duplicate the display logic. Plan should evaluate.
- **modules_touched on save-all timing:** In `saveArtifact`, modules_touched capture happens AFTER the commit (line 728, after line 725 commit). In save-all, all artifacts are committed in one batch (line 1014). The capture should happen BEFORE the commit in save-all since all files are already staged. Plan should verify the git diff still works correctly when files are staged but not yet committed — the merge-base diff compares against HEAD, not staged.
