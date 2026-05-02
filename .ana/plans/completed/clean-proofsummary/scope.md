# Scope: Clean proofSummary.ts

**Created by:** Ana
**Date:** 2026-05-01

## Intent
`proofSummary.ts` is the hottest file in the system — 1865 lines, 8 active findings, touched by 7 pipeline runs. It carries a dead predecessor function (86 lines, zero production callers), a loose type that hides behind a cast, and a path-matching bug that produces false positives in monorepos. Three independent fixes, one file, the diff mostly red. Clean the file every pipeline run reads.

## Complexity Assessment
- **Size:** small-medium
- **Files affected:**
  - `packages/cli/src/utils/proofSummary.ts` — delete dead function + type + interface + constant (~90 lines), tighten result type (~3 lines), fix fileMatches (~8 lines)
  - `packages/cli/src/commands/work.ts` — remove `as` cast (~1 line)
  - `packages/cli/tests/utils/proofSummary.test.ts` — delete dead function tests (~40 lines), add fileMatches tests (~15 lines)
- **Blast radius:** Low. Dead code deletion has zero consumers. Result type tightening is compiler-guided — `tsc --noEmit` finds every consumer. fileMatches fix preserves all existing one-directory matching; only adds precision for the both-directories case.
- **Estimated effort:** ~30 minutes pipeline time
- **Multi-phase:** no

## Approach
Delete what's dead. Tighten what's loose. Fix what's wrong. Three changes, each independently verified, each closing a diagnosed proof chain finding.

### Fix 1: Delete `generateActiveIssuesMarkdown` (dead code)

Delete:
- `ProofChainEntryForIndex` interface (line 388) — used only by the dead function
- `generateActiveIssuesMarkdown` function (lines 403-489) — 86 lines, exported but never imported by any production code. Created in entry #9, superseded by `generateDashboard` in entry #19. Dead in production, alive in tests.
- `MAX_ACTIVE_ISSUES` constant (line 425) — used only by the dead function. `generateDashboard` has its own `MAX_ACTIVE = 30` at line 595.
- Import and tests in `proofSummary.test.ts` (~40 lines in the `generateActiveIssuesMarkdown` describe block)

Keep:
- `FindingWithFeature` interface (line 378) — used by `generateDashboard`
- `generateDashboard` — the live replacement, untouched

The proof chain finding (`findings-lifecycle-foundation-C3`) diagnosed this as "duplication." The real disease is dead code. The dashboard didn't duplicate the logic — it replaced it.

### Fix 2: Tighten `ProofSummary.result` type

Change:
- `proofSummary.ts:40` — `result: string` → `result: 'PASS' | 'FAIL' | 'UNKNOWN'`
- `proofSummary.ts:188` — `parseResult` return type: `string` → `'PASS' | 'FAIL' | 'UNKNOWN'`
- `work.ts:786` — remove `as ProofChainEntry['result']` cast (types now match)

`parseResult` already returns only PASS, FAIL, or UNKNOWN via regex match + default. The function is correct; the type is a lie. `tsc --noEmit` finds every consumer after the type change.

Known consumers (all already correct — no code changes needed):
- `pr.ts:108` — `proof.result === 'PASS'`
- `work.ts:776` — `proof.result === 'UNKNOWN'`
- `work.ts:1045,1270` — passes `proof.result` to JSON output
- `work.ts:1057-1058,1292-1293` — `proof.result === 'PASS'` + string interpolation

### Fix 3: Fix `fileMatches` false positives

`fileMatches` at line 1744 uses basename-only matching as fallback. `packages/a/census.ts` matches `packages/b/census.ts` because both end with `/census.ts`. Confirmed false positive in our own codebase: `engine/census.ts` and `engine/types/census.ts`.

Fix: add ONE guard before the existing checks. When BOTH stored and queried have directory components, require full suffix match. Existing one-directory cases (bare basename query, legacy stored paths) are untouched.

```typescript
// Basenames must match for any non-exact match (existing, unchanged)
if (storedBasename !== queriedBasename) return false;

// BOTH have directories: require full suffix match (THE FIX)
if (stored.includes('/') && queried.includes('/')) {
  return stored.endsWith(queried) || queried.endsWith(stored);
}

// Only stored has directory, queried is bare basename: allow (backward compat)
if (stored.includes('/') && stored.endsWith('/' + queriedBasename)) return true;

// Only queried has directory, stored is bare basename: allow (legacy data)
if (queried.includes('/') && queried.endsWith('/' + storedBasename)) return true;

// Neither has directory: basename match (already confirmed above)
if (!stored.includes('/')) return true;

return false;
```

Critical: the guard goes BEFORE the existing one-directory checks, not instead of them. Replacing lines 1755-1758 entirely would break bare basename queries against full paths.

## Acceptance Criteria

- AC1: `generateActiveIssuesMarkdown` function is deleted from proofSummary.ts
- AC2: `ProofChainEntryForIndex` interface is deleted from proofSummary.ts
- AC3: `MAX_ACTIVE_ISSUES` constant is deleted from proofSummary.ts
- AC4: `generateActiveIssuesMarkdown` is not exported from proofSummary.ts
- AC5: `FindingWithFeature` interface is preserved (used by `generateDashboard`)
- AC6: `generateDashboard` is unchanged
- AC7: `ProofSummary.result` type is `'PASS' | 'FAIL' | 'UNKNOWN'` not `string`
- AC8: `parseResult` return type is `'PASS' | 'FAIL' | 'UNKNOWN'` not `string`
- AC9: The `as ProofChainEntry['result']` cast at work.ts:786 is removed
- AC10: `fileMatches` returns false when both paths have directories and neither is a suffix of the other (`packages/a/census.ts` vs `packages/b/census.ts`)
- AC11: `fileMatches` returns true when one path is a suffix of the other (`engine/census.ts` vs `packages/cli/src/engine/census.ts`)
- AC12: `fileMatches` returns true when queried is a bare basename against a stored full path (`census.ts` vs `packages/b/census.ts`) — backward compat
- AC13: `fileMatches` returns true when stored is a bare basename against a queried full path (legacy data compat)
- AC14: `generateActiveIssuesMarkdown` tests are deleted from proofSummary.test.ts
- AC15: New `getProofContext` tests cover the false-positive fix and backward compat cases
- AC16: All remaining tests pass. Build compiles without errors.

