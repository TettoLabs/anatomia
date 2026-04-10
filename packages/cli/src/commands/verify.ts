/**
 * ana verify pre-check - Mechanical verification checks before AnaVerify review
 *
 * Usage:
 *   ana verify pre-check <slug>
 *
 * Contract Mode (S8+):
 * 1. Seal check - verify contract hasn't been modified since plan commit
 * 2. Tag coverage - grep test files for @ana tags matching contract assertions
 *
 * Exit codes:
 *   0 - Always (informational tool, never blocks)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import { glob } from 'glob';

/**
 * Contract pre-check result (S8+)
 */
interface ContractPreCheckResult {
  seal: 'INTACT' | 'TAMPERED' | 'UNVERIFIABLE';
  sealCommit?: string | undefined;
  sealHash?: string | undefined;
  assertions: Array<{
    id: string;
    says: string;
    status: 'COVERED' | 'UNCOVERED';
  }>;
  summary: {
    total: number;
    covered: number;
    uncovered: number;
  };
}

/**
 * Contract assertion from YAML
 */
interface ContractAssertion {
  id: string;
  says: string;
  block?: string;
  target?: string;
  matcher?: string;
  value?: unknown;
}

/**
 * Contract schema
 */
interface ContractSchema {
  version?: string;
  sealed_by?: string;
  feature?: string;
  assertions?: ContractAssertion[];
  file_changes?: Array<{ path: string; action: string }>;
}

/**
 * Run contract-mode pre-check (S8+)
 * Checks seal integrity and tag coverage
 *
 * @param slug - Work item slug
 * @param projectRoot - Project root path (defaults to cwd)
 * @returns Structured pre-check result
 */
