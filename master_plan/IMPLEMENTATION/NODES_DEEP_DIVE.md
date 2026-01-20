# Anatomia Node Federation - Deep Technical Specification

**Last Updated:** January 12, 2026
**Status:** Implementation-ready federation protocol specification
**Audience:** Engineers building the federation layer (MVP2)

---

## Document Purpose

This document provides:
- **Complete protocol specifications** for node federation
- **Exact algorithms** for discovery, query, and broadcast
- **Real-world use case walkthroughs** with step-by-step execution
- **Edge cases and error handling** strategies
- **Security considerations** and safety mechanisms
- **Performance benchmarks** and optimization strategies
- **Competitive moat analysis** explaining why this is hard to replicate

This is the technical blueprint for building Anatomia's most differentiating feature: **federated AI intelligence nodes**.

---

## Table of Contents

1. [Federation Overview](#federation-overview)
2. [Discovery Protocol](#discovery-protocol)
3. [Query Protocol](#query-protocol)
4. [Broadcast Protocol](#broadcast-protocol)
5. [Auto-Generated Exports](#auto-generated-exports)
6. [Real-World Walkthroughs](#real-world-walkthroughs)
7. [Edge Cases & Error Handling](#edge-cases--error-handling)
8. [Security & Safety](#security--safety)
9. [Performance & Optimization](#performance--optimization)
10. [Why This Creates a Moat](#why-this-creates-a-moat)

---

## Federation Overview

### What is Node Federation?

Node federation allows multiple `.ana/` folders (nodes) in a monorepo or multi-repo setup to:
1. **Discover** each other automatically or via manifest
2. **Query** each other for information (read-only, deterministic)
3. **Broadcast** messages to coordinate changes (human-reviewed)
4. **Export** interfaces automatically (always current)

### The Three Pillars

```
┌─────────────────────────────────────────────────────────────┐
│                    Node Federation                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │  Discovery  │   │    Query    │   │  Broadcast  │     │
│  │             │   │             │   │             │     │
│  │ Find nodes  │   │ Ask nodes   │   │ Notify all  │     │
│  │ Validate    │   │ Read exports│   │ Human review│     │
│  │ Build graph │   │ Return info │   │ Git-tracked │     │
│  └─────────────┘   └─────────────┘   └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
    Manifest-based      Lexical search     Inbox files
    Auto-scanning       Prioritized        JSON messages
    Path validation     Fast (<500ms)      Async delivery
```

### Why File-Based Protocol?

**Decision:** Federation uses file-based communication, not network protocols.

**Rationale:**
- ✅ Zero infrastructure required (no servers, no sockets)
- ✅ Works offline (local-first)
- ✅ Git-trackable (changes are versioned)
- ✅ Cross-platform (no Unix socket limitations on Windows)
- ✅ Debuggable (just read the files)
- ✅ Safe (no remote code execution)
- ✅ Fast (local filesystem is faster than IPC for small data)

**Trade-off:**
- ❌ No real-time updates (but git-based is acceptable)
- ❌ Requires shared filesystem (monorepo or git checkouts)

**Future:** Can add Supabase Realtime for optional cloud sync in MVP3.

---

## Discovery Protocol

### Goal
Find all sibling nodes in the codebase and build a registry.

### Two Discovery Methods

#### 1. Manifest-Based (Primary)

**File:** `.ana/federation/nodes.json`

**Schema:**
```typescript
interface FederationManifest {
  version: 1;
  nodes: Array<{
    name: string;              // Required: 'auth-service'
    path: string;              // Required: '../../services/auth-service'
    role: string;              // Required: 'authentication'
    priority?: 'low' | 'normal' | 'high';
    description?: string;
  }>;
  discovery?: {
    autoscan_enabled?: boolean;
    autoscan_paths?: string[];
  };
}
```

**Example:**
```json
{
  "version": 1,
  "nodes": [
    {
      "name": "auth-service",
      "path": "../../services/auth-service",
      "role": "authentication",
      "priority": "high",
      "description": "JWT auth, sessions, user identity"
    },
    {
      "name": "catalog-api",
      "path": "../../services/catalog-api",
      "role": "products",
      "priority": "high"
    },
    {
      "name": "shared-ui",
      "path": "../../packages/shared-ui",
      "role": "components",
      "priority": "normal"
    }
  ]
}
```

**Algorithm:**
```typescript
async function discoverFromManifest(selfAnaPath: string): Promise<NodeInfo[]> {
  const manifestPath = join(selfAnaPath, 'federation', 'nodes.json');

  // 1. Check if manifest exists
  if (!existsSync(manifestPath)) {
    return [];
  }

  // 2. Parse manifest
  const manifest: FederationManifest = JSON.parse(
    await fs.readFile(manifestPath, 'utf-8')
  );

  // 3. Validate version
  if (manifest.version !== 1) {
    throw new Error(`Unsupported manifest version: ${manifest.version}`);
  }

  // 4. Resolve paths
  const selfRoot = dirname(selfAnaPath);
  const nodes: NodeInfo[] = [];

  for (const entry of manifest.nodes) {
    // Resolve relative path
    const targetRoot = resolve(selfRoot, entry.path);
    const targetAna = join(targetRoot, '.ana');

    // Validate path exists
    if (!existsSync(targetAna)) {
      console.warn(`Warning: Node '${entry.name}' not found at ${targetRoot}`);
      continue;
    }

    // Load node info
    const nodeInfo = await loadNodeInfo(targetAna);

    // Validate name matches
    if (nodeInfo.name !== entry.name) {
      console.warn(
        `Warning: Node name mismatch. Manifest says '${entry.name}', node.json says '${nodeInfo.name}'`
      );
    }

    nodes.push(nodeInfo);
  }

  return nodes;
}
```

#### 2. Auto-Scan (Fallback)

**Use Case:** When no manifest exists, scan conventional directories.

**Algorithm:**
```typescript
async function discoverByAutoScan(selfAnaPath: string): Promise<NodeInfo[]> {
  // 1. Find repo root
  const repoRoot = await findRepoRoot(dirname(selfAnaPath));

  // 2. Define conventional paths to scan
  const scanPaths = [
    join(repoRoot, 'apps'),
    join(repoRoot, 'services'),
    join(repoRoot, 'packages'),
    join(repoRoot, 'libs'),
  ];

  const nodes: NodeInfo[] = [];

  // 3. Scan each path
  for (const basePath of scanPaths) {
    if (!existsSync(basePath)) continue;

    const entries = await fs.readdir(basePath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const anaPath = join(basePath, entry.name, '.ana');

      if (existsSync(anaPath)) {
        try {
          const nodeInfo = await loadNodeInfo(anaPath);
          nodes.push(nodeInfo);
        } catch (error) {
          console.warn(`Warning: Invalid node at ${anaPath}:`, error.message);
        }
      }
    }
  }

  return nodes;
}

async function findRepoRoot(startPath: string): Promise<string> {
  let current = startPath;

  while (true) {
    // Check for .git directory
    if (existsSync(join(current, '.git'))) {
      return current;
    }

    const parent = dirname(current);

    // Reached filesystem root
    if (parent === current) {
      throw new Error('Not inside a git repository');
    }

    current = parent;
  }
}
```

### Node Validation

**Purpose:** Ensure discovered nodes are valid and reachable.

**Algorithm:**
```typescript
interface ValidationResult {
  valid: boolean;
  node: NodeInfo;
  errors: string[];
  warnings: string[];
}

async function validateNode(node: NodeInfo): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check root path exists
  if (!existsSync(node.rootPath)) {
    errors.push(`Root path does not exist: ${node.rootPath}`);
  }

  // 2. Check .ana folder exists
  if (!existsSync(node.anaPath)) {
    errors.push(`.ana folder not found at ${node.anaPath}`);
  }

  // 3. Check required files
  const requiredFiles = [
    join(node.anaPath, 'node.json'),
    join(node.anaPath, 'context', 'main.md'),
  ];

  for (const file of requiredFiles) {
    if (!existsSync(file)) {
      errors.push(`Missing required file: ${relative(node.anaPath, file)}`);
    }
  }

  // 4. Check optional but recommended files
  const recommendedFiles = [
    join(node.anaPath, 'federation', 'exports.md'),
  ];

  for (const file of recommendedFiles) {
    if (!existsSync(file)) {
      warnings.push(`Missing recommended file: ${relative(node.anaPath, file)}`);
    }
  }

  // 5. Check node is queryable if exports exist
  if (existsSync(join(node.anaPath, 'federation', 'exports.md'))) {
    if (!node.queryable) {
      warnings.push('Node has exports.md but queryable is false');
    }
  }

  return {
    valid: errors.length === 0,
    node,
    errors,
    warnings,
  };
}
```

### Building the Registry

**Purpose:** Aggregate all discovered nodes into a queryable registry.

**Data Structure:**
```typescript
interface FederationRegistry {
  self: NodeInfo;              // The current node
  nodes: NodeInfo[];           // All discovered sibling nodes
  discoveryMethod: 'manifest' | 'autoscan';
  discoveredAt: Date;
  validationResults: ValidationResult[];
}

class NodeRegistry {
  private registry: FederationRegistry;

  constructor(registry: FederationRegistry) {
    this.registry = registry;
  }

  // Find node by name
  findNode(name: string): NodeInfo | null {
    return this.registry.nodes.find((n) => n.name === name) || null;
  }

  // Find nodes by role
  findByRole(role: string): NodeInfo[] {
    return this.registry.nodes.filter((n) => n.role === role);
  }

  // Get all queryable nodes
  getQueryable(): NodeInfo[] {
    return this.registry.nodes.filter((n) => n.queryable);
  }

  // Get all nodes that accept broadcasts
  getBroadcastable(): NodeInfo[] {
    return this.registry.nodes.filter((n) => n.acceptsBroadcast);
  }

  // Validate entire registry
  validate(): { valid: boolean; errors: string[]; warnings: string[] } {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    for (const result of this.registry.validationResults) {
      allErrors.push(...result.errors.map((e) => `[${result.node.name}] ${e}`));
      allWarnings.push(...result.warnings.map((w) => `[${result.node.name}] ${w}`));
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }
}
```

**Discovery API:**
```typescript
export async function discoverNodes(selfAnaPath: string): Promise<NodeRegistry> {
  // 1. Load self node
  const selfNode = await loadNodeInfo(selfAnaPath);

  // 2. Try manifest first
  let nodes = await discoverFromManifest(selfAnaPath);
  let method: 'manifest' | 'autoscan' = 'manifest';

  // 3. Fallback to autoscan if no manifest or empty
  if (nodes.length === 0) {
    nodes = await discoverByAutoScan(selfAnaPath);
    method = 'autoscan';
  }

  // 4. Validate all nodes
  const validationResults = await Promise.all(
    nodes.map((n) => validateNode(n))
  );

  // 5. Filter to only valid nodes
  const validNodes = validationResults
    .filter((r) => r.valid)
    .map((r) => r.node);

  // 6. Build registry
  const registry: FederationRegistry = {
    self: selfNode,
    nodes: validNodes,
    discoveryMethod: method,
    discoveredAt: new Date(),
    validationResults,
  };

  return new NodeRegistry(registry);
}
```

---

## Query Protocol

### Goal
Enable one node to query another node for information deterministically.

### Query Surface (Prioritized)

When querying a node, search these files in priority order:

```typescript
const QUERY_SURFACE_PRIORITY = [
  'federation/exports.md',      // PUBLIC interfaces (highest priority)
  'context/patterns.md',        // Patterns and conventions
  'context/main.md',            // Full context
  'context/conventions.md',     // Additional conventions
  'learning/explicit.md',       // User-taught knowledge
];
```

**Rationale:**
- `exports.md` is public-facing, designed for cross-node queries
- `patterns.md` contains reusable knowledge
- `main.md` has full context but may be verbose
- Other files provide supplementary information

### Query Algorithm (Lexical Search)

**MVP2 Implementation:** Start with lexical (keyword-based) search. Semantic search (embeddings) can be added in MVP3+.

**Algorithm:**
```typescript
interface QueryRequest {
  targetNode: string;
  question: string;
  options?: {
    maxResults?: number;
    includeContext?: boolean;
  };
}

interface QueryResult {
  from: string;
  question: string;
  answer: {
    markdown: string;
    source: {
      file: string;
      section: string;
      path: string;
    };
    confidence: number;
  } | null;
  evidence: Array<{
    file: string;
    heading: string;
    score: number;
  }>;
  timing: {
    discoveryMs: number;
    searchMs: number;
    totalMs: number;
  };
}

export async function queryNode(
  targetNode: string,
  question: string,
  options: QueryRequest['options'] = {}
): Promise<QueryResult> {
  const startTime = performance.now();

  // 1. Discover target node
  const selfAna = await findNearestAna(process.cwd());
  const registry = await discoverNodes(selfAna);
  const target = registry.findNode(targetNode);

  if (!target) {
    throw new Error(
      `Node '${targetNode}' not found. Available: ${registry.nodes.map((n) => n.name).join(', ')}`
    );
  }

  if (!target.queryable) {
    throw new Error(`Node '${targetNode}' is not queryable`);
  }

  const discoveryTime = performance.now() - startTime;

  // 2. Load query surface
  const surface = await loadQuerySurface(target.anaPath);

  // 3. Search surface
  const searchStart = performance.now();
  const hits = searchSurface(surface, question, options.maxResults || 5);
  const searchTime = performance.now() - searchStart;

  // 4. Format result
  if (hits.length === 0) {
    return {
      from: targetNode,
      question,
      answer: null,
      evidence: [],
      timing: {
        discoveryMs: discoveryTime,
        searchMs: searchTime,
        totalMs: performance.now() - startTime,
      },
    };
  }

  const topHit = hits[0];

  return {
    from: targetNode,
    question,
    answer: {
      markdown: formatAnswer(topHit),
      source: {
        file: relative(target.anaPath, topHit.section.filePath),
        section: topHit.section.heading,
        path: topHit.section.filePath,
      },
      confidence: calculateConfidence(topHit.score, hits),
    },
    evidence: hits.slice(0, 3).map((h) => ({
      file: relative(target.anaPath, h.section.filePath),
      heading: h.section.heading,
      score: h.score,
    })),
    timing: {
      discoveryMs: discoveryTime,
      searchMs: searchTime,
      totalMs: performance.now() - startTime,
    },
  };
}
```

### Loading Query Surface

**Purpose:** Parse markdown files into searchable sections.

```typescript
interface Section {
  filePath: string;
  heading: string;
  level: number;        // 1-6 (h1-h6)
  text: string;         // Full text content
  lineStart: number;
  lineEnd: number;
}

async function loadQuerySurface(nodeAnaPath: string): Promise<Section[]> {
  const sections: Section[] = [];

  for (const relativePath of QUERY_SURFACE_PRIORITY) {
    const filePath = join(nodeAnaPath, relativePath);

    if (!existsSync(filePath)) continue;

    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = parseMarkdownSections(content, filePath);
    sections.push(...parsed);
  }

  return sections;
}

function parseMarkdownSections(markdown: string, filePath: string): Section[] {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  let currentSection: Partial<Section> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect heading (# Heading Text)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentSection && currentSection.text) {
        sections.push(currentSection as Section);
      }

      // Start new section
      currentSection = {
        filePath,
        heading: headingMatch[2],
        level: headingMatch[1].length,
        text: '',
        lineStart: i + 1,
        lineEnd: i + 1,
      };
    } else if (currentSection) {
      // Accumulate text
      currentSection.text += line + '\n';
      currentSection.lineEnd = i + 1;
    }
  }

  // Push final section
  if (currentSection && currentSection.text) {
    sections.push(currentSection as Section);
  }

  return sections;
}
```

### Lexical Search Implementation

**Purpose:** Score sections based on keyword matches.

```typescript
interface SearchHit {
  section: Section;
  score: number;
  snippet: string;
  matches: string[];
}

function searchSurface(
  sections: Section[],
  question: string,
  maxResults: number
): SearchHit[] {
  // 1. Extract keywords from question
  const keywords = extractKeywords(question);

  // 2. Score each section
  const hits = sections
    .map((section) => {
      const score = scoreSection(section, keywords);

      if (score === 0) return null;

      return {
        section,
        score,
        snippet: extractSnippet(section.text, keywords),
        matches: findMatches(section, keywords),
      };
    })
    .filter((h): h is SearchHit => h !== null)
    .sort((a, b) => b.score - a.score);

  // 3. Return top results
  return hits.slice(0, maxResults);
}

function extractKeywords(question: string): string[] {
  // 1. Convert to lowercase
  const lower = question.toLowerCase();

  // 2. Remove common words (stopwords)
  const stopwords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'can', 'could', 'may', 'might', 'must', 'shall', 'of', 'at', 'by',
    'for', 'with', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up',
    'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'what',
    'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'i', 'you',
    'he', 'she', 'it', 'we', 'they', 'them', 'their', 'our', 'your', 'my',
  ]);

  // 3. Split into words
  const words = lower.match(/\b\w+\b/g) || [];

  // 4. Filter stopwords and short words
  const keywords = words.filter((w) => !stopwords.has(w) && w.length > 2);

  // 5. Deduplicate
  return [...new Set(keywords)];
}

function scoreSection(section: Section, keywords: string[]): number {
  const haystack = normalize(section.heading + '\n' + section.text);
  let score = 0;

  for (const keyword of keywords) {
    const normalizedKeyword = normalize(keyword);

    // Keyword in heading = 10 points
    if (normalize(section.heading).includes(normalizedKeyword)) {
      score += 10;
    }

    // Each occurrence in text = 2 points
    const occurrences = countOccurrences(haystack, normalizedKeyword);
    score += occurrences * 2;
  }

  // Boost for substantive sections (not too short)
  if (section.text.length > 200) {
    score += Math.min(10, section.text.length / 500);
  }

  // Penalize if too generic (entire file)
  if (section.text.length > 5000) {
    score *= 0.5;
  }

  // Boost if from exports.md (public API)
  if (section.filePath.includes('exports.md')) {
    score *= 1.5;
  }

  return score;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let pos = 0;

  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }

  return count;
}

function extractSnippet(text: string, keywords: string[]): string {
  // Find paragraph with most keyword density
  const paragraphs = text.split('\n\n');

  let bestPara = paragraphs[0] || '';
  let bestScore = 0;

  for (const para of paragraphs) {
    const normalized = normalize(para);
    let score = 0;

    for (const kw of keywords) {
      score += countOccurrences(normalized, normalize(kw));
    }

    if (score > bestScore) {
      bestScore = score;
      bestPara = para;
    }
  }

  // Truncate if too long
  if (bestPara.length > 500) {
    return bestPara.slice(0, 497) + '...';
  }

  return bestPara;
}

function findMatches(section: Section, keywords: string[]): string[] {
  const normalized = normalize(section.heading + '\n' + section.text);
  const matches: string[] = [];

  for (const keyword of keywords) {
    if (normalized.includes(normalize(keyword))) {
      matches.push(keyword);
    }
  }

  return matches;
}

function calculateConfidence(topScore: number, allHits: SearchHit[]): number {
  if (allHits.length === 0) return 0;
  if (allHits.length === 1) return 0.9; // Only one result, likely correct

  // Calculate confidence based on score gap
  const secondScore = allHits[1]?.score || 0;
  const gap = topScore - secondScore;

  // If top score is much higher, higher confidence
  if (gap > 20) return 0.95;
  if (gap > 10) return 0.85;
  if (gap > 5) return 0.75;
  return 0.65;
}

function formatAnswer(hit: SearchHit): string {
  let answer = '';

  answer += `## ${hit.section.heading}\n\n`;
  answer += hit.snippet + '\n\n';

  if (hit.matches.length > 0) {
    answer += `_Matched keywords: ${hit.matches.join(', ')}_\n\n`;
  }

  return answer;
}
```

---

## Broadcast Protocol

### Goal
Allow nodes to send messages to sibling nodes for coordination, with human review.

### Message Format

```typescript
interface BroadcastMessage {
  id: string;                  // ULID or UUID
  timestamp: string;           // ISO 8601
  from: {
    name: string;
    path: string;
  };
  type: 'broadcast' | 'question' | 'notification';
  topic: string;               // 'api-change', 'deprecation', 'question'
  message: string;
  requiresReview: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: {
    relatedFiles?: string[];
    breaking?: boolean;
    deadline?: string;         // ISO 8601
  };
}
```

### Broadcast Algorithm

```typescript
interface BroadcastOptions {
  target?: string;             // Specific node (optional)
  topic?: string;
  type?: 'broadcast' | 'question' | 'notification';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: BroadcastMessage['metadata'];
  skipConfirm?: boolean;       // For testing
}

interface BroadcastReceipt {
  messageId: string;
  sent: number;
  targets: Array<{
    node: string;
    success: boolean;
    inboxPath?: string;
    error?: string;
  }>;
}

export async function broadcast(
  message: string,
  options: BroadcastOptions = {}
): Promise<BroadcastReceipt> {
  // 1. Load self and discover nodes
  const selfAna = await findNearestAna(process.cwd());
  const selfNode = await loadNodeInfo(selfAna);
  const registry = await discoverNodes(selfAna);

  // 2. Determine targets
  let targets: NodeInfo[];

  if (options.target) {
    const target = registry.findNode(options.target);
    if (!target) {
      throw new Error(`Target node '${options.target}' not found`);
    }
    targets = [target];
  } else {
    // Broadcast to all broadcastable nodes
    targets = registry.getBroadcastable();
  }

  if (targets.length === 0) {
    throw new Error('No nodes available for broadcast');
  }

  // 3. Create message
  const broadcastMsg: BroadcastMessage = {
    id: ulid(),
    timestamp: new Date().toISOString(),
    from: {
      name: selfNode.name,
      path: relative(await findRepoRoot(selfAna), selfNode.rootPath),
    },
    type: options.type || 'broadcast',
    topic: options.topic || 'general',
    message,
    requiresReview: true, // Always true in MVP2
    priority: options.priority || 'normal',
    metadata: options.metadata,
  };

  // 4. Confirm with user (unless skipped)
  if (!options.skipConfirm) {
    console.log(chalk.bold(`\nBroadcasting to ${targets.length} nodes:\n`));
    targets.forEach((t) => console.log(`  ▸ ${t.name} (${t.role})`));
    console.log();

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Send to all?',
        default: true,
      },
    ]);

    if (!confirm) {
      return { messageId: broadcastMsg.id, sent: 0, targets: [] };
    }
  }

  // 5. Deliver to inboxes
  const results = await Promise.all(
    targets.map((t) => deliverToInbox(broadcastMsg, t))
  );

  return {
    messageId: broadcastMsg.id,
    sent: results.filter((r) => r.success).length,
    targets: results,
  };
}

async function deliverToInbox(
  msg: BroadcastMessage,
  target: NodeInfo
): Promise<BroadcastReceipt['targets'][0]> {
  try {
    // 1. Ensure inbox directory exists
    const inboxDir = join(target.anaPath, 'federation', 'inbox');
    await fs.mkdir(inboxDir, { recursive: true });

    // 2. Generate filename: timestamp_from-node__topic.json
    const timestamp = msg.timestamp.replace(/[:.]/g, '-').replace('T', 'T');
    const filename = `${timestamp}_${msg.from.name}__${slug(msg.topic)}.json`;
    const inboxPath = join(inboxDir, filename);

    // 3. Write message
    await fs.writeFile(inboxPath, JSON.stringify(msg, null, 2), 'utf-8');

    return {
      node: target.name,
      success: true,
      inboxPath,
    };
  } catch (error) {
    return {
      node: target.name,
      success: false,
      error: error.message,
    };
  }
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
```

### Inbox Management

```typescript
interface InboxItem {
  id: string;
  message: BroadcastMessage;
  reviewed: boolean;
}

export async function listInbox(): Promise<InboxItem[]> {
  const selfAna = await findNearestAna(process.cwd());
  const inboxDir = join(selfAna, 'federation', 'inbox');

  if (!existsSync(inboxDir)) {
    return [];
  }

  const files = await fs.readdir(inboxDir);
  const messages: InboxItem[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const filePath = join(inboxDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const msg: BroadcastMessage = JSON.parse(content);

    messages.push({
      id: basename(file, '.json'),
      message: msg,
      reviewed: false,
    });
  }

  // Sort by timestamp (newest first)
  messages.sort((a, b) =>
    b.message.timestamp.localeCompare(a.message.timestamp)
  );

  return messages;
}

export async function showInboxMessage(messageId: string): Promise<void> {
  const selfAna = await findNearestAna(process.cwd());
  const inboxPath = join(selfAna, 'federation', 'inbox', `${messageId}.json`);

  if (!existsSync(inboxPath)) {
    throw new Error(`Message '${messageId}' not found`);
  }

  const msg: BroadcastMessage = JSON.parse(
    await fs.readFile(inboxPath, 'utf-8')
  );

  // Display message
  console.log(chalk.bold('\n─'.repeat(60)));
  console.log(chalk.bold('Federation Message'));
  console.log(chalk.bold('─'.repeat(60)));
  console.log(chalk.gray(`From: ${msg.from.name} (${msg.from.path})`));
  console.log(chalk.gray(`Topic: ${msg.topic}`));
  console.log(chalk.gray(`Time: ${msg.timestamp}`));
  console.log();
  console.log(msg.message);
  console.log();

  // Suggest action
  console.log(chalk.cyan('Suggested action:'));
  console.log(chalk.gray(`Add to learning/explicit.md under "${msg.topic}":`));
  console.log(chalk.gray(`  - ${msg.message}`));
  console.log();

  // Prompt to apply
  const { apply } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'apply',
      message: 'Apply this update?',
      default: true,
    },
  ]);

  if (apply) {
    await applyInboxMessage(messageId);
  }
}

export async function applyInboxMessage(messageId: string): Promise<void> {
  const selfAna = await findNearestAna(process.cwd());
  const inboxPath = join(selfAna, 'federation', 'inbox', `${messageId}.json`);

  const msg: BroadcastMessage = JSON.parse(
    await fs.readFile(inboxPath, 'utf-8')
  );

  // 1. Append to explicit.md
  const explicitPath = join(selfAna, 'learning', 'explicit.md');
  let content = await fs.readFile(explicitPath, 'utf-8');

  content += `\n\n## Incoming: ${msg.topic} (${msg.timestamp.split('T')[0]})\n`;
  content += `From: ${msg.from.name}\n\n`;
  content += `${msg.message}\n`;

  await fs.writeFile(explicitPath, content, 'utf-8');

  // 2. Archive the message
  const archiveDir = join(selfAna, 'federation', 'inbox', '.archive');
  await fs.mkdir(archiveDir, { recursive: true });

  const archivePath = join(archiveDir, `${messageId}.json`);
  await fs.rename(inboxPath, archivePath);

  console.log(chalk.green('✓ Applied and archived'));
}
```

---

## Auto-Generated Exports

### Goal
Automatically generate `federation/exports.md` from code so it's always current.

### Two Approaches

#### 1. From OpenAPI Schema (APIs)

**Supported Frameworks:**
- FastAPI (Python)
- Django REST Framework (Python)
- Express with decorators (Node)
- NestJS (Node)

**Algorithm:**
```typescript
export async function generateExportsFromOpenAPI(
  nodeRoot: string
): Promise<string | null> {
  // 1. Find OpenAPI schema
  const schemaPaths = [
    join(nodeRoot, 'openapi.json'),
    join(nodeRoot, 'docs/openapi.json'),
    join(nodeRoot, 'api/openapi.json'),
  ];

  let schemaPath: string | null = null;

  for (const path of schemaPaths) {
    if (existsSync(path)) {
      schemaPath = path;
      break;
    }
  }

  if (!schemaPath) {
    return null; // No OpenAPI schema found
  }

  // 2. Parse schema
  const schema = JSON.parse(await fs.readFile(schemaPath, 'utf-8'));

  // 3. Generate markdown
  let markdown = `# ${schema.info?.title || 'API'} - Exports\n\n`;
  markdown += `Auto-generated from OpenAPI schema\n`;
  markdown += `Last updated: ${new Date().toISOString()}\n\n`;

  // 4. Endpoints
  markdown += `## Endpoints\n\n`;

  for (const [path, methods] of Object.entries(schema.paths)) {
    for (const [method, spec] of Object.entries(methods as any)) {
      markdown += `### ${method.toUpperCase()} ${path}\n`;
      markdown += `${spec.summary || spec.description || ''}\n\n`;

      // Request body
      if (spec.requestBody) {
        markdown += `**Request:**\n\`\`\`json\n`;
        markdown += JSON.stringify(
          extractSchemaExample(
            spec.requestBody.content['application/json'].schema,
            schema
          ),
          null,
          2
        );
        markdown += `\n\`\`\`\n\n`;
      }

      // Response
      if (spec.responses?.['200']) {
        markdown += `**Response:**\n\`\`\`json\n`;
        markdown += JSON.stringify(
          extractSchemaExample(
            spec.responses['200'].content?.['application/json']?.schema,
            schema
          ),
          null,
          2
        );
        markdown += `\n\`\`\`\n\n`;
      }
    }
  }

  // 5. Models
  if (schema.components?.schemas) {
    markdown += `## Models\n\n`;

    for (const [name, schemaDef] of Object.entries(schema.components.schemas)) {
      markdown += `### ${name}\n`;
      markdown += formatSchemaAsMarkdown(schemaDef as any);
      markdown += `\n\n`;
    }
  }

  markdown += `---\n\n`;
  markdown += `_Auto-generated by Anatomia from OpenAPI schema_\n`;
  markdown += `_Source: ${relative(nodeRoot, schemaPath)}_\n`;

  return markdown;
}

function extractSchemaExample(schema: any, fullSchema: any): any {
  if (!schema) return {};

  // Handle $ref
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/', '').split('/');
    let current = fullSchema;
    for (const part of refPath) {
      current = current[part];
    }
    return extractSchemaExample(current, fullSchema);
  }

  // Handle object
  if (schema.type === 'object' && schema.properties) {
    const example: any = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      example[key] = extractSchemaExample(prop as any, fullSchema);
    }
    return example;
  }

  // Handle array
  if (schema.type === 'array' && schema.items) {
    return [extractSchemaExample(schema.items, fullSchema)];
  }

  // Use example if provided
  if (schema.example !== undefined) {
    return schema.example;
  }

  // Default values by type
  const defaults: Record<string, any> = {
    string: 'string',
    number: 0,
    integer: 0,
    boolean: false,
    null: null,
  };

  return defaults[schema.type] || 'unknown';
}

function formatSchemaAsMarkdown(schema: any): string {
  if (!schema.properties) return '';

  let md = '```typescript\n';

  for (const [key, prop] of Object.entries(schema.properties as any)) {
    const required = schema.required?.includes(key) ? '' : '?';
    md += `${key}${required}: ${prop.type || 'any'}`;

    if (prop.description) {
      md += ` // ${prop.description}`;
    }

    md += '\n';
  }

  md += '```';
  return md;
}
```

#### 2. From TypeScript Exports (Libraries)

**Uses:** tree-sitter for AST parsing

**Algorithm:**
```typescript
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

export async function generateExportsFromTypeScript(
  nodeRoot: string
): Promise<string | null> {
  // 1. Find entry point
  const entryPaths = [
    join(nodeRoot, 'src/index.ts'),
    join(nodeRoot, 'index.ts'),
    join(nodeRoot, 'src/main.ts'),
  ];

  let entryPath: string | null = null;

  for (const path of entryPaths) {
    if (existsSync(path)) {
      entryPath = path;
      break;
    }
  }

  if (!entryPath) {
    return null;
  }

  // 2. Parse with tree-sitter
  const parser = new Parser();
  parser.setLanguage(TypeScript.tsx);

  const code = await fs.readFile(entryPath, 'utf-8');
  const tree = parser.parse(code);

  // 3. Extract exports
  const exports = extractExports(tree.rootNode, code);

  // 4. Generate markdown
  let markdown = `# Code Exports\n\n`;
  markdown += `Auto-generated from TypeScript exports\n`;
  markdown += `Last updated: ${new Date().toISOString()}\n\n`;

  // Components
  if (exports.components.length > 0) {
    markdown += `## Components\n\n`;
    for (const comp of exports.components) {
      markdown += `### ${comp.name}\n`;
      markdown += `\`\`\`typescript\n${comp.signature}\n\`\`\`\n\n`;
      if (comp.jsdoc) {
        markdown += `${comp.jsdoc}\n\n`;
      }
    }
  }

  // Functions
  if (exports.functions.length > 0) {
    markdown += `## Functions\n\n`;
    for (const func of exports.functions) {
      markdown += `### ${func.name}\n`;
      markdown += `\`\`\`typescript\n${func.signature}\n\`\`\`\n\n`;
      if (func.jsdoc) {
        markdown += `${func.jsdoc}\n\n`;
      }
    }
  }

  // Types
  if (exports.types.length > 0) {
    markdown += `## Types\n\n`;
    for (const type of exports.types) {
      markdown += `### ${type.name}\n`;
      markdown += `\`\`\`typescript\n${type.definition}\n\`\`\`\n\n`;
    }
  }

  markdown += `---\n\n`;
  markdown += `_Auto-generated by Anatomia from TypeScript exports_\n`;
  markdown += `_Source: ${relative(nodeRoot, entryPath)}_\n`;

  return markdown;
}

function extractExports(rootNode: any, sourceCode: string) {
  const exports = {
    components: [],
    functions: [],
    types: [],
    hooks: [],
  };

  // Tree-sitter query for export statements
  const query = `
    (export_statement
      declaration: (function_declaration) @func)
    (export_statement
      declaration: (lexical_declaration) @const)
    (export_statement
      declaration: (type_alias_declaration) @type)
    (export_statement
      declaration: (interface_declaration) @interface)
  `;

  // Walk the tree and extract exports
  walk(rootNode, (node) => {
    if (node.type === 'export_statement') {
      const exportText = sourceCode.slice(node.startIndex, node.endIndex);

      // Determine export type and extract info
      if (exportText.includes('function')) {
        const func = parseFunctionExport(node, sourceCode);
        if (func) exports.functions.push(func);
      } else if (exportText.includes('interface') || exportText.includes('type')) {
        const type = parseTypeExport(node, sourceCode);
        if (type) exports.types.push(type);
      } else if (exportText.includes('const') && /^use[A-Z]/.test(exportText)) {
        const hook = parseHookExport(node, sourceCode);
        if (hook) exports.hooks.push(hook);
      }
    }
  });

  return exports;
}

function walk(node: any, callback: (node: any) => void) {
  callback(node);
  for (let i = 0; i < node.childCount; i++) {
    walk(node.child(i), callback);
  }
}

function parseFunctionExport(node: any, sourceCode: string) {
  // Extract function name, parameters, return type
  // This is simplified - real implementation would be more robust
  const text = sourceCode.slice(node.startIndex, node.endIndex);
  const match = text.match(/export\s+function\s+(\w+)\s*\((.*?)\)\s*:\s*(\w+)/);

  if (!match) return null;

  return {
    name: match[1],
    signature: text,
    jsdoc: extractJSDoc(node, sourceCode),
  };
}

function parseTypeExport(node: any, sourceCode: string) {
  const text = sourceCode.slice(node.startIndex, node.endIndex);
  const match = text.match(/export\s+(interface|type)\s+(\w+)/);

  if (!match) return null;

  return {
    name: match[2],
    definition: text,
  };
}

function extractJSDoc(node: any, sourceCode: string): string | null {
  // Look for JSDoc comment before this node
  // This is simplified
  return null;
}
```

---

## Real-World Walkthroughs

### Walkthrough 1: Frontend Developer Querying Auth Service

**Scenario:** Frontend developer (in `apps/storefront`) needs to understand JWT refresh pattern from `services/auth-service`.

**Step-by-Step Execution:**

1. **User runs command:**
   ```bash
   cd apps/storefront
   ana query auth-service "How do I refresh a JWT token?"
   ```

2. **Discovery phase:**
   ```typescript
   // System finds current .ana/
   const selfAna = '/Users/dev/monorepo/apps/storefront/.ana';

   // Loads federation manifest
   const manifest = JSON.parse(
     fs.readFileSync('/Users/dev/monorepo/apps/storefront/.ana/federation/nodes.json')
   );

   // Resolves auth-service path
   const authPath = resolve(selfAna, '../../services/auth-service');
   const authAna = join(authPath, '.ana');

   // Validates auth-service node
   const valid = existsSync(authAna) && existsSync(join(authAna, 'node.json'));
   // ✓ Valid

   // Loads auth-service node.json
   const authNode = JSON.parse(
     fs.readFileSync(join(authAna, 'node.json'))
   );
   // authNode.name = 'auth-service'
   // authNode.queryable = true
   ```

3. **Load query surface:**
   ```typescript
   const surface = [];

   // Load exports.md (priority 1)
   const exportsPath = join(authAna, 'federation/exports.md');
   if (existsSync(exportsPath)) {
     const content = fs.readFileSync(exportsPath, 'utf-8');
     const sections = parseMarkdownSections(content, exportsPath);
     surface.push(...sections);
     // Found sections: "JWT Authentication", "Token Refresh", "Endpoints", etc.
   }

   // Load patterns.md (priority 2)
   const patternsPath = join(authAna, 'context/patterns.md');
   if (existsSync(patternsPath)) {
     const content = fs.readFileSync(patternsPath, 'utf-8');
     const sections = parseMarkdownSections(content, patternsPath);
     surface.push(...sections);
   }

   // Total: 12 sections loaded
   ```

4. **Extract keywords:**
   ```typescript
   const question = "How do I refresh a JWT token?";
   const keywords = extractKeywords(question);
   // keywords = ['refresh', 'jwt', 'token']
   ```

5. **Score sections:**
   ```typescript
   const hits = [];

   for (const section of surface) {
     let score = 0;

     // Section: "Token Refresh" in exports.md
     if (section.heading === 'Token Refresh') {
       // 'refresh' in heading: +10
       // 'token' in heading: +10
       score += 20;

       const text = normalize(section.text);
       // 'jwt' appears 3 times: +6
       // 'refresh' appears 5 times: +10
       // 'token' appears 8 times: +16
       score += 32;

       // Substantive section (500 chars): +10
       score += 10;

       // In exports.md: ×1.5
       score *= 1.5;

       // Total: (20 + 32 + 10) × 1.5 = 93
     }

     hits.push({ section, score, ... });
   }

   hits.sort((a, b) => b.score - a.score);
   // Top hit: "Token Refresh" with score 93
   ```

6. **Format result:**
   ```typescript
   const topHit = hits[0];

   const result = {
     from: 'auth-service',
     question: "How do I refresh a JWT token?",
     answer: {
       markdown: `## Token Refresh

We use rotating refresh tokens with 7-day expiry.

**Access token:** 15 minutes (JWT)
**Refresh token:** 7 days (opaque, stored in DB)

**Endpoint:** POST /auth/refresh
**Header:** Authorization: Bearer <refresh_token>
**Returns:** { access_token, expires_in }

See: services/auth-service/src/auth/refresh.py`,
       source: {
         file: 'federation/exports.md',
         section: 'Token Refresh',
         path: '/Users/dev/monorepo/services/auth-service/.ana/federation/exports.md'
       },
       confidence: 0.95
     },
     timing: {
       discoveryMs: 15,
       searchMs: 23,
       totalMs: 38
     }
   };
   ```

7. **Display to user:**
   ```
   Querying auth-service node...
   ✓ Found in federation/exports.md

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Auth-service: Token Refresh
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   We use rotating refresh tokens with 7-day expiry.

   Access token: 15 minutes (JWT)
   Refresh token: 7 days (opaque, stored in DB)

   Endpoint: POST /auth/refresh
   Header: Authorization: Bearer <refresh_token>
   Returns: { access_token, expires_in }

   See: services/auth-service/src/auth/refresh.py

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Source: auth-service/federation/exports.md
   Confidence: 0.95
   Time: 38ms
   ```

**Result:** Developer got instant answer without searching code, Slack, or documentation. Saved ~10 minutes.

---

### Walkthrough 2: Backend Service Broadcasting API Change

**Scenario:** Backend team changes catalog API to require pagination. Need to notify frontend teams.

**Step-by-Step Execution:**

1. **User runs command:**
   ```bash
   cd services/catalog-api
   ana broadcast --topic api-change "All list endpoints now require pagination. Use ?page=1&limit=20"
   ```

2. **Discovery phase:**
   ```typescript
   // Load self
   const selfAna = '/Users/dev/monorepo/services/catalog-api/.ana';
   const selfNode = JSON.parse(fs.readFileSync(join(selfAna, 'node.json')));
   // selfNode.name = 'catalog-api'

   // Discover all nodes
   const registry = await discoverNodes(selfAna);
   // Found: storefront, mobile, seller-dashboard, admin-panel

   // Filter to broadcastable
   const targets = registry.getBroadcastable();
   // All 4 nodes accept broadcasts
   ```

3. **Create message:**
   ```typescript
   const msg: BroadcastMessage = {
     id: '01HXYZ123456789',
     timestamp: '2026-01-12T14:23:17.382Z',
     from: {
       name: 'catalog-api',
       path: 'services/catalog-api'
     },
     type: 'broadcast',
     topic: 'api-change',
     message: 'All list endpoints now require pagination. Use ?page=1&limit=20',
     requiresReview: true,
     priority: 'high',
     metadata: {
       breaking: true,
       relatedFiles: ['src/api/products.py', 'src/api/categories.py']
     }
   };
   ```

4. **Confirm with user:**
   ```
   Broadcasting to 4 nodes:
     ▸ storefront (frontend)
     ▸ mobile (mobile-app)
     ▸ seller-dashboard (frontend)
     ▸ admin-panel (frontend)

   Send to all? (Y/n) y
   ```

5. **Deliver to inboxes:**
   ```typescript
   for (const target of targets) {
     const inboxDir = join(target.anaPath, 'federation/inbox');
     await fs.mkdir(inboxDir, { recursive: true });

     const filename = '2026-01-12T14-23-17Z_catalog-api__api-change.json';
     const inboxPath = join(inboxDir, filename);

     await fs.writeFile(inboxPath, JSON.stringify(msg, null, 2));
   }
   ```

6. **Result display:**
   ```
   ✓ storefront (inbox/2026-01-12T14-23-17Z_catalog-api__api-change.json)
   ✓ mobile (inbox/2026-01-12T14-23-17Z_catalog-api__api-change.json)
   ✓ seller-dashboard (inbox/2026-01-12T14-23-17Z_catalog-api__api-change.json)
   ✓ admin-panel (inbox/2026-01-12T14-23-17Z_catalog-api__api-change.json)

   Next: Frontend teams will review with `ana inbox` in their nodes.
   ```

7. **Frontend team reviews:**
   ```bash
   cd apps/storefront
   ana inbox
   ```

   Output:
   ```
   1 new federation message:

   [01] api-change from catalog-api (2 minutes ago)
        "All list endpoints now require pagination. Use ?page=1&limit=20"
   ```

8. **Frontend team applies:**
   ```bash
   ana inbox show 01
   ```

   Output:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Federation Message
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   From: catalog-api (services/catalog-api)
   Topic: api-change
   Time: 2026-01-12 14:23:17 (2 minutes ago)
   Priority: high
   Breaking: Yes

   Message:
   All list endpoints now require pagination. Use ?page=1&limit=20

   Suggested update:
   Add to learning/explicit.md under "API Requirements":
     - Catalog API requires pagination (Jan 12, 2026)
       All list endpoints: ?page=1&limit=20

   Apply this update? (Y/n) y

   ✓ Appended to learning/explicit.md
   ✓ Marked as reviewed
   ✓ Archived to inbox/.archive/
   ```

**Result:** One broadcast reached 4 teams instantly. Each team reviewed and applied on their schedule. No Slack spam, no missed messages, git-tracked coordination.

---

## Edge Cases & Error Handling

### Edge Case 1: Circular Dependencies

**Problem:** Node A depends on B, B depends on C, C depends on A.

**Detection:**
```typescript
function detectCircularDependencies(registry: FederationRegistry): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeName: string, path: string[]) {
    visited.add(nodeName);
    recursionStack.add(nodeName);
    path.push(nodeName);

    const node = registry.findNode(nodeName);
    if (!node) return;

    // Get dependencies (nodes this node queries or broadcasts to)
    const deps = getNodeDependencies(node);

    for (const dep of deps) {
      if (!visited.has(dep)) {
        dfs(dep, [...path]);
      } else if (recursionStack.has(dep)) {
        // Cycle detected
        const cycleStart = path.indexOf(dep);
        const cycle = [...path.slice(cycleStart), dep];
        cycles.push(cycle);
      }
    }

    recursionStack.delete(nodeName);
  }

  for (const node of registry.nodes) {
    if (!visited.has(node.name)) {
      dfs(node.name, []);
    }
  }

  return cycles;
}
```

**Handling:**
- **Don't block** - Circular dependencies are OK (nodes can reference each other)
- **Warn user** - Display warning during `ana nodes --validate`
- **Log** - Track for analytics (might indicate architectural issues)

**Example output:**
```
⚠ Warning: Circular dependency detected:
  storefront → auth-service → shared-lib → storefront

This is functional but may indicate tight coupling.
Consider if boundaries are correctly defined.
```

### Edge Case 2: Query Returns No Results

**Problem:** User queries node but no matching sections found.

**Handling:**
```typescript
if (hits.length === 0) {
  return {
    from: targetNode,
    question,
    answer: null,
    evidence: [],
    timing: { ... }
  };
}

// Display to user:
console.log(chalk.yellow(`\n✗ No matches found\n`));
console.log(
  `The ${targetNode} node doesn't have information about "${question}".`
);
console.log(chalk.gray('\nTry:'));
console.log(chalk.gray(`  1. Rephrase your question`));
console.log(chalk.gray(`  2. Check ${targetNode}/.ana/federation/exports.md manually`));
console.log(chalk.gray(`  3. Contact node owner: ${targetNode.owner}`));
```

### Edge Case 3: Node Path Invalid

**Problem:** Manifest references node at path that doesn't exist (moved, deleted, or typo).

**Handling:**
```typescript
async function discoverFromManifest(selfAnaPath: string): Promise<NodeInfo[]> {
  // ...
  for (const entry of manifest.nodes) {
    const targetRoot = resolve(selfRoot, entry.path);
    const targetAna = join(targetRoot, '.ana');

    if (!existsSync(targetAna)) {
      // Log warning but continue
      console.warn(
        chalk.yellow(`Warning: Node '${entry.name}' not found at ${targetRoot}`)
      );
      console.warn(chalk.gray(`  Skipping this node. Check federation/nodes.json`));
      continue; // Don't add to registry
    }

    // ...
  }
}
```

**User action:**
```bash
ana nodes --validate
```

Output:
```
Validating federation...
✓ storefront (valid)
✗ auth-service (invalid)
  Error: Root path does not exist: /path/to/auth-service
  Fix: Update apps/storefront/.ana/federation/nodes.json
✓ catalog-api (valid)

2 of 3 nodes valid
```

### Edge Case 4: Broadcast Inbox Full

**Problem:** Node has 50+ unreviewed messages.

**Handling:**
```typescript
async function listInbox(): Promise<InboxItem[]> {
  const messages = /* ... load messages ... */;

  if (messages.length > 20) {
    console.warn(
      chalk.yellow(`\n⚠ Warning: You have ${messages.length} unreviewed messages.`)
    );
    console.warn(chalk.gray('  Consider running `ana inbox clear-old` to archive old messages.'));
  }

  return messages;
}

// New command: clear-old
export async function clearOldInboxMessages(daysOld: number = 30) {
  const selfAna = await findNearestAna(process.cwd());
  const inboxDir = join(selfAna, 'federation/inbox');
  const files = await fs.readdir(inboxDir);

  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  let archived = 0;

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const filePath = join(inboxDir, file);
    const msg: BroadcastMessage = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    const msgTime = new Date(msg.timestamp).getTime();

    if (msgTime < cutoff) {
      const archiveDir = join(inboxDir, '.archive');
      await fs.mkdir(archiveDir, { recursive: true });
      await fs.rename(filePath, join(archiveDir, file));
      archived++;
    }
  }

  console.log(chalk.green(`✓ Archived ${archived} messages older than ${daysOld} days`));
}
```

### Edge Case 5: Exports.md Auto-Generation Fails

**Problem:** OpenAPI schema not found or tree-sitter parse fails.

**Handling:**
```typescript
export async function evolveCommand() {
  // ... analysis ...

  // Try to generate exports
  let exportsGenerated = false;

  try {
    const exports = await generateExportsFromOpenAPI(nodeRoot);
    if (exports) {
      await fs.writeFile(
        join(selfAna, 'federation/exports.md'),
        exports
      );
      exportsGenerated = true;
    }
  } catch (error) {
    console.warn(
      chalk.yellow(`\n⚠ Warning: Could not auto-generate exports.md`)
    );
    console.warn(chalk.gray(`  Reason: ${error.message}`));
  }

  if (!exportsGenerated) {
    console.log(chalk.gray('\nSuggestion:'));
    console.log(chalk.gray('  Create federation/exports.md manually, or:'));
    console.log(chalk.gray('  - Add OpenAPI schema generation to your API'));
    console.log(chalk.gray('  - Ensure OpenAPI schema is at /openapi.json'));
  }

  // Continue with rest of evolve (don't fail)
}
```

---

## Security & Safety

### Threat Model

**What we protect against:**
1. **Path traversal attacks** - Malicious manifest pointing to `/etc/passwd`
2. **Code injection** - Malicious broadcast messages with scripts
3. **Accidental overwrites** - Broadcasts auto-updating context without review
4. **Information leakage** - Exposing sensitive data via exports

**What we DON'T protect against:**
- Malicious team members with repo access (they can edit code anyway)
- Compromised developer machines (outside our scope)

### Security Mechanisms

#### 1. Path Validation

```typescript
function validateNodePath(basePath: string, targetPath: string): boolean {
  // Resolve to absolute path
  const absolute = resolve(basePath, targetPath);

  // Ensure it's within repo root
  const repoRoot = findRepoRoot(basePath);

  if (!absolute.startsWith(repoRoot)) {
    throw new Error('Security: Node path outside repository root');
  }

  // Check for suspicious patterns
  if (absolute.includes('..') && !absolute.startsWith(repoRoot)) {
    throw new Error('Security: Path traversal detected');
  }

  return true;
}
```

#### 2. No Code Execution

**Design principle:** Federation is **read-only** for code.

- ✅ **Query:** Reads markdown files (safe)
- ✅ **Broadcast:** Writes JSON to inbox (safe, human reviews)
- ❌ **Never:** Execute code from other nodes
- ❌ **Never:** Auto-update code files

#### 3. Human Review for Broadcasts

**Requirement:** All broadcast messages must be human-reviewed before applying.

```typescript
// In applyInboxMessage():
console.log(chalk.cyan('Suggested action:'));
console.log(chalk.gray(`Add to learning/explicit.md`));
console.log(chalk.gray(`  - ${msg.message}`));

const { apply } = await inquirer.prompt([
  {
    type: 'confirm',
    name: 'apply',
    message: 'Apply this update?',
    default: true,
  },
]);

if (apply) {
  // User explicitly confirmed
  await applyInboxMessage(messageId);
}
```

#### 4. Sanitization

**For broadcast messages:**
```typescript
function sanitizeMessage(msg: string): string {
  // Remove potential script tags
  return msg
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}
```

#### 5. Audit Trail

**All federation actions are git-tracked:**
- Manifest changes (federation/nodes.json)
- Inbox messages (federation/inbox/*.json)
- Applied updates (learning/explicit.md)

```bash
git log federation/
git diff HEAD~1 federation/inbox/
```

### Data Privacy

**Local-first design:**
- No data leaves machine unless user opts into cloud sync (MVP3)
- Queries are local filesystem reads
- Broadcasts are local filesystem writes
- No telemetry by default

**What gets exposed via exports.md:**
- Public API contracts (intended to be shared)
- Type signatures (public interfaces)
- NOT: Implementation details, business logic, secrets

**Recommendation for sensitive projects:**
```json
// node.json
{
  "federation": {
    "queryable": false,  // Don't expose this node
    "broadcast": {
      "accept": false    // Don't accept broadcasts
    }
  }
}
```

---

## Performance & Optimization

### Performance Targets

| Operation | Target | Reasoning |
|-----------|--------|-----------|
| Node discovery | <100ms | Must be instant |
| Query execution | <500ms | Faster than manual search |
| Broadcast delivery | <1s for 10 nodes | Async, not blocking |
| Exports generation | <10s | Run during evolve (not time-critical) |

### Optimization Strategies

#### 1. Caching

**Cache discovery results:**
```typescript
interface DiscoveryCache {
  timestamp: number;
  registry: FederationRegistry;
}

const CACHE_TTL = 60 * 1000; // 1 minute

async function discoverNodes(selfAnaPath: string): Promise<NodeRegistry> {
  const cacheFile = join(selfAnaPath, '.state/discovery-cache.json');

  // Check cache
  if (existsSync(cacheFile)) {
    const cache: DiscoveryCache = JSON.parse(await fs.readFile(cacheFile, 'utf-8'));

    if (Date.now() - cache.timestamp < CACHE_TTL) {
      return new NodeRegistry(cache.registry);
    }
  }

  // Perform discovery
  const registry = /* ... actual discovery ... */;

  // Write cache
  await fs.writeFile(
    cacheFile,
    JSON.stringify({
      timestamp: Date.now(),
      registry,
    }, null, 2)
  );

  return new NodeRegistry(registry);
}
```

#### 2. Parallel Operations

**Broadcast to multiple nodes in parallel:**
```typescript
// ✅ Good (parallel)
const results = await Promise.all(
  targets.map((t) => deliverToInbox(msg, t))
);

// ❌ Bad (sequential)
for (const target of targets) {
  await deliverToInbox(msg, target);
}
```

#### 3. Lazy Loading

**Load query surface only when needed:**
```typescript
class LazyQuerySurface {
  private sections: Section[] | null = null;

  async load(nodeAnaPath: string) {
    if (this.sections === null) {
      this.sections = await loadQuerySurface(nodeAnaPath);
    }
    return this.sections;
  }
}
```

#### 4. Limit File Reads

**Stop reading surface files once we have good results:**
```typescript
async function loadQuerySurface(nodeAnaPath: string): Promise<Section[]> {
  const sections: Section[] = [];

  for (const relativePath of QUERY_SURFACE_PRIORITY) {
    const filePath = join(nodeAnaPath, relativePath);

    if (!existsSync(filePath)) continue;

    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = parseMarkdownSections(content, filePath);
    sections.push(...parsed);

    // Early exit if we have enough sections
    if (sections.length > 50) break;
  }

  return sections;
}
```

### Benchmarks (Estimated)

**Test environment:** MacBook Pro M1, 16GB RAM, NVMe SSD

| Operation | Input | Time | Notes |
|-----------|-------|------|-------|
| Discovery (manifest) | 10 nodes | 45ms | Read 10 JSON files |
| Discovery (autoscan) | 1000 dirs | 280ms | Filesystem scan |
| Query (hit in exports) | 500KB surface | 120ms | Lexical search |
| Query (miss, full scan) | 2MB surface | 380ms | Full surface search |
| Broadcast (10 nodes) | 10 targets | 85ms | Parallel writes |
| Exports (OpenAPI) | 50 endpoints | 2.3s | JSON parsing + markdown gen |
| Exports (TypeScript) | 200 exports | 4.1s | tree-sitter parsing |

**Bottlenecks:**
- Auto-scan discovery (filesystem iteration) - mitigate with caching
- tree-sitter parsing (CPU-bound) - acceptable for evolve command

---

## Why This Creates a Moat

### The Trifecta (Our Competitive Advantage)

```
┌──────────────────────────────────────────────────────────┐
│              The Anatomia Moat                            │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  1. Federation Protocol (Network Effect)                 │
│     • Each node adds value to the network               │
│     • 10 nodes > 10x more valuable than 1 node          │
│     • Switching cost increases with adoption             │
│                                                           │
│  2. Auto-Generated Exports (Technical Depth)             │
│     • Requires code analysis expertise                   │
│     • OpenAPI + tree-sitter + multiple languages         │
│     • Competitors would need 6-12 months to replicate    │
│                                                           │
│  3. File-Based Protocol (Strategic Positioning)          │
│     • Local-first (works offline, no servers)            │
│     • Git-trackable (version controlled)                 │
│     • Tool-agnostic (works with any AI assistant)        │
│     • IDE-independent (not locked to one tool)           │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Why Competitors Won't Build This

#### Anthropic (Claude Skills)

**What they have:**
- Prompt-based skills
- Model Context Protocol (MCP) for data sources

**Why they won't build federation:**
- Skills are model-invoked, not deterministically queryable
- No infrastructure for code parsing (OpenAPI, tree-sitter)
- Strategic focus on models, not dev tools
- Would compete with their own MCP servers

**Time to replicate:** 12+ months (if they wanted to)

#### Cursor

**What they have:**
- IDE with AI integration
- Cursor Rules (.cursorrules file)
- Context from open files

**Why they won't build federation:**
- IDE-locked (can't work across repos easily)
- "One workspace = one context" model conflicts with nodes
- Would need to add code analysis layer
- Strategic focus on IDE features, not context management

**Time to replicate:** 9-12 months (technical debt in IDE)

#### GitHub Copilot

**What they have:**
- AI code completion
- Context from repo
- Some OpenAPI awareness

**Why they won't build federation:**
- Strategic conflict: wants you in GitHub ecosystem
- Won't build tool-agnostic solution
- Focus on completions, not context management
- Already has namespace issues (one context per repo)

**Time to replicate:** 12-18 months (organizational barriers)

### Why We Can Win

**1. We're shipping fast**
- MVP2 (federation) in 12 weeks
- Competitors ship quarterly (large org inertia)
- First-mover advantage in establishing .ana/ standard

**2. We have the domain expertise**
- Built 4 orchestration frameworks (IRIS, ATLAS, PROTO, Power BI)
- Understand distributed systems (service mesh, GraphQL federation)
- Know the pain points (we've lived them)

**3. We're tool-agnostic**
- Works with Claude, Cursor, Windsurf, any AI tool
- Not locked to one platform
- Developer freedom = adoption

**4. Network effects protect us**
- Each team that adopts nodes adds value
- Shared patterns emerge (community)
- Switching cost increases with scale
- By the time competitors notice, we have 1000+ projects

**5. Open source + commercial cloud**
- Core is free (rapid adoption)
- Cloud sync is paid (monetization)
- Community contributions (free R&D)
- Hard to compete with free

### The Research Backing

**Federation patterns we're applying:**

1. **GraphQL Federation (Apollo):**
   - Teams own subgraphs
   - Publish schemas
   - System composes on-demand
   - **Our application:** Nodes publish exports, queries compose

2. **Backstage Software Catalog (Spotify):**
   - Each service owns metadata (catalog-info.yaml)
   - Discovery through metadata
   - Scales to thousands of services
   - **Our application:** node.json + federation/nodes.json

3. **Service Mesh Discovery (Consul/Istio):**
   - Services discover each other via gossip or DNS
   - Health checking and validation
   - Resilient to failures
   - **Our application:** Manifest + autoscan discovery

4. **DDD Bounded Contexts:**
   - Large systems split by team boundaries
   - Explicit interfaces between contexts
   - Each context is internally consistent
   - **Our application:** One node = one bounded context

**We're not inventing - we're applying proven distributed systems patterns to AI context management.**

**Competitors think:** "AI tools, just add more context"
**We think:** "AI context IS a distributed systems problem"

This is our unfair advantage.

---

## Conclusion

Node federation is Anatomia's killer feature. It solves the fundamental problem of AI context at scale: **you can't put everything in one context, and manual docs don't scale**.

**Federation enables:**
- ✅ Nodes specialize (deep understanding of bounded contexts)
- ✅ Nodes coordinate (deterministic queries, safe broadcasts)
- ✅ Interfaces stay current (auto-generated exports)
- ✅ Teams stay aligned (git-tracked coordination)
- ✅ Network effects compound (more nodes = more value)

**The moat is:**
1. **Technical depth** - Requires expertise in code analysis, distributed systems
2. **Network effects** - Value scales non-linearly with adoption
3. **Strategic positioning** - Local-first, tool-agnostic, open source

**By the time competitors understand what we've built, we'll have:**
- .ana/ established as standard
- 1,000+ projects using federation
- Community patterns and templates
- 12-18 month technical lead

**This is how we win.**

---

## Implementation Checklist

For engineers building MVP2:

### Week 9: Query Protocol
- [ ] Node discovery (manifest + autoscan)
- [ ] Node validation
- [ ] Query surface loading
- [ ] Lexical search implementation
- [ ] Result formatting
- [ ] `ana query` command

### Week 10: Broadcast Protocol
- [ ] Broadcast message format
- [ ] Inbox delivery
- [ ] `ana broadcast` command
- [ ] `ana inbox` command
- [ ] `ana inbox show` command
- [ ] `ana inbox apply` command

### Week 11: Auto-Exports (OpenAPI)
- [ ] OpenAPI schema detection
- [ ] Schema parsing
- [ ] Markdown generation
- [ ] Integration with `ana evolve`

### Week 12: Auto-Exports (TypeScript) + Polish
- [ ] tree-sitter setup
- [ ] TypeScript export extraction
- [ ] Markdown generation
- [ ] Error handling
- [ ] Documentation
- [ ] Tests

**Total estimated LOC for MVP2:** ~3,500 LOC (federation layer only)

---

**End of Deep Dive. Now go build the moat.**
