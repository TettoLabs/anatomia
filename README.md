# Anatomia

Auto-generated AI context for codebases in 30 seconds.

[![npm version](https://img.shields.io/npm/v/anatomia.svg)](https://www.npmjs.com/package/anatomia)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## What is this?

Anatomia generates `.ana/` folders that help AI assistants understand your project instantly. Instead of re-explaining your patterns every conversation, drop mode files in chat.

**Problem:** "Use our API client pattern" → AI invents its own pattern
**Solution:** `@.ana/modes/code.md` → AI follows YOUR pattern

---

## Install

```bash
npm install -g anatomia
```

---

## Quick Start

```bash
cd your-project/
ana init
```

This creates 10 files in `.ana/`:
- `ENTRY.md` - Orientation contract
- `modes/*.md` - 5 task modes (architect, code, debug, docs, test)
- `context/*.md` - Your patterns, conventions, architecture

**Use in Claude Code:**
```
@.ana/modes/code.md "Implement JWT refresh"
```

Claude reads your patterns, writes code your way.

---

## Features

- **5 specialized modes** - Architect, code, debug, docs, test
- **Framework-aware** - Detects FastAPI, Next.js, Express, Django, Go
- **Auto-updating** - Context stays current with code changes
- **Tool-agnostic** - Works with Claude Code, Cursor, Windsurf
- **Federation ready** - Multi-service query (microservices, monorepos)

---

## Project Structure

```
anatomia/
├── packages/
│   ├── cli/          # CLI tool (this package)
│   ├── analyzer/     # Pattern detection
│   └── generator/    # Template engine
└── website/          # Landing page (anatomia.dev)
```

---

## Development

**Setup:**
```bash
git clone https://github.com/TettoLabs/anatomia.git
cd anatomia
pnpm install
pnpm build
```

**Test:**
```bash
pnpm test
```

**Link locally:**
```bash
cd packages/cli
pnpm link --global
ana --version
```

---

## Contributing

See [packages/cli/CONTRIBUTING.md](./packages/cli/CONTRIBUTING.md)

---

## License

MIT

---

## Links

- **Website:** [anatomia.dev](https://anatomia.dev)
- **Issues:** [GitHub Issues](https://github.com/TettoLabs/anatomia/issues)
- **CLI Package:** [packages/cli](./packages/cli)
