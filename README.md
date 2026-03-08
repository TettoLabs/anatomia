# Anatomia

Auto-generated AI context for codebases.

[![npm version](https://img.shields.io/npm/v/anatomia-cli.svg)](https://www.npmjs.com/package/anatomia-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is this?

Anatomia generates `.ana/` folders that help AI assistants understand your project. Instead of re-explaining your patterns every conversation, reference mode files in chat.

**Example:**
```
@.ana/modes/code.md "Implement user authentication"
```

AI reads your patterns and writes code that matches your team's standards.

---

## Install

```bash
npm install -g anatomia-cli
```

---

## Quick Start

```bash
cd your-project/
ana init
```

This creates 10 files in `.ana/`:
- `ENTRY.md` - Project orientation
- `modes/*.md` - 5 task modes (architect, code, debug, docs, test)
- `context/*.md` - Your patterns, conventions, architecture

Fill `context/*.md` with your project details. Reference `modes/*.md` when working with AI.

---

## Project Structure

```
anatomia/
├── packages/
│   ├── cli/          # CLI tool
│   └── analyzer/     # Code analysis engine
└── website/          # Documentation
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

## Documentation

- [CLI Documentation](./packages/cli/README.md)
- [Analyzer Documentation](./packages/analyzer/README.md)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## License

MIT

---

## Links

- **Repository:** [GitHub](https://github.com/TettoLabs/anatomia)
- **Issues:** [Report Issues](https://github.com/TettoLabs/anatomia/issues)
- **CLI Package:** [anatomia-cli on npm](https://www.npmjs.com/package/anatomia-cli)
- **Analyzer Package:** [anatomia-analyzer on npm](https://www.npmjs.com/package/anatomia-analyzer)
