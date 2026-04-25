# Verify Report: Replace PROOF_CHAIN.md reads with targeted proof context queries

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-25
**Spec:** .ana/plans/active/proof-chain-targeted-queries/spec.md
**Branch:** feature/proof-chain-targeted-queries

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/proof-chain-targeted-queries/contract.yaml
  Seal: INTACT (commit ff6bd5f, hash sha256:038d5bfc0c3a5...)

  A001  ✓ COVERED  "Ana queries proof chain history using the targeted command during exploration"
  A002  ✓ COVERED  "Ana's checkpoint references existing findings instead of re-reading the proof chain file"
  A003  ✓ COVERED  "Ana no longer reads the proof chain file before scoping"
  A004  ✓ COVERED  "Verify queries proof chain history using the targeted command after loading the contract"
  A005  ✓ COVERED  "Verify falls back to reading the proof chain file when the command is unavailable"
  A006  ✓ COVERED  "Plan agents receive proof context through the scope, not by reading the file directly"
  A007  ✓ COVERED  "Build agents receive proof context through the spec, not by reading the file directly"
  A008  ✓ COVERED  "Dogfood agent definitions match the shipped templates exactly"

  8 total · 8 covered · 0 uncovered
```

Tests: 1475 passed, 0 failed, 2 skipped. Build: clean. Lint: clean.

## Contract Compliance

| ID   | Says                                           | Status       | Evidence |
|------|------------------------------------------------|--------------|----------|
| A001 | Ana queries proof chain history using the targeted command during exploration | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana.md:108` contains `` `ana proof context {files}` ``; test at `agent-proof-context.test.ts:14` asserts `toContain('ana proof context')` — matcher `contains` matches contract |
| A002 | Ana's checkpoint references existing findings instead of re-reading the proof chain file | ✅ SATISFIED | `ana.md:119` checkpoint paragraph says "relevant proof chain findings" without `PROOF_CHAIN.md`; test at `agent-proof-context.test.ts:20-28` extracts checkpoint section and asserts `not.toContain('PROOF_CHAIN.md')` — matcher `not_contains` matches contract |
| A003 | Ana no longer reads the proof chain file before scoping | ✅ SATISFIED | `ana.md:38-44` Step 1 section has no PROOF_CHAIN.md reference; test at `agent-proof-context.test.ts:32-39` extracts Step 1 section and asserts `not.toContain('PROOF_CHAIN.md')` — matcher `not_contains` matches contract |
| A004 | Verify queries proof chain history using the targeted command after loading the contract | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md:92` contains `` `ana proof context {files from contract file_changes}` ``; test at `agent-proof-context.test.ts:43-45` asserts `toContain('ana proof context')` — matcher `contains` matches contract |
| A005 | Verify falls back to reading the proof chain file when the command is unavailable | ✅ SATISFIED | `ana-verify.md:94` contains "If the command is not available: check `.ana/PROOF_CHAIN.md`"; test at `agent-proof-context.test.ts:49-51` asserts `toContain('If the command is not available')` — matcher `contains` matches contract |
| A006 | Plan agents receive proof context through the scope, not by reading the file directly | ✅ SATISFIED | Full read of `ana-plan.md` (535 lines) — zero occurrences of `PROOF_CHAIN.md`; `grep -c` confirms 0; test at `agent-proof-context.test.ts:55-57` asserts `not.toContain('PROOF_CHAIN.md')` — matcher `not_contains` matches contract |
| A007 | Build agents receive proof context through the spec, not by reading the file directly | ✅ SATISFIED | Full read of `ana-build.md` (528 lines) — zero occurrences of `PROOF_CHAIN.md`; `grep -c` confirms 0; test at `agent-proof-context.test.ts:60-63` asserts `not.toContain('PROOF_CHAIN.md')` — matcher `not_contains` matches contract |
| A008 | Dogfood agent definitions match the shipped templates exactly | ✅ SATISFIED | `diff` of all 4 template/dogfood pairs produces zero output (exit 0); test at `agent-proof-context.test.ts:67-75` reads all 4 pairs and asserts `toBe(template)` — matcher `equals` matches contract |

## Independent Findings

**PROOF_CHAIN.md count verification:** Spec gotcha states exactly one `.ana/PROOF_CHAIN.md` literal should remain across all four templates. Confirmed: `grep -c PROOF_CHAIN packages/cli/templates/.claude/agents/*.md` → ana-build.md:0, ana-plan.md:0, ana-setup.md:0, ana-verify.md:1, ana.md:0. The single remaining reference is at `ana-verify.md:94` in the fallback instruction. Correct.

**Verify proof context positioning:** Spec requires the new instruction AFTER Step 5's "Known paths" block and BEFORE `### 6. Load Skills`. Verified: `ana-verify.md:88-90` is the "Known paths" block, lines 92-94 are the proof context instruction and fallback, line 96 is `### 6. Load Skills`. Correctly positioned.

**Checkpoint wording delta:** Spec prescribed `"relevant proofs if asked"` but the implementation uses `"relevant proof chain findings if asked"` (`ana.md:119`). This is actually more specific and clearer wording. Not a contract violation — A002 only checks that PROOF_CHAIN.md is absent from the checkpoint, which it is.

**Test quality — section extraction in A002/A003:** The tests for A002 and A003 do proper section extraction (finding heading boundaries before asserting), which prevents false negatives if PROOF_CHAIN.md appears elsewhere in the file. Tests for A001 and A004 use whole-file `toContain`, which is appropriate since the contract target is `content` (whole file), not a section-specific target.

**Prediction resolutions:**
1. *"Tests do simple contains that pass with incorrect placement"* — Partially confirmed. A001/A004 are whole-file contains, but their contract targets (`ana.md.content`, `ana-verify.md.content`) are whole-file scoped, so the matcher is appropriate. A002/A003 do section-specific extraction, which is stronger.
2. *"Verify fallback positioning wrong"* — Not found. Correctly between Step 5 and Step 6.
3. *"Dogfood subtle differences"* — Not found. All 4 diffs clean.
4. *"ONE PROOF_CHAIN.md constraint violated"* — Not found. Exactly one reference.
5. *"Production risk: command format changes"* — Inherent coupling noted as callout.

**Surprised finding:** None. The build is clean — seven text edits, one new test file, four dogfood copies. No production code changed. The scope of change is minimal and exactly what the spec prescribed.

**Over-building check:** No extra parameters, functions, or code paths beyond what the spec requires. The test file has one helper function (`readTemplate`) used by all 8 tests — no unused exports. No dead code paths (no `if`, `for`, `while`, or `try` blocks in the test file beyond what's needed).

## AC Walkthrough

- **AC1:** Ana's agent definition references `ana proof context {files}` in the exploration steps, not `.ana/PROOF_CHAIN.md` → ✅ PASS — `ana.md:108` contains `` run `ana proof context {files}` to surface relevant lessons for the affected modules ``. No `PROOF_CHAIN.md` in exploration steps.

- **AC2:** Ana's checkpoint instruction references proof chain findings without prescribing a second query → ✅ PASS — `ana.md:119` says "relevant proof chain findings if asked" — references findings conceptually, no command or file read prescribed.

- **AC3:** Ana's Step 1 (Before Scoping) no longer references `.ana/PROOF_CHAIN.md` → ✅ PASS — `ana.md:38-44` Step 1 section read in full, no PROOF_CHAIN.md reference. Only context file listed is `.ana/context/design-principles.md`.

- **AC4:** Verify's agent definition references `ana proof context {files from contract file_changes}` after loading verification documents, not `.ana/PROOF_CHAIN.md` at Step 4 → ✅ PASS — `ana-verify.md:92` has the command after Step 5 (contract loading). Step 4 (Load Context, lines 72-76) has no PROOF_CHAIN.md reference.

- **AC5:** Plan's agent definition contains zero references to `.ana/PROOF_CHAIN.md` → ✅ PASS — `grep -c PROOF_CHAIN ana-plan.md` returns 0. Full file read confirms.

- **AC6:** Build's agent definition contains zero references to `.ana/PROOF_CHAIN.md` → ✅ PASS — `grep -c PROOF_CHAIN ana-build.md` returns 0. Full file read confirms.

- **AC7:** No agent definition references `.ana/PROOF_CHAIN.md` as a file to read → ✅ PASS — The only remaining `.ana/PROOF_CHAIN.md` literal is in `ana-verify.md:94`'s fallback instruction, which is an explicit exception per AC8 and the spec gotcha. No agent references it as a primary file to read in its normal flow.

- **AC8:** Verify's proof context instruction includes a fallback for when the command is unavailable, following the existing pre-check fallback pattern → ✅ PASS — `ana-verify.md:94` reads: "If the command is not available: check `.ana/PROOF_CHAIN.md` if it exists and look for Active Issues mentioning the modules from file_changes." Follows the same sentence pattern as the pre-check fallback at line 133.

- **AC9:** Dogfood agent definitions match templates exactly → ✅ PASS — `diff` of all 4 pairs (ana.md, ana-plan.md, ana-build.md, ana-verify.md) produces zero output.

- **AC10:** All existing tests continue to pass — no regressions → ✅ PASS — 1475 tests passed (1467 baseline + 8 new), 2 skipped (same as baseline), 0 failed.

## Blockers

No blockers. All 8 contract assertions satisfied. All 10 acceptance criteria pass. 1475 tests pass with 0 regressions. Build and lint clean.

Checked for: unused exports in new test file (only `readTemplate` local function, used in all 8 tests), unused function parameters (the `filename` param in `readTemplate` is used on line 8), dead code blocks (no conditional/loop/try blocks exist in the test file), sentinel test patterns (A002/A003 extract sections before asserting — not trivially passable; A008 compares full file content with `toBe`), external assumptions (test uses `__dirname` for path resolution, consistent with existing `cross-platform.test.ts` pattern), error paths that swallow silently (no try/catch in test file).

## Callouts

- **Test — A001/A004 use whole-file contains, weaker than section-specific extraction:** `packages/cli/tests/templates/agent-proof-context.test.ts:14,43` — These tests would still pass if someone moved `ana proof context` to the wrong section of the file. The contract targets (`ana.md.content`, `ana-verify.md.content`) are whole-file scoped, so the test is technically correct. But A002/A003 demonstrate the stronger pattern (section extraction before assertion). Future contract assertions for section-specific content should use section-specific targets.

- **Test — A008 tests all 4 dogfood files in a single `it` block:** `agent-proof-context.test.ts:67-75` — If the first file comparison fails, the loop short-circuits and the remaining 3 aren't checked. The error message includes the filename (`${file} dogfood should match template`), which mitigates debugging difficulty. Separate `it` blocks per file would give complete coverage reporting, but the contract only has one assertion (A008) covering all 4, making a single test reasonable.

- **Code — Checkpoint wording deviates from spec prescription:** `packages/cli/templates/.claude/agents/ana.md:119` — Spec said `"relevant proofs if asked"`, implementation says `"relevant proof chain findings if asked"`. The implementation wording is arguably better (more specific), but it's a spec-implementation delta the deployer should be aware of.

- **Upstream — AC7 and AC8 are in tension:** AC7 says "no agent definition references `.ana/PROOF_CHAIN.md` as a file to read" while AC8 requires a fallback that references it. The spec's gotcha resolves this ("exactly ONE `.ana/PROOF_CHAIN.md` literal string should remain"), but future scope should word AC7 more precisely: "no agent definition references `.ana/PROOF_CHAIN.md` as a primary file to read in its normal flow."

## Deployer Handoff

This is a templates-only change — no production TypeScript source code was modified. All changes are to markdown agent definition files (4 templates + 4 dogfood copies) and one new test file.

The dogfood copy also resolves pre-existing branchPrefix drift between templates (which use `{branchPrefix}`) and dogfood (which used `feature/`). After this merge, all 4 dogfood files will match their templates exactly.

The one remaining `.ana/PROOF_CHAIN.md` reference in `ana-verify.md:94` is intentional — it's the fallback for when the `ana proof context` command is unavailable.

No migration steps needed. No environment changes. No new dependencies.

## Verdict

**Shippable:** YES

All 8 contract assertions satisfied with correct matchers. All 10 acceptance criteria pass with evidence. 1475 tests pass (8 new, 0 regressions). Build and lint clean. PROOF_CHAIN.md reference count is exactly 1 across all templates, in the correct location. Dogfood files match templates byte-for-byte.

The changes are minimal, focused, and exactly what the spec prescribed: seven text edits across four templates, one new test file, and four dogfood copies. No over-building. No dead code. No scope creep.
