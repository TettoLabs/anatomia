# Changelog

All notable changes to anatomia-analyzer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-08

### Added

**Detection:**
- Project type detection (Python, Node.js, Go, Rust, Ruby, PHP)
- Framework detection (18 frameworks)
- Dependency file parsing
- Confidence scoring
- Monorepo detection

**Structure Analysis:**
- Entry point detection (framework-aware)
- Architecture classification (5 types)
- Test location discovery
- Config file mapping
- ASCII directory tree generation

**Code Parsing:**
- Tree-sitter AST parsing (TypeScript, Python, JavaScript, Go)
- Function, class, import extraction
- Decorator detection
- Smart caching with mtime invalidation
- Entry point-based file sampling

**Testing:**
- 312 comprehensive tests
- Performance validation
- Backward compatibility tests
- Cross-platform support (macOS, Linux, Windows)

### Notes

First public release.

[0.1.0]: https://github.com/TettoLabs/anatomia/releases/tag/v0.1.0
