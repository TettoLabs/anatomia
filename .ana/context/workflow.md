# Workflow — anatomia-workspace

## Git Workflow

**Detected:** Repository hosted at `git@github.com:TettoLabs/anatomia.git` (from `git config`)

**Branching strategy:** Feature branch workflow with structured branch naming

From `git branch -a`:
- **Main branch:** `main` (integration target)
- **Feature branches:** Two patterns detected:
  - `effort/STEP_*` — Major feature work organized by step number
  - `SideSprint/*` — Side sprint work (parallel track)
  - `ux/*` — UX-focused changes

**Detected branch examples:**
- `effort/STEP_0_1_FOUNDATION` — Foundation work (step 0.1)
- `effort/STEP_2_5_CLI_CODE` — CLI code implementation (step 2.5)
- `SideSprint/setup-redesign` — Setup system redesign
- `ux/fix-copy` — Copy fixes

**Inferred:** The `effort/STEP_*` naming suggests a structured development roadmap with numbered phases. SideSprint branches indicate parallel experimental work outside the main roadmap.

**Merge strategy:** Pull request workflow with GitHub PRs

From git log showing merge commits:
```
Merge pull request #4 from TettoLabs/effort/STEP_2_5_CLI_CODE
Merge pull request #3 from TettoLabs/effort/STEP_2_2_CONVENTIONS
```

**Detected:** Standard GitHub PR merge strategy (merge commits preserved in history)

**Protected branches:**

**Detected:** CI triggers on `main` and `staging` branches (from `.github/workflows/test.yml` lines 4-7):
```yaml
on:
  push:
    branches: [main, staging, effort/**]
  pull_request:
    branches: [main, staging]
```

**Inferred:** `main` and `staging` are protected branches requiring PRs for changes. The `staging` branch is referenced but not currently visible in local branches, suggesting it may be used for pre-production testing.

**Contributors:**

From `git log --format="%an" --all | sort | uniq -c`:
```
 108 Ryan Smith
   2 TettoLabs
```

**Detected:** Single primary developer (Ryan Smith) with 108 commits, TettoLabs org account with 2 commits (likely automated or organizational commits).

**Current work:**

From `git status`:
```
Current branch: SideSprint/setup-redesign
Ahead of origin/SideSprint/setup-redesign by 1 commit
```

**Detected:** Active development on setup redesign side sprint branch.

## Commit Conventions

**Format:** Structured commit messages with prefixed tags

**Detected:** Recent commit messages show two primary patterns:

### Pattern 1: Side Sprint Format

Format: `[SS-X.Y] Description — details`

From `git log --format="%s" -10`:
```
[SS-7.2] Widen line targets + fix path stripping in check.ts — based on test cycle observations
[SS-7.1] Hook fixes + writer improvements — quality gate phase check, PostToolUse confirmed for sub-agents, SubagentStop hook, parallel batching, 6 writer improvements
[SS-6] Content redesign — 7 step files restructured, rules.md compressed 771→195 lines, quality checklists, trust stack
[SS-5] Question redesign — two-tier answer validation + UX consistency polish
[SS-4] Orchestrator rewrite — slim setup.md + tier files + state management
```

**Structure:**
- Prefix: `[SS-X.Y]` where X is major sprint number, Y is iteration (optional)
- Subject: Brief description
- Separator: ` — ` (em dash with spaces)
- Details: Specific changes or components affected

### Pattern 2: Step Format

Format: `[STEP_X.Y] Description`

From `git log --format="%s" -50`:
```
[STEP_2.5] Architecture fix: lazy-load analyzer to prevent startup crash
[STEP_2.5] Add ESLint 9 flat config with TypeScript + JSDoc rules
[STEP_2.5] Fix: replace 'as any' with type guard in setup.ts
[STEP_2.5] CP7 - Integration testing and documentation (FINAL)
[STEP_2.5] CP6 - Engineering quality gates
[STEP_2.2] CP4 complete - Edge case tests + COMPLETION_SUMMARY
[STEP_2.1] CP4 - add integration tests and 30-project test suite
```

**Structure:**
- Prefix: `[STEP_X.Y]` indicating development roadmap step
- Checkpoint: Optional `CPX` suffix for checkpoint within step
- Subject: Action-oriented description (Fix, Add, Implement, etc.)
- Completion markers: `complete`, `FINAL` for milestone commits

