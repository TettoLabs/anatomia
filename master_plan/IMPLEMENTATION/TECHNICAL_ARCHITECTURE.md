# Anatomia Technical Architecture

**Last Updated:** January 12, 2026
**Status:** Implementation-ready technical specification

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI (ana)                                │
├─────────────────────────────────────────────────────────────────┤
│  Commands                                                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐ ┌──────────┐  │
│  │ init │ │evolve│ │health│ │ mode │ │ nodes  │ │  query   │  │
│  └───┬──┘ └───┬──┘ └───┬──┘ └───┬──┘ └───┬────┘ └────┬─────┘  │
│      │        │        │        │        │            │         │
├──────┴────────┴────────┴────────┴────────┴────────────┴─────────┤
│                         Core Engines                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Analyzer       │ Code parsing, pattern detection         │ │
│  │  Generator      │ Context/mode template interpolation     │ │
│  │  NodeDiscovery  │ Find sibling nodes (manifest/autoscan) │ │
│  │  QueryEngine    │ Cross-node queries, search             │ │
│  │  BroadcastEng   │ Message delivery, inbox management     │ │
│  │  ExportGen      │ Auto-generate exports from code        │ │
│  │  TreeSitter     │ AST parsing (Python, TS, Go, etc.)     │ │
│  │  HealthChecker  │ Staleness, health scoring              │ │
│  └────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                         Storage Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ .ana/        │  │ .ana/.state/ │  │ ~/.ana/              │  │
│  │ (tracked)    │  │ (gitignored) │  │ (global config)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ (MVP3: Optional cloud layer)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloud Services (Supabase)                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ Team Sync│  │ Pattern  │  │ Analytics │  │  Dashboard   │  │
│  │          │  │  Cloud   │  │           │  │   (web UI)   │  │
│  └──────────┘  └──────────┘  └───────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Core CLI

**Language:** TypeScript + Node.js 20+
**Why:**
- Fast development
- npm ecosystem (tree-sitter bindings, file ops)
- Familiar to most developers
- Easy to parse multiple languages

**Build tooling:**
- **pnpm** - Package manager (fast, workspace support)
- **turbo** - Monorepo build orchestration
- **tsup** - TypeScript bundler (fast, simple)
- **vitest** - Testing framework

**CLI framework:**
- **commander** - Command parsing and routing
- **inquirer** - Interactive prompts
- **chalk** - Terminal styling
- **ora** - Spinners and progress indicators

**File operations:**
- **glob** - File pattern matching (find files)
- **tree-sitter** - AST parsing (Python, TS, Go, Rust)
- **tiktoken** - Token counting (context size estimation)
- **yaml** - YAML parsing (frontmatter)

**Git operations:**
- **simple-git** - Git commands (status, diff, hooks)
- **ignore** - .gitignore parsing

### Optional Cloud Stack (MVP3)

**Backend:** Supabase
- PostgreSQL database
- Auth (email/GitHub OAuth)
- Realtime subscriptions
- Edge functions (API endpoints)

**Frontend:** Next.js + React
- Local dashboard (served by CLI)
- Tailwind CSS styling
- Recharts for analytics

---

## Core Data Structures

### AnalysisResult

**Output from analyzer engine:**

```typescript
interface AnalysisResult {
  // Identity
  projectType: 'python' | 'node' | 'go' | 'rust' | 'ruby' | 'php' | 'mixed';
  framework: string | null;  // 'fastapi', 'express', 'nextjs', etc.

  // Structure
  architecture: 'monolith' | 'layered' | 'microservices' | 'unknown';
  structure: {
    directories: Record<string, string>;  // path -> purpose
    entryPoints: string[];                // main.py, index.ts, etc.
    testLocation: string | null;          // where tests live
  };

  // Patterns
  patterns: {
    errorHandling: string;     // 'exceptions', 'results', 'either'
    validation: string | null; // 'pydantic', 'zod', 'joi'
    database: string | null;   // 'sqlalchemy', 'prisma', 'gorm'
    auth: string | null;       // 'jwt', 'session', 'oauth'
    testing: string | null;    // 'pytest', 'jest', 'go-test'
    logging: string | null;    // 'logging', 'winston', 'slog'
  };

  // Conventions
  conventions: {
    naming: 'snake_case' | 'camelCase' | 'PascalCase' | 'kebab-case' | 'mixed';
    imports: 'absolute' | 'relative' | 'mixed';
    typeHints: 'always' | 'sometimes' | 'never';
    docstrings: string | null;  // 'google', 'numpy', 'jsdoc'
  };

  // Quality indicators
  quality: {
    hasTests: boolean;
    hasCI: boolean;
    hasDocker: boolean;
    hasDocs: boolean;
    estimatedCoverage: 'high' | 'medium' | 'low' | 'unknown';
  };

  // Stats
  stats: {
    fileCount: number;
    lineCount: number;
    directories: number;
  };
}
```

### NodeInfo

**Identity and federation metadata:**

```typescript
interface NodeInfo {
  // Identity (from node.json)
  name: string;              // 'auth-service'
  role: string;              // 'authentication'
  owner: string;             // 'platform-team'
  description: string;       // Human-readable purpose
  tags: string[];            // ['jwt', 'sessions', 'oauth']

  // Paths
  rootPath: string;          // Absolute path to node root
  anaPath: string;           // Absolute path to .ana/ folder

  // Federation config
  queryable: boolean;        // Can others query this node?
  acceptsBroadcast: boolean; // Accepts broadcast messages?
  requiresReview: boolean;   // Human review for broadcasts?

  // Exports
  exportsFile: string | null;      // Path to exports.md
  exportsAutoGenerate: boolean;    // Auto-generate on evolve?
  exportsSources: string[];        // ['openapi', 'tree-sitter']

  // Boundaries
  boundaries: {
    root: string;             // Relative root path
    includes: string[];       // Glob patterns to include
    excludes: string[];       // Glob patterns to exclude
  };
}
```

### FederationRegistry

**Discovered nodes in the network:**

```typescript
interface FederationRegistry {
  self: NodeInfo;              // The current node
  nodes: NodeInfo[];           // Connected nodes
  discoveryMethod: 'manifest' | 'autoscan' | 'submodules';
  discoveredAt: Date;

  // Helper methods
  findNode(name: string): NodeInfo | null;
  findByRole(role: string): NodeInfo[];
  validate(): ValidationResult;  // Check all nodes reachable
}
```

### QueryResult

**Output from ana query:**

```typescript
interface QueryResult {
  from: string;                // Node name
  question: string;            // Original question

  answer: {
    markdown: string;          // Human-readable answer
    source: {
      file: string;            // Which file answered
      section: string;         // Which heading
      path: string;            // Full path for reference
    };
    confidence: number;        // 0.0 - 1.0 score
  };

  evidence: Array<{
    file: string;
    heading: string;
    score: number;
  }>;

  timing: {
    discoveryMs: number;       // Time to find node
    searchMs: number;          // Time to search
    totalMs: number;
  };
}
```

