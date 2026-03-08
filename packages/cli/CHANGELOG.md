# Changelog

All notable changes to anatomia-cli will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
