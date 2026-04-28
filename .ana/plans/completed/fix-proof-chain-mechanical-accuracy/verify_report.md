# Verify Report: Fix Proof Chain Mechanical Accuracy

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-27
**Spec:** .ana/plans/active/fix-proof-chain-mechanical-accuracy/spec.md
**Branch:** feature/fix-proof-chain-mechanical-accuracy

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/fix-proof-chain-mechanical-accuracy/contract.yaml
  Seal: INTACT (hash sha256:088cc1091362cbb524f0d485420928b275231e8d3581ec08d436a8e808a1c407)

  A001  ✓ COVERED  "A finding referencing a file by partial monorepo path is not closed when the file exists elsewhere in the project"
  A002  ✓ COVERED  "A partial monorepo path finding stays active after staleness checks"
  A003  ✓ COVERED  "A finding referencing a genuinely deleted file is closed by the mechanical layer"
  A004  ✓ COVERED  "Deleted file closures record the reason as file removed"
  A005  ✓ COVERED  "A finding with an ambiguous basename matching many files is not closed"
  A006  ✓ COVERED  "Upstream findings are never subject to staleness checks"
  A007  ✓ COVERED  "An upstream finding with a missing file stays as a lesson"
  A008  ✓ COVERED  "Older findings on the same file are not superseded by newer ones"
  A009  ✓ COVERED  "Both old and new findings on the same file stay active"
  A010  ✓ COVERED  "Previously superseded findings are reopened"
  A011  ✓ COVERED  "Reopened findings have their closure metadata cleared"
  A012  ✓ COVERED  "Wrongly-closed upstream findings are reopened as lessons"
  A013  ✓ COVERED  "Files that exist at their declared path are skipped during resolution"
  A014  ✓ COVERED  "Files with slashes that do not exist at declared path enter resolution"
  A015  ✓ COVERED  "Bare basenames still enter the resolution chain"
  A016  ✓ COVERED  "Anchor checks run on files verified to exist and close when anchor is absent"
  A017  ✓ COVERED  "Anchor checks do not run on files that do not exist at the declared path"
  A018  ✓ COVERED  "The verify template uses repo-relative paths in its example"
  A019  ✓ COVERED  "The verify template includes guidance to reference existing findings"
  A020  ✓ COVERED  "The template and dogfood copies are identical"

  20 total · 20 covered · 0 uncovered
```

Tests: 1539 passed, 0 failed, 2 skipped (97 test files). Build: clean. Lint: 0 errors, 14 warnings (all pre-existing).

## Contract Compliance
| ID   | Says                                           | Status       | Evidence |
|------|------------------------------------------------|--------------|----------|
| A001 | Finding with partial monorepo path not closed when file exists elsewhere | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1339` — creates file at `packages/cli/src/types/contract.ts`, sets finding with `file: 'src/types/contract.ts'`, asserts `status` not `'closed'` |
| A002 | Partial monorepo path finding stays active after staleness | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1358` — asserts `status` equals `'active'` |
| A003 | Genuinely deleted file closed by mechanical layer | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1362` — finding with `file: 'deleted-basename.ts'`, no file created anywhere, asserts `status` equals `'closed'` |
| A004 | Deleted file closures record reason as "file removed" | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1377` — asserts `closed_reason` equals `'file removed'` |
| A005 | Ambiguous basename not closed | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1381` — creates 5 `index.ts` files, asserts `status` not `'closed'` |
| A006 | Upstream findings never subject to staleness | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1404` — upstream finding with `status: 'lesson'` and nonexistent file, asserts stays `'lesson'` |
| A007 | Upstream finding with missing file stays as lesson | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1420` — asserts `closed_reason` not `'file removed'` |
| A008 | Older findings on same file not superseded | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1295` — two findings on `src/shared.ts`, older asserts `status` not `'closed'` and equals `'active'` |
| A009 | Both old and new findings stay active | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1334` — newer entry's active findings count > 0 |
| A010 | Previously superseded findings reopened | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1424` — finding with `closed_reason: 'superseded by new-C1'`, asserts `status` equals `'active'` |
| A011 | Reopened findings have closure metadata cleared | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1447` — asserts `closed_reason` not equals `'superseded by new-C1'` (property deleted via `delete`) |
| A012 | Wrongly-closed upstream findings reopened as lessons | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1451` — upstream finding closed with `'code changed, anchor absent'`, asserts `status` equals `'lesson'` |
| A013 | Files existing at declared path skipped during resolution | ✅ SATISFIED | `packages/cli/tests/utils/proofSummary.test.ts:1169` — creates real file at `src/utils/proofSummary.ts` in temp dir, asserts file unchanged |
| A014 | Files with slashes not existing at declared path enter resolution | ✅ SATISFIED | `packages/cli/tests/utils/proofSummary.test.ts:1179` — `src/utils/proofSummary.ts` not on disk, modules contain match, resolves to full path |
| A015 | Bare basenames still enter resolution chain | ✅ SATISFIED | `packages/cli/tests/utils/proofSummary.test.ts:1220` — `census.ts` bare basename resolved to `packages/cli/src/engine/census.ts` via glob |
| A016 | Anchor checks close when anchor absent from existing file | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1473` — file exists, anchor missing, asserts `closed_reason` equals `'code changed, anchor absent'` |
| A017 | Anchor checks don't run on files not existing at declared path | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1494` — file at `src/target.ts` doesn't exist (2 ambiguous matches elsewhere), asserts `closed_reason` not `'code changed, anchor absent'` |
| A018 | Verify template uses repo-relative path example | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md:323` — contains `packages/cli/src/utils/helper.ts:42` with repo-relative guidance. Note: pre-check COVERED status is from tag collision with other contracts' A018; functional content verified directly. |
| A019 | Verify template includes duplicate finding guidance | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md:98` — contains "If your finding matches an active proof chain issue, reference it (e.g., 'still present — see {finding-id}') rather than re-describing it." |
| A020 | Template and dogfood copies match | ✅ SATISFIED | `diff` between `packages/cli/templates/.claude/agents/ana-verify.md` and `.claude/agents/ana-verify.md` produces empty output — byte-for-byte identical. |