export function runContractPreCheck(slug: string, projectRoot: string = process.cwd()): ContractPreCheckResult {
  const slugDir = path.join(projectRoot, '.ana', 'plans', 'active', slug);
  const savesPath = path.join(slugDir, '.saves.json');
  const contractPath = path.join(slugDir, 'contract.yaml');

  // Check if contract exists
  if (!fs.existsSync(contractPath)) {
    return {
      seal: 'UNVERIFIABLE',
      assertions: [],
      summary: { total: 0, covered: 0, uncovered: 0 },
    };
  }

  // Read .saves.json for contract commit
  let sealCommit: string | undefined;
  let sealHash: string | undefined;

  if (fs.existsSync(savesPath)) {
    try {
      const saves: Record<string, { commit?: string; hash?: string }> = JSON.parse(fs.readFileSync(savesPath, 'utf-8'));
      if (saves['contract']) {
        sealCommit = saves['contract'].commit;
        sealHash = saves['contract'].hash;
      }
    } catch {
      // Ignore parse errors
    }
  }

  if (!sealCommit) {
    return {
      seal: 'UNVERIFIABLE',
      assertions: [],
      summary: { total: 0, covered: 0, uncovered: 0 },
    };
  }

  // Seal check: compare contract at plan commit vs current
  let seal: 'INTACT' | 'TAMPERED' = 'INTACT';
  try {
    const relativePath = path.relative(projectRoot, contractPath);
    const sealedContent = execSync(
      `git show ${sealCommit}:${relativePath}`,
      { encoding: 'utf-8', cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    const currentContent = fs.readFileSync(contractPath, 'utf-8').trim();

    if (sealedContent !== currentContent) {
      seal = 'TAMPERED';
    }
  } catch {
    // If git show fails, contract was modified or commit doesn't exist
    seal = 'TAMPERED';
  }

  // Parse current contract for assertions
  let contract: ContractSchema;
  try {
    contract = yaml.parse(fs.readFileSync(contractPath, 'utf-8'));
  } catch {
    return {
      seal,
      sealCommit,
      sealHash,
      assertions: [],
      summary: { total: 0, covered: 0, uncovered: 0 },
    };
  }

  if (!contract.assertions || !Array.isArray(contract.assertions)) {
    return {
      seal,
      sealCommit,
      sealHash,
      assertions: [],
      summary: { total: 0, covered: 0, uncovered: 0 },
    };
  }

  // Find test files
  const testPatterns = ['**/*.test.*', '**/*.spec.*', '**/test_*.*', '**/*_test.*'];
  const testFiles = glob.sync(testPatterns, {
    cwd: projectRoot,
    ignore: ['**/node_modules/**', '**/.ana/**'],
    absolute: true,
  });

  // Check tag coverage for each assertion
  const assertions: ContractPreCheckResult['assertions'] = [];

  for (const assertion of contract.assertions) {
    if (!assertion.id || !assertion.says) continue;

    const pattern = new RegExp(`@ana\\s+[\\w,\\s]*\\b${assertion.id}\\b`);
    let found = false;

    for (const testFile of testFiles) {
      try {
        const content = fs.readFileSync(testFile, 'utf-8');
        if (pattern.test(content)) {
          found = true;
          break;
        }
      } catch {
        // Skip unreadable files
      }
    }

    assertions.push({
      id: assertion.id,
      says: assertion.says,
      status: found ? 'COVERED' : 'UNCOVERED',
    });
  }

  const covered = assertions.filter(a => a.status === 'COVERED').length;
  const uncovered = assertions.filter(a => a.status === 'UNCOVERED').length;

  return {
    seal,
    sealCommit,
    sealHash,
    assertions,
    summary: {
      total: assertions.length,
      covered,
      uncovered,
    },
  };
}

/**
 * Print contract pre-check results
 *
 * @param result - Contract pre-check result
 * @param slugDir - Slug directory path
 */
function printContractResults(result: ContractPreCheckResult, slugDir: string): void {
  console.log(chalk.bold('\n=== CONTRACT COMPLIANCE ==='));
  console.log(`  Contract: ${path.join(slugDir, 'contract.yaml')}`);

  if (result.seal === 'UNVERIFIABLE') {
    console.log(`  Seal: ${chalk.yellow('UNVERIFIABLE')} (no saved contract commit)`);
    return;
  }

  const sealColor = result.seal === 'INTACT' ? chalk.green : chalk.red;
  console.log(`  Seal: ${sealColor(result.seal)} (commit ${result.sealCommit?.substring(0, 7)}, hash ${result.sealHash?.substring(0, 20)}...)`);
  console.log();

  if (result.assertions.length === 0) {
    console.log(chalk.gray('  No assertions found in contract.'));
    return;
  }

  for (const assertion of result.assertions) {
    const statusIcon = assertion.status === 'COVERED' ? chalk.green('✓') : chalk.red('✗');
    const statusText = assertion.status === 'COVERED' ? 'COVERED' : 'UNCOVERED';
    console.log(`  ${assertion.id}  ${statusIcon} ${statusText}  "${assertion.says}"`);
  }

  console.log();
  console.log(`  ${result.summary.total} total · ${result.summary.covered} covered · ${result.summary.uncovered} uncovered`);
}

/**
 * Run pre-check for a work item
 *
 * @param slug - Work item slug
 */
export function runPreCheck(slug: string): void {
  // Read ana.json
  const anaJsonPath = path.join(process.cwd(), '.ana', 'ana.json');
  if (!fs.existsSync(anaJsonPath)) {
    console.error(chalk.red('Error: No .ana/ana.json found. Run `ana init` first.'));
    process.exit(1);
  }

  // Verify plan directory exists
  const planDir = path.join(process.cwd(), '.ana/plans/active', slug);
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
    .description('Verification tools');

  verifyCommand
    .command('pre-check')
    .description('Run contract compliance check (seal integrity, tag coverage)')
    .argument('<slug>', 'Work item slug (e.g., add-status-command)')
    .action((slug: string) => {
      runPreCheck(slug);
    });

  program.addCommand(verifyCommand);
}
