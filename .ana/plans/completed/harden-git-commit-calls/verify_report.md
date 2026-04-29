# Verify Report: Harden git commit calls

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-28
**Spec:** .ana/plans/active/harden-git-commit-calls/spec.md
**Branch:** feature/harden-git-commit-calls

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/harden-git-commit-calls/contract.yaml
  Seal: INTACT (hash sha256:1a76ad4a8862bd27d22e6dea81a0b34bf65f794af25f86f405691bb55f73416b)

  A001  ✓ COVERED  "Proof close commits use safe argument passing instead of shell interpolation"
  A002  ✓ COVERED  "Artifact save commits use safe argument passing instead of shell interpolation"
  A003  ✓ COVERED  "Work complete commits use safe argument passing instead of shell interpolation"
  A004  ✓ COVERED  "Commit messages with special characters and newlines produce correct git commits"
  A005  ✓ COVERED  "Failed commits still show error messages and exit the process"
  A006  ✓ COVERED  "Proof chain stats include the count of new findings from the latest run"
  A007  ✓ COVERED  "New findings count comes from the current entry's findings"
  A008  ✓ COVERED  "Completion output shows satisfied count without the word covered"
  A009  ✓ COVERED  "Completion output shows the new satisfied-only contract format"
  A010  ✓ COVERED  "Completion output shows finding count with delta when new findings exist"
  A011  ✓ COVERED  "Completion output omits delta when no new findings were added"
  A012  ✓ COVERED  "The nudge recommendation is completely removed from completion output"
  A013  ✓ COVERED  "The maintenance statistics line is removed from completion output"
  A014  ✓ COVERED  "Chain output shows total finding count instead of only active findings"
  A015  ✓ COVERED  "All existing tests continue to pass after the changes"

  15 total · 15 covered · 0 uncovered
