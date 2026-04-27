# Verify Report: Findings Lifecycle Foundation

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-27
**Spec:** .ana/plans/active/findings-lifecycle-foundation/spec.md
**Branch:** feature/findings-lifecycle-foundation

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/findings-lifecycle-foundation/contract.yaml
  Seal: INTACT (hash sha256:7e78e329cd74ff4f5745517f6155d1efb1636744dd809250fa0c5d2ce14292b4)

  A001  ✓ COVERED  "Each proof chain entry stores its findings with the renamed field"
  A002  ✓ COVERED  "Findings can have a lifecycle status: active, lesson, promoted, or closed"
  A003  ✓ COVERED  "The old 'callouts' field name is removed from TypeScript type definitions..."
  A004  ✓ COVERED  "Chain health stats include counts for each finding status"
  A005  ✓ COVERED  "Chain health stats include maintenance activity counts when maintenance occurred"
  A006  ✓ COVERED  "Existing findings without a status are treated as active during backfill"
  A007  ✓ COVERED  "Findings from upstream observations are classified as lessons"
  A008  ✓ COVERED  "New code and test findings start with active status"
  A009  ✓ COVERED  "New upstream findings start as lessons, not active items"
  A010  ✓ COVERED  "Findings referencing deleted files are automatically closed"
  A011  ✓ COVERED  "Findings without a file reference are skipped by staleness checks"
  A012  ✓ COVERED  "Findings whose code anchor disappeared are automatically closed"
  A013  ✓ COVERED  "Findings without an anchor are skipped by the anchor check"
  A014  ✓ COVERED  "When a newer finding exists on the same file and category, the older one is closed"
  A015  ✓ COVERED  "Supersession only compares findings with fully resolved file paths"
  A016  ✓ COVERED  "Findings from the same pipeline run are never superseded against each other"
  A017  ✓ COVERED  "Only active findings appear in the Active Issues markdown section"
  A018  ✓ COVERED  "Closed findings are excluded from the Active Issues section"
  A019  ✓ COVERED  "Proof context queries return only active findings by default"
  A020  ✓ COVERED  "Proof context with includeAll returns findings of every status"
  A021  ✓ COVERED  "Proof context results include the finding's lifecycle status"
  A022  ✓ COVERED  "The scope summary captures the first paragraph of the scope's Intent section"
  A023  ✓ COVERED  "Missing or malformed scope files result in no scope summary, not an error"
  A024  ✓ COVERED  "An UNKNOWN result with an existing verify report triggers a warning"
  A025  ✓ COVERED  "The dashboard shows total runs and counts for each finding status"
  A026  ✓ COVERED  "The dashboard highlights files that generated findings across multiple pipeline runs"
  A027  ✓ COVERED  "The dashboard groups active findings by file"
  A028  ✓ COVERED  "The dashboard caps displayed active findings at 30"
  A029  ✓ COVERED  "Work completion output shows active finding count instead of total callouts"
  A030  ✓ COVERED  "A maintenance summary appears when findings were auto-closed or classified"
  A031  ✓ COVERED  "Existing proof chain entries have their callouts field migrated to findings"

  31 total · 31 covered · 0 uncovered
