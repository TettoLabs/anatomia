---
name: api-patterns
description: "Invoke when implementing API routes, request handling, middleware, or error responses. Contains validation, error format, route architecture, and authorization patterns."
---

# API Patterns

## Detected
<!-- Populated by scan during init. Do not edit manually. -->

## Rules
- Validate all input at the API boundary. Parse request bodies, query params, and path params with the project's validation library before any processing.
- Return a consistent error response shape from every endpoint. Never leak stack traces, database errors, or internal paths in production responses.
- Keep route handlers thin. Validation, then service call, then response. Business logic and data access belong in separate modules.
- Verify the requesting user owns the requested resource. An authenticated user should not access another user's data by changing an ID in the URL.

## Gotchas
*Not yet captured. Add as you discover them during development.*

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
