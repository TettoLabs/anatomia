# Spec: Learn Severity-Based Triage

**Created by:** AnaPlan
**Date:** 2026-05-02
**Scope:** .ana/plans/active/learn-severity-triage/scope.md

## Approach

Remove Phase 1 (Accept-Action / Clear the Deck) from the Learn template's Structured Triage section. The phase structure causes batch framing — Learn recommends closing the entire accept-action group without individual evaluation. Three sessions proved this. The fix extends Phase 2's rigorous claim-extraction workflow to ALL severity-bearing findings (risk and debt), regardless of `suggested_action`.

Severity-based ordering replaces action-based grouping: risk findings first (highest impact), debt findings second (claim extraction + git history), promote candidates third, observations last. The `accept` classification stays in the proof chain as a useful signal — it just no longer creates a separate triage phase.

Two pieces of Phase 1 content are genuinely useful and must be relocated, not deleted:
1. **Close reason standards** — universal guidance about evidence-based close reasons. Moved to a shared section before the phases.
2. **Null-file finding handling** — guidance for process/upstream findings without code references. Moved to the shared section alongside close reason standards.

The Phase 1 "Verification depth by finding type" subsection and "Presentation" subsection are deleted — Phase 2's claim-extraction workflow and presentation format replace them entirely.

Secondary fix: Verify template line 73 uses a parenthetical naming explanation ("both share the same number") instead of the mechanical formula already present at line 107. Replace with the same formula for consistency.

## Output Mockups

After restructure, the Structured Triage section flows:

```
## Structured Triage

{intro paragraph — severity-based ordering, no accept-action reference}

**Session approach:** {severity-based, no accept-action reference}

### Close Reason Standards
{relocated from Phase 1 — universal guidance}

### Null-File Findings
{relocated from Phase 1 — severity-agnostic handling}

### Phase 1: Risk and Debt Findings (Deep Review)
{current Phase 2 content, unchanged except "ordered by severity (risk first)"}

### Phase 2: Promote Candidates
{current Phase 3 content, renumbered}

### Phase 3: Remaining Observations
{current Phase 4 content, renumbered}
```

The Present State menu becomes:

```
After the summary, present options:
- Review risks ({X} risk findings)
- Review debt ({Y} debt findings)
- Promote patterns ({B} promotion candidates)
- Focus on {module} ({N} findings in hot module)
```

The summary block drops the `{A} closeable (accept-action)` line. The remaining shape lines (`{X} risk · {Y} debt · {Z} observation`) and classification counts (`{B} promotable · {C} need review`) are sufficient.

## File Changes

### `packages/cli/templates/.claude/agents/ana-learn.md` (modify)
**What changes:** Five areas of the template are modified:

1. **Structured Triage intro (line 186):** Remove "accept-action →" from the phase order sentence. New order: "risk/debt → promote candidates → remaining observations."

2. **Session approach paragraph (line 188):** Rewrite to reflect severity-based ordering. Remove "then accept-action (cleanup)." New flow: risk findings and recurring candidates (highest impact) → high-confidence stale findings (quick wins) → debt findings → promote candidates → remaining observations. Keep the existing text about developer control and no arbitrary cap.

3. **Phase 1: Accept-Action (lines 190-239) — remove entirely.** Before deleting, extract two sections to relocate:
   - "Close reason standard" (lines 206-221): Move to a new `### Close Reason Standards` section placed AFTER the Session approach paragraph and BEFORE Phase 1. Keep the content verbatim — the good/bad reason examples, the "6 months from now" guidance. This is the exact text from lines 206-221.
   - "Null-file findings" paragraph (lines 202-203): Move to a new `### Null-File Findings` section alongside close reason standards. Keep the guidance about process/upstream findings and the "no code reference" close reason note. This is the exact text from lines 202-203.
   - Everything else in Phase 1 (verification depth by finding type for accept-action observations and accept-action debt/risk, the Presentation subsection) is deleted. Phase 1's presentation format (grouped by theme) is replaced by Phase 2's format (STALE/ACTIVE/THEORETICAL).

4. **Renumber remaining phases:** Phase 2 → Phase 1, Phase 3 → Phase 2, Phase 4 → Phase 3. Update cross-references: Phase 3 (Promote) currently says "recurring patterns you identified in Phase 2" — update to "Phase 1."

