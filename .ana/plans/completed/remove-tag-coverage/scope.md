# Scope: Remove Pre-Check Tag Coverage

**Created by:** Ana
**Date:** 2026-04-30

## Intent
Pre-check's tag coverage check is a broken trust layer that corrupts the proof chain. It greps test files for `@ana` tags to report COVERED/UNCOVERED per assertion — but after 33 builds, tag collision makes the signal unreliable (42% of entries have collision findings), and its COVERED/UNCOVERED output infiltrates the permanent record where Verify's independent judgment should be the authority. Two diseases, one root cause. The fix: remove the mechanism entirely, make Verify the sole source of assertion status, and let pre-check do the one job it does well — seal verification.

## Complexity Assessment
- **Size:** medium
- **Files affected:**
  - `packages/cli/src/commands/verify.ts` — delete tag search mechanism (~230 lines), keep seal check (~80 lines)
  - `packages/cli/src/commands/artifact.ts` — simplify `runPreCheckAndStore` (~15 lines changed)
  - `packages/cli/src/utils/proofSummary.ts` — change assertion source from pre-check to contract.yaml, remove covered/uncovered fields (~40 lines changed)
  - `packages/cli/src/commands/work.ts` — status source: `verifyStatus || 'UNVERIFIED'` (~1 line)
  - `packages/cli/src/commands/pr.ts` — same pattern (~1 line)
  - `packages/cli/src/types/proof.ts` — add UNVERIFIED to status union (~1 line)
  - `packages/cli/src/commands/proof.ts` — display: UNCOVERED + UNVERIFIED both show `?` (~2 lines)
  - `packages/cli/tests/commands/verify.test.ts` — delete ~845 lines of tag coverage tests
  - `packages/cli/tests/commands/artifact.test.ts` — simplify pre-check fixtures (~30 lines)
  - `packages/cli/tests/utils/proofSummary.test.ts` — rewrite assertion bootstrap tests (~60 lines)
  - `packages/cli/tests/commands/work.test.ts` — simplify fixtures (~15 lines)
  - `packages/cli/tests/commands/pr.test.ts` — simplify fixtures (~10 lines)
  - `packages/cli/templates/.claude/agents/ana-build.md` — remove pre-check step (~6 lines deleted, 1 reworded)
  - `packages/cli/templates/.claude/agents/ana-verify.md` — rewrite Step 1 + Step 4 + report template (~25 rewritten, ~15 removed)
  - `.claude/agents/ana-build.md` — dogfood copy, identical changes
  - `.claude/agents/ana-verify.md` — dogfood copy, identical changes
- **Blast radius:** Contained to the tag coverage data path. No new features. No new abstractions. The seal check, contract validation, proof chain writing, and all display commands continue to work. Old proof chain entries with UNCOVERED status display correctly (backward compat preserved in types and display code). Old verify reports with UNCOVERED in compliance tables parse correctly (`parseComplianceTable` keeps UNCOVERED in its regex).
- **Estimated effort:** ~45 minutes pipeline time
- **Multi-phase:** no

## Approach
Remove the tag coverage mechanism from pre-check. Pre-check becomes seal verification only — one job, done well. Verify's template is rewritten to use the contract as its assertion checklist instead of consuming pre-check's COVERED/UNCOVERED output. The proof chain records Verify's judgment (`verifyStatus`) as the sole authority for assertion status, with UNVERIFIED as the fallback when Verify's compliance table has no row for an assertion. Tags remain in test files as optional navigation aids for Verify — Build still writes them, Verify still searches for them, but nothing machine-reads them for coverage determination.

