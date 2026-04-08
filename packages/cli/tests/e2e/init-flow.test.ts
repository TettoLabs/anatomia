/**
 * End-to-end tests for ana init
 *
 * Tests actual command execution in temp project directory.
 * Validates all files/directories created correctly:
 * - .ana/ (context, docs, plans, hooks, state)
 * - .claude/ with settings.json, agents/ (9 files), and skills/ (6 dirs)
 * - CLAUDE.md at project root
 * Total: 51 files
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

const execFileAsync = promisify(execFile);

describe('ana init E2E', () => {
  let tmpProject: string;
  let cliPath: string;

  beforeEach(async () => {
    tmpProject = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-e2e-'));

    // Get path to built CLI
    cliPath = path.join(__dirname, '..', '..', 'dist', 'index.js');

    // Create minimal package.json in test project
    await fs.writeFile(
      path.join(tmpProject, 'package.json'),
      JSON.stringify({ name: 'test-project', version: '1.0.0' })
    );

    // Create .git so init doesn't hit the no-git confirm (defaultYes: false in non-TTY)
    await fs.mkdir(path.join(tmpProject, '.git'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpProject, { recursive: true, force: true });
  });

  it('creates all expected files in .ana/ (context, docs, plans, hooks, state)', async () => {
    await execFileAsync('node', [cliPath, 'init'], {
      cwd: tmpProject,
    });

    const anaPath = path.join(tmpProject, '.ana');

    // Verify directories (6 — modes removed S18, setup/ removed D10.9/S16)
    const dirs = [
      'hooks',
      'context',
      'docs',
      'plans/active',
      'plans/completed',
      'state',
    ];

    for (const dir of dirs) {
      const exists = await dirExists(path.join(anaPath, dir));
      expect(exists, `Directory missing: ${dir}`).toBe(true);
    }

    // Verify generated files (2 — S15 consolidated 7→2)
    const generatedFiles = [
      'context/project-context.md',
      'context/design-principles.md',
    ];

    for (const file of generatedFiles) {
      const exists = await fileExists(path.join(anaPath, file));
      expect(exists, `Generated file missing: ${file}`).toBe(true);
    }

    // Verify hook scripts (2 — quality-gate and subagent-verify removed S18)
    const hookScripts = [
      'hooks/verify-context-file.sh',
      'hooks/run-check.sh',
    ];

    for (const script of hookScripts) {
      const exists = await fileExists(path.join(anaPath, script));
      expect(exists, `Hook script missing: ${script}`).toBe(true);

      // Verify executable permissions
      const stats = await fs.stat(path.join(anaPath, script));
      expect(stats.mode & 0o111).toBeGreaterThan(0);
    }

    // Verify SCHEMAS.md
    const schemasExists = await fileExists(path.join(anaPath, 'docs/SCHEMAS.md'));
    expect(schemasExists).toBe(true);

    // Verify .gitkeep files in plan directories
    const activeGitkeepExists = await fileExists(path.join(anaPath, 'plans/active/.gitkeep'));
    const completeGitkeepExists = await fileExists(path.join(anaPath, 'plans/completed/.gitkeep'));
    expect(activeGitkeepExists).toBe(true);
    expect(completeGitkeepExists).toBe(true);

    // Verify ana.json
    const metaExists = await fileExists(path.join(anaPath, 'ana.json'));
    expect(metaExists).toBe(true);

    const anaJsonContent = await fs.readFile(path.join(anaPath, 'ana.json'), 'utf-8');
    const meta = JSON.parse(anaJsonContent);
    expect(meta.setupMode).toBeDefined();
    expect(meta.name).toBeDefined();

    // Verify snapshot.json
    const snapshotExists = await fileExists(path.join(anaPath, 'state/snapshot.json'));
    expect(snapshotExists).toBe(true);

    // Count total files in .ana/
    // 2 generated + 2 hooks + 1 SCHEMAS + 2 .gitkeep + 3 JSON (ana.json, snapshot.json, scan.json) + 1 symbol-index + 1 cli-path + 1 .gitignore + 2 hook results = 15
    const allFiles = await findAllFiles(anaPath);
    expect(allFiles.length).toBe(15);

    // Verify .gitignore exists and excludes runtime state
    const gitignorePath = path.join(anaPath, '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    expect(gitignoreContent).toContain('state/');

    // Verify .claude/ directory was also created (outside .ana/)
    const claudePath = path.join(tmpProject, '.claude');
    const claudeExists = await dirExists(claudePath);
    expect(claudeExists).toBe(true);

    // Verify .claude/settings.json
    const settingsExists = await fileExists(path.join(claudePath, 'settings.json'));
    expect(settingsExists).toBe(true);

    // Verify .claude/agents/ directory with 9 agent files
    const agentsExists = await dirExists(path.join(claudePath, 'agents'));
    expect(agentsExists).toBe(true);

    // Verify all 5 agent files exist
    const agentFiles = [
      'ana.md',
      'ana-plan.md',
      'ana-setup.md',
      'ana-build.md',
      'ana-verify.md',
    ];

    for (const agentFile of agentFiles) {
      const agentExists = await fileExists(path.join(claudePath, 'agents', agentFile));
      expect(agentExists, `Agent file missing: ${agentFile}`).toBe(true);
    }

    // Verify .claude/skills/ directory with 6 skill directories
    const skillsExists = await dirExists(path.join(claudePath, 'skills'));
    expect(skillsExists).toBe(true);

    const skillDirs = [
      'testing-standards',
      'coding-standards',
      'git-workflow',
      'deployment',
      'troubleshooting',
    ];

    for (const skillDir of skillDirs) {
      const skillFileExists = await fileExists(path.join(claudePath, 'skills', skillDir, 'SKILL.md'));
      expect(skillFileExists, `Skill file missing: ${skillDir}/SKILL.md`).toBe(true);
    }

    // Verify CLAUDE.md at project root
    const claudeMdExists = await fileExists(path.join(tmpProject, 'CLAUDE.md'));
    expect(claudeMdExists).toBe(true);

    const claudeMdContent = await fs.readFile(path.join(tmpProject, 'CLAUDE.md'), 'utf-8');
    expect(claudeMdContent).toContain('claude --agent ana');
  }, 30000); // 30s timeout

  it('--force preserves state/ directory', async () => {
    // First init
    await execFileAsync('node', [cliPath, 'init'], {
      cwd: tmpProject,
    });

    const anaPath = path.join(tmpProject, '.ana');
    const statePath = path.join(anaPath, 'state');

    // Add test data to state/
    await fs.writeFile(path.join(statePath, 'test.json'), '{"preserved":true}');

    // Re-init with --force
    await execFileAsync('node', [cliPath, 'init', '--force'], {
      cwd: tmpProject,
    });

    // Verify test.json preserved
    const testFileExists = await fileExists(path.join(statePath, 'test.json'));
    expect(testFileExists).toBe(true);

    const content = await fs.readFile(path.join(statePath, 'test.json'), 'utf-8');
    expect(JSON.parse(content)).toEqual({ preserved: true });
  }, 60000); // 60s timeout
});

describe('regression tests', () => {
  let tmpProject: string;
  let cliPath: string;

  beforeEach(async () => {
    tmpProject = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-e2e-'));
    cliPath = path.join(__dirname, '..', '..', 'dist', 'index.js');

    await fs.writeFile(
      path.join(tmpProject, 'package.json'),
      JSON.stringify({ name: 'test-project' })
    );

    // Create .git so init doesn't hit the no-git confirm (defaultYes: false in non-TTY)
    await fs.mkdir(path.join(tmpProject, '.git'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpProject, { recursive: true, force: true });
  });

  it('creates scan.json with full engine result when analysis runs', async () => {
    // Create a minimal project with detectable framework
    await fs.writeFile(
      path.join(tmpProject, 'package.json'),
      JSON.stringify({
        name: 'scan-test',
        dependencies: { next: '14.0.0' },
        scripts: { build: 'next build', test: 'vitest run' },
      })
    );

    // Run init WITHOUT --skip-analysis
    await execFileAsync('node', [cliPath, 'init'], {
      cwd: tmpProject,
    });

    const anaPath = path.join(tmpProject, '.ana');
    const scanPath = path.join(anaPath, 'scan.json');

    // scan.json must exist
    const exists = await fileExists(scanPath);
    expect(exists).toBe(true);

    // Must be valid JSON with expected top-level keys
    const content = await fs.readFile(scanPath, 'utf-8');
    const scan = JSON.parse(content);
    expect(scan.overview).toBeDefined();
    expect(scan.stack).toBeDefined();
    expect(scan.commands).toBeDefined();
    expect(scan.files).toBeDefined();
    expect(scan.externalServices).toBeDefined();

    // Should detect Next.js
    expect(scan.stack.framework).toBe('Next.js');
  }, 30000);

});

// Helper functions
async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findAllFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await findAllFiles(fullPath);
      files.push(...subFiles);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}
