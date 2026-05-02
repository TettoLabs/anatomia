/**
 * Integration tests for structure analysis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { analyzeStructure } from '../../../src/engine/analyzers/structure/index.js';
import { mkdir, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('analyzeStructure integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'test-structure-integration-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('returns complete StructureAnalysis for FastAPI project', async () => {
    await mkdir(join(testDir, 'app'));
    await writeFile(join(testDir, 'app/main.py'), '');
    await mkdir(join(testDir, 'app/api'));
    await mkdir(join(testDir, 'app/models'));
    await mkdir(join(testDir, 'app/services'));
    await mkdir(join(testDir, 'tests'));
    await writeFile(join(testDir, '.env'), '');
    await writeFile(join(testDir, 'requirements.txt'), 'fastapi==0.100.0');

    const result = await analyzeStructure(testDir, 'python', 'fastapi');

    expect(result.entryPoints).toContain('app/main.py');
    expect(result.testLocation).toBe('tests/');
    expect(result.architecture).toBe('layered');
    expect(result.directoryTree).toContain('app');
    expect(result.configFiles).toContain('.env');
    expect(result.configFiles).toContain('requirements.txt');
    expect(result.confidence.entryPoints).toBeGreaterThanOrEqual(0.90);
    expect(result.confidence.testLocation).toBe(1.0);
    expect(result.confidence.architecture).toBeGreaterThanOrEqual(0.85);
    expect(result.confidence.overall).toBeGreaterThan(0.0);
  });

  it('handles library project (no entry point)', async () => {
    await mkdir(join(testDir, 'lib'));
    await writeFile(join(testDir, 'lib/index.ts'), '');
    await mkdir(join(testDir, 'tests'));

    const result = await analyzeStructure(testDir, 'node', null);

    expect(result.entryPoints).toEqual([]);
    expect(result.architecture).toBe('library');
    expect(result.confidence.entryPoints).toBe(0.0);
    expect(result.confidence.architecture).toBeGreaterThanOrEqual(0.85);
  });

  it('handles project with no tests', async () => {
    await writeFile(join(testDir, 'index.js'), '');

    const result = await analyzeStructure(testDir, 'node', null);

    expect(result.testLocation).toBeNull();
    expect(result.confidence.testLocation).toBe(0.0);
  });

  it('detects Go microservices architecture', async () => {
    await mkdir(join(testDir, 'cmd/api'), { recursive: true });
    await mkdir(join(testDir, 'cmd/worker'), { recursive: true });
    await writeFile(join(testDir, 'cmd/api/main.go'), '');
    await writeFile(join(testDir, 'cmd/worker/main.go'), '');

    const result = await analyzeStructure(testDir, 'go', null);

    expect(result.entryPoints.length).toBeGreaterThanOrEqual(2);
    expect(result.architecture).toBe('microservices');
    expect(result.testLocation).toBe('*_test.go');
  });
});

describe('scanProject() includes structure in output', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'test-analyze-integration-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('structure field populated for projects with directories', async () => {
    await writeFile(join(testDir, 'package.json'), '{"name":"test"}');
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src', 'index.ts'), 'export const x = 1;');

    const { scanProject } = await import('../../../src/engine/index.js');
    const result = await scanProject(testDir, { depth: 'surface' });

    expect(result.stack).toBeDefined();
    expect(result.structure).toBeDefined();
  });
});
