# Step 0: Explore Codebase

## Goal

Understand this project's structure, patterns, and complexity BEFORE writing any context files. Create a shared data file (`.ana/.setup_exploration.md`) that all subsequent steps reference.

**Why this step:** Each step file (01-07) needs to know where patterns live, which files to read, whether the project is flat or structured. Exploring once and referencing everywhere is more efficient than re-exploring per file.

**Time:** 5-10 minutes

---

## Exploration Areas

### 1. Project Identity

**What to find:**
- Project name (from package.json, pyproject.toml, go.mod, or directory name)
- Framework and version (from scan.json if already detected)
- Language (from scan.json)
- Total file count, directory count (exclude node_modules/, venv/, dist/, build/)
- Entry points (main.py, index.ts, app.tsx, or from scan.json)

**How to find:**
- Read package.json or equivalent for name, version, main entry point
- List directories using your tools
- Count source files in relevant directories

---

### 2. Pattern Inventory

**Goal:** Find where each of the 5 core pattern types lives in this codebase.

**Patterns to search for:** Error Handling, Validation, Database, Auth, Testing

**Use these keyword tables based on detected language/framework:**

**Python/FastAPI:**
| Pattern | Search Keywords | Typical Locations |
|---------|----------------|-------------------|
| Error Handling | `raise HTTPException`, `raise ValueError`, `except Exception`, `except:` | api/, routes/, handlers/, middleware/ |
| Validation | `BaseModel`, `Field(`, `@validator`, `field_validator` | models/, schemas/, app/models.py |
| Database | `session.execute`, `async def get_`, `session.query`, `Base.metadata` | repositories/, models/, database.py, db/ |
| Auth | `OAuth2PasswordBearer`, `Depends(get_current`, `JWT`, `decode_token` | auth/, core/security.py, api/deps.py |
| Testing | test files (tests/, test_*.py pattern) | tests/, test/ |

