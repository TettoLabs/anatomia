/**
 * Rules library tests
 *
 * Data validation: required fields, no empty triggers, no duplicate IDs,
 * valid skill names, valid grades. Matching: rules fire for correct stacks.
 */

import { describe, it, expect } from 'vitest';
import { RULES } from '../../src/data/rules-library.js';
import { GOTCHAS } from '../../src/data/gotchas.js';
import { matchTriggers } from '../../src/utils/gotchas.js';
import { createEmptyEngineResult } from '../../src/engine/types/engineResult.js';

const VALID_SKILLS = [
  'coding-standards', 'testing-standards', 'git-workflow',
  'deployment', 'troubleshooting', 'ai-patterns', 'api-patterns', 'data-access',
];

describe('rules library', () => {
  describe('data validation', () => {
    it('has at least 10 rules', () => {
      expect(RULES.length).toBeGreaterThanOrEqual(10);
    });

    it('every rule has required fields', () => {
      for (const rule of RULES) {
        expect(rule.id, 'rule missing id').toBeTruthy();
        expect(Object.keys(rule.triggers).length, `${rule.id}: empty triggers`).toBeGreaterThan(0);
        expect(rule.skill, `${rule.id}: missing skill`).toBeTruthy();
        expect(rule.rule, `${rule.id}: missing rule text`).toBeTruthy();
        expect(rule.decisionTest.without, `${rule.id}: missing decisionTest.without`).toBeTruthy();
        expect(rule.decisionTest.with, `${rule.id}: missing decisionTest.with`).toBeTruthy();
        expect(['SUPER_GOOD', 'GOOD', 'OK']).toContain(rule.grade);
        expect(typeof rule.tailorable).toBe('boolean');
      }
    });

    it('no duplicate rule IDs', () => {
      const ids = RULES.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every rule targets a valid skill', () => {
      for (const rule of RULES) {
        expect(VALID_SKILLS, `${rule.id} targets invalid skill: ${rule.skill}`).toContain(rule.skill);
      }
    });

    it('no overlap with gotcha IDs', () => {
      const gotchaIds = new Set(GOTCHAS.map(g => g.id));
      for (const rule of RULES) {
        expect(gotchaIds.has(rule.id), `${rule.id} overlaps with gotcha`).toBe(false);
      }
    });
  });

  describe('matching', () => {
    it('ESM rule matches TypeScript projects', () => {
      const result = createEmptyEngineResult();
      result.stack.language = 'TypeScript';
      const matched = RULES.filter(r => matchTriggers(r.triggers, result));
      expect(matched.some(r => r.id === 'esm-js-extensions')).toBe(true);
    });

    it('Prisma rules match on database: Prisma', () => {
      const result = createEmptyEngineResult();
      result.stack.database = 'Prisma';
      const matched = RULES.filter(r => matchTriggers(r.triggers, result));
      expect(matched.some(r => r.id === 'prisma-generate-rule')).toBe(true);
    });

    it('compound rule (Prisma + Vercel) requires both', () => {
      const prismaOnly = createEmptyEngineResult();
      prismaOnly.stack.database = 'Prisma';
      expect(matchTriggers({ database: 'Prisma', platform: 'Vercel' }, prismaOnly)).toBe(false);

      const both = createEmptyEngineResult();
      both.stack.database = 'Prisma';
      both.deployment = { platform: 'Vercel', configFile: null, ci: null, ciWorkflowFiles: [] };
      expect(matchTriggers({ database: 'Prisma', platform: 'Vercel' }, both)).toBe(true);
    });

    it('Vitest rule matches on testing: Vitest', () => {
      const result = createEmptyEngineResult();
      result.stack.testing = ['Vitest'];
      const matched = RULES.filter(r => matchTriggers(r.triggers, result));
      expect(matched.some(r => r.id === 'vitest-run-flag')).toBe(true);
    });

    it('plain project with no stack matches only non-stack-specific rules', () => {
      const result = createEmptyEngineResult();
      const matched = RULES.filter(r => matchTriggers(r.triggers, result));
      expect(matched.length).toBe(0);
    });
  });
});
