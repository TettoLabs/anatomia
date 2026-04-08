# Decision 6 Notes — File Manifest Pre-Work

**Date:** 2026-04-06
**Status:** Research and thinking. Not locked decisions.
**Inputs:** S12 codebase audit, Decision 5 (context architecture), web research on harness patterns, competitive analysis, target customer analysis

---

## Part 1: What the Industry Does

### CLAUDE.md / .claude/ Patterns (Claude Code)
Power users structure CLAUDE.md as a brief project overview (3-5 lines) with links to deeper context. The .claude/ directory holds agents (identity + behavior), skills (expertise + rules), and settings (hooks + permissions). Skills follow the agentskills.io open standard: SKILL.md with frontmatter (name, description) + markdown body + optional reference files. Progressive disclosure: ~100 tokens metadata → <5K tokens body → resources on demand.

**Critical constraint discovered: the ~150 instruction budget.** Frontier LLMs can reliably follow ~150-200 instructions. Claude Code's system prompt consumes ~50, leaving ~100-150 for user rules. Bloated CLAUDE.md/context causes instruction compliance to drop off a cliff. This means: every line in always-loaded context has a cost. Linter-enforceable rules should NEVER be in context files — only knowledge the AI cannot derive from code.

**What power users keep OUT of CLAUDE.md:** Code style rules that linters handle. Embedded docs via @-file refs (eats budget every session). One-time migration instructions.

### .cursorrules / AGENTS.md / Windsurf Patterns
All three tools have converged on the **same 4 activation modes:**
1. **Always On** — loaded every session (like CLAUDE.md)
2. **Glob-based** — auto-triggered when matching files enter context (e.g., `*.test.ts`)
3. **Manual** — user @-mentions the rule
4. **Agent-decided** — AI reads description and decides whether to load

AGENTS.md is now an open standard under the Linux Foundation (supported by Cursor, Windsurf, OpenAI Codex, GitHub Copilot, Factory). Recommended sections: Project Overview, Development Environment, Build & Test Commands, Code Style, Testing, Security. Supports per-directory placement for monorepo scoping.

### Agent Skills Standard (agentskills.io)
The formal open standard, published by Anthropic, adopted by Microsoft, OpenAI, Cursor, GitHub Copilot, Atlassian, Figma. Three-tier progressive disclosure:
- **Tier 1 (~100 tokens):** name + description. Always in context for all skills.
- **Tier 2 (<5,000 tokens, <500 lines):** Full SKILL.md body. Loaded when activated.
- **Tier 3 (on demand):** scripts/, references/, assets/. Loaded only when needed.

Skills support optional directories: `scripts/` (executable), `references/` (docs), `assets/` (templates). Keep SKILL.md under 500 lines. Move detailed reference to separate files.

### Aider CONVENTIONS.md
Single flat file. "Prefer httpx over requests." "Use type annotations." Loaded as read-only context. Community maintains a conventions repo with pre-built files per stack — a pattern library approach worth emulating.

### What the research says about context engineering
- "AI failures are institutional memory failures, not capability failures" (Codified Context paper, arXiv 2026)
- "Shorter prompts (<50 words) had HIGHER success rates than longer ones" — more instructions ≠ better output
- "AI performs dramatically better when it can see patterns to follow rather than creating from abstract descriptions"
- Martin Fowler's harness engineering: "Whenever an issue happens multiple times, improve the harness to prevent it"
- The context that prevents the most failures (priority order): architecture patterns, technology rationales, working code examples, build/test/deploy commands, dependency specs, behavioral guardrails

### Two Complementary Standards Emerging
- **AGENTS.md** (Linux Foundation) = always-loaded project context ("what is this project")
- **Agent Skills** (Anthropic) = on-demand specialized capabilities ("how to do X")
- These map directly to Anatomia's Decision 5: context files (understanding) + skills (expertise)

### Key Takeaway
Every tool converges on the same insight: project-specific context in a structured format dramatically improves AI output. The differentiators are: how structured (flat file vs skill system), how delivered (always-loaded vs on-demand), and how maintained (manual vs scan-enriched).

Anatomia's advantage: we have ALL THREE — structured (skills with frontmatter), delivered (per-agent routing via skills: frontmatter), and maintained (scan-enriched + setup Q&A). Nobody else has this combination.

