/**
 * Package manager detection
 *
 * Detects package manager from lockfiles.
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';

/**
 * Detect the package manager used in a project by checking lockfiles.
 * Priority: pnpm > yarn > bun > npm (fallback)
 */
export async function detectPackageManager(cwd: string): Promise<string> {
  const checks: Array<[string, string]> = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lockb', 'bun'],
    ['package-lock.json', 'npm'],
  ];

  for (const [lockfile, manager] of checks) {
    try {
      await fs.access(path.join(cwd, lockfile));
      return manager;
    } catch {
      // not found, try next
    }
  }

  return 'npm';
}
