---
name: deployment
description: "Team deployment and release standards. Invoke after verification passes to merge and promote changes."
---

# Deployment Standards

## After Verify Passes
<!-- Merge strategy, CI verification, branch cleanup -->

## Publishing / Releasing
<!-- How releases happen, who decides, manual vs automated -->

## Moving to Complete
After merge and any releasing:
```bash
mv .ana/plans/active/{slug} .ana/plans/completed/{slug}
```
This preserves the full artifact trail.

## If Something Breaks After Merge
<!-- Revert strategy, how fixes re-enter the pipeline -->
