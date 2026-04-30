# Verify Report: Proof Health V1

**Result:** PASS
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
| A013 | Work complete shows a health line when trajectory changes | ✅ SATISFIED | work.test.ts:2233, asserts `output.toContain('Health:')`. Chain: 10 entries × 2 risks (stable) → completeWork adds #11 with 0 risks → improving. `detectHealthChange` sees stable→improving → fires. |
| A014 | The health line describes what changed | ✅ SATISFIED | work.test.ts:2234, asserts `output.toContain('trend')`. Details string is `"trend improved (risks/run 2.0 → ...)"` which contains "trend". |
| A015 | Work complete JSON includes quality data | ✅ SATISFIED | work.test.ts:2269, asserts json.results.quality toBeDefined |
| A016 | Quality data indicates whether a change was detected | ✅ SATISFIED | work.test.ts:2270-2271, asserts quality.changed toBeDefined and typeof === 'boolean' |
| A017 | Quality data includes the trajectory snapshot | ✅ SATISFIED | work.test.ts:2272, asserts quality.trajectory toBeDefined |
| A018 | Quality data lists which triggers fired | ✅ SATISFIED | work.test.ts:2273-2274, asserts quality.triggers toBeDefined and isArray |
| A019 | Health command works with an empty proof chain | ✅ SATISFIED | proof.test.ts:1613, asserts exitCode === 0 on empty chain |
| A020 | Empty chain shows zero runs | ✅ SATISFIED | proof.test.ts:1615, asserts stdout contains '0 runs' |
| A021 | Findings without severity are counted as unclassified | ✅ SATISFIED | proofSummary.test.ts:2320, asserts unclassified_count === 3 |
| A022 | Trajectory computes risks per run on classified findings only | ✅ SATISFIED | proofSummary.test.ts:2322, asserts risks_per_run_all === 1.0 with 3 unclassified excluded |
| A023 | Promotions with insufficient data show tracking status | ✅ SATISFIED | proofSummary.test.ts:2548, asserts promotions[0].status === 'tracking' |
| A024 | Promotions with enough data show reduction percentage | ✅ SATISFIED | proofSummary.test.ts:2569, asserts promotions[0].reduction_pct === 100 |
| A025 | With no promoted findings the promotions section is empty | ✅ SATISFIED | proofSummary.test.ts:2527, asserts promotions toEqual([]) |
| A026 | Work complete does not show a health line when nothing changed | ✅ SATISFIED | work.test.ts:2252, asserts output not.toContain('Health:') on fresh single-entry completion |
| A027 | Each entry's risk count is only the risks in that entry's findings | ✅ SATISFIED | proofSummary.test.ts:2268, asserts risks_per_run_all === 2.0 for 2 entries each with 2 risks |
| A028 | With fewer than ten entries the trend reports insufficient data | ✅ SATISFIED | proofSummary.test.ts:2255, asserts trend === 'insufficient_data' for 7 entries |
| A029 | With fewer than five entries the recent window equals lifetime | ✅ SATISFIED | proofSummary.test.ts:2247, asserts risks_per_run_last5 === 1.5 for 2 entries |
| A030 | With fewer than five entries the lifetime average matches | ✅ SATISFIED | proofSummary.test.ts:2248, asserts risks_per_run_all === 1.5 for 2 entries |
| A031 | Hot module threshold for finding count is a named constant | ✅ SATISFIED | proofSummary.test.ts:2605, imports MIN_FINDINGS_HOT and asserts === 3 |
| A032 | Hot module threshold for entry count is a named constant | ✅ SATISFIED | proofSummary.test.ts:2610, imports MIN_ENTRIES_HOT and asserts === 2 |
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

1. **Builder only changed the test — CONFIRMED.** No implementation code changes between builds. The fix was purely test construction — replacing 5-high/5-low entries (improving→improving, no change) with 10 equal entries (stable→improving on add, change detected). Correct approach.

2. **Chain not properly committed — NOT FOUND.** Lines 2216-2220 show proper git add/commit/checkout/merge sequence before `completeWork` runs.

3. **Console.log race condition — NOT FOUND.** Synchronous capture pattern (lines 2222-2228) is reliable — `completeWork` is awaited, console.log is replaced before the call and restored after.

4. **Other triggers fire — NOT FOUND.** Each entry uses unique file paths (`src/file${i}-${j}.ts`) with `suggested_action: monitor`. No file reaches MIN_FINDINGS_HOT=3. No promote candidates. Only trend trigger fires.

