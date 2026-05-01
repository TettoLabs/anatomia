# Scope: Sharpen Agent Templates

**Created by:** Ana
**Date:** 2026-05-01

## Intent

Shift Verify's searchlight from style observations to substantive findings, and give Think awareness of the proof surface. Four template text changes across two agent definitions. Zero CLI code.

The Verify mandate reword is the highest-value change — it determines what enters the proof chain, which determines what Learn triages, which determines what gets promoted to skills. Everything downstream depends on Verify producing signal, not noise.

## Complexity Assessment
- **Size:** small
- **Files affected:** `templates/.claude/agents/ana-verify.md`, `.claude/agents/ana-verify.md`, `templates/.claude/agents/ana.md`, `.claude/agents/ana.md`
- **Blast radius:** Template-only. No CLI code, no tests, no data model. The behavioral change is in what Verify searches for and what Think can route — measurable on the next pipeline run.
- **Estimated effort:** <1 day
- **Multi-phase:** no

## Approach

Four surgical text edits. Full requirements with exact current/proposed text, rationale, and 90/90 customer test for each change are in `anatomia_reference/PROOF_SYSTEM/SHARPEN_AGENT_TEMPLATES_REQUIREMENTS.md`.

**Change 1:** Reword Verify's quantity mandate (ana-verify.md line 11). Drop dirt-producing examples ("unclear names, inconsistent patterns"), add gold-producing examples ("assertions that pass on broken AND working code, patterns that work now but break at scale"). Add conviction line ("every codebase carries tech debt... if you found none, you didn't look deep enough") and consequence test ("what goes wrong, and for whom?").

**Change 2:** Delete the minimum finding count (ana-verify.md line 367). "Minimum: one Code finding, one Test finding. Upstream when applicable." — replaced by the conviction in Change 1. The count was a checkbox. The conviction can't be satisfied with dirt.

**Change 3:** Add proof surface awareness to Think (ana.md, after line 293). Three lines: `ana proof health`, `ana proof audit`, route to Learn for management. Think can answer "how's our quality?" and route proof chain management questions.

**Change 4:** Fold quality posture check into Think's step 3 (ana.md line 108). "If the scope touches hot modules, run `ana proof health` to check trajectory — a worsening trend changes what the scope should prioritize." One sentence added to existing step 3, no renumbering.

## Acceptance Criteria

- AC1: Verify mandate at line 11 uses the new examples (sentinel tests, untested error paths, scale-breaking patterns) and drops style examples (unclear names, weak error messages, inconsistent patterns)
- AC2: Verify mandate includes conviction line ("every codebase carries tech debt...") and consequence test ("what goes wrong, and for whom?")
- AC3: "worth knowing" changed to "worth knowing for the next engineer"
- AC4: "Minimum: one Code finding, one Test finding. Upstream when applicable." is deleted from line 367
- AC5: Think has proof surface reference with `ana proof health`, `ana proof audit`, and Learn routing
- AC6: Think step 3 includes quality posture check with `ana proof health` for hot modules
- AC7: Dogfood copies (`.claude/agents/`) match template copies (`templates/.claude/agents/`) for both ana-verify.md and ana.md
- AC8: No other lines in either template are changed

## Edge Cases & Risks

- **Verify produces fewer findings.** Possible — the reweighted examples steer away from easy style observations. But the conviction line ("if you found none, you didn't look deep enough") maintains the floor. The None Rule (lines 386-400) still requires explaining what was searched. The floor is enforced by work-showing, not by count.
- **Think runs `ana proof health` on every scope.** The instruction says "if the scope touches hot modules" — it's conditional, not mandatory. Most scoping sessions won't trigger it. Token cost is one CLI call when it does fire.

## Rejected Approaches

- **Attention technique (constraint-first ordering in skills).** No measured disease in 33+ builds. Dropped.
- **Separate quality bar section in Verify template.** Replaced by inline conviction + consequence test in the mandate reword. One location instead of two.
- **Adding `ana proof promote` / `ana proof close` to Think.** Learn's domain. Think routes to Learn.

## Open Questions

None.

## Exploration Findings

### Patterns Discovered
- `ana-verify.md` line 11: The mandate paragraph is the FIRST behavioral instruction Verify reads after the identity paragraph. It shapes everything that follows. Reweighting the examples here has outsized effect compared to adding guidance later in the template.
- `ana-verify.md` line 367: The minimum count is inside the Findings section of the report template. "Upstream when applicable" is defined in 4 other locations — the line at 367 adds nothing.
- `ana.md` line 293: The Agent System section ends with "The proof chain compounds across cycles — Learn tends it." The proof surface reference extends this naturally.
- `ana.md` line 108: Step 3 is "Check proof chain" — folding health into it keeps proof chain reads together.

### Constraints Discovered
- [OBSERVED] Dogfood copies are byte-identical to templates. Both must be updated in lockstep.
- [OBSERVED] ana-verify.md has a staleness check instruction added by V3 (line ~103). This scope does not touch it.

### Test Infrastructure
- `tests/templates/agent-proof-context.test.ts` checks dogfood sync for ana-verify.md but NOT ana.md or ana-learn.md. Changes to ana.md dogfood copy won't be caught by CI if they drift.

## For AnaPlan

### Structural Analog
No code analog — this is template text editing. The closest analog is the Learn V2 template rewrite (commit b8ab06a) which was a direct template replacement with dogfood copy sync.

### Relevant Code Paths
- `packages/cli/templates/.claude/agents/ana-verify.md` — line 11 (mandate), line 367 (minimum count)
- `packages/cli/templates/.claude/agents/ana.md` — line 108 (step 3), after line 293 (proof surface)
- `.claude/agents/ana-verify.md` — dogfood copy, must match template
- `.claude/agents/ana.md` — dogfood copy, must match template

### Patterns to Follow
- The requirements file has exact current and proposed text for every change. The builder should use the proposed text verbatim.

### Known Gotchas
- The mandate reword at line 11 is a single paragraph. Don't accidentally split it into multiple paragraphs — the line breaks matter for how the LLM reads it.
- Line 367 deletion: verify the line number hasn't shifted from previous changes. Grep for "Minimum: one Code finding" to find the exact line.
- ana.md step 3 fold: the step currently ends with "to surface relevant lessons for the affected modules". The quality posture addition is a new sentence appended to the same step, not a new bullet or numbered item.
- Dogfood sync: after editing templates, copy to `.claude/agents/` and verify with `diff`. The V3 scope did this correctly — follow the same pattern.

### Things to Investigate
None — the requirements have exact text for every change.
