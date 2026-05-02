# Verify Report: Fix Type Lies

**Result:** FAIL
**Created by:** AnaVerify
**Date:** 2026-05-01
**Spec:** .ana/plans/active/fix-type-lies/spec.md
**Branch:** feature/fix-type-lies

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/fix-type-lies/contract.yaml
  Seal: INTACT (hash sha256:ce28c8bc3f83f4277d4ff8bfceb39ce8b58ded9ff8cf2582bd475a713c193f19)
```

Seal: INTACT.

Tests: 1762 passed, 0 failed, 2 skipped (93 test files). Build: success. Lint: 0 errors, 14 warnings (pre-existing).

## Contract Compliance
| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Dogfood sync test checks all six agents, not a hardcoded subset | ✅ SATISFIED | `packages/cli/tests/templates/agent-proof-context.test.ts:69` — `const files = [...AGENT_FILES]` |
| A002 | Dogfood sync test no longer contains a hardcoded four-agent array | ✅ SATISFIED | `packages/cli/tests/templates/agent-proof-context.test.ts:69` — hardcoded array replaced with `[...AGENT_FILES]` spread |
| A003 | A guard test verifies template directory contents match AGENT_FILES | ✅ SATISFIED | `packages/cli/tests/templates/agent-proof-context.test.ts:79-83` — guard test uses `readdirSync`, filters `.md`, compares sorted arrays |
| A004 | Guard test compares sorted filesystem listing to sorted AGENT_FILES | ✅ SATISFIED | `packages/cli/tests/templates/agent-proof-context.test.ts:80-82` — both sides `.sort()`, compared with `toEqual` |
| A005 | Init test agent count uses AGENT_FILES.length instead of hardcoded 5 | ✅ SATISFIED | `packages/cli/tests/commands/init.test.ts:195` — template literal `${AGENT_FILES.length}`, line 219 `AGENT_FILES.length`, line 73 `7 + AGENT_FILES.length` |
| A006 | Init template inventory generates agent entries from AGENT_FILES | ✅ SATISFIED | `packages/cli/tests/commands/init.test.ts:62` — `...AGENT_FILES.map(f => '.claude/agents/' + f)` |
| A007 | Init test frontmatter validation iterates AGENT_FILES | ✅ SATISFIED | `packages/cli/tests/commands/init.test.ts:230` — `for (const agentFile of AGENT_FILES)` |
| A008 | Verify template re-verify cleanup mentions numbered verify_data file | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md:73` — contains `verify_data_N.yaml` |
| A009 | Verify template Step 6b mentions numbered verify_data file | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md:107` — contains `verify_data_N.yaml` |
| A010 | Dogfood ana-verify.md matches the shipped template exactly | ✅ SATISFIED | `diff` of template vs dogfood returns empty — byte-identical |
| A011 | Promote command types skill as optional | ✅ SATISFIED | `packages/cli/src/commands/proof.ts:841` — `skill?: string` |
| A012 | Promote command no longer types skill as required string | ✅ SATISFIED | `packages/cli/src/commands/proof.ts:841` — no `skill: string;` present |
| A013 | Staleness check comment no longer references the deleted reopen loop | ✅ SATISFIED | `packages/cli/src/commands/work.ts:843` — `// Staleness checks — run after path resolution and status assignment` — no "reopen" |
| A014 | Trend improvement test asserts change.changed is true unconditionally | ❌ UNSATISFIED | `packages/cli/tests/utils/proofSummary.test.ts:2352` — still has `if (change.changed)` guard; no unconditional `expect(change.changed).toBe(true)` |
| A015 | Trend improvement test has no conditional guard around its assertion | ❌ UNSATISFIED | `packages/cli/tests/utils/proofSummary.test.ts:2352` — `if (change.changed)` still present |
| A016 | All existing tests still pass after the fixes | ✅ SATISFIED | 1762 passed, 0 failed, 2 skipped across 93 test files |
| A017 | One new test exists — the guard test — bringing total from 1777 to 1778 | ❌ UNSATISFIED | 1762 passed, not >1777. However: main baseline is 1761, branch is 1762 (+1 guard test). The contract value 1777 is stale — the real baseline shifted since the spec was written. See Findings for upstream note. |

## Independent Findings

**Prediction resolution:**
- Predicted test count mismatch with contract: **Confirmed** — 1762 ≠ >1777. Root cause is stale contract baseline (1777), not a builder error. Main has 1761 tests. Builder added +1 guard test correctly.
- Predicted init.test.ts might miss a location: **Not found** — all 6 hardcoded locations replaced. Thorough work.
- Predicted guard test might use weak assertion: **Not found** — uses `toEqual` on sorted arrays comparing actual filenames. Strong.
- Predicted conditional assertion might still be present: **Confirmed** — Fix 6 was never implemented. `proofSummary.test.ts:2352` still has `if (change.changed)`.
- Predicted template changes correct: **Not found** — both template and dogfood copy match, correct parenthetical pattern.

