#!/usr/bin/env node

/**
 * Anatomia CLI - Auto-generated AI context for codebases
 *
 * Usage:
 *   ana --version       Show version
 *   ana --help          Show help
 *   ana init            Initialize .ana/ context
 *   ana mode <name>     Reference a mode file
 *
 * @packageDocumentation
 */

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { modeCommand } from './commands/mode.js';
import { analyzeCommand } from './commands/analyze.js';
import { setupCommand } from './commands/setup.js';
import { artifactCommand } from './commands/artifact.js';
import { workCommand } from './commands/work.js';

const program = new Command();

program
  .name('ana')
  .description('Auto-generated AI context for codebases')
  .version('0.1.0', '-v, --version', 'Display version number');

// Register commands
program.addCommand(initCommand);
program.addCommand(modeCommand);
program.addCommand(analyzeCommand);
program.addCommand(setupCommand);
program.addCommand(artifactCommand);
program.addCommand(workCommand);

// Parse arguments with async support
// CRITICAL: Use parseAsync() not parse() for async action handlers
// See: https://github.com/tj/commander.js#async-action-handlers
async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
