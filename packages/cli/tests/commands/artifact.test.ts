import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { saveArtifact, saveAllArtifacts } from '../../src/commands/artifact.js';

/**
 * Tests for `ana artifact save` command
 *
 * Uses temp directories with real git repos for isolation.
 */

describe('ana artifact save', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'artifact-test-'));
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

    // Initial commit (git needs at least one commit)
    execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });

    // Rename branch to match artifactBranch
    execSync(`git branch -M ${artifactBranch}`, { cwd: tempDir, stdio: 'ignore' });

    // Create feature branch if requested
    if (options.currentBranch && options.currentBranch !== artifactBranch) {
      execSync(`git checkout -b ${options.currentBranch}`, { cwd: tempDir, stdio: 'ignore' });
    }
  }

  /**
   * Helper to create an artifact file
   */
  async function createArtifact(slug: string, fileName: string, content: string = '# Test'): Promise<void> {
    const artifactPath = path.join(tempDir, '.ana', 'plans', 'active', slug);
    await fs.mkdir(artifactPath, { recursive: true });
    await fs.writeFile(path.join(artifactPath, fileName), content, 'utf-8');
  }

  /**
   * Helper to get the last commit message
   */
  function getLastCommitMessage(): string {
    return execSync('git log -1 --pretty=%B', { cwd: tempDir, encoding: 'utf-8' }).trim();
  }

  /**
   * Helper to check if a file is staged/committed
   */
  function isFileCommitted(filePath: string): boolean {
    try {
      execSync(`git ls-files --error-unmatch ${filePath}`, { cwd: tempDir, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  describe('type parsing', () => {
    it('parses scope type correctly', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'scope.md');

      saveArtifact('scope', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('[test-slug] Scope');
      expect(message).toContain('Co-authored-by: Ana <build@anatomia.dev>');
    });

    it('parses plan type correctly', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const validPlan = `# Plan: test

## Phases

- [ ] Phase 1
  - Spec: spec.md`;
      await createArtifact('test-slug', 'plan.md', validPlan);

      saveArtifact('plan', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('[test-slug] Plan');
    });

    it('parses spec type correctly', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'spec.md');

      saveArtifact('spec', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('[test-slug] Spec');
    });

    it('parses spec-N type correctly', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'spec-2.md');

      saveArtifact('spec-2', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('[test-slug] Spec 2');
    });

    it('parses build-report type correctly', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      await createArtifact('test-slug', 'build_report.md');

      saveArtifact('build-report', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('[test-slug] Build report');
    });

    it('parses build-report-N type correctly', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      await createArtifact('test-slug', 'build_report_2.md');

      saveArtifact('build-report-2', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('[test-slug] Build report 2');
    });

    it('parses verify-report type correctly', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      const validReport = `# Verify Report

**Result:** PASS

Content...`;
      await createArtifact('test-slug', 'verify_report.md', validReport);

      saveArtifact('verify-report', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('[test-slug] Verify report');
    });

    it('parses verify-report-N type correctly', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      const validReport = `# Verify Report

**Result:** PASS

Content...`;
      await createArtifact('test-slug', 'verify_report_3.md', validReport);

      saveArtifact('verify-report-3', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('[test-slug] Verify report 3');
    });

    it('rejects invalid type', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });

      expect(() => saveArtifact('invalid-type', 'test-slug')).toThrow();
    });
  });

  describe('branch validation', () => {
    it('allows scope save on artifact branch', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'scope.md');

      expect(() => saveArtifact('scope', 'test-slug')).not.toThrow();
    });

    it('rejects scope save on feature branch', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      await createArtifact('test-slug', 'scope.md');

      expect(() => saveArtifact('scope', 'test-slug')).toThrow();
    });

    it('allows build-report save on feature branch', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      await createArtifact('test-slug', 'build_report.md');

      expect(() => saveArtifact('build-report', 'test-slug')).not.toThrow();
    });

    it('rejects build-report save on artifact branch', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'build_report.md');

      expect(() => saveArtifact('build-report', 'test-slug')).toThrow();
    });

    it('allows verify-report save on feature branch', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      const validReport = `# Verify Report

**Result:** PASS`;
      await createArtifact('test-slug', 'verify_report.md', validReport);

      expect(() => saveArtifact('verify-report', 'test-slug')).not.toThrow();
    });

    it('rejects verify-report save on artifact branch', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'verify_report.md');

      expect(() => saveArtifact('verify-report', 'test-slug')).toThrow();
    });
  });

  describe('file validation', () => {
    it('rejects when file does not exist', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });

      expect(() => saveArtifact('scope', 'test-slug')).toThrow();
    });

    it('succeeds when file exists', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'scope.md');

      expect(() => saveArtifact('scope', 'test-slug')).not.toThrow();
    });
  });

  describe('git operations', () => {
    it('creates correct commit message format', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'scope.md');

      saveArtifact('scope', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toBe('[test-slug] Scope\n\nCo-authored-by: Ana <build@anatomia.dev>');
    });

    it('commits the artifact file', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'scope.md');

      saveArtifact('scope', 'test-slug');

      expect(isFileCommitted('.ana/plans/active/test-slug/scope.md')).toBe(true);
    });
  });

  describe('special cases', () => {
    it('verify-report save also stages plan.md if it exists', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      const validReport = `# Verify Report

**Result:** PASS`;
      await createArtifact('test-slug', 'verify_report.md', validReport);
      const validPlan = `# Plan

## Phases

- [x] Phase 1
  - Spec: spec.md`;
      await createArtifact('test-slug', 'plan.md', validPlan);

      saveArtifact('verify-report', 'test-slug');

      // Both files should be committed
      expect(isFileCommitted('.ana/plans/active/test-slug/verify_report.md')).toBe(true);
      expect(isFileCommitted('.ana/plans/active/test-slug/plan.md')).toBe(true);
    });

    it('verify-report save succeeds even if plan.md does not exist', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      const validReport = `# Verify Report

**Result:** PASS`;
      await createArtifact('test-slug', 'verify_report.md', validReport);

      expect(() => saveArtifact('verify-report', 'test-slug')).not.toThrow();
      expect(isFileCommitted('.ana/plans/active/test-slug/verify_report.md')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('errors gracefully when not a git repo', async () => {
      // Create directory without git init
      const anaDir = path.join(tempDir, '.ana');
      await fs.mkdir(anaDir, { recursive: true });
      await fs.writeFile(
        path.join(anaDir, '.meta.json'),
        JSON.stringify({ artifactBranch: 'main' }),
        'utf-8'
      );
      await createArtifact('test-slug', 'scope.md');

      expect(() => saveArtifact('scope', 'test-slug')).toThrow();
    });

    it('errors when no .meta.json exists', async () => {
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

      expect(() => saveArtifact('scope', 'test-slug')).toThrow();
    });

    it('errors when artifactBranch field is missing', async () => {
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

      const anaDir = path.join(tempDir, '.ana');
      await fs.mkdir(anaDir, { recursive: true });
      await fs.writeFile(
        path.join(anaDir, '.meta.json'),
        JSON.stringify({ version: '1.0.0' }),
        'utf-8'
      );

      expect(() => saveArtifact('scope', 'test-slug')).toThrow();
    });
  });

  describe('empty commit handling', () => {
    it('exits successfully when no changes to save', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'scope.md', '# Test Content');

      // First save
      saveArtifact('scope', 'test-slug');
      expect(isFileCommitted('.ana/plans/active/test-slug/scope.md')).toBe(true);

      // Second save without changes should exit gracefully
      expect(() => saveArtifact('scope', 'test-slug')).toThrow();
    });
  });

  describe('create vs update messages', () => {
    it('uses plain message for first save', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'scope.md');

      saveArtifact('scope', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('[test-slug] Scope');
      expect(message).not.toContain('Update:');
    });

    it('uses Update: prefix for re-save', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'scope.md', '# Original');

      // First save
      saveArtifact('scope', 'test-slug');

      // Modify and re-save
      await fs.writeFile(
        path.join(tempDir, '.ana/plans/active/test-slug/scope.md'),
        '# Modified',
        'utf-8'
      );
      saveArtifact('scope', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('[test-slug] Update: Scope');
    });
  });

  describe('plan format validation', () => {
    it('accepts valid plan.md', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const validPlan = `# Plan: test

## Phases

- [ ] Phase 1
  - Spec: spec.md`;
      await createArtifact('test-slug', 'plan.md', validPlan);

      expect(() => saveArtifact('plan', 'test-slug')).not.toThrow();
    });

    it('rejects plan.md without ## Phases heading', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const invalidPlan = `# Plan: test

- [ ] Phase 1
  - Spec: spec.md`;
      await createArtifact('test-slug', 'plan.md', invalidPlan);

      expect(() => saveArtifact('plan', 'test-slug')).toThrow();
    });

    it('rejects plan.md without checkboxes', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const invalidPlan = `# Plan: test

## Phases

Just a plain description`;
      await createArtifact('test-slug', 'plan.md', invalidPlan);

      expect(() => saveArtifact('plan', 'test-slug')).toThrow();
    });

    it('rejects plan.md with checkbox but no Spec reference', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const invalidPlan = `# Plan: test

## Phases

- [ ] Phase 1
  - Description: something`;
      await createArtifact('test-slug', 'plan.md', invalidPlan);

      expect(() => saveArtifact('plan', 'test-slug')).toThrow();
    });
  });

  describe('verify report validation', () => {
    it('accepts valid verify report with Result in first 10 lines', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      const validReport = `# Verify Report

**Result:** PASS

Other content...`;
      await createArtifact('test-slug', 'verify_report.md', validReport);

      expect(() => saveArtifact('verify-report', 'test-slug')).not.toThrow();
    });

    it('rejects verify report without Result line', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      const invalidReport = `# Verify Report

Some content without result`;
      await createArtifact('test-slug', 'verify_report.md', invalidReport);

      expect(() => saveArtifact('verify-report', 'test-slug')).toThrow();
    });

    it('rejects verify report with Result after line 10', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      const invalidReport = `# Verify Report

Line 2
Line 3
Line 4
Line 5
Line 6
Line 7
Line 8
Line 9
Line 10
Line 11
**Result:** PASS`;
      await createArtifact('test-slug', 'verify_report.md', invalidReport);

      expect(() => saveArtifact('verify-report', 'test-slug')).toThrow();
    });
  });

  describe('test-skeleton type', () => {
    it('parses test-skeleton type correctly', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'test_skeleton.ts', '// Test skeleton');

      saveArtifact('test-skeleton', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('[test-slug] Test skeleton');
      expect(isFileCommitted('.ana/plans/active/test-slug/test_skeleton.ts')).toBe(true);
    });
  });

  describe('coAuthor from config', () => {
    it('uses coAuthor from .meta.json when present', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });

      // Update .meta.json with custom coAuthor
      const metaPath = path.join(tempDir, '.ana', '.meta.json');
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      meta.coAuthor = 'Custom Bot <bot@example.com>';
      await fs.writeFile(metaPath, JSON.stringify(meta), 'utf-8');

      await createArtifact('test-slug', 'scope.md', '# Scope');
      saveArtifact('scope', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('Co-authored-by: Custom Bot <bot@example.com>');
    });

    it('falls back to default coAuthor when field missing', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'scope.md', '# Scope');

      saveArtifact('scope', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('Co-authored-by: Ana <build@anatomia.dev>');
    });
  });
});

