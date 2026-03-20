# Setup Mode Rules - Hard Constraints

**Purpose:** Enforceable constraints that bound setup output quality
**For:** Setup mode (AI reads before writing context files to understand boundaries)
**Created by:** STEP 2.4 CP3

**How to use this file:**
- Each step file (context/setup/steps/0X_*.md) references relevant constraints from this file
- When writing a context file, check Line Limits for that file's min/max
- When deciding what to ask, check Ask vs Infer Rules for that section's grade
- After writing, use Validation Alignment criteria to verify before proceeding (tool-based checks)
- templates.md shows quality TO achieve (aspirational examples)
- rules.md shows boundaries NOT to cross (hard limits)

**Enforcement:** Self-check before CLI (tool-based verification), CLI validation after self-check

---

## Line Limits

**Per context file (after setup complete):**

| File | Min Lines | Max Lines | Rationale |
|------|-----------|-----------|-----------|
| project-overview.md | 300 | 500 | Comprehensive overview without bloat |
| architecture.md | 300 | 500 | Design decisions with rationale |
| patterns.md | 800 | 1,200 | Largest file - multiple patterns with examples |
| conventions.md | 400 | 600 | Complete style guide |
| workflow.md | 600 | 800 | Git, PR, CI/CD, deploy, env - comprehensive |
| testing.md | 400 | 600 | Framework, fixtures, mocks, examples |
| debugging.md | 300 | 500 | Logging, tracing, failures, workflow |

**Rationale for limits:**
- **Min:** Prevents thin placeholder content (file under min is incomplete for its purpose)
- **Max:** Prevents essays and bloat (file over max needs compression or splitting)
- **Research-backed:** Targets from ANA_SPEC section 14, STEP 2.3 predecessor framework analysis, STEP 2.4 inferrability research

**Code examples within patterns.md:**
- **Max 3 examples per pattern section** (Error Handling section gets max 3 examples)
- **Each example: 10-50 lines** (complete enough to understand, not entire file)
- **Total code per pattern section: 50-150 lines max** (3 examples × 50 lines avg)

**Rationale for example limits:**
- 1 example: Shows pattern exists
- 2-3 examples: Shows consistency and variants (different contexts, edge cases)
- 4+ examples: Diminishing returns (redundancy, context waste)

**Enforcement:**

**During setup (self-check):**
```
For each file, verify line count:
  Read file, count lines
  If < min: File incomplete, add content
  If > max: File too verbose, compress or note in self-check
```

**During CLI validation:**
- Files under 20 lines: Soft warning "File thin - suggest re-running setup"
- Files over 1,500 lines: Soft warning "File verbose - suggest trimming"
- Files in range: Pass

**Violation handling:**
- If file exceeds max during writing: Stop, compress content, don't add "... rest omitted"
- If file below min after writing: Add content to reach min, or mark sections "Not yet documented"
- Don't ship files that violate limits - fix first

---

## Ask vs Infer Rules

**Principle:** Don't ask what can be inferred from code, config files, or analyzer detection. Only ask what's truly unknowable without user input.

---

### NEVER Ask (Always Infer) - Grade A Sections

**These are fully detectable from code/config/analyzer. Setup reads and documents WITHOUT user questions:**

**From analyzer detection (90-95%+ confidence):**
- Language and project type
- Framework and version
- Directory structure
- Entry points
- Test location and framework
- CI/CD config files

**From analyzer conventions (85-95% confidence):**
- File naming convention
- Function naming convention
- Class naming convention
- Variable naming convention
- Constant naming convention
- Import style (absolute vs relative)

**From config files (100% reliable - ground truth):**
- Indentation (read .prettierrc, .editorconfig)
- Line length
- Formatter/linter
- Semicolons, quotes, trailing commas
- Test commands

**From analyzer patterns (75-95% confidence):**
- Error handling pattern
- Validation pattern
- Database pattern
- Auth pattern
- Testing pattern

**From git log analysis (70%+ match = confident detection):**
- Commit message format IF consistent (run `git log --oneline -20`, detect pattern)
- Branch naming patterns (run `git branch -a`, detect feature/, fix/, etc.)

