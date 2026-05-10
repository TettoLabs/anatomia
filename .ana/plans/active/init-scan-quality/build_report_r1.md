# Build Report: Init must surface scan quality and pipeline readiness

**Created by:** AnaBuild
**Date:** 2026-05-10
**Spec:** .ana/plans/active/init-scan-quality/spec.md
**Branch:** feature/init-scan-quality

## What Was Built
- `packages/cli/src/commands/init/types.ts` (modified): Added `warnings: string[]` field to `PreflightResult` interface
- `packages/cli/src/commands/init/preflight.ts` (modified): Added `spawnSync` import, git user.name/email checks (guarded by `hasGit`), `gh --version` check, enhanced remote message with `git remote add origin` suggestion, warnings array populated and returned
- `packages/cli/src/commands/init/state.ts` (modified): Conditional spinner messages in `runAnalyzer` (warn/succeed based on blind spots), new `displayBlindSpots` function with Analyzer→human translation, `displaySuccessMessage` gains optional `warnings` parameter for pipeline readiness section
- `packages/cli/src/commands/init/index.ts` (modified): Thread `preflight.warnings` to `displaySuccessMessage` call
- `packages/cli/templates/.claude/agents/ana-setup.md` (modified): Added environment validation commands (gh --version, gh auth status, git config user.name/email, git remote -v) with safety guardrail after setupPhase completion
- `.claude/agents/ana-setup.md` (modified): Synced dogfood copy to match template
- `packages/cli/tests/commands/init.test.ts` (modified): 19 new tests covering all three layers

## PR Summary

- Surface scan quality in init: degraded scans show warning spinner with human-readable blind spot details instead of misleading "Analysis complete" checkmark
- Add pipeline dependency checks: git user.name/email, gh CLI availability, and enhanced remote message with copy-pasteable fix commands
- Display pipeline readiness section in success message that recaps all warnings before next steps
- Add environment validation to setup agent template with explicit guardrail against installing software
- 19 new tests covering blind spot display, spinner behavior, pipeline readiness, preflight warnings, and template content

## Acceptance Criteria Coverage

- AC1 "When tree-sitter fails, warning with Deep scan incomplete" → init.test.ts "uses warn with Deep scan incomplete" (1 assertion + source inspection)
- AC2 "No blind spots → Deep scan complete" → init.test.ts "uses succeed with Deep scan complete" (1 assertion)
- AC3 "Each blind spot displayed with area/issue/resolution" → init.test.ts "displays non-Analyzer blind spots with their fields directly" (2 assertions)
- AC4 "Git user.name/email warning with copy-pasteable fix" → init.test.ts "produces warning with git config --global user.name" + "user.email" (2 assertions)
- AC5 "gh not installed → pipeline works message" → init.test.ts "gh CLI warning includes pipeline works message" (1 assertion)
- AC6 "Enhanced remote message with git remote add origin" → init.test.ts "remote warning includes git remote add origin" (1 assertion)
- AC7 "None of the new checks prevent init from completing" → init.test.ts "PreflightResult interface includes warnings array" verifies canProceed: true (1 assertion)
- AC8 "Pipeline readiness section in success message" → init.test.ts "shows Pipeline readiness section when warnings exist" (2 assertions)
- AC9 "PreflightResult carries warnings field" → init.test.ts "PreflightResult interface includes warnings array" (1 assertion)
- AC10 "Setup agent template includes env validation" → init.test.ts "includes environment validation commands and safety guardrail" (3 assertions)
- AC11 "Init translates tree-sitter to human terms" → init.test.ts "translates Analyzer blind spot to human-readable message" (3 assertions)
- AC12 "Re-running ana init re-runs dependency checks" → NO TEST (re-init exercises the same preflight code path; verified by source inspection)
- AC13 "Total analyzer failure unchanged" → init.test.ts "preserves total analyzer failure behavior" (source inspection)
- AC14 "Tests pass" → ✅ 2066 passed
- AC15 "No build errors" → ✅ build succeeds

## Implementation Decisions

- **Warning messages displayed inline AND captured in array.** Spec gotcha noted users expect to see warnings as they happen. Both inline `console.log` and array capture happen in the same code path.
- **Dogfood agent copy synced.** The `agent-proof-context.test.ts` test requires `.claude/agents/ana-setup.md` to match the template exactly. Updated the dogfood copy alongside the template.
- **Multi-line warning rendering.** Warnings containing `\n` (like the gh CLI warning) are split and rendered with indented gray continuation lines.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  96 passed (96)
     Tests  2047 passed | 2 skipped (2049)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  96 passed (96)
     Tests  2066 passed | 2 skipped (2068)
```

### Comparison
- Tests added: 19
- Tests removed: 0
- Regressions: none

### New Tests Written
- `packages/cli/tests/commands/init.test.ts`: 19 tests covering blind spot display (4 tests), runAnalyzer spinner messages (3 tests), displaySuccessMessage pipeline readiness (4 tests), PreflightResult warnings (6 tests), setup agent template (1 test), scan engine blind spot messages (1 test)

## Verification Commands
```bash
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
868e9ad [init-scan-quality] Add tests for scan quality and pipeline readiness
c0b054a [init-scan-quality] Add blind spot display and pipeline readiness to init
ff69cdc [init-scan-quality] Add warnings to PreflightResult and preflight checks
```

## Open Issues

- **A001/A002/A003/A021 tested by source inspection + data construction, not by mocking `ora`.** The spinner behavior (which method is called, which message is passed) is verified by constructing the same blind spot data and asserting the conditional logic, but the actual `ora` spinner is not mocked in these tests. A full integration test would require mocking the `scanProject` import and the `ora` spinner object. The current approach verifies the logic is correct but doesn't exercise the spinner call itself.
- **Pre-existing lint warning.** `src/utils/git-operations.ts:169` has an unused eslint-disable directive — not introduced by this build.

Verified complete by second pass.