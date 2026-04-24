import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { readBranchPrefix } from '../../src/utils/git-operations.js';
import { AnaJsonSchema } from '../../src/commands/init/anaJsonSchema.js';

/**
 * Tests for readBranchPrefix() and AnaJsonSchema branchPrefix handling.
 *
 * Uses temp directories with ana.json fixtures for isolation.
 */

describe('readBranchPrefix', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-ops-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /** Helper to write an ana.json fixture */
  async function writeAnaJson(config: Record<string, unknown>): Promise<void> {
    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(
      path.join(anaDir, 'ana.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  // @ana A003
  it('returns configured value when branchPrefix is present', async () => {
    await writeAnaJson({ artifactBranch: 'main', branchPrefix: 'dev/' });
    const result = readBranchPrefix(tempDir);
    expect(result).toBe('dev/');
  });

  // @ana A004
  it('returns "feature/" when branchPrefix field is absent', async () => {
    await writeAnaJson({ artifactBranch: 'main' });
    const result = readBranchPrefix(tempDir);
    expect(result).toBe('feature/');
  });

  // @ana A005
  it('returns "feature/" when ana.json is missing entirely', () => {
    const result = readBranchPrefix(tempDir);
    expect(result).toBe('feature/');
  });

  // @ana A006
  it('returns empty string when branchPrefix is ""', async () => {
    await writeAnaJson({ artifactBranch: 'main', branchPrefix: '' });
    const result = readBranchPrefix(tempDir);
    expect(result).toBe('');
  });

  it('returns "feature/" when branchPrefix is a number', async () => {
    await writeAnaJson({ artifactBranch: 'main', branchPrefix: 42 });
    const result = readBranchPrefix(tempDir);
    expect(result).toBe('feature/');
  });

  it('returns "feature/" when branchPrefix is null', async () => {
    await writeAnaJson({ artifactBranch: 'main', branchPrefix: null });
    const result = readBranchPrefix(tempDir);
    expect(result).toBe('feature/');
  });

  it('returns "feature/" when ana.json is corrupted', async () => {
    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(path.join(anaDir, 'ana.json'), '{invalid json', 'utf-8');
    const result = readBranchPrefix(tempDir);
    expect(result).toBe('feature/');
  });
});

describe('AnaJsonSchema branchPrefix', () => {
  // @ana A001
  it('defaults branchPrefix to "feature/" when field is absent', () => {
    const parsed = AnaJsonSchema.parse({ name: 'test' });
    expect(parsed.branchPrefix).toBe('feature/');
  });

  // @ana A002
  it('preserves a user-modified branchPrefix through round-trip', () => {
    const input = {
      name: 'test',
      branchPrefix: 'dev/',
      artifactBranch: 'main',
    };
    const parsed = AnaJsonSchema.parse(input);
    expect(parsed.branchPrefix).toBe('dev/');
  });

  // @ana A007
  it('catches invalid branchPrefix and defaults to "feature/"', () => {
    const input = {
      name: 'test',
      branchPrefix: 12345,
    };
    const parsed = AnaJsonSchema.parse(input);
    expect(parsed.branchPrefix).toBe('feature/');
  });

  it('preserves empty string branchPrefix', () => {
    const input = { name: 'test', branchPrefix: '' };
    const parsed = AnaJsonSchema.parse(input);
    expect(parsed.branchPrefix).toBe('');
  });

  it('strips unknown fields but keeps branchPrefix', () => {
    const input = {
      name: 'test',
      branchPrefix: 'release/',
      unknownField: 'should-be-stripped',
    };
    const parsed = AnaJsonSchema.parse(input);
    expect(parsed.branchPrefix).toBe('release/');
    expect((parsed as Record<string, unknown>)['unknownField']).toBeUndefined();
  });
});
