# Anatomia

Verified AI development. Ship with proof.

Anatomia is a CLI that makes AI coding agents reliable. It scans your project, generates context, and runs every change through a four-agent pipeline with mechanical verification. Every feature ships with proof that it works.

## Quick Start

```bash
npx anatomia-cli scan .       # See what Ana detects
npx anatomia-cli init         # Initialize project context
claude --agent ana             # Start working with Ana
```

## What It Does

**Scan** reads your project — framework, database, auth, testing, services, conventions, patterns — and produces structured intelligence that agents consume.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ana scan                                                           │
│  my-saas-app                                        2026-04-03 12:00│
└─────────────────────────────────────────────────────────────────────┘

  Stack
  ─────
  Language     TypeScript
  Framework    Next.js
  Database     Prisma → PostgreSQL (23 models)
  Auth         Clerk
  Testing      Vitest

  Services: Stripe, Supabase, Resend, Sentry, PostHog
  Deploy:   Vercel
```

**Init** writes that intelligence to files agents already know how to read: `scan.json` for structured data, context files for human-readable summaries, skills for team standards.

**The Pipeline** runs every change through four stages:

| Stage | Agent | Produces |
|-------|-------|----------|
| **Think** | Ana | Scope — what and why |
| **Plan** | AnaPlan | Spec + Contract — how, with assertions |
| **Build** | AnaBuild | Code + Tests — tagged to contract |
| **Verify** | AnaVerify | Proof — pass/fail per assertion |

**Contracts** are the key. AnaPlan writes assertions ("the status command returns valid JSON", "the error handler logs to Sentry"). AnaBuild tags tests to assertions. AnaVerify checks each one independently.

**Proof** is the artifact. Every pipeline run produces a verification report: which assertions passed, which failed, what the verifier found. The proof chain accumulates across features. Your project has a mechanical audit trail of every AI-assisted change.

## Commands

| Command | Description |
|---------|-------------|
| `ana scan .` | Detect project stack, patterns, conventions (deep by default) |
| `ana scan . --quick` | Fast surface-tier scan (skip tree-sitter) |
| `ana init` | Initialize `.ana/` context and `.claude/` agents |
| `ana work status` | Show pipeline state for active work |
| `ana artifact save` | Save pipeline artifacts with validation |
| `ana verify pre-check` | Run contract pre-check before verification |
| `ana proof <slug>` | Display proof chain for completed work |
| `ana pr create <slug>` | Create PR from verified build |

## Works With

Built for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Agents are Claude Code agent definitions (`.claude/agents/`). Skills are Claude Code skill files (`.claude/skills/`).

## Development

```bash
git clone https://github.com/TettoLabs/anatomia.git
cd anatomia
pnpm install
pnpm build
pnpm --filter anatomia-cli test -- --run
```

## License

MIT
