# Scan Intelligence Report — Current State + Next Moves

**Date:** 2026-04-06
**Source:** S12 engine audit, scan roadmap gap analysis, competitive research
**Status:** Living document. Updated as features ship.

---

## Part 1: Current Engine State (Verified Against Source Code)

### Stack Detection — What Works Today

| Category | Code Exists | Works Without Tree-Sitter | Works With Tree-Sitter | Anatomia scan.json Value |
|----------|------------|--------------------------|----------------------|----------------------|
| Language | Yes | Yes (projectType + tsconfig check) | Yes | `"TypeScript"` |
| Framework | Yes | Yes (detectFramework from deps) | Yes | `null` (CLI — no web framework) |
| Database | Yes | **Yes** (16 packages in dependency map) | Yes (patterns enrich) | `null` (none in deps) |
| Auth | Yes | **Yes** (12 packages in dependency map) | Yes (patterns enrich) | `null` (none in deps) |
| Testing | Yes | **Yes** (8 packages in dependency map) | Yes (patterns enrich) | `"Vitest"` |
| Payments | Yes | **Yes** (4 packages in dependency map) | N/A | `null` (none in deps) |
| Workspace | Yes | Yes (monorepo detection) | N/A | `"pnpm monorepo"` |

**Key finding:** The roadmap's claim (2026-03-31) that "Database, Auth, Testing detection requires tree-sitter" was true at the time but is now wrong. S10 (The Engine Sprint) built a complete dependency-file detection path (`detectFromDeps()`) that reads package.json directly. All 5 marketed stack categories work without tree-sitter.

### Dependency Detection Maps (What We Match Against)

```
DATABASE_PACKAGES (16): prisma, @prisma/client, drizzle-orm, typeorm, sequelize,
  mongoose, knex, convex, @supabase/supabase-js, @neondatabase/serverless,
  @planetscale/database, firebase, firebase-admin, pg, mysql2, better-sqlite3,
  @libsql/client

AUTH_PACKAGES (12): @clerk/nextjs, @clerk/express, @clerk/clerk-react, next-auth,
  @auth/core, better-auth, @supabase/ssr, @supabase/auth-helpers-nextjs, passport,
  lucia, @lucia-auth/adapter-prisma, jsonwebtoken, bcrypt, bcryptjs

TESTING_PACKAGES (8): vitest, playwright, @playwright/test, jest, @jest/globals,
  cypress, mocha, @testing-library/react, @testing-library/jest-dom, supertest

PAYMENT_PACKAGES (4): stripe, @stripe/stripe-js, @lemonsqueezy/lemonsqueezy.js,
  @polar-sh/sdk, paddle-sdk

AI_PACKAGES (7): @anthropic-ai/sdk, openai, @google/generative-ai, ai,
  @ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/google, ollama, replicate

EMAIL_PACKAGES (4): resend, @sendgrid/mail, postmark, nodemailer, @react-email/components

MONITORING_PACKAGES: posthog-js, posthog-node, @sentry/nextjs, @sentry/node,
  @sentry/react, (and more)
```

### Phase 0 Status (All Done)

| Phase | Status | Evidence |
|-------|--------|----------|
| 0.1 Detection Investigation | **DONE** | All 5 stack categories work via `detectFromDeps()`. Vitest detected on Anatomia. Database/Auth null because Anatomia genuinely has none. |
| 0.2 WASM Path Resolution | **DONE** | `locateFile` callback in `parsers/treeSitter.ts:168`. `resolveWasmPath()` with multi-path fallback. Graceful degradation: surface tier works fully without WASM. |
| 0.3 Structure Map Expansion | **DONE** | ~68 directory names in DIRECTORY_PURPOSES. Includes `packages/`, `apps/`, `services/`, `internal/`, `cmd/`, `pkg/`, `prisma/`, `drizzle/`, `hooks/`, `stores/`, `migrations/`, `seeds/`, `fixtures/`, and more. |
| 0.4 Monorepo Detection | **DONE** | Detects pnpm, Turbo, Nx, Lerna, npm workspaces + fallback. Lists workspace packages by name and path. Aggregates deps across all workspace packages. |
| 0.5 Dependency-File Fallback | **DONE** | `detectFromDeps()` reads package.json directly. Works without tree-sitter. 40+ packages across 6 categories. |

### EngineResult Schema — Field Status

