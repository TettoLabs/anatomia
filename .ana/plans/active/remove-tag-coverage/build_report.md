# Build Report: Remove Pre-Check Tag Coverage

**Created by:** AnaBuild
**Date:** 2026-04-30
**Spec:** .ana/plans/active/remove-tag-coverage/spec.md
**Branch:** feature/remove-tag-coverage

## What Was Built
- `packages/cli/src/commands/verify.ts` (modified): Deleted ~230 lines — `parseDiffAddedCommentLines`, tag search logic, `ContractSchema`/`yaml`/`glob`/`execSync`/`readArtifactBranch` imports. Slimmed `ContractPreCheckResult` to `{seal, sealHash?}`. Simplified `printContractResults` to seal-only output. Updated command description.
- `packages/cli/src/commands/artifact.ts` (modified): Simplified `runPreCheckAndStore` — removed UNCOVERED warning block, slimmed `.saves.json` write to `{seal, seal_hash, run_at}`.
- `packages/cli/src/utils/proofSummary.ts` (modified): Removed `preCheckStatus` from `ProofAssertion` interface. Added `'UNCOVERED'` to `verifyStatus` for backward compat. Removed `covered`/`uncovered` from `ProofSummary.contract`. Deleted pre-check assertion bootstrap path; promoted contract.yaml path to primary.
- `packages/cli/src/commands/work.ts` (modified): Changed assertion status fallback from `a.verifyStatus || a.preCheckStatus` to `a.verifyStatus || 'UNVERIFIED'`.
- `packages/cli/src/commands/pr.ts` (modified): Same status fallback change. Added `❓` icon for UNVERIFIED status.
- `packages/cli/src/types/proof.ts` (modified): Added `'UNVERIFIED'` to `ProofChainEntry.assertions[].status` union type.
- `packages/cli/src/commands/proof.ts` (modified): Added `case 'UNVERIFIED'` to `getStatusIcon` switch, returning `chalk.gray('?')`.
- `packages/cli/tests/commands/verify.test.ts` (modified): Deleted ~845 lines of tag coverage tests. Kept seal tests. Added tests for seal-only result shape, removed imports check, tag coverage deletion check.
- `packages/cli/tests/commands/artifact.test.ts` (modified): Updated pre-check assertions to expect seal-only data. Changed UNCOVERED warning test to expect no warnings.
- `packages/cli/tests/utils/proofSummary.test.ts` (modified): Rewrote assertion bootstrap tests to use contract.yaml as source. Removed `preCheckStatus` assertions. Removed `covered`/`uncovered` from expected contract shape.
- `packages/cli/tests/commands/work.test.ts` (modified): Simplified `.saves.json` fixtures to seal-only pre-check data.
- `packages/cli/tests/commands/pr.test.ts` (modified): Same fixture simplification.
- `packages/cli/templates/.claude/agents/ana-build.md` (modified): Removed pre-check step, reworded tampering reference, renumbered steps.
- `packages/cli/templates/.claude/agents/ana-verify.md` (modified): Step 1 is seal-check only. Step 4 uses contract as checklist. Removed UNCOVERED parroting. Updated PASS/FAIL criteria. Updated Quick Reference.
- `.claude/agents/ana-build.md` (modified): Identical to template.
- `.claude/agents/ana-verify.md` (modified): Identical to template.

## PR Summary

- Remove the tag coverage mechanism from `ana verify pre-check` — pre-check now performs seal verification only (INTACT/TAMPERED/UNVERIFIABLE)
- Delete `parseDiffAddedCommentLines` and all diff-scoped tag search code (~230 lines from verify.ts, ~845 lines of tests)
- Bootstrap proof summary assertions from `contract.yaml` instead of pre-check data; remove `preCheckStatus` field from `ProofAssertion`
- Change unverified assertion status fallback from `preCheckStatus` to `'UNVERIFIED'` in work.ts and pr.ts
- Update agent templates (build + verify) to remove tag coverage references; dogfood copies receive identical changes

## Acceptance Criteria Coverage

