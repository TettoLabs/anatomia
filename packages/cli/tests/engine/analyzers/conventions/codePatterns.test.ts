import { describe, it, expect } from 'vitest';
import { analyzeCodePatterns } from '../../../../src/engine/analyzers/conventions/codePatterns.js';

function makeFiles(files: Array<{ path: string; content: string }>) {
  return files;
}

describe('analyzeCodePatterns', () => {
  describe('jsExtensionImports', () => {
    it('detects .js extension on local imports', () => {
      const files = makeFiles([
        { path: 'src/a.ts', content: "import { foo } from './bar.js';\nimport { baz } from './qux.js';" },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.jsExtensionImports?.count).toBe(2);
      expect(result.jsExtensionImports?.total).toBe(2);
      expect(result.jsExtensionImports?.ratio).toBe(1);
    });

    it('detects mixed .js and bare local imports', () => {
      const files = makeFiles([
        { path: 'src/a.ts', content: "import { foo } from './bar.js';\nimport { baz } from './qux';" },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.jsExtensionImports?.ratio).toBe(0.5);
    });

    it('ignores package imports (only counts local)', () => {
      const files = makeFiles([
        { path: 'src/a.ts', content: "import express from 'express';\nimport { foo } from './bar.js';" },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.jsExtensionImports?.count).toBe(1);
      expect(result.jsExtensionImports?.total).toBe(1);
    });

    it('returns undefined when no local imports found', () => {
      const files = makeFiles([
        { path: 'src/a.ts', content: "import express from 'express';" },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.jsExtensionImports).toBeUndefined();
    });
  });

  describe('nodePrefix', () => {
    it('detects node: prefix usage', () => {
      const files = makeFiles([
        { path: 'src/a.ts', content: "import * as fs from 'node:fs';\nimport * as path from 'node:path';" },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.nodePrefix?.count).toBe(2);
      expect(result.nodePrefix?.ratio).toBe(1);
    });

    it('detects bare builtin imports', () => {
      const files = makeFiles([
        { path: 'src/a.ts', content: "import * as fs from 'fs';\nimport * as path from 'path';" },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.nodePrefix?.count).toBe(0);
      expect(result.nodePrefix?.total).toBe(2);
      expect(result.nodePrefix?.ratio).toBe(0);
    });

    it('ignores non-builtin imports', () => {
      const files = makeFiles([
        { path: 'src/a.ts', content: "import chalk from 'chalk';\nimport * as fs from 'node:fs';" },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.nodePrefix?.total).toBe(1);
    });
  });

  describe('emptyCatches', () => {
    it('counts truly empty catch blocks', () => {
      const files = makeFiles([
        { path: 'src/a.ts', content: 'try { x() } catch {} try { y() } catch (e) {}' },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.emptyCatches?.empty).toBe(2);
      expect(result.emptyCatches?.total).toBe(2);
    });

    it('counts commented catch blocks separately', () => {
      const files = makeFiles([
        { path: 'src/a.ts', content: 'try { x() } catch (e) { /* intentional */ }' },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.emptyCatches?.commented).toBe(1);
      expect(result.emptyCatches?.empty).toBe(0);
    });

    it('excludes test files from catch analysis', () => {
      const files = makeFiles([
        { path: 'src/a.ts', content: 'try { x() } catch {}' },
        { path: 'tests/a.test.ts', content: 'try { x() } catch {}' },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.emptyCatches?.empty).toBe(1);
    });

    it('counts catch with real code as neither empty nor commented', () => {
      const files = makeFiles([
        { path: 'src/a.ts', content: 'try { x() } catch (e) { console.error(e) }' },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.emptyCatches?.empty).toBe(0);
      expect(result.emptyCatches?.commented).toBe(0);
      expect(result.emptyCatches?.total).toBe(1);
    });
  });

  describe('defaultExports', () => {
    it('counts files with default exports', () => {
      const files = makeFiles([
        { path: 'src/a.ts', content: 'export default function foo() {}' },
        { path: 'src/b.ts', content: 'export function bar() {}' },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.defaultExports?.count).toBe(1);
      expect(result.defaultExports?.totalFiles).toBe(2);
    });
  });

  describe('nullStyle', () => {
    it('detects null union preference', () => {
      const files = makeFiles([
        { path: 'src/types.ts', content: 'type A = string | null;\ntype B = number | null;' },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.nullStyle?.nullCount).toBe(2);
      expect(result.nullStyle?.preference).toBe('null');
    });

    it('detects optional preference', () => {
      const files = makeFiles([
        { path: 'src/types.ts', content: 'interface A { name?: string; age?: number; }' },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.nullStyle?.optionalCount).toBe(2);
      expect(result.nullStyle?.preference).toBe('undefined');
    });

    it('reports mixed when both used', () => {
      const files = makeFiles([
        { path: 'src/types.ts', content: 'type A = string | null;\ninterface B { name?: string; age?: number; }' },
      ]);
      const result = analyzeCodePatterns(files);
      expect(result.nullStyle?.preference).toBe('mixed');
    });
  });
});
