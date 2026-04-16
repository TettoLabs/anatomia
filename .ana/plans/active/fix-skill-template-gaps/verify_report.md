# Verify Report: Fix skill template gaps

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-16
**Spec:** .ana/plans/active/fix-skill-template-gaps/spec.md
**Branch:** feature/fix-skill-template-gaps

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/fix-skill-template-gaps/contract.yaml
  Seal: UNVERIFIABLE (no saved contract commit)
```

Manual tag coverage assessment: No @ana tags expected — spec states "No new tests. These are static markdown templates with no runtime behavior."

Tests: 1135 passed, 2 failed (pre-existing). Build: clean. Lint: clean.

Pre-existing failures (not introduced by this build):
- `census.test.ts`: cal.com monorepo detection
- `census.test.ts`: dub monorepo detection

These are external repo validation tests unrelated to template changes.

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | The data-access template includes guidance on scoping queries to authorized users | SATISFIED | data-access/SKILL.md:16 — "Always scope data queries to the authorized context" |
| A002 | The data-access template names IDOR as the consequence of missing authorization scoping | SATISFIED | data-access/SKILL.md:16 — "A missing `where` clause is an IDOR vulnerability" |
| A003 | The data-access template still has all four original rules unchanged | SATISFIED | 5 rules total (4 original + 1 new). Git diff confirms only line 16 added. |
| A004 | The coding-standards error rule bans empty catch blocks | SATISFIED | coding-standards/SKILL.md:15 — "Empty catch blocks are never acceptable" |
| A005 | The coding-standards error rule permits intentional graceful degradation | SATISFIED | coding-standards/SKILL.md:15 — "Intentional graceful degradation — catching a failure and continuing with a fallback — is fine" |
| A006 | The coding-standards error rule requires degradation to be logged and observable | SATISFIED | coding-standards/SKILL.md:15 — "when the degradation is logged and observable" |
| A007 | The coding-standards template still has exactly six rules | SATISFIED* | Main has 7 rules, feature branch has 7 rules. Contract says 6 — planner miscounted. Build preserved the correct count. |
| A008 | No existing rules were modified except the error-handling rule in coding-standards | SATISFIED* | 6 rules unchanged (7 original - 1 modified = 6). Contract says 5 — planner arithmetic error. Build modified only the error rule per spec. |

*A007/A008: The contract numeric values are incorrect due to planner miscount. The BUILD is correct — it preserved all non-target rules. Verified via `git show fe9c133` showing exactly one line replaced in coding-standards and one line added in data-access.

## Independent Findings

**Diff verification (git show fe9c133):**
- data-access/SKILL.md: +1 line (IDOR rule after "Select only the fields you need")
- coding-standards/SKILL.md: 1 line replaced (error-handling rule expanded)

No other changes. No whitespace modifications. No formatting drift.

**Template voice assessment:**
- New IDOR rule: "Always scope data queries to the authorized context. Filter by the authenticated user, organization, or tenant — don't rely solely on API-layer checks to prevent unauthorized access. A missing `where` clause is an IDOR vulnerability."
- Pattern: imperative ("Always scope") + dash + why ("don't rely solely on API-layer checks") + consequence ("IDOR vulnerability")
- Matches existing rules exactly.

**Error rule expansion assessment:**
- Old: "Never swallow errors. Every catch must re-throw, return a typed error, or log with context. No empty catch blocks."
- New: "Every catch block must do something deliberate: re-throw, return a typed error, or log with context. Empty catch blocks are never acceptable. Intentional graceful degradation — catching a failure and continuing with a fallback — is fine when the degradation is logged and observable."
- Correctly bans empty catches while permitting logged degradation. Aligns with engine's 57+ intentional empty catches documented in coding-standards skill gotchas.

**Over-building check:** None. Changes are minimal and match spec exactly.

## AC Walkthrough

- [x] **AC1:** data-access/SKILL.md contains a rule about scoping queries to authorized context, naming IDOR as the consequence of omission — **PASS**. Line 16: "Always scope data queries to the authorized context...A missing `where` clause is an IDOR vulnerability."

- [x] **AC2:** coding-standards/SKILL.md error-handling rule bans empty catch blocks and silent failures, but explicitly permits intentional graceful degradation when logged and observable — **PASS**. Line 15 contains all three elements.

- [x] **AC3:** No other rules in either template are changed — **PASS**. Git diff shows exactly one line replaced in coding-standards (the error rule) and one line added in data-access (the IDOR rule). No other rule bullets modified.

- [x] **AC4:** Template voice is consistent — terse, imperative, explains the why — **PASS**. Both new/modified rules follow the pattern: imperative statement + dash + why explanation.

- [x] **AC5:** No build errors (pnpm run build) — **PASS**. Build completed successfully.

- [x] **AC6:** No test regressions (cd packages/cli && pnpm vitest run) — **PASS**. 1135 passed, 2 failed. The 2 failures are pre-existing census tests for external repos (cal.com, dub) — not regressions from this build.

## Blockers

None. Checked for:
- Unintended rule modifications — git diff shows only intended changes
- Template voice drift — new content matches existing patterns
- Contradictions with existing guidance — the new error rule explicitly allows logged degradation, which aligns with the engine's intentional empty catch pattern documented in coding-standards skill gotchas
- Build/lint/test failures from template changes — none, as expected for static markdown

## Callouts

**Upstream:** Contract assertions A007 and A008 were sealed with incorrect values. The planner counted 6 rules in coding-standards but main has 7. A007 says 6 rules, should say 7. A008 says 5 unchanged rules, should say 6 (7 - 1 modified = 6). The BUILD is correct — the contract is not.

**Code:** The error-handling rule is now longer than the others (spans multiple sentences where most rules are one sentence + why). This is appropriate given the nuance being expressed, but worth noting as a slight voice deviation — the rule is more complex because the guidance is more complex.

**Test:** No test coverage for template content. These are static files copied verbatim during init, so testing would require either snapshot tests or parsing the markdown. Current approach (visual inspection against spec) is reasonable for static templates. If templates grow more complex, consider adding a test that at least validates markdown structure.

## Deployer Handoff

This PR modifies two skill templates that are copied during `ana init`:

1. **data-access/SKILL.md** — New IDOR rule teaches scaffolded projects to scope queries by auth context from day one.

2. **coding-standards/SKILL.md** — Error-handling rule now permits intentional graceful degradation (logged), which aligns with engine patterns. Agents using this skill will no longer flag the engine's catch blocks as violations.

No runtime code changed. No migration needed. Already-initialized projects won't see these changes unless they re-run init or manually update their skills.

## Verdict

**Shippable:** YES

All acceptance criteria pass. The build is correct — surgical edits to two templates, matching spec exactly. Contract assertions A007/A008 have planner-side numeric errors but the underlying intent (preserve non-target rules) is satisfied. Git diff confirms only the specified lines were changed.
