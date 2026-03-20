# Step 4: Write architecture.md

## Goal

Document architecture pattern with rationale, OR infer from structure if user can't articulate rationale.

**What this file captures:** WHY the project is designed this way (not just WHAT the design is). For vibe-coded projects without intentional architecture, infer from observable structure.

**Automation level:** 20% (pattern detected, rationale needs user input OR inference)

**Time:** 3-5 minutes (Quick - minimal), 6-10 minutes (Guided/Complete with questions)

---

## Inputs

1. **Read `.ana/.setup_exploration.md`**
   - Project shape (structured/minimal)
   - Request flow trace (if present)
   - Pattern files (shows boundaries between patterns)

2. **Read scaffold:** `context/architecture.md`
   - Has analyzer data: architecture type, confidence
   - 20% head start

3. **Read templates.md section "2. architecture.md Template"**
   - GOOD shows: ADR-style decisions with context, alternatives, rationale, trade-offs
   - BAD shows: Assertions without reasoning

4. **Read rules.md:** Line limit 300-500 lines (Quick: 50-500 acceptable if minimal)

5. **Previous files** (for context):
   - project-overview.md (framework, tech stack)
   - patterns.md (what patterns exist - informs boundaries)

---

## Questions (Tier-Dependent)

**QUICK MODE:** No questions
- Write minimal architecture.md (50-150 lines)
- Just pattern type + inferred structure
- Acceptable per "honest minimalism" principle

**GUIDED MODE:**

**Q6 (VALUE 6.0):**
```
Why did you choose this tech stack?

Example: "FastAPI for async performance, team knows Python, Pydantic for validation"

(Press Enter to skip - I'll note as undocumented)
```

**Q4 (VALUE 4.0):**
```
Why this architecture pattern?

Example: "Layered for testability. Team of 3 can't maintain microservices overhead."

(Press Enter to skip)
```

**COMPLETE MODE:**

Q6 + Q4 (same as Guided) PLUS:

**Q5 (VALUE 3.0):**
```
What trade-offs did you make and why are they acceptable?

Example: "Traded type safety for rapid prototyping (early stage, shipping fast)"

(Press Enter to skip)
```

---

## Writing Instructions

### Quick Mode (Minimal - 50-150 lines)

Write brief but honest architecture.md:

```markdown
## Architecture Pattern

**Type:** [from scaffold with confidence]

**Rationale:** Not yet documented. See project-overview.md for current structure.

## System Boundaries

[Infer from exploration:]
- Internal: [list directories with source code]
- External services: [from dependencies - Supabase, Stripe, etc.]

## Design Decisions

**Note:** Architecture rationale not documented by project owner. Add via `ana mode teach` as architectural decisions are made.

## Trade-Offs

**Note:** Trade-offs can be documented via `ana mode teach`.
```

Minimal but honest. Marks sections as pending rather than fabricating enterprise architecture for vibe-coded projects.

### Guided/Complete Mode (Full - 300-500 lines)

If user provided answers to Q6, Q4, Q5:

```markdown
## Architecture Pattern

**Type:** [from scaffold]

**Why this pattern:**
[Use Q4 answer - user's rationale]

**Alternatives considered:**
[If user mentioned in Q4, include. Else infer or note "See design decisions"]

**How it works in this project:**
[Even if user skipped Q4, can infer from structure:]
- Directory organization shows: [api/ for routes, services/ for logic, repositories/ for data]
- Import analysis shows: [routes import services, services import repositories]
- From exploration: [entry point analysis, request flow if traced]

## System Boundaries

**Internal components:**
- [List directories from exploration]
- [List what lives where based on directory names]

**External services:**
- [Detect from dependencies: Supabase from @supabase/supabase-js, Stripe from stripe, etc.]
- [Note what each external service is for if inferrable]

**Data stores:**
- [From database pattern: PostgreSQL, MongoDB, Redis from dependencies]

## Design Decisions

**If user provided Q6/Q4 answers:**

**Decision 1: [Tech Stack Choice]**
- Context: [From Q6 answer]
- Rationale: [From Q6 answer]

[Format as ADR-lite if user gave detailed answer]

**If user skipped questions:**

**Note:** Architecture rationale not documented by project owner. Below are observations from code structure. Add explicit rationale via `ana mode teach` to make this section more useful for onboarding.

**Observed from structure:**
[Infer from directory organization, detected from exploration:]
- Pattern: [from scaffold - layered, monolith, etc.]
- Directories suggest: [api/ for routes, lib/ for utilities, components/ for UI]
- This matches [framework]'s conventional structure

## Trade-Offs

**If Q5 answered (Complete mode):**
[Use user's answer about what optimized for, what gave up, why acceptable]

**If skipped:**

**Note:** Not yet documented. Common trade-offs for [framework] projects at this stage:
- [Framework-appropriate observation: Next.js - "Server vs Client Components balance"]
- [Or: FastAPI - "Async complexity for I/O performance gains"]
```

---

## When Project Is Flat/Minimal

If exploration indicated projectShape = "minimal":

**Write honest minimal content:**

```markdown
## Architecture Pattern

**Type:** Flat structure / Monolith

**How it works:**
- Main logic in [list 1-2 main files from exploration: main.py, app/page.tsx]
- [Framework] conventions followed at file level
- No explicit layering (all logic co-located)

## System Boundaries

**Internal:** [list source files]
**External services:** [from dependencies: Supabase, Stripe, etc.]

## Design Decisions

**Note:** Project structure emerged from development (not explicitly designed). This is typical for early-stage projects.

**Recommendation:** As project grows, consider organizing into [framework-appropriate directories: For Next.js: app/ for routes, components/ for UI, lib/ for utilities, app/api/ for API routes]

## Trade-Offs

**Optimized for:** Rapid development, simplicity
**Trade-off:** Organization for speed (acceptable at current scale)
**Re-evaluate:** When team grows beyond 1-2 developers or codebase exceeds [threshold]
```

Honest about lack of architecture. Provides recommendations. Better than fabricated enterprise design decisions.

---

## Verify

1. **Read back:** `context/architecture.md`

2. **Count headers:** Expect 4 sections

3. **Line count:** 300-500 (Quick minimal: 50-500 acceptable)

4. **Search for speculation:**
   - Search for: "probably", "likely", "might have been"
   - Expect: 0 found
   - If found: Speculation forbidden → rewrite with facts or "Not documented"

5. **Check sections not empty:**
   - Design Decisions: Has decisions OR honest "Not yet documented" note
   - Trade-Offs: Has trade-offs OR honest note

6. **No placeholders:** Search for "TODO", "..." → expect 0

**If all pass:** Continue.

**If fails:** Rewrite.

---

## Complete

Report:
```
✓ architecture.md complete ([X] lines)

[4 of 7 files complete]
```

Proceed to Step 5 (testing.md).

**Read:** `context/setup/steps/05_testing.md`
