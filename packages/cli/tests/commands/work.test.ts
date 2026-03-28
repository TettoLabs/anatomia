import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { getWorkStatus, completeWork } from '../../src/commands/work.js';

/**
 * Tests for `ana work status` and `ana work complete` commands
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

  describe('ana work complete', () => {
    /**
     * Helper to create a merged project scenario
     */
    async function createMergedProject(options: {
      slug: string;
      phases?: number;
      verifyResults?: string[];
      merged?: boolean;
      branchDeleted?: boolean;
    }): Promise<void> {
      const phases = options.phases || 1;
      const verifyResults = options.verifyResults || Array(phases).fill('PASS');
      const merged = options.merged !== false;
      const slug = options.slug;

      // Init git
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

      // Create .ana/.meta.json
      const anaDir = path.join(tempDir, '.ana');
      await fs.mkdir(anaDir, { recursive: true });
      await fs.writeFile(
        path.join(anaDir, '.meta.json'),
        JSON.stringify({ artifactBranch: 'main' }),
        'utf-8'
      );

      // Initial commit
      execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git branch -M main', { cwd: tempDir, stdio: 'ignore' });

      // Create slug directory with artifacts on main
      const slugPath = path.join(tempDir, '.ana', 'plans', 'active', slug);
      await fs.mkdir(slugPath, { recursive: true });

      // Create scope and plan
      await fs.writeFile(path.join(slugPath, 'scope.md'), '# Scope', 'utf-8');

      let planContent = '# Plan\n## Phases\n';
      const specs: string[] = [];
      for (let i = 0; i < phases; i++) {
        const phaseNum = i + 1;
        const specFile = phases === 1 ? 'spec.md' : `spec-${phaseNum}.md`;
        specs.push(specFile);
        planContent += `- [ ] Phase ${phaseNum}\n  Spec: ${specFile}\n`;
        await fs.writeFile(path.join(slugPath, specFile), `# Spec ${phaseNum}`, 'utf-8');
      }
      await fs.writeFile(path.join(slugPath, 'plan.md'), planContent, 'utf-8');

      execSync('git add -A && git commit -m "add planning"', { cwd: tempDir, stdio: 'ignore' });

      // Create feature branch
      execSync(`git checkout -b feature/${slug}`, { cwd: tempDir, stdio: 'ignore' });

      // Add build and verify reports
      for (let i = 0; i < phases; i++) {
        const phaseNum = i + 1;
        const buildFile = phases === 1 ? 'build_report.md' : `build_report_${phaseNum}.md`;
        const verifyFile = phases === 1 ? 'verify_report.md' : `verify_report_${phaseNum}.md`;

        await fs.writeFile(path.join(slugPath, buildFile), '# Build Report', 'utf-8');
        await fs.writeFile(
          path.join(slugPath, verifyFile),
          `# Verify Report\n\n**Result:** ${verifyResults[i]}`,
          'utf-8'
        );
      }

      execSync('git add -A && git commit -m "add reports"', { cwd: tempDir, stdio: 'ignore' });

      // Merge to main if requested
      if (merged) {
        execSync('git checkout main', { cwd: tempDir, stdio: 'ignore' });
        execSync(`git merge --no-ff feature/${slug} -m "merge"`, { cwd: tempDir, stdio: 'ignore' });

        // Delete branch if requested
        if (options.branchDeleted) {
          execSync(`git branch -d feature/${slug}`, { cwd: tempDir, stdio: 'ignore' });
        }
      } else {
        // Go back to main but don't merge
        execSync('git checkout main', { cwd: tempDir, stdio: 'ignore' });
      }
    }

    describe('happy path', () => {
      it('completes single-spec work with PASS', async () => {
        await createMergedProject({ slug: 'test-slug', phases: 1 });

        await completeWork('test-slug');

        // Verify directory moved
        const activePath = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug');
        const completedPath = path.join(tempDir, '.ana', 'plans', 'completed', 'test-slug');
        expect(fsSync.existsSync(activePath)).toBe(false);
        expect(fsSync.existsSync(completedPath)).toBe(true);

        // Verify all files present
        expect(fsSync.existsSync(path.join(completedPath, 'scope.md'))).toBe(true);
        expect(fsSync.existsSync(path.join(completedPath, 'plan.md'))).toBe(true);
        expect(fsSync.existsSync(path.join(completedPath, 'spec.md'))).toBe(true);
        expect(fsSync.existsSync(path.join(completedPath, 'build_report.md'))).toBe(true);
        expect(fsSync.existsSync(path.join(completedPath, 'verify_report.md'))).toBe(true);
      });

      it('completes multi-spec work (3 phases) with all PASS', async () => {
        await createMergedProject({ slug: 'test-slug', phases: 3 });

        await completeWork('test-slug');

        const completedPath = path.join(tempDir, '.ana', 'plans', 'completed', 'test-slug');
        expect(fsSync.existsSync(completedPath)).toBe(true);
        expect(fsSync.existsSync(path.join(completedPath, 'verify_report_1.md'))).toBe(true);
        expect(fsSync.existsSync(path.join(completedPath, 'verify_report_2.md'))).toBe(true);
        expect(fsSync.existsSync(path.join(completedPath, 'verify_report_3.md'))).toBe(true);
      });

      it('succeeds even if feature branch was already deleted', async () => {
        await createMergedProject({ slug: 'test-slug', phases: 1, branchDeleted: true });

        await completeWork('test-slug');

        const completedPath = path.join(tempDir, '.ana', 'plans', 'completed', 'test-slug');
        expect(fsSync.existsSync(completedPath)).toBe(true);
      });
    });

    describe('branch validation', () => {
      it('errors when not on artifact branch', async () => {
        await createMergedProject({ slug: 'test-slug', merged: false });
        execSync('git checkout feature/test-slug', { cwd: tempDir, stdio: 'ignore' });

        await expect(completeWork('test-slug')).rejects.toThrow();
      });

      it('succeeds when on artifact branch', async () => {
        await createMergedProject({ slug: 'test-slug', phases: 1 });

        await expect(completeWork('test-slug')).resolves.not.toThrow();
      });
    });

    describe('slug validation', () => {
      it('errors when slug not in active', async () => {
        await createMergedProject({ slug: 'other-slug', phases: 1 });

        await expect(completeWork('nonexistent')).rejects.toThrow();
      });

      it('exits successfully when slug already completed', async () => {
        await createMergedProject({ slug: 'test-slug', phases: 1 });

        // Complete once
        await completeWork('test-slug');

        // Try to complete again - will exit(0) which throws in tests
        // Just verify it throws (exit throws in test environment)
        await expect(completeWork('test-slug')).rejects.toThrow();
      });
    });

    describe('merge validation', () => {
      it('errors when feature branch not merged', async () => {
        await createMergedProject({ slug: 'test-slug', merged: false });

        await expect(completeWork('test-slug')).rejects.toThrow();
      });
    });

    describe('verify report validation', () => {
      it('errors when verify report missing', async () => {
        await createMergedProject({ slug: 'test-slug', phases: 1 });

        // Delete verify report
        const slugPath = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug');
        await fs.rm(path.join(slugPath, 'verify_report.md'));

        await expect(completeWork('test-slug')).rejects.toThrow();
      });

      it('errors when verify report shows FAIL', async () => {
        await createMergedProject({ slug: 'test-slug', phases: 1, verifyResults: ['FAIL'] });

        await expect(completeWork('test-slug')).rejects.toThrow();
      });

      it('errors when verify report has no Result line', async () => {
        await createMergedProject({ slug: 'test-slug', phases: 1 });

        const slugPath = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug');
        await fs.writeFile(path.join(slugPath, 'verify_report.md'), '# Verify\n\nLooks good!', 'utf-8');

        await expect(completeWork('test-slug')).rejects.toThrow();
      });

      it('errors when multi-spec phase 2 has no verify report', async () => {
        await createMergedProject({ slug: 'test-slug', phases: 3 });

        // Delete phase 2 verify report
        const slugPath = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug');
        await fs.rm(path.join(slugPath, 'verify_report_2.md'));

        await expect(completeWork('test-slug')).rejects.toThrow();
      });

      it('errors when multi-spec phase 1 shows FAIL', async () => {
        await createMergedProject({ slug: 'test-slug', phases: 2, verifyResults: ['FAIL', 'PASS'] });

        await expect(completeWork('test-slug')).rejects.toThrow();
      });

      it('succeeds when all phases show PASS', async () => {
        await createMergedProject({ slug: 'test-slug', phases: 2, verifyResults: ['PASS', 'PASS'] });

        await completeWork('test-slug');

        const completedPath = path.join(tempDir, '.ana', 'plans', 'completed', 'test-slug');
        expect(fsSync.existsSync(completedPath)).toBe(true);
      });
    });

    describe('git operations', () => {
      it('creates correct commit message', async () => {
        await createMergedProject({ slug: 'test-slug', phases: 1 });

        await completeWork('test-slug');

        const message = execSync('git log -1 --pretty=%B', { cwd: tempDir, encoding: 'utf-8' }).trim();
        expect(message).toBe('[test-slug] Complete — archived to plans/completed\n\nCo-authored-by: Ana <build@anatomia.dev>');
      });
    });

    describe('edge cases', () => {
      it('errors when no plan.md exists', async () => {
        await createMergedProject({ slug: 'test-slug', phases: 1 });

        const slugPath = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug');
        await fs.rm(path.join(slugPath, 'plan.md'));

        await expect(completeWork('test-slug')).rejects.toThrow();
      });

      it('errors when not a git repo', async () => {
        // Create temp dir without git
        const anaDir = path.join(tempDir, '.ana');
        await fs.mkdir(anaDir, { recursive: true });
        await fs.writeFile(
          path.join(anaDir, '.meta.json'),
          JSON.stringify({ artifactBranch: 'main' }),
          'utf-8'
        );

        await expect(completeWork('test-slug')).rejects.toThrow();
      });
    });
  });
});
