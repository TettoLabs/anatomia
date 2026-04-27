import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { runPreCheck, runContractPreCheck } from '../../src/commands/verify.js';

/**
 * Tests for `ana verify pre-check` command
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
      // Create minimal project with ana.json
      const anaDir = path.join(tempDir, '.ana');
      await fs.mkdir(anaDir, { recursive: true });
      await fs.writeFile(
        path.join(anaDir, 'ana.json'),
        JSON.stringify({ artifactBranch: 'main' }),
        'utf-8'
      );

      const output = captureOutput(() => runPreCheck('nonexistent'));

      expect(output.stderr).toContain('No active work found');
    });
  });

  describe('contract mode (S8+)', () => {
    /**
     * Helper to create a contract mode test project
     */
    async function createContractProject(options: {
      slug: string;
      contract: string;
      testFiles?: Array<{ path: string; content: string }>;
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

      // Create test files
      if (options.testFiles) {
        for (const testFile of options.testFiles) {
          const fullPath = path.join(tempDir, testFile.path);
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, testFile.content, 'utf-8');
        }
      }
    }

    // @ana A001
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

      await createContractProject({
        slug: 'test-slug',
        contract,
        testFiles: [{ path: 'tests/test.test.ts', content: '// @ana A001\ntest()' }],
      });

      const result = runContractPreCheck('test-slug', tempDir);
      expect(result.seal).toBe('INTACT');
    });

    // @ana A002
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

      await createContractProject({
        slug: 'test-slug',
        contract,
      });

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

    it('reports COVERED for tagged assertions', async () => {
      const contract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"
assertions:
  - id: A001
    says: "First assertion"
    block: "test"
    target: "result"
    matcher: "truthy"
  - id: A002
    says: "Second assertion"
    block: "test"
    target: "result"
    matcher: "truthy"
file_changes:
  - path: src/test.ts
    action: create`;

      await createContractProject({
        slug: 'test-slug',
        contract,
        testFiles: [
          { path: 'tests/test.test.ts', content: '// @ana A001\n// @ana A002\ntest()' },
        ],
      });

      const result = runContractPreCheck('test-slug', tempDir);
      expect(result.assertions.find(a => a.id === 'A001')?.status).toBe('COVERED');
      expect(result.assertions.find(a => a.id === 'A002')?.status).toBe('COVERED');
    });

    it('reports UNCOVERED for untagged assertions', async () => {
      const contract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"
assertions:
  - id: A001
    says: "First assertion"
    block: "test"
    target: "result"
    matcher: "truthy"
  - id: A002
    says: "Second assertion"
    block: "test"
    target: "result"
    matcher: "truthy"
file_changes:
  - path: src/test.ts
    action: create`;

      await createContractProject({
        slug: 'test-slug',
        contract,
        testFiles: [
          { path: 'tests/test.test.ts', content: '// @ana A001\ntest()' },
        ],
      });

      const result = runContractPreCheck('test-slug', tempDir);
      expect(result.assertions.find(a => a.id === 'A001')?.status).toBe('COVERED');
      expect(result.assertions.find(a => a.id === 'A002')?.status).toBe('UNCOVERED');
      expect(result.summary.uncovered).toBe(1);
    });

    it('handles multi-ID tags', async () => {
      const contract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"
assertions:
  - id: A001
    says: "First assertion"
    block: "test"
    target: "result"
    matcher: "truthy"
  - id: A002
    says: "Second assertion"
    block: "test"
    target: "result"
    matcher: "truthy"
file_changes:
  - path: src/test.ts
    action: create`;

      await createContractProject({
        slug: 'test-slug',
        contract,
        testFiles: [
          { path: 'tests/test.test.ts', content: '// @ana A001, A002\ntest()' },
        ],
      });

      const result = runContractPreCheck('test-slug', tempDir);
      expect(result.assertions.find(a => a.id === 'A001')?.status).toBe('COVERED');
      expect(result.assertions.find(a => a.id === 'A002')?.status).toBe('COVERED');
    });

    it('includes says fields in output', async () => {
      const contract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"
assertions:
  - id: A001
    says: "Creating a payment returns success"
    block: "test"
    target: "result"
    matcher: "truthy"
file_changes:
  - path: src/test.ts
    action: create`;

      await createContractProject({
        slug: 'test-slug',
        contract,
      });

      const result = runContractPreCheck('test-slug', tempDir);
      expect(result.assertions[0]!.says).toBe('Creating a payment returns success');
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

    // @ana A010
    it('prints formatted output via runPreCheck', async () => {
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
        testFiles: [{ path: 'tests/test.test.ts', content: '// @ana A001\ntest()' }],
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('CONTRACT COMPLIANCE');
      expect(output.stdout).toContain('A001');
      expect(output.stdout).toContain('COVERED');
      expect(output.stdout).toContain('Test passes');
      expect(output.stdout).toContain('hash sha256:');
    });

    // @ana A011
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
  });

  describe('scoped tag search (merge-base)', () => {
    // @ana A004
    it('scopes search to files changed since merge-base', async () => {
      const contract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"
assertions:
  - id: A001
    says: "Feature assertion"
    block: "test"
    target: "result"
    matcher: "truthy"
file_changes:
  - path: src/feature.ts
    action: create`;

      // Create project on main (artifact branch)
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

      const anaDir = path.join(tempDir, '.ana');
      const planDir = path.join(anaDir, 'plans', 'active', 'test-slug');
      await fs.mkdir(planDir, { recursive: true });
      await fs.writeFile(path.join(planDir, 'contract.yaml'), contract, 'utf-8');
      await fs.writeFile(
        path.join(anaDir, 'ana.json'),
        JSON.stringify({ artifactBranch: 'main' }),
        'utf-8'
      );

      // Write a "previous feature" test with A001 tag (collision source)
      const oldTestDir = path.join(tempDir, 'tests');
      await fs.mkdir(oldTestDir, { recursive: true });
      await fs.writeFile(path.join(oldTestDir, 'old-feature.test.ts'), '// @ana A001\nold test', 'utf-8');

      // Compute real hash for the contract
      const contractContent = await fs.readFile(path.join(planDir, 'contract.yaml'), 'utf-8');
      const hash = `sha256:${createHash('sha256').update(contractContent).digest('hex')}`;
      await fs.writeFile(path.join(planDir, '.saves.json'), JSON.stringify({
        contract: { saved_at: new Date().toISOString(), hash }
      }), 'utf-8');

      execSync('git add -A && git commit -m "init on main"', { cwd: tempDir, stdio: 'ignore' });

      // Create feature branch and add a new test file (WITHOUT A001 tag)
      execSync('git checkout -b feature/test-slug', { cwd: tempDir, stdio: 'ignore' });
      await fs.writeFile(path.join(oldTestDir, 'new-feature.test.ts'), '// no tags here\nnew test', 'utf-8');
      execSync('git add -A && git commit -m "build: new test file"', { cwd: tempDir, stdio: 'ignore' });

      const result = runContractPreCheck('test-slug', tempDir);

      // A001 should be UNCOVERED because the scoped search only looks at
      // files changed since merge-base (new-feature.test.ts), not old-feature.test.ts
      expect(result.assertions.find(a => a.id === 'A001')?.status).toBe('UNCOVERED');

      // out-of-scope warning should flag where the tag actually lives
      expect(result.outOfScope).toHaveLength(1);
      expect(result.outOfScope[0]!.id).toBe('A001');
      expect(result.outOfScope[0]!.file).toContain('old-feature.test.ts');
    });

    // @ana A012
    it('finds tags in files changed after merge-base', async () => {
      const contract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"
assertions:
  - id: A001
    says: "Feature assertion"
    block: "test"
    target: "result"
    matcher: "truthy"
file_changes:
  - path: src/feature.ts
    action: create`;

      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

      const anaDir = path.join(tempDir, '.ana');
      const planDir = path.join(anaDir, 'plans', 'active', 'test-slug');
      await fs.mkdir(planDir, { recursive: true });
      await fs.writeFile(path.join(planDir, 'contract.yaml'), contract, 'utf-8');
      await fs.writeFile(
        path.join(anaDir, 'ana.json'),
        JSON.stringify({ artifactBranch: 'main' }),
        'utf-8'
      );

      // Compute real hash for the contract
      const contractContent = await fs.readFile(path.join(planDir, 'contract.yaml'), 'utf-8');
      const hash = `sha256:${createHash('sha256').update(contractContent).digest('hex')}`;
      await fs.writeFile(path.join(planDir, '.saves.json'), JSON.stringify({
        contract: { saved_at: new Date().toISOString(), hash }
      }), 'utf-8');

      execSync('git add -A && git commit -m "init on main"', { cwd: tempDir, stdio: 'ignore' });

      // Create feature branch, add test file with tag, and commit
      execSync('git checkout -b feature/test-slug', { cwd: tempDir, stdio: 'ignore' });
      const testDir = path.join(tempDir, 'tests');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'feature.test.ts'), '// @ana A001\ntest()', 'utf-8');
      execSync('git add -A && git commit -m "build: tests"', { cwd: tempDir, stdio: 'ignore' });

      const result = runContractPreCheck('test-slug', tempDir);

      expect(result.assertions.find(a => a.id === 'A001')?.status).toBe('COVERED');
      expect(result.outOfScope).toHaveLength(0);
    });

    // @ana A005
    it('falls back to global search when merge-base unavailable', async () => {
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

      // Create project — no artifact branch configured, so merge-base will fail
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

      const anaDir = path.join(tempDir, '.ana');
      const planDir = path.join(anaDir, 'plans', 'active', 'test-slug');
      await fs.mkdir(planDir, { recursive: true });
      await fs.writeFile(path.join(planDir, 'contract.yaml'), contract, 'utf-8');
      // No ana.json — readArtifactBranch will fail, triggering fallback

      const testDir = path.join(tempDir, 'tests');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'test.test.ts'), '// @ana A001\ntest()', 'utf-8');

      // Compute real hash for the contract
      const contractContent = await fs.readFile(path.join(planDir, 'contract.yaml'), 'utf-8');
      const hash = `sha256:${createHash('sha256').update(contractContent).digest('hex')}`;
      await fs.writeFile(path.join(planDir, '.saves.json'), JSON.stringify({
        contract: { saved_at: new Date().toISOString(), hash }
      }), 'utf-8');

      execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });

      const result = runContractPreCheck('test-slug', tempDir);

      // Global fallback should still find the tag
      expect(result.assertions.find(a => a.id === 'A001')?.status).toBe('COVERED');
    });
  });
});
