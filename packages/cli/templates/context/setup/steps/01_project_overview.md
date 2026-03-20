# Step 1: Write project-overview.md

## Goal

Create project overview with tech stack, directory structure, and purpose. This is the foundation file that other context files reference.

**What this file captures:** What the project IS, what tech it uses, how it's organized, where it is in development.

**Automation level:** 60% (tech stack + structure from exploration/analyzer, purpose from Q1)

**Time:** 5-7 minutes (Quick), 7-10 minutes (Guided/Complete with questions)

---

## Inputs

1. **Read `.ana/.setup_exploration.md` → Project Identity section**
   - Project name, framework, language, file count, entry points
   - Use these facts in writing

2. **Read scaffold:** `context/project-overview.md`
   - Has 4 section headers already
   - Has analyzer data pre-populated (framework, directories, architecture)
   - Provides 40% head start

3. **Read templates.md section "1. project-overview.md Template"**
   - Shows GOOD example (specific project purpose, versions, real dependencies)
   - Shows BAD example (generic "web application")
   - Understand quality bar: specific + complete + cited

4. **Read rules.md:** Line limit 300-500 lines (Quick: 250-500 acceptable)

---

## What to Search For

**Project description:**
- package.json `description` field (ground truth for "what does this do")
- README.md first 2 paragraphs (project purpose often stated here)
- If neither exists or vague: Q1 answer is primary source

**Tech stack:**
- package.json / pyproject.toml / go.mod dependencies (list 5-8 major libraries)
- Exclude: build tools (webpack, vite), testing libs (list separately in testing.md)
- Include: framework (Next.js, FastAPI), database (Prisma, SQLAlchemy), auth (Supabase, Auth.js)

**Directory structure:**
- Exploration already mapped this
- Use exploration results for directory tree and purposes

**Entry points:**
- From exploration (main.py, app/page.tsx, index.ts)
- Note what each entry point does

---

## Questions (Tier-Dependent)

**ALL MODES (Quick/Guided/Complete) — Q1 is UNIVERSAL:**

**Q1 (VALUE 60.0):**

Ask this exactly:
```
Tell me about this project — what it does and what you're working on right now.

Examples:
  • "E-commerce API for vintage record collectors. Working on adding Stripe payments."
  • "SaaS dashboard for team analytics. Preparing for public beta launch."
  • "Recipe sharing platform for home cooks. Adding meal planning feature."

>
```

Wait for response.

**Processing Q1 answer:**

Extract from user's response:
- **Purpose:** What does the project do? (1-2 sentences)
- **Target users:** Who uses it? (if mentioned)
- **Current focus:** What are they working on right now? (if mentioned)
- **Stage indicators:** Any clues about maturity (users, launch status, team size)

If response is vague ("it's a web app"), ask ONE follow-up:
```
What specific problem does it solve? Who would use it?
```

If response is detailed: Extract and move on. Don't ask follow-ups for good answers.

Store answer as `projectDescription` — use in "What This Project Is" section.

This one question transforms ALL context files (adds domain context, current focus, project stage indicators).

**COMPLETE MODE ONLY — Additional questions:**

**Q3 (VALUE 8.0):**
```
Who are the users and what problem does this solve?

>
```

**Q2 (VALUE 3.0):**
```
What's the current development stage and what's next?

Examples:
  • "MVP in production with 50 users, working on scaling features"
  • "Prototype, testing with first customers"

>
```

Store answers for "Target Users" subsection (Q3) and "Current Status" section (Q2).

**Note:** Q17 (validation question) is asked DURING writing, not here. See Writing Instructions below.

---

## Writing Instructions

**Before writing, understand the failure mode for this file:**

**GENERIC (fails):** "A web application built with Next.js that provides dashboard functionality."

**SPECIFIC (passes):** "Campaign performance dashboard for marketing teams at SMBs (10-100 people). Unifies Google Ads, Facebook, email data. Currently adding AI-powered budget recommendations."

**The difference is DOMAIN CONTEXT.** If your output could describe 1,000 projects, it's generic. If it could only describe THIS project, it's specific. The Q1 answer gives you domain context — use every detail the user gave you.

