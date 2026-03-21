# Setup Tier: Complete

Comprehensive setup with 8-15 questions. Validates everything including high-confidence findings.

---

## Question Selection

Ask ALL questions regardless of confidence scores. Complete mode validates even high-confidence findings.

### Foundation Questions (always)
1. **Batch confirmation** — "Here's what I found. Type 1 if correct, or tell me what's different."
2. **Goal** — "What's your goal with this codebase?"
3. **Project description** — "Describe this project in 2-3 sentences for a new developer."

### Pattern Questions
4. **Best code** — "Point me to your best code (file or folder)"
5. **Pattern validation** — "I detected [patterns]. Are these the patterns you want documented?"
6. **Anti-patterns** — "Any patterns you're trying to move away from?"

### Architecture Questions
7. **Tech stack rationale** — "Why did you choose [framework]? Any regrets?"
8. **Architecture rationale** — "Why this architecture? What trade-offs did you make?"
9. **System boundaries** — "What are the key system boundaries (API, DB, external services)?"

### Workflow Questions
10. **Branching** — "What's your git branching strategy?"
11. **Deployment** — "How does code get to production?"
12. **Code review** — "What does your PR process look like?"

### Quality Questions
13. **Testing philosophy** — "What's your testing strategy? Coverage targets?"
14. **Tech debt** — "What's fragile? Known tech debt you're avoiding?"

### Tribal Knowledge (always)
15. **Venting** — "What keeps breaking or frustrates you?"
16. **Anything else** — "Anything else I should know?"

---

## Question Presentation

Same as Guided tier:
1. Invoke ana-question-formulator for each question
2. Present Ana's guess with confidence
3. Record user response in `.ana/.setup_qa_log.md`

**Difference from Guided:** Complete mode presents Ana's guess even for high-confidence findings, allowing user to correct or confirm explicitly.

### Answer Validation
Validate all user answers against codebase before storing. Complete mode validates thoroughly — if user contradicts code evidence, always surface the conflict.

---

## Verification

Complete mode runs full verification:
- Verifier checks ALL citations
- CLI check runs on ALL 7 files
- Line counts must meet full minimums (no Quick allowances)

---

## Expected Question Count

- Minimum: 12
- Maximum: 16
- Typical: 14-15

---

## When to Use

- Stage 4 (Real Team) projects
- Projects needing comprehensive onboarding documentation
- When multiple developers will rely on the context
- When accuracy is more important than speed
