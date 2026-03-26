---
name: git-workflow
description: "Anatomia git workflow. Invoke when creating branches, committing code, preparing PRs, or merging changes."
---

# Git Workflow — Anatomia

## Branching
- All work branches from `main`. No staging branch. No develop branch.
- Feature branches: `feature/{slug}` (e.g., `feature/ana-diff`)
- Fix branches: `fix/{slug}` (e.g., `fix/sampler-glob`)
- Branch from latest main: `git checkout main && git pull && git checkout -b feature/{slug}`

## Commits
- Bracket-prefix format: `[{task-slug}] {description}`
- Examples:
  - `[ana-diff] Add citation parser for context files`
  - `[ana-diff] Fix edge case for deleted source files`
  - `[fix-sampler] Widen glob to include all source extensions`
- One logical change per commit. Don't bundle unrelated changes.
- Co-author trailer on every commit:
  ```
  Co-authored-by: Ana <build@anatomia.dev>
  ```

## Before Pushing
```bash
pnpm build         # TypeScript compiles
pnpm test          # All tests pass
pnpm lint          # No linter violations
```
All three must pass before pushing.

## Pull Requests
- PR title matches the task: `[ana-diff] Context staleness detection`
- PR description references the scope: "Scope: `.ana/plans/active/ana-diff/scope.md`"
- PR targets `main`
- CI must pass (GitHub Actions: Linux/Mac/Windows × Node 20/22)

## After Merge
- Delete the feature branch
- Verify CI passes on main
