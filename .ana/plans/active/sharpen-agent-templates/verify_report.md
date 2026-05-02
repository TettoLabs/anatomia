# Verify Report: Sharpen Agent Templates

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-01
**Spec:** .ana/plans/active/sharpen-agent-templates/spec.md
**Branch:** feature/sharpen-agent-templates

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/sharpen-agent-templates/contract.yaml
  Seal: INTACT (hash sha256:5652ebf10f01c50de3c28ef469ff1cc128b4363cb69b69553d1719824c005d59)
```

Tests: 1761 passed, 0 failed, 2 skipped. Build: pass. Lint: 0 errors, 14 warnings (pre-existing).

## Contract Compliance
| ID   | Says                                           | Status       | Evidence |
|------|------------------------------------------------|--------------|----------|
| A001 | Verify mandate references sentinel tests | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md:11` — contains "assertions that pass on broken AND working code" |
| A002 | Verify mandate references untested error paths | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md:11` — contains "untested error paths" |
| A003 | Verify mandate no longer suggests unclear names | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md:11` — grep for "unclear names" returns no matches |
| A004 | Verify mandate no longer suggests weak error messages | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md:11` — grep for "weak error messages" returns no matches |
| A005 | Verify mandate no longer suggests inconsistent patterns | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md:11` — grep for "inconsistent patterns" returns no matches |
| A006 | Verify mandate includes conviction about tech debt | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md:11` — contains "Every codebase carries tech debt, weak tests, and architectural shortcuts" |
| A007 | Verify mandate requires consequence test | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md:11` — contains "what goes wrong, and for whom?" |
| A008 | Findings framed for next engineer | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md:11` — contains "worth knowing for the next engineer" |
| A009 | Arbitrary minimum finding count removed | ✅ SATISFIED | Grep for "Minimum: one Code finding, one Test finding" across ana-verify.md returns no matches |
| A010 | Think can check quality trajectory | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana.md:296` — contains "ana proof health" |
| A011 | Think can review active findings | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana.md:297` — contains "ana proof audit" |
| A012 | Think routes proof management to Learn | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana.md:298` — contains "route to `claude --agent ana-learn`" |
| A013 | Think step 3 checks quality trajectory | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana.md:108` — contains "ana proof health" in step 3 |
| A014 | Worsening trend influences scope priorities | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana.md:108` — contains "a worsening trend changes what the scope should prioritize" |
| A015 | Dogfood ana-verify.md matches template | ✅ SATISFIED | `diff packages/cli/templates/.claude/agents/ana-verify.md .claude/agents/ana-verify.md` — no output (identical) |
| A016 | Dogfood ana.md matches template | ✅ SATISFIED | `diff packages/cli/templates/.claude/agents/ana.md .claude/agents/ana.md` — no output (identical) |
| A017 | Only specified lines in Verify changed | ✅ SATISFIED | `git diff main...HEAD -- packages/cli/templates/.claude/agents/ana-verify.md` — exactly 2 hunks |
| A018 | Only specified lines in Think changed | ✅ SATISFIED | `git diff main...HEAD -- packages/cli/templates/.claude/agents/ana.md` — exactly 2 hunks |
| A019 | All existing tests pass | ✅ SATISFIED | 1761 passed, 2 skipped, 0 failed. See note in Findings re: baseline count discrepancy. |
| A020 | No lint violations introduced | ✅ SATISFIED | `pnpm run lint` — 0 errors (14 warnings pre-existing) |

## Independent Findings

**Prediction resolution:**
1. "Mandate paragraph wording differences" — **Not found.** Builder used exact replacement text from spec.
2. "Orphan blank lines from deletion" — **Not found.** The deletion removed both the text line and the following blank line, leaving clean paragraph flow.
3. "Dogfood copies might not match" — **Not found.** Both diffs empty; sync test passes.
4. "Wrong insertion position for proof surface" — **Not found.** Block is correctly placed between "Learn tends it." (line 293) and `---` (line 300), with appropriate blank line spacing.
5. "Step 3 replacement altered surrounding context" — **Not found.** Diff shows exactly one line changed in that hunk — line 108 extended with the quality posture check. Lines 107 and 109 untouched.

**Production risk predictions:**
1. "Test count discrepancy" — **Confirmed but benign.** Spec says 1777, actual is 1761 (total 1763). Baseline on main shows 1760 passed + 1 failed. The feature branch adds 1 passing test (the dogfood sync test that was failing because dogfood was out of sync). This is a positive delta. The spec's "1777" was stale at time of planning.
2. "Mandate line breaks" — **Not found.** Mandate remains a single unbroken paragraph.

**No-search audit completed:** Checked for unused exports in new code (no new exports), unused parameters (no new functions), error paths needing tests (no new code paths), external assumptions (template files are static text, no runtime dependencies), spec gaps (none — builder followed spec verbatim).

## AC Walkthrough

