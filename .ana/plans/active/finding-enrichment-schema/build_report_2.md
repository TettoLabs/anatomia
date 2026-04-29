# Build Report: Finding Enrichment Schema — Phase 2

**Created by:** AnaBuild
**Date:** 2026-04-29
**Spec:** .ana/plans/active/finding-enrichment-schema/spec-2.md
**Branch:** feature/finding-enrichment-schema

## What Was Built

- `packages/cli/src/utils/proofSummary.ts` (modified): Expanded `ChainHealth` interface with `by_severity` and `by_action` breakdowns. Added severity/action counting inside the existing findings loop in `computeChainHealth`. Widened structural type parameters on `wrapJsonResponse` and `wrapJsonError` to include `severity?` and `suggested_action?`. Updated the null-chain fallback in `wrapJsonError` to include the new breakdown fields with zeros.
- `packages/cli/src/commands/proof.ts` (modified): Added `suggested_action` field to audit finding type and construction (mirrors `severity` pattern). Added `SEVERITY_WEIGHT` map and sort within file groups (risk=0, debt=1, observation=2, unclassified=3). Changed display line from `severity: ${f.severity}` to `[severity · action]` badge format and replaced severity metadata with `from: ${f.entry_feature}`.
- `packages/cli/tests/utils/proofSummary.test.ts` (modified): Added 8 tests for `computeChainHealth`: mixed severity counts, mixed action counts, unclassified fallback (severity), unclassified fallback (action), empty chain, entries with no findings, existing status counts preserved, multi-entry counting.
- `packages/cli/tests/commands/proof.test.ts` (modified): Updated `createAuditChain` fixture to include `suggested_action`. Added 3 tests: audit JSON includes `suggested_action`, human-readable shows `[severity · action]` badges, severity sort order within file groups.

## PR Summary

- Expand `computeChainHealth` to return `by_severity` and `by_action` breakdowns in every `--json` meta block
- Add `[severity · action]` badges to human-readable audit display, replacing the severity-only metadata line
- Sort findings within each file group by severity (risk first) for faster triage
- Add `suggested_action` field to audit JSON output for downstream consumers
- 11 new tests covering health breakdowns and audit display changes

## Acceptance Criteria Coverage

- AC15 `computeChainHealth` returns `by_severity` and `by_action` → proofSummary.test.ts "returns by_severity with correct counts" + "returns by_action with correct counts" (2 tests, 2 assertions each) ✅
- AC16 `ChainHealth` interface includes `by_severity` and `by_action` → TypeScript compilation passes with the expanded interface ✅
- AC17 Every `--json` meta block includes severity and action breakdowns → proofSummary.test.ts "preserves existing status counts alongside new breakdowns" verifies structure; wrapJsonResponse/wrapJsonError pass through computeChainHealth ✅
- AC22 Audit display shows `[severity · action]` badges, sorted by severity → proof.test.ts "shows [severity · action] badge on each finding" + "risk findings appear before observation within same file" (2 tests) ✅
- AC23 Audit `--json` output includes `suggested_action` → proof.test.ts "each finding in JSON output has suggested_action field" (1 test) ✅
- AC28 Tests pass → 1623 passed, 0 failed ✅
- AC29 Lint passes → 0 errors, 14 warnings (all pre-existing `@typescript-eslint/no-explicit-any` in unrelated files) ✅

## Implementation Decisions

- **`SEVERITY_WEIGHT` as inline const, not module-level constant.** The weight map is only used in the audit command handler scope. Kept it local to avoid polluting the module namespace. Used `Record<string, number>` for the type — simple and clear.
- **Display line replaced `severity: ${f.severity}` with `from: ${f.entry_feature}`.** The spec mockup shows `from:` in the metadata line where `severity:` used to be. Severity info is now in the badge, so the metadata line shows the entry feature name instead — more useful context.
- **Sorting applied after file-count sort, before MAX_PER_FILE slice.** This ensures the most severe findings are shown when overflow truncation kicks in.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  97 passed (97)
     Tests  1612 passed | 2 skipped (1614)
  Duration  17.50s
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  97 passed (97)
     Tests  1623 passed | 2 skipped (1625)
  Duration  17.31s
```

### Comparison
- Tests added: 11
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/utils/proofSummary.test.ts`: 8 tests in `describe('computeChainHealth')` — mixed severity, mixed action, unclassified fallback ×2, empty chain, no findings, status+breakdown coexistence, multi-entry
- `tests/commands/proof.test.ts`: 3 tests — audit JSON `suggested_action`, badge display format, severity sort order

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
f087178 [finding-enrichment-schema:s2] Add audit badges, severity sort, and suggested_action
f2c3a15 [finding-enrichment-schema:s2] Expand computeChainHealth with severity and action breakdowns
3ea836c [finding-enrichment-schema] Verify report 1
455b3bd [finding-enrichment-schema] Build report 1
dff2ed2 [finding-enrichment-schema:s1] Update test fixtures and add validation tests
eeab129 [finding-enrichment-schema:s1] Update agent templates with new taxonomy
3721aaf [finding-enrichment-schema:s1] Add severity migration and schema versioning
a51b8c6 [finding-enrichment-schema:s1] Update save validation for new taxonomy
214c415 [finding-enrichment-schema:s1] Tighten union types and add enrichment fields
```

## Open Issues

- **Audit severity sort not applied to JSON output.** The sort-by-severity within file groups is applied to `sortedFiles` in-place before both human-readable and JSON rendering. JSON consumers get the sorted order too — this is consistent but undocumented in the spec. Downstream JSON consumers that relied on chain-insertion order will see a different sequence.

Verified complete by second pass.
