# Verify Report: Learn V3 Phase 1 — readCoAuthor + Variadic Close/Promote

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-01
**Spec:** .ana/plans/active/learn-v3-cli-commands/spec-1.md
**Branch:** feature/learn-v3-cli-commands

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/learn-v3-cli-commands/contract.yaml
  Seal: INTACT (hash sha256:9782624f74d9b13ee1370256b2bd35daf1998bdbc297e37819d9229a4dc85228)
```

Tests: 1719 passed, 2 skipped (1721 total). Build: success. Lint: 0 errors, 14 warnings (pre-existing).

## Contract Compliance
| ID   | Says                                           | Status       | Evidence |
|------|------------------------------------------------|--------------|----------|
| A001 | A shared utility reads the co-author name from project config | ✅ SATISFIED | `packages/cli/tests/utils/git-operations.test.ts:107`, asserts `readCoAuthor(tempDir)` returns `'Custom Bot <bot@example.com>'` via `toBe` |
| A002 | Co-author utility falls back to the default when config is missing | ✅ SATISFIED | `packages/cli/tests/utils/git-operations.test.ts:114`, asserts `readCoAuthor(tempDir)` returns `'Ana <build@anatomia.dev>'` via `toBe` |
| A003 | Inline co-author reads are replaced with the shared utility | ✅ SATISFIED | Source inspection: grep for inline coAuthor patterns (`readFileSync.*ana\.json.*coAuthor`, `config\.coAuthor`, `let coAuthor.*Ana.*build@anatomia`) returns zero matches in `packages/cli/src/`. All 4 command files import `readCoAuthor` from `git-operations.js`. |
| A004 | Closing a single finding still works after the variadic change | ✅ SATISFIED | `packages/cli/tests/commands/proof.test.ts:1178`, asserts `exitCode` equals `0` via `toBe(0)` |
| A005 | Multiple findings can be closed in a single command | ✅ SATISFIED | `packages/cli/tests/commands/proof.test.ts:1191`, closes F001 and F002, asserts both `status === 'closed'` — closedCount = 2 |
| A006 | Closing multiple findings produces only one git commit | ✅ SATISFIED | `packages/cli/tests/commands/proof.test.ts:1209`, asserts `parseInt(commitCount) === 2` (init + 1 close commit) |
| A007 | Invalid finding IDs are skipped without blocking valid ones | ✅ SATISFIED | `packages/cli/tests/commands/proof.test.ts:1214`, stdout contains `'F999'` and `'skipped'` |
| A008 | Dry run shows what would happen without making changes | ✅ SATISFIED | `packages/cli/tests/commands/proof.test.ts:1243`, asserts `finding.status === 'active'` after dry-run via `toBe('active')` |
| A009 | Close commits include the co-author trailer | ✅ SATISFIED | `packages/cli/tests/commands/proof.test.ts:1277`, asserts `git log -1 --pretty=%B` contains `'Co-authored-by: Custom Bot <bot@test.com>'` via `toContain` |
| A010 | Promoting a single finding still works after the variadic change | ✅ SATISFIED | `packages/cli/tests/commands/proof.test.ts:2531`, asserts `exitCode` equals `0` via `toBe(0)` |
| A011 | Multiple findings can be promoted in a single command | ✅ SATISFIED | `packages/cli/tests/commands/proof.test.ts:2543`, promotes F001 and F002, asserts both `status === 'promoted'` — promotedCount = 2 |
| A012 | Promoting multiple findings appends only one rule to the skill file | ✅ SATISFIED | `packages/cli/tests/commands/proof.test.ts:2560`, asserts rule text matches `toHaveLength(1)` |
| A013 | Promote commits include the co-author trailer | ✅ SATISFIED | `packages/cli/tests/commands/proof.test.ts:2571`, asserts `git log -1 --pretty=%B` contains `'Co-authored-by: Custom Bot <bot@test.com>'` via `toContain` |

## Independent Findings

**Prediction resolution:**

1. "Inline dedup count may be off" — **Not found.** Grep confirms zero inline reads in `src/`. All 4 files (artifact, work, pr, proof) import `readCoAuthor`.
2. "Close with ALL invalid IDs may not exit 1" — **Not found.** Test at line 1233 covers this, code at line 529 handles with `process.exit(1)`.
3. "Promote rule count check may be loose" — **Not found.** Test at line 2560 checks `toHaveLength(1)` on regex matches — specific, not loose.
4. "Dry-run might not verify no commit" — **Confirmed (minor).** Test checks finding.status is still 'active' but doesn't count commits. The code returns at line 582 before the commit section, so the test is adequate but not mechanically proving "no commit."
5. "Co-author separator inconsistency" — **Not found.** Both close (line 606) and promote (line 961) use `\n\n` consistently.

**Surprise finding:** The `exitError` helper function is defined inline inside both the close and promote action handlers (~30 lines each). They share the same structure: read chain for JSON error wrapping, format error messages, exit. This is existing pattern — the builder followed the pre-existing close handler structure. Not a regression, but duplicated logic that could be extracted.

**Over-building check:** No unused exports found. `readCoAuthor` is imported in all 4 source files plus the test file. No new parameters, functions, or code paths beyond what the spec requires. Commit message truncation for long ID lists (lines 603-605, 958-960) is specified in the spec's Gotchas section. No YAGNI violations detected.

## AC Walkthrough
| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `readCoAuthor()` exists in `git-operations.ts`, exported, with JSDoc | ✅ PASS | `packages/cli/src/utils/git-operations.ts:96-117`, exported, JSDoc with `@param` and `@returns` |
| 2 | All 5 inline coAuthor reads replaced | ✅ PASS | Grep for inline patterns returns 0 matches. `readCoAuthor` imported in artifact.ts:27, work.ts:20, pr.ts:17, proof.ts:30 |
| 3 | `ana proof close F001 --reason "test"` still works (single ID) | ✅ PASS | Test at `proof.test.ts:1178`, exitCode 0, output contains 'Closed F001' |
| 4 | `ana proof close F001 F002 --reason "test"` closes both, one commit | ✅ PASS | Test at `proof.test.ts:1191`, both findings closed, commit count = 2 (init + 1) |
| 5 | `ana proof close F001 F999 --reason "test"` — partial success | ✅ PASS | Test at `proof.test.ts:1214`, F001 closed, F999 reported as skipped |
| 6 | `ana proof close F001 --dry-run --reason "test"` | ✅ PASS | Test at `proof.test.ts:1243`, stdout contains 'Dry run' and 'Would close', finding remains active |
| 7 | Close commit message includes co-author trailer | ✅ PASS | Test at `proof.test.ts:1277`, `git log -1 --pretty=%B` contains trailer |
| 8 | `ana proof promote F001 --skill coding-standards` still works | ✅ PASS | Test at `proof.test.ts:2531`, exitCode 0, output contains 'Promoted F001' |
| 9 | `ana proof promote F001 F002 --skill coding-standards` — both promoted, one rule | ✅ PASS | Test at `proof.test.ts:2543`, both promoted, rule text `toHaveLength(1)` |
| 10 | Promote commit message includes co-author trailer | ✅ PASS | Test at `proof.test.ts:2571`, `git log -1 --pretty=%B` contains trailer |
| 11 | Close and promote JSON output returns per-finding results | ✅ PASS | Test at `proof.test.ts:1306`, JSON has `closed` array with length 2, `skipped` array, `dry_run` field |
| 12 | All new/modified commands have tests | ✅ PASS | readCoAuthor: 4 tests. Close variadic: 8 tests (single, multi, partial, dry-run, dry-run+JSON, JSON envelope, all-invalid, already-closed). Promote variadic: 4 tests (single, multi, trailer, all-invalid). |
| 13 | `(cd packages/cli && pnpm vitest run)` passes with no regressions | ✅ PASS | 1719 passed, 2 skipped. Up from 1702 baseline — 17 new tests, 0 failures. |
| 14 | No build errors | ✅ PASS | `pnpm run build` exits successfully |

## Blockers
No blockers. All 13 contract assertions satisfied. All 14 acceptance criteria pass. No regressions (1719 passed vs 1702 baseline). Checked for: unused exports in new code (none — readCoAuthor used in 4 source files), unhandled error paths (close and promote both handle all-invalid-IDs, network failures, parse errors), assumptions about external state (readCoAuthor falls back gracefully on missing/corrupt ana.json), missing edge cases from spec (close with already-closed findings handled, dry-run+JSON tested).

## Findings

- **Code — SEVERITY_ORDER constant still duplicated:** `packages/cli/src/commands/proof.ts:49` — defined at module level, also exists inline in audit and findings blocks. Pre-existing issue (see proof chain: "SEVERITY_ORDER duplication still present"). Still present — see proof chain finding.
- **Code — exitError helper duplicated in close and promote handlers:** `packages/cli/src/commands/proof.ts:402` (close) and `packages/cli/src/commands/proof.ts:693` (promote) — ~30-line helpers with identical structure. Existing pattern from pre-variadic code. Extracting to a shared helper would reduce proof.ts by ~25 lines.
- **Code — Partial success exits 0:** `packages/cli/src/commands/proof.ts:529` — when some IDs succeed and some fail, the command exits 0. Correct per spec constraint ("When some succeed, exit 0"), but automation pipelines that check exit codes won't detect partial failures without parsing output.
- **Test — Dry-run test does not verify no commit created:** `packages/cli/tests/commands/proof.test.ts:1243` — checks `finding.status === 'active'` (proving no mutation) but doesn't count commits to mechanically prove no commit was made. The code path returns before the commit section (line 582), making this safe but not maximally rigorous.
- **Test — No regression test for inline coAuthor absence (A003):** Assertion A003 verified by source inspection (grep returns 0 inline reads). No automated test guards against re-introducing inline reads. If someone adds a new inline read in a future change, no test will catch it.

## Deployer Handoff
Phase 1 of 3. After merge, Phase 2 (strengthen subcommand) can proceed. The `readCoAuthor` utility is now the single source of truth for co-author trailers — all four command files import it. Close and promote both accept variadic IDs and produce batched commits with co-author trailers. Existing single-ID behavior is backward compatible. No configuration changes needed. No new dependencies.

## Verdict
**Shippable:** YES

All 13 Phase 1 contract assertions satisfied. All 14 acceptance criteria pass. Tests increased from 1702 to 1719 with zero failures. The implementation follows existing patterns (readBranchPrefix for readCoAuthor, existing close structure for variadic). Findings are minor — duplicated helpers and pre-existing constant duplication. Nothing that would regret shipping.
