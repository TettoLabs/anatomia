# Verify Report: User-Facing Improvements (Phase 3)

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-04
**Spec:** .ana/plans/active/proof-intelligence-hardening/spec-3.md
**Branch:** feature/proof-intelligence-hardening

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/proof-intelligence-hardening/contract.yaml
  Seal: INTACT (hash sha256:eddfe6b4c1b77aea14eb2346623195d15365dfc9804ad7f466fde9118af5e9d4)
```
Seal status: **INTACT**

Tests: 1866 passed, 0 failed, 2 skipped. Build: success. Lint: 0 errors, 15 warnings (pre-existing).

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | AC status counts come only from the AC Walkthrough section | ✅ SATISFIED | proofSummary.test.ts:219, asserts total=3 from walkthrough-only report with extra PASS in Findings |
| A002 | A PASS mention in Findings does not inflate assertion count | ✅ SATISFIED | proofSummary.test.ts:243, asserts met=1 (only AC1 PASS counted, not Findings PASS) |
| A003 | Reports missing AC Walkthrough heading still produce counts | ✅ SATISFIED | proofSummary.test.ts:265, asserts total=2 with no walkthrough heading, falls back to full content |
| A004 | FAIL rejection logic exists in exactly one helper function | ✅ SATISFIED | Source inspection: `guardFailResult` defined once at work.ts:716, called at :769 (single-phase) and :1160 (multi-phase) |
| A005 | FAIL result in single-phase flow blocks completion | ✅ SATISFIED | work.test.ts:790, asserts exit code 1 via mockExit for FAIL verify result |
| A006 | FAIL result in multi-phase flow blocks completion | ✅ SATISFIED | work.test.ts:872, asserts exit code 1 via mockExit for multi-phase FAIL |
| A007 | Recovery path uses computeChainHealth | ✅ SATISFIED | Source inspection: work.ts:1033 calls `computeChainHealth(recoveryChain)` |
| A008 | Zero-run health uses computeFirstPassRate | ✅ SATISFIED | Source inspection: proof.ts:2142 calls `computeFirstPassRate([])` |
| A009 | Error handling for proof close uses shared factory | ✅ SATISFIED | Source inspection: proof.ts:628 calls `createExitError({commandName: 'proof close', ...})` |
| A010 | Error handling for proof promote uses shared factory | ✅ SATISFIED | Source inspection: proof.ts:1217 calls `createExitError({commandName: 'proof promote', ...})` |
| A011 | Error handling for proof strengthen uses shared factory | ✅ SATISFIED | Source inspection: proof.ts:1580 calls `createExitError({commandName: 'proof strengthen', ...})` |
| A012 | Promote error handler shows available skills | ✅ SATISFIED | Source inspection: proof.ts:1224 hints map includes `SKILL_REQUIRED: ["Available skills: ..."]`; proof.test.ts:2978 asserts stderr contains 'coding-standards' on missing skill |
| A013 | Long summaries truncated at word boundaries with ellipsis | ✅ SATISFIED | proofSummary.test.ts:3112, asserts result contains '...' and cuts at word boundary |
| A014 | Short summaries pass through unchanged | ✅ SATISFIED | proofSummary.test.ts:3098, asserts result.length=10 for 'short text' |
| A015 | Custom max length parameter controls truncation | ✅ SATISFIED | proofSummary.test.ts:3130, asserts result.length=53 for 50-char maxLength |
| A016 | High-frequency file needs more touches for high confidence | ✅ SATISFIED | proofSummary.test.ts:2968, chain with 55% touch rate: 3 touches → medium (not high), expects high_confidence.length=0 |
| A017 | Low-frequency file keeps default floor threshold of 3 | ✅ SATISFIED | proofSummary.test.ts:3004, chain with 27% touch rate: 3 touches → high (floor of 3 applies) |
| A018 | Normalization only activates when enough entries exist after finding | ✅ SATISFIED | proofSummary.test.ts:3038, chain with only 4 entries after finding: uses raw >= 3 threshold → high |
| A019 | Audit headline shows actionable and monitoring counts | ✅ SATISFIED | proof.test.ts:3951, asserts stdout contains 'actionable' and 'monitoring' |
| A020 | Audit JSON includes separate counts | ✅ SATISFIED | proof.test.ts:3963, asserts json.results.actionable_count defined and actionable+monitoring=total_active |
| A021 | Risk-severity finding counts as actionable regardless of action | ✅ SATISFIED | proof.test.ts:3979, creates risk+accept finding, asserts actionable_count=1, monitoring_count=1 |
| A022 | Lesson with valid IDs and reason sets status to lesson | ✅ SATISFIED | proof.test.ts:4045, asserts finding.status='lesson', closed_by='human', closed_reason='team-decision' |
| A023 | Lesson without reason shows error | ✅ SATISFIED | proof.test.ts:4066, asserts exitCode != 0 and stderr contains '--reason is required' |
| A024 | Lesson on closed finding is rejected | ✅ SATISFIED | proof.test.ts:4089, asserts exitCode != 0 and stderr contains 'already closed' |
| A025 | Lesson on promoted finding is rejected | ✅ SATISFIED | proof.test.ts:4101, asserts exitCode != 0 and stderr contains 'already promoted' |
| A026 | Lesson creates git commit with proof prefix | ✅ SATISFIED | proof.test.ts:4113, asserts last commit contains '[proof] Lesson:' and 'F001' |
| A027 | Lesson dry-run shows what would happen without changing anything | ✅ SATISFIED | proof.test.ts:4127, asserts finding.status='active' after dry-run and commit count unchanged |
| A028 | Learn template no longer uses 'all accept-action findings' | ✅ SATISFIED | Source inspection: `grep 'accept-action findings' ana-learn.md` returns no matches; line 68 now reads "all findings for a specific action type" |
| A029 | Learn template no longer says findings are pre-classified for closure | ✅ SATISFIED | Source inspection: `grep 'pre-classified for closure' ana-learn.md` returns no matches; line 159 now reads "validate the classification before acting" |

## Independent Findings

**Predictions resolved:**

1. **Not found — staleness off-by-one.** `entriesSince = chain.entries.length - (i + 1)` correctly excludes the finding's own entry. No off-by-one.

2. **Not found — lesson JSON format.** Lesson's single-ID JSON output includes `finding`, `previous_status`, `new_status`, `reason`, `closed_by` — mirrors close's pattern faithfully.

3. **Confirmed — audit OR logic cross-case.** The test at proof.test.ts:3979 exercises risk+accept → actionable and observation+monitor → monitoring. This covers the OR logic. However, no test exercises observation+promote → actionable (the other cross-case). The implementation handles it correctly (line 2031: `act === 'promote'`), but the test only proves one branch of the OR.

4. **Confirmed — staleness test simplicity.** Tests don't exercise the boundary where `entriesSince` is exactly 5 (the minimum for normalization). Tests use 4 (below) and 10 (above). Edge behavior at exactly 5 is inferred but not exercised.

5. **Not found — learn template context change.** The two replacements are surgical and correct. Surrounding text is unchanged.

**Production risk predictions:**
- Lesson command's git commit failure path: the catch block at proof.ts:1141 prints a generic error and exits 1 — the commit error detail is swallowed. Same pattern as close, so consistent, but it means operators won't know *why* the commit failed.

**Formula deviation:** The staleness `touchRate` at proofSummary.ts:1152 computes the rate across the *entire* chain (`totalTouches / chain.entries.length`) rather than the post-finding window as the spec says (`touches_in_post_finding_window / entries_since_finding`). The baseline-rate approach is arguably better — it uses historical frequency rather than circular post-finding frequency — but it deviates from the spec text. The contract assertions test behavior (high-frequency file needs more touches), which is satisfied by either formula. The tests are consistent with the implementation's formula.

## AC Walkthrough

- ✅ PASS: **AC2** — computeStaleness normalizes confidence by file touch frequency. Test at proofSummary.test.ts:2968 proves 55% touch rate file needs 6 touches for high (gets 3 → medium), while 27% rate file keeps floor of 3 (test at :3004).
- ✅ PASS: **AC8** — Audit headline distinguishes actionable from monitoring. proof.ts:2060 formats `(N actionable, M monitoring)`. Test at proof.test.ts:3951 confirms both words appear. JSON includes `actionable_count` and `monitoring_count` (test at :3963).
- ✅ PASS: **AC9** — `ana proof lesson <ids> --reason "..."` sets findings to status 'lesson' with git commit. Full test suite: successful lesson (:4045), missing reason (:4066), closed rejection (:4089), promoted rejection (:4101), dry-run (:4127), commit prefix (:4113), JSON output (:4159), not-found (:4148).
- ✅ PASS: **AC10** — Learn template lines 68 and 159 updated. Grep confirms old phrases absent, new phrases present. Both template (`packages/cli/templates/`) and live copy (`.claude/agents/`) updated.
- ✅ PASS: **Tests pass** — 1866 passed, 0 failed, 2 skipped.
- ✅ PASS: **No TypeScript errors** — `pnpm run build` succeeds.

## Blockers

None. All 29 contract assertions satisfied. All 6 ACs pass. Tests green. Build clean. Lint clean (0 errors). Checked for: unused exports in new code (lesson command helpers are all used internally), unhandled error paths (lesson handles not-found, already-closed, already-promoted, already-lesson, parse error, no chain, wrong branch), dead code paths (none found — every branch in lesson command is exercised by tests), missing edge cases from spec (already-lesson guard was added beyond spec, reasonable defensive addition).

## Findings

- **Code — Staleness touchRate uses full-chain baseline instead of spec's post-finding rate:** `packages/cli/src/utils/proofSummary.ts:1152` — `totalTouches / chain.entries.length` computes rate across all entries, not just post-finding entries as the spec describes. The behavior is correct (high-frequency files need proportionally more touches) and arguably better than the spec formula (avoids circular logic), but the deviation from spec text should be documented for future maintainers.

- **Code — Lesson catch block swallows commit error detail:** `packages/cli/src/commands/proof.ts:1141` — the catch block prints "Failed to commit" without the underlying error message. Same pattern as close command, but operators diagnosing commit failures get no cause. Pattern is consistent across subcommands (close, lesson, promote) so this is a known structural debt item, not a regression.

- **Code — Finding-search loop duplicated across subcommands:** `packages/cli/src/commands/proof.ts:996` — the loop that finds a finding by ID across all entries is copied identically in close (:647), lesson (:996), promote (:1269), and strengthen (:1650). Four copies of the same iteration pattern. A shared `findFindingById(chain, id)` helper would reduce this surface.

- **Code — proofSummary.ts continuing to grow:** `packages/cli/src/utils/proofSummary.ts` — still past the 1500-line comfort threshold noted in prior cycles. Phase 3 adds staleness normalization logic (~30 lines net). Known debt; still present — see prior proof chain findings.

- **Test — No cross-case test for observation+promote=actionable:** `packages/cli/tests/commands/proof.test.ts:3979` — the actionable OR logic test exercises risk+accept → actionable but doesn't test observation+promote → actionable. The implementation handles it (proof.ts:2031 checks `act === 'promote'`), but this specific branch has no dedicated test coverage.

- **Test — A028/A029 verified by source inspection only:** `packages/cli/templates/.claude/agents/ana-learn.md` — the learn template `not_contains` assertions have no test file. Verified by grepping the source file directly. This is appropriate for text replacements but means a regression (re-adding the old phrase) would only be caught by the next verification, not by CI.

- **Code — vitest.config.ts timeout changes not in spec:** `packages/cli/vitest.config.ts:8` — CI-specific `testTimeout: 15000` and `hookTimeout: 15000` were added. Not in the spec's file_changes list. Minor over-build; the timeouts are reasonable for CI stability but are unspecified additions.

- **Upstream — Stale finding: parseACResults false-match likely resolved:** The proof chain carries a finding from V1 Code Changes about "bullet lines outside AC section containing PASS/FAIL could inflate counts." This phase's A001-A003 implementation directly addresses this by scoping to the AC Walkthrough section. The original finding is effectively resolved.

## Deployer Handoff

Phase 3 of 3 for proof-intelligence-hardening. This is the final phase.

**What changed:** Audit headline now shows actionable vs monitoring split. New `ana proof lesson` subcommand for recording institutional decisions (same pattern as close). Staleness confidence normalization reduces false positives for high-frequency files. Learn template language updated to prevent batch-closure framing.

**What to watch:** The staleness formula uses the full-chain baseline touch rate, not the post-finding rate described in the spec. If false-positive rates need further tuning, the formula is at proofSummary.ts:1146-1153.

**After merge:** Run `ana work complete proof-intelligence-hardening` to write the proof chain entry.

## Verdict
**Shippable:** YES

All 29 contract assertions satisfied. All 6 acceptance criteria pass. 1866 tests green, build clean, lint clean. The staleness formula deviation from spec text is a documentation concern, not a correctness issue — the behavior matches the contract's behavioral assertions. Seven findings documented — all debt or observation, none blocking. The lesson command is structurally sound with comprehensive test coverage including edge cases (closed/promoted/lesson rejection, dry-run, JSON, git commit verification).
