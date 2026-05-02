/**
 * Tests for git.defaultBranch (4-step priority) and git.branches detection
 */

import { describe, it, expect } from 'vitest';
import { detectGitInfo } from '../../../src/engine/detectors/git.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

describe('git detection', () => {
  describe('defaultBranch', () => {
    it('returns "main" on Anatomia repo (has origin remote)', async () => {
      const result = await detectGitInfo(REPO_ROOT);
      expect(result.defaultBranch).toBe('main');
    });

    it('returns null when no git', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-nogit-'));
      try {
        const result = await detectGitInfo(tmpDir);
        expect(result.defaultBranch).toBeNull();
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('detects default branch via common names when no remote', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-noremote-'));
      try {
        execSync('git init -b main', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });
        // Create initial commit so rev-parse works
        fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'hello');
        execSync('git add . && git commit -m "init"', { cwd: tmpDir, stdio: 'pipe' });

        const result = await detectGitInfo(tmpDir);
        // Steps 1-2 fail (no remote), step 3 finds "main" locally
        expect(result.defaultBranch).toBe('main');
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('handles git init with no commits gracefully', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-empty-'));
      try {
        execSync('git init -b main', { cwd: tmpDir, stdio: 'pipe' });
        const result = await detectGitInfo(tmpDir);
        // Should not crash; returns branch from HEAD
        expect(result.defaultBranch).toBe('main');
        expect(result.head).toBeNull();
        expect(result.commitCount).toBe(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });
  });

  describe('branches', () => {
    it('returns non-empty array on Anatomia repo', async () => {
      const result = await detectGitInfo(REPO_ROOT);
      expect(result.branches).not.toBeNull();
      expect(result.branches!.length).toBeGreaterThan(0);
      expect(result.branches).toContain('main');
    });

    it('returns null when no git', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-nogit2-'));
      try {
        const result = await detectGitInfo(tmpDir);
        expect(result.branches).toBeNull();
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('returns branch list for local repo with commits', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-branches-'));
      try {
        execSync('git init -b main', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });
        fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'hello');
        execSync('git add . && git commit -m "init"', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git checkout -b feature', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git checkout main', { cwd: tmpDir, stdio: 'pipe' });

        const result = await detectGitInfo(tmpDir);
        expect(result.branches).toContain('main');
        expect(result.branches).toContain('feature');
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });
  });
});