---

**Write context/project-overview.md with all 4 sections:**

Use scaffold structure (headers already present).

### What This Project Is

Use `projectDescription` from Q1 answer.

Example based on Q1 "Recipe sharing API for home cooks. Adding meal planning":

```markdown
**Purpose:** Recipe sharing API for home cooks with meal planning features

**Target users:** Home cooks looking to organize and share recipes

**Domain:** Food, recipes, meal planning

**Current focus:** Adding meal planning feature (AI-powered weekly meal suggestions)
```

If Q3 answered (Complete): Add detailed user info from Q3 answer.

Add framework and architecture from exploration/analyzer:
```markdown
**Language:** [from exploration]
**Framework:** [from exploration with version]
**Architecture:** [from exploration/analyzer with confidence]
```

**PAUSE — Q17 Validation (Complete mode only):**

After writing the "What This Project Is" section above, if in Complete mode, validate with user:

**Q17 (VALUE 3.33):**
```
Here's my understanding of your project:

[paste the 4-6 lines you wrote for Purpose, Target Users, Domain, Current Focus]

Is this accurate? Anything to correct or add?

(Press Enter if correct, or type corrections)
```

Wait for response.

If user provides corrections: Update the "What This Project Is" section before continuing.
If user presses Enter: Continue to Tech Stack.

**Why this validation:** Q17 uses the explain-back pattern. CC writes its understanding from Q1 + exploration, then shows it for correction. Catches inference errors early.

---

### Tech Stack

**Core technologies:**
List from exploration + package file:
- Language with version
- Framework with version
- Database (from dependencies or database pattern)
- Testing framework (from exploration if detected)

**Key dependencies:**
Extract from package.json/pyproject.toml (5-8 major libraries).
Exclude build tools. Include: auth libraries, API clients, data processing libraries.

**Rationale:**
- If Guided/Complete asked Q6 in Step 4 (architecture): Reference it here briefly or note "See architecture.md"
- If not asked: Brief inference or note to add later

### Directory Structure

Use exploration results:
- Key directories with purposes (from exploration or infer from names)
- Entry points (from exploration)
- Test location (from exploration if exists)
- Directory tree (from exploration or generate simple tree)

### Current Status

**If Q2 answered (Complete):** Use answer.

**If Quick/Guided:** Infer from project description or leave brief:
- Development stage: [infer from exploration: tests exist = beyond prototype, etc.]
- Current focus: [from Q1 current work mention]

---

## When Project Is Flat/Minimal

If exploration indicated projectShape = "minimal":

**Adjustments:**
- Tech Stack: Focus on dependencies from package file (directory structure minimal)
- Directory Structure: Simple listing (lib/, components/, app/ - no deep nesting)
- Current Status: Rely heavily on Q1 answer (less to infer from structure)
- Note in file: "Early-stage project structure. Recommend organizing into [framework-appropriate directories] as codebase grows."

**Still write all 4 sections.** Minimal doesn't mean skip sections - it means simpler, more inference from Q1.

---

## Verify

**After writing, use your tools to verify:**

1. **Read file back:** `context/project-overview.md`

2. **Count `## ` headers:** Expect 4 (What This Project Is, Tech Stack, Directory Structure, Current Status)

3. **Check line count:** Target 300-500 (Quick: 250-500 acceptable)

4. **Search for placeholders:** "TODO", "TBD", "SCAFFOLD", "...", "to be filled" — expect 0

5. **Confirm Q1 answer used:** Search file for keywords from projectDescription. Should appear in "What This Project Is" section.

6. **Confirm scaffold marker removed:** Search for `<!-- SCAFFOLD` — expect NOT found

**If ALL checks pass:** Continue to Step 2.

**If ANY fail:** Rewrite file completely, re-verify until all pass.

---

## Complete

Report progress:
```
✓ project-overview.md complete ([actual line count] lines)

[1 of 7 files complete]
```

Proceed to Step 2 (conventions.md).

**Read:** `context/setup/steps/02_conventions.md`
