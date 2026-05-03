# Spec: V1 Documentation Overhaul

**Created by:** AnaPlan
**Date:** 2026-05-03
**Scope:** .ana/plans/active/v1-documentation-overhaul/scope.md

## Approach

Four documents rewritten to publication-grade. One package.json script change. One gitignore created. Zero production code changes. Zero test changes.

The three requirements files are the detailed spec for document content:
- `../../anatomia_reference/v1_Release/README_REQUIREMENTS.md` — section-by-section structure, badges, voice rules
- `../../anatomia_reference/v1_Release/CHANGELOG_REQUIREMENTS.md` — Keep a Changelog format, 1.0.0 entry structure
- `../../anatomia_reference/v1_Release/CONTRIBUTING_ARCHITECTURE_REQUIREMENTS.md` — broken paths, line number policy, pipeline rewrite

Read each requirements file in full before writing the corresponding document. The requirements contain reviewer consensus, voice rules, and acceptance criteria that override any assumptions.

**Voice standard:** Ruff's structure at np's density with Anatomia's voice. Technical, declarative, low-adjective. No hedge words. No emoji. No sprint jargon. Every character earns its place.

## Output Mockups

### README.md (root) — section order

```
# Anatomia
[badges: CI, npm, license]

[2-3 sentence description]

## Install
## Quick start
## What it does
### Scan + init
### The pipeline
### Proof intelligence
## Commands
### Scan and init
### Pipeline
### Proof intelligence
### Setup
## Works with
## Development
## License
```

### CHANGELOG.md (root) — structure

```
# Changelog

All notable changes to [anatomia-cli](...) are documented in this file.

Format: [Keep a Changelog](...)
Versioning: [Semantic Versioning](...)

## [Unreleased]

## [1.0.0] - 2026-05-XX

First stable release.

### Added

#### Scan engine
[items]

#### Context generation
[items]

#### Pipeline
[items]

#### Proof chain
[items]

#### Learn agent
[items]

#### Setup
[items]

#### Infrastructure
[items]

---

Previous development history is preserved in git log.

[Unreleased]: https://github.com/TettoLabs/anatomia/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/TettoLabs/anatomia/releases/tag/v1.0.0
```

### prepublishOnly script (packages/cli/package.json)

```
"prepublishOnly": "cp ../../README.md ./README.md && cp ../../CHANGELOG.md ./CHANGELOG.md && pnpm build && pnpm test"
```

## File Changes

### /README.md (modify — rewrite)
**What changes:** Complete rewrite from 21 lines to 150-200 lines. 9 sections in specified order.
**Pattern to follow:** README_REQUIREMENTS.md section spec — follow it exactly.
**Why:** Current README is 21 lines, has no install section, no commands, no substance. Strangers bounce.

### /CHANGELOG.md (modify — rewrite)
**What changes:** Replace sprint-numbered history with Keep a Changelog 1.1.0 format. Single 1.0.0 entry grouped by product surface.
**Pattern to follow:** CHANGELOG_REQUIREMENTS.md — the 1.0.0 entry structure is written out.
**Why:** Current changelog references deleted features and uses sprint numbers meaningful to nobody.

### /CHANGELOG-internal.md (create)
**What changes:** Archive of the current root CHANGELOG.md content. Add header explaining it's internal development history.
**Pattern to follow:** CHANGELOG_REQUIREMENTS.md Item 4 specifies the header format.
**Why:** Preserves team development journal without shipping it to strangers.

### packages/cli/CONTRIBUTING.md (modify)
**What changes:** Fix broken paths, remove line numbers, replace sprint jargon, fix test commands, update project structure tree.
**Pattern to follow:** CONTRIBUTING_ARCHITECTURE_REQUIREMENTS.md Items 7-10.
**Why:** 14 stale line numbers, 3 broken paths, 10+ sprint references. A stranger following these guides hits dead ends.

### packages/cli/ARCHITECTURE.md (modify)
**What changes:** Rewrite data flow section to census-based pipeline, fix module counts, remove deleted feature references, deduplicate extension guides, update known debt.
**Pattern to follow:** CONTRIBUTING_ARCHITECTURE_REQUIREMENTS.md Items 11-15, especially the 12-step census flow.
**Why:** Describes a deleted `analyze()` pipeline. Fundamental mismatch with actual code.

### packages/cli/package.json (modify)
**What changes:** Update `prepublishOnly` script to copy README.md and CHANGELOG.md from root before build.
**Pattern to follow:** README_REQUIREMENTS.md build step section.
**Why:** npm shows whatever README/CHANGELOG is in the package directory. Without the copy, npm page shows nothing useful.

