/**
 * ana context - Manage context files
 *
 * Subcommands:
 *   ana context status     Show health of context files
 *
 * Exit codes:
 *   0 - Success (always - informational command)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { REQUIRED_CONTEXT_FILES, SCAFFOLD_MARKER, STALENESS_THRESHOLD } from '../constants.js';

/**
 * Status for a context file
 */
type FileStatus = 'fresh' | 'stale' | 'missing' | 'scaffold';

/**
 * Information about a setup file
 */
interface SetupFileInfo {
  name: string;
  path: string;
  exists: boolean;
  status: FileStatus;
  age: string | null;
  ageMs: number | null;
  commitsSince: number | null;
}

/**
 * Information about an "other" file (like analysis.md)
 */
interface OtherFileInfo {
  name: string;
  path: string;
  exists: boolean;
  label: string;
  age: string | null;
  ageMs: number | null;
}

/**
 * Summary counts
 */
interface Summary {
  totalFiles: number;
  setupFiles: number;
  setupFilesPresent: number;
  freshFiles: number;
  staleFiles: number;
  scaffoldFiles: number;
  missingSetupFiles: number;
}

/**
 * Full context status output
 */
interface ContextStatusOutput {
  setupFiles: SetupFileInfo[];
  otherFiles: OtherFileInfo[];
  summary: Summary;
  gitAvailable: boolean;
  persistedToMeta: boolean;
}

/**
 * Check if git is available in current directory
 *
 * @returns True if in a git repository
 */
