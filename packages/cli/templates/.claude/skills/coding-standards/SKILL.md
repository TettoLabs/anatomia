---
name: coding-standards
description: "Invoke when implementing features, writing code, or reviewing code quality. Contains project-specific naming conventions, error handling patterns, import style, and deviations from standard practices."
---

<!-- ENRICHMENT GUIDE:
  Purpose: Plan includes these rules in spec constraints. Build follows 
  them during implementation. The most impactful skill file — wrong rules 
  here affect every build.
  
  Read: One file with error handling (find via scan's 
  conventions.codePatterns.emptyCatches — if count > 0, read one file 
  from the paths to understand the pattern). Also use scan's 
  conventions.codePatterns for ESM ratio, node prefix ratio, null style.
  
  Look for:
  - Error handling architecture: do commands surface errors differently 
    than library/engine code? Is there a two-layer pattern (surface vs 
    degrade)? Are empty catches intentional graceful degradation?
  - Import patterns: .js extensions (from codePatterns.jsExtensionImports), 
    node: prefix usage (from codePatterns.nodePrefix)
  - Null convention: | null vs ?: vs undefined (from codePatterns.nullStyle)
  - Export style: named vs default (from codePatterns.defaultExports 
    relative to file count)
  
  Contradiction handling (two types):
  
  Type 1 — Rule contradicted by high violation count: 
  If codePatterns.emptyCatches.empty > 10 AND a template rule says 
  "every catch must do something deliberate" — this is a contradiction. 
  Do NOT ask the user. Instead:
  1. Read 1-2 files with empty catches to understand the pattern
  2. Adjust the rule to reflect what the code actually does
  3. Flag it in the summary with ⚠ so the user reviews the adjustment
  
  Type 2 — Rule recommends a pattern not used at all:
  If a template rule recommends a pattern (e.g., "use path aliases") 
  but scan data shows zero or near-zero usage of that pattern (e.g., 
  97% relative imports, 0% alias usage), suppress or remove the rule. 
  Don't keep a rule that pushes Build toward a pattern the project 
  doesn't follow. Flag the removal in the summary.
  
  Write to: ## Rules — modify contradicted rules to be project-specific, 
  remove irrelevant rules, add rules for patterns found in scan data.
  
  Expect: 2-3 rules modified/added, 0-1 rules removed. The generic 
  template rules are mostly correct — adjust the ones that contradict 
  scan data, remove the ones that recommend unused patterns, add 
  rules for strong patterns (>80% ratio in scan).
-->

# Coding Standards

## Detected
<!-- Populated by scan during init. Do not edit manually. -->

## Rules
- Prefer named exports. Default exports only where the framework requires them (e.g., Next.js pages, layouts).
- Use path aliases from tsconfig when configured. Relative imports: never deeper than two levels.
- Avoid `any` — use `unknown` and narrow with type guards. `any` is acceptable only for untyped third-party boundaries. Define an interface for complex types — don't escape the type system.
- Every catch block must do something deliberate: re-throw, return a typed error, or log with context. Empty catch blocks are never acceptable. Intentional graceful degradation — catching a failure and continuing with a fallback — is fine when the degradation is logged and observable.
- Never hardcode API keys, secrets, database URLs, or credentials. Use environment variables or a secrets manager.
- Avoid disabling lint rules inline. When necessary, add a comment explaining why the disable is required.
- Explicit return types on all exported functions. Internal helpers can use inference.

## Gotchas
*Not yet captured. Add as you discover them during development.*

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
