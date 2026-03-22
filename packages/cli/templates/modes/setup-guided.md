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

After all 5 questions, ask:
"Anything else I should know about this project that wouldn't be obvious from the code?"
→ Relevant to: any file as appropriate. If user says "no" or skips, proceed to writing.

---

## Question Preparation

Before presenting questions to the user, invoke ALL 5 question-formulators in parallel:

1. ana-question-formulator: "Formulate Q1 project purpose"
2. ana-question-formulator: "Formulate Q2 target users"
3. ana-question-formulator: "Formulate Q3 architecture rationale"
4. ana-question-formulator: "Formulate Q4 pain points"
5. ana-question-formulator: "Formulate Q5 deployment and release"

Run all 5 simultaneously using parallel Task calls. Then present questions to the user one at a time in order. This saves significant time compared to sequential formulation.

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

- Exactly 5 numbered questions
- Plus 1 open-ended closer ("Anything else?")
- Total: 6 interactions maximum

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
