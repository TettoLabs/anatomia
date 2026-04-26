import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
    branchPrefix?: string;
  }): Promise<void> {
    const artifactBranch = options.artifactBranch || 'main';
    const branchPrefix = options.branchPrefix;

    // Init git
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

    // Create .ana/ana.json
    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(
      path.join(anaDir, 'ana.json'),
      JSON.stringify({ artifactBranch, ...(branchPrefix !== undefined && { branchPrefix }) }),
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
  /**
   * Create valid scope content that passes validation
   */
  function getValidScopeContent(): string {
    return `# Scope: test

## Intent
This is a test scope.

## Acceptance Criteria
- AC1: First criterion
- AC2: Second criterion
- AC3: Third criterion

### Structural Analog
work.ts — similar pattern`;
  }

  /**
   * Create valid spec content that passes validation
   */
  function getValidSpecContent(): string {
    return `# Spec: test

## Implementation
Details here.

file_changes:
  - path: src/test.ts
    action: create

## Build Brief
Rules that apply.`;
  }


  /**
   * Create valid build report content that passes validation
   */
  function getValidBuildReportContent(): string {
    return `# Build Report

## Deviations
None.

## Open Issues
None.

## Acceptance Criteria
All met.

## PR Summary
Ready to review.`;
  }

  async function createArtifact(slug: string, fileName: string, content?: string): Promise<void> {
    const artifactPath = path.join(tempDir, '.ana', 'plans', 'active', slug);
    await fs.mkdir(artifactPath, { recursive: true });

    // Use validation-compliant defaults
    let fileContent = content;
    if (!fileContent) {
      if (fileName === 'scope.md') {
        fileContent = getValidScopeContent();
      } else if (fileName === 'spec.md' || fileName.match(/^spec-\d+\.md$/)) {
        fileContent = getValidSpecContent();
      } else if (fileName.startsWith('build_report')) {
        fileContent = getValidBuildReportContent();
      } else {
        fileContent = '# Test';
      }
    }

    await fs.writeFile(path.join(artifactPath, fileName), fileContent, 'utf-8');
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

  describe('configurable branchPrefix', () => {
    // @ana A014
    it('artifact save error uses configured prefix in checkout hint', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main', branchPrefix: 'dev/' });
      await createArtifact('test-slug', 'build_report.md');

      const originalError = console.error;
      const errors: string[] = [];
      console.error = (...args: unknown[]) => { errors.push(args.join(' ')); };

      expect(() => saveArtifact('build-report', 'test-slug')).toThrow();

      console.error = originalError;
      const errorOutput = errors.join('\n');
      expect(errorOutput).toContain('dev/test-slug');
      expect(errorOutput).not.toContain('feature/test-slug');
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
        path.join(anaDir, 'ana.json'),
        JSON.stringify({ artifactBranch: 'main' }),
        'utf-8'
      );
      await createArtifact('test-slug', 'scope.md');

      expect(() => saveArtifact('scope', 'test-slug')).toThrow();
    });

    it('errors when no ana.json exists', async () => {
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
        path.join(anaDir, 'ana.json'),
        JSON.stringify({ version: '1.0.0' }),
        'utf-8'
      );

      expect(() => saveArtifact('scope', 'test-slug')).toThrow();
    });
  });

  describe('empty commit handling', () => {
    it('exits successfully when no changes to save', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'scope.md'); // Uses valid default

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
      await createArtifact('test-slug', 'scope.md'); // Uses valid default

      // First save
      saveArtifact('scope', 'test-slug');

      // Modify and re-save
      await fs.writeFile(
        path.join(tempDir, '.ana/plans/active/test-slug/scope.md'),
        getValidScopeContent().replace('This is a test scope', 'Modified scope'),
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

  describe('scope format validation', () => {
    it('accepts valid scope with 3+ ACs and Structural Analog', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const validScope = `# Scope: test

## Intent
This adds a new feature.

## Acceptance Criteria
- AC1: First criterion
- AC2: Second criterion
- AC3: Third criterion

### Structural Analog
work.ts — similar command pattern`;
      await createArtifact('test-slug', 'scope.md', validScope);

      expect(() => saveArtifact('scope', 'test-slug')).not.toThrow();
    });

    it('rejects scope without sufficient ACs', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const invalidScope = `# Scope: test

## Intent
This adds a feature.

## Acceptance Criteria
- AC1: First criterion

### Structural Analog
work.ts`;
      await createArtifact('test-slug', 'scope.md', invalidScope);

      expect(() => saveArtifact('scope', 'test-slug')).toThrow();
    });

    it('rejects scope without Structural Analog', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const invalidScope = `# Scope: test

## Intent
This adds a feature.

## Acceptance Criteria
- AC1: First
- AC2: Second
- AC3: Third`;
      await createArtifact('test-slug', 'scope.md', invalidScope);

      expect(() => saveArtifact('scope', 'test-slug')).toThrow();
    });

    it('rejects scope with empty Intent', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const invalidScope = `# Scope: test

## Intent

## Acceptance Criteria
- AC1: First
- AC2: Second
- AC3: Third

### Structural Analog
work.ts`;
      await createArtifact('test-slug', 'scope.md', invalidScope);

      expect(() => saveArtifact('scope', 'test-slug')).toThrow();
    });
  });

  describe('spec format validation', () => {
    it('accepts valid spec with file_changes and Build Brief', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const validSpec = `# Spec

## Implementation
Details here.

<!-- MACHINE-READABLE -->
\`\`\`yaml
file_changes:
  - path: src/test.ts
    action: create
\`\`\`

## Build Brief
Rules that apply.`;
      await createArtifact('test-slug', 'spec.md', validSpec);

      expect(() => saveArtifact('spec', 'test-slug')).not.toThrow();
    });

    it('saves spec without file_changes YAML block', async () => {
      // S8: file_changes moved to contract.yaml - no longer required in spec
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const specWithoutFileChanges = `# Spec

## Implementation
Details here.

## Build Brief
Rules.`;
      await createArtifact('test-slug', 'spec.md', specWithoutFileChanges);

      expect(() => saveArtifact('spec', 'test-slug')).not.toThrow();
    });

    it('rejects spec without Build Brief', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const invalidSpec = `# Spec

Implementation details only.`;
      await createArtifact('test-slug', 'spec.md', invalidSpec);

      expect(() => saveArtifact('spec', 'test-slug')).toThrow();
    });
  });


  describe('build-report format validation', () => {
    it('accepts valid build report with all sections', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      const validReport = `# Build Report

## Deviations from Spec
None.

## Open Issues
None.

## Acceptance Criteria
All met.

## PR Summary
Ready to review.`;
      await createArtifact('test-slug', 'build_report.md', validReport);

      expect(() => saveArtifact('build-report', 'test-slug')).not.toThrow();
    });

    it('rejects build report without Deviations', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      const invalidReport = `# Build Report

## Open Issues
None.`;
      await createArtifact('test-slug', 'build_report.md', invalidReport);

      expect(() => saveArtifact('build-report', 'test-slug')).toThrow();
    });

    it('rejects build report without Open Issues', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      const invalidReport = `# Build Report

## Deviations
None.`;
      await createArtifact('test-slug', 'build_report.md', invalidReport);

      expect(() => saveArtifact('build-report', 'test-slug')).toThrow();
    });

    it('rejects build report without AC Coverage', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      const invalidReport = `# Build Report

## Deviations
None.

## Open Issues
None.

## PR Summary
Done.`;
      await createArtifact('test-slug', 'build_report.md', invalidReport);

      expect(() => saveArtifact('build-report', 'test-slug')).toThrow();
    });

    it('rejects build report without PR Summary', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });
      const invalidReport = `# Build Report

## Deviations
None.

## Open Issues
None.

## Acceptance Criteria
Met.`;
      await createArtifact('test-slug', 'build_report.md', invalidReport);

      expect(() => saveArtifact('build-report', 'test-slug')).toThrow();
    });
  });


  describe('coAuthor from config', () => {
    it('uses coAuthor from ana.json when present', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });

      // Update ana.json with custom coAuthor
      const anaJsonPath = path.join(tempDir, '.ana', 'ana.json');
      const meta = JSON.parse(await fs.readFile(anaJsonPath, 'utf-8'));
      meta.coAuthor = 'Custom Bot <bot@example.com>';
      await fs.writeFile(anaJsonPath, JSON.stringify(meta), 'utf-8');

      await createArtifact('test-slug', 'scope.md'); // Uses valid default
      saveArtifact('scope', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('Co-authored-by: Custom Bot <bot@example.com>');
    });

    it('falls back to default coAuthor when field missing', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'scope.md'); // Uses valid default

      saveArtifact('scope', 'test-slug');

      const message = getLastCommitMessage();
      expect(message).toContain('Co-authored-by: Ana <build@anatomia.dev>');
    });
  });

  describe('contract validation', () => {
    /**
     * Create valid contract content that passes validation
     */
    function getValidContractContent(): string {
      return `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"

assertions:
  - id: A001
    says: "Creating a payment returns success"
    block: "creates payment intent"
    target: "response.status"
    matcher: "equals"
    value: 200
  - id: A002
    says: "Response includes data"
    block: "response has body"
    target: "response.body"
    matcher: "exists"

file_changes:
  - path: "src/test.ts"
    action: create`;
    }

    it('accepts valid contract', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'contract.yaml', getValidContractContent());

      expect(() => saveArtifact('contract', 'test-slug')).not.toThrow();
      expect(isFileCommitted('.ana/plans/active/test-slug/contract.yaml')).toBe(true);
    });

    it('rejects unknown matcher', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const invalidContract = getValidContractContent().replace('matcher: "equals"', 'matcher: "resembles"');
      await createArtifact('test-slug', 'contract.yaml', invalidContract);

      expect(() => saveArtifact('contract', 'test-slug')).toThrow();
    });

    it('rejects missing says field', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const invalidContract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"

assertions:
  - id: A001
    block: "test block"
    target: "test.target"
    matcher: "equals"
    value: 200

file_changes:
  - path: "src/test.ts"
    action: create`;
      await createArtifact('test-slug', 'contract.yaml', invalidContract);

      expect(() => saveArtifact('contract', 'test-slug')).toThrow();
    });

    it('rejects duplicate assertion IDs', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const invalidContract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"

assertions:
  - id: A001
    says: "First assertion"
    block: "test block"
    target: "test.target"
    matcher: "equals"
    value: 200
  - id: A001
    says: "Second assertion same ID"
    block: "test block"
    target: "test.target2"
    matcher: "exists"

file_changes:
  - path: "src/test.ts"
    action: create`;
      await createArtifact('test-slug', 'contract.yaml', invalidContract);

      expect(() => saveArtifact('contract', 'test-slug')).toThrow();
    });

    it('rejects empty assertions array', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const invalidContract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"

assertions: []

file_changes:
  - path: "src/test.ts"
    action: create`;
      await createArtifact('test-slug', 'contract.yaml', invalidContract);

      expect(() => saveArtifact('contract', 'test-slug')).toThrow();
    });

    it('requires value for equals matcher', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const invalidContract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"

assertions:
  - id: A001
    says: "Equals without value"
    block: "test block"
    target: "test.target"
    matcher: "equals"

file_changes:
  - path: "src/test.ts"
    action: create`;
      await createArtifact('test-slug', 'contract.yaml', invalidContract);

      expect(() => saveArtifact('contract', 'test-slug')).toThrow();
    });

    it('does not require value for exists matcher', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const validContract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"

assertions:
  - id: A001
    says: "Exists without value"
    block: "test block"
    target: "test.target"
    matcher: "exists"

file_changes:
  - path: "src/test.ts"
    action: create`;
      await createArtifact('test-slug', 'contract.yaml', validContract);

      expect(() => saveArtifact('contract', 'test-slug')).not.toThrow();
    });

    it('accepts not_contains matcher with value', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const validContract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"

assertions:
  - id: A001
    says: "Error message does not contain debug info"
    block: "error handling"
    target: "error.message"
    matcher: "not_contains"
    value: "DEBUG"

file_changes:
  - path: "src/test.ts"
    action: create`;
      await createArtifact('test-slug', 'contract.yaml', validContract);

      expect(() => saveArtifact('contract', 'test-slug')).not.toThrow();
      expect(isFileCommitted('.ana/plans/active/test-slug/contract.yaml')).toBe(true);
    });

    it('rejects not_contains matcher without value', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const invalidContract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"

assertions:
  - id: A001
    says: "Not contains without value"
    block: "test block"
    target: "test.target"
    matcher: "not_contains"

file_changes:
  - path: "src/test.ts"
    action: create`;
      await createArtifact('test-slug', 'contract.yaml', invalidContract);

      expect(() => saveArtifact('contract', 'test-slug')).toThrow();
    });

    it('rejects missing file_changes', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const invalidContract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"

assertions:
  - id: A001
    says: "Test assertion"
    block: "test block"
    target: "test.target"
    matcher: "exists"`;
      await createArtifact('test-slug', 'contract.yaml', invalidContract);

      expect(() => saveArtifact('contract', 'test-slug')).toThrow();
    });

    it('writes .saves.json entry for contract', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'contract.yaml', getValidContractContent());

      saveArtifact('contract', 'test-slug');

      const savesPath = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug', '.saves.json');
      const saves = JSON.parse(await fs.readFile(savesPath, 'utf-8'));
      expect(saves.contract).toBeDefined();
      expect(saves.contract.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
  });

  describe('auto pre-check on verify-report save', () => {
    /**
     * Create valid contract content
     */
    function getValidContractContent(): string {
      return `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"

assertions:
  - id: A001
    says: "Test passes"
    block: "test"
    target: "result"
    matcher: "truthy"

file_changes:
  - path: "src/test.ts"
    action: create`;
    }

    /**
     * Create valid verify report content
     */
    function getValidVerifyReport(): string {
      return `# Verify Report

**Result:** PASS

All good.`;
    }

    it('blocks save when contract is tampered', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });

      // Create contract and save it (creates .saves.json)
      const contractContent = getValidContractContent();
      await createArtifact('test-slug', 'contract.yaml', contractContent);
      execSync('git add -A && git commit -m "contract"', { cwd: tempDir, stdio: 'ignore' });

      // Write .saves.json with the contract hash
      const hash = `sha256:${createHash('sha256').update(contractContent).digest('hex')}`;
      const savesPath = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug', '.saves.json');
      await fs.writeFile(savesPath, JSON.stringify({
        contract: {
          saved_at: new Date().toISOString(),
          hash,
        }
      }), 'utf-8');

      // Modify the contract (tamper)
      await fs.writeFile(
        path.join(tempDir, '.ana/plans/active/test-slug/contract.yaml'),
        getValidContractContent().replace('Test passes', 'MODIFIED'),
        'utf-8'
      );

      // Try to save verify report - should fail
      await createArtifact('test-slug', 'verify_report.md', getValidVerifyReport());

      expect(() => saveArtifact('verify-report', 'test-slug')).toThrow();
    });

    it('warns on uncovered assertions but saves', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });

      // Create contract with 2 assertions
      const contractWithTwo = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"

