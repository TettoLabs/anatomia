# Setup Tier: Guided

Balanced setup with 5-7 targeted questions based on confidence thresholds.

---

## Question Selection

Read exploration results from `.ana/.setup_exploration.md`. Select questions based on confidence scores:

### Always Ask (2 questions)
1. **Batch confirmation** — "Here's what I found. Type 1 if correct, or tell me what's different."
2. **Goal** — "What's your goal with this codebase? (Understand / Fix / Extend / Refactor)"

### Confidence-Based (ask if threshold not met)
3. **Best code** — "Point me to your best code (file or folder)" — Ask if pattern confidence < 0.85
4. **Tech debt** — "What's fragile? Known tech debt?" — Ask if overall confidence < 0.7
5. **Deployment** — "How does code get to production?" — Ask if deployment confidence < 0.4
6. **Future direction** — "What's coming next?" — Ask if architecture confidence < 0.5

### Always Ask (2 questions)
7. **Venting** — "What keeps breaking or frustrates you?" — Tribal knowledge, can never infer
8. **Anything else** — "Anything else I should know?" — Escape valve, user can say 'not sure'

---

## Question Presentation

For each selected question:

1. Invoke ana-question-formulator: "Formulate answer for: [question text]"
2. Present to user:
   ```
   Question X of Y: [question text]

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

---

## Confidence Thresholds

| Threshold | Meaning |
|-----------|---------|
| 0.9+ | Config-confirmed, skip question |
| 0.7-0.9 | Strong evidence, consider skipping |
| 0.4-0.7 | Weak evidence, ask question |
| < 0.4 | Must ask, cannot infer |

---

## Expected Question Count

- Minimum: 4 (batch + goal + venting + escape)
- Maximum: 8 (all questions)
- Typical: 5-6 for most projects

---

## When to Use

- Stage 2 (Three-Month Wall) projects
- Stage 3 (Hiring Phase) projects
- Most production projects benefit from Guided