### BroadcastMessage

**Message sent between nodes:**

```typescript
interface BroadcastMessage {
  id: string;                  // ULID or UUID
  timestamp: Date;

  from: {
    name: string;              // 'storefront'
    path: string;              // 'apps/storefront'
  };

  type: 'broadcast' | 'question' | 'notification';
  topic: string;               // 'api-change', 'deprecation', 'question'
  message: string;             // Human-readable content

  requiresReview: boolean;     // Must be human-approved?
  priority: 'low' | 'normal' | 'high' | 'urgent';

  metadata?: {
    relatedFiles?: string[];   // Files that changed
    breaking?: boolean;        // Breaking change?
    deadline?: Date;           // Respond by when?
  };
}
```

---

## Engine Implementations

### 1. Analyzer Engine

**Purpose:** Deeply analyze codebase to produce AnalysisResult

**Pipeline:**
```
detectProjectType()
    ↓
analyzePackageFiles()
    ↓
detectFramework()
    ↓
analyzeStructure()
    ↓
inferPatterns()
    ↓
detectConventions()
    ↓
assessQuality()
    ↓
AnalysisResult
```

**Key functions:**

```typescript
// packages/analyzer/src/index.ts

export async function analyze(rootPath: string): Promise<AnalysisResult> {
  const projectType = await detectProjectType(rootPath);
  const framework = await detectFramework(rootPath, projectType);
  const structure = await analyzeStructure(rootPath);
  const patterns = await inferPatterns(rootPath, projectType, framework);
  const conventions = await detectConventions(rootPath, projectType);
  const quality = await assessQuality(rootPath);
  const stats = await gatherStats(rootPath);

  return {
    projectType,
    framework,
    architecture: inferArchitecture(structure),
    structure,
    patterns,
    conventions,
    quality,
    stats,
  };
}
```

**Project type detection:**

```typescript
async function detectProjectType(rootPath: string): Promise<ProjectType> {
  const indicators = {
    python: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'],
    node: ['package.json'],
    go: ['go.mod'],
    rust: ['Cargo.toml'],
    ruby: ['Gemfile'],
    php: ['composer.json'],
  };

  const detected: ProjectType[] = [];

  for (const [type, files] of Object.entries(indicators)) {
    for (const file of files) {
      if (await exists(join(rootPath, file))) {
        detected.push(type as ProjectType);
        break;
      }
    }
  }

  if (detected.length === 0) return 'unknown';
  if (detected.length === 1) return detected[0];
  return 'mixed';  // Monorepo with multiple languages
}
```

**Framework detection (FastAPI example):**

```typescript
async function detectPythonFramework(rootPath: string): Promise<string | null> {
  // Read requirements.txt or pyproject.toml
  const deps = await readPythonDependencies(rootPath);

  // Check for frameworks (in priority order)
  if (deps.includes('fastapi')) return 'fastapi';
  if (deps.includes('django')) return 'django';
  if (deps.includes('flask')) return 'flask';
  if (deps.includes('typer') || deps.includes('click')) return 'cli';

  return null;
}
```

**Pattern inference (validation example):**

```typescript
async function inferValidationPattern(
  rootPath: string,
  dependencies: string[]
): Promise<string | null> {
  // Check dependencies first (fast)
  if (dependencies.includes('pydantic')) return 'pydantic';
  if (dependencies.includes('zod')) return 'zod';
  if (dependencies.includes('joi')) return 'joi';

  // Sample code files to confirm (slower but more accurate)
  const samples = await glob('**/*.{py,ts,js}', {
    cwd: rootPath,
    ignore: ['node_modules/**', 'venv/**', '.venv/**'],
    limit: 20,  // Sample max 20 files
  });

  for (const file of samples) {
    const content = await fs.readFile(join(rootPath, file), 'utf8');

    // Look for usage patterns
    if (/from pydantic import|import pydantic/.test(content)) return 'pydantic';
    if (/from zod import|import.*zod/.test(content)) return 'zod';
  }

  return null;
}
```

### 2. Generator Engine

**Purpose:** Transform AnalysisResult into .ana/ files

**Pipeline:**
```
loadTemplates(framework, projectType)
    ↓
interpolateAnalysis(templates, analysis)
    ↓
applyUserAnswers(context, answers)
    ↓
optimizeTokenBudgets(files)
    ↓
GeneratorOutput
```

**Key functions:**

```typescript
// packages/generator/src/index.ts

export async function generate(
  analysis: AnalysisResult,
  answers: UserAnswers
): Promise<GeneratorOutput> {
  // Load framework-specific templates
  const templates = await loadTemplates(
    analysis.projectType,
    analysis.framework
  );

  // Create interpolation context
  const context = {
    project: {
      type: analysis.projectType,
      framework: analysis.framework,
      architecture: analysis.architecture,
    },
    structure: analysis.structure,
    patterns: analysis.patterns,
    conventions: analysis.conventions,
    quality: analysis.quality,
    user: answers,
  };

  // Generate context files
  const contextFiles = interpolateTemplates(templates.context, context);

  // Generate mode files
  const modeFiles = interpolateTemplates(templates.modes, context);

  // Optimize for token budgets
  const optimized = optimizeTokens({
    context: contextFiles,
    modes: modeFiles,
  });

  return optimized;
}
```

**Template interpolation (Handlebars-style):**

```typescript
function interpolateTemplate(template: string, context: any): string {
  // Support {{variable}}, {{#if}}, {{#each}}
  let output = template;

  // Simple variable replacement
  output = output.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return context[key] || '';
  });

  // Conditional blocks
  output = output.replace(/\{\{#if (\w+)\}\}(.*?)\{\{\/if\}\}/gs, (_, key, content) => {
    return context[key] ? content : '';
  });

  // Iteration blocks
  output = output.replace(/\{\{#each (\w+)\}\}(.*?)\{\{\/each\}\}/gs, (_, key, template) => {
    const items = context[key] || [];
    return items.map((item: any) =>
      interpolateTemplate(template, { ...context, this: item })
    ).join('\n');
  });

  return output;
}
```

### 3. Node Discovery Engine (MVP1.5+)

**Purpose:** Find and validate sibling nodes in codebase

**Discovery methods:**

