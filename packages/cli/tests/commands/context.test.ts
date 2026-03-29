// Test for: ana context status
// Based on test skeleton from AnaPlan

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
   * Helper to create .ana structure with context files
   */
  async function createContextProject(options: {
    initGit?: boolean;
    files?: string[]; // which of the 7 setup files to create
    makeCommitsAfter?: boolean; // create commits after files
  }): Promise<void> {
    const { initGit = true, files = [], makeCommitsAfter = false } = options;

    // Create .ana directory structure
    const anaDir = path.join(tempDir, '.ana');
    const contextDir = path.join(anaDir, 'context');
    await fs.mkdir(contextDir, { recursive: true });

    // Create .meta.json
    await fs.writeFile(
      path.join(anaDir, '.meta.json'),
      JSON.stringify({ artifactBranch: 'main', lastHealth: { timestamp: '2020-01-01T00:00:00.000Z' } }, null, 2),
      'utf-8'
    );

    // Create context files
    for (const file of files) {
      await fs.writeFile(path.join(contextDir, file), `# ${file}\n\nContent here.`, 'utf-8');
    }

    // Init git if requested
    if (initGit) {
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });

      // Make additional commits after file creation if requested
      if (makeCommitsAfter && files.length > 0) {
        // Wait a tiny bit to ensure mtime is before commit
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Create a dummy file and commit to simulate activity
        await fs.writeFile(path.join(tempDir, 'dummy.txt'), 'dummy', 'utf-8');
        execSync('git add -A && git commit -m "activity"', { cwd: tempDir, stdio: 'ignore' });
      }
    }
  }

  /**
   * Helper to capture console output
   */
  function captureOutput(fn: () => void): string {
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(' '));
    };
    try {
      fn();
    } finally {
      console.log = originalLog;
    }
    return logs.join('\n');
  }

  const ALL_SETUP_FILES = [
    'project-overview.md',
    'architecture.md',
    'patterns.md',
    'conventions.md',
    'workflow.md',
    'testing.md',
    'debugging.md',
  ];

  describe('human-readable output', () => {
    // AC1: displays all 7 context files
    it('shows all 7 setup files in output', async () => {
      await createContextProject({ files: ALL_SETUP_FILES });

      const output = captureOutput(() => getContextStatus({ json: false }));
      expect(output).toContain('project-overview.md');
      expect(output).toContain('architecture.md');
      expect(output).toContain('patterns.md');
      expect(output).toContain('conventions.md');
      expect(output).toContain('workflow.md');
      expect(output).toContain('testing.md');
      expect(output).toContain('debugging.md');
    });

    // AC2: each file shows existence, mtime, age, commits
    it('shows present status with date and age for existing files', async () => {
      await createContextProject({ files: ['project-overview.md'] });

      const output = captureOutput(() => getContextStatus({ json: false }));
      expect(output).toMatch(/project-overview\.md\s+✓\s+present/);
      expect(output).toMatch(/\d+ (days?|hours?|minutes?) ago|just now/);
    });

    it('shows missing status for absent files', async () => {
      await createContextProject({ files: ['project-overview.md'] }); // only one file

      const output = captureOutput(() => getContextStatus({ json: false }));
      expect(output).toMatch(/patterns\.md\s+✗\s+missing/);
    });

    // AC3: commit count displayed
    it('shows commit count for files with activity since update', async () => {
      await createContextProject({ files: ALL_SETUP_FILES, makeCommitsAfter: true });

      const output = captureOutput(() => getContextStatus({ json: false }));
      expect(output).toMatch(/\d+ commits? since/);
    });

    it('shows summary line with present count and stale count', async () => {
      await createContextProject({ files: ALL_SETUP_FILES, makeCommitsAfter: true });

      const output = captureOutput(() => getContextStatus({ json: false }));
      expect(output).toMatch(/\d+\/7 setup files present/);
    });
  });

  describe('JSON output', () => {
    // AC4: JSON output with --json flag
    it('produces valid JSON with correct structure', async () => {
      await createContextProject({ files: ALL_SETUP_FILES });

      const output = captureOutput(() => getContextStatus({ json: true }));
      const json = JSON.parse(output);
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('setupFiles');
      expect(json).toHaveProperty('summary');
      expect(json).toHaveProperty('gitAvailable');
    });

    it('setupFiles array has correct shape for each file', async () => {
      await createContextProject({ files: ['project-overview.md', 'architecture.md'] });

      const output = captureOutput(() => getContextStatus({ json: true }));
      const json = JSON.parse(output);
      expect(json.setupFiles).toHaveLength(7);
      const presentFile = json.setupFiles.find((f: { name: string }) => f.name === 'project-overview.md');
      expect(presentFile).toHaveProperty('exists', true);
      expect(presentFile).toHaveProperty('mtime');
      expect(presentFile).toHaveProperty('ageMs');
      expect(presentFile).toHaveProperty('commitsSince');
    });

    it('missing files have null values for mtime, ageMs, commitsSince', async () => {
      await createContextProject({ files: ['project-overview.md'] }); // patterns.md not created

      const output = captureOutput(() => getContextStatus({ json: true }));
      const json = JSON.parse(output);
      const missingFile = json.setupFiles.find((f: { name: string }) => f.name === 'patterns.md');
      expect(missingFile.exists).toBe(false);
      expect(missingFile.mtime).toBeNull();
      expect(missingFile.ageMs).toBeNull();
      expect(missingFile.commitsSince).toBeNull();
    });

    it('summary has correct counts', async () => {
      await createContextProject({ files: ['project-overview.md', 'architecture.md', 'patterns.md', 'conventions.md', 'workflow.md'] }); // 5 of 7

      const output = captureOutput(() => getContextStatus({ json: true }));
      const json = JSON.parse(output);
      expect(json.summary.totalFiles).toBe(7);
      expect(json.summary.presentFiles).toBe(5);
      expect(json.summary.missingFiles).toBe(2);
    });
  });

  describe('lastHealth update', () => {
    // AC5: updates .meta.json lastHealth on every run
    it('updates lastHealth timestamp in .meta.json', async () => {
      await createContextProject({ files: ALL_SETUP_FILES });

      const before = JSON.parse(fsSync.readFileSync('.ana/.meta.json', 'utf-8'));
      getContextStatus({ json: false });
      const after = JSON.parse(fsSync.readFileSync('.ana/.meta.json', 'utf-8'));
      expect(after.lastHealth.timestamp).not.toBe(before.lastHealth.timestamp);
    });

    it('updates lastHealth with correct counts', async () => {
      await createContextProject({ files: ['project-overview.md', 'architecture.md', 'patterns.md', 'conventions.md', 'workflow.md'], makeCommitsAfter: true }); // 5 of 7, all stale

      captureOutput(() => getContextStatus({ json: false }));
      const meta = JSON.parse(fsSync.readFileSync('.ana/.meta.json', 'utf-8'));
      expect(meta.lastHealth.totalFiles).toBe(8); // 7 setup + 1 analysis.md
      expect(meta.lastHealth.setupFiles).toBe(7);
      expect(meta.lastHealth.setupFilesPresent).toBe(5);
      expect(meta.lastHealth.missingSetupFiles).toBe(2);
      expect(meta.lastHealth.staleFiles).toBe(5);
    });
  });

  describe('exit codes', () => {
    // AC6: exits 0 on success
    it('does not throw on successful run', async () => {
      await createContextProject({ files: ALL_SETUP_FILES });

      expect(() => getContextStatus({ json: false })).not.toThrow();
    });

    // AC7: exits 1 if .ana/ missing
    it('throws/exits when .ana/ directory does not exist', async () => {
      // tempDir has no .ana/
      expect(() => getContextStatus({ json: false })).toThrow();
    });

    it('throws/exits when .ana/.meta.json missing', async () => {
      // Create .ana/ but no .meta.json
      await fs.mkdir(path.join(tempDir, '.ana'), { recursive: true });

      expect(() => getContextStatus({ json: false })).toThrow();
    });
  });

  describe('non-git repo handling', () => {
    // AC8: works without git
    it('succeeds in non-git directory', async () => {
      await createContextProject({ initGit: false, files: ALL_SETUP_FILES });

      expect(() => getContextStatus({ json: false })).not.toThrow();
    });

    it('shows file age but no commit count when not in git repo', async () => {
      await createContextProject({ initGit: false, files: ALL_SETUP_FILES });

      const output = captureOutput(() => getContextStatus({ json: false }));
      expect(output).toContain('Git unavailable');
      expect(output).not.toContain('commits since');
    });

    it('JSON output has gitAvailable: false when not in git repo', async () => {
      await createContextProject({ initGit: false, files: ALL_SETUP_FILES });

      const output = captureOutput(() => getContextStatus({ json: true }));
      const json = JSON.parse(output);
      expect(json.gitAvailable).toBe(false);
    });

    it('commitsSince is null for all files when not in git repo', async () => {
      await createContextProject({ initGit: false, files: ALL_SETUP_FILES });

      const output = captureOutput(() => getContextStatus({ json: true }));
      const json = JSON.parse(output);
      for (const file of json.setupFiles) {
        if (file.exists) {
          expect(file.commitsSince).toBeNull();
        }
      }
    });
  });

  describe('edge cases', () => {
    it('handles empty context file (exists = true)', async () => {
      await createContextProject({ files: [] });
      // Create an empty patterns.md
      await fs.writeFile(path.join(tempDir, '.ana', 'context', 'patterns.md'), '', 'utf-8');

      const output = captureOutput(() => getContextStatus({ json: true }));
      const json = JSON.parse(output);
      const file = json.setupFiles.find((f: { name: string }) => f.name === 'patterns.md');
      expect(file.exists).toBe(true);
    });

    it('handles file with future mtime gracefully', async () => {
      await createContextProject({ files: ['project-overview.md'] });

      // Set mtime to future
      const futureTime = new Date(Date.now() + 86400000); // +1 day
      const filePath = path.join(tempDir, '.ana', 'context', 'project-overview.md');
      fsSync.utimesSync(filePath, futureTime, futureTime);

      expect(() => getContextStatus({ json: false })).not.toThrow();
      const output = captureOutput(() => getContextStatus({ json: true }));
      const json = JSON.parse(output);
      // Future mtime should show negative ageMs
      const file = json.setupFiles.find((f: { name: string }) => f.name === 'project-overview.md');
      expect(file.ageMs).toBeLessThan(0);
    });

    it('does not include analysis.md in setup files list', async () => {
      await createContextProject({ files: ALL_SETUP_FILES });
      // Also create analysis.md
      await fs.writeFile(path.join(tempDir, '.ana', 'context', 'analysis.md'), '# Analysis', 'utf-8');

      const output = captureOutput(() => getContextStatus({ json: true }));
      const json = JSON.parse(output);
      expect(json.setupFiles).toHaveLength(7);
      expect(json.setupFiles.find((f: { name: string }) => f.name === 'analysis.md')).toBeUndefined();
    });
  });
});
