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
        fs.rmSync(tmpDir, { recursive: true, maxRetries: 3, retryDelay: 200 });
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
        fs.rmSync(tmpDir, { recursive: true, maxRetries: 3, retryDelay: 200 });
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
        fs.rmSync(tmpDir, { recursive: true, maxRetries: 3, retryDelay: 200 });
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
        fs.rmSync(tmpDir, { recursive: true, maxRetries: 3, retryDelay: 200 });
      }
    });

    // @ana A003, A004
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
        fs.rmSync(tmpDir, { recursive: true, maxRetries: 3, retryDelay: 200 });
      }
    });

    // @ana A009, A010
    it('excludes local-only branches when remote exists', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-remote-'));
      const bareDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-bare-'));
      try {
        // Create a bare remote repo
        execSync('git init --bare', { cwd: bareDir, stdio: 'pipe' });

        // Create the working repo with a remote
        execSync('git init -b main', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });
        fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'hello');
        execSync('git add . && git commit -m "init"', { cwd: tmpDir, stdio: 'pipe' });
        execSync(`git remote add origin ${bareDir}`, { cwd: tmpDir, stdio: 'pipe' });
        execSync('git push -u origin main', { cwd: tmpDir, stdio: 'pipe' });

        // Create a local-only branch (not pushed)
        execSync('git checkout -b local-experiment', { cwd: tmpDir, stdio: 'pipe' });
        fs.writeFileSync(path.join(tmpDir, 'local.txt'), 'local only');
        execSync('git add . && git commit -m "local work"', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git checkout main', { cwd: tmpDir, stdio: 'pipe' });

        const result = await detectGitInfo(tmpDir);
        expect(result.branches).toContain('main');
        expect(result.branches).not.toContain('local-experiment');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, maxRetries: 3, retryDelay: 200 });
        fs.rmSync(bareDir, { recursive: true, maxRetries: 3, retryDelay: 200 });
      }
    });

    // @ana A001, A002, A011
    it('excludes bot branches from branch list', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-botbranch-'));
      const bareDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-bare-bot-'));
      try {
        // Create a bare remote repo
        execSync('git init --bare', { cwd: bareDir, stdio: 'pipe' });

        // Create working repo
        execSync('git init -b main', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });
        fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'hello');
        execSync('git add . && git commit -m "init"', { cwd: tmpDir, stdio: 'pipe' });
        execSync(`git remote add origin ${bareDir}`, { cwd: tmpDir, stdio: 'pipe' });
        execSync('git push -u origin main', { cwd: tmpDir, stdio: 'pipe' });

        // Create and push bot branches + a human branch
        execSync('git checkout -b dependabot/npm/typescript-5.8', { cwd: tmpDir, stdio: 'pipe' });
        fs.writeFileSync(path.join(tmpDir, 'dep.txt'), 'dep update');
        execSync('git add . && git commit -m "bump typescript"', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git push origin dependabot/npm/typescript-5.8', { cwd: tmpDir, stdio: 'pipe' });

        execSync('git checkout main', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git checkout -b feature/add-auth', { cwd: tmpDir, stdio: 'pipe' });
        fs.writeFileSync(path.join(tmpDir, 'auth.txt'), 'auth');
        execSync('git add . && git commit -m "add auth"', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git push origin feature/add-auth', { cwd: tmpDir, stdio: 'pipe' });

        execSync('git checkout main', { cwd: tmpDir, stdio: 'pipe' });
        // Also create a local-only branch to confirm both filters work
        execSync('git checkout -b local-only-branch', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git checkout main', { cwd: tmpDir, stdio: 'pipe' });

        const result = await detectGitInfo(tmpDir);
        expect(result.branches).toContain('main');
        expect(result.branches).toContain('feature/add-auth');
        expect(result.branches).not.toContain('dependabot/npm/typescript-5.8');
        expect(result.branches).not.toContain('local-only-branch');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, maxRetries: 3, retryDelay: 200 });
        fs.rmSync(bareDir, { recursive: true, maxRetries: 3, retryDelay: 200 });
      }
    });
  });

  // @ana A005, A006, A007, A008
  describe('branchPatterns', () => {
    it('excludes bot prefixes from branchPatterns', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-botpattern-'));
      const bareDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-bare-pat-'));
      try {
        // Create bare remote
        execSync('git init --bare', { cwd: bareDir, stdio: 'pipe' });

        // Create working repo
        execSync('git init -b main', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
        execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });
        fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'hello');
        execSync('git add . && git commit -m "init"', { cwd: tmpDir, stdio: 'pipe' });
        execSync(`git remote add origin ${bareDir}`, { cwd: tmpDir, stdio: 'pipe' });
        execSync('git push -u origin main', { cwd: tmpDir, stdio: 'pipe' });

        // Push multiple bot branches (would dominate prefixes without filtering)
        for (const botName of ['dependabot/npm/pkg-a', 'dependabot/npm/pkg-b', 'dependabot/npm/pkg-c', 'renovate/eslint-9.x']) {
          execSync(`git checkout -b ${botName}`, { cwd: tmpDir, stdio: 'pipe' });
          fs.writeFileSync(path.join(tmpDir, `${botName.replace(/\//g, '-')}.txt`), 'bot');
          execSync(`git add . && git commit -m "bot: ${botName}"`, { cwd: tmpDir, stdio: 'pipe' });
          execSync(`git push origin ${botName}`, { cwd: tmpDir, stdio: 'pipe' });
          execSync('git checkout main', { cwd: tmpDir, stdio: 'pipe' });
        }

        // Push human branches
        for (const humanName of ['feature/auth', 'feature/payments']) {
          execSync(`git checkout -b ${humanName}`, { cwd: tmpDir, stdio: 'pipe' });
          fs.writeFileSync(path.join(tmpDir, `${humanName.replace(/\//g, '-')}.txt`), 'human');
          execSync(`git add . && git commit -m "feat: ${humanName}"`, { cwd: tmpDir, stdio: 'pipe' });
          execSync(`git push origin ${humanName}`, { cwd: tmpDir, stdio: 'pipe' });
          execSync('git checkout main', { cwd: tmpDir, stdio: 'pipe' });
        }

        const result = await detectGitInfo(tmpDir);

        // Bot prefixes excluded
        expect(result.branchPatterns?.prefixes).not.toHaveProperty('dependabot/');
        expect(result.branchPatterns?.prefixes).not.toHaveProperty('renovate/');

        // Human prefixes preserved
        expect(result.branchPatterns?.prefixes).toHaveProperty('feature/');
        expect(result.branchPatterns?.prefixes!['feature/']).toBe(2);

        // Primary is never a bot prefix
        expect(result.branchPatterns?.primary).toBe('feature/');
        expect(result.branchPatterns?.primary).not.toBe('dependabot/');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, maxRetries: 3, retryDelay: 200 });
        fs.rmSync(bareDir, { recursive: true, maxRetries: 3, retryDelay: 200 });
      }
    });
  });
});
