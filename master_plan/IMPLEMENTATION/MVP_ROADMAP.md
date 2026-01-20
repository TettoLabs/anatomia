# Anatomia MVP Roadmap - The Path Forward

**Last Updated:** January 12, 2026
**Status:** Implementation-ready phased plan

---

## Overview: The Trajectory

```
MVP0 (Week 1-2)
Single Node Foundation
├─ Basic ana init
├─ File structure
└─ Manual context

MVP1 (Week 3-6)
Core Features Complete
├─ Smart analysis
├─ 5 modes working
├─ Auto-generation
└─ Learning hooks

MVP1.5 (Week 7-8)
Node Detection
├─ node.json format
├─ Federation manifest
└─ Discovery protocol

MVP2 (Week 9-12)
Federation Protocol
├─ Query system
├─ Broadcast + inbox
└─ Auto-exports.md

MVP3 (Month 4-6)
Team & Cloud
├─ Cloud sync
├─ Dashboard
└─ Analytics
```

**Each phase:**
- Ships working product (not half-baked)
- Validates assumptions (learn before building more)
- Foundation for next phase (no rework)
- Usable by us immediately (dogfood constantly)

---

## MVP0: Single Node Foundation (Week 1-2)

**Goal:** Get basic `ana init` working with manual context. Prove the file structure and generation concept.

**Not trying to solve:** Auto-detection, smart analysis, federation. Just: can we create .ana/ folders that work?

### Features

| Feature | Priority | Complexity | Description |
|---------|----------|------------|-------------|
| CLI scaffold | P0 | Low | `ana --help` works, commands parse |
| `ana init` (basic) | P0 | Low | Creates .ana/ structure, asks questions |
| **ENTRY.md generation** | **P0** | **Low** | **Orientation contract (AI reads first)** |
| **Mode contracts (4-layer)** | **P0** | **Medium** | **5 modes with proper contract structure** |
| Manual context | P0 | Low | User fills in context files (we template them) |
| File writer | P0 | Low | Writes .ana/ folder correctly |

### Deliverables

**Commands working:**
```bash
ana init              # Creates .ana/ with templates
ana mode list         # Lists available modes
ana mode code         # Shows code.md content
```

**File structure created:**
```
.ana/
├── ENTRY.md                     # NEW: Orientation contract
├── node.json                    # NEW: Node identity
├── context/
│   ├── main.md                  # Template with TODOs
│   ├── patterns.md              # Template
│   └── conventions.md           # Template
├── modes/
│   ├── architect.md             # 4-layer contract template
│   ├── code.md                  # 4-layer contract template
│   ├── debug.md                 # 4-layer contract template
│   ├── docs.md                  # 4-layer contract template
│   └── test.md                  # 4-layer contract template
└── learning/
    └── explicit.md              # Empty, for user notes
```

**Mode structure (4-layer contract):**
Each mode.md contains:
1. Purpose (one sentence)
2. What This Mode Produces (outputs)
3. What This Mode Delegates (to other modes)
4. Hard Constraints (3-5 explicit prohibitions)

See [MODE_TEMPLATES.md](./MODE_TEMPLATES.md) for complete templates.

**Success criteria:**
- ✅ Can run `ana init` on any project
- ✅ Creates valid .ana/ folder with ENTRY.md + node.json + modes + context
- ✅ ENTRY.md immediately orients AI (tested with Claude Code)
- ✅ Mode contracts feel clear and natural (boundaries are obvious)
- ✅ No mode confusion (AI respects architect vs code boundaries)
- ✅ We can manually fill in context and use it effectively

**Learning objectives:**
- Is ENTRY.md clear enough? (AI understands .ana/ immediately)
- Do mode contracts work? (AI respects boundaries)
- Is manual context creation painful? (motivates MVP1 auto-generation)
- Are hard constraints too restrictive? (refine language if needed)

### Week-by-Week Plan

**Week 1: Project Setup + CLI Scaffold**

Days 1-2: Project initialization
- Create monorepo structure (pnpm workspaces)
- Set up TypeScript configs
- Add dependencies (commander, chalk, inquirer, ora)
- `ana --version` works

Days 3-4: Command structure
- Implement `ana init` (questions only, no file writing yet)
- Implement `ana mode <name>` (basic file reading)
- Implement `ana mode list`

Days 5-7: File writer
- Create .ana/ folder structure
- Write template files (modes, context)
- Test on dummy project

