/**
 * Unit tests for skill Detected-section injectors + shared stack helpers (Item 16).
 *
 * Covers three previously-untested functions:
 *   - injectAiPatterns (skills.ts) — the 3-way B1 filter for AI service dedup.
 *     Item 18 will simplify this to exact match after Vercel AI naming is
 *     standardized; these tests lock in the current semantic so the Item 18
 *     simplification can be verified with a single filter update.
 *   - getStackSummary (constants.ts) — 7-field ordered stack filter used by
 *     CLAUDE.md, AGENTS.md, init success output, scaffold generators.
 *   - matchGotchas (utils/gotchas.ts) — trigger-based gotcha matching against
 *     the detected stack. All triggers must match for a gotcha to fire.
 */

import { describe, it, expect } from 'vitest';
import { injectAiPatterns } from '../../src/commands/init/skills.js';
import { getStackSummary } from '../../src/constants.js';
import { matchGotchas } from '../../src/utils/gotchas.js';
import { createEmptyEngineResult } from '../../src/engine/types/engineResult.js';
import type { EngineResult } from '../../src/engine/types/engineResult.js';

type ExternalService = EngineResult['externalServices'][number];

function makeService(name: string, category: string): ExternalService {
  return { name, category, source: 'dep', configFound: false, stackRoles: [] };
}

describe('injectAiPatterns (B1 filter)', () => {
  it('shows both SDK and a distinct provider variant', () => {
    const result = createEmptyEngineResult();
    result.stack.aiSdk = 'OpenAI';
    result.externalServices = [
      makeService('Vercel AI SDK', 'ai'),
      makeService('OpenAI', 'ai'),
    ];
    const body = injectAiPatterns(result);
    expect(body).toContain('- AI SDK: OpenAI');
    expect(body).toContain('Vercel AI SDK');
  });

  it('includes branded Vercel AI variants in the "Also detected" line', () => {
    const result = createEmptyEngineResult();
    result.stack.aiSdk = 'Vercel AI';
    result.externalServices = [
      makeService('Vercel AI (Anthropic)', 'ai'),
    ];
    const body = injectAiPatterns(result);
    expect(body).toContain('- AI SDK: Vercel AI');
    expect(body).toContain('Vercel AI (Anthropic)');
  });

  it('filters the exact-match duplicate (sdk === svc.name)', () => {
    const result = createEmptyEngineResult();
    result.stack.aiSdk = 'Vercel AI';
    result.externalServices = [makeService('Vercel AI', 'ai')];
    const body = injectAiPatterns(result);
    expect(body).toContain('- AI SDK: Vercel AI');
    expect(body).not.toContain('Also detected');
  });

  it('filters the "X SDK" suffix variant (3-way match leg A)', () => {
    // Old naming split: AI_SDK_PACKAGES used 'Vercel AI', AI_PACKAGES used
    // 'Vercel AI SDK'. The filter removes the SDK-suffixed duplicate.
    const result = createEmptyEngineResult();
    result.stack.aiSdk = 'Vercel AI';
    result.externalServices = [makeService('Vercel AI SDK', 'ai')];
    const body = injectAiPatterns(result);
    expect(body).not.toContain('Also detected');
  });

  it('filters the "strip SDK" reverse variant (3-way match leg B)', () => {
    // Same split from the other direction: if stack said "X SDK" and
    // services said "X", replace(' SDK', '') covers the reverse case.
    const result = createEmptyEngineResult();
    result.stack.aiSdk = 'Vercel AI SDK';
    result.externalServices = [makeService('Vercel AI', 'ai')];
    const body = injectAiPatterns(result);
    expect(body).not.toContain('Also detected');
  });

  it('shows all AI services when no SDK is detected', () => {
    const result = createEmptyEngineResult();
    result.stack.aiSdk = null;
    result.externalServices = [
      makeService('OpenAI', 'ai'),
      makeService('Anthropic', 'ai'),
    ];
    const body = injectAiPatterns(result);
    expect(body).toContain('Also detected');
    expect(body).toContain('OpenAI');
    expect(body).toContain('Anthropic');
  });

  it('emits only the SDK line when no AI services are present', () => {
    const result = createEmptyEngineResult();
    result.stack.aiSdk = 'Anthropic';
    result.externalServices = [];
    const body = injectAiPatterns(result);
    expect(body).toBe('- AI SDK: Anthropic');
  });

  it('emits nothing when no SDK and no AI services', () => {
    const result = createEmptyEngineResult();
    expect(injectAiPatterns(result)).toBe('');
  });

  it('ignores non-AI services when building the "Also detected" line', () => {
    const result = createEmptyEngineResult();
    result.stack.aiSdk = 'Vercel AI';
    result.externalServices = [
      makeService('Stripe', 'payments'),
      makeService('Sentry', 'monitoring'),
    ];
    const body = injectAiPatterns(result);
    expect(body).not.toContain('Also detected');
    expect(body).not.toContain('Stripe');
  });
});

