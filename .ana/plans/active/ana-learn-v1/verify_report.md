# Verify Report: Ana Learn V1

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-29
**Spec:** .ana/plans/active/ana-learn-v1/spec.md
**Branch:** feature/ana-learn-v1

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/ana-learn-v1/contract.yaml
  Seal: INTACT (hash sha256:fd1a6192459d7fdb55866c258f1fdf75efae5f945d7ffab756067439078d0a0a)

  A001  ✗ UNCOVERED  "Learn agent uses Sonnet model for affordable automated sessions"
  A002  ✗ UNCOVERED  "Learn agent has a description summarizing its role"
  A003  ✗ UNCOVERED  "Learn agent does not declare skills in frontmatter because it loads them dynamically"
  A004  ✗ UNCOVERED  "Learn reads the project config file on startup"
  A005  ✗ UNCOVERED  "Learn reads design principles to judge promotion worthiness"
  A006  ✗ UNCOVERED  "Learn discovers installed skills by listing the directory"
  A007  ✗ UNCOVERED  "Learn checks for enrichment files to distinguish template from custom skills"
  A008  ✗ UNCOVERED  "Learn runs the health command for proof chain overview"
  A009  ✗ UNCOVERED  "Learn runs the audit command to see active findings"
  A010  ✗ UNCOVERED  "Learn understands how knowledge flows through the pipeline from scope to proof chain"
  A011  ✗ UNCOVERED  "Learn can distinguish machine-owned content from human-authored content"
  A012  ✗ UNCOVERED  "Learn understands how agents consume skills differently"
  A013  ✗ UNCOVERED  "Learn knows proof chain field semantics for decision-making"
  A014  ✗ UNCOVERED  "Learn processes accept-action findings first before other categories"
  A015  ✗ UNCOVERED  "Learn presents all suggestions before executing any actions"
  A016  ✗ UNCOVERED  "Learn reads the target skill file before drafting a promotion rule"
  A017  ✗ UNCOVERED  "Learn suggests closing accept-action findings with classification as evidence"
  A018  ✗ UNCOVERED  "Learn can diagnose where an observation belongs in the system"
  A019  ✗ UNCOVERED  "Learn is explicitly prohibited from auto-executing without approval"
  A020  ✗ UNCOVERED  "Learn does not read build reports or verify reports"
  A021  ✗ UNCOVERED  "Learn requires the artifact branch for executing close and promote commands"
  A022  ✗ UNCOVERED  "Learn template is registered so init copies it to new projects"
  A023  ✗ UNCOVERED  "The project's own Learn agent matches the template"
  A024  ✗ UNCOVERED  "The CLAUDE.md template tells developers how to run Learn"

  24 total · 0 covered · 24 uncovered
