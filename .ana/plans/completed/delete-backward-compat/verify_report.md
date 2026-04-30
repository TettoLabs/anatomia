# Verify Report: Delete backward-compatibility code

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-30
**Spec:** .ana/plans/active/delete-backward-compat/spec.md
**Branch:** feature/delete-backward-compat

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/delete-backward-compat/contract.yaml
  Seal: INTACT (hash sha256:1dd1645bddd906fa6446689437c1f829e5d977e219eb363df9d2a71cf858d6f6)

  A001  ✗ UNCOVERED  "Work complete no longer renames callouts to findings on existing entries"
  A002  ✗ UNCOVERED  "Work complete no longer backfills missing status on existing findings"
  A003  ✗ UNCOVERED  "Work complete no longer migrates severity values on existing findings"
  A004  ✗ UNCOVERED  "Work complete no longer backfills scope summary on existing entries"
  A005  ✗ UNCOVERED  "Work complete no longer removes seal_commit from existing entries"
  A006  ✓ COVERED  "The reopen loop that reversed mechanical closures is deleted"
  A007  ✓ COVERED  "No code checks closed_by to reopen findings"
  A008  ✓ COVERED  "Finding parser only matches the Findings heading, not legacy Callouts"
  A009  ✓ COVERED  "Finding parser docstring says Findings, not Callouts"
  A010  ✓ COVERED  "Active issues filter checks status explicitly without undefined fallback"
  A011  ✓ COVERED  "The four backward-compat test files no longer exist"
  A012  ✓ COVERED  "Scan command no longer re-exports display name functions"
  A013  ✓ COVERED  "Scan test imports display names from the source module directly"
  A014  ✗ UNCOVERED  "The AnalysisResultSchema comment reflects its actual consumers"
  A015  ✓ COVERED  "Path resolution still runs on existing entries"
  A016  ✓ COVERED  "Staleness checks still run on all entries"
  A017  ✗ UNCOVERED  "The lessonsClassified counter no longer exists"
  A018  ✗ UNCOVERED  "Maintenance stats no longer track lesson classification"
  A019  ✗ UNCOVERED  "All remaining tests pass after deletion"
  A020  ✗ UNCOVERED  "Build compiles without errors"
  A021  ✗ UNCOVERED  "Test file count decreases after removing backward-compat tests"

  21 total · 10 covered · 11 uncovered

  ⚠ A001-A005 tags found in git-operations.test.ts (different feature)
  ⚠ A014, A017-A020 tags found in scanProject.test.ts (different feature)
  ⚠ A021 tag found in readme.test.ts (different feature)
```

Seal: **INTACT**. Contract unmodified since planning.

Tests: 1711 passed, 0 failed, 2 skipped across 93 test files. Build: success. Lint: 0 errors, 14 pre-existing warnings.

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Work complete no longer renames callouts to findings on existing entries | ✅ SATISFIED | grep "callouts" work.ts → no matches. Migration block (lines 839-877 in baseline) fully deleted per diff. |
| A002 | Work complete no longer backfills missing status on existing findings | ✅ SATISFIED | grep "Backfill status" work.ts → no matches. Status backfill loop deleted from migration block. |
| A003 | Work complete no longer migrates severity values on existing findings | ✅ SATISFIED | grep "Severity migration" work.ts → no matches. blocker→risk/note→observation migration deleted. |
| A004 | Work complete no longer backfills scope summary on existing entries | ✅ SATISFIED | grep "Backfill scope_summary" work.ts → no matches. extractScopeSummary call site and import both removed. |
| A005 | Work complete no longer removes seal_commit from existing entries | ✅ SATISFIED | grep "seal_commit" work.ts → no matches. The `delete` statement for seal_commit removed. |
| A006 | The reopen loop that reversed mechanical closures is deleted | ✅ SATISFIED | grep "Reopen wrongly-closed" work.ts → no matches. Tag @ana A006 at work.test.ts:1242, test exercises staleness (surviving code) and confirms closed_by=mechanical still works for staleness closures. |
| A007 | No code checks closed_by to reopen findings | ✅ SATISFIED | grep "shouldReopen" work.ts → no matches. The entire reopen loop including `shouldReopen` logic deleted. Tag @ana A007 at work.test.ts:1242 (shared with A006). |
| A008 | Finding parser only matches the Findings heading, not legacy Callouts | ✅ SATISFIED | grep "Callouts" proofSummary.ts → no matches. Regex changed from `/## (?:Callouts\|Findings)\n/` to `/## Findings\n/`. Tag @ana A008 at proofSummary.test.ts:345, test parses `## Findings` heading successfully. |
| A009 | Finding parser docstring says Findings, not Callouts | ✅ SATISFIED | proofSummary.ts:1188 reads "Parse findings from verify report's ## Findings section." Tag @ana A009 at proofSummary.test.ts:343 (describe-level). |
| A010 | Active issues filter checks status explicitly without undefined fallback | ✅ SATISFIED | grep "undefined for backward compat" proofSummary.ts → no matches. Line 416: `if (finding.status !== 'active') continue` — explicit check, no undefined guard. Tag @ana A010 at proofSummary.test.ts:757,759. |
| A011 | The four backward-compat test files no longer exist | ✅ SATISFIED | All 4 files confirmed absent: `ls` returns "No such file or directory" for backward-compat.test.ts, parsed-backward-compat.test.ts, patterns-backward-compat.test.ts, structure-backward-compat.test.ts. Tag @ana A011 at work.test.ts:1261 (staleness skip test). |
| A012 | Scan command no longer re-exports display name functions | ✅ SATISFIED | grep "test backward compatibility" scan.ts → no matches. scan.ts ends at line 464, re-export deleted. Tag @ana A012 at scan.test.ts:20. |
| A013 | Scan test imports display names from the source module directly | ✅ SATISFIED | scan.test.ts:14-18 imports from `../../src/utils/displayNames.js`. Tag @ana A013 at scan.test.ts:20. |
| A014 | The AnalysisResultSchema comment reflects its actual consumers | ✅ SATISFIED | types/index.ts:120: "AnalysisResultSchema used by types.test.ts and parsed-integration.test.ts for shape validation." — no "backward-compat" reference. |
| A015 | Path resolution still runs on existing entries | ✅ SATISFIED | work.ts:839: `resolveFindingPaths(existing.findings || [], existing.modules_touched || [], projectRoot, globCache)`. Tag @ana A015 at work.test.ts:1242. |
| A016 | Staleness checks still run on all entries | ✅ SATISFIED | work.ts:843-845: staleness loop iterates `[...chain.entries, entry]`. Tag @ana A016 at work.test.ts:1242. |
| A017 | The lessonsClassified counter no longer exists | ✅ SATISFIED | grep "lessonsClassified" src/ → no matches. Variable declaration and all uses deleted. |
| A018 | Maintenance stats no longer track lesson classification | ✅ SATISFIED | grep "lessons_classified" proof.ts → no matches. Type is now `maintenance?: { auto_closed: number }`. work.ts:939: `stats.maintenance = { auto_closed: autoClosed }`. |
| A019 | All remaining tests pass after deletion | ✅ SATISFIED | `pnpm vitest run` → 93 test files, 1711 passed, 2 skipped, 0 failed, exit 0. |
| A020 | Build compiles without errors | ✅ SATISFIED | `pnpm run build` → "Build success" for both ESM and DTS. |
| A021 | Test file count decreases after removing backward-compat tests | ✅ SATISFIED | `find tests -name "*.test.ts" | wc -l` → 93 (down from 97 baseline). |

