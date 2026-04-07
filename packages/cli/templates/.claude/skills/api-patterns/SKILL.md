---
name: api-patterns
description: "Invoke when implementing API routes, request handling, middleware, or error responses. Contains project-specific API conventions and patterns."
---

# API Patterns

## Detected
<!-- Populated by scan during init. Do not edit manually. -->

## Rules

- Consistent error response format across all endpoints — same shape for 400s, 404s, 500s.
- Validate all input at the boundary — never trust client data past the route handler.
- Use middleware for cross-cutting concerns: auth, logging, CORS, rate limiting.
- Route handlers should be thin — extract business logic into service functions.
- Return appropriate HTTP status codes. Not everything is 200 or 500.

## Gotchas
<!-- Starts empty. Add failure modes as you discover them. -->

## Examples
<!-- Optional. Add short snippets showing the RIGHT way. -->
