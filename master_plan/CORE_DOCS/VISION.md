# Anatomia Vision - The Complete Picture

**Last Updated:** January 12, 2026
**Status:** Definitive strategic vision

---

## The Product in One Sentence

**Anatomia creates federated AI intelligence nodes across your codebase - each node understands its domain deeply and coordinates with siblings to provide organization-wide context.**

---

## Part 1: The Core Problem

### What Everyone Else Gets Wrong

**Current AI coding tools assume:**
- One codebase = One context
- One AI assistant = Understands everything
- One CLAUDE.md or .cursorrules file = Sufficient

**The reality of large codebases:**
```
enterprise-monorepo/              ← 10M lines (impossible to context in one .ana/)
├── apps/
│   ├── storefront/               ← Frontend team (50K lines)
│   ├── seller-dashboard/         ← Seller team (30K lines)
│   └── mobile/                   ← Mobile team (40K lines)
├── services/
│   ├── catalog-api/              ← Catalog team (20K lines)
│   ├── orders-api/               ← Orders team (25K lines)
│   └── auth-service/             ← Platform team (15K lines)
└── packages/
    └── shared-ui/                ← Design system team (10K lines)
```

**Each chunk:**
- Owned by a different team
- Has different patterns and conventions
- Uses different technologies
- Needs deep, specialized understanding

