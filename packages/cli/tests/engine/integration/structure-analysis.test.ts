/**
 * Integration tests for structure analysis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { analyzeStructure } from '../../../src/engine/analyzers/structure/index.js';
// analyze() deleted in Lane 0 Step 7
const analyze = (() => { throw new Error('analyze() deleted'); }) as any;
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

describe('analyzeStructure integration', () => {
  const testDir = '/tmp/test-structure-integration';

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
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

// Lane 0 Step 7: analyze() deleted. Migrate to scanProject().
describe.skip('analyze() integration', () => {
  const testDir = '/tmp/test-analyze-integration';

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('includes structure field in AnalysisResult', async () => {
    await writeFile(join(testDir, 'main.py'), '');

    const result = await analyze(testDir);

    expect(result.projectType).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(result.structure).toBeDefined();
    expect(result.structure?.entryPoints).toBeDefined();
    expect(result.structure?.confidence).toBeDefined();
  });

  it('skipStructure option works', async () => {
    const result = await analyze(testDir, { skipStructure: true });

    expect(result.structure).toBeUndefined();
  });
});
