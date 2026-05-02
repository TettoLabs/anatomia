# Build Report: Fix Type Lies

**Created by:** AnaBuild
**Date:** 2026-05-01
**Spec:** .ana/plans/active/fix-type-lies/spec.md
**Branch:** feature/fix-type-lies

## What Was Built

- `packages/cli/tests/templates/agent-proof-context.test.ts` (modified): Imported `AGENT_FILES` and `readdirSync`. Replaced hardcoded 4-agent array with `[...AGENT_FILES]` in dogfood sync test. Added guard test verifying template directory contents match `AGENT_FILES`.
- `packages/cli/tests/commands/init.test.ts` (modified): Imported `AGENT_FILES`. Replaced hardcoded agent arrays and counts in 6 locations: `expectedFiles` array, `toHaveLength` assertion, agent copy loop, `toContain` assertions, frontmatter iteration, and re-init test. Added `ana-learn.md` to frontmatter branch. Fixed test title from "8 agent files" to dynamic `${AGENT_FILES.length}`.
- `packages/cli/templates/.claude/agents/ana-verify.md` (modified): Line 73 re-verify cleanup: added `(or \`verify_data_N.yaml\`)`. Line 107 Step 6b: added `(or \`verify_data_N.yaml\` for multi-phase, matching the report number)`.
- `.claude/agents/ana-verify.md` (modified): Identical changes as template — dogfood copy stays in sync.
- `packages/cli/src/commands/proof.ts` (modified): Line 841: `skill: string` → `skill?: string` in promote action handler options type.
- `packages/cli/src/commands/work.ts` (modified): Line 843: removed ", reopen," from staleness check comment.
- `packages/cli/tests/utils/proofSummary.test.ts` — **NOT modified** (see Deviations: A014, A015).

## PR Summary

- Replace hardcoded agent arrays/counts in test files with the `AGENT_FILES` constant so new agents are automatically covered
- Add guard test verifying template directory contents match `AGENT_FILES` — prevents silent drift
- Fix verify template to mention `verify_data_N.yaml` for multi-phase builds, matching the existing `verify_report_N.md` pattern
- Fix `skill` parameter typed as required in `proof.ts` when Commander delivers it as optional
- Remove stale "reopen" comment reference in `work.ts`

## Acceptance Criteria Coverage

- AC1 "dogfood sync iterates all 6 agents from AGENT_FILES" → agent-proof-context.test.ts:68 `[...AGENT_FILES]` replaces hardcoded array ✅
- AC2 "init.test.ts uses AGENT_FILES.length for count assertions" → init.test.ts:76 `7 + AGENT_FILES.length`, line 229 `AGENT_FILES.length`, line 325 `AGENT_FILES.length` ✅
- AC3 "init.test.ts agent name arrays reference AGENT_FILES" → init.test.ts:63 `AGENT_FILES.map(...)`, line 218 `AGENT_FILES` iteration, line 250 `AGENT_FILES` iteration, line 305 `AGENT_FILES` iteration ✅
- AC4 "guard test exists" → agent-proof-context.test.ts:78 "AGENT_FILES matches template directory contents" ✅
- AC5 "verify template Step 6b mentions verify_data_N.yaml" → ana-verify.md template line 107 ✅
- AC6 "verify template re-verify cleanup mentions verify_data_N.yaml" → ana-verify.md template line 73 ✅
- AC7 "dogfood copy matches template" → dogfood sync test passes (9 tests) ✅
- AC8 "proof.ts skill typed as optional" → proof.ts line 841 `skill?: string` ✅
- AC9 "work.ts comment no longer references reopen" → work.ts line 843, "reopen" removed ✅
- AC10 "proofSummary.test.ts asserts unconditionally" → ❌ NOT addressed (deviation — see below)
- AC11 "all existing tests pass, build compiles" → 1762 passed, 2 skipped, 0 errors ✅

## Implementation Decisions

- Used `[...AGENT_FILES]` (spread) for the dogfood sync loop since `AGENT_FILES` is `as const` (readonly) and the test doesn't need sort, but kept consistency with how the guard test uses it.
- Added `ana-learn.md` to the frontmatter test's else-if branch alongside `ana-build.md` and `ana-verify.md` since its frontmatter matches that pattern (model: opus, no tools, no memory).
- Used template literal for the test title (`creates .claude/agents/ directory with ${AGENT_FILES.length} agent files`) to keep the test output informative.

## Deviations from Contract

### A014: Trend improvement test asserts change.changed is true unconditionally
**Instead:** Left `if (change.changed)` guard in place; did not add `expect(change.changed).toBe(true)`
**Reason:** Developer investigation after the spec was sealed found the test data produces trend CONTINUATION (improving → improving), not a trend CHANGE. `detectHealthChange` only fires on direction changes. `change.changed` is legitimately `false` with this data. Adding the unconditional assertion would break the test.
**Outcome:** Guard is correct. The spec's diagnosis was wrong — this is not a type lie but correct conditional logic. Verifier should confirm.

### A015: Trend improvement test has no conditional guard around its assertion
**Instead:** The `if (change.changed)` guard remains in the source
**Reason:** Same as A014 — removing the guard would cause a test failure because the data doesn't produce a change event. The guard correctly handles the case where the trend is continuing rather than changing.
**Outcome:** No code change. The guard is semantically correct.

## Test Results

### Baseline (before changes)
```
cd packages/cli && pnpm vitest run
Test Files  93 passed (93)
     Tests  1761 passed | 2 skipped (1763)
  Duration  27.40s
```

### After Changes
```
cd packages/cli && pnpm vitest run
Test Files  93 passed (93)
     Tests  1762 passed | 2 skipped (1764)
  Duration  27.76s
```

### Comparison
- Tests added: 1 (guard test)
- Tests removed: 0
- Regressions: none

### New Tests Written
- `agent-proof-context.test.ts`: "AGENT_FILES matches template directory contents" — verifies sorted directory listing equals sorted AGENT_FILES constant

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
3377027 [fix-type-lies] Fix skill type and stale comment in proof.ts and work.ts
b35c2bd [fix-type-lies] Add verify_data_N.yaml naming to verify template
df39a76 [fix-type-lies] Use AGENT_FILES constant in dogfood sync and init tests
```

## Open Issues

- The "detects trend improvement" test (proofSummary.test.ts:2334) has a deeper problem than just the conditional guard: the test name claims it "detects trend improvement" but the data produces a continuation, not a detectable change. The test name is itself a type lie — it should be "handles trend continuation" or the test data should be restructured to produce an actual direction change. This is out of scope for this build but worth scoping.

Verified complete by second pass.