**The problem:** You can't create one .ana/ for 10M lines. It's:
- Too much context (overwhelms AI)
- Too generic (can't be deep on everything)
- Too stale (changes too fast to keep current)
- Too broad (frontend team doesn't need backend DB schema details)

### What Developers Actually Need

**Frontend developer needs to:**
- Understand frontend patterns deeply (their domain)
- Know auth-service API contracts (interface, not implementation)
- Know catalog-api endpoints (what's available, not how it works)
- Ask backend teams questions when needed
- Get notified when backend changes affect frontend

**They DON'T need:**
- Backend database migration patterns
- Infrastructure deployment configs
- Mobile app native code details
- Full understanding of every service

**This is bounded context thinking** - from Domain-Driven Design.

---

## Part 2: The Solution - Federated Nodes

### The Concept

**Each bounded context gets its own `.ana/` node:**

```
apps/storefront/.ana/              ← Node Alpha (Frontend team)
services/auth-service/.ana/        ← Node Beta (Platform team)
services/catalog-api/.ana/         ← Node Gamma (Catalog team)
```

**Each node:**
1. **Specializes** - Deeply understands its bounded context (20-50K lines)
2. **Discovers** - Finds sibling nodes (via manifest or auto-scan)
3. **Publishes** - Exports interfaces via auto-generated `exports.md`
4. **Queries** - CLI tool searches other nodes (keyword or optional semantic)
5. **Broadcasts** - Notifies others of changes (with human review)
6. **Learns** - Tracks outcomes in its domain

**Together, nodes form a network:**
- Distributed knowledge (not centralized)
- Team-aligned boundaries (matches reality)
- Cross-context awareness (without overwhelming detail)
- Coordination without centralization

### Three Levels of Federation

**Level 1: Hierarchical Nodes (Same Repo)**
```
my-fullstack-app/
├── .ana/                        ← Root: Project overview, architecture
├── frontend/
│   ├── .ana/                    ← Frontend: React patterns, components
│   └── src/
└── api/
    ├── .ana/                    ← Backend: FastAPI endpoints, database
    └── src/
```

**Solo dev benefits:**
- Organize knowledge like you organize code
- Frontend .ana/ deep on UI, lightweight on API
- Backend .ana/ deep on endpoints, lightweight on UI
- `ana query frontend "component patterns"` gets targeted info

**Level 2: Cross-Repo Nodes (Team/Org)**
```
company-repos/
├── storefront-app/.ana/
├── auth-service/.ana/
├── products-api/.ana/
└── shared-utils/.ana/
```

**Team coordination:**
- `ana query auth-service "JWT patterns"`
- `ana broadcast "API v2 required"`
- Works across separate repos (manifest points to git checkouts)

**Level 3: Public Nodes (Cross-Internet - Future MVP3+)**
```
your-app/.ana/federation/nodes.json:
{
  "nodes": [
    {"name": "nextjs", "url": "https://nextjs.org/.ana/"},
    {"name": "stripe", "url": "https://stripe.com/.ana/"}
  ]
}
```

**Query official framework/API docs:**
- `ana query nextjs "middleware setup"`
- `ana query stripe "subscription flow"`
- Official sources, always current, integrated in your workflow

### Example: Cross-Node Query (How It Actually Works)

**Scenario:** Frontend developer working in storefront with Claude Code, needs auth pattern.

**Traditional approach:**
```
1. Search auth-service repo manually (5 min)
2. Read through auth code (10 min)
3. Explain to Claude what you found (2 min)
4. Claude loads 7 files from auth-service (slow, wastes context)
Total: 17 minutes + bloated context
```

**With Anatomia nodes:**

**In Claude Code chat (never leave chat):**
```
You: @.ana/modes/code.md Implement JWT refresh in the frontend

Claude: [Reads code.md which instructs: "For auth patterns, use: ana query auth-api"]
        Let me check the auth-api for JWT patterns.

        [Executes bash command:]
        > ana query auth-api "JWT refresh pattern"

        [CLI searches auth-api/.ana/federation/exports.md]
        [Returns in 94ms:]

        Rotating refresh tokens, 7-day expiry
        Endpoint: POST /auth/refresh
        Header: Authorization: Bearer <refresh_token>

        [Claude now has the answer]

        Based on your auth-api's JWT pattern, here's the implementation:
        [writes code following that pattern]

You: [Never left chat - seamless experience]
```

**What actually happened mechanically:**
1. Claude read `code.md` (instructions include "use ana query for auth")
2. Claude executed CLI command: `ana query auth-api "JWT refresh pattern"`
3. CLI tool did **keyword search** (not LLM - just text matching):
   - Found auth-api node via manifest
   - Read `auth-api/.ana/federation/exports.md`
   - Searched for keywords: [jwt, refresh, pattern, token]
   - Returned matching section (50 lines, not full file)
4. Claude received result and used it in response
5. **Total time: <100ms, no LLM involved, pure local file search**

**Value:**
- Stay in chat (no terminal switching)
- Targeted context (50 lines vs 2,000 lines of auth-service code)
- Always current (exports.md auto-generated from OpenAPI)
- Fast (<100ms keyword search)
- Free (no API calls)
- Claude reads focused info only

### Example: Cross-Node Broadcast

**Scenario:** Frontend team changes API requirements.

```bash
$ cd apps/storefront
$ ana broadcast --topic api-change "Frontend now requires API v2 endpoints (paginated responses)"

Discovered 4 connected nodes.
Broadcasting...
✓ auth-service (inbox message delivered)
✓ catalog-api (inbox message delivered)
✓ orders-api (inbox message delivered)
✓ shared-lib (inbox message delivered)

Next: Backend teams will review with `ana inbox`
```

**What happens in backend teams:**

```bash
$ cd services/catalog-api
$ ana inbox

2 new federation messages:

[01] api-change from storefront
     "Frontend now requires API v2 endpoints (paginated responses)"

$ ana inbox show 01
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: storefront (apps/storefront)
Topic: api-change
Timestamp: 2026-01-12 14:23:17

Message:
Frontend now requires API v2 endpoints (paginated responses)

Suggested action:
Add to learned/explicit.md:
  ## Incoming Requirements
  - Storefront needs paginated responses (Jan 12, 2026)

Review and apply? [y/N]

$ ana inbox apply 01
✓ Appended to learned/explicit.md
✓ Marked as reviewed
```

**Value:**
- Frontend broadcasts once (not 4 Slack messages)
- Backend teams notified in their workflow (not interrupting)
- Human review required (safe, not auto-updating)
- Git-trackable (inbox files are version controlled)
- Coordination without meetings

---

## Part 3: Why This is the Innovation

### What Makes Nodes Different

**Comparison:**

| Approach | Context Scope | Discovery | Communication | Example |
|----------|--------------|-----------|---------------|---------|
| **CLAUDE.md** | Single file | None | None | One markdown file |
| **Claude Skills** | Per-skill | None | None | Individual skill folders |
| **Cursor Rules** | Per-workspace | None | None | One .cursorrules |
| **Copilot Spaces** | Per-repo | Manual | None | Shared context space |
| **Anatomia Nodes** | Per-bounded-context | Automatic | Query + Broadcast | Federated network |

**Key differences:**
1. **Scoped intelligence** - Each node is a specialist, not a generalist
2. **Automatic discovery** - Nodes find siblings (manifest or auto-scan)
3. **Cross-context queries** - Deterministic, addressable (not hoping AI figures it out)
4. **Safe coordination** - Broadcasts with human review
5. **Scales correctly** - 10 nodes better than 1 overloaded context

### The Validated Patterns We're Applying

**1. Backstage Software Catalog**
- **Pattern:** Each service owns metadata file (catalog-info.yaml)
- **Validation:** Spotify uses this at scale (thousands of services)
- **Our application:** Each .ana/ has node.json (metadata) + exports.md (contracts)

**2. GraphQL Federation**
- **Pattern:** Teams own subgraphs, publish schemas, system composes
- **Validation:** Apollo Federation, The Guild, adopted by enterprises
- **Our application:** Nodes publish exports (interfaces), queries compose on-demand

**3. DDD Bounded Contexts**
- **Pattern:** Large systems split by team boundaries, explicit interfaces
- **Validation:** Industry standard (Eric Evans, Martin Fowler)
- **Our application:** One node = one bounded context = one team's domain

**4. Service Mesh Discovery**
- **Pattern:** Services discover each other (Consul gossip, Kubernetes DNS)
- **Validation:** Production-grade distributed systems
- **Our application:** Nodes discover via manifest (simple) or auto-scan (Week 2+)

**5. Nx Project Graphs**
- **Pattern:** Monorepo as graph of projects with dependencies
- **Validation:** Used in massive monorepos (Google, Microsoft)
- **Our application:** Nodes form graph, dependencies detected from imports

**We're not inventing** - we're applying proven distributed systems patterns to AI context management.

Nobody else is doing this because they think "AI tools, not distributed systems."

We think: "AI context IS a distributed systems problem."

---

## Part 4: The Killer Detail - Auto-Generated Exports

### The Problem with Manual Documentation

**Claude Skills, Cursor Rules, MCP:** All require manual maintenance.

When auth-service changes JWT pattern:
1. Developer updates code
2. Forgets to update SKILL.md or rules
3. AI gives wrong advice
4. Wastes developer time with outdated info

**Manual maintenance doesn't scale.**

### The Anatomia Approach: Generate from Code

**For APIs (FastAPI, Express, Django REST):**

```bash
$ ana evolve

Analyzing changes...
✓ Detected: auth endpoints updated
✓ Regenerating exports.md from OpenAPI schema...
✓ Updated: federation/exports.md

Changes:
+ Added: POST /auth/refresh (refresh token endpoint)
+ Modified: POST /auth/login (now returns refresh token)
```

**How it works:**
1. FastAPI already generates OpenAPI schema automatically (`/openapi.json`)
2. Anatomia reads that schema (just a file read)
3. Converts to clean markdown format with headings and examples
4. Writes to `federation/exports.md`
5. Other nodes can query this file via CLI tool (keyword search finds sections)
6. **Your AI (Claude/Cursor) executes `ana query` and gets focused context**

**The UX flow when using with Claude Code:**
```
You: @.ana/modes/code.md Implement auth

Claude: [Reads code.md - sees instruction to use ana query]
        [Executes: ana query auth-api "endpoints"]
        [CLI keyword-searches exports.md, returns relevant section in <100ms]
        [Claude now has current auth pattern without reading full codebase]
        [Writes code using that pattern]

You: [Never left chat, Claude handled the routing]
```

**For non-API code (libraries, shared packages):**

```bash
$ ana evolve

Analyzing shared-ui package...
✓ Parsing TypeScript with tree-sitter
✓ Extracting public exports...
✓ Regenerated exports.md

Exports detected:
- Button component (props: variant, size, onClick)
- Input component (props: type, value, onChange, error)
- useAuth hook (returns: user, login, logout)
```

**How it works:**
1. Tree-sitter parses TypeScript/Python files
2. Extracts public exports (not private internals)
3. Extracts JSDoc/docstrings
4. Generates markdown documentation
5. Updates `exports.md`

**Result:**
- Interfaces always current (regenerated on every evolve)
- Zero manual work (automatic from code)
- Other nodes query real, up-to-date contracts
- The anti-thesis of manual Skills/Rules maintenance

### Why Competitors Won't Build This

**Anthropic (Claude Skills):**
- Skills are prompts, not code-aware
- No infrastructure to parse OpenAPI or run tree-sitter
- Would require shipping code analysis tools (out of scope)
- Skills are meant to be model-invoked, not deterministically queried

**Cursor:**
- IDE-focused, not repo-graph focused
- Would need to add code parsing layer
- Conflicts with "one workspace = one context" model
- Rules are meant to be simple text, not generated

**GitHub Copilot:**
- Already has OpenAPI parsing (for API completions)
- But Copilot doesn't expose this as "shareable context"
- Strategic conflict: GitHub wants you in GitHub ecosystem
- Won't build tool-agnostic federation

**We can build this because:**
- We're CLI-native (can run tree-sitter, parse OpenAPI)
- We're file-based (outputs are just markdown)
- We're tool-agnostic (no IDE or platform lock-in)
- We think distributed systems, not monolithic tools

---

## Part 5: The Trifecta (Our Moat)

**Feature 1: Scoped Nodes (Bounded Contexts)**
- Each .ana/ owns 20-50K lines (team-sized)
- Deep understanding of its domain
- Automatic boundary detection (package.json, folder structure)

**Feature 2: Federation Protocol (Discovery + Query + Broadcast)**
- Nodes discover siblings (manifest-based)
- Query protocol: `ana query <node> "<question>"`
- Broadcast protocol: `ana broadcast "<message>"` with inbox review
- Zero infrastructure (file-based, local-first)

**Feature 3: Auto-Generated Interfaces (exports.md)**
- APIs: Generated from OpenAPI/GraphQL schemas
- Libraries: Generated from tree-sitter AST parsing
- Regenerates on every `ana evolve`
- Always current, zero maintenance

**Why this trifecta creates a moat:**

**Individually:** Each is valuable
- Scoped nodes: Better than monolithic context
- Federation: Enables cross-team coordination
- Auto-exports: Eliminates manual maintenance

**Together:** Unreplicatable
- Nodes provide structure for federation
- Federation creates need for exports
- Auto-exports make federation practical (no manual docs)
- Network effect: More nodes = more valuable
- Learning compounds: Each node learns, network gets smarter
- Community effect: Shared node templates emerge

**Strategic moat:**
1. **First-mover:** Establish .ana/ as standard before competitors notice
2. **Technical depth:** Requires distributed systems + code analysis expertise
3. **Platform play:** Network effects make it sticky
4. **Open source:** Community contributions = free R&D
5. **Unfair advantage:** We've built this pattern 4 times (IRIS, ATLAS, PROTO, Power BI)

---

## Part 6: How This Scales

### Solo Developer (1 node)
```
my-app/.ana/
```
**Value:** Smart context, specialized modes, learning
**Experience:** Same as single-project .ana/ (no federation overhead)

### Small Team (3-5 nodes)
```
monorepo/
├── frontend/.ana/
├── api/.ana/
└── mobile/.ana/
```
**Value:** Cross-team queries, change broadcasts, shared patterns
**Experience:** `ana query api "endpoints?"` instant answers

### Large Org (20+ nodes)
```
enterprise/
├── apps/ (5 nodes)
├── services/ (12 nodes)
└── packages/ (8 nodes)
```
**Value:** Organization-wide intelligence, coordinated changes, onboarding acceleration
**Experience:** New dev queries any node, gets org knowledge immediately

### Multi-Repo Microservices (10+ separate repos)
```
team-repos/
├── storefront-repo/.ana/
├── auth-repo/.ana/
├── catalog-repo/.ana/
└── ...
```
**Value:** Cross-repo context (even without monorepo)
**Experience:** Federation config points to sibling repos (git checkouts)

**The beauty:** Scales from 1 to 100 nodes seamlessly.

---

## Part 7: Technical Foundation (High-Level)

### The .ana/ Structure (Single Node)

```
.ana/
├── node.json                    # Node identity and config
├── context/
│   ├── main.md                  # Auto-generated project overview
│   ├── patterns.md              # Detected patterns
│   └── conventions.md           # Coding standards
├── modes/
│   ├── architect.md             # System design mode
│   ├── code.md                  # Coding mode
│   ├── debug.md                 # Debugging mode
│   ├── docs.md                  # Documentation mode
│   └── test.md                  # Testing mode
├── federation/
│   ├── nodes.json               # Explicit neighbor list (manifest)
│   ├── exports.md               # Auto-generated interfaces (queryable)
│   └── inbox/                   # Incoming broadcasts
│       └── *.json               # Broadcast message files
├── learning/
│   ├── explicit.md              # User-taught knowledge
│   ├── outcomes.log             # Git hook data
│   └── patterns.md              # Learned patterns
└── .state/                      # Gitignored
    ├── cache/                   # Analysis cache
    └── session.json             # Session state
```

### Node Identity (node.json)

```json
{
  "version": 1,
  "node": {
    "name": "auth-service",
    "role": "authentication",
    "owner": "platform-team",
    "description": "Authentication, authorization, sessions, tokens",
    "tags": ["jwt", "oauth", "sessions"],
    "boundaries": {
      "root": "services/auth-service",
      "includes": ["src/**", "tests/**"],
      "excludes": ["node_modules/**"]
    }
  },
  "federation": {
    "queryable": true,
    "exports": {
      "file": "federation/exports.md",
      "auto_generate": true,
      "sources": ["openapi"]
    },
    "broadcast": {
      "accept": true,
      "requires_review": true,
      "inbox": "federation/inbox"
    }
  }
}
```

### Federation Manifest (federation/nodes.json)

**In apps/storefront/.ana/federation/nodes.json:**

```json
{
  "version": 1,
  "nodes": [
    {
      "name": "auth-service",
      "path": "../../services/auth-service",
      "role": "authentication",
      "priority": "high"
    },
    {
      "name": "catalog-api",
      "path": "../../services/catalog-api",
      "role": "products"
    },
    {
      "name": "shared-ui",
      "path": "../../packages/shared-ui",
      "role": "components"
    }
  ]
}
```

**What this enables:**
- Explicit relationships (storefront depends on auth, catalog, shared-ui)
- Deterministic queries (know exactly which nodes exist)
- Fast discovery (no expensive scanning)
- Cross-repo support (paths can be git checkouts)

### Auto-Generated Exports (exports.md)

**For FastAPI service:**

```markdown
# Auth Service - API Exports

Auto-generated from OpenAPI schema
Last updated: 2026-01-12 14:23:17

## Endpoints

### POST /auth/login
Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "string (JWT, 15min expiry)",
  "refresh_token": "string (opaque, 7day expiry)",
  "user": { ... }
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
Header: `Authorization: Bearer <refresh_token>`

**Response:**
```json
{
  "access_token": "string",
  "expires_in": 900
}
```

## Models

### UserSchema (Pydantic)
```python
email: EmailStr
username: str
role: UserRole
created_at: datetime
```

## Patterns

### Error Handling
All endpoints return structured errors:
```json
{
  "error": "string",
  "code": "AUTH_ERROR_CODE",
  "details": { ... }
}
```

### Authentication Flow
1. POST /auth/login → receive tokens
2. Store refresh_token securely
3. Use access_token for API calls (15min valid)
4. POST /auth/refresh before expiry
5. Repeat

---

_Auto-generated by Anatomia from OpenAPI schema_
_Source: services/auth-service/openapi.json_
```

**How this is generated:**

```typescript
// When FastAPI service runs ana evolve:
async function generateExportsFromOpenAPI(nodeRoot: string) {
  const openApiPath = join(nodeRoot, "openapi.json");
  const schema = JSON.parse(await fs.readFile(openApiPath, "utf8"));

  const markdown = convertOpenAPIToMarkdown(schema);
  // Extracts: endpoints, models, auth patterns, error formats

  await fs.writeFile(
    join(nodeRoot, ".ana/federation/exports.md"),
    markdown,
    "utf8"
  );
}
```

**For TypeScript library:**

```markdown
# Shared UI - Component Exports

Auto-generated from TypeScript exports
Last updated: 2026-01-12 14:25:42

## Components

### Button
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}
```

Usage:
```tsx
import { Button } from '@acme/shared-ui';

<Button variant="primary" size="lg">
  Click me
</Button>
```

### Input
```typescript
interface InputProps {
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}
```

## Hooks

### useAuth
```typescript
function useAuth(): {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}
```

Returns current auth state and methods.

---

_Auto-generated by Anatomia from TypeScript exports_
_Source: packages/shared-ui/src/index.ts_
```

**How this is generated:**

```typescript
// Tree-sitter parses TypeScript:
async function generateExportsFromTypeScript(nodeRoot: string) {
  const indexPath = join(nodeRoot, "src/index.ts");
  const ast = await parseWithTreeSitter(indexPath, "typescript");

  const exports = extractPublicExports(ast);
  // Finds: export { Button }, export function useAuth(), etc.

  const markdown = convertExportsToMarkdown(exports);
  // Includes: type signatures, JSDoc comments, usage examples

  await fs.writeFile(
    join(nodeRoot, ".ana/federation/exports.md"),
    markdown,
    "utf8"
  );
}
```

**Why this matters:**
- **Always current** - Regenerates on code changes
- **Zero maintenance** - No manual docs to update
- **Queryable** - Other nodes get accurate interfaces
- **Source of truth** - Code → exports, not docs → maybe-code

**This is the innovation within the innovation.**

---

## Part 8: Query Implementation Options (Keyword vs Semantic)

### MVP2: Keyword Search (Default - Fast, Free, Local)

**How it works:**
```bash
$ ana query auth-api "JWT refresh pattern"

# Pure text processing (no LLM):
1. Extract keywords: [jwt, refresh, pattern, token]
2. Read auth-api/.ana/federation/exports.md
3. Score sections by keyword matches
4. Return top result (in <100ms)
```

**When to use:**
- Structured docs (exports.md has clear headings)
- Known terminology (JWT, endpoint, API, pattern)
- Speed matters (instant results)
- Offline work (no internet needed)

**Good enough for 80%+ of queries.**

---

### MVP3+: Semantic Search (Optional - Better, Uses LLM)

**How it works:**
```bash
$ ana query auth-api "How do I keep users logged in?" --semantic

# Uses LLM (with user's API key):
1. Read auth-api/.ana/federation/exports.md
2. Send to Anthropic/OpenAI API:
   "Given this context, answer: How do I keep users logged in?"
3. LLM understands semantic meaning (maps to refresh tokens)
4. Returns synthesized answer (in 2-5 seconds)
```

**User provides API key:**
```bash
$ ana config set semantic.api_key sk-ant-...
$ ana config set semantic.model claude-haiku-4
```

**When to use:**
- Natural language questions
- Complex/multi-part queries
- When keyword search returns poor results

**Who pays:** User (their Anthropic/OpenAI credits, ~$0.01 per query)

**Who hosts:** Anthropic/OpenAI (we don't run servers, just pass-through)

---

### Future: Anatomia Cloud (Optional Paid Service)

**For users who don't want to manage API keys:**
```bash
$ ana login  # Authenticate with anatomia.dev
$ ana query auth-api "question" --cloud
# Uses Team tier credits, we handle billing
```

**Only build if there's demand.** Not required for core value.

---

### How Claude Code Uses This (The Real UX)

**Your .ana/modes/code.md contains routing instructions:**
```markdown
# Code Mode

## Cross-Service Context

For auth/session questions: `ana query auth-api "<question>"`
For product/catalog questions: `ana query products-api "<question>"`

The CLI will search the target service's exports and return focused info.
Use this to get current patterns without reading full codebases.

Default: keyword search (instant, free)
Optional: add --semantic flag for LLM-powered search (requires API key setup)
```

**When you chat with Claude:**
```
You: @.ana/modes/code.md Implement JWT refresh

Claude: [Reads code.md, sees ana query instruction]
        [Executes bash: ana query auth-api "JWT refresh pattern"]
        [Gets result from keyword search in <100ms]
        [Uses that info to write code]

You: [Stayed in chat the whole time]
```

**Key point:** The CLI is a **tool for Claude to execute** (like git, npm, pytest). Not something you run manually (though you can). Claude handles the routing, you stay in conversation.

---

## Part 9: Where This Goes (2026-2028)

### Near-Term (2026)

**Developers use Anatomia because:**
- Setup is instant (30 seconds vs. hours for Skills)
- Context stays current (auto-evolve vs. manual updates)
- Works everywhere (Claude, Cursor, Windsurf)
- Free and open source (vs. potential paid tiers from big players)

**Federation is niche:** Most users have 1 node (solo projects). But the 10% with monorepos/teams find it invaluable.

### Mid-Term (2027)

**.ana/ becomes common:**
- Developers expect it in repos (like README or package.json)
- Job postings mention it ("Experience with .ana/ workflows")
- Bootcamps teach it ("Set up your .ana/ for AI assistance")

**Nodes become standard for large orgs:**
- Enterprise teams adopt federated nodes
- Internal templates emerge ("our-company/.ana/ standard")
- Platform teams maintain shared nodes (design systems, auth, etc.)

**Ecosystem emerges:**
- Community templates ("awesome-ana-frameworks")
- Skill packs for frameworks (NextJS.ana, FastAPI.ana)
- Integration plugins (Linear, Jira, Slack)

### Long-Term (2028)

**Platform maturity:**
- .ana/ is THE standard for AI context (like Dockerfile for containers)
- Multiple tools implement .ana/ readers (even competitors)
- Network effects kick in (10,000+ projects using .ana/)
- Pattern Cloud has massive data (collective intelligence)

**Nodes enable new workflows:**
- Multi-agent systems (one agent per node, coordinated)
- Autonomous refactoring (agents coordinate across services)
- AI-driven architecture reviews (agents analyze cross-node dependencies)
- Onboarding bots (new dev asks any node, gets org knowledge)

**Anatomia becomes infrastructure:**
- Not "a tool" but "the layer"
- Like Git (everyone uses it, many tools support it)
- Revenue from cloud sync, team features, enterprise
- Community-driven core, commercial cloud services

---

## Part 9: What We're NOT Building

**To stay focused:**

❌ **Not a code editor** - Works with any editor/AI tool
❌ **Not a centralized SaaS** - Local-first, cloud optional
❌ **Not a model provider** - Uses your AI tool's models
❌ **Not a replacement for Skills/Rules** - Complements them (or auto-generates them)
❌ **Not enterprise-only** - Valuable for solo devs, scales to orgs
❌ **Not infrastructure-heavy** - Works offline, no servers required
❌ **Not trying to be "everything"** - Focused on context management

**We ARE building:**

✅ **Auto-generator** - Creates .ana/ in 30 seconds
✅ **Federation protocol** - Nodes discover and communicate
✅ **Learning engine** - Tracks outcomes, improves over time
✅ **Tool-agnostic layer** - Works with any AI assistant
✅ **Open standard** - .ana/ format that anyone can implement
✅ **Community platform** - Shared templates and patterns
✅ **Enterprise-ready** - Scales from 1 to 100 nodes

---

## Part 10: Success Criteria

### Technical Success

**MVP1 (Week 6):**
- Single node generates useful context (not generic)
- 5 modes all work
- We use it daily on 3 projects
- Better than manual CLAUDE.md

**MVP2 (Week 12):**
- Node federation working
- Query protocol saves us 2+ hours/week
- Auto-generated exports.md for FastAPI
- Used across our monorepo (5+ nodes)

**MVP3 (Month 6):**
- Cloud sync working (optional)
- Dashboard visualization
- Team features (shared learning)
- Pattern marketplace (basic)

### Adoption Success

**Month 1:**
- 100+ GitHub stars
- 50+ npm installs
- 10+ developers using it

**Month 6:**
- 500+ stars
- 200+ active users
- 20+ monorepos using federation
- 5+ contributed node templates

**Year 1:**
- 2,000+ stars
- 1,000+ active users
- .ana/ mentioned in blog posts, tutorials
- Other tools add .ana/ readers
- Revenue from Pro/Team tiers

### Platform Success

**.ana/ becomes standard:**
- Found in 10,000+ repos
- Referenced in documentation ("add .ana/ for AI support")
- Multiple tools support reading .ana/
- Community maintains template library
- Enterprise teams have internal .ana/ standards

**Network effects visible:**
- Pattern Cloud has collective intelligence
- Node templates improve from community use
- Onboarding time drops measurably with .ana/
- Teams won't work without it ("How did we do this before .ana/?")

---

## Part 11: Why We'll Win

### We Have Validated the Pattern

**Most startups:** Guess at what works, iterate, maybe find product-market fit.

**Us:** We've built this 4 times manually.
- IRIS2: Modes + progress tracking (works)
- ATLAS3: Orchestration + learning loops (works)
- PROTO: Pattern libraries + rapid generation (works)
- Power BI Framework: Team loved it, asked "where does this live?" (validated need)

**We're not guessing.** We're automating what we know works.

### We're Solving a Real Problem

**The context problem is the #1 AI coding bottleneck:**
- 85% of developers use AI tools (massive market)
- Everyone re-explains their project every session (universal pain)
- Claude Skills exists but is manual (validates need, shows gap)
- Cursor Rules/Memory show persistence works (validated)
- No one has federation (blue ocean)

### We Have the Domain Expertise

**Competitors:**
- AI companies: Think models, not distributed systems
- IDE companies: Think editors, not federation protocols
- Big tech: Too slow, too conservative, too locked-in

**Us:**
- You've built 4 orchestration frameworks (domain expertise)
- You understand distributed systems (SPIFFE, service mesh research)
- You ship fast (side project, no bureaucracy)
- You're file-based and tool-agnostic (strategic positioning)

### We Can Move Fast

**Anthropic:** Ships quarterly, enterprise-focused, conservative
**Cursor:** Venture-backed, investor pressure, feature bloat risk
**GitHub:** Microsoft bureaucracy, strategic conflicts

**Us:** Side project, fast decisions, build what works, no politics.

**We can ship nodes federation before they think of it.**

### The Timing is Perfect

**2026 landscape:**
- AI coding tools just went mainstream
- Context management pain is acute
- No dominant solution (everyone trying different approaches)
- MCP just launched (infrastructure layer ready)
- Developers hungry for better workflows

**Window of opportunity: 12-18 months**

After that, big players might catch on. But by then:
- .ana/ is established standard
- Community contributions compound
- Network effects protect us
- We're 2 years ahead technically

---

## Part 12: The Vision Statement

**By end of 2026:**
Anatomia is the standard way developers give AI assistants project context. `.ana/` folders are as common as README files.

**By end of 2027:**
Federated nodes are how large engineering orgs coordinate AI assistance across teams. The "one context" approach feels antiquated.

**By end of 2028:**
.ana/ is infrastructure. Multiple AI tools read it. Community templates are widespread. Pattern Cloud provides collective intelligence. Anatomia is no longer "a tool" - it's "the layer."

**The end state:**
Every project has `.ana/`. Every team has federated nodes. AI assistants are finally intelligent about your codebase. Anatomia made this possible.

---

## What's Next

**Read:**
- [MVP_ROADMAP.md](./MVP_ROADMAP.md) - How we get there (phased plan)
- [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) - How it works (system design)
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - How to build it (week-by-week)

**Build:**
- Follow the roadmap
- Ship MVP0 in Week 2
- Use it ourselves
- Iterate based on real use
- Add federation when we need it (not before)

---

**The vision is clear. The path is mapped. Time to build.**

---

## Research Sources

This vision is informed by:
- **Service Mesh Federation:** [Consul](https://developer.hashicorp.com/consul/docs/use-case/service-mesh), [Istio patterns](https://istio.io/latest/docs/ops/deployment/deployment-models/)
- **GraphQL Federation:** [Apollo Federation](https://www.apollographql.com/blog/announcement/expedia-improved-performance-by-moving-from-schema-stitching-to-apollo-federation/), [Schema composition](https://hygraph.com/blog/schema-stitching-vs-graphql-federation-vs-content-federation)
- **Backstage Software Catalog:** [Metadata discovery](https://backstage.io/docs/features/software-catalog/), [Monorepo modeling](https://roadie.io/blog/backstage-monorepo-guide/)
- **DDD Bounded Contexts:** [Martin Fowler](https://martinfowler.com/bliki/BoundedContext.html), [Microservices boundaries](https://vladikk.com/2018/01/21/bounded-contexts-vs-microservices/)
- **Nx/Turborepo:** [Project graphs](https://monorepo.tools/), [Dependency detection](https://nx.dev/docs/guides/adopting-nx/from-turborepo)
- **Tree-sitter:** [AST parsing](https://tree-sitter.github.io/), [TypeScript grammar](https://github.com/tree-sitter/tree-sitter-typescript)
- **FastAPI OpenAPI:** [Auto-generation](https://fastapi.tiangolo.com/how-to/extending-openapi/), [Schema export](https://www.doctave.com/blog/python-export-fastapi-openapi-spec)
- **IPC Patterns:** [Unix sockets](https://opensource.com/article/19/4/interprocess-communication-linux-networking), [JSON-RPC](https://en.wikipedia.org/wiki/Remote_procedure_call)