assertions:
  - id: A001
    says: "First assertion"
    block: "test"
    target: "result"
    matcher: "truthy"
  - id: A002
    says: "Second assertion"
    block: "test"
    target: "result"
    matcher: "truthy"

file_changes:
  - path: "src/test.ts"
    action: create`;

      await createArtifact('test-slug', 'contract.yaml', contractWithTwo);
      execSync('git add -A && git commit -m "contract"', { cwd: tempDir, stdio: 'ignore' });

      const hash = `sha256:${createHash('sha256').update(contractWithTwo).digest('hex')}`;
      const savesPath = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug', '.saves.json');
      await fs.writeFile(savesPath, JSON.stringify({
        contract: {
          saved_at: new Date().toISOString(),
          hash,
        }
      }), 'utf-8');

      // Create test file covering only A001
      const testPath = path.join(tempDir, 'tests', 'test.test.ts');
      await fs.mkdir(path.dirname(testPath), { recursive: true });
      await fs.writeFile(testPath, '// @ana A001\ntest()', 'utf-8');

      // Create verify report
      await createArtifact('test-slug', 'verify_report.md', getValidVerifyReport());

      // Should save but warn (capture stdout/stderr)
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (...args: unknown[]) => {
        warnings.push(args.map(String).join(' '));
      };

      try {
        saveArtifact('verify-report', 'test-slug');
      } finally {
        console.warn = originalWarn;
      }

      expect(warnings.some(w => w.includes('UNCOVERED'))).toBe(true);
      expect(isFileCommitted('.ana/plans/active/test-slug/verify_report.md')).toBe(true);
    });

    it('stores pre-check results in .saves.json', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'feature/test-slug' });

      const contractContent = getValidContractContent();
      await createArtifact('test-slug', 'contract.yaml', contractContent);
      execSync('git add -A && git commit -m "contract"', { cwd: tempDir, stdio: 'ignore' });

      const hash = `sha256:${createHash('sha256').update(contractContent).digest('hex')}`;
      const savesPath = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug', '.saves.json');
      await fs.writeFile(savesPath, JSON.stringify({
        contract: {
          saved_at: new Date().toISOString(),
          hash,
        }
      }), 'utf-8');

      await createArtifact('test-slug', 'verify_report.md', getValidVerifyReport());
      saveArtifact('verify-report', 'test-slug');

      // Read .saves.json and verify pre-check key exists
      const saves = JSON.parse(await fs.readFile(savesPath, 'utf-8'));
      expect(saves['pre-check']).toBeDefined();
      expect(saves['pre-check'].seal).toBe('INTACT');
      expect(saves['pre-check'].assertions).toBeDefined();
      expect(saves['pre-check'].run_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('.saves.json metadata', () => {
    it('writes .saves.json with save metadata', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'scope.md');

      saveArtifact('scope', 'test-slug');

      // Read .saves.json
      const savesPath = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug', '.saves.json');
      expect(await fs.stat(savesPath).catch(() => null)).not.toBeNull();

      const saves = JSON.parse(await fs.readFile(savesPath, 'utf-8'));
      expect(saves.scope).toBeDefined();
      expect(saves.scope.saved_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(saves.scope.commit).toBeUndefined();
      expect(saves.scope.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('appends to existing .saves.json on subsequent saves', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'scope.md');
      await createArtifact('test-slug', 'spec.md');

      // Save scope first
      saveArtifact('scope', 'test-slug');

      const savesPath = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug', '.saves.json');
      const savesAfterScope = JSON.parse(await fs.readFile(savesPath, 'utf-8'));
      expect(savesAfterScope.scope).toBeDefined();
      const scopeCommit = savesAfterScope.scope.commit;

      // Save spec second
      saveArtifact('spec', 'test-slug');

      const savesAfterSpec = JSON.parse(await fs.readFile(savesPath, 'utf-8'));
      expect(savesAfterSpec.scope).toBeDefined();
      expect(savesAfterSpec.spec).toBeDefined();
      // Scope entry should be unchanged
      expect(savesAfterSpec.scope.commit).toBe(scopeCommit);
    });

    it('overwrites entry on re-save of same type', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      await createArtifact('test-slug', 'scope.md');

      saveArtifact('scope', 'test-slug');

      const savesPath = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug', '.saves.json');
      const savesFirst = JSON.parse(await fs.readFile(savesPath, 'utf-8'));
      const firstHash = savesFirst.scope.hash;
      const firstSavedAt = savesFirst.scope.saved_at;

      // Modify and re-save
      await fs.writeFile(
        path.join(tempDir, '.ana/plans/active/test-slug/scope.md'),
        getValidScopeContent().replace('This is a test scope', 'Modified scope content'),
        'utf-8'
      );

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      saveArtifact('scope', 'test-slug');

      const savesSecond = JSON.parse(await fs.readFile(savesPath, 'utf-8'));
      expect(savesSecond.scope.hash).not.toBe(firstHash);
      expect(savesSecond.scope.saved_at).not.toBe(firstSavedAt);
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
      path.join(anaDir, 'ana.json'),
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

  function isFileCommitted(filePath: string): boolean {
    try {
      execSync(`git ls-files --error-unmatch ${filePath}`, { cwd: tempDir, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper to capture errors from functions that call process.exit
   */
  function captureError(fn: () => void): string {
    const originalExit = process.exit;
    const originalError = console.error;
    const errors: string[] = [];

    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    };

    process.exit = ((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as typeof process.exit;

    try {
      fn();
      return errors.join('\n'); // Return captured errors even if no exit
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('process.exit')) {
        return errors.join('\n');
      }
      throw error;
    } finally {
      console.error = originalError;
      process.exit = originalExit;
    }
  }

  it('saves all artifacts in single commit', async () => {
    await createTestProject();

    const validPlan = `# Plan
