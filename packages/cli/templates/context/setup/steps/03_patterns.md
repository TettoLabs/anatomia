# Step 3: Write patterns.md

## Goal

Document all detected patterns with REAL CODE EXAMPLES from this project's source files.

**What this file captures:** How this project handles errors, validates data, accesses databases, authenticates users, and writes tests. With actual code from actual files.

**Automation level:** 100% (fully from exploration + source file reading, validation with user)

**Time:** 8-12 minutes (reads source files, extracts examples, most detailed step)

**This is the CROWN JEWEL.** Quality here is everything.

---

## Inputs

1. **Read `.ana/.setup_exploration.md` → Pattern Files section**
   - Already lists 2-3 files per pattern with line ranges
   - Use these as starting point (exploration already found the files)

2. **Read scaffold:** `context/patterns.md`
   - Has 6 section headers (5 pattern categories + Framework Patterns)
   - Has analyzer data: library, variant, confidence, evidence per pattern
   - Shows which patterns detected (which are non-null)
   - 50% head start

3. **Read templates.md section "3. patterns.md Template"**
   - GOOD examples show: File citations, real code, when-to-use, edge cases
   - Has DUAL examples for Error Handling, Validation, Database (FastAPI + Next.js)
   - Shows quality pattern transcends frameworks
   - BAD examples: Generic library docs, no citations

4. **Read rules.md:** Line limit 800-1,200 lines, max 3 examples per pattern

5. **Read framework snippet** (if exists):
   - Check: `context/setup/framework-snippets/[framework].md`
   - Framework-specific pattern idioms and file locations

---

## How to Find Pattern Files

**Primary source: Use exploration results**

Exploration already found files for each pattern. Read `.setup_exploration.md` "Pattern Files" section for:
- Error Handling: [lists 2-3 files with line ranges]
- Validation: [lists files]
- Database: [lists files]
- Auth: [lists files or "Not detected"]
- Testing: [lists files or "No tests detected"]

**If exploration results are incomplete for a pattern:**

Search for additional files using framework-appropriate keywords. Refer to the keyword tables in `00_explore_codebase.md` for your framework's search patterns.

**Also check framework-specific locations:**

If framework snippet file exists, read it for important files that might have been missed:
- Next.js: middleware.ts (auth patterns), error.tsx (error boundaries)
- FastAPI: core/deps.py or api/deps.py (dependency injection, auth)
- Django: serializers.py (validation patterns)
- Express: middleware/error.js (error handling)
- Go: middleware packages (auth, logging)

---

## Extraction Targets Per Pattern Type

**For EACH pattern, extract 1-3 code examples showing THIS project's implementation.**

### Error Handling

**FIND:** Function that raises/catches errors

**LOOK FOR (framework-specific):**
- Python: `raise HTTPException(status_code=`, `raise ValueError`, `try:` / `except Exception`
- TypeScript: `throw new Error(`, `Response.json({error`, `NextResponse.json`, `catch (error)`
- React: Error boundary with `componentDidCatch` or error.tsx
- Go: `return errors.New`, `if err != nil { return err }`

**EXTRACT:** Complete function (10-30 lines):
- Function signature (imports, types, async/sync)
- Conditional that triggers error (if not found, if validation fails)
- Error construction (status code + message structure this project uses)
- Enough context to understand when used (2-3 lines before/after)

**DO NOT:** Extract entire file, unrelated functions, or configuration

### Validation

**FIND:** Model/schema class definition with field validators

**LOOK FOR:**
- Python: `class [Name](BaseModel):` with `Field()` and `@validator` / `field_validator`
- TypeScript: `const schema = z.object({` or `Joi.object()` or `yup.object()`
- Django: `class [Name]Serializer(serializers.ModelSerializer):`
- Go: struct with validate tags

**EXTRACT:** Complete class (15-50 lines):
- Class signature with inheritance
- All field definitions
- Validators/constraints (@validator, Field(min=, max=), z.string().email())
- Config section if present

**Pick ONE representative model** - the most complete example, not all models.

### Database

**FIND:** Query function or repository method

**LOOK FOR:**
- Python: `async def get_by_id`, `session.execute(select(`, repository method
- TypeScript: `prisma.[model].findUnique`, `findMany`, TypeORM query
- Django: `objects.get`, `objects.filter`, `objects.create`
- Go: `db.Query`, `db.QueryRow`, `db.Exec`

**EXTRACT:** Complete function (15-40 lines):
- Function signature with types
- Query construction
- Error handling (if not found, connection errors)
- Return type/value

### Auth

**FIND:** Token validation or auth middleware/dependency

**LOOK FOR:**
- Python: `OAuth2PasswordBearer`, `Depends(get_current_user)`, `decode_token`
- TypeScript: `getSession`, `getServerSession`, middleware checking headers, `jwt.verify`
- Django: `@login_required`, `@permission_required`, permission classes
- Go: JWT middleware, token validation functions

**EXTRACT:** Core auth function (20-50 lines):
- Token extraction from request
- Token validation logic
- User lookup/retrieval
- Permission check (if present)

### Testing

**FIND:** One complete test case

**EXTRACT from test files (found in exploration):**

Complete test (30-60 lines):
- Imports (test framework, test client, fixtures)
- Fixture setup if used
- Test function/class
- Arrange (setup test data)
- Act (call function/endpoint)
- Assert (verify results)

