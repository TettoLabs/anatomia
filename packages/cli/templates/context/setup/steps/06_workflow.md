# Step 6: Write workflow.md

## Goal

Document development workflow: git branching, commit conventions, PR process, CI/CD, deployment.

**What this file captures:** HOW this project's development process works (git, PRs, deploy, environments).

**Automation level:** 40% (git + CI visible, process details need user input)

**Time:** 5-8 minutes

---

## Inputs

1. **Read `.ana/.setup_exploration.md` → Config Files section**
   - CI config detected (.github/workflows/, etc.)
   - Deploy config detected (vercel.json, netlify.toml)

2. **Read scaffold:** `context/workflow.md` (has 6 section headers, minimal pre-population)

3. **Read templates.md section "5. workflow.md Template"**

4. **Read rules.md:** Line limit 600-800 lines

5. **Read `context/conventions.md` → Additional Conventions section**
   - If commit format was documented in step 02 (from Q10 or git analysis): USE that determination
   - Do not re-analyze commit format independently — conventions.md is the authority
   - If conventions.md has no commit info (e.g., Quick mode skipped it): Then run git log analysis as fallback

---

## What to Search For

**Git analysis** (if git repository):

Use Bash tool to run:
```bash
git branch -a  # All branches
git log --format="%s" -20  # Recent commit messages
```

**Detect commit format:**
- Conventional Commits: Look for `feat:`, `fix:`, `docs:` pattern (70%+ = using it)
- Ticket prefix: Look for `ABC-123:` pattern
- Emoji commits: Look for emoji at start
- Free-form: No consistent pattern

**Branch naming:**
- Look for patterns: feature/, fix/, chore/, main, develop
- Note strategy: feature branches vs trunk-based

**CI config files:**

Read .github/workflows/*.yml (or .gitlab-ci.yml, .circleci/config.yml):
- Extract: Triggers (on push, on PR), jobs (test, lint, build, deploy), steps

**Deploy config:**

Read vercel.json, netlify.toml, Dockerfile:
- Infer: Deployment platform, deployment trigger

---

## Questions (Tier-Dependent)

**QUICK MODE:** No questions (infer from git + CI)

**Quick mode inference strategy (no questions asked):**

Git analysis tells you more than you think:
- `git branch -a` → branching strategy (feature branches = Gitflow-ish, only main = trunk-based)
- `git log --format="%s" -20` → commit format (Conventional Commits at 70%+ = intentional)
- `git log --format="%an" -20 | sort -u` → team size (1 author = solo, 3+ = team)
- `.github/PULL_REQUEST_TEMPLATE.md` exists → PR process is formalized
- `.github/workflows/*.yml` → CI exists, read it for pipeline details
- `vercel.json` / `netlify.toml` / `Dockerfile` → deployment target

Run ALL of these in Quick mode. Each one fills a section without asking the user anything.

**GUIDED MODE:**

**Q7 (VALUE 1.0):**
```
Describe your branching strategy and PR process.

Example: "Feature branches off main, PR needs 1 approval, squash merge"

(Press Enter to skip - I'll infer from git analysis)
```

**Q8 (VALUE 1.25):**
```
How do you deploy? Automatic or manual? Where?

Example: "Vercel, push to main auto-deploys to production"

(Press Enter to skip)
```

**COMPLETE MODE:**

Q7 + Q8 (same as Guided) PLUS:

**Q9 (VALUE 0.33):**
```
What environment variables exist and how are secrets managed?

(Press Enter to skip - I'll document from .env.example if present)
```

---

## Writing Instructions

Write all 6 sections:

**Git Workflow:**
- From git branch analysis + Q7 if answered
- Branch naming examples (actual branches from git branch -a)
- Merge strategy (from Q7 or infer from git log - linear = rebase, merge commits visible = merge strategy)

**Commit Conventions:**
- **First:** Check conventions.md Additional Conventions section for commit format
- **If found:** Reference it: "See conventions.md for commit format details. Summary: [format] at [X]% consistency"
- **If NOT found:** Run `git log --format="%s" -20` and document format here
- Show 2-3 actual commit messages as examples (always include these even if referencing conventions.md)

**Pull Request Process:**
- Check for .github/PULL_REQUEST_TEMPLATE.md (read if exists)
- From Q7: approval requirements, merge strategy
- From CI config: required checks before merge

**CI/CD Pipeline:**
- Read and describe CI workflow files
- Triggers (on push to what branches)
- Jobs (test, lint, build, deploy)
- Required checks

**Deployment:**
- From deploy config + Q8
- Platform (Vercel, Netlify, AWS, Railway)
- Trigger (automatic on merge, manual, tagged releases)
- Environments (production, staging if detected)

**Environment Management:**
- Check for .env.example, .env.template
- List required environment variables
- From Q9 (Complete): Secrets management approach

---

## When Project Is Flat/Minimal

If exploration indicated projectShape = "minimal":

**Likely scenario:** Direct commits to main, no branching, no CI, no deploy config.

Write minimal but actionable:

```markdown
## Git Workflow

[If git exists:]
**Branching:** Direct commits to main. No feature branches detected.

[If no git:]
**Note:** Not a git repository.

**Recommendation:** Initialize git (`git init`) and adopt feature branching when adding collaborators.

## Commit Conventions

[Detect from git log if available, or:]
**Format:** Free-form (no consistent pattern)

**Recommendation:** Adopt Conventional Commits (feat:, fix:, docs:) for clarity.

## Pull Request Process

**None detected.** Direct commits to main.

**Recommendation:** Add PR workflow when team size > 1.

## CI/CD Pipeline

**None detected.** No .github/workflows/ or CI config found.

**Recommendation:** Add GitHub Actions when stabilizing for production. Start with: run tests on PR.

## Deployment

[If vercel.json or similar: document. Else:]

**Not configured in codebase.** Deployment process not detected.

## Environment Management

[If .env.example exists: list vars. Else:]

**None detected.** No .env.example file.

**Recommendation:** Create .env.example documenting required variables when adding environment-specific config.
```

Honest about minimal infrastructure. Provides actionable next steps.

---

## Verify

1. **Read back:** `context/workflow.md`

2. **Count headers:** 6

3. **Line count:** 600-800 (minimal: 400-800 acceptable for projects without git, CI, or deploy config)

4. **Check git info included** (unless not git repo per exploration)

5. **No placeholders:** Search for "TODO", "..." → expect 0

**If all pass:** Continue.

**If any fail:** Rewrite.

---

## Complete

Report:
```
✓ workflow.md complete ([X] lines) [— from git + CI / — minimal (no git/CI)]

[6 of 7 files complete]
```

Proceed to Step 7 (debugging.md - final file).

**Read:** `context/setup/steps/07_debugging.md`
