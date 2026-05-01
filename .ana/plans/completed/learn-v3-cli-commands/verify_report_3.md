# Verify Report: Learn V3 Phase 3 — Stale + Audit Full + Template Cleanups

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-01
**Spec:** .ana/plans/active/learn-v3-cli-commands/spec-3.md
**Branch:** feature/learn-v3-cli-commands

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/learn-v3-cli-commands/contract.yaml
  Seal: INTACT (hash sha256:9782624f74d9b13ee1370256b2bd35daf1998bdbc297e37819d9229a4dc85228)
```

Seal status: **INTACT**

Tests: 1757 passed, 0 failed, 2 skipped. Build: success. Lint: 0 errors, 14 warnings (pre-existing).

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A022 | Stale command identifies findings whose files were modified by later pipeline runs | ✅ SATISFIED | `tests/utils/proofSummary.test.ts:2720` — creates 4-entry chain, asserts `result.total_stale > 0`, `high_confidence[0].id === 'F001'`, `subsequent_count === 3`. Integration test at `tests/commands/proof.test.ts:3050` confirms CLI output contains 'Stale Findings' and 'F001'. |
| A023 | High-confidence stale findings have three or more subsequent entries modifying the file | ✅ SATISFIED | `tests/utils/proofSummary.test.ts:2760` — 4-entry chain with 3 subsequent touches, asserts `high_confidence[0].subsequent_count > 2` and `confidence === 'high'`. |
| A024 | Stale findings can be filtered to a specific pipeline run | ✅ SATISFIED | `tests/utils/proofSummary.test.ts:2803` — 3-entry chain with 2 finding entries, `afterSlug: 'entry-1'`, asserts F001 present and F002 absent. Integration test at `tests/commands/proof.test.ts:3087`. |
| A025 | Stale command works without checking out a specific branch | ✅ SATISFIED | `tests/commands/proof.test.ts:3063` — creates git repo on feature branch, runs `stale`, asserts exitCode 0. No branch check in source (`proof.ts:1693` comment confirms read-only pattern). |
| A026 | Full audit returns all findings without truncation for agent consumption | ✅ SATISFIED | `tests/commands/proof.test.ts:3169` — creates 50 findings across 12 files, `audit --json --full`, asserts `by_file.length > 8` and `overflow_files === 0`. Live test confirmed: 18 files returned, 0 overflow. |
| A027 | Full audit without JSON mode shows a usage hint instead of raw output | ✅ SATISFIED | `tests/commands/proof.test.ts:3191` — `audit --full`, asserts stdout contains `--json` and `agent consumption`. Live test confirmed exact output: "The --full flag is designed for agent consumption." |
| A028 | The Learn template assumes all CLI commands exist with no fallback instructions | ✅ SATISFIED | Source inspection: grepped `packages/cli/templates/.claude/agents/ana-learn.md` for "if.*command.*doesn't exist", "perform.*manually", "if.*not available" — zero matches. All degradation paths removed. |
| A029 | The Learn template shows variadic ID examples for batch operations | ✅ SATISFIED | Source inspection: `packages/cli/templates/.claude/agents/ana-learn.md` contains "C1 C2 C3" at lines 352, 365, 414, 521-523. Close, promote, and strengthen all show variadic examples. |
| A030 | The Learn template references the stale command instead of manual analysis | ✅ SATISFIED | Source inspection: `packages/cli/templates/.claude/agents/ana-learn.md` contains "ana proof stale" at lines 74, 167, 170-173, 320, 519-520. Full command reference with all flags. |
| A031 | The dogfood Learn template matches the shipped template exactly | ✅ SATISFIED | `diff .claude/agents/ana-learn.md packages/cli/templates/.claude/agents/ana-learn.md` — no output (byte-identical). |
| A032 | The Verify template notes stale findings from proof context, not from the stale command | ✅ SATISFIED | Source inspection: `packages/cli/templates/.claude/agents/ana-verify.md:103` contains "Stale finding {ID} likely resolved by this build". No `ana proof stale` command reference in Verify template. |
| A033 | The dogfood Verify template matches the shipped template exactly | ✅ SATISFIED | `diff .claude/agents/ana-verify.md packages/cli/templates/.claude/agents/ana-verify.md` — no output (byte-identical). Existing test at `tests/templates/agent-proof-context.test.ts:66` also covers ana-verify.md. |

## Independent Findings

### Predictions resolved

1. **Empty modules_touched** — Not found. `computeStaleness` uses `|| []` at line 1116. Handles gracefully.
2. **--after partial slug match** — Not found. Uses strict equality at line 1104.
3. **Template dogfood whitespace differences** — Not found. `diff` confirmed byte-identical for both learn and verify.
4. **Weak test assertions** — **Confirmed.** Multiple integration tests use `toBeGreaterThan(0)` and `toBeDefined()` where specific values are knowable. See findings below.
5. **Audit --full bypass level** — Not found. Bypass is correct at both file count (line 1449) and per-file finding count (line 1464).

### Production risks investigated

1. **O(n*m) in computeStaleness** — Confirmed: nested loop at lines 1100-1143. For current chain (~25 entries, ~50 findings), runs in <1ms. At 500 entries × 500 findings, would be 250K iterations — still acceptable. Not a blocker.
2. **--min-confidence unvalidated** — Confirmed: line 1721 only checks `=== 'high'`. Passing `--min-confidence invalid` silently shows all findings. Not dangerous (it's a read-only command), but the spec describes `<high|medium>` as the allowed values. Commander `.choices()` would enforce this.

### What I didn't predict

- The dogfood sync test at `agent-proof-context.test.ts:68` checks `['ana.md', 'ana-plan.md', 'ana-build.md', 'ana-verify.md']` but does NOT include `ana-learn.md`. The builder synced the file correctly (byte-identical confirmed) but the automated test doesn't guard against future drift of the learn template specifically. This is the most consequential finding — a future edit to one copy won't be caught by CI.

## AC Walkthrough

1. **`ana proof stale` shows findings with staleness signals grouped by confidence tier** — ✅ PASS. Live test shows "High confidence" and "Medium confidence" sections with correct grouping. 44 findings detected on real project data.

2. **`ana proof stale` is read-only — no branch check, no git pull, no modifications** — ✅ PASS. Source inspection confirms no branch check at `proof.ts:1693`. Test at `proof.test.ts:3063` runs from feature branch. Live test succeeded from `feature/learn-v3-cli-commands`.

3. **`ana proof stale --after <slug>` filters to findings from that entry only** — ✅ PASS. Live test: `--after proof-health-v1` returned 5 findings, all from proof-health-v1 entry. Unit test at `proofSummary.test.ts:2803` verifies filter exclusion.

4. **`ana proof stale --min-confidence high` filters to high-confidence only** — ✅ PASS. Live test: `--min-confidence high` returned 32 findings (vs 44 total), no "Medium confidence" section in output. Unit test at `proofSummary.test.ts:2838`.

5. **`ana proof stale --json` returns structured output with the JSON envelope pattern** — ✅ PASS. Live test returns valid JSON with `command: "proof stale"`, `results.total_stale`, `results.high_confidence`, `results.medium_confidence`, and `meta.chain_runs`.

6. **High confidence = 3+ subsequent entries with modules_touched matching the finding's file** — ✅ PASS. `computeStaleness` line 1134: `subsequentSlugs.length >= 3 ? 'high' : 'medium'`. Unit test at `proofSummary.test.ts:2760` verifies threshold.

7. **Medium confidence = 1-2 subsequent entries matching** — ✅ PASS. `computeStaleness` line 1134 assigns 'medium' for <3. Unit test at `proofSummary.test.ts:2782` verifies 1 subsequent → medium.

8. **`ana proof audit --json --full` returns all active findings without truncation** — ✅ PASS. Live test: 18 files returned, 0 overflow. Test at `proof.test.ts:3169` creates 50 findings across 12 files, asserts >8 files and 0 overflow.

9. **`ana proof audit --full` (without --json) prints usage hint and exits** — ✅ PASS. Live test output: "The --full flag is designed for agent consumption. Use with --json: ana proof audit --json --full". Source at `proof.ts:1341-1344`.

10. **Verify template instructs noting stale findings when proof context shows active findings resolved by the current build** — ✅ PASS. `templates/.claude/agents/ana-verify.md:103` contains the exact instruction with "Stale finding {ID} likely resolved by this build".

11. **Learn template has zero "if command doesn't exist" or "perform manually" fallback language** — ✅ PASS. Grepped for degradation patterns — zero matches.

12. **Learn template shows variadic ID examples (C-prefixed IDs like `C1 C2 C3`) for close, promote, strengthen** — ✅ PASS. Found at lines 352, 365, 414, 521-523.

13. **Learn template uses `ana proof stale` instead of manual cross-referencing** — ✅ PASS. Found at lines 74, 167, 170-173, 320, 519-520. No manual cross-referencing instructions remain.

14. **Dogfood copy (`.claude/agents/ana-learn.md`) matches template copy** — ✅ PASS. `diff` returns empty — byte-identical.

15. **Dogfood copy (`.claude/agents/ana-verify.md`) matches template copy** — ✅ PASS. `diff` returns empty — byte-identical.

16. **All new/modified commands have tests** — ✅ PASS. `stale` has 6 integration tests and 10 unit tests. `audit --full` has 2 integration tests. Template assertions verified by source inspection.

17. **`(cd packages/cli && pnpm vitest run)` passes with no regressions** — ✅ PASS. 93 test files, 1757 tests passed, 0 failed, 2 skipped.

18. **No build errors** — ✅ PASS. `pnpm run build` succeeded. Lint: 0 errors.

## Blockers

No blockers. All 12 contract assertions SATISFIED. All 18 acceptance criteria pass. No regressions. Checked for: unused exports in new code (StaleFinding/StalenessResult are exported but only consumed implicitly — acceptable for type documentation), dead code paths in computeStaleness (every branch exercised by tests), error paths that swallow silently (stale command handles missing chain and parse errors correctly at lines 1694-1716), and spec gaps (--min-confidence validation is the only gap found, and it's a cosmetic issue for a read-only command).

## Findings

- **Test — Weak assertions in stale integration tests:** `packages/cli/tests/commands/proof.test.ts:3122` — `toBeGreaterThan(0)` instead of `toBe(2)` for `total_stale` (the fixture has exactly 2 stale findings: F001 and F002 with 3 subsequent touches each). Line 3123: `toBeDefined()` on confidence tier arrays instead of asserting lengths. These assertions would pass even if the function miscounted. The unit tests in `proofSummary.test.ts` are stronger (assert specific counts), so the coverage gap is compensated, but the integration tests themselves are weaker than they could be.

- **Test — No tagged tests for template assertions A028-A033:** All six template-related contract assertions were verified by source inspection (grep, diff). No `@ana A028`–`@ana A033` tags exist in test files for this feature. The existing dogfood sync test covers ana-verify.md but not ana-learn.md. A tagged test for each would make verification faster in future cycles.

- **Code — `--min-confidence` accepts invalid values silently:** `packages/cli/src/commands/proof.ts:1721` — only checks `=== 'high'`. Passing `--min-confidence banana` silently shows all findings (same as no filter). Commander's `.choices(['high', 'medium'])` would catch this at parse time. Not dangerous for a read-only command, but inconsistent with the spec's `<high|medium>` constraint.

- **Upstream — Dogfood sync test excludes ana-learn.md:** `packages/cli/tests/templates/agent-proof-context.test.ts:68` — `const files = ['ana.md', 'ana-plan.md', 'ana-build.md', 'ana-verify.md']` does not include `ana-learn.md`. The builder correctly synced the dogfood copy (byte-identical by diff), but CI won't catch future drift. The test was written before `ana-learn.md` existed in the dogfood location. Should be scoped for a future fix.

- **Code — StaleFinding/StalenessResult types not imported by name:** `packages/cli/src/types/proof.ts:177-198` — both interfaces are exported and well-documented but consumed only via inline `import()` expressions in `computeStaleness`. Not dead code (they're the return type contract), but a slight pattern deviation from `HotModule`/`HealthReport` which are imported explicitly in proof.ts.

- **Code — O(n*m) traversal in computeStaleness:** `packages/cli/src/utils/proofSummary.ts:1100-1143` — nested loop: for each entry's findings, iterates all subsequent entries checking `modules_touched.includes()`. For current chain sizes (~25 entries), this is instant. At 1000 entries with 100 findings each, the inner loop would execute ~5M `includes()` calls. Acceptable for CLI but worth noting if the chain grows significantly.

- **Code — Stale high-confidence slug list truncation inconsistency:** `packages/cli/src/commands/proof.ts:1748-1751` — high-confidence tier truncates slug display at 3 with `...` suffix, while medium-confidence (line 1765) shows all slugs. By definition, high has 3+ and medium has 1-2, so medium never needs truncation. The logic is correct but the asymmetry isn't documented.

## Deployer Handoff

- This is phase 3 of a 3-phase build. Phases 1 and 2 are already verified. All three phases are on the same branch.
- The `ana proof stale` command is read-only and safe to ship. No writes to proof chain, no branch requirements.
- The `audit --full` flag only works with `--json` — intentional UX guard against terminal flooding.
- Template changes are the most impactful long-term: the Learn template now assumes all V3 commands exist. If rolling back V3 commands, the templates would need reverting too.
- The dogfood sync test should be updated to include `ana-learn.md` in a follow-up. CI currently guards verify but not learn template drift.

## Verdict
**Shippable:** YES

All 12 phase 3 contract assertions satisfied. All 18 acceptance criteria pass. 1757 tests pass with 0 failures. Build and lint clean. Live testing of stale command and audit --full confirmed correct behavior on real project data. Findings are observational (test weakness, missing validation on a read-only flag, dogfood test gap) — none prevent shipping.
