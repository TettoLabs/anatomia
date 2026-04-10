#!/usr/bin/env node

/**
 * Anatomia CLI - Verified AI development. Ship with proof.
 *
 * Usage:
 *   ana --version       Show version
 *   ana --help          Show help
 *   ana init            Initialize .ana/ context
 *   ana mode <name>     Reference a mode file
 *
 * @packageDocumentation
 */

import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { initCommand } from './commands/init/index.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
import { setupCommand } from './commands/setup.js';
import { artifactCommand } from './commands/artifact.js';
import { workCommand } from './commands/work.js';
import { scanCommand } from './commands/scan.js';
import { proofCommand } from './commands/proof.js';
import { registerPrCommand } from './commands/pr.js';
import { registerAgentsCommand } from './commands/agents.js';
import { registerVerifyPreCheckCommand } from './commands/verify-precheck.js';

const program = new Command();

program
  .name('ana')
  .description('Verified AI development. Ship with proof.')
  .version(pkg.version, '-v, --version', 'Display version number');

// Register commands
program.addCommand(initCommand);
program.addCommand(scanCommand);
program.addCommand(setupCommand);
program.addCommand(artifactCommand);
program.addCommand(workCommand);
program.addCommand(proofCommand);
registerPrCommand(program);
registerAgentsCommand(program);
registerVerifyPreCheckCommand(program);

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
