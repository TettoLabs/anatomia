# Build Report: Learn Template Session Fixes

**Created by:** AnaBuild
**Date:** 2026-05-02
**Spec:** .ana/plans/active/learn-template-session-fixes/spec.md
**Branch:** feature/learn-template-session-fixes

## What Was Built
- `packages/cli/templates/.claude/agents/ana-learn.md` (modified): 7 text edits — accept!=close instruction, removed first/routine calibration, observation prompt, priority-based session approach, Think handoff in wrap-up, stale close reason example, variadic close guidance
- `.claude/agents/ana-learn.md` (modified): Full file copy from template (dogfood sync)

## PR Summary

- Rewrites Learn's accept-action intro to clarify that "accept" means Verify didn't block shipping, not that findings should be closed
- Replaces flat 30-finding session cap with priority-based phase ordering (risk -> stale -> accept) controlled by the developer
- Adds Think handoff as an explicit session wrap-up option with promotion lifecycle guidance
- Inserts standalone observation prompt ("anything you've noticed?") before the format block
- Adds stale close reason example and variadic vs individual close guidance

## Acceptance Criteria Coverage

- AC1 "accept does not mean close" -> Change 1 applied, text contains "does NOT mean the finding should be closed" and "re-evaluate each finding on its own merits"
- AC2 "first/routine removed" -> Change 2 applied, "First session" and "Routine session" lines deleted, "Large garden" is now first bullet
- AC3 "observation prompt standalone" -> Change 3 applied, "After the summary, always ask" inserted before format block
- AC4 "priority ordering, no cap" -> Change 4 applied, "Start with risk findings and recurring candidates" present, "~30" removed
- AC5 "Think handoff in wrap-up" -> Change 5 applied, "draft a prompt for Ana Think" in wrap-up
- AC6 "promotion lifecycle" -> Change 5 applied, "promotion encodes proven patterns, not aspirational ones" in wrap-up
- AC7 "verification transfer" -> Change 5 applied, "which findings you verified against current code" in wrap-up
- AC8 "stale close reason" -> Change 6 applied, "Stale -- finding claims" in good reasons list
- AC9 "variadic vs individual" -> Change 7 applied, "When findings have different justifications, close individually" in Guardrail 2
- AC10 "dogfood matches template" -> `diff` returns empty after copy
- AC11 "no other lines changed" -> git diff shows exactly 7 hunks matching the 7 specified changes

## Implementation Decisions

None. All 7 changes were specified with exact find/replace text. No judgment calls required.

## Deviations from Contract

None -- contract followed exactly.

## Test Results

### Baseline (before changes)
N/A -- template-only change, no tests affected per spec.

### After Changes
N/A -- no CLI behavior changes, no tests to run.

### Comparison
- Tests added: 0
- Tests removed: 0
- Regressions: none

### Verification
- `diff packages/cli/templates/.claude/agents/ana-learn.md .claude/agents/ana-learn.md` -> no output (files identical)
- `git diff --stat main..HEAD` -> 2 files changed, 28 insertions(+), 18 deletions(-)
- `git diff main..HEAD packages/cli/templates/.claude/agents/ana-learn.md | grep "^@@" | wc -l` -> 7 (exactly 7 change regions)

## Verification Commands

```bash
diff packages/cli/templates/.claude/agents/ana-learn.md .claude/agents/ana-learn.md
git diff main..HEAD -- packages/cli/templates/.claude/agents/ana-learn.md
pnpm run build
```

## Git History

```
24a0307 [learn-template-session-fixes] Apply 7 template edits and sync dogfood
```

## Open Issues

Pre-existing lint warnings (14 `@typescript-eslint/no-explicit-any`) in test files — not introduced by this build, surfaced by pre-commit hook. No action needed.

Verified complete by second pass.
