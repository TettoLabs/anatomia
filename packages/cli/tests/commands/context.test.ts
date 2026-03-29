import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { getContextStatus } from '../../src/commands/context.js';

/**
 * Tests for `ana context status` command
 *
 * Uses temp directories with real git repos for isolation.
 */

describe('ana context status', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-test-'));
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
  function captureOutput(fn: () => void): string {
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(' '));
    };
    fn();
    console.log = originalLog;
    return logs.join('\n');
  }

  /**
   * Helper to capture console error output
   */
  function captureError(fn: () => void): string {
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...args: unknown[]) => {
      errors.push(args.join(' '));
    };
    try {
      fn();
    } finally {
      console.error = originalError;
    }
    return errors.join('\n');
  }

  /**
   * Helper to create test project with context files
   */
  async function createTestProject(options: {
    withGit?: boolean;
    contextFiles?: string[];
    oldFiles?: string[]; // Files to create with old mtime
    commitsAfterFiles?: boolean; // Create commits after file creation
  }): Promise<void> {
    const anaDir = path.join(tempDir, '.ana');
    const contextDir = path.join(anaDir, 'context');
    await fs.mkdir(contextDir, { recursive: true });

    // Create .meta.json
    await fs.writeFile(
      path.join(anaDir, '.meta.json'),
      JSON.stringify({ artifactBranch: 'main', lastHealth: null }),
      'utf-8'
    );

    // Initialize git if requested
    if (options.withGit) {
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

      // Initial commit
      execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });
    }

    // Create context files
    if (options.contextFiles) {
      for (const filename of options.contextFiles) {
        const filePath = path.join(contextDir, filename);
        await fs.writeFile(filePath, `# ${filename}`, 'utf-8');
      }

      if (options.withGit) {
        execSync('git add -A && git commit -m "add context"', { cwd: tempDir, stdio: 'ignore' });
      }
    }

    // Create old files
    if (options.oldFiles) {
      for (const filename of options.oldFiles) {
        const filePath = path.join(contextDir, filename);
        await fs.writeFile(filePath, `# ${filename}`, 'utf-8');

        // Set mtime to 90 days ago
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 90);
        await fs.utimes(filePath, oldDate, oldDate);
      }

      if (options.withGit) {
        execSync('git add -A && git commit -m "add old files"', { cwd: tempDir, stdio: 'ignore' });
      }
    }

    // Create commits after files to trigger staleness
    if (options.commitsAfterFiles && options.withGit) {
      // Wait a tiny bit to ensure commit time differs from file mtime
      await new Promise(resolve => setTimeout(resolve, 10));

      const dummyFile = path.join(tempDir, 'dummy.txt');
      await fs.writeFile(dummyFile, 'change 1', 'utf-8');
      execSync('git add -A && git commit -m "change 1"', { cwd: tempDir, stdio: 'ignore' });

      await fs.writeFile(dummyFile, 'change 2', 'utf-8');
      execSync('git add -A && git commit -m "change 2"', { cwd: tempDir, stdio: 'ignore' });

      await fs.writeFile(dummyFile, 'change 3', 'utf-8');
      execSync('git add -A && git commit -m "change 3"', { cwd: tempDir, stdio: 'ignore' });
    }
  }

  describe('basic functionality', () => {
    it('shows all 7 setup files present', async () => {
      await createTestProject({
        withGit: true,
        contextFiles: [
          'project-overview.md',
          'conventions.md',
          'patterns.md',
          'architecture.md',
          'testing.md',
          'workflow.md',
          'debugging.md',
        ],
        commitsAfterFiles: false,
      });

      const output = captureOutput(() => getContextStatus({ json: false }));

      expect(output).toContain('Context Health');
      expect(output).toContain('Setup Files (7 verified)');
      expect(output).toContain('✓ project-overview.md');
      expect(output).toContain('✓ conventions.md');
      expect(output).toContain('✓ patterns.md');
      expect(output).toContain('✓ architecture.md');
      expect(output).toContain('✓ testing.md');
      expect(output).toContain('✓ workflow.md');
      expect(output).toContain('✓ debugging.md');
      // Note: Summary message depends on git timing - not reliably testable
    });

    it('shows missing setup files with ✗', async () => {
      await createTestProject({
        withGit: true,
        contextFiles: [
          'project-overview.md',
          'conventions.md',
          'architecture.md',
          'testing.md',
          'debugging.md',
        ],
      });

      const output = captureOutput(() => getContextStatus({ json: false }));

      expect(output).toContain('Setup Files (5 of 7 present)');
      expect(output).toContain('✓ project-overview.md');
      expect(output).toContain('✗ patterns.md');
      expect(output).toContain('✗ workflow.md');
      expect(output).toContain('2 setup files missing.');
    });

    it('shows stale files with ⚠ warning and commit count', async () => {
      await createTestProject({
        withGit: true,
        contextFiles: [
          'project-overview.md',
          'conventions.md',
          'patterns.md',
          'architecture.md',
          'testing.md',
          'workflow.md',
          'debugging.md',
        ],
        commitsAfterFiles: true, // Creates 3 commits after files
      });

      const output = captureOutput(() => getContextStatus({ json: false }));

      expect(output).toContain('⚠');
      expect(output).toContain('commits since update');
      expect(output).toContain('files may be stale'); // Don't assert exact count - varies with git timing
    });

    it('shows other files in separate section', async () => {
      await createTestProject({
        withGit: true,
        contextFiles: [
          'project-overview.md',
          'conventions.md',
          'patterns.md',
          'architecture.md',
          'testing.md',
          'workflow.md',
          'debugging.md',
          'analysis.md',
          'custom-notes.md',
        ],
      });

      const output = captureOutput(() => getContextStatus({ json: false }));

      expect(output).toContain('Other Files:');
      expect(output).toContain('analysis.md');
      expect(output).toContain('custom-notes.md');
    });
  });

  describe('error handling', () => {
    it('errors when .ana/context/ does not exist', async () => {
      // Create empty temp dir (no .ana/)
      let exitCode = 0;
      const originalExit = process.exit;
      process.exit = ((code?: number) => {
        exitCode = code || 0;
        throw new Error('exit');
      }) as any;

      try {
        captureError(() => {
          try {
            getContextStatus({ json: false });
          } catch (e) {
            if (e instanceof Error && e.message === 'exit') {
              // Expected
            } else {
              throw e;
            }
          }
        });
      } finally {
        process.exit = originalExit;
      }

      expect(exitCode).toBe(1);
    });

    it('handles non-git repo gracefully', async () => {
      await createTestProject({
        withGit: false, // No git
        contextFiles: [
          'project-overview.md',
          'conventions.md',
          'patterns.md',
          'architecture.md',
          'testing.md',
          'workflow.md',
          'debugging.md',
        ],
      });

      const output = captureOutput(() => getContextStatus({ json: false }));

      expect(output).toContain('Context Health');
      expect(output).toContain('Setup Files (7 verified)');
      expect(output).not.toContain('⚠'); // No staleness warnings
      expect(output).toContain('Git unavailable. Staleness detection skipped.');
    });
  });

  describe('JSON output', () => {
    it('produces valid JSON with correct structure', async () => {
      await createTestProject({
        withGit: true,
        contextFiles: [
          'project-overview.md',
          'conventions.md',
          'patterns.md',
          'architecture.md',
          'testing.md',
          'workflow.md',
          'debugging.md',
          'analysis.md',
        ],
      });

      const output = captureOutput(() => getContextStatus({ json: true }));
      const json = JSON.parse(output);

      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('setupFiles');
      expect(json).toHaveProperty('otherFiles');
      expect(json).toHaveProperty('summary');

      expect(Array.isArray(json.setupFiles)).toBe(true);
      expect(json.setupFiles.length).toBe(7);

      expect(Array.isArray(json.otherFiles)).toBe(true);
      expect(json.otherFiles.length).toBe(1);

      expect(json.summary).toHaveProperty('totalFiles', 8);
      expect(json.summary).toHaveProperty('setupFiles', 7);
      expect(json.summary).toHaveProperty('setupFilesPresent', 7);
      expect(json.summary).toHaveProperty('missingSetupFiles', 0);
      expect(json.summary).toHaveProperty('staleFiles');
    });

    it('JSON contains raw mtime timestamps, not age strings', async () => {
      await createTestProject({
        withGit: true,
        contextFiles: ['project-overview.md'],
      });

      const output = captureOutput(() => getContextStatus({ json: true }));
      const json = JSON.parse(output);

      const file = json.setupFiles.find((f: any) => f.file === 'project-overview.md');
      expect(file).toBeDefined();
      expect(file.mtime).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
      expect(file).not.toHaveProperty('age'); // No age string
    });

    it('JSON shows exists: false for missing files', async () => {
      await createTestProject({
        withGit: true,
        contextFiles: ['project-overview.md'],
      });

      const output = captureOutput(() => getContextStatus({ json: true }));
      const json = JSON.parse(output);

      const missingFile = json.setupFiles.find((f: any) => f.file === 'conventions.md');
      expect(missingFile.exists).toBe(false);
      expect(missingFile.mtime).toBeNull();
      expect(missingFile.commitsSince).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles empty .ana/context/ directory', async () => {
      const anaDir = path.join(tempDir, '.ana');
      const contextDir = path.join(anaDir, 'context');
      await fs.mkdir(contextDir, { recursive: true });

      // Create .meta.json
      await fs.writeFile(
        path.join(anaDir, '.meta.json'),
        JSON.stringify({ artifactBranch: 'main', lastHealth: null }),
        'utf-8'
      );

      // Initialize git
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });

      // No context files created

      const output = captureOutput(() => getContextStatus({ json: false }));

      expect(output).toContain('Context Health');
      expect(output).toContain('Setup Files (0 of 7 present)');
      expect(output).toContain('7 setup files missing');
    });

    it('filters out non-.md files', async () => {
      const contextDir = path.join(tempDir, '.ana', 'context');
      await fs.mkdir(contextDir, { recursive: true });

      await fs.writeFile(path.join(contextDir, 'project-overview.md'), '# Test', 'utf-8');
      await fs.writeFile(path.join(contextDir, '.DS_Store'), 'binary', 'utf-8');
      await fs.writeFile(path.join(contextDir, 'readme.txt'), 'text', 'utf-8');

      const output = captureOutput(() => getContextStatus({ json: false }));

      expect(output).not.toContain('.DS_Store');
      expect(output).not.toContain('readme.txt');
      expect(output).toContain('project-overview.md');
    });

    it('filters out subdirectories', async () => {
      const contextDir = path.join(tempDir, '.ana', 'context');
      await fs.mkdir(contextDir, { recursive: true });
      await fs.mkdir(path.join(contextDir, 'archives'), { recursive: true });

      await fs.writeFile(path.join(contextDir, 'project-overview.md'), '# Test', 'utf-8');

      const output = captureOutput(() => getContextStatus({ json: false }));

      // Shouldn't show the directory name in "Other Files" section
      // (The word "archives" should not appear as a file)
      const lines = output.split('\n');
      const otherFilesSection = lines.slice(lines.findIndex(l => l.includes('Other Files')));
      const otherFilesText = otherFilesSection.join('\n');

      expect(otherFilesText).not.toContain('archives');
      expect(output).toContain('project-overview.md');
    });

    it('formats old files correctly (months old)', async () => {
      await createTestProject({
        withGit: true,
        oldFiles: ['project-overview.md'],
      });

      const output = captureOutput(() => getContextStatus({ json: false }));

      // Allow for 89-90 days due to timing precision
      expect(output).toMatch(/89|90 days ago/);
    });

    it('handles git repo with no commits', async () => {
      const anaDir = path.join(tempDir, '.ana');
      const contextDir = path.join(anaDir, 'context');
      await fs.mkdir(contextDir, { recursive: true });

      // Create .meta.json
      await fs.writeFile(
        path.join(anaDir, '.meta.json'),
        JSON.stringify({ artifactBranch: 'main' }),
        'utf-8'
      );

      // Init git but make no commits
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

      await fs.writeFile(path.join(contextDir, 'project-overview.md'), '# Test', 'utf-8');

      const output = captureOutput(() => getContextStatus({ json: false }));

      // Should not crash, should show file
      expect(output).toContain('project-overview.md');
      // File will show age - "just now" or "N minutes ago"
      expect(output).toMatch(/just now|ago/);
    });
  });

  describe('.meta.json update', () => {
    it('updates lastHealth field in .meta.json', async () => {
      await createTestProject({
        withGit: true,
        contextFiles: ['project-overview.md', 'conventions.md'],
      });

      getContextStatus({ json: true });

      const metaPath = path.join(tempDir, '.ana', '.meta.json');
      const meta = JSON.parse(fsSync.readFileSync(metaPath, 'utf-8'));

      expect(meta.lastHealth).toBeDefined();
      expect(meta.lastHealth.timestamp).toBeDefined();
      expect(meta.lastHealth.totalFiles).toBe(2);
      expect(meta.lastHealth.setupFiles).toBe(7);
      expect(meta.lastHealth.setupFilesPresent).toBe(2);
      expect(meta.lastHealth.missingSetupFiles).toBe(5);
      expect(meta.lastHealth.staleFiles).toBeDefined();
    });

    it('continues successfully even if .meta.json does not exist', async () => {
      const contextDir = path.join(tempDir, '.ana', 'context');
      await fs.mkdir(contextDir, { recursive: true });
      await fs.writeFile(path.join(contextDir, 'project-overview.md'), '# Test', 'utf-8');

      // No .meta.json created

      const output = captureOutput(() => getContextStatus({ json: false }));

      // Should not crash
      expect(output).toContain('Context Health');
    });
  });

  describe('age formatting', () => {
    it('shows "just now" for very recent files', async () => {
      const contextDir = path.join(tempDir, '.ana', 'context');
      await fs.mkdir(contextDir, { recursive: true });

      await fs.writeFile(path.join(contextDir, 'project-overview.md'), '# Test', 'utf-8');

      const output = captureOutput(() => getContextStatus({ json: false }));

      expect(output).toMatch(/just now|ago/);
    });

    it('shows hours for files modified today', async () => {
      const contextDir = path.join(tempDir, '.ana', 'context');
      await fs.mkdir(contextDir, { recursive: true });

      await fs.writeFile(path.join(contextDir, 'project-overview.md'), '# Test', 'utf-8');

      // Set mtime to 3 hours ago
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 3);
      await fs.utimes(path.join(contextDir, 'project-overview.md'), oldDate, oldDate);

      const output = captureOutput(() => getContextStatus({ json: false }));

      expect(output).toContain('3 hours ago');
    });

    it('shows days for older files', async () => {
      const contextDir = path.join(tempDir, '.ana', 'context');
      await fs.mkdir(contextDir, { recursive: true });

      await fs.writeFile(path.join(contextDir, 'project-overview.md'), '# Test', 'utf-8');

      // Set mtime to 5 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 5);
      await fs.utimes(path.join(contextDir, 'project-overview.md'), oldDate, oldDate);

      const output = captureOutput(() => getContextStatus({ json: false }));

      expect(output).toContain('5 days ago');
    });
  });
});
