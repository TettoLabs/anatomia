# Setup Tier: Guided

Balanced setup with 5 targeted questions. No improvisation, no paraphrasing, no skipping.

---

## Questions (ask ALL in order, do not skip, do not rephrase)

Present each question with Ana's guess from the question-formulator. Always show the guess even when confidence is high — this builds trust.

### Q1: Project purpose (always ask)
"What does this project do and what problem does it solve?"
→ Relevant to: project-overview.md

### Q2: Target users (always ask)
"Who uses this — what kind of developer or team, and what's their context?"
→ Relevant to: project-overview.md, architecture.md

### Q3: Architecture rationale (always ask)
"Why is the codebase structured this way? Were there deliberate architecture choices, or did it evolve organically?"
→ Relevant to: architecture.md

### Q4: Pain points (always ask)
"What parts of the codebase tend to break, cause confusion, or need the most debugging?"
→ Relevant to: debugging.md, patterns.md

### Q5: Deployment and release (always ask)
"How do you deploy and release? Any environments, CI/CD, or manual steps?"
→ Relevant to: workflow.md

### Q6: Development Workflow (Always Ask)

**Trigger:** Always — every project has a development workflow, even if it's "commit straight to main."

**What the formulator does:** Reads the "Development Workflow" section from `.ana/.setup_exploration.md`. Synthesizes findings into Ana's guess about:
- Branching strategy (trunk-based, gitflow, feature branches, or "no strategy detected")
- PR/review process (merge commits = PR workflow, no merge commits = direct push or rebase)
- CI/CD pipeline (what runs on push/PR, or "no CI detected")
- Commit conventions (conventional commits, ticket prefixes, or freeform)
- Pre-commit checks (linting, type checking, test running, or "none detected")

**What Ana presents:** A structured guess following the standard pattern:
```
Ana's assessment (confidence: 0.X):
Based on [evidence from git history]:
- Branching: [guess]
- Reviews: [guess]
- CI/CD: [guess]
- Commits: [guess]
- Pre-commit: [guess]

Type 1 if correct, or describe your actual workflow:
```

**What happens with the response:**
- If confirmed (1): Tagged "User confirmed" in workflow.md and conventions.md
- If corrected: Correction stored in `.setup_qa_log.md`, tagged "User corrected — [their description]" in output files. The correction takes precedence over git-inferred signals.