```

Tests: 1514 passed, 2 skipped (1516 total, up from 1486 baseline). Build: success. Lint: 0 errors, 14 warnings (all pre-existing `@typescript-eslint/no-explicit-any` in unrelated files).

## Contract Compliance
| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Each proof chain entry stores its findings with the renamed field | ✅ SATISFIED | `packages/cli/src/types/proof.ts:66` — `findings: Array<{...}>` on `ProofChainEntry` |
| A002 | Findings can have a lifecycle status: active, lesson, promoted, or closed | ✅ SATISFIED | `packages/cli/src/types/proof.ts:72` — `status?: 'active' \| 'lesson' \| 'promoted' \| 'closed'` |
| A003 | The old 'callouts' field name is removed from TS type defs, variable names, interface names | ✅ SATISFIED | Grep of `packages/cli/src/types/`, `proofSummary.ts`, `proof.ts`, `work.ts` for `\bcallouts\b` returns zero hits in type definitions, variable names, or interface names. Remaining source hits are migration code (`work.ts:839-841`) that intentionally accesses the old field name. `parseFindings` regex at `proofSummary.ts:640` retains `## Callouts\n` per contract allowance. TypeScript compiles clean. |
| A004 | Chain health stats include counts for each finding status | ✅ SATISFIED | `packages/cli/src/types/proof.ts:33-44` — `ProofChainStats` has `runs`, `findings`, `active`, `lessons`, `promoted`, `closed`. Tests at `work.test.ts:1095` and `work.test.ts:1159` verify output format. |
| A005 | Chain health stats include maintenance activity counts | ✅ SATISFIED | `packages/cli/src/types/proof.ts:40-43` — `maintenance?: { auto_closed: number; lessons_classified: number }`. `work.ts:976-978` populates conditionally. `work.test.ts:1344-1369` verifies maintenance line in output. |
| A006 | Existing findings without a status are treated as active during backfill | ✅ SATISFIED | `work.ts:848-856` backfill loop sets `status: 'active'`. `work.test.ts:1163-1178` (@ana A006) asserts `status === 'active'` on finding without prior status. |
| A007 | Findings from upstream observations are classified as lessons | ✅ SATISFIED | `work.ts:850-851` checks `category === 'upstream'` → `status: 'lesson'`. `work.test.ts:1181-1195` (@ana A007) asserts `status === 'lesson'` on upstream finding. |
| A008 | New code and test findings start with active status | ✅ SATISFIED | `work.ts:818-824` assigns status on new findings. `work.test.ts:1392-1421` (@ana A008) verifies `codeFinding.status === 'active'`. |
| A009 | New upstream findings start as lessons, not active items | ✅ SATISFIED | `work.ts:819-820` sets `status: 'lesson'` for upstream. `work.test.ts:1419-1420` (@ana A009) verifies `upstreamFinding.status === 'lesson'`. |
| A010 | Findings referencing deleted files are automatically closed | ✅ SATISFIED | `work.ts:889-895` file-deleted check. `work.test.ts:1198-1214` (@ana A010) asserts `status === 'closed'`, `closed_reason === 'file removed'`, `closed_by === 'mechanical'`. |
| A011 | Findings without a file reference are skipped by staleness checks | ✅ SATISFIED | `work.ts:889` `if (finding.file && finding.file.includes('/'))` skips null files. `work.test.ts:1217-1231` (@ana A011) asserts `status === 'active'` on finding with `file: null`. |
| A012 | Findings whose code anchor disappeared are automatically closed | ✅ SATISFIED | `work.ts:901-909` anchor-absent check. `work.test.ts:1234-1254` (@ana A012) asserts `status === 'closed'`, `closed_reason === 'code changed, anchor absent'`. |
| A013 | Findings without an anchor are skipped by the anchor check | ✅ SATISFIED | `work.ts:901` `if (finding.anchor)` skips null anchors. `work.test.ts:1257-1275` (@ana A013) asserts status `not.toBe('closed')` on finding with `anchor: null`. |
| A014 | When a newer finding exists on the same file and category, the older one is closed | ✅ SATISFIED | `work.ts:915-935` supersession map. `work.test.ts:1278-1319` (@ana A014) asserts `entries[0].findings[0].status === 'closed'` and `closed_reason.toContain('superseded')`. |
| A015 | Supersession only compares findings with fully resolved file paths | ✅ SATISFIED | `work.ts:921` `if (!finding.file \|\| !finding.file.includes('/')) continue;` — unresolved basenames skipped. Test at `work.test.ts:1278` (@ana A015) uses resolved paths (`src/shared.ts`); code correctness verified by inspection of the guard. |
| A016 | Findings from the same pipeline run are never superseded against each other | ✅ SATISFIED | `work.ts:925` `existing.entryIndex !== entryIdx` — same-entry check. Test at `work.test.ts:1278` (@ana A016) verifies new entry's findings remain active after supersession. Code correctness of the `entryIdx` guard verified by inspection. |
| A017 | Only active findings appear in the Active Issues markdown section | ✅ SATISFIED | `proofSummary.ts:397` filters `finding.status && finding.status !== 'active'`. `proofSummary.test.ts:1487-1502` (@ana A017) asserts output contains active, not closed/lesson. |
| A018 | Closed findings are excluded from the Active Issues section | ✅ SATISFIED | Same filter as A017. `proofSummary.test.ts:1500` asserts `not.toContain('Closed finding summary')`. |
| A019 | Proof context queries return only active findings by default | ✅ SATISFIED | `proofSummary.ts:1107` filters non-active by default. `proofSummary.test.ts:1441-1454` (@ana A019) asserts only active finding returned, closed excluded. |
| A020 | Proof context with includeAll returns findings of every status | ✅ SATISFIED | `proofSummary.ts:1107` `!options?.includeAll` guard. `proofSummary.test.ts:1457-1469` (@ana A020) asserts both active and closed returned with `{ includeAll: true }`. |
| A021 | Proof context results include the finding's lifecycle status | ✅ SATISFIED | `proofSummary.ts:1117` includes `status: finding.status`. `proofSummary.test.ts:1472-1483` (@ana A021) asserts `findings[0].status === 'active'`. |
| A022 | The scope summary captures the first paragraph of the scope's Intent section | ✅ SATISFIED | `proofSummary.ts:484-495` `extractScopeSummary`. `proofSummary.test.ts:1529-1534` and `proofSummary.test.ts:1638-1643` (@ana A022) assert specific paragraph text extracted. |
| A023 | Missing or malformed scope files result in no scope summary, not an error | ✅ SATISFIED | `proofSummary.ts:485` returns undefined if file doesn't exist. `proofSummary.test.ts:1536-1553` (@ana A023) tests missing file, no Intent section, and empty Intent section — all return undefined. |
| A024 | An UNKNOWN result with an existing verify report triggers a warning | ✅ SATISFIED | `work.ts:775-779` logs warning to stderr. Test at `work.test.ts:1372-1389` (@ana A024) covers the write path; the comment explains completeWork validates PASS/FAIL first so UNKNOWN is unreachable through that path — the warning guards future callers of writeProofChain directly. Code correctness verified by inspection. |
| A025 | The dashboard shows total runs and counts for each finding status | ✅ SATISFIED | `proofSummary.ts:526` summary line format. `proofSummary.test.ts:1558-1564` (@ana A025) asserts dashboard contains `runs` and `0 active`. |
| A026 | The dashboard highlights files that generated findings across multiple pipeline runs | ✅ SATISFIED | `proofSummary.ts:529-550` Hot Modules computation with 2+ entry filter. `proofSummary.test.ts:1566-1580` (@ana A026) creates 2 entries with same file, asserts Hot Modules contains the file. |
| A027 | The dashboard groups active findings by file | ✅ SATISFIED | `proofSummary.ts:594-616` Active Findings grouped with `###` headings. `proofSummary.test.ts:1591-1602` (@ana A027) asserts `### src/foo.ts` and `### src/bar.ts` headings. |
| A028 | The dashboard caps displayed active findings at 30 | ✅ SATISFIED | `proofSummary.ts:581` `MAX_ACTIVE = 30`. `proofSummary.test.ts:1604-1613` (@ana A028) creates 35 findings, asserts `30 shown of 35 total` and exactly 30 finding lines. |
| A029 | Work completion output shows active finding count instead of total callouts | ✅ SATISFIED | `work.ts:1195` `${stats.active} active finding${...}`. `work.test.ts:1095` asserts `Chain: 1 run · 0 active findings`. |
| A030 | A maintenance summary appears when findings were auto-closed or classified | ✅ SATISFIED | `work.ts:1196-1198` conditional maintenance line. `work.test.ts:1344-1369` (@ana A030) asserts output contains `Maintenance:`. |
| A031 | Existing proof chain entries have their callouts field migrated to findings | ✅ SATISFIED | `work.ts:837-842` migration code. `work.test.ts:1322-1341` (@ana A031) creates entry with `callouts` field, asserts `findings` populated and `callouts` undefined after completion. |

