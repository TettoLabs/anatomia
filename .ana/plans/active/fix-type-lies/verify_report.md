# Verify Report: Fix Type Lies

**Result:** PASS
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
| A014 | Trend improvement test asserts change.changed is true unconditionally | DEVIATED | Contract prescribed removing the `if (change.changed)` guard and adding `expect(change.changed).toBe(true)`. Builder investigated and found the guard is correct — `change.changed` is legitimately false for this test data. See Independent Findings for full trace. |
| A015 | Trend improvement test has no conditional guard around its assertion | DEVIATED | Same as A014. The guard is correct. Removing it would break the test because the test data produces improving→improving (no direction change), so `change.changed` is false. The contract prescribed the wrong fix. |
| A016 | All existing tests still pass after the fixes | ✅ SATISFIED | 1762 passed, 0 failed, 2 skipped across 93 test files |
| A017 | One new test exists — the guard test — bringing total from 1777 to 1778 | DEVIATED | Main baseline is 1761 (not 1777). Branch is 1762 (+1 guard test). Builder correctly added 1 test. Contract baseline stale — shifted when clean-proofsummary deleted tests before this scope ran. |

## Independent Findings

**Prediction resolution:**
- Predicted test count mismatch with contract: **Confirmed** — 1762 ≠ >1777. Root cause is stale contract baseline (1777 at seal time, 1761 now on main). Builder added +1 guard test correctly.
- Predicted init.test.ts might miss a location: **Not found** — all 6 hardcoded locations replaced comprehensively.
- Predicted guard test might use weak assertion: **Not found** — uses `toEqual` on sorted arrays comparing actual filenames. Strong assertion.
- Predicted conditional assertion might still be present: **Confirmed** — but the builder was right to keep it. I traced the logic myself (see below).
- Predicted template changes correct: **Not found** — both template and dogfood copy match, correct parenthetical pattern.

**A014/A015 deviation trace (independently verified):**

`detectHealthChange` computes health for the current chain (all entries) and previous chain (all minus last). It fires `trend_improved` only when trend *direction* changes (`proofSummary.ts:918`: `currentTrendIdx !== previousTrendIdx`).

Test data at `proofSummary.test.ts:2336-2349`:
- Entries 0-4: 4 risks each (20 total)
- Entries 5-10: 1 risk each (6 total)

Previous chain (10 entries): last 5 = entries 5-9 (avg 1.0 risk), earlier 5 = entries 0-4 (avg 4.0 risk). 1.0 < 4.0 → trend = **improving**.

Current chain (11 entries): last 5 = entries 6-10 (avg 1.0 risk), earlier 6 = entries 0-5 (avg 3.5 risk). 1.0 < 3.5 → trend = **improving**.

Both improving → `currentTrendIdx === previousTrendIdx` → condition false → `trend_improved` never pushed → `change.changed` remains false. The guard is correct. Removing it would make the test fail, which would require fixing the test data — a scope expansion beyond "make the code honest."

The original proof chain finding that flagged this (`detectHealthChange 'detects trend improvement' unit test uses conditional assertion`) correctly identified that the assertion never executes, but the prescribed fix (remove the guard) was wrong. The test data doesn't actually produce a detectable trend change — it produces trend continuation. The real fix would be to restructure the test data so the 10-entry chain has a different trend direction than the 11-entry chain, but that's new work, not a "type lie" fix.

## Previous Findings Resolution

### Previously UNSATISFIED Assertions
| ID | Previous Issue | Current Status | Resolution |
|----|----------------|----------------|------------|
| A014 | Test still has `if (change.changed)` guard | DEVIATED | Guard is correct — contract prescribed wrong fix. Builder investigated, found `change.changed` is legitimately false for this test data. Independently verified by tracing `proofSummary.ts:918` logic against test data. |
| A015 | `if (change.changed)` still present | DEVIATED | Same as A014 — the guard protects a conditional that legitimately doesn't fire. |
| A017 | Count 1762 not >1777 | DEVIATED | Stale contract baseline. Main has 1761 tests. Builder added 1 guard test (+1 to 1762). Baseline shifted when clean-proofsummary deleted tests before this scope ran. |

### Previous Findings
| Finding | Status | Notes |
|---------|--------|-------|
| Fix 6 completely skipped | Resolved — reclassified as deviation | Builder intentionally skipped; guard is correct. See A014/A015 trace. |
| Dogfood sync test loop short-circuit | Still present | Pre-existing, not in scope. Loop now covers 6 files instead of 4. |
| Contract A017 value stale | Still present | Reclassified as deviation. Contract baseline was 1777; real baseline is 1761. |
| Init.test.ts frontmatter branch coverage | Still present | Grouping of ana-build/ana-verify/ana-learn is reasonable for now. |

