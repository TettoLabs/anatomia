import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { findProjectRoot } from '../../src/utils/validators.js';
import { readArtifactBranch } from '../../src/utils/git-operations.js';

describe('findProjectRoot', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'find-root-test-'));
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  });

  // Helper: create a valid .ana/ with ana.json
  function createAnaDir(dir: string): void {
    const anaDir = path.join(dir, '.ana');
    fs.mkdirSync(anaDir, { recursive: true });
    fs.writeFileSync(path.join(anaDir, 'ana.json'), '{}');
  }

  // Helper: create a valid project root (.ana/ + .git/)
  function createProjectRoot(dir: string): void {
    createAnaDir(dir);
    fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
  }

  // @ana A001
  it('returns CWD when .ana/ana.json exists in CWD', () => {
    createProjectRoot(tempDir);
    const result = findProjectRoot(tempDir);
    expect(result).toBe(tempDir);
  });

  // @ana A002
  it('walks up to find .ana/ana.json from a subdirectory', () => {
    createProjectRoot(tempDir);
    const subDir = path.join(tempDir, 'packages', 'cli');
    fs.mkdirSync(subDir, { recursive: true });

    const result = findProjectRoot(subDir);
    expect(result).toBe(tempDir);
  });

  // @ana A003
  it('walks up multiple levels to find .ana/ana.json', () => {
    createProjectRoot(tempDir);
    const deepDir = path.join(tempDir, 'packages', 'cli', 'src', 'commands');
    fs.mkdirSync(deepDir, { recursive: true });

    const result = findProjectRoot(deepDir);
    expect(result).toBe(tempDir);
  });

  // @ana A004, A005
  it('throws when no .ana/ana.json exists in the tree', () => {
    // tempDir has no .ana/ — walk will reach filesystem root
    expect(() => findProjectRoot(tempDir)).toThrow('No .ana/ found in');
    expect(() => findProjectRoot(tempDir)).toThrow(
      'Run ana init from your project root'
    );
  });

  it('ignores .ana/ directory without ana.json (stale test debris)', () => {
    // Create a stale .ana/ without ana.json — should be skipped
    fs.mkdirSync(path.join(tempDir, '.ana'));
    expect(() => findProjectRoot(tempDir)).toThrow('No .ana/ found in');
  });

  // @ana A006
  it('finds nearest .ana/ana.json when nested projects exist', () => {
    // Outer project
    createProjectRoot(tempDir);

    // Inner project
    const innerProjectDir = path.join(tempDir, 'packages', 'inner');
    createProjectRoot(innerProjectDir);

    const subDir = path.join(innerProjectDir, 'src');
    fs.mkdirSync(subDir, { recursive: true });

    const result = findProjectRoot(subDir);
    expect(result).toBe(innerProjectDir);
  });

  // @ana A014
  it('rejects directory with .ana/ana.json but no .git', () => {
    // Create .ana/ana.json without .git/ — should be skipped, eventually throw
    createAnaDir(tempDir);
    expect(() => findProjectRoot(tempDir)).toThrow('No .ana/ found in');
  });

  // @ana A015
  it('accepts directory with both .ana/ana.json and .git', () => {
    createAnaDir(tempDir);
    // Create .git directory (normal repo)
    fs.mkdirSync(path.join(tempDir, '.git'));
    const result = findProjectRoot(tempDir);
    expect(result).toBe(tempDir);
  });

  it('accepts directory with .ana/ana.json and .git as file (worktree)', () => {
    createAnaDir(tempDir);
    // git worktree creates .git as a file, not a directory
    fs.writeFileSync(path.join(tempDir, '.git'), 'gitdir: /some/other/path');
    const result = findProjectRoot(tempDir);
    expect(result).toBe(tempDir);
  });

  it('walks up past .ana without .git to find proper root', () => {
    // Inner dir has .ana but no .git — should be skipped
    const innerDir = path.join(tempDir, 'inner');
    fs.mkdirSync(innerDir, { recursive: true });
    createAnaDir(innerDir);

    // Outer dir has both .ana and .git — should be found
    createAnaDir(tempDir);
    fs.mkdirSync(path.join(tempDir, '.git'));

    const result = findProjectRoot(innerDir);
    expect(result).toBe(tempDir);
  });

  // @ana A008
  it('readArtifactBranch accepts projectRoot parameter', () => {
    // Create a temp project with .ana/ana.json containing artifactBranch
    fs.mkdirSync(path.join(tempDir, '.ana'));
    fs.writeFileSync(
      path.join(tempDir, '.ana', 'ana.json'),
      JSON.stringify({ artifactBranch: 'main' })
    );

    const result = readArtifactBranch(tempDir);
    expect(result).toBe('main');
  });

});
