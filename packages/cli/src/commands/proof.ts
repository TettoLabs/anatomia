/**
 * ana proof {slug} - Display proof chain entry for completed work
 *
 * Reads .ana/proof_chain.json and displays a terminal card showing:
 * - Feature name and completion date
 * - Verification result (PASS/FAIL)
 * - Contract compliance summary (satisfied/unsatisfied/deviated)
 * - Assertions with status icons
 * - Timing breakdown
 * - Deviations (if any)
 *
 * Read-only operation - creates no files, modifies nothing.
 *
 * Usage:
 *   ana proof {slug}         Display proof for work item
 *   ana proof {slug} --json  Output JSON format
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * Proof chain entry structure (matches work.ts ProofChainEntry)
 */
interface ProofChainEntry {
  slug: string;
  feature: string;
  result: string;
  author: { name: string; email: string };
  contract: {
    total: number;
    covered: number;
    uncovered: number;
    satisfied: number;
    unsatisfied: number;
    deviated: number;
  };
  assertions: Array<{
    id: string;
    says: string;
    status: string;
    deviation?: string;
  }>;
  acceptance_criteria: { total: number; met: number };
  timing: {
    total_minutes: number;
    think?: number;
    plan?: number;
    build?: number;
    verify?: number;
  };
  hashes: Record<string, string>;
  seal_commit: string | null;
  completed_at: string;
}

/**
 * Proof chain JSON structure
 */
interface ProofChain {
  entries: ProofChainEntry[];
}

/**
 * Box-drawing characters for terminal output
 * Compatible across iTerm, Terminal.app, VS Code terminal, Windows Terminal
 */
const BOX = {
  horizontal: '\u2500', // ─
  vertical: '\u2502', // │
  topLeft: '\u250C', // ┌
  topRight: '\u2510', // ┐
  bottomLeft: '\u2514', // └
  bottomRight: '\u2518', // ┘
};

/**
 * Get status icon for assertion status
 *
 * @param status - Assertion status (SATISFIED, UNSATISFIED, DEVIATED, UNCOVERED)
 * @returns Colored icon character
 */
function getStatusIcon(status: string): string {
  switch (status.toUpperCase()) {
    case 'SATISFIED':
      return chalk.green('✓');
    case 'UNSATISFIED':
      return chalk.red('✗');
    case 'DEVIATED':
      return chalk.yellow('⚠');
    case 'UNCOVERED':
      return chalk.gray('?');
    default:
      return chalk.gray('·');
  }
}

/**
 * Format human-readable terminal output
 *
 * @param entry - Proof chain entry to display
 * @returns Formatted terminal output string
 */
