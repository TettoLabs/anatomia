## Express Patterns

**Language conventions (TypeScript):**
- TypeScript strict mode (no any, proper type annotations)
- Prefer interfaces over types for object shapes
- Proper async/await (no .then() chains, use try/catch)
- Functions: camelCase, Classes/Interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE or camelCase

**Framework patterns:**
- **Middleware chain:** Validation → Auth → Authorization → Handler → Error handling
- **Router organization:** Modular routers per resource (userRouter, authRouter)
- **Error handling:** Centralized middleware (err, req, res, next) at chain end
- **Async/await:** Use async handlers (Express 5+), errors auto-propagate

**Architecture considerations:**
- Middleware order matters (auth before authorization)
- Error middleware: 4-parameter signature catches all errors
- Database connections: Pool at startup, share across requests
- Testing: Middleware testable in isolation with mock req/res/next
