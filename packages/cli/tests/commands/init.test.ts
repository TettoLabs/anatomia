/**
 * Tests for ana init command
 *
 * These tests verify:
 * - .ana/ directory creation
 * - File content correctness
 * - Overwrite protection
 *
 * Uses a temporary directory for isolation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, ExecSyncOptions } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

// Path to built CLI
const CLI_PATH = path.resolve(__dirname, '../../dist/index.js');

// Test directory (unique per test run)
let testDir: string;

/**
 * Execute CLI command in test directory
 */
function runCli(args: string, options: ExecSyncOptions = {}): string {
  try {
    const result = execSync(`node ${CLI_PATH} ${args}`, {
      cwd: testDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
    });
    return result;
  } catch (error) {
    // Return stderr for error cases
    if (error && typeof error === 'object' && 'stderr' in error) {
      return (error as { stderr: string }).stderr;
    }
    throw error;
  }
}

/**
 * Check if file exists in test directory
 */
async function fileExists(relativePath: string): Promise<boolean> {
  try {
    await fs.access(path.join(testDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file content from test directory
 */
async function readFile(relativePath: string): Promise<string> {
  return fs.readFile(path.join(testDir, relativePath), 'utf-8');
}

describe('ana init command', () => {
  beforeEach(async () => {
    // Create unique temp directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('creates .ana directory', async () => {
    // Run init with defaults (--yes skips prompts)
    runCli('init --yes');

    // Verify .ana/ exists
    expect(await fileExists('.ana')).toBe(true);
  });

  it('creates node.json file', async () => {
    runCli('init --yes');

    // Verify node.json exists
    expect(await fileExists('.ana/node.json')).toBe(true);

    // Verify content is valid JSON
    const content = await readFile('.ana/node.json');
    const parsed = JSON.parse(content);

    expect(parsed).toHaveProperty('name');
    expect(parsed).toHaveProperty('type', 'node');
    expect(parsed).toHaveProperty('version', '1.0.0');
    expect(parsed).toHaveProperty('federation');
  });

  it('creates context/main.md file', async () => {
    runCli('init --yes');

    // Verify context/main.md exists
    expect(await fileExists('.ana/context/main.md')).toBe(true);

    // Verify content has expected sections
    const content = await readFile('.ana/context/main.md');
    expect(content).toContain('# Project Context');
    expect(content).toContain('## Overview');
    expect(content).toContain('## Tech Stack');
  });

  it('creates modes/code.md file', async () => {
    runCli('init --yes');

    // Verify modes/code.md exists
    expect(await fileExists('.ana/modes/code.md')).toBe(true);

    // Verify content has expected sections
    const content = await readFile('.ana/modes/code.md');
    expect(content).toContain('# Code Mode');
    expect(content).toContain('## Purpose');
    expect(content).toContain('## Hard Constraints');
  });

  it('respects --force flag for overwrite', async () => {
    // Create initial .ana/
    runCli('init --yes');

    // Verify it exists
    expect(await fileExists('.ana/node.json')).toBe(true);

    // Modify a file to detect overwrite
    const originalContent = await readFile('.ana/node.json');

    // Run init again with --force
    runCli('init --yes --force');

    // Verify .ana/ still exists (was recreated)
    expect(await fileExists('.ana/node.json')).toBe(true);

    // Content should be fresh (timestamps would differ)
    const newContent = await readFile('.ana/node.json');
    const originalParsed = JSON.parse(originalContent);
    const newParsed = JSON.parse(newContent);

    // created_at should be different
    expect(newParsed.created_at).not.toBe(originalParsed.created_at);
  });

  it('shows version correctly', () => {
    const output = runCli('--version');
    expect(output.trim()).toBe('0.1.0');
  });

  it('shows help correctly', () => {
    const output = runCli('--help');
    expect(output).toContain('ana');
    expect(output).toContain('init');
    expect(output).toContain('mode');
  });
});

describe('ana mode command', () => {
  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('shows mode information for valid mode', () => {
    const output = runCli('mode code');
    expect(output).toContain('Mode: code');
    expect(output).toContain('Implementation and coding');
  });

  it('lists all modes with --list flag', () => {
    const output = runCli('mode code --list');
    expect(output).toContain('architect');
    expect(output).toContain('code');
    expect(output).toContain('debug');
    expect(output).toContain('docs');
    expect(output).toContain('test');
  });

  it('shows error for invalid mode', () => {
    // This test checks the error handling
    // execSync throws on non-zero exit, so we catch it
    let errorOutput = '';
    try {
      execSync(`node ${CLI_PATH} mode invalid`, {
        cwd: testDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'stderr' in error) {
        errorOutput = (error as { stderr: string }).stderr;
      }
      if (error && typeof error === 'object' && 'stdout' in error) {
        errorOutput = (error as { stdout: string }).stdout;
      }
    }
    expect(errorOutput).toContain('Unknown mode');
  });
});