**TypeScript/Next.js:**
| Pattern | Search Keywords | Typical Locations |
|---------|----------------|-------------------|
| Error Handling | `throw new Error`, `Response.json({error`, `NextResponse.json`, `catch (` | app/api/*/route.ts, middleware.ts, error.tsx |
| Validation | `z.object(`, `z.string(`, `Joi.`, `yup.`, `.parse(` | lib/schemas/, app/api/*/route.ts, actions/ |
| Database | `prisma.`, `findUnique`, `findMany`, `create(`, `.query(` | lib/db/, app/api/*/route.ts, actions/ |
| Auth | `getSession`, `getServerSession`, `NextAuth`, `middleware`, `Bearer` | middleware.ts, app/api/auth/, lib/auth/ |
| Testing | .test.ts, .spec.ts files | __tests__/, tests/, *.test.ts |

**TypeScript/Express:**
| Pattern | Search Keywords | Typical Locations |
|---------|----------------|-------------------|
| Error Handling | `throw new Error`, `app.use(errorHandler`, `next(error)`, `catch (` | middleware/error.js, routes/, app.js |
| Validation | `Joi.`, `yup.`, `z.object`, `.validate(` | validators/, middleware/validation.js |
| Database | `findOne`, `findAll`, `query(`, `execute(` | models/, repositories/, db/ |
| Auth | `passport.`, `jwt.verify`, `Bearer`, auth middleware | middleware/auth.js, auth/, passport.js |
| Testing | .test.js, .spec.js files | test/, tests/, *.test.js |

**Python/Django:**
| Pattern | Search Keywords | Typical Locations |
|---------|----------------|-------------------|
| Error Handling | `raise ValidationError`, `try:`, `except`, exception handlers | views.py, viewsets.py, middleware/ |
| Validation | `class.*Serializer`, `serializers.`, `Form`, `clean_` | serializers.py, forms.py |
| Database | `objects.get`, `objects.filter`, `objects.create`, `.save()` | models.py, views.py, managers/ |
| Auth | `@login_required`, `@permission_required`, `authenticate` | views.py, permissions.py, decorators.py |
| Testing | `class.*TestCase`, `def test_` | tests.py, tests/ |

**Go:**
| Pattern | Search Keywords | Typical Locations |
|---------|----------------|-------------------|
| Error Handling | `if err != nil`, `return fmt.Errorf`, `errors.New`, `http.Error` | handlers/, middleware/, pkg/ |
| Validation | struct tags (`validate:"required"`), validator functions | models/, types/, internal/ |
| Database | `sql.Open`, `db.Query`, `db.QueryRow`, `db.Exec`, `pgx.` | db/, repository/, store/ |
| Auth | `jwt.`, `middleware`, `token`, `http.HandlerFunc` wrapping | middleware/, auth/, internal/auth/ |
| Testing | `func Test`, `testing.T`, `*testing.T` | *_test.go files |

**For other frameworks:** Check if framework snippet file exists at `context/setup/framework-snippets/[framework].md` for framework-specific guidance. Otherwise use general patterns above.

**How to search:**
- Use your Grep tool or read files to search for these keywords
- Note which files contain which patterns
- For each pattern found, note the file path and approximate line range
- Aim for 2-3 representative files per pattern (or all files if project is minimal)

**Also check framework-specific locations:** If a framework snippet file exists for this project's framework, read it for important files to check (middleware.ts for Next.js, deps.py for FastAPI, etc.).

---

### 3. Config Files

**Search for these files:**
- .prettierrc, .prettierrc.json, prettier.config.js
- .eslintrc, .eslintrc.json, eslint.config.js
- .editorconfig
- tsconfig.json, jsconfig.json
- pyproject.toml (check [tool.black], [tool.ruff], [tool.mypy] sections)
- setup.cfg (check [flake8], [isort] sections)
- vitest.config.ts, jest.config.js, pytest.ini
- .github/workflows/*.yml (CI configs)
- vercel.json, netlify.toml (deploy configs)

**Note which exist.** This determines whether conventions.md uses config files (deterministic) or analyzer inference (probabilistic).

---

### 4. Project Shape Assessment

**Determine if project is structured or flat/minimal.**

**Indicators of STRUCTURED project:**
- Multiple nested directories (3+ levels deep)
- Separate directories for different concerns (api/, services/, repositories/, tests/)
- Config files present (.prettierrc, .eslintrc)
- Test files exist (tests/ directory or *.test.* files)
- 20+ source files

**Indicators of FLAT/MINIMAL project:**
- Few files (5-15 source files total)
- Minimal nesting (1-2 directory levels)
- NO config files
- NO test files
- One or two large files (main.py at 800 lines, app/page.tsx at 450 lines)

**Make assessment:** If project has 3 or more of these 5 flat indicators: `projectShape = "minimal"`. Otherwise: `projectShape = "structured"`.

**Why this matters:** Subsequent step files adjust behavior when projectShape = "minimal":
- Read ALL source files (few enough)
- One file may contain multiple patterns (cite same file at different line ranges)
- Config-based sections note "No config detected" with recommendations
- Testing/workflow sections use honest placeholders

---

### 5. Request Flow Trace (Optional - Guided/Complete Mode)

**Pick one request path** (e.g., "GET /users" or "load homepage"):
- Where does it enter? (route handler, page component)
- What does it call? (service, repository, database)
- What does it return? (response model, component render)

**Note the flow:** "Request → route handler → service → repository → database"

This helps explain architecture even if user can't articulate rationale.

**Time:** 2-3 minutes

---

## Output Format

**Write all findings to `.ana/.setup_exploration.md`:**

```markdown
# Setup Exploration Results

**Project:** [name]
**Framework:** [framework] ([version if found])
**Language:** [language]
**Files:** [count] source files
**Shape:** [structured / minimal]

---

## Pattern Files

**Error Handling:**
- [file path 1] (lines ~XX-YY)
- [file path 2] (lines ~XX-YY)
- Keywords found: [list what you found]

**Validation:**
- [file paths with line ranges]

**Database:**
- [file paths with line ranges]

**Auth:**
- [file paths with line ranges OR "Not detected"]

**Testing:**
- [test file paths OR "No tests detected"]

---

## Config Files Found

- Formatter: [.prettierrc / None]
- Linter: [.eslintrc / None]
- Editor: [.editorconfig / None]
- Test config: [vitest.config.ts / jest.config.js / pytest.ini / None]
- CI config: [.github/workflows/*.yml / None]

**Config file priority:** [if multiple configs, note Prettier > ESLint > EditorConfig]

---

## Project Shape: [STRUCTURED / MINIMAL]

**If structured:**
- Multiple directories with clear separation
- Config files present
- [Add other structured indicators found]

**If minimal:**
- Few files ([count] total)
- Flat structure (1-2 directory levels)
- No config files
- No tests
- Main files: [list 1-2 main files with line counts]

**Subsequent steps:** [If minimal: "Read all source files. One file may have multiple patterns. Use honest placeholders for missing infrastructure."]

---

## Request Flow (if traced)

[Entry point] → [handler/route] → [service/logic] → [database/API] → [response]

---

**Exploration complete. Steps 01-07 reference this file.**
```

---

## Complete

After writing .ana/.setup_exploration.md, report:

```
✓ Codebase exploration complete
  - [X] patterns found across [Y] files
  - Project shape: [structured/minimal]
  - Config files: [list or "none detected"]

Exploration results written to .ana/.setup_exploration.md

Proceeding to Step 1 (project-overview.md)...
```