**Priority order when sources conflict:**
1. Config files (highest priority - deterministic)
2. Analyzer detection (high confidence)
3. Git log analysis (if consistent)
4. LLM inference from code (fallback)

**Example conflict resolution:**
```
If .prettierrc says tabWidth: 2 AND analyzer detects 4 spaces:
→ Use .prettierrc value (config is ground truth)
→ Note: "Some files may not be formatted yet. .prettierrc is authoritative."
```

---

### ALWAYS Ask (Can't Infer) - Grade D Sections

**These require user input. Setup MUST ask, cannot skip, cannot infer:**

**Project purpose and context (0% from code):**
- Project purpose: "What does this project do?"
- Target users: "Who uses this?"
- Problem solved: "What problem does this solve?"
- Current status: "Development stage? What's complete? What's next?"
- Team context: "Team size? Roles?"

**Architecture rationale (design intent not in code):**
- Why architecture chosen: "Why layered/microservices/MVC?"
- Design decisions: "Key decisions made? Why TypeScript? Why this framework?"
- Trade-offs: "What did you optimize for? What did you give up? Why acceptable?"

**Institutional knowledge (operational experience):**
- Common failure modes: "What commonly breaks? Symptoms? Causes? Diagnosis? Fixes?"
- Debugging workflow: "How do you debug issues? Tools? Process? Collaboration?"

**Operational details (not in code):**
- Production log access: "Where are production logs? How to access them?"
- Error tracking access: "Sentry/Bugsnag dashboard URL? Credentials?"
- APM dashboard access: "Monitoring dashboard URLs? Key metrics?"
- Deployment rollback: "How do you rollback a bad deploy?"

**Team policies (enforcement not visible in code):**
- PR approval requirements: "How many approvals? Who can approve?"
- Merge strategy: "Squash merge? Merge commits? Rebase?"
- Coverage enforcement: "Is coverage required for PR? What threshold?"