**Week 2: Templates + Polish**

Days 8-9: ENTRY.md and node.json templates
- Create ENTRY.md template (orientation contract)
- Add interpolation for project-specific details
- Create node.json template (identity and federation config)
- Test that ENTRY.md is clear and helpful

Days 10-12: Mode contract templates (4-layer structure)
- Write all 5 modes following contract structure:
  - architect.md (design, not implementation)
  - code.md (implementation, not architecture)
  - debug.md (fixing, not feature-building)
  - docs.md (documenting, not creating)
  - test.md (testing, not implementing)
- Each mode has: Purpose, Outputs, Delegation, Hard Constraints
- Include examples of good vs bad queries
- See MODE_TEMPLATES.md for complete reference

Days 13-14: Testing + refinement
- Test init on 3 different projects (Python, Node, Go)
- Validate ENTRY.md is immediately clear
- Validate mode boundaries feel natural
- Refine language based on first impressions
- Write README

**MVP0 Deliverable:**
Working CLI that creates .ana/ folders with proper contracts. Manual context but professional structure.

**Critical for MVP0:** ENTRY.md and mode contracts must be excellent. These teach AI how to behave. Get them right first.

---

## MVP1: Core Features Complete (Week 3-6)

**Goal:** Smart auto-generation. Analyze codebases and create useful context automatically. This is where Anatomia provides real value.

**Building on MVP0:** File structure is proven. Now make it SMART.

### Features

| Feature | Priority | Complexity | Description |
|---------|----------|------------|-------------|
| Project type detection | P0 | Low | Python, Node, Go, Rust detection |
| Framework detection | P0 | Medium | FastAPI, Django, Express, Next.js, etc. |
| Pattern inference | P0 | High | Error handling, validation, testing patterns |
| Convention detection | P0 | Medium | Naming, imports, style from code samples |
| Smart mode generation | P0 | High | Modes tailored to detected framework |
| `ana evolve` | P1 | Medium | Update context from code changes |
| `ana health` | P1 | Low | Check context freshness |
| Git hooks | P1 | Medium | Install post-commit hooks for learning data |

### Deliverables

**Commands working:**
```bash
ana init              # Smart analysis + auto-generated context
ana evolve            # Update context from changes
ana health            # Check staleness
ana teach "<text>"    # Add explicit knowledge
```

**Analysis engine outputs:**
```json
{
  "projectType": "python",
  "framework": "fastapi",
  "architecture": "layered",
  "patterns": {
    "errorHandling": "exception-based",
    "validation": "pydantic",
    "database": "sqlalchemy-async",
    "auth": "jwt-bearer",
    "testing": "pytest"
  },
  "conventions": {
    "naming": "snake_case",
    "imports": "absolute",
    "typeHints": "always"
  }
}
```

**Generated context (example - FastAPI):**

```markdown
# Main Context

## Project Overview
Python 3.11 FastAPI application with async SQLAlchemy.

## Architecture
Layered architecture:
- `src/api/` - FastAPI route handlers
- `src/models/` - SQLAlchemy models
- `src/services/` - Business logic
- `src/utils/` - Shared utilities

## Key Patterns

### Error Handling
Use custom exception classes + exception handlers:
```python
class AppError(Exception):
    def __init__(self, message: str, code: str):
        self.message = message
        self.code = code
```

### Validation
Pydantic models for all request/response:
```python
class UserCreate(BaseModel):
    email: EmailStr
    username: str
```

### Database
SQLAlchemy async with dependency injection:
```python
async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
```

## Conventions

### Naming
- Files: `snake_case.py`
- Classes: `PascalCase`
- Functions: `snake_case`
- Constants: `UPPER_SNAKE_CASE`

### Imports
Always use absolute imports from `src.`:
```python
from src.models.user import User
from src.services.auth import AuthService
```

### Type Hints
Always include type hints:
```python
def process_user(user_id: int) -> User:
    ...
```
```

**Success criteria:**
- Generates useful context (80%+ accurate)
- Detects patterns we actually use
- Modes are framework-specific
- We prefer using Anatomia over manual context
- Saves us 10+ minutes per session

### Week-by-Week Plan

**Week 3: Analysis Engine**

Core detectors:
- `detectProjectType()` - Check for package.json, requirements.txt, go.mod
- `detectFramework()` - Read dependencies, identify framework
- `analyzeStructure()` - Map directory structure
- Output: JSON analysis object

