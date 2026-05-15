---
name: Deferred major dependency bumps
description: glob 10→13, typescript 5→6, web-tree-sitter 0.25→0.26 deferred as of 2026-05-12 with rationale and triggers for revisiting
type: project
---

Major version bumps deferred during hygiene-debt-cleanup scope (2026-05-12). Safe semver-only `pnpm update` was done instead.

- **glob 10→13:** Used throughout the codebase. API changes likely. Only bump when a feature requires glob 13 APIs, or when minimatch transitives can no longer be patched within 10.x range.
- **typescript 5→6:** Just released. Too early for production CLI tooling. Revisit after 6.x stabilizes (~3-6 months).
- **web-tree-sitter 0.25→0.26:** Could break WASM loading in the deep scanner. Only bump when the deep scanner needs features from 0.26, or 0.25 reaches EOL.

**Why:** None of these are motivated by exploitable vulnerabilities in a CLI processing local developer files. The regression risk outweighs the noise reduction.

**How to apply:** If future Dependabot alerts reference these packages, check whether the alert is still within the deferred rationale. If a new CVE is actually exploitable in CLI context (not just ReDoS on untrusted input), that changes the calculus.
