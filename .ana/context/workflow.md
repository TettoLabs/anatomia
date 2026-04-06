# Workflow — anatomia-workspace

## Git Workflow

**User confirmed:** Feature branch workflow with structured naming (effort/STEP_*, SideSprint/*, ux/*)

**Detected:** Branching strategy from `git branch -a`:

```
Main branch: main
Feature branches:
  - effort/STEP_0_1_FOUNDATION
  - effort/STEP_0_2_TEMPLATES
  - effort/STEP_0_3_CONTENT
  - effort/STEP_0_4_VALIDATION
  - effort/STEP_1_1_DETECTION
  - effort/STEP_1_2_STRUCTURE
  - effort/STEP_1_3_TREE_SITTER
  - effort/STEP_1_4_ALPHA
  - effort/STEP_2_1_PATTERNS
  - effort/STEP_2_2_CONVENTIONS
  - effort/STEP_2_3_FRAMEWORK_REDESIGN
  - effort/STEP_2_5_CLI_CODE
Sprint branches:
  - SideSprint/setup-redesign
UX branches:
  - ux/fix-copy
```

### Branch Naming Conventions

**Detected:** Three distinct branch prefixes with consistent patterns:

1. **effort/STEP_X_Y_FEATURE** — Planned roadmap work
   - Pattern: `effort/STEP_{major}_{minor}_{description}`
   - Examples: `effort/STEP_0_1_FOUNDATION`, `effort/STEP_2_5_CLI_CODE`
   - Usage: Main development workflow, mapped to project roadmap
   - Evidence: 12 branches follow this pattern

2. **SideSprint/** — Urgent, off-roadmap work
   - Pattern: `SideSprint/{description}`
   - Example: `SideSprint/setup-redesign`
   - Usage: Major refactors or urgent fixes that bypass normal roadmap
   - Evidence: 1 branch detected

3. **ux/** — UX improvements and copy fixes
   - Pattern: `ux/{description}`
   - Example: `ux/fix-copy`
   - Usage: User experience refinements
   - Evidence: 1 branch detected

**Inferred:** Structured naming indicates planned roadmap (STEP_* pattern) with escape hatches for urgent work (SideSprint) and UX polish (ux/*). No hotfix/ or bugfix/ branches detected — bugs likely fixed in roadmap branches.

### Merge Strategy

**Detected:** Merge commits (not squash) from `git log --merges -15`:

```
Merge SideSprint/setup-redesign: sub-agent architecture, hook system, WASM migration, symbol index, 9 test cycles
Merge branch 'effort/STEP_2_5_CLI_CODE'
Merge pull request #4 from TettoLabs/effort/STEP_2_5_CLI_CODE
Merge pull request #3 from TettoLabs/effort/STEP_2_2_CONVENTIONS
Merge STEP_2.1: Pattern Inference Engine - Complete
Merge STEP_1.3: Tree-sitter Integration + Caching Layer
[STEP_1.2] Complete - Directory Structure Analysis
Merge STEP_1.1 CP1: Dependency Parsers Complete
Merge main to get .ana/ folder from STEP_0.4
Merge STEP_0.4: Template Validation - .ana folder with modes and context
Merge STEP_0.3: Content - Waitlist CTAs and Roadmap section
Merge STEP_0.2: Templates - Mode and context templates with Handlebars
Merge STEP_0.1: Foundation - Website and CLI scaffold
```

**Detected:** Three merge patterns in commit history:

1. **Descriptive merge commits**: `Merge STEP_X.Y: Description` (most common)
2. **GitHub PR merges**: `Merge pull request #N from TettoLabs/branch`
3. **Branch sync merges**: `Merge main to get ...` (forward-porting changes)

**User confirmed:** PR-based merges to main

**Inferred:** Full merge commit history preserved (not squashed), suggesting value in preserving individual commit context during development.

### Development Timeline

**Detected:** Project age from git log:
- First commit: 2026-01-19
- Latest commit: 2026-03-24
- Duration: ~2 months (64 days)
- Total commits: 135
- Commit frequency: ~2.1 commits/day

**Detected:** Contributors from `git shortlog -sn --all`:
```
133  Ryan Smith
  2  TettoLabs
```

**Inferred:** Solo developer project (133/135 commits by Ryan Smith), TettoLabs commits likely automation or org-level changes.

### Git Configuration

**Detected:** .gitignore security-aware exclusions (from `.gitignore` lines 13-18):

```gitignore
# Environment & Secrets
.env
.env*.local
*.pem
*.key
credentials.json
```

**Detected:** Build and cache exclusions (from `.gitignore` lines 1-11):

```gitignore
# Dependencies
node_modules/
.pnpm-store/
.npm/

# Build outputs
.next/
dist/
build/
.turbo/
*.tsbuildinfo
```

**Detected:** Project-specific exclusions (from `.gitignore` lines 39-42):

```gitignore
master_plan/
.ana/.state/cache/
**/.ana/.state/cache/
```

**Inferred:** `master_plan/` directory likely contains planning docs not intended for public repo. `.ana/.state/cache/` excluded because AST cache is ephemeral (regenerated on each run).

## Commit Conventions

**User confirmed:** Bracket-prefix commits ([SS-14], [STEP_1.2])

**Detected:** Commit message patterns from `git log --format="%s" -30`:

```
Fix SubagentStop with matcher — hook only fires for ana-writer, not explorer/other agents
Fix explorer trapped in SubagentStop loop + expand exclusion list (.ana/, .turbo/, .cache/)
Add directory exclusions to explorer agent — prevents 30min exploration on monorepos
Merge SideSprint/setup-redesign: sub-agent architecture, hook system, WASM migration, symbol index, 9 test cycles
[SS-14] Remove test artifacts before merge
[SS-13.4] Universal file sampler — **/*.ts with merged exclusion list, 0→15 files parsed on monorepo
[SS-13.3] Widen trade-off trigger beyond web-only, update writer hook documentation
[SS-13.2] Fix parallel writer hook isolation — silent PostToolUse, scoped SubagentStop
[SS-13.1b] Read setupMode from .meta.json as fallback when .setup_tier missing
[SS-13.1] Fix BF1 scaffold marker false positive in code blocks, BF6 framework mismatch when analyzer returns none
[SS-13.0] MI-51/52/53/54/55: preflight changes — Q6 git workflow, Q7 business flow, What's Next print, .gitignore, explorer git targets
[SS-12.4c] detectProjectType tests (14), app/ directory sampling fix, tetto 6→20 files parsed
[SS-12.4b] Fix analysis.md formatter field names — totalParsed, computed functions/classes from files array
[SS-12.4] Analyzer detectProjectType() implemented + setup complete soft warning + grep whitespace fix + CLAUDE.md count fix
[MI-18] CLAUDE.md signpost generation — marker-based merge, concierge ENTRY.md, 3 edge case tests passed
[SS-12.3] Easy wins — duplicate H2 detection, P0 extraction targets (database, payments, security, auth, local dev), MI-15 trade-off confirmation, writer meta-content ban, conventions max 950
[SS-12.2] Systematic path fixes — cli-path resolution, CLAUDE_PROJECT_DIR hooks, package.json bundle detection, verification_level, ASTCache temp override, parallel questions, inline code stripping
[SS-11.1] Fix init atomic rename — clean up analyzer cache dir before rename
[SS-11] AST symbol index — 582 symbols from 152 files, citation verification checks function/class names, conservative extraction, graceful fallback
[SS-10.1] Add WASM smoke test — catches build/linking failures early
[SS-10] web-tree-sitter WASM migration — native → WASM, async init, tree.delete() cleanup
[SS-9.1] Verification integrity fixes — run-check.sh wrapper, citation regex broadened + filtered, Unexamined tag mandatory for Quick tier, User confirmed guard, no silent failures
[MI-3] Add tier files to MODE_FILES constant — setup-quick, setup-guided, setup-complete now copied by ana init
[SS-8] Scenario B validation — test cycle 3 baseline documented. 7/7 at 9/10, 4521 lines, zero fabrications. Empty scaffolds, explorer-only discovery. No tree-sitter errors visible to user.
[SS-7.3] Quality gates + init UX + determinism — Bash self-check, tier prompt, locked questions, SubagentStop verification, Unexamined tag, PATH fixes, check.ts false positive fix
[SS-7.2] Widen line targets + fix path stripping in check.ts — based on test cycle observations
[SS-7.1] Hook fixes + writer improvements — quality gate phase check, PostToolUse confirmed for sub-agents, SubagentStop hook, parallel batching, 6 writer improvements
[SS-6] Content redesign — 7 step files restructured, rules.md compressed 771→195 lines, quality checklists, trust stack
[SS-5] Question redesign — two-tier answer validation + UX consistency polish
[SS-4] Orchestrator rewrite — slim setup.md + tier files + state management
```

### Commit Message Patterns

**Detected:** Four distinct commit formats:

1. **Bracket prefixes with work tracking** (~60% of commits)
   - Format: `[PREFIX-NUMBER] Description — details`
   - Examples:
     - `[SS-14] Remove test artifacts before merge`
     - `[SS-13.4] Universal file sampler — **/*.ts with merged exclusion list`
     - `[MI-18] CLAUDE.md signpost generation — marker-based merge`
   - Prefixes observed:
     - `[SS-X]` or `[SS-X.Y]` — SideSprint work items
     - `[MI-X]` — Major Issue tracking
     - `[STEP_X.Y]` — Roadmap checkpoint markers

2. **Descriptive commits without prefix** (~30% of commits)
   - Format: `Action description — additional context`
   - Examples:
     - `Fix SubagentStop with matcher — hook only fires for ana-writer`
     - `Fix explorer trapped in SubagentStop loop + expand exclusion list`
     - `Add directory exclusions to explorer agent — prevents 30min exploration`
   - Pattern: Imperative mood, em-dash separator for clarification

3. **Merge commits** (~10% of commits)
   - Format: `Merge STEP_X.Y: Summary` or `Merge pull request #N from ...`
   - Examples:
     - `Merge SideSprint/setup-redesign: sub-agent architecture, hook system, WASM migration`
     - `Merge STEP_2.1: Pattern Inference Engine - Complete`
     - `Merge pull request #4 from TettoLabs/effort/STEP_2_5_CLI_CODE`

4. **Checkpoint markers**
   - Format: `[STEP_X.Y] Complete - Description`
   - Example: `[STEP_1.2] Complete - Directory Structure Analysis`
   - Usage: End of roadmap phase marker

### Commit Message Structure

**Detected:** Consistent patterns across all commit types:

- **Subject line**: Imperative mood ("Fix", "Add", "Merge", not "Fixed" or "Adding")
- **Length**: Most under 100 characters
- **Separator**: Em-dash (—) or colon (:) for additional context
- **Details**: Often include metrics or evidence (`0→15 files parsed`, `771→195 lines`)
- **Multiple items**: Comma-separated when one commit addresses multiple concerns

**Inferred:** NOT Conventional Commits (no `feat:`, `fix:`, `chore:` prefix pattern), but disciplined nonetheless. Bracket prefixes serve similar purpose (work item tracking) with more context-specific identifiers.

### Conventional Commits Comparison

**Detected:** No strict Conventional Commits usage:
- Zero commits with `feat:`, `fix:`, `chore:`, `docs:`, `test:` prefixes in last 30 commits
- Uses bracket prefixes instead: `[SS-14]`, `[MI-18]`, `[STEP_1.2]`

**Inferred:** Project uses custom commit convention optimized for roadmap tracking (STEP_*) and sprint work (SS-*) over generic conventional commit types. This aligns with structured branch naming (effort/STEP_*).

## Pull Request Process

**User confirmed:** PR-based merges

**Detected:** No PR template file at `.github/PULL_REQUEST_TEMPLATE.md` (Glob returned no results)

**Detected:** PR evidence from merge commits (from `git log --merges`):
```
Merge pull request #4 from TettoLabs/effort/STEP_2_5_CLI_CODE
Merge pull request #3 from TettoLabs/effort/STEP_2_2_CONVENTIONS
```

**Inferred:** PRs used but not required for all merges (only 2 GitHub PR merges vs 13 direct `Merge STEP_X.Y` commits). Small team size (1 primary developer) likely means direct merges to main are acceptable for solo work, PRs reserved for major milestones or external contributions.

### Review Process

**Detected:** From CONTRIBUTING.md (lines 133-148):

```markdown
## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

**PR requirements:**
- All tests pass
- Code follows TypeScript strict mode
- Templates maintain quality standards
- Documentation updated if needed
```

**User confirmed:** CI-enforced quality (no local pre-commit hooks)

**Inferred:** PR approval process exists but not strictly enforced (solo developer project). CI quality gates (tests, lint) are the primary gatekeepers.

### Merge Requirements

**Detected:** No branch protection configuration visible in codebase (no `.github/settings.yml` or similar)

**Detected:** From CI configuration (`.github/workflows/test.yml` lines 6-7), PR trigger exists:

```yaml
pull_request:
  branches: [main, staging]
```

**Inferred:** Pull requests to `main` or `staging` trigger CI automatically. No evidence of required status checks, but CONTRIBUTING.md states "All tests pass" as requirement.

## CI/CD Pipeline

**User confirmed:** CI via GitHub Actions (multi-platform)

**Detected:** Test workflow from `.github/workflows/test.yml`:

### Triggers

**Detected:** From `.github/workflows/test.yml` (lines 3-7):

```yaml
on:
  push:
    branches: [main, staging, effort/**]
  pull_request:
    branches: [main, staging]
```

**Pattern:**
- **Push triggers:** `main`, `staging`, all `effort/**` branches
- **PR triggers:** PRs targeting `main` or `staging`
- **Not triggered on:** SideSprint/*, ux/* branches (must merge to main/staging/effort to trigger CI)

### Test Matrix

**Detected:** Multi-platform, multi-version testing from `.github/workflows/test.yml` (lines 14-18):

```yaml
strategy:
  fail-fast: false  # CRITICAL: Run all combinations even if one fails
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [20, 22]
```

**Test combinations:** 3 OS × 2 Node versions = 6 parallel jobs

**Platforms:**
- Ubuntu (latest)
- Windows (latest)
- macOS (latest)

**Node versions:**
- 20 (LTS minimum from package.json engines)
- 22 (latest LTS)

**Detected:** `fail-fast: false` ensures all 6 combinations run even if one fails (critical for cross-platform validation)

### Pipeline Stages

**Detected:** From `.github/workflows/test.yml` (lines 20-42):

```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v4

  - name: Setup pnpm
    uses: pnpm/action-setup@v4
    with:
      version: 9

  - name: Setup Node.js ${{ matrix.node-version }}
    uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
      cache: 'pnpm'

  - name: Install dependencies
    run: pnpm install --frozen-lockfile

  - name: Build packages
    run: pnpm build

  - name: Run tests
    run: pnpm test --run
```

**Pipeline stages in order:**
1. **Checkout** — Clone repository (actions/checkout@v4)
2. **Setup pnpm** — Install pnpm 9 (required by package.json)
3. **Setup Node.js** — Install Node with pnpm cache
4. **Install** — `pnpm install --frozen-lockfile` (ensures exact versions, no lockfile drift)
5. **Build** — `pnpm build` (Turbo runs build task across all packages)
6. **Test** — `pnpm test --run` (Vitest in non-watch mode)

**Inferred:** No separate lint step — likely included in test suite or not enforced in CI (CONTRIBUTING.md mentions manual `pnpm lint`).

### Coverage Reporting

**Detected:** From `.github/workflows/test.yml` (lines 44-50):

```yaml
- name: Upload coverage (Ubuntu + Node 20 only)
  if: matrix.os == 'ubuntu-latest' && matrix.node-version == 20
  uses: codecov/codecov-action@v4
  with:
    files: ./packages/cli/coverage/coverage-final.json
    fail_ci_if_error: false
    token: ${{ secrets.CODECOV_TOKEN }}
```

**Coverage configuration:**
- **Platform:** Codecov
- **Upload condition:** Only Ubuntu + Node 20 (1 of 6 jobs) to avoid duplicate reports
- **Failure mode:** `fail_ci_if_error: false` — coverage upload failures don't block CI
- **Files tracked:** `packages/cli/coverage/coverage-final.json` only

**Inferred:** Codecov is optional (won't fail CI if token missing or upload fails). Only CLI package coverage tracked, not analyzer package.

### Turbo Task Pipeline

**Detected:** From `turbo.json` (lines 3-38):

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "env": ["NODE_ENV"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "outputs": [],
      "cache": true
    },
    "clean": {
      "cache": false
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": [],
      "cache": true
    }
  },
  "globalDependencies": [
    "tsconfig.base.json",
    "pnpm-lock.yaml"
  ],
  "globalEnv": [
    "NODE_ENV"
  ]
}
```

**Task graph:**
- **build** — Depends on dependency packages building first (`^build`)
- **test** — Depends on `build` (tests run against compiled code)
- **type-check** — Depends on `^build` (needs package types)
- **dev** — No cache (always fresh), persistent (stays running)
- **lint** — Cached, no dependencies
- **clean** — No cache (always runs)

**Global invalidation triggers:**
- `tsconfig.base.json` changes (affects all TypeScript compilation)
- `pnpm-lock.yaml` changes (dependency updates)
- `NODE_ENV` environment variable

**Detected:** From root `package.json` (lines 6-11):

```json
"scripts": {
  "build": "turbo run build",
  "dev": "turbo run dev",
  "test": "turbo run test",
  "lint": "turbo run lint",
  "clean": "turbo run clean && rm -rf node_modules .turbo"
}
```

**When CI runs `pnpm build`:**
1. Turbo checks cache for each package's build task
2. Rebuilds only packages with changed files (or dependencies)
3. Runs builds in parallel where possible (analyzer before cli because cli depends on it)
4. Outputs to `dist/` directories

**When CI runs `pnpm test --run`:**
1. Turbo ensures `build` tasks complete first (via `dependsOn: ["build"]`)
2. Runs tests in parallel across packages
3. Generates coverage in `coverage/` directories
4. Caches results (next run with same code is instant)

### CI Performance Optimization

**Detected:** Node.js cache in `.github/workflows/test.yml` (lines 32-33):

```yaml
with:
  node-version: ${{ matrix.node-version }}
  cache: 'pnpm'
```

**Detected:** Frozen lockfile in `.github/workflows/test.yml` (line 36):

```yaml
run: pnpm install --frozen-lockfile
```

**Optimizations in play:**
1. **pnpm cache** — Shared pnpm store across workflow runs (faster installs)
2. **Frozen lockfile** — No dependency resolution, fail if lockfile out of date
3. **Turbo cache** — `.turbo/` directory caches task outputs (not explicitly configured in workflow, likely local-only)
4. **Parallel matrix** — 6 jobs run simultaneously (not sequential)

**Inferred:** Turbo remote cache not configured (no `TURBO_TOKEN` secret in workflow). All caching is local to GitHub Actions runner.

## Deployment

**User confirmed:** Manual npm publishing process

**Detected:** No automated deployment workflows in `.github/workflows/` (only `test.yml` found)

**Detected:** No deployment platform configuration files:
- No `vercel.json` (Glob returned no results)
- No `netlify.toml` (Glob returned no results)
- No `Dockerfile` (Glob returned no results)
- No other deployment configs detected

### Publishing Process

**Detected:** From CONTRIBUTING.md (lines 14-26), local development setup implies manual publishing:

```bash
cd packages/cli
npm link
ana --version
```

**Detected:** Package configuration from `packages/cli/package.json` (lines 1-9):

```json
{
  "name": "anatomia-cli",
  "version": "0.2.0",
  "description": "AI context framework with analyzer-driven setup",
  "bin": {
    "ana": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "type": "module",
  "license": "MIT"
}
```

**Detected:** Published packages:
- **anatomia-cli** (CLI tool, v0.2.0) — `npm install -g anatomia-cli`
- **anatomia-analyzer** (library, v0.1.0) — dependency of CLI

**Detected:** From README.md (line 5), npm badge present:

```markdown
[![npm version](https://img.shields.io/npm/v/anatomia-cli.svg)](https://www.npmjs.com/package/anatomia-cli)
```

**Inferred:** Manual publishing workflow (based on user confirmation + no CI automation):

1. **Local build:**
   ```bash
   pnpm build  # Turbo builds all packages
   ```

2. **Version bump:**
   ```bash
   cd packages/cli
   npm version patch|minor|major
   # Updates package.json version
   ```

3. **Manual publish:**
   ```bash
   npm publish
   # Requires npm login, publishes to npmjs.com
   ```

4. **Git tag:**
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

**Detected:** Package files configuration from `packages/cli/package.json` (lines 38-42):

```json
"files": [
  "dist",
  "templates",
  "docs"
]
```

**Published artifacts:**
- `dist/` — Compiled JavaScript + type declarations
- `templates/` — Mode and context templates (needed at runtime)
- `docs/` — Documentation files

**Not published:**
- `src/` — TypeScript source (not needed, users get compiled JS)
- `tests/` — Test suite
- `node_modules/` — Dependencies bundled or listed as dependencies

### Environments

**Detected:** No staging/production environment configuration detected

**Inferred:** Single production environment (npm registry). No staging environment for packages (npm doesn't support staging channels like Docker registries). Testing happens in CI before manual publish.

**Detected:** From `.github/workflows/test.yml` (line 5), staging branch exists:

```yaml
branches: [main, staging, effort/**]
```

**Inferred:** `staging` branch likely used for pre-release integration testing, but no automated deployment to staging environment (packages either published to npm or not, no in-between).

### Rollback Procedure

**Detected:** No rollback automation detected

**Inferred:** Manual rollback via npm (if needed):

```bash
npm unpublish anatomia-cli@0.2.0  # Risky, only works within 72 hours
# OR
npm deprecate anatomia-cli@0.2.0 "Use version 0.1.9 instead"
```

**Unexamined:** Rollback procedure not documented in CONTRIBUTING.md or README.md. Unclear if deprecation or unpublish is preferred.

## Environment Management

**Detected:** No `.env.example`, `.env.template`, or `.env.sample` files (Glob returned no results)

**Detected:** From `.gitignore` (lines 13-18), environment variables excluded:

```gitignore
# Environment & Secrets
.env
.env*.local
*.pem
*.key
credentials.json
```

**Inferred:** `.env` files excluded from git (security best practice), but no template provided for developers.

### Required Environment Variables

**Detected:** From `.github/workflows/test.yml` (line 50), Codecov token:

```yaml
token: ${{ secrets.CODECOV_TOKEN }}
```

**Detected:** From `turbo.json` (lines 35-37), NODE_ENV awareness:

```json
"globalEnv": [
  "NODE_ENV"
]
```

**Environment variables detected in use:**

1. **CODECOV_TOKEN** (CI only)
   - Purpose: Upload coverage to Codecov
   - Required: No (`fail_ci_if_error: false`)
   - Location: GitHub Secrets

2. **NODE_ENV** (build/test)
   - Purpose: Turbo cache invalidation trigger
   - Required: No (defaults handled by tools)
   - Values: `development`, `production`, `test`

**Detected:** From exploration results (lines 299-302), debug logging environment variables:

```
VERBOSE env var for debug output (packages/analyzer/src/analyzers/patterns.ts)
DEBUG env var checked in some places (packages/analyzer/src/errors/formatter.ts)
```

3. **VERBOSE** (development)
   - Purpose: Enable verbose debug output in analyzer
   - Required: No (optional debugging)
   - Usage: `VERBOSE=1 pnpm test`

4. **DEBUG** (development)
   - Purpose: Enable debug mode in error formatter
   - Required: No (optional debugging)
   - Usage: `DEBUG=1 pnpm test`

**Not detected:** No API keys, database URLs, or third-party service credentials required (CLI tool, file-based operations only).

### Secrets Management

**Detected:** GitHub Secrets usage from `.github/workflows/test.yml` (line 50):

```yaml
token: ${{ secrets.CODECOV_TOKEN }}
```

**Secrets storage:**
- **CI secrets:** GitHub repository secrets (accessed via `${{ secrets.NAME }}`)
- **Local secrets:** Not applicable (CLI tool has no secrets)

**Unexamined:** No documented process for rotating secrets or adding new ones (CONTRIBUTING.md silent on this).

### Configuration Per Environment

**Detected:** No environment-specific configuration files:
- No `config/development.json`, `config/production.json`
- No `.env.development`, `.env.production` templates

**Inferred:** CLI tool runs in user's local environment only (no server deployment). Environment management not applicable — users configure their own projects, not the Anatomia tool itself.

**Detected:** From `packages/cli/package.json` (lines 35-37), Node.js version requirement:

```json
"engines": {
  "node": ">=20.0.0"
}
```

**Detected:** From root `package.json` (lines 19-23), strict version requirements:

```json
"engines": {
  "node": ">=20.0.0",
  "pnpm": ">=9.0.0"
},
"packageManager": "pnpm@9.0.0"
```

**Environment requirements for development:**
- Node.js 20+ (LTS)
- pnpm 9.0.0 (exact version via packageManager field)
- Git (for clone and version control)

**Environment requirements for end users:**
- Node.js 20+ only (pnpm not required, npm installs CLI globally)

## Local Development Setup

**Detected:** Setup instructions from CONTRIBUTING.md (lines 7-19):

```markdown
**Prerequisites:**
- Node.js 20+
- pnpm 9+

**Setup:**
```bash
git clone https://github.com/TettoLabs/anatomia.git
cd anatomia
pnpm install
pnpm build
```

**Running locally:**
```bash
cd packages/cli
npm link
ana --version
```
```

**Detected:** From README.md (lines 59-79), development workflow:

```markdown
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
```

### Step-by-Step Setup (Git Clone to Running App)

**Detected:** Complete workflow from documentation:

1. **Clone repository:**
   ```bash
   git clone https://github.com/TettoLabs/anatomia.git
   cd anatomia
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   # Installs all workspace dependencies via pnpm-workspace.yaml
   # Uses frozen lockfile (pnpm-lock.yaml)
   ```

3. **Build packages:**
   ```bash
   pnpm build
   # Turbo orchestrates builds: analyzer → cli → generator → website
   # Outputs to packages/*/dist/ directories
   ```

4. **Link CLI globally:**
   ```bash
   cd packages/cli
   pnpm link --global
   # or: npm link
   # Creates global symlink: ana → packages/cli/dist/index.js
   ```

5. **Verify installation:**
   ```bash
   ana --version
   # Should output: 0.2.0
   ```

6. **Run tests:**
   ```bash
   cd ../..  # Back to root
   pnpm test
   # Runs Vitest across all packages
   ```

7. **Start development mode (optional):**
   ```bash
   pnpm dev
   # Turbo runs dev task (tsc --watch in packages)
   # Persistent mode, rebuilds on file changes
   ```

**Total time estimate:** 5-10 minutes (depending on internet speed for dependencies)

### Package Scripts

**Detected:** Root workspace scripts from `package.json` (lines 6-11):

```json
"scripts": {
  "build": "turbo run build",
  "dev": "turbo run dev",
  "test": "turbo run test",
  "lint": "turbo run lint",
  "clean": "turbo run clean && rm -rf node_modules .turbo"
}
```

**Purpose of each script:**

- **pnpm build** — Compile all packages (TypeScript → JavaScript + type declarations)
- **pnpm dev** — Watch mode, recompile on file changes (persistent)
- **pnpm test** — Run Vitest test suite across all packages
- **pnpm lint** — Run ESLint on all packages
- **pnpm clean** — Delete all build outputs and caches (fresh slate)

**Detected:** CLI package scripts from `packages/cli/package.json` (lines 43-48):

```json
"scripts": {
  "build": "tsup && cp -r templates dist/",
  "dev": "tsup --watch",
  "test": "vitest",
  "lint": "eslint src/",
  "lint:fix": "eslint src/ --fix"
}
```

**CLI-specific scripts:**

- **pnpm build** — Bundle with tsup + copy templates to dist
- **pnpm dev** — Watch mode with tsup bundler
- **pnpm test** — Vitest test suite
- **pnpm lint** — ESLint check only
- **pnpm lint:fix** — ESLint with auto-fix

**Detected:** Analyzer package scripts from `packages/analyzer/package.json` (lines 45-50):

```json
"scripts": {
  "build": "tsc",
  "dev": "tsc --watch",
  "test": "vitest",
  "test:coverage": "vitest --coverage",
  "clean": "rm -rf dist"
}
```

**Analyzer-specific scripts:**

- **pnpm build** — TypeScript compiler (tsc)
- **pnpm dev** — Watch mode with tsc
- **pnpm test** — Vitest test suite
- **pnpm test:coverage** — Vitest with coverage report
- **pnpm clean** — Remove dist directory

### Docker / Docker Compose

**Detected:** No Docker configuration (Glob found no Dockerfile, no docker-compose.yml mentioned in exploration)

**Inferred:** Docker not used (CLI tool, not a service). Users install via npm, not containers.

### Database Seeding

**Detected:** Not applicable from exploration results (line 95-97):

```
### Database Patterns
- **Not applicable** — No database used (CLI tool) — Confidence: 0.95
  - File-based state: .ana/.state/snapshot.json, .ana/.meta.json
```

**No seed scripts detected** (no `prisma db seed`, no `seed.ts` files)

### Third-Party Accounts Required

**Detected:** No third-party API dependencies:

- No `STRIPE_*` variables (no payment processing)
- No `OPENAI_*` variables (no AI API calls — tool generates context FOR AI, doesn't call AI)
- No `AUTH_*` variables (no authentication)
- No `DATABASE_URL` (file-based storage only)

**Only external service:** Codecov (optional, CI-only, token in GitHub Secrets)

**Inferred:** Zero third-party account setup required for local development. Fully self-contained CLI tool.

### Development Server

**Detected:** No development server (CLI tool, not web application)

**Detected:** From `pnpm-workspace.yaml` (lines 1-4):

```yaml
packages:
  - 'packages/*'
  - 'website'
```

**Unexamined:** Website package exists but not explored in detail. Likely documentation site (static or Next.js). Development server may exist for website package only, not for CLI/analyzer.

### Port Configuration

**Detected:** No port configuration (CLI tool doesn't listen on ports)

**Inferred:** Website package may have dev server (typical port: 3000 for Next.js), but not documented in root-level workflow docs.

---

*Last updated: 2026-03-24*
