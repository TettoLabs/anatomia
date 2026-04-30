# Build Report: Ana Learn V1

**Created by:** AnaBuild
**Date:** 2026-04-29
**Spec:** .ana/plans/active/ana-learn-v1/spec.md
**Branch:** feature/ana-learn-v1

## What Was Built

- `packages/cli/templates/.claude/agents/ana-learn.md` (created): Full agent template (~298 lines). Frontmatter with `model: opus[1m]`, description, no `skills:` field. Sections: Identity, Pipeline Position, On Startup (reads ana.json, design-principles.md, discovers skills, runs proof health/audit with fallbacks), System Knowledge (knowledge flow, ownership/mutability, skill consumption patterns, proof chain semantics), Structured Triage (4-phase: accept-action → risk/debt → promote → remaining), Suggestion Format (grouped list with CLI commands), Promotion Workflow, Observation Routing, Branch Requirement, What You Do NOT Do, Edge Cases, Reference.
- `.claude/agents/ana-learn.md` (created): Dogfood copy — identical to template (verified with diff).
- `packages/cli/src/constants.ts` (modified): Added `'ana-learn.md'` to `AGENT_FILES` array (6th entry).
- `packages/cli/templates/CLAUDE.md` (modified): Added `To maintain and improve quality: \`claude --agent ana-learn\`` line.

## PR Summary

- Add Ana Learn agent template — the fifth agent that runs alongside the pipeline to triage proof chain findings, promote recurring patterns to skill rules, and route developer observations
- Register `ana-learn.md` in `AGENT_FILES` constant so `ana init` copies the template to new projects
- Add Learn reference line to CLAUDE.md template so developers discover the agent
- Template includes fallback instructions for `ana proof health` and `ana proof promote` commands that don't exist yet
- Dogfood copy at `.claude/agents/ana-learn.md` matches the template exactly

## Acceptance Criteria Coverage

- AC1 "Template has frontmatter with model, description, no skills" → Template has `model: opus[1m]`, `description: "Ana Learn — quality gardener..."`, no `skills:` field. **Note:** Spec called for `model: sonnet` but developer overrode to `opus[1m]` for consistency with all other agents.
- AC2 "On startup, Learn reads ana.json, design-principles, discovers skills, runs health/audit" → Template On Startup sections 1-4 cover all reads. Fallback instructions included for missing commands.
- AC3 "System Knowledge section with diagnostic reasoning" → System Knowledge section covers: AC3a knowledge flow (scope→spec→Brief→code→findings), AC3b ownership/mutability (Detected vs Rules), AC3c agent skill consumption (frontmatter vs manual vs on-demand), AC3d proof chain semantics (severity, suggested_action, etc.)
- AC4 "Triage loop order: accept-action → risk → promote → remaining" → Structured Triage section has Phases 1-4 in that order, with ~30 per session cap.
- AC5 "Suggestions presented as complete list before execution" → Suggestion Format section presents grouped list, ends with "Approve all, approve by group, or reject individually?"
- AC6 "Promote workflow reads target skill, drafts rule, uses promote command" → Promotion Workflow section covers all three steps plus fallback for missing command.
- AC7 "Accept-action findings closed with classification as evidence" → Phase 1 of Structured Triage verifies classification, suggests closure with evidence.
- AC8 "Observation routing instructions" → Observation Routing section with 5-step diagnostic chain (missing rule → existing rule not landing → principle violation → bug → architectural concern).
- AC9 "What Learn does NOT do" → "What You Do NOT Do" section lists all 6 boundaries.
- AC10 "Branch requirement for close/promote" → Branch Requirement section checks current branch against artifactBranch.
- AC11 "Template registered in AGENT_FILES" → `'ana-learn.md'` added as 6th entry in constants.ts.
- AC12 "Dogfood copy matches template" → Verified with `diff` — 0 differences.
- AC13 "CLAUDE.md template includes Learn reference" → Line added after ana-setup line.
- AC14 "Tests pass" → 1733 passed, 2 skipped (identical to baseline).
- AC15 "No build errors" → `pnpm run build` clean.

## Implementation Decisions

- **Model override from spec:** Spec called for `model: sonnet` per scope decision for automated session affordability. Developer explicitly overrode to `model: opus[1m]` for consistency with all other agents. This is a developer decision, not a deviation.
- **Template length:** ~298 lines, within the spec's suggested ~280-320 range.
- **Fallback handling:** Template instructs Learn to fall back to reading `proof_chain.json` directly when `ana proof health` or `ana proof audit` commands fail, and to suggest manual skill file edits when `ana proof promote` isn't available.
- **Session cap:** Set at ~30 findings per session as spec suggested, with severity-based prioritization for larger sets.
- **No `initialPrompt:` or `memory: project` in frontmatter:** Per spec gotchas — Learn doesn't need either.

## Deviations from Contract

### A001: Learn agent uses Sonnet model for affordable automated sessions
**Instead:** Template uses `model: opus[1m]` per developer's explicit instruction
**Reason:** Developer requested consistency with all other agents ("it should have the same model as all other agents")
**Outcome:** Developer decision — overrides spec's sonnet recommendation. Functionally equivalent, higher cost for automated sessions.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  97 passed (97)
     Tests  1733 passed | 2 skipped (1735)
  Duration  19.87s
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  97 passed (97)
     Tests  1733 passed | 2 skipped (1735)
  Duration  19.61s
```

### Comparison
- Tests added: 0
- Tests removed: 0
- Regressions: none

### New Tests Written
None — spec's Testing Strategy states "No unit tests for agent template content. Templates are markdown — they're verified by Verify reading the template and confirming it instructs the agent correctly." Code changes (constants.ts array entry, CLAUDE.md line) are trivial and covered by existing init tests.

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
93cc51c [ana-learn-v1] Register Learn in AGENT_FILES and CLAUDE.md template
ca1d557 [ana-learn-v1] Add Learn agent template and dogfood copy
```

## Open Issues

- **Model mismatch with spec/contract:** Contract assertion A001 specifies `model: sonnet`. Developer explicitly overrode to `opus[1m]`. Verify will likely flag this as UNSATISFIED. The developer's instruction is authoritative — this is a conscious override, not an error.

Verified complete by second pass.