```typescript
// packages/cli/src/federation/discovery.ts

export async function discoverNodes(selfAnaPath: string): Promise<FederationRegistry> {
  const selfNode = await loadNodeInfo(selfAnaPath);

  // Try methods in order
  let nodes: NodeInfo[] = [];

  // 1. Manifest (explicit) - most reliable
  const manifestNodes = await discoverFromManifest(selfAnaPath);
  if (manifestNodes.length > 0) {
    nodes = manifestNodes;
  }
  // 2. Auto-scan (implicit) - fallback for discovery
  else {
    nodes = await discoverByAutoScan(selfAnaPath);
  }

  // Validate all discovered nodes
  const validated = await Promise.all(
    nodes.map(n => validateNode(n))
  );

  return {
    self: selfNode,
    nodes: validated.filter(n => n.valid),
    discoveryMethod: manifestNodes.length > 0 ? 'manifest' : 'autoscan',
    discoveredAt: new Date(),
  };
}
```

**Manifest-based discovery:**

```typescript
async function discoverFromManifest(selfAnaPath: string): Promise<NodeInfo[]> {
  const manifestPath = join(selfAnaPath, 'federation', 'nodes.json');

  if (!await exists(manifestPath)) {
    return [];
  }

  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const selfRoot = dirname(selfAnaPath);

  return await Promise.all(
    manifest.nodes.map(async (entry: any) => {
      const targetRoot = realpath(resolve(selfRoot, entry.path));
      const targetAna = join(targetRoot, '.ana');

      return await loadNodeInfo(targetAna);
    })
  );
}
```

**Auto-scan discovery:**

```typescript
async function discoverByAutoScan(selfAnaPath: string): Promise<NodeInfo[]> {
  const repoRoot = await findRepoRoot(dirname(selfAnaPath));

  // Scan conventional monorepo directories
  const candidateRoots = [
    join(repoRoot, 'apps'),
    join(repoRoot, 'services'),
    join(repoRoot, 'packages'),
  ].filter(exists);

  const nodes: NodeInfo[] = [];

  for (const base of candidateRoots) {
    const children = await fs.readdir(base, { withFileTypes: true });

    for (const child of children) {
      if (!child.isDirectory()) continue;

      const anaPath = join(base, child.name, '.ana');
      if (await exists(anaPath)) {
        nodes.push(await loadNodeInfo(anaPath));
      }
    }
  }

  return nodes;
}
```

**Node validation:**

```typescript
async function validateNode(node: NodeInfo): Promise<NodeInfo & { valid: boolean; error?: string }> {
  // Check paths exist
  if (!await exists(node.rootPath)) {
    return { ...node, valid: false, error: 'Root path does not exist' };
  }

  if (!await exists(node.anaPath)) {
    return { ...node, valid: false, error: '.ana folder missing' };
  }

  // Check required files
  const requiredFiles = [
    join(node.anaPath, 'node.json'),
    join(node.anaPath, 'context', 'main.md'),
  ];

  for (const file of requiredFiles) {
    if (!await exists(file)) {
      return { ...node, valid: false, error: `Missing required file: ${basename(file)}` };
    }
  }

  return { ...node, valid: true };
}
```

### 4. Query Engine (MVP2+)

**Purpose:** CLI tool that searches other nodes for information (executed by AI or human)

**Two modes:**

**Mode A: Keyword Search (MVP2 - Default)**
```
parseCommand(targetNode, question)
    ↓
extractKeywords(question)  // [jwt, refresh, pattern]
    ↓
discoverNode(targetNode)
    ↓
loadQuerySurface(targetNode)  // exports → patterns → main
    ↓
searchSurface(sections, keywords)  // keyword matching, no LLM
    ↓
formatResult(hits)
    ↓
QueryResult (in <100ms, no API calls)
```

**Mode B: Semantic Search (MVP3 - Optional)**
```
parseCommand(targetNode, question)
    ↓
discoverNode(targetNode)
    ↓
loadQuerySurface(targetNode)
    ↓
callLLM(question, surface, userApiKey)  // Uses user's Anthropic/OpenAI key
    ↓
formatResult(answer)
    ↓
QueryResult (in 2-5s, costs ~$0.01)
```

**Used by Claude Code:**
```
User: @.ana/modes/code.md [asks question needing cross-service info]
Claude: [Reads mode.md - sees instruction to use ana query]
        [Executes: bash> ana query auth-api "JWT pattern"]
        [Gets result from CLI - keyword or semantic depending on config]
        [Uses result in response]
User: [Never left chat]
```

**Implementation (Keyword Mode - MVP2):**

```typescript
// packages/cli/src/federation/query.ts

export async function queryNode(
  targetNode: string,
  question: string,
  options: QueryOptions = {}
): Promise<QueryResult> {
  const startTime = Date.now();

  // 1. Discover target node
  const selfAna = await findNearestAna(process.cwd());
  const registry = await discoverNodes(selfAna);
  const target = registry.findNode(targetNode);

  if (!target) {
    throw new Error(`Node '${targetNode}' not found. Available: ${registry.nodes.map(n => n.name).join(', ')}`);
  }

  const discoveryTime = Date.now() - startTime;

  // 2. Load query surface (prioritized: exports first)
  const surface = await loadQuerySurface(target.anaPath);

  // 3. Search (keyword or semantic based on options)
  const searchStart = Date.now();
  const hits = options.semantic
    ? await searchSemantic(surface, question, options.apiKey)  // LLM-powered
    : searchKeyword(surface, question);                         // Text matching
  const searchTime = Date.now() - searchStart;

  if (hits.length === 0) {
    return {
      from: targetNode,
      question,
      answer: null,
      evidence: [],
      method: options.semantic ? 'semantic' : 'keyword',
      timing: { discoveryMs: discoveryTime, searchMs: searchTime, totalMs: Date.now() - startTime },
    };
  }

  // 4. Format result
  const topHit = hits[0];
  return {
    from: targetNode,
    question,
    answer: {
      markdown: formatMarkdownAnswer(topHit),
      source: {
        file: relative(target.anaPath, topHit.section.filePath),
        section: topHit.section.heading,
        path: topHit.section.filePath,
      },
      confidence: topHit.confidence || calculateConfidence(topHit.score, hits.length),
    },
    evidence: hits.slice(0, 3).map(h => ({
      file: relative(target.anaPath, h.section.filePath),
      heading: h.section.heading,
      score: h.score,
    })),
    method: options.semantic ? 'semantic' : 'keyword',
    timing: { discoveryMs: discoveryTime, searchMs: searchTime, totalMs: Date.now() - startTime },
  };
}

// Keyword search (MVP2 - no LLM)
function searchKeyword(sections: Section[], question: string): SearchHit[] {
  const keywords = extractKeywords(question);  // [jwt, refresh, pattern]

  return sections
    .map(sec => ({
      section: sec,
      score: scoreByKeywords(sec, keywords),
      snippet: extractSnippet(sec.text, keywords),
    }))
    .filter(h => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// Semantic search (MVP3 - uses LLM)
async function searchSemantic(
  sections: Section[],
  question: string,
  apiKey: string
): Promise<SearchHit[]> {
  const context = sections.map(s => `## ${s.heading}\n${s.text}`).join('\n\n');

  // Call Anthropic API with user's key
  const response = await callAnthropicAPI({
    apiKey,
    model: 'claude-haiku-4',
    prompt: `Given this context from a codebase node:\n\n${context}\n\nAnswer: ${question}`,
  });

  return [{
    section: sections[0],  // LLM synthesizes, doesn't map to single section
    score: 1.0,
    snippet: response.answer,
    confidence: 0.95,
  }];
}
```

**Key: Both modes return same QueryResult format. Claude Code doesn't care which was used - it just executes `ana query` and gets an answer.**

**Query surface loading (prioritized):**

```typescript
async function loadQuerySurface(nodeAnaPath: string): Promise<Section[]> {
  // Ordered by priority (exports first, main last)
  const files = [
    join(nodeAnaPath, 'federation', 'exports.md'),    // PUBLIC interfaces
    join(nodeAnaPath, 'context', 'patterns.md'),      // Patterns and conventions
    join(nodeAnaPath, 'context', 'main.md'),          // Full context
    join(nodeAnaPath, 'context', 'conventions.md'),   // Additional conventions
    join(nodeAnaPath, 'learning', 'explicit.md'),     // User-taught knowledge
  ];

  const sections: Section[] = [];

  for (const file of files) {
    if (!await exists(file)) continue;

    const content = await fs.readFile(file, 'utf8');
    const parsed = parseMarkdownSections(content, file);
    sections.push(...parsed);
  }

  return sections;
}
```

**Markdown section parsing:**

```typescript
interface Section {
  filePath: string;
  heading: string;
  level: number;     // 1-6 (h1-h6)
  text: string;      // Full text content
  lineStart: number;
  lineEnd: number;
}

