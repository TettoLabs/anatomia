# Verify Report: Health Stats Polish

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-02
**Spec:** .ana/plans/active/proof-health-v2/spec-1.md
**Branch:** feature/proof-health-v2

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/proof-health-v2/contract.yaml
  Seal: INTACT (hash sha256:793cfcd0e7a8ae5e75e9622366e70c0fef3e4587ba16af2ac3a78111a0a7775a)
```

Tests: 1773 passed, 0 failed, 2 skipped (93 test files). Build: clean (cached). Lint: 0 errors, 14 warnings (all pre-existing `@typescript-eslint/no-explicit-any` in `ai-sdk-detection.test.ts`).

## Contract Compliance
| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Quality section replaces the old Trajectory heading | ✅ SATISFIED | `proof.test.ts:2408-2418`, test "displays Quality section header" asserts `stdout.toContain('Quality')`. Source confirmed at `proof.ts:268` — `chalk.bold('  Quality')` |
| A002 | Hot Spots section replaces the old Hot Modules heading | ✅ SATISFIED | `proof.test.ts:2420-2431`, test "displays Hot Spots section header" asserts `stdout.toContain('Hot Spots')`. Source confirmed at `proof.ts:325` — `chalk.bold('  Hot Spots')` |
| A003 | Promote and Recurring sections are merged into Next Actions | ✅ SATISFIED | `proof.test.ts:2075-2085`, test "shows Next Actions for promote-action candidates" asserts `stdout.toContain('Next Actions')` and `stdout.toContain('Promote:')`. Source `proof.ts:346-392` merges both into single section |
| A004 | Old Promote section heading no longer appears | ✅ SATISFIED | `proof.test.ts:2150-2167`, test checks `lines.find(l => l.trim() === 'Promote')` is undefined. Source grep confirms no `chalk.bold('  Promote')` in formatHealthDisplay |
| A005 | Old Recurring section heading no longer appears | ✅ SATISFIED | `proof.test.ts:2150-2167`, same test checks `lines.find(l => l.trim() === 'Recurring')` is undefined. Source grep confirms no `chalk.bold('  Recurring')` in formatHealthDisplay |
| A006 | Verification section shows first-pass rate as a percentage | ✅ SATISFIED | `proof.test.ts:2433-2451`, test asserts `stdout.toContain('First-pass:')`, `toContain('60%')`, and `toContain('3 of 5')`. Source at `proof.ts:297` formats `First-pass:  {pct}% ({count} of {total})` |
| A007 | Verification section shows total issues caught before shipping | ✅ SATISFIED | `proof.test.ts:2453-2468`, test asserts `stdout.toContain('2 issues before shipping')`. Source at `proof.ts:298` formats `Caught:      {n} issues before shipping` |
| A008 | A project with zero rejections shows 100% first-pass rate | ✅ SATISFIED | `proof.test.ts:2470-2482`, test with 5 entries and no rejection_cycles asserts `stdout.toContain('100%')`, `toContain('5 of 5')`, and `toContain('0 issues before shipping')` |
| A009 | Pipeline section shows median total time | ✅ SATISFIED | `proof.test.ts:2484-2506`, test with 5 timed entries asserts `stdout.toContain('Median:')`. Source at `proof.ts:312` formats `Median:  {total}m{breakdown}` |
| A010 | Pipeline section shows phase breakdown with scope label | ✅ SATISFIED | `proof.test.ts:2484-2506`, same test asserts `stdout.toContain('scope')`, `toContain('build')`, `toContain('verify')`. Source at `proof.ts:308` builds breakdown with `scope {n}m` label |
| A011 | Pipeline section is omitted when fewer than 3 entries have timing | ✅ SATISFIED | `proof.test.ts:2508-2522`, test with 2 timed entries asserts `stdout.not.toContain('Median:')` and `not.toContain('Pipeline')`. Source: `computePipelineStats` returns null when `validEntries.length < 3` (proofSummary.ts:946) |
| A012 | Unclassified count parenthetical is removed from Quality section | ✅ SATISFIED | `proof.test.ts:1976-1999`, test creates entries with unclassified findings and asserts `stdout.not.toContain('unclassified excluded')`. Source diff confirms removal of `(${...} unclassified excluded)` from risksLine |
| A013 | Promotions effectiveness section is hidden from terminal output | ✅ SATISFIED | `proof.test.ts:2266-2288`, test with promoted findings asserts `lines.find(l => l.trim() === 'Promotions')` is undefined. Source grep confirms no `chalk.bold('  Promotions')` in formatHealthDisplay |
| A014 | Next Actions items are capped at 5 | ✅ SATISFIED | `proof.test.ts:2524-2549`, test creates 8 promote candidates, asserts `promoteLines.length` ≤ 5. Source at `proof.ts:347-382` uses `MAX_NEXT_ACTIONS = 5` and `nextActions.slice(0, MAX_NEXT_ACTIONS)`. Assertion is weak (`toBeLessThanOrEqual` not `toBe`) but functionally correct given 8-candidate fixture guarantees cap is reached. See findings. |

## Independent Findings

**Prediction resolution:**
1. **Cap boundary condition (predicted):** Not confirmed — `MAX_NEXT_ACTIONS = 5` with `.slice(0, MAX_NEXT_ACTIONS)` is clean. Both promote and recurring feed the same array before capping.
2. **Pipeline off-by-one (predicted):** Not confirmed — `validEntries.length < MIN_PIPELINE_ENTRIES` (3) is correct. Tests verify both 2 entries (omitted) and 5 entries (shown).
3. **Division-by-zero (predicted):** Not confirmed — `computeFirstPassRate` handles 0 entries: `totalRuns > 0 ? Math.round(...) : 100`. Returns 100% for empty, which is the correct sentinel.
4. **Weak not_contains tests (predicted):** Partially confirmed — A004/A005 test uses `lines.find(l => l.trim() === 'Promote')` which is a strong exact-match test, better than `not.toContain`. But A012 uses `not.toContain('unclassified excluded')` which is adequate since the specific phrase is what was removed.
5. **Test count shortfall (predicted):** Confirmed — 11 new tests vs ~18 expected. The integration tests cover most edge cases but there are no standalone unit tests for the new computation functions. See findings.

**Surprise:** The zero-run JSON path at `proof.ts:1749` hardcodes `verification` defaults inline rather than calling `computeFirstPassRate([])`. This creates duplicate knowledge of the default shape.

## AC Walkthrough

- AC1: Health display section "Trajectory" is renamed to "Quality" — ✅ PASS — Source at `proof.ts:268` shows `chalk.bold('  Quality')`, old `Trajectory` string only in comments.
- AC2: Health display section "Hot Modules" is renamed to "Hot Spots" — ✅ PASS — Source at `proof.ts:325` shows `chalk.bold('  Hot Spots')`, old `Hot Modules` string only in comments.
- AC3: "Recurring" and "Promote" sections are merged into "Next Actions" — ✅ PASS — Source `proof.ts:346-392`, single `Next Actions` section gathers both promote and recurring candidates, sorts by recurrence count, caps at 5.
- AC4: "Verification" section shows first-pass rate and total issues caught — ✅ PASS — Source `proof.ts:291-299`. `computeFirstPassRate` at `proofSummary.ts:898-922` reads `rejection_cycles` and `previous_failures`. Display shows `First-pass: {pct}% ({count} of {total})` and `Caught: {n} issues before shipping`.
- AC5: "Pipeline" section shows median total time with phase breakdown — ✅ PASS — Source `proof.ts:301-313`. `computePipelineStats` at `proofSummary.ts:931-962` computes floor medians. Display shows `Median: {total}m (scope {n}m · build {n}m · verify {n}m)`.
- AC6: `(N unclassified excluded)` parenthetical is removed from Quality section — ✅ PASS — Git diff confirms removal of conditional `unclassified excluded` append from risksLine.
- AC7: Promotion Effectiveness section does not appear on default output — ✅ PASS — Old `chalk.bold('  Promotions')` section completely removed from `formatHealthDisplay`. Grep confirms no Promotions heading.
- AC8: `--json` output structure is unchanged (new fields additive) — ✅ PASS — Test at `proof.test.ts:2301-2316` verifies existing JSON fields (`trajectory`, `hot_modules`, `promotion_candidates`, `promotions`) still present. Test at `proof.test.ts:2585-2605` verifies new `verification` and `pipeline` fields are additive.
- Tests pass with `(cd packages/cli && pnpm vitest run)` — ✅ PASS — 1773 passed, 0 failed, 2 skipped.
- No build errors with `pnpm run build` — ✅ PASS — Build clean (cached).

## Blockers

None. All 14 phase-1 contract assertions satisfied. All 10 ACs pass. No test regressions (1773 passed vs 1762 baseline — 11 new tests, 0 lost). No unused exports in new functions besides `computeFirstPassRate` (noted in findings). Checked: no unhandled error paths in new code (the `if (report.verification)` and `if (report.pipeline)` guards handle undefined cleanly), no assumptions about external state, no dead code blocks in new sections.

## Findings

- **Test — A014 cap assertion is weak:** `packages/cli/tests/commands/proof.test.ts:2548` — uses `toBeLessThanOrEqual(5)` when the fixture produces exactly 8 candidates, so `toBe(5)` would be correct and stronger. `toBeLessThanOrEqual(5)` passes even if zero items are rendered. Not a blocker — the fixture guarantees cap is hit, but the assertion doesn't prove it.

- **Code — computeFirstPassRate exported unnecessarily:** `packages/cli/src/utils/proofSummary.ts:898` — exported but only called by `computeHealthReport` in the same file. No external consumers. Unnecessary export surface.

- **Test — No direct unit tests for new computation functions:** `packages/cli/tests/commands/proof.test.ts` — `computeFirstPassRate` and `computePipelineStats` are tested only through integration (full `runProof(['health'])` invocations). Direct unit tests would catch edge cases faster — e.g., what happens when all entries have `rejection_cycles: undefined` vs `0` (both treated as first-pass, which is correct, but untested explicitly).

- **Code — think→scope naming indirection in computePipelineStats:** `packages/cli/src/utils/proofSummary.ts:951` — `timing.think ?? timing.scope` maps to `median_scope` in PipelineStats, displayed as "scope" in terminal. The field aliasing is intentional per spec (scope phase was previously called think in timing), but the indirection may confuse future maintainers unfamiliar with the history.

- **Upstream — Spec predicted ~18 new tests, got ~11:** Spec said "expected ~1780+ tests" but actual is 1773. The builder combined multiple assertions per test (e.g., A004+A005 in one test, A009+A010 in one test) which is efficient but means fewer test functions than predicted. Not a quality concern — assertion coverage is adequate.

- **Code — Zero-run JSON path duplicates verification defaults:** `packages/cli/src/commands/proof.ts:1749` — hardcodes `{ first_pass_count: 0, total_runs: 0, first_pass_pct: 100, total_caught: 0 }` inline instead of calling `computeFirstPassRate([])` which returns the same shape. Duplicate knowledge of the default. Also notably omits `pipeline` field from the zero-run JSON, while `computeHealthReport` with empty entries also returns `pipeline: undefined` — consistent but the missing field in the inline default is asymmetric with `verification` being present.

## Deployer Handoff

Phase 1 of 3. Display-only changes + new computation functions. No data model migration needed. `--json` output is backward-compatible (additive fields only). The `verification` and `pipeline` fields appear in `--json` when data exists; `pipeline` is absent when fewer than 3 entries have timing data.

Existing consumers of `HealthReport` type may need to handle the new optional `verification` and `pipeline` fields if they destructure the type. The fields are optional (`?:`) so no breaking change.

Two phases remain (Timing Fix and Guard Proof Chain Entry). Do not merge until all three phases are verified.

## Verdict
**Shippable:** YES

All 14 phase-1 contract assertions SATISFIED. All 10 acceptance criteria PASS. Tests green (1773 passed, +11 from baseline). Build and lint clean. The findings are minor — weak test assertion, unnecessary export, duplicate defaults — none justify FAIL. Implementation matches the spec's output mockups for section naming, ordering, and edge case handling.