| Field | Status | What It Contains |
|-------|--------|-----------------|
| overview | **Active** | project name, timestamp, depth tier |
| stack | **Active** | 7 categories, all populated from deps + analyzer |
| files | **Active** | source, test, config, total counts |
| structure | **Active** | directory purpose mapping, ~68 recognized names |
| structureOverflow | **Active** | count of dirs exceeding display limit |
| commands | **Active** | build, test, lint, dev from package.json scripts |
| git | **Active** | branch, commit count, last commit, contributors, uncommitted changes |
| monorepo | **Active** | tool, packages with names and paths |
| externalServices | **Active** | from deps (AI, email, monitoring, jobs categories) |
| schemas | **Active** | Prisma/Drizzle/etc. schema detection with model counts |
| secrets | **Partial** | envFile, envExample, gitignore checks. `hardcodedKeysFound` = null (Phase 1). `envVarReferences` = null (Phase 1). |
| projectProfile | **Partial** | type, hasDatabase, hasAuth, hasBrowserUI, hasPayments, hasFileStorage populated. `maturity` and `teamSize` = null stubs. |
| blindSpots | **Active** | dynamic (no git, env not in gitignore, etc.) |
| deployment | **Active** | platform + config file detection |
| patterns | **Active (deep only)** | error handling, validation, database, auth, testing with confidence scores |
| conventions | **Active (deep only)** | naming (files, functions, classes, variables, constants), imports, docstrings, indentation |
| recommendations | **Stub** | Always null — "populated by recommendation engine" (not built) |
| health | **Stub** | Empty `{}` — Phase 1 placeholder |
| readiness | **Stub** | Empty `{}` — Phase 2 placeholder |

### Two API Layers

`analyzeProject(rootPath, { depth })` is the main entry point. It calls `analyze()` (the legacy deep analyzer) conditionally:

- **Surface tier**: Dependency detection, structure, file counts, commands, git, monorepo, services, schemas, secrets, deployment. Tree-sitter skipped. patterns = null, conventions = null.
- **Deep tier**: Everything in surface, PLUS tree-sitter parsing for pattern detection (error handling, validation, database, auth, testing with confidence scores) and convention detection (naming, imports, indentation).

Init runs deep tier. Scan runs whatever the user requests (surface default, `--deep` for deep).

---

## Part 2: Immediate High-Value Improvements

These require zero tree-sitter, no new dependencies, and fit within the existing EngineResult architecture.

### 1. Secret Detection (Phase 1.1)

**What:** Regex scan source files for hardcoded API keys, database credentials, JWT secrets, tokens.

**Why this is #1:** The `secrets` field already exists in EngineResult with `hardcodedKeysFound: null` waiting to be populated. 1 in 5 vibe-coded websites exposes at least one sensitive secret. 33% of AI code suggestions contain valid secrets. This is the "holy shit" finding that converts a scan into an init.

**How:** Regex patterns for known key formats:
- AWS: `AKIA[0-9A-Z]{16}`
- Stripe: `sk_live_[a-zA-Z0-9]{24,}`, `sk_test_[a-zA-Z0-9]{24,}`
- OpenAI: `sk-[a-zA-Z0-9]{48,}`
- JWT: hardcoded strings passed to `jwt.sign()` or `jwt.verify()`
- Connection strings: `postgres://`, `mongodb://`, `mysql://` with embedded passwords
- Generic: high-entropy strings (>4.5 bits/char) assigned to variables named `secret`, `key`, `token`, `password`, `credential`
- .env in .gitignore check already exists

**Integration point:** `secrets.hardcodedKeysFound` field in EngineResult. Currently null. Populate with `Array<{ type: string; file: string; line: number }>`.

**Effort:** 1-2 days. No tree-sitter. No new dependencies. Pure regex on file contents.

**Output:**
```
  Hardcoded Secrets (2 found)
  sk_live_*****dKf4     src/lib/stripe.ts:8        Stripe secret key
  postgresql://admin:*** src/lib/db.ts:12           Database password

  AI will: Copy these into every new file that needs API access.
```

### 2. CLI Framework Detection

**What:** Detect CLI frameworks (Commander, yargs, oclif, inquirer, meow, cac) alongside web frameworks.

**Why:** Anatomia's own scan shows `Framework: null` because it's a CLI tool. Every CLI project gets a blank framework field. Adding CLI frameworks to the detection map means every Commander/yargs/oclif project gets a populated field.

**How:** Add to framework detection (same dependency-lookup pattern):
- Node: commander, yargs, oclif, inquirer, meow, cac, vorpal
- Go: cobra, urfave/cli
- Python: click, typer, argparse (stdlib), fire
- Rust: clap

**Effort:** One-line-per-framework change in the framework detector. Hours, not days.

### 3. "AI will:" Prediction Lines

**What:** Every scan finding gets a one-liner explaining what an AI assistant will do wrong if it doesn't know this.

**Why:** This is what makes screenshots shareable. Nobody else does "AI will:" predictions. It reframes from "code quality" to "AI readiness" — Anatomia's unique angle.