function parseMarkdownSections(markdown: string, filePath: string): Section[] {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  let currentSection: Partial<Section> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect heading (# Heading Text)
    const match = line.match(/^(#{1,6})\s+(.+)$/);

    if (match) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection as Section);
      }

      // Start new section
      currentSection = {
        filePath,
        heading: match[2],
        level: match[1].length,
        text: '',
        lineStart: i + 1,
      };
    } else if (currentSection) {
      // Accumulate text
      currentSection.text += line + '\n';
      currentSection.lineEnd = i + 1;
    }
  }

  // Push final section
  if (currentSection) {
    sections.push(currentSection as Section);
  }

  return sections;
}
```

**Lexical search (MVP2 - Week 1):**

```typescript
interface SearchHit {
  section: Section;
  score: number;
  snippet: string;
  matches: string[];  // Which keywords matched
}

function searchSurface(sections: Section[], question: string): SearchHit[] {
  const keywords = extractKeywords(question);
  // keywords = ['jwt', 'refresh', 'token', 'pattern']

  const hits = sections
    .map(section => {
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

  return hits.slice(0, 5);  // Top 5 results
}

function scoreSection(section: Section, keywords: string[]): number {
  const haystack = normalize(section.heading + '\n' + section.text);
  let score = 0;

  for (const keyword of keywords) {
    const occurrences = countOccurrences(haystack, keyword);

    // Keyword in heading = 5 points
    if (normalize(section.heading).includes(keyword)) {
      score += 5;
    }

    // Each occurrence in text = 2 points
    score += occurrences * 2;
  }

  // Boost for substantive sections (not too short)
  if (section.text.length > 200) {
    score += Math.min(10, section.text.length / 500);
  }

  // Penalize if too generic (section is entire file)
  if (section.text.length > 5000) {
    score *= 0.5;
  }

  return score;
}

function extractSnippet(text: string, keywords: string[]): string {
  // Find paragraph with most keyword density
  const paragraphs = text.split('\n\n');

  let bestPara = paragraphs[0];
  let bestScore = 0;

  for (const para of paragraphs) {
    const normalized = normalize(para);
    let score = 0;
    for (const kw of keywords) {
      score += countOccurrences(normalized, kw);
    }
    if (score > bestScore) {
      bestScore = score;
      bestPara = para;
    }
  }

  // Truncate if too long
  return bestPara.length > 500
    ? bestPara.slice(0, 497) + '...'
    : bestPara;
}
```

### 5. Broadcast Engine (MVP2)

**Purpose:** Send messages between nodes safely

**Broadcast pipeline:**
```
validateMessage(msg)
    ↓
discoverTargetNodes()
    ↓
deliverToInbox(msg, targets)
    ↓
logBroadcast(receipt)
```

**Implementation:**

```typescript
// packages/cli/src/federation/broadcast.ts

export async function broadcast(
  message: string,
  options: BroadcastOptions
): Promise<BroadcastReceipt> {
  const selfAna = await findNearestAna(process.cwd());
  const selfNode = await loadNodeInfo(selfAna);
  const registry = await discoverNodes(selfAna);

  // Filter targets
  const targets = options.target
    ? [registry.findNode(options.target)]
    : registry.nodes;

  if (targets.some(t => !t)) {
    throw new Error('One or more target nodes not found');
  }

  // Create broadcast message
  const broadcastMsg: BroadcastMessage = {
    id: ulid(),
    timestamp: new Date(),
    from: {
      name: selfNode.name,
      path: relative(await findRepoRoot(selfAna), selfNode.rootPath),
    },
    type: options.type || 'broadcast',
    topic: options.topic || 'general',
    message,
    requiresReview: true,  // Always for MVP2
    priority: options.priority || 'normal',
    metadata: options.metadata,
  };

  // Confirm before sending
  if (!options.skipConfirm) {
    console.log(chalk.bold(`\nBroadcasting to ${targets.length} nodes:\n`));
    targets.forEach(t => console.log(`  ▸ ${t.name} (${t.role})`));

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Send to all?',
      default: true,
    }]);

    if (!confirm) {
      return { sent: 0, targets: [] };
    }
  }

  // Deliver to each target's inbox
  const results = await Promise.all(
    targets.map(t => deliverToInbox(broadcastMsg, t))
  );

  return {
    sent: results.filter(r => r.success).length,
    targets: results,
    messageId: broadcastMsg.id,
  };
}
```

**Inbox delivery:**

```typescript
async function deliverToInbox(
  msg: BroadcastMessage,
  target: NodeInfo
): Promise<DeliveryResult> {
  try {
    const inboxDir = join(target.anaPath, 'federation', 'inbox');
    await fs.mkdir(inboxDir, { recursive: true });

    // Filename: timestamp_from-node__topic.json
    const filename = [
      msg.timestamp.toISOString().replace(/[:.]/g, '-'),
      msg.from.name,
      slug(msg.topic),
    ].join('__') + '.json';

    const inboxPath = join(inboxDir, filename);
    await fs.writeFile(inboxPath, JSON.stringify(msg, null, 2), 'utf8');

    return {
      success: true,
      node: target.name,
      inboxPath,
    };
  } catch (error) {
    return {
      success: false,
      node: target.name,
      error: error.message,
    };
  }
}
```

**Inbox management:**

```typescript
// ana inbox command

