/**
 * Contract matrix for monorepo build/lint command scoping in `createAnaJson`.
 *
 * When a monorepo has a primary package, build and lint commands should target
 * that package directly instead of the root (which typically invokes turbo
 * across all packages). The scoping reads the primary package's package.json
 * to find script keys, matching the same lookup order as `detectCommands`.
 *
 * 12 cases covering:
 *   A001-A002  Build/lint scoped for monorepo with primary package scripts
 *   A003-A004  Fallback to root when primary package lacks scripts
 *   A005       Single-repo unaffected
 *   A006       Dev command never scoped
 *   A007-A008  Alternate script key lookup (compile, biome)
 *   A009-A010  Missing/malformed package.json fallback
 *   A011       Package manager prefix (npm)
 *   A012       Existing test scoping still works after signature change
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { createAnaJson, preserveUserState } from '../../../src/commands/init/state.js';
import { createEmptyEngineResult } from '../../../src/engine/types/engineResult.js';

describe('createAnaJson monorepo build/lint command scoping', () => {
  let tmpDir: string;
  let cwdDir: string;

  async function readAnaJson(dir: string): Promise<Record<string, unknown>> {
    const content = await fs.readFile(path.join(dir, 'ana.json'), 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Create a fake primary package directory with a package.json containing
   * the specified scripts.
   */
  async function setupPrimaryPackage(
    rootDir: string,
    pkgPath: string,
    scripts: Record<string, string>,
  ): Promise<void> {
    const pkgDir = path.join(rootDir, pkgPath);
    await fs.mkdir(pkgDir, { recursive: true });
    await fs.writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'test-pkg', scripts }, null, 2),
      'utf-8',
    );
  }

  function makeMonorepoResult(overrides?: {
    pm?: string;
    pkgPath?: string;
    build?: string | null;
    lint?: string | null;
    dev?: string | null;
    testing?: string[];
  }) {
    const pm = overrides?.pm ?? 'pnpm';
    const pkgPath = overrides?.pkgPath ?? 'packages/cli';
    const result = createEmptyEngineResult();
    result.commands = {
      build: overrides?.build ?? `${pm} run build`,
      test: `${pm} run test`,
      lint: overrides?.lint ?? `${pm} run lint`,
      dev: overrides?.dev ?? `${pm} run dev`,
      packageManager: pm,
      all: { test: 'turbo run test' },
    };
    result.stack.testing = overrides?.testing ?? ['Vitest'];
    result.monorepo = {
      isMonorepo: true,
      tool: pm,
      packages: [{ name: '@myapp/cli', path: pkgPath }],
      primaryPackage: { name: '@myapp/cli', path: pkgPath },
    };
    return result;
  }

  // @ana A001
  it('scopes build command for monorepo with primary package build script', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      await setupPrimaryPackage(cwdDir, 'packages/cli', { build: 'tsup', lint: 'eslint .' });
      const result = makeMonorepoResult();

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['build']).toBe('(cd packages/cli && pnpm run build)');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A002
  it('scopes lint command for monorepo with primary package lint script', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      await setupPrimaryPackage(cwdDir, 'packages/cli', { build: 'tsup', lint: 'eslint .' });
      const result = makeMonorepoResult();

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['lint']).toBe('(cd packages/cli && pnpm run lint)');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A003
  it('keeps root build command when primary package has no build script', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      await setupPrimaryPackage(cwdDir, 'packages/cli', { lint: 'eslint .' });
      const result = makeMonorepoResult();

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['build']).toBe('pnpm run build');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A004
  it('keeps root lint command when primary package has no lint script', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      await setupPrimaryPackage(cwdDir, 'packages/cli', { build: 'tsup' });
      const result = makeMonorepoResult();

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['lint']).toBe('pnpm run lint');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A005
  it('does not scope single-repo projects', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      const result = createEmptyEngineResult();
      result.commands = {
        build: 'pnpm run build', test: 'pnpm run test',
        lint: 'pnpm run lint', dev: 'pnpm run dev',
        packageManager: 'pnpm', all: { test: 'vitest' },
      };
      result.stack.testing = ['Vitest'];

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['build']).toBe('pnpm run build');
      expect(cmds['lint']).toBe('pnpm run lint');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A006
  it('does not scope dev command in monorepo', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      await setupPrimaryPackage(cwdDir, 'packages/cli', { build: 'tsup', lint: 'eslint .', dev: 'vite' });
      const result = makeMonorepoResult();

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['dev']).toBe('pnpm run dev');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A007
  it('scopes build command using compile key when build key is absent', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      await setupPrimaryPackage(cwdDir, 'packages/cli', { compile: 'tsc -b' });
      const result = makeMonorepoResult();

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['build']).toBe('(cd packages/cli && pnpm run compile)');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A008
  it('scopes lint command using biome key when lint key is absent', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      await setupPrimaryPackage(cwdDir, 'packages/cli', { biome: 'biome check' });
      const result = makeMonorepoResult();

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['lint']).toBe('(cd packages/cli && pnpm run biome)');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A009
  it('falls back to root commands when primary package.json is missing', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      // Don't create the package.json — directory doesn't even exist
      const result = makeMonorepoResult();

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['build']).toBe('pnpm run build');
      expect(cmds['lint']).toBe('pnpm run lint');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A010
  it('falls back to root commands when primary package.json is malformed', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      const pkgDir = path.join(cwdDir, 'packages', 'cli');
      await fs.mkdir(pkgDir, { recursive: true });
      await fs.writeFile(path.join(pkgDir, 'package.json'), '{ not valid json!!!', 'utf-8');
      const result = makeMonorepoResult();

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['build']).toBe('pnpm run build');
      expect(cmds['lint']).toBe('pnpm run lint');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A011
  it('scopes build command with npm prefix for npm monorepo', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      await setupPrimaryPackage(cwdDir, 'packages/cli', { build: 'tsc' });
      const result = makeMonorepoResult({ pm: 'npm', build: 'npm run build', lint: 'npm run lint' });

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['build']).toBe('(cd packages/cli && npm run build)');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A001
  it('monorepo init populates buildRoot with the unscoped root build command', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      await setupPrimaryPackage(cwdDir, 'packages/cli', { build: 'tsup', lint: 'eslint .' });
      const result = makeMonorepoResult();

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, unknown>;
      // AC1: buildRoot exists
      expect(cmds['buildRoot']).toBeDefined();
      // AC3: buildRoot is the unscoped root command (no "(cd " prefix)
      expect(cmds['buildRoot']).toBe('pnpm run build');
      expect(cmds['buildRoot']).not.toContain('(cd ');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A002, A004
  it('monorepo init populates testRoot with the unscoped root test command', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      await setupPrimaryPackage(cwdDir, 'packages/cli', { build: 'tsup', lint: 'eslint .' });
      const result = makeMonorepoResult();

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, unknown>;
      // AC2: testRoot exists
      expect(cmds['testRoot']).toBeDefined();
      // AC4: testRoot is the unscoped root command (no "(cd " prefix)
      expect(cmds['testRoot']).not.toContain('(cd ');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A005, A006
  it('single-repo has no buildRoot or testRoot', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      const result = createEmptyEngineResult();
      result.commands = {
        build: 'pnpm run build', test: 'pnpm run test',
        lint: 'pnpm run lint', dev: 'pnpm run dev',
        packageManager: 'pnpm', all: { test: 'vitest' },
      };
      result.stack.testing = ['Vitest'];

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, unknown>;
      // AC5: no buildRoot or testRoot
      expect(cmds['buildRoot']).toBeUndefined();
      expect(cmds['testRoot']).toBeUndefined();
      // AC6: build still exists
      expect(cmds['build']).toBeDefined();
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A014
  it('monorepo with no root build script omits buildRoot', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      await setupPrimaryPackage(cwdDir, 'packages/cli', { build: 'tsup' });
      const result = makeMonorepoResult();
      // Simulate no root build script — set build to null after helper
      result.commands.build = null as unknown as string;

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, unknown>;
      expect(cmds['buildRoot']).toBeUndefined();
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A015
  it('monorepo with no root test script omits testRoot', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      await setupPrimaryPackage(cwdDir, 'packages/cli', { build: 'tsup' });
      const result = makeMonorepoResult();
      // Simulate no root test script — set test to null after helper
      result.commands.test = null as unknown as string;

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, unknown>;
      expect(cmds['testRoot']).toBeUndefined();
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A003
  it('buildRoot is the unscoped command even when build gets scoped', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      await setupPrimaryPackage(cwdDir, 'packages/cli', { build: 'tsup', lint: 'eslint .' });
      const result = makeMonorepoResult();

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, unknown>;
      // build is scoped, buildRoot is not
      expect(cmds['build']).toBe('(cd packages/cli && pnpm run build)');
      expect(cmds['buildRoot']).toBe('pnpm run build');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A012
  it('scopes pnpm monorepo with Vitest using direct invocation', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-json-'));
    cwdDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-cwd-'));
    try {
      await setupPrimaryPackage(cwdDir, 'apps/web', { build: 'next build', test: 'vitest' });
      const result = createEmptyEngineResult();
      result.commands = {
        build: null, test: 'pnpm run test', lint: null, dev: null,
        packageManager: 'pnpm', all: { test: 'turbo run test' },
      };
      result.stack.testing = ['Vitest'];
      result.monorepo = {
        isMonorepo: true, tool: 'pnpm',
        packages: [{ name: '@myapp/web', path: 'apps/web' }],
        primaryPackage: { name: '@myapp/web', path: 'apps/web' },
      };

      await createAnaJson(tmpDir, result, cwdDir);
      const cmds = (await readAnaJson(tmpDir))['commands'] as Record<string, string | null>;
      expect(cmds['test']).toBe('(cd apps/web && pnpm vitest run)');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(cwdDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });
});

describe('preserveUserState buildRoot/testRoot sanitization', () => {
  let existingDir: string;
  let tmpDir: string;

  // @ana A012
  it('preserveUserState handles missing buildRoot/testRoot', async () => {
    existingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-exist-'));
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-tmp-'));
    try {
      // Old ana.json has no buildRoot/testRoot
      await fs.writeFile(
        path.join(existingDir, 'ana.json'),
        JSON.stringify({
          anaVersion: '1.0.0',
          name: 'test',
          commands: { build: 'pnpm run build', test: 'pnpm run test' },
        }),
        'utf-8',
      );
      // New ana.json in tmpDir (fresh from createAnaJson)
      await fs.writeFile(
        path.join(tmpDir, 'ana.json'),
        JSON.stringify({
          anaVersion: '1.1.0',
          name: 'test',
          commands: { build: 'pnpm run build', test: 'pnpm run test', buildRoot: 'pnpm run build', testRoot: 'pnpm run test' },
          lastScanAt: '2026-05-17T00:00:00Z',
        }),
        'utf-8',
      );

      const merged = await preserveUserState(existingDir, tmpDir, {
        anaVersion: '1.1.0',
        lastScanAt: '2026-05-17T00:00:00Z',
        commands: { build: 'pnpm run build', test: 'pnpm run test', buildRoot: 'pnpm run build', testRoot: 'pnpm run test' },
      });

      expect(merged).toBeTruthy();
      // Old config without root commands is preserved — no crash or corruption
      const cmds = (merged as Record<string, unknown>)['commands'] as Record<string, unknown>;
      expect(cmds['build']).toBe('pnpm run build');
    } finally {
      await fs.rm(existingDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });

  // @ana A013
  it('preserveUserState sanitizes blank buildRoot/testRoot', async () => {
    existingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-exist-'));
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-tmp-'));
    try {
      // Old ana.json has blank buildRoot/testRoot (user accidentally set to empty)
      await fs.writeFile(
        path.join(existingDir, 'ana.json'),
        JSON.stringify({
          anaVersion: '1.0.0',
          name: 'test',
          commands: { build: 'pnpm run build', test: 'pnpm run test', buildRoot: '', testRoot: '' },
        }),
        'utf-8',
      );
      await fs.writeFile(
        path.join(tmpDir, 'ana.json'),
        JSON.stringify({
          anaVersion: '1.1.0',
          name: 'test',
          commands: { build: 'pnpm run build', test: 'pnpm run test', buildRoot: 'pnpm run build', testRoot: 'pnpm vitest run' },
          lastScanAt: '2026-05-17T00:00:00Z',
        }),
        'utf-8',
      );

      const merged = await preserveUserState(existingDir, tmpDir, {
        anaVersion: '1.1.0',
        lastScanAt: '2026-05-17T00:00:00Z',
        commands: { build: 'pnpm run build', test: 'pnpm run test', buildRoot: 'pnpm run build', testRoot: 'pnpm vitest run' },
      });

      expect(merged).toBeTruthy();
      const cmds = (merged as Record<string, unknown>)['commands'] as Record<string, unknown>;
      // Blank values restored to fresh detection values
      expect(cmds['buildRoot']).not.toBe('');
      expect(cmds['buildRoot']).toBe('pnpm run build');
      expect(cmds['testRoot']).not.toBe('');
      expect(cmds['testRoot']).toBe('pnpm vitest run');
    } finally {
      await fs.rm(existingDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  });
});
