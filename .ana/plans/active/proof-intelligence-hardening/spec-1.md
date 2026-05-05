# Spec: Data Integrity Fixes

**Created by:** AnaPlan
**Date:** 2026-05-04
**Scope:** .ana/plans/active/proof-intelligence-hardening/scope.md

## Approach

Four independent bug fixes that correct data corruption and inconsistency in the proof pipeline. Each fix is small and testable in isolation. The unifying theme: these all produce wrong numbers that downstream features (health, audit, Learn) then consume — garbage in, garbage out.

**parseACResults** runs its PASS/FAIL/PARTIAL/UNVERIFIABLE regex against the full verify report content. A bullet line like `- Finding about PASS rate improvements` in the Findings section inflates the count. Fix: extract the substring between `## AC Walkthrough` and the next `## ` heading, run the regex on that substring only. Fall back to full content if the heading is missing (old reports).

**FAIL guard duplication** — identical rejection logic at two locations in work.ts. Extract a shared helper that both paths call. The multi-phase path has a slightly different error message (includes phase number), so the helper accepts an optional context string.

**Zero-run defaults** — the health command hardcodes `{ first_pass_count: 0, total_runs: 0, first_pass_pct: 100, total_caught: 0 }` instead of calling `computeFirstPassRate([])` which returns the same values. Replace the literal with the function call so behavior stays in sync if the function changes.

**Recovery-path counting** — work.ts status display manually loops entries to count findings instead of calling `computeChainHealth()` which already does this. Replace with the shared utility.

## Output Mockups

No user-visible output changes. These are data-path fixes — the numbers become correct, the display format stays the same.

## File Changes

### packages/cli/src/utils/proofSummary.ts (modify)
**What changes:** `parseACResults` gains section extraction before regex matching. Extract content between `## AC Walkthrough` and next `## ` heading (or EOF). Fall back to full content if heading absent.
**Pattern to follow:** The function already uses simple string regex. Use `indexOf('## AC Walkthrough')` and `indexOf('\n## ', startPos)` for section boundaries — same approach used elsewhere in the codebase for markdown section parsing.
**Why:** 3/44 verify reports have false AC count matches. This corrupts the proof chain entry's contract satisfaction data.

### packages/cli/src/commands/work.ts (modify)
**What changes:** Three modifications:
1. Extract FAIL guard into a helper function defined near the top of the `completeWork` flow. Both the single-phase guard (:750) and multi-phase guard (:1150) call it.
2. Replace the manual findings counting loop (:1020-1023) with `computeChainHealth(recoveryChain)` — the variable `recoveryChain` already holds the parsed chain at that point.

**Pattern to follow:** The existing `computeChainHealth` usage at :905 in the same file — same destructuring pattern.
**Why:** Dual FAIL guard means one can be updated without the other (drift). Manual counting means the recovery path can disagree with the main path on the same data.

### packages/cli/src/commands/proof.ts (modify)
**What changes:** Replace the hardcoded zero-run verification object at :1777 with `computeFirstPassRate([])`.
**Pattern to follow:** The existing `computeFirstPassRate(entries)` call elsewhere in the health command for the non-zero case.
**Why:** If `computeFirstPassRate` ever changes its empty-array return semantics (e.g., pct becomes 0 instead of 100 for empty), the zero-run path would diverge.

## Acceptance Criteria

- [ ] AC1: parseACResults only counts PASS/FAIL/PARTIAL/UNVERIFIABLE lines within the AC Walkthrough section — a bullet line containing "PASS" in the Findings section does not inflate the count
- [ ] AC4: FAIL result rejection in work.ts exists in exactly one location, not two
- [ ] AC5: Recovery-path finding count uses the same computation as the main path (computeChainHealth or shared helper)
- [ ] AC6: Zero-run JSON output calls computeFirstPassRate([]) instead of hardcoding defaults
- [ ] Tests pass with `pnpm vitest run`
- [ ] No TypeScript errors (`pnpm run build`)