**Pick test that shows project's structure clearly** (fixtures, assertions, async if project is async).

---

## Questions (Tier-Dependent)

**QUICK MODE:** No questions — write using exploration results directly.

**GUIDED + COMPLETE MODES:**

**Before writing, validate detected patterns with user:**

**Q16 (VALUE 9.0) — Pattern Validation:**
```
I detected these patterns from your code:

[List all patterns found in exploration with library + confidence]

Example format:
  ✓ Error handling: HTTPException (FastAPI) - confidence: 0.95
  ✓ Validation: Pydantic - confidence: 0.92
  ✓ Database: SQLAlchemy async - confidence: 0.90
  ✓ Auth: OAuth2 JWT - confidence: 0.88
  ✓ Testing: pytest - confidence: 1.0

Anything wrong or missing?

(Press Enter if correct, or type corrections/additions)
```

Wait for response.

If user provides corrections:
- Add mentioned patterns to the writing list
- Remove incorrectly detected patterns
- If user mentions specific file for new pattern, read that file during writing

**COMPLETE MODE — Additional question after Q16:**

**Q12 (VALUE 2.0):**
```
Any testing patterns or conventions the analyzer might have missed? Edge cases, recent additions, unusual locations?

(Press Enter to skip)
```

If user mentions additional pattern: Note file path, include during writing.

**THEN proceed to writing.**

---

## Writing Instructions

**For EACH detected pattern category (Error Handling, Validation, Database, Auth, Testing, Framework Patterns):**

### If Pattern NOT Detected

Write minimal section:
```markdown
## [Pattern Name]

**Detected:** None

**Note:** No [pattern] patterns detected in codebase. If pattern exists in unusual location, add via `ana mode teach`. If not yet implemented, document here when added.
```

### If Pattern IS Detected

1. **Read files from exploration results** (2-3 files listed per pattern)
   - Use exploration's pre-mapped file paths + line ranges
   - Read those specific sections

2. **Extract 1-3 code examples** (max 3 per rules.md):
   - Use extraction targets above (specific to pattern type)
   - Include: imports, function/class signature, pattern usage, context
   - Keep: 10-50 lines per example
   - Cite: File path + line numbers

3. **Write pattern section:**
```markdown
## [Pattern Name]

**Pattern:** [library from scaffold] [variant if exists] (confidence: [from scaffold])

**Evidence:** [from scaffold - what analyzer found]

[FOR EACH example extracted (1-3 max):]

**Example from `[file path]` (lines [start]-[end]):**
```[language]
[extracted code snippet]
```

**When to use:**
[Infer from examples - different status codes, different scenarios, contexts]

**Edge cases:**
[If known from code or user answer, include. Else: skip or note "Document as encountered"]

**Pattern used in:** [If multiple files: "[X] files across [directory]/"]
```

### Framework Patterns Section

Read framework snippet file if exists. Document framework-specific patterns:
- FastAPI: Dependency injection (Depends()), background tasks
- Next.js: Server Components, Server Actions, middleware patterns
- Express: Middleware chains, error middleware
- Django: MVT pattern, DRF viewsets, ORM patterns
- Go: Interface patterns, error handling idioms, HTTP handler patterns

---

## When Project Is Flat/Minimal

If exploration indicated projectShape = "minimal":

**Adjustments:**
- Exploration already read ALL source files (few enough)
- One file (main.py, app/page.tsx) may contain multiple patterns
- **Cite same file multiple times at different line ranges:**
  - Error Handling: "Example from `main.py` (lines 50-65):"
  - Validation: "Example from `main.py` (lines 200-230):"
  - Database: "Example from `main.py` (lines 400-445):"
- This is HONEST and SPECIFIC (shows where each pattern lives in the monolith)
- Still write all 6 sections (just with repeated file citations)

---

## Verify

**Tool-based verification (most thorough for most important file):**

1. **Read back:** `context/patterns.md`

2. **Count `## ` headers:**
   - Expect: 6 (Error Handling, Validation, Database, Auth, Testing, Framework Patterns)
   - Each detected pattern should have section (or "Not detected" note)
   - Count scaffold patterns from analysis.md
   - Count file sections from patterns.md
   - If file sections < scaffold patterns: Missing sections → rewrite

3. **Count file citations:**
   - Search for "Example from `"
   - Expect: ≥[number of detected patterns] citations (at least 1 per pattern)
   - If a pattern is detected but has 0 citations: Generic content → rewrite
   - If all detected patterns have ≥1 citation: PASS

4. **Check line count:**
   - Target: 800-1,200 lines
   - This is the LARGEST file (most detailed)

5. **Search for placeholders:** "TODO", "SCAFFOLD", "..." → expect 0

6. **Verify examples are 10-50 lines each:**
   - Spot-check 2-3 examples
   - Read citations, count lines in extracted code blocks
   - If >50 lines: Entire file dumped → extract snippet instead

**If all pass:** Continue.

**If any fail:** Rewrite file (most important to get right).

---

## Complete

Report:
```
✓ patterns.md complete ([X] lines)
  - [N] patterns documented with real code examples
  - Read [Y] source files
  - [Z] file citations included

[3 of 7 files complete]
```

Proceed to Step 4 (architecture.md).

**Read:** `context/setup/steps/04_architecture.md`