## Independent Findings

**Dead ternary in new entry construction.** `work.ts:810` — `status: (c as { category: string }).category === 'upstream' ? 'active' : 'active' as const` — both branches return `'active'`, making the ternary a no-op. The correct status assignment happens at lines 818-824, which overwrites this value. This is dead code — the ternary appears to be a copy-paste artifact where the first branch should have been `'lesson'`. Since lines 818-824 fix the status anyway, behavior is correct but the dead logic is confusing.

**A015/A016 edge cases tested by inspection, not behavior.** The supersession test (`work.test.ts:1278-1319`) exercises the core path (older finding closed by newer) but doesn't include an unresolved-basename finding (A015) or two findings within the same entry sharing file+category (A016). The code guards are simple (`!finding.file.includes('/')` and `existing.entryIndex !== entryIdx`) and verified by reading the source. These assertions are technically satisfied by the tagged test proving supersession works plus code inspection, but the edge cases are not behaviorally exercised.

**A024 unreachable through completeWork.** The UNKNOWN result warning at `work.ts:775-779` is dead code in the current call graph because `completeWork` validates `result === PASS` before calling `writeProofChain`. The test acknowledges this in a comment. The warning is a forward-looking guard for future direct callers of `writeProofChain`. The code is correct, but the test doesn't actually trigger the warning path.