describe('ana artifact save-all', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'save-all-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function createTestProject(): Promise<void> {
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(
      path.join(anaDir, '.meta.json'),
      JSON.stringify({ artifactBranch: 'main', coAuthor: 'Ana <build@anatomia.dev>' }),
      'utf-8'
    );

    execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git branch -M main', { cwd: tempDir, stdio: 'ignore' });
  }

  async function createArtifact(slug: string, fileName: string, content: string): Promise<void> {
    const artifactPath = path.join(tempDir, '.ana', 'plans', 'active', slug);
    await fs.mkdir(artifactPath, { recursive: true });
    await fs.writeFile(path.join(artifactPath, fileName), content, 'utf-8');
  }

  function getLastCommitMessage(): string {
    return execSync('git log -1 --pretty=%B', { cwd: tempDir, encoding: 'utf-8' }).trim();
  }

  it('saves all artifacts in single commit', async () => {
    await createTestProject();

    const validPlan = `# Plan
## Phases
- [ ] Phase 1
  - Spec: spec.md`;

    await createArtifact('test-slug', 'plan.md', validPlan);
    await createArtifact('test-slug', 'spec.md', '# Spec');
    await createArtifact('test-slug', 'test_skeleton.ts', '// test skeleton');

    saveAllArtifacts('test-slug');

    const message = getLastCommitMessage();
    expect(message).toContain('[test-slug] Save:');
    expect(message).toContain('Plan');
    expect(message).toContain('Spec');
    expect(message).toContain('Test skeleton');
  });

  it('saves partial artifacts when only some exist', async () => {
    await createTestProject();
    await createArtifact('test-slug', 'spec.md', '# Spec');

    saveAllArtifacts('test-slug');

    const message = getLastCommitMessage();
    expect(message).toContain('[test-slug] Save: Spec');
  });

  it('errors when directory is empty', async () => {
    await createTestProject();

    const slugDir = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug');
    await fs.mkdir(slugDir, { recursive: true });

    expect(() => saveAllArtifacts('test-slug')).toThrow();
  });

  it('errors when plan.md validation fails', async () => {
    await createTestProject();

    const invalidPlan = `# Plan\nNo phases section`;
    await createArtifact('test-slug', 'plan.md', invalidPlan);
    await createArtifact('test-slug', 'spec.md', '# Spec');

    expect(() => saveAllArtifacts('test-slug')).toThrow();
  });

  it('uses Update prefix for re-save', async () => {
    await createTestProject();

    await createArtifact('test-slug', 'spec.md', '# Spec');
    saveAllArtifacts('test-slug');

    // Modify and re-save
    await createArtifact('test-slug', 'spec.md', '# Spec Updated');
    saveAllArtifacts('test-slug');

    const message = getLastCommitMessage();
    expect(message).toContain('[test-slug] Update: Save: Spec');
  });
});
