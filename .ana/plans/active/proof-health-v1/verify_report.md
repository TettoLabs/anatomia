# Verify Report: Proof Health V1

**Result:** FAIL
**Created by:** AnaVerify
**Date:** 2026-04-29
**Spec:** .ana/plans/active/proof-health-v1/spec.md
**Branch:** feature/proof-health-v1

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/proof-health-v1/contract.yaml
  Seal: INTACT (hash sha256:f5b7031c643f1ad27d575c6298af97d7e3be01c93f4e414a30787ff78902cd72)

  A001  ✓ COVERED  "Running proof health shows the number of pipeline runs"
  A002  ✓ COVERED  "Trajectory section shows risks per run for the recent window"
  A003  ✓ COVERED  "Trajectory section shows the lifetime average"
  A004  ✓ COVERED  "Trajectory section shows the trend direction"
  A005  ✓ COVERED  "Hot modules section appears in the health dashboard"
  A006  ✓ COVERED  "Promotion candidates section appears in the health dashboard"
  A007  ✓ COVERED  "Health JSON uses the standard four-key envelope"
  A008  ✓ COVERED  "Health JSON results include trajectory data"
  A009  ✓ COVERED  "Health JSON results include hot modules list"
  A010  ✓ COVERED  "Health JSON results include promotion candidates"
  A011  ✓ COVERED  "Health JSON results include promotions array"
  A012  ✓ COVERED  "Health JSON results include run count"
  A013  ✓ COVERED  "Work complete shows a health line when trajectory changes"
  A014  ✓ COVERED  "The health line describes what changed"
  A015  ✓ COVERED  "Work complete JSON includes quality data"
  A016  ✓ COVERED  "Quality data indicates whether a change was detected"
  A017  ✓ COVERED  "Quality data includes the trajectory snapshot"
  A018  ✓ COVERED  "Quality data lists which triggers fired"
  A019  ✓ COVERED  "Health command works with an empty proof chain"
  A020  ✓ COVERED  "Empty chain shows zero runs"
  A021  ✓ COVERED  "Findings without severity are counted as unclassified"
  A022  ✓ COVERED  "Trajectory computes risks per run on classified findings only"
  A023  ✓ COVERED  "Promotions with insufficient data show tracking status"
  A024  ✓ COVERED  "Promotions with enough data show reduction percentage"
  A025  ✓ COVERED  "With no promoted findings the promotions section is empty"
  A026  ✓ COVERED  "Work complete does not show a health line when nothing changed"
  A027  ✓ COVERED  "Each entry's risk count is only the risks in that entry's findings"
  A028  ✓ COVERED  "With fewer than ten entries the trend reports insufficient data"
  A029  ✓ COVERED  "With fewer than five entries the recent window equals lifetime"
  A030  ✓ COVERED  "With fewer than five entries the lifetime average matches"
  A031  ✓ COVERED  "Hot module threshold for finding count is a named constant"
  A032  ✓ COVERED  "Hot module threshold for entry count is a named constant"
  A033  ✓ COVERED  "A module with three findings from two entries is hot"
  A034  ✓ COVERED  "A module below threshold is not hot"
  A035  ✓ COVERED  "First pipeline run produces no fourth line"
  A036  ✓ COVERED  "Hot module display includes severity breakdown per module"
  A037  ✓ COVERED  "Promotion effectiveness matches by severity plus category plus file"
  A038  ✓ COVERED  "Promotion candidates include recurring scope findings from multiple entries"
  A039  ✓ COVERED  "Health JSON trajectory trend reflects window comparison"
  A040  ✓ COVERED  "All-unclassified chain reports no classified data instead of zero"

  40 total · 40 covered · 0 uncovered