5. **Details string contains "trend" — CONFIRMED correct.** `detectHealthChange` at proofSummary.ts:1027 produces `"trend improved (risks/run 2.0 → ...)"` which contains "trend".

**Surprise finding:** The `detectHealthChange` unit test at proofSummary.test.ts:2644 ("detects trend improvement") has a conditional assertion — `if (change.changed) { expect... }`. The chain construction (5×4 risks + 6×1 risk = 11 entries) produces `improving` on both 10 and 11 entries, so `change.changed` is false and the inner expect never runs. The test passes vacuously. This is the same pattern that caused the original A013/A014 failure — the fix at the integration level was good, but the unit test still has the problem. Not a blocker: it's not tagged for any contract assertion and the integration test (work.test.ts:2179) properly validates the behavior.

**No over-building found.** Verified all exported functions from new code are imported elsewhere. `MIN_ENTRIES_FOR_EFFECTIVENESS` is correctly non-exported. No dead code blocks in new functions — every `if`, `for`, and `switch` has a purpose.

## Previous Findings Resolution

### Previously UNSATISFIED Assertions
| ID | Previous Issue | Current Status | Resolution |
|----|----------------|----------------|------------|
| A013 | Test asserted `toContain('Chain:')` not `toContain('Health:')`. Chain setup (5 high + 5 low) produced improving on both 10 and 11 entries — `detectHealthChange` never fired. | ✅ SATISFIED | Builder rebuilt chain: 10 entries × 2 risks (stable). Entry #11 with 0 risks → improving. stable→improving triggers the fourth line. Test now asserts `toContain('Health:')`. |
| A014 | Same test — asserted `toContain('Chain:')` not `toContain('trend')`. Fourth line never rendered. | ✅ SATISFIED | Same fix. Test now asserts `toContain('trend')`. Details string contains "trend improved (risks/run ...)". |

### Previous Findings
| Finding | Status | Notes |
|---------|--------|-------|
| A013/A014 sentinel test never triggers fourth line | Fixed | Builder reconstructed chain to produce stable→improving boundary. Integration test now verifies `Health:` and `trend` appear. |
| Hardcoded threshold in display string (proof.ts:810) | Still present | `${10}` instead of `MIN_ENTRIES_FOR_TREND`. Not a blocker — debt item. |
| No summary truncation for promotion candidates (proof.ts:844) | Still present | Long summaries render untruncated. Observation — no crash risk. |
| Promotion effectiveness only covers extremes | Still present | No intermediate (40%) or negative reduction test. Observation. |
| Trajectory trend misleading with sparse classification | Still present | Algorithm correct, label potentially misleading. Observation. |
| Recovery path JSON lacks quality key | No longer applicable | Intentional per spec — recovery is not a new pipeline run. Removed from findings as it's documented design. |
| Upstream — contract A013/A014 chain construction non-obvious | No longer applicable | Builder solved the construction problem. |

## AC Walkthrough

- AC1: `ana proof health` displays trajectory, hot modules, promotion candidates — ✅ PASS — Verified via test suite (proof.test.ts:1540-1606) and prior live test on 28-run chain. Terminal output shows all sections per spec mockup.

- AC2: `ana proof health --json` outputs four-key envelope — ✅ PASS — proof.test.ts:1628-1693 verifies `command: "proof health"`, timestamp, results (runs, trajectory, hot_modules, promotion_candidates, promotions), meta.

- AC3: `work complete` displays fourth line when health changes — ✅ PASS — work.test.ts:2179-2235 constructs a chain that triggers stable→improving transition. Test asserts `toContain('Health:')` and `toContain('trend')`. Implementation at work.ts:1356-1360 correctly guards on `healthChange.changed && healthChange.details.length > 0`.

- AC4: `work complete --json` includes quality in results — ✅ PASS — work.test.ts:2256-2275 verifies quality object with changed, trajectory, and triggers. work.ts constructs quality key correctly.

- AC5: Empty chain outputs zeros and no errors — ✅ PASS — proof.test.ts:1608-1616 asserts exitCode 0 and "0 runs".

- AC6: Pre-backfill data counted as unclassified — ✅ PASS — proofSummary.test.ts:2297-2323 creates findings without severity, verifies unclassified_count === 3 and risks_per_run_all computed on classified only.

