# Anatomia Master Plan

**Auto-generated AI assistant framework with federated node intelligence**

In one sentence: Anatomia creates specialized `.ana/` nodes across your codebase that auto-generate interfaces, discover each other, and let your AI query them directly - staying in chat while getting focused, current context.

**Created:** January 12, 2026
**Status:** Implementation-ready, research-backed, ready to build

---

## TL;DR (30 Second Version)

**Problem:** AI assistants don't understand your codebase. You re-explain patterns every session.

**Solution:** `ana init` auto-generates `.ana/` folder with smart context + 5 specialized modes.

**Innovation:** Nodes can federate - frontend/.ana/ queries backend/.ana/ for patterns. Your AI (Claude/Cursor) executes `ana query auth-api "JWT pattern"`, gets focused answer in <100ms, writes code using that pattern. You never leave chat.

**Three federation levels:**
- Hierarchical: Nested in same repo (frontend/.ana/, api/.ana/)
- Cross-repo: Team coordination across services
- Cross-internet: Query public nodes (nextjs.org/.ana/, stripe.com/.ana/)

**Timeline:** 2 weeks to foundation, 6 weeks to core value, 12 weeks to federation moat.

**Read:** [VISION.md](./VISION.md) first (explains everything in 20 min).

---

## Why This Folder Exists

**The parent folder** has 16 planning documents created during months of research and iteration.

