import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scanProject } from '../../src/engine/scan-engine.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('scanProject()', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `engine-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function createFiles(files: Record<string, string>): Promise<void> {
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = join(tempDir, filePath);
      await mkdir(join(fullPath, '..'), { recursive: true });
      await writeFile(fullPath, content);
    }
  }

  it('surface scan returns all top-level keys', async () => {
    await createFiles({
      'package.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    const expectedKeys = [
      'overview', 'stack', 'files', 'structure',
      'commands', 'git', 'monorepo', 'externalServices', 'schemas',
      'secrets', 'projectProfile', 'blindSpots', 'deployment',
      'patterns', 'conventions', 'recommendations', 'health', 'readiness',
    ];
    for (const key of expectedKeys) {
      expect(result).toHaveProperty(key);
    }
    expect(result.overview.depth).toBe('surface');
    expect(result.patterns).toBeNull();
    expect(result.conventions).toBeNull();
  });

  it('detects stack from dependencies', async () => {
    await createFiles({
      'package.json': JSON.stringify({
        name: 'test',
        dependencies: { next: '14.0.0', '@prisma/client': '5.0.0' },
        devDependencies: { vitest: '2.0.0' },
      }),
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.stack.framework).toBe('Next.js');
    expect(result.stack.database).toBe('Prisma');
    expect(result.stack.testing).toBe('Vitest');
  });

  it('detects git info when repo exists', async () => {
    await createFiles({
      'package.json': JSON.stringify({ name: 'test' }),
    });
    execSync('git init && git add -A && git commit -m "init"', {
      cwd: tempDir, stdio: 'pipe',
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.git.head).not.toBeNull();
    expect(result.git.branch).not.toBeNull();
    expect(result.git.commitCount).toBeGreaterThanOrEqual(1);
  });

  it('detects commands from package.json scripts', async () => {
    await createFiles({
      'package.json': JSON.stringify({
        name: 'test',
        scripts: { build: 'next build', test: 'vitest run', lint: 'eslint .' },
      }),
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.commands.build).not.toBeNull();
    expect(result.commands.test).not.toBeNull();
    expect(result.commands.lint).not.toBeNull();
    expect(typeof result.commands.packageManager).toBe('string');
  });

  it('detects external services and schemas', async () => {
    await createFiles({
      'package.json': JSON.stringify({
        name: 'test',
        dependencies: { stripe: '15.0.0', '@prisma/client': '5.0.0' },
      }),
      'prisma/schema.prisma': 'model User { id Int @id }\nmodel Post { id Int @id }',
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.externalServices.length).toBeGreaterThan(0);
    expect(result.externalServices.some(s => s.name === 'Stripe')).toBe(true);
    expect(result.schemas['prisma']).toBeDefined();
    expect(result.schemas['prisma']!.found).toBe(true);
    expect(result.schemas['prisma']!.modelCount).toBe(2);
  });

  it('handles empty directory gracefully', async () => {
    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.overview.project).toBeDefined();
    expect(result.stack.language).toBeNull();
    expect(result.files.total).toBe(0);
  });
});