**How:** Pure copy attached to finding types. Examples:
- Secret found → "AI will: copy this key into every new file that needs API access."
- Inconsistent error handling → "AI will: pick whichever pattern appears in its context window."
- Missing env var → "AI will: hardcode a default value or hallucinate a variable name."
- Single-contributor module → "AI will: generate code without understanding undocumented decisions."
- Stale dependency → "AI will: generate code using the latest API which doesn't match your installed version."

**Effort:** String templates. Zero code logic changes. Half a day.

### 4. Dynamic Scan-to-Init CTA

**What:** The scan footer CTA changes based on findings count.

**Current:** Static "Run `ana init` to generate full context for your AI."

**Proposed:**
- Zero findings: "Your project looks clean. Run `ana init` to generate context for your AI."
- 1-2 findings: "Found issues your AI should know about. Run `ana init` to teach it."
- 3+ findings: "Found {N} issues your AI will get wrong. Run `ana init` before your next coding session."

**Effort:** String template in scan.ts. Trivial.

### 5. Environment Variable Map

**What:** Regex scan source files for `process.env.X` / `os.environ` / `env()` references. Cross-reference against `.env.example`.

**What it produces:**
- Complete list of env vars the app references
- Which are in `.env.example` vs missing
- Which names suggest secrets (KEY, SECRET, TOKEN, PASSWORD, AUTH)
- Which files use each var

**Integration point:** `secrets.envVarReferences` field in EngineResult. Currently null. Populate with `Array<{ name: string; files: string[]; inExample: boolean; isSecret: boolean }>`.

**Effort:** 1 day. Regex extraction + file comparison. No tree-sitter.

---

## Part 3: Git Intelligence Layer (New)

The single biggest untapped data source. Every feature below uses pure git commands — zero tree-sitter, zero file parsing.

### 6. Churn Hotspots

**What:** Files modified most frequently in the last 90 days. The 4-6% of files that cause most bugs and consume most developer attention.

**How:** `git log --since='90 days ago' --format='' --name-only | sort | uniq -c | sort -rn | head -20`

**Why it matters:** Research shows 4-6% of files account for the majority of bugs and maintenance cost. These are your risk concentrators. AI tools generating code in these areas should be extra cautious.

**Integration point:** New `gitIntelligence.churnHotspots` field in EngineResult (or extend existing `git` field).

### 7. Bus Factor per Module

**What:** Directories with only one contributor. Knowledge silo risk.

**How:** `git shortlog -sn -- <directory>` per top-level source directory.

**Why it matters:** Single-contributor modules have undocumented decisions that only one person understands. AI will generate code without understanding those decisions.

### 8. Co-Change Coupling

**What:** Files that always change together in the same commit but have no import relationship. Hidden dependencies.

**How:** For each commit, record which files changed together. Build co-occurrence matrix. Flag pairs that co-change >70% of the time.

**Why it matters:** These are the "change one file, break another" pairs that surprise both developers and AI. The most dangerous kind of coupling because it's invisible in the import graph.

### 9. Bug Magnet Files

**What:** Files appearing in commits with fix/bug/hotfix/revert in the message.

**How:** `git log --oneline --all | grep -iE 'fix|bug|hotfix|revert' | git diff-tree --name-only` (simplified). Count per file.

**Why it matters:** Files with chronic bug history need more careful code generation and testing.

---

## Part 4: Dependency Intelligence (New)

### 10. Dependency Health Report

**What:** For each direct dependency: staleness, known vulnerabilities, deprecation status.

**How:** Read lockfile for exact versions. `npm audit --json` for vulnerabilities. npm registry API for last-publish date.

**Why it matters:** 23 new npm packages in one month was found in one AI-assisted team audit — 7 unmaintained, 2 with known vulnerabilities, 4 duplicating existing functionality. AI suggests packages freely without checking health.

### 11. Dependency Overlap Detection

**What:** Packages with overlapping functionality already installed.

**How:** Curated overlap database:
- Date: moment + dayjs + date-fns + luxon
- HTTP: axios + node-fetch + got + ky + superagent
- Utility: lodash + underscore + ramda
- Validation: zod + joi + yup + class-validator
- State: redux + zustand + jotai + recoil + valtio

**Why it matters:** AI suggests new packages without checking if equivalent functionality exists. Overlap = wasted bundle size + inconsistent patterns.

### 12. Dependency Version Map

**What:** Extract exact installed versions from lockfile. Flag known breaking-change boundaries.

**How:** Curated break-version database:
- NextAuth 4→5 (Auth.js rewrite)
- React Router 5→6 (complete API change)
- Next.js 13→14 (app router)
- Prisma 4→5 (breaking schema changes)
- React 18→19 (new `use()` hook)

**Why it matters:** AI training data includes newer API syntax. If your project is on an older major version, AI will generate code that doesn't work with your installed version. This is the "stale dependency mismatch" failure mode.

---

