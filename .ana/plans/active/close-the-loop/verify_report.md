# Verify Report: Close the Loop

**Result:** FAIL
**Created by:** AnaVerify
**Date:** 2026-04-28
**Spec:** .ana/plans/active/close-the-loop/spec.md
**Branch:** feature/close-the-loop

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/close-the-loop/contract.yaml
  Seal: INTACT (hash sha256:17ed7a31fc050af32d7ed1948ade6f721bb0a64823f0e2ef8356ffc89ad8a7bf)

  A001  ✓ COVERED  "Closing a finding marks it as closed with the developer's reason"
  A002  ✓ COVERED  "Closed findings record who closed them and why"
  A003  ✓ COVERED  "Closed findings record the reason provided"
  A004  ✓ COVERED  "Closing a finding commits the change to git with a traceable message"
  A005  ✓ COVERED  "Closing regenerates the proof chain dashboard"
  A006  ✓ COVERED  "Closing from the wrong branch is rejected with a clear error"
  A007  ✓ COVERED  "Closing a nonexistent finding tells the developer it doesn't exist"
  A008  ✓ COVERED  "Closing an already-closed finding shows who closed it and when"
  A009  ✓ COVERED  "Closing without a reason is rejected because closures need explanations"
  A010  ✓ COVERED  "Closing a lesson shows the transition from lesson to closed"
  A011  ✓ COVERED  "Close JSON response includes the full finding object"
  A012  ✓ COVERED  "Close JSON response includes the status transition"
  A013  ✓ COVERED  "Close JSON response includes chain health metadata"
  A014  ✓ COVERED  "Audit shows active findings grouped by file"
  A015  ✓ COVERED  "Audit caps display at 8 files maximum"
  A016  ✓ COVERED  "Audit caps display at 3 findings per file"
  A017  ✓ COVERED  "Audit shows overflow count when findings exceed display caps"
  A018  ✓ COVERED  "Audit works from any branch without requiring artifact branch"
  A019  ✓ COVERED  "Audit on a clean chain tells the developer there are no active findings"
  A020  ✓ COVERED  "Audit JSON includes total active count and per-file breakdown"
  A021  ✓ COVERED  "Audit JSON includes anchor presence check for each finding"
  A022  ✓ COVERED  "All proof JSON responses use the permanent four-key envelope"
  A023  ✓ COVERED  "All proof JSON responses include chain health in metadata"
  A024  ✓ COVERED  "JSON error responses include the error code and chain metadata"
  A025  ✓ COVERED  "JSON error responses still include metadata even on failure"
  A026  ✓ COVERED  "The Plan template delivers proof context to Build as a structural subsection"
  A027  ✓ COVERED  "Work complete warns when pull fails for non-conflict reasons"
  A028  ✓ COVERED  "Work complete nudges the developer to audit when findings pile up"
  A029  ✓ COVERED  "The audit nudge disappears after the first manual finding closure"

  29 total · 29 covered · 0 uncovered
