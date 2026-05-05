# Verify Report: Code Comment Cleanup

**Result:** FAIL
**Created by:** AnaVerify
**Date:** 2026-05-05
**Spec:** .ana/plans/active/code-comment-cleanup/spec.md
**Branch:** feature/code-comment-cleanup

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/code-comment-cleanup/contract.yaml
  Seal: INTACT (hash sha256:a8e4e5e6175355e926367af535dee8e79a1efe2f807b3e31639888d9d748bb2b)
```

Seal: **INTACT**

Tests: 1883 passed, 2 skipped (94 files). Build: success. Lint: 0 errors, 1 warning (pre-existing unused eslint-disable). Typecheck: clean.

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | The scan engine header describes the actual pipeline without referencing deleted functions | ✅ SATISFIED | grep for `analyze()` in scan-engine.ts returns 0 matches |
| A002 | The engine barrel file contains only clean re-exports | ✅ SATISFIED | engine/index.ts is exactly 4 lines of clean re-exports |
| A003 | Tree-sitter parser header has no implementation checkpoint references | ❌ UNSATISFIED | `SS-10` remains at treeSitter.ts:100 in ParserManager JSDoc |
| A004 | No source files reference the nonexistent START_HERE.md document | ✅ SATISFIED | grep for START_HERE.md in src/ returns 0 |
| A005 | No source files reference the nonexistent ATLAS3 directory | ✅ SATISFIED | grep for ATLAS3 in src/ returns 0 |
| A006 | The confidence utility has no references to nonexistent design documents | ✅ SATISFIED | grep for ATLAS3 in confidence.ts returns 0 |
| A007 | No bare sprint identifiers remain in source files | ✅ SATISFIED | grep for S13-S24 in src/ returns 0; grep for SCAN-/SETUP-/INFRA- in src/ returns 0 |
| A008 | No bare sprint identifiers remain in test files | ❌ UNSATISFIED | 6 sprint refs remain: all-scaffolds.test.ts:12 (S15), anaJsonSchema.test.ts:55 (S18), check-dashboard.test.ts:339 (S19), preflight.test.ts:30 (S19), detection-overrides.test.ts:141 (S19), check.test.ts:76 (S15) |
| A009 | No implementation plan identifiers remain in the codebase | ❌ UNSATISFIED | cross-platform.test.ts:27 contains `STEP_0.1` |
| A010 | No backlog or design document identifiers remain in the codebase | ❌ UNSATISFIED | 13+ refs in tests: types.test.ts (Item 3, 6, 7a, 7b, 7d), skill-seeding.test.ts:99 (Item 12), injectors.test.ts:28 (Item 18), engineResult-partial.test.ts:110 (Item 2.1), all-scaffolds.test.ts:16 (D6.6), skill-seeding.test.ts:183 (D6.13), check.test.ts:133 (D12.3) |
| A011 | AI SDK detection tests use proper types instead of any casts | ✅ SATISFIED | grep for `as any` in ai-sdk-detection.test.ts returns 0 |
| A012 | Import convention tests use the ImportInfo type instead of any arrays | ✅ SATISFIED | grep for `any[]` in imports.test.ts returns 0 |
| A013 | Contract tests use proper types instead of any casts | ✅ SATISFIED | grep for `as any` in analyzer-contract.test.ts returns 0 |
| A014 | Pattern confirmation tests use the isMultiPattern type guard instead of any casts | ✅ SATISFIED | grep for `as any` in confirmation.test.ts returns 0 |
| A015 | No JSDoc examples reference the deleted analyze function | ✅ SATISFIED | all @example blocks in src/engine/ reference valid functions (ParserManager, detectLanguage, etc.) |
| A016 | Ruby parser explains why it exists without using sprint identifiers | ✅ SATISFIED | grep for S13-S24/INFRA-/SCAN-/SETUP- in ruby.ts returns 0 |
| A017 | Ruby parser still explains why the higher-level reader was removed | ✅ SATISFIED | ruby.ts:6 contains "retained" — full rationale preserved |
| A018 | PHP parser explains why it exists without using sprint identifiers | ✅ SATISFIED | grep for S13-S24/INFRA-/SCAN-/SETUP- in php.ts returns 0 |
| A019 | The sprint-named test file has been renamed to describe what it tests | ✅ SATISFIED | detection-overrides.test.ts exists with descriptive header |
| A020 | The old sprint-named test file no longer exists | ✅ SATISFIED | s11-detection.test.ts not found on filesystem |
| A021 | No ticket identifiers remain in test files | ❌ UNSATISFIED | 6 ticket refs remain: scanProject.test.ts:123,222 (SCAN-042), injectors.test.ts:205 (SCAN-050), detection-overrides.test.ts:141 (SCAN-032), check-dashboard.test.ts:339 (SETUP-025), check-dashboard.test.ts:731 (SETUP-027) |
| A022 | All existing tests continue to pass after the cleanup | ✅ SATISFIED | 1883 passed, 2 skipped |
| A023 | The build compiles without type errors | ✅ SATISFIED | `pnpm tsc --noEmit` exits 0 |
| A024 | No lint errors are introduced by the cleanup | ✅ SATISFIED | lint exits with 0 errors (1 pre-existing warning) |

**Summary:** 19 SATISFIED, 5 UNSATISFIED.

## Independent Findings

**Prediction resolution:**
1. "Builder probably missed some sprint refs in low-density files" — **Confirmed** in test files. The src/ cleanup is complete but Wave 3 (test file cleanup) is materially incomplete.
2. "confirmation.test.ts type narrowing probably has a subtle issue" — **Not found.** The `as any` casts are cleanly removed, tests pass, typecheck is clean.
3. "Test file rename may still reference S11 in descriptions" — **Confirmed partially.** The renamed file's header is clean, but line 141 still contains `S19/SCAN-032` in a test description.
4. "D2 or Item N references probably remain in engineResult.ts" — **Not found in src/.** The builder successfully rewrote engineResult.ts:111-116 to remove identifiers while preserving rationale.
5. "Unused eslint-disable caused by this build" — **Not confirmed.** The warning is pre-existing.

**What I didn't predict:** The scope of test file omissions. This isn't 1-2 stray references — it's 20+ references across 12 test files that weren't touched at all. The builder completed Wave 3 for the 4 files with `any` type changes and the file rename, but appears to have skipped the identifier cleanup pass across the remaining ~30 test files.

**Quality of work done:** The src/ cleanup (Waves 1-2) is excellent. Headers rewritten with preserved rationale (engineResult.ts, ruby.ts, scan-engine.ts), no over-deletion of design context, clean type replacements in Wave 4. The builder correctly applied the decision rule ("remove identifier, keep rationale") throughout src/.

## AC Walkthrough

- AC1: ✅ PASS — scan-engine.ts header (lines 1-11) accurately describes the 6-step pipeline, no analyze() reference
- AC2: ✅ PASS — no analyze() relationship paragraph exists in scan-engine.ts
- AC3: ✅ PASS — engine/index.ts is exactly 4 lines of clean re-exports
- AC4: ⚠️ PARTIAL — CP0-CP3 removed from the file header (lines 12-16 of original), but SS-10 remains at line 100
- AC5: ✅ PASS — zero START_HERE.md or ATLAS3 references in src/
- AC6: ✅ PASS — ruby.ts and php.ts have clean headers explaining parser purpose without sprint refs
- AC7: ✅ PASS — confidence.ts:10 design doc reference removed
- AC8: ❌ FAIL — sprint identifiers remain in tests/ (6 locations across 5 files)
- AC9: ❌ FAIL — STEP_0.1 remains in cross-platform.test.ts:27
- AC10: ❌ FAIL — Item N and D references remain in tests/ (13+ locations across 6 files)
- AC11: ✅ PASS — all 14 `any` types replaced with proper types across 4 test files
- AC12: ✅ PASS — no @example blocks reference analyze()
- AC16: ❌ FAIL — sprint/ticket references remain in test files (same standard as src/ not met)
- AC17: ✅ PASS — s11-detection.test.ts renamed to detection-overrides.test.ts with descriptive header
- AC18: ✅ PASS — 1883 tests pass
- AC19: ✅ PASS — build succeeds, typecheck clean, lint 0 errors

## Blockers

5 contract assertions UNSATISFIED. The test file cleanup (Wave 3 identifier pass) is incomplete:

1. **treeSitter.ts:100** — `SS-10` checkpoint label in ParserManager JSDoc. Should be rewritten to "WASM Migration:" (remove the identifier, keep the content).
2. **12 test files** with remaining sprint refs (S15, S18, S19), ticket refs (SCAN-*, SETUP-*), plan refs (STEP_*), and design doc refs (Item N, D*.N). The builder needs to apply the same decision rule used in src/ to these test descriptions and comments.

## Findings

- **Code — SS-10 checkpoint reference missed:** `packages/cli/src/engine/parsers/treeSitter.ts:100` — "WASM Migration (SS-10):" label retained. The spec explicitly listed SS-10 for removal. Rewrite to "WASM Migration:" — the content below it is accurate and should stay.
- **Code — Wave 3 incomplete across test files:** The builder completed the type replacement (Wave 4) and the file rename, but the identifier cleanup pass from Wave 3 was not applied to ~10 test files. The following files still contain internal identifiers in `it()`/`describe()` strings or comments:
  - `packages/cli/tests/scaffolds/all-scaffolds.test.ts:12` — "S15 consolidated"
  - `packages/cli/tests/commands/check-dashboard.test.ts:339,731` — "S19/SETUP-025", "SETUP-027"
  - `packages/cli/tests/commands/check.test.ts:76,133` — "S15", "D12.3"
  - `packages/cli/tests/commands/init/preflight.test.ts:30` — "S19/NEW-001"
  - `packages/cli/tests/commands/init/anaJsonSchema.test.ts:55` — "S18"
  - `packages/cli/tests/commands/injectors.test.ts:28,205` — "Item 18", "SCAN-050"
  - `packages/cli/tests/commands/skill-seeding.test.ts:99,183` — "Item 12", "D6.13"
  - `packages/cli/tests/engine/scanProject.test.ts:123,222` — "SCAN-042"
  - `packages/cli/tests/engine/types.test.ts:127-191` — "Item 3", "Item 6", "Item 7a", "Item 7b", "Item 7d"
  - `packages/cli/tests/engine/types/engineResult-partial.test.ts:110` — "Item 2.1"
  - `packages/cli/tests/templates/cross-platform.test.ts:27` — "STEP_0.1"
  - `packages/cli/tests/engine/detectors/detection-overrides.test.ts:141` — "S19/SCAN-032"
- **Test — Renamed file still carries ticket ref:** `packages/cli/tests/engine/detectors/detection-overrides.test.ts:141` — the newly renamed file has a clean header but the test description at line 141 still contains "S19/SCAN-032". This is the file the builder explicitly renamed, so the interior should have been cleaned too.
- **Upstream — Lint warning pre-existing:** Line 169 has an unused eslint-disable directive. Not introduced by this build, not a blocker.

## Deployer Handoff

The src/ cleanup is complete and high-quality — all internal identifiers removed, design rationale preserved in plain English. The test file cleanup is incomplete: ~20 references across 12 test files need the same treatment. The fix is mechanical (apply the same decision rule the builder used in src/), not architectural. Expect a quick re-pass focused entirely on test file `it()`/`describe()` strings and comments.

The `SS-10` in treeSitter.ts:100 is a one-line edit — change "WASM Migration (SS-10):" to "WASM Migration:".

## Verdict
**Shippable:** NO

5 of 24 contract assertions fail. The src/ cleanup (Waves 1-2) and the type replacements (Wave 4) are complete and well-done. Wave 3's identifier cleanup across test files was skipped for all files except the 4 that got type changes and the renamed file. The fix is straightforward — apply the same grep/decide/rewrite pass to the remaining test files.