**Total D-grade questions:** 6 essential questions (can't skip, produces 0-2/10 quality without)

---

### ASK in Guided/Complete, INFER in Quick - Grade B/C Sections

**These can be inferred at 5-7/10 quality. User questions improve to 8-9/10:**

**Tech stack rationale (B-grade):**
- LLM can infer generic reasons ("FastAPI for async, TypeScript for type safety")
- User question: "Why these technologies? Alternatives considered?" → specific rationale

**System boundaries (B-grade):**
- LLM can infer from imports and directory organization
- User question: "Any explicit dependency rules? Layer boundaries?" → confirms/refines

**Git workflow strategy (C-grade):**
- LLM sees branches (main, develop, feature/) from `git branch -a`
- User question: "Branching strategy? Main-only or Gitflow?" → confirms policy

**PR process details (C-grade):**
- LLM reads .github/PULL_REQUEST_TEMPLATE.md
- User question: "Approval requirements? Merge strategy?" → fills policy gaps

**Deployment details (C-grade):**
- LLM infers from vercel.json, Dockerfile
- User question: "Where deployed? Automatic or manual?" → confirms specifics

**Environment management (C-grade):**
- LLM reads .env.example
- User question: "How are secrets managed? Different envs?" → operational details

**Test coverage targets (C-grade):**
- LLM might find in CI config or .coveragerc
- User question: "Coverage threshold? Enforced?" → confirms policy

**Commit format (B-grade IF consistent):**
- LLM analyzes git log, detects Conventional Commits at 85% match rate
- User question: "Is Conventional Commits correct? Any tools (commitlint)?" → confirms

**Additional conventions (C-grade):**
- Git log visible, PR templates visible
- User question: "Team-specific conventions? PR title format?" → fills gaps

**Mode branching:**
- **Quick mode:** Skip all B/C questions, use LLM inference (6-7/10 quality)
- **Guided mode:** Ask 7 targeted questions (mix of essential D-grade and most valuable B/C, 8/10 quality)
- **Complete mode:** Ask all 15 questions (B+C+D, 9-10/10 quality)

**Total B/C questions:** 9 questions (improve inference to confirmation)

---

## When to Stop

**Time limits per file:**
- **Max 5 minutes writing time per context file**
- If taking longer: Finish current section, move to next file
- Don't get stuck finding "perfect" example or phrasing
- Better: Complete file at 7/10 quality than half-written file at 9/10

**Rationale:** Setup should complete in 2-15 minutes total (Quick to Complete). Spending 10 minutes on one file breaks the time budget. Move on, can improve via teach mode later.

---

### Information Unavailable Scenarios

**Scenario 1: Pattern detected but no source files found**

**What happened:**
- Analyzer detected pattern from dependencies (e.g., "pydantic in requirements.txt")
- But no parsed files show pattern usage
- File selection algorithm returns empty list

**What to do:**
```markdown
## Validation

**Detected:** Pydantic (confidence: 0.75, from dependencies)

**Note:** Library detected in dependencies but not found in sampled source files (20-file sample).
Pattern likely exists but not yet documented.

**To add:** Run `ana mode teach` when you encounter Pydantic validation in your code.
Provide file path and the teach mode will extract and document the pattern.
```

**Do NOT:**
- Invent example patterns not found in code
- Leave section blank
- Write generic Pydantic documentation from library docs

**DO:**
- Acknowledge detection (show analyzer found it)
- Explain why no examples (not in sampled files)
- Provide path to add later (teach mode)

---

**Scenario 2: Config files don't exist**

**What happened:**
- No .prettierrc, no .eslintrc, no .editorconfig found
- Need to document indentation, formatting

**What to do:**
```markdown
## Code Style

**Indentation:** 4 spaces (detected from code analysis, confidence: 0.87)

**Note:** No formatter config file detected (.prettierrc, .eslintrc, .editorconfig).
Indentation inferred from code analysis. Confidence may be lower if codebase has mixed styles.

**Recommendation:** Add .prettierrc or .editorconfig for consistent formatting.
```

**Do NOT:**
- Fail setup (config files optional)
- Ask user for indentation when analyzer already detected it
- Leave section blank

**DO:**
- Use analyzer detection with confidence score
- Note source (inferred from code, not config)
- Suggest adding config file

---

**Scenario 3: User skips question**

**What happened:**
- Setup asks: "Why did you choose this architecture?"
- User presses Enter to skip

**What to do:**
```markdown
## Design Decisions

**Decision 1: Layered Architecture**

**Context:** Detected from directory structure (api/, services/, repositories/)

**Rationale:** Not yet documented (user input pending)

**Note:** This section can be enhanced via `ana mode teach` to add architecture rationale,
alternatives considered, and trade-offs. For now, layered pattern is documented structurally.
```

**Do NOT:**
- Make up rationale ("probably chosen for scalability" - speculation)
- Leave section blank
- Block setup from continuing

**DO:**
- Document what's detectable (layered pattern from structure)
- Mark rationale as pending
- Provide path to add later (teach mode)
- Continue setup (user chose to skip, respect that)

---

### Completeness Threshold

**Prefer complete sections over partial coverage:**

**Good:**
- 4 complete well-written sections with real examples
- Each section has: header, content, examples (if applicable), sources cited
- Self-contained (beginning, middle, end)

**Bad:**
- 6 half-written sections
- Some sections just have headers
- Placeholders ("TODO", "...", "// rest")

**Rationale:** Complete sections are usable. Half-written sections confuse the AI (is this the pattern or is more coming?).

**Action:** If running out of time or hitting info gaps, finish current section completely, mark remaining sections "Not yet documented" with teach mode reference.

---

### Graceful Degradation Examples

**All scenarios should degrade gracefully, never fail setup:**

- No git repo → Skip git workflow details, note "Not a git repository"
- No tests → testing.md has minimal content, note "No tests detected - add when tests exist"
- No CI → workflow.md CI/CD section notes "No CI configuration detected"
- Pattern detected but no files → Note in patterns.md with teach mode reference
- Config conflict (.prettierrc vs .editorconfig) → Use priority order, document conflict

**Setup completes successfully in all scenarios.**

---

## What NOT to Do

**These are failure modes setup must avoid. Each has CORRECT and WRONG examples showing the difference.**

**Note:** These constraints are also demonstrated in setup.md Hard Constraints section with additional CORRECT/WRONG examples. Both are authoritative — rules.md focuses on what boundaries exist, setup.md focuses on how to behave within them.

---

### Never Write Essays

**CORRECT:**
```markdown
## Architecture Pattern

**Type:** Layered (api/ → services/ → repositories/)

**Why:** Testability (service layer mockable) + clear boundaries (API never touches DB directly)

**Trade-off:** 3 files per feature vs 1 (worth it for test isolation)
```

**WRONG - DO NOT DO THIS:**
```markdown
## Architecture Pattern

This project uses a layered architecture pattern which is a software design approach
that organizes code into distinct layers where each layer has a specific responsibility
and dependencies flow in one direction. The layered architecture promotes separation
of concerns by ensuring that the presentation layer (API) does not directly interact
with the data layer (repositories) and instead goes through an intermediary business
logic layer (services). This pattern has been widely adopted in enterprise applications
because it provides testability benefits through dependency injection and makes the
codebase easier to maintain as it grows over time...

[200 words of textbook explanation]
```

**Why this matters:** Context window is precious. Essays waste tokens on explanations the AI already knows from training. Be brief. State what exists, why it exists (one sentence), move on.

---

### Never Dump Entire Files

**CORRECT:**
```markdown
## Validation

**Example from `app/models/user.py` (lines 15-35):**

```python
from pydantic import BaseModel, Field, field_validator

class UserCreate(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8)

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError('Must contain uppercase')
        return v
```

[10-35 line snippet showing validation pattern]
```

**WRONG - DO NOT DO THIS:**
```markdown
## Validation

**Example from `app/models/user.py`:**

```python
from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID

# [500 lines of the entire user.py file including UserCreate, UserUpdate,
# UserResponse, UserInDB, UserFilter, UserSort, and 15 other models]
```

[Entire file dumped into patterns.md]
```

**Why this matters:** Entire files are context bloat. Extract relevant snippet (10-50 lines) around the pattern. Use file selection algorithm to find representative examples. Include only what demonstrates the pattern.

---

### Never Invent Patterns Not Found

**CORRECT:**
```markdown
## Auth

**Detected:** None (analyzer found no auth patterns)

**Note:** No authentication detected in codebase. If auth exists in unusual location,
run `ana mode teach` to document. If no auth yet, this section will be filled when
auth is implemented.
```

**WRONG - DO NOT DO THIS:**
```markdown
## Auth

Most projects use JWT authentication with OAuth2PasswordBearer. Here's how to
implement JWT auth:

```python
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
```

[Making up auth pattern when analyzer detected none]
```

**Why this matters:** Only document patterns found in analysis.md OR found in source files during setup. If pattern not detected and not found, say so honestly. "Not detected" is trustworthy. Fabricated patterns are lies.

---

### Never Use Generic Library Documentation

**CORRECT:**
```markdown
## Error Handling

**Pattern:** HTTPException with structured error detail dict

**Example from `app/api/v1/users.py` (lines 47-58):**

```python
from fastapi import HTTPException

async def get_user(user_id: UUID) -> UserResponse:
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail={"error": "user_not_found", "message": f"User {user_id} not found"}
        )
    return UserResponse.from_orm(user)
