---
name: git-workflow
description: "Invoke before any git operations — branching, committing, merging, or creating pull requests. Contains project-specific branch naming, commit format, and merge strategy."
---

# Git Workflow

## Detected
<!-- Populated by scan during init. Do not edit manually. -->

## Rules

- Create feature branches from the default branch: `feature/{description}` or `{initials}/{description}`.
- Use conventional commits: `type: description` where type is one of feat, fix, chore, docs, test, refactor.
- Include co-author trailer when Ana assists: `Co-authored-by: Ana <build@anatomia.dev>`.
- Merge feature branches to the default branch. Confirm merge strategy with your team.

## Gotchas
<!-- Starts empty. Add failure modes as you discover them. -->

## Examples
<!-- Optional. Add short snippets showing the RIGHT way. -->
