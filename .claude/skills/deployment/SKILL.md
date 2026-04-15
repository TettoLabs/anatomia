---
name: deployment
description: "Invoke when working on deployment configuration, CI/CD pipelines, environment variables, or release processes. Contains project-specific deploy platform conventions."
---

# Deployment

## Detected
- CI: GitHub Actions

## Rules
- CI runs on 3 OS × 2 Node versions (ubuntu, windows, macos × Node 20, 22) with `fail-fast: false`. All 6 combinations must pass — a fix that works on Ubuntu but fails on Windows is not done. Use `path.join()` and `os.tmpdir()` instead of hardcoded `/` separators for cross-platform compatibility.
- CI pipeline order: build (includes source typecheck) → typecheck tests → lint → test. If CI fails, check the FIRST failing step — later steps may cascade from an earlier failure. A type error in build will cause test failures downstream.

## Gotchas
- Windows path separators cause CI failures. The CI matrix includes `windows-latest` — any test using hardcoded `/` in file paths will fail on Windows only. Use `path.join()` and `path.sep` instead. The failure shows up ONLY in the Windows matrix row, not Ubuntu or macOS.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
