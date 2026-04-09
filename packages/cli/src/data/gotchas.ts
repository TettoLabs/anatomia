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
];