export async function listInbox(): Promise<InboxItem[]> {
  const selfAna = await findNearestAna(process.cwd());
  const inboxDir = join(selfAna, 'federation', 'inbox');

  if (!await exists(inboxDir)) {
    return [];
  }

  const files = await fs.readdir(inboxDir);
  const messages = await Promise.all(
    files
      .filter(f => f.endsWith('.json'))
      .map(async f => {
        const msg = JSON.parse(await fs.readFile(join(inboxDir, f), 'utf8'));
        return {
          id: basename(f, '.json'),
          message: msg,
          reviewed: false,
        };
      })
  );

  return messages.sort((a, b) =>
    b.message.timestamp.localeCompare(a.message.timestamp)
  );
}

export async function applyInboxMessage(messageId: string): Promise<void> {
  const selfAna = await findNearestAna(process.cwd());
  const inboxPath = join(selfAna, 'federation', 'inbox', messageId + '.json');

  const msg = JSON.parse(await fs.readFile(inboxPath, 'utf8'));

  // Append to learned/explicit.md
  const explicitPath = join(selfAna, 'learning', 'explicit.md');
  let content = await fs.readFile(explicitPath, 'utf8');

  content += `\n\n## Incoming: ${msg.topic} (${msg.timestamp.split('T')[0]})\n`;
  content += `From: ${msg.from.name}\n\n`;
  content += `${msg.message}\n`;

  await fs.writeFile(explicitPath, content, 'utf8');

  // Archive the message
  const archiveDir = join(selfAna, 'federation', 'inbox', '.archive');
  await fs.mkdir(archiveDir, { recursive: true });
  await fs.rename(inboxPath, join(archiveDir, messageId + '.json'));

  console.log(chalk.green('✓ Applied and archived'));
}
```

### 6. Export Generator (MVP2 - The Killer Feature)

**Purpose:** Auto-generate exports.md from code (interfaces always current)

**Two approaches:**

#### A. From OpenAPI Schema (FastAPI, Django REST, Express with decorators)

```typescript
// packages/cli/src/federation/exports-openapi.ts

export async function generateExportsFromOpenAPI(
  nodeRoot: string
): Promise<string> {
  // 1. Find OpenAPI schema
  const schemaPath = await findOpenAPISchema(nodeRoot);
  // Checks: /openapi.json, /docs/openapi.json, /api/openapi.json

  if (!schemaPath) {
    return null;  // No OpenAPI available
  }

  const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));

  // 2. Convert to markdown
  let markdown = `# API Exports\n\n`;
  markdown += `Auto-generated from OpenAPI schema\n`;
  markdown += `Last updated: ${new Date().toISOString()}\n\n`;

  // 3. Endpoints
  markdown += `## Endpoints\n\n`;

  for (const [path, methods] of Object.entries(schema.paths)) {
    for (const [method, spec] of Object.entries(methods)) {
      markdown += `### ${method.toUpperCase()} ${path}\n`;
      markdown += `${spec.summary || spec.description || ''}\n\n`;

      // Request body
      if (spec.requestBody) {
        markdown += `**Request:**\n\`\`\`json\n`;
        markdown += JSON.stringify(
          extractSchemaExample(spec.requestBody.content['application/json'].schema, schema),
          null,
          2
        );
        markdown += `\n\`\`\`\n\n`;
      }

      // Response
      if (spec.responses['200']) {
        markdown += `**Response:**\n\`\`\`json\n`;
        markdown += JSON.stringify(
          extractSchemaExample(spec.responses['200'].content['application/json'].schema, schema),
          null,
          2
        );
        markdown += `\n\`\`\`\n\n`;
      }
    }
  }

  // 4. Models (from components.schemas)
  if (schema.components?.schemas) {
    markdown += `## Models\n\n`;

    for (const [name, schemaDef] of Object.entries(schema.components.schemas)) {
      markdown += `### ${name}\n`;
      markdown += formatSchemaAsMarkdown(schemaDef);
      markdown += `\n\n`;
    }
  }

  markdown += `---\n\n`;
  markdown += `_Auto-generated by Anatomia from OpenAPI schema_\n`;
  markdown += `_Source: ${relative(nodeRoot, schemaPath)}_\n`;

  return markdown;
}
```

#### B. From TypeScript/Python exports (tree-sitter parsing)

```typescript
// packages/cli/src/federation/exports-treesitter.ts