- AC7: Promotion effectiveness shows tracking/reduction — ✅ PASS — proofSummary.test.ts:2532-2599 covers tracking (< 5 entries), effective (100% reduction), and match_criteria.

- AC8: Fourth line does NOT appear when nothing changed — ✅ PASS — work.test.ts:2238-2253 asserts `not.toContain('Health:')` on fresh single-entry completion.

- AC9: Trajectory counts per-entry not cumulative — ✅ PASS — proofSummary.test.ts:2258-2269: 2 entries × 2 risks = 2.0/run.

- AC10: Fewer than 10 → insufficient_data; fewer than 5 → last5 equals all — ✅ PASS — proofSummary.test.ts:2251-2256 and 2238-2249.

- AC11: Hot module thresholds are named constants — ✅ PASS — proofSummary.ts:694-700 exports `MIN_FINDINGS_HOT = 3`, `MIN_ENTRIES_HOT = 2`. Tests import and verify values.

- Tests pass — ✅ PASS — 1711 passed, 2 skipped. +54 new, no regressions.

- No build errors — ✅ PASS — `pnpm run build` succeeds.

- No lint errors — ✅ PASS — 0 errors, 14 warnings (all pre-existing).

## Blockers

No blockers. All 40 contract assertions SATISFIED. All 13 ACs pass. No regressions. Checked for: unused exports in new code (none — `MIN_ENTRIES_FOR_EFFECTIVENESS` correctly non-exported), unused parameters in new functions (none), error paths that swallow silently (none — `computeHealthReport` returns safe defaults for empty/missing data), sentinel test patterns (one found in unit tests but not tagged for contract assertions — documented in Findings).

## Findings

- **Code — Hardcoded threshold in display string:** `packages/cli/src/commands/proof.ts:810` — uses `${10}` instead of importing `MIN_ENTRIES_FOR_TREND` from proofSummary.ts. If the threshold changes, the display message stays stale while the computation uses the new value. Drift risk.

- **Test — Conditional assertion in detectHealthChange unit test:** `packages/cli/tests/utils/proofSummary.test.ts:2662` — `if (change.changed) { expect(change.triggers).toContain('trend_improved'); }`. The chain construction (5×4 risks + 6×1 risk) produces `improving` on both 10 and 11 entries, so `change.changed` is false and the inner expect never runs. Test passes vacuously. Same pattern that caused the original A013/A014 failure — fixed at the integration level but the unit test still has the problem. Should either reconstruct the chain or unconditionally assert `change.changed === true`.

- **Code — No summary truncation for promotion candidates:** `packages/cli/src/commands/proof.ts:844` — Finding summaries can be up to 1000 characters. Candidate display outputs the full summary with no truncation, which will break terminal formatting on long summaries.

- **Test — Promotion effectiveness only covers extremes:** `packages/cli/tests/utils/proofSummary.test.ts:2531` — Tests cover 0% reduction (every entry matches), 100% reduction (no matches), and tracking (< 5 entries). No test for intermediate reduction (e.g., 40%) or negative reduction. The reduction formula at proofSummary.ts:952 can produce negative percentages but no test exercises this.

- **Code — Trajectory trend label misleading with sparse classification:** `packages/cli/src/utils/proofSummary.ts:790` — A chain with 0.1 risks/run all-time and 99 unclassified findings can show "worsening" if the few classified risks are back-loaded. Mathematically correct but operationally misleading. Inherent to the algorithm — noted for future consideration.

## Deployer Handoff

Feature is solid — 54 new tests, clean computation/display separation, correct architecture. The A013/A014 fix was surgical: test chain reconstruction only, no implementation changes needed. The builder correctly identified the boundary condition (stable→improving at 10→11 entries).

Two items to be aware of:
1. The `detectHealthChange` unit test at proofSummary.test.ts:2644 has a vacuous conditional assertion (same pattern as the original A013/A014 bug). Not blocking because the integration test covers the behavior, but should be fixed in a future cleanup pass.
2. Hardcoded `10` at proof.ts:810 should use `MIN_ENTRIES_FOR_TREND` constant — minor drift risk if threshold changes.

## Verdict
**Shippable:** YES

40/40 contract assertions SATISFIED. 13/13 ACs pass. 1711 tests pass, no regressions, no build or lint errors. Previous blockers (A013/A014) fully resolved — the builder reconstructed the test chain to produce a stable→improving boundary that triggers the fourth health line. Implementation was already correct; the fix was test construction only.
