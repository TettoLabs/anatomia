## FastAPI Patterns

**Language conventions (Python):**
- PEP 8 style guide (Black formatter, 88 char line length)
- Type hints required (typing module: List, Dict, Optional, Union)
- Exception handling with specific exceptions (ValueError, TypeError, not bare except)
- Functions: snake_case, Classes: PascalCase, Constants: UPPER_SNAKE_CASE
- Use async def for I/O operations (database, HTTP, file reads)

**Framework patterns:**
- **Dependency injection:** Use Depends() for services, repositories, database sessions
- **Layered architecture:** API routers → Service layer → Repository layer
- **Type safety:** Pydantic models for request/response validation
- **Error handling:** HTTPException with specific status codes

**Architecture considerations:**
- Async for I/O-bound, sync for CPU-bound (JWT parsing, validation)
- Middleware order: Validation → Auth → Rate limiting
- Testing: DI enables easy mocking (inject test dependencies)
