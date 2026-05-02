# Build Report: Audit JSON Severity Summary

**Created by:** AnaBuild
**Date:** 2026-05-02
**Spec:** .ana/plans/active/audit-json-severity-summary/spec.md
**Branch:** feature/audit-json-severity-summary

## What Was Built

- `packages/cli/src/commands/proof.ts` (modified): Hoisted severity/action counting loop above the `if (useJson)` fork so both JSON and terminal branches share the same computed counts. Added `by_severity` and `by_action` objects to the main JSON result construction. Added all-zero `by_severity` and `by_action` to the zero-findings early return JSON path. Changed the action counting to map `'—'` to `'unclassified'` (previously `'—'` actions were simply not counted). Added `key !== 'unclassified'` guard to the terminal's unknown-action display loop to prevent `'unclassified'` from appearing in terminal output.
- `packages/cli/tests/commands/proof.test.ts` (modified): Replaced the `@ana A010` test (asserting `severity_summary`/`action_summary` are undefined) with 7 new test blocks covering: by_severity/by_action with correct counts, active-only counting, --full flag, meta block unchanged, zero-findings path, all-unclassified findings, and terminal output unchanged.

## PR Summary

- Add `by_severity` and `by_action` summary objects to `ana proof audit --json` output, computed from active findings only
- Both JSON output paths (zero-findings early return and main result) include the new fields
- Terminal output is character-identical — the hoisted counting is shared but display logic unchanged
- Old field names (`severity_summary`, `action_summary`) remain absent — the new fields use `by_severity`/`by_action` matching the `ChainHealth` shape
- 6 new tests added, 1 replaced; full suite green at 1804 passed

## Acceptance Criteria Coverage

- AC1 "by_severity in JSON" → proof.test.ts "audit JSON includes by_severity counts" (4 assertions on risk/debt/observation/unclassified)
- AC2 "by_action in JSON" → proof.test.ts "audit JSON includes by_severity counts" (5 assertions on promote/scope/monitor/accept/unclassified)
- AC3 "counts match active-only" → proof.test.ts "by_severity counts match active findings only" (5 assertions comparing createAuditChain distribution)
- AC4 "--full includes summary" → proof.test.ts "audit --json --full includes summary fields" (3 assertions)
- AC5 "terminal unchanged" → proof.test.ts "terminal output is unchanged" (6 assertions on terminal content)
- AC6 "meta block unchanged" → proof.test.ts "meta block is unchanged" (2 assertions on meta.findings)
- AC7 "existing tests pass" → ✅ all 200 proof tests pass, no regressions

## Implementation Decisions

- **Action counting change:** The old code skipped `'—'` actions entirely (`if (f.suggested_action !== '—')`). The new code maps `'—'` to `'unclassified'` for both severity and action, which is needed for JSON output. To prevent terminal display regression, added `key !== 'unclassified'` guard in the unknown-action display loop (the old behavior was equivalent since unclassified actions were never in the map).
- **Single commit:** All changes are one logical unit — the production code and its tests are inseparable.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
cd packages/cli && pnpm vitest run
Test Files  93 passed (93)
     Tests  1798 passed | 2 skipped (1800)
```

### After Changes
```
cd packages/cli && pnpm vitest run
Test Files  93 passed (93)
     Tests  1804 passed | 2 skipped (1806)
```

### Comparison
- Tests added: 7 (6 new test blocks + 1 replacement that expanded from 2 to 11 assertions)
- Tests removed: 1 (old A010 test replaced)
- Net new: +6
- Regressions: none

### New Tests Written
- `proof.test.ts`: "audit JSON includes by_severity counts" — verifies both summary objects with exact counts for a 5-finding chain with known severity/action distribution
- `proof.test.ts`: "by_severity counts match active findings only" — uses createAuditChain(5,2) to verify counts match the helper's i%3 distribution
- `proof.test.ts`: "audit --json --full includes summary fields" — verifies --full flag includes by_severity and by_action
- `proof.test.ts`: "meta block is unchanged" — verifies meta.findings.by_severity and by_action still exist
- `proof.test.ts`: "zero findings includes all-zero by_severity" — uses closed-only findings to trigger zero path, verifies all-zero objects
- `proof.test.ts`: "all-unclassified findings counted correctly" — uses '—' severity/action, verifies unclassified counts
- `proof.test.ts`: "terminal output is unchanged" — verifies terminal format with known findings

## Verification Commands
```bash
pnpm run build
cd packages/cli && pnpm vitest run
pnpm run lint
```

## Git History
```
6d14c34 [audit-json-severity-summary] Add by_severity and by_action to audit JSON output
```

## Open Issues

- The terminal unknown-action display loop now has an explicit `key !== 'unclassified'` guard. If a future change adds other sentinel values besides `'—'`, they'd need similar handling. Low risk — the sentinel pattern is stable.

Verified complete by second pass.
