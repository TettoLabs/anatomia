import { describe, it, expect } from 'vitest';
import { sampleFilesProportional } from '../../../src/engine/sampling/proportionalSampler.js';
import type { ProjectCensus, SourceRoot } from '../../../src/engine/types/census.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

function makeRoot(relativePath: string, fileCount: number, isPrimary = false): SourceRoot {
  return {
    absolutePath: '', // set per test
    relativePath,
    packageName: null,
    fileCount,
    isPrimary,
    deps: {},
    devDeps: {},
  };
}

function makeCensus(rootPath: string, roots: SourceRoot[]): ProjectCensus {
  return {
    rootPath,
    projectName: 'test',
    layout: roots.length > 1 ? 'monorepo' : 'single-repo',
    monorepoTool: roots.length > 1 ? 'pnpm' : null,
    sourceRoots: roots,
    primarySourceRoot: roots.find(r => r.isPrimary)?.relativePath ?? '.',
    allDeps: {},
    deps: {},
    devDeps: {},
    rootDevDeps: {},
    primaryDeps: {},
    configs: { frameworkHints: [], tsconfigs: [], schemas: [], deployments: [], ciWorkflows: [] },
    builtAt: new Date().toISOString(),
    buildDurationMs: 0,
  };
}

describe('Proportional sampler', () => {
  it('samples from single-repo project', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sampler-'));
    try {
      // Create some source files
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      for (let i = 0; i < 10; i++) {
        fs.writeFileSync(path.join(tmpDir, 'src', `file${i}.ts`), '// source');
      }

      const root = makeRoot('.', 10, true);
      root.absolutePath = tmpDir;
      const census = makeCensus(tmpDir, [root]);

      const files = await sampleFilesProportional(census, 500);
      expect(files.length).toBe(10);
      expect(files.every(f => f.endsWith('.ts'))).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('allocates proportionally across source roots', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sampler-'));
    try {
      // Create monorepo-like structure: apps/web has 80 files, packages/ui has 20
      const webDir = path.join(tmpDir, 'apps', 'web', 'src');
      const uiDir = path.join(tmpDir, 'packages', 'ui', 'src');
      fs.mkdirSync(webDir, { recursive: true });
      fs.mkdirSync(uiDir, { recursive: true });

      for (let i = 0; i < 80; i++) {
        fs.writeFileSync(path.join(webDir, `page${i}.tsx`), '// web');
      }
      for (let i = 0; i < 20; i++) {
        fs.writeFileSync(path.join(uiDir, `comp${i}.tsx`), '// ui');
      }

      const webRoot = makeRoot('apps/web', 80, true);
      webRoot.absolutePath = path.join(tmpDir, 'apps', 'web');
      const uiRoot = makeRoot('packages/ui', 20, false);
      uiRoot.absolutePath = path.join(tmpDir, 'packages', 'ui');

      const census = makeCensus(tmpDir, [webRoot, uiRoot]);

      // Budget 10 — should get ~8 from web, ~2 from ui
      const files = await sampleFilesProportional(census, 10);
      expect(files.length).toBe(10);

      const webFiles = files.filter(f => f.startsWith('apps/web'));
      const uiFiles = files.filter(f => f.startsWith('packages/ui'));

      // Proportional: web should get more than ui
      expect(webFiles.length).toBeGreaterThan(uiFiles.length);
      // Floor of 1: ui should have at least 1
      expect(uiFiles.length).toBeGreaterThanOrEqual(1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('excludes test files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sampler-'));
    try {
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), '// source');
      fs.writeFileSync(path.join(tmpDir, 'src', 'app.test.ts'), '// test');
      fs.writeFileSync(path.join(tmpDir, 'src', 'app.spec.ts'), '// spec');

      const root = makeRoot('.', 3, true);
      root.absolutePath = tmpDir;
      const census = makeCensus(tmpDir, [root]);

      const files = await sampleFilesProportional(census, 500);
      expect(files).toHaveLength(1);
      expect(files[0]).toContain('app.ts');
      expect(files.some(f => f.includes('.test.'))).toBe(false);
      expect(files.some(f => f.includes('.spec.'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('respects budget cap', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sampler-'));
    try {
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      for (let i = 0; i < 100; i++) {
        fs.writeFileSync(path.join(tmpDir, 'src', `f${i}.ts`), '// source');
      }

      const root = makeRoot('.', 100, true);
      root.absolutePath = tmpDir;
      const census = makeCensus(tmpDir, [root]);

      const files = await sampleFilesProportional(census, 10);
      expect(files.length).toBe(10);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('sorts by depth then alpha (shallow files first)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sampler-'));
    try {
      fs.mkdirSync(path.join(tmpDir, 'src', 'deep', 'nested'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'deep', 'nested', 'deep.ts'), '// deep');
      fs.writeFileSync(path.join(tmpDir, 'src', 'shallow.ts'), '// shallow');
      fs.writeFileSync(path.join(tmpDir, 'index.ts'), '// root');

      const root = makeRoot('.', 3, true);
      root.absolutePath = tmpDir;
      const census = makeCensus(tmpDir, [root]);

      const files = await sampleFilesProportional(census, 500);
      // Root-level files should come first, then src/, then deep
      expect(files.indexOf('index.ts')).toBeLessThan(files.indexOf('src/shallow.ts'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});
