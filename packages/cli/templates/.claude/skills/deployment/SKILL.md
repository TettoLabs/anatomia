---
name: deployment
description: "Invoke when working on deployment configuration, CI/CD pipelines, environment variables, or release processes. Contains project-specific deploy platform conventions."
---

# Deployment

## Detected
<!-- Populated by scan during init. Do not edit manually. -->

## Rules

- Environment variables via platform config or `.env` files — never hardcode secrets or config values.
- Preview deploys on pull requests when the platform supports it.
- Production deploys only from the default branch.

## Gotchas
<!-- Starts empty. Add failure modes as you discover them. -->

## Examples
<!-- Optional. Add short snippets showing the RIGHT way. -->
