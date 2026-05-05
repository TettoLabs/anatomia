# Changelog

All notable changes to [anatomia-cli](https://www.npmjs.com/package/anatomia-cli) are documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

## [1.0.2] - 2026-05-05

### Fixed
- Fix parseACResults regex — scope to AC Walkthrough section only, preventing false PASS/FAIL matches from Findings bullets (3/44 proof chain entries had inflated counts)
- Normalize staleness detector confidence by file touch frequency — reduces false positives from 78% to ~40% on hot files
- Collapse dual FAIL guard in work.ts to single shared helper
- Unify recovery-path finding count with computeChainHealth
- Delete hardcoded zero-run defaults in favor of calling computeFirstPassRate
- Extract shared exitError factory across close/promote/strengthen subcommands
- Extract and apply summary truncation helper consistently
- Fix Learn template — remove "pre-classified for closure" language that caused batch-closing

### Added
- `ana proof lesson` command — record findings as institutional lessons (verified but not actionable)
- Audit headline now shows actionable vs monitoring split (e.g., "24 actionable, 48 monitoring")

## [1.0.1] - 2026-05-04

### Fixed
- Eliminate command injection via unvalidated slugs in artifact, pr, proof, and work complete commands
- Validate artifactBranch and branchPrefix from ana.json against shell metacharacters
- Migrate all git command execution from execSync to spawnSync array arguments
- Add findProjectRoot containment check — require .git alongside .ana/ana.json
- Strip control characters from coAuthor config values
- Add version/tag and CHANGELOG verification gates to release workflow
- Fix CHANGELOG 1.0.0 release date
- Update project metadata to reflect npm publication
- Refresh dogfood scan from clean main branch
- Remove internal development history from public repository

## [1.0.0] - 2026-05-04

First stable release.

### Added

#### Scan engine
- 40+ framework, database, auth, testing, and service detectors
- Convention analysis: naming, imports, indentation across 5 categories
- Pattern inference: error handling, validation, database, auth, testing
- Application shape classification (cli, web-app, api-server, library, and 5 more)
- Two-tier scanning: surface (dependency-based) and deep (tree-sitter AST)
- Git intelligence: activity, churn, hooks, commit format, contributors

#### Context generation
- `CLAUDE.md` and `AGENTS.md` for cross-tool AI consumption
- 5 core + 3 conditional skill templates with scan-driven Detected sections
- Project-context and design-principles scaffolds
- 16 stack-specific gotchas with compound triggers
- Idempotent init: re-run refreshes scan data, preserves user content

#### Pipeline
- Four-agent pipeline: Think, Plan, Build, Verify
- Sealed contracts with typed assertions (equals, contains, exists, greater, truthy, not_equals, not_contains)
- Hash-verified artifact saves with atomic commits
- Branch-aware pipeline state tracking
- PR creation from verified builds

#### Proof chain
- One entry per pipeline run: assertions, findings, timing, hashes
- Quality trajectory via `ana proof health`
- Finding lifecycle: active, closed, promoted, lesson
- Finding-to-rule promotion via `ana proof promote`
- Staleness detection via `ana proof stale`
- Severity classification: risk, debt, observation
- Active findings audit via `ana proof audit`
- File-scoped context queries via `ana proof context`

#### Learn agent
- Severity-based triage between pipeline cycles
- Pattern promotion to skill rules
- Think handoff for scope-worthy findings

#### Setup
- Guess-and-confirm enrichment via Claude Code agent
- Phase-tracked state with resume support
- Context file validation via `ana setup check`

#### Infrastructure
- CI: 3 OS (Ubuntu, macOS, Windows) x 2 Node versions (20, 22)
- Pre-commit hooks: typecheck + lint
- Atomic init with crash-safe rollback

---

Previous development history is preserved in git log.

[Unreleased]: https://github.com/TettoLabs/anatomia/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/TettoLabs/anatomia/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/TettoLabs/anatomia/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/TettoLabs/anatomia/releases/tag/v1.0.0