The diff-scoped tag search system (entry #27, `diff-scoped-tag-search`) is deleted in its entirety — it was a mitigation for collision in a mechanism that no longer exists.

## Acceptance Criteria
- AC1: `ana verify pre-check {slug}` reports seal status only (INTACT/TAMPERED/UNVERIFIABLE). No per-assertion COVERED/UNCOVERED output.
- AC2: `ContractPreCheckResult` has only `seal` and `sealHash` fields. No `assertions`, `summary`, or `outOfScope`.
- AC3: `parseDiffAddedCommentLines` is deleted and no longer exported from verify.ts.
- AC4: The five tag-coverage-only imports are removed from verify.ts: `execSync`, `glob`, `readArtifactBranch`, `yaml`, `ContractSchema`.
- AC5: `runPreCheckAndStore` in artifact.ts stores only `seal`, `seal_hash`, `run_at` in `.saves.json`. No `assertions`, `covered`, `uncovered`.
- AC6: `generateProofSummary` bootstraps assertions from `contract.yaml`, not from pre-check data in `.saves.json`.
- AC7: `ProofAssertion` has no `preCheckStatus` field. `verifyStatus` includes UNCOVERED for backward compatibility with old verify reports.
- AC8: `ProofSummary['contract']` has no `covered` or `uncovered` fields.
- AC9: Proof chain entry assertion status is `a.verifyStatus || 'UNVERIFIED'` (work.ts line 793).
- AC10: PR body assertion status uses the same pattern (pr.ts line 119).
- AC11: `ProofChainEntry` status union includes both UNVERIFIED (new) and UNCOVERED (backward compat).
- AC12: `getStatusIcon` in proof.ts handles both UNCOVERED and UNVERIFIED with the same display.
- AC13: `parseComplianceTable` regex still matches UNCOVERED for old verify reports.
- AC14: Build template removes the pre-check step (lines 511-515, 525) and rewords the tampering reference (line 153).
- AC15: Verify template Step 1 is seal-check only. Step 4 uses the contract as the assertion checklist. Line 230 (UNCOVERED parroting instruction) is deleted. PASS/FAIL criteria no longer reference UNCOVERED.
- AC16: Dogfood agent copies (`.claude/agents/ana-build.md`, `.claude/agents/ana-verify.md`) receive identical changes.
- AC17: verify.test.ts tag coverage tests are deleted (~845 lines). Seal tests remain.
- AC18: All remaining tests pass. Build compiles without errors.

## Edge Cases & Risks
- **Old verify reports in completed plans:** `generateProofSummary` runs on completed plans during `work complete` (lines 1031, 1225). Old verify reports contain UNCOVERED in compliance tables. `parseComplianceTable` must keep UNCOVERED in its regex. `verifyStatus` type must include UNCOVERED. Both confirmed and specified in AC7, AC13.
- **Multi-phase builds:** Each phase's verify report overlays its portion of assertions on the contract-bootstrapped list. No change to the overlay mechanism — works identically.
- **Verify template fallback:** Current line 175 says "if pre-check fails, grep for tags manually." New fallback: "if pre-check fails, read contract.yaml as your checklist." Simpler.
- **UNVERIFIED vs UNCOVERED in display:** Both show `?`. Old entries keep UNCOVERED; new entries get UNVERIFIED when Verify's table has no row. No migration needed.
- **`registerVerifyCommand` description:** Currently says "seal integrity, tag coverage." Must update to seal-only.
- **Module doc comment:** Lines 1-12 of verify.ts reference tag coverage. Must update.

## Rejected Approaches
- **Namespaced assertion IDs (CLI-generated prefix at seal time):** Evaluated extensively. Solves tag collision but the collision is cosmetic after removal — nothing machine-reads tags. Every prefix mechanism (counter, hash, initials, full slug) carries tradeoffs: shared state contention, collision at scale, verbosity, or blast radius. Deferred as a traceability enhancement to evaluate after 5-10 builds without it. See `anatomia_reference/PROOF_SYSTEM/ASSERTION_NAMESPACING_REQUIREMENTS.md`.
- **Tag manifest (Build writes structured coverage file):** Adds a new artifact type, new schema, new validation, and ~10-15 lines of Build template instructions. More moving parts than the problem warrants.
- **File-changes alignment in pre-check:** Compares `modules_touched` (already in `.saves.json`) against `contract.file_changes`. ~25 lines, reads existing data, no new imports. 28% of builds have mismatches. Valuable but ships separately — the removal scope is "delete what's broken," not "delete and add." Documented as follow-up in the requirements doc.
- **Fix tag collision instead of removing tag coverage:** Namespacing makes a broken mechanism work. Removing the mechanism makes it not exist. The design principle says "the elegant solution is the one that removes."

## Open Questions
None. Every code path traced, every import verified, every backward compat scenario checked. Full investigation in `anatomia_reference/PROOF_SYSTEM/TAG_COVERAGE_REMOVAL_REQUIREMENTS.md`.

## Exploration Findings

### Patterns Discovered
- `verify.ts`: Seal check (lines 109-150) is cleanly separable from tag search (lines 152-293). The tag search depends on 5 imports the seal check doesn't need.
- `proofSummary.ts`: Assertions are bootstrapped from pre-check data first (lines 1420-1436), contract.yaml as fallback (lines 1452-1462). Promoting the fallback to primary path is the structural change.
- `work.ts:793`: The single line `(a.verifyStatus || a.preCheckStatus)` is the root cause of Disease 2.
- `artifact.ts`: `runPreCheckAndStore` (lines 92-139) is the bridge between pre-check and `.saves.json`. Simplifying it removes the tag data pipeline.

### Constraints Discovered
- [TYPE-VERIFIED] `parseComplianceTable` regex (proofSummary.ts:174) — must keep UNCOVERED for old verify reports. 10+ completed verify reports contain UNCOVERED rows.
- [TYPE-VERIFIED] `ProofAssertion.verifyStatus` — must include UNCOVERED. Old verify reports set `verifyStatus: 'UNCOVERED'` via `parseComplianceTable` overlay.
- [TYPE-VERIFIED] Dogfood copies (.claude/agents/) are identical to templates — confirmed via diff. Both sets must be updated.
- [OBSERVED] `modules_touched` already exists in `.saves.json` at verify-report save time — enables future file-changes alignment without new git commands in pre-check.

### Test Infrastructure
- `verify.test.ts` (1160 lines): ~845 lines are tag coverage tests across 4 describe blocks. ~300 lines remain (seal tests, command structure tests, UNVERIFIABLE tests).
- `proofSummary.test.ts`: Tests construct `.saves.json` with pre-check data — fixtures must be simplified to remove `assertions`/`covered`/`uncovered`.
- `work.test.ts`, `pr.test.ts`: Pre-check fixtures in `.saves.json` need slimming. Status assertions need UNVERIFIED where appropriate.

## For AnaPlan

### Structural Analog
`packages/cli/src/commands/verify.ts` — the file being gutted. The seal check portion (lines 109-150) is the pattern for the post-removal structure: read `.saves.json` for hash, compare to current file hash, return result.

### Relevant Code Paths
- `verify.ts:109-293` — `runContractPreCheck`: seal check stays (109-150), tag search deleted (152-293)
- `verify.ts:302-335` — `printContractResults`: shrinks to seal display only
- `verify.ts:342-391` — `runPreCheck` + `registerVerifyCommand`: stay, inherit slimmed return type
- `artifact.ts:92-139` — `runPreCheckAndStore`: UNCOVERED warning deleted, saves block simplified
- `artifact.ts:878,1301` — call sites for `runPreCheckAndStore`: unchanged (same function, slimmer behavior)
- `proofSummary.ts:1420-1462` — assertion bootstrap: pre-check path deleted, contract path promoted
- `proofSummary.ts:146-183` — `parseComplianceTable`: regex unchanged (backward compat)
- `work.ts:789-799` — proof chain entry assertion mapping: status source changed
- `pr.ts:118-124` — PR body assertion display: status source changed

### Patterns to Follow
- `writeSaveMetadata` in artifact.ts for the `.saves.json` write pattern
- `computeChainHealth` in proofSummary.ts for backward-compat handling of old proof chain entries (handles undefined fields gracefully)
- The existing `getStatusIcon` switch statement in proof.ts for the display pattern

### Known Gotchas
- The `yaml` import in verify.ts (line 20) looks like it's used for the `contract.yaml` path strings throughout the file — but `yaml.parse()` is only called at line 155. The path strings are just `'contract.yaml'` string literals, not the `yaml` package. Safe to remove the import.
- `proofSummary.ts:1457` defaults `preCheckStatus: 'UNCOVERED'` for the contract fallback path. When promoting this to the primary path, `preCheckStatus` is removed entirely — don't accidentally leave a default.
- verify.test.ts line 7 imports `parseDiffAddedCommentLines` — this import must be removed when the function is deleted.

### Things to Investigate
- Whether `yaml.parseDocument()` is needed for any remaining verify.ts code (it's not — seal check hashes raw content, doesn't parse YAML). Confirm before finalizing imports.