function formatHumanReadable(entry: ProofChainEntry): string {
  const lines: string[] = [];

  // Parse completed_at for timestamp
  const completedDate = new Date(entry.completed_at);
  const dateStr = completedDate.toISOString().split('T')[0];
  const timeStr = completedDate.toTimeString().slice(0, 5);
  const timestamp = `${dateStr} ${timeStr}`;

  // Box width (fits in 80 columns)
  const boxWidth = 71;
  const innerWidth = boxWidth - 2;

  // Header box
  const titleLine = `  ana proof`;
  const featureLine = `  ${entry.feature}`;
  const padding = innerWidth - featureLine.length - timestamp.length;
  const featureWithTimestamp = `${featureLine}${' '.repeat(Math.max(1, padding))}${timestamp}`;

  lines.push(chalk.cyan(BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight));
  lines.push(chalk.cyan(BOX.vertical) + chalk.bold(titleLine.padEnd(innerWidth)) + chalk.cyan(BOX.vertical));
  lines.push(chalk.cyan(BOX.vertical) + featureWithTimestamp.padEnd(innerWidth) + chalk.cyan(BOX.vertical));
  lines.push(chalk.cyan(BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight));

  lines.push('');

  // Result
  const resultColor = entry.result === 'PASS' ? chalk.green : chalk.red;
  lines.push(`  Result: ${resultColor(entry.result)}`);

  lines.push('');

  // Contract section
  lines.push(chalk.bold('  Contract'));
  lines.push(chalk.gray('  ' + BOX.horizontal.repeat(8)));
  lines.push(`  ${entry.contract.satisfied}/${entry.contract.total} satisfied · ${entry.contract.unsatisfied} unsatisfied · ${entry.contract.deviated} deviated`);

  lines.push('');

  // Assertions section
  lines.push(chalk.bold('  Assertions'));
  lines.push(chalk.gray('  ' + BOX.horizontal.repeat(10)));

  for (const assertion of entry.assertions) {
    const icon = getStatusIcon(assertion.status);
    lines.push(`  ${icon} ${assertion.says}`);
  }

  lines.push('');

  // Timing section
  lines.push(chalk.bold('  Timing'));
  lines.push(chalk.gray('  ' + BOX.horizontal.repeat(6)));
  lines.push(`  ${'Total'.padEnd(12)} ${entry.timing.total_minutes} min`);

  // Only show phase breakdown if available
  if (entry.timing.think != null) {
    lines.push(`  ${'Think'.padEnd(12)} ${entry.timing.think} min`);
  }
  if (entry.timing.plan != null) {
    lines.push(`  ${'Plan'.padEnd(12)} ${entry.timing.plan} min`);
  }
  if (entry.timing.build != null) {
    lines.push(`  ${'Build'.padEnd(12)} ${entry.timing.build} min`);
  }
  if (entry.timing.verify != null) {
    lines.push(`  ${'Verify'.padEnd(12)} ${entry.timing.verify} min`);
  }

  // Deviations section (only if there are deviations)
  const deviatedAssertions = entry.assertions.filter(a => a.status === 'DEVIATED' && a.deviation);
  if (deviatedAssertions.length > 0) {
    lines.push('');
    lines.push(chalk.bold('  Deviations'));
    lines.push(chalk.gray('  ' + BOX.horizontal.repeat(10)));

    for (const assertion of deviatedAssertions) {
      lines.push(`  ${assertion.id}: ${assertion.says}`);
      lines.push(`        → ${assertion.deviation}`);
    }
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Format JSON output
 *
 * @param entry - Proof chain entry to output
 * @returns JSON string
 */
function formatJson(entry: ProofChainEntry): string {
  return JSON.stringify(entry, null, 2);
}

/**
 * Proof command definition
 */
export const proofCommand = new Command('proof')
  .description('Display proof chain entry for a completed work item')
  .argument('<slug>', 'Work item slug to display proof for')
  .option('--json', 'Output JSON format for programmatic consumption')
  .action(async (slug: string, options: { json?: boolean }) => {
    const proofChainPath = path.join(process.cwd(), '.ana', 'proof_chain.json');

    // Check if proof_chain.json exists
    if (!fs.existsSync(proofChainPath)) {
      console.error(chalk.red('Error: No proof chain found at .ana/proof_chain.json'));
      console.error('');
      console.error('Complete work items with `ana work complete {slug}` to generate proof entries.');
      process.exit(1);
    }

    // Read and parse proof chain
    let chain: ProofChain;
    try {
      const content = fs.readFileSync(proofChainPath, 'utf-8');
      chain = JSON.parse(content);
    } catch (error) {
      console.error(chalk.red('Error: Failed to parse proof_chain.json'));
      if (error instanceof Error) {
        console.error(chalk.gray(error.message));
      }
      process.exit(1);
    }

    // Find entry by slug
    const entry = chain.entries?.find(e => e.slug === slug);
    if (!entry) {
      console.error(chalk.red(`Error: No proof found for slug "${slug}"`));
      console.error('');
      console.error('Run `ana work status` to see completed work items.');
      process.exit(1);
    }

    // Format and output
    if (options.json) {
      console.log(formatJson(entry));
    } else {
      console.log(formatHumanReadable(entry));
    }
  });