## Phases
- [ ] Phase 1
  - Spec: spec.md`;

    const validSpec = `# Spec
file_changes:
  - path: test.ts
    action: create
## Build Brief
Rules.`;

    await createArtifact('test-slug', 'plan.md', validPlan);
    await createArtifact('test-slug', 'spec.md', validSpec);

    saveAllArtifacts('test-slug');

    const message = getLastCommitMessage();
    expect(message).toContain('[test-slug] Save:');
    expect(message).toContain('Plan');
    expect(message).toContain('Spec');
  });

  it('saves partial artifacts when only some exist', async () => {
    await createTestProject();

    const validSpec = `# Spec
file_changes:
  - path: test.ts
    action: create
## Build Brief
Rules.`;

    await createArtifact('test-slug', 'spec.md', validSpec);

    saveAllArtifacts('test-slug');

    const message = getLastCommitMessage();
    expect(message).toContain('[test-slug] Save: Spec');
  });

  it('errors when directory is empty', async () => {
    await createTestProject();

    const slugDir = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug');
    await fs.mkdir(slugDir, { recursive: true });

    const error = captureError(() => saveAllArtifacts('test-slug'));
    expect(error).toContain('No artifacts found in plan directory');
  });

  it('errors when plan.md validation fails', async () => {
    await createTestProject();

    const invalidPlan = `# Plan\nNo phases section`;
    const validSpec = `# Spec
file_changes:
  - path: test.ts
    action: create
## Build Brief
Rules.`;

    await createArtifact('test-slug', 'plan.md', invalidPlan);
    await createArtifact('test-slug', 'spec.md', validSpec);

    const error = captureError(() => saveAllArtifacts('test-slug'));
    expect(error).toContain('plan.md format invalid');
  });

  it('uses Update prefix for re-save', async () => {
    await createTestProject();

    const validSpec = `# Spec
file_changes:
  - path: test.ts
    action: create
## Build Brief
Rules.`;

    await createArtifact('test-slug', 'spec.md', validSpec);
    saveAllArtifacts('test-slug');

    // Modify and re-save
    await createArtifact('test-slug', 'spec.md', validSpec.replace('test.ts', 'test2.ts'));
    saveAllArtifacts('test-slug');

    const message = getLastCommitMessage();
    expect(message).toContain('[test-slug] Update: Spec');
    expect(message).not.toContain('Save');
  });

  it('attempts push after committing', async () => {
    await createTestProject();

    const validSpec = `# Spec
file_changes:
  - path: test.ts
    action: create
## Build Brief
Rules.`;

    await createArtifact('test-slug', 'spec.md', validSpec);

    // Capture stderr to verify push attempt
    const stderr = captureError(() => saveAllArtifacts('test-slug'));

    // Push fails in test environment (no remote) but should be attempted
    expect(stderr).toContain('Warning: Push failed');
  });

  it('writes .saves.json for all saved artifacts', async () => {
    await createTestProject();

    const validPlan = `# Plan
## Phases
- [ ] Phase 1
  - Spec: spec.md`;

    const validSpec = `# Spec
file_changes:
  - path: test.ts
    action: create
## Build Brief
Rules.`;

    await createArtifact('test-slug', 'plan.md', validPlan);
    await createArtifact('test-slug', 'spec.md', validSpec);

    saveAllArtifacts('test-slug');

    // Read .saves.json
    const savesPath = path.join(tempDir, '.ana', 'plans', 'active', 'test-slug', '.saves.json');
    const saves = JSON.parse(await fs.readFile(savesPath, 'utf-8'));

    // Both artifacts should have entries
    expect(saves.plan).toBeDefined();
    expect(saves.spec).toBeDefined();

    // Each should have proper metadata
    for (const type of ['plan', 'spec']) {
      expect(saves[type].saved_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(saves[type].commit).toBeUndefined();
      expect(saves[type].hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
  });

  it('save-all includes contract.yaml', async () => {
    await createTestProject();

    const validPlan = `# Plan
## Phases
- [ ] Phase 1
  - Spec: spec.md`;

    const validContract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"

assertions:
  - id: A001
    says: "Test assertion"
    block: "test block"
    target: "test.target"
    matcher: "exists"

file_changes:
  - path: "src/test.ts"
    action: create`;

    const validSpec = `# Spec
## Build Brief
Rules.`;

    await createArtifact('test-slug', 'plan.md', validPlan);
    await createArtifact('test-slug', 'contract.yaml', validContract);
    await createArtifact('test-slug', 'spec.md', validSpec);

    saveAllArtifacts('test-slug');

    const message = getLastCommitMessage();
    expect(message).toContain('Plan');
    expect(message).toContain('Contract');
    expect(message).toContain('Spec');

    // Verify all are committed
    expect(isFileCommitted('.ana/plans/active/test-slug/plan.md')).toBe(true);
    expect(isFileCommitted('.ana/plans/active/test-slug/contract.yaml')).toBe(true);
    expect(isFileCommitted('.ana/plans/active/test-slug/spec.md')).toBe(true);
  });
});
