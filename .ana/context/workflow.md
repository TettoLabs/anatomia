# Workflow — anatomia-workspace

## Git Workflow

**Detected:** Phased branching strategy with three branch types (from `git branch -a`):

1. **effort/STEP_*** — Main development phases tracking MVP progression
   - Examples: `effort/STEP_0_1_FOUNDATION`, `effort/STEP_1_3_TREE_SITTER`, `effort/STEP_2_5_CLI_CODE`
   - Format: `effort/STEP_{phase}_{checkpoint}_{name}`
   - Purpose: Long-lived feature branches for major milestones

2. **SideSprint/** — Parallel improvement work outside main effort track
   - Example: `SideSprint/setup-redesign` (current active branch)
   - Purpose: Experimental features or refactoring that doesn't block main progress

3. **ux/** — User experience and copy improvements
   - Example: `ux/fix-copy`
   - Purpose: Quick fixes for wording, templates, and UX issues

**Main branch:** `main` — Confidence: 0.95

**User confirmed:** Phased branching (effort/STEP_*, SideSprint/*), PR workflow with merge commits

**Detected:** All local branches have remote tracking branches on origin — indicates PR-based workflow with code review

**Detected:** Branch naming reflects methodical, phased development approach documented in master_plan/ directory

**Merge strategy from git log:**

From `git log --format="%h %s" --merges -10`:
```
b31e36d Merge branch 'effort/STEP_2_5_CLI_CODE'
717248a Merge pull request #4 from TettoLabs/effort/STEP_2_5_CLI_CODE
56b626b Merge pull request #3 from TettoLabs/effort/STEP_2_2_CONVENTIONS
ef46627 Merge STEP_2.1: Pattern Inference Engine - Complete
8ec8704 Merge STEP_1.3: Tree-sitter Integration + Caching Layer
8136e36 [STEP_1.2] Complete - Directory Structure Analysis
fe68d6f Merge STEP_1.1 CP1: Dependency Parsers Complete
12080cb Merge main to get .ana/ folder from STEP_0.4
```

**Detected:** Merge commits preserved (not squashed) — shows full commit history and attribution for each step

**Detected:** PR workflow uses GitHub pull requests (from CONTRIBUTING.md, lines 134-141):
```markdown
## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request
```

**PR requirements from CONTRIBUTING.md (lines 143-148):**
- All tests pass
- Code follows TypeScript strict mode
- Templates maintain quality standards
- Documentation updated if needed

**Inferred:** No PR template detected in repository — developers write PR descriptions from scratch

**Inferred:** No branch protection rules visible in codebase — likely configured in GitHub settings (can't be verified from files)

**Detected:** Testing runs on pushes to effort/** branches (from `.github/workflows/test.yml`, lines 4-5):
```yaml
on:
  push:
    branches: [main, staging, effort/**]
```

This means CI validates effort/STEP_* branches before they're merged, not just after PR creation.

## Commit Conventions

**Detected:** Structured commit format with tags and em dash separator (from `git log --format="%s" -20`):

```
[SS-13.0] MI-51/52/53/54/55: preflight changes — Q6 git workflow, Q7 business flow, What's Next print, .gitignore, explorer git targets
[SS-12.4c] detectProjectType tests (14), app/ directory sampling fix, tetto 6→20 files parsed
[SS-12.4b] Fix analysis.md formatter field names — totalParsed, computed functions/classes from files array
[SS-12.4] Analyzer detectProjectType() implemented + setup complete soft warning + grep whitespace fix + CLAUDE.md count fix
[MI-18] CLAUDE.md signpost generation — marker-based merge, concierge ENTRY.md, 3 edge case tests passed
[SS-12.3] Easy wins — duplicate H2 detection, P0 extraction targets (database, payments, security, auth, local dev)
[SS-12.2] Systematic path fixes — cli-path resolution, CLAUDE_PROJECT_DIR hooks, package.json bundle detection
[SS-11.1] Fix init atomic rename — clean up analyzer cache dir before rename
[SS-11] AST symbol index — 582 symbols from 152 files, citation verification checks function/class names
[SS-10.1] Add WASM smoke test — catches build/linking failures early
```

**Format pattern:** `[TAG] Brief description — Detailed context`

**Tag types detected:**
- **SS-*** — SideSprint work (parallel effort outside main track)
  - Examples: `[SS-13.0]`, `[SS-12.4c]`, `[SS-11]`
  - Decimal numbering indicates sub-tasks within a sprint

- **MI-*** — Milestone or Issue tracking
  - Examples: `[MI-18]`, `[MI-51/52/53/54/55]`
  - Can reference multiple issues: `MI-51/52/53/54/55`

- **STEP_*** — Effort phase markers (less common in recent commits)
  - Used in merge commits: `[STEP_1.2] Complete - Directory Structure Analysis`

**Separator:** Em dash (—) separates brief from details — Confidence: 0.95

**Detected:** Brief is always present, detailed context often includes:
- What changed (features, fixes, refactoring)
- Impact metrics (`6→20 files parsed`, `582 symbols from 152 files`)
- Implementation details (`marker-based merge`, `async init`)

**Inferred:** Not Conventional Commits format (no `feat:`, `fix:`, `chore:` prefixes) — custom format tailored to phased development workflow

**User confirmed:** Structured commit tags used consistently

**Detected:** 100% of recent commits follow the `[TAG] Brief — Details` format — no deviation in last 20 commits

**Detected:** Merge commits use descriptive text (from git log merges):
- `Merge STEP_2.1: Pattern Inference Engine - Complete`
- `Merge pull request #4 from TettoLabs/effort/STEP_2_5_CLI_CODE`

**Detected:** Contributors: Ryan Smith (primary), TettoLabs (organization) — small team, consistent style

## Pull Request Process

**Detected:** PR workflow described in CONTRIBUTING.md (lines 133-147)

**PR creation flow:**
1. Fork repository (for external contributors) or branch directly (for team)
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes
4. Run tests: `pnpm test` (all tests must pass)
5. Commit with structured message: `[TAG] Brief — Details`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open Pull Request on GitHub

**PR requirements (from CONTRIBUTING.md, lines 143-148):**
- ✅ All tests pass
- ✅ Code follows TypeScript strict mode
- ✅ Templates maintain quality standards (if template changes)
- ✅ Documentation updated if needed

**Additional requirements for template changes (CONTRIBUTING.md, lines 104-118):**
- Include test results in PR description
- Include rubric results if ENTRY.md or mode templates changed
- Provide rationale for changes
- Describe what changed, why, and how quality was verified

**Template quality rubric (CONTRIBUTING.md, lines 105-108):**
- Orientation test: ENTRY.md changes must maintain ≤30s reading time target
- Boundary test: Mode changes must maintain ≤10% constraint violations
- Manual review: Professional tone maintained

**No PR template detected** — developers write descriptions from scratch

**Inferred:** No approval requirements visible in codebase — likely configured in GitHub settings (common pattern: 1 approval for small teams)

**User confirmed:** PR workflow with merge commits (not squash merge)

**Detected:** Merge commits preserve full history (from git log):
- `Merge pull request #4 from TettoLabs/effort/STEP_2_5_CLI_CODE`
- `Merge pull request #3 from TettoLabs/effort/STEP_2_2_CONVENTIONS`

This means PRs are merged with `--no-ff` (no fast-forward), creating explicit merge commits.

**Inferred:** Small team (2 contributors) likely means informal review process — PRs reviewed by Ryan Smith or TettoLabs org members

**Detected:** CI must pass before merge (from `.github/workflows/test.yml` triggering on PRs to main/staging)

## CI/CD Pipeline

**Detected:** GitHub Actions for continuous integration (from `.github/workflows/test.yml`)

**Workflow name:** `Test Suite`

**Triggers (lines 3-7):**
```yaml
on:
  push:
    branches: [main, staging, effort/**]
  pull_request:
    branches: [main, staging]
```

**Detected:** CI runs on:
- Pushes to `main`, `staging`, or any `effort/**` branch
- PRs targeting `main` or `staging`

**User confirmed:** GitHub Actions CI matrix testing on multiple OS and Node versions

**Matrix strategy (lines 14-18):**
```yaml
strategy:
  fail-fast: false  # CRITICAL: Run all combinations even if one fails
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [20, 22]
```

**Detected:** 6 total test jobs (3 OS × 2 Node versions)
- Operating systems: Ubuntu, Windows, macOS
- Node.js versions: 20, 22
- `fail-fast: false` ensures all matrix combinations run even if one fails (useful for detecting platform-specific bugs)

**Pipeline stages (lines 20-43):**

1. **Checkout code**
   - Action: `actions/checkout@v4`

2. **Setup pnpm**
   - Action: `pnpm/action-setup@v4`
   - Version: `9` (matches `packageManager: "pnpm@9.0.0"` in root package.json)

3. **Setup Node.js**
   - Action: `actions/setup-node@v4`
   - Version: Matrix variable (`20` or `22`)
   - Cache: `pnpm` (caches dependencies for faster installs)

4. **Install dependencies**
   - Command: `pnpm install --frozen-lockfile`
   - `--frozen-lockfile` ensures exact dependency versions (fails if pnpm-lock.yaml is out of sync)

5. **Build packages**
   - Command: `pnpm build`
   - Runs Turborepo build task across all packages

6. **Run tests**
   - Command: `pnpm test --run`
   - `--run` flag runs tests once (non-watch mode)

7. **Upload coverage** (Ubuntu + Node 20 only, lines 44-50)
   - Conditional: `matrix.os == 'ubuntu-latest' && matrix.node-version == 20`
   - Action: `codecov/codecov-action@v4`
   - Files: `./packages/cli/coverage/coverage-final.json`
   - Token: `${{ secrets.CODECOV_TOKEN }}`
   - `fail_ci_if_error: false` — coverage upload failure doesn't fail the build

**Detected:** Coverage tracking via Codecov (from test.yml lines 44-50 and exploration results)

**Detected:** No deployment automation in CI/CD — testing only, no build artifacts published

**Detected:** No linting step in CI — linting is manual via `pnpm lint` (likely expected during local development)

**Detected:** Test dependencies enforced by Turborepo (from `turbo.json`, lines 13-17):
```json
"test": {
  "dependsOn": ["build"],
  "outputs": ["coverage/**"],
  "cache": true
}
```

This ensures packages are built before tests run, and test results are cached by Turborepo.

**Detected:** Build dependencies configured (from `turbo.json`, lines 4-8):
```json
"build": {
  "dependsOn": ["^build"],
  "outputs": ["dist/**", ".next/**"],
  "env": ["NODE_ENV"]
}
```

The `^build` means "build upstream packages first" — ensures analyzer is built before CLI.

**Detected:** Global dependencies tracked for cache invalidation (from `turbo.json`, lines 31-34):
```json
"globalDependencies": [
  "tsconfig.base.json",
  "pnpm-lock.yaml"
]
```

Turborepo invalidates all caches if these files change.

**Detected:** No staging environment or deployment branches beyond main — simple workflow for CLI tool distribution

**Detected:** No Docker builds, Kubernetes configs, or serverless deployment steps — pure npm package distribution

## Deployment

**User confirmed:** Manual npm publish for releases, no deployment environments (CLI tool)

**Detected:** No automated deployment pipeline — testing is automated, publishing is manual

**Distribution model:** npm packages (from package.json files)
- `anatomia-cli` (version 0.2.0) — main CLI package
- `anatomia-analyzer` (version 0.1.0) — code analysis engine
- Published to npm registry under TettoLabs organization

**Detected:** Package files configuration (from `packages/cli/package.json`, lines 38-42):
```json
"files": [
  "dist",
  "templates",
  "docs"
]
```

Only `dist/`, `templates/`, and `docs/` directories are included in published npm package.

**Detected:** Binary entry point (from `packages/cli/package.json`, lines 5-7):
```json
"bin": {
  "ana": "./dist/index.js"
}
```

Installing `anatomia-cli` makes `ana` command available globally.

**Inferred:** Release process likely involves:
1. Update version in package.json (manual)
2. `pnpm build` to compile TypeScript
3. `npm publish` from packages/cli/ directory (manual)
4. Git tag creation for version tracking (manual)

**No deployment detected:**
- No Dockerfile or docker-compose.yml
- No Kubernetes configs (*.yaml in k8s/)
- No serverless configs (vercel.json, netlify.toml, fly.toml)
- No hosting platform configurations

**Inferred:** This is appropriate for a CLI tool — end users install via `npm install -g anatomia-cli`, no server deployment needed

**Detected:** No staging or production environments — CLI runs entirely on user's local machine

**Detected:** No rollback procedures — npm allows users to pin versions (`npm install anatomia-cli@0.1.0`) for stability

**Detected:** No release automation workflow in `.github/workflows/` — publishing is manual step after CI passes

**Inferred:** Small team (2 contributors) likely publishes manually when ready, no need for automated release trains

**Detected:** Version management (from package.json files):
- Workspace root: `0.0.0` (private, not published)
- CLI: `0.2.0` (published)
- Analyzer: `0.1.0` (published)
- No automatic version bumping detected (no semantic-release, no changeset)

**Detected:** No changelog automation — CHANGELOG.md not found in repository

## Environment Management

**Detected:** No .env.example file in repository (from Glob pattern search returning no results)

**Detected:** .gitignore blocks environment files (from `.gitignore`, lines 13-18):
```
# Environment & Secrets
.env
.env*.local
*.pem
*.key
credentials.json
```

**Inferred:** No environment variables required for core CLI functionality — tool operates on local filesystem only

**Detected:** No external API dependencies requiring keys:
- No OPENAI_* variables
- No STRIPE_* variables
- No AUTH0_* or similar auth provider variables
- No DATABASE_URL

**Detected:** Single environment variable usage in Turborepo (from `turbo.json`, lines 35-37):
```json
"globalEnv": [
  "NODE_ENV"
]
```

`NODE_ENV` tracked for cache invalidation — affects build outputs.

**Detected:** No Docker environment variable passing — no docker-compose.yml with env_file or environment sections

**Detected:** No secrets management tooling:
- No vault integration
- No AWS Secrets Manager
- No dotenv-vault or similar encryption

**Inferred:** This is appropriate for a CLI tool that:
- Reads local codebases only
- Writes to .ana/ directory
- No network requests to external APIs
- No database connections
- No authentication providers

**Detected:** CI environment secrets (from `.github/workflows/test.yml`, line 50):
```yaml
token: ${{ secrets.CODECOV_TOKEN }}
```

Single secret for Codecov upload — configured in GitHub repository settings.

**Detected:** No environment-specific configuration files:
- No .env.development, .env.production, .env.test
- No config/environments/ directory
- No NODE_ENV-based config loading

**Detected:** Node.js version requirement enforced (from root `package.json`, lines 19-22):
```json
"engines": {
  "node": ">=20.0.0",
  "pnpm": ">=9.0.0"
}
```

Environment constraint: Node.js 20+ and pnpm 9+ required.

**Detected:** Package manager locked (from root `package.json`, line 23):
```json
"packageManager": "pnpm@9.0.0"
```

Ensures consistent package manager version across all environments.

**Inferred:** For contributors, environment setup is simple (from CONTRIBUTING.md, lines 8-19):
1. Install Node.js 20+
2. Install pnpm 9+
3. Clone repository
4. `pnpm install`
5. `pnpm build`
6. `npm link` for local testing

No .env file needed, no third-party account creation required.

**Detected:** Testing environment uses no external dependencies:
- Vitest runs in Node environment (from vitest.config.ts files)
- Fixture-based testing with local files
- No database seeding
- No API mocking libraries (nock, msw)

**Detected:** No environment variable validation libraries:
- No envalid
- No zod-env
- No dotenv-safe

This confirms no environment variables are critical to operation.

## Local Development Setup

**Detected:** Development setup documented in CONTRIBUTING.md (lines 8-26)

**Prerequisites (lines 9-11):**
- Node.js 20+
- pnpm 9+

**Initial setup (lines 13-19):**
```bash
git clone https://github.com/TettoLabs/anatomia.git
cd anatomia
pnpm install
pnpm build
```

**Local testing (lines 21-26):**
```bash
cd packages/cli
npm link
ana --version
```

**Detected:** `npm link` creates global symlink for `ana` command — changes to source code immediately available after rebuild

**Detected:** Available scripts from root package.json (lines 6-12):
```json
"scripts": {
  "build": "turbo run build",
  "dev": "turbo run dev",
  "test": "turbo run test",
  "lint": "turbo run lint",
  "clean": "turbo run clean && rm -rf node_modules .turbo"
}
```

**Script descriptions:**
- `pnpm build` — Compile all packages with Turborepo (runs tsup for CLI, tsc for analyzer)
- `pnpm dev` — Watch mode for all packages (auto-rebuild on file changes)
- `pnpm test` — Run Vitest tests across all packages
- `pnpm lint` — Run ESLint across all packages
- `pnpm clean` — Remove dist/, node_modules/, .turbo/ cache

**Detected:** CLI package scripts (from `packages/cli/package.json`, lines 43-48):
```json
"scripts": {
  "build": "tsup && cp -r templates dist/",
  "dev": "tsup --watch",
  "test": "vitest",
  "lint": "eslint src/",
  "lint:fix": "eslint src/ --fix"
}
```

**CLI script details:**
- `build` — Bundles TypeScript with tsup, copies template files to dist/
- `dev` — Watch mode with tsup (auto-rebuild on changes)
- `test` — Run Vitest tests in watch mode
- `lint` — Check code style with ESLint
- `lint:fix` — Auto-fix ESLint issues

**Detected:** Analyzer package scripts (from `packages/analyzer/package.json`, lines 45-50):
```json
"scripts": {
  "build": "tsc",
  "dev": "tsc --watch",
  "test": "vitest",
  "test:coverage": "vitest --coverage",
  "clean": "rm -rf dist"
}
```

**Analyzer script details:**
- `build` — Compile TypeScript with tsc (generates .d.ts type definitions)
- `dev` — Watch mode with tsc
- `test` — Run Vitest tests
- `test:coverage` — Generate coverage report with v8
- `clean` — Remove dist/ directory

**Detected:** No database seeding — tool operates on filesystem only

**Detected:** No Docker setup — development runs directly on host machine

**Detected:** No .env file required — no environment variables needed for local development

**Detected:** Testing locally after changes (from CONTRIBUTING.md, lines 97-103):
```bash
pnpm build
cd /tmp && mkdir test-template && cd test-template
ana init
# Review generated .ana/ files
```

**Workflow for contributors:**
1. Make changes to source code
2. `pnpm build` to compile (or `pnpm dev` for watch mode)
3. Test in /tmp directory with `ana init` or `ana setup`
4. `pnpm test` to run automated tests
5. `pnpm lint` to check code style

**Detected:** tsx in CLI devDependencies (from `packages/cli/package.json`, line 64) — allows running TypeScript files directly without build step

**Inferred:** Developers can use `tsx src/index.ts` for quick testing without full build

**Detected:** Template development workflow documented (CONTRIBUTING.md, lines 83-113):
1. Edit template file in `packages/cli/templates/`
2. Run tests: `pnpm test tests/templates/`
3. Build and test locally: `pnpm build && ana init` in test directory
4. Run quality rubric if changing mode templates
5. Submit PR with test results

**Detected:** No Git hooks configured:
- No .husky/ directory
- No lint-staged in package.json
- No pre-commit, pre-push hooks in .git/hooks/
- Custom .ana/hooks/ scripts exist but are for Anatomia's own validation (not git hooks)

**Inferred:** Developers manually run `pnpm lint` and `pnpm test` before committing — no automated enforcement

**Detected:** Monorepo dependencies managed by pnpm workspaces (from root pnpm-workspace.yaml):
- CLI depends on analyzer via `"anatomia-analyzer": "workspace:*"`
- Changes to analyzer automatically available to CLI after build

**Detected:** Turborepo caching speeds up rebuilds (from `turbo.json`):
- Build outputs cached in .turbo/
- Only changed packages rebuild
- Cache invalidates on dependency changes (pnpm-lock.yaml, tsconfig.base.json)

**Detected:** No live reload server — CLI tool runs once per command, not long-running server

**Detected:** No browser devtools integration — pure Node.js CLI, use Node debugger via VS Code or `node --inspect`

**Development cycle timing:**
1. Change source file → instant (editor save)
2. `pnpm dev` rebuild → ~1-3 seconds (tsup/tsc watch mode)
3. Test command → instant (`ana` symlinked to dist/)
4. Run tests → ~2-10 seconds (Vitest)

**Detected:** Frozen lockfile enforced in CI (from `.github/workflows/test.yml`, line 36):
```yaml
run: pnpm install --frozen-lockfile
```

Contributors must run `pnpm install` to update pnpm-lock.yaml if adding dependencies — CI will fail if lockfile is out of sync.

---

*Last updated: 2026-03-23*
