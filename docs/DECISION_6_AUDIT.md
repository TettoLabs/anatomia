# Decision 6 Audit — Full Scrutiny

**Date:** 2026-04-06
**Auditor:** CC instance that executed S12 (full codebase access, 24 commits, 10+ hours in the code)

---

## Part 1: The Routing Table (6.10)

### What's Strong

The overall shape is correct. Think and Plan get understanding (context files). Build gets execution expertise (git-workflow). Verify gets verification standards (testing/coding). The independence principle for Verify — no build report, no design-principles — is the smartest design decision in the table.

The Plan preloading of coding-standards and testing-standards via `skills:` frontmatter is right. During S12, I watched Plan write specs that embedded Build Briefs with testing conventions. Every spec needs this. On-demand invocation would work but preloading eliminates the chance Plan forgets.

### Cell-by-Cell Disagreements

**Think × api-patterns: Currently "—". Should be "📖 on-demand".**
Reason: Think scopes API features regularly for our target audience. When Think says "the structural analog is your webhook handler" it needs to know the API conventions. "—" means Think can't even reach for it. On-demand lets Think invoke it when scoping API work.

**Think × coding-standards: Currently "📖 rare". Should be "📖 on-demand".**
Reason: "Rare" implies Think almost never needs it. But when Think estimates complexity ("this touches the validation layer across 4 routes"), knowing the validation pattern (zod vs joi vs custom) changes the estimate. On-demand is the right framing — Think invokes when the task warrants it, which is more than "rare."

**Think × testing-standards: Currently "📖 rare". Should be "📖 on-demand".**
Same reasoning. Think's scope includes "Estimated effort" and "Edge Cases & Risks." Knowing the test infrastructure (co-located vs separate directory, fixture patterns, mock approach) makes these assessments better.

**Plan × troubleshooting: Currently "—". Should be "📖 on-demand".**
Reason: This is a real gap. If troubleshooting contains "WASM fails in npx temp directories — degrade gracefully" and Plan is writing a spec for scan features, Plan should include preventive assertions. Known failure modes should inform spec design. On-demand is sufficient — Plan won't always need it, but when the feature touches a known pain point, it's valuable.

**Build × coding-standards and testing-standards: Currently "📖 fallback". Should be "📖 on-demand".**
Reason: "Fallback" implies Build tries the Build Brief first and only loads skills if the Brief is insufficient. In practice during S12, Build just invoked skills when the task matched, regardless of whether the Brief existed. The Build Brief is a bonus optimization, not a gating mechanism. Framing these as "on-demand" is more honest about how agents actually behave.

**Verify × deployment: Currently "—". Should be "📖 on-demand".**
Reason: Edge case but real. If the contract has assertions about deployment (e.g., "Dockerfile updated with new env var"), Verify needs deployment conventions to check them properly. If the contract doesn't mention deployment, Verify never invokes the skill. On-demand handles both cases at zero cost.

### Routing Changes I'd NOT Make

**Think × design-principles: Keep ✅ always.** Even when Think is debugging or doing walkthroughs (not just scoping), the philosophy shapes approach. "Verified over trusted" affects how Think investigates bugs. "Surface what matters" affects what Think reports. "Curated context over raw exploration" affects how Think navigates. Always-loaded is correct.

**Plan × design-principles: Keep ✅ always.** Not redundant with Think's scope. Plan makes DESIGN decisions — which patterns to follow, how to decompose, what tradeoffs to accept. The spec IS a design artifact. "Each agent makes the next agent's job easier" directly affects spec quality (include gotchas, write Build Brief). "Verified over trusted" → more contract assertions.

**Verify × design-principles: Keep "—".** Verify checks the contract, not whether the feature fits the product vision. That's Think's job. Independence is the feature. Adding philosophy would bias Verify toward confirming the design intent rather than objectively testing the implementation.

**Verify × proof_chain: Keep "—".** Past verification results could help Verify spot regressions, but they could also bias assessment — looking for problems that already happened rather than fresh evaluation. Independence wins.

**Build × context files: Keep "—".** Build has the spec. If the spec is thin, that's a Plan quality problem, not a Build routing problem. Adding context files to Build blurs the line between "Build executes" and "Build thinks." Build thinking is Plan's job.

---

## Part 2: scan.json

### What Concerns Me

scan.json IS in the current agent prompts. Every pipeline agent prompt says "Read `.ana/scan.json` if it exists." But the routing table says "NOT in the routing table." This is a documentation gap that creates confusion. The table should reflect reality.

### What I'd Change

Add scan.json to the routing table:

| Source | Think | Plan | Build | Verify |
|--------|-------|------|-------|--------|
| scan.json | 📖 on-demand | 📖 on-demand | 📖 on-demand | 📖 on-demand |

Rationale: Before setup enriches project-context, scan.json is the richest project facts source. After setup, most content is distributed to skills and context files, but scan.json still has unique data: monorepo package list, external services, blind spots, file counts, deployment platform, schema details. Any agent CAN read it, and the prompts already tell them to. Make the routing table match reality.