**Week 4: Pattern Inference**

Pattern detectors:
- `inferErrorHandling()` - Find try/catch or Result patterns
- `inferValidation()` - Detect Pydantic, Zod, Joi usage
- `inferDatabase()` - Find SQLAlchemy, Prisma, GORM
- `inferAuth()` - Detect JWT, session, OAuth patterns
- `inferTesting()` - Find pytest, Jest, Go testing patterns

**Week 5: Generation Engine**

Template system:
- Load framework-specific templates (FastAPI.md, Express.md)
- Interpolate analysis results into templates
- Generate all 5 modes with detected patterns
- Generate context files with real examples from code

**Week 6: Evolution + Polish**

Evolution system:
- `ana evolve` - Detect changed files, re-analyze, update context
- `ana health` - Count files changed, days since evolve, health score
- Git hooks - Install post-commit hook for outcome tracking
- Testing - Run on 5 real projects, refine based on output quality

**MVP1 Deliverable:**
Smart auto-generation that creates useful context in 30 seconds.

---

## MVP1.5: Node Detection Foundation (Week 7-8)

**Goal:** Lay groundwork for federation WITHOUT implementing full protocol yet. Just: identify that multiple nodes exist.

**Building on MVP1:** Core features work. Now add node awareness.

**Why this intermediate step:**
- Federation is complex (query, broadcast, inbox)
- But detection is simple (just find other .ana/ folders)
- Validates the concept before building full protocol
- Users can see "oh, Anatomia knows about my other services"

### Features

| Feature | Priority | Complexity | Description |
|---------|----------|------------|-------------|
| node.json format | P0 | Low | Node identity and metadata |
| `ana nodes` command | P0 | Low | List all detected nodes |
| Manifest discovery | P0 | Low | Read federation/nodes.json |
| Auto-scan discovery | P1 | Medium | Find .ana/ in parent directories |
| Node validation | P1 | Low | Check sibling nodes are valid |

### Deliverables

**New file: .ana/node.json**
```json
{
  "version": 1,
  "node": {
    "name": "storefront",
    "role": "frontend",
    "owner": "frontend-team",
    "description": "User-facing storefront application"
  },
  "federation": {
    "queryable": true,
    "broadcast": {
      "accept": true,
      "requires_review": true
    }
  }
}
```

**New file: .ana/federation/nodes.json** (optional)
```json
{
  "version": 1,
  "nodes": [
    { "name": "auth-service", "path": "../../services/auth-service", "role": "authentication" },
    { "name": "catalog-api", "path": "../../services/catalog-api", "role": "catalog" }
  ]
}
```

**New command:**
```bash
$ ana nodes

Nodes in this codebase:

  ▸ storefront (you are here)
    Role: frontend
    Path: apps/storefront

  ▸ auth-service
    Role: authentication
    Path: services/auth-service

  ▸ catalog-api
    Role: catalog
    Path: services/catalog-api

Federation: 2 connected nodes
Status: All reachable ✓
```

**Success criteria:**
- Can detect sibling nodes in monorepo
- Validates that nodes exist and are healthy
- Shows network topology clearly
- Doesn't break single-node usage (gracefully handles no siblings)

### Week-by-Week Plan

**Week 7: Node Identity + Discovery**

Core implementation:
- Define node.json schema
- Implement `createNodeIdentity()` during init
- Implement manifest discovery (`discoverFromManifest()`)
- Implement `ana nodes` command with pretty output

**Week 8: Auto-Scan + Validation**

Advanced discovery:
- Implement auto-scan discovery (walk parent dirs)
- Add `ana nodes --scan` to suggest nodes to add to manifest
- Node validation (check paths exist, node.json is valid)
- Handle edge cases (symlinks, nested nodes, missing nodes)

**MVP1.5 Deliverable:**
Node awareness working. Foundation ready for federation.

---

## MVP2: Federation Protocol (Week 9-12)

**Goal:** Full node federation. Query other nodes. Broadcast changes. Auto-generate exports.

**Building on MVP1.5:** Nodes know about each other. Now let them COMMUNICATE.

**This is where the moat is built.**

### Features