**Why this matters:** Git workflow is non-inferable from code alone. A project with zero merge commits could be a solo dev (no PRs needed) or a team that rebases (PRs exist but aren't visible in git log). Only the user knows which.
→ Relevant to: workflow.md, conventions.md

### Q7: Core Business Flow (Conditional: Database with >3 Models)

**Trigger:** Fires when the explorer found a database schema (Prisma schema, Drizzle schema, Sequelize models, raw SQL migrations, Mongoose models) with more than 3 entities/models/tables. Skip if no database detected or ≤3 models.

**What the formulator does:** Reads the exploration findings about database schema. Maps relationships between models to infer the core business flow. Looks for:
- The "main" entity (most relationships, most referenced by other models)
- The user-facing CRUD cycle (create → read → update → delete/archive)
- Transactional boundaries (what gets created together? what cascades on delete?)
- Status fields or enums suggesting workflow states (draft → published, pending → approved → completed)

**What Ana presents:**
```
Ana's assessment (confidence: 0.X):
Based on your [ORM/database] schema with [N] models:

Your core flow appears to be:
  [User] → creates [MainEntity] → which has [Relationships] → leading to [Outcome]

Key entities: [list top 3-5 by relationship count]
Detected workflow states: [if status/enum fields found]

Type 1 if this captures your core flow, or describe the actual user journey:
```

**What happens with the response:**
- If confirmed (1): Tagged "User confirmed — core business flow" in architecture.md and patterns.md
- If corrected: The user's description of their actual flow is the HIGHEST VALUE content in the entire setup. Store verbatim in `.setup_qa_log.md`. Tag as "User described — core business flow: [their words]" in output files. Writers MUST reference this in architecture.md's "System Overview" section.

**Why this matters:** This is the single highest-value non-inferable knowledge capture in the entire setup flow. Code analysis can find models and relationships. Only the user knows the BUSINESS meaning — "this is an invoice management system where freelancers create invoices, clients approve them, and the system generates PDF exports and tracks payment status." That one sentence makes every context file dramatically more useful.
→ Relevant to: architecture.md, patterns.md, project-overview.md

After all questions (Q1-Q6, plus Q7 if triggered), ask:
"Anything else I should know about this project that wouldn't be obvious from the code?"
→ Relevant to: any file as appropriate. If user says "no" or skips, proceed to writing.

---

## Question Preparation

Before presenting questions to the user, invoke question-formulators in parallel:

1. ana-question-formulator: "Formulate Q1 project purpose"
2. ana-question-formulator: "Formulate Q2 target users"
3. ana-question-formulator: "Formulate Q3 architecture rationale"
4. ana-question-formulator: "Formulate Q4 pain points"
5. ana-question-formulator: "Formulate Q5 deployment and release"
6. ana-question-formulator: "Formulate Q6 development workflow"
7. ana-question-formulator: "Formulate Q7 core business flow" (check trigger condition first — only if database with >3 models detected)

Run Q1-Q6 simultaneously using parallel Task calls. For Q7, the formulator should check whether the trigger condition is met before formulating. Then present questions to the user one at a time in order. This saves significant time compared to sequential formulation.

---

## Question Presentation

For each question:

1. Invoke ana-question-formulator: "Formulate answer for: [question text]"
2. Present to user:
   ```
   Question X of 5: [question text]

   Ana's guess: [formulator's answer]
   Confidence: [score]
   Evidence: [brief citation]

   Type 1 if correct, or tell me what's different.
   Type 'not sure' to move on.
   ```
3. Record in `.ana/.setup_qa_log.md`:
   - Question text
   - Ana's guess + confidence
   - User response
   - What to incorporate (confirmed guess, user correction, or skipped)

### Answer Validation
For user answers, validate against codebase before storing. See setup.md Step 5 for the validation protocol.

---

## Expected Question Count

- 6 always-ask questions (Q1-Q6)
- 1 conditional question (Q7 — only if database with >3 models)
- Plus 1 open-ended closer ("Anything else?")
- Total: 7-8 interactions maximum

---

## When to Use

- Stage 2 (Three-Month Wall) projects
- Stage 3 (Hiring Phase) projects
- Most production projects benefit from Guided

---

## Trade-Off Review (after Q&A, before writing)

Re-read `.ana/.setup_exploration.md` before presenting trade-offs to ensure exploration findings are fresh in context.

After all questions are answered, review the exploration results for security and architecture concerns. Look for findings tagged with high confidence that involve:
- Missing security measures (rate limiting, auth on routes, webhook verification)
- Missing data safety (no database transactions, no backup strategy)
- Missing observability (no error tracking, no monitoring)
- Architectural choices that may be unintentional

Present the top 3-5 findings to the user:

```
Before I start writing, I noticed a few things that might be unintentional:

1. ⚠️ [finding from exploration, e.g., "No rate limiting on any API route"]
2. ⚠️ [finding, e.g., "Stripe webhook handler doesn't verify signatures"]
3. ⚠️ [finding, e.g., "Invoice creation uses 4 database operations without a transaction wrapper"]
4. ⚠️ [finding, e.g., "3 API routes have no authentication check"]
5. ⚠️ [finding, e.g., "No error tracking service — errors only go to console.error"]

For each, were these intentional decisions?
Type Y/N for each (e.g., "YNNNY"), or type 'skip' to move on.
```

For each response:
- **Y (intentional)** → Tag as "User confirmed trade-off" in architecture.md Trade-Offs section
- **N (needs review)** → Tag as "Unexamined — user flagged for review" in the relevant context file
- **skip** → Tag all as "Unexamined" (same as Quick tier behavior)

Store the responses in `.ana/.setup_qa_log.md` under a "## Trade-Off Review" section.

**Only present findings from the exploration results.** Do NOT fabricate findings or present generic security advice. If the exploration found fewer than 3 concerns, present what you have. If none, skip this step entirely.