### packages/cli/.gitignore (create)
**What changes:** New file with entries for README.md and CHANGELOG.md (build artifacts copied from root).
**Pattern to follow:** README_REQUIREMENTS.md gitignore section.
**Why:** Without gitignore, the copied files get tracked and create merge conflicts.

### packages/cli/README.md (delete from git)
**What changes:** `git rm packages/cli/README.md` — removed from tracking. Will be recreated by prepublishOnly at build time.
**Pattern to follow:** README_REQUIREMENTS.md file mechanics.
**Why:** The root README is canonical. The CLI copy is a build artifact.

### packages/cli/CHANGELOG.md (delete from git)
**What changes:** `git rm packages/cli/CHANGELOG.md` — removed from tracking. Will be recreated by prepublishOnly at build time.
**Pattern to follow:** CHANGELOG_REQUIREMENTS.md Item 5.
**Why:** Redundant with root. The root is canonical.

## Acceptance Criteria

- [ ] AC1: Root README.md exists, 150-200 lines, 9 sections in specified order, 3 badges (CI, npm, license), install section present, commands grouped by product surface with all proof subcommands visible, scan ASCII block updated, Claude Code boundary stated
- [ ] AC2: Root CHANGELOG.md exists with 1.0.0 entry following Keep a Changelog 1.1.0 format, opens with "First stable release.", grouped by product surface, `[Unreleased]` section above, footer compare links, zero references to deleted features
- [ ] AC3: Old changelog archived as CHANGELOG-internal.md with internal history header
- [ ] AC4: CONTRIBUTING.md has zero line-number citations, zero sprint references, zero broken file paths, all test commands use `pnpm vitest run`, project structure tree matches actual filesystem including ENRICHMENT.md files
- [ ] AC5: ARCHITECTURE.md data flow section describes census-based `scanProject()` pipeline, `analyze()` not mentioned, `detectors/monorepo.ts` not mentioned, file/module counts match reality, extension guides deduplicated with cross-ref to CONTRIBUTING
- [ ] AC6: `prepublishOnly` in packages/cli/package.json copies both README.md and CHANGELOG.md from root before build
- [ ] AC7: packages/cli/README.md and packages/cli/CHANGELOG.md are in packages/cli/.gitignore and deleted from git tracking
- [ ] AC8: Zero emoji in any of the four documents
- [ ] AC9: Zero sprint references across all four documents
- [ ] AC10: Zero hedge words in README
- [ ] AC11: CONTRIBUTING.md opens with cross-reference to ARCHITECTURE.md, and vice versa
- [ ] AC12: No build errors after package.json change
- [ ] AC13: `files` array in package.json includes `README.md` and `CHANGELOG.md` (so npm pack includes them)

## Testing Strategy

No automated tests for this scope. Verification is structural:

- **Line count:** `wc -l README.md` must be 150-200
- **Section order:** grep for `## ` headings in README, verify 9 sections in order
- **Hedge words:** `grep -iE "simply|just|easily|helps you|allows you to|enables|powerful|robust|comprehensive" README.md` must return nothing
- **Sprint references:** `grep -E "S1[0-9]|S2[0-9]|Item [0-9]" README.md CHANGELOG.md packages/cli/CONTRIBUTING.md packages/cli/ARCHITECTURE.md` must return nothing
- **Emoji:** `grep -P "[\x{1F300}-\x{1F9FF}]" README.md` must return nothing (repeat for all 4 docs)
- **Deleted features:** `grep -iE "mode|analysis\.md|handlebars|anatomia-analyzer|ENTRY\.md|\.meta\.json|snapshot\.json" CHANGELOG.md` must return nothing
- **File existence:** `ls packages/cli/.gitignore` succeeds
- **Git tracking:** `git ls-files packages/cli/README.md packages/cli/CHANGELOG.md` returns nothing (untracked/ignored)
- **npm pack check:** `cd packages/cli && npm pack --dry-run 2>&1 | grep -E "README|CHANGELOG"` shows both files

## Dependencies

- The three requirements files must exist at `../../anatomia_reference/v1_Release/`
- No code dependencies. All changes are markdown + one JSON line.

## Constraints

