/**
 * ana context - Context file health and status
 *
 * Subcommands:
 *   ana context status         Show health of all context files
 *   ana context status --json  JSON output for programmatic consumption
 *
 * Exit codes:
 *   0 - Success (always for status - it's informational)
 *   1 - Error (missing .ana/context/, etc.)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { SETUP_CONTEXT_FILES } from '../constants.js';

/**
 * File information for setup files
 */
interface SetupFileInfo {
  file: string;
  exists: boolean;
  mtime: string | null;
  commitsSince: number | null;
  stale: boolean;
}

/**
 * File information for other context files
 */
interface OtherFileInfo {
  file: string;
  exists: boolean;
  mtime: string | null;
}

/**
 * Summary statistics
 */
interface HealthSummary {
  totalFiles: number;
  setupFiles: number;
  setupFilesPresent: number;
  missingSetupFiles: number;
  staleFiles: number;
}

/**
 * Complete status output
 */
interface StatusOutput {
  timestamp: string;
  setupFiles: SetupFileInfo[];
  otherFiles: OtherFileInfo[];
  summary: HealthSummary;
}

/**
 * Check if we're in a git repo and can run git commands
 *
 * @returns True if git commands will work
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
 * @param since - ISO date string
 * @returns Number of commits since that date, or null if git unavailable
 */