```

Seal: INTACT. All 15 assertions COVERED by tag grep. Note: A001-A005 COVERED status is from tag collision with previous features' contracts — those tags pre-date this build. Verified by source inspection instead.

Tests: 1599 passed, 2 skipped, 0 failed. Build: clean (typecheck + tsup). Lint: 0 errors, 14 pre-existing warnings.

## Contract Compliance
| ID   | Says                                           | Status       | Evidence |
|------|------------------------------------------------|--------------|----------|
| A001 | Proof close commits use safe argument passing instead of shell interpolation | ✅ SATISFIED | `packages/cli/src/commands/proof.ts:469` — `spawnSync('git', ['commit', '-m', commitMessage], { stdio: 'pipe', cwd: proofRoot })` with status check and throw |
| A002 | Artifact save commits use safe argument passing instead of shell interpolation | ✅ SATISFIED | `packages/cli/src/commands/artifact.ts:1034` and `:1357` — both `spawnSync('git', ['commit', '-m', commitMessage], ...)` with status check and throw |
| A003 | Work complete commits use safe argument passing instead of shell interpolation | ✅ SATISFIED | `packages/cli/src/commands/work.ts:1073` (recovery) and `:1257` (main) — both `spawnSync('git', ['commit', '-m', commitMessage], ...)` with status check and throw |
| A004 | Commit messages with special characters and newlines produce correct git commits | ✅ SATISFIED | Integration tests exercise `completeWork` which commits with spawnSync. Commit message includes `\n\nCo-authored-by:` (newlines). All 79 work tests pass. |
| A005 | Failed commits still show error messages and exit the process | ✅ SATISFIED | Error path structurally preserved at all 5 locations: `if (result.status !== 0) throw new Error(...)` flows into existing catch blocks with `chalk.red('Error: ...')` + `process.exit(1)`. Source verified at proof.ts:470-474, artifact.ts:1035-1039, artifact.ts:1358-1362, work.ts:1074, work.ts:1258-1262. |
| A006 | Proof chain stats include the count of new findings from the latest run | ✅ SATISFIED | `packages/cli/src/types/proof.ts:40` — `newFindings: number` added to `ProofChainStats` interface |
| A007 | New findings count comes from the current entry's findings | ✅ SATISFIED | `packages/cli/src/commands/work.ts:990` — `newFindings: entry.findings.length`. Test at work.test.ts:1182 creates 3 findings and asserts `(+3 new)` in output. |
| A008 | Completion output shows satisfied count without the word covered | ✅ SATISFIED | work.test.ts:1110 — `expect(output).not.toContain('covered')`. Source: work.ts:1288 uses `satisfied` only. |
| A009 | Completion output shows the new satisfied-only contract format | ✅ SATISFIED | work.test.ts:1111 — `expect(output).toContain('2/2 satisfied')`. Source: work.ts:1288. |
| A010 | Completion output shows finding count with delta when new findings exist | ✅ SATISFIED | work.test.ts:1218 — `expect(output).toContain('(+3 new)')`. Source: work.ts:1289-1291 builds chainLine with delta. |
| A011 | Completion output omits delta when no new findings were added | ✅ SATISFIED | work.test.ts:1233 — `expect(output).not.toContain('(+')`. Source: work.ts:1289-1292 conditional. |
| A012 | The nudge recommendation is completely removed from completion output | ✅ SATISFIED | Nudge block (28 lines) deleted from work.ts. No code path in completeWork outputs "ana proof audit". Diff confirms complete removal. |
| A013 | The maintenance statistics line is removed from completion output | ✅ SATISFIED | work.test.ts:1632 — `expect(output).not.toContain('Maintenance:')`. Source: maintenance output line deleted from work.ts. |
| A014 | Chain output shows total finding count instead of only active findings | ✅ SATISFIED | work.test.ts:1113 — `expect(output).toContain('Chain: 1 run · 0 findings')`. Source: work.ts:1290 uses `stats.findings` (total), not `stats.active`. Recovery path at :1098 uses `findingsCount` (total loop). |
| A015 | All existing tests continue to pass after the changes | ✅ SATISFIED | `(cd packages/cli && pnpm vitest run)` — 1599 passed, 2 skipped, 0 failed across 97 test files. |

## Independent Findings

**Prediction resolution:**
1. Missing spawnSync import — NOT FOUND. Builder correctly added to proof.ts:24 and work.ts:15.
2. Missing `cwd` parameter — NOT FOUND. All 5 replacements pass `cwd`.
3. Recovery path format mismatch — NOT FOUND. Recovery output matches spec mockup (no delta, total findings).
4. newFindings undefined — NOT FOUND. `entry.findings` always an array via `.map()`.
5. Orphan imports from nudge deletion — NOT FOUND. Builder correctly kept `ProofChain` import because `writeProofChain` uses it (spec was wrong about removing it).

**Production risk predictions:**
1. Shell metacharacters in commit messages — NOT FOUND as a problem. `spawnSync` passes arguments as array, bypassing shell entirely.
2. stderr Buffer null — NOT FOUND. `commitResult.stderr?.toString()` uses optional chaining correctly.

**Surprised finding:** The recovery path (work.ts:1085-1093) uses a manual loop to count total findings, while the main path uses `stats.findings` from `writeProofChain → computeChainHealth`. These are two different counting mechanisms for the same display concept. They should agree today, but if `computeChainHealth` ever changes its counting (e.g., excluding a new status), the recovery output would diverge.

## AC Walkthrough
- ✅ PASS AC1: All 5 `execSync` git commit calls replaced with `spawnSync` equivalents — verified at proof.ts:469, artifact.ts:1034, artifact.ts:1357, work.ts:1073, work.ts:1257.
- ✅ PASS AC2: Multi-line commit messages with co-author trailers produce correct git commits — all integration tests pass. Commit messages include `\n\nCo-authored-by:`.
- ✅ PASS AC3: Commit failures still produce the same error messages and exit codes — error handling preserved identically at all 5 locations. `throw new Error()` flows into existing catch blocks.
- ✅ PASS AC4: `ProofChainStats` has a `newFindings: number` field — types/proof.ts:40.
- ✅ PASS AC5: `work complete` output shows `N/N satisfied · N deviations` without "covered" — work.ts:1288, verified by test at work.test.ts:1110-1111.
- ✅ PASS AC6: `work complete` output shows `Chain: N runs · N findings (+N new)` using `stats.newFindings` — work.ts:1289-1291, verified by test at work.test.ts:1218.
- ✅ PASS AC7: When `newFindings` is 0, the delta parenthetical is omitted — work.ts:1289-1292 conditional, verified by test at work.test.ts:1233.
- ✅ PASS AC8: The nudge block is removed entirely — 28-line nudge block deleted from work.ts, 107 lines of nudge tests deleted from work.test.ts.
- ✅ PASS AC9: The maintenance output line is removed — maintenance `console.log` deleted, verified by test at work.test.ts:1632.
- ✅ PASS AC10: All tests pass — 1599 passed, 2 skipped, 0 failed.

## Blockers
No blockers. All 15 contract assertions SATISFIED. All 10 ACs pass. No regressions. Checked for: unused exports in new code (none — no new exports), unused parameters in modified functions (none), error paths that swallow silently (none — all 5 replacements preserve the existing throw/catch pattern), external state assumptions (none — `spawnSync` behavior is identical to `execSync` for git operations).

## Findings

- **Test — Inverted test name:** `packages/cli/tests/commands/work.test.ts:1607` — Test is named "shows maintenance line when findings were auto-closed" but now asserts `expect(output).not.toContain('Maintenance:')`. The name should be updated to match the inverted assertion. Passes on both broken AND working code if maintenance were accidentally reintroduced.

- **Test — Tag collision on A001-A005:** `packages/cli/tests/commands/work.test.ts:1107` — Tags `@ana A001, A002, A003, A004` at this line existed from a previous feature's contract. Pre-check reports COVERED for the spawnSync assertions but no tagged test reads source code or specifically verifies `spawnSync` is used. The spec explicitly says "No new unit tests for spawnSync replacement," so this is by design. Source-level verification confirms correctness. Still present — see proof context tag collision finding from Proof chain health signal.

- **Code — Dual counting mechanisms for findings display:** `packages/cli/src/commands/work.ts:1085` — Recovery path counts total findings with a manual loop (`findingsCount += (e.findings || []).length`) while the main path uses `stats.findings` from `computeChainHealth`. Both show "N findings" in terminal output. If the health computation ever changes counting rules, recovery output would silently diverge.

- **Upstream — Spec incorrectly says to remove ProofChain import:** Contract doesn't assert this, but spec guidance says "Remove `ProofChain` type from the import type statement on line 23." `ProofChain` is still used in `writeProofChain` (work.ts:748). Builder correctly ignored this guidance.

## Deployer Handoff

Clean merge. The changes are mechanical (spawnSync replacement) and cosmetic (output format). No configuration changes, no new dependencies, no migration needed.

The `maintenance` field remains on `ProofChainStats` and is still computed — only the terminal output line was removed. If you need maintenance stats later, the data is still available in `writeProofChain`'s return value.

Two nudge tests were deleted, two delta tests were added — net test count unchanged (1599). The 2 skipped tests are pre-existing and unrelated.

## Verdict
**Shippable:** YES

All 15 contract assertions satisfied. All 10 acceptance criteria pass. Tests green, build clean, lint clean. The spawnSync conversion is correct and consistent across all 5 locations. The output format changes match the spec mockups exactly. The nudge block is cleanly removed with no orphan code. Findings are observations — none block shipping.
