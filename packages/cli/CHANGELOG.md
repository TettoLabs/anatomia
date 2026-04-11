# Changelog

All notable changes to anatomia-cli will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### S18 — Cleanup Sprint

- **Breaking:** `ana mode <name>` and the modes system (architect/code/debug/docs/test) removed. Superseded by the four-agent pipeline (Ana → AnaPlan → AnaBuild → AnaVerify).
- **Added:** `AGENTS.md` generation alongside `CLAUDE.md` — cross-tool support for Cursor, Copilot, Windsurf, Codex, and Claude Code.
- **Added:** 5 pre-populated gotchas on fresh `ana init` with compound triggers (Vitest watch-mode, Next.js server components, Prisma generate, Drizzle push, Next+Supabase server client).
- **Added:** `ARCHITECTURE.md` + rewritten `CONTRIBUTING.md` with step-by-step extension guides (framework detectors, gotchas, services, skill templates).
- **Added:** Husky pre-commit hook + GitHub Actions CI matrix (Ubuntu/macOS/Windows × Node 20/22). Strict TypeScript enforced at build + commit + CI.

### S17 — Setup Enrich + Complete

- `ana setup` Phase 2: project-context enrichment via 6 guess-and-correct questions.
- `ana setup` Phase 3: design-principles capture in the founder's own words.
- `ana setup complete` validation gate and `setupMode` state machine.

### S16 — Setup Confirm

- `ana setup` Phase 1: user confirms detected stack before scaffolding.
- `ana setup check` redesign: ✓/○/✗ dashboard with contradiction detection in context files.

### S15 — Init Pipeline

- `ana.json` project metadata (stack, commands, git branch, setup state).
- Conditional skill scaffolding — only skills relevant to the detected stack get created.
- `ana scan --save` writes full scan output to `.ana/scan.json` for agent consumption.
- `ana scan` overhaul: added `--quick` / `--quiet` / `--save`, removed `--deep` (deep analysis is now the default).

### S14 — Scan Engine

- Unified `EngineResult` schema — one typed shape consumed by every display surface (terminal, JSON, `.ana/scan.json`, `CLAUDE.md`, `AGENTS.md`, skill Detected sections).
- `deployment` and `git` are now always-present top-level fields in scan output.

### S13 — Vault Foundations

- **Breaking:** skill and context layout redesigned. 5 core skills (coding-standards, testing-standards, git-workflow, deployment, troubleshooting) + 3 conditional (ai-patterns, api-patterns, data-access). Context files reduced from 7 to 2 (`project-context.md`, `design-principles.md`).

### S12 — The Prove It Sprint

- Four-agent pipeline (Ana → AnaPlan → AnaBuild → AnaVerify) validated end-to-end on a real feature: 19/19 contract assertions satisfied. First completed dogfood run producing a full proof chain entry.

## [0.2.0] - 2026-03-20

### Added

- **Analyzer integration:** `ana init` now runs analyzer automatically, pre-populates scaffolds with detected patterns/conventions
- **analysis.md:** Auto-generated analysis brief from analyzer
- **7 context scaffolds:** Pre-populated context files (40-70% complete before setup)
- **Setup mode:** New `ana setup complete` command validates context files
- **.meta.json:** Framework metadata tracking
- **snapshot.json:** Analyzer baseline for drift detection (STEP 3)
- **--force flag:** Preserves .state/ when recreating .ana/
- **--skip-analysis flag:** Create empty scaffolds if analyzer fails
- **general mode:** Quick questions and orientation mode
- **setup mode:** First-run setup experience

### Changed

- **`ana init` completely rewritten:** No prompts, deterministic, scriptable
- **Template system:** Handlebars replaced with static files + TypeScript template literals
- **ENTRY.md generation:** Moved from init to `ana setup complete` (after validation)
- **Performance:** Init now <20s (includes 10-15s analyzer run)

### Removed

- **Interactive prompts:** No inquirer, no questions during init
- **Handlebars templates:** Replaced with static markdown files
- **node.json:** Replaced by .meta.json
- **-y, --yes flag:** Init is now always non-interactive

### Breaking Changes

- `ana init` behavior completely changed (no prompts, runs analyzer)
- Old .ana/ structures incompatible (use `ana init --force` to recreate)
- ENTRY.md generation moved to `ana setup complete`

### Migration

See README.md "Migration from v0.1.0" section.

---

## [0.1.0] - 2026-03-08

### Added

**Commands:**
- `ana init` - Initialize .ana/ context folder with templates
- `ana analyze` - Detect project type, framework, and structure
- `ana mode <name>` - Display mode file information
- `ana --version` - Show CLI version
- `ana --help` - Show command help

**Templates:**
- 5 mode files (architect, code, debug, docs, test)
- 3 context files (main, patterns, conventions)
- ENTRY.md orientation file
- node.json project metadata
- Handlebars-based dynamic generation

**Features:**
- Cross-platform support (macOS, Linux, Windows)
- Framework-aware detection via anatomia-analyzer
- Professional template system
- Mode boundaries for focused work

### Notes

First public release focused on detection engine and template system.

[0.1.0]: https://github.com/TettoLabs/anatomia/releases/tag/v0.1.0
