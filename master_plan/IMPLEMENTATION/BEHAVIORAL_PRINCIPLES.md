# Anatomia Behavioral Principles

**Purpose:** Locked-in rules for AI behavior, mode semantics, and federation boundaries
**Status:** Non-negotiable design invariants
**For:** Implementation reference, AI orientation, preventing framework creep

---

## Core Philosophy: Opinionated Infrastructure

**Anatomia is opinionated infrastructure, not a framework.**

### What This Means

**We encode strong behavioral norms:**
- Read context before acting
- Respect mode boundaries
- Human authority for governance
- Explicit federation (not ambient)

**We do NOT execute or orchestrate:**
- No routing logic
- No state machines
- No auto-switching
- No workflow engines

**The test (use this forever):**

| Question | If YES → | If NO → |
|----------|----------|---------|
| Does this teach "how to think"? | ✅ Infrastructure (add it) | ❌ Framework (don't add) |
| Does this dictate "what to do next"? | ❌ Framework (don't add) | ✅ May be OK |

---

## Principle 1: Mode Switching is Human-Only

**Rule:** AI cannot switch modes. Only humans can.

### What AI May Do

**Suggest a switch (explicitly):**
```
"This request requires implementation.
I am currently in architect mode (design only).

To implement, reference:
@.ana/modes/code.md Implement the design above"
```

**Provide the exact command to use.**

### What AI Must NOT Do

❌ **Auto-switch:**
```
"I'm now switching to code mode..."
[AI assumes it's in code mode]
```

❌ **Implicit switching:**
```
[AI in architect mode]
"Here's the design... and here's the code:"
[Violates mode boundary]
```

❌ **Soft switching:**
```
"Since you also want implementation, I'll do both..."
[Ignores mode constraints]
```

### Why This Rule Exists

**Mode switching is a governance boundary:**
- Changes the constraints AI operates under
- Changes what AI is allowed to produce
- Changes safety model

**Only humans may change governance.**

**Like:**
- Git branches (human switches via `git checkout`)
- TypeScript compiler flags (human sets in tsconfig.json)
- Docker containers (human switches via `docker run`)

**Governance is human-controlled. This keeps Anatomia infrastructure.**

---

## Principle 2: Modes Are Behavioral Contracts

**Rule:** Modes are contracts, not suggestions. AI must follow mode constraints.

### The 4-Layer Contract Structure

**Every mode has:**

**Layer 1: Purpose**
- One sentence: why this mode exists

**Layer 2: Outputs**
- What artifacts this mode produces
- What format (code, docs, diagrams, ADRs)

**Layer 3: Delegation**
- What this mode does NOT handle
- Where to switch for those tasks

**Layer 4: Hard Constraints**
- 3-5 explicit prohibitions
- Matter-of-fact tone (not adversarial)
- Behavioral boundaries (what must not happen)

### Example (Architect Mode)

```markdown
## Purpose
System design and architecture decisions

## Outputs
- ADRs
- Diagrams
- Design proposals

## Delegation
- Code implementation → code mode
- Debugging → debug mode

## Hard Constraints
- Do not modify code files in this mode
- Do not implement the proposed design
- Propose designs, delegate implementation
```

### Why Constraints Are Explicit

**LLMs optimize for task completion:**
- Will "helpfully" implement while designing (violates mode boundary)
- Will cross boundaries to be thorough (breaks separation)
- Will infer permissions from pre-training (inconsistent)

**Explicit constraints prevent this:**
- "Do not modify files in architect mode" is unambiguous
- AI knows the line, doesn't cross it
- Behavior is predictable

**This isn't adversarial. It's clarity.**

---

## Principle 3: Federation is Explicit, Not Ambient

**Rule:** Cross-node queries are visible and intentional, never background.

### Query Execution Model

**MVP2 (Conservative - Start Here):**
```markdown
All queries require human approval:

Claude: "I need auth-service's JWT pattern.

         Shall I query?
         ana query auth-service 'JWT refresh pattern'

         [y/N]"
```

**MVP3+ (Progressive Relaxation - If Validated):**
```markdown
Query types with different rules:

1. Local keyword queries:
   - May be autonomous (with announcement)
   - Config: ana config set query.local autonomous
   - Default: ask mode
   - Example: "Querying auth-service... ✓ Found (87ms)"

2. Semantic queries (LLM-powered):
   - Always require approval (costs money, uses user's API key)
   - Example: "Semantic search available. Approve? [y/N]"

3. Public node queries (cross-internet):
   - Always require approval (network activity, trust verification)
   - Example: "Query nextjs.org/.ana/? [y/N]"
```

### Why Queries Must Be Visible

**Federation crosses boundaries:**
- Codebase boundaries (different services)
- Ownership boundaries (different teams)
- Trust boundaries (especially public nodes)

**Invisible queries break:**
- Predictability (user doesn't know what context AI has)
- Privacy (unclear what's being accessed)
- Trust (feels like AI is going rogue)

**Visibility preserves infrastructure nature:**
- Like `git fetch` (explicit, visible)
- Unlike `git status` (ambient, always-on)

### The Telephone Analogy

**`ana query` is like calling another team:**
- You can give AI phone access (autonomous local queries)
- But AI announces: "Calling auth team..." (visible)
- For external calls (public nodes): "Call Stripe's API docs? [y/N]" (approval)

**Not like:** AI silently reading files in the background (ambient context)

---

## Principle 4: ENTRY.md is Orientation, Not Orchestration

**Rule:** ENTRY.md orients AI, doesn't route execution.

### What ENTRY.md Contains

**Allowed (declarative):**
- ✅ What .ana/ folder contains
- ✅ List of available modes
- ✅ Core principles (read-first, human authority)
- ✅ How to use federation (suggest ana query)
- ✅ Safety guidelines (propose before implementing)

**Not Allowed (imperative):**
- ❌ "First check if task is architectural, if yes load architect mode"
- ❌ "Step 1: analyze, Step 2: plan, Step 3: execute"
- ❌ Conditional logic (if/then statements)
- ❌ Routing trees (check A, then B, then C)
- ❌ State tracking (current mode: X)

### Size Discipline

**Hard limit: 80 lines**

If ENTRY.md exceeds 80 lines, you're adding framework logic. Stop.

**Valid reasons to approach limit:**
- Complex federation (10+ nodes to list)
- Project has unusual safety requirements

**Invalid reasons:**
- Adding workflow steps (remove them)
- Adding routing logic (framework territory)
- "Being thorough" (be concise)

### The Test

**Before adding to ENTRY.md, ask:**

"Does this help AI understand WHAT the environment is?"
→ ✅ Add it

"Does this tell AI WHAT TO DO in this environment?"
→ ❌ Don't add it (put in modes instead)

---

## Principle 5: Hard Constraints Are Facts, Not Restrictions

**Rule:** Constraints should feel matter-of-fact, not adversarial.

### Good Constraint Language

**❌ Adversarial (Don't use):**
```markdown
You are FORBIDDEN from modifying files in architect mode.
You MUST NOT implement code.
NEVER write implementation code here.
You are PROHIBITED from making changes.
```

**✅ Matter-of-fact (Use this):**
```markdown
## Hard Constraints

- Do not modify files directly in this mode
- Do not implement code changes
- Propose designs; switch to code mode for implementation

(These constraints ensure architecture remains a design phase.)
```

**The difference:**
- First: Scolding, emotional, treats AI like adversary
- Second: Professional, clear, explains WHY

**Tone guidelines:**
- Use "Do not X" (simple imperative)
- NOT "You must not X" (accusatory)
- NOT "You are forbidden from X" (adversarial)
- NOT "NEVER X" (aggressive)

**Add brief explanation:**
"(These constraints ensure [purpose])" after the list.

---

## Principle 6: Teaching Beats Restricting

**Rule:** Teach WHEN to use tools through examples, not just WHAT tools exist.

### Bad Approach (Just Listing)

```markdown
Available tools:
- ana query <node>
- ana broadcast
```

### Good Approach (Teaching)

```markdown
## When to Use ana query

✅ **Good reasons:**
- User asks about specific service patterns
- Need current API contracts
- Integrating with another service

❌ **Bad reasons:**
- General questions (use pre-training)
- Info in local context files already
- Exploratory browsing

**Examples:**

✅ ana query auth-api "What's the token refresh endpoint?"
   (Specific to our implementation)

❌ ana query auth-api "What is token refresh?"
   (General knowledge - don't waste query)
```

**This teaches judgment, not just syntax.**

### Apply to All Tools

- Modes: Teach when each mode is appropriate
- Queries: Teach when to query (not just how)
- Broadcasts: Teach when to notify (not just mechanics)

**Result:** AI makes better decisions because it understands context and purpose.

---

## Principle 7: Propose Before Implementing (Large Changes)

**Rule:** Large changes require proposal + approval before execution.

### What Qualifies as "Large"

**Explicit definition (put this in ENTRY.md and modes):**

- >100 lines of code
- New dependencies or frameworks
- Architecture modifications
- Database schema changes
- API contract changes
- Breaking changes

### The Workflow

**AI must:**
1. Identify: "This is a large change"
2. Propose: "Here's my approach: [explain]"
3. Wait: Get user confirmation
4. Implement: Only after approval

**Example:**
```
Claude: This requires adding a new authentication system.

Proposed approach:
1. Add JWT library (jsonwebtoken)
2. Create auth middleware
3. Update all protected routes
4. Add refresh token handling

This is ~200 lines across 5 files.

Shall I proceed? [y/N]
```

**Why this works:**
- Gives user checkpoint
- Prevents wasted work (if approach is wrong)
- Maintains human authority
- Professional workflow

---

## Principle 8: Mode Boundaries Are Strict

**Rule:** Each mode has a specific purpose. Stay within it.

### Boundary Violations to Prevent

**Architect mode:**
- ❌ Writing implementation code (that's code mode)
- ✅ Writing design docs, ADRs, diagrams

**Code mode:**
- ❌ Redesigning architecture (that's architect mode)
- ✅ Implementing within existing architecture

**Debug mode:**
- ❌ Adding features while fixing bugs (that's code mode)
- ✅ Finding and fixing bugs only

**Docs mode:**
- ❌ Implementing features to document them (that's code mode)
- ✅ Documenting existing features

**Test mode:**
- ❌ Implementing the feature being tested (that's code mode)
- ✅ Writing tests for existing or planned features

### How AI Should Handle Boundary Pressure

**When user asks for something outside mode:**

```
User: @.ana/modes/architect.md Design and implement auth

Claude: "I can design the auth system in architect mode.

For implementation, we'll need to switch to code mode:
@.ana/modes/code.md Implement the auth design above

Shall I design it first?"
```

**AI splits the task, suggests the right sequence, waits for human to control mode transitions.**

---

## Principle 9: .ana/ is Source of Truth

**Rule:** .ana/ knowledge supersedes pre-training when they conflict.

### Conflict Resolution

**If .ana/ says one thing, pre-training says another:**

**Trust .ana/ first:**
```
.ana/context/patterns.md: "We use custom Result<T> type for error handling"
Pre-training: "Python typically uses try/except"

AI should: Use Result<T> (project-specific trumps general knowledge)
```

**Verify from .ana/:**
```markdown
When uncertain about project patterns:
1. Check .ana/context/patterns.md
2. Check .ana/context/conventions.md
3. Check .ana/context/main.md
4. If still unclear, ask the user
5. Don't guess based on pre-training
```

### Why This Matters

**Pre-training is general. .ana/ is specific.**

**Pre-training knows:** How most FastAPI apps handle errors
**.ana/ knows:** How THIS FastAPI app handles errors

**Always prefer specific over general.**

---

## Principle 10: Human Authority is Final

**Rule:** When in doubt, ask. Don't infer, don't assume, don't optimize for speed.

### Decision Hierarchy

**1. Explicit instruction (highest authority):**
```
User: "Use try/except for this"
AI: [Does exactly that, even if .ana/ suggests Result<T>]
```

**2. .ana/ contracts (second authority):**
```
.ana/modes/architect.md: "Do not implement code"
AI: [Doesn't implement, even if user request is ambiguous]
```

**3. Pre-training (lowest authority):**
```
AI: [Only uses pre-training when user + .ana/ are silent on the topic]
```

### When to Ask vs Decide

**Ask when:**
- Ambiguous request
- Multiple valid interpretations
- Safety-critical decision
- Large change without clear approval

**Decide when:**
- Request is crystal clear
- .ana/ provides explicit guidance
- Small, safe, reversible change

**Default:** When uncertain, ask. Better to slow down than break things.

---

## Implementation Rules (For Code)

### Rule: No Mode Switching Logic in Code

**❌ Don't build this:**
```typescript
function selectMode(userRequest: string): Mode {
  if (containsArchitectureKeywords(userRequest)) return 'architect';
  if (containsDebuggingKeywords(userRequest)) return 'debug';
  return 'code';
}
```

**That's framework logic. Human selects mode by referencing it.**

### Rule: No State Tracking

**❌ Don't build this:**
```typescript
interface Session {
  currentMode: 'architect' | 'code' | 'debug';
  previousMode: string;
  modeHistory: Mode[];
}
```

**Modes are stateless. Each is self-contained.**

### Rule: No Auto-Execution

**❌ Don't build this:**
```typescript
async function autoQuery(context: string) {
  if (needsAuth) await query('auth-service', 'patterns');
  if (needsProducts) await query('products-api', 'endpoints');
}
```

**Queries are explicit (human or AI announces, doesn't silently execute).**

---

## Mode Contract Template (Lock This In)

**Every mode must follow this structure. No exceptions.**

```markdown
# [Mode Name] Mode

**Purpose:** [One sentence]

---

## What This Mode Produces

- [Primary output]
- [Secondary output]

---

## What This Mode Delegates

- **[Task]** → Switch to `[mode]` mode

---

## Typical Workflow

1. [Step]
2. [Step]

---

## Hard Constraints

- Do not [action]
- Do not [action]

(These constraints ensure [purpose].)

---

[Mode-specific content...]
```

**Sections are mandatory:**
- Purpose (one sentence)
- Outputs (what it produces)
- Delegation (what goes elsewhere)
- Hard Constraints (3-5 explicit rules)

**Sections are optional:**
- Typical Workflow
- Examples
- Project-specific patterns

**If a mode doesn't fit this structure:** Rethink if it's actually needed.

---

## Federation Query Rules

### Query Visibility (Non-Negotiable)

**All queries must be visible to the user.**

**Options:**

**A. Announce before executing (autonomous):**
```
Claude: "Checking auth-service for JWT patterns..."
        [Executes: ana query auth-service "JWT"]
        ✓ Found in exports.md (91ms)

        Based on the pattern...
```

**B. Ask permission (conservative):**
```
Claude: "I recommend querying auth-service:

         ana query auth-service 'JWT refresh pattern'

         [y/N]"
```

**Never silent (forbidden):**
```
Claude: [Silently executes query]
        [Uses result]
        [User has no idea it happened]
```

### Query Type Rules (Different Risk Levels)

**Local keyword queries (low risk):**
- File read from local sibling node
- <100ms, free, offline
- **May be autonomous** (with announcement) in MVP3+
- Default MVP2: Ask permission

**Semantic queries (medium risk):**
- Uses user's API key
- Costs ~$0.01, 2-5 seconds
- **Always require approval**
- Must show cost and model being used

**Public node queries (higher risk):**
- HTTP request to external server
- Trust verification needed
- **Always require approval**
- Must show which public node and what's being fetched

---

## ENTRY.md Design Rules

### Mandatory Sections

1. **Environment declaration** ("This uses Anatomia")
2. **What .ana/ contains** (folder structure)
3. **How to use** (workflow basics)
4. **Modes available** (list + one-line descriptions)
5. **Core principles** (read-first, mode-bound, human authority)
6. **Federation** (if enabled - how to query)

### Forbidden Content

- ❌ Execution steps ("Step 1, Step 2, Step 3")
- ❌ Routing logic ("If X then Y")
- ❌ Conditional behavior ("When in code mode, do Z")
- ❌ State tracking ("Current mode: code")
- ❌ Workflow orchestration ("First analyze, then plan, then execute")

### Size Limit

**Maximum: 80 lines**

If you need more, you're building a framework. Move content to modes.

---

## Examples of "How to Think" vs "What to Do"

### ✅ Infrastructure (How to Think)

```markdown
**Core Principles:**
- Read context before acting
- Propose large changes before implementing
- Use ana query for cross-service questions
- Respect mode boundaries

**When uncertain:** Ask for clarification
```

**This teaches mindset and decision-making.**

### ❌ Framework (What to Do)

```markdown
**Execution Flow:**
1. First, determine task type (architecture vs coding vs debugging)
2. If architecture: Load context/main.md, then context/patterns.md
3. If coding: Check for dependencies in federation
4. Execute ana query if needed
5. Generate output according to mode template
```

**This dictates execution sequence. That's a framework.**

---

## Testing the Principles (Use This Checklist)

**Before adding ANY feature to Anatomia, ask:**

| Question | Required Answer |
|----------|----------------|
| Does this encode "how to think"? | YES (or don't add) |
| Does this control "what to do next"? | NO (or don't add) |
| Is this declarative (states facts)? | YES (or don't add) |
| Is this imperative (commands actions)? | NO (or don't add) |
| Could AI ignore this without breaking infrastructure? | YES (opinions, not enforcement) |
| Does this add state, routing, or orchestration? | NO (or don't add) |

**If 5/6 are correct: Safe to add (infrastructure)**

**If 3/6 or fewer: Don't add (framework creep)**

---

## Mode Switching Suggestion Pattern (Standard)

**When AI realizes wrong mode, use this exact pattern:**

```markdown
"[Task description] requires [mode name].

I am currently operating in [current mode] mode ([current mode's purpose]).

To [task], reference:

@.ana/modes/[recommended mode].md [Instruction for that mode]

[Optional: Brief note on why switch is needed]"
```

**Example:**
```
"This task requires implementation code.

I am currently operating in architect mode (system design only).

To implement this design, reference:

@.ana/modes/code.md Implement the auth architecture above

(Architect mode produces designs; code mode produces implementations.)"
```

**Never:**
- "Would you like to switch?" (AI can't switch)
- "I'm switching now" (AI can't switch)
- "Let me do it anyway" (violates contract)

---

## Validation (Test in Dogfooding)

**During MVP0-1, validate these principles:**

**✅ Success signals:**
- AI respects mode boundaries (doesn't code in architect mode)
- AI suggests mode switches clearly
- AI asks permission before large changes
- Queries are visible and intentional
- Behavior is predictable

**⚠️ Warning signals:**
- AI crosses mode boundaries occasionally
- AI implements without proposing first
- Queries happen silently
- "Why did it do that?" moments

**❌ Failure signals:**
- AI routinely violates constraints
- Mode boundaries feel arbitrary/unclear
- Users fight the system constantly
- Principles don't match reality

**If failures occur:** Refine language in ENTRY.md and modes, don't add enforcement.

---

## Summary: The Non-Negotiables

1. **Mode switching:** Human-only (AI suggests, never executes)
2. **Mode contracts:** 4-layer structure (purpose, outputs, delegation, constraints)
3. **Federation queries:** Explicit and visible (never ambient)
4. **ENTRY.md:** Orientation only (no orchestration, <80 lines)
5. **Constraint language:** Matter-of-fact (not adversarial)
6. **Teaching approach:** Examples and judgment (not just rules)
7. **Human authority:** Final (AI asks when uncertain)
8. **Source of truth:** .ana/ supersedes pre-training
9. **Infrastructure test:** "How to think" yes, "what to do" no
10. **Size discipline:** If it grows, it's becoming a framework (resist)

**These principles keep Anatomia as opinionated infrastructure.**

**Never compromise on these. They're the foundation of predictable, safe, professional AI assistance.**

---

_Use this document as the invariant reference when making design decisions._
_If a proposed change violates these principles, don't make it._