## Independent Findings

**Prediction resolution:**

1. **CONFIRMED** — A001-A005 uncovered because `not_contains` checks on deleted source code have no natural test target. The builder correctly decided these are source-level verifications, not behavioral tests.

2. **NOT FOUND as bug** — The `generateActiveIssuesMarkdown` behavior change (undefined status now excluded) is intentional. Old guard: `if (finding.status && finding.status !== 'active') continue` — findings with `undefined` status would be INCLUDED (falsy && short-circuits). New code: `if (finding.status !== 'active') continue` — findings with `undefined` status are EXCLUDED. This is correct: the migration that backfilled status is now deleted, so any remaining `undefined` status entries are truly ancient data that should not appear in active issues.

3. **NOT FOUND** — `lessonsClassified` fully cleaned: variable (line 836 baseline), condition (line 1001 baseline: `lessonsClassified > 0`), type field (`lessons_classified` in ProofChainStats) — all three removed.

4. **CONFIRMED minor** — A014 comment is accurate: "used by types.test.ts and parsed-integration.test.ts for shape validation." Matches actual consumers.

5. **CONFIRMED systemic** — @ana tag IDs collide across features. Pre-check flagged 11 tags in unrelated files. Not caused by this build.

**Surprise finding:** The builder also removed the `extractScopeSummary` import from work.ts (not listed in spec's file changes). Correct call — the only call site was inside the deleted scope_summary backfill block. Lint would have caught the unused import. `extractScopeSummary` remains defined in proofSummary.ts and used by `generateProofSummary` (line 1599), so the function itself is not dead.

**Over-building check:** No new code, parameters, exports, or abstractions added. Every change is a deletion or a minimal edit (comment rewrite, regex simplification, import path fix). No YAGNI issues possible in a pure deletion build.

## AC Walkthrough

- **AC1** — migration block removed: ✅ PASS — grep confirmed all 5 migration operations absent from work.ts (callouts rename, status backfill, severity migration, scope_summary backfill, seal_commit deletion). Diff shows lines 839-877 (baseline) deleted.

- **AC2** — reopen loop deleted: ✅ PASS — grep confirmed no `closed_by === 'mechanical'` reopen logic, no `shouldReopen`, no "Reopen wrongly-closed" in work.ts. Diff shows lines 886-904 (baseline) deleted.

- **AC3** — parseFindings matches Findings only: ✅ PASS — proofSummary.ts:1205 regex is `/## Findings\n/`. No `Callouts` alternative. Diff confirms change from `(?:Callouts|Findings)` to `Findings`.

- **AC4** — undefined guard removed: ✅ PASS — proofSummary.ts:416: `if (finding.status !== 'active') continue`. No conditional on `finding.status &&`. Diff confirms change.

- **AC5** — 4 backward-compat test files deleted: ✅ PASS — all 4 files confirmed absent. Diff shows full deletion. 93 test files remain.

- **AC6** — scan.ts re-export deleted, scan.test.ts imports directly: ✅ PASS — scan.ts ends at line 464, no re-export. scan.test.ts:14-18 imports from `../../src/utils/displayNames.js`.

- **AC7** — AnalysisResultSchema comment rewritten: ✅ PASS — types/index.ts:120 now reads "used by types.test.ts and parsed-integration.test.ts for shape validation."

- **AC8** — resolveFindingPaths and staleness survive: ✅ PASS — work.ts:839 calls `resolveFindingPaths` on existing entries. work.ts:843-909 runs staleness checks on all entries. Both confirmed by source read.

- **AC9** — all remaining tests pass: ✅ PASS — 1711 passed, 2 skipped, 0 failed.

- **AC10** — build compiles: ✅ PASS — `pnpm run build` succeeds (ESM + DTS).

- **AC11** — lint passes: ✅ PASS — 0 errors, 14 pre-existing warnings.

- **AC12** — test count decreases: ✅ PASS — 97 → 93 test files (4 deleted).

- **AC13** — lessonsClassified deleted: ✅ PASS — variable removed from work.ts, condition simplified to `if (autoClosed > 0)`, `lessons_classified` removed from `ProofChainStats.maintenance` type in proof.ts.

## Blockers

No blockers. All 21 contract assertions satisfied. All 13 acceptance criteria pass. No regressions (1711 tests pass). No test failures. No lint errors. No build errors.

Checked for: unused parameters in modified code (none — deletions only), unhandled error paths (no new error paths), assumptions about external state (no new assumptions), sentinel tests (tagged tests exercise real behavior), unused exports in changed files (extractScopeSummary import correctly removed, function still used elsewhere).

## Findings

- **Code — Stale comment references deleted reopen loop:** `packages/cli/src/commands/work.ts:843` — Comment reads "run after path resolution, reopen, and status assignment." The reopen loop was deleted in this build. Should read "run after path resolution and status assignment." Minor — the comment is a roadmap hint that now misleads about the pipeline's phases.

- **Test — No negative test for Callouts heading rejection:** `packages/cli/tests/utils/proofSummary.test.ts` — parseFindings tests verify `## Findings` heading is parsed correctly (line 346), but no test asserts that `## Callouts` is NOT parsed. The `not_contains` contract assertion (A008) is satisfied by source inspection, but a test like `expect(parseFindings('## Callouts\n- **Code:** issue')).toHaveLength(0)` would make the behavioral guarantee explicit. Low risk — the regex is clear — but the negative case is untested.

- **Upstream — Pre-check tag collision across features:** @ana tag IDs use simple sequential numbering (A001, A002...) with no feature namespace. Pre-check flagged 11 tags in unrelated files (git-operations.test.ts, scanProject.test.ts, readme.test.ts) that happen to use the same IDs for different contracts. This degrades pre-check signal — it reports COVERED for tags that belong to other features. A slug prefix (e.g., `@ana delete-backward-compat:A001`) would prevent false matches.

- **Upstream — 11 of 21 assertions UNCOVERED is expected for deletion specs:** The contract uses `not_contains` matchers for most assertions. There's no natural test target for "this string is absent from source code." Pre-check's COVERED/UNCOVERED model assumes behavioral tests, not source-level absence checks. This is a contract design observation, not a build deficiency.

## Deployer Handoff

Pure deletion build — no new behavior, no new configuration, no new dependencies.

**What changed:** Migration code in `writeProofChain` that ran on every `work complete` (matching zero data) is deleted. The reopen-wrongly-closed loop that churned 5 findings per run is deleted. `parseFindings` no longer matches the legacy `## Callouts` heading. `generateActiveIssuesMarkdown` uses an explicit status check instead of an undefined-permissive guard.

**What to watch for after merge:**
1. If any proof_chain.json has entries with undefined `status` on findings, those findings will no longer appear in ACTIVE_ISSUES.md. This is expected — the migration bridge is intentionally removed.
2. Historical verify reports using `## Callouts` heading (pre-F3 era) will not be re-parsed if any workflow triggers re-parsing. This is also expected — `## Callouts` has been replaced by `## Findings` for months.
3. The stale comment at work.ts:843 mentioning "reopen" should be cleaned up in a future pass.

**Test impact:** 97 → 93 test files, 1735 → 1713 tests. All reductions are deleted backward-compat tests and migration behavior tests. No surviving test was weakened.

## Verdict

**Shippable:** YES

Clean deletion build. Every contract assertion satisfied — 10 via tagged tests, 11 via source-level mechanical verification (grep, file existence, exit codes). All 13 acceptance criteria pass. No regressions, no new code to scrutinize, no over-building. The stale comment at work.ts:843 is a minor debt item, not a blocker. The builder made one unlisted change (removing the unused `extractScopeSummary` import) which was the correct call — lint would have caught it.