However: scan.json should NOT be ✅ always-loaded. It's large (19 top-level keys) and most content is distributed. On-demand for all agents when they need factual precision is the right mode.

### Is scan.json harmful?

Potentially stale. If scan.json was generated at init and the project has changed significantly, it contains outdated data. The `lastScanAt` field in ana.json (Decision 1) helps agents judge freshness. But an agent reading stale scan.json without checking `lastScanAt` could make wrong assumptions. The routing should note: "agents should check ana.json.lastScanAt before relying on scan.json for time-sensitive facts."

---

## Part 3: The Full Manifest (6.1)

### What's Strong

The typical manifests table is the best proof the design works. 7 files for a CLI tool, 10 for an AI Next.js app. Clean, justified, no bloat.

### What Concerns Me

**troubleshooting as core:** A stub skill with empty Gotchas helps nobody on day 1. The value is the CONVENTION — "put failure modes here" — but a convention with no content doesn't help agents. Counter-argument: the cost is ~100 tokens in description. That's nothing. And the first time a user documents a failure mode, the skill starts compounding. The convention is worth the empty slot.

**My call:** Keep it core. The cost is negligible. The compounding value is real. But be honest in documentation: "troubleshooting starts empty and grows over time."

**deployment as core for our audience:** Most YC projects are `git push → Vercel`. A 15-line deployment skill that says "Platform: Vercel, deploy: auto on push to main, previews: auto on PR" is still useful. It tells Build where to check if CI fails. It tells Plan whether the feature needs deployment consideration. 15 lines is fine. Core is correct.

**data-access as v1 conditional:** I previously recommended deferring to v2. Looking at it again — our target audience (AI + Next.js + Prisma) almost always has a database. And the failure mode (inconsistent database access patterns — sometimes Prisma client directly, sometimes service layer, sometimes raw SQL) is one of the most common AI code generation problems. If we're shipping ai-patterns and api-patterns, data-access is the natural third conditional. Ship all three.

**auth-patterns deferred:** Still agree. Auth libraries are opinionated. The project-specific parts (which routes are protected, RBAC model) are 5-10 lines in api-patterns or project-context.

---

## Part 4: Content Principles (6.2-6.5)

### What's Strong

"Deviations only" (6.2) is the highest-leverage decision in the entire vault. It prevents every skill from becoming a restated tutorial. The exclusion list (linter-enforceable rules, generic best practices, code snippets) is correct.

### What Concerns Me

**Is "deviations only" too aggressive?** There's one case where restating a default has value: when the team has CONFIRMED the default is intentional and agents should not deviate. Example: "We use 2-space indentation" is a default. But if the team explicitly confirmed it during setup, the CONFIRMATION adds signal. However: the `## Detected` section already captures this. "Indentation: 2 spaces (100%)" says "this is the pattern." If Rules says nothing about indentation, the agent infers "follow the detected pattern." Only if the team wants to CHANGE from the detected pattern does a Rule need to exist. "Deviations only" is correct. Detected implicitly confirms intent for observed patterns.

**Stack-aware templates (6.3) — how many variants for v1?** Realistically for v1: one "TypeScript" template set covering Next.js + Vitest + pnpm (our primary audience). Python, Go, etc. should be driven by actual user demand. Don't build 20 template variants before anyone uses the product. The PRINCIPLE (skills must be stack-aware) is locked. The IMPLEMENTATION (how many variants) is v1 scope.

**ai-patterns format (6.4):** Does it need a different format than Detected/Rules/Gotchas/Examples? No. Its Detected would be: "AI SDK: Anthropic (Claude SDK)", "Streaming: yes", "Prompt location: src/lib/prompts/". Its Rules would be: "All LLM calls through src/lib/ai.ts wrapper", "Use structured output for extraction tasks." Same format works. The conditional skills don't need special treatment.

**Complex detections in one line (6.5):** Works for most cases. "Error handling: 3 patterns — try/catch (60%), custom AppError (30%), HTTPException (10%)" fits one line. For very complex detections (e.g., convention analysis with 5 subcategories), multiple lines under the same heading work: one line per subcategory. The principle (structured, not prose) holds.

---

## Part 5: Context File Decisions (6.6-6.7)

### What's Strong

project-context sections (6.6) are well-chosen. "What This Project Does" captures the founder knowledge no scan produces. "Architecture" captures the reasoning tour. "Key Decisions" captures the chosen-vs-rejected tradeoffs. "Key Files" gives agents instant navigation. "Active Constraints" prevents agents from touching things they shouldn't.

### What Concerns Me

**Missing section: Domain Vocabulary.** For AI products, terms like "embedding", "chunk", "retrieval", "agent", "tool call" have specific meanings in context. A customer's "agent" might be their product (an AI agent they're building), not the Anatomia pipeline agent. A "## Domain Vocabulary" section (5-10 terms, 10-15 lines) in project-context prevents AI from using generic interpretations. This was mentioned in the 6.1 content description ("domain vocabulary") but not reflected in the 6.6 section spec. I'd add it as a 6th section.

