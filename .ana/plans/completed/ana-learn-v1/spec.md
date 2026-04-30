# Spec: Ana Learn V1

**Created by:** AnaPlan
**Date:** 2026-04-29
**Scope:** .ana/plans/active/ana-learn-v1/scope.md

## Approach

Ana Learn is the fifth agent — not in the pipeline (Think → Plan → Build → Verify), but running alongside it. Learn reads proof chain data, verifies findings against current code, suggests closures and promotions, and helps the developer route observations into permanent system improvements.

The template follows the established agent template structure: frontmatter → identity paragraph → pipeline position → On Startup → main instructions → boundaries → reference. The structural analog is `ana-setup.md` — both are meta-aware agents that read system state, interact conversationally, and write to project files. The per-item review pattern comes from `ana-verify.md` — Learn's per-finding triage follows the same shape (for each item → read code → assess → suggest with evidence).

Three key differences from pipeline agents:
1. **No `skills:` frontmatter.** Learn loads skills on-demand during promotion drafting — it needs to read the target skill file to draft a rule in that skill's voice.
2. **`model: sonnet` frontmatter.** Learn is the agent most likely to run automatically. Sonnet keeps automated sessions affordable. Manual sessions use the developer's model naturally.
3. **Suggest-then-execute pattern.** Learn presents ALL suggestions before executing ANY. The developer reviews the full picture, approves individually or in batch, then Learn executes. No interleaved suggest-approve-execute cycles.

The System Knowledge section teaches Learn diagnostic reasoning, not reference documentation. The difference: "skills have four sections" is a fact. "When a skill rule isn't landing in builds, check whether Plan curated it into the Build Brief — Build reads the Brief, not the skill files directly" is a diagnostic chain. The section teaches Learn to trace issues through the system.

The template instructs Learn to discover the installation — not hardcode it. "Read ana.json for the artifact branch" not "the branch is usually main." "List .claude/skills/ to see what's configured" not "there are 5 skills."

Registration: Add `'ana-learn.md'` to the `AGENT_FILES` array in `constants.ts`. The `copyAgentFiles` function in `assets.ts` iterates this array — no changes needed there. Add a Learn reference line to the CLAUDE.md template.

## Output Mockups

### Template frontmatter
```
---
name: ana-learn
model: sonnet
description: "Ana Learn — quality gardener. Triages findings, promotes rules, routes observations."
---
```

### Suggestion list format (what Learn presents to the developer)
```
Triage complete. 14 of 47 active findings reviewed.

Close (accept-action — pre-classified):
  1. F012 — close (file deleted)
     Evidence: packages/cli/src/old-scanner.ts no longer exists
     Command: ana proof close F012 --reason "file deleted"

  2. F019 — close (anchor absent)
     Evidence: formatTable function removed in commit a3b2c1d
     Command: ana proof close F019 --reason "anchor absent — function removed"

Promote (candidates with recurring pattern):
  3. F007 — promote to coding-standards
     Evidence: Same ESM import issue found in 3 runs (F007, F031, F042)
     Draft rule: "All relative imports must use .js extensions — ESM resolution crashes at runtime without them"
     Command: ana proof promote F007 --skill coding-standards --text "All relative imports must use .js extensions — ESM resolution crashes at runtime without them"

Keep (needs more data):
  4. F033 — keep (monitoring)
     Evidence: Only seen once, severity: observation. Watch for recurrence.

Approve all, approve by group (e.g., "approve closes"), or reject individually?
```

### CLAUDE.md template (after change)
```
# Anatomia Project

For features and substantial changes: `claude --agent ana`
To calibrate with your team's knowledge: `claude --agent ana-setup`
To maintain and improve quality: `claude --agent ana-learn`
```

## File Changes

### `packages/cli/templates/.claude/agents/ana-learn.md` (create)
**What changes:** New agent template, ~280-320 lines. The entire template content.
**Pattern to follow:** `ana-setup.md` for overall structure (startup, conversational interaction, system state reading). `ana-verify.md` for per-item review with evidence requirements.
**Why:** This IS the product. Without it, Learn doesn't exist.

### `.claude/agents/ana-learn.md` (create)
**What changes:** Dogfood copy — identical to the template.
**Pattern to follow:** All other agents have dogfood copies in `.claude/agents/` that match their templates.
**Why:** Anatomia uses its own agents. The dogfood copy lets the team run Learn on the Anatomia project itself.

### `packages/cli/src/constants.ts` (modify)
**What changes:** Add `'ana-learn.md'` to the `AGENT_FILES` array.
**Pattern to follow:** The existing array has 5 entries. Add the 6th.
**Why:** Without registration, `ana init` won't copy the template. New projects would never get Learn.

