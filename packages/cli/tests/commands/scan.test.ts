/**
 * Tests for ana scan command
 *
 * Uses temp directories for isolation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { countFiles, formatNumber } from '../../src/utils/fileCounts.js';
import {
  getLanguageDisplayName,
  getFrameworkDisplayName,
  getPatternDisplayName,
} from '../../src/commands/scan.js';

describe('ana scan', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scan-test-'));
    originalCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to run ana scan command
   */
  function runScan(args: string[] = []): { stdout: string; stderr: string; exitCode: number } {
    const cliPath = path.join(__dirname, '../../dist/index.js');
    try {
      const stdout = execSync(`node ${cliPath} scan ${args.join(' ')}`, {
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
   * Helper to create test project files
   */
  async function createTestFiles(files: Record<string, string>): Promise<void> {
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(tempDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
    }
  }

  describe('command invocation', () => {
    // AC1: ana scan runs on cwd, ana scan <path> runs on specified path
    it('scans current directory when no path provided', async () => {
      await createTestFiles({
        'package.json': '{"name":"test","version":"1.0.0"}',
        'index.ts': 'export const foo = 1;',
        'utils.ts': 'export const bar = 2;',
      });
      process.chdir(tempDir);

      const { stdout, exitCode } = runScan();
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/Source\s+2/);
      expect(stdout).toMatch(/Config\s+1/);
      expect(stdout).toMatch(/Total\s+3/);
    });

    it('scans specified path when path argument provided', async () => {
      await createTestFiles({
        'package.json': '{"name":"test","version":"1.0.0"}',
        'index.ts': 'export const foo = 1;',
        'utils.ts': 'export const bar = 2;',
        'helper.ts': 'export const baz = 3;',
      });

      const { stdout, exitCode } = runScan([tempDir]);
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/Source\s+3/);
    });

    it('shows helpful error for nonexistent path', async () => {
      const { stderr, exitCode } = runScan(['/nonexistent/path/abc123']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toMatch(/not found|does not exist|No such/i);
    });
  });

  describe('no .ana/ required (AC2)', () => {
    it('works on project without .ana/ directory', async () => {
      await createTestFiles({
        'package.json': '{"name":"test","version":"1.0.0"}',
      });

      const { stdout, exitCode } = runScan([tempDir]);
      expect(stdout).toMatch(/Language\s+Node\.js/);
      expect(stdout).toMatch(/Config\s+1/);
      expect(exitCode).toBe(0);
    });
  });

  describe('JSON output (AC3)', () => {
    it('produces valid JSON with --json flag', async () => {
      await createTestFiles({
        'package.json': '{"name":"test","version":"1.0.0"}',
      });

      const { stdout, exitCode } = runScan([tempDir, '--json']);
      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json).toHaveProperty('project');
      expect(json).toHaveProperty('scannedAt');
      expect(json).toHaveProperty('stack');
      expect(json).toHaveProperty('files');
      expect(json).toHaveProperty('structure');
    });

    it('JSON stack contains detected categories only', async () => {
      await createTestFiles({
        'package.json': '{"name":"test","version":"1.0.0"}',
      });

      const { stdout } = runScan([tempDir, '--json']);
      const json = JSON.parse(stdout);
      expect(json.stack).toHaveProperty('language');
      expect(json.stack).not.toHaveProperty('auth');
    });

    it('JSON files contains all count fields', async () => {
      await createTestFiles({
        'package.json': '{"name":"test","version":"1.0.0"}',
        'index.ts': 'export const x = 1;',
        'foo.test.ts': 'test("foo", () => {});',
      });

      const { stdout } = runScan([tempDir, '--json']);
      const json = JSON.parse(stdout);
      expect(json.files).toHaveProperty('source');
      expect(json.files).toHaveProperty('test');
      expect(json.files).toHaveProperty('config');
      expect(json.files).toHaveProperty('total');
      expect(typeof json.files.source).toBe('number');
    });

    it('JSON structure is array of path/purpose objects', async () => {
      await createTestFiles({
        'package.json': '{"name":"test","version":"1.0.0"}',
        'src/index.ts': 'export const x = 1;',
        'tests/foo.test.ts': 'test("foo", () => {});',
      });

      const { stdout } = runScan([tempDir, '--json']);
      const json = JSON.parse(stdout);
      expect(Array.isArray(json.structure)).toBe(true);
      if (json.structure.length > 0) {
        expect(json.structure[0]).toHaveProperty('path');
        expect(json.structure[0]).toHaveProperty('purpose');
      }
    });
  });

  describe('read-only operation (AC5)', () => {
    it('creates no files during scan', async () => {
      await createTestFiles({
        'package.json': '{"name":"test","version":"1.0.0"}',
      });

      const filesBefore = await fs.readdir(tempDir, { recursive: true });
      runScan([tempDir]);
      const filesAfter = await fs.readdir(tempDir, { recursive: true });
      expect(filesAfter.sort()).toEqual(filesBefore.sort());
    });
  });

  describe('stack detection (AC6, AC7)', () => {
    it('displays Language when detected', async () => {
      await createTestFiles({
        'package.json': '{"name":"test","version":"1.0.0"}',
      });

      const { stdout } = runScan([tempDir]);
      expect(stdout).toMatch(/Language\s+Node\.js/);
    });

    it('displays Framework when detected', async () => {
      await createTestFiles({
        'package.json': JSON.stringify({
          name: 'test',
          version: '1.0.0',
          dependencies: { next: '14.0.0' },
        }),
      });

      const { stdout } = runScan([tempDir]);
      expect(stdout).toMatch(/Framework\s+Next\.js/);
    });

    it('omits Framework line entirely when not detected', async () => {
      await createTestFiles({
        'package.json': '{"name":"test","version":"1.0.0"}',
      });

      const { stdout } = runScan([tempDir]);
      expect(stdout).not.toMatch(/Framework/);
    });

    it('omits Database line entirely when not detected', async () => {
      await createTestFiles({
        'package.json': '{"name":"test","version":"1.0.0"}',
      });

      const { stdout } = runScan([tempDir]);
      expect(stdout).not.toMatch(/Database/);
    });

    it('omits Auth line entirely when not detected', async () => {
      await createTestFiles({
        'package.json': '{"name":"test","version":"1.0.0"}',
      });

      const { stdout } = runScan([tempDir]);
      expect(stdout).not.toMatch(/Auth/);
    });

    it('displays Testing when test framework detected', async () => {
      await createTestFiles({
        'package.json': JSON.stringify({
          name: 'test',
          version: '1.0.0',
          devDependencies: { vitest: '2.0.0' },
        }),
        'foo.test.ts': 'import { test } from "vitest"; test("x", () => {});',
      });

      const { stdout } = runScan([tempDir]);
      expect(stdout).toMatch(/Testing\s+Vitest/);
    });
  });

  describe('file counts (AC8)', () => {
    it('shows source file count', async () => {
      await createTestFiles({
        'package.json': '{}',
        'index.ts': 'export const a = 1;',
        'utils.ts': 'export const b = 2;',
        'helper.ts': 'export const c = 3;',
      });

      const { stdout } = runScan([tempDir]);
      expect(stdout).toMatch(/Source\s+3/);
    });

    it('shows test file count', async () => {
      await createTestFiles({
        'package.json': '{}',
        'foo.test.ts': 'test("a", () => {});',
        'bar.test.ts': 'test("b", () => {});',
      });

      const { stdout } = runScan([tempDir]);
      expect(stdout).toMatch(/Tests\s+2/);
    });

    it('shows config file count', async () => {
      await createTestFiles({
        'package.json': '{}',
        'tsconfig.json': '{}',
      });

      const { stdout } = runScan([tempDir]);
      expect(stdout).toMatch(/Config\s+2/);
    });

    it('shows total file count', async () => {
      await createTestFiles({
        'package.json': '{}',
        'tsconfig.json': '{}',
        'index.ts': 'export const a = 1;',
        'utils.ts': 'export const b = 2;',
        'helper.ts': 'export const c = 3;',
        'foo.test.ts': 'test("a", () => {});',
        'bar.test.ts': 'test("b", () => {});',
      });

      const { stdout } = runScan([tempDir]);
      // 3 source + 2 test + 2 config = 7 total
      expect(stdout).toMatch(/Total\s+7/);
    });

    it('formats large numbers with commas', () => {
      expect(formatNumber(1026)).toBe('1,026');
      expect(formatNumber(999)).toBe('999');
      expect(formatNumber(10000)).toBe('10,000');
    });
  });

  describe('structure map (AC9, AC10)', () => {
    it('shows directories with purposes', async () => {
      await createTestFiles({
        'package.json': '{}',
        'src/index.ts': 'export const x = 1;',
        'tests/foo.test.ts': 'test("foo", () => {});',
      });

      const { stdout } = runScan([tempDir]);
      expect(stdout).toMatch(/src\/\s+Source code/);
      expect(stdout).toMatch(/tests\/\s+Tests/);
    });

    it('shows all directories when 9 present (below cap)', async () => {
      // Use only directories recognized by the analyzer's DIRECTORY_PURPOSES map
      const dirs = ['src', 'lib', 'tests', 'docs', 'scripts', 'config', 'assets', 'public', 'utils'];
      const files: Record<string, string> = { 'package.json': '{}' };
      for (const dir of dirs) {
        files[`${dir}/.gitkeep`] = '';
      }
      await createTestFiles(files);

      const { stdout } = runScan([tempDir]);
      const structureSection = stdout.split('Structure')[1]?.split('Run')[0] || '';
      const directoryLines = structureSection.split('\n').filter((line) => line.includes('/'));
      expect(directoryLines.length).toBe(9);
      expect(stdout).not.toContain('more directories');
    });

    it('shows all directories when exactly 10 present (at cap)', async () => {
      // Use only directories recognized by the analyzer's DIRECTORY_PURPOSES map
      const dirs = ['src', 'lib', 'tests', 'docs', 'scripts', 'config', 'assets', 'public', 'utils', 'tools'];
      const files: Record<string, string> = { 'package.json': '{}' };
      for (const dir of dirs) {
        files[`${dir}/.gitkeep`] = '';
      }
      await createTestFiles(files);

      const { stdout } = runScan([tempDir]);
      const structureSection = stdout.split('Structure')[1]?.split('Run')[0] || '';
      const directoryLines = structureSection.split('\n').filter((line) => line.includes('/'));
      expect(directoryLines.length).toBe(10);
      expect(stdout).not.toContain('more directories');
    });

    it('shows 10 directories plus overflow when 11 present', async () => {
      // Use only directories recognized by the analyzer's DIRECTORY_PURPOSES map
      const dirs = [
        'src',
        'lib',
        'tests',
        'docs',
        'scripts',
        'config',
        'assets',
        'public',
        'utils',
        'tools',
        'components', // 11th - recognized by analyzer
      ];
      const files: Record<string, string> = { 'package.json': '{}' };
      for (const dir of dirs) {
        files[`${dir}/.gitkeep`] = '';
      }
      await createTestFiles(files);

      const { stdout } = runScan([tempDir]);
      const structureSection = stdout.split('Structure')[1]?.split('Run')[0] || '';
      const directoryLines = structureSection.split('\n').filter((line) => line.includes('/'));
      expect(directoryLines.length).toBe(10);
      expect(stdout).toContain('+1 more directories');
    });
  });

  describe('footer CTA (AC11)', () => {
    it('displays init prompt in footer', async () => {
      await createTestFiles({
        'package.json': '{}',
      });

      const { stdout } = runScan([tempDir]);
      expect(stdout).toContain('Run `ana init` to generate full context for your AI.');
    });
  });

  describe('--save flag', () => {
    it('writes scan.json with --save flag', async () => {
      await createTestFiles({
        'package.json': '{"name":"test"}',
        'index.ts': 'export const x = 1;',
      });

      const { stdout, exitCode } = runScan([tempDir, '--save']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Scan saved to .ana/scan.json');

      // Verify file exists and contains valid JSON
      const scanJsonPath = path.join(tempDir, '.ana', 'scan.json');
      expect(fsSync.existsSync(scanJsonPath)).toBe(true);

      const scanContent = JSON.parse(await fs.readFile(scanJsonPath, 'utf-8'));
      expect(scanContent.project).toBeDefined();
      expect(scanContent.stack).toBeDefined();
      expect(scanContent.files).toBeDefined();
      expect(scanContent.structure).toBeDefined();
    });

    it('does not write scan.json without --save flag', async () => {
      await createTestFiles({
        'package.json': '{"name":"test"}',
        'index.ts': 'export const x = 1;',
      });

      const { exitCode } = runScan([tempDir]);
      expect(exitCode).toBe(0);

      // Verify file does NOT exist
      const scanJsonPath = path.join(tempDir, '.ana', 'scan.json');
      expect(fsSync.existsSync(scanJsonPath)).toBe(false);
    });

    it('creates .ana directory if it does not exist', async () => {
      await createTestFiles({
        'package.json': '{"name":"test"}',
      });

      // Verify .ana doesn't exist yet
      const anaDir = path.join(tempDir, '.ana');
      expect(fsSync.existsSync(anaDir)).toBe(false);

      const { exitCode } = runScan([tempDir, '--save']);
      expect(exitCode).toBe(0);

      // Verify .ana was created and scan.json written
      expect(fsSync.existsSync(anaDir)).toBe(true);
      expect(fsSync.existsSync(path.join(anaDir, 'scan.json'))).toBe(true);
    });
  });

  describe('edge cases (AC14, AC15)', () => {
    it('handles empty directory gracefully', async () => {
      // tempDir is already empty

      const { stdout, exitCode } = runScan([tempDir]);
      expect(stdout).toMatch(/No code detected/);
      expect(stdout).toMatch(/Source\s+0/);
      expect(stdout).toMatch(/Tests\s+0/);
      expect(stdout).toMatch(/Config\s+0/);
      expect(stdout).toMatch(/Total\s+0/);
      expect(stdout).toMatch(/\(empty\)/);
      expect(exitCode).toBe(0);
    });

    it('handles non-code project gracefully', async () => {
      await createTestFiles({
        'README.md': '# Project',
        'images/logo.png': 'fake-image-data',
      });

      const { stdout, exitCode } = runScan([tempDir]);
      expect(stdout).toMatch(/No code detected/);
      expect(stdout).toMatch(/Source\s+0/);
      expect(exitCode).toBe(0);
    });

    it('handles permission denied gracefully', async () => {
      // Skip on Windows where chmod doesn't work the same way
      if (process.platform === 'win32') {
        return;
      }

      await createTestFiles({
        'package.json': '{}',
        'index.ts': 'export const x = 1;',
        'secret.ts': 'export const secret = "hidden";',
      });

      // Make one file unreadable
      await fs.chmod(path.join(tempDir, 'secret.ts'), 0o000);

      const { stdout, exitCode } = runScan([tempDir]);
      // Glob counts files without reading them, so both are counted
      // The important thing is that the scan completes without crashing
      expect(stdout).toMatch(/Source\s+2/);
      expect(exitCode).toBe(0);

      // Restore permissions for cleanup
      await fs.chmod(path.join(tempDir, 'secret.ts'), 0o644);
    });
  });
});

describe('countFiles utility', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'countfiles-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create test files
   */
  async function createFiles(files: string[]): Promise<void> {
    for (const file of files) {
      const fullPath = path.join(tempDir, file);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, '// content');
    }
  }

  describe('source file counting', () => {
    it('counts .ts files as source', async () => {
      await createFiles(['a.ts', 'b.ts', 'c.ts']);
      const result = await countFiles(tempDir);
      expect(result.source).toBe(3);
    });

    it('counts .tsx files as source', async () => {
      await createFiles(['a.tsx', 'b.tsx']);
      const result = await countFiles(tempDir);
      expect(result.source).toBe(2);
    });

    it('counts .py files as source', async () => {
      await createFiles(['a.py', 'b.py', 'c.py', 'd.py']);
      const result = await countFiles(tempDir);
      expect(result.source).toBe(4);
    });

    it('counts multiple languages', async () => {
      await createFiles(['a.ts', 'b.ts', 'c.py', 'd.py', 'e.go']);
      const result = await countFiles(tempDir);
      expect(result.source).toBe(5);
    });

    it('excludes test files from source count', async () => {
      await createFiles(['foo.ts', 'foo.test.ts']);
      const result = await countFiles(tempDir);
      expect(result.source).toBe(1);
    });
  });

  describe('test file counting', () => {
    it('counts *.test.ts files', async () => {
      await createFiles(['foo.test.ts', 'bar.test.ts']);
      const result = await countFiles(tempDir);
      expect(result.test).toBe(2);
    });

    it('counts *.spec.ts files', async () => {
      await createFiles(['foo.spec.ts']);
      const result = await countFiles(tempDir);
      expect(result.test).toBe(1);
    });

    it('counts files in tests/ directory', async () => {
      await createFiles(['tests/helper.ts']);
      const result = await countFiles(tempDir);
      expect(result.test).toBe(1);
    });

    it('counts files in __tests__/ directory', async () => {
      await createFiles(['__tests__/utils.ts']);
      const result = await countFiles(tempDir);
      expect(result.test).toBe(1);
    });

    it('counts test_*.py files', async () => {
      await createFiles(['test_utils.py']);
      const result = await countFiles(tempDir);
      expect(result.test).toBe(1);
    });
  });

  describe('config file counting', () => {
    it('counts package.json as config', async () => {
      await createFiles(['package.json']);
      const result = await countFiles(tempDir);
      expect(result.config).toBe(1);
    });

    it('counts tsconfig.json as config', async () => {
      await createFiles(['tsconfig.json']);
      const result = await countFiles(tempDir);
      expect(result.config).toBe(1);
    });

    it('counts multiple config files', async () => {
      await createFiles(['package.json', 'tsconfig.json', '.eslintrc.js']);
      const result = await countFiles(tempDir);
      expect(result.config).toBe(3);
    });

    it('counts .env files as config', async () => {
      await createFiles(['.env', '.env.local']);
      const result = await countFiles(tempDir);
      expect(result.config).toBe(2);
    });
  });

  describe('total calculation', () => {
    it('total equals source + test + config', async () => {
      await createFiles([
        'src/a.ts',
        'src/b.ts',
        'src/c.ts',
        'foo.test.ts',
        'bar.test.ts',
        'package.json',
      ]);
      const result = await countFiles(tempDir);
      expect(result.source).toBe(3);
      expect(result.test).toBe(2);
      expect(result.config).toBe(1);
      expect(result.total).toBe(6);
    });

    it('returns zero counts for empty directory', async () => {
      const result = await countFiles(tempDir);
      expect(result.source).toBe(0);
      expect(result.test).toBe(0);
      expect(result.config).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('directory exclusions', () => {
    it('excludes node_modules from all counts', async () => {
      await createFiles(['src/index.ts', 'node_modules/lodash/index.js']);
      const result = await countFiles(tempDir);
      expect(result.source).toBe(1);
    });

    it('excludes .git from all counts', async () => {
      await createFiles(['src/index.ts', '.git/objects/abc123']);
      const result = await countFiles(tempDir);
      expect(result.source).toBe(1);
    });

    it('excludes dist from all counts', async () => {
      await createFiles(['src/index.ts', 'dist/index.js']);
      const result = await countFiles(tempDir);
      expect(result.source).toBe(1);
    });

    it('excludes vendor from all counts', async () => {
      await createFiles(['src/main.go', 'vendor/github.com/pkg/errors/errors.go']);
      const result = await countFiles(tempDir);
      expect(result.source).toBe(1);
    });
  });

  describe('recursive counting', () => {
    it('counts nested source files', async () => {
      await createFiles([
        'src/index.ts',
        'src/utils/helper.ts',
        'src/utils/deep/nested.ts',
      ]);
      const result = await countFiles(tempDir);
      expect(result.source).toBe(3);
    });

    it('counts nested test files', async () => {
      await createFiles([
        'tests/unit/foo.test.ts',
        'tests/integration/bar.test.ts',
      ]);
      const result = await countFiles(tempDir);
      expect(result.test).toBe(2);
    });

    it('counts config files in subdirectories', async () => {
      await createFiles([
        'package.json',
        'packages/cli/package.json',
        'packages/analyzer/tsconfig.json',
      ]);
      const result = await countFiles(tempDir);
      expect(result.config).toBe(3);
    });
  });
});

describe('analyzer graceful degradation', () => {
  // These tests verify the analyzer preserves partial results when tree-sitter fails
  // Note: Actually triggering tree-sitter failure is difficult in tests,
  // so we test the structure by verifying the analyzer returns partial results

  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'analyzer-degradation-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function createTestFiles(files: Record<string, string>): Promise<void> {
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(tempDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
    }
  }

  it('returns projectType when analyzing basic project', async () => {
    await createTestFiles({
      'package.json': '{"name":"test","version":"1.0.0"}',
    });

    const { analyze } = await import('anatomia-analyzer');
    const result = await analyze(tempDir, { skipPatterns: false });
    expect(result.projectType).not.toBe('unknown');
  });

  it('returns framework when detected', async () => {
    await createTestFiles({
      'package.json': JSON.stringify({
        name: 'test',
        dependencies: { next: '14.0.0' },
      }),
    });

    const { analyze } = await import('anatomia-analyzer');
    const result = await analyze(tempDir);
    expect(result.framework).toBe('nextjs');
  });

  it('returns structure when analyzing project with directories', async () => {
    await createTestFiles({
      'package.json': '{}',
      'src/index.ts': 'export const x = 1;',
      'tests/foo.test.ts': 'test("x", () => {});',
    });

    const { analyze } = await import('anatomia-analyzer');
    const result = await analyze(tempDir);
    expect(result.structure).toBeDefined();
    expect(result.structure?.directories).toBeDefined();
  });

  it('patterns may be undefined when no dependencies detected', async () => {
    await createTestFiles({
      'package.json': '{"name":"test","version":"1.0.0"}',
    });

    const { analyze } = await import('anatomia-analyzer');
    const result = await analyze(tempDir);
    // Patterns may be undefined if no patterns detected
    // This is acceptable behavior
    expect(result.projectType).toBeDefined();
  });
});

describe('ana scan', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scan-test-fallback-'));
    originalCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  function runScan(args: string[] = []): { stdout: string; stderr: string; exitCode: number } {
    const cliPath = path.join(__dirname, '../../dist/index.js');
    try {
      const stdout = execSync(`node ${cliPath} scan ${args.join(' ')}`, {
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

  async function createTestFiles(files: Record<string, string>): Promise<void> {
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(tempDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
    }
  }

  describe('dependency-file fallback detection', () => {
    it('detects Supabase from @supabase/supabase-js', async () => {
      await createTestFiles({
        'package.json': JSON.stringify({
          name: 'test',
          dependencies: { '@supabase/supabase-js': '2.0.0' },
        }),
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout } = runScan();
      expect(stdout).toMatch(/Database\s+Supabase/);
    });

    it('detects Clerk from @clerk/nextjs', async () => {
      await createTestFiles({
        'package.json': JSON.stringify({
          name: 'test',
          dependencies: { '@clerk/nextjs': '4.0.0' },
        }),
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout } = runScan();
      expect(stdout).toMatch(/Auth\s+Clerk/);
    });

    it('detects Vitest from devDependencies', async () => {
      await createTestFiles({
        'package.json': JSON.stringify({
          name: 'test',
          devDependencies: { vitest: '2.0.0' },
        }),
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout } = runScan();
      expect(stdout).toMatch(/Testing\s+Vitest/);
    });

    it('detects Stripe as Payments category', async () => {
      await createTestFiles({
        'package.json': JSON.stringify({
          name: 'test',
          dependencies: { stripe: '16.0.0' },
        }),
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout } = runScan();
      expect(stdout).toMatch(/Payments\s+Stripe/);
    });

    it('detects both Database and Auth from Supabase packages', async () => {
      await createTestFiles({
        'package.json': JSON.stringify({
          name: 'test',
          dependencies: {
            '@supabase/supabase-js': '2.0.0',
            '@supabase/ssr': '0.5.0',
          },
        }),
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout } = runScan();
      expect(stdout).toMatch(/Database\s+Supabase/);
      expect(stdout).toMatch(/Auth\s+Supabase Auth/);
    });

    it('detects NextAuth', async () => {
      await createTestFiles({
        'package.json': JSON.stringify({
          name: 'test',
          dependencies: { 'next-auth': '4.0.0' },
        }),
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout } = runScan();
      expect(stdout).toMatch(/Auth\s+NextAuth/);
    });

    it('detects Prisma', async () => {
      await createTestFiles({
        'package.json': JSON.stringify({
          name: 'test',
          dependencies: { prisma: '5.0.0' },
        }),
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout } = runScan();
      expect(stdout).toMatch(/Database\s+Prisma/);
    });

    it('handles no relevant deps gracefully', async () => {
      await createTestFiles({
        'package.json': JSON.stringify({
          name: 'test',
          dependencies: { lodash: '4.0.0' },
        }),
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout } = runScan();
      expect(stdout).not.toMatch(/Database/);
      expect(stdout).not.toMatch(/Auth/);
      expect(stdout).not.toMatch(/Payments/);
    });

    it('handles empty package.json gracefully', async () => {
      await createTestFiles({
        'package.json': '{}',
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout, exitCode } = runScan();
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/Language\s+Node\.js/);
    });

    it('handles missing package.json gracefully', async () => {
      await createTestFiles({
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout, exitCode } = runScan();
      expect(exitCode).toBe(0);
      // Should not crash - language detection may or may not succeed without package.json
      expect(stdout).toContain('ana scan');
    });

    it('includes payments in JSON output', async () => {
      await createTestFiles({
        'package.json': JSON.stringify({
          name: 'test',
          dependencies: { stripe: '16.0.0' },
        }),
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout } = runScan(['--json']);
      const result = JSON.parse(stdout);
      expect(result.stack.payments).toBe('Stripe');
    });
  });

  describe('monorepo detection', () => {
    it('detects pnpm-workspace.yaml as pnpm monorepo', async () => {
      await createTestFiles({
        'pnpm-workspace.yaml': 'packages:\n  - "packages/*"',
        'packages/cli/package.json': JSON.stringify({ name: 'cli' }),
        'packages/web/package.json': JSON.stringify({ name: 'web' }),
        'package.json': JSON.stringify({ name: 'root' }),
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout } = runScan();
      expect(stdout).toMatch(/Workspace\s+pnpm monorepo/);
      expect(stdout).toMatch(/Packages/);
      expect(stdout).toMatch(/packages\/cli/);
      expect(stdout).toMatch(/packages\/web/);
    });

    it('shows no workspace info for non-monorepo', async () => {
      await createTestFiles({
        'package.json': JSON.stringify({ name: 'test' }),
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout } = runScan();
      expect(stdout).not.toMatch(/Workspace/);
      expect(stdout).not.toMatch(/Packages/);
    });

    it('detects package.json workspaces', async () => {
      await createTestFiles({
        'package.json': JSON.stringify({
          name: 'root',
          workspaces: ['apps/*'],
        }),
        'apps/web/package.json': JSON.stringify({ name: 'web' }),
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout } = runScan();
      expect(stdout).toMatch(/Workspace\s+npm\/yarn monorepo/);
    });

    it('includes packages in JSON output', async () => {
      await createTestFiles({
        'pnpm-workspace.yaml': 'packages:\n  - "packages/*"',
        'packages/cli/package.json': JSON.stringify({ name: 'cli' }),
        'package.json': JSON.stringify({ name: 'root' }),
        'index.ts': 'const x = 1;',
      });
      process.chdir(tempDir);

      const { stdout } = runScan(['--json']);
      const result = JSON.parse(stdout);
      expect(result.stack.workspace).toBe('pnpm monorepo');
      expect(result.packages).toBeInstanceOf(Array);
      expect(result.packages.length).toBeGreaterThan(0);
    });
  });
});

describe('display name mapping', () => {
  it('maps node to Node.js', () => {
    expect(getLanguageDisplayName('node')).toBe('Node.js');
  });

  it('maps python to Python', () => {
    expect(getLanguageDisplayName('python')).toBe('Python');
  });

  it('maps go to Go', () => {
    expect(getLanguageDisplayName('go')).toBe('Go');
  });

  it('maps nextjs to Next.js', () => {
    expect(getFrameworkDisplayName('nextjs')).toBe('Next.js');
  });

  it('maps fastapi to FastAPI', () => {
    expect(getFrameworkDisplayName('fastapi')).toBe('FastAPI');
  });

  it('maps vitest to Vitest', () => {
    expect(getPatternDisplayName('vitest')).toBe('Vitest');
  });

  it('maps prisma to Prisma', () => {
    expect(getPatternDisplayName('prisma')).toBe('Prisma');
  });
});