**Surprise:** The builder implemented 5 of 6 fixes. Fix 6 (the conditional assertion removal in proofSummary.test.ts) was completely skipped — no commit touches that file.

## AC Walkthrough
- AC1: ✅ PASS — `agent-proof-context.test.ts:69` iterates `[...AGENT_FILES]` (6 agents)
- AC2: ✅ PASS — `init.test.ts:195,219,73` use `AGENT_FILES.length` instead of hardcoded counts
- AC3: ✅ PASS — `init.test.ts:62,208,220,230,281,288` reference `AGENT_FILES` for agent name arrays
- AC4: ✅ PASS — Guard test at `agent-proof-context.test.ts:79-83` compares sorted `readdirSync` output to sorted `AGENT_FILES`
- AC5: ✅ PASS — `templates/.claude/agents/ana-verify.md:107` mentions `verify_data_N.yaml`
- AC6: ✅ PASS — `templates/.claude/agents/ana-verify.md:73` mentions `verify_data_N.yaml`
- AC7: ✅ PASS — `diff` confirms dogfood copy matches template exactly
- AC8: ✅ PASS — `proof.ts:841` has `skill?: string`
- AC9: ✅ PASS — `work.ts:843` comment says "path resolution and status assignment" — no "reopen"
- AC10: ❌ FAIL — `proofSummary.test.ts:2352` still has `if (change.changed)` guard. Fix 6 was not implemented.
- AC11: ⚠️ PARTIAL — All tests pass (0 failures). Build compiles. But the conditional assertion fix was skipped, so the test suite includes a test that can pass without asserting.

## Blockers

1. **Fix 6 not implemented:** `packages/cli/tests/utils/proofSummary.test.ts:2352-2354` — the `if (change.changed)` conditional guard around the trend improvement assertion was never removed. The spec explicitly requires this fix (lines 52-54). Contract assertions A014 and A015 are UNSATISFIED.

## Findings

- **Code — Fix 6 completely skipped:** `packages/cli/tests/utils/proofSummary.test.ts:2352-2354` — The conditional guard `if (change.changed) { expect(change.triggers).toContain('trend_improved'); }` remains. This test silently passes without asserting when `change.changed` is false. The spec requires replacing this with `expect(change.changed).toBe(true)` followed by the triggers assertion unconditionally. No commit in this branch touches proofSummary.test.ts.
- **Test — Dogfood sync test loop short-circuit:** `packages/cli/tests/templates/agent-proof-context.test.ts:71-75` — Still present from proof context. The `for` loop in the dogfood sync test short-circuits on first failure, skipping remaining files. Pre-existing, not in this scope, but worth noting since the loop now covers 6 files instead of 4. Still present — see proof context finding.
- **Upstream — Contract A017 value stale:** Contract says `test.passed_count > 1777` but the real baseline on main is 1761 (branch is 1762). The contract was sealed with an incorrect baseline. The builder correctly added 1 guard test (+1 from main). Update contract value on next seal.
- **Code — init.test.ts frontmatter branch coverage:** `packages/cli/tests/commands/init.test.ts:260` — The `else if` branch for `ana-build.md || ana-verify.md || ana-learn.md` groups three agents together. If any of these agents later diverge in frontmatter (e.g., ana-learn gets tools), this branch masks the difference. Not a blocker — the guard test catches filename drift, and frontmatter assertions are per-agent. But the grouping is an assumption worth monitoring.

## Deployer Handoff

Fix 6 must be applied before merge. The change is surgical: in `packages/cli/tests/utils/proofSummary.test.ts` at line 2352-2354, replace `if (change.changed) { expect(change.triggers).toContain('trend_improved'); }` with `expect(change.changed).toBe(true); expect(change.triggers).toContain('trend_improved');`. Run the test file afterward to confirm it passes unconditionally.

Contract A017's baseline value (1777) is stale — the real baseline is 1761. On next plan cycle, update the contract to reflect the current test count. This is not a code fix, it's a contract metadata correction.

All other fixes (5 of 6) are clean. No over-building detected — the builder changed exactly what the spec asked for and nothing more.

## Verdict
**Shippable:** NO
Fix 6 (conditional assertion removal in proofSummary.test.ts) was not implemented. 2 contract assertions UNSATISFIED (A014, A015). 1 AC failed (AC10). The remaining 5 fixes are correct and well-executed — this is a single missing fix, not a systemic problem.
