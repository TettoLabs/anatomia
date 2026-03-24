import { describe, it, expect } from 'vitest';
import { analyze } from '../../src/index.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('WASM smoke test', () => {
  it('analyze() parses real files and returns extracted data', async () => {
    // Create minimal project with parseable code
    const testDir = join(tmpdir(), `ana-wasm-smoke-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    await writeFile(join(testDir, 'package.json'), '{"name":"test","version":"1.0.0"}');
    await writeFile(join(testDir, 'index.ts'), `
      import { readFile } from 'node:fs/promises';
      export function hello(name: string): string { return name; }
      export class Greeter { greet() { return 'hi'; } }
    `);

    try {
      const result = await analyze(testDir);

      // WASM must produce actual parsed data, not empty results
      expect(result.parsed).toBeDefined();
      expect(result.parsed!.totalParsed).toBeGreaterThan(0);
      expect(result.parsed!.files.length).toBeGreaterThan(0);

      const file = result.parsed!.files[0]!;
      expect(file.functions.length).toBeGreaterThan(0);
      expect(file.imports.length).toBeGreaterThan(0);
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  }, 30000);
});
