# Verify Report: Clear the Deck — foundation fixes from proof chain audit

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-26
**Spec:** .ana/plans/active/clear-the-deck/spec.md
**Branch:** feature/clear-the-deck

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/clear-the-deck/contract.yaml
  Seal: INTACT (hash sha256:6567b885668185558c71fda7febaef4e26993843fd4f591c059cb62b6ef775fc)

  A001  ✓ COVERED  "Contract types live in one place, not scattered across commands"
  A002  ✓ COVERED  "Contract type requires an ID for every assertion"
  A003  ✓ COVERED  "Contract type requires a human-readable description for every assertion"
  A004  ✓ COVERED  "Artifact command uses the shared contract types, not its own copy"
  A005  ✓ COVERED  "Verify command uses the shared contract types, not its own copy"
  A006  ✓ COVERED  "Proof chain structure lives in one place, not duplicated across commands"
  A007  ✓ COVERED  "Proof chain health stats have a named type instead of inline object shape"
  A008  ✓ COVERED  "writeProofChain returns a named type instead of an anonymous shape"
  A009  ✓ COVERED  "The lint command actually checks test files, not just source files"
  A010  ✓ COVERED  "Test files are covered by lint rules"
  A011  ✓ COVERED  "Test files enforce unused variable detection"
  A012  ✓ COVERED  "Test files allow type assertions without blocking commits"
  A013  ✓ COVERED  "Lint passes clean after adding test file coverage"
  A014  ✓ COVERED  "No tautological tests remain that pass regardless of behavior"
  A015  ✓ COVERED  "Scope immutability test checks a real field that exists"
  A016  ✓ COVERED  "Test fixtures match the current schema without ghost fields"
  A017  ✓ COVERED  "Projects can store custom configuration that survives schema validation"
  A018  ✓ COVERED  "Custom configuration round-trips through parse without data loss"
  A019  ✓ COVERED  "Fresh projects get an empty custom namespace by default"
  A020  ✓ COVERED  "Long callout summaries are truncated so they don't flood the terminal"
  A021  ✓ COVERED  "Truncation respects word boundaries instead of cutting mid-word"
  A022  ✓ COVERED  "Saving all artifacts checks contract integrity when verification data exists"
  A023  ✓ COVERED  "Contract tampering blocks save-all just like it blocks individual saves"
  A024  ✓ COVERED  "Save-all records verification proof data for the proof chain to consume"
  A025  ✓ COVERED  "Save-all records which source files changed for the proof chain"
  A026  ✓ COVERED  "Pre-check logic exists once, not copied between save paths"
  A027  ✓ COVERED  "Module tracking logic exists once, not copied between save paths"
  A028  ✓ COVERED  "All tests pass after both commits"

  28 total · 28 covered · 0 uncovered
