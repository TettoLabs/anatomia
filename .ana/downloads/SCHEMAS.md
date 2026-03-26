# Artifact Schemas

Reference document for all Think. Build. Verify. pipeline artifacts. Each agent reads this to understand the format it must produce.

---

## scope.md — Ana → AnaPlan

Written by Ana after a scoping conversation. Describes WHAT and WHY. Never HOW.

```markdown
# Scope: {task name}

**Created by:** Ana
**Date:** {date}

## Intent
What the user wants and why. In their words where possible.

## Complexity Assessment
- **Size:** small / medium / large
- **Files affected:** {list of files or directories}
- **Blast radius:** what else might be impacted
- **Estimated effort:** rough time estimate

## Approach
Direction for how to tackle this. Not implementation detail — just the approach.
Multiple options if they exist, with the recommended one noted.

## Acceptance Criteria
- [ ] {specific, verifiable criterion}
- [ ] {specific, verifiable criterion}
- [ ] {specific, verifiable criterion}

## Edge Cases & Risks
What could go wrong. What inputs are unusual. What existing behavior might break.

## Rejected Approaches
What was considered and discarded, with reasoning.

## Open Questions
Unresolved items for AnaPlan to investigate further.
```

**Rules:**
- Every section is required. If you can't fill one, scoping isn't done.
- No TypeScript interfaces, regex patterns, function signatures, or file-by-file implementation steps.
- Acceptance criteria are checkboxes. Each is a specific, testable statement.
- AnaPlan copies acceptance criteria into the spec and expands them.

---

## spec.md — AnaPlan → AnaBuild

Written by AnaPlan after reading the scope. Describes HOW in full implementation detail.

```markdown
# Spec: {task name}

**Created by:** AnaPlan
**Date:** {date}
**Scope:** .ana/plans/active/{slug}/scope.md

## Approach
Detailed implementation strategy. What pattern to follow. What existing code to build on.

## File Changes

### {file path}
- **Action:** create / modify / delete
- **What changes:** {description}
- **Why:** {reasoning}

### {file path}
- **Action:** create / modify / delete
- **What changes:** {description}
- **Why:** {reasoning}

## Acceptance Criteria
Copied from scope, expanded with implementation-specific criteria:
- [ ] {criterion from scope}
- [ ] {criterion from scope}
- [ ] {new implementation-specific criterion}
- [ ] {new implementation-specific criterion}

## Testing Strategy
- **Unit tests:** {what to test, what fixtures needed}
- **Integration tests:** {what flows to verify}
- **Edge cases:** {specific edge case tests to write}

## Dependencies
What must exist before implementation begins.

## Constraints
Performance, security, compatibility, or backward-compatibility requirements.
```

**Rules:**
- This IS the implementation blueprint. TypeScript interfaces, schemas, function signatures belong here.
- Every file that will be created or modified must be listed with what changes and why.
- Acceptance criteria are the contract between Plan and Build. AnaBuild checks them off. AnaVerify verifies them.
- AnaBuild follows this spec. It doesn't redesign or second-guess.

---

## build_report.md — AnaBuild → AnaVerify

Written by AnaBuild after implementation. Summarizes what was done.

```markdown
# Build Report: {task name}

**Created by:** AnaBuild
**Date:** {date}
**Spec:** .ana/plans/active/{slug}/spec.md

## What Was Built
- `{file path}` — {one-line description of change}
- `{file path}` — {one-line description of change}
- `{file path}` — {one-line description of change}

## Acceptance Criteria Status
- [x] {criterion — checked off}
- [x] {criterion — checked off}
- [ ] {criterion — not completed, with reason}

## Tests Written
- `{test file}` — {what it tests} — PASS / FAIL
- `{test file}` — {what it tests} — PASS / FAIL

## Implementation Decisions
Choices made during implementation that weren't in the spec:
- **{decision}:** {what was chosen} over {alternative}, because {reasoning}

## Known Concerns
Anything uncertain. Edge cases not fully covered. Performance unknowns.

## Files Changed
Complete list for AnaVerify to inspect:
- `{file path}`
- `{file path}`
```

**Rules:**
- Keep it factual. What was done, not what was planned.
- Acceptance criteria checkboxes must match the spec exactly. Check off what's done. Leave unchecked what isn't, with a reason.
- Files Changed list is critical — AnaVerify uses it to know what to inspect.
- Implementation Decisions documents what the spec didn't cover. Captures tribal knowledge for future cycles.

---

## verify_report.md — AnaVerify → Completion

Written by AnaVerify after adversarial testing and review.

```markdown
# Verify Report: {task name}

**Created by:** AnaVerify
**Date:** {date}
**Spec:** .ana/plans/active/{slug}/spec.md

## Acceptance Criteria Results
- [x] PASS: {criterion} — {evidence}
- [x] PASS: {criterion} — {evidence}
- [ ] FAIL: {criterion} — {what's wrong}

## Regression Check
- **Existing test suite:** PASS / FAIL ({N} tests, {N} passed)
- **Regressions found:** {list or "none"}

## Edge Cases Tested
- {edge case} — {result}
- {edge case} — {result}

## Issues Found
- **{severity: critical/warning/note}:** {description} in `{file}` — {details}

## Recommendation
**PASS** / **FAIL** / **PARTIAL**

If FAIL or PARTIAL, specific items to fix:
1. {what to fix}
2. {what to fix}
```

**Rules:**
- AnaVerify reads the spec and the code independently. It does NOT trust the build report's self-assessment.
- Every acceptance criterion gets a PASS or FAIL with evidence — not just "looks good."
- FAIL means the user should open `claude --agent ana-build` to fix the listed items, then re-run verify.
- PARTIAL means core functionality works but edge cases or non-critical criteria failed.
- AnaVerify never fixes code. It reports only.

---

## Artifact Lifecycle

```
scope.md exists     → task is scoped, awaiting plan
spec.md exists      → task is planned, awaiting build
build_report.md     → task is built, awaiting verify
verify_report.md    → check recommendation: PASS = done, FAIL = back to build
```

File existence IS the state machine. No separate status file needed.

When a task is complete (verify passes), the developer moves the directory from `.ana/plans/active/{slug}/` to `.ana/plans/complete/{slug}/`. The four artifacts together form the permanent record: intent, plan, implementation, proof.