```

**When to use:** 404 for not found, 400 for invalid input, 401 for auth failure

**Edge case:** Log full error trace, return sanitized message to user
```

**WRONG - DO NOT DO THIS:**
```markdown
## Error Handling

FastAPI uses HTTPException for error handling. HTTPException is raised with a
status_code parameter (like 404, 400, 500) and a detail parameter containing
the error message. FastAPI automatically converts HTTPException to JSON responses.

Common status codes:
- 404: Not found
- 400: Bad request
- 500: Server error

For more information, see FastAPI documentation on error handling.
```

**Why this matters:** This BAD example could be copied from FastAPI docs. No file citation, no project-specific error structure (detail dict), no real code. The AI needs to see THIS project's error pattern.

---

### Never Speculate Without Evidence

**CORRECT:**
```markdown
## Architecture Pattern

**Type:** Layered (api/ → services/ → repositories/)

**Detected from:** Directory structure (0.89 confidence)

**Rationale:** Not yet documented (user input pending)

OR (if user provided rationale):

**Rationale:** Testability (mock service layer in tests) + clear boundaries (API layer never touches repositories directly). Team of 3 can maintain without microservices overhead.
```

**WRONG - DO NOT DO THIS:**
```markdown
## Architecture Pattern

**Type:** Layered

**Rationale:** This architecture was probably chosen for scalability and maintainability.
It's likely the team wanted good separation of concerns and testability.
```