## Independent Findings

**Prediction resolutions:**

1. **Glob cache threshold off** — Not found. `matches.length === 0` closes, `1+` skips. Correct per spec.
2. **Reopen loop reopens manual closures** — Not found. Guard at `packages/cli/src/commands/work.ts:877` (`finding.closed_by !== 'mechanical'`) correctly skips non-mechanical closures.
3. **Phase-ordering comment missing** — Not found. Lines 867–872 have a detailed comment explaining the ordering constraint.
4. **A020 test is weak** — Partially confirmed. See Callouts — no NEW test tagged for this contract's A018-A020. Pre-check reports COVERED due to tag collision with other contracts.
5. **existsSync gate with empty projectRoot** — Not found. `projectRoot` changed to required parameter; both call sites provide it.

**Surprise finding:** The `delete` keyword is used in the reopen loop (lines 887–889) instead of setting fields to `undefined` as the spec instructed. Functionally equivalent for JSON serialization — `JSON.stringify` omits both `undefined` values and deleted properties. Not a behavioral issue; a spec deviation.

**Code quality observations:**

- The `if (projectRoot)` guard at `packages/cli/src/utils/proofSummary.ts:346` is now dead code. `projectRoot` is a required `string`, so the truthiness check always passes (unless `''` is passed). Harmless but vestigial.
- The dead ternary at `packages/cli/src/commands/work.ts:811` (`category === 'upstream' ? 'active' : 'active'`) is still present — a pre-existing issue, not introduced by this build. Lines 818-825 immediately overwrite `status` correctly. Still present — see proof chain finding from "Fix artifact save bypass."
- No over-building detected. Changes are tightly scoped to what the spec requires. No new exports, no new utility functions, no extra parameters.

## AC Walkthrough

- **AC1:** ✅ PASS — Test at `packages/cli/tests/commands/work.test.ts:1339` creates `packages/cli/src/types/contract.ts`, sets finding with `file: 'src/types/contract.ts'`, verifies not closed and stays active.
- **AC2:** ✅ PASS — Test at `packages/cli/tests/commands/work.test.ts:1362` uses bare basename `deleted-basename.ts` with no file on disk, verifies closed as `'file removed'`.
- **AC3:** ✅ PASS — Test at `packages/cli/tests/commands/work.test.ts:1381` creates 5 `index.ts` files, verifies finding not closed.
- **AC4:** ✅ PASS — Test at `packages/cli/tests/commands/work.test.ts:1404` verifies upstream finding with nonexistent file stays `'lesson'` and is never closed. Implementation guard at `work.ts:918` (`if (finding.category === 'upstream') continue;`).
- **AC5:** ✅ PASS — Supersession block entirely removed from `work.ts`. Only reference to "superseded" is in the reopen logic matching old closures. Comment at line 962 documents removal.
- **AC6:** ✅ PASS — Reopen loop at `work.ts:874-892` reopens findings matching `closed_by === 'mechanical'` with `superseded by`, `file removed`, or upstream `anchor absent`. Tests at lines 1424 and 1451 verify.
- **AC7:** ✅ PASS — `proofSummary.ts:339` uses `fs.existsSync(path.join(projectRoot, item.file))` instead of `includes('/')`. Tests at lines 1169, 1179, and 1220 verify all three gate behaviors.
- **AC8:** ✅ PASS — Anchor check at `work.ts:927` only runs inside the `if (fs.existsSync(fullPath))` branch. Test at `work.test.ts:1494` verifies file not at declared path skips anchor check.
- **AC9:** ✅ PASS — Template at line 323 reads `packages/cli/src/utils/helper.ts:42` with explicit repo-relative vs package-relative distinction.
- **AC10:** ✅ PASS — Template at line 98 includes guidance: "If your finding matches an active proof chain issue, reference it… rather than re-describing it."
- **AC11:** ✅ PASS — `diff` between template and dogfood produces no output.
- **AC12:** ✅ PASS — 1539 tests passed, 0 failed, 2 skipped.
- **AC13:** ✅ PASS — `pnpm run build` succeeded cleanly.
- **AC14:** ✅ PASS — Former supersession test at `work.test.ts:1295` renamed to "does not supersede findings on same file+category" with flipped expectations. Former `resolveFindingPaths` slash-gate test at `proofSummary.test.ts:1169` replaced with `existsSync`-based test using real files in a temp directory.

