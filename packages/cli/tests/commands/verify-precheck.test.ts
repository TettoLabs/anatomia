import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { runPreCheck } from '../../src/commands/verify-precheck.js';

/**
 * Tests for `ana verify pre-check` command
 *
 * Uses temp directories with real git repos for isolation.
 */

describe('ana verify pre-check', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'verify-precheck-test-'));
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
  function captureOutput(fn: () => void): { stdout: string; stderr: string } {
    const originalLog = console.log;
    const originalError = console.error;
    const originalExit = process.exit;

    const stdout: string[] = [];
    const stderr: string[] = [];

    console.log = (...args: unknown[]) => {
      stdout.push(args.map(String).join(' '));
    };
    console.error = (...args: unknown[]) => {
      stderr.push(args.map(String).join(' '));
    };
    process.exit = ((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as typeof process.exit;

    try {
      fn();
    } catch (error) {
      // Expected - process.exit throws
      if (error instanceof Error && error.message.startsWith('process.exit')) {
        // Pass
      } else {
        throw error;
      }
    } finally {
      console.log = originalLog;
      console.error = originalError;
      process.exit = originalExit;
    }

    return {
      stdout: stdout.join('\n'),
      stderr: stderr.join('\n')
    };
  }

  /**
   * Helper to create a test project with git and plan directory
   */
  async function createPreCheckProject(options: {
    slug?: string;
    skeleton?: string;
    testFile?: { path: string; content: string };
    spec?: string;
    commits?: Array<{
      message: string;
      files: Array<{ path: string; content: string }>;
      coAuthor?: boolean;
    }>;
  }): Promise<void> {
    const slug = options.slug || 'test-slug';

    // Init git
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

    // Create .ana/.meta.json
    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(
      path.join(anaDir, '.meta.json'),
      JSON.stringify({
        artifactBranch: 'main',
        coAuthor: 'Ana <build@anatomia.dev>'
      }),
      'utf-8'
    );

    // Initial commit on main
    execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git branch -M main', { cwd: tempDir, stdio: 'ignore' });

    // Create plan directory
    const planDir = path.join(tempDir, '.ana', 'plans', 'active', slug);
    await fs.mkdir(planDir, { recursive: true });

    // Add skeleton if provided
    if (options.skeleton) {
      await fs.writeFile(path.join(planDir, 'test_skeleton.ts'), options.skeleton, 'utf-8');
    }

    // Add spec if provided
    if (options.spec) {
      await fs.writeFile(path.join(planDir, 'spec.md'), options.spec, 'utf-8');
    }

    // Commit plan artifacts
    if (options.skeleton || options.spec) {
      execSync('git add -A && git commit -m "add plan artifacts"', { cwd: tempDir, stdio: 'ignore' });
    }

    // Create feature branch
    execSync(`git checkout -b feature/${slug}`, { cwd: tempDir, stdio: 'ignore' });

    // Add test file if provided
    if (options.testFile) {
      const testDir = path.dirname(options.testFile.path);
      await fs.mkdir(path.join(tempDir, testDir), { recursive: true });
      await fs.writeFile(path.join(tempDir, options.testFile.path), options.testFile.content, 'utf-8');
    }

    // Create commits if provided
    if (options.commits) {
      for (const commit of options.commits) {
        for (const file of commit.files) {
          const fileDir = path.dirname(file.path);
          await fs.mkdir(path.join(tempDir, fileDir), { recursive: true });
          await fs.writeFile(path.join(tempDir, file.path), file.content, 'utf-8');
        }

        const coAuthorLine = commit.coAuthor !== false ? '\n\nCo-authored-by: Ana <build@anatomia.dev>' : '';
        execSync(`git add -A && git commit -m "${commit.message}${coAuthorLine}"`, {
          cwd: tempDir,
          stdio: 'ignore'
        });
      }
    }
  }

  describe('skeleton compliance check', () => {
    it('reports exact match when all assertions match', async () => {
      await createPreCheckProject({
        skeleton: `
// describe('test', () => {
//   it('should work', () => {
//     // expect(result).toBe(true)
//     // expect(count).toBe(3)
//     // expect(output).toContain('hello')
//   })
// })
`,
        testFile: {
          path: 'packages/cli/tests/commands/test-slug.test.ts',
          content: `
describe('test', () => {
  it('should work', () => {
    expect(result).toBe(true)
    expect(count).toBe(3)
    expect(output).toContain('hello')
  })
})
`
        },
        commits: [{ message: 'add test', files: [{ path: 'test.ts', content: '// test' }] }]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('3 assertions in skeleton');
      expect(output.stdout).toContain('3 exact match');
      expect(output.stdout).toContain('0 modified');
      expect(output.stdout).toContain('0 missing from test file');
      expect(output.stdout).toContain('0 added by builder');
    });

    it('detects modified assertion values', async () => {
      await createPreCheckProject({
        skeleton: `
// expect(count).toBe(3)
// expect(output).toContain('hello')
`,
        testFile: {
          path: 'packages/cli/tests/commands/test-slug.test.ts',
          content: `
expect(count).toBe(5)
expect(output).toContain('hello')
`
        },
        commits: [{ message: 'add test', files: [{ path: 'test.ts', content: '// test' }] }]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('2 assertions in skeleton');
      expect(output.stdout).toContain('1 exact match');
      expect(output.stdout).toContain('1 modified');
      expect(output.stdout).toContain('expect(count).toBe(3)');
      expect(output.stdout).toContain('expect(count).toBe(5)');
    });

    it('detects missing assertions from test file', async () => {
      await createPreCheckProject({
        skeleton: `
// expect(count).toBe(3)
// expect(output).toContain('hello')
// expect(status).toBe('success')
`,
        testFile: {
          path: 'packages/cli/tests/commands/test-slug.test.ts',
          content: `
expect(count).toBe(3)
expect(output).toContain('hello')
`
        },
        commits: [{ message: 'add test', files: [{ path: 'test.ts', content: '// test' }] }]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('3 assertions in skeleton');
      expect(output.stdout).toContain('2 exact match');
      expect(output.stdout).toContain('1 missing from test file');
      expect(output.stdout).toContain('expect(status).toBe(\'success\')');
    });

    it('counts added assertions by builder', async () => {
      await createPreCheckProject({
        skeleton: `
// expect(count).toBe(3)
`,
        testFile: {
          path: 'packages/cli/tests/commands/test-slug.test.ts',
          content: `
expect(count).toBe(3)
expect(extraCheck).toBe(true)
expect(anotherCheck).toContain('data')
`
        },
        commits: [{ message: 'add test', files: [{ path: 'test.ts', content: '// test' }] }]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('1 assertions in skeleton');
      expect(output.stdout).toContain('1 exact match');
      expect(output.stdout).toContain('2 added by builder');
    });

    it('handles no skeleton file gracefully', async () => {
      await createPreCheckProject({
        commits: [{ message: 'add test', files: [{ path: 'test.ts', content: '// test' }] }]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('No skeleton file found');
      expect(output.stdout).toContain('Skipping skeleton check');
    });

    it('handles empty skeleton file', async () => {
      await createPreCheckProject({
        skeleton: `
// describe('test', () => {
//   it('should work', () => {
//     // Setup code here
//   })
// })
`,
        commits: [{ message: 'add test', files: [{ path: 'test.ts', content: '// test' }] }]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('0 assertions in skeleton');
      expect(output.stdout).toContain('0 exact match');
    });

    it('finds test file from spec YAML when slug differs from filename', async () => {
      // Slug is context-status but test file is context.test.ts
      const spec = `# Spec

<!-- MACHINE-READABLE
file_changes:
  - path: packages/cli/tests/commands/context.test.ts
    action: create
  - path: src/commands/context.ts
    action: create
-->
`;

      await createPreCheckProject({
        slug: 'context-status',
        skeleton: `
// expect(output).toContain('status')
// expect(result).toBe(true)
`,
        spec,
        testFile: {
          path: 'packages/cli/tests/commands/context.test.ts',
          content: `
expect(output).toContain('status')
expect(result).toBe(true)
`
        },
        commits: [{ message: 'add context command', files: [{ path: 'src/context.ts', content: '// impl' }] }]
      });

      const output = captureOutput(() => runPreCheck('context-status'));

      expect(output.stdout).toContain('2 assertions in skeleton');
      expect(output.stdout).toContain('2 exact match');
      expect(output.stdout).toContain('packages/cli/tests/commands/context.test.ts');
    });
  });

  describe('file changes audit', () => {
    it('reports all files match when spec and git diff align', async () => {
      const spec = `# Spec

<!-- MACHINE-READABLE
file_changes:
  - path: src/foo.ts
    action: create
  - path: src/index.ts
    action: modify
  - path: tests/foo.test.ts
    action: create
-->
`;

      await createPreCheckProject({
        spec,
        commits: [
          {
            message: 'implement feature',
            files: [
              { path: 'src/foo.ts', content: 'export const foo = true;' },
              { path: 'src/index.ts', content: 'import { foo } from "./foo";' },
              { path: 'tests/foo.test.ts', content: 'test("foo", () => {});' }
            ]
          }
        ]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('Spec expects: 3 files (2 create, 1 modify)');
      expect(output.stdout).toContain('✓ src/foo.ts');
      expect(output.stdout).toContain('✓ src/index.ts');
      expect(output.stdout).toContain('✓ tests/foo.test.ts');
    });

    it('flags unexpected files not in spec', async () => {
      const spec = `# Spec

<!-- MACHINE-READABLE
file_changes:
  - path: src/foo.ts
    action: create
-->
`;

      await createPreCheckProject({
        spec,
        commits: [
          {
            message: 'implement feature',
            files: [
              { path: 'src/foo.ts', content: 'export const foo = true;' },
              { path: 'src/bar.ts', content: 'export const bar = true;' }
            ]
          }
        ]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('✓ src/foo.ts');
      expect(output.stdout).toContain('⚠ src/bar.ts — NOT in spec');
    });

    it('flags expected files missing from git diff', async () => {
      const spec = `# Spec

<!-- MACHINE-READABLE
file_changes:
  - path: src/foo.ts
    action: create
  - path: src/bar.ts
    action: create
-->
`;

      await createPreCheckProject({
        spec,
        commits: [
          {
            message: 'implement feature',
            files: [{ path: 'src/foo.ts', content: 'export const foo = true;' }]
          }
        ]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('✓ src/foo.ts');
      expect(output.stdout).toContain('✗ src/bar.ts — in spec (create) but NOT in git diff');
    });

    it('identifies pipeline artifacts correctly', async () => {
      const spec = `# Spec

<!-- MACHINE-READABLE
file_changes:
  - path: src/foo.ts
    action: create
-->
`;

      await createPreCheckProject({
        spec,
        commits: [
          {
            message: 'implement feature',
            files: [
              { path: 'src/foo.ts', content: 'export const foo = true;' },
              { path: '.ana/plans/active/test-slug/build_report.md', content: '# Build Report' }
            ]
          }
        ]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('✓ src/foo.ts');
      expect(output.stdout).toContain('⚠ .ana/plans/active/test-slug/build_report.md — pipeline artifact');
    });

    it('handles missing YAML block gracefully', async () => {
      await createPreCheckProject({
        spec: '# Spec\n\nNo YAML here.',
        commits: [{ message: 'test', files: [{ path: 'test.ts', content: '// test' }] }]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('No file_changes YAML block found');
      expect(output.stdout).toContain('Skipping file audit');
    });
  });

  describe('commit analysis', () => {
    it('reports clean commits with co-author', async () => {
      await createPreCheckProject({
        commits: [
          {
            message: 'add feature',
            files: [{ path: 'src/foo.ts', content: '// foo' }],
            coAuthor: true
          },
          {
            message: 'add tests',
            files: [{ path: 'tests/foo.test.ts', content: '// test' }],
            coAuthor: true
          }
        ]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('2 commits on feature/test-slug');
      expect(output.stdout).toContain('Commit 1: add feature');
      expect(output.stdout).toContain('Co-author: ✓');
      expect(output.stdout).toContain('Commit 2: add tests');
    });

    it('flags commits with too many files', async () => {
      await createPreCheckProject({
        commits: [
          {
            message: 'big commit',
            files: [
              { path: 'f1.ts', content: '// 1' },
              { path: 'f2.ts', content: '// 2' },
              { path: 'f3.ts', content: '// 3' },
              { path: 'f4.ts', content: '// 4' },
              { path: 'f5.ts', content: '// 5' },
              { path: 'f6.ts', content: '// 6' }
            ],
            coAuthor: true
          }
        ]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('Commit 1: big commit');
      expect(output.stdout).toContain('6 files');
      expect(output.stdout).toContain('⚠ 6 files in single commit');
    });

    it('flags missing co-author', async () => {
      await createPreCheckProject({
        commits: [
          {
            message: 'no coauthor',
            files: [{ path: 'test.ts', content: '// test' }],
            coAuthor: false
          }
        ]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('Commit 1: no coauthor');
      expect(output.stdout).toContain('Co-author: ✗');
    });

    it('handles single commit', async () => {
      await createPreCheckProject({
        commits: [
          {
            message: 'single commit',
            files: [{ path: 'test.ts', content: '// test' }],
            coAuthor: true
          }
        ]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('1 commits on feature/test-slug');
      expect(output.stdout).toContain('Commit 1: single commit');
    });
  });

  describe('orchestration', () => {
    it('runs all three checks and exits 0', async () => {
      await createPreCheckProject({
        skeleton: '// expect(foo).toBe(true)',
        testFile: {
          path: 'packages/cli/tests/commands/test-slug.test.ts',
          content: 'expect(foo).toBe(true)'
        },
        spec: `<!-- MACHINE-READABLE
file_changes:
  - path: test.ts
    action: create
-->`,
        commits: [{ message: 'test', files: [{ path: 'test.ts', content: '// test' }] }]
      });

      let exitCode: number | undefined;
      const originalExit = process.exit;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error(`process.exit(${code})`);
      }) as typeof process.exit;

      try {
        runPreCheck('test-slug');
      } catch (error) {
        // Expected
      } finally {
        process.exit = originalExit;
      }

      expect(exitCode).toBe(0);
    });

    it('handles partial data gracefully', async () => {
      await createPreCheckProject({
        commits: [{ message: 'test', files: [{ path: 'test.ts', content: '// test' }] }]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('No skeleton file found');
      expect(output.stdout).toContain('No spec file found');
      expect(output.stdout).toContain('1 commits');
    });

    it('errors when slug does not exist', async () => {
      // Create minimal project with .meta.json
      const anaDir = path.join(tempDir, '.ana');
      await fs.mkdir(anaDir, { recursive: true });
      await fs.writeFile(
        path.join(anaDir, '.meta.json'),
        JSON.stringify({ artifactBranch: 'main' }),
        'utf-8'
      );

      const output = captureOutput(() => runPreCheck('nonexistent'));

      expect(output.stderr).toContain('No active work found');
    });
  });

  describe('multi-phase support', () => {
    it('--phase selects correct spec in multi-phase', async () => {
      const spec1 = `# Spec 1
<!-- MACHINE-READABLE
file_changes:
  - path: tests/phase1.test.ts
    action: create
-->`;

      const spec2 = `# Spec 2
<!-- MACHINE-READABLE
file_changes:
  - path: tests/phase2.test.ts
    action: create
-->`;

      await createPreCheckProject({
        slug: 'multi-slug',
        commits: [{ message: 'phase 2', files: [{ path: 'test.ts', content: '// test' }] }]
      });

      // Add both specs
      const planDir = path.join(tempDir, '.ana/plans/active/multi-slug');
      await fs.writeFile(path.join(planDir, 'spec-1.md'), spec1, 'utf-8');
      await fs.writeFile(path.join(planDir, 'spec-2.md'), spec2, 'utf-8');

      // Add skeleton and test file for phase 2
      await fs.writeFile(path.join(planDir, 'test_skeleton.ts'), '// expect(phase2).toBe(true)', 'utf-8');
      await fs.mkdir(path.join(tempDir, 'tests'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'tests/phase2.test.ts'),
        'expect(phase2).toBe(true)',
        'utf-8'
      );

      execSync('git add -A && git commit -m "add phase 2"', { cwd: tempDir, stdio: 'ignore' });

      const output = captureOutput(() => runPreCheck('multi-slug', 2));

      expect(output.stdout).toContain('tests/phase2.test.ts');
      expect(output.stdout).not.toContain('tests/phase1.test.ts');
    });

    it('no --phase with single spec works as before', async () => {
      await createPreCheckProject({
        skeleton: '// expect(foo).toBe(true)',
        spec: `<!-- MACHINE-READABLE
file_changes:
  - path: test.ts
    action: create
-->`,
        testFile: {
          path: 'packages/cli/tests/commands/test-slug.test.ts',
          content: 'expect(foo).toBe(true)'
        },
        commits: [{ message: 'test', files: [{ path: 'test.ts', content: '// test' }] }]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('1 assertions in skeleton');
      expect(output.stdout).toContain('1 exact match');
    });

    it('--phase with nonexistent spec reports error', async () => {
      await createPreCheckProject({
        skeleton: '// expect(foo).toBe(true)',
        commits: [{ message: 'test', files: [{ path: 'test.ts', content: '// test' }] }]
      });

      // Add only spec-1
      const planDir = path.join(tempDir, '.ana/plans/active/test-slug');
      await fs.writeFile(path.join(planDir, 'spec-1.md'), '# Spec 1', 'utf-8');

      const output = captureOutput(() => runPreCheck('test-slug', 3));

      expect(output.stdout).toContain('No spec file found');
    });
  });

  describe('regression tests with production formats (S6-1.3)', () => {
    it('handles production skeleton format with uncommented expect() calls', async () => {
      // Real format from AnaPlan: uncommented expect() inside it() blocks with setup comments
      const productionSkeleton = `
it('shows all context files', async () => {
  // SETUP NEEDED: create project with context files
  expect(output).toContain('project-overview.md');
  expect(files.length).toBe(7);
  expect(status).toBe('complete');
})`;

      const testFile = `
it('shows all context files', async () => {
  const { output, files, status } = await setup();
  expect(output).toContain('project-overview.md');
  expect(files.length).toBe(7);
  expect(status).toBe('complete');
})`;

      await createPreCheckProject({
        slug: 'test-feature',
        skeleton: productionSkeleton,
        testFile: {
          path: 'packages/cli/tests/commands/test-feature.test.ts',
          content: testFile
        },
        commits: [{ message: 'add tests', files: [{ path: 'src/test.ts', content: '// code' }] }]
      });

      const output = captureOutput(() => runPreCheck('test-feature'));

      expect(output.stdout).toContain('3 assertions in skeleton');
      expect(output.stdout).toContain('3 exact match');
      expect(output.stdout).toContain('0 modified');
    });

    it('handles production spec format with code fence and trailing text', async () => {
      // Real format from AnaPlan: <!-- MACHINE-READABLE: DO NOT MODIFY MANUALLY --> + code fence
      const productionSpec = `# Spec

## Implementation Details
...

<!-- MACHINE-READABLE: DO NOT MODIFY MANUALLY -->
\`\`\`yaml
file_changes:
  - path: packages/cli/src/commands/status.ts
    action: create
  - path: packages/cli/tests/commands/status.test.ts
    action: create
\`\`\`

## Build Brief
...`;

      await createPreCheckProject({
        slug: 'status-feature',
        spec: productionSpec,
        commits: [{
          message: 'add status command',
          files: [
            { path: 'packages/cli/src/commands/status.ts', content: '// impl' },
            { path: 'packages/cli/tests/commands/status.test.ts', content: '// test' }
          ]
        }]
      });

      const output = captureOutput(() => runPreCheck('status-feature'));

      expect(output.stdout).toContain('Spec expects: 2 files (2 create, 0 modify)');
      expect(output.stdout).toContain('✓ packages/cli/src/commands/status.ts');
      expect(output.stdout).toContain('✓ packages/cli/tests/commands/status.test.ts');
    });

    it('handles skeleton with both commented and uncommented content', async () => {
      const mixedSkeleton = `
it('validates input', () => {
  // SETUP NEEDED: create invalid input
  expect(result).toBe(false);
  // Note: validation should check format
  expect(errors).toHaveLength(1);
})`;

      const testFile = `
it('validates input', () => {
  const result = validate();
  expect(result).toBe(false);
  expect(errors).toHaveLength(1);
})`;

      await createPreCheckProject({
        skeleton: mixedSkeleton,
        testFile: {
          path: 'packages/cli/tests/commands/test-slug.test.ts',
          content: testFile
        },
        commits: [{ message: 'test', files: [{ path: 'test.ts', content: '// test' }] }]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('2 assertions in skeleton');
      expect(output.stdout).toContain('2 exact match');
    });

    it('handles spec YAML with extra HTML comment attributes', async () => {
      const specWithAttributes = `<!-- MACHINE-READABLE: DO NOT MODIFY MANUALLY - Generated by AnaPlan v2 -->
\`\`\`yaml
file_changes:
  - path: src/feature.ts
    action: create
\`\`\``;

      await createPreCheckProject({
        spec: specWithAttributes,
        commits: [{
          message: 'add feature',
          files: [{ path: 'src/feature.ts', content: '// feature' }]
        }]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      expect(output.stdout).toContain('Spec expects: 1 files (1 create, 0 modify)');
      expect(output.stdout).toContain('✓ src/feature.ts');
    });

    it('full orchestrator with both production formats together', async () => {
      const productionSkeleton = `
it('counts items correctly', () => {
  // SETUP: create 3 items
  expect(count).toBe(3);
  expect(items).toHaveLength(3);
})`;

      const productionSpec = `<!-- MACHINE-READABLE: DO NOT MODIFY MANUALLY -->
\`\`\`yaml
file_changes:
  - path: src/counter.ts
    action: create
  - path: tests/counter.test.ts
    action: create
\`\`\``;

      const testFile = `
it('counts items correctly', () => {
  const { count, items } = setup();
  expect(count).toBe(3);
  expect(items).toHaveLength(3);
})`;

      await createPreCheckProject({
        skeleton: productionSkeleton,
        spec: productionSpec,
        testFile: {
          path: 'tests/counter.test.ts',
          content: testFile
        },
        commits: [{
          message: 'implement counter',
          files: [
            { path: 'src/counter.ts', content: '// counter' },
            { path: 'tests/counter.test.ts', content: testFile }
          ],
          coAuthor: true
        }]
      });

      const output = captureOutput(() => runPreCheck('test-slug'));

      // Skeleton check
      expect(output.stdout).toContain('2 assertions in skeleton');
      expect(output.stdout).toContain('2 exact match');

      // File audit
      expect(output.stdout).toContain('Spec expects: 2 files');
      expect(output.stdout).toContain('✓ src/counter.ts');
      expect(output.stdout).toContain('✓ tests/counter.test.ts');

      // Commit check
      expect(output.stdout).toContain('1 commits on');
      expect(output.stdout).toContain('Co-author: ✓');
    });
  });
});
