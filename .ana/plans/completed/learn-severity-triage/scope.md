# Scope: Learn Severity-Based Triage

**Created by:** Ana
**Date:** 2026-05-02

## Intent

Restructure Learn's triage workflow to eliminate the batch-closing failure mode caused by Phase 1 "Accept-Action (Clear the Deck)." Three consecutive sessions proved that grouping findings by `suggested_action: accept` creates batch thinking — Learn recommends closing the entire group without individual evaluation, regardless of template instructions. The fix removes the action-based grouping and triages by severity instead, extending the rigorous Phase 2 workflow to ALL findings.

Secondary: fix the edge cases cap contradiction and Verify's data companion naming (AGENT-052).

## Complexity Assessment
- **Size:** small
- **Files affected:** 4
  - `packages/cli/templates/.claude/agents/ana-learn.md` (template)
  - `.claude/agents/ana-learn.md` (dogfood copy)
  - `packages/cli/templates/.claude/agents/ana-verify.md` (template)
  - `.claude/agents/ana-verify.md` (dogfood copy)
- **Blast radius:** Learn agent behavior only. No CLI code, no schema changes, no test changes.
- **Estimated effort:** 30-45 minutes
- **Multi-phase:** no

## Approach

Remove the action-based phase structure that creates batch framing. Replace with severity-based triage order: risk findings first (highest impact, full evidence review), debt findings second (claim extraction + git history), observations last (quick confirm-or-keep). The `accept` classification stays in the proof chain — Verify's judgment is correct — but it no longer creates a separate triage phase. A `debt · accept` finding gets identical treatment to a `debt · scope` finding.

The current Phase 2 workflow (claim extraction, staleness prediction, git history check, evidence-based close reasons) already produces excellent individual evaluation. The fix extends that quality to all findings instead of giving accept findings a fast-track that bypasses it.

For Verify: replace the parenthetical naming explanation with a mechanical formula the agent can follow without parsing prose.

## Acceptance Criteria
- AC1: Phase 1 "Accept-Action (Clear the Deck)" section is removed entirely from ana-learn.md
- AC2: Triage phases are ordered by severity: risk → debt → observations (with promote candidates between debt and observations)
- AC3: The "Session approach" paragraph reflects severity-based ordering with no reference to accept-action as a phase
- AC4: Risk and debt findings use the full claim-extraction workflow regardless of `suggested_action` value
- AC5: The `accept` classification is not referenced as a triage category anywhere in the phase structure
- AC6: Close reason standards and verification depth guidance are preserved (relocated to the appropriate severity phase or a shared section)
- AC7: Edge cases "Cap at ~30 per session" bullet is removed or rewritten to match the session approach (developer controls length)
- AC8: Verify template lines 73 and 107 use mechanical naming rule: "The filename mirrors your report: replace `report` with `data` and `.md` with `.yaml` (`verify_report_1.md` → `verify_data_1.yaml`)."
- AC9: Dogfood copies (`.claude/agents/`) match templates exactly

## Edge Cases & Risks

- **Accept-specific guidance that's still valuable:** The "Verification depth by finding type" section under Phase 1 has useful guidance about null-file findings and observation-level accepts. This guidance should be preserved where appropriate — null-file handling belongs in a general section, not gated behind an action type.
- **Close reason standards:** Currently live under Phase 1. These apply universally — must be relocated to a shared section or inlined into the severity phases.
- **Phase numbering:** Removing Phase 1 shifts all phase numbers. Plan should renumber cleanly.
- **Existing accept findings in proof chains:** No impact — this is template-only. The data doesn't change, only how Learn processes it.

## Rejected Approaches

**Option A — Mechanical reclassification in writeProofChain (reference doc's recommendation):** Rewriting `debt + accept` to `debt + monitor` at write time. Rejected because it hides Verify's nuance. Verify's `accept` on a debt finding means "real issue, not worth blocking shipment" — that's a useful signal when Learn evaluates individually. The problem isn't the classification; it's the batch framing.

**Option 5 from reference — Stronger template instructions:** Three sessions proved template prose doesn't override structured data labels when those labels create a batch phase. The phase structure is the mechanism; removing the phase is the fix.

**Rename accept → acknowledged:** Schema migration touching ~20 locations across source + tests. Correct diagnosis (the word implies closure) but wrong scope for this fix. The phase removal solves the immediate problem without schema changes.

## Open Questions

None — all resolved during investigation.

## Exploration Findings

### Patterns Discovered
- `ana-learn.md` lines 184-239: Phase 1 is self-contained with its own verification depth, close reason standards, and presentation format
- `ana-learn.md` lines 240-304: Phase 2 has the rigorous claim-extraction workflow that should apply to all severity-bearing findings
- `ana-learn.md` line 188: "Session approach" paragraph references accept-action as a phase destination
- `ana-learn.md` line 477: "Cap at ~30 per session" contradicts session approach text at line 188 ("no arbitrary cap")
- `ana-verify.md` line 73: Parenthetical naming explanation embedded in step 3 prose
- `ana-verify.md` lines 105-107: "data companion" section header uses parenthetical for naming rule

### Constraints Discovered
- [OBSERVED] Close reason standards — currently scoped under Phase 1 but universally applicable. Must not be lost in restructure.
- [OBSERVED] Null-file finding handling — useful guidance about process/upstream findings. Currently gated behind accept-action phase. Should be severity-agnostic.
- [TYPE-VERIFIED] Phase 2 workflow (lines 240-285) — the gold standard. Claim extraction → prediction → staleness check → verification → resolution. This is what all findings should receive.
- [OBSERVED] Phase 3 (promote) and Phase 4 (observations) — structurally independent of Phase 1. Phase 3 references Phase 2 findings but not Phase 1.

### Test Infrastructure
- No tests — template-only change. Verification is behavioral (Learn sessions).

## For AnaPlan

### Structural Analog
Phase 2 (lines 240-304) IS the analog. The restructure extends Phase 2's workflow to cover what Phase 1 currently handles. The claim-extraction steps, staleness prediction, and presentation format are the pattern.

### Relevant Code Paths
- `packages/cli/templates/.claude/agents/ana-learn.md` lines 184-326 (entire Structured Triage section)
- `packages/cli/templates/.claude/agents/ana-verify.md` lines 68-77 (re-verification steps) and 105-107 (data companion section)
- `.claude/agents/ana-learn.md` and `.claude/agents/ana-verify.md` (dogfood copies — must match)

### Patterns to Follow
- Phase 2's claim-extraction workflow is the quality bar for all severity-bearing findings
- Phase 4's batch-assess approach is appropriate for stable observations (no code read needed)
- The "Session approach" paragraph sets the session contract — update it, don't contradict it

### Known Gotchas
- The close reason standards and verification depth guidance under Phase 1 contain genuinely useful content (null-file handling, evidence requirements). Don't delete — relocate.
- Phase numbering shifts. New order: Phase 1 (risk+debt), Phase 2 (promote), Phase 3 (observations). Or restructure without numbered phases.
- The "Presentation" subsections in Phase 1 and Phase 2 have different formats. The new structure should have one presentation format per phase, not two competing ones.

### Things to Investigate
- Whether to merge risk and debt into one phase with severity ordering, or keep them as Phase 1a/1b with the same workflow. Both are valid — risk findings just get priority ordering within the same process.