```

Tests: 1599 passed, 0 failed, 2 skipped (baseline was 1575 + 2 skipped — 24 net new tests). Build: success. Lint: 0 errors, 14 warnings (all pre-existing `@typescript-eslint/no-explicit-any` in unrelated files).

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Closing a finding marks it as closed with the developer's reason | ✅ SATISFIED | `proof.test.ts:844` — reads chain after close, asserts `finding.status === 'closed'` |
| A002 | Closed findings record who closed them and why | ✅ SATISFIED | `proof.test.ts:845` — asserts `finding.closed_by === 'human'` |
| A003 | Closed findings record the reason provided | ✅ SATISFIED | `proof.test.ts:846` — asserts `finding.closed_reason === 'fixed-in-pr'` (stronger than exists) |
| A004 | Closing a finding commits the change to git with a traceable message | ✅ SATISFIED | `proof.test.ts:852` — reads `git log -1`, asserts contains `[proof] Close` and `F001` |
| A005 | Closing regenerates the proof chain dashboard | ✅ SATISFIED | `proof.test.ts:849-850` — reads PROOF_CHAIN.md, asserts contains 'Proof Chain Dashboard' |
| A006 | Closing from the wrong branch is rejected with a clear error | ✅ SATISFIED | `proof.test.ts:860-869` — creates project on `feature/other` branch, asserts stderr contains 'Wrong branch' and JSON `error.code === 'WRONG_BRANCH'` |
| A007 | Closing a nonexistent finding tells the developer it doesn't exist | ✅ SATISFIED | `proof.test.ts:878-889` — closes F999, asserts stderr 'not found' and JSON `error.code === 'FINDING_NOT_FOUND'` |
| A008 | Closing an already-closed finding shows who closed it and when | ✅ SATISFIED | `proof.test.ts:898-909` — closes F003 (already closed), asserts `error.code === 'ALREADY_CLOSED'` and `error.closed_by === 'mechanical'` |
| A009 | Closing without a reason is rejected because closures need explanations | ✅ SATISFIED | `proof.test.ts:918-929` — omits --reason, asserts stderr '--reason is required' and JSON `error.code === 'REASON_REQUIRED'` |
| A010 | Closing a lesson shows the transition from lesson to closed | ✅ SATISFIED | `proof.test.ts:937-942` — closes L001 (lesson status), asserts stdout contains 'lesson' and 'closed' |
| A011 | Close JSON response includes the full finding object | ✅ SATISFIED | `proof.test.ts:950` — asserts `json.results.finding.id === 'F001'` |
| A012 | Close JSON response includes the status transition | ✅ SATISFIED | `proof.test.ts:951` — asserts `json.results.previous_status === 'active'` |
| A013 | Close JSON response includes chain health metadata | ✅ SATISFIED | `proof.test.ts:954-955` — asserts `json.meta.findings.active` defined, `json.meta.chain_runs` defined |
| A014 | Audit shows active findings grouped by file | ✅ SATISFIED | `proof.test.ts:993-998` — creates 5 findings across 2 files, asserts output contains 'findings)' and both file paths |
| A015 | Audit caps display at 8 files maximum | ❌ UNSATISFIED | `proof.test.ts:1005-1012` — creates 30 findings across 10 files, but asserts `fileHeaders.length <= 10` not `=== 8`. Matcher says `equals 8`; test uses `toBeLessThanOrEqual(10)`. Also, the counting method (lines containing 'finding') matches the summary header and overflow lines too, not just file headers. |
| A016 | Audit caps display at 3 findings per file | ✅ SATISFIED | `proof.test.ts:1019-1024` — creates 6 findings in 1 file, asserts '3 more' in output (proving 3 displayed, 3 overflow) |
| A017 | Audit shows overflow count when findings exceed display caps | ✅ SATISFIED | `proof.test.ts:1031-1035` — creates 50 findings across 12 files, asserts output contains 'more' |
| A018 | Audit works from any branch without requiring artifact branch | ✅ SATISFIED | `proof.test.ts:1041-1058` — creates project, checks out `feature/something`, runs audit, asserts exitCode 0 |
| A019 | Audit on a clean chain tells the developer there are no active findings | ✅ SATISFIED | `proof.test.ts:1063-1075` — all findings set to 'closed', asserts output contains 'clean' |
| A020 | Audit JSON includes total active count and per-file breakdown | ✅ SATISFIED | `proof.test.ts:1083` — asserts `json.results.total_active === 5` |
| A021 | Audit JSON includes anchor presence check for each finding | ✅ SATISFIED | `proof.test.ts:1086` — asserts `json.results.by_file[0].findings[0].anchor_present` defined |
| A022 | All proof JSON responses use the permanent four-key envelope | ✅ SATISFIED | `proof.test.ts:1103-1106` — list --json checks command, timestamp, results, meta all defined. Also verified in detail JSON at `proof.test.ts:434-438` and context JSON at `proof.test.ts:361-366` |
| A023 | All proof JSON responses include chain health in metadata | ✅ SATISFIED | `proof.test.ts:1107-1112` — asserts meta.chain_runs and meta.findings.{active,closed,lesson,promoted,total} all defined |
| A024 | JSON error responses include the error code and chain metadata | ✅ SATISFIED | `proof.test.ts:967` — asserts `json.error.code === 'FINDING_NOT_FOUND'` |
| A025 | JSON error responses still include metadata even on failure | ✅ SATISFIED | `proof.test.ts:968` — asserts `json.meta` defined on error response |
| A026 | The Plan template delivers proof context to Build as a structural subsection | ✅ SATISFIED | `proof.test.ts:1093-1099` — reads template file, asserts '### Proof Context' present and positioned between Pattern Extracts and Checkpoint Commands |
| A027 | Work complete warns when pull fails for non-conflict reasons | ❌ UNSATISFIED | `work.test.ts:1951-1960` — reads source file and checks string presence. Contract target is `output`, matcher is `contains`, but the test asserts against source code text, not program output. This is a sentinel test — it proves the string exists in source, not that the warning appears in output during a non-conflict pull failure. |
| A028 | Work complete nudges the developer to audit when findings pile up | ✅ SATISFIED | `work.test.ts:1968-2013` — creates 25 active findings with zero human closures, runs completeWork, captures console.log, asserts output contains 'ana proof audit' |
| A029 | The audit nudge disappears after the first manual finding closure | ✅ SATISFIED | `work.test.ts:2019-2066` — creates 24 active + 1 human-closed finding, runs completeWork, asserts output does NOT contain 'ana proof audit' |

## Independent Findings

### Prediction Resolution

1. **Anchor checking shortcut — Confirmed.** The anchor stripping regex at `proof.ts:544` (`finding.anchor.replace(/\.\w+:\d+(-\d+)?$/, '').replace(/:\d+(-\d+)?$/, '')`) strips file extensions and line ranges. An anchor like `census.ts:267-274` becomes `census`, and then `content.includes('census')` matches any occurrence of the word "census" in the file — not the specific code construct. This is a false-positive risk for common anchor names.

2. **Weak truncation test — Confirmed.** A015 uses `toBeLessThanOrEqual(10)` on an imprecise line count instead of verifying exactly 8 file headers are displayed.

3. **Old tests weakened — Not found.** The existing JSON tests were updated to assert on the new envelope structure. Assertions are actually stronger now — checking `json.command`, `json.meta.chain_runs`, etc. alongside the original data under `json.results`. Good work.

4. **`computeChainHealth` missing guard — Not found.** The extracted function preserves the `e.findings || []` guard from the original code.

5. **Nudge uses wrong count source — Partially confirmed.** The nudge correctly uses `stats.active` (from writeProofChain return value) for the `> 20` threshold. However, for the human closure check, it re-reads `proof_chain.json` from disk (`work.ts:1298`) instead of reusing the chain object that writeProofChain just wrote. The spec says "Use the stats object already returned by writeProofChain for the active count. For human-closure check, scan all findings in the chain for any with `closed_by === 'human'`." The re-read is functionally equivalent since it reads the just-written file, but it's an unnecessary I/O call.

6. **Surprised: A027 is a sentinel test.** The pull warning test reads source code instead of simulating a non-conflict pull failure. This is the most impactful finding — the feature's error path is completely untested behaviorally.

7. **Surprised: Shell injection in commit message.** At `proof.ts:469`, the close command interpolates the user's `--reason` directly into a shell command: `` execSync(`git commit -m "${commitMessage}"`) ``. If the reason contains `"`, backticks, or `$()`, the command breaks or could execute arbitrary shell commands. This follows the same pattern used in `work.ts` for other commits, so it's a pre-existing pattern — but it's new surface area for user-controlled input.

