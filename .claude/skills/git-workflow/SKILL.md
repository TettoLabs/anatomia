---
name: git-workflow
description: "Anatomia git workflow. Invoke when creating branches, committing code, preparing PRs, or merging changes."
---

## Detected
- Default branch: feature/s11-init-reset
- Commits: 338
- Contributors: 2
- Co-author: read from `ana.json` coAuthor field

# Git Workflow — Anatomia

## Branching
- All branches created from the artifact branch (configured in `.ana/ana.json`).
- One branch per scope (single-spec) or per plan (multi-spec). Branch lives until all specs complete.
- Naming: `feature/{slug}` — matches the plan directory slug.
- Example: `feature/ana-status` → `.ana/plans/active/ana-status/`

## Commits
- Format: `[{slug}] {description}` for single-spec work.
- Multi-spec format: `[{slug}:s{N}] {description}` where N is the spec number.
- Examples:
  - `[ana-status] Add status command with mtime comparison`
  - `[auth-migration:s1] Add schema mapping types`
  - `[auth-migration:s2] Add data pipeline connectors`
- One logical unit of work per commit. Not per file, not per spec. A logical unit: one thing done that makes sense on its own.
- Tests should pass for whatever is committed.
- Co-author trailer on every AnaBuild commit: The co-author trailer is defined in `ana.json` `coAuthor` field. Use it for all commits and PR bodies.

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
- PR targets the artifact branch (see `.ana/ana.json` `artifactBranch` field, default: `main`).
- CI must pass (GitHub Actions: Linux/Mac/Windows × Node 20/22).
- Merge strategy: merge commit (not squash). Preserves commit history for bisect and forensics.

## After Merge
- Delete the feature branch.
- Verify CI passes on artifact branch after merge.
- Complete the work: `ana work complete {slug}`

## For AnaBuild
- **Ready for build:** `git checkout {artifactBranch} && git pull && git checkout -b feature/{slug}`
- **Build in progress (resume):** `git checkout feature/{slug} && git pull`. Check `git log` to see what's done.
- **Needs fixes (failed verify):** `git checkout feature/{slug} && git pull`. Read verify report, fix what failed.
- **Commit granularity:** One logical unit per commit. Tests pass for what's committed.
- **Save build report:** `ana artifact save build-report {slug}` then `git push -u origin feature/{slug}`
- **Don't create PRs.** That's AnaVerify's job.
- **Don't merge.** That's the developer's job after AnaVerify creates the PR.

## For AnaVerify
- **Per-spec verification:** After each spec, verify on the branch. Update plan.md phase checkbox. Don't merge yet.
- **Plan complete:** After ALL specs pass, create the PR from branch to artifact branch.
- **PR body:** Include scope, spec (or plan.md for multi-phase), and build report references.
- **Merge:** Merge commit, not squash. Verify CI passes on artifact branch after merge.
- **Cleanup:** After developer merges the PR, developer runs `ana work complete {slug}` to archive and clean up.
- **If verify fails:** Report issues in verify_report.md. Don't touch the branch. Developer opens AnaBuild to fix.

## Multi-Phase Workflow
```
feature/{slug} created from artifact branch (AnaBuild, spec-1)
  ├── [slug:s1] commits...
  ├── AnaVerify: spec-1 PASS → plan.md phase 1 ✅
  ├── AnaBuild resumes feature/{slug} (spec-2)
  ├── [slug:s2] commits...
  ├── AnaVerify: spec-2 PASS → plan.md phase 2 ✅
  ├── AnaBuild resumes feature/{slug} (spec-3)
  ├── [slug:s3] commits...
  ├── AnaVerify: spec-3 PASS → plan.md phase 3 ✅
  └── AnaVerify: all phases complete → PR → developer merges → ana work complete
```

## Future: Staging Branch
When the team grows beyond 2-3 people, add a `staging` branch. Feature branches PR to staging. Staging merges to main on release cadence. Not needed now — adds friction with no benefit for a small team.