**`generateDashboard` duplicates `generateActiveIssuesMarkdown` logic.** `proofSummary.ts:566-616` reimplements the active-finding collection, capping, and file-grouping logic instead of calling `generateActiveIssuesMarkdown`. The dashboard uses `###` headings (vs `##` in Active Issues) and omits truncation, so the duplication is partly justified by format differences, but the filtering and capping logic is identical.

**Hot Modules redundant status check.** `proofSummary.ts:535-536` — the condition `if (finding.status && finding.status !== 'active' && finding.status !== undefined) continue;` is redundant. If `finding.status` is truthy (line 535), it's already not undefined, so `&& finding.status !== undefined` is always true. Line 536 then re-checks `!finding.status || finding.status === 'active'` which is the inverse. This double-filter works correctly but is harder to read than necessary.

**Prediction resolution:**
- Rename missed refs → Not found. Grep clean.
- Supersession same-entry → Code correct, test doesn't exercise edge case.
- Scope summary regex → Not found. Handles edge cases well.
- Hot Modules counting → Not found. Uses slug for entry attribution, correct.
- Anchor check caching → Not found. File content cache implemented at `work.ts:869-881`.
- Backward compat risk → Confirmed as latent. Migration deletes `callouts` field, breaking older CLI versions reading the same chain file.

## AC Walkthrough

