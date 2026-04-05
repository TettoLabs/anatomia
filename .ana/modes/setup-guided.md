# Setup Tier: Guided

Balanced setup with 6 targeted questions + closer. No improvisation, no paraphrasing, no skipping.

---

## Detected Data

scan.json contains the engine's detection results (stack, structure, files, services, commands, git info). Use this as the starting point for all questions and confirmations. Do not re-derive what the engine already detected. Focus questions and confirmations on what scan.json can't detect: business purpose, architecture intent, workflow preferences, and trade-offs.

---

## Questions (ask ALL in order, do not skip, do not rephrase)

The exact question wording is defined in the orchestrator (setup.md / ana-setup.md). This tier file defines question BEHAVIOR, not wording.

**Canonical questions:** Q1-Q6 + closer (7 interactions total). All are always asked — none are conditional. Refer to the orchestrator for exact wording and target context files.

**Behavior for Guided tier:**
- Present each question individually (not as a batch)
- For each question, invoke ana-question-formulator for a best guess with confidence
- Present the guess, ask user to confirm, correct, or expand
- Between questions, acknowledge user's last response naturally before the next question
- Log all Q&A to `.ana/.setup_qa_log.md`

---

## Question Preparation

Before presenting questions to the user, invoke question-formulators in parallel:

1. ana-question-formulator: "Formulate Q1" (project purpose)
2. ana-question-formulator: "Formulate Q2" (architecture rationale)
3. ana-question-formulator: "Formulate Q3" (pain points)
4. ana-question-formulator: "Formulate Q4" (deployment)
5. ana-question-formulator: "Formulate Q5" (dev workflow)
6. ana-question-formulator: "Formulate Q6" (core user flow)

Run all 6 simultaneously using parallel Task calls. Then present questions to the user one at a time in order. This saves significant time compared to sequential formulation.

---

## Question Presentation

For each question:

1. Invoke ana-question-formulator: "Formulate answer for: [question text]"
2. Present to user:
   ```
   Question X of 6: [question text]

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
- 1 open-ended closer ("Anything else?")
- Total: 7 interactions maximum

---

## When to Use

- Stage 2 (Three-Month Wall) projects
- Stage 3 (Hiring Phase) projects
- Most production projects benefit from Guided

---

## Trade-Off Review (after Q&A, before writing)

Mandatory for Guided tier. After all questions are answered, before writing context files.

Surface 3-5 findings about the codebase, split into two categories:

**Critical:** "Does anything look like a genuine vulnerability or serious structural problem?"
Examples: hardcoded secrets, no auth on routes that handle user data, no error handling on payment flows, SQL injection vectors, exposed API keys in client code.
These are things that could cost the founder money or users.

**Observations:** "What looks like it was decided by AI rather than by a human?"
Examples: multiple error handling patterns in the same codebase, auth on some routes but not others, overly complex abstraction for a simple CRUD app, copy-pasted code with slight variations, inconsistent naming between similar modules.
These are the vibe-coding debt signals.

Framing: Assume the codebase was vibe-coded. Look for decisions that weren't made deliberately.

Present at least one Critical and one Observation. For each finding:
- Describe what you found (specific file, specific pattern)
- Ask user: confirm or flag for review

User confirms → tag as "User confirmed trade-off" in context files
User flags → tag as "Unexamined — user flagged for review" in context files

**Only present findings from the exploration results.** Do NOT fabricate findings or present generic advice. If the exploration found fewer than 3 concerns, present what you have.