```

Tests: 1481 passed, 2 skipped, 97 files. Build: clean. Lint: 0 errors, 14 warnings.

## Contract Compliance
| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Contract types live in one place, not scattered across commands | ✅ SATISFIED | `src/types/contract.ts` exists with `ContractAssertion`, `ContractFileChange`, `ContractSchema` (lines 14, 26, 34). Grep confirms no duplicate interfaces in `src/commands/`. |
| A002 | Contract type requires an ID for every assertion | ✅ SATISFIED | `src/types/contract.ts:15` — `id: string` (required, not optional). |
| A003 | Contract type requires a human-readable description for every assertion | ✅ SATISFIED | `src/types/contract.ts:16` — `says: string` (required, not optional). |
| A004 | Artifact command uses the shared contract types, not its own copy | ✅ SATISFIED | `artifact.ts:28` imports from `../types/contract.js`. Grep confirms no `interface ContractAssertion` in artifact.ts. |
| A005 | Verify command uses the shared contract types, not its own copy | ✅ SATISFIED | `verify.ts:25` imports from `../types/contract.js`. Grep confirms no `interface ContractAssertion` or `interface ContractSchema` in verify.ts. |
| A006 | Proof chain structure lives in one place, not duplicated across commands | ✅ SATISFIED | Grep for `interface ProofChain` returns single match: `src/types/proof.ts:26`. `proof.ts:24` and `work.ts:22` import from `../types/proof.js`. |
| A007 | Proof chain health stats have a named type instead of inline object shape | ✅ SATISFIED | `src/types/proof.ts:33-36` — `ProofChainStats` interface with `runs: number` and `callouts: number`. |
| A008 | writeProofChain returns a named type instead of an anonymous shape | ��� SATISFIED | `src/commands/work.ts:739` — `async function writeProofChain(...): Promise<ProofChainStats>`. Import at line 22. |
| A009 | The lint command actually checks test files, not just source files | ✅ SATISFIED | `packages/cli/package.json:47` — `"lint": "eslint src/ tests/"`. |
| A010 | Test files are covered by lint rules | ✅ SATISFIED | `eslint.config.js:54` — `files: ['tests/**/*.ts']` block with parser and rules. |
| A011 | Test files enforce unused variable detection | ✅ SATISFIED | `eslint.config.js:66` — `'@typescript-eslint/no-unused-vars': ['error', ...]`. |
| A012 | Test files allow type assertions without blocking commits | ✅ SATISFIED | `eslint.config.js:71` — `'@typescript-eslint/no-explicit-any': 'warn'`. |
| A013 | Lint passes clean after adding test file coverage | ✅ SATISFIED | `pnpm lint` exits 0 with 0 errors (14 warnings, all `no-explicit-any`). |
| A014 | No tautological tests remain that pass regardless of behavior | ✅ SATISFIED | Grep for `expect(true).toBe` and `typeof.*toBe('function')` in `findProjectRoot.test.ts` returns zero matches. File has 7 behavioral tests, all meaningful. |
| A015 | Scope immutability test checks a real field that exists | ✅ SATISFIED | `artifact.test.ts:1233` — `scopeHash = savesAfterScope.scope.hash`; line 1242 — `expect(savesAfterSpec.scope.hash).toBe(scopeHash)`. Uses `hash`, not `commit`. |
| A016 | Test fixtures match the current schema without ghost fields | ✅ SATISFIED | Grep for `commit:` in `pr.test.ts` returns zero matches. Fixture at line 271 has `scope.hash` and `contract.hash` with no ghost `commit` fields. |
| A017 | Projects can store custom configuration that survives schema validation | ✅ SATISFIED | `anaJsonSchema.ts:47` — `custom: z.record(z.string(), z.unknown()).optional().default({}).catch({})`. Positioned before `.strip()` at line 49. Test at `anaJsonSchema.test.ts:110-114`. |
| A018 | Custom configuration round-trips through parse without data loss | ✅ SATISFIED | `anaJsonSchema.test.ts:110-114` — parses `{ custom: { myKey: 'myValue', nested: { a: 1 } } }`, asserts `toEqual` on round-trip. |
| A019 | Fresh projects get an empty custom namespace by default | ✅ SATISFIED | `state.ts:391` — `custom: {}` in `createAnaJson`. `anaJsonSchema.test.ts:116-117` — `AnaJsonSchema.parse({ name: 'test' })` yields `custom` equal to `{}`. |
| A020 | Long callout summaries are truncated so they don't flood the terminal | ✅ SATISFIED | `proof.ts:362-367` implements truncation at 250 chars. Live run of `ana proof context` confirmed truncated output with `...` suffix. |
| A021 | Truncation respects word boundaries instead of cutting mid-word | ✅ SATISFIED | `proof.ts:365-366` — `lastIndexOf(' ', 250)` for word boundary, falls back to 250 if no space found. Matches spec pattern from `proofSummary.ts:444-448`. |
| A022 | Saving all artifacts checks contract integrity when verification data exists | ✅ SATISFIED | `artifact.ts:944-945` — `if (artifacts.some(a => a.typeInfo.baseType === 'verify-report')) { runPreCheckAndStore(slug, planDir, projectRoot); }`. Test at `artifact.test.ts:1597-1651` verifies pre-check data in `.saves.json`. |
| A023 | Contract tampering blocks save-all just like it blocks individual saves | ✅ SATISFIED | Test at `artifact.test.ts:1549-1595` — tampers contract, calls `saveAllArtifacts`, asserts error contains `'tampered'`. `runPreCheckAndStore` at line 91-96 calls `process.exit(1)` on TAMPERED. |
| A024 | Save-all records verification proof data for the proof chain to consume | ✅ SATISFIED | Test at `artifact.test.ts:1644-1650` — after `saveAllArtifacts`, reads `.saves.json`, asserts `pre-check.seal === 'INTACT'`, `pre-check.assertions` defined, `pre-check.covered >= 0`. |
| A025 | Save-all records which source files changed for the proof chain | ✅ SATISFIED | Test at `artifact.test.ts:1653-1705` — creates feature branch, modifies `src/index.ts`, calls `saveAllArtifacts`, asserts `modules_touched` contains `'src/index.ts'`. |
| A026 | Pre-check logic exists once, not copied between save paths | ✅ SATISFIED | `artifact.ts:82` — `function runPreCheckAndStore(...)`. Called at line 627 (saveArtifact) and line 945 (saveAllArtifacts). Single function, two callers. |
| A027 | Module tracking logic exists once, not copied between save paths | ✅ SATISFIED | `artifact.ts:141` — `function captureModulesTouched(...)`. Called at line 754 (saveArtifact) and line 950 (saveAllArtifacts). Single function, two callers. |
| A028 | All tests pass after both commits | ✅ SATISFIED | 1481 tests passed (> 1476 threshold). 97 test files. 2 skipped (pre-existing). |

## Independent Findings

**Prediction resolution:**

1. **Truncation edge case (no spaces before 250):** Confirmed handled — `proof.ts:366` falls back to hard cut at 250 via `lastSpace > 0 ? lastSpace : 250`. The `proofSummary.ts` already has tests for this edge case (line 1050) so the pattern is proven.

2. **Shared pre-check extraction differences:** Not found — `runPreCheckAndStore` is called identically by both paths. The only difference is the `slugDir` parameter (`slugDir` in saveArtifact, `planDir` in saveAllArtifacts) which correctly resolves to the same plan directory.

3. **Weak @ana tags checking existence not value:** Partially confirmed — A024 test uses `expect(saves['pre-check'].covered).toBeGreaterThanOrEqual(0)` which passes even if coverage is 0. However, the test also asserts `seal === 'INTACT'` and `assertions` defined, which together constitute a meaningful behavioral check.

4. **modules_touched test simplicity:** Confirmed adequate — the test at lines 1653-1705 creates a real git repo, makes commits on a feature branch, runs the full `saveAllArtifacts` pipeline, and asserts on real `.saves.json` content. It exercises the real git diff path.

5. **Custom field placement relative to .strip():** Not found — `custom` at line 47 is correctly positioned before `.strip()` at line 49. Round-trip test proves it survives parsing.

**Extra file changes not in spec:** 7 additional test files were modified (init.test.ts, verify.test.ts, fixtures.ts, parsed-backward-compat.test.ts, patterns-backward-compat.test.ts, structure-backward-compat.test.ts, cross-platform.test.ts). All changes are lint-fix-required: removing unused imports (`fsSync`, `AnalysisResult`, `createEmptyAnalysisResult`, `path`) and prefixing unused variables with `_` (`templateSettings` → `_templateSettings`, `error` → `_error`). These are necessary for lint to pass under the new `no-unused-vars: error` rule. Not over-building — they are load-bearing for AC1.

**Unused exports in new files:** `ContractAssertion` and `ContractFileChange` are exported from `types/contract.ts` but only used as sub-types of `ContractSchema` (via its `assertions` and `file_changes` fields). Neither is directly imported by any consumer — they're accessed structurally through `ContractSchema`. The exports exist for future consumers and for documentation clarity. Not dead code — they're part of the public type surface.

**A020/A021 tag collision:** The `@ana A020, A021` tag at `proof.ts:362` is in source code, not a test file. Pre-check reports COVERED because other features' test files coincidentally have `@ana A020` and `@ana A021` tags (readme.test.ts, confirmation.test.ts, work.test.ts). The truncation behavior itself is correct (verified by code read + live `ana proof context` output), but there is no dedicated test exercising `formatContextResult` truncation. This is a gap covered by code review and manual verification rather than automated testing.

## AC Walkthrough

- **AC1:** ESLint config includes `tests/**/*.ts` with `no-unused-vars: error`, `no-explicit-any: warn`, JSDoc off, `no-warning-comments: off`. `pnpm lint` passes with zero errors. → ✅ PASS. `eslint.config.js:54-77` has the exact rules. `pnpm lint` exits 0 (0 errors, 14 warnings all `no-explicit-any` which is correctly `warn`).

- **AC2:** `ProofChain` interface exists only in `types/proof.ts`. No duplicate in `proof.ts` or `work.ts`. → ✅ PASS. Grep returns single match at `types/proof.ts:26`. `proof.ts:24` and `work.ts:22` import from there.

- **AC3:** `ContractAssertion`, `ContractSchema`, and `ContractFileChange` exist in `types/contract.ts` with `id: string` and `says: string` (required). `artifact.ts` and `verify.ts` import from there. No local definitions remain. → ✅ PASS. All three interfaces at `types/contract.ts:14,26,34`. `id: string` and `says: string` required. Both consumers import `ContractSchema` from `../types/contract.js`. Grep confirms no local definitions.

- **AC4:** `ProofChainStats` is a named interface in `types/proof.ts`. `writeProofChain` uses it as its return type. → ✅ PASS. `types/proof.ts:33-36`. `work.ts:739` return type is `Promise<ProofChainStats>`.

- **AC5:** `findProjectRoot.test.ts` has no `expect(true).toBe(true)` or `typeof` tautology tests. → ✅ PASS. Grep returns zero matches. File has 7 behavioral tests.

- **AC6:** `artifact.test.ts` scope immutability test compares `hash` (a real field), not `commit` (a ghost field). → ✅ PASS. Line 1233: `scopeHash = savesAfterScope.scope.hash`. Line 1242: `expect(savesAfterSpec.scope.hash).toBe(scopeHash)`.

- **AC7:** `pr.test.ts` fixture has no `commit` fields in `.saves.json` mock data. → ✅ PASS. Grep for `commit:` returns zero matches in pr.test.ts. Also `vi` removed from imports (line 1).

- **AC8:** `AnaJsonSchema` includes `custom: z.record(z.string(), z.unknown()).optional().default({}).catch({})`. `custom` field round-trips through parse. `createAnaJson` outputs `custom: {}`. → ✅ PASS. Schema at `anaJsonSchema.ts:47`. Round-trip test at `anaJsonSchema.test.ts:109-118`. `state.ts:391` has `custom: {}`.

- **AC9:** `ana proof context` terminal output truncates callout summaries at 250 characters with word-boundary awareness and ellipsis. → ✅ PASS. `proof.ts:362-367` implements exact pattern. Live `ana proof context` output confirms truncated summaries ending with `...`.

- **AC10:** `saveAllArtifacts` runs `runContractPreCheck` when a verify-report and contract.yaml are present. Pre-check data written to `.saves.json`. → ✅ PASS. `artifact.ts:944-945` checks for verify-report, calls `runPreCheckAndStore`. Test at `artifact.test.ts:1597-1651` verifies `.saves.json` contains `pre-check` with `seal`, `assertions`, `covered`.

- **AC11:** `saveAllArtifacts` captures `modules_touched` via git diff when a build-report is present, written to `.saves.json`. → ✅ PASS. `artifact.ts:948-950` checks for build-report, calls `captureModulesTouched`. Test at `artifact.test.ts:1653-1705` verifies `modules_touched` contains `src/index.ts`.

- **AC12:** `saveAllArtifacts` blocks with error on TAMPERED seal, matching `saveArtifact` behavior. → ✅ PASS. `runPreCheckAndStore` at `artifact.ts:91-96` exits on TAMPERED. Test at `artifact.test.ts:1549-1595` confirms error.

- **AC13:** Pre-check and modules_touched logic is extracted into shared functions called by both save paths. No duplication. → ✅ PASS. `runPreCheckAndStore` (line 82) called at lines 627 and 945. `captureModulesTouched` (line 141) called at lines 754 and 950.

- **AC14:** Tests pass: `(cd packages/cli && pnpm vitest run)` → ✅ PASS. 1481 passed, 2 skipped, 97 files.

- **AC15:** Lint passes: `pnpm lint` → ✅ PASS. 0 errors, 14 warnings.

- **AC16:** No build errors: `pnpm run build` → ✅ PASS. Build clean, `tsc --noEmit` clean.

## Blockers

No blockers. All 28 contract assertions satisfied. All 16 acceptance criteria pass. Tests pass (1481, up from 1478 baseline — net +3 from 3 new save-all tests minus 2 tautology removals plus 1 custom round-trip plus 1 invalid custom test). Build and lint clean. Checked for: unused exports in new `types/contract.ts` (2 sub-types used structurally via ContractSchema — not dead), unused parameters in `runPreCheckAndStore` and `captureModulesTouched` (all 3 params used), error paths that swallow silently (`captureModulesTouched` line 161 catches silently but this is intentional — merge-base failure is graceful degradation, not data corruption), no regressions in 97 test files.

## Callouts

- **Code — `ContractAssertion` and `ContractFileChange` exported but never directly imported:** `src/types/contract.ts:14,26` — Both interfaces are exported but no consumer imports them directly. They're accessed structurally through `ContractSchema.assertions` and `ContractSchema.file_changes`. The exports are forward-looking — a future consumer (e.g., a contract linter) would import them. Not a problem today, but if the interfaces drift from what `ContractSchema` uses, the exported types become misleading.

- **Test — No dedicated test for `formatContextResult` truncation:** `src/commands/proof.ts:362-367` — The truncation logic is tagged `@ana A020, A021` in source code, but no test file exercises this code path. Pre-check reports COVERED due to tag collision with other features' A020/A021 tags. The behavior is correct (verified by code review and live `ana proof context` output), but a regression in this function would not be caught by automated tests. A test in `proof.test.ts` that creates a proof chain entry with a >250-char callout summary and asserts the `proof context` output is truncated would close this gap.

- **Test — A024 weak assertion on coverage count:** `tests/commands/artifact.test.ts:1650` — `expect(saves['pre-check'].covered).toBeGreaterThanOrEqual(0)` passes even if coverage is 0. The test sets up one tagged assertion that should be covered, so `toBeGreaterThanOrEqual(1)` or `toBe(1)` would be more specific. Not a false positive today (the setup ensures coverage), but the assertion is weaker than it needs to be.

- **Code — `captureModulesTouched` silent catch:** `src/commands/artifact.ts:161` — The outer try/catch swallows all errors silently. If `readArtifactBranch` fails (missing ana.json), `git merge-base` fails (detached HEAD), or `git diff` fails (corrupt index), `modules_touched` simply isn't written. This is acceptable graceful degradation for a metadata-capture function, but it means a misconfigured environment silently produces incomplete proof chain data. A `console.warn` on failure would make debugging easier without breaking the pipeline.

- **Upstream — Pre-check tag collision across features:** The `@ana` tag system uses non-unique IDs (A001, A002, ...) scoped per-contract. Pre-check searches ALL test files for matching IDs, meaning coverage from unrelated features can false-positive as COVERED. This build's A020/A021 are an example. This isn't a bug in THIS build — it's an architectural limitation of the pre-check tool that could mask missing test coverage in future builds.

- **Code — Extra test files not in spec file_changes:** 7 test files were modified beyond the spec's file_changes list (init.test.ts, verify.test.ts, fixtures.ts, 3 backward-compat tests, cross-platform.test.ts). All are lint-fix-required changes — removing unused imports and prefixing unused variables. The builder was forced to make these to satisfy the new `no-unused-vars: error` rule. The spec should have anticipated this cascade (the constraint section mentions "atomic unused import cleanup across 3 test files" but the actual count was 7+). Not a code problem — a spec undercount.

## Deployer Handoff

- This PR adds ESLint enforcement for test files. After merge, all future test file changes will be subject to `no-unused-vars: error` and `no-explicit-any: warn`. The 14 existing `any` warnings are all in test files that predate this change — they won't block commits but will appear in lint output.
- The `custom` field in `ana.json` is new. Existing `ana.json` files will gain `custom: {}` on next `ana init` re-init. No migration needed — the schema defaults empty object when missing.
- `saveAllArtifacts` now has parity with `saveArtifact` for pre-check and modules_touched. No behavioral change for existing save workflows — only save-all gains the new data capture.
- Test count increased from 1478 to 1481 (net +3). No tests were broken or weakened.

## Verdict
**Shippable:** YES

All 28 contract assertions satisfied. All 16 acceptance criteria pass. 1481 tests pass, build clean, lint clean (0 errors). The type centralization eliminates real divergence (the `id?: string` lie in artifact.ts). The save-all pipeline extraction gives both save paths identical data quality. The ESLint test coverage establishes a quality floor that catches real issues (7 files needed lint fixes to pass). The one gap — no automated test for proof context truncation — is a callout, not a blocker. The implementation is correct and the behavior was verified live.
