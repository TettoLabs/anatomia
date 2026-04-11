---
name: coding-standards
description: "Invoke when implementing features, writing code, or reviewing code quality. Contains project-specific naming conventions, error handling patterns, import style, and deviations from standard practices."
---

# Coding Standards

## Detected
- Language: TypeScript (118 source files)
- Functions: camelCase (96%, 220 sampled)
- Classes: PascalCase (100%)
- Files: lowercase (82%, 50 sampled)
- Imports: relative (100%)
- Indentation: spaces, 2 wide
- Error handling: exceptions (generic)

## Rules

- Use camelCase for functions and variables. PascalCase for classes, React components, and type names.
- Prefer named exports over default exports.
- Use path aliases when configured (e.g., `@/lib`). Relative imports should not go deeper than two levels (`../../`).
- Handle errors explicitly — never silently catch and ignore. Re-throw or log with context.
- Use `const` by default. Use `let` only when reassignment is genuinely needed.

## Gotchas
*Not yet captured. Add as you discover them during development.*

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