- [x] **AC1:** Verify mandate uses new examples ✅ PASS — Line 11 contains "sentinel tests" examples ("assertions that pass on broken AND working code"), "untested error paths", "patterns that work now but break at scale". Old examples ("unclear names", "weak error messages", "inconsistent patterns") are absent.
- [x] **AC2:** Conviction line and consequence test ✅ PASS — "Every codebase carries tech debt, weak tests, and architectural shortcuts" and "what goes wrong, and for whom?" both present in mandate paragraph.
- [x] **AC3:** "worth knowing for the next engineer" ✅ PASS — Line 11 reads "worth knowing for the next engineer" (previously just "worth knowing").
- [x] **AC4:** Minimum count deleted ✅ PASS — "Minimum: one Code finding, one Test finding. Upstream when applicable." no longer present anywhere in ana-verify.md.
- [x] **AC5:** Think has proof surface reference ✅ PASS — `ana proof health`, `ana proof audit`, and `route to \`claude --agent ana-learn\`` all present in the new Proof Surface block at lines 295-298 of ana.md.
- [x] **AC6:** Think step 3 quality posture check ✅ PASS — Step 3 at line 108 now includes `ana proof health` and "a worsening trend changes what the scope should prioritize."
- [x] **AC7:** Dogfood sync ✅ PASS — `diff` between template and dogfood copies produces no output for both ana-verify.md and ana.md. Dogfood sync test passes.
- [x] **AC8:** No other lines changed ✅ PASS — `git diff` shows exactly 2 hunks per file, affecting only the specified lines. No changes to any other files outside `.ana/` plan artifacts.
- [x] **AC9:** All existing tests pass ✅ PASS — 1761 passed, 2 skipped, 0 failed. Baseline on main was 1760+1 failed — the build improved the count by fixing a pre-existing dogfood sync failure.
- [x] **AC10:** No lint errors ✅ PASS — 0 errors, 14 warnings (all pre-existing `@typescript-eslint/no-explicit-any` warnings).

## Blockers

None. All 20 contract assertions satisfied. All 10 ACs pass. No regressions — in fact, the build fixed one pre-existing test failure. Checked for: unintended file changes outside the 4 target files (none via `git diff --stat`), orphan whitespace from line deletion (clean), paragraph line breaks in mandate (single paragraph preserved), proof surface block positioning (correct).

## Findings

- **Upstream — Stale test baseline in spec:** `spec.md:133` — Spec claims "1777 passed, 2 skipped (1779 total)" but actual baseline on main is 1760 passed, 1 failed, 2 skipped (1763 total). The number was stale at planning time. No impact on this build but future builds referencing this spec's baseline will see a mismatch. The contract wisely uses `matcher: equals, value: pass` rather than a count, so this doesn't affect assertion satisfaction.

- **Upstream — Spec correction about test coverage was correct:** `spec.md:15` — Spec notes that scope wrongly claimed the dogfood sync test doesn't cover ana.md. Spec correctly identified that `agent-proof-context.test.ts:68` covers all four agent files. Good catch by the planner — the scope had a factual error that could have led Build to write an unnecessary test.

- **Code — Proof surface block in ana.md is informational only:** `packages/cli/templates/.claude/agents/ana.md:295-298` — The proof surface section lists commands (`ana proof health`, `ana proof audit`) but doesn't specify what to DO with the results. Think's step 3 has the actionable guidance ("a worsening trend changes what the scope should prioritize"), but the standalone Proof Surface section is purely a command reference. For an LLM agent, a command list without behavioral guidance risks being ignored or misapplied. Not a blocker — the step 3 integration provides the behavioral anchor — but worth noting for the next template iteration.

- **Test — Dogfood sync test is coarse-grained:** `packages/cli/tests/templates/agent-proof-context.test.ts:66-75` — The sync test uses `.toBe(template)` which proves byte-identity between template and dogfood. This is the right test for sync, but it means any content assertion bug (wrong text inserted) is caught only by human review, not by a content-specific test. The spec explicitly chose not to add content tests ("would be brittle and couple tests to prose") — a reasonable tradeoff, but it means the test suite doesn't independently verify that the mandate says what the contract claims. The contract's content assertions are verified here by source inspection only.

- **Upstream — Proof chain finding still active:** The proof context shows "Verify template retains 'If the command is not available' fallback — preserved to avoid breaking existing test, but inconsistent with Learn cleanup" from a prior cycle. This build doesn't touch that area and the finding remains active. Referencing for continuity — still present, see prior Learn V3 finding.

## Deployer Handoff

Straightforward template-only change. After merge:
- The dogfood copies in `.claude/agents/` are already synced — they'll be current on main.
- The templates in `packages/cli/templates/` ship to new `ana init` users.
- No CLI code changes, no new dependencies, no migration needed.
- The one pre-existing test failure on main (dogfood sync) will be fixed by this merge.

## Verdict
**Shippable:** YES

All 20 contract assertions satisfied. All 10 acceptance criteria pass. No regressions. The changes are surgical text edits with byte-identical dogfood sync. The mandate reword shifts Verify's finding priorities from style to substance, and Think gains proof chain awareness for scoping. Clean build.