**Why this matters:** "Probably", "likely" = speculation. If user didn't provide rationale, say "Not yet documented" honestly. If user DID provide it, quote them. Don't guess at reasons. State facts from analyzer, quote user input, or mark unknown.

---

### Never Use Placeholders

**CORRECT:**
```markdown
## Common Failure Modes

**Note:** Common failure modes not yet documented (early-stage project or user skipped question).

**General approach:** Check logs, reproduce issue, form hypotheses, test systematically, identify root cause, fix with regression test.

**To add:** As production issues occur, document here via `ana mode teach` with specific failures.
```

**WRONG - DO NOT DO THIS:**
```markdown
## Common Failure Modes

<!-- TODO: Fill this in later -->

// Rest of section to be completed

...

[Placeholder text - file not complete]
```

**Why this matters:** Placeholders ("//rest", "...", "<!--TODO-->") are lazy completions. CLI validation specifically checks for these. If section can't be filled, write honest "Not yet documented" note with path to add later. Complete content or honest placeholder - zero lazy markers.

---

## Formatting Rules

**These rules apply to all 7 context files setup creates.**

---

### Headers

**Use:**
- `#` for file title (one per file): `# Patterns — MyProject`
- `##` for major sections: `## Error Handling`, `## Git Workflow`
- `###` for subsections within sections (if needed): `### When to Use`
- **Never `####`** - use **bold text** instead for emphasis within subsections

**Rationale:** Clear hierarchy aids LLM parsing. Max 3 header levels prevents over-nesting.

---

### Lists

**Numbered lists (1, 2, 3):**
- Use for: Sequential steps, workflows, ordered processes
- Example: "1. Create branch. 2. Commit changes. 3. Create PR."

**Bullet lists (-):**
- Use for: Non-sequential items, features, options, characteristics
- Example: "Patterns detected: • Error handling • Validation • Database"

**Checkboxes ([ ]):**
- Use for: Task lists, validation checklists, success criteria
- Example: "- [ ] All section headers present"

**Do NOT mix list types within same section** (either numbered OR bullets, not both)

---

### Code Blocks

**Always use language tags:**
```typescript
// Use ```typescript, ```python, ```bash, ```markdown
// NOT ```code or ``` (no language)
```

**Always include file path + line numbers:**
```
Example from `app/models/user.py` (lines 15-35):
```python
[code here]
```

Format: `file/path` (lines X-Y) OR `file/path:line` for single-line references
```

**Keep examples focused:**
- 10-50 lines per example (complete but not exhaustive)
- If source file is 500 lines, extract relevant snippet only
- Show context (imports, function signature, pattern usage, key logic)

**Use CORRECT/WRONG pattern for anti-patterns:**
```markdown
**CORRECT:**
```typescript
[good example]
```

**WRONG - DO NOT DO THIS:**
```typescript
// ❌ [bad example with comment explaining violation]
```
```

---

### Citations

**Always cite sources:**
- File references: "See UserCreate in app/models/user.py:15"
- Confidence scores: "Detected: Pydantic (confidence: 0.92)"
- Source attribution: "From .prettierrc", "From analyzer", "From git log analysis"

