---
name: deployment
description: "Anatomia deployment and merge standards. Invoke after verification passes to merge PR and promote changes."
---

# Deployment Standards — Anatomia

## After Verify Passes
1. Merge the PR to `main` using merge commit (preserves commit history from AnaBuild)
2. Verify GitHub Actions CI passes on main after merge
3. Delete the feature branch

## npm Publishing (Manual, Developer Decision)
Anatomia publishes to npm manually. AnaVerify does NOT publish. After merge:
- Developer bumps version in `package.json` files
- Developer runs `pnpm build && pnpm publish` for affected packages
- Publishing is a human decision — never automated by agents

## Website
The `website/` directory auto-deploys via Vercel on merge to main. No agent action needed. Verify the deployment URL if website files were touched.

## Moving to Complete
After merge and any publishing:
```bash
mv .ana/plans/active/{slug} .ana/plans/complete/{slug}
```
This preserves the full artifact trail: scope, spec, build report, verify report.

## If Something Breaks After Merge
- Revert the merge commit: `git revert -m 1 {merge-sha}`
- Push the revert to main
- Open a new Ana session to scope the fix — it goes through the pipeline again
