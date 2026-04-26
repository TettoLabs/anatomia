# Verify Report: Proof chain health signal

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-25
**Spec:** .ana/plans/active/proof-chain-health-signal/spec.md
**Branch:** feature/proof-chain-health-signal

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/proof-chain-health-signal/contract.yaml
  Seal: INTACT (commit d7bc521, hash sha256:c93755baac76b...)

  A001  ✓ COVERED  "Completion output shows the chain balance instead of a static confirmation"
  A002  ✓ COVERED  "The old write confirmation no longer appears"
  A003  ✓ COVERED  "Callout count is zero when the entry has no callouts"
  A004  ✓ COVERED  "Singular 'run' is used when chain has exactly one entry"
  A005  ✓ COVERED  "Cumulative run count reflects all entries in the chain"
  A006  ✓ COVERED  "Plural 'runs' is used when chain has more than one entry"
  A007  ✓ COVERED  "Chain balance line uses the dot separator convention"
  A008  ✓ COVERED  "writeProofChain returns run and callout counts"
  A009  ✓ COVERED  "Returned callout count sums across all entries defensively"

  9 total · 9 covered · 0 uncovered
```

Tests: 1476 passed, 0 failed, 2 skipped (97 test files). Build: clean. Lint: clean.

## Contract Compliance
| ID   | Says                                                                 | Status        | Evidence |
|------|----------------------------------------------------------------------|---------------|----------|
| A001 | Completion output shows the chain balance instead of a static confirmation | ✅ SATISFIED | `work.test.ts:1095` — `expect(output).toContain('Chain: 1 run · 0 callouts')` |
| A002 | The old write confirmation no longer appears                         | ✅ SATISFIED | `work.test.ts:1094` — `expect(output).not.toContain('Proof saved to chain')` matches `not_contains` matcher |
| A003 | Callout count is zero when the entry has no callouts                 | ✅ SATISFIED | `work.test.ts:1095` — output contains `0 callouts`; fixture has no callouts section in verify report |
| A004 | Singular 'run' is used when chain has exactly one entry              | ✅ SATISFIED | `work.test.ts:1095` — output contains `1 run ` (singular, with trailing space before `·`) |
| A005 | Cumulative run count reflects all entries in the chain               | ✅ SATISFIED | `work.test.ts:1114` — `expect(output).toContain('Chain: 2 runs · 0 callouts')` with `existingChain: true` fixture (1 prior + 1 new = 2) |
| A006 | Plural 'runs' is used when chain has more than one entry             | ✅ SATISFIED | `work.test.ts:1114` — output contains `2 runs` (plural) |
| A007 | Chain balance line uses the dot separator convention                  | ✅ SATISFIED | `work.test.ts:1095` — output contains `run · 0` (middle dot separator between run count and callout count) |
| A008 | writeProofChain returns run and callout counts                       | ✅ SATISFIED | `work.ts:890-892` returns `{ runs, callouts }`; `work.ts:1060` destructures return; `work.test.ts:1095` verifies runs=1 indirectly via output containing `1 run` |
| A009 | Returned callout count sums across all entries defensively           | ✅ SATISFIED | `work.ts:891` uses `(e.callouts || []).length` across all entries; `work.test.ts:1114` exercises this with `existingChain: true` where prior entry has NO callouts array (fixture line 868-873) — output shows `0 callouts` confirming defensive sum |

## Independent Findings

**Implementation quality is high.** The diff is minimal (12 lines of source, 23 lines of test), focused, and follows every spec instruction.

**Prediction resolutions:**
1. *JSDoc @returns missing* — NOT FOUND. `work.ts:742` has `@returns Chain health counts: total runs and cumulative callouts`. Builder updated it.
2. *Defensive callout handling missed* — NOT FOUND. `work.ts:891` uses `(e.callouts || []).length` — matches the pattern at line 845 as spec directed.
3. *Only 2-entry test, no 3+ test* — CONFIRMED but acceptable. Tests cover 1-entry and 2-entry paths, exercising both singular/plural and the reduce accumulator. A 3+ entry test would add no new code path coverage.
4. *Pluralization misses one dimension* — NOT FOUND. `work.ts:1107` handles both `run/runs` and `callout/callouts` with separate ternaries.
5. *chalk.gray not testable* — NOT FOUND. Tests pass because chalk strips ANSI codes in non-TTY test environment. The `toContain` assertions match the plain text content.

**Production risk assessment:**
- *writeProofChain throws after file write but before return* — The count computation (lines 890-892) is pure arithmetic on in-memory data that was just successfully written. No I/O between the write and the return. Risk is negligible.
- *Empty chain.entries after push* — Impossible. `push` is called earlier in the function, and `entries` is initialized as `[]` if the file doesn't exist. The reduce on line 891 handles an empty array safely (returns 0).

**Over-building check:** No extra parameters, no new exports, no unused functions, no code paths beyond what the spec requires. The builder built exactly what was specified and nothing more.

**A008/A009 tag collision:** `@ana A008, A009` also appears at `work.test.ts:423` from a prior feature's contract (configurable branchPrefix). Pre-check counts these as COVERED but they're unrelated tests. The actual coverage for THIS contract's A008/A009 is at lines 1090 and 1098 respectively. No impact — the real tests exist and satisfy the assertions.

## AC Walkthrough

- **AC1:** After `ana work complete`, the third line of the summary shows `Chain: {N} run(s) · {M} callout(s)` with correct counts — ✅ PASS. `work.ts:1107` prints `chalk.gray(\`  Chain: ${runs} ... · ${callouts} ...\`)`. Test at line 1095 confirms `Chain: 1 run · 0 callouts` for single entry.
- **AC2:** The line `Proof saved to chain.` no longer appears in completion output — ✅ PASS. `work.ts:1107` replaced the old `console.log('  Proof saved to chain.')`. Test at line 1094 asserts `not.toContain('Proof saved to chain')`.
- **AC3:** On the first-ever pipeline run, the line prints with singular "run" and correct callout count — ✅ PASS. Test at line 1095 with no `existingChain` confirms `Chain: 1 run · 0 callouts`.
- **AC4:** When an entry has zero callouts, the total callout count reflects only other entries' callouts — ✅ PASS. Both fixtures produce 0 callouts. The defensive `|| []` at `work.ts:891` ensures entries without a callouts array contribute 0, not throw.
- **AC5:** Appending to an existing chain shows cumulative totals — ✅ PASS. Test at line 1114 with `existingChain: true` confirms `Chain: 2 runs · 0 callouts` (1 prior + 1 new).
- **AC6:** The existing `prints proof summary line` test passes with updated assertions — ✅ PASS. Test at line 1075 passes (1476 total passed).
- **AC7:** All existing tests pass — no regressions — ✅ PASS. 1476 passed, 2 skipped (same 2 skipped as baseline), 0 failed. Baseline was 1475 + 1 new = 1476.
- **AC8:** `writeProofChain` returns `{ runs, callouts }` — clean function boundary — ✅ PASS. `work.ts:744` signature returns `Promise<{ runs: number; callouts: number }>`. Computation at lines 890-892. Destructured at line 1060.

## Blockers

No blockers found. All 9 contract assertions satisfied. All 8 acceptance criteria pass. No test failures or regressions. Checked for: unused exports in new code (none — `writeProofChain` remains internal), unused parameters (none — `runs` and `callouts` are both used in the console.log), unhandled error paths (the count computation is pure arithmetic on validated in-memory data), assumptions about external state (none — counts are derived from `chain.entries` already in memory).

## Callouts

- **Code — Inline return type instead of named interface:** `work.ts:744` — `Promise<{ runs: number; callouts: number }>` is an anonymous object type. If other consumers ever need these counts (e.g., a JSON output mode for `work complete`), this shape would need to be extracted into a named interface. Low priority — the function is internal and has one call site.

- **Code — A008/A009 tag collision with prior feature:** `work.test.ts:423` — Tags `@ana A008, A009` exist from a previous feature's contract (configurable branchPrefix). Pre-check tools that grep for `@ana A008` will find both. No functional impact today, but as tag density grows, disambiguation may be needed (e.g., feature-scoped tag namespaces).

- **Test — No test exercises nonzero callout counts:** Both test paths (single entry and existing chain) produce `0 callouts` because neither fixture includes callouts in the verify report or prior chain entry. A test with a fixture that has actual callouts would exercise the accumulation arithmetic beyond `0 + 0`. The `reduce` logic is correct by inspection (`(e.callouts || []).length` summed), but it's untested with nonzero values.

- **Test — chalk.gray verified only by absence of failure:** The spec requires `chalk.gray()` wrapping (constraint). The tests confirm the text content but not the styling — chalk strips ANSI in non-TTY. This is standard for CLI tests and not a gap per se, but the chalk.gray requirement is verified by code reading (`work.ts:1107`), not by test assertion.

- **Upstream — Contract A008/A009 block names imply unit tests:** Contract blocks "returns chain health counts" and "returns cumulative callout counts with existing chain" suggest direct unit assertions on the return value (`result.runs equals 1`). The builder used integration tests instead, which is the right call since `writeProofChain` is internal. But the contract's `target: result.runs` / `matcher: equals` framing doesn't match `toContain` on console output. Future contracts for internal functions could use `target: output` to match the actual test approach.

## Deployer Handoff

Minimal, low-risk change. Two locations in `work.ts` modified: (1) `writeProofChain` now returns `{ runs, callouts }` instead of void — computed from in-memory chain data after the file write. (2) Summary print block uses the returned counts in a `chalk.gray` line replacing the static "Proof saved to chain." message. One new test added for the cumulative path. No new dependencies, no config changes, no migration steps.

## Verdict
**Shippable:** YES

All 9 contract assertions satisfied. All 8 acceptance criteria pass. 1476 tests pass with 0 regressions. Build and lint clean. The implementation is focused, follows spec guidance precisely, and handles the defensive callout path correctly. The callouts above are informational — none affect correctness or shippability.
