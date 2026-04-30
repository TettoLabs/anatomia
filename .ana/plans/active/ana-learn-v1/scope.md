# Scope: Ana Learn V1

**Created by:** Ana
**Date:** 2026-04-29

## Intent

The developer wants an agent that maintains the proof chain and helps improve the system. Ana Learn is the fifth agent — not part of Think → Plan → Build → Verify, but running alongside it. Learn reads health and audit data, verifies findings against current code, suggests closures and promotions, and helps the developer route their own observations into permanent system improvements.

This is the agent that closes the loop between "the system records quality data" and "the system acts on quality data." Without Learn, findings accumulate. The developer triages manually. At 50 runs, nobody does it. Learn makes triage sustainable.

Learn ships as a template in `packages/cli/templates/.claude/agents/ana-learn.md`. The template IS the product — every word ships verbatim to every team. This scope defines what the template says and why.

## Complexity Assessment
- **Size:** medium (the template is ~280-320 lines, but every line requires more design judgment than 10 lines of TypeScript)
- **Files affected:**
  - `packages/cli/templates/.claude/agents/ana-learn.md` — the template (NEW)
  - `.claude/agents/ana-learn.md` — dogfood copy for this project (NEW)
  - `packages/cli/src/commands/init/assets.ts` — register the template so `ana init` copies it (minor)
  - `packages/cli/templates/CLAUDE.md` — add Learn to the agent list if referenced
- **Blast radius:** Low for code. High for product. The template ships to every team. A bad instruction produces bad behavior at scale. A good instruction compounds quality at scale.
- **Estimated effort:** One pipeline scope. The code changes are trivial. The template design is the work.
- **Multi-phase:** no

## Approach

Learn's template follows the patterns established by the five existing agents, with two structural differences: it's not in the pipeline (runs between runs), and it has two modes (structured triage and conversational observation routing).

