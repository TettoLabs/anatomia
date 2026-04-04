# Setup Tier: Quick

Fast setup with no questions. Accepts exploration findings at face value.

---

## Question Handling

**Skip the question phase entirely.** Do not invoke ana-question-formulator.

After exploration completes, proceed directly to writing context files.

---

## Flow Override

1. Explorer runs → writes `.ana/.setup_exploration.md`
2. Present findings for batch confirmation: "Here's what I found. Type 1 if correct, or tell me what's different."
3. Writer runs 7 times → one file each
4. Verifier runs → verification report
5. Done

---

## Content Expectations

- Accept all exploration findings without deep validation
- Use detected data from `scan.json` and context files as ground truth
- When exploration confidence is low, note "Not detected" rather than fabricating
- Minimum line counts may be lower than Guided/Complete (see rules.md Quick allowances)

---

## When to Use

- Stage 1 (Weekend Prototype) projects
- Projects with minimal established patterns
- Quick iteration where context will be refined later via teach mode