## Part 5: Decision Archaeology (New)

### 13. Tribal Knowledge Extraction

**What:** Scan for TODO, FIXME, HACK, WORKAROUND, XXX, TEMP, @deprecated comments.

**How:** Regex across source files. Report count and location per category.

**Why it matters:** These are decisions that were made but never documented properly. The "intent gap" — knowledge that exists only in people's heads. AI can't know about workarounds it was never told about.

**Integration point:** Could feed into `blindSpots` or a new `technicalDebt` field.

### 14. Readability Signals

**What:** Average function length, max nesting depth, parameter count distribution.

**How:** Regex approximation for function boundaries works for common cases. Tree-sitter for accuracy.

**Why it matters:** 76% of developers using AI reported generating code they didn't fully understand. High complexity + low comment density = comprehension debt.

---

## Part 6: The Differentiator — Why This Matters

### The Market Gap

| Tool | What It Produces | Portable? | Persistent? | AI-Readiness Framing? |
|------|-----------------|-----------|-------------|----------------------|
| Repomix | Packed file dump | Yes (file) | No (regenerated) | No |
| Greptile | Code graph + docstrings | No (locked in platform) | Yes (indexed) | No |
| CodeRabbit | PR-level review | No (PR comments) | No | No |
| Cursor | Embedding index | No (internal cache) | Per-session | No |
| Windsurf | RAG index | No (internal cache) | Per-session | No |
| **Anatomia scan.json** | **Structured intelligence** | **Yes (JSON file)** | **Yes (committed)** | **Yes ("AI will:")** |

**Nobody produces a portable, persistent, machine-readable codebase intelligence artifact.**

### The Research Data

- Persistent context reduces AI missed relevance from 54% to 16% (3.4x improvement)
- 76% of developers don't understand their own AI-generated code
- AI-generated code produces 1.7x more issues per PR than human code
- Code churn increased 39% in AI-heavy projects
- 19% slower for experienced developers on mature codebases (METR RCT, July 2025)
- 84% of developers use AI tools. 29% trust the output. Usage grows while trust plummets.

### The Funnel

```
npx anatomia-cli scan        <- 30 seconds, zero install, beautiful output
  "AI Readiness: 3 issues found"
  "AI will: [specific prediction]"
       |
ana init                     <- Convert: teach your AI what scan found
  scan.json seeds context generation
       |
Pipeline (Think -> Plan -> Build -> Verify)  <- Retention
       |
Team adoption                <- Revenue
```

Every improvement in this document serves this funnel. Secret detection creates urgency. "AI will:" creates shareability. Git intelligence creates depth. Dependency health creates trust. The scan is the top of funnel. Everything else follows.

---

## Priority Order (Recommended)

| # | Feature | Effort | Tree-sitter? | Impact |
|---|---------|--------|-------------|--------|
| 1 | Secret detection | 1-2 days | No | Highest — the "holy shit" finding |
| 2 | "AI will:" prediction lines | Half day | No | Highest — the differentiator |
| 3 | CLI framework detection | Hours | No | Quick win — fixes own scan |
| 4 | Dynamic scan CTA | Hours | No | Quick win — conversion psychology |
| 5 | Env var map | 1 day | No | High — common blind spot |
| 6 | Git churn hotspots | 1 day | No | High — pure git, high signal |
| 7 | Bus factor per module | Half day | No | Medium — knowledge silo risk |
| 8 | Dependency health report | 1-2 days | No | High — stale/vulnerable deps |
| 9 | Decision archaeology (TODO/FIXME) | Half day | No | Medium — tribal knowledge signals |
| 10 | Co-change coupling | 1-2 days | No | High — hidden dependency detection |
| 11 | Dependency overlap | 1 day | No | Medium — waste detection |
| 12 | Dependency version map | 1 day | No | High — version mismatch prediction |
| 13 | Bug magnet files | Half day | No | Medium — chronic problem areas |
| 14 | Readability signals | 1 day | Helpful | Medium — comprehension debt |

**Items 1-4 could ship in a single sprint.** Items 5-9 in the sprint after. Items 10-14 are Phase 1 completion.

---

## Sources

- S12 engine audit (verified against source code, April 2026)
- ANA_SCAN_ROADMAP.md (WC6, 2026-03-31)
- Qodo State of AI Code Quality 2025
- CodeRabbit AI vs Human Code Generation Report
- METR RCT on AI Coding Tools (July 2025)
- Stack Overflow Developer Survey 2025
- Martin Fowler / Thoughtworks: Encoding Team Standards
- Greptile architecture analysis
- OSSRA 2025: Open Source Security and Risk Analysis
- IEEE Spectrum: AI Coding Degrades — Silent Failures Emerge
- InfoQ: AI-Generated Code Creates New Wave of Technical Debt
