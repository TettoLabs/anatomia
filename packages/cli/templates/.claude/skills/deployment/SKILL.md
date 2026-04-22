---
name: deployment
description: "Invoke when working on deployment configuration, CI/CD pipelines, environment variables, or release processes. Contains project-specific deploy platform conventions."
---

<!-- ENRICHMENT GUIDE:
  Purpose: Build and Verify read this for CI/CD constraints. Plan 
  references it when specs touch deployment.
  
  INVESTIGATION (silent, before questions):
  Read CI workflow files. Check deployment.ci in scan.json for the CI 
  system. If GitHub Actions: read .github/workflows/*.yml. If GitLab: 
  read .gitlab-ci.yml. Extract:
  - CI matrix dimensions (OS × Node/Python versions)
  - Pipeline step order (build → test → lint → deploy)
  - Triggers (push to main, PR, manual)
  - Required checks before merge
  Also check deployment.platform — if Vercel/Netlify/Docker detected,
  note the platform constraints.
  
  QUESTION (asked during skill gate, loaded with investigation):
  Present what you found from CI parsing, then ask:
  "How does code reach production — push to main goes live, or do 
  you have staging/preview?" This fills the gap between what's in 
  the repo and how the team actually deploys.
  
  For CLI/library projects (applicationShape: cli or library):
  Deployment = CI + npm publish. No server deployment. The question 
  becomes: "Is there a release process, or do you publish manually?"
  
  Write to: ## Rules — CI pipeline rules from investigation + 
  deployment strategy from the human answer.
  
  Skip if: deployment.ci is null AND deployment.platform is null.
  Expect: 2-4 rules.
-->

# Deployment

## Detected
<!-- Populated by scan during init. Do not edit manually. -->

## Rules
*No universal deployment rules — deployment conventions are platform-specific. Run `claude --agent ana-setup` to configure for your deployment platform.*

## Gotchas
*Not yet captured. Add as you discover them during development.*

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
