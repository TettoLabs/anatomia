#!/usr/bin/env node

/**
 * Anatomia CLI - Verified AI development. Ship with proof.
 *
 * Usage:
 *   ana --version       Show version
 *   ana --help          Show help
 *   ana init            Initialize .ana/ context
 *
 * @packageDocumentation
 */

import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { registerInitCommand } from './commands/init/index.js';
import { registerScanCommand } from './commands/scan.js';
import { registerSetupCommand } from './commands/setup.js';
import { registerArtifactCommand } from './commands/artifact.js';
import { registerWorkCommand } from './commands/work.js';
import { registerProofCommand } from './commands/proof.js';
import { registerPrCommand } from './commands/pr.js';
import { registerAgentsCommand } from './commands/agents.js';
import { registerVerifyCommand } from './commands/verify.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));

const program = new Command();

program
  .name('ana')
  .description('Verified AI development. Ship with proof.')
  .version(`anatomia-cli/${pkg.version}`, '-v, --version', 'Display version number');

// Register commands (Item 22: every command uses the register* pattern).
registerInitCommand(program);
registerScanCommand(program);
registerSetupCommand(program);
registerArtifactCommand(program);
registerWorkCommand(program);
registerProofCommand(program);
registerPrCommand(program);
registerAgentsCommand(program);
registerVerifyCommand(program);

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