```

Tests: 1711 passed, 2 skipped (baseline 1657 — +54 new). Build: success. Lint: 0 errors, 14 warnings (pre-existing).

## Contract Compliance
| ID   | Says                                           | Status       | Evidence |
|------|------------------------------------------------|--------------|----------|
| A001 | Running proof health shows the number of pipeline runs | ✅ SATISFIED | proof.test.ts:1544, asserts stdout contains 'Proof Health:' and '28' |
| A002 | Trajectory section shows risks per run for the recent window | ✅ SATISFIED | proof.test.ts:1558, asserts stdout contains 'Risks/run (last 5):' |
| A003 | Trajectory section shows the lifetime average | ✅ SATISFIED | proof.test.ts:1570, asserts stdout contains 'Risks/run (all):' |
| A004 | Trajectory section shows the trend direction | ✅ SATISFIED | proof.test.ts:1582, asserts stdout contains 'Trend:' |
| A005 | Hot modules section appears in the health dashboard | ✅ SATISFIED | proof.test.ts:1595, asserts stdout contains 'Hot Modules' |
| A006 | Promotion candidates section appears in the health dashboard | ✅ SATISFIED | proof.test.ts:1604, asserts stdout contains 'Promotion Candidates' |
| A007 | Health JSON uses the standard four-key envelope | ✅ SATISFIED | proof.test.ts:1638, asserts json.command === 'proof health', timestamp, results, meta defined |
| A008 | Health JSON results include trajectory data | ✅ SATISFIED | proof.test.ts:1651, asserts json.results.trajectory toBeDefined |
| A009 | Health JSON results include hot modules list | ✅ SATISFIED | proof.test.ts:1661, asserts json.results.hot_modules toBeDefined |
| A010 | Health JSON results include promotion candidates | ✅ SATISFIED | proof.test.ts:1671, asserts json.results.promotion_candidates toBeDefined |
| A011 | Health JSON results include promotions array | ✅ SATISFIED | proof.test.ts:1681, asserts json.results.promotions toBeDefined |
| A012 | Health JSON results include run count | ✅ SATISFIED | proof.test.ts:1693, asserts json.results.runs === 28 |
| A013 | Work complete shows a health line when trajectory changes | ❌ UNSATISFIED | work.test.ts:2262, tagged @ana A013 but asserts `toContain('Chain:')` — checks third line, not fourth. Chain setup (5 high-risk + 5 low-risk entries) produces 'improving' trend on both 10 and 11 entries, so detectHealthChange never fires and `Health:` never appears. Test comment acknowledges this. |
| A014 | The health line describes what changed | ❌ UNSATISFIED | work.test.ts:2262, same test tagged @ana A014. Asserts `toContain('Chain:')` not `toContain('trend')`. The fourth line never renders because the chain setup doesn't create a trend change boundary. |
| A015 | Work complete JSON includes quality data | ✅ SATISFIED | work.test.ts:2297, asserts json.results.quality toBeDefined |
| A016 | Quality data indicates whether a change was detected | ✅ SATISFIED | work.test.ts:2298-2299, asserts quality.changed toBeDefined and typeof === 'boolean' |
| A017 | Quality data includes the trajectory snapshot | ✅ SATISFIED | work.test.ts:2300, asserts quality.trajectory toBeDefined |
| A018 | Quality data lists which triggers fired | ✅ SATISFIED | work.test.ts:2301-2302, asserts quality.triggers toBeDefined and isArray |
| A019 | Health command works with an empty proof chain | ✅ SATISFIED | proof.test.ts:1613, asserts exitCode === 0 on empty chain |
| A020 | Empty chain shows zero runs | ✅ SATISFIED | proof.test.ts:1615, asserts stdout contains '0 runs' |
| A021 | Findings without severity are counted as unclassified | ✅ SATISFIED | proofSummary.test.ts:2320, asserts unclassified_count === 3 (which is > 0) |
| A022 | Trajectory computes risks per run on classified findings only | ✅ SATISFIED | proofSummary.test.ts:2322, asserts risks_per_run_all === 1.0 with 3 unclassified excluded |
| A023 | Promotions with insufficient data show tracking status | ✅ SATISFIED | proofSummary.test.ts:2548, asserts promotions[0].status === 'tracking' |
| A024 | Promotions with enough data show reduction percentage | ✅ SATISFIED | proofSummary.test.ts:2569, asserts promotions[0].reduction_pct === 100 |
| A025 | With no promoted findings the promotions section is empty | ✅ SATISFIED | proofSummary.test.ts:2527, asserts promotions toEqual([]) |
| A026 | Work complete does not show a health line when nothing changed | ✅ SATISFIED | work.test.ts:2280, asserts output not.toContain('Health:') on fresh single-entry completion |
| A027 | Each entry's risk count is only the risks in that entry's findings | ✅ SATISFIED | proofSummary.test.ts:2268, asserts risks_per_run_all === 2.0 for 2 entries each with 2 risks |
| A028 | With fewer than ten entries the trend reports insufficient data | ✅ SATISFIED | proofSummary.test.ts:2255, asserts trend === 'insufficient_data' for 7 entries |
| A029 | With fewer than five entries the recent window equals lifetime | ✅ SATISFIED | proofSummary.test.ts:2247, asserts risks_per_run_last5 === 1.5 for 2 entries |
| A030 | With fewer than five entries the lifetime average matches | ✅ SATISFIED | proofSummary.test.ts:2248, asserts risks_per_run_all === 1.5 for 2 entries |
| A031 | Hot module threshold for finding count is a named constant | ✅ SATISFIED | proofSummary.test.ts:2605, imports MIN_FINDINGS_HOT and asserts === 3; source proofSummary.ts:694 exports the constant |
| A032 | Hot module threshold for entry count is a named constant | ✅ SATISFIED | proofSummary.test.ts:2610, imports MIN_ENTRIES_HOT and asserts === 2; source proofSummary.ts:696 exports the constant |
| A033 | A module with three findings from two entries is hot | ✅ SATISFIED | proofSummary.test.ts:2369, asserts hot_modules.length > 0 with 3 findings from 2 entries |
| A034 | A module below threshold is not hot | ✅ SATISFIED | proofSummary.test.ts:2384, asserts hot_modules.length === 0 with 2 findings from 1 entry |
| A035 | First pipeline run produces no fourth line | ✅ SATISFIED | proofSummary.test.ts:2635, asserts change.changed === false for single-entry chain |
| A036 | Hot module display includes severity breakdown per module | ✅ SATISFIED | proofSummary.test.ts:2399-2403, asserts by_severity defined with correct risk/debt/observation counts |
| A037 | Promotion effectiveness matches by severity plus category plus file | ✅ SATISFIED | proofSummary.test.ts:2592-2595, asserts match_criteria.severity/category/file match expected values |
| A038 | Promotion candidates include recurring scope findings from multiple entries | ✅ SATISFIED | proofSummary.test.ts:2503-2505, asserts scopeCandidates.length > 0 with recurrence_count === 2 |
| A039 | Health JSON trajectory trend reflects window comparison | ✅ SATISFIED | proofSummary.test.ts:2279, asserts trend === 'improving' for 10 entries (high→low) |
| A040 | All-unclassified chain reports no classified data instead of zero | ✅ SATISFIED | proofSummary.test.ts:2339, asserts trend === 'no_classified_data' |

## Independent Findings

**Prediction resolutions:**

1. **Promotion effectiveness undertested — PARTIALLY CONFIRMED.** Tests cover tracking (< 5 entries), 100% reduction (no matches), and 0% reduction (match every entry). No test for intermediate reduction. Not a blocker but a test coverage gap.

2. **detectHealthChange single-entry edge — NOT FOUND.** Line 1011 in proofSummary.ts correctly handles `chain.entries.length <= 1` returning `noChange`. Clean edge case handling.

3. **All-unclassified null values — NOT FOUND.** Test at proofSummary.test.ts:2340-2341 correctly checks both `risks_per_run_all` and `risks_per_run_last5` are null.

4. **Hot module formatting inconsistent — NOT FOUND.** Terminal output at proof.ts:832 matches spec mockup pattern.

5. **Work.ts re-reads chain — NOT FOUND.** Builder consolidated at work.ts:1315 with "Read chain once for both meta and health change detection." `mainChain` variable used for both `detectHealthChange` and `wrapJsonResponse`. This is correct — follows the spec warning.

**Surprise finding:** The A013/A014 test is a sentinel. The chain construction creates 10 entries with an improving trend (5 × 4 risks + 5 × 1 risk). When completeWork adds entry #11, the trend for 11 entries is still "improving" (first half avg > second half avg). The `detectHealthChange` comparison between 11-entry and 10-entry chains both produce "improving" → no trend change → `changed: false` → fourth line never appears. The test's final assertion (`toContain('Chain:')`) proves the pipeline ran but not that the fourth line works. This is the hardest test to construct correctly because you need a chain where N entries have one trend and N+1 entries have a different trend.

**Code review — no over-building found.** All new functions are used. No unnecessary exports (`MIN_ENTRIES_FOR_EFFECTIVENESS` is correctly kept as a non-exported `const`). No dead code blocks. Every `if`, `for`, and `switch` in the new code has a purpose.

**Live test results:** `ana proof health` on this project's 28-run chain renders correctly. Terminal output shows trajectory, hot modules (5 files), and one promotion candidate. JSON output includes all four envelope keys. Error case (non-project directory) handled by existing `findProjectRoot()`.

## AC Walkthrough

- [x] AC1: `ana proof health` displays severity breakdown, trajectory, hot modules, promotion candidates — ✅ PASS — Verified via live test on project chain. Terminal output shows trajectory section (risks/run last 5, all, trend), hot modules (top 5 sorted by count), promotion candidates. The dashboard renders per spec mockup.

- [x] AC2: `ana proof health --json` outputs four-key envelope — ✅ PASS — Live test confirms `command: "proof health"`, `timestamp`, `results` (runs, trajectory, hot_modules, promotion_candidates, promotions), `meta`. proof.test.ts:1628-1642 covers this.

- [x] AC3: `work complete` displays fourth line when health changes — ⚠️ PARTIAL — The implementation at work.ts:1356-1360 is correct: checks `healthChange.changed && healthChange.details.length > 0` and prints `Health: {details}`. However, the test tagged for this AC (work.test.ts:2179) doesn't actually trigger the fourth line — it only asserts `Chain:` appears. The code path is correct but untested in an integration test that proves it works.

- [x] AC4: `work complete --json` includes quality in results — ✅ PASS — work.test.ts:2283-2302 verifies quality object with changed, trajectory, and triggers. work.ts:1340-1344 constructs the quality key correctly.

- [x] AC5: Empty chain outputs zeros and no errors — ✅ PASS — proof.test.ts:1608-1616 runs health on empty chain, asserts exitCode 0 and "0 runs". Live-verified: missing chain file returns "Proof Health: 0 runs / Trajectory: No data."

- [x] AC6: Pre-backfill data counted as unclassified — ✅ PASS — proofSummary.test.ts:2297-2323 creates findings without severity, verifies unclassified_count === 3 and risks_per_run_all computes on classified only. proofSummary.ts:754 checks `!f.severity` and increments unclassified counter.

- [x] AC7: Promotion effectiveness shows tracking/reduction — ✅ PASS — proofSummary.test.ts:2532-2599 covers tracking (< 5 entries), effective (100% reduction), and match_criteria. proofSummary.ts:921-968 implements the triple match.

- [x] AC8: Fourth line does NOT appear when nothing changed — ✅ PASS — work.test.ts:2265-2281 runs completeWork on fresh chain, asserts `not.toContain('Health:')`. Implementation at work.ts:1357 guards on `healthChange.changed`.

- [x] AC9: Trajectory counts per-entry not cumulative — ✅ PASS — proofSummary.test.ts:2258-2269: 2 entries × 2 risks = 2.0/run, not 4. proofSummary.ts:751-764 iterates entries and counts risks per entry.

- [x] AC10: Fewer than 10 entries → insufficient_data; fewer than 5 → last5 equals all — ✅ PASS — proofSummary.test.ts:2251-2256 (7 entries → insufficient_data), proofSummary.test.ts:2238-2249 (2 entries → last5 equals all at 1.5).

- [x] AC11: Hot module thresholds are named constants — ✅ PASS — proofSummary.ts:694-700 exports `MIN_FINDINGS_HOT = 3`, `MIN_ENTRIES_HOT = 2`, `TRAJECTORY_WINDOW = 5`, `MIN_ENTRIES_FOR_TREND = 10`. Tests import and verify values.

- [x] Tests pass — ✅ PASS — 1711 passed, 2 skipped (pre-existing). +54 new tests, no regressions.

- [x] No build errors — ✅ PASS — `pnpm run build` succeeds.

- [x] No lint errors — ✅ PASS — 0 errors, 14 warnings (all pre-existing, all in unrelated files).

## Blockers

A013 and A014 are UNSATISFIED. The tagged test at work.test.ts:2179 does not verify that the fourth health line appears. The chain setup produces an "improving" trend on both 10 and 11 entries, so `detectHealthChange` returns `changed: false` and the `Health:` line never renders. The test asserts `toContain('Chain:')` — the third line — not `toContain('Health:')` — the fourth.

The implementation code at work.ts:1356-1360 is correct. The test construction is the problem — it needs a chain where N entries produce one trend but N+1 entries produce a different trend (e.g., going from `insufficient_data` to `improving` at exactly the 10-entry boundary).

**Fix guidance:** Construct 9 entries where first 5 have high risks and last 4 have low risks. With 9 entries the trend is `insufficient_data`. When completeWork adds entry #10 (also low risk), the trend becomes `improving`. The `detectHealthChange` comparison between 10-entry (`improving`) and 9-entry (`insufficient_data`) chains produces different trends, triggering the fourth line.

## Findings

- **Test — A013/A014 sentinel test never triggers fourth line:** `packages/cli/tests/commands/work.test.ts:2262` — The test is tagged `@ana A013, A014` but asserts `toContain('Chain:')` not `toContain('Health:')`. The chain construction (5 high-risk + 5 low-risk entries) produces "improving" trend on both 10 and 11 entries, so the health change detection never fires. The test comment explicitly acknowledges this uncertainty: "If the chain comparison doesn't trigger... that's also valid." A test that passes when the feature is broken catches nothing.

- **Code — Hardcoded threshold in display string:** `packages/cli/src/commands/proof.ts:810` — `\`insufficient data (need ${10}+ runs)\`` uses literal `10` instead of the exported constant `MIN_ENTRIES_FOR_TREND`. If the threshold changes, the display message stays stale. Should import and use the constant.

