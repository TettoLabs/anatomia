# Agent Context Consumption Investigation

**Date:** 2026-04-06
**Verified against:** source code on main, Claude Code docs (code.claude.com)

---

## Context Delivery Mechanisms

### How Agents Get Context

There are 6 mechanisms through which an agent receives context:

| Mechanism | How It Works | Automatic? | Agent Controls? |
|-----------|-------------|-----------|----------------|
| **Agent definition** | Markdown body becomes the system prompt. Replaces default CC system prompt entirely. | Yes — loaded at session start | No — fixed per session |
| **CLAUDE.md** | Project CLAUDE.md files load through normal message flow alongside the agent prompt | Yes — always loaded | No |
| **Skills** | Skill descriptions loaded into context. Full content loads when invoked (by agent or user). | Descriptions: yes. Full content: on invocation. | Yes — agent decides when to invoke `/skill-name` |
| **Preloaded skills** | `skills:` frontmatter field injects FULL skill content at startup. No invocation needed. | Yes — injected at startup | No — defined in frontmatter |
| **initialPrompt** | `initialPrompt:` frontmatter field auto-submits as first user turn. Can reference skills/commands. | Yes — runs once at session start | No — defined in frontmatter |
| **Direct file reads** | Agent uses Read/Grep/Glob tools to read files during execution | No — agent decides | Yes — agent chooses what to read |

### Key Findings from Documentation

1. **Skill descriptions are ALWAYS in context** (unless `disable-model-invocation: true`). Claude sees all skill names and descriptions, then decides which to invoke based on relevance to the current task. Descriptions are truncated to 250 chars in the listing.

2. **Skills can be preloaded per agent.** The `skills:` frontmatter field injects full skill content at startup:
   ```yaml
   ---
   name: my-agent
   skills:
     - coding-standards
     - testing-standards
   ---
   ```
   This is KEY — it means we can declare exactly which skills each pipeline agent gets.

3. **Subagents do NOT inherit skills from parent.** Skills must be explicitly listed in frontmatter.

4. **`initialPrompt`** auto-submits as first user turn. Commands and skills are processed. This could be used to trigger context loading: `initialPrompt: "/design-principles"` would auto-load that skill.

5. **No `context:` or `files:` frontmatter field exists** for auto-loading specific files. Agents must use Read tool to load files, as instructed by their prompt.

6. **`paths:` field exists on skills** (not agents) — limits when a skill auto-activates based on file patterns. Not useful for agent context control.

### How Skills Are Invoked

Claude decides to invoke a skill when:
- The skill description matches the current task/conversation
- The agent prompt explicitly says to invoke it (e.g., "Invoke `/coding-standards`")
- The user types `/skill-name`

Skills NOT invoked when:
- `disable-model-invocation: true` is set (user-only)
- Skill tool is denied via permissions

### Can We Restrict Skills Per Agent?

**Yes, three ways:**

1. **`skills:` frontmatter preloading** — inject specific skills at startup. Subagents only get listed skills.
2. **`disallowedTools: Skill(deploy)`** — deny specific skills via agent frontmatter or settings.
3. **Prompt instructions** — "Do NOT load /deployment. Do NOT load /design-principles."

