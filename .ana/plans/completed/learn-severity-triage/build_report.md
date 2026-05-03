# Build Report: Learn Severity-Based Triage

**Created by:** AnaBuild
**Date:** 2026-05-02
**Spec:** .ana/plans/active/learn-severity-triage/spec.md
**Branch:** feature/learn-severity-triage

## What Was Built

- `packages/cli/templates/.claude/agents/ana-learn.md` (modified): Removed Phase 1 Accept-Action section entirely. Relocated close reason standards and null-file handling to shared sections (`### Close Reason Standards`, `### Null-File Findings`) before Phase 1. Renumbered Phase 2→1, Phase 3→2, Phase 4→3. Updated summary block (removed `{A} closeable` line), Present State menu (replaced "Clear the deck" with "Review risks"/"Review debt"), session approach paragraph (severity-based ordering), default ordering parenthetical, edge case cap, and Guardrail 3 (removed accept-action observation verification depth, folded observation guidance into main paragraph).
- `packages/cli/templates/.claude/agents/ana-verify.md` (modified): Replaced prose naming explanation at line 73 ("both share the same number") with mechanical formula ("replace `report` with `data` and `.md` with `.yaml`") matching line 107.
- `.claude/agents/ana-learn.md` (modified): Overwritten with template contents.
- `.claude/agents/ana-verify.md` (modified): Overwritten with template contents.

## PR Summary

- Remove the Accept-Action (Clear the Deck) triage phase from the Learn template, which caused batch-closing behavior that bypassed individual finding evaluation
- Restructure triage to severity-based ordering: risk → debt → promote → observations, applying the full claim-extraction workflow to all severity-bearing findings
- Relocate close reason standards and null-file handling to shared sections before the phases, preserving proven-useful content
- Fix verify template's naming formula at line 73 to use the mechanical formula already present at line 107
- Sync dogfood copies to match templates

## Acceptance Criteria Coverage

- AC1 "Phase 1 Accept-Action removed" → Source inspection: `### Phase 1: Accept-Action` heading and all content (lines 190-239) removed. Phase 1 is now "Risk and Debt Findings (Deep Review)".
- AC2 "Severity-based phase ordering" → Source inspection: Phase 1 = Risk and Debt, Phase 2 = Promote Candidates, Phase 3 = Remaining Observations.
- AC3 "Session approach reflects severity ordering" → Source inspection: rewritten to "Start with risk findings (highest impact), then debt findings..."
- AC4 "Full claim-extraction for all risk/debt" → Source inspection: Phase 1 contains "Extract the claim", "Predict before reading", full workflow unchanged from old Phase 2.
- AC5 "Accept not a triage category in phase structure" → Source inspection: no phase heading references accept. Two references remain in reference documentation (audit command usage, Proof Chain Field Semantics) — correct per spec constraint.
- AC6 "Close reason standards preserved" → Source inspection: `### Close Reason Standards` section contains verbatim good/bad reason examples and "6 months from now" guidance. `### Null-File Findings` section preserves null-file handling.
- AC7 "Edge case cap rewritten" → Source inspection: "Cap at ~30 per session" replaced with "Negotiate focus by severity or module...no arbitrary cap."
- AC8 "Verify naming formula" → Source inspection: line 73 now says "the data companion mirrors the report name — replace `report` with `data` and `.md` with `.yaml`"
- AC9 "Dogfood copies match" → `diff` command: no output (files identical).
- "No accept-action references in phase structure" → Grep confirmed: only two references remain, both in non-phase reference sections (per spec constraint).
- "Phase cross-references updated" → Source inspection: Phase 2 (Promote) says "recurring patterns you identified in Phase 1."

## Implementation Decisions

- **Guardrail 3 restructure:** The spec's Gotchas section flagged Guardrail 3 as referencing accept-action observations. I removed the accept-action-specific verification depth paragraph and the accept-action observation line, folding the observation verification guidance ("For observations, anchor existence is sufficient") into the main code-referenced findings paragraph. This preserves the useful guidance without referencing the deleted phase.
- **Null-File Findings as separate section:** The spec said to relocate the null-file guidance "alongside close reason standards." I made it a separate `### Null-File Findings` section rather than a subsection of Close Reason Standards, because it addresses a different concern (how to handle findings without code references vs how to write close reasons). Both are at the same heading level as the phases per the spec's output mockup.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1804 passed | 2 skipped (1806)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1804 passed | 2 skipped (1806)
```

### Comparison
- Tests added: 0
- Tests removed: 0
- Regressions: none

### New Tests Written
None — template-only change per spec. No CLI code affected.

## Verification Commands
```bash
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
diff packages/cli/templates/.claude/agents/ana-learn.md .claude/agents/ana-learn.md
diff packages/cli/templates/.claude/agents/ana-verify.md .claude/agents/ana-verify.md
```

## Git History
```
e135149 [learn-severity-triage] Sync dogfood copies
dafc27d [learn-severity-triage] Fix verify template naming formula
7ed7221 [learn-severity-triage] Restructure Learn template triage phases
```

## Open Issues

- Two `accept-action` references remain in non-phase sections of the Learn template: line 68 (audit command usage example) and line 159 (Proof Chain Field Semantics). Per the spec's constraint, AC5 applies to phase structure only, so these are correct. However, they could confuse future readers who expect the term to be fully eliminated. Worth monitoring.

Verified complete by second pass.
