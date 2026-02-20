# Detected Patterns - {{projectName}}

## Architectural Patterns

<!-- TODO: Document architectural patterns used in your codebase -->
<!-- Example 1: "Repository pattern: All database access through repository classes in src/repositories/. Services call repositories, never access database directly. Enables testing (mock repositories), maintainability (change database without changing services)." -->
<!-- Example 2: "Server Component pattern: Default to Server Components (zero JavaScript shipped). Use 'use client' only for interactivity. Fetch data in Server Components, pass to Client Components as props." -->
<!-- Example 3: "Dependency injection: Constructor injection for services. Interfaces define contracts. Implementations injected at runtime. Enables mocking for tests." -->

## Coding Patterns

<!-- TODO: Document common coding patterns (factory, singleton, dependency injection, builder, etc.) -->
<!-- Example 1: "Factory pattern: UserFactory.create() for test data generation. Centralizes creation logic, returns valid objects. Used in test fixtures." -->
<!-- Example 2: "Dependency injection: FastAPI Depends() injects services and repositories into route handlers. Services injected into constructors. Enables testing with mock dependencies." -->
<!-- Example 3: "Error wrapping: Wrap errors with context using fmt.Errorf('failed to get user: %w', err). Preserves error chain for debugging. Use errors.Is() and errors.As() for type checking." -->

## Error Handling

<!-- TODO: Document how errors are handled (exceptions, error types, try/catch patterns, middleware) -->
<!-- Example 1: "Custom exceptions in src/exceptions.py (ValidationError, AuthenticationError, NotFoundError). FastAPI exception handlers map to HTTP status codes (400, 401, 404). Try/except in routes, let exceptions propagate to handlers." -->
<!-- Example 2: "Error boundaries in React for UI errors. API errors returned as {error: {message, code}} in responses. Toast notifications for user-facing errors. Sentry for error tracking." -->
<!-- Example 3: "Error returns (value, error) pattern. Check err != nil after every function call. Wrap errors with context. Custom error types implement error interface." -->

## Validation

<!-- TODO: Document validation approach (library used, where validation occurs, what gets validated) -->
<!-- Example 1: "Pydantic models for request validation. Automatic validation in FastAPI route parameters. Custom validators for business rules (email uniqueness, valid coupon codes). Validation errors return 400 with field-specific messages." -->
<!-- Example 2: "Zod schemas for TypeScript validation. Validate on server (Server Actions, API routes) and client (forms). Share schemas between client and server. Type-safe validation with inferred types." -->
<!-- Example 3: "Validator package for Go. Validate structs with tags (validate:'required,email'). Custom validation functions for business rules. Return validation errors as 400 responses." -->

## Database Access

<!-- TODO: Document data access patterns (ORM, query builder, raw SQL, repository pattern, connection pooling) -->
<!-- Example 1: "SQLAlchemy ORM with async engine. Repository pattern: UserRepository, OrderRepository classes. Session management: FastAPI dependency injects session. Connection pooling: 10 connections, 20 overflow." -->
<!-- Example 2: "Prisma ORM with TypeScript types. Database client initialized in lib/prisma.ts, imported across app. Migrations managed by Prisma Migrate. Connection pooling automatic." -->
<!-- Example 3: "pgx pure Go driver with connection pool. Database access in repository layer. Prepared statements for queries. Transactions with pgx.Tx. Manual query building (no ORM)." -->

## Testing Patterns

<!-- TODO: Document testing framework, test organization, fixture patterns, mocking approach -->
<!-- Example 1: "pytest framework. Tests in tests/ mirror src/ structure. Fixtures in conftest.py (db_session, test_client). Mock external APIs with pytest-mock. Async tests with pytest-asyncio." -->
<!-- Example 2: "Vitest framework. Tests colocated with code (Button.test.tsx next to Button.tsx). MSW for API mocking. React Testing Library for component tests. Playwright for E2E." -->
<!-- Example 3: "Go testing package. Tests in *_test.go files. Table-driven tests for multiple cases. testify/mock for mocking. testcontainers for integration tests with real database." -->

## Common Abstractions

<!-- TODO: List reusable patterns, utilities, helpers found across codebase -->
<!-- Example 1: "BaseRepository: CRUD operations (get, create, update, delete) for all entities. Pagination helper: paginate(query, page, size). API response wrapper: {data, error, meta} structure." -->
<!-- Example 2: "useAsync hook: Handles loading, error, data states for async operations. APIClient: Centralized fetch wrapper with auth headers, error handling. Form validation: reusable Zod schemas for common patterns." -->
<!-- Example 3: "ErrorWrapper function: Adds context to errors. Retry helper: Exponential backoff for transient failures. Logger middleware: Structured logging with request IDs." -->

---

*Document patterns as you discover them. Reuse patterns, don't reinvent.*
*Update this file when new patterns emerge or old patterns change.*