**The 150-instruction budget and the "shorter is better" research finding reinforce Decision 5's size targets:** context files <200 lines, skills <150 lines. Every line must earn its place.

---

## Part 2: The Target Customer

### Who They Are
YC-tier AI startup founders. Solo or 2-3 person teams. Building AI-native products — not using AI to help build traditional apps, but building products that ARE AI products.

### What They Build
- **RAG pipelines**: Vector DB (Pinecone, Weaviate, pgvector) + embedding model + retrieval + generation
- **AI agents**: MCP servers, tool definitions, multi-step orchestration
- **Chat interfaces**: Streaming responses, conversation history, context management
- **API wrappers**: Anthropic SDK, OpenAI SDK, Vercel AI SDK
- **The standard stack**: Next.js + Supabase/Clerk + Stripe + Vercel. TypeScript. pnpm or bun.

### What Context They Need
1. **Their AI integration patterns.** Which SDK, how they call it, where the prompts live, how they handle streaming, how they manage conversation context. An AI writing code for an AI product needs to know the AI layer intimately.
2. **Their data model.** Prisma schema, Supabase tables, vector store configuration. The relationships between user data and AI-generated content.
3. **Their auth flow.** Clerk/NextAuth/Supabase Auth — how it's wired, what's protected, what's public.
4. **Their deployment pipeline.** Vercel preview deployments, environment variables, feature flags.
5. **Their product vision.** What the product does, who uses it, what the user journey looks like. This is the context that prevents the AI from building features that don't fit.

