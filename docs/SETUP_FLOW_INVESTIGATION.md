# Setup Flow Investigation — The Climax Decision

**Date:** 2026-04-06
**Source:** S12 dogfood data (30 sub-agents, 43.6 minutes, 65 verified citations), current codebase analysis, 9 locked vault decisions

---

## Part 1: Current Setup — Complete Deconstruction

### The Orchestrator

**Entry point:** `claude --agent ana-setup` — LLM-orchestrated agent session.
**Orchestration:** ana-setup.md reads tier file (setup-quick.md or setup-guided.md), follows a 10-step flow: read state → re-run check → tier selection → explorer → present findings → questions → trade-off review → write → verify → complete.

**What it does:** Reads setup state, presents tier options, delegates to 4 sub-agent types (explorer, question-formulator, writer, verifier).

| Component | What it does | Time cost | Keep/Kill/Redesign |
|-----------|-------------|-----------|-------------------|
| **ana-setup** (orchestrator) | Delegates, presents questions, manages flow | Entire session | **Redesign** — simplify dramatically |

### The Explorer System

**What it does:** ana-explorer (183 lines, Sonnet model) scans 9 areas: project identity, framework, directory structure, patterns, conventions, workflow, testing, debugging, project maturity. Writes `.ana/.setup_exploration.md`.

**S12 dogfood data:**
- 1 explorer sub-agent spawned
- Produced 80+ lines of structured findings
- **Time:** First sub-agent (started at 14:52)

**What the explorer discovered vs what scan.json already knew:**

| Finding | scan.json has it? | Explorer added value? |
|---------|------------------|----------------------|
| Language: TypeScript | ✅ Yes | ❌ No — rediscovered |
| Framework: Commander.js (CLI) | ❌ Partial (null) | ✅ Yes — scan missed CLI framework |
| Monorepo: pnpm, 2 packages | ✅ Yes | ❌ No — rediscovered |
| Conventions: camelCase, ESM | ✅ Yes (deep scan) | ❌ No — rediscovered |
| Git: branch, commits, contributors | ✅ Yes | ❌ No — rediscovered |
| TypeScript strictness: max strict | ❌ No | ✅ Yes — read tsconfig.json deeply |
| Build tool: tsup | ❌ No | ✅ Yes — read tsconfig/tsup config |
| Zod usage for schemas | ❌ No | ✅ Yes — discovered from reading source |
| Tree-sitter WASM migration | ❌ No | ✅ Yes — codebase-specific knowledge |
| Product description from README | ❌ No | ✅ Yes — "Verified AI development" |
| Self-dogfooding nature | ❌ No | ✅ Yes — inferred from repo structure |

**VERDICT: Explorer found ~5 genuinely new things out of ~30 findings.** ~83% of explorer output was re-deriving what scan.json already detected. The 17% that WAS new came from: (1) reading README for product description, (2) reading tsconfig.json deeply, (3) reading specific source files for domain-specific patterns, (4) inferring product nature from structure.

**Keep/Kill/Redesign:** **KILL as a separate sub-agent. Replace with focused file reads in the setup orchestrator.** The orchestrator can Read README.md and 3-5 key files directly. No need for a 183-line agent definition that re-derives scan data.

### The Q&A System

**S12 dogfood: 6 questions + closer + trade-off review.**

| Question | Formulator time | User value | Agent outcome |
|----------|----------------|-----------|---------------|
| Q1: Product description | Sub-agent spawned | **HIGH** — user corrected target audience (YC founders, vibe-coded) | project-overview used this verbatim |
| Q2: Architecture deliberate? | Sub-agent spawned | **MEDIUM** — user confirmed, Ana's guess was 82% right | Confirmed what exploration found |
| Q3: What breaks? | Sub-agent spawned | **HIGH** — user corrected focus (agent reliability > code debt) | debugging.md used this |
| Q4: Deploy/release | Sub-agent spawned | **HIGH** — user corrected (Vercel auto, npm manual) | workflow.md used this |
| Q5: Dev workflow | Sub-agent spawned | **HIGH** — user corrected (no staging branch, CI reference stale) | workflow.md, conventions.md |
| Q6: User flow | Sub-agent spawned | **HIGHEST** — user corrected (4-agent pipeline IS the product, not CLI commands) | architecture.md, project-overview.md |
| Closer | Direct ask | Low — user said "no" | Skipped |
| Trade-off review | Direct ask | **MEDIUM** — 4 findings confirmed | architecture.md trade-offs |