5. **Three additional touch points:**
   - **Present State menu (lines 107-113):** Remove "Clear the deck" option. Replace with "Review risks" and "Review debt" as separate options. Update the default ordering parenthetical from "(accept → risk/debt → promote → observations)" to "(risk → debt → promote → observations)."
   - **Summary block (lines 90-101):** Remove the `{A} closeable (accept-action)` line. The summary shape should show severity counts and classification counts without singling out accept-action.
   - **Edge Cases "Very large active set" (line 477):** Remove "Cap at ~30 per session." Rewrite to: negotiate focus by severity or module, consistent with the session approach. The developer controls session length.

**Pattern to follow:** Phase 2's existing structure (lines 240-304) is the gold standard. The relocated shared sections use the same heading level (`###`) as the phases.
**Why:** The accept-action phase creates batch framing that bypasses individual evaluation — the root cause of three consecutive batch-closing failures.

### `packages/cli/templates/.claude/agents/ana-verify.md` (modify)
**What changes:** Line 73 — replace "both share the same number (`verify_report_1.md` + `verify_data_1.yaml`)" with the mechanical naming formula already used at line 107: "the data companion mirrors the report name — replace `report` with `data` and `.md` with `.yaml` (`verify_report_1.md` → `verify_data_1.yaml`)."

**Pattern to follow:** Line 107's existing mechanical formula.
**Why:** The parenthetical naming explanation at line 73 requires the agent to parse prose to derive the naming rule. The mechanical formula is unambiguous (AGENT-052).

### `.claude/agents/ana-learn.md` (modify)
**What changes:** Overwrite with the exact contents of the modified template at `packages/cli/templates/.claude/agents/ana-learn.md`.
**Pattern to follow:** Dogfood copies always match templates exactly.
**Why:** AC9 — dogfood copies must match templates.

### `.claude/agents/ana-verify.md` (modify)
**What changes:** Overwrite with the exact contents of the modified template at `packages/cli/templates/.claude/agents/ana-verify.md`.
**Pattern to follow:** Dogfood copies always match templates exactly.
**Why:** AC9 — dogfood copies must match templates.

## Acceptance Criteria
- [x] AC1: Phase 1 "Accept-Action (Clear the Deck)" section is removed entirely from ana-learn.md
- [x] AC2: Triage phases are ordered by severity: risk → debt → observations (with promote candidates between debt and observations)
- [x] AC3: The "Session approach" paragraph reflects severity-based ordering with no reference to accept-action as a phase
- [x] AC4: Risk and debt findings use the full claim-extraction workflow regardless of `suggested_action` value
- [x] AC5: The `accept` classification is not referenced as a triage category anywhere in the phase structure
- [x] AC6: Close reason standards and verification depth guidance are preserved (relocated to shared sections before the phases)
- [x] AC7: Edge cases "Cap at ~30 per session" bullet is rewritten to match the session approach (developer controls length)
- [x] AC8: Verify template line 73 uses mechanical naming rule matching line 107's formula
- [x] AC9: Dogfood copies (`.claude/agents/`) match templates exactly
- [x] No references to "accept-action," "clear the deck," or "accept-action findings" remain in phase structure or menu
- [x] Phase cross-references are updated (Promote references Phase 1 not Phase 2)

