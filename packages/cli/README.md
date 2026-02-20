# Anatomia CLI

**Auto-generated AI context for codebases**

Anatomia generates professional `.ana/` context folders that help AI assistants understand your project instantly.

---

## Features

- **5 Task-Specific Modes:** architect (design), code (implement), debug (troubleshoot), docs (document), test (test writing)
- **Structured Context:** Guides you to document architecture, patterns, and conventions
- **Dynamic Generation:** Handlebars templates customize context per project type (FastAPI, Next.js, Express, Go, etc.)
- **Tool-Agnostic:** Works with Claude Code, Cursor, GitHub Copilot, any AI tool
- **Federation:** Multi-service context for microservice architectures (optional)

---

## Installation

**From source (current):**
```bash
git clone https://github.com/TettoLabs/anatomia.git
cd anatomia/packages/cli
pnpm install
pnpm build
npm link
```

**From npm (coming soon):**
```bash
npm install -g anatomia
```

---

## Quick Start

**1. Initialize .ana/ context:**
```bash
cd your-project/
ana init
```

Answer prompts:
- Project name: my-api
- Node ID: main
- Project type: node
- Framework: Next.js
- Language: TypeScript
- Federation: No

**2. Fill context files:**

Edit `.ana/context/main.md` with your project details:
- Project overview
- Architecture
- Tech stack
- Directory structure
- Key concepts

**3. Use modes in your AI chat:**

```bash
# Reference architect mode for design work
ana mode architect

# Reference code mode for implementation
ana mode code
```

Or load mode directly in your AI tool:
```
Read .ana/modes/code.md before starting implementation
```

---

## Commands

### `ana --version`
Display CLI version.

### `ana --help`
Show available commands and options.

### `ana init [options]`
Initialize `.ana/` context folder in current directory.

**Options:**
- `-y, --yes` - Skip prompts, use defaults
- `-f, --force` - Overwrite existing .ana/ directory

**Creates 10 files:**
- `.ana/ENTRY.md` - Orientation contract (explains .ana/, lists modes, defines principles)
- `.ana/node.json` - Project identity and metadata
- `.ana/modes/*.md` - 5 mode files (architect, code, debug, docs, test)
- `.ana/context/*.md` - 3 context files (main, patterns, conventions)

### `ana mode <name>`
Reference a specific mode file.

**Available modes:**
- `architect` - System design and architecture
- `code` - Feature implementation
- `debug` - Debugging and troubleshooting
- `docs` - Documentation writing
- `test` - Test writing

**Example:**
```bash
ana mode architect
# Output: Mode information and file path
```

---

## .ana/ Directory Structure

```
.ana/
├── ENTRY.md           # Orientation contract (read this first)
├── node.json          # Project metadata
├── context/
│   ├── main.md        # Project overview (fill manually)
│   ├── patterns.md    # Code patterns (fill manually)
│   └── conventions.md # Coding standards (fill manually)
└── modes/
    ├── architect.md   # Design mode (system architecture)
    ├── code.md        # Implementation mode
    ├── debug.md       # Debugging mode
    ├── docs.md        # Documentation mode
    └── test.md        # Testing mode
```

**Workflow:**
1. Read `ENTRY.md` (orientation)
2. Fill `context/*.md` files (project-specific details)
3. Reference `modes/*.md` when working (task-specific guidance)

---

## Mode Boundaries

**Each mode has a specific purpose. Boundaries are STRICT.**

- **architect** - Designs systems, does NOT implement
- **code** - Implements features, does NOT design architecture
- **debug** - Finds root causes, does NOT implement fixes
- **docs** - Writes documentation, does NOT create features
- **test** - Writes tests, does NOT implement features

**Why boundaries matter:**
- Prevents scope creep (design + implement in one session = rushed design)
- Ensures thoroughness (separate testing = better coverage)
- Maintains quality (focused modes = higher quality output)

---

## Templates

Templates use Handlebars syntax for dynamic generation:
- **Variables:** `{{projectName}}`, `{{framework}}`, `{{language}}`
- **Conditionals:** `{{#if federation}}...{{/if}}`
- **Framework-specific:** FastAPI, Next.js, Express, Go guidance appears when framework selected

**Quality standard:** ≥8/10 measured by:
- Orientation speed: ≤30 seconds (AI understands project quickly)
- Boundary discipline: ≤2% violations (AI respects mode constraints)
- Naturalness: ≥4/5 rating (developers say "reads well")

---

## Development

**Setup:**
```bash
pnpm install
pnpm build
pnpm test
```

**Testing:**
```bash
pnpm test                 # Run tests (100 tests)
pnpm tsx src/test-templates.ts  # Validation script
```

**Modifying templates:**
1. Edit templates/*.hbs or templates/*.md
2. Run tests: `pnpm test`
3. Build: `pnpm build`
4. Test locally: `npm link && ana init`

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [docs/TEMPLATE_GUIDE.md](./docs/TEMPLATE_GUIDE.md) for details.

---

## License

MIT

---

## Links

- **Website:** https://anatomia.dev
- **Documentation:** Coming with beta (Week 7)
- **Issues:** https://github.com/TettoLabs/anatomia/issues
- **Contributing:** See CONTRIBUTING.md