**6 question-formulator sub-agents spawned.** Each reads exploration results + codebase to formulate a guess. Average confidence: 0.84. User corrected 5 out of 6 — meaning the guess was CLOSE but not right. The corrections were the most valuable content in the entire setup.

**VERDICT: The Q&A is the HIGHEST VALUE part of setup.** The corrections — user saying "no, the target is YC founders" or "no, the pipeline IS the product" — are irreplaceable. No scan, no LLM synthesis, no exploration produces this. This MUST survive into the new design.

**Keep/Kill/Redesign:** **KEEP the questions. KILL the formulator sub-agents.** The orchestrator can draft its own guess by reading scan.json + a few files. No need for a separate Sonnet agent per question. The guess doesn't need to be perfect — it just needs to be close enough that the user corrects it specifically.

### The Writer System

**7 writer sub-agents spawned** — one per context file. Each reads: step file (instructions), exploration results, Q&A log, source code directly.

**S12 dogfood output:**

| File | Lines | Writer time | Quality |
|------|-------|-------------|---------|
| project-overview.md | 274 | ~3-4 min | Good — incorporated Q1/Q6 corrections well |
| conventions.md | 510 | ~3-4 min | Bloated — 50%+ was scan data restated as prose |
| patterns.md | 609 | ~3-4 min | Bloated — pattern evidence WITH code blocks was verbose |
| architecture.md | 309 | ~3-4 min | Good — Q2/Q6 corrections created valuable content |
| testing.md | 437 | ~3-4 min | Mixed — framework detection + file locations useful, coverage section thin |
| workflow.md | 446 | ~3-4 min | Good — Q4/Q5 corrections were valuable |
| debugging.md | 406 | ~3-4 min | Weakest — Q3 correction was good but surrounding content was generic |

**Total writer output: 2,991 lines.** Verification found 65 citations, 54 verified, 9 minor mismatches, 0 fabrications.

**What percentage was scan data restated as prose?** Rough estimate: conventions.md (~70% restatement), patterns.md (~60%), testing.md (~50%), debugging.md (~40%). Overall: ~45% of writer output was scan data the agent already had, reformatted as human-readable prose. The remaining ~55% was genuine synthesis: user corrections incorporated, architectural reasoning, cross-file references.

**VERDICT:** The writer produced good quality output (65 citations, 0 fabrications) but was BLOATED. The "deviations only" principle from D6.2 would eliminate ~45% of content. The valuable 55% — user corrections, architecture reasoning, cross-references — is what the new system must preserve.

**Keep/Kill/Redesign:** **KILL as 7 separate sub-agents. In the new system, skills are enriched DIRECTLY (confirm-or-redirect, not rewrite). project-context is the ONE file that needs LLM synthesis.** That's 1 write operation, not 7.

### The Quality Mechanisms

| Mechanism | What it validates | Fires when | Value |
|-----------|------------------|-----------|-------|
| **verify-context-file.sh** | Runs `ana setup check` on written context files | PostToolUse (after every Write) | **HIGH** — catches bad citations in real-time |
| **subagent-verify.sh** | Runs check on the specific file a writer produced | SubagentStop (writer finishes) | **HIGH** — blocks writer completion if quality fails |
| **quality-gate.sh** | Runs full check on ALL context files | Stop (session ending) | **MEDIUM** — final gate, but usually everything passed earlier |
| **ana setup check** | Line counts, headers, placeholders, scaffold markers, citations | On demand | **HIGH** — mechanical quality enforcement |

**The citation verification system is EXCELLENT.** 65 citations checked mechanically. 0 fabrications. The Quote-Then-Write Protocol in the writer agent + PostToolUse hook verification + SubagentStop blocking = a system where fabricated citations literally cannot survive. This is "don't trust prompts, trust software" in action.

