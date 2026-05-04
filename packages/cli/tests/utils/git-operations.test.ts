import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { readArtifactBranch, readBranchPrefix, readCoAuthor } from '../../src/utils/git-operations.js';
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

describe('readCoAuthor', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-ops-coauthor-'));
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

  // @ana A001
  it('reads coAuthor from ana.json when present', async () => {
    await writeAnaJson({ coAuthor: 'Custom Bot <bot@example.com>' });
    const result = readCoAuthor(tempDir);
    expect(result).toBe('Custom Bot <bot@example.com>');
  });

  // @ana A002
  it('returns default when ana.json is missing', () => {
    const result = readCoAuthor(tempDir);
    expect(result).toBe('Ana <build@anatomia.dev>');
  });

  it('returns default when coAuthor field is absent', async () => {
    await writeAnaJson({ artifactBranch: 'main' });
    const result = readCoAuthor(tempDir);
    expect(result).toBe('Ana <build@anatomia.dev>');
  });

  it('returns default when ana.json is corrupted', async () => {
    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(path.join(anaDir, 'ana.json'), '{invalid json', 'utf-8');
    const result = readCoAuthor(tempDir);
    expect(result).toBe('Ana <build@anatomia.dev>');
  });
});

describe('readArtifactBranch security hardening', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-ops-artifact-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeAnaJson(config: Record<string, unknown>): Promise<void> {
    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(
      path.join(anaDir, 'ana.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  // @ana A010
  it('exits with code 1 when artifactBranch contains injection payload', async () => {
    await writeAnaJson({ artifactBranch: 'main; echo pwned' });
    const originalExit = process.exit;
    const originalError = console.error;
    let exitCode: number | undefined;
    let errorMessage = '';
    process.exit = ((code: number) => { exitCode = code; }) as never;
    console.error = (msg: string) => { errorMessage += msg; };
    try {
      readArtifactBranch(tempDir);
    } finally {
      process.exit = originalExit;
      console.error = originalError;
    }
    expect(exitCode).toBe(1);
    expect(errorMessage).toContain('Invalid artifactBranch');
  });

  it('passes through valid artifact branch values', async () => {
    await writeAnaJson({ artifactBranch: 'main' });
    expect(readArtifactBranch(tempDir)).toBe('main');
  });
});

describe('readBranchPrefix security hardening', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-ops-prefix-sec-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeAnaJson(config: Record<string, unknown>): Promise<void> {
    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(
      path.join(anaDir, 'ana.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  // @ana A011
  it('returns fallback for injection payload in branchPrefix', async () => {
    await writeAnaJson({ artifactBranch: 'main', branchPrefix: 'x; echo pwned/' });
    const result = readBranchPrefix(tempDir);
    expect(result).toBe('feature/');
  });

  // @ana A027
  it('accepts empty string after hardening', async () => {
    await writeAnaJson({ artifactBranch: 'main', branchPrefix: '' });
    const result = readBranchPrefix(tempDir);
    expect(result).toBe('');
  });
});

describe('readCoAuthor security hardening', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-ops-coauthor-sec-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeAnaJson(config: Record<string, unknown>): Promise<void> {
    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(
      path.join(anaDir, 'ana.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  // @ana A012
  it('strips control characters from co-author value', async () => {
    await writeAnaJson({ coAuthor: 'Ana\n<build@anatomia.dev>\r\x00' });
    const result = readCoAuthor(tempDir);
    expect(result).not.toContain('\n');
    expect(result).not.toContain('\r');
    expect(result).not.toContain('\x00');
    expect(result).toBe('Ana<build@anatomia.dev>');
  });

  // @ana A013
  it('preserves normal co-author values with angle brackets', async () => {
    await writeAnaJson({ coAuthor: 'Ana <build@anatomia.dev>' });
    const result = readCoAuthor(tempDir);
    expect(result).toContain('<');
    expect(result).toBe('Ana <build@anatomia.dev>');
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
