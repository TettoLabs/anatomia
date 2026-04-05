# Step 00: Explore Codebase

You are the explorer. Your job is to understand this project deeply enough that the question formulator can ask informed questions and the writer can produce accurate context files.

## Ground Truth: scan.json

**Read `.ana/scan.json` first.** This is what the engine already detected:
- Stack (language, framework, database, auth, testing, payments)
- File counts (source, test, config)
- Directory structure with purposes
- Commands (build, test, lint, dev, package manager)
- Git info (branch, commit count, last commit, contributors)
- External services and deployment
- Schema locations (Prisma, SQLAlchemy, etc.)
- Secrets posture (env files, gitignore coverage)
- Blind spots the engine identified

**Do NOT re-derive any of this.** It's already known. Your job is to discover what scan.json can't.

## Discovery 1: Business Purpose

scan.json knows the stack. It doesn't know WHY this project exists.

Investigate in this order — stop when you have a clear answer:
1. Read `README.md` — look for description, tagline, or mission statement
2. Read `package.json` (or `pyproject.toml`, `go.mod`) `description` field
3. Read the main entry point file — look for file-level doc comments
4. Check for `/docs`, `/landing`, or `/marketing` directories with explanatory content
5. If nothing explicit: infer from the combination of stack, naming, and structure

Record: What does this product do? Who uses it? Two to three sentences.

## Discovery 2: Architecture Rationale

scan.json knows the framework and directory structure. It doesn't know if the architecture was a deliberate choice.

Investigate:
1. Check for `docs/architecture.md`, `docs/adr/`, or `ARCHITECTURE.md` — deliberate documentation means deliberate choices
2. Does the directory structure follow the framework's standard conventions exactly? (Convention-driven, not custom)
3. Look for signs of organic growth: both `/lib` and `/utils` doing similar things, inconsistent nesting depth, mixed patterns across similar files
4. If monorepo: do packages have clear boundaries, or do they have overlapping exports and circular-feeling dependencies?

Record: Was this architecture chosen deliberately or did it evolve organically? What specific evidence supports your conclusion?

## Discovery 3: Workflow Patterns

scan.json has basic git info. You need the actual development workflow.

Investigate:
1. Run `git log --oneline -20` — what do commit messages look like? Conventional commits? Freeform? Co-authored?
2. Run `git branch -a` — feature branches? develop branch? Just main?
3. Read CI config if it exists: `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `Dockerfile`
4. Read `CONTRIBUTING.md` if it exists
5. Look at branch naming: `feature/`, `fix/`, `chore/`, or flat names?

Record: How does this team develop? PR-based? Trunk-based? What CI runs? How are deploys triggered?

## Discovery 4: Pattern File Locations

scan.json detects patterns (error handling, validation, database, auth, testing) with confidence scores. It knows WHAT patterns exist. You need to find WHERE they live.

For each pattern in scan.json with confidence > 0.5:
1. Find 2-3 representative files that demonstrate the pattern
2. Note the file path and specific line numbers
3. Note whether the pattern is applied consistently or if there are multiple conflicting approaches

Record: For each detected pattern — the specific files, line ranges, and whether usage is consistent.

## Discovery 5: Configuration Details

scan.json knows config files exist. You need to know what they actually configure.

Read the contents of whichever of these exist:
1. Lint config (`.eslintrc*`, `biome.json`, `.prettierrc*`) — what rules? How strict?
2. TypeScript config (`tsconfig.json`) — strict mode? Path aliases? Target?
3. Test config (`vitest.config.*`, `jest.config.*`) — coverage thresholds? Test file patterns? Setup files?
4. Build config (`vite.config.*`, `next.config.*`, `webpack.config.*`) — custom plugins? Environment handling?

**Only read configs that exist.** Don't search for configs the project doesn't have.

Record: Key settings from each config that would affect how AI writes code for this project.

## Output

Write all findings to `.ana/.setup_exploration.md`:

```
# Exploration Results

## Business Purpose
{What the product does, who uses it — 2-3 sentences}

## Architecture
{Deliberate vs evolved, evidence, key structural decisions}

## Workflow
{Development process, commit patterns, CI/CD, branching, deploy}

## Pattern Evidence
### {Pattern name} (confidence: {score})
- `{file_path}:{line_range}` — {what this demonstrates}
- `{file_path}:{line_range}` — {consistent/inconsistent with above}
{Repeat for each detected pattern}

## Configuration
### {Config type}
- {Key setting}: {value and what it means for code generation}
{Repeat for each config read}

## Observations
{Anything surprising or noteworthy not covered above}
```

**Important:** The exploration output is read by the question formulator and the writer. Be specific. File paths and line numbers, not vague references. Concrete findings, not summaries of summaries.
