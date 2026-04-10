/**
 * Shared git utilities for commands (Item 13).
 *
 * Extracted from commands/artifact.ts so that pr.ts and work.ts don't have
 * to cross-command-import them. These are leaf utilities — read ana.json
 * for the artifact branch name, shell out to git for the current branch.
 * Neither depends on anything command-specific, so they belong in utils/.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import chalk from 'chalk';

/**
 * Read the artifact branch name from .ana/ana.json. Exits the process with
 * an error message if the file is missing, corrupted, or lacks the field.
 *
 * The exit-on-error behavior is intentional — this is called from command
 * entry points where a missing ana.json is a configuration error the user
 * must fix before the command can do anything meaningful.
 *
 * @returns The artifact branch name
 */
export function readArtifactBranch(): string {
  const anaJsonPath = path.join(process.cwd(), '.ana', 'ana.json');

  if (!fs.existsSync(anaJsonPath)) {
    console.error(chalk.red('Error: No .ana/ana.json found. Run `ana init` first.'));
    process.exit(1);
  }

  let config: Record<string, unknown>;
  try {
    const content = fs.readFileSync(anaJsonPath, 'utf-8');
    config = JSON.parse(content);
  } catch {
    console.error(chalk.red('Error: Failed to read .ana/ana.json. File may be corrupted.'));
    process.exit(1);
  }

  if (!config.artifactBranch) {
    console.error(chalk.red('Error: No artifactBranch configured in ana.json. Run `ana init` first.'));
    process.exit(1);
  }

  return config.artifactBranch as string;
}

/**
 * Get the current git branch name, or null if not in a git repo.
 *
 * @returns Current branch name, or null on failure
 */
export function getCurrentBranch(): string | null {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch {
    return null;
  }
}