- Zero production code changes. Zero test changes. Only markdown and package.json.
- Line numbers must NOT appear in CONTRIBUTING.md or ARCHITECTURE.md — use symbol names.
- The README scan ASCII block should represent realistic output from `formatHumanReadable()`. Read the current format function to understand the output shape, then write a representative example (don't run the actual command on an external project).
- CHANGELOG numbers must use verified counts: 40+ detectors (verified: 24 files with 30+ detection functions), 5 core + 3 conditional skills, 16 gotchas.

## Gotchas

- **CONTRIBUTING.md conventions path:** The scope says "conventions/: 5 files" but the actual path is `src/engine/analyzers/conventions/` not `src/engine/conventions/`. The ARCHITECTURE.md must use the correct path.
- **Do NOT add pnpm/yarn alternatives to README.** One package manager. Developers translate.
- **Do NOT include a tagline.** "Ship with proof" belongs on the website.
- **The prepublishOnly must copy files BEFORE `pnpm build`.** The order matters for `npm pack --dry-run` testing.
- **ENRICHMENT.md files exist in every skill directory.** The project structure tree in CONTRIBUTING.md must show them alongside SKILL.md.
- **`packages/cli/.gitignore` does not exist yet.** Create it fresh — don't assume it exists.
- **`files` array in package.json currently includes CHANGELOG.md but not README.md.** Add README.md to the `files` array so `npm pack` explicitly includes it (belt-and-suspenders alongside npm's auto-include).
- **The sampling directory exists:** `src/engine/sampling/proportionalSampler.ts` — must be listed in ARCHITECTURE.md module layout.
- **`applicationShape.ts`, `documentation.ts`, `readme.ts` are top-level detectors** (not in node/ or python/ subdirs). ARCHITECTURE.md module layout must list them correctly.
- **Use relative links between CONTRIBUTING.md and ARCHITECTURE.md** — they live in the same directory (`packages/cli/`). `[ARCHITECTURE.md](ARCHITECTURE.md)` not absolute GitHub URLs.

## Build Brief

### Rules That Apply
- No emoji in any output file
- Every character earns its place — no slop, no hedge words, no filler sentences
- Finished means a stranger can extend it — the contributor docs must be followable cold
- The elegant solution removes — deduplicate extension guides between the two contributor docs
- ESM imports with `.js` extension (relevant only if any code examples appear in contributor docs)
- `pnpm vitest run` for test commands (never `pnpm test` alone — hangs in watch mode)

### Pattern Extracts

**Current prepublishOnly (packages/cli/package.json line 49):**
```json
"prepublishOnly": "pnpm build && pnpm test"
```

**Current `files` array (packages/cli/package.json lines 34-40):**
```json
"files": [
  "dist",
  "docs",
  "ARCHITECTURE.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md"
],
```

**Verified module counts for ARCHITECTURE.md:**
- `src/commands/init/`: 7 files — index.ts, types.ts, preflight.ts, assets.ts, state.ts, skills.ts, anaJsonSchema.ts
- `src/engine/analyzers/conventions/`: 5 files — codePatterns.ts, imports.ts, indentation.ts, index.ts, naming.ts
- `src/engine/detectors/node/`: 6 detectors + framework-registry.ts — express.ts, nestjs.ts, nextjs.ts, other.ts, react.ts, remix.ts
- `src/engine/sampling/`: 1 file — proportionalSampler.ts
- Top-level detectors: applicationShape.ts, commands.ts, dependencies.ts, deployment.ts, documentation.ts, framework.ts, git.ts, go.ts, packageManager.ts, projectType.ts, readme.ts, rust.ts
- Python detectors: cli.ts, django.ts, fastapi.ts, flask.ts, framework-registry.ts

**Skills (from constants.ts):**
- Core (5): coding-standards, testing-standards, git-workflow, deployment, troubleshooting
- Conditional (3): ai-patterns (triggered by aiSdk), api-patterns (triggered by framework), data-access (triggered by database)
- All 8 directories contain both SKILL.md and ENRICHMENT.md

**Engine directory structure:**
```
src/engine/
  analyzers/
    conventions/   (5 files)
    patterns/
    structure/
  cache/
  detectors/
    node/          (6 + registry)
    python/        (4 + registry)
    [12 top-level .ts files]
  findings/
    rules/
  parsers/
    node/
    python/
  sampling/        (proportionalSampler.ts)
  types/
  utils/
```

### Proof Context

No active proof findings for affected files (all changes are documentation).

### Checkpoint Commands

- After prepublishOnly change: `cd packages/cli && node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log(p.scripts.prepublishOnly)"` — Expected: shows the new script with cp commands
- After all doc changes: `grep -cE "S1[0-9]|S2[0-9]|Item [0-9]" README.md CHANGELOG.md packages/cli/CONTRIBUTING.md packages/cli/ARCHITECTURE.md` — Expected: 0 for each file
- After all changes: `wc -l README.md` — Expected: 150-200
- Lint: `pnpm run lint` (should pass — no source changes)

### Build Baseline
- Current tests: not relevant (zero test changes in this scope)
- Command used: n/a
- After build: same test count (no test files created or modified)
- Regression focus: none — docs only scope
