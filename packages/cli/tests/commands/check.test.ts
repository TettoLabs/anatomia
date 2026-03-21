import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

/**
 * Tests for `ana setup check` command
 *
 * Uses temp directories with .ana/context/ structure for isolation.
 */

describe('ana setup check', () => {
  let tempDir: string;
  let contextPath: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'check-test-'));
    contextPath = path.join(tempDir, '.ana', 'context');
    await fs.mkdir(contextPath, { recursive: true });
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to run the check command and capture output
   */
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

  /**
   * Helper to create a context file with given content
   */
  async function createContextFile(filename: string, content: string): Promise<void> {
    await fs.writeFile(path.join(contextPath, filename), content, 'utf-8');
  }

  /**
   * Helper to generate content with N lines and M headers
   */
  function generateContent(lines: number, headers: number): string {
    const headerLines = Array.from({ length: headers }, (_, i) => `## Section ${i + 1}`);
    const contentLines = Array.from({ length: lines - headers }, () => 'Some content line.');
    return [...headerLines, ...contentLines].join('\n');
  }

  describe('single-file check', () => {
    it('returns correct JSON structure', async () => {
      // patterns.md: 800-1200 lines, 6 headers
      const content = generateContent(850, 6);
      await createContextFile('patterns.md', content);

      const { stdout, exitCode } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result).toHaveProperty('file', 'patterns.md');
      expect(result).toHaveProperty('line_count');
      expect(result.line_count).toHaveProperty('actual');
      expect(result.line_count).toHaveProperty('minimum');
      expect(result.line_count).toHaveProperty('maximum');
      expect(result.line_count).toHaveProperty('pass');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('placeholders');
      expect(result).toHaveProperty('scaffold_markers');
      expect(result).toHaveProperty('citations');
      expect(result).toHaveProperty('overall');
      expect(exitCode).toBe(0);
    });

    it('passes when file meets all requirements', async () => {
      const content = generateContent(850, 6);
      await createContextFile('patterns.md', content);

      const { stdout, exitCode } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result.overall).toBe(true);
      expect(result.line_count.pass).toBe(true);
      expect(result.headers.pass).toBe(true);
      expect(result.placeholders.pass).toBe(true);
      expect(result.scaffold_markers.pass).toBe(true);
      expect(exitCode).toBe(0);
    });
  });

  describe('all-files check', () => {
    it('returns array of file results', async () => {
      // Create all 7 context files with minimal valid content
      const files = [
        { name: 'project-overview.md', lines: 350, headers: 4 },
        { name: 'conventions.md', lines: 450, headers: 4 },
        { name: 'patterns.md', lines: 850, headers: 6 },
        { name: 'architecture.md', lines: 350, headers: 4 },
        { name: 'testing.md', lines: 450, headers: 6 },
        { name: 'workflow.md', lines: 650, headers: 6 },
        { name: 'debugging.md', lines: 350, headers: 5 },
      ];

      for (const file of files) {
        await createContextFile(file.name, generateContent(file.lines, file.headers));
      }

      const { stdout, exitCode } = runCheck('--json');
      const result = JSON.parse(stdout);

      expect(result).toHaveProperty('files');
      expect(result.files).toHaveLength(7);
      expect(result).toHaveProperty('overall');
      expect(result.overall).toBe(true);
      expect(exitCode).toBe(0);
    });
  });

  describe('line count check', () => {
    it('fails when file is below minimum', async () => {
      // patterns.md needs 800-1200 lines, give it only 100
      const content = generateContent(100, 6);
      await createContextFile('patterns.md', content);

      const { stdout, exitCode } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result.line_count.pass).toBe(false);
      expect(result.line_count.actual).toBe(100);
      expect(result.overall).toBe(false);
      expect(exitCode).toBe(1);
    });

    it('passes when file is within range', async () => {
      const content = generateContent(900, 6);
      await createContextFile('patterns.md', content);

      const { stdout, exitCode } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result.line_count.pass).toBe(true);
      expect(result.line_count.actual).toBe(900);
      expect(exitCode).toBe(0);
    });
  });

  describe('placeholder detection', () => {
    it('fails when file contains TODO', async () => {
      const content = generateContent(850, 6) + '\nTODO: fix this later\n';
      await createContextFile('patterns.md', content);

      const { stdout, exitCode } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result.placeholders.pass).toBe(false);
      expect(result.placeholders.count).toBeGreaterThan(0);
      expect(result.overall).toBe(false);
      expect(exitCode).toBe(1);
    });

    it('passes when file has no placeholders', async () => {
      const content = generateContent(850, 6);
      await createContextFile('patterns.md', content);

      const { stdout, exitCode } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result.placeholders.pass).toBe(true);
      expect(result.placeholders.count).toBe(0);
    });

    it('detects multiple placeholder types', async () => {
      const content = generateContent(850, 6) + '\nTODO: a\nFIXME: b\n[INSERT something]\nTBD\n';
      await createContextFile('patterns.md', content);

      const { stdout } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result.placeholders.pass).toBe(false);
      expect(result.placeholders.count).toBeGreaterThanOrEqual(4);
    });
  });

  describe('scaffold marker detection', () => {
    it('fails when file contains scaffold marker', async () => {
      const content = '<!-- SCAFFOLD - Setup will fill this file -->\n' + generateContent(850, 6);
      await createContextFile('patterns.md', content);

      const { stdout, exitCode } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result.scaffold_markers.pass).toBe(false);
      expect(result.scaffold_markers.count).toBe(1);
      expect(result.overall).toBe(false);
      expect(exitCode).toBe(1);
    });

    it('passes when file has no scaffold markers', async () => {
      const content = generateContent(850, 6);
      await createContextFile('patterns.md', content);

      const { stdout } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result.scaffold_markers.pass).toBe(true);
      expect(result.scaffold_markers.count).toBe(0);
    });
  });

  describe('citation verification', () => {
    it('passes when cited file exists', async () => {
      // Create a real file to cite
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'utils.ts'), 'line1\nline2\nline3\nline4\nline5\n');

      const content = generateContent(850, 6) + '\n\nExample from `src/utils.ts` (lines 1-3):\n```\ncode\n```\n';
      await createContextFile('patterns.md', content);

      const { stdout } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result.citations.total).toBe(1);
      expect(result.citations.verified).toBe(1);
      expect(result.citations.pass).toBe(true);
    });

    it('fails when cited file does not exist', async () => {
      const content = generateContent(850, 6) + '\n\nExample from `nonexistent/file.ts` (lines 1-10):\n```\ncode\n```\n';
      await createContextFile('patterns.md', content);

      const { stdout, exitCode } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result.citations.total).toBe(1);
      expect(result.citations.verified).toBe(0);
      expect(result.citations.failed).toHaveLength(1);
      expect(result.citations.failed[0].reason).toBe('file not found');
      expect(result.citations.pass).toBe(false);
      expect(exitCode).toBe(1);
    });

    it('passes with short citation format (no line numbers)', async () => {
      // Create a real file to cite
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'utils.ts'), 'line1\nline2\n');

      // Short format: Example from `file`:  (no line numbers)
      const content = generateContent(850, 6) + '\n\nExample from `src/utils.ts`:\n```\ncode\n```\n';
      await createContextFile('patterns.md', content);

      const { stdout } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result.citations.total).toBe(1);
      expect(result.citations.verified).toBe(1);
      expect(result.citations.pass).toBe(true);
    });

    it('fails short citation format when file not found', async () => {
      // Short format with nonexistent file
      const content = generateContent(850, 6) + '\n\nExample from `nonexistent/file.ts`:\n```\ncode\n```\n';
      await createContextFile('patterns.md', content);

      const { stdout, exitCode } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result.citations.total).toBe(1);
      expect(result.citations.verified).toBe(0);
      expect(result.citations.failed).toHaveLength(1);
      expect(result.citations.failed[0].reason).toBe('file not found');
      expect(exitCode).toBe(1);
    });

    it('counts both citation formats in total', async () => {
      // Create a real file to cite
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'utils.ts'), 'line1\nline2\nline3\nline4\nline5\n');

      // Mix of both formats
      const content = generateContent(850, 6) +
        '\n\nExample from `src/utils.ts` (lines 1-3):\n```\ncode\n```\n' +
        '\n\nExample from `src/utils.ts`:\n```\nmore code\n```\n';
      await createContextFile('patterns.md', content);

      const { stdout } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result.citations.total).toBe(2);
      expect(result.citations.verified).toBe(2);
      expect(result.citations.pass).toBe(true);
    });

    it('fails when line range is out of bounds', async () => {
      // Create a file with only 5 lines
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'small.ts'), 'line1\nline2\nline3\nline4\nline5\n');

      // Cite lines 9999-10000
      const content = generateContent(850, 6) + '\n\nExample from `src/small.ts` (lines 9999-10000):\n```\ncode\n```\n';
      await createContextFile('patterns.md', content);

      const { stdout, exitCode } = runCheck('patterns.md --json');
      const result = JSON.parse(stdout);

      expect(result.citations.total).toBe(1);
      expect(result.citations.verified).toBe(0);
      expect(result.citations.failed).toHaveLength(1);
      expect(result.citations.failed[0].reason).toContain('line range out of bounds');
      expect(result.citations.pass).toBe(false);
      expect(exitCode).toBe(1);
    });
  });

  describe('exit codes', () => {
    it('returns exit code 0 when all pass', async () => {
      const content = generateContent(850, 6);
      await createContextFile('patterns.md', content);

      const { exitCode } = runCheck('patterns.md --json');
      expect(exitCode).toBe(0);
    });

    it('returns exit code 1 when any fail', async () => {
      const content = generateContent(100, 6); // Too few lines
      await createContextFile('patterns.md', content);

      const { exitCode } = runCheck('patterns.md --json');
      expect(exitCode).toBe(1);
    });
  });

  describe('error handling', () => {
    it('gives helpful error when .ana/context/ does not exist', async () => {
      // Remove the context directory
      await fs.rm(contextPath, { recursive: true, force: true });

      const { stdout, exitCode } = runCheck('--json');
      const result = JSON.parse(stdout);

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('.ana/context/');
      expect(exitCode).toBe(1);
    });

    it('gives helpful error when specific file not found', async () => {
      const { stdout, exitCode } = runCheck('nonexistent.md --json');
      const result = JSON.parse(stdout);

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('not found');
      expect(exitCode).toBe(1);
    });
  });
});
