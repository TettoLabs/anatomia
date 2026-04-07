import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

/**
 * Tests for `ana setup index` command and symbol index integration
 */

describe('ana setup index', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'index-test-'));
    originalCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to run the CLI command
   */
  function runCli(command: string): { stdout: string; stderr: string; exitCode: number } {
    const cliPath = path.join(originalCwd, 'dist', 'index.js');
    try {
      const stdout = execSync(`node ${cliPath} ${command}`, {
        encoding: 'utf-8',
        cwd: tempDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string; status?: number };
      return {
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
        exitCode: execError.status || 1,
      };
    }
  }

  describe('command execution', () => {
    it('fails without .ana/ directory', async () => {
      process.chdir(tempDir);

      const { stderr, exitCode } = runCli('setup index');

      expect(exitCode).toBe(1);
      expect(stderr).toContain('.ana/');
    });

    it('produces valid JSON output', async () => {
      // Create .ana/ structure
      await fs.mkdir(path.join(tempDir, '.ana', 'state'), { recursive: true });

      // Create a sample TypeScript file
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'src', 'utils.ts'),
        `export function createUser(name: string) {
  return { name };
}

export class UserService {
  getUser(id: number) {
    return { id };
  }
}

const helper = () => 'internal';
`
      );

      process.chdir(tempDir);
      runCli('setup index');

      // Read the generated index
      const indexPath = path.join(tempDir, '.ana', 'state', 'symbol-index.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(content);

      expect(index).toHaveProperty('generated');
      expect(index).toHaveProperty('files_parsed');
      expect(index).toHaveProperty('symbols');
      expect(Array.isArray(index.symbols)).toBe(true);
    });

    it('extracts functions, classes, and methods', async () => {
      await fs.mkdir(path.join(tempDir, '.ana', 'state'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });

      await fs.writeFile(
        path.join(tempDir, 'src', 'service.ts'),
        `export function processData(input: string) {
  return input.trim();
}

export class DataProcessor {
  process(data: string) {
    return data;
  }

  validate(input: string): boolean {
    return !!input;
  }
}

const internalHelper = (x: number) => x * 2;
`
      );

      process.chdir(tempDir);
      runCli('setup index');

      const indexPath = path.join(tempDir, '.ana', 'state', 'symbol-index.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(content);

      const symbolNames = index.symbols.map((s: { name: string }) => s.name);

      expect(symbolNames).toContain('processData');
      expect(symbolNames).toContain('DataProcessor');
      expect(symbolNames).toContain('process');
      expect(symbolNames).toContain('validate');
    });

    it('handles arrow functions assigned to const', async () => {
      await fs.mkdir(path.join(tempDir, '.ana', 'state'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });

      await fs.writeFile(
        path.join(tempDir, 'src', 'arrows.ts'),
        `export const fetchData = async (url: string) => {
  return fetch(url);
};

export const transform = (data: unknown) => data;

const privateHelper = () => null;
`
      );

      process.chdir(tempDir);
      runCli('setup index');

      const indexPath = path.join(tempDir, '.ana', 'state', 'symbol-index.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(content);

      const symbolNames = index.symbols.map((s: { name: string }) => s.name);

      expect(symbolNames).toContain('fetchData');
      expect(symbolNames).toContain('transform');
    });

    it('marks exported vs non-exported correctly', async () => {
      await fs.mkdir(path.join(tempDir, '.ana', 'state'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });

      await fs.writeFile(
        path.join(tempDir, 'src', 'mixed.ts'),
        `export function publicFunc() {}

function privateFunc() {}

export class PublicClass {}

class PrivateClass {}
`
      );

      process.chdir(tempDir);
      runCli('setup index');

      const indexPath = path.join(tempDir, '.ana', 'state', 'symbol-index.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(content);

      const publicFunc = index.symbols.find((s: { name: string }) => s.name === 'publicFunc');
      const privateFunc = index.symbols.find((s: { name: string }) => s.name === 'privateFunc');
      const publicClass = index.symbols.find((s: { name: string }) => s.name === 'PublicClass');
      const privateClass = index.symbols.find((s: { name: string }) => s.name === 'PrivateClass');

      expect(publicFunc?.exported).toBe(true);
      expect(privateFunc?.exported).toBe(false);
      expect(publicClass?.exported).toBe(true);
      expect(privateClass?.exported).toBe(false);
    });

    it('excludes node_modules, dist, and test files', async () => {
      await fs.mkdir(path.join(tempDir, '.ana', 'state'), { recursive: true });

      // Create files that should be excluded
      await fs.mkdir(path.join(tempDir, 'node_modules', 'pkg'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'node_modules', 'pkg', 'index.ts'),
        'export function nodeModuleFunc() {}'
      );

      await fs.mkdir(path.join(tempDir, 'dist'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'dist', 'output.js'),
        'function distFunc() {}'
      );

      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'src', 'utils.test.ts'),
        'function testFunc() {}'
      );

      // Create file that should be included
      await fs.writeFile(
        path.join(tempDir, 'src', 'main.ts'),
        'export function mainFunc() {}'
      );

      process.chdir(tempDir);
      runCli('setup index');

      const indexPath = path.join(tempDir, '.ana', 'state', 'symbol-index.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(content);

      const symbolNames = index.symbols.map((s: { name: string }) => s.name);

      expect(symbolNames).toContain('mainFunc');
      expect(symbolNames).not.toContain('nodeModuleFunc');
      expect(symbolNames).not.toContain('distFunc');
      expect(symbolNames).not.toContain('testFunc');
    });
  });
});

