/**
 * Troubleshooting library — stack-triggered common issues injected during init.
 *
 * Same trigger architecture as gotchas and rules. Each entry is a diagnostic
 * pattern: symptom → fix → optional prevention. The setup agent presents
 * these for confirmation; init injects them into the troubleshooting skill's
 * ## Detected section under ### Common Issues.
 *
 * CONTENT QUALITY: Each entry ships to every matching customer. A wrong
 * entry at 10K teams is wrong diagnostic advice at scale. Every entry must
 * be verified against current documentation. WC reviews before merge.
 *
 * OVERLAP WITH GOTCHAS: Gotchas are PREVENTIVE ("don't forget to generate").
 * Common issues are DIAGNOSTIC ("if you see type errors, here's why").
 * Different framing, same underlying issue. Both coexist — they serve
 * different moments in the developer's workflow.
 */

export interface TroubleshootingEntry {
  id: string;
  triggers: Record<string, string>;
  symptom: string;
  fix: string;
  prevention?: string;
}

// Verified against current framework docs (April 2026).
// Source notes are code comments above each entry.
export const COMMON_ISSUES: TroubleshootingEntry[] = [
  // --- Next.js ---

  // Verified: hydration mismatch is the #1 Next.js debugging issue.
  // Occurs when server-rendered HTML differs from client render.
  {
    id: 'nextjs-hydration-mismatch',
    triggers: { framework: 'Next.js' },
    symptom: 'Hydration error: "Text content does not match server-rendered HTML" or "Hydration failed because the initial UI does not match"',
    fix: 'Find the component that renders differently on server vs client. Common causes: `Date.now()`, `Math.random()`, browser-only APIs (`window`, `localStorage`), or conditional rendering based on client state. Use `useEffect` for client-only values or `suppressHydrationWarning` for intentional mismatches.',
    prevention: 'Wrap browser-only code in `useEffect` or guard with `typeof window !== "undefined"` checks.',
  },

  // Verified: middleware runs on Edge Runtime, not full Node.js.
  {
    id: 'nextjs-middleware-edge-runtime',
    triggers: { framework: 'Next.js' },
    symptom: 'Middleware crashes with "Dynamic Code Evaluation not allowed" or "Module not found" errors for Node.js APIs (fs, crypto, etc.)',
    fix: 'Next.js middleware runs on Edge Runtime, which has no access to Node.js APIs. Use Web API equivalents (`crypto.subtle` instead of `node:crypto`). For heavy computation, move logic to an API route.',
    prevention: 'Keep middleware thin — auth checks, redirects, header rewrites only.',
  },

  // Verified: server/client component boundary is the most common App Router mistake.
  {
    id: 'nextjs-use-client-missing',
    triggers: { framework: 'Next.js' },
    symptom: '"useState is not a function" or "useEffect is not a function" or "Event handlers cannot be passed to Client Component props"',
    fix: 'Components using hooks (`useState`, `useEffect`) or event handlers (`onClick`, `onChange`) must have `"use client"` at the top of the file. Server Components cannot use React hooks or DOM event handlers.',
  },

  // Verified: Server Actions must be async functions marked with "use server".
  {
    id: 'nextjs-server-action-errors',
    triggers: { framework: 'Next.js' },
    symptom: 'Server Action throws "Functions cannot be passed directly to Client Components" or form submission silently fails',
    fix: 'Server Actions must be `async` functions marked with `"use server"` at the function or file level. If passing to a Client Component, the action must be in a separate file with `"use server"` at the top.',
  },

  // Verified: dynamic route params are Promises in Next.js 15+.
  {
    id: 'nextjs-dynamic-params-async',
    triggers: { framework: 'Next.js' },
    symptom: '`params.id` is `undefined` or `params` is a Promise object instead of a plain object in Next.js 15+',
    fix: 'In Next.js 15+, `params` and `searchParams` are async. Use `const { id } = await params` instead of destructuring synchronously. This applies to page, layout, route handler, and generateMetadata functions.',
  },

  // --- Prisma ---

  // Verified: prisma generate is the #1 Prisma support issue.
  {
    id: 'prisma-generate-stale',
    triggers: { database: 'Prisma' },
    symptom: 'Type errors after schema changes: "Property does not exist on type" or "PrismaClient is not generated" or types don\'t reflect new fields/models',
    fix: 'Run `npx prisma generate` after any `schema.prisma` change. The Prisma client is generated code — schema changes require regeneration before new types are available.',
    prevention: 'Add `"postinstall": "prisma generate"` to package.json scripts.',
  },

  // Verified: migration drift when schema and database diverge.
  {
    id: 'prisma-migration-drift',
    triggers: { database: 'Prisma' },
    symptom: '"The database schema is not in sync with the migration history" or `prisma migrate dev` wants to reset the database',
    fix: 'Run `npx prisma migrate diff` to see what drifted. If the database was modified directly (not through migrations), create a baseline migration with `npx prisma migrate diff --from-schema-datamodel --to-schema-datasource --script > fix.sql`. Apply and re-run `prisma migrate dev`.',
    prevention: 'Never modify the database directly in environments that use migrations. Use `prisma migrate dev` for all schema changes.',
  },

  // Verified: connection pool exhaustion in serverless is well-documented.
  {
    id: 'prisma-connection-pool-serverless',
    triggers: { database: 'Prisma', platform: 'Vercel' },
    symptom: '"Too many connections" or "Connection pool timeout" errors under load in serverless deployment',
    fix: 'Each `new PrismaClient()` opens its own connection pool. In serverless, use a singleton with `globalThis` caching (`lib/prisma.ts`) and configure connection limits: `datasource db { url = env("DATABASE_URL") }` with `?connection_limit=5` in the URL.',
    prevention: 'Use Prisma Accelerate or PgBouncer for connection pooling in serverless environments.',
  },

  // --- Vercel ---

  // Verified: function size and timeout limits are common deployment blockers.
  {
    id: 'vercel-function-limits',
    triggers: { platform: 'Vercel' },
    symptom: 'Deployment fails with "Serverless Function size limit exceeded" or API routes timeout after 10 seconds (Hobby) / 60 seconds (Pro)',
    fix: 'For size: check `node_modules` bundled into the function — use `@vercel/nft` output or `vercel inspect` to see what\'s included. Tree-shake large dependencies or move them to Edge Functions. For timeouts: offload long tasks to background jobs or streaming responses.',
  },

  // Verified: env var sync is a common source of deployment-works-locally bugs.
  {
    id: 'vercel-env-var-sync',
    triggers: { platform: 'Vercel' },
    symptom: 'Feature works locally but fails in deployment with undefined environment variables or wrong API endpoints',
    fix: 'Vercel env vars are scoped per environment (Development, Preview, Production). Check `vercel env ls` to verify the variable exists for the target environment. After adding/changing env vars, redeploy — env vars are baked in at build time for static pages.',
    prevention: 'Use `vercel env pull .env.local` to sync remote env vars locally. Keep `.env.example` with all required variable names.',
  },

  // --- React ---

  // Verified: stale closure is the #1 React hooks debugging issue.
  {
    id: 'react-stale-closure',
    triggers: { framework: 'Next.js' },
    symptom: 'State value is stale inside `useEffect`, `setTimeout`, or event handlers — shows old value instead of current',
    fix: 'Closures capture state at render time. Use the functional updater form: `setState(prev => prev + 1)` instead of `setState(count + 1)`. For effects, add the dependency to the deps array. For refs that need current value, use `useRef`.',
  },

  // Verified: missing key prop causes rerender bugs.
  {
    id: 'react-key-prop',
    triggers: { framework: 'Next.js' },
    symptom: 'List items re-render incorrectly, input fields lose focus when typing, or "Each child in a list should have a unique key prop" warning',
    fix: 'Use a stable, unique identifier as the `key` prop — database IDs, not array indices. Index keys cause bugs when the list is reordered, filtered, or items are inserted. If no stable ID exists, generate one when the data is created.',
  },

  // --- TypeScript ---

  // Verified: type narrowing across await boundaries is a known TS limitation.
  {
    id: 'ts-narrowing-across-await',
    triggers: { language: 'TypeScript' },
    symptom: 'TypeScript reports "possibly null" or "possibly undefined" after a type guard, but only in async functions — the guard works in sync code',
    fix: 'Type narrowing does not persist across `await` boundaries because the variable could be reassigned between suspension points. Re-narrow after each `await`: `if (!x) throw` before the `await`, then `if (!x) throw` again after.',
  },

  // Verified: const assertion is commonly confused with `as const` satisfaction.
  {
    id: 'ts-const-assertion',
    triggers: { language: 'TypeScript' },
    symptom: 'Object literal type is widened to `string` instead of the literal value, or array type is `string[]` instead of a tuple',
    fix: 'Add `as const` to the declaration: `const x = { type: "success" } as const` gives `{ readonly type: "success" }` instead of `{ type: string }`. For arrays: `const arr = ["a", "b"] as const` gives `readonly ["a", "b"]` instead of `string[]`.',
  },

  // --- General Node ---

  // Verified: ESM/CJS interop is a persistent Node.js pain point.
  {
    id: 'node-esm-cjs-interop',
    triggers: { language: 'TypeScript' },
    symptom: '"ERR_REQUIRE_ESM" when importing an ESM-only package, or "SyntaxError: Cannot use import statement in a module"',
    fix: 'ESM-only packages (like `chalk` v5+, `execa` v6+, `node-fetch` v3+) cannot be `require()`\'d. Either: (1) switch your project to ESM (`"type": "module"` in package.json), (2) use dynamic `import()` for the ESM package, or (3) pin an older CJS-compatible version.',
  },

  // Verified: unhandled rejections crash Node 15+.
  {
    id: 'node-unhandled-rejection',
    triggers: { language: 'TypeScript' },
    symptom: 'Process crashes with "UnhandledPromiseRejection" — an async function throws but nothing catches it',
    fix: 'Ensure every Promise chain has a `.catch()` or is inside a `try/catch` in an `async` function. For fire-and-forget promises, add `.catch(err => logger.error(err))`. Check for missing `await` on async calls — without it, the rejection is unhandled.',
    prevention: 'Add `process.on("unhandledRejection", handler)` as a safety net, but fix the root cause — unhandled rejections indicate a code bug.',
  },

  // --- Vitest ---

  // Verified: Vitest watch mode hangs CI pipelines.
  {
    id: 'vitest-watch-hang',
    triggers: { testing: 'Vitest' },
    symptom: 'Tests hang indefinitely in CI or when run from scripts — process never exits',
    fix: 'Vitest defaults to watch mode in interactive terminals. Pass `--run` flag to run tests once and exit: `vitest run` instead of `vitest`. In CI, Vitest auto-detects non-interactive environments, but scripts piping output may still trigger watch mode.',
    prevention: 'Always use `vitest run` in CI scripts and non-interactive contexts.',
  },

  // Verified: mock leakage between tests is a common Vitest issue.
  {
    id: 'vitest-mock-leakage',
    triggers: { testing: 'Vitest' },
    symptom: 'Tests pass individually but fail when run together — mock from one test bleeds into another',
    fix: 'Call `vi.restoreAllMocks()` in `afterEach` or set `mockReset: true` / `restoreAllMocks: true` in `vitest.config.ts`. Module mocks (`vi.mock()`) persist across tests in the same file — use `vi.unmock()` or restructure to avoid shared module-level mocks.',
  },

  // --- Anthropic SDK ---

  // Verified: Anthropic SDK streaming requires specific handling.
  {
    id: 'anthropic-stream-handling',
    triggers: { aiSdk: 'Anthropic' },
    symptom: 'Streaming response returns empty content, or message events are missed, or stream hangs without completing',
    fix: 'Use `client.messages.stream()` (not `.create()` with `stream: true`). Iterate with `for await (const event of stream)`. Check `event.type` — content is in `content_block_delta` events, not `message_start`. Always handle the `message_stop` event for cleanup.',
  },

  // Verified: token limit errors are common with large prompts.
  {
    id: 'anthropic-token-limit',
    triggers: { aiSdk: 'Anthropic' },
    symptom: '"max_tokens must be less than" error, or response is truncated with `stop_reason: "max_tokens"` instead of `"end_turn"`',
    fix: 'The `max_tokens` parameter is REQUIRED and caps the response length, not the input. If responses are truncated, increase `max_tokens`. If the input is too large, the API returns a 400 error — reduce context by summarizing or chunking. Check `usage.input_tokens` in the response to monitor consumption.',
  },

  // --- Stripe ---

  // Verified: webhook raw body requirement is the #1 Stripe integration bug.
  {
    id: 'stripe-webhook-raw-body',
    triggers: { payments: 'Stripe' },
    symptom: 'Webhook signature verification fails with "No signatures found matching the expected signature" even though the signing secret is correct',
    fix: 'Stripe signature verification requires the RAW request body, not parsed JSON. In Next.js App Router: use `request.text()`. In Express: use `express.raw({ type: "application/json" })` on the webhook route. Body parsers (like `express.json()`) modify the body and break verification.',
  },
];
