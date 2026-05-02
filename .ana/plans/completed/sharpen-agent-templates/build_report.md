# Build Report: Sharpen Agent Templates

**Created by:** AnaBuild
**Date:** 2026-05-01
**Spec:** .ana/plans/active/sharpen-agent-templates/spec.md
**Branch:** feature/sharpen-agent-templates

## What Was Built

- `packages/cli/templates/.claude/agents/ana-verify.md` (modified): Rewrote mandate paragraph — dropped style examples (unclear names, weak error messages, inconsistent patterns), added substantive examples (sentinel tests, untested error paths, scale-breaking patterns), added conviction line and consequence test, changed "worth knowing" to "worth knowing for the next engineer". Deleted "Minimum: one Code finding, one Test finding. Upstream when applicable." line.
- `packages/cli/templates/.claude/agents/ana.md` (modified): Extended step 3 with quality posture check (`ana proof health` for hot modules, worsening trend awareness). Inserted proof surface reference block with health, audit, and Learn routing commands.
- `.claude/agents/ana-verify.md` (modified): Dogfood copy synced from template.
- `.claude/agents/ana.md` (modified): Dogfood copy synced from template.

## PR Summary

- Reweight Verify's mandate from style findings (unclear names, weak error messages) to substantive findings (sentinel tests, untested error paths, scale-breaking patterns)
- Remove arbitrary minimum finding count that decoupled quality from quantity
- Give Think agent awareness of proof chain health data during scoping via `ana proof health` and `ana proof audit`
- Route proof chain management (promote, close, triage) to Learn agent
- Sync all dogfood copies to match templates

## Acceptance Criteria Coverage

- AC1 "Verify mandate uses new examples" -> verified by reading ana-verify.md line 11: contains "sentinel tests" style examples via "assertions that pass on broken AND working code, patterns that work now but break at scale"; drops "unclear names", "weak error messages", "inconsistent patterns"
- AC2 "Conviction line and consequence test" -> verified: mandate contains "Every codebase carries tech debt, weak tests, and architectural shortcuts" and "what goes wrong, and for whom?"
- AC3 "'worth knowing for the next engineer'" -> verified: mandate contains "worth knowing for the next engineer"
- AC4 "Minimum count deleted" -> verified: grep for "Minimum: one Code finding" returns no match in template
- AC5 "Think has proof surface reference" -> verified: ana.md contains `ana proof health`, `ana proof audit`, and `route to \`claude --agent ana-learn\``
- AC6 "Think step 3 includes quality posture check" -> verified: step 3 contains `ana proof health` and "a worsening trend changes what the scope should prioritize"
- AC7 "Dogfood copies match templates" -> verified: dogfood sync test passes (8/8 tests)
- AC8 "No other lines changed" -> verified: git diff shows only the 4 specified changes across the 2 template files
- AC9 "All existing tests pass" -> verified: 1761 passed, 2 skipped (matches baseline)
- AC10 "No lint errors" -> verified: 0 errors, 14 warnings (all pre-existing)

## Implementation Decisions

None. All four changes were specified with exact before/after text in the spec's Build Brief. Applied verbatim.

## Deviations from Contract

None — contract followed exactly. All 20 assertions are addressed by the template edits and the dogfood sync test. No `@ana` tags added because the spec explicitly states "No new tests needed" — all contract assertions are verified by source inspection and the existing sync test.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1761 passed | 2 skipped (1763)
  Duration  27.22s
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1761 passed | 2 skipped (1763)
  Duration  28.13s
```

### Comparison
- Tests added: 0
- Tests removed: 0
- Regressions: none

### New Tests Written
None. Spec explicitly states no new tests needed — existing dogfood sync test covers correctness.

## Verification Commands
```bash
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
a8f41da [sharpen-agent-templates] Add proof surface to Think agent
ac2a255 [sharpen-agent-templates] Sharpen verify mandate, remove minimum count
```

## Open Issues

- Spec baseline stated 1777 tests but actual baseline is 1761 (2 skipped). The spec was likely written against a different commit. No impact on this build — counts match before and after.
- Pre-existing lint warnings (14 `@typescript-eslint/no-explicit-any`) in test files not touched by this build.

Verified complete by second pass.