### Pattern 3: Conventional Commits (Occasional)

From `git log --format="%s" -50`:
```
fix: ensure templates survive clean build
ux: fix meta description, remove federation reference
docs: add component architecture reference for future copy changes
```

**Structure:**
- Type prefix: `fix:`, `ux:`, `docs:`
- Subject: Imperative mood description

**Consistency analysis:**

**Inferred:** ~80% of recent commits use structured prefixes ([SS-X.Y] or [STEP_X.Y]), ~15% use conventional commit types (fix:, ux:, docs:), ~5% are merge commits. The project has evolved from STEP-based commits (earlier work) to SS-based commits (current side sprint).

**Commit message guidelines:**

**Detected from CONTRIBUTING.md** (lines 135-140):
- Subject format: Descriptive (e.g., "Add amazing feature")
- No strict enforcement of conventional commits
- Focus on clarity over format strictness

**Detected from actual practice:**
- **Multi-component changes:** Use ` — ` separator to list affected components
- **Completion signals:** Add `complete`, `FINAL`, or `(FINAL)` to milestone commits
- **Scope specificity:** Include file names or component names in details section
- **Metrics in messages:** Include quantitative improvements (e.g., "771→195 lines")

## Pull Request Process

**PR template:** Not detected in repository

From `Glob` search for `.github/PULL_REQUEST_TEMPLATE.md`: No files found

**Inferred:** No standardized PR template configured. PRs likely follow informal description format.

**Review requirements:**

**Detected from CONTRIBUTING.md** (lines 132-148):
```markdown
**PR requirements:**
- All tests pass
- Code follows TypeScript strict mode
- Templates maintain quality standards
- Documentation updated if needed
```

**PR workflow:**

From CONTRIBUTING.md (lines 133-141):
1. Fork the repository
2. Create a feature branch
3. Make changes
4. Run tests (`pnpm test`)
5. Commit changes
6. Push to branch
7. Open a Pull Request

**Approval process:**

**Not detected in codebase** — No branch protection rules or CODEOWNERS file found.

**Inferred:** Single-developer project (Ryan Smith) likely merges own PRs after CI passes. The 2 commits from TettoLabs suggest organizational account may approve/merge PRs.

**Merge evidence:**

From `git log`:
```
Merge pull request #4 from TettoLabs/effort/STEP_2_5_CLI_CODE
Merge pull request #3 from TettoLabs/effort/STEP_2_2_CONVENTIONS
```

**Detected:** PRs are merged via GitHub's standard merge workflow (merge commits created). No squash-merge or rebase-merge pattern detected in history.

**Quality gates:**

**Detected from CONTRIBUTING.md** (lines 114-118):
- All automated tests must pass (`pnpm test`)
- Coverage must remain ≥80%
- Quality rubric maintained for template changes
- Manual review for professional tone

**Testing before PR:**

**Detected from CONTRIBUTING.md** (lines 58-73):
```bash
pnpm test                # All tests required to pass
pnpm test tests/templates/  # Template-specific tests
```

**Coverage requirement:** 80% minimum (CLI), 85% minimum (analyzer)

From `packages/cli/vitest.config.ts` and `packages/analyzer/vitest.config.ts` in exploration results.

## CI/CD Pipeline

**Platform:** GitHub Actions

**Workflow file:** `.github/workflows/test.yml`

**Detected:** Single CI workflow named "Test Suite" (from `.github/workflows/test.yml` line 1):

### Triggers

From `.github/workflows/test.yml` (lines 3-7):
```yaml
on:
  push:
    branches: [main, staging, effort/**]
  pull_request:
    branches: [main, staging]
```

**Push triggers:**
- `main` branch — Integration branch
- `staging` branch — Staging environment (inferred)
- `effort/**` — All effort branches run CI on push

**PR triggers:**
- PRs targeting `main` or `staging` branches

**Inferred:** CI runs on all effort branches during development, but only PRs to main/staging trigger checks. This allows rapid iteration on feature branches with continuous testing.

### Matrix Strategy

From `.github/workflows/test.yml` (lines 14-18):
```yaml
strategy:
  fail-fast: false  # CRITICAL: Run all combinations even if one fails
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [20, 22]
```