```

Seal: INTACT. All 24 assertions UNCOVERED by tagged tests — expected per spec ("Templates are markdown — they're verified by Verify reading the template and confirming it instructs the agent correctly"). Manual verification follows.

Tests: 1733 passed, 2 skipped. Build: clean (cached). Lint: 0 errors, 14 warnings (pre-existing).

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Learn agent uses Sonnet model for affordable automated sessions | ⚠️ HUMAN OVERRIDE | Template line 2: `model: opus[1m]`. Contract says `sonnet`. Developer explicitly overrode this decision during build — accepted as-is. |
| A002 | Learn agent has a description summarizing its role | ✅ SATISFIED | Template line 3: `description: "Ana Learn — quality gardener. Triages findings, promotes rules, routes observations."` |
| A003 | Learn agent does not declare skills in frontmatter | ✅ SATISFIED | Template lines 1-4: frontmatter contains only `name`, `model`, `description`. No `skills:` field. |
| A004 | Learn reads the project config file on startup | ✅ SATISFIED | Template line 29: `Read \`.ana/ana.json\`` |
| A005 | Learn reads design principles to judge promotion worthiness | ✅ SATISFIED | Template line 36: `Read \`.ana/context/design-principles.md\`` |
| A006 | Learn discovers installed skills by listing the directory | ✅ SATISFIED | Template line 40: `List \`.claude/skills/\` to see what skill files are configured` |
| A007 | Learn checks for enrichment files to distinguish template from custom skills | ✅ SATISFIED | Template line 41: `check whether an \`ENRICHMENT.md\` file exists` |
| A008 | Learn runs the health command for proof chain overview | ✅ SATISFIED | Template line 49: `Run \`ana proof health --json\`` |
| A009 | Learn runs the audit command to see active findings | ✅ SATISFIED | Template line 51: `Run \`ana proof audit --json\`` |
| A010 | Learn understands how knowledge flows through the pipeline | ✅ SATISFIED | Template line 84: `Did Plan curate it into the Build Brief?` — full diagnostic chain at lines 80-88 |
| A011 | Learn can distinguish machine-owned content from human-authored | ✅ SATISFIED | Template line 91: `**Detected sections** in skill files are machine-owned` |
| A012 | Learn understands how agents consume skills differently | ✅ SATISFIED | Template line 102: `load skills listed in their frontmatter \`skills:\` field` |
| A013 | Learn knows proof chain field semantics for decision-making | ✅ SATISFIED | Template line 117: `**\`suggested_action\`** (promote / scope / monitor / accept)` |
| A014 | Learn processes accept-action findings first | ✅ SATISFIED | Template line 128: `### Phase 1: Accept-Action (Clear the Deck)` — first phase in triage order |
| A015 | Learn presents all suggestions before executing any actions | ✅ SATISFIED | Template line 166: `Present ALL suggestions as a complete list before executing any actions` |
| A016 | Learn reads the target skill file before drafting a promotion rule | ✅ SATISFIED | Template line 207: `ana proof promote {ID} --skill {skill-name} --text "{drafted rule}"` and line 201: `Read the target skill file` |
| A017 | Learn suggests closing accept-action findings with classification as evidence | ✅ SATISFIED | Template line 133: `suggest closure with the classification as evidence` and line 183: `Command: ana proof close {ID} --reason "{reason}"` |
| A018 | Learn can diagnose where an observation belongs in the system | ✅ SATISFIED | Template line 215: `## Observation Routing` — full diagnostic chain at lines 220-234 |
| A019 | Learn is explicitly prohibited from auto-executing without approval | ✅ SATISFIED | Template line 249: `## What You Do NOT Do` and line 251: `Never run \`ana proof close\`, \`ana proof promote\`... without the developer explicitly approving` |
| A020 | Learn does not read build reports or verify reports | ✅ SATISFIED | Template line 256: `**Read build reports or verify reports.**` listed as prohibited |
| A021 | Learn requires the artifact branch for close and promote commands | ✅ SATISFIED | Template line 240: `Close and promote commands modify the proof chain, which lives on the artifact branch` |
| A022 | Learn template is registered so init copies it to new projects | ✅ SATISFIED | `packages/cli/src/constants.ts` line 158: `'ana-learn.md'` in `AGENT_FILES` array |
| A023 | The project's own Learn agent matches the template | ✅ SATISFIED | `diff` between template and `.claude/agents/ana-learn.md` produces zero output — byte-identical |
| A024 | The CLAUDE.md template tells developers how to run Learn | ✅ SATISFIED | `packages/cli/templates/CLAUDE.md` line 3: `To maintain and improve quality: \`claude --agent ana-learn\`` |

## Independent Findings

**Prediction resolution:**
1. **Confirmed — then overridden:** Model is `opus[1m]` not `sonnet`. Developer explicitly instructed the builder to use `opus[1m]`. Contract A001 technically mismatches but this is a human decision, not a builder defect.
2. **Not found:** Template is 298 lines — within the 280-320 spec guidance.
3. **Not found:** Dogfood copy is byte-identical (zero diff).
4. **Not found:** All 8 edge cases from scope are present in the Edge Cases section (lines 258-275).
5. **Not found:** `as const` preserved, string literal `'ana-learn.md'` matches pattern.

**Over-building check:** No extra files, no extra exports, no unused functions. The change set is exactly 4 files as specified. No scope creep.

**YAGNI check:** Grepped for exports in new files — template files are markdown, not code. The only code change is one string literal in an existing array. Nothing unused.

## AC Walkthrough

