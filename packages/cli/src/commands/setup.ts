/**
 * ana setup - Setup-related commands
 *
 * Subcommands:
 * - complete: Validate context files and finalize setup (D12.4)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileExists } from '../utils/validators.js';
import { createCheckCommand } from './check.js';
import { createIndexCommand } from './symbol-index.js';
import { validateSetupCompletion } from './check.js';

interface SetupCompleteOptions {
  force?: boolean;
}

/** Create setup parent command */
export const setupCommand = new Command('setup').description(
  'Setup-related commands'
);

/** Add 'check' subcommand */
setupCommand.addCommand(createCheckCommand());

/** Add 'index' subcommand */
setupCommand.addCommand(createIndexCommand());

/** Add 'complete' subcommand */
setupCommand
  .command('complete')
  .description('Validate context files and finalize setup')
  .option('--force', 'Force complete regardless of validation')
  .action(async (options: SetupCompleteOptions) => {
    const cwd = process.cwd();
    const anaPath = path.join(cwd, '.ana');
    const anaJsonPath = path.join(anaPath, 'ana.json');

    // Check .ana/ exists
    if (!(await fileExists(anaPath))) {
      console.error(chalk.red('Error: .ana/ directory not found'));
      console.error(
        chalk.gray('Run `ana init` first to create .ana/ structure.')
      );
      process.exit(1);
    }

    // Check ana.json exists
    if (!(await fileExists(anaJsonPath))) {
      console.error(chalk.red('Error: ana.json not found'));
      console.error(chalk.gray('Run `ana init` first.'));
      process.exit(1);
    }

    console.log(chalk.blue('\n🔍 Validating setup...\n'));

    // Run D12.3 validation
    const result = await validateSetupCompletion(cwd);

    // --force overrides to "complete"
    const finalMode = options.force ? 'complete' : result.setupMode;

    // Display warnings
    if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        console.log(chalk.yellow(`  ⚠ ${w}`));
      }
      console.log();
    }

    // Update ana.json
    let config: Record<string, unknown>;
    try {
      const content = await fs.readFile(anaJsonPath, 'utf-8');
      config = JSON.parse(content);
    } catch {
      config = {};
    }

    config['setupMode'] = finalMode;
    config['setupCompletedAt'] = new Date().toISOString();
    await fs.writeFile(anaJsonPath, JSON.stringify(config, null, 2), 'utf-8');

    // Handle setup-progress.json lifecycle
    const progressPath = path.join(anaPath, 'state', 'setup-progress.json');
    if (finalMode === 'complete') {
      // Delete on complete
      try {
        await fs.unlink(progressPath);
      } catch {
        // File may not exist — that's fine
      }
    }
    // If partial: keep for resume (no action needed)

    // Display summary
    const { stats } = result;
    if (finalMode === 'complete') {
      console.log(chalk.green('✓ Setup complete\n'));
      console.log(`  Skills:     ${stats.skillsCalibrated} calibrated`);
      console.log(`  Context:    ${stats.contextSections.populated}/${stats.contextSections.total} sections`);
      console.log(`  Principles: ${stats.principlesCaptured ? 'captured' : 'skipped'}`);
      console.log();
      console.log(`  Ana now knows your team. Start working:`);
      console.log(`  claude --agent ana`);
      console.log();
    } else {
      console.log(chalk.yellow('✓ Setup complete (partial)\n'));
      for (const w of result.warnings) {
        console.log(chalk.yellow(`  ⚠ ${w}`));
      }
      console.log();
      console.log(`  Run ${chalk.cyan('ana setup')} to fill remaining sections.`);
      console.log(`  claude --agent ana`);
      console.log();
    }
  });
