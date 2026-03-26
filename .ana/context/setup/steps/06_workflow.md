# Step 6: Write workflow.md

## Goal

Document development workflow — git branching, commit conventions, PR process, CI/CD, deployment. Use Bash tool to run git commands and read CI configs. An AI mode reading this file should know how to contribute code that follows the team's process.

## Quality Checklist

Before finishing, verify:
- [ ] Git branching strategy documented with actual branch examples
- [ ] Commit format documented with real commit message examples from git log
- [ ] PR process includes approval requirements and merge strategy
- [ ] CI/CD pipeline documented from workflow files
- [ ] Deployment target and trigger documented
- [ ] Environment variables documented from .env.example
- [ ] All 6 sections present (or marked "Not detected" with recommendations)

## Example

**BAD (generic):**
> ## Git Workflow
> Uses feature branches. Merge to main when ready.

**GOOD (specific with evidence):**
> ## Git Workflow
> **Branching:** Feature branches off `main` (from `git branch -a`)
> Examples: `feature/add-auth`, `fix/stripe-webhook`, `chore/deps-update`
> **Merge strategy:** Squash merge (from `.github/PULL_REQUEST_TEMPLATE.md`)
> **CI requirement:** All checks pass before merge (from `.github/workflows/ci.yml`)
>
> **Recent commits** (Conventional Commits at 85%):
> - `feat: add user authentication flow`
> - `fix: resolve webhook signature validation`

## Extraction Targets

<target name="git_workflow">
  Search: Branch names, branching patterns
  Command: `git branch -a` via Bash tool
  Extract: Branch naming convention, branching strategy (feature branches vs trunk-based)
  <if_not_found>Write: "Not a git repository"</if_not_found>
</target>

<target name="commit_format">
  Search: Recent commit messages
  Command: `git log --format="%s" -20` via Bash tool
  Extract: Format pattern, consistency percentage, 2-3 example commits
  <if_not_found>Write: "No commits or not a git repository"</if_not_found>
</target>

<target name="pr_process">
  Search: PR template, branch protection config
  Files: .github/PULL_REQUEST_TEMPLATE.md, branch protection in CI
  Extract: Template sections, required checks, approval requirements
  <if_not_found>Write: "No PR template detected"</if_not_found>
</target>

<target name="ci_pipeline">
  Search: CI workflow definitions
  Files: .github/workflows/*.yml, .gitlab-ci.yml, .circleci/config.yml
  Extract: Triggers, jobs (test, lint, build, deploy), required checks
  <if_not_found>Write: "No CI configuration detected — recommend GitHub Actions"</if_not_found>
</target>

<target name="deployment">
  Search: Deploy config, hosting platform config
  Files: vercel.json, netlify.toml, Dockerfile, fly.toml, railway.json
  Extract: Platform, deployment trigger, environments (staging, production)
  <if_not_found>Write: "Deployment not configured in codebase"</if_not_found>
</target>

<target name="environment">
  Search: Environment variable templates
  Files: .env.example, .env.template, .env.sample
  Extract: Required variables, secrets management approach
  <if_not_found>Write: "No .env.example — recommend creating one"</if_not_found>
</target>

<target name="local_setup">
  Search: Environment configuration, Docker setup, seed scripts, dev server configuration
  Files: .env.example, .env.local.example, docker-compose.yml, Dockerfile, package.json scripts

  Extract:
  - All scripts from package.json with one-line description of what each does
  - Docker/docker-compose presence and what services they define
  - .env.example contents: list every required env var with description if available
  - Seed script location (prisma db seed, custom seed.ts)
  - Required third-party accounts (look for STRIPE_*, OPENAI_*, AUTH_*, DATABASE_URL patterns in .env.example)
  - Dev server command and port
  - "git clone to running app" step sequence

  <if_not_found>
  Flag: no .env.example as Unexamined ("New developers have no guide for required environment variables")
  Flag: no seed script as gap
  Construct setup sequence from package.json scripts and config files.
  </if_not_found>
</target>

## Structure

- 6 H2 sections: Git Workflow, Commit Conventions, Pull Request Process, CI/CD Pipeline, Deployment, Environment Management
- Use Bash tool for git commands — quote actual output
- CI/CD section should list triggers, jobs, and steps
- Target: 600-800 lines (minimal: 300-600 acceptable)

## Citation Protocol

Run git commands via Bash tool. Quote actual output. Use format:
```
From `git log --format="%s" -5`:
- feat: add user authentication
- fix: resolve webhook error
```

Read CI files before citing. Include file path and relevant lines.

## References

- Exploration results: `.ana/.setup_exploration.md`
- Q&A log: `.ana/.setup_qa_log.md`
- Rules: `.ana/context/setup/rules.md`
- Commit format may already be in conventions.md — check first
