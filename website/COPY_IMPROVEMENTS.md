# Anatomia Website - Future Copy & Design Improvements

**Created:** January 13, 2026
**Status:** Parking lot for future iterations
**Priority:** Post-launch refinements (not blocking MVP)

---

## What Was Already Fixed

✅ Removed "framework" language → Now says "nodes" and "behavioral contracts"
✅ Added federation messaging → Step 3 is now "Federate" not "Learn"
✅ Showed `ana query` in code example → Demonstrates the actual UX
✅ Removed vaporware → No learning engine claims (that's MVP3)
✅ More specific language → "YOUR patterns" vs "deeply understands"

**The copy is now accurate to the master plan.**

---

## Future Improvements (Require Design/Layout Changes)

### Priority 1: Add Problem Section (High Impact)

**Where:** Between Hero and BentoGrid (new section)

**What:** Pain-focused copy that developers immediately recognize

**Suggested content:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The Context Problem
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AI coding assistants have amnesia.

Every session:
  "This is FastAPI with async SQLAlchemy..."
  "We use Pydantic for validation..."
  "JWT tokens refresh every 7 days..."
  "Error handling uses custom Result<T>..."

And when working across services:
  Frontend needs auth patterns → Search backend code manually
  API changed → Notify 3 teams on Slack
  New dev joins → 2 hours explaining "how we do things here"

You're spending 30% of AI sessions re-explaining context.

There's a better way.
```

**Design:**
- Dark background cell (contrast with white sections)
- Two-column layout: Left (pain), Right (visual or quote)
- Prominent placement (users must see the pain before solution)

**Why this matters:**
- Developers need to FEEL the pain before they care about solution
- Generic "AI that understands" doesn't hook them
- Specific pain ("30% of sessions re-explaining") is memorable

---

### Priority 2: Add Visual Terminal Demo (Medium Impact)

**Where:** Hero section or Cell 2 (Analysis)

**What:** Animated terminal showing `ana init` running

**Two options:**

**Option A: Animated GIF/Video**
- Record real `ana init` running
- Shows 30-second analysis
- Shows file structure being created
- Embed in hero or Cell 2

**Option B: Fake Terminal Animation (CSS/JS)**
- Terminal window with typing effect
- Shows commands and output appearing
- Like what you had in the HTML mockup

**Suggested content:**

```
$ cd my-fastapi-app
$ ana init

Analyzing codebase...
✓ Detected: Python 3.11, FastAPI, SQLAlchemy
✓ Structure: 127 files, layered architecture
✓ Patterns: Async handlers, Pydantic validation

Generating .ana/ node...
✓ Created behavioral contracts (5 modes)
✓ Generated context (patterns, conventions)
✓ Auto-generated exports from OpenAPI

Done in 28 seconds. Your AI assistant is ready.

$ ls .ana/
ENTRY.md  context/  modes/  federation/
```

**Why this matters:**
- Shows actual product in action (not just words)
- 30-second claim becomes credible (you SEE it happen)
- Terminal aesthetic reinforces CLI tool nature

---

### Priority 3: Strengthen Node Federation Messaging (High Impact)

**Where:** Cell 5 (Federate) needs expansion or separate section

**Current Cell 5 is good, but could be more explicit:**

**Enhanced version:**

```
STEP 3 — Federate
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Large codebase? Each service gets its own node.

Organize by ownership:
  apps/storefront/.ana/     → Frontend team's node
  services/auth-api/.ana/   → Auth team's node
  services/products/.ana/   → Products team's node

Cross-service question?
  Claude executes: ana query auth-api "JWT refresh pattern"
  Gets answer in <100ms from auth's auto-generated exports
  Writes code using that pattern
  You never left chat

The innovation:
  → Bounded contexts (teams own their nodes)
  → Auto-updated interfaces (exports.md from OpenAPI)
  → Explicit queries (visible, not ambient)
  → Tool-agnostic (works with any AI that reads markdown)

Nobody else is building this.
```

**Alternative: Add a dedicated "How Federation Works" section**

After pricing, before footer:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For Teams: Federation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Visual diagram showing nodes]

Frontend node ←→ Auth node ←→ Products node

Each node:
  • Specializes in its service (deep knowledge)
  • Auto-generates exports.md from code (OpenAPI/tree-sitter)
  • Queries other nodes when needed

Your AI:
  • Executes ana query to cross boundaries
  • Gets focused, current answers
  • Stays in chat (seamless UX)

The result:
  Cross-team coordination without Slack chaos
  Interfaces always current (auto-generated)
  Onboarding in minutes, not hours
```

**Why this matters:**
- Federation is the moat (needs prominence)
- Teams are the revenue opportunity (Team tier $99/mo)
- Differentiation from Claude Skills, Cursor Rules

---

### Priority 4: Fix Value Prop Language (Medium Impact)

**Current vague claims to sharpen:**

**"Deep understanding"**
→ "Knows your FastAPI uses Pydantic validation and rotating JWT tokens"

**"Smart analysis"**
→ "Detects: async SQLAlchemy, custom error types, pytest patterns"

**"Gets better over time"** (if you keep this)
→ "Learns which patterns work (tracks commits vs reverts)"

**"Works with any AI tool"**
→ "Any AI that reads markdown: Claude Code, Cursor, Windsurf, Copilot"

**Show specificity, not marketing fluff.**

---

### Priority 5: Add Credibility Signals (Low Impact, Easy)

**Current:** No indication of who made this or why to trust it

**Add somewhere (footer or About section):**

**Option A: Founder/team signal**
```
Built by developers who've shipped IRIS, ATLAS, PROTO
(battle-tested orchestration patterns, now automated)
```

**Option B: Usage signal**
```
Used internally on 5+ production projects
Open source - inspect the code, trust the process
```

**Option C: Validation signal**
```
Validated pattern (built manually 4 times before automating)
Not theory. Proven in production.
```

**Why this matters:**
- Unknown tool = skepticism
- Quick credibility boost
- "Battle-tested" > "new idea"

---

### Priority 6: Improve CTA Copy (Low Impact)

**Current CTAs:**
- "Install Anatomia" (good)
- "View on GitHub" (good)
- "Get started" (generic)

**Better options:**

**Primary CTA:**
- "Install Now" (action-oriented)
- "npm install -g anatomia" (shows exact command)
- "Try Anatomia Free" (emphasizes free tier)

**Secondary CTA:**
- "View on GitHub" (keep this)
- "Read the Docs" (if docs exist)
- "See Examples" (if you have them)

**In pricing:**
- Free tier: "Get Started" → "Install Free"
- Pro tier: "Coming Soon" → "Join Waitlist" (capture interest)

---

### Priority 7: Add Social Proof (Low Impact, After Launch)

**When you have traction:**

**GitHub stars badge:**
```
[Navigation or Hero]
⭐ 234 stars on GitHub
```

**User testimonials:**
```
[After Compatibility section]

"Reduced onboarding from 2 hours to 15 minutes"
— Sarah Chen, Platform Team Lead

"Finally, our frontend and backend teams are coordinated"
— Mike Rodriguez, Engineering Manager
```

**Usage stats:**
```
Join 2,000+ developers using Anatomia
500+ projects initialized
Deployed in 50+ organizations
```

**Don't add until real. But plan for placement.**

---

### Priority 8: Sharpen Compatibility Messaging

**Current cell 6 is OK, but could emphasize differentiation more:**

**Enhanced version:**

```
COMPATIBILITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Works with any AI tool

Not another proprietary format.
Not locked to one IDE.
Not requiring our cloud service.

Just markdown files your AI reads.

• Claude Code ✓
• Cursor ✓
• Windsurf ✓
• GitHub Copilot ✓
• Any tool that reads files ✓

Even if you switch tools tomorrow, your .ana/ nodes stay valuable.

That's infrastructure, not lock-in.
```

**Why:** Emphasizes tool-agnostic positioning (our strategic advantage)

---

### Priority 9: Add Concrete Examples (Medium Impact)

**Current:** Generic "Add Stripe integration"

**Better:** Show 3 specific, relatable examples

**Example 1: Cross-Service Query**
```
Scenario: Frontend dev needs auth pattern

Old way:
  1. Search auth-service code (10 min)
  2. Slack platform team (wait 30 min)
  3. Explain to Claude what you learned (2 min)

With Anatomia:
  1. Claude executes: ana query auth-api "JWT refresh"
  2. Gets answer in 87ms
  3. Implements immediately

Time saved: 42 minutes → 1 minute
```

**Example 2: API Change Notification**
```
Scenario: Backend changes API contract

Old way:
  Slack 3 channels
  Hope everyone sees it
  Update docs manually (maybe)

With Anatomia:
  ana broadcast "API v2 requires pagination"
  All nodes notified
  Exports.md auto-updates from code

Coordination: 30 min → 30 seconds
```

**Example 3: Onboarding New Dev**
```
Scenario: Junior dev joins team

Old way:
  2 hours of "here's how we do things"
  Tribal knowledge, undocumented patterns
  Still gets it wrong first week

With Anatomia:
  Point them to .ana/ nodes
  Claude reads behavioral contracts
  Follows team patterns from day 1

Onboarding: 2 hours → 15 minutes
```

**Where to add:** New "Use Cases" or "Why Anatomia" section after BentoGrid

---

### Priority 10: Fix Metrics to Be Honest

**Current:**
- PATTERNS: 18+

**Question:** Can you actually detect 18 distinct patterns?

**If yes:** Keep it
**If no (more like 8-12):** Change to realistic number

**Developers will check.** If you claim 18 and they see 6, trust is gone.

**Better approach:**
```
PATTERNS: 8-12
(Detects: error handling, validation, database ORM,
auth method, testing framework, logging, API design, etc.)
```

**Specificity > inflation.**

---

### Priority 11: Add "vs Alternatives" Section (Optional)

**Where:** After BentoGrid or before Pricing

**What:** Quick comparison showing differentiation

**Suggested content:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
vs. The Alternatives
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLAUDE.md
  ✗ Manual (you write everything)
  ✗ Static (doesn't update)
  ✗ Monolithic (one file for everything)

Claude Skills
  ✗ Manual (hours to write)
  ✗ Single-project (no cross-service)
  ✗ Unpredictable invocation

Cursor Rules
  ✗ Manual (you maintain it)
  ✗ IDE-locked (Cursor only)
  ✗ No federation (one workspace = one context)

Anatomia
  ✓ Auto-generated (30 seconds)
  ✓ Auto-updates (exports.md from code)
  ✓ Federated (nodes coordinate)
  ✓ Tool-agnostic (any AI tool)
```

**Why:** Makes differentiation crystal clear in 10 seconds

**Risk:** Sounds competitive/negative (might not fit friendly brand tone)

---

## Microcopy Improvements (Small Polish)

### 1. Small Print Under Hero CTAs

**Current:** "npm install -g anatomia • MIT License • Works with Claude Code, Cursor, Windsurf"

**Better:**
"npm install -g anatomia • MIT License • No signup required"

**Why:** "No signup required" is more compelling than listing tools

---

### 2. Cell Headers (STEP 0, STEP 1, etc.)

**Current:** "STEP 0 - Analyze"

**Consider:** More evocative labels

- STEP 0: Analyze → "DETECT" or "SCAN"
- STEP 1: Generate → "CREATE" or "BUILD"
- STEP 2: Use → "INTEGRATE" or "CONNECT"
- STEP 3: Federate → "COORDINATE" or "NETWORK"

**Why:** Single-word headers are punchier (but current is fine too)

---

### 3. Pricing Section Headline

**Current:** "Simple Pricing"

**Consider:**
- "Pricing That Makes Sense"
- "Free Forever, Paid When You Scale"
- "Start Free, Upgrade When Ready"

**Why:** "Simple pricing" is what everyone says

---

### 4. Footer Copy

**Current:** Just logo + links

**Consider adding:**
- "Built for developers, by developers"
- "Open source under MIT license"
- "Questions? Open a GitHub issue"

**Why:** Reinforces open source nature, provides support path

---

## Content Sections to Add (Future Iterations)

### Section: How It Works (Detailed Walkthrough)

**Placement:** After BentoGrid, before Pricing

**Content:** Step-by-step visual flow

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
How It Works
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Install
   $ npm install -g anatomia
   One command. No config. No signup.

2. Initialize
   $ ana init
   Smart analysis in 30 seconds. Auto-detects everything.

3. Use
   @.ana/modes/code.md in Claude Code
   Your AI follows YOUR patterns now.

4. Coordinate (Teams)
   ana query auth-api "patterns"
   Cross-service context without leaving chat.

5. Evolve
   ana evolve
   Context updates when code changes. Always current.
```

**Format:** Chess layout (alternating text/terminal screenshot)

---

### Section: Real-World Use Cases

**Placement:** Before or after Pricing

**Content:** 3 concrete scenarios with before/after

**Use Case 1: Solo Developer**
```
My fullstack app:
  ├── .ana/              (project overview)
  ├── frontend/.ana/     (React patterns)
  └── api/.ana/          (FastAPI patterns)

Benefit: Separation of concerns for AI context
Result: Frontend AI doesn't see backend DB details, vice versa
```

**Use Case 2: Team Monorepo**
```
Our monorepo:
  ├── apps/storefront/.ana/
  ├── apps/admin/.ana/
  ├── services/auth/.ana/
  └── services/products/.ana/

Benefit: Each team owns their node
Result: Frontend queries backend in <100ms, no Slack
```

**Use Case 3: Microservices (Separate Repos)**
```
Our services:
  ├── auth-repo/.ana/
  ├── products-repo/.ana/
  └── orders-repo/.ana/

Benefit: Federation works across repos
Result: Coordinate even without monorepo
```

---

### Section: FAQ or Common Questions

**Placement:** Before footer

**Questions to answer:**

**Q: How is this different from Claude Skills?**
A: Anatomia auto-generates in 30 seconds. Skills take hours to write manually. Plus: federation (Claude Skills don't coordinate across services).

**Q: Does this work with my AI tool?**
A: If it reads markdown files, yes. Tested with Claude Code, Cursor, Windsurf. Works with Copilot too.

**Q: Do I need a monorepo?**
A: No. Single projects benefit (hierarchical nodes). Monorepos benefit more (federation). Microservices work too (manifest points to git checkouts).

**Q: What if my API changes?**
A: Run `ana evolve`. It regenerates exports.md from your OpenAPI schema automatically. Always current.

**Q: Is my code sent to your servers?**
A: No. Everything is local. Your code never leaves your machine (unless you opt-in to cloud features later).

**Q: How do I get started?**
A: `npm install -g anatomia && ana init` in your project. That's it.

---

## Headline Alternatives (Test These)

**Current:** "AI that understands your codebase"

**More specific options:**

1. "Stop re-explaining your project every session"
   - Pain-focused, immediate recognition

2. "Federated AI intelligence for your codebase"
   - Innovation-focused, technical

3. "AI context that actually stays current"
   - Benefit-focused, addresses maintenance pain

4. "Your codebase, deeply understood—across every service"
   - Scope-focused, hints at federation

5. "Auto-generated AI context in 30 seconds"
   - Speed-focused, concrete claim

**Test with A/B when you have traffic.**

---

## Copy Tone Adjustments

### Current Tone: Professional, Technical

**Good for:** Developers, enterprise buyers

**Could improve:** Add personality without losing credibility

**Examples:**

**Too bland:**
"Creates .ana/ node with behavioral contracts"

**Too casual:**
"Spins up a sick .ana/ node with mad contracts yo"

**Just right:**
"Creates your .ana/ node—behavioral contracts, auto-detected patterns, queryable exports"

**Guideline:** Em dashes, short sentences, active voice. Professional but not robotic.

---

### Current Passive Voice Instances to Fix

**"Reference modes in any AI tool"**
→ "Reference modes directly: @.ana/modes/code.md"

**"Works with any AI tool"**
→ "Use with Claude Code, Cursor, Windsurf, or any AI that reads markdown"

**"Free forever. Pro and Team tiers coming soon."**
→ "Start free. Upgrade when your team scales."

**Active voice > passive voice** (more engaging)

---

## Visual Suggestions (Require Design Work)

### 1. Node Network Diagram

**Where:** Cell 5 (Federate) or new section

**What:** Visual showing nodes connected

```
     [Frontend]
         ↕
    [Auth API] ←→ [Products API]
         ↕
     [Shared Types]
```

**With labels:**
- "Each node specializes"
- "Queries cross boundaries"
- "Auto-updated interfaces"

---

### 2. Before/After Comparison

**Where:** Problem section or Use Cases

**What:** Side-by-side showing old vs new way

```
WITHOUT ANATOMIA          |  WITH ANATOMIA
━━━━━━━━━━━━━━━━━━━━━━━━|━━━━━━━━━━━━━━━━━━━━━━━━
Search auth code: 10 min  |  ana query: 1 second
Slack 3 teams: 30 min     |  ana broadcast: instant
Explain to Claude: 5 min  |  Already knows: 0 min
━━━━━━━━━━━━━━━━━━━━━━━━|━━━━━━━━━━━━━━━━━━━━━━━━
Total: 45 min per session |  Total: 1 second
```

**Visual impact, concrete savings.**

---

### 3. Code Example Enhancement

**Current:** Static code snippet

**Better:**
- Syntax highlighted (use Shiki or Prism)
- Copy button (for `ana init` command)
- Animated typing effect (shows it appearing)

**Small polish, big perceived quality boost.**

---

## Messaging Hierarchy (What to Emphasize)

**Primary message (most important):**
"Federated nodes with auto-generated, always-current context"

**Secondary messages:**
- Fast (30 seconds to value)
- Tool-agnostic (not locked in)
- Team coordination (cross-service queries)
- Zero maintenance (auto-updates from code)

**Tertiary:**
- Open source
- Free tier
- Behavioral modes

**Currently:** Primary message is buried in Step 3
**Should be:** Primary message in hero or immediately after

---

## Long-Term Content Strategy

### Launch Content (When You Ship)

**Blog post:** "Introducing Anatomia - Federated AI Intelligence for Codebases"
**HN post:** "Show HN: Anatomia - Auto-generated AI context with federated nodes"
**Tweet thread:** 5-tweet explanation of the problem → solution → innovation
**Reddit:** r/programming, r/MachineLearning, r/webdev

### Educational Content (Post-Launch)

**Tutorials:**
- "Setting up Anatomia in a FastAPI project"
- "Using federation in a monorepo"
- "Migrating from Claude Skills to Anatomia"

**Comparison pieces:**
- "Anatomia vs Claude Skills vs Cursor Rules"
- "When to use nodes (and when not to)"

**Case studies (if you get users):**
- "How [Company] reduced onboarding by 50% with Anatomia"
- "Team of 8 coordinates across 6 services using federated nodes"

---

## Copy Testing Ideas (Post-Launch)

### A/B Test Headlines

Test 3 variants:
1. "AI that understands your codebase" (current)
2. "Stop re-explaining your project every session" (pain-focused)
3. "Federated AI intelligence for your codebase" (innovation-focused)

**Measure:** Click-through to "Install" button

---

### A/B Test CTAs

Test 3 variants:
1. "Get Started" (current)
2. "Install Free" (emphasizes free)
3. "npm install -g anatomia" (shows exact command)

**Measure:** Actual npm installs

---

### A/B Test Subtext

Test 2 variants:
1. "Auto-generated context that stays current. Federated nodes that coordinate." (current)
2. "30-second setup. Auto-updates from code. Queries across services." (benefit-focused)

**Measure:** Time on page, scroll depth

---

## What NOT to Change (Avoid These)

### Don't Add Marketing Fluff

❌ "Revolutionary"
❌ "Game-changing"
❌ "10x your productivity"
❌ "The future of AI coding"

**Developers hate this.** Stay technical, stay honest.

---

### Don't Oversimplify the Innovation

❌ "It's like a README for your AI"
(Too reductive - misses federation)

❌ "Smart context management"
(Too vague - what does this mean?)

❌ "AI assistant generator"
(Misleading - it's infrastructure, not an agent)

**Keep it specific. Keep it accurate.**

---

### Don't Promise Unbuilt Features

❌ "Learns from your commits" (that's MVP3, not MVP1)
❌ "Team collaboration features" (that's MVP3)
❌ "AI-powered insights" (vague, unbuilt)

**Only market what you've built or are building in next 4 weeks.**

---

## Quick Wins (Easiest First)

**If you have 1 hour to improve the site:**

1. ✅ Already done - Copy updated to remove "framework", add "nodes"
2. Add credibility signal to footer (5 min)
3. Improve primary CTA ("Install Now" vs "Get started") (2 min)
4. Fix any inflated metrics (check if "18+ patterns" is real) (10 min)
5. Add em-dash to hero subtext for rhythm (2 min)

**If you have 1 day:**
- Add Problem section (pain before solution)
- Add terminal animation to hero
- Add "How Federation Works" explainer section
- Add FAQ section

**If you have 1 week:**
- Professional video/GIF of `ana init` running
- Real user testimonials (dogfood first, then ask team)
- Detailed use case walkthrough sections
- Launch blog post content

---

## The Bottom Line

**Current copy (after my updates): 8/10**
- Accurate to master plan ✓
- Shows innovation (nodes, federation) ✓
- No vaporware ✓
- Specific enough ✓

**With these future improvements: 9.5/10**
- Pain section (hooks immediately)
- Terminal demo (shows vs tells)
- Federation prominence (moat front and center)
- Credibility signals (trust boost)

**The copy foundation is solid. These are iterations to make it great, not fixes to make it work.**

**Ship what you have now. Iterate based on real user feedback.**

---

## Priority Ranking (Do These in Order)

**High Priority (Do Soon):**
1. Add Problem section (pain recognition)
2. Add terminal demo visual (credibility)
3. Expand federation messaging (differentiation)

**Medium Priority (Do When You Have Users):**
4. Add use case examples (relatability)
5. Add social proof (testimonials, stars)
6. Add FAQ section (reduce friction)

**Low Priority (Nice to Have):**
7. A/B test headlines
8. Add vs Alternatives comparison
9. Microcopy polish

**Not Priority (Skip):**
10. Marketing fluff
11. Oversimplification
12. Feature promises you can't keep

---

**The current copy is honest, accurate, and shows the innovation. Ship it.**

**Use this doc for V2 of the site (post-launch iteration).**
