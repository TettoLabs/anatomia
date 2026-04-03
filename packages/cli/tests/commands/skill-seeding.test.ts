/**
 * Skill seeding tests
 *
 * Tests that seedSkillFiles injects ## Detected sections
 * and guards against duplicates on reinit.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

describe('skill seeding', () => {
  let tempDir: string;
  let cliPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-skill-test-'));
    cliPath = path.join(__dirname, '..', '..', 'dist', 'index.js');

    // Create minimal project with detectable data
    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'skill-test',
        dependencies: { next: '14.0.0', '@sentry/nextjs': '10.0.0', 'posthog-js': '1.0.0' },
        devDependencies: { vitest: '2.0.0' },
        scripts: { build: 'next build', test: 'vitest run', lint: 'next lint' },
      })
    );
    await fs.writeFile(path.join(tempDir, 'tsconfig.json'), '{}');
    await fs.writeFile(path.join(tempDir, 'vercel.json'), '{}');
    await fs.writeFile(path.join(tempDir, '.gitignore'), 'node_modules\n');

    // Init git (needed for git detection)
    await execFileAsync('git', ['init'], { cwd: tempDir });
    await execFileAsync('git', ['config', 'user.email', 'test@test.com'], { cwd: tempDir });
    await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd: tempDir });
    await execFileAsync('git', ['add', '-A'], { cwd: tempDir });
    await execFileAsync('git', ['commit', '-m', 'init'], { cwd: tempDir });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('injects ## Detected section into coding-standards', async () => {
    await execFileAsync('node', [cliPath, 'init', '--force'], { cwd: tempDir });

    const content = await fs.readFile(
      path.join(tempDir, '.claude', 'skills', 'coding-standards', 'SKILL.md'),
      'utf-8'
    );
    expect(content).toContain('## Detected');
    expect(content).toContain('Language:');
  });

  it('injects ## Detected with real commands into testing-standards', async () => {
    await execFileAsync('node', [cliPath, 'init', '--force'], { cwd: tempDir });

    const content = await fs.readFile(
      path.join(tempDir, '.claude', 'skills', 'testing-standards', 'SKILL.md'),
      'utf-8'
    );
    expect(content).toContain('## Detected');
    expect(content).toContain('Vitest');
    // Real commands section (not HTML comment placeholder)
    expect(content).toContain('## Commands');
    expect(content).toContain('npm run build');
  });

  it('injects ## Detected into git-workflow with branch info', async () => {
    await execFileAsync('node', [cliPath, 'init', '--force'], { cwd: tempDir });

    const content = await fs.readFile(
      path.join(tempDir, '.claude', 'skills', 'git-workflow', 'SKILL.md'),
      'utf-8'
    );
    expect(content).toContain('## Detected');
    expect(content).toContain('Default branch:');
  });

  it('does not inject into design-principles', async () => {
    await execFileAsync('node', [cliPath, 'init', '--force'], { cwd: tempDir });

    const content = await fs.readFile(
      path.join(tempDir, '.claude', 'skills', 'design-principles', 'SKILL.md'),
      'utf-8'
    );
    expect(content).not.toContain('## Detected');
  });

  it('does not duplicate ## Detected on reinit', async () => {
    // First init
    await execFileAsync('node', [cliPath, 'init', '--force'], { cwd: tempDir });

    // Second init
    await execFileAsync('node', [cliPath, 'init', '--force'], { cwd: tempDir });

    const content = await fs.readFile(
      path.join(tempDir, '.claude', 'skills', 'testing-standards', 'SKILL.md'),
      'utf-8'
    );
    const detectedCount = (content.match(/## Detected/g) || []).length;
    expect(detectedCount).toBe(1);
  }, 30000);
}, 30000);