**Detected:** 6 test combinations (3 OS × 2 Node versions)
- **Operating systems:** Ubuntu, Windows, macOS
- **Node versions:** 20, 22
- **Fail-fast disabled:** All combinations run even if one fails

**Inferred:** Cross-platform testing is critical — the `fail-fast: false` comment emphasizes this. Likely due to tree-sitter native module loading issues across platforms (from Q&A log).

### Pipeline Steps

From `.github/workflows/test.yml` (lines 20-42):

**Step 1:** Checkout code (line 21-22)
```yaml
- name: Checkout code
  uses: actions/checkout@v4
```

**Step 2:** Setup pnpm (lines 24-27)
```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9
```

**Step 3:** Setup Node.js (lines 29-33)
```yaml
- name: Setup Node.js ${{ matrix.node-version }}
  uses: actions/setup-node@v4
  with:
    node-version: ${{ matrix.node-version }}
    cache: 'pnpm'
```

**Detected:** pnpm cache enabled for faster installs.

**Step 4:** Install dependencies (lines 35-36)
```yaml
- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

**Detected:** `--frozen-lockfile` flag ensures lockfile consistency (no drift from checked-in version).

**Step 5:** Build packages (lines 38-39)
```yaml
- name: Build packages
  run: pnpm build
```

**Inferred:** Runs Turborepo build orchestration (from root `package.json` script: `"build": "turbo run build"`).

**Step 6:** Run tests (lines 41-42)
```yaml
- name: Run tests
  run: pnpm test --run
```

**Detected:** `--run` flag disables watch mode (required for CI).

**Step 7:** Upload coverage (lines 44-50)
```yaml
- name: Upload coverage (Ubuntu + Node 20 only)
  if: matrix.os == 'ubuntu-latest' && matrix.node-version == 20
  uses: codecov/codecov-action@v4
  with:
    files: ./packages/cli/coverage/coverage-final.json
    fail_ci_if_error: false
    token: ${{ secrets.CODECOV_TOKEN }}
