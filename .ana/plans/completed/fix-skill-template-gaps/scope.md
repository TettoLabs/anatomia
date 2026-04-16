# Scope: Fix skill template gaps — data-access security, coding-standards error rule

**Created by:** Ana
**Date:** 2026-04-16

## Intent
Two skill templates ship with gaps that affect every new Anatomia project. The data-access template has no security guidance — teams start without IDOR prevention at the data layer. The coding-standards template has an absolutist error-handling rule that contradicts intentional graceful degradation patterns. Fix both.

## Complexity Assessment
- **Size:** small
- **Files affected:** 2
  - `packages/cli/templates/.claude/skills/data-access/SKILL.md`
  - `packages/cli/templates/.claude/skills/coding-standards/SKILL.md`
- **Blast radius:** none — these are scaffold templates, no runtime code depends on them
- **Estimated effort:** minutes
- **Multi-phase:** no

## Approach
Add one rule to data-access. Reword one rule in coding-standards. Keep the existing template voice — imperative statement, then the *why* after the dash.

## Acceptance Criteria
- AC1: `data-access/SKILL.md` contains a rule about scoping queries to authorized context, naming IDOR as the consequence of omission
- AC2: `coding-standards/SKILL.md` error-handling rule bans empty catch blocks and silent failures, but explicitly permits intentional graceful degradation when logged and observable
- AC3: No other rules in either template are changed
- AC4: Template voice is consistent — terse, imperative, explains the why

## Edge Cases & Risks
None meaningful. These are markdown templates with no runtime behavior.

## Rejected Approaches
- **Adding a separate "Security" section to data-access** — breaks consistency with other templates that use a flat Rules list. Security isn't separate from normal data access practice.
- **Splitting the error rule into two rules** — one for "don't swallow" and one for "degradation is ok." Adds clutter for one concept. A single well-worded rule covers both.
- **Soft delete / deletion safety rule in data-access** — considered and rejected. Too opinionated for a universal template (hard deletes, soft deletes, event sourcing are all valid).

## Open Questions
None.

## Exploration Findings

### Patterns Discovered
- All skill templates use the same structure: frontmatter, `## Detected`, `## Rules` (bulleted), `## Gotchas`, `## Examples`
- Rules follow a consistent voice: imperative statement + why-explanation after the dash
- data-access has 4 rules, all performance-oriented
- coding-standards has 6 rules, error handling is the 4th bullet

### Constraints Discovered
- [OBSERVED] api-patterns already has route-level IDOR guidance (line 15) — the data-access rule provides defense in depth, not duplication

### Test Infrastructure
- No tests for template content (these are static markdown files)

## For AnaPlan

### Structural Analog
Any existing rule bullet in either template — same shape, same voice.

### Relevant Code Paths
- `packages/cli/templates/.claude/skills/data-access/SKILL.md` — add new bullet after line 15 (the "select only fields" rule)
- `packages/cli/templates/.claude/skills/coding-standards/SKILL.md` — replace line 15 (the "Never swallow errors" rule)

### Exact Text

**data-access — new rule (append after last existing rule):**

```
- Always scope data queries to the authorized context. Filter by the authenticated user, organization, or tenant — don't rely solely on API-layer checks to prevent unauthorized access. A missing `where` clause is an IDOR vulnerability.
```

**coding-standards — replacement for "Never swallow errors" rule:**

```
- Every catch block must do something deliberate: re-throw, return a typed error, or log with context. Empty catch blocks are never acceptable. Intentional graceful degradation — catching a failure and continuing with a fallback — is fine when the degradation is logged and observable.
```

### Patterns to Follow
- Match the imperative voice of adjacent rules in each file

### Known Gotchas
- None

### Things to Investigate
- None
