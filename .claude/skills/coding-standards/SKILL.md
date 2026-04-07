---
name: coding-standards
description: "Invoke when implementing features, writing code, or reviewing code quality. Contains project-specific naming conventions, error handling patterns, import style, and deviations from standard practices."
---

# Coding Standards

## Detected
<!-- Populated by scan during init. Do not edit manually. -->

## Rules

- Use camelCase for functions and variables. PascalCase for classes, React components, and type names.
- Prefer named exports over default exports.
- Use path aliases when configured (e.g., `@/lib`). Relative imports should not go deeper than two levels (`../../`).
- Handle errors explicitly — never silently catch and ignore. Re-throw or log with context.
- Use `const` by default. Use `let` only when reassignment is genuinely needed.

## Gotchas
<!-- Starts empty. Add failure modes as you discover them. -->

## Examples
<!-- Optional. Add short snippets showing the RIGHT way. -->