### `packages/cli/templates/CLAUDE.md` (modify)
**What changes:** Add the line "To maintain and improve quality: `claude --agent ana-learn`" after the existing two agent lines.
**Pattern to follow:** The existing two lines follow the pattern "To {verb phrase}: `claude --agent {name}`".
**Why:** CLAUDE.md is the entry point for all AI tools. Without the line, developers won't know Learn exists.

## Acceptance Criteria

From scope:
- [ ] AC1: Template has frontmatter with `model: sonnet`, `description` as a one-line summary, and no `skills:` field
- [ ] AC2: On startup, Learn reads `.ana/ana.json`, `.ana/context/design-principles.md`, discovers skill landscape (`ls .claude/skills/`, checking each for ENRICHMENT.md), then runs `ana proof health --json` and `ana proof audit --json`. Builds mental model before acting
- [ ] AC3: Template includes System Knowledge section with diagnostic reasoning (AC3a–AC3d from scope)
- [ ] AC4: Triage loop processes findings in order: accept-action → risk-severity → promote candidates → remaining. For each finding requiring code verification, Learn reads the file and code around the anchor
- [ ] AC5: Suggestions presented as complete list before any execution. Format: finding ID, recommendation, evidence, exact CLI command
- [ ] AC6: For promote-action findings, Learn reads target skill file, drafts rule in the skill's voice, uses `ana proof promote {id} --skill {name} --text "{drafted rule}"`
- [ ] AC7: For accept-action findings, Learn suggests closure with classification as evidence
- [ ] AC8: Template includes observation routing instructions — developer says "I noticed X", Learn diagnoses root cause by tracing through the system
- [ ] AC9: Template lists what Learn does NOT do (auto-execute without approval, modify agent definitions, modify source code, run during pipeline run, duplicate mechanical maintenance, read build/verify reports)
- [ ] AC10: Template specifies branch requirement — must be on artifact branch for close/promote commands
- [ ] AC11: Template registered in `AGENT_FILES` in constants.ts
- [ ] AC12: Dogfood copy at `.claude/agents/ana-learn.md` matches template

Implementation-specific:
- [ ] AC13: CLAUDE.md template includes Learn reference line
- [ ] AC14: Tests pass with `(cd packages/cli && pnpm vitest run)`
- [ ] AC15: No build errors with `pnpm run build`

## Testing Strategy

- **Unit tests:** No unit tests for agent template content. Templates are markdown — they're verified by Verify reading the template and confirming it instructs the agent correctly.
- **Integration tests:** The `AGENT_FILES` constant is used by `copyAgentFiles` in assets.ts. Existing tests for init that verify agent file copying will implicitly cover the new entry — verify that existing init tests still pass with the new array entry. If tests check the exact count or list of agent files, update them.
- **Edge cases:** Check that adding a 6th entry to `AGENT_FILES` doesn't break any tests that assert on the array length or content.

## Dependencies

- `ana proof health`, `ana proof audit`, `ana proof close` commands must exist or Learn's template must include fallback instructions. Health is scoped (proof-health-v1), promote is scoped (proof-promote). Close already exists. Audit already exists. The template includes fallback instructions for commands that aren't available yet.

## Constraints

- The template ships to every team via `ana init`. No Anatomia-specific references (like "proofSummary.ts has 11 findings"). The template instructs the agent to read the data — it never contains the data.
- Template content is copied verbatim — no variable substitution, no conditional content.
- The approval checkpoint is the single most important instruction. Learn must NEVER execute close or promote without explicit developer approval.
- Learn must NOT read build reports or verify reports. Build and Verify independence is a core architectural constraint. Learn reads the proof chain (structured output), not narrative reports.

## Gotchas

- **`ana proof health` doesn't exist yet.** The `health` subcommand is scoped (proof-health-v1) but not built. The template must instruct Learn to detect if the command fails and fall back to reading `proof_chain.json` directly. Same for `promote` — if the command isn't available, suggest manual skill file edits.
- **Frontmatter `model: sonnet` not `model: opus[1m]`.** Every other agent uses `opus[1m]`. Learn deliberately uses `sonnet` for automated session affordability. The scope decision is explicit — don't "fix" it to match the others.
- **No `initialPrompt:` in frontmatter.** Only Setup has `initialPrompt`. Learn doesn't need one — it reads system state at startup and presents findings without a prompt.
- **No `memory: project` in frontmatter.** Only Think (ana.md) has this. Learn's memory IS the proof chain — it doesn't need cross-session memory in the Claude Code sense.
- **The CLAUDE.md template is tiny (5 lines).** Adding one line is the entire change. Don't restructure it or add content beyond the single Learn reference line.
- **`AGENT_FILES` is a `const` array with `as const`.** The type annotation matters. Add the entry as a string literal to match the existing pattern.
- **Scope says registration is in `init/assets.ts` — it's actually in `constants.ts`.** The scope's Complexity Assessment lists `packages/cli/src/commands/init/assets.ts` as the registration file, but `AGENT_FILES` lives in `packages/cli/src/constants.ts`. The spec and contract reference the correct file (`constants.ts`). Verify: note this discrepancy as an upstream finding if you see it — the scope was wrong, the spec is right.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Prefer named exports. No default exports.
- The `AGENT_FILES` array in constants.ts uses `as const` — add the new entry as a string literal matching the existing format.
- Templates are copied verbatim by `ana init`. What's in the template is what every team gets. No variable substitution.
- Dogfood copies in `.claude/agents/` must manually match templates. Copy the template file content exactly.