describe('ana setup check with symbol index', () => {
  let tempDir: string;
  let contextPath: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'check-index-test-'));
    contextPath = path.join(tempDir, '.ana', 'context');
    await fs.mkdir(contextPath, { recursive: true });
    await fs.mkdir(path.join(tempDir, '.ana', 'state'), { recursive: true });
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  function runCheck(args: string = ''): { stdout: string; exitCode: number } {
    const cliPath = path.join(originalCwd, 'dist', 'index.js');
    try {
      const stdout = execSync(`node ${cliPath} setup check ${args}`, {
        encoding: 'utf-8',
        cwd: tempDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { stdout, exitCode: 0 };
    } catch (error: unknown) {
      const execError = error as { stdout?: string; status?: number };
      return {
        stdout: execError.stdout || '',
        exitCode: execError.status || 1,
      };
    }
  }

  function generateContent(): string {
    return `# Project Context\n\n## What This Project Does\nContent.\n\n## Architecture\nContent.\n\n## Key Decisions\nContent.\n\n## Key Files\nContent.\n\n## Active Constraints\nContent.\n\n## Domain Vocabulary\nContent.\n`;
  }

  async function createContextFile(filename: string, content: string): Promise<void> {
    await fs.writeFile(path.join(contextPath, filename), content, 'utf-8');
  }

  async function createSymbolIndex(symbols: Array<{ name: string; type: string; file: string; line: number; exported: boolean }>): Promise<void> {
    const index = {
      generated: new Date().toISOString(),
      files_parsed: 1,
      symbols,
    };
    const indexPath = path.join(tempDir, '.ana', 'state', 'symbol-index.json');
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  it('still works without symbol index (backwards compatible)', async () => {
    // Create source file
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'src', 'utils.ts'), 'line1\nline2\nline3\n');

    // Create context file with citation (no symbol index)
    const content = generateContent() + '\n\nExample from `src/utils.ts` (lines 1-2):\n```\ncode\n```\n';
    await createContextFile('project-context.md', content);

    const { stdout, exitCode } = runCheck('project-context.md --json');
    const result = JSON.parse(stdout);

    // Should pass with file-only check
    expect(result.citations.pass).toBe(true);
    expect(exitCode).toBe(0);
  });

  it('passes when symbol exists in cited file', async () => {
    // Create source file
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'utils.ts'),
      `export function processData(input: string) {
  return input;
}
`
    );

    // Create symbol index
    await createSymbolIndex([
      { name: 'processData', type: 'function', file: 'src/utils.ts', line: 1, exported: true },
    ]);

    // Create context file citing the function
    const content = generateContent() + '\n\nThe `processData` function from `src/utils.ts` (lines 1-3):\n```\ncode\n```\n';
    await createContextFile('project-context.md', content);

    const { stdout, exitCode } = runCheck('project-context.md --json');
    const result = JSON.parse(stdout);

    expect(result.citations.pass).toBe(true);
    expect(exitCode).toBe(0);
  });

  it('fails when cited symbol does not exist', async () => {
    // Create source file with enough lines
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'utils.ts'),
      `export function realFunction() {
  // line 2
  // line 3
  return true;
}
`
    );

    // Create symbol index with only the real function
    await createSymbolIndex([
      { name: 'realFunction', type: 'function', file: 'src/utils.ts', line: 1, exported: true },
    ]);

    // Create context file citing a non-existent function
    const content = generateContent() + '\n\nThe `fabricatedFunction` function from `src/utils.ts` (lines 1-3):\n```\ncode\n```\n';
    await createContextFile('project-context.md', content);

    const { stdout, exitCode } = runCheck('project-context.md --json');
    const result = JSON.parse(stdout);

    expect(result.citations.pass).toBe(false);
    expect(result.citations.failed).toHaveLength(1);
    expect(result.citations.failed[0].reason).toContain('fabricatedFunction');
    expect(result.citations.failed[0].reason).toContain('not found');
    expect(exitCode).toBe(1);
  });

  it('verifies symbol is near cited line numbers', async () => {
    // Create source file with function at line 50
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    const lines = Array(48).fill('// comment').join('\n');
    await fs.writeFile(
      path.join(tempDir, 'src', 'utils.ts'),
      `${lines}

export function myFunction() {
  return true;
}
`
    );

    // Create symbol index with function at line 50
    await createSymbolIndex([
      { name: 'myFunction', type: 'function', file: 'src/utils.ts', line: 50, exported: true },
    ]);

    // Cite the function at wrong lines (lines 1-5, but function is at 50)
    const content = generateContent() + '\n\nThe `myFunction` function from `src/utils.ts` (lines 1-5):\n```\ncode\n```\n';
    await createContextFile('project-context.md', content);

    const { stdout, exitCode } = runCheck('project-context.md --json');
    const result = JSON.parse(stdout);

    // Should fail because line 1-5 is not near line 50
    expect(result.citations.pass).toBe(false);
    expect(result.citations.failed[0].reason).toContain('not found near line');
    expect(exitCode).toBe(1);
  });

  it('passes when symbol is within tolerance of cited lines', async () => {
    // Create source file
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'utils.ts'),
      Array(60).fill('// line').join('\n')
    );

    // Create symbol index with function at line 50
    await createSymbolIndex([
      { name: 'myFunction', type: 'function', file: 'src/utils.ts', line: 50, exported: true },
    ]);

    // Cite function at lines 45-55 (within ±20 of actual line 50)
    const content = generateContent() + '\n\nThe `myFunction` function from `src/utils.ts` (lines 45-55):\n```\ncode\n```\n';
    await createContextFile('project-context.md', content);

    const { stdout, exitCode } = runCheck('project-context.md --json');
    const result = JSON.parse(stdout);

    expect(result.citations.pass).toBe(true);
    expect(exitCode).toBe(0);
  });
});
