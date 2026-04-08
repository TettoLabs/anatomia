/**
 * Directory walking utilities for structure analysis
 */

import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

/**
 * Directories to ignore during walking (common large/generated dirs)
 */
const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'venv',
  '__pycache__',
  '.next',
  'dist',
  'build',
  'coverage',
  '.turbo',
  'out',
  '.cache',
  'tmp',
  '.pytest_cache',
  '.vitest',
  'target', // Rust
  'vendor', // Go, PHP
];

/**
 * Walk directory tree recursively, collecting directory paths
 *
 * @param rootPath - Absolute path to start walking from
 * @param maxDepth - Maximum depth to traverse (default: 4)
 * @param ignorePatterns - Directory basenames to skip
 * @returns Array of relative directory paths from rootPath
 */
export async function walkDirectories(
  rootPath: string,
  maxDepth: number = 4,
  ignorePatterns: string[] = DEFAULT_IGNORE_PATTERNS
): Promise<string[]> {
  const directories: string[] = [];

  async function walk(currentPath: string, depth: number) {
    if (depth > maxDepth) {
      return;
    }

    try {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        if (ignorePatterns.includes(entry.name)) {
          continue;
        }

        const fullPath = join(currentPath, entry.name);
        const relativePath = relative(rootPath, fullPath);

        directories.push(relativePath);
        await walk(fullPath, depth + 1);
      }
    } catch {
      // Ignore permission errors, continue walking
    }
  }

  await walk(rootPath, 0);
  return directories;
}