- AC1 "pre-check reports seal status only" → verify.test.ts "prints seal-only output via runPreCheck" (2 assertions: no COVERED, no UNCOVERED)
- AC2 "ContractPreCheckResult has only seal and sealHash" → verify.test.ts "returns seal-only result with no assertions or summary" (3 assertions)
- AC3 "parseDiffAddedCommentLines deleted" → verify.test.ts "tag coverage tests are removed" (1 assertion)
- AC4 "tag-coverage imports removed" → verify.test.ts "does not import execSync, glob, readArtifactBranch, yaml, or ContractSchema" (5 assertions)
- AC5 "runPreCheckAndStore stores seal-only" → artifact.test.ts "stores pre-check results in .saves.json" (4 assertions) + "saves verify report with seal-only pre-check data" (3 assertions)
- AC6 "generateProofSummary bootstraps from contract.yaml" → proofSummary.test.ts "handles missing verify report — bootstraps from contract.yaml" (4 assertions)
- AC7 "ProofAssertion has no preCheckStatus" → proofSummary.test.ts "handles missing verify report" checks preCheckStatus undefined
- AC8 "ProofSummary.contract has no covered/uncovered" → proofSummary.test.ts "overlays verify statuses" checks covered/uncovered undefined
- AC9 "work.ts uses UNVERIFIED fallback" → verified by compilation + work.test.ts passing with new fixtures
- AC10 "pr.ts uses UNVERIFIED fallback" → verified by compilation + pr.test.ts passing with new fixtures
- AC11 "ProofChainEntry status union includes UNVERIFIED and UNCOVERED" → verified by TypeScript compilation
- AC12 "getStatusIcon handles UNVERIFIED" → verified by source inspection (added case returns '?')
- AC13 "parseComplianceTable regex still matches UNCOVERED" → proofSummary.test.ts "overlays verify statuses" tests UNCOVERED parsing
- AC14 "Build template removes pre-check step" → manual verification of template content
- AC15 "Verify template updates" → manual verification of template content
- AC16 "Dogfood copies identical" → files copied with `cp` command
- AC17 "verify.test.ts tag coverage tests deleted" → verify.test.ts reduced from ~1160 to ~350 lines
- AC18 "All tests pass, build compiles" → 1702 passed, 2 skipped, build clean

## Implementation Decisions

- Kept `PreCheckData` interface in proofSummary.ts — it reads old `.saves.json` data for backward compat. The interface stays but the code path that used it for assertion bootstrap is deleted.
- `ProofAssertion.verifyStatus` type now includes `'UNCOVERED'` to handle old verify reports that contain UNCOVERED in compliance tables. This is the backward compat path the spec called for.
- Proof chain entry JSON fixtures in work.test.ts still contain `covered`/`uncovered` in their `contract` objects — these are untyped JSON objects passed through `JSON.stringify`, so TypeScript doesn't enforce the shape change. The data is harmless but vestigial.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1725 passed | 2 skipped (1727)
  Duration  20.85s
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1702 passed | 2 skipped (1704)
  Duration  21.32s
```

### Comparison
- Tests added: 4 (new seal-only shape tests, import removal test, tag coverage deletion test)
- Tests removed: 27 (tag coverage test blocks: parseDiffAddedCommentLines, scoped tag search, integration tests)
- Net tests removed: 23
- Regressions: none

### New Tests Written
- `verify.test.ts`: Seal-only result shape test, imports removal test, tag coverage deletion test, seal-only output test

## Verification Commands
```bash
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
df22614 [remove-tag-coverage] Update agent templates to remove tag coverage references
e5e0974 [remove-tag-coverage] Remove tag coverage from pre-check, keep seal verification only
```

## Open Issues

1. **Vestigial `PreCheckData` interface** in proofSummary.ts — the interface that types old `.saves.json` pre-check data still exists. The code path that used it for assertion bootstrap is deleted, but the interface remains because `.saves.json` files in completed plans may still contain the old shape. Not harmful, but could be cleaned up in a future pass.

2. **Proof chain entry JSON fixtures retain `covered`/`uncovered`** — work.test.ts fixtures for `proof_chain.json` entries still include `covered` and `uncovered` in their `contract` objects. These are untyped JSON objects (not constructed through the TypeScript type), so the type change doesn't catch them. They don't cause test failures but represent stale fixture data.

Verified complete by second pass.
