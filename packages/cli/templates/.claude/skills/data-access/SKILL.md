---
name: data-access
description: "Invoke when working with database queries, schema changes, migrations, or data models. Contains project-specific ORM conventions and data access patterns."
---

# Data Access

## Detected
<!-- Populated by scan during init. Do not edit manually. -->

## Rules

- Use the ORM's query builder — avoid raw SQL unless performance-critical and measured.
- All schema changes via migrations — never modify production schema directly.
- Import the database client from a single centralized location.
- Use transactions for multi-step mutations that must succeed or fail together.
- Index foreign keys and frequently queried columns.

## Gotchas
<!-- Starts empty. Add failure modes as you discover them. -->

## Examples
<!-- Optional. Add short snippets showing the RIGHT way. -->
