# templates.md

**Purpose:** This file provides templates and examples for each of the seven context files in SETUP mode. Use these templates as guides when creating project-specific context files.

**How to use:**
1. Read the section for the file you're creating (e.g., "1. project-overview.md Template")
2. Review the GOOD examples to understand what quality looks like
3. Use the structure and style from GOOD examples
4. Avoid patterns from BAD examples (generic, no citations, no evidence)
5. Always cite file paths and line numbers for code examples
6. Include metrics and consistency data where available

**Key quality indicators:**
- File citations with line numbers
- Real examples from the codebase (not invented)
- Specific values and metrics (not vague claims)
- Evidence from analyzer, git log, or config files
- Project-specific details (not generic descriptions)

---

# 1. project-overview.md Template

**Expected sections:** 4
**Length target:** 300-500 lines

---

### Section: What This Project Is

**What to include:** Project purpose (what it does, who it's for), domain context, core value proposition. NOT architecture or tech details (those go in other sections).

**GOOD Example (Next.js SaaS - Project-Specific):**
```markdown
## What This Project Is

**Purpose:** SaaS dashboard for marketing teams to track campaign performance across channels (Google Ads, Facebook, email).

**Target users:** Marketing managers and analysts at SMBs (10-100 person companies)

**Core value:** Unifies campaign data from 5+ channels into single dashboard with real-time metrics. Saves 10+ hours/week vs manual spreadsheet compilation.

**Current focus:** Adding AI-powered insights (suggests budget reallocation based on ROI patterns).

**Language:** TypeScript
**Framework:** Next.js 15 (App Router)
**Architecture:** Monolith with Server Components (0.89 confidence)
```

**Why this is GOOD:**
- Specific domain (marketing teams, campaign tracking)
- Specific users (marketing managers at SMBs)
- Specific value (saves 10+ hours/week, quantified)
- Current focus shows project stage ("adding AI insights" = active development)
- Framework + architecture from analyzer (specific versions)

**BAD Example (Generic - Could Be Any Project):**
```markdown
## What This Project Is

A web application built with Next.js and TypeScript. Provides dashboard functionality for users.

**Language:** TypeScript
**Framework:** Next.js
```

**Why this is BAD:**
- Vague purpose ("dashboard functionality" - for what?)
- No target users specified
- No value proposition (why does this exist?)
- No domain context (marketing? finance? generic?)
- Could describe 10,000 different projects

---

### Section: Tech Stack

**What to include:** Core technologies with rationale (WHY chosen), key dependencies, build tools.

**GOOD Example (FastAPI - With Rationale):**
```markdown
## Tech Stack

**Core:**
- **Language:** Python 3.11 (team expertise, async support, type hints)
- **Framework:** FastAPI 0.115.0 (async performance, OpenAPI auto-docs, Pydantic validation)
- **Database:** PostgreSQL 16 + SQLAlchemy 2.0 async (ACID guarantees, team knows SQL, async for throughput)
- **Testing:** pytest + httpx (team standard, async test support)

**Key dependencies:**
- pydantic 2.9 - Request/response validation (integrates with FastAPI)
- alembic 1.13 - Database migrations (SQLAlchemy standard)
- python-jose - JWT token handling (lightweight, no heavy auth framework)
- redis-py - Session caching (reduce DB queries for active users)

**Why FastAPI:**
Chose FastAPI over Django REST for async support (100+ concurrent users), automatic OpenAPI docs (frontend team needs API spec), and Pydantic integration (type-safe validation).

**Trade-off:** Less mature ecosystem than Django, but async performance justified for our real-time dashboard.

**Build:** poetry (dependency management), pytest (testing), alembic (migrations)
```

**Why this is GOOD:**
- Specific versions (FastAPI 0.115.0, Python 3.11)
- Rationale for each choice (async support, team expertise, performance)
- Trade-offs acknowledged (FastAPI less mature, worth it for async)
- Key dependencies with purpose (pydantic for validation, redis for caching)
- Comparison to alternative (FastAPI vs Django REST)

**BAD Example (Generic - No Rationale):**
```markdown
## Tech Stack

**Language:** Python
**Framework:** FastAPI
**Database:** PostgreSQL
**Testing:** pytest

Built with modern Python stack for API development.
```

**Why this is BAD:**
- No versions (Python vs Python 3.11)
- No rationale (why FastAPI? why PostgreSQL?)
- No trade-offs (sounds like everything is perfect)
- Generic ("modern Python stack" - meaningless)
- Could be any FastAPI project

---

### Section: Directory Structure

**What to include:** Key directories with purpose annotation, how code is organized, build artifacts location.

**GOOD Example (Layered Structure - Annotated):**
```markdown
## Directory Structure

**Layout:**
```
app/
├── api/          # FastAPI routers (thin, just route handling)
│   ├── v1/       # API v1 endpoints
│   └── deps.py   # Shared dependencies (DB session, auth)
├── models/       # SQLAlchemy ORM models + Pydantic schemas
├── services/     # Business logic layer (called by routers)
├── repositories/ # Data access layer (called by services)
├── core/         # Config, security, middleware
└── main.py       # FastAPI app entry point

tests/            # pytest tests (mirrors app/ structure)
alembic/          # Database migrations
scripts/          # Utility scripts (seed data, admin tasks)
```

**Layer flow:** Routers (api/) → Services (services/) → Repositories (repositories/) → Database

**Entry points:**
- HTTP server: app/main.py
- Database migrations: alembic/env.py
- Tests: pytest (auto-discovers tests/)

**Build artifacts:** .venv/ (poetry virtual env), __pycache__/ (bytecode)
```

**Why this is GOOD:**
- Annotated directories (explains PURPOSE not just name)
- Shows layer flow (api → services → repositories)
- Specific entry points (main.py, alembic/env.py)
- Architecture visible from structure (layered pattern clear)
- Explains test organization (mirrors app/)

**BAD Example (Generic - Just Lists Directories):**
```markdown
## Directory Structure

```
app/
  api/
  models/
  services/
tests/
```

Main code is in app/, tests in tests/.
```

**Why this is BAD:**
- No annotations (what is services/? what goes there?)
- No layer explanation (how do directories relate?)
- No entry points specified
- Generic (could be any Python project)
- Doesn't explain organization principle

---

### Section: Current Status

**What to include:** Development stage (prototype, alpha, production), what's complete, what's in progress, team size.

**GOOD Example (Specific Stage + Focus):**
```markdown
## Current Status

**Stage:** Production (beta users, not public launch yet)

**What's complete:**
- Core dashboard (campaigns, metrics, charts) - live for 50 beta users
- Auth system (Supabase Auth with email + Google OAuth)
- Data sync (5 channel integrations: Google Ads, Facebook, LinkedIn, email, organic)
- Basic AI insights (budget recommendations, early version)

**Current focus:**
- Adding predictive analytics (forecast ROI, suggest budget changes)
- Performance optimization (dashboard loads in 1.8s, targeting <1.5s)
- Preparing for public launch (security audit, load testing)

**Team:** 2 developers (founder + contractor), 1 designer (part-time)

**Users:** 50 beta users (marketing managers at 8-50 person companies), targeting 500 at launch
```

**Why this is GOOD:**
- Specific stage (production beta, not vague "in development")
- Complete features listed (not just "working on dashboard")
- Current focus specific (predictive analytics, performance targets)
- Team size and composition (2 devs, 1 designer)
- User metrics (50 beta, targeting 500)

**BAD Example (Generic - Vague Status):**
```markdown
## Current Status

Currently in active development. Working on new features and improvements.

Team is growing. Users are using the product.
```

**Why this is BAD:**
- Vague stage ("active development" - alpha? beta? production?)
- No specific features mentioned
- No current focus (what's being worked on?)
- No metrics (how many users? team size?)
- Could describe any project at any stage

---

# 2. conventions.md Template

**Expected sections:** 4
**Length target:** 400-600 lines

---

### Section: Naming Conventions

**What to include:** Naming rules per identifier type with real examples from codebase, consistency percentages.

**GOOD Example (With Real Examples from Codebase):**
```markdown
## Naming Conventions

**Functions:** camelCase
- Examples: `getUserById`, `validateEmail`, `createCampaign`, `syncAdData`
- From: src/services/user-service.ts, src/utils/validators.ts
- Consistency: 94% (analyzer detection)

**Classes:** PascalCase
- Examples: `UserRepository`, `AuthService`, `CampaignSyncWorker`
- From: src/repositories/UserRepository.ts, src/services/AuthService.ts
- Consistency: 100% (analyzer detection)

**Files:** kebab-case
- Examples: `user-service.ts`, `auth-middleware.ts`, `campaign-sync.ts`
- From: src/ directory analysis
- Consistency: 96% (analyzer detection)

**Interfaces/Types:** PascalCase with optional I prefix
- Examples: `User`, `Campaign`, `IAuthProvider` (interface)
- From: src/types/ directory
- Pattern: No I prefix for data models, I prefix for service interfaces

**Constants:** UPPER_SNAKE_CASE
- Examples: `MAX_RETRY_COUNT`, `API_TIMEOUT_MS`, `DEFAULT_PAGE_SIZE`
- From: src/constants.ts
- Usage: Config values, magic numbers, default values

**Source:** Analyzer detection + .prettierrc enforcement
```

**Why this is GOOD:**
- Real function names from codebase (getUserById, validateEmail)
- File citations (src/services/user-service.ts)
- Consistency percentages (94%, 96%, 100%)
- Source attribution (analyzer + .prettierrc)
- Shows pattern variations (I prefix for interfaces)

**BAD Example (Generic - No Examples):**
```markdown
## Naming Conventions

Use camelCase for functions, PascalCase for classes, kebab-case for files, and UPPER_SNAKE_CASE for constants. Follow standard TypeScript naming conventions.
```

**Why this is BAD:**
- No real examples from codebase
- No file citations
- No consistency metrics
- Generic ("standard TypeScript conventions")
- Can't verify (no evidence)

---

### Section: Import Organization

**What to include:** Import style (absolute vs relative), ordering rules, real examples from codebase.

**GOOD Example (With Ordering Rules and Real Imports):**
```markdown
## Import Organization

**Style:** Absolute imports preferred (92% usage from analyzer)
- Absolute: `import { UserService } from '@/services/user-service'`
- Relative: `import { User } from '../models/user'` (only for same-directory)
- Configuration: `@` alias maps to `src/` (tsconfig.json paths)

**Ordering:** stdlib → third-party → local
- From: .prettierrc with prettier-plugin-organize-imports

**Example from `app/api/v1/users.py` (lines 1-12):**
```python
# Standard library
import os
from typing import List
from uuid import UUID

# Third-party
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

# Local
from app.api.deps import get_db_session, get_current_user
from app.models.user import User, UserCreate, UserResponse
from app.repositories.user_repository import UserRepository
```

**Grouping:** Blank line between groups (stdlib, third-party, local)
**Within group:** Alphabetical (from a import X, from b import Y)
**Tool:** isort (Python), prettier + organize-imports (TypeScript)

**Consistency:** 98% (analyzer detection + formatter enforcement)
```

**Why this is GOOD:**
- Real import example from file (users.py:1-12)
- Shows three-group ordering (stdlib, third-party, local)
- Absolute vs relative explained with percentages
- Configuration source (.prettierrc, tsconfig.json)
- Tool enforcement (isort, prettier)
- Consistency metric (98%)

**BAD Example (Generic - No Examples):**
```markdown
## Import Organization

Organize imports with standard library first, then third-party, then local imports. Use alphabetical ordering within groups.
```

**Why this is BAD:**
- No real import examples
- No file citations
- No tool specification (isort? prettier?)
- No absolute vs relative guidance
- Generic (any Python/TypeScript project)

---

### Section: Code Style

**What to include:** Indentation, line length, formatter config, linter rules with source.

**GOOD Example (With Config Sources):**
```markdown
## Code Style

**Indentation:** 2 spaces (from .prettierrc)
- Width: 2
- Style: spaces
- Consistency: 100% (config file enforced)
- Source: `.prettierrc` line 3: `"tabWidth": 2`

**Line length:** 100 characters (from .prettierrc)
- Source: `.prettierrc` line 7: `"printWidth": 100`
- Applied to: Code and markdown files

**Semicolons:** Not used (from .prettierrc)
- Source: `.prettierrc` line 5: `"semi": false`
- Example: `const user = getUser()` not `const user = getUser();`

**Quotes:** Single quotes (from .prettierrc)
- Source: `.prettierrc` line 6: `"singleQuote": true`
- Example: `import { User } from 'models'` not `"models"`

**Trailing commas:** ES5 (from .prettierrc)
- Source: `.prettierrc` line 8: `"trailingComma": "es5"`
- Example: `{ name, email, }` in objects/arrays

**Formatter:** Prettier 3.2.0
- Config: .prettierrc in root
- Pre-commit hook: lint-staged + husky (runs prettier on staged files)
- Manual: `npm run format` runs prettier --write

**Linter:** ESLint 9.0 with TypeScript plugin
- Config: eslint.config.js (flat config)
- Rules: typescript-eslint/recommended + custom rules
- Enforcement: Pre-commit hook + CI
```

**Why this is GOOD:**
- Config file citations (.prettierrc line numbers)
- Specific values (2 spaces, 100 chars, no semi)
- Shows examples (const user = getUser() not ;)
- Tool versions (Prettier 3.2.0, ESLint 9.0)
- Enforcement mechanisms (pre-commit, CI)
- 100% consistency from config enforcement

**BAD Example (Generic - No Config Source):**
```markdown
## Code Style

Use 2-space indentation and Prettier for formatting. Follow ESLint rules for code quality.
```

**Why this is BAD:**
- No config file citations
- No specific values (line length? quotes? semis?)
- No enforcement mechanisms
- No consistency metrics
- Generic (any TypeScript project)

---

### Section: Additional Conventions

**What to include:** Team-specific conventions not covered above (git commits, PR titles, code organization preferences).

**GOOD Example (From Git Log Analysis):**
```markdown
## Additional Conventions

**Commit format:** Conventional Commits (enforced by commitlint)
- Format: `type(scope): description`
- Types: feat, fix, docs, chore, refactor, test
- Example from git log: `feat(auth): add JWT refresh token endpoint`
- Example from git log: `fix(dashboard): correct metric calculation for Q4`
- Consistency: 89% (from last 50 commits)

**PR title format:** Same as commit (Conventional Commits)
- Squash merge uses PR title as commit message
- Template: .github/pull_request_template.md requires type(scope)

**File organization preferences:**
- One component per file (UserList.tsx, not components.tsx with multiple)
- Test files colocated with source (user-service.ts + user-service.test.ts in same directory)
- Index files for public API (services/index.ts exports all services)

**Code organization:**
- Early returns over nested ifs (reduce indentation)
- Extract complex conditions to named booleans (isEligibleForDiscount = ...)
- Prefer functional over class components (React - 95% functional from analysis)

**Documentation:**
- TSDoc for public APIs (/** @param ... */)
- No comments for self-explanatory code (getUserById doesn't need comment)
- Comments for WHY not WHAT (business rules, gotchas, non-obvious decisions)

**Source:** git log analysis, .github/ templates, analyzer patterns
```

**Why this is GOOD:**
- Real commit examples from git log
- Consistency percentage (89% conventional commits)
- Specific preferences (one component per file)
- Shows enforcement (commitlint, PR template)
- Multiple convention types (commits, files, code org, docs)
- Source attribution (git log, templates, analyzer)

**BAD Example (Generic - No Evidence):**
```markdown
## Additional Conventions

Follow team conventions for commit messages and code organization. Keep code clean and well-documented.
```

**Why this is BAD:**
- No specific conventions listed
- No examples (what are the conventions?)
- Vague advice ("keep code clean")
- No source or enforcement
- Generic (any project)

---

# 3. patterns.md Template

**Expected sections:** 6
**Length target:** 800-1,200 lines

---

### Section: Error Handling

**What to include:** Error handling pattern with real code example, when to use, edge cases.

**GOOD Example (FastAPI - Structured Errors):**
```markdown
## Error Handling

**Pattern:** FastAPI HTTPException with structured error detail dict

**Example from `app/api/v1/users.py` (lines 47-61):**
```python
from fastapi import HTTPException
from uuid import UUID

async def get_user(user_id: UUID) -> UserResponse:
    """Fetch user by ID with error handling."""
    user = await user_repo.get_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "user_not_found",
                "message": f"User {user_id} not found",
                "resource": "user"
            }
        )

    return UserResponse.from_orm(user)
