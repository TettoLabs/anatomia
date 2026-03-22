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
