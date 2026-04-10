/**
 * ana proof [slug] - Display proof chain entry for completed work
 *
 * With no arguments: displays a summary table of all proof history entries.
 * With a slug: displays a detailed terminal card for that specific entry.
 *
 * Reads .ana/proof_chain.json and displays:
 * - Summary table: slug, result, assertion ratio, date (no slug)
 * - Detail card: feature name, result, contract, assertions, timing, deviations (with slug)
 *
 * Read-only operation - creates no files, modifies nothing.
 *
 * Usage:
 *   ana proof               Display summary table of all proofs
 *   ana proof --json        Output full proof chain as JSON
 *   ana proof {slug}        Display proof detail for work item
 *   ana proof {slug} --json Output detail JSON format
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { ProofChainEntry } from '../types/proof.js';

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
 * Format JSON output for a single entry
 *
 * @param entry - Proof chain entry to output
 * @returns JSON string
 */
function formatJson(entry: ProofChainEntry): string {
  return JSON.stringify(entry, null, 2);
}

/**
 * Format human-readable summary table for list view
 *
 * @param entries - Proof chain entries to display
 * @returns Formatted table string
 */
function formatListTable(entries: ProofChainEntry[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold('  Proof History'));
  lines.push('');

  // Header row
  const slugCol = 'Slug'.padEnd(24);
  const resultCol = 'Result'.padEnd(9);
  const assertCol = 'Assertions'.padEnd(13);
  const dateCol = 'Date';
  lines.push(chalk.bold(`  ${slugCol}${resultCol}${assertCol}${dateCol}`));

  // Sort entries: most recent first, undefined completed_at pushed to end
  const sorted = [...entries].sort((a, b) => {
    if (!a.completed_at && !b.completed_at) return 0;
    if (!a.completed_at) return 1;
    if (!b.completed_at) return -1;
    return b.completed_at.localeCompare(a.completed_at);
  });

  for (const entry of sorted) {
    const slug = entry.slug.padEnd(24);
    const resultColor = entry.result === 'PASS' ? chalk.green : chalk.red;
    const resultPadded = entry.result.padEnd(9);
    const result = resultColor(resultPadded);
    const ratio = `${entry.contract.satisfied}/${entry.contract.total}`;
    const assertions = ratio.padEnd(13);
    const date = entry.completed_at ? entry.completed_at.split('T')[0] ?? '' : '';
    lines.push(`  ${slug}${result}${assertions}${date}`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Proof command definition
 */
export const proofCommand = new Command('proof')
  .description('Display proof chain entry for a completed work item')
  .argument('[slug]', 'Work item slug to display proof for')
  .option('--json', 'Output JSON format for programmatic consumption')
  .action(async (slug: string | undefined, options: { json?: boolean }) => {
    const proofChainPath = path.join(process.cwd(), '.ana', 'proof_chain.json');

    // List view: no slug provided
    if (!slug) {
      // Read chain if it exists
      let chain: ProofChain = { entries: [] };
      if (fs.existsSync(proofChainPath)) {
        try {
          const content = fs.readFileSync(proofChainPath, 'utf-8');
          chain = JSON.parse(content);
        } catch {
          // If file is corrupt, treat as empty
          chain = { entries: [] };
        }
      }

      const entries = chain.entries ?? [];

      if (options.json) {
        console.log(JSON.stringify(chain, null, 2));
      } else if (entries.length === 0) {
        console.log('No proofs yet.');
      } else {
        console.log(formatListTable(entries));
      }
      return;
    }

    // Detail view: slug provided (existing behavior)

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