## Edge Cases & Risks

- **`generateActiveIssuesMarkdown` still imported in tests.** The import must be removed alongside the test deletion. Grep for the function name after deletion to confirm zero references remain.
- **`MAX_ACTIVE_ISSUES` vs `MAX_ACTIVE`.** Both are 30. After deleting `MAX_ACTIVE_ISSUES`, only `MAX_ACTIVE` remains in `generateDashboard`. No unification needed — they're independent constants in independent functions, and one is being deleted.
- **fileMatches regression.** The original requirements had a regression: replacing lines 1755-1758 entirely broke bare basename queries. The corrected fix adds the both-directories guard BEFORE the existing checks. Build must preserve all four existing matching cases (exact, stored-has-dir, queried-has-dir, neither-has-dir) and add the new both-directories guard before them.
- **fileMatches is private.** Not exported. New tests must go through `getProofContext` (the public API), following the existing test pattern at proofSummary.test.ts lines 1346-1426: create temp dir with proof chain, query via `getProofContext`, assert on results.

## Rejected Approaches

- **Extract shared helper from dashboard + active issues.** The finding prescribed this. Wrong diagnosis: the original function is dead code, not a duplication source. The dashboard already has the logic. There's nothing to extract from — just delete the dead predecessor.
- **Export fileMatches for direct testing.** Would change the module's public API for test convenience. Test through `getProofContext` instead — same pattern as existing tests.
- **Include P4 (timing bug).** Blocked on design decision about atomic save timestamps. Not a clear fix.

## Open Questions

None.

## Exploration Findings

### Patterns Discovered
- `generateActiveIssuesMarkdown` was created in entry #9, superseded by `generateDashboard` in entry #19. The import was removed from `work.ts` but the function was left behind. Classic dead-predecessor pattern.
- `parseResult` (line 188) already does a regex match for PASS/FAIL and defaults to UNKNOWN. The function body IS the union type — only the signature lies.
- `fileMatches` three-tier matching was designed for recall over precision. The fix preserves recall (bare basenames still match everything) while adding precision for the common modern case (both paths have directories).

### Constraints Discovered
- [TYPE-VERIFIED] `generateActiveIssuesMarkdown` — zero production imports. Confirmed via grep across all source files.
- [TYPE-VERIFIED] `MAX_ACTIVE_ISSUES` — used only at lines 425, 427, 433, 436, all inside the dead function.
- [TYPE-VERIFIED] `FindingWithFeature` — used by `generateDashboard` at lines 580, 609. Must be preserved.
- [TYPE-VERIFIED] `fileMatches` — private function (not exported). Line 1744. No direct tests exist.
- [OBSERVED] `getProofContext` tests at lines 1346-1426 test path matching indirectly. New fileMatches tests should follow this pattern.

### Test Infrastructure
- `proofSummary.test.ts` — `generateActiveIssuesMarkdown` describe block starts at line 747. Two tests. Import at line 16. All deleted.
- `proofSummary.test.ts` — `getProofContext` describe block at line 1313. Creates temp dirs with proof chains. Follow this pattern for new fileMatches tests.
- `work.test.ts` — constructs `ProofSummary` objects in test fixtures. The `result: string` → union change may surface type errors in fixtures using invalid values (which is the point).

## For AnaPlan

### Structural Analog
`generateDashboard` at line 538 — the live function that replaced the dead one. Shows the pattern for collecting/filtering/grouping active findings.

### Relevant Code Paths
- `proofSummary.ts:388-489` — dead code to delete (interface + function + constant)
- `proofSummary.ts:40` — result type to tighten
- `proofSummary.ts:188` — parseResult return type to tighten
- `proofSummary.ts:1744-1763` — fileMatches to fix
- `work.ts:786` — cast to remove
- `proofSummary.test.ts:747-790` — dead function tests to delete
- `proofSummary.test.ts:1313-1426` — existing getProofContext tests (pattern for new tests)

### Patterns to Follow
- Dead code deletion: grep for the function name after deletion to confirm zero references
- Type tightening: run `tsc --noEmit` after the change to find any consumer that doesn't handle the union
- Test through public API: new fileMatches tests go through `getProofContext`, not direct function calls

### Known Gotchas
- `FindingWithFeature` (line 378) looks like it belongs to the dead function because it's nearby. It doesn't — `generateDashboard` uses it. Don't delete it.
- The fileMatches fix adds a guard BEFORE existing checks. Don't replace the existing checks — they handle one-directory cases that the new guard doesn't cover.
- `proofSummary.test.ts` line 16 imports `generateActiveIssuesMarkdown`. Remove the import when deleting the tests or the build fails.

### Things to Investigate
- Whether any `work.test.ts` fixture uses `result: 'INVALID'` or other non-PASS/FAIL/UNKNOWN values. If so, the type change will surface it as a compile error. Fix by changing to a valid value.
