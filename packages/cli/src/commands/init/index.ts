/**
 * ana init - Initialize .ana/ context framework (Item 14c orchestrator).
 *
 * Exports initCommand (Command object). The action handler orchestrates
 * the 9-phase init pipeline by calling into sibling modules.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { getProjectName } from '../../utils/validators.js';
import type { InitCommandOptions } from './types.js';
import { validateInitPreconditions } from './preflight.js';
import {
  createDirectoryStructure,
  generateScaffolds,
  copyStaticFilesWithVerification,
  copyHookScripts,
  createClaudeConfiguration,
} from './assets.js';
import {
  runAnalyzer,
  saveScanJson,
  createAnaJson,
  buildSymbolIndexSafe,
  writeCliPath,
  atomicRename,
  displaySuccessMessage,
} from './state.js';

/** Create init command */
export const initCommand = new Command('init')
  .description('Initialize .ana/ context framework')
  .option('-f, --force', 'Overwrite existing .ana/ (preserves state/)')
  .option('-y, --yes', 'Skip confirmation prompts (non-interactive mode)')
  .action(async (options: InitCommandOptions, command: Command) => {
    // Reject positional arguments (init operates on cwd)
    if (command.args.length > 0) {
      console.error(chalk.red(`Error: ana init does not accept a path argument.`));
      console.error(chalk.gray('cd into the project directory and run: ana init'));
      process.exit(1);
    }

    const cwd = process.cwd();
    const anaPath = path.join(cwd, '.ana');

    // Phase 1: Pre-scan validation (D7)
    const preflight = await validateInitPreconditions(cwd, anaPath, options);
    if (!preflight.canProceed) {
      return; // Exit already handled in validation
    }

    // Phase 2-9: Atomic operation
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-init-'));
    const tmpAnaPath = path.join(tmpDir, '.ana');

    try {
      // Set ASTCache to write to temp directory during analysis
      // (prevents creating .ana/ in project root before atomic rename)
      const { ASTCache } = await import('../../engine/index.js');
      const tmpCacheDir = path.join(tmpAnaPath, 'state', 'cache');
      ASTCache.setCacheDir(tmpCacheDir);

      // All operations in temp directory
      const scanStart = Date.now();
      const engineResult = await runAnalyzer(cwd);

      // Reset cache override after analysis
      ASTCache.setCacheDir(null);
      await createDirectoryStructure(tmpAnaPath);
      await generateScaffolds(tmpAnaPath, engineResult);
      await copyStaticFilesWithVerification(tmpAnaPath);
      await copyHookScripts(tmpAnaPath);
      await saveScanJson(tmpAnaPath, engineResult);
      await createAnaJson(tmpAnaPath, engineResult);
      // snapshot.json removed (S18/D5 — orphaned, nothing reads it)
      await buildSymbolIndexSafe(cwd, tmpAnaPath);
      await writeCliPath(tmpAnaPath);

      // Restore state/ if --force was used
      if (preflight.stateBackup) {
        // Remove empty state/ created by Phase 3
        const stateDir = path.join(tmpAnaPath, 'state');
        await fs.rm(stateDir, { recursive: true, force: true });
        // Move backup into place
        await fs.rename(preflight.stateBackup, stateDir);
      }

      // Restore context/ if --force was used
      if (preflight.contextBackup) {
        const contextDir = path.join(tmpAnaPath, 'context');
        await fs.rm(contextDir, { recursive: true, force: true }).catch(() => {});
        await fs.rename(preflight.contextBackup, contextDir);
      }

      // Restore ana.json then overwrite mechanical fields
      if (preflight.anaJsonBackup) {
        const newAnaJsonPath = path.join(tmpAnaPath, 'ana.json');
        let restoredJson: Record<string, unknown>;
        try {
          restoredJson = JSON.parse(await fs.readFile(preflight.anaJsonBackup, 'utf-8'));
        } catch {
          // Backup is corrupt — skip restore, keep freshly generated ana.json
          restoredJson = {};
        }
        if (Object.keys(restoredJson).length > 0) {
          let newJson: Record<string, unknown>;
          try {
            newJson = JSON.parse(await fs.readFile(newAnaJsonPath, 'utf-8'));
          } catch {
            newJson = {};
          }
          // Preserve user fields from backup, overwrite only mechanical fields from new
          const merged = {
            ...restoredJson,
            ...(newJson['anaVersion'] != null ? { anaVersion: newJson['anaVersion'] } : {}),
            ...(newJson['lastScanAt'] != null ? { lastScanAt: newJson['lastScanAt'] } : {}),
          };
          await fs.writeFile(newAnaJsonPath, JSON.stringify(merged, null, 2) + '\n');
        }
        await fs.rm(preflight.anaJsonBackup).catch(() => {});
      }

      // SUCCESS: Atomic rename
      await atomicRename(tmpAnaPath, anaPath);

      // Create .claude/ configuration (outside temp directory - handles merge)
      await createClaudeConfiguration(cwd, engineResult, preflight.initState);

      // Display success
      const scanTime = ((Date.now() - scanStart) / 1000).toFixed(1);
      const projectName = await getProjectName(cwd);
      displaySuccessMessage(engineResult, projectName, scanTime);
    } catch (error) {
      // FAILURE: Cleanup temp, no changes made
      await fs.rm(tmpDir, { recursive: true, force: true });

      if (error instanceof Error) {
        console.error(chalk.red(`\n❌ Init failed: ${error.message}`));
        console.error(chalk.gray('No changes made to your project.'));
      }
      process.exit(1);
    }
  });
