---
name: git-workflow
description: "Anatomia git workflow. Invoke when creating branches, committing code, preparing PRs, or merging changes."
---

# Git Workflow — Anatomia

## Branching
- All branches created from `main`.
- One branch per scope (single-spec) or per plan (multi-spec). Branch lives until all specs complete.
- Naming: `{type}/{slug}` where type is `feature/`, `fix/`, or `refactor/`.
- Slug matches the plan directory: `feature/ana-status` → `.ana/plans/active/ana-status/`
- Examples: `feature/ana-status`, `fix/sampler-glob`, `refactor/citation-parser`

## Commits
- Format: `[{slug}] {description}` for single-spec work.
- Multi-spec format: `[{slug}:s{N}] {description}` where N is the spec number.
- Examples:
  - `[ana-status] Add status command with mtime comparison`
  - `[auth-migration:s1] Add schema mapping types`
  - `[auth-migration:s2] Add data pipeline connectors`
- One logical unit of work per commit. Not per file, not per spec. A logical unit: one thing done that makes sense on its own.
- Tests should pass for whatever is committed.
- Co-author trailer on every AnaBuild commit:
  ```
  Co-authored-by: Ana <build@anatomia.dev>
  ```

## Before Pushing
```bash
pnpm build         # TypeScript compiles
pnpm test          # All tests pass
pnpm lint          # No linter violations
```
All three must pass. Not enforced by hooks — manual discipline. CI catches failures on push.

## Pull Requests
- PR created after ALL specs in a plan are complete and verified. Not per-spec. Not work-in-progress.
- Title: `[{slug}] {one-line summary}`
- Body references pipeline artifacts:
  ```
  Scope: .ana/plans/active/{slug}/scope.md
  Spec: .ana/plans/active/{slug}/spec.md
  Build report: .ana/plans/active/{slug}/build_report.md
  ```
- PR targets `main`.
- CI must pass (GitHub Actions: Linux/Mac/Windows × Node 20/22).
- Merge strategy: merge commit (not squash). Preserves commit history for bisect and forensics.

## After Merge
- Delete the feature branch.
- Verify CI passes on main after merge.
- Move plan to complete: `mv .ana/plans/active/{slug} .ana/plans/complete/{slug}`

## For AnaBuild
- **First spec:** Create the branch from main. `git checkout main && git pull && git checkout -b {type}/{slug}`
- **Subsequent specs (multi-phase):** Rebase on main first. `git checkout {type}/{slug} && git rebase main`. If conflicts, surface to developer — don't auto-resolve.
- **After verify failure:** Stay on the same branch. Fix commits use the same slug and spec prefix. Just more commits.
- **Commit granularity:** You decide the boundaries. The spec doesn't dictate when to commit. Rule: one logical unit per commit, tests pass for what's committed.
- **Don't create PRs.** That's AnaVerify's job.
- **Don't merge.** That's AnaVerify's job.

## For AnaVerify
- **Per-spec verification:** After each spec, verify on the branch. Update plan.md phase checkbox. Don't merge yet.
- **Plan complete:** After ALL specs pass, create the PR from branch to main.
- **PR body:** Include scope, spec (or plan.md for multi-phase), and build report references.
- **Merge:** Merge commit, not squash. Verify CI passes on main after merge.
- **Cleanup:** Delete the branch. Move `.ana/plans/active/{slug}` to `.ana/plans/complete/{slug}`.
- **If verify fails:** Report issues in verify_report.md. Don't touch the branch. Developer opens AnaBuild to fix.

## Multi-Phase Workflow
```
feature/{slug} created from main (AnaBuild, spec-1)
  ├── [slug:s1] commits...
  ├── AnaVerify: spec-1 PASS → plan.md phase 1 ✅
  ├── Rebase on main (AnaBuild, spec-2)
  ├── [slug:s2] commits...
  ├── AnaVerify: spec-2 PASS → plan.md phase 2 ✅
  ├── Rebase on main (AnaBuild, spec-3)
  ├── [slug:s3] commits...
  ├── AnaVerify: spec-3 PASS → plan.md phase 3 ✅
  └── AnaVerify: all phases complete → PR → merge → cleanup
```

## Future: Staging Branch
When the team grows beyond 2-3 people, add a `staging` branch. Feature branches PR to staging. Staging merges to main on release cadence. Not needed now — adds friction with no benefit for a small team.