**Keep/Kill/Redesign:**
- verify-context-file.sh: **KEEP** — still fires on Write to .ana/context/. Works for 2 files.
- subagent-verify.sh: **REDESIGN** — file list must update to new manifest. If writers are eliminated, this hook fires when the orchestrator writes directly (SubagentStop doesn't apply). May need to become a PostToolUse check instead.
- quality-gate.sh: **KEEP** — still blocks session end if quality fails.
- ana setup check: **REDESIGN** — FILE_CONFIGS must update from 7 files to 2 context files. Skill validation is different (check for required sections, not line counts). May need a separate `ana skill check` or unified validation that handles both types.

### The Framework Snippets

6 framework-specific files (13-25 lines each): django, express, fastapi, generic, go, nextjs.

These provide framework-specific pattern guidance to writers. Example from nextjs.md: "Middleware: `middleware.ts`, API routes: `app/api/*/route.ts`".

**VERDICT:** In the new system, this information goes into skills via stack-aware templates (D6.3). Framework snippets are superseded by the template variant system. **KILL** — content migrates to skill templates.

### Setup Completion

`ana setup complete --mode <tier>` runs 4 validation phases (structural, content, cross-reference, quality), then writes setupMode + setupCompletedAt to ana.json, updates CLAUDE.md with Anatomia section.

**Keep/Kill/Redesign:** **REDESIGN** — validation must match new file manifest. The mechanical flow (validate → update ana.json → update CLAUDE.md) is sound. Only the validation targets change.

---

## Part 2: The Hard Numbers

| Metric | S12 Dogfood | Target for New Design |
|--------|------------|----------------------|
| Total setup time | 43.6 minutes | **<10 minutes** |
| Sub-agents spawned | 30 (15 meta files × 2) | **0-1** (maybe 1 for project-context synthesis) |
| User interaction time | ~8-10 minutes (answering 6 questions + confirming trade-offs) | **~5-8 minutes** |
| Wait time (user idle while agents work) | ~33 minutes | **<2 minutes** |
| Files produced | 7 context files (2,991 lines) | **2 context files + enriched skills** |
| Citation verification | 65 citations, 0 fabrications | **Fewer citations (skills use key-value, not prose), same 0 fabrication rate** |
| Scan data restated as prose | ~45% of output | **0%** — deviations only principle eliminates restatement |

---

## Part 3: What the Dogfood Taught Us

### The Most Valuable Output

**Q6 answer: "The 4-agent pipeline IS the product, not the CLI commands."** This single correction transformed every context file. It changed project-overview from "a CLI tool" to "a pipeline system." It changed architecture from "command modules" to "agent handoff stages." No scan, no exploration, no LLM synthesis can produce this. Only the founder knows what the product actually IS.

### The Biggest Waste

**The explorer sub-agent re-deriving scan data for 5+ minutes.** 83% of its output duplicated what scan.json already provided. The 17% of genuine discovery (README content, tsconfig details, domain-specific patterns) could be captured by the orchestrator reading 3-5 files directly.

**The 7 writer sub-agents reformatting scan data as prose.** 45% of their output was restatement. The valuable 55% came from incorporating user Q&A corrections — which means the VALUE was in the Q&A, not the writing. In the new system, Q&A corrections go directly into skills (## Rules) and project-context, not through a multi-agent prose generation pipeline.

### The Surprising Finding

**Question formulator guesses were 84% accurate on average, but the user corrected 5 of 6.** This means: the guess was CLOSE ENOUGH to prompt a specific correction. "We detected you use feature branches" → "Yes but no staging, main is prod." The guess created the CONTRAST that made the correction specific. Without the guess, the user might have said "we use git" — generic, unhelpful. With the guess, they said "no staging branch, that CI reference is stale" — specific, actionable. **The guess mechanism is the core UX innovation. It must survive.**

---

## Part 4: My Honest Opinions

### 1. Biggest waste of time in current setup

**The writer sub-agents.** 7 agents × 3-4 minutes each = 21-28 minutes of compute time producing 2,991 lines where ~45% was restatement. The "deviations only" principle eliminates the need for prose generation entirely for skills. project-context is the ONE file that benefits from LLM synthesis.

### 2. Most valuable output

**The user corrections on Q1, Q3, Q5, and Q6.** These four corrections changed the system's understanding of: who the target user is (Q1), what the primary frustration is (Q3), the real deployment setup (Q5 correction about staging), and what the product actually IS (Q6). This is irreplaceable human knowledge.

### 3. If I could redesign from scratch

**Phase 1 (30 seconds): Show scan findings.** "We detected TypeScript, pnpm monorepo, Vitest, no framework. 101 source files, 77 tests. Here's what we know. Anything wrong?" User confirms or corrects.

**Phase 2 (60 seconds): Confirm critical config.** "Your default branch appears to be `main`. Your test command is `pnpm run test`. Your deploy method is..." These are the fields that break the pipeline if wrong.

**Phase 3 (2-3 minutes): Confirm skill conventions.** Batch present: "Here are your detected coding conventions: camelCase functions (92%), relative imports, 2-space indent. Standardize on these or change?" Then testing: "Vitest, 77 test files, co-located. Coverage thresholds?" Each skill gets one confirm-or-redirect interaction.

**Phase 4 (3-5 minutes): Generative Q&A for project-context.** The Q1-Q6 questions, but with the orchestrator drafting its own guess from scan.json + README (no formulator sub-agent). User corrects. Orchestrator writes project-context directly.

**Phase 5 (optional, 2-5 minutes): Design principles.** "Do you have design principles or a team philosophy? If so, describe it. If not, skip."

**Phase 6 (30 seconds): Finalize.** Write enriched skills, write project-context, run `ana setup complete`, show summary.

**Total: 8-12 minutes, 0 sub-agents for skill confirmation, maybe 1 for project-context synthesis.**

### 4. Single hardest problem

**The confirm-or-redirect UX for skills.** Showing scan findings and asking "confirm or change?" sounds simple. But the presentation MATTERS. If we show raw data ("camelCase 92%, PascalCase 8%") — the user doesn't know what to do. If we show a prescriptive interpretation ("Standardize on camelCase. PascalCase only for classes and React components.") — we might be wrong and the user rubber-stamps it. The right presentation: show the detection AND the proposed rule, ask if the rule is right. "We found 92% camelCase functions. **Proposed rule:** Use camelCase for all functions. PascalCase for classes and React components. **Correct? Or change?**"

### 5. How much current machinery should survive

| Component | Lines | Verdict |
|-----------|-------|---------|
| ana-setup.md (orchestrator) | 200 | **REWRITE** — simplified flow, no sub-agent delegation |
| ana-explorer.md | 183 | **KILL** — orchestrator reads files directly |
| ana-question-formulator.md | 131 | **KILL** — orchestrator drafts guesses from scan data |
| ana-writer.md | 202 | **KILL** — skills enriched directly, project-context is one write |
| ana-verifier.md | 124 | **KEEP for future** — citation verification still valuable for project-context |
| 8 step files (832 lines) | 832 | **KILL** — writer instructions for files that no longer exist |
| templates.md | 2,903 | **KILL** — examples for a writing system that no longer exists |
| rules.md | 196 | **REDESIGN** — quality rules still apply but for different files |
| SETUP_GUIDE.md | 46 | **REDESIGN** — architecture description changes |
| framework-snippets (6 files) | 121 | **KILL** — content migrates to stack-aware skill templates |
| hooks (4 scripts) | ~200 | **KEEP + REDESIGN** — update file lists, adapt for new flow |
| check.ts | 694 | **REDESIGN** — update FILE_CONFIGS for 2 context files |

**Of ~5,700 lines of setup infrastructure, ~4,500 lines should be killed.** The new setup is simpler: orchestrator reads scan data, presents findings, asks questions, writes directly.

### 6. ana.json confirmation: init time or setup time?

**INIT TIME.** Specifically `artifactBranch`. If the user runs init → immediately runs `claude --agent ana` → scopes work → `ana work start` creates a branch from the wrong base — the first pipeline run fails. The 4-step detection (D1) should get it right 95% of the time, but the 5% where it's wrong causes a bad first experience.

**My recommendation:** Init shows `artifactBranch` in the completion message: "Default branch: `main` (from git remote)." If the user sees it's wrong, they can fix ana.json immediately. This is lighter than a mandatory confirmation prompt and doesn't slow down the happy path.

### 7. Automation vs human input balance

**The dogfood answered this:** 84% accurate guesses that got corrected 5/6 times. The automation should draft, the human should confirm. Neither works alone. Too much automation → wrong assumptions baked in. Too much human input → nobody finishes.

The sweet spot: **scan detects, templates prescribe, user confirms or redirects.** 5-10 minutes of user time. 0 minutes of waiting for agents.

### 8. How to split D10-D12

**D10: Setup Architecture** — The overall flow, phases, ordering, what runs in what order. The "confirm-or-redirect" interaction pattern. How the orchestrator works. Whether sub-agents exist or not. The re-run story.

**D11: Skill Enrichment Flows** — Per-skill: what gets presented, how the user confirms/redirects, what gets written back. The specifics of coding-standards confirmation vs testing-standards confirmation vs ai-patterns generative enrichment.

**D12: Context File Enrichment + Quality Validation** — project-context generative Q&A (the Q1-Q6 questions, now reduced/adapted). design-principles capture. The quality mechanisms (what survives, what's redesigned). `ana setup complete` finalization.

This split respects the gravity: D10 is the architecture (highest stakes — gets the flow right). D11 is the per-skill detail (most volume — 5-8 skills each with their own enrichment). D12 is the human-input capture + quality assurance (most subjective — Q&A design, validation thresholds).
