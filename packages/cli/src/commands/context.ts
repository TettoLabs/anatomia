/**
 * ana context - Context health status
 *
 * Subcommands:
 *   ana context status         Show health of context files
 *
 * Exit codes:
 *   0 - Success
 *   1 - Error (missing .ana/ directory)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * The 7 setup files (hardcoded, matches existing .meta.json tracking)
 */
const SETUP_FILES = [
  'project-overview.md',
  'architecture.md',
  'patterns.md',
  'conventions.md',
  'workflow.md',
  'testing.md',
  'debugging.md',
];

/**
 * Information about a single context file
 */
interface FileStatus {
  name: string;
  exists: boolean;
  mtime: string | null;
  ageMs: number | null;
  commitsSince: number | null;
}

/**
 * Summary counts
 */
interface StatusSummary {
  totalFiles: number;
  presentFiles: number;
  missingFiles: number;
  staleFiles: number;
}

/**
 * Complete status output
 */
interface ContextStatusOutput {
  timestamp: string;
  setupFiles: FileStatus[];
  summary: StatusSummary;
  gitAvailable: boolean;
}

/**
 * lastHealth shape for .meta.json (matches existing format)
 */
interface LastHealth {
  timestamp: string;
  totalFiles: number;
  setupFiles: number;
  setupFilesPresent: number;
  missingSetupFiles: number;
  staleFiles: number;
}

/**
 * Check if git is available in current directory
 *
 * @returns True if in a git repository, false otherwise
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
 * Count commits since a given date
 *
 * @param sinceDate - ISO date string
 * @returns Number of commits since the date, or null if git command fails
 */
function countCommitsSince(sinceDate: string): number | null {
  try {
    const output = execSync(`git rev-list --count HEAD --since="${sinceDate}"`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    }).trim();
    return parseInt(output, 10);
  } catch {
    return null;
  }
}

/**
 * Format age in human-readable terms
 *
 * @param ageMs - Age in milliseconds
 * @returns Human-readable age string
 */
function formatAge(ageMs: number): string {
  if (ageMs < 0) {
    return 'in the future';
  }

  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  return 'just now';
}

/**
 * Format date for display (Mar 27 12:50)
 *
 * @param date - Date object
 * @returns Formatted date string
 */
function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `${month} ${day} ${hours}:${mins}`;
}

/**
 * Get status of all context files
 *
 * @returns Context status output
 * @throws Error if .ana/ directory doesn't exist
 */
function gatherContextStatus(): ContextStatusOutput {
  const anaDir = path.join(process.cwd(), '.ana');
  const contextDir = path.join(anaDir, 'context');
  const metaPath = path.join(anaDir, '.meta.json');

  // Check .ana/ exists
  if (!fs.existsSync(anaDir)) {
    throw new Error('Not initialized: .ana/ directory not found. Run `ana init` first.');
  }

  // Check .meta.json exists
  if (!fs.existsSync(metaPath)) {
    throw new Error('Not initialized: .ana/.meta.json not found. Run `ana init` first.');
  }

  const now = new Date();
  const gitAvailable = isGitAvailable();

  const setupFiles: FileStatus[] = SETUP_FILES.map((name) => {
    const filePath = path.join(contextDir, name);

    if (!fs.existsSync(filePath)) {
      return {
        name,
        exists: false,
        mtime: null,
        ageMs: null,
        commitsSince: null,
      };
    }

    const stat = fs.statSync(filePath);
    const mtime = stat.mtime;
    const ageMs = now.getTime() - mtime.getTime();

    let commitsSince: number | null = null;
    if (gitAvailable) {
      commitsSince = countCommitsSince(mtime.toISOString());
    }

    return {
      name,
      exists: true,
      mtime: mtime.toISOString(),
      ageMs,
      commitsSince,
    };
  });

  const presentFiles = setupFiles.filter((f) => f.exists).length;
  const staleFiles = setupFiles.filter((f) => f.exists && f.commitsSince !== null && f.commitsSince > 0).length;

  return {
    timestamp: now.toISOString(),
    setupFiles,
    summary: {
      totalFiles: SETUP_FILES.length,
      presentFiles,
      missingFiles: SETUP_FILES.length - presentFiles,
      staleFiles,
    },
    gitAvailable,
  };
}

/**
 * Update lastHealth in .meta.json
 *
 * @param status - Context status output
 */
function updateLastHealth(status: ContextStatusOutput): void {
  const metaPath = path.join(process.cwd(), '.ana', '.meta.json');

  try {
    const content = fs.readFileSync(metaPath, 'utf-8');
    const meta = JSON.parse(content);

    const lastHealth: LastHealth = {
      timestamp: status.timestamp,
      totalFiles: status.summary.totalFiles + 1, // +1 for analysis.md (total context files)
      setupFiles: status.summary.totalFiles,
      setupFilesPresent: status.summary.presentFiles,
      missingSetupFiles: status.summary.missingFiles,
      staleFiles: status.summary.staleFiles,
    };

    meta.lastHealth = lastHealth;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
  } catch {
    // Silently continue if update fails - command is informational
  }
}

/**
 * Print human-readable status output
 *
 * @param status - Context status output
 */
function printHumanReadable(status: ContextStatusOutput): void {
  console.log(chalk.bold('\nContext Health\n'));
  console.log(`  Setup Files (${status.summary.totalFiles} total):`);

  for (const file of status.setupFiles) {
    if (file.exists) {
      const mark = chalk.green('✓');
      const state = chalk.green('present');
      const dateStr = file.mtime ? formatDate(new Date(file.mtime)) : '';
      const ageStr = file.ageMs !== null ? formatAge(file.ageMs) : '';

      let line = `    ${file.name.padEnd(22)} ${mark} ${state.padEnd(10)} ${dateStr.padEnd(14)} ${ageStr}`;

      if (status.gitAvailable && file.commitsSince !== null && file.commitsSince > 0) {
        line += `   ${file.commitsSince} commit${file.commitsSince === 1 ? '' : 's'} since`;
      }

      console.log(line);
    } else {
      const mark = chalk.red('✗');
      const state = chalk.red('missing');
      console.log(`    ${file.name.padEnd(22)} ${mark} ${state}`);
    }
  }

  if (!status.gitAvailable) {
    console.log(chalk.yellow('\n  Git unavailable — commit counts not shown'));
  }

  let summaryLine = `\n  Summary: ${status.summary.presentFiles}/${status.summary.totalFiles} setup files present`;
  if (status.gitAvailable && status.summary.staleFiles > 0) {
    summaryLine += `, ${status.summary.staleFiles} with commits since update`;
  }
  console.log(summaryLine);

  console.log(chalk.gray('\nUpdated .meta.json lastHealth'));
}

/**
 * Get context status and output results
 *
 * @param options - Command options
 * @param options.json - Output JSON format instead of human-readable
 * @throws Error if .ana/ directory or .meta.json doesn't exist
 */
export function getContextStatus(options: { json?: boolean }): void {
  const status = gatherContextStatus();

  // Update lastHealth
  updateLastHealth(status);

  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
  } else {
    printHumanReadable(status);
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
    try {
      getContextStatus(options);
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });

contextCommand.addCommand(statusCommand);
