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
];
