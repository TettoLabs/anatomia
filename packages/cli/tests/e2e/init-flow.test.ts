/**
 * End-to-end tests for ana init
 *
 * Tests actual command execution in temp project directory.
 * Validates all 36 files/directories created correctly.
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
  });

  afterEach(async () => {
    await fs.rm(tmpProject, { recursive: true, force: true });
  });

  it('creates all 34 files (24 static + 8 generated + 2 JSON)', async () => {
    // Run ana init with --skip-analysis (faster, deterministic)
    await execFileAsync('node', [cliPath, 'init', '--skip-analysis'], {
      cwd: tmpProject,
    });

    const anaPath = path.join(tmpProject, '.ana');

    // Verify directories (6)
    const dirs = [
      'modes',
      'context',
      'context/setup',
      'context/setup/steps',
      'context/setup/framework-snippets',
      '.state',
    ];

    for (const dir of dirs) {
      const exists = await dirExists(path.join(anaPath, dir));
      expect(exists, `Directory missing: ${dir}`).toBe(true);
    }

    // Verify generated files (8)
    const generatedFiles = [
      'context/analysis.md',
      'context/project-overview.md',
      'context/architecture.md',
      'context/patterns.md',
      'context/conventions.md',
      'context/workflow.md',
      'context/testing.md',
      'context/debugging.md',
    ];

    for (const file of generatedFiles) {
      const exists = await fileExists(path.join(anaPath, file));
      expect(exists, `Generated file missing: ${file}`).toBe(true);
    }

    // Verify copied mode files (7)
    const modeFiles = [
      'modes/architect.md',
      'modes/code.md',
      'modes/debug.md',
      'modes/docs.md',
      'modes/test.md',
      'modes/general.md',
      'modes/setup.md',
    ];

    for (const file of modeFiles) {
      const exists = await fileExists(path.join(anaPath, file));
      expect(exists, `Mode file missing: ${file}`).toBe(true);
    }

    // Verify .meta.json
    const metaExists = await fileExists(path.join(anaPath, '.meta.json'));
    expect(metaExists).toBe(true);

    const metaContent = await fs.readFile(path.join(anaPath, '.meta.json'), 'utf-8');
    const meta = JSON.parse(metaContent);
    expect(meta.setupStatus).toBe('pending');
    expect(meta.version).toBe('1.0.0');

    // Verify snapshot.json
    const snapshotExists = await fileExists(path.join(anaPath, '.state/snapshot.json'));
    expect(snapshotExists).toBe(true);

    // Verify ENTRY.md NOT created (setup complete creates it)
    const entryExists = await fileExists(path.join(anaPath, 'ENTRY.md'));
    expect(entryExists).toBe(false);

    // Count total files
    const allFiles = await findAllFiles(anaPath);
    // 8 generated (analysis.md + 7 scaffolds) + 24 copied (7 modes + 3 setup + 8 steps + 6 snippets) + 2 JSON (.meta.json + snapshot.json) = 34
    expect(allFiles.length).toBe(34);
  }, 30000); // 30s timeout

  it('--force preserves .state/ directory', async () => {
    // First init
    await execFileAsync('node', [cliPath, 'init', '--skip-analysis'], {
      cwd: tmpProject,
    });

    const anaPath = path.join(tmpProject, '.ana');
    const statePath = path.join(anaPath, '.state');

    // Add test data to .state/
    await fs.writeFile(path.join(statePath, 'test.json'), '{"preserved":true}');

    // Re-init with --force
    await execFileAsync('node', [cliPath, 'init', '--force', '--skip-analysis'], {
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
  });

  afterEach(async () => {
    await fs.rm(tmpProject, { recursive: true, force: true });
  });

  it('ana mode shows 7 modes (general, setup added in CP4)', async () => {
    const { stdout } = await execFileAsync('node', [cliPath, 'mode', 'code'], {
      cwd: tmpProject,
    });

    // Should list all 7 modes
    expect(stdout).toContain('architect');
    expect(stdout).toContain('code');
    expect(stdout).toContain('debug');
    expect(stdout).toContain('docs');
    expect(stdout).toContain('test');
    expect(stdout).toContain('general'); // Added in CP4
    expect(stdout).toContain('setup'); // Added in CP4
  }, 10000);
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
