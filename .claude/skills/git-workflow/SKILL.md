---
name: git-workflow
description: "Invoke before any git operations — branching, committing, merging, or creating pull requests. Contains project-specific branch naming, commit format, and merge strategy."
---

# Git Workflow

## Detected
- Default branch: main
- Contributors: 2
- Ana CLI: pipeline artifacts committed via `ana artifact save` with [slug] prefix. Build agent creates `feature/{slug}` branches. Co-author from ana.json.

## Rules
- Commit each logical change separately. Don't batch unrelated changes into one commit.
- Write commit messages that explain what changed and why: `feat: add input validation to signup` not `update files`.
- Stage specific files for each commit. Avoid `git add .` or `git add -A` — review what you're committing.

## Gotchas
*Not yet captured. Add as you discover them during development.*

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
