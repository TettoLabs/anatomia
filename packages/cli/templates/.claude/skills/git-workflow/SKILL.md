---
name: git-workflow
description: "Invoke before any git operations — branching, committing, merging, or creating pull requests. Contains project-specific branch naming, commit format, and merge strategy."
---

<!-- ENRICHMENT GUIDE:
  Purpose: Build reads this to know how to commit, branch, and work 
  with git on this project.
  
  Read: Nothing beyond scan.json — all signals are already detected.
  Use: git.commitFormat, git.branchPatterns, git.hooks, git.mergeStrategy, 
  git.coAuthor, git.recentActivity.activeContributors.
  
  Write from scan data:
  - Commit format rule: if commitFormat.conventional is true with high 
    confidence, write the format. If false, describe the detected pattern 
    (prefix style, message style) from commitFormat.pattern.
  - Branch naming: from branchPatterns.primary — "Feature branches use 
    {prefix}/{name}" or "No consistent branch pattern detected."
  - Pre-commit hooks: from hooks.preCommit — list what runs (typecheck, 
    lint, test). Note what does NOT run if relevant.
  - Co-author: from coAuthor — if detected, document the convention.
  - Merge strategy: from mergeStrategy — squash, merge, rebase.
  
  CRITICAL FILTER — tool-managed operations: Do NOT write rules for 
  things the Ana CLI already manages. The pipeline handles commit 
  formatting (ana artifact save), co-author trailers (from ana.json), 
  branch creation (agents handle checkout), and artifact staging. 
  This skill covers GAPS between tools, not everything about git. 
  If the CLI already handles an operation, writing a rule for it is 
  redundant. Only write rules for manual workflow gaps the tools 
  don't cover.
  
  Skip if: git.commitCount < 10 (not enough history to detect patterns).
  For Level 0 maturity (no patterns detected): keep template defaults 
  as prescriptive conventions — they ESTABLISH patterns rather than 
  codify existing ones.
  Expect: 2-3 rules added. All from scan data. Zero file reads.
-->

# Git Workflow

## Detected
<!-- Populated by scan during init. Do not edit manually. -->

## Rules
- Commit each logical change separately. Don't batch unrelated changes into one commit.
- Write commit messages that explain what changed and why: `feat: add input validation to signup` not `update files`.
- Stage specific files for each commit. Avoid `git add .` or `git add -A` — review what you're committing.

## Gotchas
*Not yet captured. Add as you discover them during development.*

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
