import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { findProjectRoot } from '../../src/utils/validators.js';

describe('findProjectRoot', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'find-root-test-'));
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  // @ana A001
  it('returns CWD when .ana/ exists in CWD', () => {
    fs.mkdirSync(path.join(tempDir, '.ana'));
    const result = findProjectRoot(tempDir);
    expect(result).toBe(tempDir);
  });

  // @ana A002
  it('walks up to find .ana/ from a subdirectory', () => {
    fs.mkdirSync(path.join(tempDir, '.ana'));
    const subDir = path.join(tempDir, 'packages', 'cli');
    fs.mkdirSync(subDir, { recursive: true });

    const result = findProjectRoot(subDir);
    expect(result).toBe(tempDir);
  });

  // @ana A003
  it('walks up multiple levels to find .ana/', () => {
    fs.mkdirSync(path.join(tempDir, '.ana'));
    const deepDir = path.join(tempDir, 'packages', 'cli', 'src', 'commands');
    fs.mkdirSync(deepDir, { recursive: true });

    const result = findProjectRoot(deepDir);
    expect(result).toBe(tempDir);
  });

  // @ana A004, A005
  it('throws when no .ana/ exists in the tree', () => {
    // tempDir has no .ana/ — walk will reach filesystem root
    expect(() => findProjectRoot(tempDir)).toThrow('No .ana/ found in');
    expect(() => findProjectRoot(tempDir)).toThrow(
      'Run ana init from your project root'
    );
  });

  // @ana A006
  it('finds nearest .ana/ when nested projects exist', () => {
    // Outer project
    fs.mkdirSync(path.join(tempDir, '.ana'));

    // Inner project
    const innerProjectDir = path.join(tempDir, 'packages', 'inner');
    fs.mkdirSync(path.join(innerProjectDir, '.ana'), { recursive: true });

    const subDir = path.join(innerProjectDir, 'src');
    fs.mkdirSync(subDir, { recursive: true });

    const result = findProjectRoot(subDir);
    expect(result).toBe(innerProjectDir);
  });

  // @ana A007
  it('is exported from validators module', () => {
    expect(typeof findProjectRoot).toBe('function');
  });
});