**Identity first.** The opening paragraph defines Learn's disposition the way Verify's opening defines fault-finding. Learn's disposition is quality gardening — tending what's accumulated, pruning what's resolved, promoting what should be permanent. Not zealous (doesn't push closures aggressively), not passive (doesn't just list findings). Methodical and evidence-based.

**System knowledge as reasoning capability, not documentation.** Learn needs to understand the system deeply enough to REASON about it, not just operate within it. When the developer says "Build keeps ignoring ESM imports," Learn needs to trace the knowledge flow: Is the ESM rule in coding-standards? → Does Build load coding-standards? (No — Build reads the Build Brief, curated by Plan from skills.) → Was the rule in the Build Brief? → Is this a skill gap, a Plan curation gap, or a Build compliance issue? That diagnostic chain requires understanding how knowledge moves through the pipeline, how agents consume skills, and what each handoff produces.

The template includes a System Knowledge section — not exposition ("skills have four sections"), but diagnostic reasoning patterns: how knowledge flows through the pipeline, what ownership means (Detected is machine-owned, Rules are human-authored), how to distinguish template skills from custom skills (check for ENRICHMENT.md), what the proof chain fields mean for decision-making (severity guides priority, suggested_action guides what to do, related_assertions reveals spec quality). The knowledge is structured around "what do you need to know to diagnose issues," not "here's a reference manual."

Critically, Learn discovers the installation — it doesn't hardcode it. "Read ana.json for the artifact branch" not "the branch is usually main." "List .claude/skills/ to see what's configured" not "there are 5 skills." The template teaches what to look for. The agent discovers what's there.

**Two modes, one agent.** Structured triage is the primary mode — Learn runs health, runs audit, reviews findings, suggests actions. Conversational routing is the secondary mode — the developer says "I noticed X" and Learn diagnoses where it belongs. The template handles both by starting with triage (the structured work) and being ready for observations (the open-ended work). Not two separate sections with different protocols — one continuous session where the developer can interject observations during triage.

**Suggest, then execute.** Learn presents ALL suggestions before executing ANY. The developer reviews the full picture, approves individually or in batch, then Learn executes. No interleaved suggest-approve-execute cycles — that's exhausting for the developer. Present the list. Get approval. Run the commands.

**The model question.** Sonnet in the frontmatter. Learn reads code and makes judgment calls — Sonnet handles this for automated sessions. For manual sessions, the developer's model applies naturally (Claude Code respects the session model over the frontmatter). The template doesn't need to mention this — it's how Claude Code works.

## Acceptance Criteria

These criteria apply to the TEMPLATE content, not to compiled code. Verification is by reading the template and confirming it instructs the agent correctly.

- AC1: The template has frontmatter with `model: sonnet`, `description` as a one-line summary, and no `skills:` field (Learn loads skills manually based on what it needs for promotion drafting)
- AC2: On startup, Learn reads `.ana/ana.json` (configuration, artifact branch, commands), `.ana/context/design-principles.md` (team values for judging promotion worthiness), and discovers the skill landscape (`ls .claude/skills/`, checking each for ENRICHMENT.md to distinguish template from custom). Then runs `ana proof health --json` and `ana proof audit --json`. The startup builds a mental model of the installation before acting on it
- AC3: The template includes a System Knowledge section that teaches Learn to reason about the system. This is a qualitative criterion — Verify assesses by judgment whether the section enables diagnostic reasoning, not by checking a list. The section must cover these reasoning capabilities:
  - AC3a: How knowledge flows through the pipeline — Think → scope → Plan → spec + Build Brief → Build → code → Verify → findings → proof chain. Learn can trace a "rule not landing" issue through this chain.
  - AC3b: Ownership and mutability — Detected is machine-owned (refreshed by scan), Rules/Gotchas are human-authored, template skills have ENRICHMENT.md alongside SKILL.md, custom skills don't. Learn distinguishes what it can modify from what it shouldn't touch.
  - AC3c: How agents consume skills — Plan/Build via frontmatter `skills:` field, Verify loads manually, Think loads on demand, Build reads curated rules from the Build Brief (not skill files directly). Learn can diagnose whether a rule gap is in the skill, the curation, or the compliance.
  - AC3d: Proof chain field semantics for decision-making — severity guides priority, suggested_action guides what to do, related_assertions connects findings to spec quality, modules_touched enables staleness reasoning.
- AC4: The triage loop processes findings in this order: accept-action first (clear the deck — these are pre-classified closures), then risk-severity findings (deep review with code verification), then promote candidates, then remaining findings. For each finding requiring code verification, Learn reads the file and code around the anchor to verify the issue still applies
- AC5: Suggestions are presented as a complete list before any execution. The template specifies a suggestion format: finding ID, recommendation (close/promote/keep), evidence (what Learn read and found), and the exact CLI command to execute
- AC6: For promote-action findings, the template instructs Learn to read the target skill file's existing rules, draft the rule text in the skill's voice, and use `ana proof promote {id} --skill {name} --text "{drafted rule}"`
- AC7: For accept-action findings, the template instructs Learn to suggest closure with the classification as evidence
- AC8: The template includes instructions for handling human observations: the developer says "I noticed X" and Learn diagnoses the root cause by tracing through the system — is it a missing skill rule, an existing rule not being curated into Build Briefs, a Build compliance gap, or a Verify calibration issue? Learn routes to the appropriate action (draft a rule, note for V2, surface as a gap)
- AC9: The template explicitly lists what Learn does NOT do: auto-execute without approval, modify agent definitions, modify source code, run during a pipeline run, duplicate mechanical maintenance (file-deleted, anchor-absent), read build reports or verify reports (independence constraint)
- AC10: The template specifies the branch requirement: Learn must be on the artifact branch to execute close and promote commands. If on a feature branch, Learn advises switching before executing
- AC11: The template is registered in `init/assets.ts` so `ana init` copies it to `.claude/agents/`
- AC12: The dogfood copy at `.claude/agents/ana-learn.md` matches the template

## Edge Cases & Risks

**Empty proof chain.** Learn runs on a project with 0 pipeline runs. Health returns zeros. Audit returns nothing. Learn should say "No proof chain data yet. Complete pipeline runs to build history. Learn is most useful after 5+ runs." and offer to help with observations instead.

**All findings already classified and actioned.** After Phase E and manual triage, the active set might be small and well-curated. Learn's triage produces zero suggestions. That's fine — Learn reports "All findings reviewed. No actions needed." and offers observation routing.

**Developer wants to promote but no promote command exists yet.** If Learn ships before promote (unlikely given sequencing but possible), Learn should detect that `ana proof promote` isn't available and fall back to: "Promotion candidate identified. The promote command isn't available yet. Consider adding this rule manually to {skill file}."

**Observation that's actually a bug.** Developer says "Build crashed when the test file was missing." That's a bug report, not an observation for the quality system. Learn should recognize this and say "That sounds like a bug — scope it through the pipeline rather than adding a rule."

**Very large active set (200+ findings).** Learn shouldn't review all 200 in one session. The triage order (accept → risk → promote → rest) naturally prioritizes highest-value work. Cap at ~30 findings per session. "Reviewed 30 of 200 active findings. Run Learn again for the next batch."

**Developer rejects most suggestions.** If the developer rejects 5+ suggestions in a session, Learn should pause and ask "I'm getting a lot of rejections — should I recalibrate? What's the pattern in what I'm getting wrong?" This is how the 70% accuracy bar manifests in conversation.

**Diagnostic reasoning is inconclusive.** When Learn traces through the system (rule → Build Brief → Build compliance) and can't determine where the issue is, it should say so: "I checked coding-standards (rule exists at line 22), and the last two specs' Build Briefs (rule was included in one, missing in the other). I'm not sure whether this is a curation inconsistency or Plan making a judgment call to exclude it. Here's what I found — you decide." Honest uncertainty is better than a confident wrong diagnosis.

**Learn runs on a non-Anatomia project.** A project that ran `ana init` but never ran the pipeline. No proof chain. No plans. Skills exist but are defaults. Learn should detect this and be useful anyway — offer to review skill files for quality, check if context files are populated, suggest setup if not complete.

## Rejected Approaches

**System Knowledge as reference documentation.** An early draft imagined the System Knowledge section as a reference manual — "skills have four sections: Detected, Rules, Gotchas, Examples." Rejected because reference documentation teaches nothing about reasoning. The section should be diagnostic reasoning patterns — how knowledge flows through the pipeline, how to trace an issue from finding to root cause, what the proof chain fields mean for decision-making. Not "here's how skills work" but "here's how to diagnose why a skill rule isn't landing."

**Learn produces a report file.** Other agents produce artifacts (scope.md, verify_report.md). Learn could produce learn_report.md. Rejected because Learn's actions ARE the record — `closed_by: 'agent'` in proof_chain.json, `promoted_to` on findings. A separate report duplicates what the chain already records. The conversation IS the session log.

**Exhaustive per-finding review in every session.** Reviewing all 72 active findings in a single session is too long and produces fatigue. The template should prioritize and cap. Accept-action first (quick closures), risk-severity second (highest impact), promote candidates third. Cap at ~30 findings per session.

**Separate triage and observation modes.** Two distinct sections with different startup protocols. Rejected because the modes blend naturally — the developer interjects observations during triage, or starts with an observation and Learn transitions to triage. One session, one agent, one flow.

**Opus as the default model.** Learn reads code and makes judgment calls. Opus would be better. But Learn is the agent most likely to run automatically (Phase 3-4 in the autonomy gradient). Sonnet keeps automated sessions affordable. Manual sessions use the developer's model naturally.

## Open Questions

Design decisions resolved in the F4 requirements session and this scoping conversation. No open questions for Plan.

## Exploration Findings

### Patterns Discovered

- All five agents follow the same template structure: frontmatter → identity paragraph → pipeline position → On Startup → main instructions → boundaries → reference. Learn follows this pattern with adaptations for its non-pipeline position.
- ana-setup.md (644 lines) is the closest structural analog — another meta-aware agent that reads system state, interacts conversationally, and writes to project files. Setup reads scan.json and writes context. Learn reads proof chain and writes to proof chain + skills.
- Verify's template (553 lines) shows how to instruct structured per-item review with evidence requirements. Learn's per-finding triage follows a similar pattern: for each finding → read code → assess → suggest with evidence.
- Build and Verify have explicit "What you do NOT do" sections. Learn needs the same — the boundaries are critical when the agent has broad system knowledge.
- The `skills:` frontmatter field is used by Plan (`[coding-standards, testing-standards]`) and Build (`[git-workflow]`). Verify and Think don't use it. Learn shouldn't use it — Learn loads skills dynamically based on which skill a promotion targets.

### Constraints Discovered
- [OBSERVED] Agent templates in `packages/cli/templates/.claude/agents/` are copied verbatim by `ana init`. No variable substitution, no conditional content. What's in the template is what every team gets.
- [OBSERVED] The template registration in `init/assets.ts` determines which templates are copied. Adding a new template requires adding it to the assets list.
- [OBSERVED] Dogfood copies in `.claude/agents/` must be manually synced with templates. There's no automation — this is by design (the project's copies can diverge from templates during development).
- [OBSERVED] `model: sonnet` in frontmatter is overridden by the session model for interactive use. For automated/scheduled runs, the frontmatter model applies.
- [INFERRED] Learn is the first agent that executes CLI commands that modify project state (close, promote) based on its own judgment rather than a spec. The approval checkpoint is critical — the template must make "suggest then wait" the only path, never "suggest and execute."

