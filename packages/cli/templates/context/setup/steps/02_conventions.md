# Step 2: Write conventions.md

## Goal

Document naming, import, and code style conventions from config files + analyzer.

**What this file captures:** How code is styled in this project (naming, imports, formatting, linting).

**Automation level:** 90% (config files are ground truth, analyzer provides naming data)

**Time:** 3-5 minutes (mostly automated)

---

## Inputs

1. **Read `.ana/.setup_exploration.md` → Config Files Found section**
   - Which config files exist (.prettierrc, .eslintrc, etc.)
   - Config priority order if multiple exist

2. **Read scaffold:** `context/conventions.md`
   - Has 4 section headers
   - Has analyzer data pre-populated (naming conventions, import style, indentation)
   - 70% head start

3. **Read templates.md section "2. conventions.md Template"**
   - GOOD shows: Real function/class names from codebase, source attribution
   - BAD shows: Generic advice ("use camelCase")

4. **Read rules.md:** Line limit 400-600 lines

---

## What to Search For

**Config files (read these directly for ground truth):**

If Prettier exists (from exploration):
- Read .prettierrc or prettier.config.js
- Extract: tabWidth, singleQuote, semi, trailingComma, printWidth
- This is DEFINITIVE (100% reliable)

If ESLint exists (and no Prettier):
- Read .eslintrc or eslint.config.js
- Extract relevant style rules: indent, quotes, semi
- Definitive for linting rules

If EditorConfig exists (and no Prettier/ESLint):
- Read .editorconfig
- Extract: indent_size, indent_style, max_line_length

If NO config files (from exploration):
- Use analyzer data from scaffold (naming, indentation, imports)
- Note: "Inferred from code analysis (confidence: [%])"
- Recommend: "Add .prettierrc or .editorconfig for consistency"

**Git commit format analysis:**

If git exists (can run git commands):
- Use Bash tool: `git log --format="%s" -20`
- Detect pattern: Conventional Commits (feat:, fix:), ticket prefix (ABC-123), emoji, or free-form
- If 70%+ match a pattern: Document it
- If mixed: Note mixed format

**Naming examples from codebase:**

Search source files for real examples matching analyzer's detected majority:
- Functions: Find 3-5 actual function names (getUserById, validateEmail)
- Classes: Find 3-5 actual class names (UserRepository, AuthService)
- Files: List 3-5 actual file names from project

---

## Questions (Tier-Dependent)

**QUICK MODE:** No questions (100% automated)

**GUIDED MODE:**
- IF commit format detection is unclear (<70% consistency):
  Ask: "I see mixed commit formats. Do you follow a convention? (e.g., Conventional Commits, ticket prefixes)"
  (This is a conditional question - asked only when detection is ambiguous)
- If commit format is clear (Conventional Commits at 85%+ match): Skip, just document

**COMPLETE MODE:**

**Q10 (VALUE 3.33):**
```
I detected [Conventional Commits / ticket prefix / free-form] from git log ([X]% match):
  [show 2-3 example commits]

Is this correct? [Yes/No/Different format]

(Press Enter if correct)
```

**Q18 (VALUE 1.33):**
```
Any team-specific conventions not in config files?

Examples:
  • "PR titles must include ticket number: [PROJ-123] Title"
  • "Always pair on database schema changes"

(Press Enter to skip)
```

---

## Writing Instructions

**Every convention must have THREE components:**

1. **The rule** (camelCase for functions)
2. **The evidence** (87% consistent from analyzer, OR .prettierrc tabWidth: 2)
3. **Real examples** (getUserById, validateEmail — actual names from THIS codebase)

**Missing any component = generic content. All three = project-specific content.**

---

**Write context/conventions.md with all 4 sections:**

Follow scaffold structure.

### Naming Conventions

Use analyzer data + real examples:

```markdown
**Functions:** [majority from analyzer] ([confidence]% consistent)
Examples: [list 3-5 actual function names from codebase]
From: [cite files: src/services/user-service.ts]

**Classes:** [majority] ([confidence]%)
Examples: [3-5 real class names]
From: [cite files]

**Files:** [majority] ([confidence]%)
Examples: [3-5 real file names]

**Variables:** [majority] ([confidence]%)
**Constants:** [majority] ([confidence]%)
```

If mixed conventions (confidence < 0.70):
```markdown
**Mixed conventions detected:**
- Functions: camelCase 60%, snake_case 40%
- Recommendation: Follow existing file's style for consistency
```

### Import Organization

From analyzer:
- Style: absolute / relative / mixed ([X]% absolute, [Y]% relative)
- Real import examples from source files
- Ordering: [infer standard: stdlib → third-party → local, or note if no consistent pattern]

### Code Style

**If config files exist (from exploration):**

Priority order: Prettier > ESLint > EditorConfig

Read the highest-priority config and extract:
```markdown
**Indentation:** [X spaces/tabs] (from [.prettierrc/.editorconfig])
**Quotes:** [single/double] (from [.prettierrc/.eslintrc])
**Semicolons:** [required/optional] (from [.prettierrc/.eslintrc])
**Line length:** [X chars] (from [.prettierrc/.editorconfig])

**Formatter:** [Prettier/Black/gofmt] (from config file presence)
**Linter:** [ESLint/Pylint/Ruff] (from config file presence)
```

**If NO config files (from exploration):**

Use analyzer data:
```markdown
**Indentation:** [X spaces/tabs] (detected from code, confidence: [%])

**Note:** No formatter config detected (.prettierrc, .editorconfig, .eslintrc).
Conventions inferred from code analysis. Confidence may be lower if codebase has mixed styles.

**Recommendation:** Add .prettierrc or .editorconfig for team consistency and automated formatting.
```

**If config files conflict:**
```markdown
**Config files detected:**
- .prettierrc: 2 spaces
- .editorconfig: 4 spaces

**Resolution:** Using Prettier config (2 spaces) — Prettier is active formatter (takes precedence).

**Note:** If you run Prettier on save, code formats to 2 spaces regardless of EditorConfig.
```

### Additional Conventions

**Git commits:**

If git analysis from exploration or Q10:
- Format: [Conventional Commits / Ticket prefix / Free-form]
- Examples: [show 2-3 actual commit messages from git log]
- Tools: [commitlint / commitizen / None]

If Q18 answered (Complete mode):
- Team conventions: [list from Q18 answer]

---

## When Project Is Flat/Minimal

If exploration indicated projectShape = "minimal":

**Adjustments:**
- Likely NO config files (use analyzer exclusively)
- Note prominently: "No formatter config detected. Conventions inferred from code analysis."
- Recommendation emphasized: "Add .prettierrc / .editorconfig for consistency when adding collaborators"
- Shorter file (400-500 lines vs 600 for structured)
- Still write all 4 sections (just with less config file detail)

---

## Verify

Use your tools:

1. **Read back:** `context/conventions.md`

2. **Count headers:** Expect 4 (Naming Conventions, Import Organization, Code Style, Additional Conventions)

3. **Line count:** Target 400-600 (minimal projects: 350-600 acceptable)

4. **Check config citations:**
   - If config files exist in exploration: Search file for config file names (.prettierrc, .eslintrc)
   - Should cite config as source
   - If no citations but configs exist: Not using config files → rewrite

5. **Check real examples (not generic):**
   - Search for actual function/class/file names from the project
   - PASS: "Functions: getUserById, validateEmail, createOrder (camelCase)"
   - FAIL: "Functions: use camelCase for all function names"
   - The difference: real names from the codebase vs generic advice
   - Generic only: Rewrite with real examples

6. **No placeholders:** Search for "TODO", "SCAFFOLD", "..." → expect 0

**If all pass:** Continue.
**If any fail:** Rewrite file.

---

## Complete

Report:
```
✓ conventions.md complete ([X] lines) — from [config files/analyzer]

[2 of 7 files complete]
```

Proceed to Step 3 (patterns.md).

**Read:** `context/setup/steps/03_patterns.md`
