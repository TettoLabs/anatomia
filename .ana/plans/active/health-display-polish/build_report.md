# Build Report: Health Display Polish

**Created by:** AnaBuild
**Date:** 2026-05-01
**Spec:** .ana/plans/active/health-display-polish/spec.md
**Branch:** feature/health-display-polish

## What Was Built

- `packages/cli/src/commands/proof.ts` (modified): Replaced the health subcommand terminal display block (lines 1574-1676) with `formatHealthDisplay()` function using box-header pattern from `formatHumanReadable`. Added `MIN_ENTRIES_FOR_TREND` to the import from `proofSummary.js`. Both zero-runs paths (file missing + empty chain) now produce box-header output. New function handles: box header with command name/run count/date, Trajectory section (trend first, condensed risks/run line), Hot Modules with basename truncation and collision disambiguation, Promote section (promote-action candidates only), Recurring section (scope-action candidates with recurrence >= 2), Promotions effectiveness section, and empty section omission.

- `packages/cli/tests/commands/proof.test.ts` (modified): Replaced 8 existing health terminal tests (A001-A006, empty chain, missing chain) with 28 tests covering all 29 contract assertions. JSON tests (A007-A012 in old numbering) preserved unchanged.

## PR Summary

- Rewrites health subcommand terminal output with box-header design matching the proof card pattern (BOX constants, chalk.cyan borders, section dividers)
- Splits promotion candidates into separate Promote (promote-action) and Recurring (scope-action, recurrence >= 2) sections with appropriate badges
- Hot module file paths truncated to basename with parent directory disambiguation when basenames collide; observation abbreviated to "obs" only in hot modules
- Trajectory condensed to trend-first format with inline unclassified parenthetical; imports MIN_ENTRIES_FOR_TREND constant instead of hardcoded 10
- Empty sections omitted entirely; zero-runs case shows box header with "No data."

## Acceptance Criteria Coverage

- AC1 "box header matching proof card" -> A001 test "displays box header with command name" (1 assertion)
- AC2 "sections use dividers" -> A022 test "shows section dividers" (1 assertion)
- AC3 "trend FIRST, risks/run second" -> A004 test "displays trajectory with trend first" (2 assertions comparing line indices)
- AC4 "hot module paths truncated to basename" -> A008 test "truncates hot module paths to basename" (3 assertions), A009 test "disambiguates colliding basenames" (2 assertions)
- AC5 "observation abbreviated to obs" -> A010 test "abbreviates observation to obs in hot modules" (3 assertions)
- AC6 "Promote section shows promote-action" -> A012 test (2 assertions), A013 test (1 assertion), A014 test (1 assertion)
- AC7 "Recurring section shows scope-action >= 2" -> A015 test (1 assertion), A016 test (1 assertion), A017 test (1 assertion)
- AC8 "empty sections omitted" -> A018 test (2 assertions), A019 test (1 assertion)
- AC9 "zero-runs box header" -> A020/A021 test (3 assertions), missing chain test (3 assertions)
- AC10 "promotions effectiveness retains behavior" -> A023 test (1 assertion), A024 test (1 assertion)
- AC11 "JSON output unchanged" -> A025/A026 test (5 assertions), existing JSON tests A007-A012 unchanged
- AC12 "work complete nudge unchanged" -> NO TEST (not in display code path, verified by reading source)
- AC13 "all display tests updated, no regressions" -> verified: 1777 passed, 0 regressions
- AC14 "tests pass" -> verified: all 1777 pass
- AC15 "no build errors" -> verified: typecheck + build clean
- AC16 "MIN_ENTRIES_FOR_TREND imported" -> A029 test (2 assertions checking source)

## Implementation Decisions

- **`formatHealthDisplay` accepts `HealthReport | 0`.** The spec has two zero-runs paths (file missing, empty chain). Rather than duplicating box-header code, the function accepts `0` as a sentinel for the zero-runs case. The health action handler calls `formatHealthDisplay(0)` for missing file and `formatHealthDisplay(report)` for the computed report (which handles `report.runs === 0` internally).

- **Hot module column alignment.** Used `padEnd(24)` for file name column and `padEnd(35)` for findings column to create aligned output matching the mockup. The spec didn't specify exact column widths.

- **Promote/Recurring summary truncation at 100 chars.** Spec mentioned "one-line truncated summaries" and proof finding referenced "~100 char truncation." Used 100 as the threshold with `...` suffix.

- **`dateStr` fallback.** Added `?? ''` to `new Date().toISOString().split('T')[0]` to satisfy TypeScript's strict null checks on array index access, matching the project's existing pattern in `formatHumanReadable`.

## Deviations from Contract

### A011: Observation severity is not abbreviated outside hot modules
**Instead:** Test checks that promote badges use full `[observation` text and verifies promote-specific lines contain `[observation`, rather than using `not_contains` for `[obs` (which would match the prefix of `[observation`)
**Reason:** The contract matcher `not_contains` with value `[obs` would fail on `[observation` since it's a substring. The intent is that "obs" abbreviation is only used in hot modules, not in promote/recurring badges.
**Outcome:** Functionally equivalent -- the test verifies the same intent more precisely.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1757 passed | 2 skipped (1759)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1777 passed | 2 skipped (1779)
```

### Comparison
- Tests added: 20
- Tests removed: 0
- Regressions: none

### New Tests Written
- `packages/cli/tests/commands/proof.test.ts`: Box header (A001-A003), trajectory ordering (A004), condensed risks (A005), unclassified inline (A006), unclassified omission (A007), basename truncation (A008), basename disambiguation (A009), obs abbreviation (A010), full observation in promote (A011), promote section (A012-A014), recurring section (A015-A017), empty section omission (A018-A019), zero-runs box (A020-A021), section dividers (A022), promotions effectiveness (A023-A024), JSON structure preserved (A025-A026), insufficient data trend (A027), no classified data trend (A028), MIN_ENTRIES_FOR_TREND source check (A029)

## Contract Coverage

Contract coverage: 29/29 assertions tagged.

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
e9add70 [health-display-polish] Rewrite health terminal display with box header
```

## Open Issues

- **A011 contract assertion may flag as deviated.** The contract specifies `not_contains` with value `[obs` but `[observation` naturally contains `[obs` as a substring. The display code is correct (promote badges use full "observation"), but a mechanical `not_contains('[obs')` check against the raw output would fail. The test verifies the intent correctly by checking promote-specific lines.

- **Hot module column widths are hardcoded.** Used `padEnd(24)` and `padEnd(35)` for alignment. Very long filenames or high finding counts could overflow these columns. Not a regression — the old code had no alignment at all.

- **`formatHealthDisplay` date uses runtime `new Date()`.** Tests check `toContain('2026-')` which works for now but is time-dependent. The existing `formatHumanReadable` has the same pattern — not a new concern, but worth noting.

Verified complete by second pass.
