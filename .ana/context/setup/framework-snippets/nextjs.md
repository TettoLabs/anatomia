## Next.js Patterns

**Language conventions (TypeScript):**
- TypeScript strict mode (no any, proper type annotations)
- Prefer interfaces over types for object shapes
- Proper async/await (no .then() chains, use try/catch)
- Functions: camelCase, Classes/Interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE or camelCase

**Framework patterns:**
- **Server Components:** Default to Server Components (zero JS to client)
- **App Router:** File-based routing in app/, route groups for organization
- **Server Actions:** Server-side mutations callable from UI without API routes
- **Data fetching:** Server Components fetch directly, avoid prop drilling

**Architecture considerations:**
- Client/server boundaries: What runs server-side? What needs client interactivity?
- Dynamic rendering: cookies(), searchParams() opt into dynamic (use intentionally)
- Caching: Static vs dynamic routes, use revalidate for ISR
- State management: Server state > client state (minimize client state)
