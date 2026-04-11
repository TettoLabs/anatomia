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

describe('injectAiPatterns (B1 filter — simplified to exact match in Item 18)', () => {
  it('shows both SDK and a distinct provider variant', () => {
    const result = createEmptyEngineResult();
    result.stack.aiSdk = 'OpenAI';
    result.externalServices = [
      makeService('Vercel AI', 'ai'),
      makeService('OpenAI', 'ai'),
    ];
    const body = injectAiPatterns(result);
    expect(body).toContain('- AI SDK: OpenAI');
    expect(body).toContain('Vercel AI');
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
    // Post-Item 18 this is the ONLY dedup path. AI_PACKAGES['ai'] now returns
    // 'Vercel AI', matching AI_SDK_PACKAGES, so the stack and service have
    // identical names and a plain `s.name !== sdk` is sufficient. The old
    // 3-way match (`${sdk} SDK` + `sdk.replace(' SDK', '')`) was dead code
    // after the naming standardization.
    const result = createEmptyEngineResult();
    result.stack.aiSdk = 'Vercel AI';
    result.externalServices = [makeService('Vercel AI', 'ai')];
    const body = injectAiPatterns(result);
    expect(body).toContain('- AI SDK: Vercel AI');
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

  // S19/SETUP-042: matchGotchas was extended to match triggers against
  // externalServices by category, not just primary stack fields. The
  // above tests all exercise the stack-field path (database/framework/
  // testing). These tests exercise the externalServices-category path
  // so a regression in the extension is caught — the old code would
  // have silently ignored service-category triggers.

  it('matches a service-category trigger via externalServices (Inngest jobs path)', () => {
    // Inngest is detected as a service in the 'jobs' category via
    // JOBS_PACKAGES, NOT as a stack field. Pre-S19 the gotcha system
    // could not reach it because triggers only matched against
    // result.stack. After the extension, { jobs: 'Inngest' } triggers
    // match against externalServices where category='jobs' && name='Inngest'.
    const result = createEmptyEngineResult();
    result.externalServices = [{
      name: 'Inngest',
      category: 'jobs',
      source: 'dependency',
      configFound: false,
      stackRoles: [],
    }];

    const matches = matchGotchas(result);
    const apiPatterns = matches.get('api-patterns');
    expect(apiPatterns).toBeDefined();
    expect(apiPatterns?.some(g => g.includes('Inngest'))).toBe(true);
  });

  it('does NOT fire service-category trigger when category matches but name does not', () => {
    // Sanity check: the match requires BOTH category === key AND name === value.
    // A 'jobs' service that isn't Inngest should not fire the Inngest gotcha.
    const result = createEmptyEngineResult();
    result.externalServices = [{
      name: 'BullMQ',
      category: 'jobs',
      source: 'dependency',
      configFound: false,
      stackRoles: [],
    }];

    const matches = matchGotchas(result);
    const apiPatterns = matches.get('api-patterns');
    expect(apiPatterns?.some(g => g.includes('Inngest')) ?? false).toBe(false);
  });

  it('does NOT fire service-category trigger when name matches but category does not', () => {
    // Defensive: a service named Inngest in a different category should
    // not match { jobs: 'Inngest' } — the trigger is scoped by category.
    const result = createEmptyEngineResult();
    result.externalServices = [{
      name: 'Inngest',
      category: 'wrong-category',
      source: 'dependency',
      configFound: false,
      stackRoles: [],
    }];

    const matches = matchGotchas(result);
    const apiPatterns = matches.get('api-patterns');
    expect(apiPatterns?.some(g => g.includes('Inngest')) ?? false).toBe(false);
  });
});