- **AC1:** Template has frontmatter with `model` (overridden to opus[1m] by developer), `description` as one-line summary, no `skills:` field → ✅ PASS
- **AC2:** On startup, Learn reads `.ana/ana.json` (line 29), `design-principles.md` (line 36), discovers skills via `ls .claude/skills/` (line 40), checks `ENRICHMENT.md` (line 41), runs `ana proof health --json` (line 49) and `ana proof audit --json` (line 51) → ✅ PASS
- **AC3:** System Knowledge section (lines 76-120) includes knowledge flow with Build Brief (AC3a), ownership/mutability with Detected (AC3b), agent skill consumption with frontmatter (AC3c), proof chain semantics with suggested_action (AC3d) → ✅ PASS
- **AC4:** Triage order: accept-action Phase 1 (line 128), risk/debt Phase 2 (line 137), promote Phase 3 (line 149), remaining Phase 4 (line 157). Code verification instructions at line 140-141. → ✅ PASS
- **AC5:** Suggestion Format section (lines 165-192): complete list with ID, recommendation, evidence, CLI command. "Present ALL suggestions as a complete list before executing any actions" (line 166). → ✅ PASS
- **AC6:** Promotion Workflow (lines 197-211): reads target skill file (line 201), drafts rule in skill's voice (line 205), uses `ana proof promote` command (line 207), handles missing command (line 210). → ✅ PASS
- **AC7:** Accept-action closure: "suggest closure with the classification as evidence" (line 133), `ana proof close` command (line 183). → ✅ PASS
- **AC8:** Observation Routing section (lines 215-234): 5-step diagnostic chain from missing rule → existing rule not landing → design principle → bug → architectural concern. → ✅ PASS
- **AC9:** "What You Do NOT Do" section (lines 248-256): auto-execute without approval, modify agent definitions, modify source code, run during pipeline run, duplicate mechanical maintenance, read build/verify reports — all 6 prohibitions present. → ✅ PASS
- **AC10:** Branch Requirement section (lines 239-244): checks current branch, compares to artifact branch from ana.json, prompts before executing. → ✅ PASS
- **AC11:** `AGENT_FILES` in `packages/cli/src/constants.ts` line 158: `'ana-learn.md'` added as 6th entry, `as const` preserved. → ✅ PASS
- **AC12:** `diff` between `packages/cli/templates/.claude/agents/ana-learn.md` and `.claude/agents/ana-learn.md` returns empty — identical. → ✅ PASS
- **AC13:** `packages/cli/templates/CLAUDE.md` line 3: `To maintain and improve quality: \`claude --agent ana-learn\`` → ✅ PASS
- **AC14:** Tests pass: 1733 passed, 2 skipped (up from baseline 1657). → ✅ PASS
- **AC15:** Build clean, no errors. → ✅ PASS

## Blockers

No blockers. Checked: no unused exports in new code (only code change is a string literal in an existing array), no unhandled error paths (template is markdown), no external state assumptions (template discovers its environment at runtime), no spec gaps requiring undocumented decisions.

## Findings

- **Upstream — Contract A001 value overridden by developer:** `packages/cli/templates/.claude/agents/ana-learn.md:2` — Contract specifies `model: sonnet` but developer instructed builder to use `opus[1m]`. Contract should be updated on next seal to reflect the actual decision. Not a defect.

- **Upstream — Scope lists wrong registration file:** Scope's Complexity Assessment says `packages/cli/src/commands/init/assets.ts` but `AGENT_FILES` lives in `packages/cli/src/constants.ts`. Spec corrected this. No impact on the build — noting for scope quality awareness.

- **Code — Promotion workflow references generic skill path:** `packages/cli/templates/.claude/agents/ana-learn.md:201` — Template says "Read the target skill file at `.claude/skills/{name}/SKILL.md` (or whatever the skill file is named)." Actual skill files in this project use names like `coding-standards.md`, not `SKILL.md`. The parenthetical hedge "(or whatever the skill file is named)" saves it, but the primary path hint will mislead on first read. The agent will adapt at runtime by listing the directory, so this is cosmetic.

- **Test — No tagged test coverage for template assertions:** All 24 assertions are UNCOVERED by `@ana` tagged tests. This is by design — the spec says "No unit tests for agent template content. Templates are markdown — they're verified by Verify reading the template." The spec's testing strategy is intentional, but it means the contract/pre-check machinery provides zero automated regression protection for template content. If someone modifies the template in a future branch, pre-check won't catch assertion violations.

## Deployer Handoff

Clean merge. The branch adds:
- One new agent template (`ana-learn.md`) — 298 lines of markdown
- One dogfood copy (identical to template)
- One string literal added to `AGENT_FILES` in `constants.ts`
- One line added to `CLAUDE.md` template

No code logic changes. No test changes needed (existing tests pass with the 6th AGENT_FILES entry). The model is `opus[1m]` per developer override — if the intent was truly `sonnet` for cost reasons, change line 2 of the template before merging.

## Verdict
**Shippable:** YES

23 of 24 contract assertions satisfied by manual verification. A001 (model: sonnet) is a deliberate developer override — the implementation uses opus[1m] by explicit instruction. All 15 acceptance criteria pass. No regressions (1733 tests, up from 1657 baseline). Build and lint clean. The template is well-structured, covers all spec requirements, and follows existing agent template patterns faithfully.
