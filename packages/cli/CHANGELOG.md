# Changelog

All notable changes to anatomia-cli will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