- **Code — No summary truncation for promotion candidates:** `packages/cli/src/commands/proof.ts:844` — Finding summaries can be up to 1000 characters. The candidate display outputs the full summary with no truncation, which will break terminal formatting on long summaries. The hot module display at line 832 has a similar risk with file paths, but paths are bounded. Summaries are not.

- **Test — Promotion effectiveness only covers extremes:** `packages/cli/tests/utils/proofSummary.test.ts:2531` — Tests cover 0% reduction (every entry matches), 100% reduction (no matches), and tracking (< 5 entries). No test for intermediate reduction (e.g., 40%) or negative reduction (more matches than baseline). The reduction formula at proofSummary.ts:952 can produce negative percentages — `reductionPct = (1 - matchingFindings / expectedBaseline) * 100` — but no test exercises this path.

- **Code — Trajectory trend can be misleading with sparse classification:** Live test shows "worsening" on a chain with 0.1 risks/run all-time and 99 unclassified findings. The first-half vs second-half comparison is mathematically correct but operationally misleading when most data lacks classification. This is inherent to the algorithm, not a bug — but operators may misinterpret the label.

- **Upstream — Recovery path JSON lacks quality key:** `packages/cli/src/commands/work.ts:1109-1122` — Intentional per spec (recovery is not a new pipeline run), but JSON consumers cannot assume `quality` always exists in `work complete` output. Worth documenting as a contract caveat.

## Deployer Handoff

The implementation is solid — 54 new tests, clean code, correct architecture (pure computation in proofSummary.ts, formatting in proof.ts). The only blocker is two UNSATISFIED assertions (A013, A014) where the integration test doesn't actually verify the fourth health line appears. The fix is a test construction change, not a code change — the implementation at work.ts:1356-1360 is correct.

After the builder fixes the A013/A014 test (see fix guidance in Blockers), this is shippable. No regressions, no over-building, no architectural concerns.

## Verdict
**Shippable:** NO

2 of 40 contract assertions UNSATISFIED (A013, A014). The fourth health line implementation is correct but the test tagged for it is a sentinel that never triggers the code path. The builder needs to reconstruct the test chain so that the N-entry and (N+1)-entry chains produce different trends, causing `detectHealthChange` to fire and the `Health:` line to render.
