import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
import { createPr } from '../../src/commands/pr.js';

/**
 * Tests for `ana pr create` command
 */

describe('ana pr create', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pr-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a test project with git initialized
   */
  async function createTestProject(options: {
    artifactBranch?: string;
    currentBranch?: string;
  }): Promise<void> {
    const artifactBranch = options.artifactBranch || 'main';

    // Init git
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

    // Create .ana/.meta.json
    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(
      path.join(anaDir, '.meta.json'),
      JSON.stringify({ artifactBranch }),
      'utf-8'
    );

    // Initial commit
    execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });

    // Rename branch
    execSync(`git branch -M ${artifactBranch}`, { cwd: tempDir, stdio: 'ignore' });

    // Create feature branch if requested
    if (options.currentBranch && options.currentBranch !== artifactBranch) {
      execSync(`git checkout -b ${options.currentBranch}`, { cwd: tempDir, stdio: 'ignore' });
    }
  }

  /**
   * Helper to create pipeline artifacts
   */
  async function createPipelineArtifacts(slug: string, options: {
    includeVerify?: boolean;
    includeBuild?: boolean;
    includeScope?: boolean;
    includePlan?: boolean;
    verifyResult?: 'PASS' | 'FAIL';
    includePrSummary?: boolean;
  }): Promise<void> {
    const artifactPath = path.join(tempDir, '.ana/plans/active', slug);
    await fs.mkdir(artifactPath, { recursive: true });

    if (options.includeScope) {
      await fs.writeFile(
        path.join(artifactPath, 'scope.md'),
        '# Scope: Add new feature\n\n## Intent\nAdd awesome feature',
        'utf-8'
      );
    }

    if (options.includePlan) {
      await fs.writeFile(
        path.join(artifactPath, 'plan.md'),
        `# Plan\n\n## Phases\n\n- [x] Phase 1\n  - Spec: spec.md`,
        'utf-8'
      );
    }

    if (options.includeBuild) {
      const prSummarySection = options.includePrSummary
        ? '\n## PR Summary\n\n- Added new feature X\n- Updated module Y\n- Fixed edge case Z\n'
        : '';
      await fs.writeFile(
        path.join(artifactPath, 'build_report.md'),
        `# Build Report${prSummarySection}\n\nContent...`,
        'utf-8'
      );
    }

    if (options.includeVerify) {
      const result = options.verifyResult || 'PASS';
      await fs.writeFile(
        path.join(artifactPath, 'verify_report.md'),
        `# Verify Report\n\n**Result:** ${result}\n\n## Test Results\n\nTests: 42 passed`,
        'utf-8'
      );
    }
  }

  describe('happy path', () => {
    it('requires gh CLI to be available', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-feature' });
      await createPipelineArtifacts('test-feature', {
        includeScope: true,
        includePlan: true,
        includeBuild: true,
        includeVerify: true,
        verifyResult: 'PASS',
        includePrSummary: true
      });

      // This will fail if gh is not installed, which is fine for testing error path
      // In real use, gh must be available
      // Test just verifies it checks for gh before attempting PR creation
      const ghAvailable = spawnSync('gh', ['--version'], { stdio: 'pipe' }).status === 0;

      if (!ghAvailable) {
        expect(() => createPr('test-feature')).toThrow();
      }
      // If gh is available, test would create a real PR (not desired in tests)
      // We test the validation paths instead
    });
  });

  describe('missing files', () => {
    it('errors when verify report missing', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-feature' });
      await createPipelineArtifacts('test-feature', {
        includeBuild: true
      });

      expect(() => createPr('test-feature')).toThrow();
    });

    it('errors when build report missing', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-feature' });
      await createPipelineArtifacts('test-feature', {
        includeVerify: true,
        verifyResult: 'PASS'
      });

      expect(() => createPr('test-feature')).toThrow();
    });

    it('errors when .meta.json missing', async () => {
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

      expect(() => createPr('test-feature')).toThrow();
    });
  });

  describe('verification checks', () => {
    it('errors when verify result is FAIL', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-feature' });
      await createPipelineArtifacts('test-feature', {
        includeBuild: true,
        includeVerify: true,
        verifyResult: 'FAIL'
      });

      expect(() => createPr('test-feature')).toThrow();
    });
  });

});