## AC Walkthrough
- AC1: ✅ PASS — `agent-proof-context.test.ts:69` iterates `[...AGENT_FILES]` (6 agents)
- AC2: ✅ PASS — `init.test.ts:195,219,73` use `AGENT_FILES.length` instead of hardcoded counts
- AC3: ✅ PASS — `init.test.ts:62,208,220,230,281,288` reference `AGENT_FILES` for agent name arrays
- AC4: ✅ PASS — Guard test at `agent-proof-context.test.ts:79-83` compares sorted `readdirSync` output to sorted `AGENT_FILES`
- AC5: ✅ PASS — `templates/.claude/agents/ana-verify.md:107` mentions `verify_data_N.yaml`
- AC6: ✅ PASS — `templates/.claude/agents/ana-verify.md:73` mentions `verify_data_N.yaml`
- AC7: ✅ PASS — `diff` confirms dogfood copy matches template byte-identical
- AC8: ✅ PASS — `proof.ts:841` has `skill?: string`
- AC9: ✅ PASS — `work.ts:843` comment says "path resolution and status assignment" — no "reopen"
- AC10: ⚠️ PARTIAL — Fix 6 was intentionally not applied. The conditional guard is correct for the current test data. The test still silently passes without asserting its primary claim, but removing the guard would break the test. Properly fixing this requires restructuring the test data — new work beyond this scope. Marked PARTIAL rather than FAIL because the builder's judgment was correct.
- AC11: ✅ PASS — All tests pass (0 failures). Build compiles without errors. The conditional assertion is a pre-existing test quality issue, not a regression.

## Blockers

No blockers. Checked: all 14 SATISFIED contract assertions verified with evidence, all new exports in modified files are used (AGENT_FILES imported by both test files and existing consumers), no unused parameters in modified functions, no unhandled error paths introduced, no assumptions about external state added. The `readdirSync` in the guard test uses the existing `templatesDir` constant (line 6). The `proof.ts` type fix aligns with the existing runtime null-check at line 888.

## Findings

- **Upstream — Contract A014/A015 prescribed wrong fix:** The contract said to remove the `if (change.changed)` guard in `packages/cli/tests/utils/proofSummary.test.ts:2352`. The guard is correct — `change.changed` is legitimately false for this test data because the trend direction doesn't change (improving→improving). The real disease is that the test *title* says "detects trend improvement" but the test data doesn't actually produce a detectable change. Future scope: restructure test data so entries 0-9 produce a non-improving trend and entry 10 shifts it to improving.
- **Test — Dogfood sync test loop short-circuit:** `packages/cli/tests/templates/agent-proof-context.test.ts:71-75` — The `for` loop short-circuits on first failure, skipping remaining files. Pre-existing (see proof context), not in scope, but the loop now covers 6 files instead of 4, making the masking effect worse. Still present — see proof context finding.
- **Upstream — Contract A017 baseline stale:** Contract says `test.passed_count > 1777` but the real baseline on main is 1761 (branch is 1762, +1 guard test). Baseline shifted when clean-proofsummary deleted tests. Update contract value on next seal.
- **Code — Init frontmatter branch grouping:** `packages/cli/tests/commands/init.test.ts:260` — The `else if` branch groups `ana-build.md`, `ana-verify.md`, and `ana-learn.md` together, assuming identical frontmatter (model opus, no tools, no memory). If any of these agents later diverge, this branch masks the difference. The guard test at `agent-proof-context.test.ts:79-83` catches filename drift but not frontmatter drift between grouped agents.

## Deployer Handoff

All 5 implemented fixes are clean. No regressions. The 3 deviations (A014, A015, A017) are documented — A014/A015 are a contract error (prescribed wrong fix), A017 is a stale baseline.

The "detects trend improvement" test at `proofSummary.test.ts:2334` remains a test that can pass without asserting its primary claim. This is pre-existing tech debt, not introduced by this build. Future scope should restructure the test data to produce an actual trend direction change.

Lint warnings (14, all `@typescript-eslint/no-explicit-any`) are pre-existing and unrelated to this build.

## Verdict
**Shippable:** YES
14 of 17 contract assertions SATISFIED. 3 DEVIATED — 2 due to a contract error (A014/A015 prescribed the wrong fix; the builder correctly investigated and skipped), 1 due to a stale baseline (A017). All 10 non-deviated ACs pass. Tests green. Build clean. No regressions. The 5 implemented fixes are surgical and correct — each makes the code more honest without changing behavior, which is exactly what the spec asked for.
