/**
 * Entry point detection tests for Python frameworks
 *
 * Tests the findEntryPoints function for Python project types
 * with various frameworks (Django, FastAPI, Flask) and conventions.
 *
 * Uses real filesystem fixtures to validate detection accuracy.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findEntryPoints } from '../../../src/engine/analyzers/structure/index.js';
import { mkdir, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Python entry point detection', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'test-entry-points-python-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('detects Django manage.py (framework=django)', async () => {
    // Create fixture: Django manage.py at root
    await writeFile(join(testDir, 'manage.py'), '');

    const result = await findEntryPoints(testDir, 'python', 'django');

    expect(result.entryPoints).toEqual(['manage.py']);
    expect(result.confidence).toBe(1.0);
    expect(result.source).toBe('framework-convention');
  });

  it('detects FastAPI app/main.py (framework=fastapi)', async () => {
    // Create fixture: FastAPI app/main.py
    await mkdir(join(testDir, 'app'), { recursive: true });
    await writeFile(join(testDir, 'app/main.py'), '');

    const result = await findEntryPoints(testDir, 'python', 'fastapi');

    expect(result.entryPoints).toEqual(['app/main.py']);
    expect(result.confidence).toBe(1.0);
    expect(result.source).toBe('framework-convention');
  });

  it('detects FastAPI main.py fallback when app/main.py does not exist (framework=fastapi)', async () => {
    // Create fixture: main.py at root (no app/main.py)
    await writeFile(join(testDir, 'main.py'), '');

    const result = await findEntryPoints(testDir, 'python', 'fastapi');

    expect(result.entryPoints).toEqual(['main.py']);
    expect(result.confidence).toBe(0.95);
    expect(result.source).toBe('convention');
  });

  it('detects Flask app.py (framework=flask)', async () => {
    // Create fixture: Flask app.py
    await writeFile(join(testDir, 'app.py'), '');

    const result = await findEntryPoints(testDir, 'python', 'flask');

    expect(result.entryPoints).toEqual(['app.py']);
    expect(result.confidence).toBe(1.0);
    expect(result.source).toBe('framework-convention');
  });

  it('detects Flask main.py fallback when app.py does not exist (framework=flask)', async () => {
    // Create fixture: main.py at root (no app.py)
    await writeFile(join(testDir, 'main.py'), '');

    const result = await findEntryPoints(testDir, 'python', 'flask');

    expect(result.entryPoints).toEqual(['main.py']);
    expect(result.confidence).toBe(0.95);
    expect(result.source).toBe('convention');
  });

  it('detects simple Python main.py (framework=null)', async () => {
    // Create fixture: main.py at root
    await writeFile(join(testDir, 'main.py'), '');

    const result = await findEntryPoints(testDir, 'python', null);

    expect(result.entryPoints).toEqual(['main.py']);
    expect(result.confidence).toBe(0.95);
    expect(result.source).toBe('convention');
  });

  it('detects module-based src/main.py (framework=null)', async () => {
    // Create fixture: src/main.py (no root main.py or app.py)
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src/main.py'), '');

    const result = await findEntryPoints(testDir, 'python', null);

    expect(result.entryPoints).toEqual(['src/main.py']);
    expect(result.confidence).toBe(0.95);
    expect(result.source).toBe('convention');
  });

  it('detects module-based Flask src/app.py (framework=null)', async () => {
    // Create fixture: src/app.py (no root app.py or main.py)
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src/app.py'), '');

    const result = await findEntryPoints(testDir, 'python', null);

    expect(result.entryPoints).toEqual(['src/app.py']);
    expect(result.confidence).toBe(0.95);
    expect(result.source).toBe('convention');
  });

  it('detects CLI tool cli.py (framework=null)', async () => {
    // Create fixture: cli.py (no other entry points)
    await writeFile(join(testDir, 'cli.py'), '');

    const result = await findEntryPoints(testDir, 'python', null);

    expect(result.entryPoints).toEqual(['cli.py']);
    expect(result.confidence).toBe(0.95);
    expect(result.source).toBe('convention');
  });

  it('detects package entry __main__.py (framework=null)', async () => {
    // Create fixture: __main__.py (no other entry points)
    await writeFile(join(testDir, '__main__.py'), '');

    const result = await findEntryPoints(testDir, 'python', null);

    expect(result.entryPoints).toEqual(['__main__.py']);
    expect(result.confidence).toBe(0.95);
    expect(result.source).toBe('convention');
  });

  it('detects library project with no entry point (framework=null, empty directory)', async () => {
    // Create fixture: empty directory (no entry points)
    // testDir is already created but empty

    const result = await findEntryPoints(testDir, 'python', null);

    expect(result.entryPoints).toEqual([]);
    expect(result.confidence).toBe(0.0);
    expect(result.source).toBe('not-found');
  });

  it('detects multiple entry points when both app.py and main.py exist (framework=null)', async () => {
    // Create fixture: both app.py and main.py
    // main.py is checked first in priority list (higher in pattern array)
    // When multiple conventional entry points exist, both are returned with lower confidence
    await writeFile(join(testDir, 'app.py'), '');
    await writeFile(join(testDir, 'main.py'), '');

    const result = await findEntryPoints(testDir, 'python', null);

    expect(result.entryPoints).toEqual(['main.py', 'app.py']);
    expect(result.confidence).toBe(0.75);
    expect(result.source).toBe('convention');
  });
});
