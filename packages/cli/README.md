# Anatomia CLI

Auto-generated AI context for codebases.

---

## Install

```bash
npm install -g anatomia
```

**From source:**
```bash
git clone https://github.com/TettoLabs/anatomia.git
cd anatomia/packages/cli
pnpm install && pnpm build
npm link
```

---

## Usage

**Initialize context:**
```bash
cd your-project/
ana init
```

**Reference modes:**
```bash
ana mode architect  # System design
ana mode code       # Implementation
ana mode debug      # Troubleshooting
ana mode docs       # Documentation
ana mode test       # Test writing
```

**In your AI tool:**
```
@.ana/modes/code.md "Implement user auth"
```

AI reads your patterns, writes code your way.

---

## What You Get

**10 files in `.ana/`:**

```
.ana/
├── ENTRY.md              # Orientation (read this first)
├── node.json             # Project metadata
├── modes/
│   ├── architect.md      # Design mode
│   ├── code.md           # Implementation mode
│   ├── debug.md          # Debugging mode
│   ├── docs.md           # Documentation mode
│   └── test.md           # Testing mode
└── context/
    ├── main.md           # Project overview
    ├── patterns.md       # Code patterns
    └── conventions.md    # Coding standards
```

**Fill `context/*.md` with your project details. Reference `modes/*.md` when working.**

---

## Commands

### `ana init [options]`

Initialize `.ana/` folder.

**Options:**
- `-y, --yes` - Skip prompts, use defaults
- `-f, --force` - Overwrite existing .ana/

**Example:**
```bash
ana init -y  # Quick start with defaults
```

### `ana mode <name>`

Display mode file path and info.

**Example:**
```bash
ana mode code
# Output: .ana/modes/code.md - Implementation mode
```

### `ana --version`

Show CLI version.

### `ana --help`

Show all commands.

---

## Mode Boundaries

Each mode has strict boundaries:

- **architect** - Designs systems, does NOT implement
- **code** - Implements features, does NOT design architecture
- **debug** - Finds root causes, does NOT implement fixes
- **docs** - Writes documentation, does NOT create features
- **test** - Writes tests, does NOT implement features

**Why:** Prevents scope creep, ensures thoroughness, maintains quality.

---

## Templates

Templates use Handlebars for dynamic generation:

```handlebars
{{#if framework === 'fastapi'}}
FastAPI-specific guidance here
{{/if}}
```

**Supported frameworks:**
- FastAPI (Python)
- Next.js (TypeScript/JavaScript)
- Express (Node.js)
- Django (Python)
- Go (standard library)

---

## Development

**Run tests:**
```bash
pnpm test  # 100+ tests
```

**Modify templates:**
1. Edit `templates/*.hbs` or `templates/*.md`
2. Run `pnpm test`
3. Build with `pnpm build`

See [TEMPLATE_GUIDE.md](./docs/TEMPLATE_GUIDE.md) for details.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## License

MIT
