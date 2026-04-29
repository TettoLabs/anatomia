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

  // @ana A012, A013, A022, A023
  describe('outputs JSON list with --json flag', () => {
    it('outputs valid JSON with 4-key contract envelope', async () => {
      await createProofChain([sampleEntry, olderEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['--json']);
      expect(exitCode).toBe(0);

      const json = JSON.parse(stdout);
      expect(json).toBeTruthy();
      // 4-key envelope
      expect(json.command).toBe('proof');
      expect(json.timestamp).toBeDefined();
      expect(json.results).toBeDefined();
      expect(json.meta).toBeDefined();
      // results contains entries
      expect(json.results.entries).toBeDefined();
      expect(Array.isArray(json.results.entries)).toBe(true);
      expect(json.results.entries).toHaveLength(2);
      // meta contains chain health
      expect(json.meta.chain_runs).toBeDefined();
      expect(json.meta.findings).toBeDefined();
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
      expect(json.results.entries).toHaveLength(0);
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
   * Helper to create proof chain with findings for context testing
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
      findings: [
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
  describe('ana proof context returns findings', () => {
    it('shows finding text for queried file', async () => {
      await createContextChain();
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['context', 'census.ts']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Proof context for census.ts');
      expect(stdout).toContain('drizzle-dialect');
      expect(stdout).toContain('Fix Drizzle schema detection');
    });
  });

  // @ana A011, A012, A022, A023
  describe('ana proof context --json', () => {
    it('returns valid parseable JSON with contract envelope', async () => {
      await createContextChain();
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['context', 'census.ts', '--json']);
      expect(exitCode).toBe(0);

      const json = JSON.parse(stdout);
      // 4-key envelope
      expect(json.command).toBe('proof context');
      expect(json.timestamp).toBeDefined();
      expect(json.meta).toBeDefined();
      expect(json.meta.chain_runs).toBeDefined();
      // results contains context data
      expect(json.results.results).toBeDefined();
      expect(json.results.results[0].findings).toBeDefined();
      expect(json.results.results[0].findings.length).toBeGreaterThan(0);
      expect(json.results.results[0].build_concerns).toBeDefined();
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

  // @ana A017, A022, A023
  describe('detail JSON uses contract envelope', () => {
    it('wraps entry in 4-key envelope', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['stripe-payments', '--json']);
      expect(exitCode).toBe(0);

      const json = JSON.parse(stdout);
      expect(json.command).toBe('proof stripe-payments');
      expect(json.timestamp).toBeDefined();
      expect(json.results.slug).toBe('stripe-payments');
      expect(json.meta).toBeDefined();
      expect(json.meta.chain_runs).toBeDefined();
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
    it('outputs valid JSON envelope', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['stripe-payments', '--json']);
      expect(exitCode).toBe(0);

      let parsed: Record<string, unknown> | undefined;
      expect(() => {
        parsed = JSON.parse(stdout);
      }).not.toThrow();
      expect(parsed).toBeTruthy();
      expect(parsed!['command']).toBeDefined();
      expect(parsed!['results']).toBeDefined();
      expect(parsed!['meta']).toBeDefined();
    });

    it('includes slug field in results', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments', '--json']);
      const json = JSON.parse(stdout);
      expect(json.results.slug).toBeDefined();
      expect(json.results.slug).toBe('stripe-payments');
    });

    it('includes assertions array in results', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments', '--json']);
      const json = JSON.parse(stdout);
      expect(json.results.assertions).toBeDefined();
      expect(Array.isArray(json.results.assertions)).toBe(true);
    });

    it('includes timing information in results', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['stripe-payments', '--json']);
      const json = JSON.parse(stdout);
      expect(json.results.timing).toBeDefined();
      expect(json.results.timing.total_minutes).toBe(90);
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

  // ─── Close Subcommand Tests ──────────────────────────────────────────

  /**
   * Helper to create a git-initialized project with proof chain for close testing.
   * Sets up a "main" branch so close can verify branch.
   */
  async function createCloseTestProject(entries: unknown[], options?: { branch?: string }): Promise<void> {
    const branch = options?.branch ?? 'main';

    // Init git
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

    // Create .ana/ana.json
    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(
      path.join(anaDir, 'ana.json'),
      JSON.stringify({ artifactBranch: 'main' }),
    );

    // Write proof chain
    await fs.writeFile(
      path.join(anaDir, 'proof_chain.json'),
      JSON.stringify({ entries }, null, 2),
    );

    // Initial commit and set branch
    execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });
    execSync(`git branch -M ${branch}`, { cwd: tempDir, stdio: 'ignore' });
  }

  /** Entry with active findings for close testing */
  const closeEntry = {
    slug: 'fix-validation',
    feature: 'Fix Input Validation',
    result: 'PASS',
    author: { name: 'Developer', email: 'dev@example.com' },
    contract: { total: 5, covered: 5, uncovered: 0, satisfied: 5, unsatisfied: 0, deviated: 0 },
    assertions: [{ id: 'A001', says: 'Validates input', status: 'SATISFIED' }],
    acceptance_criteria: { total: 3, met: 3 },
    timing: { total_minutes: 30 },
    hashes: {},
    completed_at: '2026-04-20T10:00:00Z',
    modules_touched: ['src/api/payments.ts'],
    findings: [
      { id: 'F001', category: 'validation', summary: 'Missing request validation', file: 'src/api/payments.ts', anchor: 'validateInput', status: 'active', severity: 'blocker' },
      { id: 'F002', category: 'testing', summary: 'No test for edge case', file: 'src/api/payments.ts', anchor: null, status: 'active' },
      { id: 'F003', category: 'code', summary: 'Redundant import', file: 'src/utils/helpers.ts', anchor: null, status: 'closed', closed_by: 'mechanical', closed_at: '2026-04-22T10:00:00Z', closed_reason: 'auto-closed' },
    ],
    rejection_cycles: 0,
    previous_failures: [],
    build_concerns: [],
  };

  /** Entry with a lesson finding */
  const lessonEntry = {
    slug: 'add-logging',
    feature: 'Add Structured Logging',
    result: 'PASS',
    author: { name: 'Developer', email: 'dev@example.com' },
    contract: { total: 3, covered: 3, uncovered: 0, satisfied: 3, unsatisfied: 0, deviated: 0 },
    assertions: [{ id: 'A001', says: 'Logs work', status: 'SATISFIED' }],
    acceptance_criteria: { total: 2, met: 2 },
    timing: { total_minutes: 20 },
    hashes: {},
    completed_at: '2026-04-21T10:00:00Z',
    modules_touched: [],
    findings: [
      { id: 'L001', category: 'testing', summary: 'Consider adding log rotation test', file: null, anchor: null, status: 'lesson' },
    ],
    rejection_cycles: 0,
    previous_failures: [],
    build_concerns: [],
  };

  // @ana A001, A002, A003, A004, A005
  describe('closes finding successfully', () => {
    it('marks finding as closed with reason', async () => {
      await createCloseTestProject([closeEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['close', 'F001', '--reason', 'fixed-in-pr']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Closed F001');
      expect(stdout).toContain('fixed-in-pr');

      // Verify chain was mutated
      const chain = JSON.parse(await fs.readFile(path.join(tempDir, '.ana', 'proof_chain.json'), 'utf-8'));
      const finding = chain.entries[0].findings.find((f: { id: string }) => f.id === 'F001');
      expect(finding.status).toBe('closed');
      expect(finding.closed_by).toBe('human');
      expect(finding.closed_reason).toBe('fixed-in-pr');
      expect(finding.closed_at).toBeDefined();

      // Verify PROOF_CHAIN.md was regenerated
      const dashboard = await fs.readFile(path.join(tempDir, '.ana', 'PROOF_CHAIN.md'), 'utf-8');
      expect(dashboard).toContain('Proof Chain Dashboard');

      // Verify commit was created
      const lastCommit = execSync('git log -1 --pretty=%s', { cwd: tempDir, encoding: 'utf-8' }).trim();
      expect(lastCommit).toContain('[proof] Close');
      expect(lastCommit).toContain('F001');
    });
  });

  // @ana A006
  describe('rejects close from wrong branch', () => {
    it('shows WRONG_BRANCH error', async () => {
      await createCloseTestProject([closeEntry], { branch: 'feature/other' });
      process.chdir(tempDir);

      const { stderr, exitCode } = runProof(['close', 'F001', '--reason', 'test']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('Wrong branch');
    });

    it('returns WRONG_BRANCH code in JSON', async () => {
      await createCloseTestProject([closeEntry], { branch: 'feature/other' });
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['close', 'F001', '--reason', 'test', '--json']);
      expect(exitCode).not.toBe(0);

      const json = JSON.parse(stdout);
      expect(json.error.code).toBe('WRONG_BRANCH');
    });
  });

  // @ana A007
  describe('rejects nonexistent finding', () => {
    it('shows FINDING_NOT_FOUND error', async () => {
      await createCloseTestProject([closeEntry]);
      process.chdir(tempDir);

      const { stderr, exitCode } = runProof(['close', 'F999', '--reason', 'test']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('not found');
    });

    it('returns FINDING_NOT_FOUND code in JSON', async () => {
      await createCloseTestProject([closeEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['close', 'F999', '--reason', 'test', '--json']);
      expect(exitCode).not.toBe(0);

      const json = JSON.parse(stdout);
      expect(json.error.code).toBe('FINDING_NOT_FOUND');
    });
  });

  // @ana A008
  describe('rejects already-closed finding', () => {
    it('shows ALREADY_CLOSED error with closer info', async () => {
      await createCloseTestProject([closeEntry]);
      process.chdir(tempDir);

      const { stderr, exitCode } = runProof(['close', 'F003', '--reason', 'again']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('already closed');
    });

    it('returns ALREADY_CLOSED code in JSON', async () => {
      await createCloseTestProject([closeEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['close', 'F003', '--reason', 'again', '--json']);
      expect(exitCode).not.toBe(0);

      const json = JSON.parse(stdout);
      expect(json.error.code).toBe('ALREADY_CLOSED');
      expect(json.error.closed_by).toBe('mechanical');
    });
  });

  // @ana A009
  describe('rejects close without reason', () => {
    it('shows REASON_REQUIRED error', async () => {
      await createCloseTestProject([closeEntry]);
      process.chdir(tempDir);

      const { stderr, exitCode } = runProof(['close', 'F001']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('--reason is required');
    });

    it('returns REASON_REQUIRED code in JSON', async () => {
      await createCloseTestProject([closeEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['close', 'F001', '--json']);
      expect(exitCode).not.toBe(0);

      const json = JSON.parse(stdout);
      expect(json.error.code).toBe('REASON_REQUIRED');
    });
  });

  // @ana A010
  describe('closes lesson finding', () => {
    it('shows lesson → closed transition', async () => {
      await createCloseTestProject([lessonEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['close', 'L001', '--reason', 'no longer relevant']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('lesson');
      expect(stdout).toContain('closed');
    });
  });

  // @ana A011, A012, A013
  describe('close returns valid JSON envelope', () => {
    it('returns 4-key envelope with finding and meta', async () => {
      await createCloseTestProject([closeEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['close', 'F001', '--reason', 'fixed', '--json']);
      expect(exitCode).toBe(0);

      const json = JSON.parse(stdout);
      expect(json.command).toBe('proof close');
      expect(json.timestamp).toBeDefined();
      expect(json.results.finding.id).toBe('F001');
      expect(json.results.previous_status).toBe('active');
      expect(json.results.new_status).toBe('closed');
      expect(json.results.closed_by).toBe('human');
      expect(json.meta.findings.active).toBeDefined();
      expect(json.meta.chain_runs).toBeDefined();
    });
  });

  // @ana A024, A025
  describe('error responses use contract envelope', () => {
    it('returns error envelope with code and meta', async () => {
      await createCloseTestProject([closeEntry]);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['close', 'F999', '--reason', 'test', '--json']);
      expect(exitCode).not.toBe(0);

      const json = JSON.parse(stdout);
      expect(json.command).toBe('proof close');
      expect(json.error.code).toBe('FINDING_NOT_FOUND');
      expect(json.meta).toBeDefined();
    });
  });

  // ─── Audit Subcommand Tests ──────────────────────────────────────────

  /**
   * Helper to create proof chain with many findings for audit testing
   */
  async function createAuditChain(findingCount: number, fileCount: number): Promise<void> {
    const findings: Array<Record<string, unknown>> = [];
    for (let i = 0; i < findingCount; i++) {
      const fileIdx = i % fileCount;
      findings.push({
        id: `F${String(i + 1).padStart(3, '0')}`,
        category: 'code',
        summary: `Finding ${i + 1} in file ${fileIdx}`,
        file: `src/file${fileIdx}.ts`,
        anchor: null,
        status: 'active',
        severity: i % 3 === 0 ? 'blocker' : 'observation',
      });
    }

    const entry = {
      slug: 'bulk-test',
      feature: 'Bulk Test Feature',
      result: 'PASS',
      author: { name: 'Dev', email: 'dev@example.com' },
      contract: { total: 1, covered: 1, uncovered: 0, satisfied: 1, unsatisfied: 0, deviated: 0 },
      assertions: [{ id: 'A001', says: 'Works', status: 'SATISFIED' }],
      acceptance_criteria: { total: 1, met: 1 },
      timing: { total_minutes: 10 },
      hashes: {},
      completed_at: '2026-04-20T10:00:00Z',
      modules_touched: [],
      findings,
      rejection_cycles: 0,
      previous_failures: [],
      build_concerns: [],
    };

    await createTestProject(tempDir);
    await fs.writeFile(
      path.join(tempDir, '.ana', 'proof_chain.json'),
      JSON.stringify({ entries: [entry] }, null, 2),
    );
  }

  // @ana A014
  describe('displays audit grouped by file', () => {
    it('shows file headers with finding count', async () => {
      await createAuditChain(5, 2);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['audit']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('findings)');
      expect(stdout).toContain('src/file0.ts');
      expect(stdout).toContain('src/file1.ts');
    });
  });

  // @ana A015
  describe('truncates audit at 8 files', () => {
    it('caps display at 8 files with overflow', async () => {
      // 30 findings across 10 files → only 8 files shown
      await createAuditChain(30, 10);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['audit']);
      expect(exitCode).toBe(0);

      // Count file headers (lines containing "findings)")
      const fileHeaders = stdout.split('\n').filter((l: string) => l.includes('finding'));
      // Should be 8 file headers + 1 summary line at top + overflow
      expect(fileHeaders.length).toBeLessThanOrEqual(10); // 8 files + summary + overflow
      expect(stdout).toContain('more');
    });
  });

  // @ana A016
  describe('truncates findings per file at 3', () => {
    it('caps findings per file at 3 with overflow', async () => {
      // 6 findings all in 1 file → 3 shown + "3 more"
      await createAuditChain(6, 1);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['audit']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('3 more');
    });
  });

  // @ana A017
  describe('shows overflow message', () => {
    it('shows overflow for files exceeding cap', async () => {
      await createAuditChain(50, 12);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['audit']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('more');
    });
  });

  // @ana A018
  describe('audit works from non-artifact branch', () => {
    it('succeeds without branch check', async () => {
      // Create on a feature branch — audit should still work
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

      const anaDir = path.join(tempDir, '.ana');
      await fs.mkdir(anaDir, { recursive: true });
      await fs.writeFile(path.join(anaDir, 'ana.json'), JSON.stringify({ artifactBranch: 'main' }));
      await fs.writeFile(
        path.join(anaDir, 'proof_chain.json'),
        JSON.stringify({ entries: [closeEntry] }, null, 2),
      );
      execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git checkout -b feature/something', { cwd: tempDir, stdio: 'ignore' });

      process.chdir(tempDir);

      const { exitCode } = runProof(['audit']);
      expect(exitCode).toBe(0);
    });
  });

  // @ana A019
  describe('audit with zero findings shows clean message', () => {
    it('shows clean message when no active findings', async () => {
      // All findings are closed
      const closedEntry = {
        ...closeEntry,
        findings: closeEntry.findings.map(f => ({ ...f, status: 'closed' })),
      };
      await createTestProject(tempDir);
      await fs.writeFile(
        path.join(tempDir, '.ana', 'proof_chain.json'),
        JSON.stringify({ entries: [closedEntry] }, null, 2),
      );
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['audit']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('clean');
    });
  });

  // @ana A020, A021
  describe('audit returns valid JSON envelope', () => {
    it('returns total_active and by_file with anchor_present', async () => {
      await createAuditChain(5, 2);
      process.chdir(tempDir);

      const { stdout, exitCode } = runProof(['audit', '--json']);
      expect(exitCode).toBe(0);

      const json = JSON.parse(stdout);
      expect(json.command).toBe('proof audit');
      expect(json.results.total_active).toBe(5);
      expect(json.results.by_file).toBeDefined();
      expect(json.results.by_file.length).toBeGreaterThan(0);
      expect(json.results.by_file[0].findings[0].anchor_present).toBeDefined();
      expect(json.meta.chain_runs).toBeDefined();
    });
  });

  // ─── Template Tests ─────────────────────────────────────────────────

  // @ana A026
  describe('template includes proof context subsection', () => {
    it('Plan template has ### Proof Context between Pattern Extracts and Checkpoint Commands', async () => {
      const templatePath = path.join(__dirname, '../../templates/.claude/agents/ana-plan.md');
      const content = await fs.readFile(templatePath, 'utf-8');
      expect(content).toContain('### Proof Context');

      // Verify ordering: Pattern Extracts < Proof Context < Checkpoint Commands
      const patternIdx = content.indexOf('### Pattern Extracts');
      const proofIdx = content.indexOf('### Proof Context');
      const checkpointIdx = content.indexOf('### Checkpoint Commands');
      expect(patternIdx).toBeLessThan(proofIdx);
      expect(proofIdx).toBeLessThan(checkpointIdx);
    });
  });

  // @ana A022, A023
  describe('existing commands use contract envelope', () => {
    it('list --json has 4-key envelope with meta', async () => {
      await createProofChain([sampleEntry]);
      process.chdir(tempDir);

      const { stdout } = runProof(['--json']);
      const json = JSON.parse(stdout);
      expect(json.command).toBeDefined();
      expect(json.timestamp).toBeDefined();
      expect(json.results).toBeDefined();
      expect(json.meta).toBeDefined();
      expect(json.meta.chain_runs).toBeDefined();
      expect(json.meta.findings.active).toBeDefined();
      expect(json.meta.findings.closed).toBeDefined();
      expect(json.meta.findings.lesson).toBeDefined();
      expect(json.meta.findings.promoted).toBeDefined();
      expect(json.meta.findings.total).toBeDefined();
    });
  });
});