### Pattern Extracts

**AGENT_FILES registration (constants.ts lines 152-158):**
```typescript
export const AGENT_FILES = [
  'ana.md',
  'ana-plan.md',
  'ana-setup.md',
  'ana-build.md',
  'ana-verify.md',
] as const;
```

**Agent template frontmatter patterns:**
```markdown
# ana-setup.md (closest structural analog):
---
name: ana-setup
model: opus[1m]
description: "Setup orchestrator — calibrates Ana's knowledge with your project's identity, architecture, and values."
initialPrompt: "Set up this project"
---

# ana-verify.md (per-item review pattern):
---
name: ana-verify
model: opus[1m]
description: "AnaVerify — fault-finder and code reviewer. Runs mechanical checks, forms independent findings about the code."
---
```

**CLAUDE.md template (full file):**
```markdown
# Anatomia Project

For features and substantial changes: `claude --agent ana`
To calibrate with your team's knowledge: `claude --agent ana-setup`
```

### Proof Context
No active proof findings for affected files.

### Checkpoint Commands
- After creating the template: `pnpm run build` — Expected: clean build
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 1657+ tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1657 passed, 2 skipped (97 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected 1657 tests (no new test files — template is markdown, code changes are trivial)
- Regression focus: `packages/cli/tests/commands/init.test.ts` or any test that asserts on `AGENT_FILES` length or content

### Template Structure Guide

The template should follow this section order (derived from all five existing agents):

1. **Frontmatter** — `model: sonnet`, `description`, no `skills:`
2. **Identity paragraph** — Learn's disposition: quality gardening. Methodical, evidence-based. Not zealous (doesn't push closures aggressively), not passive (doesn't just list findings).
3. **Pipeline position** — "You are the fifth agent — not in the pipeline, but running alongside it." Explain Learn's relationship to the pipeline without being part of it.
4. **On Startup** — Read ana.json (config, artifact branch, commands), design-principles.md (team values for judging promotion worthiness), discover skill landscape (ls .claude/skills/, check for ENRICHMENT.md to distinguish template from custom). Run `ana proof health --json` and `ana proof audit --json`. Handle fallbacks if commands don't exist.
5. **System Knowledge** — Diagnostic reasoning chains, not exposition. Four capabilities from scope AC3a-AC3d:
   - Knowledge flow through the pipeline (Think → scope → Plan → spec + Build Brief → Build → code → Verify → findings → proof chain). Trace "rule not landing" through this chain.
   - Ownership and mutability (Detected is machine-owned, Rules/Gotchas are human-authored, template skills have ENRICHMENT.md, custom skills don't).
   - How agents consume skills (Plan/Build via frontmatter `skills:` or Build Brief, Verify loads manually, Think loads on demand). Diagnose skill gap vs curation gap vs compliance gap.
   - Proof chain field semantics (severity → priority, suggested_action → what to do, related_assertions → spec quality, modules_touched → staleness reasoning).
6. **Structured Triage** — The primary mode. Processing order: accept-action first (clear the deck), risk-severity findings (deep review with code verification), promote candidates, remaining. Cap ~30 per session. For each finding requiring code verification, read file and code around anchor. Present all suggestions as a complete list before execution.
7. **Suggestion format** — Finding ID, recommendation (close/promote/keep), evidence (what Learn read and found), exact CLI command. Grouped by action type.
8. **Promotion workflow** — Read target skill file's existing rules, draft rule text in the skill's voice, use `ana proof promote {id} --skill {name} --text "{drafted rule}"`. Handle case where promote command doesn't exist yet.
9. **Observation routing** — Developer says "I noticed X". Learn traces: missing skill rule? Existing rule not curated into Build Brief? Build compliance gap? Verify calibration issue? Route to appropriate action.
10. **What You Do NOT Do** — Auto-execute without approval, modify agent definitions, modify source code, run during pipeline run, duplicate mechanical maintenance (file-deleted, anchor-absent), read build/verify reports.
11. **Edge cases** — Empty proof chain (0 runs), all findings actioned, promote command unavailable, observation that's a bug, very large active set (200+), developer rejects 5+ suggestions, inconclusive diagnosis, non-Anatomia project.
12. **Reference** — Context files, commands, skill locations.