**This master_plan/ folder** is the distillation:
- All research synthesized (50+ hours)
- All decisions finalized
- Implementation-ready specifications
- Properly sequenced roadmap (atomic steps)
- Self-contained (don't need parent docs)

**If you're building Anatomia:** Read this folder. Parent is historical context.

**If you're just curious:** Read VISION.md for the big picture.

---

## What This Folder Contains

This is the **definitive, implementation-ready plan** for building Anatomia.

Everything a new AI or developer needs:
- What we're building and why (VISION.md)
- The complete technical architecture (TECHNICAL_ARCHITECTURE.md)
- Phased roadmap with atomic steps (MVP_ROADMAP.md)
- Week-by-week implementation specs (IMPLEMENTATION_GUIDE.md)
- The nodes federation innovation and moat (NODES_DEEP_DIVE.md, WHY_THIS_WINS.md)

**This folder supersedes all other planning docs.** When in doubt, this is the source of truth.

---

## Quick Start (For New AI Agents)

**Read in this order:**

1. **[VISION.md](./VISION.md)** - The big picture (10 min read)
   - What Anatomia is and why it exists
   - The nodes federation concept (our key innovation)
   - How this creates a moat competitors can't cross

2. **[MVP_ROADMAP.md](./MVP_ROADMAP.md)** - The path forward (15 min read)
   - MVP0: Foundation (Week 1-2)
   - MVP1: Core Features (Week 3-6)
   - MVP1.5: Node Discovery (Week 7-8)
   - MVP2: Federation Protocol (Week 9-12)
   - MVP3: Team & Cloud (Month 4-6)

3. **[TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)** - How it works (20 min read)
   - System architecture and components
   - Node federation protocol (discovery, query, broadcast)
   - Auto-generated exports.md (the killer detail)
   - Storage, formats, and data flow

4. **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Week-by-week build plan (30 min read)
   - Exact file structures and code
   - Step-by-step implementation
   - Testing strategy
   - Launch checklist

5. **[NODES_DEEP_DIVE.md](./NODES_DEEP_DIVE.md)** - Federation in depth (25 min read)
   - Why nodes/federation is the innovation
   - Technical protocol specifications
   - Real-world use cases and examples
   - Competitive analysis

6. **[WHY_THIS_WINS.md](./WHY_THIS_WINS.md)** - The moat (10 min read)
   - What competitors are building
   - What they can't/won't build
   - Our unfair advantages
   - Network effects and platform play

**Total reading time: ~2 hours for complete context**

---

## Why This Folder (Not Parent Folder)

**Parent folder** (`/anatomia/`) has 16 planning documents:
- Created during 2 months of research and iteration
- Explores multiple angles, pivots, ideas
- Historical record of thinking process
- Valuable context but not actionable

**This master_plan/ folder** is the synthesis:
- All research distilled into decisions
- All paths explored, best one chosen
- Implementation-ready specifications
- Properly sequenced (atomic steps)
- Self-contained (complete context in 6 files)

**Read parent docs if:** You want historical context, understand how we got here, see alternate approaches explored.

**Read this folder if:** You're building Anatomia, need complete technical context, want the final plan.

---

## Core Concepts (Quick Summary)

### What is Anatomia?

**Auto-generated AI assistant framework for codebases.**

One command (`ana init`) analyzes your codebase and generates:
- Smart context (stack, patterns, conventions auto-detected)
- 5 specialized modes (architect, code, debug, docs, test)
- Learning foundation (tracks what works via git hooks)
- Works with any AI tool (Claude Code, Cursor, Windsurf)

### The Key Innovation: Nodes

**The insight:** Large codebases aren't monolithic - they're owned by teams. Even solo projects benefit from scoped contexts (frontend vs backend).

**The solution:** Each bounded context gets its own `.ana/` **node**:
- **Scoped intelligence** - Deep understanding of its domain (20-50K lines)
- **Federated discovery** - Nodes find siblings (via manifest or auto-scan)
- **Interface sharing** - Auto-generated exports.md keeps contracts current
- **Cross-node queries** - CLI tool searches other nodes (keyword or optional semantic)
- **Safe broadcasts** - `ana broadcast "API v2 required"` with human review

**How queries work:**
1. Your AI (Claude Code/Cursor) executes: `ana query auth-service "JWT pattern"`
2. CLI does keyword search (no LLM, <100ms) or optional semantic search (user's API key)
3. Returns focused answer (50 lines vs 2,000 lines of full codebase)
4. AI uses that info, you stay in chat (seamless UX)

**Three levels (visual):**

```
Level 1: Hierarchical          Level 2: Cross-Repo           Level 3: Public
┌─────────────────┐          ┌──────────────────────┐      ┌───────────────┐
│  my-app/        │          │ team-monorepo/       │      │ Internet      │
│  ├─.ana/        │          │ ├─storefront/.ana/   │      │ ├─nextjs.org  │
│  ├─frontend/    │          │ ├─auth-api/.ana/     │      │ │  └─.ana/    │
│  │  └─.ana/     │          │ └─products/.ana/     │      │ ├─stripe.com  │
│  └─api/         │          │      ↕ queries ↕     │      │ │  └─.ana/    │
│     └─.ana/     │          └──────────────────────┘      │ └─supabase.io │
└─────────────────┘                                        │    └─.ana/    │
Solo dev benefits            Team coordination             └───────────────┘
Organize by scope            Cross-service queries         Official docs
```

**Result:** Distributed knowledge network matching how code is actually organized.

**Moat:** Nobody else thinking federated + auto-generated + queryable. Claude Skills, Cursor Rules, Copilot all assume monolithic context.

---

## The Build Philosophy

### 1. Atomic Steps (Like God Planned It)

**Not:**
```
Week 1: Build everything
Week 2: Debug everything
Week 3: Ship broken product
```

**Instead:**
```
MVP0 (Week 1-2): Single node working perfectly
    ↓ (foundation solid)
MVP1 (Week 3-6): Core features complete
    ↓ (value proven)
MVP1.5 (Week 7-8): Node discovery
    ↓ (federation foundation)
MVP2 (Week 9-12): Full federation protocol
    ↓ (moat established)
MVP3 (Month 4-6): Team features, cloud sync
```

Each phase is:
- Self-contained (ships working product)
- Foundation for next phase (no rework)
- Validates assumptions (learn before building more)

### 2. Research-Backed Design

Every technical decision informed by proven patterns:
- **Service meshes** (Consul, Istio) - Federation & discovery protocols
- **GraphQL federation** (Apollo) - Schema composition across bounded contexts
- **Backstage** (Spotify) - Software catalog metadata & monorepo modeling
- **DDD** (Martin Fowler) - Bounded context principles & team boundaries
- **Nx/Turborepo** - Project graph detection & dependency analysis
- **Tree-sitter** - AST parsing for code analysis
- **FastAPI/OpenAPI** - Auto-generated API documentation

**We're not inventing** - we're applying distributed systems thinking to AI context management.

### 3. Simple First, Sophisticated Later (Progressive Enhancement)

**MVP0-1 (Week 1-6): File-based, local, zero infrastructure**
- Discovery: Read `federation/nodes.json` (manifest)
- Query: Keyword search (no LLM, <100ms)
- Storage: Just markdown files
- Works: Offline, no servers, no costs

**MVP2 (Week 9-12): Add intelligence**
- Auto-exports: Generated from OpenAPI/tree-sitter
- Federation: Query + broadcast protocols
- Keyword search: Good enough for structured docs

**MVP3 (Week 13-20): Optional sophistication**
- Semantic search: LLM-powered (user's API key) - only if keyword isn't enough
- Public nodes: Cross-internet queries (if frameworks publish .ana/)
- Cloud sync: Team features (only if teams want to pay)
- Dashboard: Visualization (only if valuable)

**Philosophy:** Start simple. Prove value at each step. Add layers only when validated. It's OK to stop at MVP2 if that's all we need.

---

## Project Status

**Documentation:** Complete (this folder)
**Code:** Not started
**Landing page:** Mockup done (10xBuild style with green)
**Domain:** mothernode.ai owned (potential rebrand)
**Timeline:** 4-6 weeks to MVP1, 12 weeks to MVP2
**Team:** Solo (you), using ATLAS to build

---

## Key Files Reference

| File | What's In It | Read When |
|------|--------------|-----------|
| **VISION.md** | The big picture, nodes concept, moat | First - understand WHAT and WHY |
| **MVP_ROADMAP.md** | Phased build plan, priorities | Second - understand WHEN and HOW MUCH |
| **TECHNICAL_ARCHITECTURE.md** | System design, protocols, formats | Third - understand HOW IT WORKS |
| **IMPLEMENTATION_GUIDE.md** | Week-by-week code plan | Fourth - understand HOW TO BUILD |
| **NODES_DEEP_DIVE.md** | Federation protocol details | Fifth - deep dive on innovation |
| **WHY_THIS_WINS.md** | Competitive moat analysis | Sixth - understand THE ADVANTAGE |
| **ENTRY_TEMPLATE.md** | ENTRY.md specification | Reference - when generating ENTRY.md |
| **MODE_TEMPLATES.md** | All 5 mode templates (4-layer contracts) | Reference - when generating modes |
| **BEHAVIORAL_PRINCIPLES.md** | Non-negotiable design rules | Reference - preventing framework creep |

---

## Principles (Never Compromise)

1. **File-based, always** - No required infrastructure, works offline
2. **Tool-agnostic** - Claude Code, Cursor, Windsurf, anything that reads markdown
3. **Git-native** - Everything version controlled, shareable, forkable
4. **Local-first** - Cloud is optional enhancement, never required
5. **Simple by default** - Advanced features are opt-in
6. **Open source core** - MIT license, community-driven
7. **Privacy-respecting** - Your code never leaves your machine (unless you opt-in)
8. **Fast** - Operations complete in <1s, init in <30s
9. **Predictable** - Deterministic behavior, no model-dependent surprises
10. **Safe** - Human review required for cross-node changes
11. **Opinionated** - Teaches AI how to behave, doesn't execute or enforce

---

## Anatomia is Opinionated Infrastructure

**What this means:**

Anatomia encodes strong behavioral norms:
- **Read-first** - Context before action
- **Mode-bound** - Each mode has specific purpose and constraints
- **Explicit federation** - Cross-node queries are visible and intentional
- **Human authority** - Mode switching and major changes require human control

**What this is NOT:**
- ❌ Framework (no execution logic, no orchestration)
- ❌ Agent system (no autonomous task completion)
- ❌ Enforcement engine (norms are declarative, not programmatically enforced)

**Why opinionated:**
- AI needs explicit norms more than humans do
- Neutrality defers to pre-training (inconsistent)
- Your 4 systems (AGENT, ATLAS, IRIS, PROTO) validated that opinionated contracts work
- Successful infrastructure is opinionated (Git, Docker, TypeScript)

**The test:** Does this teach "how to think" (✅ infrastructure) or "what to do next" (❌ framework)?

**Key files that encode opinions:**
- **ENTRY.md** - Orientation contract (what .ana/ is, how to use it)
- **modes/*.md** - Behavioral contracts (purpose, outputs, constraints per mode)
- **federation rules** - Explicit, visible, human-controlled queries

**Result:** Predictable AI behavior through clear contracts, not enforcement

---

## Success Metrics (Dogfooding-Focused)

### MVP1 (Week 6)
- ✅ Single-node `ana init` works on our projects (Anatomia, ATLAS, 10xBuild)
- ✅ Auto-generated context is accurate (80%+ of patterns detected correctly)
- ✅ We use it daily instead of manual CLAUDE.md
- ✅ Saves us 10+ minutes per coding session (no re-explaining)
- ✅ 5 modes provide value (we actually use architect, code, debug)

### MVP2 (Week 12)
- ✅ Federation works in our monorepo (if we have 3+ services using nodes)
- ✅ We run `ana query` 3+ times per day (validates usefulness)
- ✅ Auto-exports.md generates correctly from our FastAPI services
- ✅ Broadcast protocol used for cross-team changes (measurable time saved)
- ✅ No bugs blocking daily use (stable enough for production work)

### MVP3 (Month 6)
- ✅ Semantic search adds value (we use --semantic flag 20%+ of queries)
- ✅ Public nodes work (can query nextjs.org/.ana/ if they publish one)
- ✅ Dashboard useful (we open it weekly to check health/analytics)
- ✅ External validation (10+ developers try it, 5+ give positive feedback)
- ✅ Decision point: Worth continuing to Team tier features?

**Philosophy:** We build for ourselves first. External metrics (stars, users) are secondary. If WE use it daily and it saves US time, it's successful.

---

## What Makes This Plan Special

**1. Research-Backed**
- 50+ hours of research into federation protocols, distributed systems, bounded contexts
- Validated against Backstage, GraphQL, service meshes, DDD
- Technical decisions have precedent and reasoning

**2. Properly Sequenced**
- Each MVP builds on previous (no rework)
- Atomic steps (ship working product at each phase)
- Validates assumptions before building more
- Path feels inevitable, not chaotic

**3. Innovation-Focused**
- Nodes federation is our moat
- Auto-generated exports.md is the killer detail
- We're solving problems competitors ignore (team boundaries, cross-service context)

**4. Pragmatically Scoped**
- MVP0-1: No infrastructure (just files)
- MVP2: Add sophistication (federation)
- MVP3: Add cloud (optional)
- Each phase is 4-8 weeks, not 6 months

**5. Self-Contained**
- New AI can read this folder and start building immediately
- No need to context-switch to other docs
- Everything needed is here

---

## Next Actions

**For you (human - first time reading):**
1. **Read VISION.md** (20 min) - Understand what and why
2. **Skim MVP_ROADMAP.md** (10 min) - See the phased path
3. **Decide:** Start building MVP0? Refine further? Get feedback?

**For you (ready to build):**
1. **Read IMPLEMENTATION_GUIDE.md** (30 min) - Week-by-week code plans
2. **Set up project** following Week 1 instructions
3. **Build MVP0** (Week 1-2) - Foundation first
4. **Dogfood immediately** - Use it, find issues, iterate

**For AI agents (implementing):**
1. **Read all 6 files** in order (2 hours for complete context)
2. **Focus on IMPLEMENTATION_GUIDE.md** - Has exact code and file structures
3. **Reference TECHNICAL_ARCHITECTURE.md** - When you need system design details
4. **Ask clarifying questions** if anything is ambiguous
5. **Begin building** following week-by-week plan

**For AI agents (researching/extending):**
1. **Read VISION.md + WHY_THIS_WINS.md** - Understand strategy
2. **Read NODES_DEEP_DIVE.md** - Understand federation protocol deeply
3. **Propose improvements** - But stay aligned with core principles

---

## Source Documents

This plan synthesizes and builds upon:
- Original Anatomia docs (15 files in parent folder)
- Web AI research on federation protocols
- 50+ hours of distributed systems research
- Competitive analysis (Skills, Cursor, Copilot, Windsurf)
- Technical research (tree-sitter, OpenAPI, service meshes)

All research sources are cited in individual files.

---

**The master plan is complete. Time to build.**
