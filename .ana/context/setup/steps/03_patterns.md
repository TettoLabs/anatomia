# Step 3: Write patterns.md

## Goal

Document how code is written in THIS project — error handling, validation, database access, auth, and testing patterns with real code examples. This is the crown jewel: modes will read this file to understand how to write code that fits this codebase.

## Quality Checklist

Before finishing, verify:
- [ ] Every detected pattern has at least 1 real code example with file path and line numbers
- [ ] Code examples are 10-50 lines (complete enough to understand, not entire files)
- [ ] Each pattern section has "When to use" guidance
- [ ] Patterns not detected say "Not detected" honestly — never fabricate
- [ ] No generic library documentation — only THIS project's usage
- [ ] Trust stack tags on every claim (Detected/User confirmed/User stated/Inferred)
- [ ] All 6 sections present: Error Handling, Validation, Database, Auth, Testing, Framework Patterns

## Example

**BAD (generic library docs):**
> ## Validation
> Uses Pydantic for validation. Pydantic is a data validation library that uses Python type hints to validate data. Models inherit from BaseModel.

**GOOD (specific, actionable):**
> ## Validation
> **Detected:** Pydantic 2.x with field validators (from `app/schemas/user.py`, lines 8-25):
> ```python
> class UserCreate(BaseModel):
>     email: EmailStr
>     password: str = Field(min_length=8, max_length=100)
>
>     @field_validator('password')
>     @classmethod
>     def password_must_have_special(cls, v: str) -> str:
>         if not re.search(r'[!@#$%^&*]', v):
>             raise ValueError('must contain special character')
>         return v
> ```
> **When to use:** Create `*Create` schemas for input validation, `*Response` schemas for output.

## Extraction Targets

<target name="error_handling">
  Search: Custom error classes, try/catch patterns, error middleware, HTTP exceptions
  Files: **/errors/**, **/exceptions/**, **/middleware/error*, api/**/*error*
  Extract: Error class definitions, handler functions, error response structure
  <if_not_found>Write: "Not detected — no centralized error handling pattern found."</if_not_found>
</target>

<target name="validation">
  Search: Schema validation (Pydantic, Zod, Yup, Joi), decorator validation, struct tags
  Files: **/schemas/**, **/validators/**, **/models/**, **/types/**
  Extract: Schema class definitions, field constraints, custom validators
  <if_not_found>Write: "Not detected — no schema validation library found."</if_not_found>
</target>

<target name="database">
  Search: ORM models, query builders, repository patterns, database access functions
  Files: **/repositories/**, **/db/**, **/models/**, **/queries/**
  Extract: Query functions, model definitions, transaction patterns
  <if_not_found>Write: "Not detected — no database access patterns found."</if_not_found>
</target>

<target name="auth">
  Search: Token validation, session handling, auth middleware, permission checks
  Files: **/auth/**, **/security/**, **/middleware/auth*, **/deps.*
  Extract: Auth flow, token handling, user retrieval from request
  <if_not_found>Write: "Not detected — no authentication patterns found."</if_not_found>
</target>

<target name="testing">
  Search: Test files, fixtures, mocks, test utilities
  Files: tests/**/**, __tests__/**/**, *.test.*, *.spec.*
  Extract: One complete test showing setup, act, assert pattern
  <if_not_found>Write: "Not detected — no test files found."</if_not_found>
</target>

<target name="framework_patterns">
  Search: Framework-specific idioms (dependency injection, middleware chains, hooks)
  Files: Entry points, middleware directories, hook files
  Extract: Patterns unique to the framework in use
  <if_not_found>Write: "Document framework patterns as they emerge."</if_not_found>
</target>

## Structure

- 6 H2 sections: Error Handling, Validation, Database, Auth, Testing, Framework Patterns
- Each section must have: description, 1-3 code examples (10-50 lines each), "When to use"
- If pattern not detected, still include H2 with "Not detected" content
- Pattern sections come from analyzer data AND exploration results
- Target: 800-1,200 lines (largest context file)

## Citation Protocol

Read the actual source file BEFORE citing it. Quote exact code. Use format:
```
Example from `file/path` (lines X-Y):
```

If you cannot find code to cite, write "Not detected" — never fabricate.

## References

- Exploration results: `.ana/.setup_exploration.md`
- Q&A log: `.ana/.setup_qa_log.md`
- Rules: `.ana/context/setup/rules.md`