### Test Infrastructure
- No unit tests for agent templates. Templates are markdown — they're tested by running the agent and observing behavior. Verification is that the template's instructions produce correct behavior when the agent follows them.
- The pipeline scope through Build and Verify IS the test — Verify reads the template and confirms it instructs the agent correctly.

## For AnaPlan

### Structural Analog
`templates/.claude/agents/ana-setup.md` — the closest match. Both are meta-aware agents that understand the system, interact conversationally, read system state, and write to project files. Setup writes context files from scan data + human input. Learn writes to proof chain + skill files from health/audit data + human input. Both have stepped workflows with user checkpoints.

### Relevant Code Paths
- `packages/cli/templates/.claude/agents/ana-setup.md` — the structural analog. Study the startup sequence, interaction pattern, and how system knowledge is conveyed through operational instructions rather than exposition.
- `packages/cli/templates/.claude/agents/ana-verify.md` — the per-item review pattern. Study how Verify processes each assertion with evidence requirements. Learn's per-finding triage follows the same shape.
- `packages/cli/src/commands/init/assets.ts` — where templates are registered for init copying. Learn needs to be added here.
- `packages/cli/templates/.claude/agents/ana.md` — Think's template. Learn shares Think's meta-awareness. Study how Think understands the pipeline without lecturing about it.

