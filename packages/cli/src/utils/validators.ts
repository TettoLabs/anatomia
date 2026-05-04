/**
 * Validation utilities
 *
 * Provides helper functions for:
 * - Getting project name from config files
 * - File existence checks
 * - Input validation (slugs, branch names, skill names)
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';

/**
 * Kebab-case slug validation regex.
 * Starts with lowercase letter, segments separated by single hyphens, alphanumeric only.
 * Allows: fix-v2, a, add-export-csv. Rejects: Fix-Auth, fix--double, -leading, trailing-.
 */
export const SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Branch name validation regex.
 * Allows alphanumeric, hyphens, underscores, slashes, and dots.
 * Rejects semicolons, spaces, backticks, pipes, $, parentheses, newlines.
 */
const BRANCH_NAME_PATTERN = /^[a-zA-Z0-9._/\-]+$/;

/**
 * Skill name validation regex.
 * Allows lowercase alphanumeric and hyphens (kebab-case).
 * Rejects shell metacharacters, slashes, spaces, etc.
 */
const SKILL_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Validate a slug string. Throws if invalid.
 *
 * @param slug - The slug to validate
 * @returns The validated slug (pass-through)
 * @throws Error if the slug contains invalid characters
 */
export function validateSlug(slug: string): string {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error('Invalid slug format. Use kebab-case: fix-auth-timeout, add-export-csv');
  }
  return slug;
}

/**
 * Validate a branch name string. Throws if invalid.
 * Accepts empty string as valid (for branchPrefix use case).
 *
 * @param name - The branch name to validate
 * @returns The validated branch name (pass-through)
 * @throws Error if the branch name contains invalid characters
 */
export function validateBranchName(name: string): string {
  if (name === '') {
    return name;
  }
  if (!BRANCH_NAME_PATTERN.test(name)) {
    throw new Error('Invalid branch name: contains invalid characters.');
  }
  return name;
}

/**
 * Validate a skill name string. Throws if invalid.
 *
 * @param name - The skill name to validate
 * @returns The validated skill name (pass-through)
 * @throws Error if the skill name contains invalid characters
 */
export function validateSkillName(name: string): string {
  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new Error('Invalid skill name: contains invalid characters. Use kebab-case: coding-standards, api-patterns');
  }
  return name;
}

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

/**
 * Find the project root by walking up from startDir looking for `.ana/`.
 *
 * Synchronous because it's called at command entry points that need the
 * result before proceeding. Uses `fs.existsSync` to check each level.
 * Stops at the filesystem root if no `.ana/` is found anywhere.
 *
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns Absolute path to the directory containing `.ana/`
 * @throws Error if no `.ana/` is found in the tree
 */
export function findProjectRoot(startDir: string = process.cwd()): string {
  let current = path.resolve(startDir);

  while (true) {
    if (fsSync.existsSync(path.join(current, '.ana', 'ana.json'))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(
        `No .ana/ found in ${startDir} or any parent directory. Run ana init from your project root.`
      );
    }
    current = parent;
  }
}
