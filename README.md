# Anatomia

[![CI](https://github.com/TettoLabs/anatomia/actions/workflows/test.yml/badge.svg)](https://github.com/TettoLabs/anatomia/actions)
[![npm](https://img.shields.io/npm/v/anatomia-cli)](https://www.npmjs.com/package/anatomia-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Anatomia scans your project — framework, database, auth, testing, conventions — and generates context files AI coding tools consume. Run changes through a four-agent pipeline where verification is independent: Verify never reads Build's report. Every pipeline run produces a proof chain entry.

## Install

```bash
npm install -g anatomia-cli
```

Requires Node.js 20+. Or run without installing: `npx anatomia-cli scan .`

## Quick start

```bash
ana scan .                    # detect your stack
ana init                      # generate context + agents
claude --agent ana            # start working
```

`scan` and `init` work standalone — no Claude Code required.
The pipeline requires [Claude Code](https://claude.com/code).

## What it does

### Scan + init

`ana scan` reads your project and detects framework, database, auth, testing, services, conventions, and patterns. 40+ detectors across two tiers: surface (dependency-based, fast) and deep (tree-sitter AST).

```
┌─────────────────────────────────────────────────────────────────────┐
│  my-saas-app                                              web-app   │
│  TypeScript · Next.js · Prisma → PostgreSQL · Clerk                 │
└─────────────────────────────────────────────────────────────────────┘

  Stack
  ─────
  Language     TypeScript
  Framework    Next.js
  Database     Prisma → PostgreSQL (14 models)
  Auth         Clerk
  Payments     Stripe
  Testing      Vitest
  Services     Resend · Sentry · PostHog
  Deploy       Vercel · GitHub Actions

  Intelligence
  ────────────
  Activity     3 contributors · 12→8→15→9 weekly
  Hot files    schema.prisma (23), api/webhooks.ts (18)
  Docs         README.md · CONTRIBUTING.md · ARCHITECTURE.md + 2 more
  Pre-commit   typecheck + lint

  Full data: .ana/scan.json
  Run `ana init` to scaffold 8 skills (5 core + api-patterns, data-access, ai-patterns)
```

`ana init` writes that intelligence to files agents read:

- `scan.json` — full structured scan data for agent consumption
- `CLAUDE.md` and `AGENTS.md` — cross-tool project context
- 5 core + 3 conditional skill templates with scan-driven Detected sections
- 16 stack-specific gotchas with compound triggers

Works with Claude Code, Cursor, Copilot, or any tool that reads markdown.

### The pipeline

| Stage | Agent | Produces |
|-------|-------|----------|
| Think | Ana | Scope — what and why |
| Plan | AnaPlan | Spec + sealed contract with test assertions |
| Build | AnaBuild | Code + tests tagged to contract assertions |
| Verify | AnaVerify | Independent verification report |

Verify never reads Build's report. The developer gets two independent accounts and decides based on the difference.

Plan writes assertions. Build tags tests to assertions. Verify checks each independently.

Contracts use typed matchers: `equals`, `contains`, `exists`, `greater`, `truthy`, `not_equals`, `not_contains`.

### Proof intelligence

Every pipeline run writes a proof chain entry. The chain accumulates across features — each entry records assertions, findings, timing, and hashes.

- `ana proof health` — quality trajectory with risks per run as the north star metric
- `ana proof audit` — active findings grouped by file for triage
- `ana proof promote` — findings become skill rules that change agent behavior on future runs
- `ana proof stale` — surface findings with staleness signals

The system learns.

## Commands

### Scan and init

| Command | Description |
|---------|-------------|
| `ana scan [path]` | Detect stack, conventions, patterns. `--quick` for surface-only, `--json` for structured output |
| `ana init` | Generate `.ana/` context and `.claude/` agent definitions |

### Pipeline

| Command | Description |
|---------|-------------|
| `ana work start <slug>` | Start a work item, record timestamp |
| `ana work status` | Show pipeline state for active work |
| `ana work complete <slug>` | Archive plan, write proof chain entry |
| `ana artifact save <type>` | Save pipeline artifact with hash verification |
| `ana verify pre-check <slug>` | Run contract assertion coverage check |
| `ana pr create <slug>` | Create PR from verified build |

### Proof intelligence

| Command | Description |
|---------|-------------|
| `ana proof <slug>` | Display proof chain entry |
| `ana proof health` | Quality trajectory dashboard |
| `ana proof audit` | Active findings grouped by file |
| `ana proof close <ids...>` | Close resolved findings with reason |
| `ana proof promote <ids...>` | Promote findings to skill rules |
| `ana proof strengthen <ids...>` | Commit skill edits and close findings |
| `ana proof stale` | Show findings with staleness signals |
| `ana proof context <files...>` | Query proof chain for file context |

### Setup

| Command | Description |
|---------|-------------|
| `ana setup` | Enrich context with team knowledge (Claude Code agent) |
| `ana setup check` | Validate context file quality |
| `ana agents` | List deployed agent definitions |

## Works with

Built for [Claude Code](https://claude.com/code). Pipeline agents are Claude Code agent definitions. Skills follow Claude Code's skill format.

Scan, init, and context files work with any AI tool that reads markdown — Cursor, Copilot, Windsurf, Codex. `AGENTS.md` and `CLAUDE.md` are standard formats.

## Development

```bash
git clone https://github.com/TettoLabs/anatomia.git
cd anatomia && pnpm install && pnpm build
cd packages/cli && pnpm vitest run
```

See [CONTRIBUTING.md](https://github.com/TettoLabs/anatomia/blob/main/packages/cli/CONTRIBUTING.md) for extension guides and [ARCHITECTURE.md](https://github.com/TettoLabs/anatomia/blob/main/packages/cli/ARCHITECTURE.md) for the module map.

## License

MIT
