# Build Report: Proof Command UX

**Created by:** AnaBuild
**Date:** 2026-04-30
**Spec:** .ana/plans/active/proof-command-ux/spec.md
**Branch:** feature/proof-command-ux

## What Was Built

- `packages/cli/src/commands/proof.ts` (modified): Inserted severity breakdown line (`N risk · N debt · N observation`) and action breakdown line (`N promote · N scope · N monitor · N accept (closeable)`) between the audit header and blank separator. Counts active findings only via a `Record<string, number>` counter. Handles unclassified severity (`'—'`) as "unclassified" bucket; skips both summary lines when all findings are unclassified. Zero-count buckets are omitted. Unknown severity/action values are included gracefully.

- `packages/cli/src/commands/work.ts` (modified): (1) Changed `const healthLine` to `let healthLine` and appended nudge string based on trigger priority: `new_candidates` → `→ claude --agent ana-learn`, else `trend_worsened` → `→ ana proof audit`. (2) Added `suggested_action` field to JSON quality object: `'run_learn'` | `'run_audit'` | `null`.

- `packages/cli/tests/commands/proof.test.ts` (modified): Added 7 new tests covering severity/action summary lines: classified findings, zero-count bucket omission, action breakdown with closeable hint, unclassified bucket, all-unclassified skip, zero active findings, and JSON unchanged.

- `packages/cli/tests/commands/work.test.ts` (modified): Added 7 new tests covering health nudge: new_candidates nudge, trend_worsened nudge, no nudge for informational triggers, priority when both fire, JSON suggested_action for run_learn/run_audit/null.

## PR Summary

- Add severity and action summary lines to `ana proof audit` terminal output — transforms "12 findings" into "3 risk · 5 debt" for actionable triage
- Add health nudge to `work complete` terminal output — appends `→ claude --agent ana-learn` or `→ ana proof audit` based on trigger priority
- Add `suggested_action` field (`'run_learn'` | `'run_audit'` | `null`) to `work complete --json` quality object — permanent JSON contract addition
- Handle edge cases: all-unclassified findings skip summary lines, zero-count buckets omitted, single nudge maximum per health line
- 14 new tests across proof.test.ts and work.test.ts covering all display logic and priority behavior

## Acceptance Criteria Coverage

- AC1 "severity summary line" → proof.test.ts "displays severity summary after audit header" (3 assertions) ✅
- AC2 "action summary line" → proof.test.ts "displays action summary after severity line" (4 assertions) ✅
- AC3 "counts from active findings only" → proof.test.ts "severity counts match active findings only" — implemented by iterating activeFindings array, not computeChainHealth. Test uses chain fixtures with known distributions. ✅
- AC4 "zero findings no summary" → proof.test.ts "no summary lines with zero active findings" (2 assertions) ✅
- AC5 "all unclassified skip" → proof.test.ts "skips both summary lines when all findings unclassified" (5 assertions) ✅
- AC6 "unclassified bucket" → proof.test.ts "includes unclassified bucket for dash severity" (2 assertions) ✅
- AC7 "JSON unchanged" → proof.test.ts "audit JSON has no summary field" (2 assertions) ✅
- AC8 "learn nudge for new_candidates" → work.test.ts "appends learn nudge when new_candidates fires" (1 assertion) ✅
- AC9 "audit nudge for trend_worsened" → work.test.ts "appends audit nudge when trend_worsened fires" (1 assertion) ✅
- AC10 "no nudge for informational" → work.test.ts "no nudge for informational triggers only" (1 assertion) ✅
- AC11 "priority: candidates > worsened" → work.test.ts "highest priority nudge wins when multiple triggers fire" (2 assertions) ✅
- AC12 "JSON suggested_action field" → work.test.ts "suggested_action is run_learn for new_candidates in JSON" (1 assertion) ✅
- AC13 "suggested_action null" → work.test.ts "suggested_action is null for informational triggers in JSON" (1 assertion) ✅
- AC14 "all existing tests pass" → Full suite: 1725 passed, 0 failed ✅
- AC15 "lint passes" → Pre-commit hook passes (0 errors, 14 pre-existing warnings) ✅

## Implementation Decisions

1. **Unknown severity/action values beyond the known set:** The spec lists risk/debt/observation for severity and promote/scope/monitor/accept for actions. The implementation handles unknown values by including them after the known order in the summary line. This covers future additions without code changes.

2. **Work test findings use `file: null`:** The `writeProofChain` staleness check auto-closes findings when their referenced files don't exist. Since work tests run in temp directories without source files, using `file: null` ensures findings stay active (the staleness check skips `!finding.file`). This accurately tests the nudge/JSON logic without false positives from staleness.

3. **Trend_worsened test uses `monitor` instead of `scope`:** Scope findings with the same severity+category+file key recur across entries, triggering `new_candidates` via the recurrence-based promotion candidate detection. Using `monitor` isolates the `trend_worsened` trigger for clean testing.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1711 passed | 2 skipped (1713)
  Duration  19.49s
```

### After Changes
```
(cd packages/cli && pnpm vitest run --run)
Test Files  93 passed (93)
     Tests  1725 passed | 2 skipped (1727)
  Duration  20.46s
```

### Comparison
- Tests added: 14 (7 in proof.test.ts, 7 in work.test.ts)
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/commands/proof.test.ts`: Severity/action summary display — classified findings, zero-count bucket omission, action closeable hint, unclassified bucket, all-unclassified skip, zero active findings clean message, JSON unchanged
- `tests/commands/work.test.ts`: Health nudge — new_candidates learn nudge, trend_worsened audit nudge, no nudge for informational triggers, priority when both fire, JSON suggested_action run_learn/run_audit/null

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
2b43b69 [proof-command-ux] Add health nudge and suggested_action
bcad68e [proof-command-ux] Add audit severity and action summary lines
```

## Open Issues

1. Work test findings use `file: null` to avoid staleness auto-close in temp directories. This is a known interaction between the staleness maintenance in `writeProofChain` and test environments that lack real source files. Not a code issue — a testing constraint.

2. The `trend_worsened` isolation test uses `suggested_action: 'monitor'` instead of `'scope'` to prevent scope recurrence from triggering `new_candidates`. This accurately isolates the trigger but doesn't test the specific combo of scope findings + trend worsened. The priority test covers the multi-trigger case.

Verified complete by second pass.