| Feature | Priority | Complexity | Description |
|---------|----------|------------|-------------|
| Query protocol | P0 | Medium | `ana query <node> "<question>"` (keyword search) |
| Query surface | P0 | Medium | Layered search (exports → patterns → main) |
| Keyword search | P0 | Low | Text-based keyword matching (no LLM, <100ms) |
| Broadcast protocol | P0 | Medium | `ana broadcast` → inbox files |
| Inbox commands | P0 | Medium | `ana inbox`, `inbox show`, `inbox apply` |
| Auto-exports (FastAPI) | P0 | High | Generate exports.md from OpenAPI |
| Auto-exports (TypeScript) | P1 | High | Generate exports.md from tree-sitter |

### Deliverables

**Query Protocol (Keyword Search - No LLM):**
```bash
$ ana query auth-service "How do I refresh a JWT token?"

Querying auth-service node...
✓ Found in federation/exports.md (87ms)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Auth-service: JWT Refresh Pattern
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use rotating refresh tokens with 7-day expiry.

Endpoint: POST /auth/refresh
Header: Authorization: Bearer <refresh_token>

Returns:
{
  "access_token": "...",
  "expires_in": 900
}

See: services/auth-service/src/auth/refresh.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Source: auth-service/federation/exports.md
Match: keyword (jwt, refresh, token)
```

**What happened mechanically:**
- CLI extracted keywords: [jwt, refresh, token]
- Read `auth-service/.ana/federation/exports.md`
- Scored sections by keyword frequency
- Returned top match
- **Pure text search, no LLM, <100ms**

**Used by Claude Code:**
```
You: @.ana/modes/code.md Implement JWT refresh

Claude: [Sees mode.md instruction to use ana query]
        [Executes: ana query auth-service "JWT refresh"]
        [Gets result above]
        [Uses it to write code]

You: [Stayed in chat, seamless]
```

**Broadcast Protocol:**
```bash
$ ana broadcast --topic api-change "Frontend requires paginated responses on all list endpoints"

Discovered 4 connected nodes.
Broadcasting to:
  ▸ auth-service
  ▸ catalog-api
  ▸ orders-api
  ▸ shared-lib

Deliver to all? [y/N]: y

✓ auth-service (inbox/2026-01-12T14-23-17Z_storefront__api-change.json)
✓ catalog-api (inbox/2026-01-12T14-23-17Z_storefront__api-change.json)
✓ orders-api (inbox/2026-01-12T14-23-17Z_storefront__api-change.json)
✓ shared-lib (inbox/2026-01-12T14-23-17Z_storefront__api-change.json)

Next: Backend teams will review with `ana inbox` in their nodes.
```

**Inbox Protocol:**
```bash
$ cd services/catalog-api
$ ana inbox

2 new federation messages:

[01] api-change from storefront (2 hours ago)
     "Frontend requires paginated responses on all list endpoints"

[02] question from mobile (1 day ago)
     "Can we add category filter to products API?"

$ ana inbox show 01

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Federation Message
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: storefront (apps/storefront)
Topic: api-change
Time: 2026-01-12 14:23:17 (2 hours ago)

Message:
Frontend requires paginated responses on all list endpoints

Suggested update:
Add to learned/explicit.md under "Incoming Requirements":
  - Storefront needs pagination (Jan 12, 2026)
    All list endpoints should return: {items: [], page: N, total: N}

Apply this update? [y/N]: y

$ ana inbox apply 01
✓ Appended to learned/explicit.md
✓ Marked message as reviewed
✓ Archived to inbox/.archive/
```

**Auto-Generated Exports (FastAPI example):**

```bash
$ cd services/auth-service
$ ana evolve

Analyzing changes...
✓ Detected: 3 files changed (auth endpoints)
✓ Reading OpenAPI schema from /openapi.json
✓ Generating federation/exports.md...

Changes to exports:
+ Added: POST /auth/refresh (refresh token endpoint)
+ Modified: POST /auth/login (now includes refresh_token in response)

✓ Updated federation/exports.md
✓ Context is current
```

**Generated exports.md:**
(See VISION.md for full example - auto-generated from OpenAPI schema)

### Week-by-Week Plan

**Week 9: Query Protocol (Keyword Search)**

Implementation:
- `discoverNode(name)` - Resolve node path from manifest
- `loadQuerySurface(nodeAnaPath)` - Load exports → patterns → main (prioritized)
- `extractKeywords(question)` - Parse question, remove stop words, extract terms
- `searchSurface(sections, keywords)` - Score sections by keyword matches (no LLM)
- `formatAnswer(hits)` - Pretty output with source attribution
- `ana query <node> "<question>"` command