**design-principles delivery via initialPrompt (6.7):** Untested. The fallback (prompt-based instruction) works ~90% of the time based on S12 observation. The risk is manageable — if initialPrompt fails, Think still reads design-principles most of the time via prompt instruction. It just might occasionally miss it, which is the current behavior anyway.

---

## Part 6: Enrichment and Q&A (6.8-6.9)

### What's Strong

"Skills are usable from init alone without setup" is correct and validated by S12. During the dogfood, the pipeline ran on Anatomia with only scan-scaffolded skills (no setup enrichment). The agents referenced Anatomia-specific context (TypeScript, pnpm, Vitest) in their work. Not perfect, but functional. This is the S11 insight that the vault correctly preserves.

### What Concerns Me

**ai-patterns needs generative enrichment, not just confirm-or-redirect.** "Describe your prompt management approach" is a generative question. The confirm-or-redirect split from 6.9 doesn't cleanly apply to all skills. ai-patterns specifically might need 1-2 generative questions during setup: "How do you manage prompts?" and "How do you handle LLM errors?" This doesn't break the principle — it refines it. The generative questions are for context files AND for skills whose content can't be inferred from scan alone.

**Template rules might be wrong for specific projects.** A TypeScript template that prescribes "ESM imports, no default exports" is wrong for a legacy CommonJS project. The "deviations only" principle mitigates this (fewer rules = fewer wrong rules), but the rules that ARE scaffolded must be defensible defaults. The mitigation: setup's confirm-or-redirect catches wrong assumptions ("We detected ESM imports, but your project uses CommonJS — confirm or redirect?"). If the user skips setup, the template rules stand. They should be conservative — only include rules where the detected stack strongly implies the convention.

---

## Part 7: Overall Coherence

### Do Decisions 1-6 form a coherent system?

Yes. The data flow is clear:
1. `analyzeProject()` → scan.json (Decision 2/3)
2. scan.json → ana.json operational config (Decision 1)
3. scan.json → skills ## Detected sections (Decision 6)
4. scan.json + LLM + human Q&A → project-context (Decision 6)
5. Skills + context files → agents via routing table (Decision 5/6)

No contradictions found between decisions.

### Conflicts?

One tension (not a conflict): Decision 5 says "context files default to always-loaded." Decision 6.10 routes design-principles as always-loaded for Think and Plan, but project-context as always-loaded for Think and Plan too. That's 2 context files × 2 agents = 4 always-loaded file reads at startup. For Think this is ~250 lines (~1,000 tokens). Manageable. But if context files grow beyond the 200-line target, this becomes significant. The size limit in 6.6 is the safeguard.

### Would this help a YC founder with an AI-native Next.js app?

Yes. Having ai-patterns that knows their prompt management approach, coding-standards with their deviations, project-context with their architecture rationale, and design-principles with their taste — this makes every Think session dramatically better than generic Claude Code. The "what does this product do and who uses it" context alone transforms Think from "sure, I can help" to "looking at your auth flow with Clerk and your vector store, here's how I'd approach this."

### Single biggest risk?

**Template quality at v1.** The prescribed `## Rules` sections in skills are the first thing users see after init. If they contain wrong assumptions (ESM for a CJS project, Vitest patterns for a Jest project, REST conventions for a GraphQL API), the user's first impression is "this tool doesn't understand my project." The 6.3 stack-awareness principle mitigates this, but the v1 template set must be carefully validated against real projects.

### Single biggest missed opportunity?

**No "onboarding" context.** When a new team member joins and runs `claude --agent ana`, Think having a "here's how this project works, here's where to start, here's what the current priorities are" section would be immediately valuable. project-context's "Active Constraints" partially covers this but it's framed as limitations, not orientation. A "## Getting Started" or "## New Engineer Guide" section in project-context would serve double duty: helping new humans AND helping agents understand the project for the first time.

---

## Summary of Recommended Changes

### Routing Table (6.10) — 6 cell changes:

| Change | From | To | Impact |
|--------|------|-----|--------|
| Think × api-patterns | — | 📖 on-demand | Think can scope API features with convention awareness |
| Think × coding/testing-standards | 📖 rare | 📖 on-demand | Think gives better complexity estimates |
| Plan × troubleshooting | — | 📖 on-demand | Plan includes preventive assertions for known failure modes |
| Build × coding/testing-standards | 📖 fallback | 📖 on-demand | Honest framing — Build invokes when task matches |
| Verify × deployment | — | 📖 on-demand | Verify can check deployment-related contract assertions |

### Add scan.json to routing table:

All agents: 📖 on-demand. Matches current agent prompt reality. Note: check `lastScanAt` for freshness.

### project-context format (6.6) — add Domain Vocabulary:

6th section: `## Domain Vocabulary` — 5-10 project-specific terms with their meanings in this context. ~10-15 lines. High value for AI products where terms are overloaded.

### Content principle refinement (6.9):

Note that some conditional skills (especially ai-patterns) may need 1-2 generative questions during setup, not just confirm-or-redirect. The Q&A principle should accommodate skill-specific generative enrichment as an exception, not a violation.

### Everything else: holds up under scrutiny. Ship it.
