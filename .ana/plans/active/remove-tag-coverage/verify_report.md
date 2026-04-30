# Verify Report: Remove Pre-Check Tag Coverage

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-30
**Spec:** .ana/plans/active/remove-tag-coverage/spec.md
**Branch:** feature/remove-tag-coverage

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/remove-tag-coverage/contract.yaml
  Seal: INTACT (hash sha256:11c02b5dfd505f394dbb67206f9f6e33f770503a058dca37b96e60fea8f96077)
```

Seal: **INTACT**. Contract unchanged since planner sealed it.

Tests: 1702 passed, 0 failed, 2 skipped. Build: success (typecheck + tsup clean). Lint: 0 errors, 14 warnings (all pre-existing `@typescript-eslint/no-explicit-any` in unrelated test files).

## Contract Compliance
| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Pre-check reports seal status only, with no per-assertion output | ✅ SATISFIED | verify.test.ts:164, asserts `result.seal` is 'INTACT'; line 301 asserts output not.toContain('COVERED') |
| A002 | Pre-check with intact contract returns INTACT seal | ✅ SATISFIED | verify.test.ts:181, `expect(result.seal).toBe('INTACT')` |
| A003 | Pre-check with modified contract returns TAMPERED seal | ✅ SATISFIED | verify.test.ts:210, `expect(result.seal).toBe('TAMPERED')` |
| A004 | Pre-check result has no assertions array | ✅ SATISFIED | verify.test.ts:236, casts to Record and asserts `['assertions']` is undefined |
| A005 | Pre-check result has no summary object | ✅ SATISFIED | verify.test.ts:237, casts to Record and asserts `['summary']` is undefined |
| A006 | The diff comment parser is no longer exported from verify | ✅ SATISFIED | Source inspection: verify.ts contains no reference to `parseDiffAddedCommentLines`. Also verified by A020 test at verify.test.ts:338 which asserts `verifySource.not.toContain('parseDiffAddedCommentLines')`. Note: @ana A006 tag is on wrong test (UNVERIFIABLE test at line 241, not the removal test). |
| A007 | Tag coverage imports are removed from verify module | ✅ SATISFIED | verify.test.ts:273-277, source read asserts no `execSync`, `glob`, `readArtifactBranch`, `yaml`, `ContractSchema` imports |
| A008 | Saving a verify report stores only seal data in saves file | ✅ SATISFIED | artifact.test.ts:1226, `expect(saves['pre-check'].seal).toBe('INTACT')` |
| A009 | Saved pre-check data has no assertions array | ✅ SATISFIED | artifact.test.ts:1230-1232, asserts `assertions`, `covered`, `uncovered` are all undefined |
| A010 | Proof summary builds its assertion list from the contract file | ✅ SATISFIED | proofSummary.test.ts:159, `expect(summary.assertions).toHaveLength(1)` — assertion bootstrapped from contract.yaml with no .saves.json pre-check data |
| A011 | Bootstrapped assertions have no pre-check status field | ✅ SATISFIED | proofSummary.test.ts:162, `expect((summary.assertions[0])['preCheckStatus']).toBeUndefined()` |
| A012 | Verify status type accepts UNCOVERED for backward compatibility | ✅ SATISFIED | proofSummary.test.ts:269, old verify report with UNCOVERED parses and `a002?.verifyStatus` equals `'UNCOVERED'` |
| A013 | Proof summary contract section has no covered count | ✅ SATISFIED | proofSummary.test.ts:272-273, `expect(summary.contract['covered']).toBeUndefined()` and `['uncovered']` undefined |
| A014 | Proof chain entry uses UNVERIFIED when verify hasn't assessed an assertion | ✅ SATISFIED | Source inspection: work.ts:793 — `status: (a.verifyStatus \|\| 'UNVERIFIED')`. No tagged test exists. |
| A015 | PR body uses UNVERIFIED when verify hasn't assessed an assertion | ✅ SATISFIED | Source inspection: pr.ts:119 — `const status = a.verifyStatus \|\| 'UNVERIFIED'`. Line 123 renders UNVERIFIED with ❓ icon. No tagged test exists. |
| A016 | Proof chain status type accepts both UNVERIFIED and UNCOVERED | ✅ SATISFIED | Source inspection: types/proof.ts:56 — union type `'SATISFIED' \| 'UNSATISFIED' \| 'DEVIATED' \| 'UNCOVERED' \| 'UNVERIFIED'` |
| A017 | UNVERIFIED assertions display with question mark icon | ✅ SATISFIED | Source inspection: proof.ts:65-66 — `case 'UNVERIFIED': return chalk.gray('?')` |
| A018 | UNCOVERED assertions still display with question mark icon | ✅ SATISFIED | Source inspection: proof.ts:67-68 — `case 'UNCOVERED': return chalk.gray('?')` |
| A019 | Old verify reports with UNCOVERED status parse correctly | ✅ SATISFIED | proofSummary.test.ts:246-269, verify report fixture contains `❌ UNCOVERED` row, parseComplianceTable extracts status as 'UNCOVERED', overlay sets `a002.verifyStatus` to 'UNCOVERED' |
| A020 | Tag coverage tests are removed from the verify test file | ✅ SATISFIED | verify.test.ts:338, `expect(verifySource).not.toContain('parseDiffAddedCommentLines')`. File is 342 lines (down from ~1187). |
| A021 | All remaining tests pass after the removal | ✅ SATISFIED | Test run: 1702 passed, 0 failed, 2 skipped across 93 test files |

## Independent Findings

**Prediction resolution:**

1. "Stale preCheckStatus reference in proofSummary.ts" — **Not found.** Grep for `preCheckStatus` in `packages/cli/src/` returns zero matches. Clean removal.
2. "covered/uncovered fields still referenced" — **Not found.** Grep for `\.covered|\.uncovered` in `packages/cli/src/` returns zero matches. All consumers updated.
3. "Template/dogfood drift" — **Not found.** `diff` of both template/dogfood pairs returned empty. Identical.
4. "parseDiffAddedCommentLines import still in verify.test.ts" — **Not found.** Import line removed; verify.test.ts line 7 imports only `runPreCheck, runContractPreCheck`.
5. "Weak assertion on bootstrap test" — **Not found.** proofSummary.test.ts:160 uses `toHaveLength(1)` (specific) and line 162 checks `preCheckStatus` undefined (correct).

**Surprised finding:** A014-A018 (UNVERIFIED fallback in work.ts, pr.ts, proof.ts) have zero test coverage. The code is correct by source inspection but these are runtime behavior paths with no automated verification. This is the most significant gap in the build.

**Production risk check:** "What would break in production that this spec didn't address?"
- Old `.saves.json` files with pre-check assertion data: Safe. `generateProofSummary` ignores the vestigial pre-check data (line 1415 comment confirms). No parse failures.
- UNVERIFIED display in all consumers: Confirmed correct by source inspection of work.ts, pr.ts, and proof.ts.

**Over-building check:** No new functions, exports, or abstractions introduced. This is purely a removal — no scope creep detected. All modifications are deletions or simplifications of existing code.

## AC Walkthrough

- **AC1:** `ana verify pre-check {slug}` reports seal status only. ✅ PASS — Live invocation output shows seal status only, no per-assertion COVERED/UNCOVERED. Verified by running the command in this session.
- **AC2:** `ContractPreCheckResult` has only `seal` and `sealHash` fields. ✅ PASS — verify.ts:24-27 defines `{ seal: 'INTACT' | 'TAMPERED' | 'UNVERIFIABLE'; sealHash?: string | undefined }`. No assertions, summary, or outOfScope.
- **AC3:** `parseDiffAddedCommentLines` is deleted. ✅ PASS — verify.ts does not contain the string `parseDiffAddedCommentLines`. Full file read confirms (146 lines, no function by that name).
- **AC4:** Tag-coverage-only imports removed from verify.ts. ✅ PASS — verify.ts:14-19 imports only Commander, chalk, fs, path, crypto, and findProjectRoot. No execSync, glob, readArtifactBranch, yaml, or ContractSchema.
- **AC5:** `runPreCheckAndStore` stores seal-only data. ✅ PASS — artifact.ts:119-123 writes `{ seal, seal_hash, run_at }` to `saves['pre-check']`. No assertions, covered, or uncovered.
- **AC6:** `generateProofSummary` bootstraps from contract.yaml. ✅ PASS — proofSummary.ts:1431-1437 bootstraps assertions from `contract.assertions.map(a => ({ id: a.id, says: a.says, verifyStatus: null }))`. No pre-check path.
- **AC7:** `ProofAssertion` has no `preCheckStatus`. `verifyStatus` includes UNCOVERED. ✅ PASS — proofSummary.ts:19 shows `verifyStatus: 'SATISFIED' | 'UNSATISFIED' | 'DEVIATED' | 'UNCOVERED' | null`. No preCheckStatus field on the interface (lines 16-21).
- **AC8:** `ProofSummary['contract']` has no `covered` or `uncovered`. ✅ PASS — proofSummary.ts:46-50 shows contract has `total`, `satisfied`, `unsatisfied`, `deviated` only.
- **AC9:** Proof chain entry assertion status is `a.verifyStatus || 'UNVERIFIED'`. ✅ PASS — work.ts:793, confirmed by reading the file.
- **AC10:** PR body uses same pattern. ✅ PASS — pr.ts:119, `const status = a.verifyStatus || 'UNVERIFIED'`.
- **AC11:** `ProofChainEntry` status union includes UNVERIFIED and UNCOVERED. ✅ PASS — types/proof.ts:56.
- **AC12:** `getStatusIcon` handles both statuses. ✅ PASS — proof.ts:65-68, both UNVERIFIED and UNCOVERED return `chalk.gray('?')`.
- **AC13:** `parseComplianceTable` regex still matches UNCOVERED. ✅ PASS — proofSummary.ts:171, regex includes `UNCOVERED` in the alternation.
- **AC14:** Build template removes pre-check step and tag coverage references. ✅ PASS — Grep for `pre-check`, `tag coverage`, `UNCOVERED` in ana-build.md template returns zero relevant matches. Only benign "not covered by" phrase.
- **AC15:** Verify template Step 1 is seal-check only, Step 4 uses contract as checklist, no UNCOVERED parroting, PASS/FAIL criteria no longer reference UNCOVERED. ✅ PASS — Confirmed by reading template lines 152-166 (Step 1 seal-only), 200-204 (Step 4 contract-based), 405 (PASS/FAIL no UNCOVERED), 537 (reference section no UNCOVERED keyword).
- **AC16:** Dogfood copies receive identical changes. ✅ PASS — `diff` of template vs dogfood for both ana-build.md and ana-verify.md returns empty.
- **AC17:** Tag coverage tests deleted from verify.test.ts. ✅ PASS — verify.test.ts is 342 lines. No parseDiffAddedCommentLines references. No scoped tag search tests. Seal tests retained.
- **AC18:** All remaining tests pass, build compiles. ✅ PASS — 1702 tests passed, 0 failed, 2 skipped. `pnpm run build` succeeded (typecheck clean, tsup clean).

## Blockers

No blockers. All 21 contract assertions SATISFIED. All 18 acceptance criteria pass. No regressions — test count decreased from 1725 to 1702 (23 tag coverage tests removed), test files remain at 93. Build and typecheck clean. Lint has only pre-existing warnings in unrelated files.

Checked for: unused exports in modified files (none — all exports existed before and are still consumed), unused parameters in modified functions (none), error paths that swallow silently (artifact.ts:116 catch for .saves.json parse is intentional and pre-existing), external assumptions about file state (runContractPreCheck handles missing contract and missing .saves.json gracefully).

## Findings

- **Test — @ana A006 tag on wrong test:** `packages/cli/tests/commands/verify.test.ts:241` — A006 is tagged on the UNVERIFIABLE test (`expect(result.seal).toBe('UNVERIFIABLE')`), but contract A006 says "diff comment parser is no longer exported." The actual coverage comes from A020's test at line 332. The tag doesn't match the assertion it claims to cover. Harmless now but degrades tag reliability for future verify runs.

- **Test — No tests for UNVERIFIED fallback (A014-A018):** `packages/cli/src/commands/work.ts:793`, `packages/cli/src/commands/pr.ts:119`, `packages/cli/src/commands/proof.ts:65` — Five contract assertions verified by source inspection only. The UNVERIFIED status fallback in work.ts, pr.ts, and proof.ts has zero automated test coverage. The code is correct — `a.verifyStatus || 'UNVERIFIED'` is a one-line change — but a regression here would silently corrupt proof chain entries and PR bodies. This is the most significant gap in the build.

- **Code — PreCheckData interface vestigial:** `packages/cli/src/utils/proofSummary.ts:99` — The interface retains `assertions?: PreCheckAssertion[]`, `covered?: number`, `uncovered?: number` fields for reading old `.saves.json` data. The code path that used these for assertion bootstrap is deleted. The interface itself is harmless (it's a read-time type for backward-compat parsing) but its fields describe a mechanism that no longer exists. Known build concern from prior cycle — still present, intentionally retained.

- **Code — parseComplianceTable regex omits UNVERIFIED:** `packages/cli/src/utils/proofSummary.ts:171` — The regex `/(SATISFIED|UNSATISFIED|DEVIATED|UNCOVERED)/i` doesn't include UNVERIFIED. Correct behavior: verify reports never contain UNVERIFIED rows (it's a fallback for unassessed assertions, not a verify report status). But the asymmetry with the type union (which includes UNVERIFIED) could confuse future maintainers. An inline comment explaining why UNVERIFIED is excluded would clarify.

## Deployer Handoff

Clean removal — no migration steps needed. Old `.saves.json` files with pre-check assertion data are safely ignored by the new code (vestigial fields read but unused). Old proof chain entries with UNCOVERED status continue to display correctly (getStatusIcon handles both UNCOVERED and UNVERIFIED with the same `?` icon).

The 23-test decrease (1725 → 1702) is expected — all deleted tests tested the removed tag coverage mechanism. No test files were deleted; only verify.test.ts was trimmed.

Template and dogfood copies are identical. No manual sync needed.

After merge, run `ana work complete remove-tag-coverage` to archive the plan and write the proof chain entry.

## Verdict
**Shippable:** YES

All 21 contract assertions satisfied. All 18 acceptance criteria pass. Tests green, build clean, lint clean. The removal is surgical — no new code, no new abstractions, no scope creep. The tag coverage mechanism is fully excised from pre-check, artifact storage, proof summary, work, PR, and templates.

The UNVERIFIED fallback paths lack test coverage (findings section), but the changes are one-line substitutions that are trivially correct by inspection. The tag mismatch on A006 and the vestigial PreCheckData interface are debt, not blockers.

Would I stake my name on this shipping? Yes. This is a clean deletion that removes a known disease from the pipeline. The code does less, which is the point.
