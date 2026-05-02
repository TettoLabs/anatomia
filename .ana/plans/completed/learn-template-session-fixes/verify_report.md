# Verify Report: Learn Template Session Fixes

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-02
**Spec:** .ana/plans/active/learn-template-session-fixes/spec.md
**Branch:** feature/learn-template-session-fixes

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/learn-template-session-fixes/contract.yaml
  Seal: INTACT (hash sha256:4de2217743f2d17cf3da8a253a3ff89e1287fb776ce0a5f4c896ef1a4383ea8d)
```

Seal status: **INTACT**.

No build/test/lint applicable — this is a template-only change (plain markdown). Confirmed via `git diff main --stat`: only `ana-learn.md` (template + dogfood) and build artifacts changed. No source code, no test files, no compiled output.

## Contract Compliance

| ID   | Says                                                          | Status         | Evidence |
|------|---------------------------------------------------------------|----------------|----------|
| A001 | Accept-action intro explains that accept does not mean close  | ✅ SATISFIED    | `packages/cli/templates/.claude/agents/ana-learn.md:192` — "it does NOT mean the finding should be closed" |
| A002 | Accept-action intro instructs re-evaluation on own merits     | ✅ SATISFIED    | `packages/cli/templates/.claude/agents/ana-learn.md:192` — "re-evaluate each finding on its own merits" |
| A003 | First/routine session calibration lines are removed           | ✅ SATISFIED    | `packages/cli/templates/.claude/agents/ana-learn.md:78-82` — calibration section has only Large/Small/Clean garden bullets. Git diff confirms both "First session" and "Routine session" lines deleted. |
| A004 | Garden size calibrations still exist after removing first/routine | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:80` — "**Large garden**" present as first calibration bullet |
| A005 | Observation prompt exists as a standalone instruction before the format block | ✅ SATISFIED | `packages/cli/templates/.claude/agents/ana-learn.md:88` — "After the summary, always ask:" inserted before `Summarize the shape` at line 90. Original prompt also retained at line 100 inside format block. |
| A006 | Session approach uses priority ordering instead of a flat cap  | ✅ SATISFIED    | `packages/cli/templates/.claude/agents/ana-learn.md:188` — "Start with risk findings and recurring candidates" |
| A007 | The arbitrary 30-finding cap is removed                       | ✅ SATISFIED    | `packages/cli/templates/.claude/agents/ana-learn.md:188` — Session Approach section no longer contains `~30`. Contract target is `template.session_approach`, which is clean. Note: `~30` persists in Edge Cases at line 477 — see Findings. |
| A008 | Session wrap-up offers a Think handoff as an explicit option   | ✅ SATISFIED    | `packages/cli/templates/.claude/agents/ana-learn.md:505` — "I can draft a prompt for Ana Think" |
| A009 | Session wrap-up includes promotion lifecycle guidance          | ✅ SATISFIED    | `packages/cli/templates/.claude/agents/ana-learn.md:507` — "promotion encodes proven patterns, not aspirational ones" |
| A010 | Session wrap-up includes verification transfer note           | ✅ SATISFIED    | `packages/cli/templates/.claude/agents/ana-learn.md:507` — "which findings you verified against current code" |
| A011 | Stale close reason example is in the good reasons list        | ✅ SATISFIED    | `packages/cli/templates/.claude/agents/ana-learn.md:214` — `"Stale — finding claims {X} but code at {file}:{line} is now {Y}..."` |
| A012 | Variadic guidance clarifies when to use individual vs batch   | ✅ SATISFIED    | `packages/cli/templates/.claude/agents/ana-learn.md:417` — "When findings have different justifications, close individually" |
| A013 | Dogfood copy is identical to the template                     | ✅ SATISFIED    | `diff packages/cli/templates/.claude/agents/ana-learn.md .claude/agents/ana-learn.md` returns empty output |

13/13 SATISFIED.

## Independent Findings

**Predictions before reading code:**
1. Builder may have left a blank line gap wrong in Change 2 → **Not found.** Lines 78-80 read `After reading context, calibrate your approach:\n\n- **Large garden**...` — correct spacing.
2. The observation prompt (Change 3) may be placed wrong → **Not found.** Placed at line 88, before `Summarize the shape` at line 90. Original at line 100 retained. Correct.
3. Change 5 may have left stale "session cap" references → **Not found** in wrap-up section. The builder correctly changed "session cap reached" to "developer says stop" at line 491.
4. Edge Cases section may still reference `~30` → **Confirmed.** Line 477: "Cap at ~30 per session." This contradicts the new "no arbitrary cap" guidance.
5. Spec may not have covered all `~30` references → **Confirmed.** The spec's Change 4 only targeted the Session Approach paragraph. The Edge Cases reference was out of scope.