## Testing Strategy

- **Unit tests (proofSummary.test.ts):** Add test cases for parseACResults:
  - Report with `## AC Walkthrough` section containing PASS lines and a separate section with "PASS" in prose — only the walkthrough PASS lines count
  - Report missing `## AC Walkthrough` heading — falls back to full content (backward compat)
  - Report where AC Walkthrough is the last section (no subsequent `## `) — correctly reads to EOF

- **Unit tests (work.test.ts or proof.test.ts):** The FAIL guard and counting changes are best tested through the existing integration-style command tests that exercise `work complete`. Verify the existing tests still pass — they already cover FAIL rejection behavior.

- **Edge cases:** Empty verify report (returns { total: 0, met: 0 }). Report with only a `## AC Walkthrough` heading and no content beneath it.

## Dependencies

`computeFirstPassRate` and `computeChainHealth` are already exported from proofSummary.ts. No new dependencies needed.

## Constraints

- parseACResults fallback behavior must preserve backward compatibility with old reports that lack `## AC Walkthrough`.
- The FAIL guard helper must preserve the exact error messages (they're tested in existing tests and consumed by agents that parse output).
- The multi-phase FAIL guard includes `Phase ${phaseNum}` in its message — the helper must accept this context.

## Gotchas

- The `computeFirstPassRate` import may already exist in proof.ts (check before adding a duplicate import line).
- `computeChainHealth` expects `{ entries: Array<{ findings?: ... }> }` — verify that `recoveryChain` at :1015 matches this shape. It does: it's declared as `{ entries: Array<{ findings?: Array<...> }> }` at :1015.
- The FAIL guard at :750 and :1150 both call `process.exit(1)`. The helper should also call `process.exit(1)` — don't change it to throw, because the callers don't catch.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions: `import { computeFirstPassRate } from '../../utils/proofSummary.js'`
- Use `import type` for type-only imports, separate from value imports
- Prefer early returns over nested conditionals
- Explicit return types on exported functions; internal helpers can use inference
- Exported functions require `@param` and `@returns` JSDoc

### Pattern Extracts

parseACResults current implementation (proofSummary.ts:199-212):
```typescript
function parseACResults(content: string): { total: number; met: number } {
  const passCount = (content.match(/^\s*-\s+.*\bPASS\b/gm) || []).length;
  const failCount = (content.match(/^\s*-\s+.*\bFAIL\b/gm) || []).length;
  const partialCount = (content.match(/^\s*-\s+.*\bPARTIAL\b/gm) || []).length;
  const unverifiableCount = (content.match(/^\s*-\s+.*\bUNVERIFIABLE\b/gm) || []).length;

  const total = passCount + failCount + partialCount + unverifiableCount;
  const met = passCount;

  return { total: total || 0, met };
}
```

computeChainHealth usage (work.ts:905-906):
```typescript
  const health = computeChainHealth(chain);
  const { chain_runs: runs, findings: { active: activeCount, closed: closedCount, lesson: lessonsCount, promoted: promotedCount, total: totalFindings } } = health;
```

FAIL guard (work.ts:750-754):
```typescript
  if (proof.result === 'FAIL') {
    console.error(chalk.red('Error: Cannot complete work with a FAIL verification result.'));
    console.error(chalk.gray('The verify report says FAIL. Fix the issues and re-verify before completing.'));
    console.error(chalk.gray('Run: claude --agent ana-build to fix, then claude --agent ana-verify'));
    process.exit(1);
  }
```

### Checkpoint Commands

- After parseACResults fix: `(cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts)` — Expected: all existing tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 1839+ tests pass
- Lint: `pnpm run lint`
- Build: `pnpm run build`

### Build Baseline
- Current tests: 1839 passed, 2 skipped (94 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected 1842+ tests (3+ new for parseACResults section scoping)
- Regression focus: `tests/utils/proofSummary.test.ts`, `tests/commands/work.test.ts`
