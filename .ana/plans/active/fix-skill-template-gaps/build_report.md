# Build Report: Fix skill template gaps — data-access security, coding-standards error rule

**Created by:** AnaBuild
**Date:** 2026-04-16
**Spec:** .ana/plans/active/fix-skill-template-gaps/spec.md
**Branch:** feature/fix-skill-template-gaps

## What Was Built
- `packages/cli/templates/.claude/skills/data-access/SKILL.md` (modified): Added fifth rule bullet about scoping data queries to authorized context, naming IDOR as the consequence of missing authorization scoping.
- `packages/cli/templates/.claude/skills/coding-standards/SKILL.md` (modified): Replaced fourth rule (absolutist "Never swallow errors") with expanded version that bans empty catch blocks but explicitly permits intentional graceful degradation when logged and observable.

## PR Summary

- Add authorization-scoping rule to data-access skill template, naming IDOR as the vulnerability class prevented by proper `where` clauses
- Replace absolutist error-handling rule in coding-standards template with nuanced version that bans empty catch blocks but permits intentional graceful degradation when logged and observable
- No runtime code changed — these are static markdown templates copied during `ana init`

## Acceptance Criteria Coverage

- AC1 "data-access/SKILL.md contains a rule about scoping queries to authorized context, naming IDOR" → ✅ Verified — rule text includes "scope data queries to the authorized context" and "IDOR vulnerability"
- AC2 "coding-standards/SKILL.md error-handling rule bans empty catch blocks and permits graceful degradation" → ✅ Verified — rule text includes "Empty catch blocks are never acceptable" and "Intentional graceful degradation … is fine when the degradation is logged and observable"
- AC3 "No other rules in either template are changed" → ✅ Verified — git diff shows only the targeted lines modified
- AC4 "Template voice is consistent" → ✅ Verified — both rules use imperative voice with why-explanation after the dash
- AC5 "No build errors" → ✅ Verified — `pnpm run build` passes clean
- AC6 "No test regressions" → ✅ Verified — 1137 tests in 86 files, all passing (matches baseline)

## Implementation Decisions

None — spec was completely prescriptive. Both edits match the output mockups verbatim.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
cd packages/cli && pnpm vitest run

 Test Files  86 passed (86)
      Tests  1137 passed (1137)
   Start at  11:18:49
   Duration  13.94s
```

### After Changes
```
cd packages/cli && pnpm vitest run

 Test Files  86 passed (86)
      Tests  1137 passed (1137)
   Start at  11:20:04
   Duration  15.76s
```

### Comparison
- Tests added: 0
- Tests removed: 0
- Regressions: none

### New Tests Written
None — static markdown templates with no runtime behavior per spec.

## Verification Commands
```
pnpm run build
cd packages/cli && pnpm vitest run
pnpm run lint
```

## Git History
```
fe9c133 [fix-skill-template-gaps] Add IDOR scoping rule to data-access, refine error-handling rule in coding-standards
```

## Open Issues

None — verified by second pass. Two markdown template edits, no runtime code, no test changes, no judgment calls required.