## AC Walkthrough

- **AC1:** `ana proof close {id} --reason "text"` sets finding status to `closed` with fields, regenerates PROOF_CHAIN.md, commits, pushes. ✅ PASS — Verified via test at `proof.test.ts:836-853`: close mutates finding, writes chain, regenerates dashboard, commits with `[proof] Close` prefix.

- **AC2:** Close requires the artifact branch. Wrong branch produces `WRONG_BRANCH`. ✅ PASS — Test at `proof.test.ts:857-870` verifies both human and JSON error paths.

- **AC3:** Close runs `git pull --rebase` before reading chain. ✅ PASS — Code at `proof.ts:395-406` follows saveArtifact pattern. Non-conflict failures warn and continue.

- **AC4:** Close with nonexistent finding ID produces `FINDING_NOT_FOUND`. ✅ PASS — Test at `proof.test.ts:875-890`.

- **AC5:** Close on already-closed finding produces `ALREADY_CLOSED` with closer info. ✅ PASS — Test at `proof.test.ts:895-910` verifies error code and context fields.

- **AC6:** Close without `--reason` produces `REASON_REQUIRED`. ✅ PASS — Test at `proof.test.ts:915-930`.

- **AC7:** Close `--json` returns 4-key envelope with finding and meta. ✅ PASS — Test at `proof.test.ts:947-956`.