**Key design:** Pure keyword matching (like grep but smarter). No LLM API calls. Fast (<100ms), free, local, deterministic.

**Used by Claude:** Mode files instruct Claude to execute `ana query` when needing cross-service info. Claude runs it as bash command, gets result, stays in chat.

**Week 10: Broadcast + Inbox**

Implementation:
- `deliverBroadcast(msg, targets)` - Write inbox JSON files
- `ana broadcast` command with topic + message
- `ana inbox` command - List pending messages
- `ana inbox show <id>` - Display message + suggested action
- `ana inbox apply <id>` - Accept and archive message

**Week 11: Auto-Exports (FastAPI)**

Implementation:
- `detectOpenAPISchema(nodeRoot)` - Find openapi.json
- `parseOpenAPIToMarkdown(schema)` - Convert to markdown
- `generateExportsFromOpenAPI()` - Create exports.md
- Integrate into `ana evolve` - Regenerate on code changes

**Week 12: Auto-Exports (TypeScript) + Polish**

Implementation:
- Tree-sitter TypeScript parser setup
- `extractPublicExports(ast)` - Find exported functions, types, components
- `parseJSDoc(node)` - Extract documentation
- `generateExportsFromTypeScript()` - Create exports.md
- Testing, error handling, edge cases
- Documentation and examples

**MVP2 Deliverable:**
Full federation protocol working. The moat is established.

---

## MVP3: Team & Cloud Features (Month 4-6)

**Goal:** Optional cloud sync, team features, dashboard, analytics. This enables Team tier ($99/mo) and justifies ongoing revenue.

**Building on MVP2:** Federation works locally. Now add cloud layer (OPTIONAL - local-first always works).

**Why wait until MVP3:**
- Core value is proven (MVP1)
- Moat is established (MVP2 federation)
- Now we can build revenue features
- Don't add cloud complexity until necessary

### Features

