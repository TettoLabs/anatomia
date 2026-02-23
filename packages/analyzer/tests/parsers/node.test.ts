import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readNodeDependencies } from '../../src/parsers/node.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

describe('readNodeDependencies', () => {
  let tempDir: string;

  beforeAll(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'node-parser-test-'));
  });

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('reads dependencies from package.json', async () => {
    const packageJson = {
      name: 'test-app',
      dependencies: {
        express: '^4.18.0',
        next: '15.0.0',
      },
      devDependencies: {
        typescript: '^5.7.0',
      },
    };

    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson)
    );

    const result = await readNodeDependencies(tempDir);

    expect(result).toHaveLength(3);
    expect(result).toContain('express');
    expect(result).toContain('next');
    expect(result).toContain('typescript');
  });

  it('returns empty array when package.json does not exist', async () => {
    const nonExistentDir = path.join(tempDir, 'non-existent');

    const result = await readNodeDependencies(nonExistentDir);

    expect(result).toEqual([]);
  });

  it('handles malformed package.json gracefully', async () => {
    const malformedDir = path.join(tempDir, 'malformed');
    await fs.mkdir(malformedDir, { recursive: true });
    await fs.writeFile(
      path.join(malformedDir, 'package.json'),
      '{ invalid json }'
    );

    const result = await readNodeDependencies(malformedDir);

    expect(result).toEqual([]);
  });

  it('handles scoped packages correctly', async () => {
    const scopedDir = path.join(tempDir, 'scoped');
    await fs.mkdir(scopedDir, { recursive: true });

    const packageJson = {
      dependencies: {
        '@nestjs/core': '^10.0.0',
        '@types/node': '^20.0.0',
        express: '^4.18.0',
      },
    };

    await fs.writeFile(
      path.join(scopedDir, 'package.json'),
      JSON.stringify(packageJson)
    );

    const result = await readNodeDependencies(scopedDir);

    expect(result).toContain('@nestjs/core');
    expect(result).toContain('@types/node');
    expect(result).toContain('express');
  });

  it('combines all dependency sections', async () => {
    const allDepsDir = path.join(tempDir, 'all-deps');
    await fs.mkdir(allDepsDir, { recursive: true });

    const packageJson = {
      dependencies: {
        express: '^4.18.0',
      },
      devDependencies: {
        vitest: '^2.0.0',
        typescript: '^5.7.0',
      },
      peerDependencies: {
        react: '>=18.0.0',
      },
    };

    await fs.writeFile(
      path.join(allDepsDir, 'package.json'),
      JSON.stringify(packageJson)
    );

    const result = await readNodeDependencies(allDepsDir);

    expect(result).toHaveLength(4);
    expect(result).toContain('express');
    expect(result).toContain('vitest');
    expect(result).toContain('typescript');
    expect(result).toContain('react');
  });
});
