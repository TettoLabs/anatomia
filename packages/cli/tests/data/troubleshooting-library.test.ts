/**
 * Troubleshooting library tests
 *
 * Data validation: required fields, no empty triggers, no duplicate IDs, no
 * overlap with gotcha/rule IDs. Matching: entries fire for correct stacks,
 * compound triggers require all conditions, empty stack matches nothing.
 */

import { describe, it, expect } from 'vitest';
import { COMMON_ISSUES } from '../../src/data/troubleshooting-library.js';
import { GOTCHAS } from '../../src/data/gotchas.js';
import { RULES } from '../../src/data/rules-library.js';
import { matchTriggers } from '../../src/utils/gotchas.js';
import { createEmptyEngineResult } from '../../src/engine/types/engineResult.js';

describe('troubleshooting library', () => {
  describe('data validation', () => {
    it('has at least 20 entries', () => {
      expect(COMMON_ISSUES.length).toBeGreaterThanOrEqual(20);
    });

    it('every entry has required fields', () => {
      for (const entry of COMMON_ISSUES) {
        expect(entry.id, `entry missing id`).toBeTruthy();
        expect(Object.keys(entry.triggers).length, `${entry.id}: empty triggers`).toBeGreaterThan(0);
        expect(entry.symptom, `${entry.id}: missing symptom`).toBeTruthy();
        expect(entry.fix, `${entry.id}: missing fix`).toBeTruthy();
      }
    });

    it('no duplicate IDs', () => {
      const ids = COMMON_ISSUES.map(e => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('no overlap with gotcha IDs', () => {
      const gotchaIds = new Set(GOTCHAS.map(g => g.id));
      for (const entry of COMMON_ISSUES) {
        expect(gotchaIds.has(entry.id), `${entry.id} overlaps with gotcha`).toBe(false);
      }
    });

    it('no overlap with rule IDs', () => {
      const ruleIds = new Set(RULES.map(r => r.id));
      for (const entry of COMMON_ISSUES) {
        expect(ruleIds.has(entry.id), `${entry.id} overlaps with rule`).toBe(false);
      }
    });
  });

  describe('matching', () => {
    it('Prisma entries match on database: Prisma', () => {
      const result = createEmptyEngineResult();
      result.stack.database = 'Prisma';
      const matched = COMMON_ISSUES.filter(e => matchTriggers(e.triggers, result));
      expect(matched.length).toBeGreaterThanOrEqual(2);
      expect(matched.some(e => e.id.includes('prisma'))).toBe(true);
    });

    it('Next.js entries match on framework: Next.js', () => {
      const result = createEmptyEngineResult();
      result.stack.framework = 'Next.js';
      const matched = COMMON_ISSUES.filter(e => matchTriggers(e.triggers, result));
      expect(matched.length).toBeGreaterThanOrEqual(3);
    });

    it('compound trigger requires ALL conditions (Prisma + Vercel)', () => {
      const prismaOnly = createEmptyEngineResult();
      prismaOnly.stack.database = 'Prisma';
      const compoundEntries = COMMON_ISSUES.filter(e =>
        e.triggers['database'] === 'Prisma' && e.triggers['platform'] === 'Vercel'
      );
      // With only Prisma, compound entries should NOT match
      for (const entry of compoundEntries) {
        expect(matchTriggers(entry.triggers, prismaOnly), `${entry.id} should not match Prisma-only`).toBe(false);
      }

      // With both Prisma + Vercel, compound entries SHOULD match
      const both = createEmptyEngineResult();
      both.stack.database = 'Prisma';
      both.deployment = { platform: 'Vercel', configFile: null, ci: null, ciWorkflowFiles: [] };
      for (const entry of compoundEntries) {
        expect(matchTriggers(entry.triggers, both), `${entry.id} should match Prisma+Vercel`).toBe(true);
      }
    });

    it('Vitest entries match on testing: Vitest', () => {
      const result = createEmptyEngineResult();
      result.stack.testing = ['Vitest'];
      const matched = COMMON_ISSUES.filter(e => matchTriggers(e.triggers, result));
      expect(matched.length).toBeGreaterThanOrEqual(2);
    });

    it('Anthropic entries match on aiSdk: Anthropic', () => {
      const result = createEmptyEngineResult();
      result.stack.aiSdk = 'Anthropic';
      const matched = COMMON_ISSUES.filter(e => matchTriggers(e.triggers, result));
      expect(matched.length).toBeGreaterThanOrEqual(2);
    });

    it('plain project with no stack matches zero entries', () => {
      const result = createEmptyEngineResult();
      const matched = COMMON_ISSUES.filter(e => matchTriggers(e.triggers, result));
      expect(matched.length).toBe(0);
    });
  });
});
