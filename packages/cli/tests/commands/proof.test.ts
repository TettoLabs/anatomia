/**
 * Tests for ana proof command
 *
 * Uses temp directories for isolation.
 * Tests cover all contract assertions A001-A024.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createTestProject } from '../helpers/test-project.js';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

describe('ana proof', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'proof-test-'));
    originalCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to run ana proof command
   */
  function runProof(args: string[] = []): { stdout: string; stderr: string; exitCode: number } {
    const cliPath = path.join(__dirname, '../../dist/index.js');
    try {
      const stdout = execSync(`node ${cliPath} proof ${args.join(' ')}`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
        env: { ...process.env, FORCE_COLOR: '0' },
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string; status?: number };
      return {
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
        exitCode: execError.status || 1,
      };
    }
  }

  /**
   * Helper to create proof chain file
   */
  async function createProofChain(entries: unknown[]): Promise<void> {
    await createTestProject(tempDir);
    await fs.writeFile(
      path.join(tempDir, '.ana', 'proof_chain.json'),
      JSON.stringify({ entries }, null, 2)
    );
  }

  /**
   * Sample proof chain entry for testing
   */
  const sampleEntry = {
    slug: 'stripe-payments',
    feature: 'Stripe Payment Integration',
    result: 'PASS',
    author: { name: 'Developer', email: 'dev@example.com' },
    contract: {
      total: 22,
      covered: 22,
      uncovered: 0,
      satisfied: 20,
      unsatisfied: 0,
      deviated: 2,
    },
    assertions: [
      { id: 'A001', says: 'Creating a payment returns success', status: 'SATISFIED' },
      { id: 'A002', says: 'Payment response includes client secret', status: 'SATISFIED' },
      { id: 'A003', says: 'Webhook updates order status', status: 'DEVIATED', deviation: 'Used event mock instead of DB assertion' },
      { id: 'A004', says: 'Invalid webhooks rejected', status: 'SATISFIED' },
    ],
    acceptance_criteria: { total: 7, met: 7 },
    timing: {
      total_minutes: 90,
      think: 10,
      plan: 25,
      build: 40,
      verify: 15,
    },
    hashes: { scope: 'sha256:abc', contract: 'sha256:def' },
    seal_commit: 'abc123',
    completed_at: '2026-04-01T16:30:00Z',
  };

  /**
   * Second sample entry for multi-entry testing
   */
  const olderEntry = {
    slug: 'auth-refactor',
    feature: 'Auth Refactoring',
    result: 'FAIL' as const,
    author: { name: 'Developer', email: 'dev@example.com' },
    contract: {
      total: 12,
      covered: 12,
      uncovered: 0,
      satisfied: 8,
      unsatisfied: 4,
      deviated: 0,
    },
    assertions: [
      { id: 'A001', says: 'Auth works', status: 'SATISFIED' },
    ],
    acceptance_criteria: { total: 5, met: 3 },
    timing: { total_minutes: 60, think: 5, plan: 15, build: 30, verify: 10 },
    hashes: { scope: 'sha256:111', contract: 'sha256:222' },
    seal_commit: 'def456',
    completed_at: '2026-03-28T12:00:00Z',
  };

  /**
   * Entry with no completed_at for edge case testing
   */
  const undatedEntry = {
    slug: 'no-date-feature',
    feature: 'No Date Feature',
    result: 'PASS' as const,
    author: { name: 'Developer', email: 'dev@example.com' },
    contract: {
      total: 5,
      covered: 5,
      uncovered: 0,
      satisfied: 5,
      unsatisfied: 0,
      deviated: 0,
    },
    assertions: [
      { id: 'A001', says: 'Works', status: 'SATISFIED' },
    ],
    acceptance_criteria: { total: 2, met: 2 },
    timing: { total_minutes: 30 },
    hashes: { scope: 'sha256:333', contract: 'sha256:444' },
    seal_commit: 'ghi789',
  };

  // ─── List View Tests ───────────────────────────────────────────────

  // @ana A001, A002, A003, A004, A005
  describe('displays summary table', () => {
    it('shows table headers: Slug, Result, Assertions, Date', async () => {
      await createProofChain([sampleEntry, olderEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof([]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Slug');
      expect(stdout).toContain('Result');
      expect(stdout).toContain('Assertions');
      expect(stdout).toContain('Date');
    });

    it('shows entry slug in table row', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof([]);
      expect(stdout).toContain('stripe-payments');
    });

    it('shows entry date in table row', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof([]);
      expect(stdout).toContain('2026-04-01');
    });

    it('shows Proof History title', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof([]);
      expect(stdout).toContain('Proof History');
    });
  });

  // @ana A006
  describe('sorts entries reverse chronological', () => {
    it('shows newer entry before older entry', async () => {
      // Insert in wrong order to verify sorting
      await createProofChain([olderEntry, sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof([]);
      const newerIdx = stdout.indexOf('stripe-payments');
      const olderIdx = stdout.indexOf('auth-refactor');
      expect(newerIdx).toBeLessThan(olderIdx);
    });
  });

  // @ana A007
  describe('shows assertion ratio', () => {
    it('shows satisfied/total ratio', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof([]);
      expect(stdout).toContain('20/22');
    });
  });

  // @ana A008, A009
  describe('handles missing proof_chain.json', () => {
    it('outputs "No proofs yet." when file is missing', async () => {
      // createTestProject gives findProjectRoot() a valid .ana/ — no proof_chain.json
      await createTestProject(tempDir);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof([]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('No proofs yet.');
    });
  });

  // @ana A010, A011
  describe('handles empty entries array', () => {
    it('outputs "No proofs yet." when entries is empty', async () => {
      await createProofChain([]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof([]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('No proofs yet.');
    });
  });

  // @ana A012, A013
  describe('outputs JSON list with --json flag', () => {
    it('outputs valid JSON with entries array', async () => {
      await createProofChain([sampleEntry, olderEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['--json']);
      expect(exitCode).toBe(0);

      const json = JSON.parse(stdout);
      expect(json).toBeTruthy();
      expect(json.entries).toBeDefined();
      expect(Array.isArray(json.entries)).toBe(true);
      expect(json.entries).toHaveLength(2);
    });
  });

  // @ana A014
  describe('JSON handles missing proof_chain.json', () => {
    it('returns empty entries array when file missing', async () => {
      // createTestProject gives findProjectRoot() a valid .ana/ — no proof_chain.json
      await createTestProject(tempDir);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['--json']);
      expect(exitCode).toBe(0);

      const json = JSON.parse(stdout);
      expect(json.entries).toHaveLength(0);
    });
  });

  // @ana A018
  describe('handles single entry', () => {
    it('renders table with one row without crashing', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof([]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('stripe-payments');
      expect(stdout).toContain('Slug');
    });
  });

  // @ana A019
  describe('handles undefined completed_at', () => {
    it('sorts entries with dates before entries without dates', async () => {
      await createProofChain([undatedEntry, sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof([]);
      const datedIdx = stdout.indexOf('stripe-payments');
      const undatedIdx = stdout.indexOf('no-date-feature');
      expect(datedIdx).toBeLessThan(undatedIdx);
    });
  });

  // ─── Context Subcommand Tests ──────────────────────────────────────

  /**
   * Helper to create proof chain with callouts for context testing
   */
  async function createContextChain(): Promise<void> {
    const entry = {
      slug: 'drizzle-detection',
      feature: 'Fix Drizzle schema detection',
      result: 'PASS',
      author: { name: 'Developer', email: 'dev@example.com' },
      contract: { total: 20, covered: 20, uncovered: 0, satisfied: 20, unsatisfied: 0, deviated: 0 },
      assertions: [{ id: 'A001', says: 'Drizzle works', status: 'SATISFIED' }],
      acceptance_criteria: { total: 10, met: 10 },
      timing: { total_minutes: 73 },
      hashes: {},
      seal_commit: 'abc123',
      completed_at: '2026-04-24T10:00:00Z',
      modules_touched: ['packages/cli/src/engine/census.ts'],
      callouts: [
        { id: 'drizzle-C1', category: 'code', summary: 'drizzle-dialect overloads SchemaFileEntry semantics', file: 'packages/cli/src/engine/census.ts', anchor: 'census.ts:267-274' },
        { id: 'drizzle-C2', category: 'code', summary: 'Config regex can match comments', file: 'packages/cli/src/engine/census.ts', anchor: 'census.ts:251' },
      ],
      rejection_cycles: 0,
      previous_failures: [],
      build_concerns: [
        { summary: 'Census dialect as sentinel entry', file: 'packages/cli/src/engine/census.ts' },
      ],
    };
    await createProofChain([entry]);
  }

  // @ana A009
  describe('ana proof context returns callouts', () => {
    it('shows callout text for queried file', async () => {
      await createContextChain();
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['context', 'census.ts']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Proof context for census.ts');
      expect(stdout).toContain('drizzle-dialect');
      expect(stdout).toContain('Fix Drizzle schema detection');
    });
  });

  // @ana A011, A012
  describe('ana proof context --json', () => {
    it('returns valid parseable JSON', async () => {
      await createContextChain();
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['context', 'census.ts', '--json']);
      expect(exitCode).toBe(0);

      const json = JSON.parse(stdout);
      expect(json.results).toBeDefined();
      expect(json.results[0].callouts).toBeDefined();
      expect(json.results[0].callouts.length).toBeGreaterThan(0);
      expect(json.results[0].build_concerns).toBeDefined();
    });
  });

  // @ana A013, A014
  describe('ana proof context unknown file', () => {
    it('shows clean message for file with no data', async () => {
      await createContextChain();
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['context', 'unknown-file.ts']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('No proof context');
    });
  });

  // @ana A015
  describe('ana proof context without proof chain', () => {
    it('shows clean message when no proof_chain.json exists', async () => {
      await createTestProject(tempDir);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['context', 'anything.ts']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('No proof chain found');
    });
  });

  // @ana A024
  describe('ana proof context multiple files', () => {
    it('returns results for both files', async () => {
      await createContextChain();
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['context', 'census.ts', 'scan-engine.ts']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('census.ts');
      expect(stdout).toContain('scan-engine.ts');
    });
  });

  // ─── Detail View Tests (existing, unchanged) ──────────────────────

  // @ana A015, A016
  describe('detail view unchanged', () => {
    it('still works when a slug is provided', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['stripe-payments']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Stripe Payment Integration');
    });
  });

  // @ana A017
  describe('detail JSON unchanged', () => {
    it('still works with a slug and --json', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['stripe-payments', '--json']);
      expect(exitCode).toBe(0);

      const json = JSON.parse(stdout);
      expect(json.slug).toBe('stripe-payments');
    });
  });

  // @ana A001
  describe('displays proof card for valid slug', () => {
    it('displays feature name from entry', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['stripe-payments']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Stripe Payment Integration');
    });

    // @ana A002
    it('shows verification result prominently', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('Result: PASS');
    });
  });

  // @ana A003, A004
  describe('displays contract summary', () => {
    it('shows contract compliance counts', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('satisfied');
      expect(stdout).toContain('deviated');
      expect(stdout).toMatch(/20\/22 satisfied/);
    });
  });

  // @ana A005, A006, A007
  describe('displays assertions with status icons', () => {
    it('shows checkmark for satisfied assertions', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('✓');
    });

    it('shows warning icon for deviated assertions', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('⚠');
    });

    it('displays says text from assertions', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('Creating a payment returns');
    });
  });

  // @ana A008, A009
  describe('displays timing breakdown', () => {
    it('shows total pipeline time', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('Total');
      expect(stdout).toMatch(/90 min/);
    });

    it('shows per-phase breakdown when available', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('Build');
      expect(stdout).toMatch(/40 min/);
    });
  });

  // @ana A010, A011
  describe('displays deviations when present', () => {
    it('shows deviations section', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('Deviations');
    });

    it('shows what was done instead', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('→');
      expect(stdout).toContain('Used event mock');
    });
  });

  // @ana A012
  describe('omits deviations section when none', () => {
    it('does not show Deviations header when no deviations', async () => {
      const entryNoDeviations = {
        ...sampleEntry,
        contract: { ...sampleEntry.contract, deviated: 0 },
        assertions: sampleEntry.assertions.map(a => ({
          ...a,
          status: 'SATISFIED',
          deviation: undefined,
        })),
      };
      await createProofChain([entryNoDeviations]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).not.toContain('Deviations');
    });
  });

  // @ana A013, A014, A015, A016
  describe('outputs JSON with --json flag', () => {
    it('outputs valid JSON', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['stripe-payments', '--json']);
      expect(exitCode).toBe(0);

      let parsed: unknown;
      expect(() => {
        parsed = JSON.parse(stdout);
      }).not.toThrow();
      expect(parsed).toBeTruthy();
    });

    it('includes slug field', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments', '--json']);
      const json = JSON.parse(stdout);
      expect(json.slug).toBeDefined();
      expect(json.slug).toBe('stripe-payments');
    });

    it('includes assertions array', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments', '--json']);
      const json = JSON.parse(stdout);
      expect(json.assertions).toBeDefined();
      expect(Array.isArray(json.assertions)).toBe(true);
    });

    it('includes timing information', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments', '--json']);
      const json = JSON.parse(stdout);
      expect(json.timing).toBeDefined();
      expect(json.timing.total_minutes).toBe(90);
    });
  });

  // @ana A017, A018, A024
  describe('shows helpful error for unknown slug', () => {
    it('returns error message for unknown slug', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stderr, exitCode } = runProof(['nonexistent']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('No proof found');
    });

    it('suggests checking work status', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout, stderr } = runProof(['nonexistent']);
      const output = stdout + stderr;
      expect(output).toContain('ana work status');
    });
  });

  // @ana A019, A020
  describe('shows helpful error for missing file', () => {
    it('returns error when proof_chain.json missing', async () => {
      // createTestProject gives findProjectRoot() a valid .ana/ — no proof_chain.json
      await createTestProject(tempDir);
      process.chdir(tempDir);

      const { stderr, exitCode } = runProof(['any-slug']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('No proof chain found');
    });

    it('suggests using work complete', async () => {
      // createTestProject gives findProjectRoot() a valid .ana/ — no proof_chain.json
      await createTestProject(tempDir);
      process.chdir(tempDir);

      const { stdout, stderr } = runProof(['any-slug']);
      const output = stdout + stderr;
      expect(output).toContain('ana work complete');
    });
  });

  // @ana A021, A022
  describe('uses box-drawing terminal styling', () => {
    it('uses box-drawing characters for header', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('┌');
      expect(stdout).toContain('┘');
    });

    it('uses horizontal rules for section headers', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('────');
    });
  });

  // @ana A023
  describe('handles missing optional timing fields', () => {
    it('works when timing breakdown fields are missing', async () => {
      const entryMinimalTiming = {
        ...sampleEntry,
        timing: { total_minutes: 60 }, // No phase breakdown
      };
      await createProofChain([entryMinimalTiming]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['stripe-payments']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Total');
      expect(stdout).toContain('60 min');
      // Should not crash when phases are missing
      expect(stdout).not.toContain('undefined');
    });
  });

  describe('edge cases', () => {
    it('selects correct entry from multiple entries', async () => {
      const entry2 = { ...sampleEntry, slug: 'other-feature', feature: 'Other Feature' };
      await createProofChain([entry2, sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('Stripe Payment Integration');
      expect(stdout).not.toContain('Other Feature');
    });

    it('handles empty entries array', async () => {
      await createProofChain([]);
      process.chdir(tempDir);

      const { stderr, exitCode } = runProof(['any-slug']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('No proof found');
    });

    it('shows FAIL result with appropriate styling', async () => {
      const failEntry = { ...sampleEntry, result: 'FAIL' };
      await createProofChain([failEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('Result: FAIL');
    });

    it('shows unsatisfied assertions with X icon', async () => {
      const entryWithUnsatisfied = {
        ...sampleEntry,
        assertions: [
          ...sampleEntry.assertions,
          { id: 'A005', says: 'Failing assertion', status: 'UNSATISFIED' },
        ],
      };
      await createProofChain([entryWithUnsatisfied]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('✗');
    });

    it('shows uncovered assertions with ? icon', async () => {
      const entryWithUncovered = {
        ...sampleEntry,
        assertions: [
          ...sampleEntry.assertions,
          { id: 'A006', says: 'Uncovered assertion', status: 'UNCOVERED' },
        ],
      };
      await createProofChain([entryWithUncovered]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments']);
      expect(stdout).toContain('?');
    });
  });
});
