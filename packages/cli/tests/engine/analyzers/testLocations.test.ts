/**
 * Test location detection tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findTestLocations } from '../../../src/engine/analyzers/structure/index.js';
import { mkdir, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Test location detection', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'test-locations-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  });

  describe('Python (pytest)', () => {
    it('detects tests/ directory', async () => {
      await mkdir(join(testDir, 'tests'));
      const result = await findTestLocations(testDir, 'python', null);

      expect(result.testLocations).toEqual(['tests/']);
      expect(result.confidence).toBe(1.0);
      expect(result.framework).toBe('pytest');
    });

    it('detects test/ directory (alternative)', async () => {
      await mkdir(join(testDir, 'test'));
      const result = await findTestLocations(testDir, 'python', null);

      expect(result.testLocations).toEqual(['test/']);
      expect(result.confidence).toBe(1.0);
      expect(result.framework).toBe('pytest');
    });

    it('returns empty for project with no tests', async () => {
      const result = await findTestLocations(testDir, 'python', null);

      expect(result.testLocations).toEqual([]);
      expect(result.confidence).toBe(0.0);
      expect(result.framework).toBe('unknown');
    });

    it('detects pytest.ini config', async () => {
      await writeFile(join(testDir, 'pytest.ini'), '');
      const result = await findTestLocations(testDir, 'python', null);

      expect(result.framework).toBe('pytest');
      expect(result.confidence).toBe(0.80);
    });
  });

  describe('Node (Jest/Vitest)', () => {
    it('detects __tests__/ directory (Jest convention)', async () => {
      await mkdir(join(testDir, '__tests__'));
      const result = await findTestLocations(testDir, 'node', null);

      expect(result.testLocations).toEqual(['__tests__/']);
      expect(result.confidence).toBe(1.0);
      expect(result.framework).toBe('jest');
    });

    it('detects tests/ directory', async () => {
      await mkdir(join(testDir, 'tests'));
      const result = await findTestLocations(testDir, 'node', null);

      expect(result.testLocations).toEqual(['tests/']);
      expect(result.confidence).toBe(1.0);
      expect(result.framework).toBe('jest');
    });

    it('detects test/ directory', async () => {
      await mkdir(join(testDir, 'test'));
      const result = await findTestLocations(testDir, 'node', null);

      expect(result.testLocations).toEqual(['test/']);
      expect(result.confidence).toBe(1.0);
    });

    it('detects vitest.config.ts', async () => {
      await writeFile(join(testDir, 'vitest.config.ts'), '');
      const result = await findTestLocations(testDir, 'node', null);

      expect(result.framework).toBe('vitest');
      expect(result.confidence).toBe(0.85);
    });

    it('detects jest.config.js', async () => {
      await writeFile(join(testDir, 'jest.config.js'), '');
      const result = await findTestLocations(testDir, 'node', null);

      expect(result.framework).toBe('jest');
      expect(result.confidence).toBe(0.85);
    });

    it('returns empty for no tests', async () => {
      const result = await findTestLocations(testDir, 'node', null);

      expect(result.testLocations).toEqual([]);
      expect(result.confidence).toBe(0.0);
    });
  });

  describe('Go (go test)', () => {
    it('returns *_test.go pattern (colocated)', async () => {
      const result = await findTestLocations(testDir, 'go', null);

      expect(result.testLocations).toEqual(['*_test.go']);
      expect(result.confidence).toBe(1.0);
      expect(result.framework).toBe('go-test');
    });
  });

  describe('Rust (cargo test)', () => {
    it('detects tests/ directory', async () => {
      await mkdir(join(testDir, 'tests'));
      const result = await findTestLocations(testDir, 'rust', null);

      expect(result.testLocations).toEqual(['tests/']);
      expect(result.confidence).toBe(1.0);
      expect(result.framework).toBe('cargo-test');
    });

    it('returns empty for no tests', async () => {
      const result = await findTestLocations(testDir, 'rust', null);

      expect(result.testLocations).toEqual([]);
      expect(result.confidence).toBe(0.0);
    });
  });
});