| Feature | Priority | Complexity | Tier |
|---------|----------|------------|------|
| Semantic query (LLM) | P0 | Medium | Free (user's API key) |
| Public node support | P1 | Medium | Free (HTTP fetch) |
| Cloud sync (Supabase) | P1 | High | Team |
| Team management | P1 | Medium | Team |
| Local dashboard | P2 | High | Pro |
| Pattern Cloud | P2 | High | Pro |
| Analytics | P2 | Medium | Team |
| Auto-learning daemon | P3 | High | Pro |
| Snapshots | P3 | Low | Pro |

### Cloud Architecture (Optional Layer)

**Supabase schema:**
```sql
-- Teams
create table teams (
  id uuid primary key,
  name text not null,
  created_at timestamptz default now()
);

-- Projects (one per node)
create table projects (
  id uuid primary key,
  team_id uuid references teams(id),
  node_name text not null,
  context_hash text,
  last_synced_at timestamptz
);

-- Shared patterns (Pattern Cloud)
create table patterns (
  id uuid primary key,
  framework text not null,        -- 'fastapi', 'nextjs', etc.
  pattern_type text not null,     -- 'error-handling', 'validation'
  content text not null,
  confidence float default 0.0,
  usage_count int default 0,
  created_at timestamptz default now()
);
```

**Sync protocol:**
```bash
$ ana sync --cloud

Connecting to cloud...
✓ Authenticated
✓ Team: acme-engineering

Syncing node: storefront
  ↑ Uploading context hash
  ↓ Checking for team updates
  ✓ No conflicts

Pattern Cloud:
  ↓ Downloaded 3 new patterns for Next.js
  → Added to context/patterns.md (under "Community Patterns")

✓ Sync complete
```

**Local dashboard:**
```bash
$ ana dashboard

Starting dashboard at http://localhost:4040
✓ Server running

Opening browser...
```

Dashboard shows:
- Health score visualization
- Node network graph (all connected nodes)
- Mode usage analytics
- Learning timeline (what's been learned)
- Pattern confidence scores
- Inbox messages (visual UI)
- Quick actions (evolve, query, broadcast)

### Week-by-Week Plan

**Weeks 13-14: Semantic Query + Public Nodes**
- Semantic search implementation (uses user's Anthropic/OpenAI API key)
- `ana query <node> "<q>" --semantic` flag
- Configuration: `ana config set semantic.api_key`
- Public node support (HTTP fetch for remote .ana/ folders)
- Cache remote nodes (TTL-based, don't re-fetch every query)
- `ana query nextjs "middleware"` where nextjs points to https://nextjs.org/.ana/

**Weeks 15-16: Cloud Infrastructure (Optional - If Validated)**
- Supabase project setup
- Auth system (email/password or GitHub OAuth)
- Team management API
- Sync protocol (upload context hash, download updates)
- **Only build if semantic queries prove valuable AND users want hosted option**

**Weeks 17-18: Dashboard (Local)**
- Express server + React frontend (served by CLI)
- Health score visualization
- Node network graph (show federation topology)
- Query history and analytics
- Mode usage charts

**Weeks 19-20: Team Features (If Cloud Validated)**
- Team sync (shared learning across nodes via Supabase)
- Analytics (onboarding time, pattern adoption)
- Admin controls (manage team members)
- Pattern Cloud (community patterns, opt-in sharing)

**MVP3 Deliverable:**
Cloud features working. Monetization enabled (Team tier).

---

## Post-MVP3: Continuous Improvement

### Month 7-12 (After MVP3)

**Priorities:**
1. **Community growth** - Templates, patterns, skill packs
2. **Language expansion** - Rust, Ruby, PHP, Java support
3. **Advanced features** - Semantic search (embeddings), AI mode creation, mode chaining
4. **Enterprise features** - SSO/SAML, audit logs, on-prem
5. **Integrations** - VS Code extension, Slack bot, Linear/Jira hooks

**Guided by:**
- User feedback (what do people actually want?)
- Usage data (which features are used most?)
- Revenue signals (what drives Team tier conversions?)

---

## Validation Gates (Don't Build Next Phase Until...)

### After MVP0 → Before MVP1
**Validate:**
- Does the file structure work?
- Do modes provide value?
- Is manual context too painful? (Answer: yes → motivates auto-generation)

**Decision:** Proceed to MVP1 (smart generation)

### After MVP1 → Before MVP1.5
**Validate:**
- Is auto-generated context useful? (80%+ accurate)
- Do we use it daily? (Saves time vs. manual)
- Does it work on different project types? (Python, Node, Go)

**Decision:** If yes → Proceed to MVP1.5 (add node awareness)

### After MVP1.5 → Before MVP2
**Validate:**
- Do we have multiple .ana/ nodes in our projects?
- Would we benefit from cross-node queries?
- Is the complexity justified?

**Decision:** If yes → Proceed to MVP2 (full federation)

### After MVP2 → Before MVP3
**Validate:**
- Does federation save significant time? (2+ hours/week)
- Do we query nodes regularly? (Daily usage)
- Would we pay for cloud sync? (Validates Team tier)

**Decision:** If yes → Proceed to MVP3 (cloud features)

**If any validation fails:** Iterate on current phase, don't advance.

---

## The Philosophy: Progressive Complexity

```
Week 1-2 (MVP0):
Simple but working
├─ Can we create .ana/ folders?
└─ Do modes work?

Week 3-6 (MVP1):
Smart but focused
├─ Can we auto-generate useful context?
└─ Does this save time vs. manual?

Week 7-8 (MVP1.5):
Aware but not complex
├─ Can we detect sibling nodes?
└─ Does topology visualization add value?

Week 9-12 (MVP2):
Sophisticated but practical
├─ Can nodes query each other?
├─ Does coordination work safely?
└─ Do auto-exports eliminate maintenance?

Month 4-6 (MVP3):
Powerful but optional
├─ Does cloud sync add value?
├─ Will teams pay for this?
└─ Is dashboard worth building?
```

**Each phase answers questions before building more.**

This is how you build something great - validate continuously, add layers carefully.

---

## Risk Mitigation

### Risk: Federation is too complex

**Mitigation:**
- MVP1.5 is just detection (low risk)
- MVP2 starts with simple file-based protocol
- Each feature is optional (federation/nodes.json is opt-in)
- Single-node usage always works (no federation overhead)

### Risk: Auto-exports doesn't work well

**Mitigation:**
- Start with FastAPI (OpenAPI is clean and structured)
- Add TypeScript second (tree-sitter is mature)
- Fall back to manual exports.md if auto-gen fails
- Users can edit exports.md (it's just markdown)

### Risk: Nobody uses federation

**Mitigation:**
- Validate with our own monorepo first
- Don't build MVP3 unless we're using MVP2 daily
- Can stay single-node focused if federation doesn't prove valuable
- No sunk cost (federation is additive, not core rewrite)

### Risk: Anthropic/Cursor ships similar feature

**Mitigation:**
- Move fast (12 weeks to MVP2 vs. their quarterly releases)
- Open source core (hard to compete with free)
- Federation is complex (they won't prioritize it quickly)
- Tool-agnostic positioning (we work with everyone, they don't)

---

## Success Metrics by Phase

### MVP0 (Week 2)
- ✅ CLI works
- ✅ Creates valid .ana/ folders
- ✅ Modes are readable
- ✅ File structure is right

### MVP1 (Week 6)
- ✅ Auto-generation works (80%+ accurate)
- ✅ We use it daily (3+ projects)
- ✅ Saves 10+ minutes per session
- ✅ Better than manual CLAUDE.md

### MVP1.5 (Week 8)
- ✅ Detects sibling nodes correctly
- ✅ Shows useful topology
- ✅ No bugs in detection
- ✅ Works in our monorepo

### MVP2 (Week 12)
- ✅ Query protocol working
- ✅ We use ana query 3+ times per day
- ✅ Saves 2+ hours per week
- ✅ Auto-exports.md for FastAPI
- ✅ Broadcast works safely
- ✅ No production bugs

### MVP3 (Month 6)
- ✅ Cloud sync working
- ✅ Dashboard useful
- ✅ Team features validated
- ✅ 100+ GitHub stars
- ✅ 10+ external users
- ✅ 2+ teams willing to pay

---

## Timeline Summary

| Phase | Duration | Cumulative | Focus |
|-------|----------|------------|-------|
| MVP0 | 2 weeks | Week 2 | Foundation |
| MVP1 | 4 weeks | Week 6 | Core value |
| MVP1.5 | 2 weeks | Week 8 | Node awareness |
| MVP2 | 4 weeks | Week 12 | Federation moat |
| MVP3 | 8 weeks | Week 20 | Team & cloud |

**Total to MVP2 (moat established):** 12 weeks
**Total to MVP3 (revenue-ready):** 20 weeks (5 months)

**Key milestones:**
- Week 2: First dogfood (MVP0)
- Week 6: Real value proven (MVP1)
- Week 8: Federation foundation (MVP1.5)
- Week 12: Moat complete (MVP2)
- Week 20: Revenue-ready (MVP3)

---

## What We Don't Build (Scope Discipline)

### Not in MVP0-2
❌ Cloud anything (fully local)
❌ Dashboard/UI (CLI only)
❌ Semantic search (lexical is fine)
❌ Custom mode creation (5 default modes)
❌ Team sync (federation is local)
❌ Pattern marketplace (just local patterns)
❌ Integrations (Linear, Slack, etc.)

### Not in MVP3
❌ Multi-language support beyond Python/Node/Go
❌ Advanced learning (basic tracking is enough)
❌ Enterprise features (SSO, audit, on-prem)
❌ Mobile app or desktop app
❌ AI model fine-tuning

### Maybe Never
❌ Become an IDE
❌ Replace Git
❌ Manage infrastructure
❌ Run CI/CD
❌ Compete with GitHub/GitLab

**Stay focused:** We're the AI context layer. Nothing more, nothing less.

---

## The Path is Clear

```
Week 1-2:   Foundation     → Can we create .ana/?
Week 3-6:   Value          → Does auto-generation work?
Week 7-8:   Awareness      → Can we detect nodes?
Week 9-12:  Innovation     → Does federation create moat?
Month 4-6:  Revenue        → Will teams pay?
```

**Each step validates before the next.**

**The trajectory feels inevitable - like it was planned by god.**

That's the plan. Now read TECHNICAL_ARCHITECTURE.md for the HOW.

---

## Research Sources

- **GraphQL Federation:** [Apollo case study](https://www.apollographql.com/blog/announcement/expedia-improved-performance-by-moving-from-schema-stitching-to-apollo-federation/)
- **Backstage:** [Software catalog](https://backstage.io/docs/features/software-catalog/), [Monorepo guide](https://roadie.io/blog/backstage-monorepo-guide/)
- **DDD:** [Martin Fowler on Bounded Contexts](https://martinfowler.com/bliki/BoundedContext.html)
- **Monorepo Tools:** [Nx vs Turborepo](https://monorepo.tools/)
- **Service Mesh:** [Consul](https://developer.hashicorp.com/consul/docs/use-case/service-mesh), [Istio federation](https://istio.io/latest/docs/ops/deployment/deployment-models/)