The most reliable is `skills:` frontmatter preloading for `--agent` sessions. For subagents, skills must be explicitly listed (they don't inherit from parent).

---

## Per-Agent Context Profile

### Ana Think (`ana.md`)

**Identity:** "Your project-aware thinking partner. Scopes, decomposes, navigates, advises, routes."

**Files explicitly referenced in prompt:**
- `.ana/scan.json` — "if exists, read it and USE its findings" (line 49)
- `.ana/PROOF_CHAIN.md` — "if exists, read it" (line 50)
- `.ana/context/project-overview.md` — "Read in full" (line 53)
- `.ana/context/architecture.md` — "Read in full" (line 54)
- `.ana/context/patterns.md` — "on demand" (line 59)
- `.ana/context/conventions.md` — "on demand" (line 60)
- `.ana/context/testing.md` — "on demand" (line 61)
- `.ana/context/workflow.md` — "on demand" (line 62)
- `.ana/context/debugging.md` — "on demand" (line 63)
- `.ana/plans/active/` — "Check for pending work" (line 69)
- `.ana/plans/completed/` — "reference what previous cycles touched" (line 332)

**Skills explicitly referenced in prompt:**
- `/design-principles` — "Always invoke before scoping" (line 353)
- `/coding-standards`, `/testing-standards` — mentioned as NOT for Think ("for Plan, Build, Verify")

**Observed S12 behavior:**
- Loaded: design-principles skill, project-overview.md, architecture.md, ana.json, scan.json, used Explore subagent

**Gap:** Think's prompt says to invoke `/design-principles` always, but doesn't use the `skills:` frontmatter to preload it. The agent must discover and invoke it at runtime, which is unreliable.

**No frontmatter skill preloading. No initialPrompt.**

---

### Ana Plan (`ana-plan.md`)

**Identity:** "The architect. Reads scope, produces implementation spec."

**Files explicitly referenced in prompt:**
- `.ana/scan.json` — "if exists, read it" (line 33)
- `.ana/PROOF_CHAIN.md` — "if exists, read it" (line 34)
- `.ana/context/project-overview.md` — "Read in full" (line 37)
- `.ana/context/architecture.md` — "Read in full" (line 38)
- Other context files — "on demand" (line 40)
- `.ana/plans/active/{slug}/scope.md` — the input artifact

**Skills explicitly referenced in prompt:**
- `/coding-standards` — "always invoke" (line 64)
- `/testing-standards` — "invoke before writing test strategy" (referenced elsewhere in prompt)

**Observed S12 behavior:**
- Loaded: testing-standards, coding-standards, project-overview.md, architecture.md, scope from Think

**Gap:** Plan's prompt tells it to invoke coding-standards and testing-standards, but doesn't preload them. Same reliability issue as Think.

**No frontmatter skill preloading. No initialPrompt.**

---

### Ana Build (`ana-build.md`)

**Identity:** "The builder. Reads spec, produces working code, tests, and build report."

**Files explicitly referenced in prompt:**
- `.ana/scan.json` — "if exists, read it" (line 33)
- `.ana/PROOF_CHAIN.md` — "if exists, read it" (line 34)
- `.ana/plans/active/{slug}/spec.md` — the input artifact
- `.ana/plans/active/{slug}/contract.yaml` — for assertions
- `.ana/plans/active/{slug}/plan.md` — for multi-phase sequencing

**Skills explicitly referenced in prompt:**
- `/git-workflow` — "invoke before any work" (line 37-38)
- `/coding-standards`, `/testing-standards` — "read the Build Brief first, invoke full skill only if needed" (lines 39-41)
- `/design-principles` — "Do NOT load" (line 43)
- `/deployment` — "Do NOT load" (line 43)

**Observed S12 behavior:**
- Loaded: git-workflow, read spec/contract/plan

**Gap:** Build's "Build Brief" concept — the spec contains curated rules from coding/testing standards so Build doesn't need to load the full skills. This is a smart context optimization but relies on Plan embedding the brief correctly.

**No frontmatter skill preloading. No initialPrompt.**

---

### Ana Verify (`ana-verify.md`)

**Identity:** "Fault-finder and code reviewer. Runs mechanical checks, forms independent findings."

**Files explicitly referenced in prompt:**
- `.ana/scan.json` — "if exists, read it" (line 61)
- `.ana/PROOF_CHAIN.md` — "if exists, read it" (line 62)
- `.ana/plans/active/{slug}/contract.yaml` — "Read the Contract" (line 66)
- `.ana/plans/active/{slug}/spec.md` — "Read the Spec" (line 68)
- `.ana/ana.json` — "project config" (line 73)

**Skills explicitly referenced in prompt:**
- `/testing-standards` — for verification standards
- `/coding-standards` — for checking code quality

**Critical design:** Verify NEVER reads the build report. The developer compares Build's report vs Verify's report — two independent accounts.

**Observed S12 behavior:**
- Loaded: testing-standards, coding-standards, spec, contract, build-report (for the build_report it reads code directly, not the report)

**Gap:** Same as others — skills referenced in prompt but not preloaded via frontmatter.

**No frontmatter skill preloading. No initialPrompt.**

---

## Mechanical Questions

### Can we auto-load files per agent?

**No direct mechanism.** There is no `files:` or `context:` frontmatter field that auto-loads specific files into an agent's context at startup.

**Workarounds:**
1. **`initialPrompt`** — could be set to read files: `initialPrompt: "Silently read .ana/scan.json, .ana/context/project-overview.md, and .ana/context/architecture.md before responding."` This auto-submits as the first user turn.
2. **Prompt instructions** — current approach. The agent prompt says "Read these files" and the agent executes Read tool calls.
3. **Skills as context carriers** — a skill could contain extracted/summarized context, preloaded via `skills:` frontmatter.

### Can we restrict skills per agent?

**Yes.** Three mechanisms:

1. **`skills:` frontmatter** — preload specific skills. For `--agent` sessions, this injects full content at startup. Other skills are still discoverable but not pre-loaded.
2. **`disallowedTools`** — deny `Skill(specific-skill)` via frontmatter or settings.
3. **Prompt instructions** — "Do NOT invoke /deployment" (current approach, unreliable).

**The `skills:` frontmatter is the most powerful mechanism we're NOT using.** It would guarantee each agent gets exactly the skills it needs, injected at startup, without relying on the agent to discover and invoke them.

### Is there a frontmatter mechanism for context declaration?

**Not for files.** But `skills:` + `initialPrompt` together could achieve file-level context control:
- `skills:` preloads domain knowledge (coding-standards, testing-standards)
- `initialPrompt:` triggers file reads (scan.json, context files)

### How does Claude Code decide which skills to invoke?

1. All skill descriptions (up to 250 chars each) are loaded into context at session start
2. Claude matches the description against the current conversation topic
3. If a match is strong enough, Claude uses the Skill tool to load the full content
4. The full content is then available in the conversation context

Skills with `disable-model-invocation: true` are NOT in the description listing — Claude can't see them at all unless the user types `/skill-name`.

---

## The Opportunity: What We Should Change

### Current State (Prompt-Based Context Loading)

Every agent has instructions in its prompt saying "read these files" and "invoke these skills." The agent then decides whether and when to follow those instructions. This is **unreliable** — the agent might skip a skill invocation, read files in the wrong order, or forget to check scan.json.

### Proposed State (Declarative Context Loading)

Use `skills:` frontmatter to guarantee skill loading. Use `initialPrompt:` to guarantee file reads. The agent definition becomes a declarative context contract, not a hope.

| Agent | `skills:` (preloaded) | `initialPrompt:` (auto-read files) |
|-------|----------------------|-----------------------------------|
| **Ana Think** | design-principles | "Read .ana/scan.json and .ana/context/project-overview.md silently. Run `ana work status`." |
| **Ana Plan** | coding-standards, testing-standards | "Read .ana/scan.json, .ana/context/project-overview.md, .ana/context/architecture.md silently. Run `ana work status`." |
| **Ana Build** | git-workflow | "Read .ana/scan.json silently. Run `ana work status`." |
| **Ana Verify** | testing-standards, coding-standards | "Read .ana/scan.json silently. Run `ana work status`." |

Build gets ONLY git-workflow preloaded. coding-standards and testing-standards come from the Build Brief in the spec (Plan's job to embed). This is the current design intent, made mechanical.

### What This Changes

1. **Skills are guaranteed, not hoped for.** Think ALWAYS has design-principles. Plan ALWAYS has coding-standards + testing-standards. No more "invoke /coding-standards" instructions that might be skipped.

2. **Startup context is deterministic.** Every agent reads scan.json and checks work status automatically. No reliance on the agent following prompt instructions.

3. **Agent definitions become contracts.** The frontmatter declares WHAT the agent needs. The prompt declares HOW the agent behaves. Separation of concerns.

4. **Skill restriction is mechanical.** Subagents only get listed skills — they can't accidentally load deployment skills during a build. This is cleaner than "Do NOT load /deployment" instructions.

### What This Doesn't Change

- Agents still use Read tool to load context files on demand (patterns.md, workflow.md, etc.)
- Agents still make decisions about which additional context to read based on the task
- The prompt still guides behavior — skills + initialPrompt handle the minimum guaranteed context

### Risk

`initialPrompt` is processed as the first user turn. If it triggers too many reads, it could consume significant context before the user's actual message arrives. Keep it minimal — scan.json + one context file + work status. Let the agent load more on demand.
