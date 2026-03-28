import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { getWorkStatus } from '../../src/commands/work.js';

/**
 * Tests for `ana work status` command
 *
 * Uses temp directories with real git repos for isolation.
 */

describe('ana work status', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'work-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a test project with git and slugs
   */
  async function createWorkTestProject(options: {
    artifactBranch?: string;
    slugs?: Array<{
      slug: string;
      artifacts: string[];  // e.g., ['scope.md', 'plan.md', 'spec.md']
      planContent?: string; // custom plan.md content
      featureBranch?: boolean;
      featureArtifacts?: Array<{ file: string; content?: string }>;
    }>;
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
    execSync(`git branch -M ${artifactBranch}`, { cwd: tempDir, stdio: 'ignore' });

    // Create slug directories and artifacts
    if (options.slugs) {
      for (const slug of options.slugs) {
        const slugPath = path.join(tempDir, '.ana', 'plans', 'active', slug.slug);
        await fs.mkdir(slugPath, { recursive: true });

        for (const artifact of slug.artifacts) {
          let content = `# ${artifact}`;
          if (artifact === 'plan.md' && slug.planContent) {
            content = slug.planContent;
          }
          await fs.writeFile(path.join(slugPath, artifact), content, 'utf-8');
        }

        // Commit artifacts on artifact branch
        execSync('git add -A && git commit -m "add artifacts"', { cwd: tempDir, stdio: 'ignore' });

        // Create feature branch if requested
        if (slug.featureBranch) {
          execSync(`git checkout -b feature/${slug.slug}`, { cwd: tempDir, stdio: 'ignore' });

          if (slug.featureArtifacts) {
            for (const artifact of slug.featureArtifacts) {
              const content = artifact.content || `# ${artifact.file}`;
              await fs.writeFile(path.join(slugPath, artifact.file), content, 'utf-8');
            }
            execSync('git add -A && git commit -m "add feature artifacts"', { cwd: tempDir, stdio: 'ignore' });
          }

          execSync(`git checkout ${artifactBranch}`, { cwd: tempDir, stdio: 'ignore' });
        }
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
    fn();
    console.log = originalLog;
    return logs.join('\n');
  }

  describe('stage detection - single-spec', () => {
    it('scope only → ready-for-plan', async () => {
      await createWorkTestProject({
        slugs: [{
          slug: 'test-slug',
          artifacts: ['scope.md'],
        }],
      });

      const output = captureOutput(() => getWorkStatus({ json: false }));
      expect(output).toContain('ready-for-plan');
      expect(output).toContain('claude --agent ana-plan');
    });

    it('scope + spec (no plan) → ready-for-plan', async () => {
      await createWorkTestProject({
        slugs: [{
          slug: 'test-slug',
          artifacts: ['scope.md', 'spec.md'],
        }],
      });

      const output = captureOutput(() => getWorkStatus({ json: false }));
      expect(output).toContain('ready-for-plan');
    });

    it('scope + plan + spec (no feature branch) → ready-for-build', async () => {
      const planContent = `# Plan\n## Phases\n- [ ] Phase 1\n  Spec: spec.md`;
      await createWorkTestProject({
        slugs: [{
          slug: 'test-slug',
          artifacts: ['scope.md', 'plan.md', 'spec.md'],
          planContent,
        }],
      });

      const output = captureOutput(() => getWorkStatus({ json: false }));
      expect(output).toContain('ready-for-build');
      expect(output).toContain('claude --agent ana-build');
    });

    it('with feature branch, no build_report → build-in-progress', async () => {
      const planContent = `# Plan\n## Phases\n- [ ] Phase 1\n  Spec: spec.md`;
      await createWorkTestProject({
        slugs: [{
          slug: 'test-slug',
          artifacts: ['scope.md', 'plan.md', 'spec.md'],
          planContent,
          featureBranch: true,
        }],
      });

      const output = captureOutput(() => getWorkStatus({ json: false }));
      expect(output).toContain('build-in-progress');
      expect(output).toContain('git checkout feature/test-slug && claude --agent ana-build');
    });

    it('with feature branch + build_report → ready-for-verify', async () => {
      const planContent = `# Plan\n## Phases\n- [ ] Phase 1\n  Spec: spec.md`;
      await createWorkTestProject({
        slugs: [{
          slug: 'test-slug',
          artifacts: ['scope.md', 'plan.md', 'spec.md'],
          planContent,
          featureBranch: true,
          featureArtifacts: [{ file: 'build_report.md' }],
        }],
      });

      const output = captureOutput(() => getWorkStatus({ json: false }));
      expect(output).toContain('ready-for-verify');
      expect(output).toContain('git checkout feature/test-slug && claude --agent ana-verify');
    });

    it('with verify_report PASS → ready-to-merge', async () => {
      const planContent = `# Plan\n## Phases\n- [ ] Phase 1\n  Spec: spec.md`;
      const verifyContent = `# Verify Report\n\n**Result:** PASS`;
      await createWorkTestProject({
        slugs: [{
          slug: 'test-slug',
          artifacts: ['scope.md', 'plan.md', 'spec.md'],
          planContent,
          featureBranch: true,
          featureArtifacts: [
            { file: 'build_report.md' },
            { file: 'verify_report.md', content: verifyContent },
          ],
        }],
      });

      const output = captureOutput(() => getWorkStatus({ json: false }));
      expect(output).toContain('ready-to-merge');
      expect(output).toContain('ana work complete test-slug');
    });

    it('with verify_report FAIL → needs-fixes', async () => {
      const planContent = `# Plan\n## Phases\n- [ ] Phase 1\n  Spec: spec.md`;
      const verifyContent = `# Verify Report\n\n**Result:** FAIL`;
      await createWorkTestProject({
        slugs: [{
          slug: 'test-slug',
          artifacts: ['scope.md', 'plan.md', 'spec.md'],
          planContent,
          featureBranch: true,
          featureArtifacts: [
            { file: 'build_report.md' },
            { file: 'verify_report.md', content: verifyContent },
          ],
        }],
      });

      const output = captureOutput(() => getWorkStatus({ json: false }));
      expect(output).toContain('needs-fixes');
      expect(output).toContain('git checkout feature/test-slug && claude --agent ana-build');
    });

    it('with verify_report no Result line → verify-status-unknown', async () => {
      const planContent = `# Plan\n## Phases\n- [ ] Phase 1\n  Spec: spec.md`;
      const verifyContent = `# Verify Report\n\nLooks good to me!`;
      await createWorkTestProject({
        slugs: [{
          slug: 'test-slug',
          artifacts: ['scope.md', 'plan.md', 'spec.md'],
          planContent,
          featureBranch: true,
          featureArtifacts: [
            { file: 'build_report.md' },
            { file: 'verify_report.md', content: verifyContent },
          ],
        }],
      });

      const output = captureOutput(() => getWorkStatus({ json: false }));
      expect(output).toContain('verify-status-unknown');
    });
  });

  describe('stage detection - multi-spec', () => {
    it('plan + 3 specs, no feature branch → phase-1-ready-for-build', async () => {
      const planContent = `# Plan
## Phases
- [ ] Phase 1
  Spec: spec-1.md
- [ ] Phase 2
  Spec: spec-2.md
- [ ] Phase 3
  Spec: spec-3.md`;
      await createWorkTestProject({
        slugs: [{
          slug: 'test-slug',
          artifacts: ['scope.md', 'plan.md', 'spec-1.md', 'spec-2.md', 'spec-3.md'],
          planContent,
        }],
      });

      const output = captureOutput(() => getWorkStatus({ json: false }));
      expect(output).toContain('phase-1-ready-for-build');
    });

    it('with build_report_1, no verify_report_1 → phase-1-ready-for-verify', async () => {
      const planContent = `# Plan
## Phases
- [ ] Phase 1
  Spec: spec-1.md
- [ ] Phase 2
  Spec: spec-2.md`;
      await createWorkTestProject({
        slugs: [{
          slug: 'test-slug',
          artifacts: ['scope.md', 'plan.md', 'spec-1.md', 'spec-2.md'],
          planContent,
          featureBranch: true,
          featureArtifacts: [{ file: 'build_report_1.md' }],
        }],
      });

      const output = captureOutput(() => getWorkStatus({ json: false }));
      expect(output).toContain('phase-1-ready-for-verify');
    });

    it('verify_report_1 PASS, no build_report_2 → phase-2-ready-for-build', async () => {
      const planContent = `# Plan
## Phases
- [ ] Phase 1
  Spec: spec-1.md
- [ ] Phase 2
  Spec: spec-2.md`;
      const verifyContent = `# Verify\n\n**Result:** PASS`;
      await createWorkTestProject({
        slugs: [{
          slug: 'test-slug',
          artifacts: ['scope.md', 'plan.md', 'spec-1.md', 'spec-2.md'],
          planContent,
          featureBranch: true,
          featureArtifacts: [
            { file: 'build_report_1.md' },
            { file: 'verify_report_1.md', content: verifyContent },
          ],
        }],
      });

      const output = captureOutput(() => getWorkStatus({ json: false }));
      expect(output).toContain('phase-2-ready-for-build');
    });

    it('all verify_reports PASS → ready-to-merge', async () => {
      const planContent = `# Plan
## Phases
- [ ] Phase 1
  Spec: spec-1.md
- [ ] Phase 2
  Spec: spec-2.md`;
      const verifyContent = `# Verify\n\n**Result:** PASS`;
      await createWorkTestProject({
        slugs: [{
          slug: 'test-slug',
          artifacts: ['scope.md', 'plan.md', 'spec-1.md', 'spec-2.md'],
          planContent,
          featureBranch: true,
          featureArtifacts: [
            { file: 'build_report_1.md' },
            { file: 'verify_report_1.md', content: verifyContent },
            { file: 'build_report_2.md' },
            { file: 'verify_report_2.md', content: verifyContent },
          ],
        }],
      });

      const output = captureOutput(() => getWorkStatus({ json: false }));
      expect(output).toContain('ready-to-merge');
    });
  });

  describe('JSON output', () => {
    it('produces valid JSON with correct structure', async () => {
      const planContent = `# Plan\n## Phases\n- [ ] Phase 1\n  Spec: spec.md`;
      await createWorkTestProject({
        slugs: [{
          slug: 'test-slug',
          artifacts: ['scope.md', 'plan.md', 'spec.md'],
          planContent,
        }],
      });

      const output = captureOutput(() => getWorkStatus({ json: true }));
      const json = JSON.parse(output);

      expect(json).toHaveProperty('artifactBranch');
      expect(json).toHaveProperty('currentBranch');
      expect(json).toHaveProperty('onArtifactBranch');
      expect(json).toHaveProperty('items');
      expect(Array.isArray(json.items)).toBe(true);
      expect(json.items.length).toBe(1);

      const item = json.items[0];
      expect(item).toHaveProperty('slug', 'test-slug');
      expect(item).toHaveProperty('totalPhases', 1);
      expect(item).toHaveProperty('artifacts');
      expect(item).toHaveProperty('featureBranch');
      expect(item).toHaveProperty('stage');
      expect(item).toHaveProperty('nextAction');
    });
  });

  describe('multiple work items', () => {
    it('shows multiple slugs at different stages', async () => {
      const planContent = `# Plan\n## Phases\n- [ ] Phase 1\n  Spec: spec.md`;
      await createWorkTestProject({
        slugs: [
          {
            slug: 'item-1',
            artifacts: ['scope.md'],
          },
          {
            slug: 'item-2',
            artifacts: ['scope.md', 'plan.md', 'spec.md'],
            planContent,
          },
        ],
      });

      const output = captureOutput(() => getWorkStatus({ json: false }));
      expect(output).toContain('item-1');
      expect(output).toContain('item-2');
      expect(output).toContain('ready-for-plan');
      expect(output).toContain('ready-for-build');
    });
  });

  describe('edge cases', () => {
    it('handles empty plans/active directory', async () => {
      await createWorkTestProject({ slugs: [] });

      const output = captureOutput(() => getWorkStatus({ json: false }));
      expect(output).toContain('No active work');
    });

    it('errors when no .meta.json exists', async () => {
      // Create temp dir with git but no .ana/
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

      expect(() => getWorkStatus({ json: false })).toThrow();
    });
  });
});
