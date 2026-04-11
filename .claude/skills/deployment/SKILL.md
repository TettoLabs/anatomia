---
name: deployment
description: "Invoke when working on deployment configuration, CI/CD pipelines, environment variables, or release processes. Contains project-specific deploy platform conventions."
---

# Deployment

## Detected
- CI: GitHub Actions
- CI config: .github/workflows/test.yml

## Rules

- Environment variables via platform config or `.env` files — never hardcode secrets or config values.
- Production deploys only from the default branch.
- Agents never perform irreversible external actions (deploy to production, publish packages, send to real users, modify infrastructure) without explicit human approval.

## Gotchas
*Not yet captured. Add as you discover them during development.*

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
