# Handoff: Pre-prod / Visual Testing Investigation

**From:** Ana Think (session 2026-05-09)
**For:** Next Ana Think session
**Priority:** Before shipping more website changes
**Type:** Investigation → likely just a process change, not a build

---

## The Problem

We're making rapid UI changes to anatomia.dev (favicon, nav wordmark, font sizes, version pill, marquee). Each change goes directly to prod via push to main → Vercel auto-deploy. We then look at the live site, notice issues (block too high, font too small, gap wrong), make another commit, push again. This session had ~8 direct-to-prod pushes for visual polish.

**The core constraint:** Website UX changes cannot be mechanically tested. They require a human looking at the rendered output across viewports and making taste judgments. No test suite catches "the QED block is sitting 3px too high."

---

## Key Finding: Vercel Preview Deployments Already Work

**This is already solved infrastructure.** We just haven't been using it.

Verified on PR #93 (website-mobile-polish, merged 2026-05-08):
- Vercel bot automatically posted a comment with preview URL
- Preview deployed to: `anatomia-git-feature-website-mob-ccbf1f-ryans-projects-408d5cbc.vercel.app`
- Status check: `Vercel → SUCCESS`
- The preview is a full production build of the `website/` directory, identical to what prod would be

### How it works (already configured)
- Vercel project: `anatomia` under `ryans-projects-408d5cbc`
- Root directory: `website/` (monorepo setup — Vercel only builds the website package)
- Deploy trigger: GitHub integration — auto-deploys on push to main (prod) and on every PR (preview)
- Preview URL pattern: `anatomia-git-{branch-slug}-ryans-projects-408d5cbc.vercel.app`
- Preview URLs are posted as PR comments by the `vercel` bot
- Each new push to the PR branch auto-updates the preview

### What we should do differently
**For website changes: use PRs instead of direct pushes to main.**

1. Create a branch for the visual change
2. Push commits to the branch
3. Open a PR
4. Vercel builds a preview automatically (~1-2 min)
5. Look at the preview URL across viewports
6. Push more commits if needed (preview auto-updates)
7. Merge when it looks right → prod deploys

This gives us taste-gating without a staging environment. The preview IS the staging environment, ephemeral and per-change.

**For non-visual changes (CLI code, pipeline artifacts, .ana/ files):** continue pushing to main directly. These don't need visual verification.

---

## Local Dev Server

Also available and working:

```
cd website && pnpm dev
```

- Starts in ~432ms with Turbopack
- Runs on `http://localhost:3000` (or next available port)
- Hot reloads on file changes

**Good for:** rapid iteration on CSS/layout before even committing. Look at it locally, get it close, then push to branch for the Vercel preview (which catches production-only differences like CDN fonts, image optimization, etc.).

**Not sufficient alone:** local dev doesn't match prod exactly (no CDN, no edge middleware, different font loading behavior). The Vercel preview is the authoritative pre-prod check.

---

## Two Questions for the Next Session

### 1. Should we formalize this as a convention?

Options:
- **Lightweight:** just start doing it. Website changes go through PRs. No process doc needed.
- **Explicit:** add a note to CLAUDE.md or a git-workflow skill rule: "Website changes require PR with Vercel preview approval before merge."
- **Enforced:** GitHub branch protection already requires PRs for main (we've been bypassing it). Stop bypassing for website changes.

Note: we're currently bypassing branch protection on every push. The GitHub remote warns us every time: "Bypassed rule violations: Changes must be made through a pull request. 6 of 6 required status checks are expected." We have protection rules set up — we just override them. For website work, stopping the bypass is the fix.

### 2. Should we test the pipeline with a non-main artifact branch?

This is a separate concern from the website preview problem, but it came up in the same conversation. Our target customers likely have `develop` or `staging` branches. We should validate the pipeline works correctly when `artifactBranch` is not `main`.

**What's already in place:**
- `ana.json` has `artifactBranch` field
- `work.ts` reads it and discovers slugs via `origin/{artifactBranch}`
- CI triggers on both `main` and `staging` branches
- No `staging` branch currently exists on remote

**Code review findings (traced the full lifecycle):**

The pipeline is parameterized correctly. Every branch reference goes through `readArtifactBranch()`. For a team using `artifactBranch: "develop"`:

1. `ana work start` — enforces you're on `develop`, commits scope dir to `develop`
2. `ana artifact save scope` — enforces you're on `develop`
3. `ana artifact save plan` — enforces you're on `develop`
4. Build agent creates `feature/{slug}`, implements code
5. `ana artifact save build` — enforces you're on `feature/{slug}` (not `develop`)
6. `ana pr create` — runs `gh pr create --base develop --head feature/{slug}` — targets develop, not main
7. PR merges into `develop`
8. `ana work complete` — enforces you're on `develop`, verifies feature branch was merged into develop

**The design is sound.** No hardcoded `main` anywhere. The pipeline owns scope → verify → PR to artifact branch. Getting from artifact branch to production (e.g., `develop → main`) is the team's release process — outside the pipeline's scope. This is the right separation. Anatomia manages development workflow, not release workflow.

**Recommendation:** do a 20-minute validation run on a throwaway repo with `artifactBranch: "develop"` to get empirical proof. Architecturally there's no gap — this is a confidence test, not a bug hunt.

---

## Infrastructure Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Vercel git integration | ✅ Working | Auto-deploys main (prod) + PRs (preview) |
| Vercel preview URLs | ✅ Working | Confirmed on PR #93, bot posts comment |
| Vercel project root | ✅ Configured | `website/` directory in monorepo |
| Local dev server | ✅ Working | `pnpm dev`, 432ms startup, Turbopack |
| CI on staging branch | ✅ Configured | `test.yml` triggers on `[main, staging]` |
| Staging branch | ❌ Doesn't exist | Not needed — preview deployments are better |
| Branch protection | ⚠️ Configured but bypassed | PRs required, 6 status checks required, all bypassed |
| Website ↔ CLI dependency | ✅ None | Website is standalone, no imports from CLI package |

---

## Recommendation

**Don't build anything. Change the process.**

1. Stop pushing website changes directly to main
2. Use branches + PRs → Vercel preview → visual check → merge
3. Continue pushing CLI/pipeline changes directly to main (they have mechanical tests)
4. Consider stopping the branch protection bypass for website-only changes

The section4-system-bento build is the first candidate for this workflow. It's a complex responsive component that needs visual verification at 375px, 768px, and 1280px. Building it on a branch with Vercel previews would catch every layout issue before prod.
