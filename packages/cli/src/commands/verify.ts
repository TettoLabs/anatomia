/**
 * ana verify pre-check - Contract seal verification
 *
 * Usage:
 *   ana verify pre-check <slug>
 *
 * Checks seal integrity: reads .saves.json for the saved contract hash,
 * compares to the current contract file hash, returns INTACT/TAMPERED/UNVERIFIABLE.
 *
 * Exit codes:
 *   0 - Always (informational tool, never blocks)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { findProjectRoot } from '../utils/validators.js';

/**
 * Contract pre-check result — seal verification only
 */
interface ContractPreCheckResult {
  seal: 'INTACT' | 'TAMPERED' | 'UNVERIFIABLE';
  sealHash?: string | undefined;
}

/**
 * Run contract seal verification
 *
 * @param slug - Work item slug
 * @param projectRoot - Project root path (defaults to cwd)
 * @returns Structured pre-check result with seal status
 */
export function runContractPreCheck(slug: string, projectRoot: string = findProjectRoot()): ContractPreCheckResult {
  const slugDir = path.join(projectRoot, '.ana', 'plans', 'active', slug);
  const savesPath = path.join(slugDir, '.saves.json');
  const contractPath = path.join(slugDir, 'contract.yaml');

  // Check if contract exists
  if (!fs.existsSync(contractPath)) {
    return { seal: 'UNVERIFIABLE' };
  }

  // Read .saves.json for contract hash
  let sealHash: string | undefined;

  if (fs.existsSync(savesPath)) {
    try {
      const saves: Record<string, { hash?: string }> = JSON.parse(fs.readFileSync(savesPath, 'utf-8'));
      if (saves['contract']) {
        sealHash = saves['contract'].hash;
      }
    } catch {
      // Ignore parse errors
    }
  }

  if (!sealHash) {
    return { seal: 'UNVERIFIABLE' };
  }

  // Seal check: compare current contract hash against saved hash
  const currentContent = fs.readFileSync(contractPath, 'utf-8');
  const currentHash = `sha256:${createHash('sha256').update(currentContent).digest('hex')}`;
  const seal: 'INTACT' | 'TAMPERED' = currentHash === sealHash ? 'INTACT' : 'TAMPERED';

  return { seal, sealHash };
}

/**
 * Print contract pre-check results (seal status only)
 *
 * @param result - Contract pre-check result
 * @param slugDir - Slug directory path
 */
function printContractResults(result: ContractPreCheckResult, slugDir: string): void {
  console.log(chalk.bold('\n=== CONTRACT COMPLIANCE ==='));
  console.log(`  Contract: ${path.join(slugDir, 'contract.yaml')}`);

  if (result.seal === 'UNVERIFIABLE') {
    console.log(`  Seal: ${chalk.yellow('UNVERIFIABLE')} (no saved contract hash)`);
    return;
  }

  const sealColor = result.seal === 'INTACT' ? chalk.green : chalk.red;
  console.log(`  Seal: ${sealColor(result.seal)} (hash ${result.sealHash})`);
}

/**
 * Run pre-check for a work item
 *
 * @param slug - Work item slug
 */
export function runPreCheck(slug: string): void {
  // Read ana.json
  const verifyRoot = findProjectRoot();
  const anaJsonPath = path.join(verifyRoot, '.ana', 'ana.json');
  if (!fs.existsSync(anaJsonPath)) {
    console.error(chalk.red('Error: No .ana/ana.json found. Run `ana init` first.'));
    process.exit(1);
  }

  // Verify plan directory exists
  const planDir = path.join(verifyRoot, '.ana/plans/active', slug);
  if (!fs.existsSync(planDir)) {
    console.error(chalk.red(`Error: No active work found for '${slug}'.`));
    console.error(chalk.gray('Run `ana work status` to see active work items.'));
    process.exit(1);
  }

  // Check for contract
  const contractPath = path.join(planDir, 'contract.yaml');
  if (!fs.existsSync(contractPath)) {
    console.log(chalk.yellow('No contract found. Run the pipeline with AnaPlan to generate one.'));
    process.exit(0);
  }

  // Contract mode
  const result = runContractPreCheck(slug);
  printContractResults(result, planDir);
  console.log(); // Final newline
  process.exit(0);
}

/**
 * Register the `verify` command (with `pre-check` sub-command).
 *
 * @param program - Commander program instance
 */
export function registerVerifyCommand(program: Command): void {
  const verifyCommand = new Command('verify')
    .description('Check contract seal integrity');

  verifyCommand
    .command('pre-check')
    .description('Run contract seal verification')
    .argument('<slug>', 'Work item slug (e.g., add-status-command)')
    .action((slug: string) => {
      runPreCheck(slug);
    });

  program.addCommand(verifyCommand);
}
