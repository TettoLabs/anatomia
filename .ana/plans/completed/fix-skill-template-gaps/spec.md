# Spec: Fix skill template gaps — data-access security, coding-standards error rule

**Created by:** AnaPlan
**Date:** 2026-04-16
**Scope:** .ana/plans/active/fix-skill-template-gaps/scope.md

## Approach

Two surgical edits to skill templates. No runtime code, no generators, no tests to write — these are static markdown files copied verbatim during init.

1. **data-access/SKILL.md** — Append a fifth rule about scoping queries to authorized context. Place it after the last existing rule ("Select only the fields you need"). This provides defense-in-depth alongside the route-level IDOR guidance already in api-patterns.

2. **coding-standards/SKILL.md** — Replace the fourth rule ("Never swallow errors…") with an expanded version that bans empty catch blocks but explicitly permits intentional graceful degradation when logged and observable. The current rule is absolutist and contradicts the engine's intentional degradation pattern (57+ empty catch blocks in engine that are by design).

Both edits match the existing template voice: imperative statement, then the why after the dash.

## Output Mockups

**data-access/SKILL.md after edit — Rules section:**
```
## Rules
- Import the database client from a single shared module. Never instantiate a new client in route handlers or service functions — each instance opens its own connection pool.
- Wrap multi-step mutations in a transaction. If any step can fail, partial writes corrupt data — all steps succeed or all roll back.
- Use eager loading or joins for related data. Never query the database inside a loop — each iteration is a separate round trip.
- Select only the fields you need. Avoid fetching entire records when the consumer needs a few columns.
- Always scope data queries to the authorized context. Filter by the authenticated user, organization, or tenant — don't rely solely on API-layer checks to prevent unauthorized access. A missing `where` clause is an IDOR vulnerability.
```

**coding-standards/SKILL.md after edit — line 15 replacement:**
```
- Every catch block must do something deliberate: re-throw, return a typed error, or log with context. Empty catch blocks are never acceptable. Intentional graceful degradation — catching a failure and continuing with a fallback — is fine when the degradation is logged and observable.
```

## File Changes

### `packages/cli/templates/.claude/skills/data-access/SKILL.md` (modify)
**What changes:** Add one rule bullet after the last existing rule in the `## Rules` section.
**Pattern to follow:** The four existing rule bullets in the same file — imperative voice, explains the why.
**Why:** Teams scaffolded from this template start without any data-layer authorization guidance. The IDOR class of vulnerability originates at the query level, not the route level.

### `packages/cli/templates/.claude/skills/coding-standards/SKILL.md` (modify)
**What changes:** Replace the fourth rule bullet (line 15: "Never swallow errors…") with an expanded version.
**Pattern to follow:** Adjacent rule bullets in the same file.
**Why:** The current rule is absolutist — it contradicts intentional graceful degradation, which is a legitimate pattern (and one Anatomia's own engine uses extensively).

## Acceptance Criteria

- [ ] AC1: `data-access/SKILL.md` contains a rule about scoping queries to authorized context, naming IDOR as the consequence of omission
- [ ] AC2: `coding-standards/SKILL.md` error-handling rule bans empty catch blocks and silent failures, but explicitly permits intentional graceful degradation when logged and observable
- [ ] AC3: No other rules in either template are changed
- [ ] AC4: Template voice is consistent — terse, imperative, explains the why
- [ ] AC5: No build errors (`pnpm run build`)
- [ ] AC6: No test regressions (`cd packages/cli && pnpm vitest run`)

## Testing Strategy

No new tests. These are static markdown templates with no runtime behavior. Verification is visual inspection against acceptance criteria.

## Dependencies

None.

## Constraints

- Template voice must match existing rules: imperative statement + why-explanation after the dash.
- No other rules in either file may be modified.

## Gotchas

None. These are markdown files with no consumers beyond `init` copy.

## Build Brief

### Rules That Apply
- Every character earns its place — no filler, no slop in the rule text
- Templates are copied verbatim during init — edit the template file, not a generator

### Pattern Extracts

**data-access/SKILL.md lines 12–15 — existing rule voice:**
```markdown
- Import the database client from a single shared module. Never instantiate a new client in route handlers or service functions — each instance opens its own connection pool.
- Wrap multi-step mutations in a transaction. If any step can fail, partial writes corrupt data — all steps succeed or all roll back.
- Use eager loading or joins for related data. Never query the database inside a loop — each iteration is a separate round trip.
- Select only the fields you need. Avoid fetching entire records when the consumer needs a few columns.
```

**coding-standards/SKILL.md line 15 — current rule to replace:**
```markdown
- Never swallow errors. Every catch must re-throw, return a typed error, or log with context. No empty catch blocks.
```

### Checkpoint Commands

- After both edits: `pnpm run build` — Expected: clean build
- After both edits: `cd packages/cli && pnpm vitest run` — Expected: 1137 tests pass, 86 test files

### Build Baseline
- Current tests: 1137 passed
- Current test files: 86 passed
- Command used: `cd packages/cli && pnpm vitest run`
- After build: 1137 tests in 86 files (no new tests — static templates)
- Regression focus: none — no runtime code touched
