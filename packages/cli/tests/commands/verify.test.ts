import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { runPreCheck, runContractPreCheck, parseDiffAddedCommentLines } from '../../src/commands/verify.js';

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

    // @ana A006
    it('old tags from prior features do not produce false covered', async () => {
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

      // Create project on main with an existing tag
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

      // Old feature test with A001 tag — exists on main
      const testDir = path.join(tempDir, 'tests');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'old-feature.test.ts'), '// @ana A001\nold test', 'utf-8');

      const contractContent = await fs.readFile(path.join(planDir, 'contract.yaml'), 'utf-8');
      const hash = `sha256:${createHash('sha256').update(contractContent).digest('hex')}`;
      await fs.writeFile(path.join(planDir, '.saves.json'), JSON.stringify({
        contract: { saved_at: new Date().toISOString(), hash }
      }), 'utf-8');

      execSync('git add -A && git commit -m "init on main"', { cwd: tempDir, stdio: 'ignore' });

      // Feature branch: add a file that does NOT contain A001 tag
      execSync('git checkout -b feature/test-slug', { cwd: tempDir, stdio: 'ignore' });
      await fs.writeFile(path.join(testDir, 'new-feature.test.ts'), '// new tests\ntest()', 'utf-8');
      execSync('git add -A && git commit -m "build: new test"', { cwd: tempDir, stdio: 'ignore' });

      const result = runContractPreCheck('test-slug', tempDir);

      // Old A001 tag on main must NOT produce false COVERED
      expect(result.assertions.find(a => a.id === 'A001')?.status).toBe('UNCOVERED');
    });

    // @ana A007
    it('new tags added on the feature branch are correctly detected', async () => {
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

      // Old tag on main
      const testDir = path.join(tempDir, 'tests');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'old-feature.test.ts'), '// @ana A001\nold test', 'utf-8');

      const contractContent = await fs.readFile(path.join(planDir, 'contract.yaml'), 'utf-8');
      const hash = `sha256:${createHash('sha256').update(contractContent).digest('hex')}`;
      await fs.writeFile(path.join(planDir, '.saves.json'), JSON.stringify({
        contract: { saved_at: new Date().toISOString(), hash }
      }), 'utf-8');

      execSync('git add -A && git commit -m "init on main"', { cwd: tempDir, stdio: 'ignore' });

      // Feature branch: add NEW file with A001 tag
      execSync('git checkout -b feature/test-slug', { cwd: tempDir, stdio: 'ignore' });
      await fs.writeFile(path.join(testDir, 'new-feature.test.ts'), '// @ana A001\nnew test', 'utf-8');
      execSync('git add -A && git commit -m "build: tests with tag"', { cwd: tempDir, stdio: 'ignore' });

      const result = runContractPreCheck('test-slug', tempDir);

      // New tag in added lines should be detected
      expect(result.assertions.find(a => a.id === 'A001')?.status).toBe('COVERED');
    });

    // @ana A008
    it('detects tags in newly created test files (entire file is additions)', async () => {
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

      const contractContent = await fs.readFile(path.join(planDir, 'contract.yaml'), 'utf-8');
      const hash = `sha256:${createHash('sha256').update(contractContent).digest('hex')}`;
      await fs.writeFile(path.join(planDir, '.saves.json'), JSON.stringify({
        contract: { saved_at: new Date().toISOString(), hash }
      }), 'utf-8');

      execSync('git add -A && git commit -m "init on main"', { cwd: tempDir, stdio: 'ignore' });

      // Create brand new test file on feature branch
      execSync('git checkout -b feature/test-slug', { cwd: tempDir, stdio: 'ignore' });
      const testDir = path.join(tempDir, 'tests');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'brand-new.test.ts'), '// @ana A001\ndescribe("new feature", () => {})', 'utf-8');
      execSync('git add -A && git commit -m "build: new test file"', { cwd: tempDir, stdio: 'ignore' });

      const result = runContractPreCheck('test-slug', tempDir);

      expect(result.assertions.find(a => a.id === 'A001')?.status).toBe('COVERED');
    });

    // @ana A010
    it('string literal @ana in test fixture does not match', async () => {
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

      const contractContent = await fs.readFile(path.join(planDir, 'contract.yaml'), 'utf-8');
      const hash = `sha256:${createHash('sha256').update(contractContent).digest('hex')}`;
      await fs.writeFile(path.join(planDir, '.saves.json'), JSON.stringify({
        contract: { saved_at: new Date().toISOString(), hash }
      }), 'utf-8');

      execSync('git add -A && git commit -m "init on main"', { cwd: tempDir, stdio: 'ignore' });

      // Feature branch: add test fixture with @ana inside a string literal
      execSync('git checkout -b feature/test-slug', { cwd: tempDir, stdio: 'ignore' });
      const testDir = path.join(tempDir, 'tests');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'fixture.test.ts'),
        `const fixture = '// @ana A001\\ntest()';\nconst x = 1;`,
        'utf-8'
      );
      execSync('git add -A && git commit -m "build: fixture with string literal"', { cwd: tempDir, stdio: 'ignore' });

      const result = runContractPreCheck('test-slug', tempDir);

      // String literal should NOT count as coverage
      expect(result.assertions.find(a => a.id === 'A001')?.status).toBe('UNCOVERED');
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

    // @ana A009
    it('reports UNCOVERED when no added comment line has the tag', async () => {
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

      const contractContent = await fs.readFile(path.join(planDir, 'contract.yaml'), 'utf-8');
      const hash = `sha256:${createHash('sha256').update(contractContent).digest('hex')}`;
      await fs.writeFile(path.join(planDir, '.saves.json'), JSON.stringify({
        contract: { saved_at: new Date().toISOString(), hash }
      }), 'utf-8');

      execSync('git add -A && git commit -m "init on main"', { cwd: tempDir, stdio: 'ignore' });

      // Feature branch: add code file without any @ana tags
      execSync('git checkout -b feature/test-slug', { cwd: tempDir, stdio: 'ignore' });
      const srcDir = path.join(tempDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'feature.ts'), '// feature implementation\nexport const x = 1;', 'utf-8');
      execSync('git add -A && git commit -m "build: feature code"', { cwd: tempDir, stdio: 'ignore' });

      const result = runContractPreCheck('test-slug', tempDir);

      expect(result.assertions.find(a => a.id === 'A001')?.status).toBe('UNCOVERED');
    });

    // @ana A011
    it('out-of-scope tags are still detected via the global fallback', async () => {
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

      // Out-of-scope test file with A001 tag on main
      const testDir = path.join(tempDir, 'tests');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'old-feature.test.ts'), '// @ana A001\nold test', 'utf-8');

      const contractContent = await fs.readFile(path.join(planDir, 'contract.yaml'), 'utf-8');
      const hash = `sha256:${createHash('sha256').update(contractContent).digest('hex')}`;
      await fs.writeFile(path.join(planDir, '.saves.json'), JSON.stringify({
        contract: { saved_at: new Date().toISOString(), hash }
      }), 'utf-8');

      execSync('git add -A && git commit -m "init on main"', { cwd: tempDir, stdio: 'ignore' });

      // Feature branch: add code (no tags)
      execSync('git checkout -b feature/test-slug', { cwd: tempDir, stdio: 'ignore' });
      const srcDir = path.join(tempDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'feature.ts'), '// feature code\nexport const x = 1;', 'utf-8');
      execSync('git add -A && git commit -m "build: feature"', { cwd: tempDir, stdio: 'ignore' });

      const result = runContractPreCheck('test-slug', tempDir);

      // A001 should be UNCOVERED in scoped search
      expect(result.assertions.find(a => a.id === 'A001')?.status).toBe('UNCOVERED');
      // But out-of-scope should report where the tag actually lives
      expect(result.outOfScope.length).toBeGreaterThan(0);
      expect(result.outOfScope[0]!.id).toBe('A001');
      expect(result.outOfScope[0]!.file).toContain('old-feature.test.ts');
    });
  });

  describe('parseDiffAddedCommentLines', () => {
    // @ana A001, A013
    it('extracts file paths and comment lines from a standard diff', () => {
      const diff = `diff --git a/tests/feature.test.ts b/tests/feature.test.ts
--- /dev/null
+++ b/tests/feature.test.ts
@@ -0,0 +1,3 @@
+// @ana A001
+describe("feature", () => {
+  // test body
`;
      const result = parseDiffAddedCommentLines(diff);

      expect(result.size).toBeGreaterThan(0);
      expect(result.get('tests/feature.test.ts')).toBeDefined();
      const lines = result.get('tests/feature.test.ts')!;
      expect(lines).toContain('// @ana A001');
      expect(lines).toContain('  // test body');
      // Non-comment line should not be included
      expect(lines).not.toContain('describe("feature", () => {');
    });

    // @ana A002
    it('only includes added lines, not context or deleted lines', () => {
      const diff = `diff --git a/tests/feature.test.ts b/tests/feature.test.ts
--- a/tests/feature.test.ts
+++ b/tests/feature.test.ts
@@ -1,2 +1,3 @@
-// old comment
+// @ana A001
+// new comment
`;
      const result = parseDiffAddedCommentLines(diff);
      const lines = result.get('tests/feature.test.ts')!;

      expect(lines).toContain('// @ana A001');
      expect(lines).toContain('// new comment');
      // Deleted line should not be included
      expect(lines).not.toContain('// old comment');
    });

    // @ana A003
    it('ignores deleted lines in diff output', () => {
      const diff = `diff --git a/tests/feature.test.ts b/tests/feature.test.ts
--- a/tests/feature.test.ts
+++ b/tests/feature.test.ts
@@ -1,3 +1,1 @@
-// @ana A001
-// old tag that was removed
-// another deleted line
+// replacement comment
`;
      const result = parseDiffAddedCommentLines(diff);
      const lines = result.get('tests/feature.test.ts')!;

      expect(lines).toEqual(['// replacement comment']);
    });

    // @ana A004
    it('filters to comment lines starting with // or #', () => {
      const diff = `diff --git a/tests/feature.test.ts b/tests/feature.test.ts
--- /dev/null
+++ b/tests/feature.test.ts
@@ -0,0 +1,5 @@
+// @ana A001
+const x = 1;
+# python comment
+  // indented comment
+export function foo() {}
`;
      const result = parseDiffAddedCommentLines(diff);
      const lines = result.get('tests/feature.test.ts')!;

      expect(lines).toContain('// @ana A001');
      expect(lines).toContain('# python comment');
      expect(lines).toContain('  // indented comment');
      expect(lines).not.toContain('const x = 1;');
      expect(lines).not.toContain('export function foo() {}');
    });

    // @ana A005
    it('excludes string literals from tag search', () => {
      const diff = `diff --git a/tests/fixture.test.ts b/tests/fixture.test.ts
--- /dev/null
+++ b/tests/fixture.test.ts
@@ -0,0 +1,3 @@
+const fixture = '// @ana A001\\ntest()';
+const template = \`// @ana A002\`;
+  content: '// @ana A003\\nmore()'
`;
      const result = parseDiffAddedCommentLines(diff);
      const lines = result.get('tests/fixture.test.ts')!;

      // None of these lines start with // or # after trimming — they're code lines
      expect(lines).toHaveLength(0);
    });

    // @ana A014
    it('parses multiple files from one diff output', () => {
      const diff = `diff --git a/tests/a.test.ts b/tests/a.test.ts
--- /dev/null
+++ b/tests/a.test.ts
@@ -0,0 +1,1 @@
+// @ana A001
diff --git a/tests/b.test.ts b/tests/b.test.ts
--- /dev/null
+++ b/tests/b.test.ts
@@ -0,0 +1,1 @@
+// @ana A002
`;
      const result = parseDiffAddedCommentLines(diff);

      expect(result.size).toBe(2);
      expect(result.get('tests/a.test.ts')).toEqual(['// @ana A001']);
      expect(result.get('tests/b.test.ts')).toEqual(['// @ana A002']);
    });

    // @ana A015
    it('skips +++ header lines', () => {
      const diff = `diff --git a/tests/feature.test.ts b/tests/feature.test.ts
--- /dev/null
+++ b/tests/feature.test.ts
@@ -0,0 +1,1 @@
+// actual comment
`;
      const result = parseDiffAddedCommentLines(diff);
      const lines = result.get('tests/feature.test.ts')!;

      // +++ b/tests/feature.test.ts should NOT be included
      expect(lines).toEqual(['// actual comment']);
    });

    // @ana A016
    it('returns empty map for deletion-only diff', () => {
      const diff = `diff --git a/tests/old.test.ts b/tests/old.test.ts
--- a/tests/old.test.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-// @ana A001
-describe("old", () => {});
-// deleted
`;
      const result = parseDiffAddedCommentLines(diff);

      // File appears in map (from diff header) but has no added comment lines
      // The map may have the key with empty array, or size 0 depending on implementation
      const lines = result.get('tests/old.test.ts') ?? [];
      expect(lines).toHaveLength(0);
    });

    // @ana A017
    it('includes Python-style hash comments', () => {
      const diff = `diff --git a/tests/test_feature.py b/tests/test_feature.py
--- /dev/null
+++ b/tests/test_feature.py
@@ -0,0 +1,3 @@
+# @ana A001
+def test_feature():
+    # @ana A002
`;
      const result = parseDiffAddedCommentLines(diff);
      const lines = result.get('tests/test_feature.py')!;

      expect(lines).toContain('# @ana A001');
      expect(lines).toContain('    # @ana A002');
      expect(lines).not.toContain('def test_feature():');
    });

    it('handles empty diff output', () => {
      const result = parseDiffAddedCommentLines('');
      expect(result.size).toBe(0);
    });

    it('handles renamed files using b/ path', () => {
      const diff = `diff --git a/tests/old-name.test.ts b/tests/new-name.test.ts
similarity index 90%
rename from tests/old-name.test.ts
rename to tests/new-name.test.ts
--- a/tests/old-name.test.ts
+++ b/tests/new-name.test.ts
@@ -1,1 +1,2 @@
+// @ana A001
`;
      const result = parseDiffAddedCommentLines(diff);

      // Should use the b/ path (destination/new name)
      expect(result.has('tests/new-name.test.ts')).toBe(true);
      expect(result.get('tests/new-name.test.ts')).toContain('// @ana A001');
    });

    it('ignores hunk header lines', () => {
      const diff = `diff --git a/tests/feature.test.ts b/tests/feature.test.ts
--- a/tests/feature.test.ts
+++ b/tests/feature.test.ts
@@ -10,0 +11,2 @@
+// @ana A001
+// test
`;
      const result = parseDiffAddedCommentLines(diff);
      const lines = result.get('tests/feature.test.ts')!;

      // @@ lines should not be included
      expect(lines).toEqual(['// @ana A001', '// test']);
    });
  });

  describe('parseDiffAddedCommentLines integration with runContractPreCheck', () => {
    // @ana A012
    it('falls back to global search when merge-base fails', async () => {
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

      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

      const anaDir = path.join(tempDir, '.ana');
      const planDir = path.join(anaDir, 'plans', 'active', 'test-slug');
      await fs.mkdir(planDir, { recursive: true });
      await fs.writeFile(path.join(planDir, 'contract.yaml'), contract, 'utf-8');
      // No ana.json — readArtifactBranch will fail

      const testDir = path.join(tempDir, 'tests');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'test.test.ts'), '// @ana A001\ntest()', 'utf-8');

      const contractContent = await fs.readFile(path.join(planDir, 'contract.yaml'), 'utf-8');
      const hash = `sha256:${createHash('sha256').update(contractContent).digest('hex')}`;
      await fs.writeFile(path.join(planDir, '.saves.json'), JSON.stringify({
        contract: { saved_at: new Date().toISOString(), hash }
      }), 'utf-8');

      execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });

      const result = runContractPreCheck('test-slug', tempDir);

      // Global fallback reads full file content, so it finds the tag
      expect(result.assertions.find(a => a.id === 'A001')?.status).toBe('COVERED');
    });
  });
});
