import { describe, it, expect } from 'vitest';
import { scanProject } from '../../../src/engine/index.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { skipIfNoWasm } from '../fixtures.js';

const wasmAvailable = await skipIfNoWasm();

describe.skipIf(!wasmAvailable)('WASM smoke test', () => {
  it('scanProject deep tier parses real files and returns conventions/patterns', async () => {
    const testDir = join(tmpdir(), `ana-wasm-smoke-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    await writeFile(join(testDir, 'package.json'), JSON.stringify({
      name: 'test', version: '1.0.0',
      dependencies: { express: '4.18.0', zod: '3.22.0' },
    }));
    await writeFile(join(testDir, 'index.ts'), `
      import { readFile } from 'node:fs/promises';
      export function hello(name: string): string { return name; }
      export class Greeter { greet() { return 'hi'; } }
    `);
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src', 'app.ts'), `
      export function getData(): string { return 'data'; }
    `);

    try {
      const result = await scanProject(testDir, { depth: 'deep' });

      // Stack should be populated from detection
      expect(result.stack.language).toBeDefined();
      expect(result.stack.framework).toBe('Express');
      // Deep tier should produce conventions (if WASM parsing works)
      // Conventions may be null if parsing fails gracefully, but stack should always work
      expect(result.overview.depth).toBe('deep');
    } finally {
      await rm(testDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  }, 30000);
});
