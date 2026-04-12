/**
 * Monorepo detection for 5 tools + fallback
 *
 * Tools: pnpm, Nx, Turborepo, Lerna, npm/yarn workspaces
 * Fallback: Recursive package.json discovery
 *
 * Research: Monorepo configurations agent findings
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { exists, readFile } from '../utils/file.js';

export interface MonorepoResult {
  isMonorepo: boolean;
  tool: 'pnpm' | 'nx' | 'turbo' | 'lerna' | 'npm-workspaces' | 'none' | null;
  workspacePatterns?: string[]; // Glob patterns from config
  packages?: string[]; // Actual package directories (if discovered)
}

/**
 * Detect monorepo configuration
 *
 * Priority order:
 * 1. pnpm-workspace.yaml (pnpm)
 * 2. turbo.json (Turborepo)
 * 3. nx.json (Nx)
 * 4. lerna.json (Lerna)
 * 5. package.json workspaces (npm/yarn)
 * 6. Fallback: recursive package.json scan
 * @param rootPath
 */
export async function detectMonorepo(rootPath: string): Promise<MonorepoResult> {
  // 1. Check pnpm-workspace.yaml
  const pnpmPath = path.join(rootPath, 'pnpm-workspace.yaml');
  if (await exists(pnpmPath)) {
    try {
      const content = await readFile(pnpmPath);
      const config = parseYaml(content) as { packages?: string[] };

      const patterns = config.packages || [];

      return {
        isMonorepo: true,
        tool: 'pnpm',
        workspacePatterns: patterns,
      };
    } catch {
      // Malformed YAML — fall through to next detector
    }
  }

  // 2. Check turbo.json
  const turboPath = path.join(rootPath, 'turbo.json');
  if (await exists(turboPath)) {
    try {
      const content = await readFile(turboPath);
      const config = JSON.parse(content);

      // Turbo infers packages from pnpm/npm workspaces
      if (config.tasks || config.pipeline) {
        return {
          isMonorepo: true,
          tool: 'turbo',
          // Turbo doesn't list packages explicitly
        };
      }
    } catch {
      // Malformed JSON — fall through to next detector
    }
  }

  // 3. Check nx.json
  const nxPath = path.join(rootPath, 'nx.json');
  if (await exists(nxPath)) {
    try {
      const content = await readFile(nxPath);
      const config = JSON.parse(content);

      // Nx infers projects automatically
      if (config.targetDefaults || config.generators) {
        return {
          isMonorepo: true,
          tool: 'nx',
        };
      }
    } catch {
      // Malformed JSON — fall through to next detector
    }
  }

  // 4. Check lerna.json
  const lernaPath = path.join(rootPath, 'lerna.json');
  if (await exists(lernaPath)) {
    try {
      const content = await readFile(lernaPath);
      const config = JSON.parse(content) as { packages?: string[] };

      const patterns = config.packages || ['packages/*'];

      return {
        isMonorepo: true,
        tool: 'lerna',
        workspacePatterns: patterns,
      };
    } catch {
      // Malformed JSON — fall through to next detector
    }
  }

  // 5. Check package.json workspaces
  const packagePath = path.join(rootPath, 'package.json');
  if (await exists(packagePath)) {
    try {
      const content = await readFile(packagePath);
      const pkg = JSON.parse(content);

      if (pkg.workspaces) {
        const patterns = Array.isArray(pkg.workspaces)
          ? pkg.workspaces
          : pkg.workspaces.packages || [];

        return {
          isMonorepo: true,
          tool: 'npm-workspaces',
          workspacePatterns: patterns,
        };
      }
    } catch {
      // Already handled by main detection, don't duplicate
    }
  }

  // 6. Fallback: Recursive package.json discovery
  const discovered = await discoverPackages(rootPath);
  if (discovered.length > 1) {
    return {
      isMonorepo: true,
      tool: 'none',
      packages: discovered,
    };
  }

  return {
    isMonorepo: false,
    tool: null,
  };
}

/**
 * Discover packages via recursive scan (fallback)
 * @param rootPath
 * @param depth
 * @param maxDepth
 * @param visited
 */
async function discoverPackages(
  rootPath: string,
  depth: number = 0,
  maxDepth: number = 4,
  visited: Set<string> = new Set()
): Promise<string[]> {
  // Prevent infinite loops
  if (depth > maxDepth || visited.has(rootPath)) {
    return [];
  }
  visited.add(rootPath);

  const packages: string[] = [];

  try {
    const entries = await fs.readdir(rootPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip node_modules, .git, etc.
      if (shouldSkipDirectory(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        const entryPath = path.join(rootPath, entry.name);

        // Check if this directory has package.json
        if (await exists(path.join(entryPath, 'package.json'))) {
          packages.push(entryPath);
        }

        // Recurse into subdirectories
        const subPackages = await discoverPackages(
          entryPath,
          depth + 1,
          maxDepth,
          visited
        );
        packages.push(...subPackages);
      }
    }
  } catch {
    // Permission denied or similar — return what we have so far
  }

  return packages;
}

/**
 * Should skip directory during scanning
 * @param name
 */
function shouldSkipDirectory(name: string): boolean {
  const skipPatterns = [
    'node_modules',
    '.git',
    '.github',
    'venv',
    '.venv',
    '__pycache__',
    'dist',
    'build',
    'target',
    '.next',
    'vendor',
    'coverage',
    '.turbo',
    '.nx',
  ];

  return skipPatterns.includes(name) || name.startsWith('.');
}