```

**When to use:**
- 404: Resource not found (user, campaign, metric)
- 400: Invalid input (bad email format, missing required field)
- 401: Authentication failed (invalid token, expired session)
- 403: Forbidden (user lacks permission for resource)
- 422: Validation error (Pydantic handles automatically)
- 500: Server error (unhandled exceptions, use logger.error() first)

**Edge case:** Never expose internal errors in production. Log full stack trace, return sanitized message:
```python
try:
    result = await external_api.call()
except Exception as e:
    logger.error(f"API call failed: {e}", exc_info=True)  # Full trace in logs
    raise HTTPException(status_code=503, detail="Service temporarily unavailable")  # Generic to user
```

**Pattern used in:** 23 API endpoints across api/v1/ directory
```

**Why this is GOOD:**
- File citation with exact lines (app/api/v1/users.py:47-61)
- Complete code example (imports, types, actual function)
- Project-specific error structure (detail dict with error/message/resource)
- Shows repository pattern usage (user_repo.get_by_id)
- Specific when-to-use (6 status codes with scenarios)
- Real edge case from project (log full trace, return sanitized)
- Usage count (23 endpoints - shows consistency)

**GOOD Example (Next.js - TypeScript API Routes):**
```markdown
## Error Handling

**Pattern:** Next.js API Route error handling with structured NextResponse.json

**Example from `app/api/users/route.ts` (lines 12-31):**
```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'user_id_required', message: 'User ID is required' },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({ where: { id } });

  if (!user) {
    return NextResponse.json(
      { error: 'user_not_found', message: `User ${id} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json(user);
}
```

**When to use:**
- 400: Missing or invalid parameters
- 404: Resource not found
- 401: Missing or invalid auth token (check in middleware.ts)
- 500: Caught in error.tsx boundary (app-level, not per-route)

**Edge case:** In Next.js App Router, unhandled errors in route handlers surface as 500s. Use error.tsx boundaries for UI routes. For API routes, always wrap in try/catch.

**Pattern used in:** 8 API routes across app/api/ directory
```

**Why BOTH are GOOD:**
- Both cite file paths + line numbers
- Both show project-specific error structure (detail dict for FastAPI, error object for Next.js)
- Both show when-to-use with specific status codes
- Both have edge cases from real development
- The quality PATTERN is framework-agnostic (file citations, real code, specificity)
- The CONTENT is framework-specific (HTTPException vs NextResponse)

**BAD Example (Generic - Library Docs):**
```markdown
## Error Handling

FastAPI uses HTTPException for error handling. Raise HTTPException with status_code and detail:

```python
from fastapi import HTTPException

raise HTTPException(status_code=404, detail="Not found")
```

Common status codes:
- 404 for not found
- 400 for bad request
- 500 for server errors
```

**Why this is BAD:**
- No file citation (not from real project)
- Generic detail string ("Not found" - not project's structured format)
- Could be copied from FastAPI tutorial
- No when-to-use beyond generic list
- No edge cases or gotchas
- No project context (doesn't show repository pattern)

---

### Section: Validation

**What to include:** Validation pattern with real code example, when to use, edge cases.

**GOOD Example (Pydantic - With Custom Validators):**
```markdown
## Validation

**Pattern:** Pydantic v2 models with Field() constraints and custom validators

**Example from `app/models/user.py` (lines 15-38):**
```python
from pydantic import BaseModel, Field, field_validator, EmailStr
from datetime import datetime
from uuid import UUID

class UserCreate(BaseModel):
    """User creation schema with validation."""
    email: EmailStr = Field(..., max_length=255, description="User email (unique)")
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)
    company_size: int = Field(..., ge=1, le=10000, description="Employee count")

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain number')
        return v

    @field_validator('email')
    @classmethod
    def email_domain_allowed(cls, v: str) -> str:
        if v.endswith('@competitor.com'):
            raise ValueError('Competitor domain not allowed')
        return v.lower()

class UserResponse(BaseModel):
    """User response schema (excludes password)."""
    id: UUID
    email: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True  # Pydantic v2 (replaces orm_mode)
```

**When to use:**
- UserCreate: API request validation (POST /users)
- UserResponse: API response serialization (exclude sensitive fields like password)
- Custom validators: Business rules (password strength, email domain restrictions)

**Edge case:** Always use EmailStr (validates format), add custom validator for business rules (domain restrictions).

**Pattern used in:** 12 models across app/models/ (user.py, campaign.py, metric.py, etc.)
```

**Why this is GOOD:**
- File citation (app/models/user.py:15-38)
- Shows Pydantic v2 specifics (Field, field_validator, from_attributes)
- Project-specific validators (password strength, email domain restriction)
- Shows create vs response pattern (exclude password in response)
- Real types (EmailStr, UUID, datetime from project)
- When-to-use with specific scenarios
- Usage across codebase (12 models)

**GOOD Example (Next.js/Zod - TypeScript Validation):**
```markdown
## Validation

**Pattern:** Zod schemas with TypeScript type inference and refinements

**Example from `lib/schemas/user.ts` (lines 8-29):**
```typescript
import { z } from 'zod';

export const userCreateSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .toLowerCase()
    .refine(
      (email) => !email.endsWith('@competitor.com'),
      { message: 'Competitor domain not allowed' }
    ),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .refine(
      (pwd) => /[A-Z]/.test(pwd) && /[0-9]/.test(pwd),
      { message: 'Password must contain uppercase letter and number' }
    ),
  name: z.string().min(1).max(100),
  companySize: z.number().int().min(1).max(10000),
});

export const userResponseSchema = userCreateSchema
  .omit({ password: true })
  .extend({
    id: z.string().uuid(),
    createdAt: z.date(),
  });

export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
```

**When to use:**
- userCreateSchema: Validate POST /api/users request body
- userResponseSchema: Type-safe response (password excluded)
- Type inference: z.infer generates TypeScript types from schema

**Edge case:** Zod refine() for business rules (email domain restriction). Use regex in refine for password strength vs custom validator per field.

**Pattern used in:** 9 schemas across lib/schemas/ (user.ts, campaign.ts, metric.ts)
```

**Why BOTH are GOOD:**
- Both cite file paths + line numbers
- Both show framework-specific validation (Pydantic Field() vs Zod methods)
- Both have business rule validators (password strength, email domain)
- Both show create vs response pattern (omit password)
- Quality pattern same: file citations, real code, project-specific rules
- Content framework-specific: Pydantic decorators vs Zod chains

**BAD Example (Generic - Pydantic Tutorial):**
```markdown
## Validation

Pydantic validates data with BaseModel classes. Define fields with types:

```python
from pydantic import BaseModel

class User(BaseModel):
    email: str
    password: str
```

Pydantic validates types automatically.
```

**Why this is BAD:**
- No file citation
- No Field() constraints (just type annotations)
- No custom validators (misses project pattern)
- Generic (could be from Pydantic getting-started)
- Doesn't show create vs response pattern

---

### Section: Database

**What to include:** Database access pattern with real code example, when to use, edge cases.

**GOOD Example (SQLAlchemy - Async Repository Pattern):**
```markdown
## Database

**Pattern:** Async SQLAlchemy with Repository pattern for data access

**Example from `app/repositories/user_repository.py` (lines 12-42):**
```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.models.user import User

class UserRepository:
    """User data access layer."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: UUID) -> User | None:
        """Fetch user by ID."""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Fetch user by email (unique)."""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def create(self, user_data: dict) -> User:
        """Create new user."""
        user = User(**user_data)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update(self, user: User) -> User:
        """Update existing user."""
        await self.db.commit()
        await self.db.refresh(user)
        return user
```

**When to use:**
- Repository class per model (UserRepository, CampaignRepository)
- Injected into services via dependency injection
- All queries through repository (never raw SQL in services)

**Edge case:** Always use scalar_one_or_none() for single results (raises error if multiple found). Use .all() for lists. Commit in repository, not service (repository owns transactions).

**Pattern used in:** 8 repositories across app/repositories/ directory
```

**Why this is GOOD:**
- File citation (app/repositories/user_repository.py:12-42)
- Complete repository class (init, get, create, update)
- Async pattern (AsyncSession, await)
- Project-specific pattern (repository per model)
- Shows scalar_one_or_none() usage (common SQLAlchemy pattern)
- When-to-use explains dependency injection
- Edge cases about transaction management

**GOOD Example (Prisma - Next.js Database Client):**
```markdown
## Database

**Pattern:** Prisma Client with TypeScript type safety

**Example from `lib/db/user.ts` (lines 5-32):**
```typescript
import { prisma } from '@/lib/prisma';
import type { User, Prisma } from '@prisma/client';

export class UserRepository {
  /**
   * Fetch user by ID
   */
  async getById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Fetch user by email (unique field)
   */
  async getByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Create new user
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  /**
   * Update user
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }
}

export const userRepo = new UserRepository();
```

**When to use:**
- Repository class per model (UserRepository, CampaignRepository)
- Import shared prisma client from lib/prisma
- Use Prisma types (Prisma.UserCreateInput) for type safety
- Export singleton instance (userRepo)

**Edge case:** Use findUnique for unique fields (id, email). Use findMany with where for lists. Prisma auto-commits (no manual commit needed vs SQLAlchemy).

**Pattern used in:** 6 repositories across lib/db/ directory
```

**Why BOTH are GOOD:**
- Both cite files + line numbers
- Both show repository pattern (same concept, different ORM)
- Both are type-safe (SQLAlchemy with types, Prisma generates types)
- Both show CRUD operations (get, create, update)
- Quality pattern same: file citations, real code, complete class
- Content framework-specific: SQLAlchemy async vs Prisma client methods

**BAD Example (Generic - ORM Tutorial):**
```markdown
## Database

Use an ORM to interact with the database. Define models and query them:

```python
user = db.query(User).filter(User.id == user_id).first()
```

ORMs provide abstraction over SQL queries.
```

**Why this is BAD:**
- No file citation
- No complete pattern (just one query line)
- Generic ORM example (not project-specific)
- Doesn't show repository pattern
- Sync vs async not specified
- No when-to-use or edge cases

---

### Section: Auth

**What to include:** Authentication pattern with real code example, when to use, edge cases.

**GOOD Example (JWT with FastAPI Dependencies):**
```markdown
## Auth

**Pattern:** JWT access tokens with FastAPI dependency injection

**Example from `app/api/deps.py` (lines 18-35):**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.core.config import settings
from app.models.user import User
from app.repositories.user_repository import UserRepository

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user_repo: UserRepository = Depends(get_user_repo)
) -> User:
    """Extract and validate JWT token, return current user."""
    token = credentials.credentials

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user
```

**When to use:**
- Inject as dependency in protected routes: `current_user: User = Depends(get_current_user)`
- Automatically validates token, fetches user, or raises 401
- Use in: All routes requiring authentication

**Edge case:** Token expiration handled by JWT library (exp claim). Refresh tokens in separate endpoint (auth/refresh). Never store tokens in database (stateless).

**Pattern used in:** 18 protected endpoints across api/v1/
```

**Why this is GOOD:**
- File citation (app/api/deps.py:18-35)
- Complete auth dependency (token extract, decode, user fetch)
- Shows FastAPI dependency injection (Depends pattern)
- Project-specific (uses jose, HTTPBearer, repository)
- When-to-use clear (inject in protected routes)
- Edge cases (token expiration, refresh, stateless)
- Usage count (18 endpoints)

**BAD Example (Generic - Auth Concept):**
```markdown
## Auth

This project uses JWT tokens for authentication. Users log in with credentials and receive a token. Include the token in the Authorization header for protected endpoints.
```

**Why this is BAD:**
- No code example
- No file citation
- Describes concept, not implementation
- Doesn't show how to validate tokens
- No dependency injection pattern
- Generic (could be any JWT auth)

---

### Section: Testing

**What to include:** Testing pattern with real code example, when to use, edge cases.

**GOOD Example (pytest with AsyncClient):**
```markdown
## Testing

**Pattern:** pytest with httpx AsyncClient for API testing

**Example from `tests/api/test_users.py` (lines 8-28):**
```python
import pytest
from httpx import AsyncClient

from app.main import app
from app.models.user import User

@pytest.mark.asyncio
async def test_create_user_success(test_db):
    """POST /users creates user with valid data."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/v1/users", json={
            "email": "new@example.com",
            "password": "SecurePass123",
            "name": "New User",
            "company_size": 50
        })

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com"
    assert "password" not in data  # Password excluded from response

@pytest.mark.asyncio
async def test_create_user_duplicate_email(test_db, test_user):
    """POST /users with duplicate email returns 400."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/v1/users", json={
            "email": test_user.email,  # Existing user email
            "password": "SecurePass123",
            "name": "Duplicate",
            "company_size": 50
        })

    assert response.status_code == 400
    assert response.json()["detail"]["error"] == "email_already_registered"
```

**When to use:**
- AsyncClient for API endpoint testing (matches async FastAPI app)
- test_db fixture for database (isolated per test)
- @pytest.mark.asyncio for async tests

**Edge case:** Use async with for client context manager (ensures cleanup). Test both success and error paths. Assert password excluded from response.

**Pattern used in:** 42 test functions across tests/api/ directory
```

**Why this is GOOD:**
- File citation (tests/api/test_users.py:8-28)
- Complete test examples (success + error case)
- Shows AsyncClient pattern (context manager)
- Project-specific (tests structured error detail dict)
- When-to-use explains fixtures and decorators
- Edge cases (context manager cleanup, password exclusion)
- Usage count (42 test functions)

**BAD Example (Generic - pytest Tutorial):**
```markdown
## Testing

Use pytest for testing. Write test functions starting with `test_`:

```python
def test_function():
    result = some_function()
    assert result == expected
```

Run with `pytest` command.
```

**Why this is BAD:**
- No file citation
- Generic pytest tutorial
- Doesn't show API testing pattern (AsyncClient)
- Doesn't show fixtures or async
- Trivial example (not project structure)

---

### Section: Framework Patterns

**What to include:** Framework-specific patterns unique to this stack, when to use, edge cases.

**GOOD Example (FastAPI Dependency Injection):**
```markdown
## Framework Patterns

**Pattern:** FastAPI dependency injection for shared resources

**Example from `app/api/v1/users.py` (lines 12-28) + `app/api/deps.py` (lines 8-15):**

**Dependency definition:**
```python
# app/api/deps.py
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_session

async def get_user_repo(db: AsyncSession = Depends(get_db_session)) -> UserRepository:
    """Dependency: User repository with DB session."""
    return UserRepository(db)
```

**Dependency usage in routes:**
```python
# app/api/v1/users.py
from fastapi import APIRouter, Depends

@router.post("/users", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    user_repo: UserRepository = Depends(get_user_repo)
):
    """Create new user."""
    return await user_repo.create(user.dict())
```

**When to use:**
- Database sessions: Depends(get_db_session)
- Repositories: Depends(get_user_repo), Depends(get_campaign_repo)
- Auth: Depends(get_current_user) for protected routes
- Config: Depends(get_settings) for settings access

**Edge case:** Dependencies auto-close resources (AsyncSession.close() called automatically). Chain dependencies (get_user_repo depends on get_db_session). Test by overriding (app.dependency_overrides in tests).

**Pattern used in:** All API routes use dependency injection (23 endpoints)
```

**Why this is GOOD:**
- File citations (users.py:12-28, deps.py:8-15)
- Shows both sides (dependency definition + usage)
- FastAPI-specific (Depends, dependency injection)
- Multiple use cases (DB, repositories, auth, config)
- Edge cases (auto-cleanup, chaining, testing overrides)
- Usage across codebase (all routes)

**BAD Example (Generic - Framework Description):**
```markdown
## Framework Patterns

FastAPI uses dependency injection. You can inject dependencies into route functions using Depends().
```

**Why this is BAD:**
- No code example
- No file citations
- Describes feature, doesn't show usage
- No when-to-use specifics
- No edge cases
- Generic (from FastAPI docs)

---

# 4. architecture.md Template

**Expected sections:** 4
**Length target:** 300-500 lines

---

### Section: Architecture Pattern

**What to include:** Architecture type (layered, microservices, etc.) with rationale, why chosen over alternatives, how it works.

**GOOD Example (Layered - With Rationale):**
```markdown
## Architecture Pattern

**Type:** Layered (API → Services → Repositories)

**Why this pattern:**
- **Team size:** 3 developers - need clear boundaries but not microservices overhead
- **Testability:** Service layer mockable in API tests (can test API without DB)
- **Clear ownership:** API owns routing, Services own logic, Repositories own data access

**Alternatives considered:**
1. **MVC:** Simpler (2 layers vs 3)
   - Rejected: Controllers get bloated with business logic (seen in previous project)
2. **Microservices:** Better scaling, team autonomy
   - Rejected: 3-person team can't maintain operational overhead (multiple DBs, deployments, monitoring)

**How it works:**
- API layer (app/api/): FastAPI routers, dependency injection, thin route handlers
- Service layer (app/services/): Business logic, validation, orchestration
- Repository layer (app/repositories/): SQL queries, ORM access, data mapping

**Dependency rule:** Each layer only imports from layer below. API never imports Repository directly.

**Trade-off:** 3 files per feature (router + service + repository) vs 1 (all in router). Worth it for testability.
```

**Why this is GOOD:**
- Explains WHY chosen (team size, testability, clear ownership)
- Lists alternatives with specific reasons for rejection
- Shows how pattern works (3 layers with purposes)
- States dependency rule (API can't import Repository)
- Acknowledges trade-off (3 files vs 1, testability justifies)

**BAD Example (Generic - Just States Pattern):**
```markdown
## Architecture Pattern

**Type:** Layered architecture

This project uses layered architecture to separate concerns. The layers are API, Services, and Data Access. This is a best practice for maintainable applications.
```

**Why this is BAD:**
- No rationale (WHY layered?)
- No alternatives (what else was considered?)
- No trade-offs (is it all positive?)
- Generic claim ("best practice" - for what context?)
- Could apply to any layered project

---

### Section: System Boundaries

**What to include:** What's inside the system, what's external, how boundaries are defined, integration points.

**GOOD Example (With Integration Points):**
```markdown
## System Boundaries

**Inside this system:**
- API server (FastAPI app serving HTTP)
- PostgreSQL database (user data, campaigns, metrics)
- Redis cache (session data, hot metrics)
- Background workers (Celery tasks for data sync)

**External services (we integrate with):**
- **Supabase Auth:** User authentication (we call their API, they manage users)
- **Google Ads API:** Campaign data source (we poll every 30 min)
- **Facebook Marketing API:** Campaign data source (webhook + polling hybrid)
- **SendGrid:** Email notifications (transactional only, no marketing emails)
- **Stripe:** Payment processing (subscription billing, we don't handle credit cards)

**Boundary principle:** We own business logic and data aggregation. We delegate identity (Supabase), payments (Stripe), and email delivery (SendGrid).

**Integration pattern:**
- Auth: Supabase SDK (API calls to Supabase)
- Ads: REST APIs (scheduled polling, store in our DB)
- Payments: Stripe webhooks (they call us when events happen)

**Data ownership:**
- User identity: Supabase (auth provider owns user records)
- Campaign metrics: Us (we aggregate and store historical data)
- Payment history: Stripe (they own transaction records, we cache subscription status)
```

**Why this is GOOD:**
- Clearly lists what's internal vs external
- Explains integration pattern per service (API calls, webhooks, polling)
- States boundary principle (we own business logic, delegate identity/payments)
- Specific integrations (Supabase for auth, Stripe for payments)
- Data ownership clear (who is source of truth for what)

**BAD Example (Generic - No Specifics):**
```markdown
## System Boundaries

The system integrates with several external services for authentication, payments, and third-party APIs. We maintain clear boundaries between our code and external dependencies.
```

**Why this is BAD:**
- No specific services listed (which auth? which payment provider?)
- No integration patterns (how do we integrate?)
- Vague boundary statement (what does "clear boundaries" mean?)
- No data ownership (who owns what data?)

---

### Section: Design Decisions

**What to include:** Major decisions with ADR-style documentation (context, alternatives, rationale, consequences).

**GOOD Example (ADR-Style Decision):**
```markdown
## Design Decisions

**Decision 1: Async SQLAlchemy Over Sync**

**Context:** Need to support 100+ concurrent users. Synchronous DB access blocks threads.

**Alternatives:**
1. **Sync SQLAlchemy:** Simpler, mature, most tutorials use sync
   - Pro: Easier to learn, more Stack Overflow answers
   - Con: Blocks threads, limits concurrent requests to ~20-30
2. **Async SQLAlchemy:** Thread-efficient, handles concurrent I/O
   - Pro: Can serve 100+ concurrent users with same resources
   - Con: Async syntax harder (await everywhere), fewer examples online

**Decision:** Async SQLAlchemy

**Rationale:** Performance requirement (100+ concurrent users) mandates async. Sync would require expensive horizontal scaling. Learning curve acceptable for 2x-3x throughput improvement.

**Consequences:**
- Positive: Can handle target load without scaling infrastructure
- Negative: All DB code must be async (await statements everywhere, harder for new devs)
- Implementation: AsyncSession from sqlalchemy.ext.asyncio, asyncpg driver

**Implemented in:** app/core/database.py:15-45
```

**Why this is GOOD:**
- Complete ADR format (context, alternatives, decision, rationale, consequences)
- Specific alternatives with pros/cons (sync vs async SQLAlchemy)
- Quantified rationale (100+ users, 2x-3x throughput)
- Positive AND negative consequences (honest about trade-offs)
- File citation (database.py:15-45)

**BAD Example (Generic - No Depth):**
```markdown
## Design Decisions

We chose to use async SQLAlchemy for better performance. Async is faster than sync for I/O operations.
```

**Why this is BAD:**
- No context (why was decision needed?)
- No alternatives (what else was considered?)
- Vague claim ("better performance" - how much better?)
- No consequences (what's the cost?)
- No file citation

---

### Section: Trade-Offs

**What to include:** What was optimized for, what was sacrificed, why trade-offs are acceptable.

**GOOD Example (Honest About Costs):**
```markdown
## Trade-Offs

**Optimized for:** Fast iteration and time-to-market

**What we chose:**
- Next.js Server Components over separate backend (simpler, faster development)
- Supabase over self-hosted database (no ops overhead, faster to production)
- Vercel over AWS (deploy in minutes vs days, no infrastructure management)

**What we gave up:**

**1. Backend flexibility:**
- **Cost:** Locked into Next.js for backend logic (can't easily switch to FastAPI if needs change)
- **Why acceptable:** Product is full-stack TypeScript, unlikely to need separate backend
- **Reversibility:** MEDIUM (could extract API layer if needed, but significant work)

**2. Database control:**
- **Cost:** Can't tune PostgreSQL config, locked into Supabase's defaults
- **Why acceptable:** Not at scale where tuning matters (500 users, not 500K)
- **Reversibility:** LOW (migration to self-hosted is painful, data migration + connection changes)

**3. Vendor lock-in:**
- **Cost:** Supabase (DB) + Vercel (hosting) + Stripe (payments) - all proprietary platforms
- **Why acceptable:** Startup velocity > infrastructure control. Can migrate later if needed.
- **Reversibility:** MEDIUM to LOW (Vercel easiest to leave, Supabase hardest)

**Decision:** Ship in 2 weeks vs 2 months. Trade-off is intentional. Re-evaluate at 10K users.
```

**Why this is GOOD:**
- States what optimized for (fast iteration)
- Lists specific trade-offs (backend flexibility, DB control, vendor lock-in)
- Explains cost AND why acceptable for each
- Reversibility assessment (can we undo this?)
- Quantified decision point (re-evaluate at 10K users)

**BAD Example (Generic - All Positive):**
```markdown
## Trade-Offs

We use modern managed services for faster development. This gives us good performance and scalability while reducing operational overhead.
```

**Why this is BAD:**
- No specific trade-offs (what did you give up?)
- All positive (sounds like no costs)
- Vague claims ("good performance" - compared to what?)
- No decisions to revisit (when would you change?)

---

# 5. testing.md Template

**Expected sections:** 6
**Length target:** 400-600 lines

---

### Section: Test Framework

**What to include:** Test framework with config, commands, conventions.

**GOOD Example (pytest with Config):**
```markdown
## Test Framework

**Framework:** pytest 8.0.0 (from requirements.txt)

**Configuration:** pytest.ini in root
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
addopts = --strict-markers --cov=app --cov-report=term-missing
```

**Run commands:**
```bash
# All tests
pytest

# Specific file
pytest tests/api/test_users.py

# Specific test
pytest tests/api/test_users.py::test_create_user_success

# With coverage
pytest --cov=app --cov-report=html

# Watch mode (pytest-watch)
ptw
```

**Key plugins:**
- pytest-asyncio: Async test support (@pytest.mark.asyncio)
- pytest-cov: Coverage reporting
- pytest-watch: Auto-rerun on file changes
- httpx: AsyncClient for API testing

**Conventions:**
- File naming: `test_*.py` (test_users.py, test_campaigns.py)
- Function naming: `test_<feature>_<scenario>` (test_create_user_success)
- Class organization: TestUserAPI, TestCampaignAPI (group related tests)

**Source:** pytest.ini, requirements.txt, analyzer detection
```

**Why this is GOOD:**
- File citation (pytest.ini config shown)
- Specific version (pytest 8.0.0)
- Real config with explanation (asyncio_mode, coverage options)
- Complete command examples (all tests, specific file, with coverage)
- Plugin list with purposes
- Naming conventions with examples

**BAD Example:**
```markdown
## Test Framework

Uses pytest for testing. Run tests with `pytest` command.
```

**Why this is BAD:**
- No config shown
- No version
- No plugins
- Minimal commands (just pytest)
- No conventions
- Generic

---

### Section: Test Structure

**What to include:** How tests are organized, file/directory structure, naming patterns.

**GOOD Example (With Directory Tree):**
```markdown
## Test Structure

**Organization:** Tests mirror app/ directory structure

**Directory layout:**
```
tests/
├── api/              # API endpoint tests
│   ├── test_users.py
│   ├── test_campaigns.py
│   └── test_auth.py
├── services/         # Business logic tests
│   ├── test_user_service.py
│   └── test_campaign_service.py
├── repositories/     # Data access tests
│   └── test_user_repository.py
├── conftest.py       # Shared fixtures
└── __init__.py
```

**Naming patterns:**
- **Files:** `test_*.py` (matches module: services/user_service.py → tests/services/test_user_service.py)
- **Classes:** `TestModuleName` (TestUserAPI, TestUserService, TestUserRepository)
- **Functions:** `test_method_scenario` (test_create_user_success, test_get_user_not_found)

**Test case naming:**
- Success cases: `test_<method>_success`
- Error cases: `test_<method>_<error>`
- Edge cases: `test_<method>_<edge_condition>`

**Example:**
- `test_create_user_success` (happy path)
- `test_create_user_duplicate_email` (error case)
- `test_create_user_invalid_password` (validation error)

**Fixture location:**
- Shared fixtures: tests/conftest.py (test_db, test_user, test_client)
- Module-specific: In test file (test_users.py has user-specific fixtures)

**Source:** Analyzer detection, tests/ directory structure
```

**Why this is GOOD:**
- Directory tree with annotations
- Naming patterns with examples
- Shows mirroring (app/services → tests/services)
- Test case naming convention (success, error, edge)
- Fixture organization (conftest vs module-specific)
- Analyzer source

**BAD Example:**
```markdown
## Test Structure

Tests are in tests/ directory. Test files start with `test_`.
```

**Why this is BAD:**
- No directory structure
- No naming patterns beyond file prefix
- No organization principle
- No fixture location
- Generic

---

### Section: Fixture Patterns

**What to include:** Fixtures used, scopes, how to create, examples from tests.

**GOOD Example (With Real Fixtures):**
```markdown
## Fixture Patterns

**Shared fixtures from `tests/conftest.py` (lines 15-48):**

```python
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from httpx import AsyncClient

from app.main import app
from app.core.database import Base

@pytest.fixture(scope="session")
async def test_engine():
    """Test database engine (session scope - reused across all tests)."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest.fixture
async def test_db(test_engine):
    """Test database session (function scope - fresh per test)."""
    async with AsyncSession(test_engine) as session:
        yield session
        await session.rollback()  # Rollback after test (isolation)

@pytest.fixture
async def test_user(test_db):
    """Create test user (function scope)."""
    user = User(email="test@example.com", name="Test User")
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user

@pytest.fixture
async def test_client():
    """HTTP test client (function scope)."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
```

**Fixture scopes:**
- `session`: Once per test run (test_engine - expensive setup)
- `function`: Once per test (test_db, test_user - isolation needed)
- Default: function scope

**Usage in tests:**
```python
async def test_get_user(test_user, test_client):
    """Fixtures injected by pytest."""
    response = await test_client.get(f"/users/{test_user.id}")
    assert response.status_code == 200
```

**Pattern:** Create test data via fixtures, pytest auto-injects, cleanup automatic

**Source:** tests/conftest.py (shared), individual test files (test-specific)
```

**Why this is GOOD:**
- File citation (tests/conftest.py:15-48)
- Complete fixture code (test_engine, test_db, test_user)
- Scope explanation (session vs function, why each)
- Usage example (fixture injection)
- Cleanup strategy (rollback for isolation)
- Real from project

**BAD Example:**
```markdown
## Fixture Patterns

Use pytest fixtures to set up test data. Define fixtures with @pytest.fixture decorator.

```python
@pytest.fixture
def user():
    return {"email": "test@test.com"}
```
```

**Why this is BAD:**
- No file citation
- Trivial example (dict, not real fixture)
- No scope explanation
- No cleanup strategy
- Generic (pytest tutorial)

---

### Section: Mocking Approach

**What to include:** What gets mocked, mocking library, examples from tests.

**GOOD Example (With unittest.mock):**
```markdown
## Mocking Approach

**Library:** unittest.mock (Python standard library)

**What we mock:**
- External APIs (Google Ads API, Facebook API - slow, rate-limited)
- Database in unit tests (repositories - for service layer tests)
- Email sending (SendGrid - don't send real emails in tests)
- Time/dates (datetime.now - for deterministic time-based tests)

**Example from `tests/services/test_campaign_service.py` (lines 25-45):**
```python
from unittest.mock import AsyncMock, patch
import pytest

@pytest.mark.asyncio
async def test_sync_campaign_from_google(test_campaign):
    """Sync campaign without calling real Google Ads API."""
    # Mock Google Ads API
    mock_google_api = AsyncMock()
    mock_google_api.get_campaign.return_value = {
        "id": "goog_123",
        "name": "Q4 Campaign",
        "budget": 5000,
        "impressions": 10000
    }

    with patch('app.services.campaign_service.google_ads_client', mock_google_api):
        result = await campaign_service.sync_from_google("goog_123")

    # Assert: Service called API correctly
    mock_google_api.get_campaign.assert_called_once_with("goog_123")

    # Assert: Result mapped correctly
    assert result.name == "Q4 Campaign"
    assert result.budget == 5000
```

**Mocking patterns:**
- AsyncMock for async functions (matches async service)
- patch() as context manager (scope limited to with block)
- return_value for mock responses
- assert_called_once_with() to verify calls

**Partial vs complete mocking:**
- External APIs: Complete mock (don't call real API)
- Database: Mock repository in service tests, real DB in integration tests
- Internal services: Usually real (test actual integration)

**Source:** tests/services/ directory, unittest.mock documentation
```

**Why this is GOOD:**
- File citation (test_campaign_service.py:25-45)
- Complete mock example (AsyncMock, patch, assertions)
- What gets mocked list (APIs, DB, email, time)
- Partial vs complete strategy
- Real async pattern (AsyncMock)
- Shows verification (assert_called_once_with)

**BAD Example:**
```markdown
## Mocking Approach

Mock external dependencies in tests. Use mocking library to create mock objects.
```

**Why this is BAD:**
- No library specified
- No code example
- No list of what gets mocked
- Generic (any project)

---

### Section: Coverage Expectations

**What to include:** Coverage targets, how to check, CI requirements, exemptions.

**GOOD Example (With Specific Targets):**
```markdown
## Coverage Expectations

**Targets:**
- **Line coverage:** ≥80% required for PR merge
- **Branch coverage:** ≥75% (nice to have, not enforced)
- **Function coverage:** ≥85% (all public functions tested)

**Check locally:**
```bash
pytest --cov=app --cov-report=html

# Open: htmlcov/index.html (shows file-by-file coverage)
```

**CI enforcement:**
- GitHub Actions runs: `pytest --cov=app --cov-report=xml`
- Uploads to Codecov
- PR blocked if coverage <80%
- Coverage diff shown in PR comments (did this PR lower coverage?)

**Exemptions (.coveragerc):**
```ini
[run]
omit =
    */tests/*           # Don't count test files
    */migrations/*      # Don't count Alembic migrations
    app/main.py         # App entry point (just imports, hard to test)
    */conftest.py       # Test fixtures
```

**Current coverage:** 84% (from last CI run)

**Coverage by module:**
- app/api/: 92% (API routes well-tested)
- app/services/: 87% (business logic covered)
- app/repositories/: 78% (data access, some edge cases missing)
- app/models/: 100% (Pydantic models, validators tested)

**Source:** .coveragerc, GitHub Actions ci.yml, Codecov dashboard
```

**Why this is GOOD:**
- Specific targets (≥80% line, ≥75% branch)
- Commands to check (pytest --cov with HTML report)
- CI enforcement (blocks PR if <80%)
- Exemptions with config file (.coveragerc)
- Current coverage metric (84%)
- Per-module breakdown

**BAD Example:**
```markdown
## Coverage Expectations

Aim for high test coverage. Run coverage reports to track progress.
```

**Why this is BAD:**
- No specific targets ("high" = vague)
- No commands
- No CI enforcement
- No exemptions
- Generic

---

### Section: Example Test Structure

**What to include:** Complete test file from codebase, annotated with pattern elements.

**GOOD Example (Complete Test File):**
```markdown
## Example Test Structure

**Complete test file from `tests/api/test_users.py` (lines 1-68):**

```python
"""User API endpoint tests."""
import pytest
from httpx import AsyncClient
from uuid import uuid4

from app.main import app
from app.models.user import User

# Fixtures
@pytest.fixture
async def test_user(test_db):
    """Create test user in database."""
    user = User(
        id=uuid4(),
        email="test@example.com",
        name="Test User",
        company_size=50
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user

# Test class
class TestUserAPI:
    """User API endpoint tests."""

    @pytest.mark.asyncio
    async def test_get_user_success(self, test_user, test_client):
        """GET /users/{id} returns user when exists."""
        response = await test_client.get(f"/users/{test_user.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["name"] == "Test User"
        assert "password" not in data  # Sensitive field excluded

    @pytest.mark.asyncio
    async def test_get_user_not_found(self, test_client):
        """GET /users/{id} returns 404 when user doesn't exist."""
        fake_id = uuid4()
        response = await test_client.get(f"/users/{fake_id}")

        assert response.status_code == 404
        assert response.json()["detail"]["error"] == "user_not_found"

    @pytest.mark.asyncio
    async def test_create_user_success(self, test_db, test_client):
        """POST /users creates user with valid data."""
        response = await test_client.post("/users", json={
            "email": "new@example.com",
            "password": "SecurePass123",
            "name": "New User",
            "company_size": 25
        })

        assert response.status_code == 201
        assert response.json()["email"] == "new@example.com"

        # Verify in database
        from app.repositories.user_repository import UserRepository
        repo = UserRepository(test_db)
        user = await repo.get_by_email("new@example.com")
        assert user is not None
```

**Pattern elements:**
- **Imports:** pytest, AsyncClient, app, models
- **Fixtures:** test_user for reusable data
- **Class organization:** TestUserAPI groups user endpoint tests
- **Decorators:** @pytest.mark.asyncio for async tests
- **Structure:** Arrange-Act-Assert (setup fixture, make request, assert response)
- **API testing:** AsyncClient from httpx
- **DB verification:** Check entity exists after creation
- **Edge cases:** Test 404 path, verify password excluded
```

**Why this is GOOD:**
- Complete real test file (68 lines, can copy as template)
- File citation (tests/api/test_users.py:1-68)
- Shows all patterns (fixtures, AsyncClient, class organization, AAA)
- Positive and negative tests (success + not_found)
- DB verification pattern
- Annotated with pattern explanation

**BAD Example (Generic - pytest Tutorial):**
```markdown
## Example Test Structure

```python
import pytest

def test_example():
    result = function_to_test()
    assert result == expected_value
```

Tests use pytest. Write test functions starting with `test_`. Use `assert` for assertions.
```

**Why this is BAD:**
- Generic pytest tutorial
- No file citation
- Doesn't show project patterns (fixtures, API testing, async)
- Trivial example
- No real test framework

---

# 6. workflow.md Template

**Expected sections:** 6
**Length target:** 600-800 lines

---

### Section: Git Workflow

**What to include:** Branching strategy, branch naming, merge strategy, step-by-step process.

**GOOD Example (With Real Branch Examples):**
```markdown
## Git Workflow

**Strategy:** Feature branches off main, squash merge

**Branch naming:**
- Features: `feature/user-authentication`, `feature/stripe-integration`, `feature/ai-insights`
- Fixes: `fix/login-redirect`, `fix/metric-calculation`, `fix/cache-invalidation`
- Chores: `chore/update-deps`, `chore/migrate-to-pydantic-v2`

**From git log analysis:** 47/50 recent branches (94%) follow this naming pattern

**Process:**
1. Create branch from main:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/new-dashboard
   ```

2. Work on feature (commit frequently, every 30-90 min):
   ```bash
   git add src/dashboard/*
   git commit -m "feat(dashboard): add campaign performance chart"
   ```

3. Push to remote:
   ```bash
   git push origin feature/new-dashboard
   ```

4. Create PR to main:
   ```bash
   gh pr create --base main --title "Add campaign performance dashboard"
   ```

5. After approval (1 required), squash merge:
   - GitHub UI: "Squash and merge" button
   - Combines all commits into one on main
   - Keeps main history linear

**Merge strategy:** Squash (all feature commits → single commit on main)

**Branch cleanup:** Delete after merge (GitHub auto-deletes, or `git branch -d feature/name` locally)
```

**Why this is GOOD:**
- Real branch examples from git log (feature/user-authentication)
- Actual commands (git checkout -b, gh pr create)
- Git log evidence (47/50 branches follow pattern)
- Step-by-step process (5 numbered steps)
- Specific merge strategy (squash, why: linear history)

**BAD Example (Generic - No Commands):**
```markdown
## Git Workflow

Create feature branches for new work. Make commits, push to remote, create pull requests. Merge after review.
```

**Why this is BAD:**
- No branch naming examples
- No actual commands
- No evidence from git log
- Generic process (could be any project)
- No merge strategy specified

---

### Section: Commit Conventions

**What to include:** Commit message format with real examples, tools used, enforcement.

**GOOD Example (Conventional Commits with Real Examples):**
```markdown
## Commit Conventions

**Format:** Conventional Commits (enforced by commitlint)

**Structure:** `type(scope): description`

**Types allowed:**
- feat: New feature
- fix: Bug fix
- docs: Documentation only
- chore: Maintenance (deps, config)
- refactor: Code changes (no behavior change)
- test: Adding/updating tests
- perf: Performance improvements

**Real examples from git log:**
```bash
feat(auth): implement JWT refresh token rotation
fix(dashboard): correct campaign ROI calculation for Q4 data
chore(deps): update FastAPI to 0.115.0 for security patch
refactor(api): extract common error handling to middleware
test(users): add integration tests for user creation flow
docs(readme): update setup instructions for M1 Macs
```

**Scope examples:** auth, dashboard, api, users, deps, readme (feature/area being changed)

**Enforcement:**
- Tool: commitlint + husky pre-commit hook
- Config: commitlint.config.js in root
- CI check: GitHub Actions validates commit messages
- Consistency: 89% (analyzer check of last 100 commits)

**Multi-line commits:**
```
feat(payments): integrate Stripe subscription billing

- Add Stripe SDK and webhook endpoint
- Create subscription service layer
- Add tests for payment flow (12 test cases)
- Update user model with subscription_id field
```

**Source:** git log analysis, commitlint.config.js
```

**Why this is GOOD:**
- Real commit messages from git log (not invented)
- Shows all types with real examples
- Specific scope examples (auth, dashboard, api)
- Tool enforcement specified (commitlint + husky)
- Consistency metric (89%)
- Multi-line format shown

**BAD Example (Generic - No Real Commits):**
```markdown
## Commit Conventions

Use descriptive commit messages. Include what was changed and why.

Example: "Add user authentication feature"
```

**Why this is BAD:**
- No format specification (conventional? semantic?)
- No real commits from git log
- Generic example (not from project)
- No tools or enforcement
- No consistency metrics

---

### Section: Pull Request Process

**What to include:** PR template, review requirements, CI checks, merge process.

**GOOD Example (With Template and Requirements):**
```markdown
## Pull Request Process

**Template:** .github/pull_request_template.md (required sections)

**Required PR elements:**
```markdown
## What Changed
[Description of changes]

## Why
[Rationale for change]

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] No regressions in existing functionality

## Checklist
- [ ] Code follows conventions (linted + formatted)
- [ ] No console.log in production code
- [ ] Documentation updated if needed
```

**Review requirements:**
- **Approvals:** 1 required (any team member)
- **Self-review:** Author reviews own PR first (check diff, add comments)
- **Response time:** Reviewers respond within 24 hours

**CI checks (must pass):**
1. Tests: All tests pass (`pytest tests/` for backend)
2. Lint: ESLint passes (no errors, warnings ok if justified)
3. Type check: `tsc --noEmit` passes (no type errors)
4. Build: Production build succeeds

**Merge process:**
1. Author creates PR, self-reviews
2. Assign reviewer, link issue if applicable
3. CI runs (wait for green checkmark)
4. Reviewer approves or requests changes
5. If changes requested: Author addresses, re-requests review
6. After approval + green CI: Author squash-merges
7. Branch auto-deleted by GitHub

**Merge method:** Squash and merge (keeps main history clean)

**From analysis:** 92% of last 50 PRs followed this process
```

**Why this is GOOD:**
- Actual PR template content (shows required sections)
- Specific review requirements (1 approval, 24hr response)
- Complete CI check list (tests, lint, typecheck, build)
- Step-by-step merge process (7 steps)
- Evidence (92% of 50 PRs followed)
- Template file citation (.github/pull_request_template.md)

**BAD Example (Generic - No Process):**
```markdown
## Pull Request Process

Create a pull request when your feature is ready. Get it reviewed and merge to main after approval.
```

**Why this is BAD:**
- No PR template
- No review requirements (how many approvals?)
- No CI checks specified
- No merge method (squash? merge? rebase?)
- Generic (any project)

---

### Section: CI/CD Pipeline

**What to include:** What runs on what trigger, CI config files, checks performed.

**GOOD Example (With Config and Triggers):**
```markdown
## CI/CD Pipeline

**CI Configuration:** .github/workflows/ci.yml

**Triggers:**
- **On PR:** Run tests, lint, type check (prevent broken code from merging)
- **On merge to main:** Run tests + build + deploy to production
- **On push to staging:** Deploy to staging environment

**Jobs on PR:**

**1. Test (runs on: ubuntu-latest, python 3.11)**
```yaml
- Install deps: poetry install
- Run migrations: alembic upgrade head (test DB)
- Run tests: pytest tests/ --cov=app --cov-report=xml
- Upload coverage: codecov (must be ≥80%)
```

**2. Lint**
```yaml
- Run: black --check app/
- Run: isort --check app/
- Fail if code not formatted (prevents unformatted code in main)
```

**3. Type Check**
```yaml
- Run: mypy app/
- Fail on type errors (strict mode enabled)
```

**Jobs on merge to main:**
- All PR checks (tests, lint, typecheck)
- Build Docker image: `docker build -t app:${GITHUB_SHA}`
- Push to registry: AWS ECR
- Deploy: Update ECS service with new image
- Health check: Ping /health endpoint, rollback if fails

**Deployment gates:**
- Tests must pass (100% required)
- Coverage must be ≥80%
- No type errors
- Docker build must succeed

**Rollback:** Automatic if health check fails, manual via GitHub Actions (deploy previous SHA)

**Duration:** PR checks ~4 min, deploy ~8 min

**Source:** .github/workflows/ci.yml (lines 1-120)
```

**Why this is GOOD:**
- Config file citation (.github/workflows/ci.yml)
- Specific triggers (PR, merge, push to staging)
- Complete job descriptions (commands, what they do)
- Deployment gates (coverage ≥80%, tests pass)
- Rollback strategy (auto on health fail)
- Timing (4 min PR, 8 min deploy)

**BAD Example (Generic - No Details):**
```markdown
## CI/CD Pipeline

GitHub Actions runs tests on pull requests. Tests must pass before merging. Deploys to production after merge.
```

**Why this is BAD:**
- No config file citation
- No specific jobs (what runs?)
- No deployment details (how? where?)
- No gates or requirements
- Generic (any GitHub Actions setup)

---

### Section: Deployment

**What to include:** Deployment target, trigger, process, rollback.

**GOOD Example (With Commands and Process):**
```markdown
## Deployment

**Target:** Vercel (production + preview)

**Trigger:**
- **Merge to main:** Auto-deploy to production (vercel.com/myapp)
- **PR creation:** Auto-deploy preview (unique URL per PR)
- **Push to staging:** Deploy to staging.myapp.com

**Process (automatic via Vercel Git integration):**
1. Git push triggers Vercel webhook
2. Vercel clones repo, detects Next.js
3. Installs deps: `npm ci`
4. Builds: `npm run build` (production build)
5. Deploys: Static assets to CDN, functions to edge network
6. Health check: GET / and /api/health
7. If healthy: Route traffic to new version
8. If unhealthy: Keep old version, notify team

**Environments:**
- Production: vercel.com/myapp (main branch)
- Staging: staging.myapp.com (staging branch)
- Preview: [pr-number].myapp.vercel.app (every PR)

**Environment variables:**
- Set in Vercel dashboard (Settings → Environment Variables)
- Production: DATABASE_URL, STRIPE_SECRET_KEY, etc.
- Preview: Uses staging database (preview envs share staging DB)

**Rollback:**
- Via Vercel dashboard: Deployments → previous deployment → "Promote to Production"
- Or: `vercel rollback` CLI command
- Instant rollback (no rebuild, just route traffic)

**Monitoring:** Vercel Analytics shows deployment status, logs, errors

**Deploy time:** ~2 minutes (build + deploy)

**Source:** vercel.json, Vercel dashboard configuration
```

**Why this is GOOD:**
- Specific platform (Vercel)
- Complete trigger list (merge, PR, staging push)
- Step-by-step auto-deploy (8 steps)
- Environment breakdown (production, staging, preview)
- Rollback process (dashboard + CLI command)
- Timing (2 min deploy)

**BAD Example (Generic - No Process):**
```markdown
## Deployment

Deploys to production on merge to main. Use the hosting platform's dashboard to manage deployments.
```

**Why this is BAD:**
- No platform specified (Vercel? AWS? Railway?)
- No process (how does deploy work?)
- No environments (staging? preview?)
- No rollback strategy
- Generic (any deployment)

---

### Section: Environment Management

**What to include:** Required env vars, secrets management, how environments differ.

**GOOD Example (With Required Vars List):**
```markdown
## Environment Management

**Required environment variables (from .env.example):**

**Database:**
- `DATABASE_URL`: PostgreSQL connection string
  - Format: `postgresql://user:password@host:5432/dbname`
  - Local: `postgresql://localhost:5432/myapp_dev`
  - Production: Supabase connection string (from dashboard)

**Auth:**
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Public API key (safe to expose in frontend)
- `SUPABASE_SERVICE_KEY`: Admin key (backend only, NEVER expose)
- `JWT_SECRET`: Token signing key (random 32+ char string)

**External APIs:**
- `GOOGLE_ADS_API_KEY`: Google Ads API access
- `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET`: Facebook Marketing API
- `STRIPE_SECRET_KEY`: Stripe payments (sk_live_... for production)
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signature validation

**Optional:**
- `REDIS_URL`: Redis connection (defaults to localhost:6379)
- `LOG_LEVEL`: Logging verbosity (defaults to "info")

**Secrets management:**
- **Local dev:** .env file (git ignored, copy from .env.example)
- **Production:** Vercel Environment Variables (encrypted, injected at runtime)
- **Rotation:** Quarterly for JWT_SECRET, immediately if compromised

**Environment differences:**
- **Development:** SQLite or local PostgreSQL, no Redis (optional)
- **Staging:** Shared Supabase project (staging database), shared Redis
- **Production:** Separate Supabase project, separate Redis, all secrets rotated

**Setup for new developer:**
1. Copy: `cp .env.example .env`
2. Fill required vars (DATABASE_URL, SUPABASE_URL, etc.)
3. Generate JWT_SECRET: `openssl rand -hex 32`
4. Get API keys from team (Google Ads, Facebook, Stripe test keys)
5. Run: `npm run dev` (starts with .env loaded)

**Source:** .env.example (lists all vars with descriptions)
```

**Why this is GOOD:**
- Complete env var list (DATABASE_URL, SUPABASE_*, API keys)
- Format examples (postgresql://...)
- Secrets management (local .env, Vercel for production)
- Environment differences (dev, staging, production)
- Setup process for new devs (5 steps with commands)
- File citation (.env.example)

**BAD Example (Generic - No Var List):**
```markdown
## Environment Management

Environment variables are stored in .env file for local development and in the hosting platform for production. Copy .env.example to .env and fill in values.
```

**Why this is BAD:**
- No env var list (which vars needed?)
- No format examples (what does DATABASE_URL look like?)
- No secrets management strategy
- No environment differences
- Generic (any project)

---

# 7. debugging.md Template

**Expected sections:** 5
**Length target:** 300-500 lines

---

### Section: Logging

**What to include:** Logging setup, format, levels, where logs go.

**GOOD Example (With Setup and Examples):**
```markdown
## Logging

**Setup:** Python logging with JSON formatter (from `app/core/logging_config.py` lines 8-28)

**Configuration:**
```python
import logging
import sys
from pythonjsonlogger import jsonlogger

# Format: JSON structured logs
formatter = jsonlogger.JsonFormatter(
    '%(asctime)s %(name)s %(levelname)s %(message)s',
    rename_fields={'asctime': 'timestamp', 'name': 'logger', 'levelname': 'level'}
)

# Handler: stdout (captured by Vercel/CloudWatch)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(formatter)

# Root logger
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(handler)
```

**Log levels used:**
- **DEBUG:** Detailed diagnostic (DB queries, cache hits) - dev only
- **INFO:** Important events (user created, payment processed)
- **WARNING:** Degraded behavior (API slow, cache miss, retry)
- **ERROR:** Application errors (API failures, validation errors)
- **CRITICAL:** System failures (DB connection lost, service crash)

**Example usage from `app/api/v1/users.py` (lines 52-58):**
```python
logger.info(f"User created: {user.id}", extra={
    "user_id": str(user.id),
    "email": user.email,
    "company_size": user.company_size
})

try:
    await external_api.call()
except Exception as e:
    logger.error(f"External API failed: {e}", exc_info=True, extra={
        "api": "google_ads",
        "user_id": str(user.id)
    })
```

**Where logs go:**
- Local dev: stdout (terminal)
- Production: Vercel captures stdout → sends to integrated logging (Datadog)
- Access: Vercel dashboard Logs tab, or Datadog dashboard

**Structured logging benefits:**
- Searchable by field: `user_id:abc-123`
- Aggregatable: Count errors by api field
- JSON parseable: Direct to monitoring tools

**Source:** app/core/logging_config.py, Vercel logging docs
```

**Why this is GOOD:**
- File citations (logging_config.py:8-28, users.py:52-58)
- Complete setup code (JSON formatter, handler)
- Level definitions with when-to-use (INFO for events, ERROR for failures)
- Usage examples (logger.info with extra fields)
- Where logs go (local vs production)
- Structured logging benefits explained

**BAD Example:**
```markdown
## Logging

Use Python's logging module. Log important events with logger.info() and errors with logger.error().
```

**Why this is BAD:**
- No setup shown
- No format specification (JSON? text?)
- No file citations
- No where logs go
- Generic (Python logging tutorial)

---

### Section: Error Tracing

**What to include:** Error tracking tool, how to access, what gets captured.

**GOOD Example (Sentry Integration):**
```markdown
## Error Tracing

**Tool:** Sentry (sentry.io)

**Setup from `app/core/sentry_config.py` (lines 5-18):**
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastAPIIntegration
from app.core.config import settings

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment=settings.ENVIRONMENT,  # dev, staging, production
    traces_sample_rate=0.1,  # 10% transaction sampling (reduce quota usage)
    profiles_sample_rate=0.1,  # 10% profiling
    integrations=[FastAPIIntegration(transaction_style="endpoint")],
    before_send=lambda event, hint: None if settings.ENVIRONMENT == "dev" else event
)
```

**What gets captured:**
- Unhandled exceptions (automatic - Sentry catches all)
- Stack traces (full traceback with local variables)
- Request context (URL, method, headers, user_id if authenticated)
- Breadcrumbs (logs before error - last 50 events)
- Performance traces (10% sample of requests for slow endpoint detection)

**Access:**
- Dashboard: sentry.io/organizations/myteam/issues
- Alerts: Email + Slack on new errors
- Grouping: Similar errors grouped by stack trace fingerprint

**Captured for each error:**
- Error message and type
- Stack trace with code context (5 lines before/after each frame)
- User ID (if authenticated request)
- Request URL and method
- Timestamp and environment (dev/staging/production)

**Source:** app/core/sentry_config.py, Sentry dashboard
```

**Why this is GOOD:**
- File citation (sentry_config.py:5-18)
- Complete setup code (init with options)
- What gets captured list (exceptions, traces, context, breadcrumbs)
- How to access (dashboard URL)
- Sampling strategy (10% to reduce quota)
- Environment filtering (no Sentry in dev)

**BAD Example:**
```markdown
## Error Tracing

Errors are tracked and can be viewed in the error tracking dashboard.
```

**Why this is BAD:**
- No tool specified (Sentry? Rollbar?)
- No setup shown
- No what gets captured
- No dashboard access
- Generic

---

### Section: Common Failure Modes

**What to include:** Specific failures with symptom → cause → diagnosis → fix flow.

**GOOD Example (Specific Failures with Diagnosis):**
```markdown
## Common Failure Modes

**Failure 1: Stripe Webhook Signature Validation Fails**

**Symptom:**
- Webhook events return 400 "Invalid signature"
- Stripe dashboard shows failed delivery attempts
- Payments succeed but order status not updated

**Cause:**
- Stripe webhook secret changed during key rotation
- Environment variable STRIPE_WEBHOOK_SECRET not updated in Vercel
- Code: app/api/webhooks.py:25 validates with old secret

**Diagnosis:**
1. Check Vercel env vars: `vercel env ls`
2. Compare with Stripe dashboard webhook secret
3. Check logs: `vercel logs` filter by "stripe" - shows "Invalid signature"

**Fix:**
- Update Vercel env: `vercel env add STRIPE_WEBHOOK_SECRET` (paste new secret)
- Redeploy: `git push` (triggers deploy with new env var)
- Test: Send test webhook from Stripe dashboard
- Verify: Logs show "Webhook processed successfully"

**Prevention:** Document webhook secrets in .env.example, add to onboarding checklist

**Frequency:** Happened twice during key rotation (2024-11, 2025-03)

---

**Failure 2: Redis Connection Timeout in Production**

**Symptom:**
- API endpoints timeout after 10-15 seconds
- Logs: "Redis connection timeout after 5000ms"
- Affects: All endpoints using cache (dashboard, metrics)

**Cause:**
- Redis free tier (Upstash): 1GB memory, exhausted during traffic spike
- Eviction policy: allkeys-lru (removes oldest keys)
- But connections not released (missing redis.quit() in error handler)

**Diagnosis:**
1. Check Redis: `redis-cli INFO memory` (shows used_memory near max)
2. Check connections: `redis-cli CLIENT LIST | wc -l` (shows 50+ connections)
3. Code: app/core/cache.py:78 - no connection cleanup in except block

**Fix:**
- Immediate: Clear Redis (`redis-cli FLUSHDB`) - loses cache, but restores service
- Short-term: Add finally block to release connections (cache.py:78)
- Long-term: Upgrade to paid tier (10GB) or reduce cache TTL

**Prevention:** Monitor Redis memory, alert at 80% capacity

**Frequency:** Monthly during traffic spikes

---

**Failure 3: Database Connection Pool Exhausted**

**Symptom:**
- 500 errors on random endpoints
- Logs: "TimeoutError: QueuePool limit of 10 exceeded"
- Happens during peak usage (100+ concurrent requests)

**Cause:**
- Default pool size: 10 connections (SQLAlchemy default)
- Long-running queries hold connections (dashboard metrics query takes 3s)
- Pool exhausted, new requests timeout

**Diagnosis:**
1. Check active connections: `SELECT count(*) FROM pg_stat_activity`
2. Check pool config: app/core/database.py:15 - pool_size=10
3. Check slow queries: Enable query logging, find 3s+ queries

**Fix:**
- Immediate: Increase pool size to 20 (`create_async_engine(..., pool_size=20)`)
- Long-term: Optimize slow queries (add indexes, reduce joins)
- Monitor: Alert when pool >80% utilized

**Prevention:** Load test before prod, set pool size for expected concurrency

**Frequency:** Once during launch week (traffic spike)
```

**Why this is GOOD:**
- Three specific real failures (Stripe webhooks, Redis, DB pool)
- Complete symptom → cause → diagnosis → fix flow for each
- Actual commands (vercel env ls, redis-cli INFO)
- File citations (webhooks.py:25, cache.py:78, database.py:15)
- Frequency data (happened twice, monthly, once)
- Prevention strategies

**BAD Example:**
```markdown
## Common Failure Modes

Check logs when errors occur. Common issues include database connections, API timeouts, and configuration problems. Use debugger to identify root cause and implement fixes.
```

**Why this is BAD:**
- No specific failures (vague "database connections")
- No symptoms, causes, or diagnosis steps
- No real commands or file citations
- Generic advice
- No evidence (could be made up)

---

### Section: Debugging Workflow

**What to include:** Systematic process for debugging, tools used, step-by-step methodology.

**GOOD Example (With Process and Tools):**
```markdown
## Debugging Workflow

**Systematic approach:**

**Step 1: Reproduce consistently**
- Get exact repro steps (URL, payload, user actions)
- Reproduce locally if possible (easier to debug)
- Document: "Bug occurs when: user submits form with email >255 chars"

**Step 2: Gather information**
- Check logs: `vercel logs --filter="error"` (production) or local stdout
- Read stack trace: Identify error location (file + line)
- Note error message: Exact text, error type (ValidationError, HTTPException)
- Check Sentry: View full context (request data, breadcrumbs, user)

**Step 3: Form hypotheses**
- What could cause this? (validation missing? DB constraint? race condition?)
- List 2-3 most likely causes (prioritize by probability)
- Example: "Likely cause 1: email field has max_length=100 in Pydantic but 255 in DB schema (mismatch)"

**Step 4: Test hypotheses**
- Add logging: `logger.debug(f"Email length: {len(email)}")` at suspected point
- Use debugger: Set breakpoint in VS Code at app/api/users.py:52
- Check database: `SELECT character_maximum_length FROM information_schema.columns WHERE column_name='email'`
- Reproduce with added logging/breakpoints

**Step 5: Identify root cause**
- Narrow down to exact cause (validation max_length mismatch)
- Verify: Change Pydantic to 255, error disappears
- Document: "Root cause: Pydantic Field(max_length=100) but DB column varchar(255)"

**Step 6: Implement fix + regression test**
- Fix: Update Pydantic model `email: str = Field(max_length=255)`
- Test: Add test case `test_create_user_long_email` (254 char email, should succeed)
- Commit: `fix(users): correct email max_length to match DB schema (255)`

**Tools used:**
- **Logs:** Vercel logs, local stdout
- **Debugger:** VS Code debugger (F5 to start, breakpoints)
- **Sentry:** Error dashboard (sentry.io)
- **Database:** psql for direct queries
- **Network:** Browser DevTools for API calls

**Collaboration:** Pair debugging on Zoom for complex issues (screen share, discuss hypotheses)

**Source:** Team debugging sessions, established process
```

**Why this is GOOD:**
- 6-step systematic process (reproduce → gather → hypothesize → test → identify → fix)
- Real example woven through (email validation bug)
- Specific tools (Vercel logs, VS Code debugger, Sentry, psql)
- Commands and techniques (logger.debug, breakpoints, DB queries)
- Includes regression test (prevent recurrence)
- Collaboration mention (pair debugging)

**BAD Example:**
```markdown
## Debugging Workflow

When debugging, first reproduce the issue, then check logs to find the error, use the debugger if needed, and implement a fix once the root cause is identified.
```

**Why this is BAD:**
- High-level description (no specific process)
- No tools mentioned
- No examples
- No commands
- Generic (any debugging)

---

### Section: Observability

**What to include:** Monitoring tools, dashboards, key metrics, alerts.

**GOOD Example (With Tools and Dashboards):**
```markdown
## Observability

**Monitoring:** Vercel Analytics + Datadog APM

**Dashboards:**
1. **Vercel Analytics** (vercel.com/myteam/myapp/analytics)
   - Real User Monitoring (page loads, Core Web Vitals)
   - Serverless function metrics (invocations, duration, errors)
   - Access: Vercel dashboard → Analytics tab

2. **Datadog APM** (app.datadoghq.com/apm/services/myapp-api)
   - API endpoint latency (p50, p95, p99)
   - Error rates by endpoint
   - Database query performance
   - Access: Datadog dashboard (credentials in 1Password)

**Key metrics monitored:**
- **API response time:** p95 <500ms (target), alert if >1s
- **Error rate:** <1% (target), alert if >5% over 5 min
- **Database query time:** p95 <200ms (target), alert if >500ms
- **Cache hit rate:** >70% (target), alert if <50%

**Alerts configured:**
- Slack #alerts channel for:
  - Error rate >5% for 5 minutes
  - API p95 latency >1s for 5 minutes
  - Database connections >80% of pool
  - Redis memory >90% capacity

**Alert response:**
- P0 (service down): Immediate (drop everything)
- P1 (degraded): Within 1 hour
- P2 (warning): Within 24 hours

**Trace example in code (app/api/v1/campaigns.py lines 35-42):**
```python
from ddtrace import tracer

@tracer.wrap(service="campaign-sync", resource="sync_from_google")
async def sync_campaign(campaign_id: str):
    """Sync campaign with distributed tracing."""
    # Datadog APM traces this function (duration, errors)
    result = await google_ads.get_campaign(campaign_id)
    return result
```

**Source:** Vercel Analytics setup, Datadog integration, app/core/tracing.py
```

**Why this is GOOD:**
- Specific tools (Vercel Analytics, Datadog APM)
- Dashboard URLs with access instructions
- Key metrics with targets (p95 <500ms, error <1%)
- Alert thresholds (>5% errors for 5 min)
- Response SLAs (P0 immediate, P1 1hr, P2 24hr)
- Tracing code example (ddtrace.tracer.wrap)

**BAD Example:**
```markdown
## Observability

The application uses monitoring tools to track performance and errors. Check the monitoring dashboard when issues occur.
```

**Why this is BAD:**
- No tools specified
- No dashboard URLs
- No metrics (what's monitored?)
- No alerts
- Generic

---

# Footer

**Remember:**
- These templates show QUALITY patterns (file citations, real examples, metrics)
- Always adapt to your specific project (don't copy-paste generic examples)
- Use analyzer output, git log, and config files as evidence
- Include consistency metrics where available (94% camelCase, 89% conventional commits)
- Cite file paths with line numbers for all code examples

**Questions?**
- If unclear about what to include, refer to GOOD examples above
- If analyzer doesn't provide certain data, document what's available
- If conventions are inconsistent, document the inconsistency (72% camelCase, 28% PascalCase - mixed)
