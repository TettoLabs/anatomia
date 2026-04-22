/**
 * Rules library — stack-triggered skill rules injected during init.
 *
 * Same trigger architecture as gotchas. Each rule is a skill-specific
 * recommendation that fires when the project's stack matches.
 * The setup agent presents these for confirmation; init injects them
 * into the ## Detected section under ### Library Rules.
 *
 * CONTENT QUALITY: Each rule ships to every matching customer. A wrong
 * rule at 10K teams is wrong advice at scale. Every rule must pass the
 * decision test: "without this rule, Build does X. With it, Build does Y.
 * X ≠ Y." WC reviews before merge.
 */

export interface RuleCandidate {
  id: string;
  triggers: Record<string, string>;
  skill: string;
  rule: string;
  decisionTest: {
    without: string;
    with: string;
  };
  grade: 'SUPER_GOOD' | 'GOOD' | 'OK';
  tailorable: boolean;
}

// Verified against current framework docs (April 2026).
// Source notes are code comments above each entry.
export const RULES: RuleCandidate[] = [
  // Verified: ESM with .js extensions is required for Node ESM.
  // tsc/tsup emit .js files. Omitting the extension compiles but crashes at runtime.
  {
    id: 'esm-js-extensions',
    triggers: { language: 'TypeScript' },
    skill: 'coding-standards',
    rule: 'All local imports use `.js` extensions (`import { foo } from "./bar.js"`). TypeScript compiles without them but ESM resolution crashes at runtime.',
    decisionTest: {
      without: 'Build writes `import { foo } from "./bar"` — compiles, crashes at runtime under ESM',
      with: 'Build writes `import { foo } from "./bar.js"` — works correctly',
    },
    grade: 'SUPER_GOOD',
    tailorable: false,
  },

  // Verified: import type is standard TypeScript practice since TS 3.8.
  {
    id: 'import-type-separation',
    triggers: { language: 'TypeScript' },
    skill: 'coding-standards',
    rule: 'Use `import type` for type-only imports, separate from value imports. Prevents runtime imports of pure types.',
    decisionTest: {
      without: 'Build mixes types and values: `import { MyType, myFunction } from "./mod"`',
      with: 'Build separates: `import type { MyType }` + `import { myFunction }`',
    },
    grade: 'GOOD',
    tailorable: false,
  },

  // Verified: Prisma client is generated code. Schema changes require regeneration.
  {
    id: 'prisma-generate-rule',
    triggers: { database: 'Prisma' },
    skill: 'data-access',
    rule: 'Run `prisma generate` after any `schema.prisma` change. The Prisma client is generated code — schema changes require regeneration before the new types are available.',
    decisionTest: {
      without: 'Build modifies schema.prisma, skips generate, gets stale types',
      with: 'Build runs prisma generate after schema change, gets correct types',
    },
    grade: 'SUPER_GOOD',
    tailorable: false,
  },

  // Verified: Prisma 6-7 serverless connection pooling best practice.
  {
    id: 'prisma-serverless-singleton-rule',
    triggers: { database: 'Prisma', platform: 'Vercel' },
    skill: 'data-access',
    rule: 'Use a singleton Prisma client with `globalThis` caching for serverless. Each function invocation that creates a new client opens a fresh connection pool — exhausts database connections under load.',
    decisionTest: {
      without: 'Build creates `new PrismaClient()` in handler — connection pool exhaustion',
      with: 'Build imports from `lib/prisma.ts` using globalThis singleton — shared pool',
    },
    grade: 'SUPER_GOOD',
    tailorable: true,
  },

  // Verified: Anthropic SDK retry/timeout best practices.
  {
    id: 'anthropic-sdk-error-handling',
    triggers: { aiSdk: 'Anthropic' },
    skill: 'ai-patterns',
    rule: 'Handle Anthropic API errors explicitly: rate limits (429) need exponential backoff, overloaded (529) needs retry with delay, auth errors (401) need immediate fail. The SDK retries automatically on 429/529 — configure `maxRetries` rather than wrapping in retry logic.',
    decisionTest: {
      without: 'Build wraps every call in custom retry loop, conflicts with SDK built-in retry',
      with: 'Build configures `maxRetries` on client, adds explicit handling only for non-retriable errors',
    },
    grade: 'SUPER_GOOD',
    tailorable: false,
  },

  // Verified: prompt centralization is standard practice for AI applications.
  {
    id: 'ai-prompt-centralization',
    triggers: { aiSdk: 'Anthropic' },
    skill: 'ai-patterns',
    rule: 'Centralize prompt templates in dedicated files, not inline in handler code. Prompts are configuration — they change independently of logic, need review, and benefit from version control visibility.',
    decisionTest: {
      without: 'Build inlines system prompts in route handlers — prompts buried in code',
      with: 'Build imports prompts from `prompts/` directory — prompts are reviewable and changeable',
    },
    grade: 'GOOD',
    tailorable: true,
  },

  // Verified: Next.js server components are the default in App Router.
  {
    id: 'nextjs-server-components',
    triggers: { framework: 'Next.js' },
    skill: 'coding-standards',
    rule: 'Default to Server Components. Only add `"use client"` when the component needs browser APIs, event handlers, or useState/useEffect. Data fetching belongs in Server Components — no useEffect waterfalls.',
    decisionTest: {
      without: 'Build adds "use client" to data-fetching component, creates useEffect waterfall',
      with: 'Build keeps data fetching in Server Component, adds "use client" only for interactive parts',
    },
    grade: 'SUPER_GOOD',
    tailorable: false,
  },

  // Verified: Vitest watch mode default causes CI/pipeline hangs.
  {
    id: 'vitest-run-flag',
    triggers: { testing: 'Vitest' },
    skill: 'testing-standards',
    rule: 'Always pass `--run` flag when invoking Vitest in CI or non-interactive contexts. Vitest defaults to watch mode, which hangs pipelines waiting for input.',
    decisionTest: {
      without: 'Build runs `pnpm vitest` in CI — hangs in watch mode',
      with: 'Build runs `pnpm vitest run` — exits after tests complete',
    },
    grade: 'SUPER_GOOD',
    tailorable: false,
  },

  // Verified: Stripe webhook signature verification is required for security.
  {
    id: 'stripe-webhook-verification-rule',
    triggers: { payments: 'Stripe' },
    skill: 'api-patterns',
    rule: 'Verify Stripe webhook signatures using `stripe.webhooks.constructEvent()` with the raw body and signing secret. Never trust webhook payloads without signature verification — they can be forged.',
    decisionTest: {
      without: 'Build parses webhook JSON directly — accepts forged payloads',
      with: 'Build verifies signature first — rejects forged payloads with 400',
    },
    grade: 'SUPER_GOOD',
    tailorable: false,
  },

  // Verified: Zod .safeParse is the standard validation pattern.
  {
    id: 'zod-safe-parse',
    triggers: { validation: 'zod' },
    skill: 'api-patterns',
    rule: 'Use `.safeParse()` instead of `.parse()` for user input validation. `.parse()` throws on invalid input — `.safeParse()` returns a result object with typed errors, enabling structured error responses.',
    decisionTest: {
      without: 'Build uses `.parse()` in handlers — unhandled ZodError crashes the request',
      with: 'Build uses `.safeParse()` — returns 400 with structured validation errors',
    },
    grade: 'GOOD',
    tailorable: false,
  },

  // --- api-patterns: conditional skill rules ---

  // Verified: Server Components should fetch data directly, not call their own Route Handlers.
  {
    id: 'nextjs-route-handler-boundary',
    triggers: { framework: 'Next.js' },
    skill: 'api-patterns',
    rule: 'Server Components fetch data directly from service functions or the database. Route Handlers are for EXTERNAL clients (webhooks, mobile apps, third-party integrations). Never call your own Route Handlers from Server Components — that adds an unnecessary network hop.',
    decisionTest: {
      without: 'Build creates a Route Handler and calls it from a Server Component via fetch',
      with: 'Build calls the service function directly in the Server Component',
    },
    grade: 'SUPER_GOOD',
    tailorable: false,
  },

  // --- data-access: conditional skill rules ---

  // Verified: IDOR is the #1 database security vulnerability LLMs produce.
  {
    id: 'scope-queries-to-user',
    triggers: { database: 'Prisma' },
    skill: 'data-access',
    rule: 'Scope every user-specific query to the authenticated user. Include `userId` (or equivalent ownership field) in every WHERE clause for user-specific data. A query without ownership scoping is an IDOR vulnerability — any authenticated user can access any other user\'s data by changing an ID in the URL.',
    decisionTest: {
      without: 'Build writes `prisma.document.findUnique({ where: { id: params.id } })` — any user reads any document',
      with: 'Build writes `prisma.document.findUnique({ where: { id: params.id, userId: session.user.id } })` — only owner reads',
    },
    grade: 'SUPER_GOOD',
    tailorable: true,
  },

  // Verified: $queryRaw is the Prisma escape hatch for SQL injection.
  {
    id: 'prisma-no-raw-interpolation',
    triggers: { database: 'Prisma' },
    skill: 'data-access',
    rule: 'Never interpolate user input into `$queryRaw` or `$executeRaw`. Use parameterized queries: `prisma.$queryRaw\\`SELECT * FROM users WHERE id = ${userId}\\`` (tagged template — safe) not `prisma.$queryRawUnsafe("SELECT * FROM users WHERE id = " + userId)` (string concat — SQL injection).',
    decisionTest: {
      without: 'Build concatenates user input into $queryRawUnsafe — SQL injection',
      with: 'Build uses tagged template literal with $queryRaw — parameterized and safe',
    },
    grade: 'SUPER_GOOD',
    tailorable: false,
  },

  // Verified: unbounded list queries cause memory exhaustion and slow responses.
  {
    id: 'paginate-list-queries',
    triggers: { database: 'Prisma' },
    skill: 'data-access',
    rule: 'Paginate all list queries. Never return unbounded results from `findMany()`. Use `take` + `skip` or cursor-based pagination. An unbounded query on a table with 100K rows returns all 100K rows into memory.',
    decisionTest: {
      without: 'Build writes `prisma.post.findMany()` — returns all posts, memory exhaustion',
      with: 'Build writes `prisma.post.findMany({ take: 20, skip: page * 20 })` — bounded',
    },
    grade: 'GOOD',
    tailorable: false,
  },

  // --- ai-patterns: conditional skill rules ---

  // Verified: LLM output is non-deterministic and must be validated before use.
  {
    id: 'validate-llm-output',
    triggers: { aiSdk: 'Anthropic' },
    skill: 'ai-patterns',
    rule: 'Validate all LLM output with a schema before using it in business logic. Use `generateObject()` or `response_format: { type: "json_object" }` for structured data extraction. Never regex-parse free-text LLM responses — the format changes between runs.',
    decisionTest: {
      without: 'Build regex-parses LLM text output — breaks when format varies',
      with: 'Build uses generateObject with Zod schema — typed, validated output',
    },
    grade: 'SUPER_GOOD',
    tailorable: false,
  },

  // Verified: serverless function timeouts kill long LLM responses.
  {
    id: 'stream-in-serverless',
    triggers: { aiSdk: 'Anthropic', platform: 'Vercel' },
    skill: 'ai-patterns',
    rule: 'Stream user-facing LLM responses in serverless environments. A non-streaming Claude response can take 30-60 seconds — beyond Vercel\'s function timeout. Use `streamText()` or the streaming API to send chunks as they arrive.',
    decisionTest: {
      without: 'Build uses `generateText()` in a Vercel function — times out after 10s on Hobby',
      with: 'Build uses `streamText()` — first chunk arrives in <1s, streams until complete',
    },
    grade: 'SUPER_GOOD',
    tailorable: false,
  },
];
