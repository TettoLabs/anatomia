# Step 1: Write project-overview.md

## Goal

Document what this project IS — its purpose, tech stack, directory structure, and current status. This is the foundation file that other context files reference. An AI mode reading only this file should understand the project's domain and technology choices.

## Quality Checklist

Before finishing, verify:
- [ ] Project purpose is specific (domain, users, value) — not "a web application"
- [ ] Tech stack has versions and rationale for key choices
- [ ] Directory structure is annotated with purposes
- [ ] Entry points are documented with what each does
- [ ] Current status reflects real development stage
- [ ] All 4 sections present: What This Project Is, Tech Stack, Directory Structure, Current Status

## Example

**BAD (generic):**
> ## What This Project Is
> A web application built with Next.js that provides dashboard functionality for users.

**GOOD (specific, actionable):**
> ## What This Project Is
> **Purpose:** Campaign performance dashboard for marketing teams at SMBs (10-100 people)
> **Target users:** Marketing managers tracking ROI across Google Ads, Facebook, email
> **Current focus:** Adding AI-powered budget recommendations
> **Detected:** Next.js 15 App Router, TypeScript, Prisma (from `package.json`)

## Extraction Targets

<target name="project_purpose">
  Search: README first paragraphs, package.json description field
  Files: README.md, package.json, pyproject.toml, go.mod
  Extract: What the project does, who it's for, problem solved
  <if_not_found>Write: "Purpose from user Q&A: [use Q1 answer]"</if_not_found>
</target>

<target name="tech_stack">
  Search: Dependencies in manifest files, framework config
  Files: package.json, pyproject.toml, go.mod, requirements.txt
  Extract: Language version, framework version, database, key libraries (5-8 major ones)
  <if_not_found>Write: "Inferred from source files"</if_not_found>
</target>

<target name="directory_structure">
  Search: Top-level directories and their purposes
  Files: Use exploration results, ls output
  Extract: Key directories with purpose annotations, entry points
  <if_not_found>Write: "Flat structure — main logic in [list files]"</if_not_found>
</target>

<target name="current_status">
  Search: Recent git commits, TODO files, roadmap references
  Files: CHANGELOG.md, TODO.md, git log
  Extract: Development stage, what's complete, what's in progress
  <if_not_found>Write: "From user Q&A: [use Q1/Q2 answers]"</if_not_found>
</target>

## Structure

- 4 H2 sections: What This Project Is, Tech Stack, Directory Structure, Current Status
- "What This Project Is" must have: Purpose, Target users, Domain, Current focus
- "Tech Stack" must have: Core technologies with versions, Key dependencies with purposes
- "Directory Structure" must have: Annotated tree, Entry points, Layer flow if applicable
- Target: 300-500 lines

## Citation Protocol

Read the actual source file BEFORE citing it. Quote exact code. Use format:
```
From `package.json`:
```

If you cannot find specific info, write "From user Q&A" or "Inferred" — never fabricate.

## References

- Exploration results: `.ana/.setup_exploration.md`
- Q&A log: `.ana/.setup_qa_log.md`
- Rules: `.ana/context/setup/rules.md`
