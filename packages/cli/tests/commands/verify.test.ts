import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { runPreCheck, runContractPreCheck } from '../../src/commands/verify.js';

/**
 * Tests for `ana verify pre-check` command (seal verification only)
 *
 * Uses temp directories with real git repos for isolation.
 */

describe('ana verify pre-check', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'verify-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to capture console output
   */
  function captureOutput(fn: () => void): { stdout: string; stderr: string } {
    const originalLog = console.log;
    const originalError = console.error;
    const originalExit = process.exit;

    const stdout: string[] = [];
    const stderr: string[] = [];

    console.log = (...args: unknown[]) => {
      stdout.push(args.map(String).join(' '));
    };
    console.error = (...args: unknown[]) => {
      stderr.push(args.map(String).join(' '));
    };
    process.exit = ((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as typeof process.exit;

    try {
      fn();
    } catch (error) {
      // Expected - process.exit throws
      if (error instanceof Error && error.message.startsWith('process.exit')) {
        // Pass
      } else {
        throw error;
      }
    } finally {
      console.log = originalLog;
      console.error = originalError;
      process.exit = originalExit;
    }

    return {
      stdout: stdout.join('\n'),
      stderr: stderr.join('\n')
    };
  }

  describe('no contract', () => {
    it('prints message when no contract exists', async () => {
      // Create minimal project
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

      const anaDir = path.join(tempDir, '.ana');
      await fs.mkdir(anaDir, { recursive: true });
      await fs.writeFile(
        path.join(anaDir, 'ana.json'),
        JSON.stringify({ artifactBranch: 'main' }),
        'utf-8'
      );

      // Create plan directory without contract
      const planDir = path.join(anaDir, 'plans', 'active', 'test-slug');
      await fs.mkdir(planDir, { recursive: true });
      await fs.writeFile(path.join(planDir, 'scope.md'), '# Scope', 'utf-8');

      execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('No contract found');
      expect(output.stdout).toContain('AnaPlan');
    });

    it('errors when slug does not exist', async () => {
      // Create minimal project with ana.json and .git/
      const anaDir = path.join(tempDir, '.ana');
      await fs.mkdir(anaDir, { recursive: true });
      await fs.writeFile(
        path.join(anaDir, 'ana.json'),
        JSON.stringify({ artifactBranch: 'main' }),
        'utf-8'
      );
      await fs.mkdir(path.join(tempDir, '.git'), { recursive: true });

      const output = captureOutput(() => runPreCheck('nonexistent'));

      expect(output.stderr).toContain('No active work found');
    });
  });

  describe('seal verification', () => {
    /**
     * Helper to create a contract mode test project
     */
    async function createContractProject(options: {
      slug: string;
      contract: string;
      saveContract?: boolean;
    }): Promise<void> {
      // Create git repo
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

      // Create ana.json
      const anaDir = path.join(tempDir, '.ana');
      await fs.mkdir(anaDir, { recursive: true });
      await fs.writeFile(
        path.join(anaDir, 'ana.json'),
        JSON.stringify({ artifactBranch: 'main' }),
        'utf-8'
      );

      // Create plan directory
      const planDir = path.join(anaDir, 'plans', 'active', options.slug);
      await fs.mkdir(planDir, { recursive: true });

      // Write contract
      await fs.writeFile(path.join(planDir, 'contract.yaml'), options.contract, 'utf-8');

      // Initial commit
      execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });

      // Write .saves.json with contract hash if requested
      if (options.saveContract !== false) {
        const contractContent = await fs.readFile(path.join(planDir, 'contract.yaml'), 'utf-8');
        const hash = `sha256:${createHash('sha256').update(contractContent).digest('hex')}`;
        const savesPath = path.join(planDir, '.saves.json');
        await fs.writeFile(savesPath, JSON.stringify({
          contract: {
            saved_at: new Date().toISOString(),
            hash,
          }
        }), 'utf-8');
      }
    }

    // @ana A001, A002
    it('reports INTACT when contract unchanged', async () => {
      const contract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"
assertions:
  - id: A001
    says: "Test passes"
    block: "test"
    target: "result"
    matcher: "truthy"
file_changes:
  - path: src/test.ts
    action: create`;

      await createContractProject({ slug: 'test-slug', contract });

      const result = runContractPreCheck('test-slug', tempDir);
      expect(result.seal).toBe('INTACT');
      expect(result.sealHash).toBeDefined();
    });

    // @ana A003
    it('reports TAMPERED when contract modified after save', async () => {
      const contract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"
assertions:
  - id: A001
    says: "Test passes"
    block: "test"
    target: "result"
    matcher: "truthy"
file_changes:
  - path: src/test.ts
    action: create`;

      await createContractProject({ slug: 'test-slug', contract });

      // Modify the contract after save
      const planDir = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug');
      await fs.writeFile(
        path.join(planDir, 'contract.yaml'),
        contract.replace('Test passes', 'Modified assertion'),
        'utf-8'
      );

      const result = runContractPreCheck('test-slug', tempDir);
      expect(result.seal).toBe('TAMPERED');
    });

    // @ana A004, A005
    it('returns seal-only result with no assertions or summary', async () => {
      const contract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"
assertions:
  - id: A001
    says: "Test passes"
    block: "test"
    target: "result"
    matcher: "truthy"
file_changes:
  - path: src/test.ts
    action: create`;

      await createContractProject({ slug: 'test-slug', contract });

      const result = runContractPreCheck('test-slug', tempDir);

      // Result has seal and sealHash only — no assertions, summary, or outOfScope
      expect(result.seal).toBe('INTACT');
      expect(result.sealHash).toBeDefined();
      expect((result as unknown as Record<string, unknown>)['assertions']).toBeUndefined();
      expect((result as unknown as Record<string, unknown>)['summary']).toBeUndefined();
      expect((result as unknown as Record<string, unknown>)['outOfScope']).toBeUndefined();
    });

    // @ana A006
    it('reports UNVERIFIABLE when no .saves.json', async () => {
      const contract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"
assertions:
  - id: A001
    says: "Test assertion"
    block: "test"
    target: "result"
    matcher: "truthy"
file_changes:
  - path: src/test.ts
    action: create`;

      await createContractProject({
        slug: 'test-slug',
        contract,
        saveContract: false,
      });

      const result = runContractPreCheck('test-slug', tempDir);
      expect(result.seal).toBe('UNVERIFIABLE');
    });

    // @ana A007
    it('does not import execSync, glob, readArtifactBranch, yaml, or ContractSchema', async () => {
      const verifySource = await fs.readFile(
        path.join(originalCwd, 'src', 'commands', 'verify.ts'),
        'utf-8'
      );

      expect(verifySource).not.toContain("import { execSync }");
      expect(verifySource).not.toContain("from 'glob'");
      expect(verifySource).not.toContain("readArtifactBranch");
      expect(verifySource).not.toContain("import * as yaml");
      expect(verifySource).not.toContain("ContractSchema");
    });

    it('prints seal-only output via runPreCheck', async () => {
      const contract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"
assertions:
  - id: A001
    says: "Test passes"
    block: "test"
    target: "result"
    matcher: "truthy"
file_changes:
  - path: src/test.ts
    action: create`;

      await createContractProject({ slug: 'test-slug', contract });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('CONTRACT COMPLIANCE');
      expect(output.stdout).toContain('hash sha256:');
      // No per-assertion output
      expect(output.stdout).not.toContain('COVERED');
      expect(output.stdout).not.toContain('UNCOVERED');
      expect(output.stdout).not.toContain('total');
    });

    it('UNVERIFIABLE message says no saved contract hash', async () => {
      const contract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"
assertions:
  - id: A001
    says: "Test passes"
    block: "test"
    target: "result"
    matcher: "truthy"
file_changes:
  - path: src/test.ts
    action: create`;

      await createContractProject({
        slug: 'test-slug',
        contract,
        saveContract: false,
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('UNVERIFIABLE');
      expect(output.stdout).toContain('no saved contract hash');
    });

    // @ana A020
    it('tag coverage tests are removed — parseDiffAddedCommentLines is not exported', async () => {
      const verifySource = await fs.readFile(
        path.join(originalCwd, 'src', 'commands', 'verify.ts'),
        'utf-8'
      );
      expect(verifySource).not.toContain('parseDiffAddedCommentLines');
    });
  });
});