**Production risk:** Learn agents receiving this template will see contradictory instructions — "no arbitrary cap" in Session Approach vs "Cap at ~30" in Edge Cases. The Edge Cases bullet is for 200+ finding sets, so the contradiction only manifests on large gardens. Severity is low — an LLM will likely follow the more prominent Session Approach guidance — but it's contradictory text in the same template.

**Over-building check:** Exactly 7 diff hunks matching the 7 specified changes. No extra modifications, no reformatting of adjacent text, no added commentary. The builder was disciplined.

**YAGNI check:** No new files, no new exports, no new abstractions. N/A for a template-only change.

## AC Walkthrough

- **AC1:** Phase 1 intro text includes "accept does not mean close" — re-evaluate on own merits → ✅ PASS — Line 192 contains both phrases.
- **AC2:** First/routine session calibration lines are removed — only garden size calibrations remain → ✅ PASS — Git diff confirms deletion. Lines 80-82 are Large/Small/Clean only.
- **AC3:** Observation prompt exists as a standalone instruction, not just inside the format block → ✅ PASS — Line 88 is standalone; line 100 retained in format block per spec.
- **AC4:** Session approach uses priority ordering (risk → stale → accept) with no arbitrary cap → ✅ PASS — Line 188 matches spec text exactly.
- **AC5:** Session wrap-up offers Think handoff as an explicit option → ✅ PASS — Line 505: "I can draft a prompt for Ana Think..."
- **AC6:** Session wrap-up includes promotion lifecycle note (fix first, promote proven patterns) → ✅ PASS — Line 507: "promotion encodes proven patterns, not aspirational ones"
- **AC7:** Session wrap-up includes verification transfer note for Think prompts → ✅ PASS — Line 507: "which findings you verified against current code so Think doesn't re-verify"
- **AC8:** Stale close reason example is in the close reason list → ✅ PASS — Line 214 between "Intentional" and "Bad reasons."
- **AC9:** Variadic vs individual guidance is in Guardrail 2 → ✅ PASS — Lines 413-417 in Guardrail 2 section.
- **AC10:** Dogfood copy matches template → ✅ PASS — `diff` returns empty.
- **AC11:** No other template lines are changed → ✅ PASS — 7 hunks, all matching specified changes. No reformatting or adjacent-text edits.

11/11 PASS.

## Blockers

None. All 13 contract assertions satisfied, all 11 ACs pass. Checked for: unintended line changes outside the 7 specified regions (none — 7 hunks exactly), broken formatting in the template (none — markdown structure intact), divergence between template and dogfood (none — diff empty), contradictory guidance introduced by the changes (found one — documented in Findings, not a blocker because it's pre-existing text the spec didn't target).

## Findings

- **Code — Contradictory cap guidance in Edge Cases:** `packages/cli/templates/.claude/agents/ana-learn.md:477` — "Very large active set (200+ findings): Cap at ~30 per session" contradicts the new Session Approach at line 188 which says "The developer controls session length — there's no arbitrary cap." The builder correctly followed the spec (which only targeted the Session Approach paragraph), but the Edge Cases reference is now stale. Low-impact: the contradiction only manifests for 200+ finding gardens, and the Session Approach is more prominent. Should be cleaned up in a follow-up scope.

- **Upstream — Spec scope gap on ~30 references:** The spec's Change 4 targeted only the Session Approach paragraph. Main had `~30` in two places (line 188 and line 475/477). The spec author caught one but missed the Edge Cases echo. Not the builder's fault — the spec didn't ask for it.

- **Upstream — SKILL.md path naming finding still active:** Proof context shows an active finding about the template instructing Learn to read `.claude/skills/{name}/SKILL.md` when actual skill files use different naming. Not addressed by this build (correctly out of scope). See proof chain for the existing finding from Ana Learn V1.

## Deployer Handoff

Template-only change to `packages/cli/templates/.claude/agents/ana-learn.md` and its dogfood copy `.claude/agents/ana-learn.md`. No CLI code, no tests, no schema changes. The 7 edits improve Learn's session behavior based on 3 observed sessions and 42 pipeline runs.

After merging: the Edge Cases `~30` reference at line 477 should be cleaned up in a follow-up scope to remove the contradictory cap guidance. Low priority — Learn will follow the more prominent Session Approach instructions.

## Verdict

**Shippable:** YES

All 13 contract assertions SATISFIED. All 11 acceptance criteria PASS. The builder made exactly the 7 specified changes with no scope creep, no reformatting, and a clean dogfood sync. The one substantive finding (contradictory `~30` in Edge Cases) is pre-existing text the spec didn't target — not a regression. Clean build.
