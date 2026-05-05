/**
 * Entry point detection tests for Node.js frameworks
 *
 * Tests the findEntryPoints function for Node.js project types
 * with various frameworks (NestJS, Next.js, Express) and conventions.
 *
 * Uses real filesystem fixtures to validate detection accuracy.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findEntryPoints } from '../../../src/engine/analyzers/structure/index.js';
import { mkdir, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Node.js entry point detection', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'test-entry-points-node-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  });

  it('reads package.json "main" field (framework=null)', async () => {
    // Create fixture: package.json with "main" field
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test-package',
        main: './dist/server.js',
      })
    );

    const result = await findEntryPoints(testDir, 'node', null);

    expect(result.entryPoints).toEqual(['dist/server.js']);
    expect(result.confidence).toBe(1.0);
    expect(result.source).toBe('package.json-main');
  });

  it('reads package.json "exports" field (framework=null)', async () => {
    // Create fixture: package.json with "exports" field
    // exports takes precedence over main
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test-package',
        main: './dist/index.js',
        exports: './lib/index.js',
      })
    );

    const result = await findEntryPoints(testDir, 'node', null);

    expect(result.entryPoints).toEqual(['lib/index.js']);
    expect(result.confidence).toBe(1.0);
    expect(result.source).toBe('package.json-exports');
  });

  it('detects NestJS src/main.ts (framework=nestjs)', async () => {
    // Create fixture: NestJS src/main.ts
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src/main.ts'), '');

    const result = await findEntryPoints(testDir, 'node', 'nestjs');

    expect(result.entryPoints).toEqual(['src/main.ts']);
    expect(result.confidence).toBe(1.0);
    expect(result.source).toBe('framework-convention');
  });

  it('detects Next.js App Router app/layout.tsx (framework=nextjs)', async () => {
    // Create fixture: Next.js App Router app/layout.tsx
    await mkdir(join(testDir, 'app'), { recursive: true });
    await writeFile(join(testDir, 'app/layout.tsx'), '');

    const result = await findEntryPoints(testDir, 'node', 'nextjs');

    expect(result.entryPoints).toEqual(['app/layout.tsx']);
    expect(result.confidence).toBe(1.0);
    expect(result.source).toBe('framework-convention');
  });

  it('detects Next.js Pages Router pages/_app.tsx (framework=nextjs, no app/ dir)', async () => {
    // Create fixture: Next.js Pages Router pages/_app.tsx (no app/ directory)
    await mkdir(join(testDir, 'pages'), { recursive: true });
    await writeFile(join(testDir, 'pages/_app.tsx'), '');

    const result = await findEntryPoints(testDir, 'node', 'nextjs');

    expect(result.entryPoints).toEqual(['pages/_app.tsx']);
    expect(result.confidence).toBe(1.0);
    expect(result.source).toBe('framework-convention');
  });

  it('detects Express app.js (framework=null, no package.json)', async () => {
    // Create fixture: Express app.js (no package.json)
    await writeFile(join(testDir, 'app.js'), '');

    const result = await findEntryPoints(testDir, 'node', null);

    expect(result.entryPoints).toEqual(['app.js']);
    expect(result.confidence).toBe(0.95);
    expect(result.source).toBe('convention');
  });

  it('detects Express server.js (framework=null, no app.js)', async () => {
    // Create fixture: Express server.js (no app.js)
    await writeFile(join(testDir, 'server.js'), '');

    const result = await findEntryPoints(testDir, 'node', null);

    expect(result.entryPoints).toEqual(['server.js']);
    expect(result.confidence).toBe(0.95);
    expect(result.source).toBe('convention');
  });

  it('detects Express ambiguity (framework=null, both app.js AND server.js exist)', async () => {
    // Create fixture: Both app.js and server.js exist (ambiguous)
    await writeFile(join(testDir, 'app.js'), '');
    await writeFile(join(testDir, 'server.js'), '');

    const result = await findEntryPoints(testDir, 'node', null);

    expect(result.entryPoints).toEqual(['app.js', 'server.js']);
    expect(result.confidence).toBe(0.75);
    expect(result.source).toBe('convention');
  });

  it('detects TypeScript src/index.ts (framework=null)', async () => {
    // Create fixture: TypeScript src/index.ts
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src/index.ts'), '');

    const result = await findEntryPoints(testDir, 'node', null);

    expect(result.entryPoints).toEqual(['src/index.ts']);
    expect(result.confidence).toBe(0.95);
    expect(result.source).toBe('convention');
  });

  it('detects npm default index.js (framework=null, no package.json)', async () => {
    // Create fixture: npm default index.js at root
    await writeFile(join(testDir, 'index.js'), '');

    const result = await findEntryPoints(testDir, 'node', null);

    expect(result.entryPoints).toEqual(['index.js']);
    expect(result.confidence).toBe(0.95);
    expect(result.source).toBe('convention');
  });
});