describe('getStackSummary', () => {
  it('returns all 7 fields in the documented order for a full stack', () => {
    const result = createEmptyEngineResult();
    result.stack = {
      language: 'TypeScript',
      framework: 'Next.js',
      database: 'PostgreSQL',
      auth: 'Clerk',
      testing: 'Vitest',
      payments: 'Stripe',
      workspace: 'pnpm monorepo',
      aiSdk: 'Vercel AI',
    };
    const summary = getStackSummary(result);
    // Note: workspace is intentionally NOT in the summary list — the helper
    // filters to 7 display-relevant fields and omits workspace. The order is
    // language, framework, database, auth, testing, aiSdk, payments.
    expect(summary).toEqual([
      'TypeScript',
      'Next.js',
      'PostgreSQL',
      'Clerk',
      'Vitest',
      'Vercel AI',
      'Stripe',
    ]);
  });

  it('drops null fields (language only)', () => {
    const result = createEmptyEngineResult();
    result.stack.language = 'Python';
    const summary = getStackSummary(result);
    expect(summary).toEqual(['Python']);
  });

  it('returns an empty array for a fully-null stack', () => {
    const result = createEmptyEngineResult();
    expect(getStackSummary(result)).toEqual([]);
  });
});

describe('matchGotchas', () => {
  it('matches Prisma database', () => {
    const result = createEmptyEngineResult();
    result.stack.database = 'Prisma';
    const matches = matchGotchas(result);
    const dataAccess = matches.get('data-access');
    expect(dataAccess).toBeDefined();
    expect(dataAccess?.some(g => g.includes('prisma generate'))).toBe(true);
  });

  it('matches Drizzle database', () => {
    const result = createEmptyEngineResult();
    result.stack.database = 'Drizzle';
    const matches = matchGotchas(result);
    const dataAccess = matches.get('data-access');
    expect(dataAccess).toBeDefined();
    expect(dataAccess?.some(g => g.includes('drizzle-kit'))).toBe(true);
  });

  it('requires ALL triggers to match (Next.js + Supabase for Supabase server-client gotcha)', () => {
    // Next.js alone → matches the server-components-default gotcha only.
    const nextOnly = createEmptyEngineResult();
    nextOnly.stack.framework = 'Next.js';
    const nextMatches = matchGotchas(nextOnly);
    const nextDataAccess = nextMatches.get('data-access') || [];
    expect(nextDataAccess.some(g => g.includes('createServerClient'))).toBe(false);

    // Next.js + Supabase → now the Supabase server-client gotcha fires.
    const both = createEmptyEngineResult();
    both.stack.framework = 'Next.js';
    both.stack.database = 'Supabase';
    const bothMatches = matchGotchas(both);
    const bothDataAccess = bothMatches.get('data-access') || [];
    expect(bothDataAccess.some(g => g.includes('createServerClient'))).toBe(true);
  });

  it('returns an empty map for a plain project with no trigger matches', () => {
    const result = createEmptyEngineResult();
    const matches = matchGotchas(result);
    expect(matches.size).toBe(0);
  });

  it('matches Vitest testing and emits the watch-mode gotcha', () => {
    // Included because Vitest is ambient in this repo and the default-
    // watch-mode gotcha is the one most likely to bite a reinit flow.
    const result = createEmptyEngineResult();
    result.stack.testing = 'Vitest';
    const matches = matchGotchas(result);
    const testing = matches.get('testing-standards');
    expect(testing).toBeDefined();
    expect(testing?.some(g => g.includes('watch mode'))).toBe(true);
  });
});
