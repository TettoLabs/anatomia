# Scope: Strengthen Weak Test Assertions

**Created by:** Ana
**Date:** 2026-05-02

## Intent
Learn triage (2026-05-02) reviewed 62 active findings across 41 pipeline runs and identified 10 that share one disease: tests that pass without proving anything. Weak matchers (`toBeDefined()`, `toBeGreaterThan(0)`), conditional guards that make assertions vacuous, and `not.toContain()` that passes by coincidence of fixture data. An 11th finding (risk severity) surfaces zero coverage for the UNVERIFIED fallback path — a safety-critical code path where silent failure corrupts the proof chain.

The user wants all 11 fixed in one pipeline run. No production code changes — test-only.

## Complexity Assessment
- **Size:** medium (11 discrete fixes, each 1–10 lines)
- **Files affected:** `tests/commands/proof.test.ts`, `tests/commands/work.test.ts`, `tests/utils/proofSummary.test.ts`
- **Blast radius:** test-only — no production code touched, no new dependencies, no schema changes
- **Estimated effort:** ~1 hour build time
- **Multi-phase:** no

## Approach
Each finding describes a test that passes without proving what it claims. The fix for each is the same shape: replace weak/coincidental assertions with exact ones that would fail if the behavior regressed. For the UNVERIFIED coverage gap, add new tests that exercise the fallback path explicitly.

This is mechanical strengthening — the tests exist, the fixtures exist, the expected values are deterministic. The work is making the assertions match what the test claims to verify.

## Acceptance Criteria
- AC1: Dry-run test (proof.test.ts) asserts no git commit was created — commit count before and after dry-run are equal
- AC2: Variadic strengthen test (proof.test.ts) asserts `promoted_to` contains the skill file path on each finding, not just `status === 'promoted'`
- AC3: A029 source-content test (proof.test.ts) either tests behaviorally, is documented as an accepted exception, or is removed — Plan decides which option based on feasibility
- AC4: `not.toContain('Promote')` test (proof.test.ts) no longer passes by coincidence — either fixture includes promoted data to test both states, or assertion targets the exact heading
- AC5: Three `toBeGreaterThan(0)` assertions in proofSummary.test.ts (lines ~1106, 1116, 1130) are replaced with `toBe(1)` since each fixture creates exactly one finding
- AC6: Timestamp `toBeDefined()` test (work.test.ts) asserts the specific value or date portion from the fixture
- AC7: Multi-phase FAIL test (work.test.ts) asserts error message content, not just that it throws
- AC8: Conditional `if (output.includes('Health:'))` guard (work.test.ts) is replaced — either assert the health line IS present first, or redesign fixture for deterministic output
- AC9: Dashboard cap test (proofSummary.test.ts) verifies WHICH items were kept/dropped, not just the count
- AC10: UNVERIFIED fallback path has test coverage in at least one of work.ts, pr.ts, or proof.ts — test creates a proof summary with no verify status on assertions, runs through the code path, and asserts UNVERIFIED appears
- AC11: All existing tests continue to pass

## Edge Cases & Risks
- The cap test specifics in the think prompt (25→20) don't match current code (35→30 in `generateDashboard`). Plan must locate the exact test and confirm the cap value.
- The conditional guard fix (AC8) depends on whether the test fixture deterministically produces health output. If it sometimes does and sometimes doesn't, the fixture needs redesign, not just assertion strengthening.
- UNVERIFIED fallback touches three files (work.ts, pr.ts, proof.ts). Coverage in one is the minimum — Plan should assess whether all three need tests or if one representative test proves the path.

## Rejected Approaches
- **Split UNVERIFIED into separate scope:** Same shape (test-only), same files. Splitting adds pipeline overhead for no structural benefit.
- **Fix all `toBeGreaterThan(0)` across the entire test suite:** The 30+ instances in proofSummary.test.ts aren't all in the findings. The scope targets the 3 identified by Learn as creating exactly 1 item. A broader sweep is a different scope with different risk.