## Testing Strategy
- **Unit tests:** None — template-only change. No CLI code affected. Existing 1804 tests must still pass (template changes don't affect tests, but confirms no collateral damage).
- **Integration tests:** None applicable.
- **Behavioral verification:** The builder should verify by reading the final template that: (1) no `accept-action` references remain in the triage phases or menu, (2) close reason standards appear before Phase 1, (3) phase numbers are sequential 1-2-3 with correct cross-references.

## Dependencies
None — all four files exist and are ready to edit.

## Constraints
- Template content only. No CLI source code changes.
- Close reason standards and null-file handling guidance must survive the restructure verbatim — they're proven useful content.
- The `accept` classification word may still appear in the template in contexts where it describes proof chain field semantics (e.g., "Proof Chain Field Semantics" section, line 158). That's correct — AC5 applies to the phase structure, not to reference documentation.

## Gotchas
- **Phase cross-references:** Phase 3 (Promote Candidates) currently says "recurring patterns you identified in Phase 2." After renumbering, Promote becomes Phase 2 and references Phase 1. Search the entire Structured Triage section for "Phase 2" and "Phase 1" references that need updating.
- **Summary block accept-action line:** The Present State summary block at line 93 has `{A} closeable (accept-action)`. This is easy to miss because it's above the Structured Triage section.
- **Default ordering parenthetical:** Line 113 says "(accept → risk/debt → promote → observations)" — update to match new ordering.
- **Guardrail 3 reference:** Line 422-426 (Guardrail "Never Close Without Verification") references accept-action observations. This is in the Guardrails section, not the phase structure — review whether it still makes sense without the accept-action phase. The guidance about verification depth for accept-action observations vs risk/debt is Phase 1 content being deleted. Guardrail 3 should reference the shared verification depth guidance instead.

## Build Brief

### Rules That Apply
- Template files are copied verbatim during init. Edit the template at `packages/cli/templates/`, then copy to `.claude/agents/` for dogfood.
- No CLI code changes — engine files have zero CLI dependencies, but this scope doesn't touch engine at all.
- Every character earns its place — no slop in template prose.

### Pattern Extracts

Phase 2's claim-extraction workflow (the structural analog that all findings now receive) — from `packages/cli/templates/.claude/agents/ana-learn.md` lines 241-284:

```markdown
### Phase 2: Risk and Debt Findings (Deep Review)

Findings with `severity: risk` or `severity: debt`, ordered by severity (risk first). This is the deep work — every finding gets code-verified.

For each finding:

#### 1. Extract the claim

The finding's `summary` is a specific claim about the code. Write it as a yes/no question: "Does line 1078 still output non-JSON text to stdout without checking options.json?" Not: "Is the recovery path reasonable?"

If the summary is too vague to form a precise question, note it: "Finding {ID}'s claim is imprecise — verifying against general code state."

#### 2. Predict before reading

Before reading the code, predict: "Based on git history and modules_touched, I predict this finding is {stale/still valid} because {reasoning}." This creates commitment that resists confirmation bias. You will resolve each prediction after reading the code.

#### 3. Check for staleness
...
```

Close reason standards being relocated (lines 206-221):

```markdown
#### Close reason standard

Every close reason must describe what you verified, not restate the classification. A future reader should understand what was checked without re-reading the finding.

**Good reasons:**
- `"Fixed by {scope} — {what changed} at {file}:{line} ({commit})"`
- `"File deleted — {file} no longer exists"`
- `"System removed — {system} was deleted in {scope} ({commit})"`
- `"Intentional: {what the code does} at {file}:{line} — {why it's correct}"`
- `"Stale — finding claims {X} but code at {file}:{line} is now {Y}. Changed across {N} subsequent runs, specific fix commit unknowable."`

**Bad reasons:**
- `"accept: intentional behavior"` — what behavior? what did you verify?
- `"accept: known residual"` — known by whom? still present?
- `"accept: cosmetic"` — cosmetic how? in what file?

The reason should contain enough information that a developer reading the proof chain 6 months from now understands what was checked.
```

Verify line 73 current text:

```markdown
3. **Write fresh artifacts.** Delete the previous verify report and its data companion from `.ana/plans/active/{slug}/` — both share the same number (`verify_report_1.md` + `verify_data_1.yaml`).
```

Verify line 107 mechanical formula (the target pattern):

```markdown
The filename mirrors your report: replace `report` with `data` and `.md` with `.yaml` (`verify_report_1.md` → `verify_data_1.yaml`).
```

### Proof Context
- **Active finding (learn template):** "Edge Cases section still says 'Cap at ~30 per session' — contradicts new 'no arbitrary cap' guidance." This build directly resolves it (AC7).
- **Active finding (learn template):** "Template instructs Learn to read .claude/skills/{name}/SKILL.md but actual skill files use different naming." Out of scope — not related to triage restructure.
- No active proof findings for verify template files.

### Checkpoint Commands

- After learn template edits: `(cd packages/cli && pnpm vitest run)` — Expected: 1804 passed (template changes don't affect tests)
- After all four files changed: `(cd packages/cli && pnpm vitest run)` — Expected: 1804 passed
- Lint: `pnpm run lint`
- Verify dogfood sync: `diff packages/cli/templates/.claude/agents/ana-learn.md .claude/agents/ana-learn.md` and `diff packages/cli/templates/.claude/agents/ana-verify.md .claude/agents/ana-verify.md` — Expected: no output (files identical)

### Build Baseline
- Current tests: 1804 passed, 2 skipped (93 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: 1804 passed (no new tests — template-only change)
- Regression focus: None — template files are not imported by any test