```

**Detected:** Coverage uploaded only from Ubuntu + Node 20 combination to avoid duplicate uploads.

**Coverage target:** `packages/cli/coverage/coverage-final.json` (CLI package coverage only in upload).

**Inferred:** `fail_ci_if_error: false` means Codecov upload failures don't break CI (tolerates temporary Codecov outages).

### Build Orchestration

**Detected:** Turborepo manages build dependencies

From `turbo.json` (lines 4-8):
```json
"build": {
  "dependsOn": ["^build"],
  "outputs": ["dist/**", ".next/**"],
  "env": ["NODE_ENV"]
}
```

**Build order:**
1. Dependencies build first (`^build` means upstream packages)
2. CLI depends on analyzer (from `packages/cli/package.json` dependencies)
3. Website builds after packages (Next.js app)

**Test orchestration:**

From `turbo.json` (lines 13-16):
```json
"test": {
  "dependsOn": ["build"],
  "outputs": ["coverage/**"],
  "cache": true
}
```

**Detected:** Tests require successful build first. Coverage outputs are cached by Turborepo for faster re-runs.

### Coverage Requirements

**CLI package:**

**Inferred from exploration results** (line 256):
- 80% lines
- 75% branches
- 80% functions
- 80% statements

**Analyzer package:**

**Inferred from exploration results** (line 257):
- 85% lines
- 80% branches
- 85% functions
- 85% statements

**Exclusions:**

**Inferred from exploration results** (line 258):
- `dist/` directories
- Test files (`*.test.ts`)
- Entry points (`index.ts`)

## Deployment

**Deployment configuration:** Not detected in codebase

**Search results:**
- No `vercel.json` found
- No `netlify.toml` found
- No `Dockerfile` found
- No `fly.toml` found
- No deployment workflow files in `.github/workflows/`

**Inferred:** Deployment is either:
1. Manual (local builds + npm publish for CLI packages)
2. Configured outside the repository (cloud platform UI configuration)
3. Not yet implemented (project is v0.2.0, pre-1.0)

**npm publishing:**

**Detected:** Packages are published to npm

From package.json files:
- **CLI package:** `anatomia-cli` v0.2.0 (from `packages/cli/package.json`)
- **Analyzer package:** `anatomia-analyzer` v0.1.0 (from `packages/analyzer/package.json`)

README.md (lines 5-6) shows npm badges:
```markdown
[![npm version](https://img.shields.io/npm/v/anatomia-cli.svg)](https://www.npmjs.com/package/anatomia-cli)
```

**Inferred:** CLI and analyzer are published to npm registry, but publishing process is not automated in CI.

**Website deployment:**

**Detected:** Website package exists at `/website/` (Next.js 16.1.1 App Router)

From `website/package.json` (line 2): `"name": "demo-site"`

**Inferred:** Website is likely deployed via Vercel (Next.js default platform) or similar, but configuration is not in repository. The name "demo-site" suggests it's for documentation/marketing purposes.

**Build outputs:**

From `.gitignore` (lines 6-11):
```
# Build outputs
.next/
dist/
build/
.turbo/
*.tsbuildinfo
```

**Detected:** All build artifacts are excluded from git, requiring fresh builds on deployment.

**Deployment recommendations:**

**Not detected in codebase**, but based on project structure:
- CLI/Analyzer: Automate npm publish via GitHub Actions on git tags
- Website: Deploy to Vercel with automatic PR previews
- Add deployment triggers to `.github/workflows/`

## Environment Management

**Environment files:** Not detected in repository

**Search results:**
- No `.env.example` found
- No `.env.template` found
- No `.env.sample` found

**Environment exclusions:**

From `.gitignore` (lines 13-18):
```
# Environment & Secrets
.env
.env*.local
*.pem
*.key
credentials.json
```

**Detected:** `.env` files and secrets are explicitly excluded from version control.

**Inferred:** No environment variables are required for core CLI/analyzer functionality (likely uses only file system access and tree-sitter).

**Build-time environment:**

From `turbo.json` (lines 35-37):
```json
"globalEnv": [
  "NODE_ENV"
]
```

**Detected:** Only `NODE_ENV` is tracked by Turborepo as a build-affecting variable.

From `.github/workflows/test.yml` (line 7 in turbo.json):
```json
"env": ["NODE_ENV"]
```

**Detected:** `NODE_ENV` affects build cache invalidation.

**Secrets in CI:**

From `.github/workflows/test.yml` (line 50):
```yaml
token: ${{ secrets.CODECOV_TOKEN }}
```

**Detected:** Single CI secret configured — `CODECOV_TOKEN` for coverage uploads.

**Package-specific environment:**

**CLI package:**

**Not detected** — No `.env` usage in CLI code. Configuration appears to be file-system based (reads project files, generates `.ana/` directory).

**Analyzer package:**

**Not detected** — No `.env` usage in analyzer code. Operates on file system analysis only.

**Website package:**

**Not detected** — No `.env.example` in website directory. Next.js app likely uses environment variables for API endpoints or analytics, but not documented in repository.

**Configuration approach:**

**Inferred from codebase structure:**
- **CLI:** File-based configuration (`.ana/` directory structure)
- **Analyzer:** No external configuration required (analyzes source code directly)
- **Templates:** Embedded in CLI package at build time (from `packages/cli/package.json` build script: `cp -r templates dist/`)

**Inferred:** Project prioritizes zero-configuration UX. Users run `ana init` without environment setup. This aligns with target users being "YC founders and vibe coders" who want minimal setup (from Q&A log).

**Secrets management:**

**Detected from .gitignore** (lines 13-18):
- `.env` files excluded
- PEM keys excluded
- `credentials.json` excluded

**Recommended for production:**
- Document any required environment variables in `.env.example`
- Add Codecov token rotation schedule
- Document npm publish token management for maintainers

---

**Development workflow summary:**

1. Clone repository
2. Run `pnpm install` (no `.env` setup needed)
3. Run `pnpm build` to compile all packages
4. Test locally: `cd packages/cli && pnpm link --global`
5. Make changes on feature branch
6. Run `pnpm test` locally
7. Push to `effort/*` or `SideSprint/*` branch
8. CI runs automatically (6 platform combinations)
9. Open PR to `main` when ready
10. Merge after CI passes

**Key workflow characteristics:**

- **Single developer** with structured commit messages
- **Cross-platform testing** (Ubuntu, Windows, macOS × Node 20, 22)
- **Zero environment configuration** for local development
- **Turborepo orchestration** for monorepo builds
- **High test coverage requirements** (80-85%)
- **Side sprint methodology** for experimental work
- **Roadmap-driven development** (STEP-based branches)

---

*Last updated: 2026-03-22*
