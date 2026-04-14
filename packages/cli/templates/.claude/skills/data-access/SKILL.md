---
name: data-access
description: "Invoke when working with database queries, schema changes, migrations, or data models. Contains project-specific ORM conventions and data access patterns."
---

# Data Access

## Detected
<!-- Populated by scan during init. Do not edit manually. -->

## Rules
- Import the database client from a single shared module. Never instantiate a new client in route handlers or service functions — each instance opens its own connection pool.
- Wrap multi-step mutations in a transaction. If any step can fail, partial writes corrupt data — all steps succeed or all roll back.
- Use eager loading or joins for related data. Never query the database inside a loop — each iteration is a separate round trip.
- Select only the fields you need. Avoid fetching entire records when the consumer needs a few columns.

## Gotchas
*Not yet captured. Add as you discover them during development.*

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
