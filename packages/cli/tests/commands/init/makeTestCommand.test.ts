/**
 * Contract matrix for `makeTestCommandNonInteractive` (SCAN-050 / absorbed INFRA-008).
 *
 * The function transforms a raw `package.json` test script into a form safe
 * to run in CI / pipeline contexts (no watch mode, no interactive prompts).
 *
 * 15 cases locked in the SCAN-050 vault:
 *   1-6   Vitest variants (watch default + subcommand + flag + wrappers)
 *   7-9   Jest variants (default + --watch + --watchAll)
 *   10-11 Mocha variants (--watch + default)
 *   12    pytest passthrough
 *   13    go test (no framework detected)
 *   14    multi-framework Jest + Playwright
 *   15    `pnpm run test -- --run` — protects Anatomia's own CI command
 *
 * The multi-framework case is the SCAN-050 behaviour change: the function
 * now accepts `string[]` and uses `.includes()` for membership so projects
 * with both Jest and Playwright still get the Jest transform without the
 * Playwright membership mis-routing the call.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { makeTestCommandNonInteractive, createAnaJson } from '../../../src/commands/init/state.js';
import { createEmptyEngineResult } from '../../../src/engine/types/engineResult.js';

describe('makeTestCommandNonInteractive', () => {
  it.each([
    // [description, input command, frameworks, expected output]
    ['Vitest bare — needs --run',       'vitest',                    ['Vitest'],            'vitest -- --run'],
    ['Vitest run subcommand — already non-interactive',
                                        'vitest run',                ['Vitest'],            'vitest run'],
    ['Vitest --run flag — already non-interactive',
                                        'vitest --run',              ['Vitest'],            'vitest --run'],
    ['Vitest run --coverage — subcommand present, coverage preserved',
                                        'vitest run --coverage',     ['Vitest'],            'vitest run --coverage'],
    ['npx vitest — wrapped, needs run',
                                        'npx vitest',                ['Vitest'],            'npx vitest -- --run'],
    ['npx vitest run — wrapped + subcommand',
                                        'npx vitest run',            ['Vitest'],            'npx vitest run'],
    ['Jest bare — non-interactive by default',
                                        'jest',                      ['Jest'],              'jest'],
    ['Jest --watch — disable via passthrough',
                                        'jest --watch',              ['Jest'],              'jest --watch -- --watchAll=false'],
    ['Jest --watchAll — disable via passthrough',
                                        'jest --watchAll',           ['Jest'],              'jest --watchAll -- --watchAll=false'],
    ['Mocha --watch — disable via passthrough',
                                        'mocha --watch',             ['Mocha'],             'mocha --watch -- --watch=false'],
    ['Mocha bare — non-interactive by default',
                                        'mocha',                     ['Mocha'],             'mocha'],
    ['pytest passthrough',              'pytest',                    ['pytest'],            'pytest'],
    ['go test — no framework detected, passthrough',
                                        'go test',                   [],                    'go test'],
    ['multi-framework Jest + Playwright — no watch flags, no change',
                                        'jest',                      ['Jest', 'Playwright'], 'jest'],
    ['pnpm run test -- --run — protects Anatomia\'s own CI command',
                                        'pnpm run test -- --run',    ['Vitest'],            'pnpm run test -- --run'],
  ])('%s', (_name, input, frameworks, expected) => {
    expect(makeTestCommandNonInteractive(input, frameworks)).toBe(expected);
  });

  it('returns null when testCommand is null', () => {
    expect(makeTestCommandNonInteractive(null, ['Vitest'])).toBeNull();
  });

  it('Jest rawScript --watchAll — wrapper clean, raw script has flag', () => {
    // The real-world case: npm test wrapper, jest --watchAll in package.json scripts
    expect(makeTestCommandNonInteractive('npm test', ['Jest'], 'jest --watchAll'))
      .toBe('npm test -- --watchAll=false');
  });

  it('Jest rawScript --watch — wrapper clean, raw script has flag', () => {
    expect(makeTestCommandNonInteractive('npm test', ['Jest'], 'jest --watch'))
      .toBe('npm test -- --watchAll=false');
  });

  it('Mocha rawScript --watch — wrapper clean, raw script has flag', () => {
    expect(makeTestCommandNonInteractive('pnpm run test', ['Mocha'], 'mocha --watch'))
      .toBe('pnpm run test -- --watch=false');
  });
});

describe('createAnaJson monorepo test command scoping', () => {
  let tmpDir: string;

  async function readAnaJson(dir: string): Promise<Record<string, unknown>> {
    const content = await fs.readFile(path.join(dir, 'ana.json'), 'utf-8');
    return JSON.parse(content);
  }

  /** Create a fake project root with a primary package's package.json */
  async function makeProjectRoot(pkgPath: string, testScript: string | null): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'project-'));
    const pkgDir = path.join(root, pkgPath);
    await fs.mkdir(pkgDir, { recursive: true });
    const scripts = testScript ? { test: testScript } : {};
    await fs.writeFile(path.join(pkgDir, 'package.json'), JSON.stringify({ scripts }), 'utf-8');
    return root;
  }

  it('scopes pnpm monorepo with Vitest using cd + run test', async () => {
    const projectRoot = await makeProjectRoot('apps/web', 'vitest');
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    try {
      const result = createEmptyEngineResult();
      result.commands = { build: null, test: 'pnpm run test', lint: null, dev: null, packageManager: 'pnpm', all: { test: 'turbo run test' } };
      result.stack.testing = ['Vitest'];
      result.monorepo = {
        isMonorepo: true, tool: 'pnpm',
        packages: [{ name: '@myapp/web', path: 'apps/web' }],
        primaryPackage: { name: '@myapp/web', path: 'apps/web' },
      };

      await createAnaJson(tmpDir, result, projectRoot);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['test']).toBe('cd apps/web && pnpm run test -- --run');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
      await fs.rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('scopes yarn monorepo with Vitest using cd + run test', async () => {
    const projectRoot = await makeProjectRoot('apps/web', 'vitest');
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    try {
      const result = createEmptyEngineResult();
      result.commands = { build: null, test: 'yarn run test', lint: null, dev: null, packageManager: 'yarn', all: { test: 'turbo run test' } };
      result.stack.testing = ['Vitest'];
      result.monorepo = {
        isMonorepo: true, tool: 'yarn',
        packages: [{ name: '@myapp/web', path: 'apps/web' }],
        primaryPackage: { name: '@myapp/web', path: 'apps/web' },
      };

      await createAnaJson(tmpDir, result, projectRoot);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['test']).toBe('cd apps/web && yarn run test -- --run');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
      await fs.rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('scopes npm monorepo with Jest --watchAll using cd + correct flags', async () => {
    const projectRoot = await makeProjectRoot('apps/web', 'jest --watchAll');
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    try {
      const result = createEmptyEngineResult();
      result.commands = { build: null, test: 'npm test', lint: null, dev: null, packageManager: 'npm', all: { test: 'nx test' } };
      result.stack.testing = ['Jest'];
      result.monorepo = {
        isMonorepo: true, tool: 'npm',
        packages: [{ name: '@myapp/web', path: 'apps/web' }],
        primaryPackage: { name: '@myapp/web', path: 'apps/web' },
      };

      await createAnaJson(tmpDir, result, projectRoot);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['test']).toBe('cd apps/web && npm test -- --watchAll=false');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
      await fs.rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('falls back to root command with cd when primary has no test script', async () => {
    const projectRoot = await makeProjectRoot('apps/web', null);
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    try {
      const result = createEmptyEngineResult();
      result.commands = { build: null, test: 'pnpm run test', lint: null, dev: null, packageManager: 'pnpm', all: { test: 'vitest' } };
      result.stack.testing = ['Vitest'];
      result.monorepo = {
        isMonorepo: true, tool: 'pnpm',
        packages: [{ name: '@myapp/web', path: 'apps/web' }],
        primaryPackage: { name: '@myapp/web', path: 'apps/web' },
      };

      await createAnaJson(tmpDir, result, projectRoot);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['test']).toBe('cd apps/web && pnpm run test -- --run');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
      await fs.rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('does not generate test command when root has no test script', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    try {
      const result = createEmptyEngineResult();
      result.commands = { build: null, test: null, lint: null, dev: null, packageManager: 'pnpm', all: {} };
      result.stack.testing = ['Vitest'];
      result.monorepo = {
        isMonorepo: true, tool: 'pnpm',
        packages: [{ name: '@myapp/web', path: 'apps/web' }],
        primaryPackage: { name: '@myapp/web', path: 'apps/web' },
      };

      await createAnaJson(tmpDir, result);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['test']).toBeNull();
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('does not scope single-repo projects', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    try {
      const result = createEmptyEngineResult();
      result.commands = { build: null, test: 'pnpm run test', lint: null, dev: null, packageManager: 'pnpm', all: { test: 'vitest' } };
      result.stack.testing = ['Vitest'];

      await createAnaJson(tmpDir, result);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['test']).toBe('pnpm run test -- --run');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