- ✅ PASS **AC1:** `ProofChainEntry` has `findings` field with lifecycle fields. Verified at `types/proof.ts:66-77`. Field `status?: 'active' | 'lesson' | 'promoted' | 'closed'` plus `closed_reason`, `promoted_to`, `closed_at`, `closed_by`.
- ✅ PASS **AC2:** All source references renamed. Grep of `packages/cli/src/` for `\bcallouts\b` returns only migration code and an unrelated init/state.ts comment. `parseFindings` regex retains `## Callouts\n` per spec. `resolveCalloutPaths` → `resolveFindingPaths`, `CalloutWithFeature` → `FindingWithFeature`, projections updated.
- ✅ PASS **AC3:** `ProofChainStats` at `types/proof.ts:33-44` has `runs`, `findings`, `active`, `lessons`, `promoted`, `closed`, and optional `maintenance`.
- ✅ PASS **AC4:** Backfill at `work.ts:848-856` sets `active` by default, `lesson` for upstream. Idempotent — `if (!finding.status)` check. Tested at `work.test.ts:1163-1195`.
- ✅ PASS **AC5:** New findings at `work.ts:818-824` get `lesson` for upstream, `active` otherwise. Tested at `work.test.ts:1392-1421`.
- ✅ PASS **AC6:** File-deleted check at `work.ts:889-895`. Sets `closed`, `file removed`, ISO timestamp, `mechanical`. Runs after path resolution. Skips null `file`. Tested at `work.test.ts:1198-1231`.
- ✅ PASS **AC7:** Anchor-absent check at `work.ts:901-909`. Sets `closed`, `code changed, anchor absent`, timestamp, `mechanical`. Skips null `anchor`. Tested at `work.test.ts:1234-1275`.
- ✅ PASS **AC8:** Supersession at `work.ts:915-935`. Older finding closed with `superseded by {id}`. Only on resolved paths (`includes('/')`). Same entry protected by `entryIndex` check. Tested at `work.test.ts:1278-1319`.
- ✅ PASS **AC9:** Status filter at `proofSummary.ts:397`. Cap changed from 20 to 30 at line 409. Tested at `proofSummary.test.ts:1487-1514` and `proofSummary.test.ts:811-827`.
- ✅ PASS **AC10:** `getProofContext` at `proofSummary.ts:1107` filters by status. `options?: { includeAll?: boolean }` parameter at line 1072. Tested at `proofSummary.test.ts:1441-1483`.
- ✅ PASS **AC11:** `scope_summary?: string` at `types/proof.ts:65`. Populated in `generateProofSummary` at `proofSummary.ts:981-982`. Backfilled in `work.ts:860-863`. `extractScopeSummary` helper at `proofSummary.ts:484-495`. Tested at `proofSummary.test.ts:1517-1650`.
- ✅ PASS **AC12:** UNKNOWN warning at `work.ts:773-780`. Logs to stderr. Entry still written. Tested at `work.test.ts:1372-1389` (code path verified by inspection since completeWork pre-validates PASS/FAIL).
- ✅ PASS **AC13:** Dashboard at `proofSummary.ts:522-620`. Contains summary line, Hot Modules (2+ entries, top 5), Promoted Rules placeholder, Active Findings grouped by file. `work.ts:940-965` calls `generateDashboard` and writes PROOF_CHAIN.md. Tested at `work.test.ts:1060-1073` and `proofSummary.test.ts:1557-1621`.
- ✅ PASS **AC14:** Active Findings capped at 30 at `proofSummary.ts:581`. Count indicator at line 591. Tested at `proofSummary.test.ts:1604-1613` (35 findings → "30 shown of 35 total", exactly 30 rendered).
- ✅ PASS **AC15:** Output at `work.ts:1195` shows `Chain: {N} runs · {active} active findings`. Maintenance line at `work.ts:1197` is conditional. Tested at `work.test.ts:1095` and `work.test.ts:1344-1369`.
- ✅ PASS **AC16:** Migration at `work.ts:837-842`. Detects `callouts` field, moves to `findings`, deletes old key. Tested at `work.test.ts:1322-1341`.
- ✅ PASS **AC17:** Finding IDs retain `-C{N}` format at `work.ts:809`. No ID string migration.
- ✅ PASS **AC18:** Tests pass: 1514 passed, 2 skipped. `(cd packages/cli && pnpm vitest run)` completed successfully.
- ✅ PASS **AC19:** Lint passes: `pnpm lint` — 0 errors, 14 warnings (all pre-existing).

