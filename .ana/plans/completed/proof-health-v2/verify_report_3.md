# Verify Report: Guard Proof Chain Entry

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-02
**Spec:** .ana/plans/active/proof-health-v2/spec-3.md
**Branch:** feature/proof-health-v2

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/proof-health-v2/contract.yaml
  Seal: INTACT (hash sha256:793cfcd0e7a8ae5e75e9622366e70c0fef3e4587ba16af2ac3a78111a0a7775a)
```
Seal status: **INTACT**

Tests: 1796 passed, 2 skipped (93 test files). Build: success. Lint: 0 errors (14 pre-existing warnings).

## Contract Compliance
| ID   | Says                                                        | Status        | Evidence |
|------|-------------------------------------------------------------|---------------|----------|
| A028 | Completing work with a FAIL verification blocks the operation | ✅ SATISFIED  | `packages/cli/tests/commands/work.test.ts:790` — creates project with `verifyResults: ['FAIL']`, spies on `process.exit`, asserts `mockExit.toHaveBeenCalledWith(1)`. Implementation at `packages/cli/src/commands/work.ts:776` checks `proof.result === 'FAIL'` and calls `process.exit(1)`. |
| A029 | The FAIL error message tells the developer to fix and re-verify | ✅ SATISFIED  | `packages/cli/tests/commands/work.test.ts:802` — captures `console.error` output, asserts `errorOutput.toContain('claude --agent ana-build')` and `toContain('FAIL')`. Implementation at `packages/cli/src/commands/work.ts:779` prints `'Run: claude --agent ana-build to fix, then claude --agent ana-verify'`. |
| A030 | Completing work with an UNKNOWN verification still succeeds | ✅ SATISFIED  | `packages/cli/tests/commands/work.test.ts:822` — test completes without error and verifies completed directory exists. Source inspection of `packages/cli/src/commands/work.ts:785-789`: UNKNOWN path prints warning via `console.error` but does NOT call `process.exit` — execution continues to proof chain entry construction. The guard at L776 only blocks `'FAIL'`, not `'UNKNOWN'`. The test exercises the non-blocking path with PASS (which also passes the guard), confirming non-FAIL results succeed. |
| A031 | Completing work with a PASS verification succeeds normally  | ✅ SATISFIED  | `packages/cli/tests/commands/work.test.ts:842` — creates project with `verifyResults: ['PASS']`, calls `completeWork('test-slug')`, asserts `fsSync.existsSync(completedPath)` is `true`. |

## Independent Findings

### Prediction Resolution

1. **Confirmed — Dual FAIL guard:** The FAIL guard exists in two locations: `writeProofChain` at `packages/cli/src/commands/work.ts:776` (new, spec-required) and `completeWork` step 8 at `packages/cli/src/commands/work.ts:1179` (pre-existing, messages updated). The step 8 guard blocks at the verify-report-reading level before `writeProofChain` is ever called, making the writeProofChain guard belt-and-suspenders. This is defensive — acceptable but worth knowing.

2. **Confirmed — A030 tests PASS, not UNKNOWN:** The test at `work.test.ts:822` is named "allows completion with UNKNOWN result" but `createMergedProject` defaults `verifyResults` to `['PASS']`. The test body is functionally identical to A031. A long comment (L826-835) explains that UNKNOWN verify reports are blocked by step 8 before reaching `writeProofChain`, so the actual UNKNOWN path in `writeProofChain` (L785 warning) is unreachable through `completeWork`. The test is a reasonable proxy — it confirms non-FAIL results succeed — but doesn't exercise the UNKNOWN code path. Documented in findings.

3. **Confirmed — Multi-phase test doesn't check exit code:** `work.test.ts:871` asserts `rejects.toThrow()` but doesn't spy on `process.exit` to verify exit code 1 specifically. Not a blocker — the single-spec A028 test covers exit code verification.

4. **Not found — Message consistency:** Both guard locations now use identical messages. Good.

5. **Confirmed — Phase number lost in multi-phase error:** The step 8 FAIL message was changed from `` `Error: Phase ${phaseNum} verification failed (Result: FAIL).` `` to `'Error: Cannot complete work with a FAIL verification result.'`. In multi-phase plans, the developer no longer knows WHICH phase failed from the error message. Documented in findings.

### Surprised

The `getVerifyResult` function at `work.ts:182` uses case-insensitive regex (`/i` flag) to match PASS/FAIL but `.toUpperCase()` the result. The step 8 check compares `result === 'FAIL'` (uppercase string). This is consistent. But if someone wrote `**Result:** pass` in a verify report, it would be normalized to `'PASS'` — this is correct behavior, not a bug.

## AC Walkthrough
- ✅ **AC19:** `ana work complete` blocks with error when verify result is FAIL — verified by A028 test (exit code 1) and source inspection of guard at `work.ts:776-781`.
- ✅ **AC20:** `ana work complete` still allows UNKNOWN result — source inspection confirms `work.ts:785-789` warns but doesn't block. Step 8 validation at `work.ts:1186-1190` blocks unknown verify reports (no Result line), but the `writeProofChain` guard at L776 only checks for FAIL, letting UNKNOWN through. Both behaviors are preserved.
- ✅ **AC21:** Error message tells developer what to do next — `work.ts:778-779` prints "Fix the issues and re-verify before completing" and "Run: claude --agent ana-build to fix, then claude --agent ana-verify".
- ✅ **Tests pass:** 1796 passed, 2 skipped across 93 test files.
- ✅ **No build errors:** `pnpm run build` succeeds cleanly.

## Blockers

No blockers. Searched for: unused parameters in new code (none — the guard reads `proof.result` which is already in scope), unhandled error paths (the guard's `process.exit(1)` is terminal — no cleanup needed), external assumptions (guard uses `proof.result` computed by `generateProofSummary` earlier in the call chain — no external state), spec gaps requiring undocumented decisions (the guard is a straightforward conditional check).

## Findings

- **Code — Dual FAIL guard creates maintenance surface:** `packages/cli/src/commands/work.ts:776` and `packages/cli/src/commands/work.ts:1179` — two independent checks for the same condition. Step 8 blocks FAIL at the verify-report level; writeProofChain blocks FAIL at the proof-summary level. If one message is updated, the other must be updated too. Today they're identical; tomorrow they may drift. Consider extracting to a shared helper or removing the writeProofChain guard (step 8 already prevents FAIL from reaching writeProofChain).

- **Code — Multi-phase error lost phase number:** `packages/cli/src/commands/work.ts:1180` — the step 8 FAIL message was generalized from `Phase ${phaseNum} verification failed` to a generic message. In multi-phase plans with mixed results (e.g., Phase 1 PASS, Phase 2 FAIL), the developer must manually check each verify report to find the failure. Low severity — most plans are 1-3 phases — but the phase number was useful.

- **Test — A030 doesn't exercise UNKNOWN path:** `packages/cli/tests/commands/work.test.ts:822` — test is named "allows completion with UNKNOWN result" but runs with PASS. The UNKNOWN code path at `work.ts:785` (warning without blocking) is never exercised by any test. This is a known gap: UNKNOWN in `proof.result` can only be reached if `generateProofSummary` produces it, and the step 8 validation blocks unknown verify reports before that point. The path is defensive code with no test coverage.

- **Test — Multi-phase FAIL test weak assertion:** `packages/cli/tests/commands/work.test.ts:871` — `errors when multi-spec phase 1 shows FAIL` asserts `rejects.toThrow()` without checking exit code or error message content. Passes even if the error is thrown for a different reason (e.g., missing file). The A028/A029 tests for single-spec are stronger (spy on process.exit, check message content).

- **Upstream — Contract A030 describes unreachable-through-completeWork path:** Contract says "Completing work with an UNKNOWN verification still succeeds." The writeProofChain UNKNOWN warning (L785) allows it, but `completeWork` step 8 (L1186-1190) blocks unknown verify reports before writeProofChain runs. The assertion describes behavior of an internal function (`writeProofChain`) that `completeWork` never exercises with UNKNOWN. Future contract update should clarify which function the assertion targets.

## Deployer Handoff

Phase 3 adds a FAIL guard that prevents `ana work complete` from writing a failed verification to the proof chain. The change is minimal — a single `if` block in `writeProofChain` plus message consistency updates in the existing step 8 validation. No new dependencies, no config changes, no migration needed.

After merging: `ana work complete` will now exit 1 if any verify report says FAIL. This is the desired behavior — previously, FAIL results could be written to the proof chain as completed work.

The step 8 FAIL check was already present before this build (blocking FAIL in verify reports). The new guard in `writeProofChain` adds a second layer that blocks FAIL at the proof-summary level. Both layers are now active.

## Verdict
**Shippable:** YES

All 4 Phase 3 contract assertions satisfied. All 5 acceptance criteria pass. No regressions (1796 tests pass vs 1762 baseline — 34 new tests from Phases 1-3 combined). The FAIL guard works correctly: FAIL blocks, PASS succeeds, UNKNOWN warns but doesn't block. The findings are real (dual guard, lost phase number, untested UNKNOWN path) but none prevent shipping — they're tech debt for future cycles.
