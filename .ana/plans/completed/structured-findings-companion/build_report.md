# Build Report: Structured Findings Companion

**Created by:** AnaBuild
**Date:** 2026-04-28
**Spec:** .ana/plans/active/structured-findings-companion/spec.md
**Branch:** feature/structured-findings-companion

## What Was Built

- `packages/cli/src/types/proof.ts` (modified): Added `line`, `severity`, `related_assertions` optional fields to `ProofChainEntry.findings` type. Deleted `seal_commit` field from `ProofChainEntry`.
- `packages/cli/src/utils/proofSummary.ts` (modified): Added new fields to `ProofSummary`, `ProofContextResult`, and `ProofChainEntryForContext` types. Deleted `seal_commit` from `ProofSummary`. Added YAML-first reader in `generateProofSummary` for both verify and build companions. Updated `getProofContext` explicit field mapping. Updated `parseFindings` regex for `## Findings` backward compat.
- `packages/cli/src/commands/artifact.ts` (modified): Added `validateVerifyDataFormat` and `validateBuildDataFormat`. Added `deriveCompanionFileName` and `deriveCompanionKey` helpers. Integrated companion discovery, validation, staging, and hashing into both `saveArtifact` and `saveAllArtifacts`.
- `packages/cli/src/commands/work.ts` (modified): Added type assertion on `writeProofChain` findings spread. Removed `seal_commit` from entry construction. Added `seal_commit` deletion in backfill loop.
- `packages/cli/templates/.claude/agents/ana-verify.md` (modified): Renamed `## Callouts` to `## Findings`, updated all prose references. Added YAML-first workflow step (section 6b) with schema documentation. Added relationship statement.
- `packages/cli/templates/.claude/agents/ana-build.md` (modified): Added `build_data.yaml` creation instruction near `## Open Issues`.
- `.claude/agents/ana-verify.md` (modified): Dogfood sync — byte-identical to package template.
- `.claude/agents/ana-build.md` (modified): Dogfood sync — byte-identical to package template.
- `packages/cli/tests/commands/artifact.test.ts` (modified): Added 25 new tests for companion validation and save behavior. Updated existing test helpers to auto-create companion YAMLs.
- `packages/cli/tests/utils/proofSummary.test.ts` (modified): Added 9 new tests for YAML reader, parseFindings backward compat, and getProofContext field propagation. Updated 3 seal_commit tests to assert undefined.

## PR Summary

- Add structured YAML companion files (`verify_data.yaml`, `build_data.yaml`) alongside narrative markdown reports, with save-time validation that blocks on missing or invalid companions
- Expand finding types across 4 interfaces with `line`, `severity`, and `related_assertions` fields; remove dead `seal_commit` field from proof chain
- Add YAML-first reader in proof summary generation that reads structured findings from companion YAML when present, falling back to regex parsing for old reports
- Update verify template: rename Callouts→Findings, add YAML-first workflow step with schema docs and machine/human relationship statement
- 34 new tests covering validation, save behavior, YAML reader, backward compat, and field propagation

## Acceptance Criteria Coverage

- AC1 "verify_data.yaml validated" → artifact.test.ts validateVerifyDataFormat suite (12 assertions across 11 tests)
- AC2 "save blocks when companion missing" → artifact.test.ts "blocks save when verify_data.yaml is missing" (1 assertion)
- AC3 "save succeeds with valid companion" → artifact.test.ts "saves verify-report with valid verify_data.yaml" (3 assertions)
- AC4 "companion gets SHA-256 hash" → artifact.test.ts "saves verify-report with valid verify_data.yaml" (hash assertion)
- AC5 "saveAllArtifacts discovers companion" → artifact.test.ts "saveAllArtifacts discovers verify_data.yaml" + numbered variant (2 tests)
- AC6 "build_data.yaml validated" → artifact.test.ts validateBuildDataFormat suite (4 tests)
- AC7 "build-report blocks when companion missing" → artifact.test.ts "blocks save when build_data.yaml is missing"
- AC8 "build companion hash" → artifact.test.ts "saves build-report with valid build_data.yaml and hashes companion"
- AC9 "saveAllArtifacts discovers build companion" → covered by same companion discovery logic; verify variant tested
- AC10 "generateProofSummary reads from YAML" → proofSummary.test.ts "reads findings from verify_data.yaml with new fields"
- AC11 "falls back to parseFindings" → proofSummary.test.ts "falls back to parseFindings when verify_data.yaml absent"
- AC12 "reads build concerns from YAML" → proofSummary.test.ts "reads concerns from build_data.yaml"
- AC13 "getProofContext returns new fields" → proofSummary.test.ts "getProofContext returns line, severity, related_assertions"
- AC14 "ProofChainEntry has new fields" → TypeScript compilation proves (fields added to proof.ts)
- AC15 "ProofSummary has new fields" → TypeScript compilation proves (fields added to proofSummary.ts)
- AC16 "ProofChainEntryForContext and ProofContextResult have new fields" → TypeScript compilation proves
- AC17 "writeProofChain preserves new fields via spread" → Type assertion added; spread with `as ProofChainEntry['findings'][0]`
- AC18 "seal_commit removed" → proofSummary.test.ts "seal_commit is removed from ProofSummary" + work.ts backfill deletion
- AC19 "parseFindings matches both headings" → proofSummary.test.ts parseFindings backward compat (2 tests)
- AC20 "file warning non-blocking" → artifact.test.ts "warns when finding references non-existent file"
- AC21 "no-file warning non-blocking" → artifact.test.ts "warns when non-upstream finding has no file"
- AC22 "verify template heading renamed" → verified via `diff` and grep (no "Callout" remaining)
- AC23 "YAML-first workflow step" → verified via template content (section 6b added)
- AC24 "relationship statement" → verified via template content ("authoritative for machines")
- AC25 "build template instruction" → verified via template content (build_data.yaml section added)
- AC26 "dogfood sync" → verified via `diff` — both produce empty output
- AC27 "tests pass" → 1573 passed, 2 skipped (see below)
- AC28 "lint passes" → 0 errors, 14 pre-existing warnings (see below)

