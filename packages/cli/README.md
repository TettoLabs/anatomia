# Anatomia CLI

> Auto-generate AI context for your codebase

Anatomia creates `.ana/` context folders that help AI understand your project's patterns, architecture, and conventions.

## Install

```bash
npm install -g anatomia-cli
```

Or try without installing:
```bash
npx anatomia-cli analyze
```

---

## Quick Start

**1. Initialize context:**
```bash
cd your-project/
ana init
```

**2. Reference modes in your AI tool:**
```
@.ana/modes/code.md "Implement user authentication"
```

AI reads your patterns and writes code that matches your style.

---

## Commands

### `ana init [options]`

Initialize `.ana/` folder with templates.

**Options:**
- `-y, --yes` - Skip prompts, use defaults
- `-f, --force` - Overwrite existing .ana/

**Creates 10 files:**
```
.ana/
├── ENTRY.md              # Project orientation
├── node.json             # Project metadata
├── modes/
│   ├── architect.md      # System design mode
│   ├── code.md           # Implementation mode
│   ├── debug.md          # Debugging mode
│   ├── docs.md           # Documentation mode
│   └── test.md           # Testing mode
└── context/
    ├── main.md           # Project overview
    ├── patterns.md       # Code patterns
    └── conventions.md    # Coding standards
```

Fill `context/*.md` with your project details. Reference `modes/*.md` when working with AI.

---

### `ana analyze`

Detect project type, framework, and structure.

**Usage:**
```bash
ana analyze
```

**Output:**
```json
{
  "projectType": "python",
  "framework": "fastapi",
  "structure": {
    "entryPoints": ["app/main.py"],
    "architecture": "layered"
  },
  "parsed": {
    "files": [...],
    "totalParsed": 15
  }
}
```

**What it detects:**
- Project type (Python, Node, Go, Rust, Ruby, PHP)
- Framework (FastAPI, Next.js, Express, Django, and more)
- Entry points
- Architecture pattern
- Code structure (functions, classes, imports)

---

### `ana mode <name>`

Display mode file path and information.

```bash
ana mode code
# Output: .ana/modes/code.md - Implementation mode
```

---

### `ana --version`

Show CLI version.

### `ana --help`

Show all commands.

---

## Mode System

Each mode has a specific purpose:

- **architect** - System design (doesn't implement)
- **code** - Implementation (doesn't design architecture)
- **debug** - Root cause analysis (doesn't implement fixes)
- **docs** - Documentation (doesn't create features)
- **test** - Test writing (doesn't implement features)

---

## Templates

Templates use Handlebars for dynamic content:

```handlebars
{{#if (eq framework "fastapi")}}
FastAPI-specific guidance here
{{/if}}
```

**Supported frameworks:**
- FastAPI, Django, Flask (Python)
- Next.js, Express, Nest.js, Fastify (Node.js)
- Gin, Echo, Chi, Cobra (Go)

See [TEMPLATE_GUIDE.md](./docs/TEMPLATE_GUIDE.md) for details.

---

## Documentation

- [API Reference](./docs/API.md)
- [Template Guide](./docs/TEMPLATE_GUIDE.md)
- [Detection Flow](./docs/DETECTION_FLOW.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

---

## Development

**Run tests:**
```bash
pnpm test
```

**Build:**
```bash
pnpm build
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## License

MIT
