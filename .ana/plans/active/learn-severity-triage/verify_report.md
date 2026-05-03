# Verify Report: Learn Severity-Based Triage

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-02
**Spec:** .ana/plans/active/learn-severity-triage/spec.md
**Branch:** feature/learn-severity-triage

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/learn-severity-triage/contract.yaml
  Seal: INTACT (hash sha256:a9b410de0cef18539acf03216a46d8c26e0d8745eca24519bfd050024388ea4c)
```

Seal status: **INTACT**

Tests: 1804 passed, 0 failed, 2 skipped. Build: success. Lint: 0 errors, 14 warnings (all pre-existing `@typescript-eslint/no-explicit-any`).

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | The accept-action triage phase no longer exists in the Learn template | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md` — grep for "### Phase 1: Accept-Action" returns no matches. Phase 1 heading at line 212 is "### Phase 1: Risk and Debt Findings (Deep Review)" |
| A002 | Clear the Deck heading is gone from the Learn template | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md` — grep for "Clear the Deck" returns no matches |
| A003 | Risk and debt findings are triaged first as Phase 1 | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:212` — "### Phase 1: Risk and Debt Findings (Deep Review)" contains "Risk and Debt" |
| A004 | Promote candidates come after risk and debt as Phase 2 | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:277` — "### Phase 2: Promote Candidates" |
| A005 | Observations are triaged last as Phase 3 | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:287` — "### Phase 3: Remaining Observations" |
| A006 | Session approach paragraph describes severity-based ordering | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:188` — "Start with risk findings (highest impact), then debt findings..." |
| A007 | Session approach paragraph does not mention accept-action | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:188` — full paragraph read, no "accept-action" present |
| A008 | Phase 1 uses the claim-extraction workflow for all risk and debt findings | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:218` — "#### 1. Extract the claim" within Phase 1 content |
| A009 | Phase 1 includes staleness prediction step | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:224` — "#### 2. Predict before reading" within Phase 1 content |
| A010 | No phase heading references accept as a triage category | ✅ SATISFIED | Phase headings: "Phase 1: Risk and Debt Findings" (line 212), "Phase 2: Promote Candidates" (line 277), "Phase 3: Remaining Observations" (line 287) — none contain "Accept" |
| A011 | Close reason standards survive as a shared section | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:190` — "### Close Reason Standards" appears as a shared section before Phase 1 |
| A012 | Good and bad close reason examples are preserved | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:206` — "6 months from now understands what was checked" |
| A013 | Null-file finding guidance survives the restructure | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:208` — "### Null-File Findings" section with guidance about process/upstream findings |
| A014 | The arbitrary 30-finding cap is removed | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md` — grep for "Cap at ~30" returns no matches. Edge case at line 446 uses "Negotiate focus by severity or module" |
| A015 | Large active set guidance now focuses on severity or module | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:446` — "Negotiate focus by severity or module" |
| A016 | Verify template line 73 uses the mechanical naming formula | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md:73` — contains "replace `report` with `data` and `.md` with `.yaml` (`verify_report_1.md` → `verify_data_1.yaml`)" |
| A017 | Verify template no longer uses 'both share the same number' phrasing | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-verify.md` — grep for "both share the same number" returns no matches |
| A018 | Dogfood learn template is identical to the source template | ✅ SATISFIED | `diff packages/cli/templates/.claude/agents/ana-learn.md .claude/agents/ana-learn.md` — no output (empty diff) |
| A019 | Dogfood verify template is identical to the source template | ✅ SATISFIED | `diff packages/cli/templates/.claude/agents/ana-verify.md .claude/agents/ana-verify.md` — no output (empty diff) |
| A020 | Present State menu no longer offers Clear the Deck as an option | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:107-112` — menu offers "Review risks", "Review debt", "Promote patterns", "Focus on {module}". No "Clear the deck" |
| A021 | Present State menu offers risk findings as an option | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:108` — "- Review risks ({X} risk findings)" |
| A022 | Default ordering parenthetical reflects severity-based sequence | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:113` — "(risk → debt → promote → observations)" — no "accept" |
| A023 | Promote phase correctly references Phase 1 for recurring patterns | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:279` — "recurring patterns you identified in Phase 1" |

**23/23 assertions SATISFIED.**

## Independent Findings

**Prediction resolution:**

1. **"Builder probably missed scattered accept-action/Clear the Deck references"** — Partially confirmed. "Clear the Deck" is fully eliminated. However, "accept-action" survives in two non-phase locations: line 68 (audit usage) and line 159 (Field Semantics). Per spec constraints, these are acceptable — they're in reference documentation, not phase structure. But see findings below.

2. **"Phase cross-references likely missed somewhere"** — Not found. Phase 2 (Promote) correctly references Phase 1 at line 279. Searched full Structured Triage section for stale "Phase 2" and "Phase 1" references — all correct.

3. **"Guardrail 3 accept-action reference not handled"** — Not found. Guardrail 3 (line 392) was cleaned up — it references "code-referenced findings" and "null-file findings" without mentioning accept-action. Builder handled the gotcha.

4. **"Dogfood copies might have subtle diffs"** — Not found. Both diffs return empty.

5. **"Summary block `{A} closeable` line easy to miss"** — Not found. Summary block (lines 92-98) shows clean severity counts without the accept-action line.

**Surprise:** None — the build is clean. The builder addressed every gotcha the spec warned about, including Guardrail 3 and the summary block line.

**Over-building check:** No scope creep detected. The template changes are exactly what the spec prescribes — no extra sections, no new guidance, no content beyond what was specified. The Close Reason Standards and Null-File Findings sections are verbatim relocations from the old Phase 1, not new content.

**YAGNI check:** Not applicable — template-only change, no code exports or abstractions.

## AC Walkthrough

- **AC1: Phase 1 "Accept-Action (Clear the Deck)" section is removed entirely from ana-learn.md**
  ✅ PASS — Grep confirms no "### Phase 1: Accept-Action" or "Clear the Deck" in the template. Phase 1 is now "Risk and Debt Findings."

- **AC2: Triage phases are ordered by severity: risk → debt → observations (with promote candidates between debt and observations)**
  ✅ PASS — Phase 1: "Risk and Debt Findings" (line 212), Phase 2: "Promote Candidates" (line 277), Phase 3: "Remaining Observations" (line 287). Sequential, correctly ordered.

- **AC3: The "Session approach" paragraph reflects severity-based ordering with no reference to accept-action as a phase**
  ✅ PASS — Line 188 describes "risk findings (highest impact), then debt findings, then promote candidates, then remaining observations." No "accept-action" present.

- **AC4: Risk and debt findings use the full claim-extraction workflow regardless of `suggested_action` value**
  ✅ PASS — Phase 1 (lines 212-275) contains the full claim-extraction workflow: Extract the claim (line 218), Predict before reading (line 224), Check for staleness (line 229), Verify the claim (line 237), Resolve prediction (line 245). Applied to all risk and debt findings regardless of suggested_action.

- **AC5: The `accept` classification is not referenced as a triage category anywhere in the phase structure**
  ✅ PASS — Phase headings contain no "Accept". The `accept` classification appears only in Proof Chain Field Semantics (line 159, reference documentation) and audit usage (line 68, operational guidance) — both outside the phase structure, consistent with spec constraints.

- **AC6: Close reason standards and verification depth guidance are preserved (relocated to shared sections before the phases)**
  ✅ PASS — "### Close Reason Standards" at line 190 with complete good/bad examples and "6 months from now" guidance. "### Null-File Findings" at line 208 with process/upstream handling guidance. Both appear before Phase 1.

- **AC7: Edge cases "Cap at ~30 per session" bullet is rewritten to match the session approach (developer controls length)**
  ✅ PASS — Line 446: "Negotiate focus by severity or module... The developer controls session length — no arbitrary cap." Grep confirms "Cap at ~30" is gone.

- **AC8: Verify template line 73 uses mechanical naming rule matching line 107's formula**
  ✅ PASS — Line 73 now reads: "the data companion mirrors the report name — replace `report` with `data` and `.md` with `.yaml`." Matches the mechanical formula at line 107.

- **AC9: Dogfood copies (`.claude/agents/`) match templates exactly**
  ✅ PASS — `diff` returns empty for both ana-learn.md and ana-verify.md.

- **No references to "accept-action," "clear the deck," or "accept-action findings" remain in phase structure or menu**
  ✅ PASS — "accept-action" appears only at lines 68 and 159 (reference/operational sections, not phase structure or menu). "Clear the deck" is fully eliminated.

- **Phase cross-references are updated (Promote references Phase 1 not Phase 2)**
  ✅ PASS — Line 279: "recurring patterns you identified in Phase 1."

## Blockers

No blockers. All 23 contract assertions SATISFIED. All 11 acceptance criteria pass. 1804 tests pass with no regressions. Build and lint succeed. No unused exports (template-only, no code files). No unhandled error paths (no code changes). No external state assumptions (template content only). No spec gaps requiring implementation decisions — the builder followed the spec's relocation and renumbering instructions precisely.

## Findings

- **Code — Residual "accept-action findings" in audit usage guidance:** `packages/cli/templates/.claude/agents/ana-learn.md:68` — The sentence "all accept-action findings, all findings for a specific module" uses "accept-action findings" as an example of why to use `--full`. This is in the "Assess the Proof Chain" section, not the phase structure, so it doesn't violate the contract. But it's operational guidance that could subtly reinforce the batch framing this build aims to eliminate — an agent seeing "all accept-action findings" might interpret it as a signal to batch-process them. Consider replacing with a severity-based example: "all risk findings for a specific module."

- **Code — "Accept-action findings are pre-classified for closure" perpetuates batch framing:** `packages/cli/templates/.claude/agents/ana-learn.md:159` — In the Proof Chain Field Semantics section, the `suggested_action` bullet says "Accept-action findings are pre-classified for closure." The spec explicitly permits `accept` in reference documentation, and this sentence accurately describes the proof chain field's semantics. However, "pre-classified for closure" is precisely the batch framing language the spec identifies as the root cause. Consider rewording to: "The `accept` classification indicates the verifier assessed the finding as acknowledged — it does not prescribe a triage action."

- **Upstream — Stale finding "Cap at ~30 per session" likely resolved by this build:** The active proof chain finding about "Edge Cases section still says 'Cap at ~30 per session' — contradicts new 'no arbitrary cap' guidance" is directly resolved by AC7. Line 446 now says "Negotiate focus by severity or module" with no arbitrary cap.

- **Upstream — Skill file path naming finding still present:** The proof chain finding about "Template instructs Learn to read .claude/skills/{name}/SKILL.md but actual skill files use different naming" remains active and is out of scope for this build. Not addressed, not impacted.

## Deployer Handoff

Template-only change — no CLI source code, no test changes, no configuration changes. The 1804 existing tests confirm no collateral damage.

Two residual "accept-action" references survive at lines 68 and 159 of the learn template. Both are in reference/operational sections (not the triage phase structure) and are permitted by the spec's constraints. They're worth addressing in a future cleanup pass to complete the batch framing elimination, but they don't undermine the structural fix this build delivers.

The dogfood copies at `.claude/agents/ana-learn.md` and `.claude/agents/ana-verify.md` are byte-identical to their templates. No manual sync needed after merge.

## Verdict

**Shippable:** YES

All 23 contract assertions SATISFIED. All 11 acceptance criteria pass. Tests green. Dogfood synced. The core structural change — removing Phase 1 (Accept-Action) and reordering by severity — is clean and complete. Close reason standards and null-file guidance were correctly relocated. Phase cross-references were updated. The verify template naming fix is correct.

The two residual "accept-action" references in non-phase sections are observations, not blockers — they're in reference documentation where the classification legitimately needs to be described. Worth cleaning up, but the structural fix is solid.
