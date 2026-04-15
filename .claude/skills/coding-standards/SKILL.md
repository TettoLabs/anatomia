---
name: coding-standards
description: "Invoke when implementing features, writing code, or reviewing code quality. Contains project-specific naming conventions, error handling patterns, import style, and deviations from standard practices."
---

# Coding Standards

## Detected
- Language: TypeScript (120 source files)
- Functions: camelCase (95%, 355 sampled)
- Classes: PascalCase (44%)
- Files: camelCase (36%, 121 sampled)
- Imports: relative (97%)
- Indentation: spaces, 2 wide
- Error handling: exceptions (generic)

## Rules
- Prefer named exports. Default exports only where the framework requires them (e.g., Next.js pages, layouts).
- Use path aliases from tsconfig when configured. Relative imports: never deeper than two levels.
- Never use `any`. Use `unknown` and narrow with type guards. Define an interface for complex types — don't escape the type system.
- Never swallow errors. Every catch must re-throw, return a typed error, or log with context. No empty catch blocks.
- Never hardcode API keys, secrets, database URLs, or credentials. Use environment variables or a secrets manager.
- Never disable lint rules inline. Fix the code, not the linter.
- Explicit return types on all exported functions. Internal helpers can use inference.

## Gotchas
*Not yet captured. Add as you discover them during development.*

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