export async function generateExportsFromTypeScript(
  nodeRoot: string
): Promise<string> {
  // 1. Find entry point
  const entryPath = await findEntryPoint(nodeRoot);
  // Checks: src/index.ts, index.ts, src/main.ts

  if (!entryPath) {
    return null;
  }

  // 2. Parse with tree-sitter
  const parser = new Parser();
  parser.setLanguage(TypeScript);

  const code = await fs.readFile(entryPath, 'utf8');
  const tree = parser.parse(code);

  // 3. Extract exports
  const exports = extractExports(tree.rootNode, code);

  // 4. Convert to markdown
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
      markdown += `\n`;
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

  // Types/Interfaces
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
```

**Tree-sitter export extraction:**

```typescript
function extractExports(rootNode: TreeSitterNode, sourceCode: string) {
  const exports = {
    components: [],
    functions: [],
    types: [],
    hooks: [],
  };

  // Query for export statements
  const query = new Query(TypeScript.language, `
    (export_statement) @export
    (export_declaration) @export_decl
  `);

  const matches = query.matches(rootNode);

  for (const match of matches) {
    const node = match.captures[0].node;
    const text = sourceCode.slice(node.startIndex, node.endIndex);

    // Parse export type
    if (text.includes('export function') || text.includes('export const') && text.includes('=>')) {
      // Function export
      exports.functions.push(parseFunction(node, sourceCode));
    } else if (text.includes('export interface') || text.includes('export type')) {
      // Type export
      exports.types.push(parseType(node, sourceCode));
    } else if (text.includes('export const') && /^use[A-Z]/.test(text)) {
      // React hook (starts with 'use')
      exports.hooks.push(parseHook(node, sourceCode));
    } else if (text.includes('export function') && /^[A-Z]/.test(text)) {
      // React component (PascalCase function)
      exports.components.push(parseComponent(node, sourceCode));
    }
  }

  return exports;
}
```

---

## File Formats & Specifications

### node.json (Node Identity)

**Location:** `.ana/node.json`
**Purpose:** Identity and federation config for this node

**Schema:**
```typescript
interface NodeConfig {
  version: 1;
  node: {
    name: string;              // Required: 'auth-service'
    role: string;              // Required: 'authentication'
    owner?: string;            // Optional: 'platform-team'
    description?: string;      // Optional: Human-readable
    tags?: string[];           // Optional: ['jwt', 'sessions']
    boundaries: {
      root: string;            // Required: Relative path ('services/auth-service')
      includes?: string[];     // Optional: ['src/**', 'tests/**']
      excludes?: string[];     // Optional: ['node_modules/**']
    };
  };
  federation: {
    queryable: boolean;        // Required: Can others query?
    exports?: {
      file: string;            // Optional: 'federation/exports.md'
      auto_generate: boolean;  // Optional: Auto-gen on evolve?
      sources?: string[];      // Optional: ['openapi', 'tree-sitter']
    };
    broadcast: {
      accept: boolean;         // Required: Accept broadcasts?
      requires_review: boolean;// Required: Human review?
      inbox?: string;          // Optional: Custom inbox path
    };
  };
}
```

**Example (FastAPI service):**
```json
{
  "version": 1,
  "node": {
    "name": "auth-service",
    "role": "authentication",
    "owner": "platform-team",
    "description": "JWT auth, sessions, user identity",
    "tags": ["jwt", "oauth", "sessions", "tokens"],
    "boundaries": {
      "root": "services/auth-service",
      "includes": ["src/**", "tests/**"],
      "excludes": ["node_modules/**", "venv/**", ".pytest_cache/**"]
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

### federation/nodes.json (Federation Manifest)

**Location:** `.ana/federation/nodes.json`
**Purpose:** Explicit list of sibling nodes (outbound federation)

**Schema:**
```typescript
interface FederationManifest {
  version: 1;
  nodes: Array<{
    name: string;              // Required: 'auth-service'
    path: string;              // Required: '../../services/auth-service'
    role: string;              // Required: 'authentication'
    priority?: 'low' | 'normal' | 'high';  // Query priority
    description?: string;      // Optional
  }>;
  discovery?: {
    autoscan_enabled?: boolean;  // Also auto-scan?
    autoscan_paths?: string[];   // Where to look
  };
}
```

**Example (frontend app):**
```json
{
  "version": 1,
  "nodes": [
    {
      "name": "auth-service",
      "path": "../../services/auth-service",
      "role": "authentication",
      "priority": "high",
      "description": "JWT tokens, sessions, user auth"
    },
    {
      "name": "catalog-api",
      "path": "../../services/catalog-api",
      "role": "products",
      "priority": "high",
      "description": "Product catalog, search, categories"
    },
    {
      "name": "orders-api",
      "path": "../../services/orders-api",
      "role": "orders",
      "priority": "normal"
    },
    {
      "name": "shared-ui",
      "path": "../../packages/shared-ui",
      "role": "components",
      "priority": "normal"
    }
  ],
  "discovery": {
    "autoscan_enabled": false
  }
}
```

### federation/exports.md (Auto-Generated Interfaces)

**Location:** `.ana/federation/exports.md`
**Purpose:** Public interfaces this node exposes (queryable by other nodes)
**Generation:** Auto from OpenAPI or tree-sitter (or manual as fallback)

**Format:**
```markdown
# [Node Name] - Exports

Auto-generated from [source]
Last updated: [timestamp]

## [Section 1]
[Content...]

## [Section 2]
[Content...]

---
_Auto-generated by Anatomia from [source]_
_Source: [file path]_
```

(See VISION.md for full examples)

### federation/inbox/*.json (Broadcast Messages)

**Location:** `.ana/federation/inbox/[timestamp]_[from]__[topic].json`
**Purpose:** Incoming broadcast messages (pending review)

**Format:**
```json
{
  "id": "01JBCDEFGH1234567890",
  "timestamp": "2026-01-12T14:23:17.382Z",
  "from": {
    "name": "storefront",
    "path": "apps/storefront"
  },
  "type": "broadcast",
  "topic": "api-change",
  "message": "Frontend now requires API v2 endpoints (paginated responses)",
  "requiresReview": true,
  "priority": "normal",
  "metadata": {
    "relatedFiles": ["src/api/products.py"],
    "breaking": false
  }
}
```

---

## Performance Considerations

### Analysis Speed

**Target:** Complete in <30 seconds for typical project (50K lines)

**Optimizations:**
- Sample files (don't parse every file)
- Parallel analysis where possible
- Cache results (hash-based invalidation)
- Skip node_modules, venv, build outputs

**Benchmarks (estimated):**
- Project type detection: <100ms (just file existence checks)
- Framework detection: <500ms (read 1-2 package files)
- Pattern inference: <5s (sample 20-50 files)
- Convention detection: <3s (sample 10-20 files)
- Structure analysis: <2s (directory walk with limits)
- Total: 10-15s (well under 30s target)

### Query Speed

**Target:** Return results in <500ms

**Optimizations:**
- Lexical search (no embedding lookups)
- Prioritized surface (exports first, stop if found)
- Section-level indexing (not full text)
- Limit results (top 5 hits)

**Benchmarks (estimated):**
- Node discovery: <50ms (read 1 manifest file)
- Load surface: <200ms (read 3-5 markdown files)
- Search: <100ms (keyword matching on ~10K chars)
- Format: <50ms (markdown generation)
- Total: <400ms (well under 500ms target)

### Broadcast Speed

**Target:** Deliver to 10 nodes in <1s

**Optimizations:**
- Parallel delivery (Promise.all)
- Simple file writes (no network I/O)
- Minimal validation

**Benchmarks (estimated):**
- Per-node delivery: <50ms (mkdir + writeFile)
- 10 nodes: <500ms parallel
- 100 nodes: <2s parallel (unlikely scenario)

---

## Security & Safety

### Node Boundaries

**Isolation:**
- Each node can only read sibling node's .ana/ folder (not source code)
- Queries don't execute code (just read markdown)
- No remote code execution

**Validation:**
- Node paths must resolve within repo root
- No ../../../ path traversal exploits
- Symlinks followed but validated

### Broadcast Safety

**Human review required:**
- No auto-updates to context files
- Messages go to inbox (human reads + applies)
- Clear attribution (who sent, when, why)

**Audit trail:**
- All broadcasts logged
- Inbox messages timestamped
- Archive kept (in .archive/)
- Git tracks everything

### Data Privacy

**Local-first:**
- Nothing leaves your machine (unless you opt-in to cloud)
- No telemetry by default
- No code sent to servers
- Queries are local file reads

**Cloud (MVP3, opt-in):**
- Only context hashes synced (not full context)
- Patterns anonymized before Pattern Cloud
- Team sync requires explicit consent
- SOC2/GDPR compliant (Supabase provides this)

---

## Storage & State Management

### Git-Tracked Files

**Should be committed:**
```
.ana/
├── node.json                     ✓ Track (identity)
├── context/*.md                  ✓ Track (generated, but reviewable)
├── modes/*.md                    ✓ Track (modes)
├── federation/
│   ├── nodes.json                ✓ Track (explicit relationships)
│   ├── exports.md                ✓ Track (auto-generated, but useful to see)
│   └── inbox/*.json              ? Optional (team decision)
└── learning/
    ├── explicit.md               ✓ Track (user knowledge)
    └── patterns.md               ✓ Track (learned patterns)
```

### Gitignored Files

**Should NOT be committed:**
```
.ana/
├── .state/
│   ├── cache/                    ✗ Ignore (transient)
│   ├── session.json              ✗ Ignore (runtime state)
│   └── analysis-cache.json       ✗ Ignore (performance cache)
└── learning/
    └── outcomes.log              ✗ Ignore (raw git hook data)
```

**Default .ana/.gitignore:**
```
.state/
*.log
cache/
*.tmp
```

### Global Config

**Location:** `~/.ana/config.json`
**Purpose:** User-level settings (not project-specific)

```json
{
  "user": {
    "name": "Ryan Smith",
    "email": "ryan@example.com"
  },
  "defaults": {
    "git_strategy": "github-flow",
    "auto_evolve": false,
    "theme": "dark"
  },
  "cloud": {
    "enabled": false,
    "api_key": null,
    "team_id": null
  },
  "telemetry": {
    "enabled": false
  }
}
```

---

## Communication Protocols

### Node-to-Node Communication (MVP2)

**Method:** File-based (no network, no sockets)

**Why file-based:**
- Zero infrastructure required
- Works offline
- Git-trackable
- Cross-platform (no Unix socket limitations on Windows)
- Debuggable (just cat the files)

**Protocol:**

```
Query:
  Node A → Reads Node B's .ana/federation/exports.md
  (Direct file read, no intermediary)

Broadcast:
  Node A → Writes to Node B's .ana/federation/inbox/message.json
  Node B → Reads own inbox via `ana inbox`
  Node B → Applies message (updates learning/explicit.md)
  (Async, human-in-loop)
```

**No RPC, no HTTP, no sockets.** Just files.

**Later (MVP3+):** Could add real-time sync via Supabase Realtime, but file-based always works.

### Discovery Protocol

**Manifest-based (primary):**
```
1. Read .ana/federation/nodes.json
2. Resolve relative paths (../../services/auth-service)
3. Validate each path points to valid .ana/ folder
4. Load each node's node.json
5. Return registry of NodeInfo[]
```

**Auto-scan (helper):**
```
1. Find repo root (walk up until .git found)
2. Scan conventional paths:
   - apps/*/.ana/
   - services/*/.ana/
   - packages/*/.ana/
3. Load each found node's node.json
4. Return discovered nodes (suggest adding to manifest)
```

---

## Integration Points

### With AI Tools

**Claude Code:**
```
User: @.ana/modes/code.md Help me add Stripe integration
Claude: [Reads code.md + context/main.md + context/patterns.md]
        [Responds with code following detected patterns]
```

**Cursor:**
```
// .cursor/rules can import .ana/
import: .ana/context/main.md
import: .ana/modes/code.md
```

**Windsurf:**
```
// .windsurfrules can reference .ana/
include: .ana/context/main.md
```

**Any tool that reads markdown:** Just point it to .ana/ files.

### With Git

**Git hooks (installed by `ana init`):**

```bash
# .git/hooks/post-commit
#!/bin/bash

if command -v ana &> /dev/null && [ -d ".ana" ]; then
  ana _internal_hook_commit "$@" 2>/dev/null &
fi
```

**What the hook does:**
```typescript
// Internal command (not user-facing)
export async function handlePostCommit() {
  const selfAna = await findNearestAna(process.cwd());
  const commitSha = await getLastCommitSha();
  const changedFiles = await getCommitFiles(commitSha);

  // Log outcome
  const outcome = {
    timestamp: new Date().toISOString(),
    sha: commitSha,
    files: changedFiles,
    // Mode active (if session tracking enabled)
    mode: await getActiveMode(selfAna),
  };

  // Append to outcomes.log
  const logPath = join(selfAna, 'learning', 'outcomes.log');
  await fs.appendFile(logPath, JSON.stringify(outcome) + '\n', 'utf8');
}
```

### With Build Tools

**package.json scripts:**
```json
{
  "scripts": {
    "precommit": "ana health --fail-if-stale",
    "postinstall": "ana evolve --quiet"
  }
}
```

**CI/CD (GitHub Actions example):**
```yaml
- name: Check Anatomia health
  run: |
    npm install -g anatomia
    ana health --format json > health.json
    ana nodes --validate
```

---

## Extensibility & Future Hooks

### Plugin System (Future - Post-MVP3)

**Concept:** Allow community to extend Anatomia

```typescript
// .ana/plugins/
//   my-custom-analyzer.js

module.exports = {
  name: 'my-custom-analyzer',
  analyze: async (rootPath) => {
    // Custom analysis logic
    return {
      customPattern: 'detected',
    };
  },
};
```

**Loaded via:**
```json
// .ana/node.json
{
  "plugins": [
    "my-custom-analyzer",
    "@community/fastapi-security-analyzer"
  ]
}
```

### Custom Modes (Future - MVP2+)

**User-defined modes:**
```bash
$ ana create-mode security
AI-assisted mode creation...
What should this mode do? [Your answer]
Which context should it load? [exports + patterns]
Creating mode...
✓ Created .ana/modes/security.md
```

### Export Generators (Future - Extensible)

**Framework-specific generators:**
```typescript
// packages/generator/src/exports/index.ts

export const exportGenerators = {
  fastapi: generateExportsFromOpenAPI,
  django: generateExportsFromDjangoREST,
  express: generateExportsFromExpressRoutes,
  nextjs: generateExportsFromNextAPIRoutes,
  typescript: generateExportsFromTypeScript,
  python: generateExportsFromPythonAST,
  go: generateExportsFromGoAST,
};
```

---

## Error Handling & Edge Cases

### What if node not found?

```bash
$ ana query unknown-service "..."

Error: Node 'unknown-service' not found.

Available nodes:
  ▸ auth-service (authentication)
  ▸ catalog-api (catalog)
  ▸ orders-api (orders)

Did you mean 'auth-service'?
```

### What if query returns no results?

```bash
$ ana query auth-service "blockchain patterns"

Querying auth-service...
✗ No matches found

The auth-service node doesn't have information about "blockchain patterns".

Try:
  1. Ask a different question
  2. Check auth-service/.ana/federation/exports.md manually
  3. Contact auth-service owner: platform-team
```

### What if exports.md can't be auto-generated?

```bash
$ ana evolve

Analyzing changes...
✗ Warning: Cannot auto-generate exports.md
  Reason: No OpenAPI schema found at /openapi.json

✓ Context updated (patterns, conventions)

Suggestion:
  Create federation/exports.md manually, or:
  - Add OpenAPI generation to your FastAPI app
  - Run with --docs-url flag if schema is elsewhere
```

### What if broadcast inbox is full?

```bash
$ ana inbox

23 new federation messages (showing first 10)

Warning: You have 23 unreviewed messages.
Run `ana inbox clear-old` to archive messages >30 days old.
```

### What if circular dependencies in node graph?

```bash
$ ana nodes --validate

Checking node network...
⚠ Warning: Circular dependency detected:
  storefront → auth-service → shared-lib → storefront

This is OK (just awareness), but might indicate:
  - Tight coupling between nodes
  - Consider if boundaries are right

Health: Functional but monitor for issues
```

---

## Testing Strategy

### Unit Tests

**Analyzer engine:**
```typescript
describe('Analyzer: Python FastAPI', () => {
  const fixture = join(__dirname, 'fixtures', 'fastapi-basic');

  it('detects Python project', async () => {
    const result = await analyze(fixture);
    expect(result.projectType).toBe('python');
  });

  it('detects FastAPI framework', async () => {
    const result = await analyze(fixture);
    expect(result.framework).toBe('fastapi');
  });

  it('detects Pydantic validation', async () => {
    const result = await analyze(fixture);
    expect(result.patterns.validation).toBe('pydantic');
  });
});
```

**Node discovery:**
```typescript
describe('Federation: Node Discovery', () => {
  const monorepoFixture = join(__dirname, 'fixtures', 'monorepo');

  it('discovers nodes from manifest', async () => {
    const registry = await discoverNodes(join(monorepoFixture, 'apps/frontend/.ana'));
    expect(registry.nodes).toHaveLength(3);
    expect(registry.nodes.map(n => n.name)).toContain('auth-service');
  });

  it('validates node paths', async () => {
    const registry = await discoverNodes(join(monorepoFixture, 'apps/frontend/.ana'));
    for (const node of registry.nodes) {
      expect(await exists(node.anaPath)).toBe(true);
    }
  });
});
```

### Integration Tests

**Full flow tests:**
```typescript
describe('Integration: Full Init Flow', () => {
  it('init → analyze → generate → write', async () => {
    const testDir = await createTempProject('fastapi-basic');

    // Run ana init
    await runCommand('ana init', {
      cwd: testDir,
      input: ['github-flow', 'internal', 'Use async/await'],
    });

    // Verify .ana/ created
    expect(await exists(join(testDir, '.ana'))).toBe(true);
    expect(await exists(join(testDir, '.ana/node.json'))).toBe(true);
    expect(await exists(join(testDir, '.ana/context/main.md'))).toBe(true);

    // Verify content quality
    const main = await fs.readFile(join(testDir, '.ana/context/main.md'), 'utf8');
    expect(main).toContain('FastAPI');
    expect(main).toContain('async');
  });
});
```

**Federation tests:**
```typescript
describe('Integration: Node Federation', () => {
  it('query finds answer in target node', async () => {
    const monorepo = await createMonorepoFixture();

    const result = await runCommand(
      'ana query auth-service "JWT refresh pattern"',
      { cwd: join(monorepo, 'apps/frontend') }
    );

    expect(result.from).toBe('auth-service');
    expect(result.answer.markdown).toContain('refresh token');
  });

  it('broadcast delivers to all nodes', async () => {
    const monorepo = await createMonorepoFixture();

    await runCommand(
      'ana broadcast --topic test "Test message"',
      { cwd: join(monorepo, 'apps/frontend'), input: ['y'] }
    );

    // Check inboxes
    const authInbox = join(monorepo, 'services/auth/.ana/federation/inbox');
    const files = await fs.readdir(authInbox);
    expect(files.length).toBeGreaterThan(0);
  });
});
```

### E2E Tests

**Dogfooding tests (manual):**
- Use Anatomia on Anatomia itself (meta)
- Use on ATLAS, IRIS, other projects
- Use federation in our monorepo
- Track: Did it save time? Did it work correctly? Did it break?

---

## Deployment & Distribution

### npm Package

**Publishing:**
```bash
cd packages/cli
npm version patch
npm publish
```

**Users install:**
```bash
npm install -g anatomia
ana --version
```

**Auto-updates (future):**
```bash
ana update  # Checks npm, prompts to upgrade
```

### Homebrew (Future)

```ruby
class Anatomia < Formula
  desc "Federated AI intelligence for your codebase"
  homepage "https://anatomia.dev"
  url "https://github.com/anatomia/anatomia/archive/v0.1.0.tar.gz"
  sha256 "..."
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end
end
```

### Cloud Services (MVP3)

**Supabase deployment:**
- Edge functions (API endpoints)
- Database migrations (via Supabase CLI)
- Auth setup (email + GitHub OAuth)

**Vercel deployment (dashboard):**
- Next.js app (static export or server)
- Connected to Supabase backend
- Custom domain: app.anatomia.dev

---

## Monitoring & Observability (Post-MVP3)

### Health Metrics

**Track (opt-in):**
- Command usage frequency
- Analysis success rate
- Query response times
- Federation usage (% of users with >1 node)
- Error rates

**Dashboard (internal):**
- Usage charts
- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics)

### User Analytics (Opt-in, Privacy-Respecting)

**Events:**
- `init_complete` - Successful initialization
- `query_executed` - Cross-node query
- `broadcast_sent` - Broadcast delivered
- `evolve_run` - Context updated
- `mode_used` - Which mode accessed

**No PII collected.** Just anonymous usage patterns to improve product.

---

## Next Steps

Read:
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Week-by-week code plan
- **[NODES_DEEP_DIVE.md](./NODES_DEEP_DIVE.md)** - Federation protocol deep dive
- **[WHY_THIS_WINS.md](./WHY_THIS_WINS.md)** - Competitive moat analysis

Then start building following the implementation guide.

---

## Research Sources

- **Tree-sitter:** [Official docs](https://tree-sitter.github.io/), [TypeScript grammar](https://github.com/tree-sitter/tree-sitter-typescript)
- **FastAPI OpenAPI:** [Schema generation](https://fastapi.tiangolo.com/how-to/extending-openapi/), [Export guide](https://www.doctave.com/blog/python-export-fastapi-openapi-spec)
- **IPC Patterns:** [Unix sockets](https://opensource.com/article/19/4/interprocess-communication-linux-networking), [JSON-RPC](https://en.wikipedia.org/wiki/Remote_procedure_call)
- **CLI Architecture:** [Commander.js guide](https://blog.logrocket.com/building-typescript-cli-node-js-commander/), [TypeScript CLI best practices](https://medium.com/@WC_/building-a-powerful-command-line-interface-cli-tool-in-typescript-a-step-by-step-guide-3eac3837e190)