## Blockers

No blockers. All 20 contract assertions satisfied. All 14 acceptance criteria pass. Tests pass (1539/0/2). Build clean. Lint clean (0 new warnings). No regressions.

Checked for: unused exports in new code (none — no new exports added), unused parameters (all function params used), error paths without test coverage (glob failure handled by cache pattern), external state assumptions (glob uses `cwd: projectRoot` which is verified to exist by callers), spec gaps requiring builder decisions (the `delete` vs `undefined` choice for reopen cleanup — functionally equivalent).

## Callouts

- **Code — Dead truthiness guard after parameter change:** `packages/cli/src/utils/proofSummary.ts:346` — `else if (projectRoot)` was meaningful when `projectRoot` was optional; now it's always truthy since the parameter is required `string`. Remove the guard and outdent the glob fallback block.

- **Code — `delete` instead of explicit `undefined` in reopen loop:** `packages/cli/src/commands/work.ts:887-889` — Spec says "Don't use `delete` — set explicitly so the JSON serialization is clean." Builder used `delete`. Functionally identical for `JSON.stringify` output (both omit the property), but deviates from spec guidance. Not a blocker — the behavior is correct.

- **Code — Dead ternary on finding status:** `packages/cli/src/commands/work.ts:811` ��� `category === 'upstream' ? 'active' : 'active'` — both branches identical. Pre-existing issue, not introduced by this build. Still present — see proof chain finding from "Fix artifact save bypass, cwd bug, and work complete crash recovery."

- **Test — A018/A019/A020 tag collision with other contracts:** The pre-check reports these as COVERED, but the matched tags belong to tests from other features (readme.test.ts, confirmation.test.ts, scanProject.test.ts, proof.test.ts). No NEW tagged tests were written for this contract's template assertions. The existing `agent-proof-context.test.ts:66-75` (`@ana A008`) does verify template-dogfood sync byte-for-byte, and the template content was verified directly. Functional coverage exists; formal tag coverage for this contract does not.

- **Test — A011 assertion checks one value not cleared state:** `packages/cli/tests/commands/work.test.ts:1447` — asserts `closed_reason` is not `'superseded by new-C1'` but doesn't assert `closed_at` or `closed_by` are also cleared. The test proves the specific contract assertion (matcher: `not_equals`, value: `'superseded by new-C1'`) but a stronger test would verify all three closure fields are absent.

- **Upstream — Contract A011 matcher is weak:** The contract specifies `not_equals` / `"superseded by new-C1"` which only proves one field changed. A stronger contract assertion would check `closed_reason` is `undefined`/absent, confirming full metadata clearance rather than just "not the old value."

## Deployer Handoff

- The reopen loop runs once per `completeWork` invocation. For projects with many wrongly-closed findings from the old supersession/staleness logic, the first `completeWork` after this merge may reopen a noticeable number of findings. The `active findings` count in the proof chain summary may increase. This is expected and correct — those findings were wrongly closed.
- `globSync` is called during staleness checks for findings whose files don't exist at the declared path. On very large monorepos, this could add latency to `completeWork`. The `globResultCache` mitigates repeated calls for the same basename.
- No new dependencies. `glob` was already in use in `proofSummary.ts`; the import was added to `work.ts`.

## Verdict
**Shippable:** YES

All 20 contract assertions satisfied. All 14 acceptance criteria pass. The three core bugs (wrong `includes('/')` gate, broken supersession heuristic, missing upstream exemption) are fixed with filesystem-verified logic. The reopen loop correctly reverses prior damage. Template changes are accurate and in sync. No regressions, no over-building, no blockers.
