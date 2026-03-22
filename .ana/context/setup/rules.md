# Setup Mode Rules

**Purpose:** Content quality constraints for context files. Mechanical checks (line counts, citations, scaffolds) are enforced by hooks — this file covers what to write, not what to check.

---

## Core Rules (with BECAUSE reasoning)

### 1. Only cite code you have read with the Read tool

BECAUSE: A verification hook checks every citation against the actual file. Fabrications fail immediately and waste your time fixing them. Read first, quote exactly, then write about it.

**Format:**
```markdown
Example from `src/utils/validator.ts` (lines 42-48):
```typescript
function validateEmail(email: string): boolean {
  // exact code from file
}
```
```

### 2. Reference real files with paths and line numbers

BECAUSE: Context files that could describe any project are useless. Modes need to understand THIS project. Every claim must tie back to specific code.

**Good:** "Error handling uses `AppError` class (from `src/errors/base.ts`, lines 1-25)"
**Bad:** "Uses custom error handling for better error messages"

### 3. Include all expected sections for each file

BECAUSE: The check command counts headers and blocks completion if sections are missing. Each context file has required sections defined in its step file.

**If a section has no content:** Write "Not detected" or "Not yet documented" — never skip the section header.

### 4. Write "Not detected" for missing patterns honestly

BECAUSE: Fabricated content degrades trust more than admitting gaps. "Not detected" is verifiable. Made-up patterns create confusion when modes try to follow them.

**Good:**
```markdown
## Auth
**Detected:** None
**Note:** No authentication patterns found. Document via teach mode when implemented.
```

**Bad:** Inventing auth patterns from general knowledge

### 5. Tag every claim with its source (Trust Stack)

BECAUSE: Downstream modes treat code-verified facts differently from inferences. Source tags let readers assess confidence.

- **Detected:** [claim] (from `[file]`) — Code you read directly
- **User confirmed:** [claim] — User validated via Q&A
- **User stated:** [claim] — User provided, not verified
- **Inferred:** [claim] — Your judgment, not mechanically verified
- **Unexamined:** [pattern] — Detected from code but intent is unknown. The code works this way, but nobody confirmed whether that's how it SHOULD work. Use for trade-offs, architectural decisions, and patterns where the developer may not have consciously chosen the approach.

---

## Ask vs Infer Rules

### NEVER Ask (Always Infer) — Grade A

Fully detectable from code/config/analyzer. Read and document WITHOUT questions:

- Language, framework, versions (from manifest files)
- Directory structure, entry points (from exploration)
- Naming conventions (from analyzer + real examples)
- Config-based settings (from .prettierrc, .eslintrc, tsconfig)
- Test framework and structure (from test files)
- CI/CD pipeline (from workflow files)

**Priority when sources conflict:**
1. Config files (ground truth)
2. Analyzer detection
3. Git log analysis
4. LLM inference (fallback)

### ALWAYS Ask (Can't Infer) — Grade D

Require user input. Cannot skip, cannot infer:

- Project purpose: "What does this project do?"
- Target users: "Who uses this?"
- Architecture rationale: "Why this pattern?"
- Common failures: "What keeps breaking?" (venting question)
- Operational details: Log access, error tracking dashboards

### Mode-Dependent — Grade B/C

Can infer at 5-7/10 quality. User questions improve to 8-9/10:

- Tech stack rationale (B) — LLM infers generic reasons, user gives specific
- System boundaries (B) — Visible from imports, user confirms rules
- Git workflow (C) — Visible from branches, user confirms policy
- Deployment details (C) — Visible from config, user confirms process

---

## Content Quality

### Be Specific, Not Generic

**Every section should pass this test:** Could this text describe 1,000 different projects, or only THIS project?

**Generic (fails):**
> Uses TypeScript for type safety. The project follows best practices.

**Specific (passes):**
> TypeScript strict mode with `noUncheckedIndexedAccess` (from `tsconfig.json`, line 8). Path aliases: `@/` maps to `src/` (line 12).

### Code Examples: 10-50 Lines

- **Too short (1-5 lines):** Doesn't show context
- **Just right (10-50 lines):** Shows pattern completely
- **Too long (entire file):** Bloats context, hides the pattern

Extract the relevant snippet. Include imports and function signature. Cut unrelated code.

### Max 3 Examples Per Pattern

1 example: Shows pattern exists
2-3 examples: Shows consistency and variants
4+ examples: Diminishing returns, context waste

### No Speculation

Use only:
- Facts from code/config (cite with file path)
- User quotes (cite as "User stated")
- Honest gaps ("Not yet documented")

Never use: "probably", "likely", "might have been", "typically"

---

## Formatting

### Headers
- `#` for file title (one per file)
- `##` for major sections
- `###` for subsections (sparingly)
- Never `####` — use **bold** instead

### Code Blocks
Always include language tag and file citation:
```markdown
Example from `file/path` (lines X-Y):
```typescript
// code here
```
```

### Lists
- Numbered: Sequential steps, ordered processes
- Bullets: Non-sequential items, features
- Don't mix types within a section

---

## Graceful Degradation

Setup completes successfully in all scenarios:

- No git repo → Skip git sections, note "Not a git repository"
- No tests → testing.md has minimal content with recommendations
- No CI → workflow.md CI section notes "Not detected"
- Pattern in deps but no code found → Note with teach mode reference
- User skips question → Document what's detectable, mark rationale as pending

**Never fail setup.** Write honest minimal content with recommendations.

---

## What NOT to Do

### Never Write Essays
**Bad:** 200 words of textbook explanation about layered architecture
**Good:** 3 lines stating pattern, rationale, trade-off

### Never Dump Entire Files
**Bad:** 500-line file pasted into patterns.md
**Good:** 20-line snippet showing the specific pattern

### Never Invent Patterns
**Bad:** Auth section with generic JWT code when none detected
**Good:** "Not detected — no authentication patterns found"

### Never Use Placeholders
**Bad:** `<!-- TODO -->`, `// rest`, `...`, `[TBD]`
**Good:** "Not yet documented — add via teach mode"

---

*Content quality rules for Anatomia setup mode*
