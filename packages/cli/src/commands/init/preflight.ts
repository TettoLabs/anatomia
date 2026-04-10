/**
 * Pre-flight validation for ana init (Item 14c — extracted from init.ts).
 */

import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import type { InitCommandOptions, InitState, PreflightResult } from './types.js';
import { confirm, getCliVersion } from './state.js';

/**
 * Phase 1: Pre-scan validation (D7)
 *
 * Validates project environment before scanning:
 * 7.1 — Project root detection
 * 7.2 — Existing installation detection (fresh/reinit/upgrade/corrupted)
 * 7.4 — Git validation (4 states)
 * 7.5 — Package manager check
 *
 * @param cwd - Current working directory
 * @param anaPath - Path to .ana/ directory
 * @param options - Command options
 * @returns Preflight result (canProceed, initState, optional stateBackup path)
 */
export async function validateInitPreconditions(
  cwd: string,
  anaPath: string,
  options: InitCommandOptions
): Promise<PreflightResult> {
  const autoYes = options.yes || options.force;

  // Check directory is readable/writable
  try {
    await fs.access(cwd, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    console.error(chalk.red('Error: Cannot read/write current directory'));
    console.error(chalk.gray('Check permissions: ls -la .'));
    process.exit(1);
  }

  // 7.1 — Project root detection
  const rootIndicators = ['package.json', 'go.mod', 'Cargo.toml', 'pyproject.toml', '.git'];
  const hasRoot = await Promise.all(
    rootIndicators.map(f => fileExists(path.join(cwd, f)))
  ).then(results => results.some(Boolean));

  if (!hasRoot) {
    console.error(chalk.red('No project root detected in this directory.'));
    console.error(chalk.gray("Run `ana init` from your project's root directory."));
    process.exit(1);
  }

  // 7.2 — Existing installation detection (4 states)
  const anaExists = await dirExists(anaPath);
  let initState: InitState = 'fresh';
  let stateBackup: string | undefined;
  let contextBackup: string | undefined;
  let anaJsonBackup: string | undefined;

  if (anaExists) {
    const anaJsonPath = path.join(anaPath, 'ana.json');
    const cliVersion = await getCliVersion();

    try {
      const anaJsonContent = await fs.readFile(anaJsonPath, 'utf-8');
      const config = JSON.parse(anaJsonContent);

      if (config.anaVersion && config.anaVersion !== cliVersion) {
        // Upgrade: version mismatch
        initState = 'upgrade';
        console.log(`\nAnatomia installation detected (v${config.anaVersion}).`);
        console.log(`Current CLI version: v${cliVersion}.\n`);
        console.log('Re-initializing will update scan data and skill detection.');
        console.log('Your confirmed rules, gotchas, and context files are preserved.\n');

        if (!autoYes) {
          const proceed = await confirm('Continue?', true);
          if (!proceed) { process.exit(0); }
        }
      } else {
        // Re-init: same version (or no anaVersion field yet)
        initState = 'reinit';
        console.log('\nExisting Anatomia installation detected.\n');
        console.log('This will:');
        console.log('  ✓ Refresh scan data');
        console.log('  ✓ Update skill ## Detected sections');
        console.log('  ✓ Add new skills if stack changes detected');
        console.log('  ✗ Will NOT touch your confirmed rules, gotchas, or context files\n');

        if (!autoYes) {
          const proceed = await confirm('Continue?', true);
          if (!proceed) { process.exit(0); }
        }
      }
    } catch {
      // Corrupted: .ana/ exists but no valid ana.json
      initState = 'corrupted';
      console.log(chalk.yellow('\nFound .ana/ directory but no valid ana.json.'));
      console.log('Treating as fresh initialization. Existing files may be overwritten.\n');

      if (!autoYes) {
        const proceed = await confirm('Continue?', true);
        if (!proceed) { process.exit(0); }
      }
    }

    // Backup before deletion for reinit/upgrade/corrupted
    const timestamp = Date.now();
    const statePath = path.join(anaPath, 'state');
    if (await dirExists(statePath)) {
      stateBackup = path.join(os.tmpdir(), `.ana-state-backup-${timestamp}`);
      console.log(chalk.gray('Backing up state/ directory...'));
      await fs.cp(statePath, stateBackup, { recursive: true });
    }

    // Back up context/ (user-enriched files)
    const contextPath = path.join(anaPath, 'context');
    if (await dirExists(contextPath)) {
      contextBackup = path.join(os.tmpdir(), `.ana-context-backup-${timestamp}`);
      console.log(chalk.gray('Backing up context/ directory...'));
      await fs.cp(contextPath, contextBackup, { recursive: true });
    }

    // Back up ana.json (user fields like setupMode, coAuthor)
    const anaJsonBackupPath = path.join(anaPath, 'ana.json');
    try {
      await fs.access(anaJsonBackupPath);
      anaJsonBackup = path.join(os.tmpdir(), `.ana-json-backup-${timestamp}`);
      await fs.cp(anaJsonBackupPath, anaJsonBackup);
    } catch { /* no ana.json to back up */ }

    // Delete existing .ana/
    console.log(chalk.gray('Removing existing .ana/...'));
    await fs.rm(anaPath, { recursive: true, force: true });
  }

  // 7.4 — Git validation (4 states)
  const hasGit = await dirExists(path.join(cwd, '.git'));

  if (!hasGit) {
    // No git at all — strong warning, default NO
    console.log(chalk.yellow('\n⚠ No git repository detected.\n'));
    console.log("Anatomia's pipeline requires git for:");
    console.log('  • Feature branching (ana work start)');
    console.log('  • Artifact commits (ana artifact save)');
    console.log('  • Pull requests (ana pr create)');
    console.log('  • Proof chain tracking\n');
    console.log('Init will continue but pipeline commands will not function.');
    console.log('Scan, skills, and context files will still work.\n');

    if (!autoYes) {
      const proceed = await confirm('Initialize without git?', false);
      if (!proceed) { process.exit(0); }
    }
  } else {
    // Git exists — check remote and commits
    try {
      const hasCommits = gitHasCommits(cwd);
      const hasRemote = gitHasRemote(cwd);

      if (hasCommits && !hasRemote) {
        console.log(chalk.blue('ℹ No remote detected. artifactBranch will use local branch names. ana pr create won\'t function until a remote is added.'));
      } else if (!hasCommits) {
        console.log(chalk.yellow('⚠ Empty git repository. Some scan data will be limited. Commit at least once before running the pipeline.'));
      }
      // Git + remote + commits = happy path, proceed silently
    } catch {
      // Git check failed — proceed with warning
      console.log(chalk.yellow('⚠ Git validation failed. Proceeding with limited git detection.'));
    }
  }

  // 7.5 — Package manager check
  const hasPackageJson = await fileExists(path.join(cwd, 'package.json'));
  const hasGoMod = await fileExists(path.join(cwd, 'go.mod'));
  const hasCargo = await fileExists(path.join(cwd, 'Cargo.toml'));
  const hasPyproject = await fileExists(path.join(cwd, 'pyproject.toml'));
  const hasPackageManifest = hasPackageJson || hasGoMod || hasCargo || hasPyproject;

  if (!hasPackageManifest) {
    console.log(chalk.yellow('⚠ No package.json (or equivalent) found. Stack detection will be limited.'));
  } else if (hasPackageJson) {
    const hasNodeModules = await dirExists(path.join(cwd, 'node_modules'));
    if (!hasNodeModules) {
      // Detect package manager for the message
      let pkgMgr = 'npm';
      if (await fileExists(path.join(cwd, 'pnpm-lock.yaml'))) pkgMgr = 'pnpm';
      else if (await fileExists(path.join(cwd, 'yarn.lock'))) pkgMgr = 'yarn';
      else if (await fileExists(path.join(cwd, 'bun.lockb'))) pkgMgr = 'bun';
      console.log(chalk.blue(`ℹ Dependencies not installed. Convention detection may be limited. Run ${pkgMgr} install for deeper detection.`));
    }
  }

  return {
    canProceed: true,
    initState,
    stateBackup,
    contextBackup,
    anaJsonBackup,
  };
}

/**
 * Check if git repository has any commits
 * @param cwd - Working directory
 * @returns true if HEAD exists (has commits)
 */
function gitHasCommits(cwd: string): boolean {
  try {
    execSync('git rev-parse --verify HEAD', { cwd, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if git repository has a remote configured
 * @param cwd - Working directory
 * @returns true if at least one remote exists
 */
function gitHasRemote(cwd: string): boolean {
  try {
    const output = execSync('git remote', { cwd, stdio: 'pipe', encoding: 'utf-8' });
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if directory exists
 * @param dirPath - Path to check
 * @returns true if directory exists
 */
export async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if file exists
 * @param filePath - Path to check
 * @returns true if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}
