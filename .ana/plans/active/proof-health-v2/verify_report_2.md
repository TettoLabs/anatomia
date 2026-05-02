# Verify Report: Timing Fix (Phase 2)

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-02
**Spec:** .ana/plans/active/proof-health-v2/spec-2.md
**Branch:** feature/proof-health-v2

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/proof-health-v2/contract.yaml
  Seal: INTACT (hash sha256:793cfcd0e7a8ae5e75e9622366e70c0fef3e4587ba16af2ac3a78111a0a7775a)
```

Seal status: **INTACT**

Tests: 1792 passed, 2 skipped (93 test files). Build: success. Lint: 0 errors, 14 warnings (pre-existing).

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A015 | Starting a work item creates the plan directory | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:2606` — asserts `existsSync(slugDir)` is true after `startWork()` |
| A016 | Starting a work item records the start time | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:2616` — reads `.saves.json`, asserts `work_started_at` defined and parseable as Date |
| A017 | Invalid slug format is rejected with a clear error | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:2646` — asserts error output contains "Invalid slug" |
| A018 | Uppercase characters in slug are rejected | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:2649` — asserts `process.exit(1)` called for `Fix-Auth` |
| A019 | Duplicate slug in active plans is rejected | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:2724` — creates active slug, asserts error contains "already exists" |
| A020 | Duplicate slug in completed plans is rejected | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:2744` — creates completed slug, asserts error contains "already exists" |
| A021 | Starting on the wrong branch shows an error | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:2764` — mocks branch to `feature/other-thing`, asserts error contains "main" |
| A022 | Think time uses the work start timestamp when available | ✅ SATISFIED | `packages/cli/tests/utils/proofSummary.test.ts:347` — `work_started_at` at 09:40, scope at 10:00, asserts `timing.think` = 20 (not 0) |
| A023 | Think and Plan show different values for new entries | ✅ SATISFIED | `packages/cli/tests/utils/proofSummary.test.ts:364` — asserts `think !== plan` (20 vs 30) |
| A024 | Old entries without start time fall back to identical think and plan | ✅ SATISFIED | `packages/cli/tests/utils/proofSummary.test.ts:372` — no `work_started_at`, asserts `think === plan` (both 30) |
| A025 | Shipped Think template tells agents to use the new start command | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:2791` — reads shipped template, asserts `toContain('ana work start')` |
| A026 | Dogfood Think template matches the shipped version | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:2797` — reads dogfood template, asserts `toContain('ana work start')` |
| A027 | Templates no longer contain the manual mkdir instruction | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:2805` — asserts both templates `not.toContain('mkdir -p .ana/plans/active')` |

## Independent Findings

**Predictions resolved:**
1. **Confirmed (weak assertion):** A016 test at line 2624 uses `toBeDefined()` for `work_started_at`. The testing standard says "assert on specific expected values" — this passes even if the value is an empty string or `0`. The follow-up line (`getTime() > 0`) partially redeems it by proving it's a valid date. Mild.
2. **Not found:** `computeTiming` total_minutes test is thorough — explicitly asserts 140 vs 120.
3. **Confirmed (no test):** No test for `git pull --rebase` conflict path or "no remotes" path. These are copied from artifact.ts patterns and exercised in integration elsewhere, but not unit-tested for `startWork` specifically.
4. **Confirmed (no test):** No test for the "Not a git repository" branch at line 1340-1343.
5. **Not found:** Corrupted `work_started_at` string resolves safely — `NaN` is falsy, falls through to the backward-compat fallback.

**Surprise:** None — the implementation is clean and focused.

## AC Walkthrough

- [x] **AC9:** `ana work start {slug}` creates the plan directory — ✅ PASS (test at line 2606 confirms directory exists)
- [x] **AC10:** `ana work start` rejects non-kebab-case slugs — ✅ PASS (tests for uppercase, double-hyphen, leading/trailing hyphen at lines 2645-2695)
- [x] **AC11:** `ana work start` rejects slugs that exist in active or completed plans — ✅ PASS (tests at lines 2724, 2744)
- [x] **AC12:** `ana work start` validates artifact branch — ✅ PASS (test at line 2764 asserts exit code 1 and error mentioning "main")
- [x] **AC13:** `ana work start` writes `work_started_at` to `.saves.json` — ✅ PASS (test at line 2616)
- [x] **AC14:** `computeTiming` uses `work_started_at` for Think when available — ✅ PASS (test at line 347, `timing.think = 20`)
- [x] **AC15:** Think and Plan show different timing values for new entries — ✅ PASS (test at line 364, `think !== plan`)
- [x] **AC16:** Old entries without `work_started_at` fall back to current behavior — ✅ PASS (test at line 372, `think === plan`)
- [x] **AC17:** Think template Step 1 uses `ana work start` instead of `mkdir` — ✅ PASS (shipped template line 171 confirmed, test at line 2791)
- [x] **AC18:** Dogfood Think template matches shipped template — ✅ PASS (both line 171 identical, test at line 2797)
- [x] **Tests pass** — ✅ PASS (1792 passed, 2 skipped)
- [x] **No build errors** — ✅ PASS (tsup success)

## Blockers

No blockers. All 13 contract assertions satisfied, all 12 acceptance criteria pass, no regressions (1792 tests passing vs. 1762 baseline from spec = +30 new tests). Checked: no unused exports from new code (`startWork` used in tests + Commander registration), no unhandled error paths that would crash (corrupted date handled via falsy `NaN`), no YAGNI (no extra parameters or features beyond spec). The 14 lint warnings are pre-existing (not introduced by this build).

## Findings

- **Test — A016 uses weak assertion for timestamp format:** `packages/cli/tests/commands/work.test.ts:2624` — `toBeDefined()` would pass on any truthy value. The follow-up `getTime() > 0` partially compensates, but a direct regex check for ISO 8601 format (e.g., `/^\d{4}-\d{2}-\d{2}T/`) would be more precise. Not a blocker — the test does prove a valid date was written.

- **Code — Untested defensive branches in startWork:** `packages/cli/src/commands/work.ts:1340-1343` and `1368-1375` — the "not a git repository" and "git pull conflict" paths have no dedicated unit tests. Both are copied from battle-tested patterns in artifact.ts and the failure modes are well-understood, but startWork's copies are exercised only via the CLI in production.

- **Upstream — @ana tag collision with other features:** The `@ana A015`–`@ana A027` tags appear in tests for other features (readme.test.ts, scanProject.test.ts, proof.test.ts, etc.) because each feature's contract independently numbers from A001. This is a known limitation of the tagging system — verification requires filtering by file_changes context rather than trusting tag uniqueness.

## Deployer Handoff

This phase adds `ana work start` as a new CLI subcommand. After merge:
- Think agents will use the new command instead of manual `mkdir -p`
- Existing work items without `work_started_at` continue working (fallback path verified)
- No migration needed — the timing fix is forward-only
- The two template files (shipped + dogfood) are updated identically

## Verdict
**Shippable:** YES

All 13 Phase 2 assertions satisfied. Implementation matches spec cleanly — validates slug, validates branch, creates directory, records timestamp, fixes timing computation, updates templates. Tests are thorough with good edge case coverage. The weak assertion and untested defensive branches are minor observations, not shipping risks.
