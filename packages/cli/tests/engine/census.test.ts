import { describe, it, expect } from 'vitest';
import { buildCensus } from '../../src/engine/census.js';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

// Repo root is two levels above packages/cli
const REPO_ROOT = path.resolve(process.cwd(), '..', '..');

describe('buildCensus', () => {
  it('builds census for Anatomia itself (pnpm monorepo)', async () => {
    const census = await buildCensus(REPO_ROOT);

    expect(census.layout).toBe('monorepo');
    expect(census.monorepoTool).toBe('pnpm');
    expect(census.sourceRoots.length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(census.allDeps).length).toBeGreaterThan(0);
    expect(census.allDeps).toHaveProperty('vitest');
    expect(census.configs.ciWorkflows.length).toBeGreaterThanOrEqual(1);
    expect(census.buildDurationMs).toBeGreaterThanOrEqual(0);

    // Invariant: exactly one primary
    const primaries = census.sourceRoots.filter(r => r.isPrimary);
    expect(primaries).toHaveLength(1);
    expect(primaries[0]!.relativePath).toBe(census.primarySourceRoot);
  });

  it('builds census for empty directory (no package.json)', async () => {
    const { mkdtempSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const tmpDir = mkdtempSync(join(tmpdir(), 'census-test-'));
    try {
      const census = await buildCensus(tmpDir);
      expect(census.layout).toBe('single-repo');
      expect(census.monorepoTool).toBeNull();
      expect(census.sourceRoots).toHaveLength(1);
      expect(census.sourceRoots[0]!.isPrimary).toBe(true);
      expect(Object.keys(census.allDeps)).toHaveLength(0);
    } finally {
      rmSync(tmpDir, { recursive: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  const calComPath = '/tmp/ana-research/cal.com';
  const calComExists = existsSync(path.join(calComPath, 'package.json'));

  it.skipIf(!calComExists)('validates against cal.com (target-customer monorepo)', async () => {
    const census = await buildCensus(calComPath);

    expect(census.layout).toBe('monorepo');
    // cal.com uses yarn workspaces
    expect(census.monorepoTool).toBe('yarn');
    // Should have many source roots (115 packages)
    expect(census.sourceRoots.length).toBeGreaterThan(50);
    // allDeps should be rich
    expect(Object.keys(census.allDeps).length).toBeGreaterThan(100);
    // Should have next in deps
    expect(census.allDeps).toHaveProperty('next');
    // Framework hints should include nextjs
    const nextjsHints = census.configs.frameworkHints.filter(h => h.framework === 'nextjs');
    expect(nextjsHints.length).toBeGreaterThan(0);
    // Primary should be under apps/
    expect(census.primarySourceRoot).toMatch(/^apps\//);
  });

  const dubPath = '/tmp/ana-research/dub';
  const dubExists = existsSync(path.join(dubPath, 'package.json'));

  it.skipIf(!dubExists)('validates against dub (target-customer monorepo)', async () => {
    const census = await buildCensus(dubPath);
    expect(census.layout).toBe('monorepo');
    expect(census.sourceRoots.length).toBeGreaterThan(1);
    expect(Object.keys(census.allDeps).length).toBeGreaterThan(10);
  });
});
