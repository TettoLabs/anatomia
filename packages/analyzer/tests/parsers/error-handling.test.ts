import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseFile } from '../../src/parsers/treeSitter.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Error handling', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `ana-test-errors-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('handles Python syntax error gracefully', async () => {
    const malformed = 'def broken(\n    pass';  // Missing closing paren
    const filePath = join(testDir, 'broken.py');
    await writeFile(filePath, malformed, 'utf8');

    const parsed = await parseFile(filePath, 'python');

    expect(parsed.errors).toBeGreaterThan(0);  // Has ERROR nodes
    expect(parsed.functions).toBeDefined();     // Still returns functions array
    expect(Array.isArray(parsed.functions)).toBe(true);
    // May extract partial results - that's OK
  });

  it('handles TypeScript syntax error gracefully', async () => {
    const malformed = 'function broken( {';  // Missing param closing
    const filePath = join(testDir, 'broken.ts');
    await writeFile(filePath, malformed, 'utf8');

    const parsed = await parseFile(filePath, 'typescript');

    expect(parsed.errors).toBeGreaterThan(0);
    expect(parsed.functions).toBeDefined();
    expect(Array.isArray(parsed.functions)).toBe(true);
  });

  it('handles empty file gracefully', async () => {
    const filePath = join(testDir, 'empty.py');
    await writeFile(filePath, '', 'utf8');

    const parsed = await parseFile(filePath, 'python');

    expect(parsed.errors).toBe(0);
    expect(parsed.functions).toEqual([]);
    expect(parsed.classes).toEqual([]);
    expect(parsed.imports).toEqual([]);
  });

  it('handles file with only comments', async () => {
    const comments = '# This is a comment\n# Another comment\n';
    const filePath = join(testDir, 'comments.py');
    await writeFile(filePath, comments, 'utf8');

    const parsed = await parseFile(filePath, 'python');

    expect(parsed.errors).toBe(0);
    expect(parsed.functions).toEqual([]);
    expect(parsed.classes).toEqual([]);
  });

  it('handles JavaScript with incomplete code', async () => {
    const incomplete = 'const x = ';  // Incomplete statement
    const filePath = join(testDir, 'incomplete.js');
    await writeFile(filePath, incomplete, 'utf8');

    const parsed = await parseFile(filePath, 'javascript');

    expect(parsed.errors).toBeGreaterThan(0);
    expect(parsed.functions).toBeDefined();
  });

  it('handles Go with missing package declaration', async () => {
    const invalid = 'func main() {}';  // Missing 'package main'
    const filePath = join(testDir, 'nopkg.go');
    await writeFile(filePath, invalid, 'utf8');

    const parsed = await parseFile(filePath, 'go');

    // Go parser is lenient, might not error
    expect(parsed.functions).toBeDefined();
    expect(Array.isArray(parsed.functions)).toBe(true);
  });
});
