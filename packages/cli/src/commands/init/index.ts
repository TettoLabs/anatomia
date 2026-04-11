/**
 * ana init - Initialize .ana/ context framework (Item 14c orchestrator).
 *
 * Exports registerInitCommand (Item 22 registration consistency). The
 * action handler orchestrates the 9-phase init pipeline by calling into
 * sibling modules.
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
  createClaudeConfiguration,
} from './assets.js';
import {
  runAnalyzer,
  saveScanJson,
  createAnaJson,
  buildSymbolIndexSafe,
  atomicRename,
  displaySuccessMessage,
} from './state.js';
import { AnaJsonSchema } from './anaJsonSchema.js';

/**
 * Register the `init` command.
 *
 * @param program - Commander program instance.
 */
export function registerInitCommand(program: Command): void {
  const initCommand = new Command('init')
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
      await saveScanJson(tmpAnaPath, engineResult);
      await createAnaJson(tmpAnaPath, engineResult);
      // snapshot.json removed (S18/D5 — orphaned, nothing reads it)
      await buildSymbolIndexSafe(cwd, tmpAnaPath);

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

      // Restore ana.json: parse user backup through AnaJsonSchema (strips
      // orphaned fields like scanStaleDays, catches invalid enum values),
      // then overwrite mechanical fields (anaVersion, lastScanAt) from the
      // freshly-created ana.json in tmpAnaPath. Note: this block is
      // replaced entirely in S19/NEW-001 Option B (swap-based atomic
      // rename) — the schema-validated merge moves into preserveUserState.
      if (preflight.anaJsonBackup) {
        const newAnaJsonPath = path.join(tmpAnaPath, 'ana.json');
        let restoredRaw: unknown;
        try {
          restoredRaw = JSON.parse(await fs.readFile(preflight.anaJsonBackup, 'utf-8'));
        } catch {
          // Backup is corrupt — skip restore, keep freshly generated ana.json
          restoredRaw = {};
        }
        const parsed = AnaJsonSchema.safeParse(restoredRaw);
        if (parsed.success && Object.keys(restoredRaw as Record<string, unknown>).length > 0) {
          let newJson: Record<string, unknown>;
          try {
            newJson = JSON.parse(await fs.readFile(newAnaJsonPath, 'utf-8'));
          } catch {
            newJson = {};
          }
          // Preserve schema-validated user fields; refresh mechanical ones.
          // Note: only anaVersion + lastScanAt refresh here — language,
          // framework, packageManager, commands stay from the old ana.json
          // (pre-existing behavior; full mechanical-field refresh is a
          // separate design decision tracked for a later sprint).
          const merged = {
            ...parsed.data,
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

  program.addCommand(initCommand);
}