## Blockers

No blockers. All 31 contract assertions satisfied. All 19 acceptance criteria pass. Tests pass (1514, up 28 from 1486 baseline). Build succeeds. Lint clean (0 errors). No regressions detected.

Checked for: unused exports in new functions (`extractScopeSummary`, `generateDashboard` — both imported and used), unused parameters in new function signatures (all params used), error paths that swallow silently (staleness checks use `continue` with proper skip logic, file read errors cached as null), assumptions about external state (file existence checks use `projectRoot` correctly, scope.md path uses completed plan directory).

## Callouts

- **Code — Dead ternary on new finding status:** `packages/cli/src/commands/work.ts:810` — `(c as { category: string }).category === 'upstream' ? 'active' : 'active' as const` — both branches evaluate to `'active'`, making the expression a no-op. The correct assignment happens at lines 818-824. This is dead logic that should either be removed (let lines 818-824 handle it alone) or corrected to `'lesson' : 'active'` and the redundant loop removed.

- **Code — Redundant status filter in Hot Modules:** `packages/cli/src/utils/proofSummary.ts:535-536` — double-checks `finding.status` both as truthy and not-undefined, then re-checks on the next line. A single `if (finding.status !== 'active' && finding.status !== undefined) continue;` would be clearer.

- **Code — Dashboard duplicates Active Issues logic:** `packages/cli/src/utils/proofSummary.ts:566-616` — reimplements the collection, filtering, capping, and file-grouping from `generateActiveIssuesMarkdown` (lines 385-473). The format differs (### vs ## headings, no truncation), but extracting shared helpers for the filtering and grouping would reduce the ~50 lines of duplication.

- **Test — A015/A016 edge cases not behaviorally exercised:** `packages/cli/tests/commands/work.test.ts:1278` — the supersession test proves the core mechanism but doesn't include an unresolved-basename finding (to prove A015's skip) or two same-entry findings with matching file+category (to prove A016's guard). The code guards are trivial and correct by inspection, but the test coverage gap means a regression in those guards wouldn't be caught.

- **Test — A024 warning test doesn't trigger the warning:** `packages/cli/tests/commands/work.test.ts:1372` — the test is tagged `@ana A024` but only asserts the entry has `result === 'PASS'`. The UNKNOWN warning path is unreachable through `completeWork` because of pre-validation. A direct `writeProofChain` test with an UNKNOWN-result proof object would exercise the actual warning.

- **Upstream — Backward compat risk on callouts migration:** `packages/cli/src/commands/work.ts:841` — `delete existingAny['callouts']` removes the old field during migration. If an older CLI version reads the migrated `proof_chain.json`, it will see no callouts on those entries. Since the CLI is installed per-project, this is low risk, but the one-way migration means you can't roll back after the first `work complete`.

## Deployer Handoff

This is a pure internal change — no new commands, no external API surface. The first `ana work complete` after merge will trigger the migration: all 18 existing entries get `callouts` → `findings` renamed, status backfilled, and stale findings auto-closed. Expect the first completion to show a large maintenance line (the spec estimates ~38 auto-closed, ~17 lessons classified). Subsequent completions will show low/zero maintenance unless new findings trigger new staleness.

The `## Callouts` heading in verify report markdown is intentionally retained. Verify reports still use that heading. The rename to `## Findings` in the AnaVerify template is deferred to Foundation 2.

## Verdict
**Shippable:** YES

All 31 contract assertions satisfied. All 19 ACs pass. Test count increased from 1486 to 1514 (+28). No regressions. The callouts include a dead ternary, duplicated dashboard logic, and test coverage gaps on supersession edge cases — all worth cleaning up in a future cycle but none blocking shipment. The lifecycle foundation is solid: types are correct, backfill is idempotent, staleness checks are mechanical and cached, and the dashboard renders the new data correctly.