## Implementation Decisions

1. **`exactOptionalPropertyTypes` handling:** The project enables `exactOptionalPropertyTypes` in tsconfig, which means optional fields can't receive `undefined` explicitly. In `getProofContext`, I conditionally assign new fields only when defined, rather than always spreading them. This is cleaner than type widening.

2. **Bracket notation for index signatures:** The project enables `noPropertyAccessFromIndexSignature`, requiring `finding['category']` instead of `finding.category` for `Record<string, unknown>` typed objects. Extracted field values to local variables for readability in the validation functions.

3. **Companion auto-create in test helpers:** Rather than modifying 19 individual tests that save reports, I updated the `createArtifact` test helpers to auto-create companion YAMLs when a report file is being created. This keeps existing tests working without noise while the new companion-specific tests verify the blocking behavior directly.

4. **seal_commit test updates:** Three existing tests asserted `summary.seal_commit` is null. Since the field was deleted from the type, updated to assert `(summary as unknown as Record<string, unknown>)['seal_commit']` is undefined. This proves the field is absent, not just null.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  97 passed (97)
     Tests  1539 passed | 2 skipped (1541)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)

 ✓ tests/commands/artifact.test.ts (109 tests) 7766ms
 ✓ tests/utils/proofSummary.test.ts (125 tests) 178ms
 ...
 Test Files  97 passed (97)
      Tests  1573 passed | 2 skipped (1575)
   Duration  16.79s
```

### Comparison
- Tests added: 34
- Tests removed: 0
- Tests modified: 3 (seal_commit assertion updates — asserting undefined instead of null)
- Regressions: none

### New Tests Written
- `packages/cli/tests/commands/artifact.test.ts`: 25 new tests — validateVerifyDataFormat (12 tests), validateBuildDataFormat (4 tests), companion save behavior (9 tests covering missing companion blocking, valid save with hashing, saveAllArtifacts discovery, numbered variants, warning passthrough)
- `packages/cli/tests/utils/proofSummary.test.ts`: 9 new tests — YAML reader (5 tests for verify/build YAML reading, fallback, numbered discovery), parseFindings backward compat (2 tests for both headings), getProofContext new fields (2 tests for presence/absence)

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm lint
diff packages/cli/templates/.claude/agents/ana-verify.md .claude/agents/ana-verify.md
diff packages/cli/templates/.claude/agents/ana-build.md .claude/agents/ana-build.md
```

## Git History
```
9a54657 [structured-findings-companion] Tests for companion validation and YAML reader
f0cf305 [structured-findings-companion] Template updates + dogfood sync
8d7703a [structured-findings-companion] Proof summary YAML reader
69a9d11 [structured-findings-companion] Save pipeline companion integration
28de39b [structured-findings-companion] Companion validation functions
4d62fc9 [structured-findings-companion] Type expansion + seal_commit removal
```

## Open Issues

1. **9 contract assertions UNCOVERED by @ana tags:** A029-A035 verify template content (heading renamed, YAML step present, relationship statement, build template, dogfood sync). A036-A037 verify full test/lint pass. These are verified by running commands (`diff`, `grep`, `pnpm vitest run`, `pnpm lint`) rather than by unit tests with `@ana` tags. The pre-check reports them as UNCOVERED because it scans for `@ana A029` etc. in test files. This is correct behavior — these assertions are about build output, not code behavior.

2. **`saveAllArtifacts` companion discovery for build reports (AC9):** The save-all test only directly tests the verify companion path (A013, A014). The build companion uses identical logic (same `deriveCompanionFileName` + `deriveCompanionKey` + same loop), so it's covered by code path but not by a dedicated test. Adding a separate build-report save-all test would be mechanical duplication.

Verified complete by second pass.
