# Verify Report: Pipeline Concurrency Guards

**Result:** FAIL
**Created by:** AnaVerify
**Date:** 2026-05-15
**Spec:** .ana/plans/active/pipeline-concurrency-guards/spec.md
**Branch:** feature/pipeline-concurrency-guards

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/pipeline-concurrency-guards/contract.yaml
  Seal: INTACT (hash sha256:b4a85d19f8a96afc329b6d24f0e4e65388c9811e6d4ec12503d7e94e0b76140d)
```

Tests: 2345 passed, 2 skipped (2347 total, 104 test files). Build: success. Lint: success.
Baseline was 2320 passed — 25 new tests added.

## Contract Compliance
| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | A second verify session on the same work item is blocked | ✅ SATISFIED | `work.test.ts:5294` — writes recent `verify_started_at`, calls `startWork`, asserts `process.exit(1)` and error contains "verify session is already in progress" |
| A002 | A second plan session on the same work item is blocked | ✅ SATISFIED | `work.test.ts:5324` — writes recent `plan_started_at`, calls `startWork`, asserts `process.exit(1)` and error contains "plan session is already in progress" |
| A003 | The force flag overrides the verify concurrency guard | ✅ SATISFIED | `work.test.ts:5349` — calls `startWork('test-slug', { force: true })`, asserts no `exit(1)` calls, log contains "Overriding active verify session" |
| A004 | The force flag overrides the plan concurrency guard | ✅ SATISFIED | `work.test.ts:5386` — calls `startWork('test-slug', { force: true })`, asserts no `exit(1)` calls, log contains "Overriding active plan session" |
| A005 | Stale timestamps older than 1 hour are ignored automatically | ✅ SATISFIED | `work.test.ts:5420` — writes 2-hour-old `verify_started_at`, calls `startWork`, asserts no blocking and proceeds to "Worktree exists" |
| A006 | Missing saves.json does not block session start | ✅ SATISFIED | `work.test.ts:5462` — calls `checkConcurrencyGuard` on nonexistent dir, asserts `blocked === false` |
| A007 | Corrupted saves.json does not block session start | ✅ SATISFIED | `work.test.ts:5471` — writes `{{not json` to `.saves.json`, asserts `blocked === false` |
| A008 | An active verify session does not block a build session on the same work item | ✅ SATISFIED | `work.test.ts:5479` — writes `verify_started_at`, checks `build_started_at` key, asserts `blocked === false` |
| A009 | An active verify session on one work item does not block verify on a different work item | ✅ SATISFIED | `work.test.ts:5492` — writes to slug-a dir, checks slug-b dir, asserts `blocked === false` |
| A010 | Work status shows verify-in-progress when a verify session is active | ✅ SATISFIED | `work.test.ts:5505` — creates worktree with build_report, writes recent `verify_started_at`, captures `getWorkStatus` output, asserts contains "verify-in-progress" |
| A011 | Work status shows plan-in-progress when a plan session is active | ✅ SATISFIED | `work.test.ts:5530` — creates project with scope only, writes recent `plan_started_at`, captures `getWorkStatus` output, asserts contains "plan-in-progress" |
| A012 | Verify-in-progress stage shows guidance to use --force | ✅ SATISFIED | `work.test.ts:5550` — creates verify-in-progress scenario, captures output, asserts contains "--force" |
| A013 | Plan-in-progress stage shows guidance to use --force | ✅ SATISFIED | `work.test.ts:5575` — creates plan-in-progress scenario, captures output, asserts contains "--force" |
| A014 | Creating a PR is blocked when a merged PR already exists for the branch | ❌ UNSATISFIED | `pr.test.ts:427` — test reads source code and checks for string `pr.state === 'MERGED'`. Does NOT execute `createPr`, does NOT check `process.exitCode`. Contract target is `process.exitCode equals 1` — source-content assertion used as proxy for behavioral test. |
| A015 | The merged-PR error message directs the user to work complete | ❌ UNSATISFIED | `pr.test.ts:427` — same source-content test, checks for string `'work complete'` in source. Contract target is `stderr contains "work complete"` — test reads source, not stderr. |
| A016 | Creating a PR is blocked when an open PR already exists for the branch | ❌ UNSATISFIED | `pr.test.ts:438` — test reads source code and checks for `pr.state === 'OPEN'`. Contract target is `process.exitCode equals 1`. |
| A017 | The open-PR error message includes the existing PR URL | ❌ UNSATISFIED | `pr.test.ts:438` — checks for `'pr.url'` string literal in source. Contract says `stderr contains "https://"`. At runtime `pr.url` resolves to an actual URL — the test verifies the variable name exists in source, not the output. |
| A018 | PR creation proceeds when no existing PR is found | ❌ UNSATISFIED | `pr.test.ts:448` — checks source for `for (const pr of existingPrs)` and `// 4. Read verify report`. Contract target is `guardPassed equals true`. Source-content assertion. |
| A019 | Merged PRs are detected via GitHub CLI even when git is-ancestor fails | ❌ UNSATISFIED | `work.test.ts:5608` — reads source code and checks string ordering (gh list index < is-ancestor index). Contract target is `merged equals true`. Does not mock spawnSync or test detection behavior. |
| A020 | Merge detection falls back to is-ancestor when GitHub CLI is unavailable | ❌ UNSATISFIED | `work.test.ts:5621` — reads source code and checks for presence of `--state`, `merged`, `merge-base`, `--is-ancestor`. Contract target is `merged equals true`. Does not test the fallback path. |
| A021 | Verify timestamp overwrites previous value on re-entry | ✅ SATISFIED | `work.test.ts:5596` — writes old timestamp `2026-01-01T00:00:00.000Z`, calls `startWork`, reads `.saves.json`, asserts `verify_started_at !== oldTimestamp`. Also `work.test.ts:4223` (updated existing test). |
| A022 | The start command accepts a --force flag | ✅ SATISFIED | `work.test.ts:5635` — reads source, confirms `startCommand` block contains `--force`. Structural verification of option registration. Source at `work.ts:2439` confirms `.option('--force', ...)`. |

**Summary:** 15 SATISFIED, 7 UNSATISFIED.

## Independent Findings

### Prediction Resolution

1. **Prediction: determineStage might use readFileOnBranch instead of filesystem reads** — NOT FOUND. Builder correctly used `isTimestampRecent` with filesystem reads via `fs.existsSync`/`fs.readFileSync` in `determineStage`. The spec warning was heeded.

2. **Prediction: Missed boundary test at exactly 1-hour mark** — CONFIRMED. Tests use 2-hour-old timestamps for the "stale" case and `new Date()` for the "recent" case. No test at 59m59s or 60m01s. Minor — the 1-hour boundary is `<` not `<=` per `checkConcurrencyGuard` line 2327.

3. **Prediction: PR tests mock spawnSync globally** — SURPRISED. PR duplicate detection tests don't mock spawnSync at all. They read source code strings instead of testing behavior. This is worse than global mocking — it's no behavioral test at all.

4. **Prediction: --force not properly threaded** — NOT FOUND. `--force` is correctly threaded via Commander option → `cmdOptions.force` → `startWork(slug, { force: true })` → local `force` variable → guard conditional. Clean chain.

5. **Prediction: getNextAction guidance doesn't mention --force** — NOT FOUND. Both `verify-in-progress` and `plan-in-progress` guidance strings contain `--force` with the full command example.

### Surprise Finding
The merge detection tests (A019, A020) and ALL PR guard tests (A014-A018) use source-content assertions. This affects 7 of 22 contract assertions. The testing-standards skill explicitly states: "Never assert on source code content as a proxy for testing behavior — mock the trigger and assert on the output."

For the merge detection reorder and PR guards, the builder chose source inspection over mocking `spawnSync`. This is understandable given the complexity of mocking `createPr` (which has many side effects), but it violates the contract's behavioral targets and the project's testing standards.

## AC Walkthrough
- [x] AC1: `ana work start {slug}` blocks with an error when `verify_started_at` exists and is recent — ✅ PASS — verified by test A001 which runs `startWork` and asserts `process.exit(1)` and error message.
- [x] AC2: `ana work start {slug}` blocks when `plan_started_at` is recent — ✅ PASS — verified by test A002.
- [x] AC3: `--force` overrides both guards — ✅ PASS — verified by tests A003 and A004.
- [x] AC4: `ana work status` displays `verify-in-progress` — ✅ PASS — verified by test A010, output contains "verify-in-progress".
- [x] AC5: `ana work status` displays `plan-in-progress` — ✅ PASS — verified by test A011, output contains "plan-in-progress".
- [ ] AC6: `ana pr create` refuses when MERGED PR exists — ❌ FAIL — no behavioral test exists. Source inspection confirms the code path exists (`pr.ts:211-215`), but the test reads source strings instead of executing `createPr` with mocked `gh` output.
- [ ] AC7: `ana pr create` refuses when OPEN PR exists — ❌ FAIL — same issue. Code path at `pr.ts:216-220` is correct by inspection, but test is source-content only.
- [ ] AC8: `ana work complete` detects merged PR via `gh pr list --state merged` — ❌ FAIL — test at line 5608 checks source ordering, not behavior. No mock of spawnSync to simulate gh success + is-ancestor failure.
- [ ] AC9: `ana work complete` falls back to `is-ancestor` when `gh` unavailable — ❌ FAIL — test at line 5621 reads source code. No mock simulating gh failure + is-ancestor success.
- [x] AC10: `verify_started_at` written with `force: true` — ✅ PASS — verified by test A021 and source inspection. Both write sites (`work.ts:1888` inside worktree, `work.ts:2042` outside worktree) pass `true` as 4th arg.
- [x] AC11: 1-hour timeout auto-expires stale timestamps — ✅ PASS — verified by test A005 using 2-hour-old timestamp.
- [x] AC12: `getNextAction` returns guidance for new stages — ✅ PASS — verified by tests A012 and A013.
- [x] AC13: Same slug, same phase → blocked — ✅ PASS — verified by tests A001 and A002.
- [x] AC14: Same slug, different phase → allowed — ✅ PASS — verified by test A008.
- [x] AC15: Different slug → allowed — ✅ PASS — verified by test A009.
- [x] No build errors — ✅ PASS — `pnpm run build` succeeded.
- [x] Tests pass — ✅ PASS — 2345 passed, 2 skipped, 0 failed.

**Summary:** 12 of 17 ACs pass, 4 fail (AC6, AC7, AC8, AC9), 1 pass (no build errors).

## Blockers

7 contract assertions UNSATISFIED (A014-A020). All relate to tests using source-content assertions instead of behavioral tests.

The **implementation is correct** by source inspection — the code paths work as specified. The issue is that the tests don't mechanically verify the contract's behavioral targets. The testing-standards skill explicitly prohibits source-content assertions as behavioral test proxies.

To resolve:
- **A014-A018 (PR guards):** Mock `spawnSync` for `gh pr list` responses and call `createPr`. Test: merged PR → exit(1) + "work complete" in stderr; open PR → exit(1) + URL in stderr; no PRs → continues past guard.
- **A019-A020 (merge detection):** Mock `spawnSync` and `runGit`. Test: gh returns MERGED → merged=true; gh fails + is-ancestor succeeds → merged=true.

## Findings

- **Test — PR duplicate detection tests use source-content assertions:** `packages/cli/tests/commands/pr.test.ts:427-460` — All three PR guard tests (`@ana A014-A018`) read `pr.ts` source and check for string patterns like `pr.state === 'MERGED'` and `'work complete'`. These prove the strings exist in source, not that the guard blocks at runtime. The testing-standards skill states: "Never assert on source code content as a proxy for testing behavior." These need behavioral tests with mocked `spawnSync` responses.

- **Test — Merge detection reorder tests use source-content assertions:** `packages/cli/tests/commands/work.test.ts:5608-5632` — A019 checks string position ordering (`ghListIdx < isAncestorIdx`), A020 checks string presence. Neither mocks `spawnSync`/`runGit` to test the actual fallback behavior. Contract specifies `merged equals true` — tests don't assert on `merged` at all.

- **Code — `checkConcurrencyGuard` has dead `force` parameter:** `packages/cli/src/commands/work.ts:2305` — The function accepts `force: boolean = false` but neither production call site passes it. Force handling is done by the caller after the guard returns. The parameter is only exercised in direct unit tests. Not a bug — the caller pattern works — but the API suggests the function handles force when it doesn't in practice.

- **Code — `isTimestampRecent` duplicates `checkConcurrencyGuard` logic:** `packages/cli/src/commands/work.ts:357` vs `work.ts:2300` — Both parse `.saves.json`, extract a timestamp key, validate it, and compare against `CONCURRENCY_TIMEOUT_MS`. `isTimestampRecent` is a simpler version for `determineStage` (returns bool), while `checkConcurrencyGuard` adds error messaging for `startWork`. `isTimestampRecent` could call `checkConcurrencyGuard` internally: `return !checkConcurrencyGuard(savesDir, key, '').blocked`.

- **Code — Inside-worktree resume path skips concurrency guard:** `packages/cli/src/commands/work.ts:1888` — When running `ana work start` from inside the worktree (same slug), `verify_started_at` is written with `force: true` but no `checkConcurrencyGuard` call precedes it. The outside-worktree path at line 2033 does check the guard. This is arguably intentional (resume scenario vs. new session scenario), but it means the guard has a bypass path.

- **Test — No boundary test at exactly 1-hour timeout:** Tests use 2-hour-old timestamp (stale) and `new Date()` (fresh). No test at `Date.now() - 59*60*1000` (just under) or `Date.now() - 61*60*1000` (just over) to verify the `<` boundary in `checkConcurrencyGuard` line 2327. The boundary is `< CONCURRENCY_TIMEOUT_MS` (strictly less than), meaning exactly-1-hour timestamps are treated as expired.

- **Code — `plan_started_at` now written with `force: true`:** `packages/cli/src/commands/work.ts:2018` — Changed from write-once to force-write. The spec mentions `verify_started_at` force-write explicitly but `plan_started_at` force-write is a reasonable extension for consistency with the concurrency guard pattern. This is over-building relative to the spec but not harmful.

## Deployer Handoff

The implementation is correct and all three guards work as designed. Guard 1 (concurrency) is behaviorally tested. Guard 2 (PR duplicate) and Guard 3 (merge detection reorder) are only verified by source inspection, not behavioral tests. The feature is safe to ship once behavioral tests are added for A014-A020.

After merge: no migration needed. The guards read `.saves.json` which already exists. New `--force` flag is backward-compatible. New stage values (`verify-in-progress`, `plan-in-progress`) only appear in `ana work status` output — no downstream consumers to update.

## Verdict
**Shippable:** NO
7 contract assertions use source-content tests instead of behavioral tests. The implementation is sound — source inspection confirms all code paths work — but the tests don't satisfy the contract's mechanical specifications. The PR guard tests need `spawnSync` mocks and the merge detection tests need `spawnSync`/`runGit` mocks.
