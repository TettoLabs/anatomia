/**
 * ana mode <name> - Reference a mode file
 *
 * Validates the mode exists and displays information about it.
 *
 * @example
 *   $ ana mode code
 *   Mode: code
 *   Path: .ana/modes/code.md
 *
 *   Available modes:
 *     • architect - System design and architecture
 *     • code      - Implementation and coding
 *     • debug     - Debugging and troubleshooting
 *     • docs      - Documentation writing
 *     • test      - Test writing and coverage
 *
 *   To use: Reference @.ana/modes/code.md in your AI chat.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';
import { fileWriter } from '../utils/file-writer.js';

// Available modes with descriptions
const MODES: Record<string, string> = {
  architect: 'System design and architecture',
  code: 'Implementation and coding',
  debug: 'Debugging and troubleshooting',
  docs: 'Documentation writing',
  test: 'Test writing and coverage',
};

// Mode names as type
type ModeName = keyof typeof MODES;

// Create the mode command
export const modeCommand = new Command('mode')
  .description('Reference a mode file')
  .argument('[name]', 'Mode name (architect, code, debug, docs, test)')
  .option('-l, --list', 'List all available modes')
  .action(async (name: string | undefined, options: { list?: boolean }) => {
    // If --list flag, show all modes and exit
    if (options.list) {
      printAvailableModes();
      return;
    }

    // If no name provided and no --list, show error
    if (!name) {
      console.log(chalk.red('\nError: Mode name is required'));
      console.log(chalk.gray('Usage: ana mode <name>'));
      console.log(chalk.gray('       ana mode --list\n'));
      process.exit(1);
    }

    // Validate mode name
    const modeName = name.toLowerCase();
    if (!isValidMode(modeName)) {
      console.log(chalk.red(`\nError: Unknown mode '${name}'`));
      console.log(chalk.gray(`\nAvailable modes: ${Object.keys(MODES).join(', ')}`));
      console.log(chalk.gray(`Run 'ana mode --list' to see descriptions.\n`));
      process.exit(1);
    }

    // Check if .ana/ exists
    const cwd = process.cwd();
    const anaPath = path.join(cwd, '.ana');
    const modePath = path.join(anaPath, 'modes', `${modeName}.md`);

    if (!(await fileWriter.exists(anaPath))) {
      console.log(chalk.yellow('\n⚠ Warning: .ana/ directory not found.'));
      console.log(chalk.gray('Run `ana init` first to create the context structure.\n'));
      // Still show mode info even if .ana/ doesn't exist
    }

    // Display mode information
    console.log('');
    console.log(chalk.blue(`Mode: ${modeName}`));
    console.log(chalk.gray(`Description: ${MODES[modeName]}`));
    console.log(chalk.gray(`Path: .ana/modes/${modeName}.md`));
    console.log('');

    // Show file existence status
    if (await fileWriter.exists(modePath)) {
      console.log(chalk.green('✓ Mode file exists'));
    } else {
      console.log(chalk.yellow('⚠ Mode file not found'));
      console.log(chalk.gray('  The mode will be created when you run `ana init`.'));
      console.log(chalk.gray('  (Full mode templates come in STEP_0.2)'));
    }

    console.log('');
    printAvailableModes();
    console.log('');
    console.log(chalk.gray(`To use: Reference @.ana/modes/${modeName}.md in your AI chat.`));
    console.log('');
  });

/**
 * Type guard to check if string is valid mode name
 */
function isValidMode(name: string): name is ModeName {
  return Object.prototype.hasOwnProperty.call(MODES, name);
}

/**
 * Print list of available modes
 */
function printAvailableModes(): void {
  console.log(chalk.blue('Available modes:'));
  for (const [name, description] of Object.entries(MODES)) {
    const padding = ' '.repeat(10 - name.length);
    console.log(chalk.gray(`  • ${name}${padding}- ${description}`));
  }
}