### Patterns to Follow
- Identity paragraph → pipeline position → startup → main work → boundaries → reference (all five agents)
- "What you do NOT do" section with explicit boundaries (Verify, Build)
- Startup reads system state before interacting (all agents read ana.json, scan.json, or work status)
- Evidence requirements on every claim (Verify's "if you haven't run it, you can't claim it passes")

### Known Gotchas
- The template ships to every team. Generic Anatomia-specific references (like "proofSummary.ts has 11 findings") must be parameterized or omitted. The template instructs the agent to read the data — it doesn't contain the data.
- Learn's system knowledge must enable diagnostic reasoning, not recite reference documentation. The difference: "skills have four sections" is a fact. "When a skill rule isn't landing in builds, check whether Plan curated it into the Build Brief — Build reads the Brief, not the skill files directly" is diagnostic reasoning. The System Knowledge section teaches Learn to trace issues through the system, not describe the system's structure.
- The approval checkpoint is the single most important instruction in the template. If the agent executes a close or promote without approval, it's modifying project files unilaterally. The instruction must be unambiguous: present ALL suggestions, wait for approval, THEN execute. No exceptions.
- Learn must handle the case where health or promote commands don't exist yet (project running an older CLI version). Fallback: read proof_chain.json directly, suggest manual skill file edits.
- The template must not instruct Learn to read build reports or verify reports. Build and Verify independence is a core architectural constraint. Learn reads the proof chain (the structured output), not the narrative reports.

### Things to Investigate
- The exact format for the suggestion list. Should it be a markdown table? Numbered list? Grouped by action type? Study how Verify presents its contract compliance table (table format) and setup presents its confirmation lists (indented text). The format should be scannable — the developer approves a batch, not each item.
- How the template handles the transition from structured triage to observation routing. Does Learn explicitly offer? "Triage complete. I can also help route observations you've noticed — anything about the system you'd like to capture?" Or does it just be ready if the developer volunteers? Lean: explicit offer after triage completes.
- The System Knowledge section's diagnostic patterns. The scope names the key flows (knowledge through pipeline, ownership, agent-skill routing, proof chain field semantics). Plan should identify the 5-6 most important diagnostic reasoning chains and write them as operational instructions, not as exposition. Example chain: "Build ignored a rule → check if rule is in the skill → check if Build loads that skill → check if Plan curated it into the Build Brief → diagnosis: skill gap / curation gap / compliance gap."
- How much of the installation Learn discovers at startup vs during triage. Reading ana.json and listing skills at startup is fast. Reading every skill file's Rules section at startup is slow (5 files × 30 lines = 150 lines of context before any triage). Lean: read ana.json and skill directory listing at startup, read individual skill files on demand when a specific promotion or observation requires it.