- **AC8:** All `--json` error responses follow error envelope. ✅ PASS — Test at `proof.test.ts:962-969` verifies error envelope on FINDING_NOT_FOUND.

- **AC9:** Audit lists active findings grouped by file, top 3/file, top 8 files, overflow. ⚠️ PARTIAL — Grouping and per-file cap verified. 8-file cap code is correct (`MAX_FILES = 8` + `.slice(0, MAX_FILES)`) but the test assertion for 8-file cap is weak (A015 UNSATISFIED).

- **AC10:** Each audit finding displays three lines. ✅ PASS — Code at `proof.ts:595-598` outputs `[category] summary`, `age: Nd | anchor: ✓/✗ | severity:`, `from: Feature Name`. Verified by reading implementation.

- **AC11:** Audit `--json` returns 4-key envelope with total_active and by_file. ✅ PASS — Test at `proof.test.ts:1080-1088`.

- **AC12:** Existing commands restructured into 4-key contract. ✅ PASS — List at `proof.ts:233`, detail at `proof.ts:276`, context at `proof.ts:306-308` all use `wrapJsonResponse`. Tests updated throughout.

- **AC13:** `meta` contains `{ chain_runs, findings: { active, closed, lesson, promoted, total } }`. ✅ PASS — Test at `proof.test.ts:1107-1112` verifies all five sub-fields.

- **AC14:** Plan template includes `### Proof Context` as structural subsection. ✅ PASS — Both template and live agent updated. Test at `proof.test.ts:1093-1099` verifies presence and ordering.

- **AC15:** `work complete` shows nudge when active > 20 AND zero human closures. ✅ PASS — Test at `work.test.ts:1968-2013` runs completeWork with 25 active findings and zero human closures, verifies 'ana proof audit' in output.

- **AC16:** `work complete`'s pull error handling warns on non-conflict failures. ❌ FAIL — Code at `work.ts:1047-1051` implements the warning, but the test at `work.test.ts:1951-1960` only reads source code for string presence instead of testing the actual error path behavior.

- **AC17:** Closing a lesson shows `lesson → closed` transition. ✅ PASS — Test at `proof.test.ts:937-942` closes L001 (lesson), asserts output contains both 'lesson' and 'closed'.

- **Tests pass:** ✅ PASS — 1599 passed, 0 failed, 2 skipped.

- **No build errors:** ✅ PASS — tsup build success in 22ms.

- **No lint errors:** ✅ PASS — 0 errors (14 pre-existing warnings).

## Blockers

Two contract assertions are UNSATISFIED:

