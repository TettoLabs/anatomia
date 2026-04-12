/**
 * Validation utilities
 *
 * Provides helper functions for:
 * - Getting project name from config files
 * - File existence checks
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';

/**
 * Get project name from package.json, pyproject.toml, go.mod, or directory name
 *
 * @param rootPath - Project root directory
 * @returns Project name
 */
export async function getProjectName(rootPath: string): Promise<string> {
  // Try package.json
  const pkgPath = path.join(rootPath, 'package.json');
  try {
    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    if (pkg.name && typeof pkg.name === 'string') {
      // Handle scoped packages (@scope/name) - keep full name
      return pkg.name;
    }
  } catch {
    // File doesn't exist or invalid JSON - try next source
  }

  // Try pyproject.toml
  const pyprojectPath = path.join(rootPath, 'pyproject.toml');
  try {
    const content = await fs.readFile(pyprojectPath, 'utf-8');
    // Match: [project]\nname = "package-name"
    const match = content.match(/\[project\][\s\S]*?name\s*=\s*"([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }
  } catch {
    // Try next source
  }

  // Try go.mod
  const goModPath = path.join(rootPath, 'go.mod');
  try {
    const content = await fs.readFile(goModPath, 'utf-8');
    // Match: module github.com/user/package-name
    const match = content.match(/module\s+([^\s]+)/);
    if (match && match[1]) {
      // Extract basename from module path
      const modulePath = match[1];
      return path.basename(modulePath);
    }
  } catch {
    // Fallback to directory name
  }

  // Fallback: Use directory name
  return path.basename(rootPath);
}

/**
 * Check if a filesystem path exists (file OR directory).
 *
 * Uses `fs.access()`, which returns true for any existing entry — regular
 * files, directories, symlinks, etc. Use this when the caller doesn't care
 * whether the path is a file or a directory, only whether something lives
 * at that path.
 *
 * For a strict file-only check (returns false on directories), use
 * `fileExists` from `commands/init/preflight.ts`. The two functions are
 * intentionally kept separate: `pathExists` describes the existence test,
 * `fileExists` describes the file-type test.
 *
 * @param targetPath - Path to check (file or directory)
 * @returns true if anything exists at the path, false otherwise
 */
export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}
