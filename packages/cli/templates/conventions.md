# Coding Conventions - {{projectName}}

## Naming Conventions

<!-- TODO: Document naming conventions for files, classes, functions, variables, constants -->
<!-- Example 1 (Python): "Files: snake_case (user_repository.py). Classes: PascalCase (UserRepository, AuthService). Functions: snake_case (get_user_by_id, validate_email). Variables: snake_case (user_data, is_valid). Constants: UPPER_SNAKE_CASE (MAX_RETRY_COUNT, API_BASE_URL)." -->
<!-- Example 2 (TypeScript): "Files: kebab-case for components (user-profile.tsx), camelCase for utilities (formatDate.ts). Classes: PascalCase (UserService). Functions: camelCase (getUserById). Interfaces: PascalCase (User, AuthConfig). Constants: UPPER_SNAKE_CASE or camelCase." -->
<!-- Example 3 (Go): "Files: snake_case or lowercase (user_repository.go). Packages: lowercase single word (auth, users). Exported: PascalCase (GetUser, UserRepository). Unexported: camelCase (validateEmail, parseToken). Constants: PascalCase or camelCase." -->

## Code Style

<!-- TODO: Document code style guidelines (formatters, linters, line length, indentation) -->
<!-- Example 1 (Python): "Black formatter (88 char line length, no configuration). isort for import sorting (standard lib, third-party, local). flake8 linter (ignore E501 line length - Black handles). Docstrings: Google style (Args, Returns, Raises sections)." -->
<!-- Example 2 (TypeScript): "Prettier formatter (2 spaces, single quotes, trailing commas). ESLint with TypeScript rules (no any, no explicit any, prefer interfaces). 100 char line length. Semicolons required." -->
<!-- Example 3 (Go): "gofmt for formatting (tabs, no configuration). golangci-lint with default rules. goimports for import organization. 120 char line length suggested. Exported functions require comments." -->

## Import Organization

<!-- TODO: Document how imports are organized (order, grouping, absolute vs relative) -->
<!-- Example 1 (Python): "Order: standard library, third-party (alphabetical), local (alphabetical). Absolute imports preferred (from src.services import UserService), not relative. Group with blank lines: stdlib, third-party, local." -->
<!-- Example 2 (TypeScript): "Order: React/Next.js, third-party, local components, local utilities, types, styles. Use @ alias for imports (@/components/Button), not relative (../../components/Button). Group by source." -->
<!-- Example 3 (Go): "Order: standard library, third-party, local (project packages). Grouped with blank lines. Use full import paths (github.com/project/pkg/auth), not relative. Group by domain when clear." -->

## Type Hints / Type Annotations

<!-- TODO: Document type annotation requirements (required, optional, style) -->
<!-- Example 1 (Python): "Type hints required for all function signatures (def get_user(id: str) -> User | None). Use typing module (List, Dict, Optional, Union). Pydantic models for complex types. mypy for type checking." -->
<!-- Example 2 (TypeScript): "TypeScript strict mode enabled. All functions typed (function getUser(id: string): User | null). Avoid any (use unknown if type truly unknown). Prefer interfaces over types for objects." -->
<!-- Example 3 (Go): "Go is statically typed. Use specific types (int64, string), avoid interface{} (use any in Go 1.18+). Define interfaces for abstractions (UserRepository interface). Struct tags for JSON serialization." -->

## Documentation / Comments

<!-- TODO: Document commenting style (docstrings, JSDoc, inline comments, when to comment) -->
<!-- Example 1 (Python): "Docstrings required for public functions and classes (Google style with Args, Returns, Raises). Inline comments for non-obvious logic only. Code should be self-documenting (clear names, small functions)." -->
<!-- Example 2 (TypeScript): "JSDoc for public API functions (/** @param, @returns, @throws *\/). Inline comments sparingly (explain why, not what). Use TypeScript types for documentation (type annotations show intent)." -->
<!-- Example 3 (Go): "Exported functions require comment starting with function name (// GetUser retrieves user by ID). Inline comments for non-obvious logic. Package comment in doc.go. Use godoc for documentation generation." -->

## Testing Conventions

<!-- TODO: Document test file naming, test structure, fixture organization, assertion style -->
<!-- Example 1 (Python): "Test files: test_*.py in tests/ directory mirroring src/ structure. Fixtures in conftest.py (db_session, test_client, sample_data). Test naming: test_function_name_scenario (test_get_user_returns_user_when_exists). Use assert with clear messages." -->
<!-- Example 2 (TypeScript): "Test files: *.test.tsx colocated with source (Button.test.tsx next to Button.tsx). Describe blocks for grouping. Test naming: 'should behavior when condition'. Use Vitest matchers (expect(x).toBe(y)). MSW for API mocking." -->
<!-- Example 3 (Go): "Test files: *_test.go in same package. Test naming: TestFunctionName_Scenario (TestGetUser_ReturnsErrorWhenNotFound). Table-driven tests for multiple cases. Use testify/assert for assertions. testcontainers for integration tests." -->

## Git Conventions

<!-- TODO: Document commit message format, branch naming, PR process -->
<!-- Example 1: "Commits: Conventional Commits (feat:, fix:, docs:, refactor:, test:). Example: 'feat(auth): add JWT refresh token rotation'. Branches: feature/*, bugfix/*, hotfix/*. PRs: Squash merge to main, require 1 approval, CI must pass." -->
<!-- Example 2: "Commits: Imperative mood, 50 char subject, 72 char body (if needed). Branches: username/feature-name. PRs: Merge commits to main, require 2 approvals, all checks pass. Use PR template." -->
<!-- Example 3: "Commits: Single line (no body unless complex), start with verb (Add, Fix, Update, Refactor). Branches: type/short-description (feat/user-auth, fix/login-bug). PRs: Rebase merge, 1 approval, go vet and tests pass." -->

---

*Document your conventions. Follow them consistently. Don't re-debate decisions.*
*Update when conventions change. Consistency reduces cognitive load.*
