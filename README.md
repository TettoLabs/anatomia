# Anatomia

**Your AI doesn't know your codebase. Ana does.**

Verified AI development through scoped planning, contract-based building, and independent verification.

[![npm version](https://img.shields.io/npm/v/anatomia-cli.svg)](https://www.npmjs.com/package/anatomia-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Quick Start

```bash
npx anatomia-cli scan
```

See what Ana detects about your project:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ana scan                                                           │
│  tetto-portal                                       2026-04-01 12:34│
└─────────────────────────────────────────────────────────────────────┘

  Stack
  ─────
  Language     Node.js
  Framework    Next.js
  Database     Supabase
  Auth         Supabase Auth
  Testing      Jest

  Files
  ─────
  Source       252
  Tests        24
  Config       10
  Total        286

  Structure
  ─────────
  app/              Application code
  components/       UI components
  lib/              Library code
  supabase/         Supabase config

Run `ana init` to generate full context for your AI.
```

---

## What Ana Scans

- **Stack** — Language, Framework, Database, Auth, Testing, Payments
- **Files** — Source, test, config counts
- **Structure** — Directory purposes and organization
- **Workspace** — Monorepo detection and package listing

Get JSON output with `--json` for programmatic use. Debug with `--verbose` to see analyzer phases.

---

## The Pipeline

Ana structures AI development through four verified stages:

| Stage | Agent | What It Does |
|-------|-------|--------------|
| **Think** | Ana | Scopes the work, explores the codebase, writes intent |
| **Plan** | AnaPlan | Writes specs with test contracts and acceptance criteria |
| **Build** | AnaBuild | Implements against the spec and test skeleton |
| **Verify** | AnaVerify | Independent verification, mechanical checks, creates PR |

Each stage produces artifacts. Each artifact is versioned in git. The pipeline enforces:
- Scope before plan (no planning without understanding intent)
- Plan before build (no building without a spec)
- Build before verify (no verification without implementation)
- Verify before merge (no merging without independent review)

---

## Getting Started

1. **Scan your project:**
   ```bash
   npx anatomia-cli scan
   ```

2. **Initialize context:**
   ```bash
   npm install -g anatomia-cli
   ana init
   ```

3. **Scope your first feature:**
   ```bash
   claude --agent ana
   ```

Ana will help you explore the codebase, write a scope document, and kick off the pipeline.

---

## Project Structure

```
anatomia/
├── packages/
│   ├── cli/          # CLI tool (ana commands)
│   ├── analyzer/     # Code analysis engine
│   └── generator/    # Context generators
└── website/          # Demo site
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
pnpm --filter anatomia-cli test -- --run
```

**Link locally:**
```bash
cd packages/cli
pnpm link --global
ana --version
```

---

## Documentation

- [Artifact Schemas](./.ana/docs/SCHEMAS.md) — Pipeline artifact formats
- [CLI Package](./packages/cli/README.md) — Command reference
- [Analyzer Package](./packages/analyzer/README.md) — Analysis engine

---

## License

MIT

---

## Links

- **Repository:** [GitHub](https://github.com/TettoLabs/anatomia)
- **Issues:** [Report Issues](https://github.com/TettoLabs/anatomia/issues)
- **CLI Package:** [anatomia-cli on npm](https://www.npmjs.com/package/anatomia-cli)