function isGitAvailable(): boolean {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe', encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Format age in human-readable form
 *
 * @param mtime - File modification time
 * @returns Human-readable age string
 */
function formatAge(mtime: Date): string {
  const now = Date.now();
  const diffMs = now - mtime.getTime();

  // Handle future mtime (clock skew) - treat as "just now"
  if (diffMs < 0) {
    return 'just now';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

/**
 * Count commits since file was last modified
 *
 * Uses git to find the last commit that touched the file, then counts
 * all commits that happened after that commit.
 *
 * @param filePath - Absolute path to the file
 * @param _mtime - File modification time (unused, kept for signature consistency)
 * @returns Number of commits since file was last committed, or null if git unavailable
 */
function countCommitsSince(filePath: string, _mtime: Date): number | null {
  if (!isGitAvailable()) {
    return null;
  }

  try {
    // Get the last commit that modified this file
    const lastCommit = execSync(
      `git log -1 --format=%H -- "${filePath}"`,
      { stdio: 'pipe', encoding: 'utf-8' }
    ).trim();

    if (!lastCommit) {
      // File not tracked in git
      return null;
    }

    // Count commits since that commit (not including the commit itself)
    const countOutput = execSync(
      `git rev-list --count ${lastCommit}..HEAD`,
      { stdio: 'pipe', encoding: 'utf-8' }
    ).trim();

    return parseInt(countOutput, 10);
  } catch {
    return null;
  }
}

/**
 * Check if file contains only scaffold marker
 *
 * @param filePath - Absolute path to the file
 * @returns True if file is just scaffold
 */
function isScaffoldFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const firstLine = content.split('\n')[0].trim();
    return firstLine === SCAFFOLD_MARKER;
  } catch {
    return false;
  }
}

/**
 * Get status for a single file
 *
 * @param relativePath - Path relative to .ana/ (e.g., "context/project-overview.md")
 * @param anaDir - Absolute path to .ana/ directory
 * @param gitAvailable - Whether git is available
 * @returns File info object
 */
function getSetupFileInfo(
  relativePath: string,
  anaDir: string,
  gitAvailable: boolean
): SetupFileInfo {
  const fullPath = path.join(anaDir, relativePath);
  const name = path.basename(relativePath);

  // Check existence
  if (!fs.existsSync(fullPath)) {
    return {
      name,
      path: relativePath,
      exists: false,
      status: 'missing',
      age: null,
      ageMs: null,
      commitsSince: null,
    };
  }

  // Check scaffold
  if (isScaffoldFile(fullPath)) {
    return {
      name,
      path: relativePath,
      exists: true,
      status: 'scaffold',
      age: null,
      ageMs: null,
      commitsSince: null,
    };
  }

  // Get file stats
  const stats = fs.statSync(fullPath);
  const mtime = stats.mtime;
  const ageMs = Date.now() - mtime.getTime();
  const age = formatAge(mtime);

  // Get commits since (only if git available)
  const commitsSince = gitAvailable ? countCommitsSince(fullPath, mtime) : null;

  // Determine status
  let status: FileStatus = 'fresh';
  if (gitAvailable && commitsSince !== null && commitsSince >= STALENESS_THRESHOLD) {
    status = 'stale';
  }

  return {
    name,
    path: relativePath,
    exists: true,
    status,
    age,
    ageMs,
    commitsSince,
  };
}

/**
 * Get info for analysis.md (other file)
 *
 * @param anaDir - Absolute path to .ana/ directory
 * @returns Other file info or null if doesn't exist
 */
function getAnalysisFileInfo(anaDir: string): OtherFileInfo | null {
  const relativePath = 'context/analysis.md';
  const fullPath = path.join(anaDir, relativePath);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const stats = fs.statSync(fullPath);
  const mtime = stats.mtime;
  const ageMs = Date.now() - mtime.getTime();
  const age = formatAge(mtime);

  return {
    name: 'analysis.md',
    path: relativePath,
    exists: true,
    label: 'analyzer output',
    age,
    ageMs,
  };
}

/**
 * Update lastHealth in .meta.json
 *
 * @param anaDir - Absolute path to .ana/ directory
 * @param summary - Summary counts
 * @returns True if persisted successfully
 */
function persistToMeta(anaDir: string, summary: Summary): boolean {
  const metaPath = path.join(anaDir, '.meta.json');

  try {
    if (!fs.existsSync(metaPath)) {
      return false;
    }

    const metaContent = fs.readFileSync(metaPath, 'utf-8');
    const meta = JSON.parse(metaContent);

    meta.lastHealth = {
      timestamp: new Date().toISOString(),
      totalFiles: summary.totalFiles,
      setupFiles: summary.setupFiles,
      setupFilesPresent: summary.setupFilesPresent,
      missingSetupFiles: summary.missingSetupFiles,
      staleFiles: summary.staleFiles,
      scaffoldFiles: summary.scaffoldFiles,
    };

    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Print human-readable status output
 *
 * @param output - Status output structure
 * @param gitAvailable - Whether git is available
 */
function printHumanReadable(output: ContextStatusOutput, gitAvailable: boolean): void {
  console.log(chalk.bold('\nContext Health\n'));

  // Build summary string for header
  const { summary } = output;
  const parts: string[] = [];

  if (gitAvailable) {
    // Show fresh/stale/scaffold/missing breakdown
    if (summary.freshFiles > 0) {
      parts.push(`${summary.freshFiles} fresh`);
    }
    if (summary.staleFiles > 0) {
      parts.push(`${summary.staleFiles} stale`);
    }
    if (summary.scaffoldFiles > 0) {
      parts.push(`${summary.scaffoldFiles} scaffold`);
    }
    if (summary.missingSetupFiles > 0) {
      parts.push(`${summary.missingSetupFiles} missing`);
    }
  } else {
    // No git - show present/missing
    if (summary.setupFilesPresent > 0) {
      parts.push(`${summary.setupFilesPresent} present`);
    }
    if (summary.missingSetupFiles > 0) {
      parts.push(`${summary.missingSetupFiles} missing`);
    }
  }

  const summaryStr = parts.length > 0 ? parts.join(', ') : 'none';
  console.log(`  ${chalk.bold('Setup Files')} (${summaryStr})`);

  // Print each setup file
  for (const file of output.setupFiles) {
    let mark: string;
    let statusText: string;
    let ageText = '';

    switch (file.status) {
      case 'fresh':
        mark = chalk.green('✓');
        statusText = gitAvailable ? 'fresh' : 'present';
        ageText = file.age || '';
        break;
      case 'stale':
        mark = chalk.yellow('⚠');
        statusText = 'stale';
        ageText = file.age ? `${file.age} (${file.commitsSince} commits)` : '';
        break;
      case 'scaffold':
        mark = chalk.gray('○');
        statusText = 'scaffold';
        ageText = '—';
        break;
      case 'missing':
        mark = chalk.red('✗');
        statusText = 'missing';
        ageText = '—';
        break;
    }

    const namePadded = file.name.padEnd(22);
    const statusPadded = statusText.padEnd(10);
    console.log(`    ${namePadded} ${mark} ${statusPadded} ${ageText}`);
  }

  // Print other files section if analysis.md exists
  if (output.otherFiles.length > 0) {
    console.log(`\n  ${chalk.bold('Other Files')}`);
    for (const file of output.otherFiles) {
      const mark = chalk.green('✓');
      const namePadded = file.name.padEnd(22);
      const ageText = file.age ? `${file.age} (${file.label})` : `(${file.label})`;
      console.log(`    ${namePadded} ${mark} present     ${ageText}`);
    }
  }

  // Footer
  console.log('');
  if (!gitAvailable) {
    console.log(chalk.gray('Git unavailable — staleness detection skipped.'));
  } else if (summary.staleFiles > 0) {
    console.log(chalk.gray('Stale files have 5+ commits since last update. Run setup to refresh.'));
  }
}

/**
 * Get context status
 *
 * @param options - Command options
 * @param options.json - Output JSON format instead of human-readable
 */
export function getContextStatus(options: { json?: boolean }): void {
  // Check for .ana/ directory
  const cwd = process.cwd();
  const anaDir = path.join(cwd, '.ana');

  if (!fs.existsSync(anaDir)) {
    if (options.json) {
      console.log(JSON.stringify({ error: 'No .ana/ directory found. Run `ana init` first.' }));
    } else {
      console.error(chalk.red('Error: No .ana/ directory found. Run `ana init` first.'));
    }
    return;
  }

  const gitAvailable = isGitAvailable();

  // Gather setup file info
  const setupFiles: SetupFileInfo[] = REQUIRED_CONTEXT_FILES.map(relativePath =>
    getSetupFileInfo(relativePath, anaDir, gitAvailable)
  );

  // Gather other files (analysis.md)
  const otherFiles: OtherFileInfo[] = [];
  const analysisInfo = getAnalysisFileInfo(anaDir);
  if (analysisInfo) {
    otherFiles.push(analysisInfo);
  }

  // Calculate summary
  const summary: Summary = {
    totalFiles: setupFiles.length + otherFiles.length,
    setupFiles: setupFiles.length,
    setupFilesPresent: setupFiles.filter(f => f.exists).length,
    freshFiles: setupFiles.filter(f => f.status === 'fresh').length,
    staleFiles: setupFiles.filter(f => f.status === 'stale').length,
    scaffoldFiles: setupFiles.filter(f => f.status === 'scaffold').length,
    missingSetupFiles: setupFiles.filter(f => f.status === 'missing').length,
  };

  // Persist to .meta.json
  const persistedToMeta = persistToMeta(anaDir, summary);

  const output: ContextStatusOutput = {
    setupFiles,
    otherFiles,
    summary,
    gitAvailable,
    persistedToMeta,
  };

  if (options.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    printHumanReadable(output, gitAvailable);
  }
}

/**
 * Command definition for context management
 */
export const contextCommand = new Command('context')
  .description('Manage context files');

const statusCommand = new Command('status')
  .description('Show health of context files')
  .option('--json', 'Output JSON format for programmatic consumption')
  .action((options: { json?: boolean }) => {
    getContextStatus(options);
  });

contextCommand.addCommand(statusCommand);