1. **A015** — The test asserts `fileHeaders.length <= 10` when the contract requires `displayed_file_count equals 8`. The counting method also matches non-header lines containing "finding". The code is correct (MAX_FILES = 8, .slice(0, MAX_FILES)), but the test doesn't prove it.

2. **A027** — The test reads source code for string presence instead of testing the actual output of work complete during a non-conflict pull failure. The contract target is `output` with matcher `contains "Warning"`. A source-code grep is not an output test.

## Findings

- **Test — A015 assertion too weak for equals-8 contract:** `packages/cli/tests/commands/proof.test.ts:1011` — uses `toBeLessThanOrEqual(10)` when contract requires `equals 8`. The line-counting heuristic (matching "finding" substring) also catches the summary header and overflow lines, not just file headers. Fix: count lines matching a file header pattern (e.g., lines with `(N findings)` indented at file-header level) and assert exactly 8.

- **Test — A027 is a sentinel test:** `packages/cli/tests/commands/work.test.ts:1951-1960` — reads source code with `fsSync.readFileSync` and checks for string presence. This proves the string exists in the codebase, not that the warning appears during execution. A test that reads source code instead of exercising the code path would pass even if the warning were in a dead branch. Fix: mock `execSync` to throw a non-conflict error during pull, run completeWork, assert warning in captured console output.

- **Code — Shell injection in close commit message:** `packages/cli/src/commands/proof.ts:469` — `execSync(\`git commit -m "${commitMessage}"\`)` interpolates user-controlled `--reason` directly into shell command. A reason containing `"` or `$(...)` breaks the command or injects. Same pattern exists in other commit calls in the codebase, but close is new user-controlled surface area. Not a blocker since the user controls both CLI and repo, but worth hardening with single quotes or `--` separator.

- **Code — Anchor stripping regex false-positives:** `packages/cli/src/commands/proof.ts:544` — the regex chain `.replace(/\.\w+:\d+(-\d+)?$/, '').replace(/:\d+(-\d+)?$/, '')` strips too aggressively. An anchor `census.ts:267-274` becomes `census`, and `content.includes('census')` matches any occurrence in the file. For common words as anchors, this inflates `anchor_present` counts. A more precise approach: search for the anchor as a token boundary match or keep the function name portion.

- **Code — Unnecessary disk re-read for nudge human closure check:** `packages/cli/src/commands/work.ts:1296-1308` — the nudge re-reads `proof_chain.json` from disk to check for human closures, even though `writeProofChain` just wrote it. The chain data is available in memory via the stats return path or could be threaded through. Extra I/O on every work complete.

- **Upstream — A015 target/matcher may be under-specified for display test:** The contract target `displayed_file_count` with matcher `equals` and value `8` implies a numeric comparison, but the actual test output is terminal text. A display cap is better verified by counting rendered file headers. The contract is not wrong, but the target name suggests a numeric value that doesn't exist as a discrete variable — the builder had to invent a counting method, which led to the weak assertion.

## Deployer Handoff

Two tests need strengthening before merge:

1. **A015 (8-file cap):** The code is correct — `MAX_FILES = 8` with `.slice(0, MAX_FILES)`. The test just needs a tighter assertion. Quick fix: count lines matching the file-header pattern (indented, containing `(N finding`) and assert exactly 8.

2. **A027 (pull warning):** The error path code is implemented correctly at `work.ts:1047-1051`. The test needs to exercise the actual code path: mock `execSync` to throw a non-conflict error during the pull step, run `completeWork`, and verify the warning in captured console output.

All other 27 assertions are SATISFIED. The implementation quality is solid — clean extraction of `computeChainHealth`, consistent JSON envelope wrapping, proper error code hierarchy in close, and well-structured audit display. The template changes are identical between live and template copies. No regressions in 1599 tests.

## Verdict
**Shippable:** NO

2 of 29 contract assertions are UNSATISFIED due to weak test assertions. The underlying code is correct for both — the tests just don't prove what the contract requires. After fixing the two test assertions, this should pass cleanly.
