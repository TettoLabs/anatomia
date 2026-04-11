/**
 * Unit tests for AnaJsonSchema — the runtime validator + defaulter for
 * .ana/ana.json.
 *
 * The schema's contract:
 *   1. Known fields with valid values → passed through.
 *   2. Known fields with invalid values → per-field .catch() fires;
 *      ONLY that field resets to its default. Other fields survive.
 *   3. Unknown fields → stripped via .strip() (prevents pre-S18 fossils
 *      like scanStaleDays from surviving forever in user installs).
 *   4. Missing fields → .default() supplies a sensible initial value so
 *      the re-init merge never has to backfill from newJson.
 *
 * These tests protect against the real-world drift observed on the
 * dogfood .ana/: setupMode: "guided" (pre-S18 string) and scanStaleDays: 7
 * (pre-S18 field) both persisted forever because the pre-S19 merge
 * preserved everything verbatim.
 */

import { describe, it, expect } from 'vitest';
import { AnaJsonSchema } from '../../../src/commands/init/anaJsonSchema.js';

describe('AnaJsonSchema', () => {
  describe('happy path', () => {
    it('parses a fully-valid ana.json unchanged', () => {
      const input = {
        anaVersion: '0.2.0',
        name: 'my-project',
        language: 'TypeScript',
        framework: 'Next.js',
        packageManager: 'pnpm',
        commands: { build: 'pnpm run build', test: 'pnpm test' },
        coAuthor: 'Ana <build@anatomia.dev>',
        artifactBranch: 'main',
        setupMode: 'complete',
        setupCompletedAt: '2026-04-06T01:04:09.194Z',
        lastScanAt: '2026-04-07T17:58:30.491Z',
      };
      const parsed = AnaJsonSchema.parse(input);
      expect(parsed.anaVersion).toBe('0.2.0');
      expect(parsed.name).toBe('my-project');
      expect(parsed.setupMode).toBe('complete');
      expect(parsed.lastScanAt).toBe('2026-04-07T17:58:30.491Z');
    });

    it('accepts nullable fields as null', () => {
      const parsed = AnaJsonSchema.parse({
        anaVersion: '0.2.0',
        name: 'x',
        language: null,
        framework: null,
        packageManager: null,
        setupCompletedAt: null,
        lastScanAt: null,
      });
      expect(parsed.language).toBeNull();
      expect(parsed.framework).toBeNull();
      expect(parsed.packageManager).toBeNull();
    });
  });

  describe('drift from pre-S18 dogfood installs', () => {
    it('strips scanStaleDays fossil without touching other fields', () => {
      const input = {
        anaVersion: '0.1.0',
        name: 'anatomia',
        language: 'TypeScript',
        framework: null,
        packageManager: 'pnpm',
        commands: { build: 'pnpm run build' },
        coAuthor: 'Ana <build@anatomia.dev>',
        artifactBranch: 'main',
        setupMode: 'complete',
        scanStaleDays: 7, // <-- pre-S18 fossil, removed from createAnaJson in S18/D8.1
        setupCompletedAt: '2026-04-06T01:04:09.194Z',
        lastScanAt: '2026-04-07T17:58:30.491Z',
      };
      const parsed = AnaJsonSchema.parse(input);
      expect('scanStaleDays' in parsed).toBe(false);
      // Everything else survives
      expect(parsed.name).toBe('anatomia');
      expect(parsed.coAuthor).toBe('Ana <build@anatomia.dev>');
      expect(parsed.artifactBranch).toBe('main');
      expect(parsed.setupMode).toBe('complete');
    });

    it('catches invalid setupMode "guided" and defaults to not_started', () => {
      const input = {
        anaVersion: '0.1.0',
        name: 'anatomia',
        language: 'TypeScript',
        packageManager: 'pnpm',
        coAuthor: 'Ana <build@anatomia.dev>',
        artifactBranch: 'main',
        setupMode: 'guided', // <-- pre-S18 string, not in current enum
        setupCompletedAt: '2026-04-06T01:04:09.194Z',
        lastScanAt: '2026-04-07T17:58:30.491Z',
      };
      const parsed = AnaJsonSchema.parse(input);
      expect(parsed.setupMode).toBe('not_started');
      // Other user fields must survive the single-field catch
      expect(parsed.coAuthor).toBe('Ana <build@anatomia.dev>');
      expect(parsed.artifactBranch).toBe('main');
      expect(parsed.setupCompletedAt).toBe('2026-04-06T01:04:09.194Z');
    });

    it('handles both drifts at once (guided + scanStaleDays)', () => {
      // This is the exact shape of the live anatomia dogfood ana.json at
      // the start of S19. The drift survived two sprints of re-inits
      // because the old merge was spread-everything-preserve-nothing.
      const input = {
        name: 'anatomia',
        framework: null,
        language: 'TypeScript',
        packageManager: 'pnpm',
        commands: {
          build: 'pnpm run build',
          test: 'pnpm run test',
          lint: 'pnpm run lint',
          dev: 'pnpm run dev',
        },
        coAuthor: 'Ana <build@anatomia.dev>',
        artifactBranch: 'main',
        setupMode: 'guided',
        scanStaleDays: 7,
        setupCompletedAt: '2026-04-06T01:04:09.194Z',
        lastScanAt: '2026-04-07T17:58:30.491Z',
      };
      const parsed = AnaJsonSchema.parse(input);
      expect('scanStaleDays' in parsed).toBe(false);
      expect(parsed.setupMode).toBe('not_started');
      expect(parsed.name).toBe('anatomia');
      expect(parsed.coAuthor).toBe('Ana <build@anatomia.dev>');
    });
  });

  describe('missing fields get defaults', () => {
    it('defaults anaVersion when missing', () => {
      const parsed = AnaJsonSchema.parse({ name: 'x' });
      expect(parsed.anaVersion).toBe('0.0.0');
    });

    it('defaults name to "unknown" when missing', () => {
      const parsed = AnaJsonSchema.parse({});
      expect(parsed.name).toBe('unknown');
    });

    it('defaults setupMode to not_started when missing', () => {
      const parsed = AnaJsonSchema.parse({});
      expect(parsed.setupMode).toBe('not_started');
    });

    it('defaults nullable fields to null when missing', () => {
      const parsed = AnaJsonSchema.parse({});
      expect(parsed.language).toBeNull();
      expect(parsed.framework).toBeNull();
      expect(parsed.packageManager).toBeNull();
      expect(parsed.setupCompletedAt).toBeNull();
      expect(parsed.lastScanAt).toBeNull();
    });
  });

  describe('per-field .catch() isolation', () => {
    it('resets only the broken field when multiple fields have valid values', () => {
      const parsed = AnaJsonSchema.parse({
        anaVersion: '0.2.0',
        name: 'my-project',
        language: 42, // <-- wrong type, catches to null
        framework: 'Next.js',
        setupMode: 'complete',
      });
      expect(parsed.language).toBeNull(); // caught
      expect(parsed.framework).toBe('Next.js'); // survives
      expect(parsed.anaVersion).toBe('0.2.0'); // survives
      expect(parsed.setupMode).toBe('complete'); // survives
    });
  });
});
