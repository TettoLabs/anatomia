/**
 * Package manager detection
 *
 * Detects package manager from lockfiles.
 * Walks up from scan target to find nearest lockfile (supports sub-packages).
 * Capped at 5 levels to avoid picking up stray lockfiles from $HOME.
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';

const LOCKFILE_MAP: Array<[string, string]> = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lockb', 'bun'],
  ['package-lock.json', 'npm'],
];

/** Maximum directory levels to walk up when searching for lockfiles */
const MAX_WALK_DEPTH = 5;

/**
 * Detect the package manager used in a project by checking lockfiles.
 * Walks up from cwd to find the nearest lockfile (inherits from parent).
 * Priority: pnpm > yarn > bun > npm (fallback)
 *
 * @param cwd - Directory to start searching from
 * @returns Detected package manager name
 */
export async function detectPackageManager(cwd: string): Promise<string> {
  let dir = path.resolve(cwd);
  let depth = 0;

  while (depth < MAX_WALK_DEPTH) {
    for (const [lockfile, manager] of LOCKFILE_MAP) {
      try {
        await fs.access(path.join(dir, lockfile));
        return manager;
      } catch {
        // not found, try next
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
    depth++;
  }

  return 'npm';
}
