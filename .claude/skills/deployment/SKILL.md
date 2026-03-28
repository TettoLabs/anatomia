---
name: deployment
description: "Anatomia deployment and release standards. Invoke after verification passes to merge PR and promote changes."
---

# Deployment Standards — Anatomia

## After AnaVerify Passes
AnaVerify handles merge mechanics (see git-workflow skill for details):
1. Create PR from feature branch to main
2. Merge as merge commit (not squash)
3. Verify CI passes on main after merge
4. Delete the feature branch
5. Move `.ana/plans/active/{slug}` to `.ana/plans/completed/{slug}`

## Website Deployment
The `website/` directory auto-deploys via Vercel on push to main. No configuration file in the repo — Vercel is connected directly to the GitHub repo. Check the Vercel dashboard for deployment status if website files were touched. No agent action needed.

## npm Publishing
Manual. Developer decision. Agents never publish.

Process:
1. Developer bumps version in `package.json` files
2. Commits the version bump
3. `pnpm build` locally
4. `pnpm publish` for affected packages
5. No CI/CD automation for publishing — intentional

Current packages:
- `anatomia-cli` (0.2.0)
- `anatomia-analyzer` (0.1.0)

## If Something Breaks After Merge
1. Revert the merge commit: `git revert -m 1 {merge-sha}`
2. Push the revert to main
3. Verify Vercel redeploys with the revert (automatic)
4. Open `claude --agent ana` to scope the fix — it goes through the pipeline again

No hotfix branches. No direct patches. Fixes go through Think → Plan → Build → Verify like everything else.

## For AnaVerify
- You merge PRs. You never publish to npm.
- After merge, verify CI passes on main. If CI fails, report it — don't attempt to fix.
- Move the plan directory to complete only after confirmed CI pass.
- If website files were changed, note in the verify report that Vercel deployment should be checked.