## Open Questions
- AC3: Which of the three options for the A029 source-content assertion? Plan should check if the health display output includes the threshold value, making option (c) — behavioral testing — feasible.
- Cap test location and values: The think prompt says "25 findings capped to 20" but current code shows 35→30 in `generateDashboard`. Plan should confirm the exact test.

## Exploration Findings

### Patterns Discovered
- proof.test.ts: dry-run test at line ~1244 verifies output text but not git side effects
- proof.test.ts: strengthen variadic at line ~3340 checks `f1.status`/`f2.status` but not `promoted_to` (lines 3353-3354)
- work.test.ts: conditional guard at line 2374 — `if (output.includes('Health:'))` wraps the only assertion
- proofSummary.test.ts: `getProofContext` tests at lines 1102-1143 all use `toBeGreaterThan(0)` with single-finding fixtures
- UNVERIFIED fallback: work.ts:802, pr.ts:119, proof.ts:65 — three consumers of `a.verifyStatus || 'UNVERIFIED'`

### Constraints Discovered
- [TYPE-VERIFIED] UNVERIFIED is a union member (proof.ts type: `'SATISFIED' | 'UNSATISFIED' | 'DEVIATED' | 'UNCOVERED' | 'UNVERIFIED'`) — the fallback is typed, just untested
- [OBSERVED] Dashboard cap is 30, not 20 — the `generateDashboard` cap test at line 1459 creates 35 findings, expects 30 shown
- [OBSERVED] The strengthen variadic test already counts commits (line 3357-3358) — same pattern can verify dry-run's no-commit guarantee

### Test Infrastructure
- proof.test.ts: `runProof()` helper returns `{ stdout, stderr, exitCode }`, `createCloseTestProject()` / `createPromoteTestProject()` / `createStrengthenTestProject()` set up git repos with proof chains
- work.test.ts: `completeWork()` helper, `console.log` capture pattern for output assertions
- proofSummary.test.ts: `writeChain()` helper writes proof_chain.json to temp dir, pure function tests

## For AnaPlan

### Structural Analog
The strengthen variadic test (proof.test.ts:3340) is the best structural analog — it already does the "check both status AND promoted_to" pattern for the single-promote test (line 2707-2708). The variadic version just forgot to copy the `promoted_to` assertion.

### Relevant Code Paths
- `tests/commands/proof.test.ts` — dry-run (1244), strengthen variadic (3340), A029 (search for MIN_ENTRIES_FOR_TREND), Promote section display (search for `not.toContain('Promote')`)
- `tests/commands/work.test.ts` — timestamp toBeDefined (2687-2689), multi-phase FAIL (search for `rejects.toThrow`), conditional guard (2374)
- `tests/utils/proofSummary.test.ts` — getProofContext toBeGreaterThan(0) (1106, 1116, 1130), dashboard cap (1459)
- `src/commands/work.ts:802` — UNVERIFIED fallback
- `src/commands/pr.ts:119` — UNVERIFIED fallback
- `src/commands/proof.ts:65` — UNVERIFIED status icon

### Patterns to Follow
- The single-promote test at proof.test.ts:2707-2708 shows the correct pattern: assert both `status` and `promoted_to`
- The commit-counting pattern at proof.test.ts:3357 (`git log --oneline | wc -l`) is reusable for the dry-run no-commit assertion

### Known Gotchas
- The think prompt's line numbers and cap values are slightly stale vs. current code — always verify against the actual file before writing assertions
- `console.log` capture in work.test.ts is fragile — the `originalLog` pattern means output depends on what the function logs, not what it returns

### Things to Investigate
- Is the health display threshold value visible in output? Determines whether AC3 option (c) is feasible.
- What does the UNVERIFIED path actually produce in each consumer? Plan should trace what happens when `verifyStatus` is undefined to understand what the test should assert.
