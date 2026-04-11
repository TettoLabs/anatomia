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
 * Detect the package manager used in a project.
 *
 * Resolution order:
 *   1. Walk up from cwd looking for a lockfile (pnpm > yarn > bun > npm).
 *      If found, return the matching manager name.
 *   2. If no lockfile but `package.json` exists in cwd, default to 'npm'.
 *      This handles fresh Node projects where deps have been declared but
 *      not installed yet — the project is Node, the default tool is npm,
 *      even before a lockfile materializes.
 *   3. Otherwise return null. Non-Node projects (Python / Go / Rust) have
 *      no package manager in the Node sense; pre-S19 this fell back to
 *      'npm' which was a semantic lie that propagated into ana.json for
 *      every non-Node project (S19/SCAN-032).
 *
 * @param cwd - Directory to start searching from
 * @returns Detected package manager name, or null if not a Node project
 */
export async function detectPackageManager(cwd: string): Promise<string | null> {
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

  // No lockfile found — fall back to 'npm' only if this is clearly a
  // Node project (package.json in cwd). Otherwise null.
  try {
    await fs.access(path.join(path.resolve(cwd), 'package.json'));
    return 'npm';
  } catch {
    return null;
  }
}