function countCommitsSince(since: string): number | null {
  try {
    const output = execSync(`git log --oneline --since="${since}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
    if (!output) return 0;
    return output.split('\n').length;
  } catch {
    return null;
  }
}

/**
 * Calculate human-readable age from mtime
 *
 * @param mtime - File modification time as ISO string
 * @returns Human-readable age string (e.g., "2 days ago", "3 hours ago")
 */
function formatAge(mtime: string): string {
  const now = new Date();
  const fileDate = new Date(mtime);
  const diffMs = now.getTime() - fileDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else {
    return 'just now';
  }
}

/**
 * Get status of all context files
 *
 * @param options - Command options
 * @param options.json - Output JSON format instead of human-readable
 */
export function getContextStatus(options: { json?: boolean }): void {
  const cwd = process.cwd();
  const contextPath = path.join(cwd, '.ana', 'context');

  // Check if .ana/context/ exists
  if (!fs.existsSync(contextPath)) {
    if (options.json) {
      console.log(JSON.stringify({ error: '.ana/context/ directory not found' }));
    } else {
      console.error(chalk.red('Error: .ana/context/ directory not found'));
      console.error(chalk.gray('Run `ana init` first to create .ana/ structure.'));
    }
    process.exit(1);
  }

  const gitAvailable = isGitAvailable();
  const timestamp = new Date().toISOString();

  // Read all .md files from context directory
  const entries = fs.readdirSync(contextPath, { withFileTypes: true });
  const mdFiles = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => entry.name);

  // Process setup files
  const setupFiles: SetupFileInfo[] = [];
  for (const filename of SETUP_CONTEXT_FILES) {
    const filePath = path.join(contextPath, filename);
    let fileInfo: SetupFileInfo;

    try {
      const stats = fs.statSync(filePath);
      const mtime = stats.mtime.toISOString();
      let commitsSince: number | null = null;
      let stale = false;

      if (gitAvailable) {
        commitsSince = countCommitsSince(mtime);
        stale = (commitsSince !== null && commitsSince > 0);
      }

      fileInfo = {
        file: filename,
        exists: true,
        mtime,
        commitsSince,
        stale,
      };
    } catch {
      // File doesn't exist or stat failed
      fileInfo = {
        file: filename,
        exists: false,
        mtime: null,
        commitsSince: null,
        stale: false,
      };
    }

    setupFiles.push(fileInfo);
  }

  // Process other files (not in setup list)
  const otherFiles: OtherFileInfo[] = [];
  const setupFileSet = new Set(SETUP_CONTEXT_FILES);
  for (const filename of mdFiles) {
    if (!setupFileSet.has(filename)) {
      const filePath = path.join(contextPath, filename);
      try {
        const stats = fs.statSync(filePath);
        const mtime = stats.mtime.toISOString();
        otherFiles.push({
          file: filename,
          exists: true,
          mtime,
        });
      } catch {
        otherFiles.push({
          file: filename,
          exists: false,
          mtime: null,
        });
      }
    }
  }

  // Calculate summary
  const setupFilesPresent = setupFiles.filter(f => f.exists).length;
  const missingSetupFiles = SETUP_CONTEXT_FILES.length - setupFilesPresent;
  const staleFiles = setupFiles.filter(f => f.stale).length;
  const totalFiles = setupFilesPresent + otherFiles.length;

  const summary: HealthSummary = {
    totalFiles,
    setupFiles: SETUP_CONTEXT_FILES.length,
    setupFilesPresent,
    missingSetupFiles,
    staleFiles,
  };

  const output: StatusOutput = {
    timestamp,
    setupFiles,
    otherFiles,
    summary,
  };

  // Update .meta.json with lastHealth
  updateLastHealth(summary, timestamp);

  // Display output
  if (options.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    printHumanReadable(output, gitAvailable);
  }
}

/**
 * Update lastHealth field in .meta.json
 *
 * @param summary - Health summary to save
 * @param timestamp - Timestamp of health check
 */
function updateLastHealth(summary: HealthSummary, timestamp: string): void {
  const metaPath = path.join(process.cwd(), '.ana', '.meta.json');

  try {
    const content = fs.readFileSync(metaPath, 'utf-8');
    const meta = JSON.parse(content);
    meta.lastHealth = {
      timestamp,
      ...summary,
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
  } catch {
    // Silently continue if .meta.json doesn't exist or can't be updated
    // Status command should work even without .meta.json
  }
}

/**
 * Print human-readable status output
 *
 * @param output - Status output structure
 * @param gitAvailable - Whether git commands worked
 */
function printHumanReadable(output: StatusOutput, gitAvailable: boolean): void {
  console.log(chalk.bold('\nContext Health\n'));

  // Setup files section
  const presentCount = output.setupFiles.filter(f => f.exists).length;
  const totalSetup = SETUP_CONTEXT_FILES.length;
  const setupHeader = presentCount === totalSetup
    ? `Setup Files (${totalSetup} verified):`
    : `Setup Files (${presentCount} of ${totalSetup} present):`;
  console.log(chalk.bold(`  ${setupHeader}`));

  for (const file of output.setupFiles) {
    if (file.exists && file.mtime) {
      const mark = chalk.green('✓');
      const age = formatAge(file.mtime);
      let line = `    ${mark} ${file.file.padEnd(25)} ${age}`;

      if (gitAvailable && file.stale && file.commitsSince !== null) {
        const warning = chalk.yellow(`⚠ ${file.commitsSince} commit${file.commitsSince === 1 ? '' : 's'} since update`);
        line += `    ${warning}`;
      }

      console.log(line);
    } else {
      const mark = chalk.red('✗');
      console.log(`    ${mark} ${file.file.padEnd(25)} missing`);
    }
  }

  // Other files section
  if (output.otherFiles.length > 0) {
    console.log(chalk.bold('\n  Other Files:'));
    for (const file of output.otherFiles) {
      if (file.exists && file.mtime) {
        const age = formatAge(file.mtime);
        console.log(`    ${file.file.padEnd(25)} ${age}`);
      }
    }
  }

  // Summary
  console.log();
  if (output.summary.missingSetupFiles === 0 && output.summary.staleFiles === 0) {
    console.log(chalk.green('All context files present. No staleness detected.'));
  } else {
    if (output.summary.missingSetupFiles > 0) {
      console.log(chalk.red(`${output.summary.missingSetupFiles} setup file${output.summary.missingSetupFiles === 1 ? '' : 's'} missing.`));
    }
    if (output.summary.staleFiles > 0) {
      console.log(chalk.yellow(`${output.summary.staleFiles} file${output.summary.staleFiles === 1 ? '' : 's'} may be stale.`));
    }
    console.log(chalk.gray('Consider re-running setup or manually updating affected files.'));
  }

  if (!gitAvailable) {
    console.log(chalk.gray('\nNote: Git unavailable. Staleness detection skipped.'));
  }
}

/**
 * Command definition for context management
 */
export const contextCommand = new Command('context')
  .description('Context file health and status');

const statusCommand = new Command('status')
  .description('Show health of all context files')
  .option('--json', 'Output JSON format for programmatic consumption')
  .action((options: { json?: boolean }) => {
    getContextStatus(options);
  });

contextCommand.addCommand(statusCommand);
