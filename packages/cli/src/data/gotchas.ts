/**
 * Pre-populated gotchas keyed by stack combinations.
 *
 * Each gotcha matches when ALL trigger conditions are satisfied.
 * Injected into skill Gotchas sections on fresh init only.
 * The library grows over time — each entry is hand-curated,
 * universally true for the stack combo, and non-obvious.
 */

export interface GotchaEntry {
  id: string;
  triggers: Record<string, string>;
  skill: string;
  text: string;
}

export const GOTCHAS: GotchaEntry[] = [
  {
    id: 'vitest-watch-mode',
    triggers: { testing: 'Vitest' },
    skill: 'testing-standards',
    text: 'Vitest defaults to watch mode. Always pass `--run` in CI and non-interactive environments (e.g., `pnpm run test -- --run`).',
  },
  {
    id: 'nextjs-supabase-server-client',
    triggers: { framework: 'Next.js', database: 'Supabase' },
    skill: 'data-access',
    text: 'Server Components cannot use the Supabase browser client. Use `createServerClient` from `@supabase/ssr` for server-side data access.',
  },
  {
    id: 'nextjs-server-components-default',
    triggers: { framework: 'Next.js' },
    skill: 'coding-standards',
    text: "Next.js App Router components are Server Components by default. Add `'use client'` only when the component needs browser APIs, event handlers, or React hooks like useState/useEffect.",
  },
  {
    id: 'prisma-generate',
    triggers: { database: 'Prisma' },
    skill: 'data-access',
    text: 'Always run `npx prisma generate` after schema changes. The Prisma client is generated code — schema changes are not reflected until regenerated.',
  },
  {
    id: 'drizzle-push',
    triggers: { database: 'Drizzle' },
    skill: 'data-access',
    text: 'Drizzle schema changes update TypeScript types immediately, but the database is NOT synced automatically. Run `npx drizzle-kit push` (development) or `drizzle-kit generate` + `drizzle-kit migrate` (production) after schema changes.',
  },
  {
    // S19/SETUP-042: first consumer of the service-category trigger path.
    // `{ jobs: 'Inngest' }` matches against externalServices where
    // category === 'jobs' && name === 'Inngest' — wired through
    // JOBS_PACKAGES in engine/detectors/dependencies.ts.
    id: 'inngest-function-invocation',
    triggers: { jobs: 'Inngest' },
    skill: 'api-patterns',
    text: 'Inngest functions run in a separate worker process — local development requires the `inngest-cli` dev server (`npx inngest-cli dev`). Functions are invoked by sending events (`inngest.send({ name: "user.created", data: {...} })`), not by calling the function directly. Event names use dot-notation and function signatures take `{ event, step }` — use `step.run()` for idempotent work and `step.sleep()` for delays so the durable execution engine can replay safely.',
  },
  {
    // S19/IDEA-010: first testing-stack gotcha that relies on the SCAN-050
    // array-aware matcher. `{ testing: 'Playwright' }` matches against
    // stack.testing[] so the gotcha fires on both pure-Playwright and
    // multi-framework projects (Jest + Playwright, Vitest + Playwright).
    id: 'playwright-auto-waiting',
    triggers: { testing: 'Playwright' },
    skill: 'testing-standards',
    text: "Playwright's auto-waiting means you rarely need waitFor* patterns — `locator.click()` and `expect(locator).toBeVisible()` auto-retry until the element is ready. `page.waitForSelector()` is legacy. Prefer `page.getByRole()`, `page.getByText()`, and `page.getByLabel()` over CSS selectors — they survive DOM refactors and match accessibility intent. Tests run isolated and parallel by default; use `test.describe.serial` only when sequential execution is required.",
  },
  // S22/V-12: Anthropic SDK retry pattern
  {
    id: 'anthropic-sdk-retry',
    triggers: { aiSdk: 'Anthropic' },
    skill: 'ai-patterns',
    text: 'Anthropic SDK supports `maxRetries` in the client constructor. Configure it to handle transient rate limits automatically instead of building custom retry logic.',
  },
  // S22/V-13: Vercel AI SDK patterns
  {
    id: 'vercel-ai-sdk-patterns',
    triggers: { aiSdk: 'Vercel AI' },
    skill: 'ai-patterns',
    text: "Use `generateObject()` for structured output and `streamText()` for streaming responses. Don't use `generateText()` with manual JSON parsing.",
  },
  // S22/V-14: OpenAI SDK retry + structured output
  {
    id: 'openai-sdk-retry',
    triggers: { aiSdk: 'OpenAI' },
    skill: 'ai-patterns',
    text: "OpenAI SDK supports `maxRetries` in the client constructor. Use `response_format: { type: 'json_object' }` for structured output instead of parsing free text.",
  },
  // S22/V-15: Next.js Route Handler self-call anti-pattern
  {
    id: 'nextjs-route-handler-selfcall',
    triggers: { framework: 'Next.js' },
    skill: 'api-patterns',
    text: "Don't call Route Handlers from Server Components. Call the data function directly — the Route Handler is for external clients, not internal server-side calls.",
  },
  // S22/V-16: Stripe webhook signature verification
  {
    id: 'stripe-webhook-verification',
    triggers: { payments: 'Stripe' },
    skill: 'api-patterns',
    text: 'Always verify webhook signatures before processing Stripe events. Use `stripe.webhooks.constructEvent()` with the raw body — never trust the payload without verification.',
  },
  // S22/V-17: Zod safeParse in route handlers
  {
    id: 'zod-safeparse',
    triggers: { validation: 'zod' },
    skill: 'api-patterns',
    text: 'Use `.safeParse()` in route handlers, not `.parse()`. `.parse()` throws on invalid input — use `.safeParse()` and return a 400 with validation error details.',
  },
  // S22/V-18: Prisma singleton in serverless
  {
    id: 'prisma-serverless-singleton',
    triggers: { database: 'Prisma', platform: 'Vercel' },
    skill: 'data-access',
    text: 'Prisma in serverless (Vercel, Lambda) exhausts connection pools fast. Export a singleton from `lib/prisma.ts` with global caching: `globalThis.prisma ??= new PrismaClient()`.',
  },
  // S22/V-19: Vercel serverless timeout
  {
    id: 'vercel-serverless-timeout',
    triggers: { platform: 'Vercel' },
    skill: 'deployment',
    text: 'Vercel serverless functions have execution time limits. Long-running operations (LLM calls, file processing, batch jobs) should use streaming to send the first byte quickly, or offload to background functions with `waitUntil()`.',
  },
];