### What They DON'T Need
- Generic best practices they already know
- Language tutorials (they know TypeScript)
- Framework basics (they know Next.js)
- Enterprise patterns (they're a startup, not a bank)

---

## Part 3: What Makes Each Agent Excellent

### What Makes Think Excellent
Think is a senior engineer who KNOWS this project. Not a generic assistant. The difference between a good Think session and a bad one:

**Good Think:** "You want to add user-facing API keys? Looking at your auth flow — you're using Clerk with row-level security on Supabase. The structural analog is your existing webhook handler. I'd scope this as: new API keys table with Clerk user_id FK, middleware that validates the key before the Clerk session check, and a dashboard page following your existing settings pattern. The edge case is key rotation — your current auth doesn't handle credential invalidation. Want me to scope this?"

**Bad Think:** "Sure, I can help you add API keys. We'll need a database table, some middleware, and a UI. Should I create a scope?"

The difference is: context. Think needs to know the product, the architecture, the patterns, the user journey, the constraints. Think needs design-principles to evaluate tradeoffs. Think needs project-context to understand what fits.

**What Think needs:**
- Design principles (always — shapes HOW it thinks)
- Product context (always — shapes WHAT it proposes)
- scan.json (always — knows the stack)
- Architecture understanding (always — knows boundaries)
- Proof chain (if exists — learns from past cycles)
- Source code access (always — explores on demand)

### What Makes Plan Excellent
Plan turns Think's scope into a spec that makes Build's job mechanical. The difference:

**Good Plan:** "File changes: 3 files. `src/middleware/apiKey.ts` (new, follows express middleware pattern from `src/middleware/auth.ts:15-40`). Test file co-located. Contract: 5 assertions covering CRUD + rotation + expiry. Build Brief: use Prisma for DB ops (project pattern), zod for validation (coding-standards), Vitest with supertest (testing pattern from `tests/api/webhook.test.ts`)."

**Bad Plan:** "Create a middleware file. Add some tests. Use the database."

The difference is: Plan knows the PATTERNS. It knows which existing file to follow. It knows the testing approach. It knows the conventions.

**What Plan needs:**
- Coding standards (always — spec must align with conventions)
- Testing standards (always — test strategy must match team patterns)
- Project context (always — architecture-aware planning)
- Design principles (always — quality bar for spec design)
- scan.json (always — knows the stack)
- The scope from Think (input artifact)
- Source code access (explores structural analogs)

### What Makes Build Excellent
Build executes the spec mechanically. The difference between good and bad Build is fidelity to the spec + adherence to project patterns.

**What Build needs:**
- Git workflow (always — commit format, branching, co-author)
- The spec + contract from Plan (input artifacts)
- Build Brief embedded in spec (curated rules from coding/testing standards)
- coding-standards, testing-standards (on-demand fallback when Build Brief doesn't cover something)
- scan.json (knows the stack — uses right test runner, right build tool)

### What Makes Verify Excellent
Verify independently checks against the contract. It never reads the build report — the developer compares both.

**What Verify needs:**
- Testing standards (always — verification patterns)
- Coding standards (always — code quality checks)
- The contract + spec (input artifacts)
- ana.json commands (runs build/test/lint)
- scan.json (knows the stack)
- Source code + test files (reads everything fresh)

---

## Part 4: The Emergency Fix Gap

The pipeline is Think → Plan → Build → Verify. This is correct for features, refactors, and planned work. It's wrong for:
- Production is down, fix it NOW
- Customer reported a critical bug, patch in 30 minutes
- Tests are failing on main, unblock the team

These need a fast path: diagnose → fix → verify → ship. No scope document. No spec. No contract. Just: find the bug, write the fix, run the tests, push.

**Options:**
1. A dedicated agent (`ana-triage` or `ana-hotfix`) — fast-path pipeline agent
2. A skill that Think can invoke (`/emergency-fix`) — changes Think's behavior to skip scoping
3. Think already handles this — "Debug (light)" mode in Think's prompt routes through Plan→Build→Verify quickly

Current Think prompt has "Debug (light)" at line 149-152: "User has a problem. Investigate by reading debugging.md, tracing the error path... Once found, scope the fix and route through Plan→Build→Verify."

**My assessment:** Think already handles debugging, but it still routes through the full pipeline. For true emergencies, a `/hotfix` skill that changes the pipeline behavior (Build writes a minimal fix + test, Verify does a quick pass, skip the full spec) might be the right approach. This is S14+ — note it, don't design it now.

---

## Part 5: File Inventory Analysis

### Current Context Files (7) — Status Assessment

| File | Lines | Content | Decision 5 Category | Recommendation |
|------|-------|---------|---------------------|----------------|
| project-overview.md | 388 | Product purpose, stack, structure, team, users | Product Understanding | **KEEP** — becomes `project-context.md` |
| architecture.md | 496 | Layers, boundaries, deployment, trade-offs | Product Understanding | **MERGE** into project-context. Architecture IS product understanding. |
| patterns.md | 812 | Error handling, validation, DB, auth, testing patterns with evidence | Prescriptive Expertise | **MOVE** to coding-standards skill. Patterns ARE coding expertise. |
| conventions.md | 836 | Naming, imports, indentation with percentages | Prescriptive Expertise | **MOVE** to coding-standards skill. Conventions ARE coding rules. |
| testing.md | 538 | Framework, coverage, fixtures, mocking, patterns | Prescriptive Expertise | **MOVE** to testing-standards skill. Testing rules ARE testing expertise. |
| workflow.md | 956 | Git process, CI/CD, branching, deploy, release | Prescriptive Expertise | **SPLIT** — git → git-workflow skill, deploy → deployment skill, CI → deployment skill |
| debugging.md | 557 | Known issues, monitoring, error patterns, troubleshooting | Reactive Troubleshooting | **MOVE** to new troubleshooting skill or merge into coding-standards |

### Current Skills (6) — Status Assessment

| Skill | Lines | Content | Assessment |
|-------|-------|---------|-----------|
| design-principles | 63 | Philosophy, taste, values | **MOVE** to .ana/context/ per Decision 5. It's understanding, not expertise. |
| coding-standards | 72 | Naming, imports, error handling (thin — mostly ## Detected section) | **ENRICH** — absorb patterns + conventions content from context files |
| testing-standards | 101 | Framework, test command, file count, coverage | **ENRICH** — absorb testing.md content |
| git-workflow | 89 | Branch, commits, contributors, co-author | **ENRICH** — absorb workflow.md git content |
| deployment | 48 | Platform, build command (thin) | **ENRICH** — absorb workflow.md deploy/CI content |
| logging-standards | 34 | Generic logging best practices | **KEEP or MERGE** — thin, could fold into coding-standards |

### Proposed New Inventory

**Context Files (.ana/context/) — 2 files:**

1. **`design-principles.md`** (~65 lines)
   - Moved from skills. Philosophy, taste, identity.
   - Hand-written by founder. NOT scan-enriched. NOT setup-enriched.
   - Delivered: always-loaded for Think and Plan via initialPrompt.

2. **`project-context.md`** (~150-200 lines)
   - NEW. Consolidates project-overview + architecture.
   - Product purpose, target users, architecture rationale, key decisions.
   - Populated: scan scaffold + LLM enrichment during setup Q&A.
   - Delivered: always-loaded for Think and Plan via initialPrompt.

**Skills (.claude/skills/) — 5-6 skills:**

1. **`coding-standards`** (~120-150 lines)
   - ENRICHED. Absorbs patterns.md + conventions.md content.
   - Naming rules, import conventions, error handling patterns, validation patterns.
   - Populated: scan `## Detected` section + prescribed best practices + setup confirmation.
   - Delivered: on-demand. Plan and Verify always invoke. Build uses Build Brief + fallback.

2. **`testing-standards`** (~100-120 lines)
   - ENRICHED. Absorbs testing.md content.
   - Framework, fixtures, coverage thresholds, mocking patterns, test file organization.
   - Populated: scan `## Detected` section + prescribed best practices + setup confirmation.
   - Delivered: on-demand. Plan and Verify always invoke. Build uses Build Brief + fallback.

3. **`git-workflow`** (~80-100 lines)
   - ENRICHED. Absorbs workflow.md git content.
   - Branching strategy, commit format, PR process, co-author, merge strategy.
   - Populated: scan `## Detected` section + setup confirmation.
   - Delivered: on-demand. Build always invokes.

4. **`deployment`** (~60-80 lines)
   - ENRICHED. Absorbs workflow.md deploy/CI content.
   - Deploy method, CI pipeline, environment management, release process.
   - Populated: scan `## Detected` section + setup confirmation.
   - Delivered: on-demand. Invoked when deploy-related work.

5. **`logging-standards`** (~35-50 lines)
   - KEEP or MERGE into coding-standards. Thin.
   - Output conventions, when to add logging, log levels.
   - Populated: prescribed template per stack. Minimal scan data.
   - Delivered: on-demand. Invoked when adding observability.

6. **`troubleshooting`** (~50-80 lines) — OPTIONAL NEW
   - Absorbs debugging.md content. Known failure modes, workarounds.
   - Populated: setup Q&A ("what breaks?") + manual additions over time.
   - Delivered: on-demand. Invoked when debugging.
   - Could be a context file instead if "what breaks" is understanding not expertise.

---

## Part 6: Enrichment Analysis

### How Each File Gets Populated

| File | Scan (deterministic) | LLM (setup enrichment) | Human (manual) | Confirmed (setup Q&A) |
|------|---------------------|----------------------|----------------|----------------------|
| design-principles | No | No | **Yes — founder writes** | No |
| project-context | Stack, structure, services | Business purpose, architecture rationale | Key decisions | Q1 (product), Q2 (architecture), Q6 (user flow) |
| coding-standards | Naming %, imports, indentation, patterns | Best practices per stack | Team overrides | Q3 (pain points) |
| testing-standards | Framework, test count, test command | Coverage targets, fixture patterns | Team overrides | Confirm threshold |
| git-workflow | Branch, commits, contributors | Branching strategy inference | Team overrides | Q5 (dev workflow) |
| deployment | Platform, CI detection | Deploy process | Team overrides | Q4 (deploy/release) |
| logging-standards | Monitoring services detected | Best practices per stack | Team overrides | No |

### Enrichment Tiers

| Tier | What It Means | Files |
|------|--------------|-------|
| **Deterministic** | 100% from scan data. Copy-paste. No LLM needed. | `## Detected` sections in skills |
| **Prescribed** | Template best practices per detected stack. No LLM needed. | logging-standards body, initial coding-standards body |
| **LLM-enriched** | Needs LLM to synthesize scan data + exploration into prose | project-context body, enriched coding/testing standards |
| **Human-only** | Only the founder can write this | design-principles |
| **Confirmed** | LLM proposes, human confirms or corrects during setup Q&A | Architecture rationale, branching strategy, deploy process |

---

## Part 7: Skill Sizing Analysis

### How Big Should a Skill Be?

The agentskills.io spec recommends:
- **Metadata (~100 tokens):** name + description. Always in context for all agents.
- **Body (<5,000 tokens recommended, <500 lines):** Full content loaded when invoked.
- **Resources (on demand):** Reference files loaded only when needed.

Our current skills are SMALL (34-101 lines). The enriched versions would be 80-150 lines. This is well within the recommended range.

### Token Budget Consideration

When an agent invokes a skill, the full body loads into context. If Plan invokes coding-standards (150 lines ≈ 600 tokens) + testing-standards (120 lines ≈ 500 tokens) + reads project-context (200 lines ≈ 800 tokens), that's ~1,900 tokens of context. On a 200K context window, that's <1%. Negligible.

The problem is NOT token budget. The problem is SIGNAL quality. A 150-line skill with high-signal, project-specific content is more valuable than a 500-line skill with generic padding. Every line must earn its place (design principle: "Every character earns its place").

---

## Part 8: Confidence Levels

### Very High Confidence (90%+)

1. **Two context files are sufficient.** design-principles + project-context. Everything else is expertise (skills) or machine data (scan.json). The 7 context files were a legacy design from before skills existed as a first-class delivery mechanism.

2. **Skills should absorb pattern/convention/testing content from context files.** coding-standards should contain naming conventions, error handling patterns, and validation patterns — not just a thin `## Detected` section. These are "how to do" prescriptions, not "what exists" descriptions.

3. **The enrichment pipeline is: scan → scaffold → (optional) setup Q&A → team editing.** Skills start with deterministic scan data, get optionally enriched during setup, and can be manually edited by the team. This pipeline is already partially built.

4. **Each agent has a clear, distinct context profile.** Think needs philosophy + product understanding. Plan needs technical standards + product understanding. Build needs git workflow + spec. Verify needs testing + coding standards + contract. These don't overlap much.

### High Confidence (75-85%)

5. **coding-standards becomes the primary enriched skill.** It absorbs patterns, conventions, and is the most frequently invoked skill across agents. It's the skill that most benefits from scan enrichment.

6. **project-context consolidates project-overview + architecture.** These are the same concern — "what is this project and how is it structured." The user's Q1 (product purpose), Q2 (architecture rationale), and Q6 (user journey) all feed into one context file.

7. **logging-standards should merge into coding-standards.** At 34 lines, it doesn't justify its own skill. Logging conventions are coding conventions.

### Medium Confidence (60-70%)

8. **Whether troubleshooting/debugging deserves its own file.** It's reactive expertise (Decision 5 Category 4). But it's thin, rarely invoked, and might just be a section in coding-standards or a future feature when scan detects known problem patterns.

9. **Whether deployment deserves its own skill or merges into git-workflow.** Deploy and git are deeply connected for small teams (git push → auto-deploy). But they serve different agents at different times.

10. **The exact format of the `## Detected` section.** Should it be structured (key-value pairs) or prose? Structured is more deterministic but less readable. Prose is more useful but harder to generate consistently.

### Lower Confidence (50%)

11. **Whether initialPrompt is the right delivery mechanism for context files.** It's documented and logical, but untested. If it doesn't work reliably, we fall back to prompt-based "read these files" instructions — which is what we have today.

12. **Whether the `/hotfix` fast-path is needed in S13 or can wait.** The gap is real — Think routes everything through the full pipeline. But the current "Debug (light)" mode in Think might be sufficient if the developer simply tells Think to scope a small fix.

---

## Part 9: Open Questions for Decision 6

1. **Should the `## Detected` section in skills be removable during setup enrichment?** Currently it's appended. During setup, the LLM writer could REPLACE it with richer content. Or should detected data persist as a separate section?

2. **How do we handle monorepo skill scoping?** A monorepo with packages/api (Express) and packages/web (Next.js) needs different coding standards per package. Claude Code supports per-directory skills. Should we scaffold per-package skills during init?

3. **What's the migration path from 7 context files to 2?** Users who ran init before S13 have 7 context files. `ana init --force` would regenerate with the new structure. But what about the enriched content they added during setup? We need a migration that preserves user-confirmed content while restructuring files.

4. **Should scan.json omit null Phase 1 fields from JSON output?** Decision 2 adds ~15 null fields. Omitting them from output (but keeping them in the TypeScript interface) keeps the JSON clean while preserving forward compatibility.

5. **What's the right size for project-context?** If it consolidates project-overview (388 lines) + architecture (496 lines), the combined content is ~884 lines — far over the 200-line target for context files. Heavy editing is needed. The key: project-context should be the ESSENCE, not the detail. Scan.json has the detail. project-context has the meaning.