**Format:**
- Files: Backticks for inline `app/file.py` or code blocks for excerpts
- Confidence: Two decimals (0.92, not 0.9156)
- Source: Explicit (which config file, which analyzer field)

**Do NOT:**
- Reference code without citations ("This project uses Pydantic" - where?)
- Omit confidence scores ("Detected: Pydantic" - how sure?)
- Omit source ("Indentation: 4 spaces" - from where?)

**Why:** Citations make content verifiable and trustworthy. Confidence scores show reliability. Source attribution shows what's from config (100% reliable) vs inferred (less certain).

---

## Validation Alignment

**Setup performs self-check before calling `ana setup complete`. Self-check criteria align with CLI validation rules.**

---

### Self-Check Criteria (Before CLI)

**For EACH of the 7 context files, verify using your tools:**

**1. All required section headers present**
- Search the file for `## ` headers (use your search capability)
- Compare count and names against templates.md section list for that file
- Example: patterns.md should have 6 `## ` headers (Error Handling, Validation, Database, Auth, Testing, Framework Patterns)
- Missing sections = file incomplete → rewrite

**2. File references actual source code**
- Search the file for the citation pattern: "Example from `" or "From: " or file path references
- Count citations found
- For patterns.md: expect ≥3 file citations (at least 3 real code examples)
- For conventions.md: expect source references (config file names like ".prettierrc", analyzer citations)
- Zero citations in patterns.md = content is generic → rewrite

**3. Line count within limits**
- Read the file and count lines (use your reading capability to get line count)
- Verify: within min-max from Line Limits section above
- Under min = thin content → rewrite or add content
- Over max = bloated → trim or compress

**4. patterns.md has all detected patterns**
- Read analysis.md, extract pattern detection list (which patterns are non-null)
- Read patterns.md, extract `## ` section headers
- Compare: every detected pattern in analysis.md should have a corresponding `## ` section
- Example: If analysis.md shows errorHandling + validation + database → patterns.md must have Error Handling, Validation, Database sections
- Missing pattern sections = incomplete → add missing section

**5. No placeholder text**
- Search the file for lazy markers: "TODO", "TBD", "to be filled", "// rest", "...", "<!--TODO-->"
- Any found = lazy completion → rewrite that section completely
- Allowed: "Not yet documented — add via `ana mode teach`" (honest, not lazy)

**6. Scaffold marker removed**
- Search for `<!-- SCAFFOLD` in the file (use your search capability)
- If found = file was never properly filled → file is incomplete
- Must be removed after content is written

---

### CLI Validation (After Self-Check)

**When setup runs `ana setup complete`, CLI checks:**

**Blocking failures (must fix or validation fails):**
- Scaffold marker still present in any file
- Any context file missing (need all 7)
- Any file empty (0 lines after marker removal)
- project-overview.md missing project name or tech stack section
- patterns.md documents fewer patterns than analyzer detected
- Framework in project-overview.md contradicts analyzer detection

**Soft warnings (noted but don't block):**
- File under 20 lines (thin - suggest re-running)
- File over 1,500 lines (verbose - suggest trimming)
- workflow.md has no git info (maybe not a git repo - acceptable)
- debugging.md under 15 lines (often needs user input - acceptable if user skipped)

**What passes:**
- All 7 files present
- No scaffold markers
- Required sections present (templates.md defines required sections)
- Analyzer findings reflected (detected patterns documented)
- No contradictions (framework matches across files)
- Line counts reasonable (soft warnings OK, blocking failures must fix)

---

### Alignment Strategy

**Self-check prepares for CLI:**
- If self-check passes → CLI validation likely passes (90%+ success rate)
- If self-check finds issues → Fix before calling CLI (don't waste iteration)
- Self-check is quality gate, CLI is structure gate

**If CLI validation fails after self-check passes:**
- Means: Self-check missed something OR CLI has additional checks
- Action: Read CLI error message, fix specific issue, re-run
- Common: Pattern count mismatch (added 3 patterns, analyzer detected 4 - add missing section)

---

*Created for Anatomia STEP 2.4 - Constraints for setup mode*
