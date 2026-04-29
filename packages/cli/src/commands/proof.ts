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
import { execSync, spawnSync } from 'node:child_process';
import type { ProofChainEntry, ProofChain } from '../types/proof.js';
import { findProjectRoot } from '../utils/validators.js';
import { getProofContext, wrapJsonResponse, wrapJsonError, generateDashboard, computeChainHealth } from '../utils/proofSummary.js';
import type { ProofContextResult } from '../utils/proofSummary.js';
import { readArtifactBranch, getCurrentBranch } from '../utils/git-operations.js';

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
 * Register the `proof` command.
 *
 * @param program - Commander program instance.
 */
export function registerProofCommand(program: Command): void {
  const proofCommand = new Command('proof')
    .description('Display proof chain entry for a completed work item')
    .argument('[slug]', 'Work item slug to display proof for')
    .option('--json', 'Output JSON format for programmatic consumption')
    .action(async (slug: string | undefined, options: { json?: boolean }) => {
    const proofRoot = findProjectRoot();
    const proofChainPath = path.join(proofRoot, '.ana', 'proof_chain.json');

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
        console.log(JSON.stringify(wrapJsonResponse('proof', { entries }, chain), null, 2));
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
      console.log(JSON.stringify(wrapJsonResponse(`proof ${slug}`, entry, chain), null, 2));
    } else {
      console.log(formatHumanReadable(entry));
    }
  });

  // Register context subcommand
  // Commander subcommands share parent options when parent has same flag.
  // Parent proof command defines --json, so context reads it from parent.
  const contextCommand = new Command('context')
    .description('Query proof chain for context about specific files')
    .argument('<files...>', 'File paths to query')
    .option('--json', 'Output JSON format')
    .action(async (files: string[], options: { json?: boolean }) => {
      const proofRoot = findProjectRoot();
      const proofChainPath = path.join(proofRoot, '.ana', 'proof_chain.json');

      // Check if proof chain exists
      if (!fs.existsSync(proofChainPath)) {
        console.log('No proof chain found. Complete pipeline cycles to build proof context.');
        return;
      }

      const results = getProofContext(files, proofRoot);

      // Check both own --json and parent's --json
      const parentOpts = proofCommand.opts();
      const useJson = options.json || parentOpts['json'];

      if (useJson) {
        const chainContent = fs.readFileSync(proofChainPath, 'utf-8');
        const chain: ProofChain = JSON.parse(chainContent);
        console.log(JSON.stringify(wrapJsonResponse('proof context', { results }, chain), null, 2));
        return;
      }

      // Human-readable output
      const outputs: string[] = [];
      for (const result of results) {
        outputs.push(formatContextResult(result));
      }

      console.log(outputs.join('\n───\n\n'));
    });

  proofCommand.addCommand(contextCommand);

  // Register close subcommand
  const closeCommand = new Command('close')
    .description('Close an active finding with a reason')
    .argument('<id>', 'Finding ID to close (e.g., F003)')
    .option('--reason <reason>', 'Why this finding no longer applies')
    .option('--json', 'Output JSON format')
    .action(async (id: string, options: { reason?: string; json?: boolean }) => {
      const proofRoot = findProjectRoot();
      const proofChainPath = path.join(proofRoot, '.ana', 'proof_chain.json');
      const parentOpts = proofCommand.opts();
      const useJson = options.json || parentOpts['json'];

      // Helper: output error and exit
      const exitError = (code: string, message: string, context: Record<string, unknown> = {}): void => {
        let chain: ProofChain | null = null;
        try {
          if (fs.existsSync(proofChainPath)) {
            chain = JSON.parse(fs.readFileSync(proofChainPath, 'utf-8'));
          }
        } catch { /* use null */ }

        if (useJson) {
          console.log(JSON.stringify(wrapJsonError('proof close', code, message, context, chain), null, 2));
        } else {
          console.error(chalk.red(`Error: ${message}`));
          // Print contextual help for specific error codes
          if (code === 'REASON_REQUIRED') {
            console.error('  Proof closures must explain why the finding no longer applies.');
            console.error('  Usage: ana proof close {id} --reason "explanation"');
          } else if (code === 'FINDING_NOT_FOUND') {
            console.error('  Run `ana proof audit` to see active findings.');
          } else if (code === 'ALREADY_CLOSED' && context['closed_by']) {
            console.error(`  Closed by: ${context['closed_by']} on ${context['closed_at'] ?? 'unknown'}`);
            if (context['closed_reason']) {
              console.error(`  Reason: ${context['closed_reason']}`);
            }
          } else if (code === 'WRONG_BRANCH') {
            const artifactBranch = readArtifactBranch(proofRoot);
            console.error(`  Run: git checkout ${artifactBranch}`);
          }
        }
        process.exit(1);
      };

      // Validate --reason is provided
      if (!options.reason) {
        exitError('REASON_REQUIRED', '--reason is required.');
        return;
      }

      // Branch check: must be on artifact branch
      const artifactBranch = readArtifactBranch(proofRoot);
      const currentBranch = getCurrentBranch();
      if (currentBranch !== artifactBranch) {
        exitError('WRONG_BRANCH', `Wrong branch. Switch to \`${artifactBranch}\` to close findings.`);
        return;
      }

      // Pull before reading chain
      try {
        const remotes = execSync('git remote', { stdio: 'pipe', encoding: 'utf-8', cwd: proofRoot }).trim();
        if (remotes) {
          execSync('git pull --rebase', { stdio: 'pipe', encoding: 'utf-8', cwd: proofRoot });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '';
        if (errorMessage.includes('conflict') || errorMessage.includes('Cannot rebase')) {
          console.error(chalk.red('Error: Pull failed due to conflicts. Resolve conflicts and try again.'));
          process.exit(1);
        }
        // Non-conflict failures: warn and continue
        console.error(chalk.yellow('⚠ Warning: Pull failed (network error). Continuing with local data.'));
      }

      // Read chain
      if (!fs.existsSync(proofChainPath)) {
        exitError('NO_PROOF_CHAIN', 'No proof chain found.');
        return;
      }

      let chain: ProofChain;
      try {
        chain = JSON.parse(fs.readFileSync(proofChainPath, 'utf-8'));
      } catch {
        exitError('PARSE_ERROR', 'Failed to parse proof_chain.json.');
        return;
      }

      // Find the finding across all entries
      let foundFinding: ProofChainEntry['findings'][0] | null = null;
      let foundEntry: ProofChainEntry | null = null;

      for (const entry of chain.entries) {
        for (const finding of entry.findings || []) {
          if (finding.id === id) {
            foundFinding = finding;
            foundEntry = entry;
            break;
          }
        }
        if (foundFinding) break;
      }

      if (!foundFinding || !foundEntry) {
        exitError('FINDING_NOT_FOUND', `Finding "${id}" not found.`);
        return;
      }

      // Check if already closed
      if (foundFinding.status === 'closed') {
        exitError('ALREADY_CLOSED', `Finding "${id}" is already closed.`, {
          closed_by: foundFinding.closed_by ?? 'unknown',
          closed_at: foundFinding.closed_at ?? 'unknown',
          closed_reason: foundFinding.closed_reason ?? '',
        });
        return;
      }

      // Record previous status for output
      const previousStatus = foundFinding.status ?? 'active';

      // Mutate the finding
      foundFinding.status = 'closed';
      foundFinding.closed_reason = options.reason;
      foundFinding.closed_at = new Date().toISOString();
      foundFinding.closed_by = 'human';

      // Write updated chain
      fs.writeFileSync(proofChainPath, JSON.stringify(chain, null, 2));

      // Regenerate PROOF_CHAIN.md
      const health = computeChainHealth(chain);
      const dashboardMd = generateDashboard(chain.entries, {
        runs: health.chain_runs,
        active: health.findings.active,
        lessons: health.findings.lesson,
        promoted: health.findings.promoted,
        closed: health.findings.closed,
      });
      const chainMdPath = path.join(proofRoot, '.ana', 'PROOF_CHAIN.md');
      fs.writeFileSync(chainMdPath, dashboardMd);

      // Git: stage, commit, push
      try {
        execSync('git add .ana/proof_chain.json .ana/PROOF_CHAIN.md', { stdio: 'pipe', cwd: proofRoot });
        const commitMessage = `[proof] Close ${id}: ${options.reason}`;
        const commitResult = spawnSync('git', ['commit', '-m', commitMessage], { stdio: 'pipe', cwd: proofRoot });
        if (commitResult.status !== 0) throw new Error(commitResult.stderr?.toString() || 'Commit failed');
      } catch {
        console.error(chalk.red('Error: Failed to commit. Changes saved to proof_chain.json but not committed.'));
        process.exit(1);
      }

      try {
        execSync('git push', { stdio: 'pipe', cwd: proofRoot });
      } catch {
        console.error(chalk.yellow('Warning: Push failed. Changes committed locally. Run `git push` manually.'));
      }

      // Output
      if (useJson) {
        console.log(JSON.stringify(wrapJsonResponse('proof close', {
          finding: {
            id: foundFinding.id,
            category: foundFinding.category,
            summary: foundFinding.summary,
            file: foundFinding.file,
            severity: foundFinding.severity ?? null,
            entry_slug: foundEntry.slug,
            entry_feature: foundEntry.feature,
          },
          previous_status: previousStatus,
          new_status: 'closed',
          reason: options.reason,
          closed_by: 'human',
        }, chain), null, 2));
      } else {
        console.log(`✓ Closed ${id}: ${options.reason}`);
        console.log(`  ${chalk.dim(`[${foundFinding.category}]`)} ${foundFinding.summary} — ${foundFinding.file ?? 'no file'}`);
        console.log(`  ${previousStatus} → closed (by: human)`);
        console.log('');
        console.log(chalk.gray(`Chain: ${health.chain_runs} ${health.chain_runs !== 1 ? 'runs' : 'run'} · ${health.findings.active} active finding${health.findings.active !== 1 ? 's' : ''}`));
      }
    });

  proofCommand.addCommand(closeCommand);

  // Register audit subcommand
  const auditCommand = new Command('audit')
    .description('List active findings grouped by file')
    .option('--json', 'Output JSON format')
    .action(async (options: { json?: boolean }) => {
      const proofRoot = findProjectRoot();
      const proofChainPath = path.join(proofRoot, '.ana', 'proof_chain.json');
      const parentOpts = proofCommand.opts();
      const useJson = options.json || parentOpts['json'];

      // Read chain (no branch check — audit is read-only)
      if (!fs.existsSync(proofChainPath)) {
        if (useJson) {
          console.log(JSON.stringify(wrapJsonResponse('proof audit', { total_active: 0, by_file: [] }, { entries: [] }), null, 2));
        } else {
          console.log('No proof chain found. Complete pipeline cycles to build proof data.');
        }
        return;
      }

      let chain: ProofChain;
      try {
        chain = JSON.parse(fs.readFileSync(proofChainPath, 'utf-8'));
      } catch {
        console.error(chalk.red('Error: Failed to parse proof_chain.json'));
        process.exit(1);
        return;
      }

      // Collect all active findings with entry context
      const activeFindings: Array<{
        id: string;
        category: string;
        summary: string;
        file: string | null;
        anchor: string | null;
        anchor_present: boolean;
        line?: number;
        age_days: number;
        severity: string;
        related_assertions?: string[];
        entry_slug: string;
        entry_feature: string;
      }> = [];

      for (const entry of chain.entries) {
        for (const finding of entry.findings || []) {
          if (finding.status && finding.status !== 'active') continue;

          // Compute age from entry's completed_at
          const completedAt = entry.completed_at ? new Date(entry.completed_at) : new Date();
          const ageDays = Math.floor((Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24));

          // Check anchor_present by reading the file
          let anchorPresent = false;
          if (finding.file && finding.anchor) {
            try {
              const filePath = path.join(proofRoot, finding.file);
              if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                // Strip line reference from anchor (e.g., "census.ts:267-274" → "census")
                const anchorText = finding.anchor.replace(/\.\w+:\d+(-\d+)?$/, '').replace(/:\d+(-\d+)?$/, '');
                anchorPresent = content.includes(anchorText);
              }
            } catch { /* file read failed — anchor not present */ }
          }

          const auditFinding: typeof activeFindings[0] = {
            id: finding.id,
            category: finding.category,
            summary: finding.summary,
            file: finding.file,
            anchor: finding.anchor,
            anchor_present: anchorPresent,
            age_days: ageDays,
            severity: finding.severity ?? '—',
            entry_slug: entry.slug,
            entry_feature: entry.feature,
          };
          if (finding.line !== undefined) auditFinding.line = finding.line;
          if (finding.related_assertions !== undefined) auditFinding.related_assertions = finding.related_assertions;
          activeFindings.push(auditFinding);
        }
      }

      // Zero findings
      if (activeFindings.length === 0) {
        if (useJson) {
          console.log(JSON.stringify(wrapJsonResponse('proof audit', { total_active: 0, by_file: [] }, chain), null, 2));
        } else {
          console.log('Proof chain is clean — no active findings.');
        }
        return;
      }

      // Group by file
      const fileGroups = new Map<string, typeof activeFindings>();
      for (const finding of activeFindings) {
        const key = finding.file ?? 'General';
        const existing = fileGroups.get(key) || [];
        existing.push(finding);
        fileGroups.set(key, existing);
      }

      // Sort files by count descending, cap at 8
      const MAX_FILES = 8;
      const MAX_PER_FILE = 3;
      const sortedFiles = Array.from(fileGroups.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, MAX_FILES);

      if (useJson) {
        const byFile = sortedFiles.map(([file, findings]) => ({
          file,
          count: findings.length,
          findings: findings.slice(0, MAX_PER_FILE),
          overflow: Math.max(0, findings.length - MAX_PER_FILE),
        }));
        const totalFiles = fileGroups.size;
        const overflowFiles = Math.max(0, totalFiles - MAX_FILES);
        const result = {
          total_active: activeFindings.length,
          by_file: byFile,
          overflow_files: overflowFiles,
        };
        console.log(JSON.stringify(wrapJsonResponse('proof audit', result, chain), null, 2));
      } else {
        // Human-readable output
        const totalFiles = fileGroups.size;
        console.log(`\nProof Audit: ${activeFindings.length} active finding${activeFindings.length !== 1 ? 's' : ''} across ${totalFiles} file${totalFiles !== 1 ? 's' : ''}`);
        console.log('');

        for (const [file, findings] of sortedFiles) {
          console.log(`  ${file} (${findings.length} finding${findings.length !== 1 ? 's' : ''})`);
          const displayed = findings.slice(0, MAX_PER_FILE);
          for (const f of displayed) {
            console.log(`    ${chalk.dim(`[${f.category}]`)} ${f.summary}`);
            const anchorIcon = f.anchor ? (f.anchor_present ? '✓' : '✗') : '—';
            console.log(`           age: ${f.age_days}d | anchor: ${anchorIcon} | severity: ${f.severity}`);
            console.log(`           from: ${f.entry_feature}`);
          }
          if (findings.length > MAX_PER_FILE) {
            console.log(`    ... and ${findings.length - MAX_PER_FILE} more`);
          }
          console.log('');
        }

        // Overflow files
        const overflowFiles = fileGroups.size - sortedFiles.length;
        if (overflowFiles > 0) {
          const overflowFindings = activeFindings.length - sortedFiles.reduce((sum, [, f]) => sum + f.length, 0);
          console.log(`  ... and ${overflowFiles} more file${overflowFiles !== 1 ? 's' : ''} (${overflowFindings} findings)`);
        }
      }
    });

  proofCommand.addCommand(auditCommand);

  program.addCommand(proofCommand);
}

/**
 * Format a single proof context result for human-readable terminal output.
 *
 * @param result - Proof context result to format
 * @returns Formatted string
 */
function formatContextResult(result: ProofContextResult): string {
  const hasData = result.findings.length > 0 || result.build_concerns.length > 0;

  if (!hasData) {
    return `No proof context found for ${result.query}`;
  }

  const lines: string[] = [];

  // Header
  lines.push(`Proof context for ${result.query}`);
  if (result.touch_count > 0 && result.last_touched) {
    const lastDate = result.last_touched.split('T')[0] ?? result.last_touched;
    lines.push(`Touched in ${result.touch_count} pipeline cycle${result.touch_count === 1 ? '' : 's'} (last: ${lastDate})`);
  }
  lines.push('');

  // Findings
  if (result.findings.length > 0) {
    lines.push('Findings:');
    for (const finding of result.findings) {
      const anchor = finding.anchor ? ` ${finding.anchor} —` : '';
      let truncatedSummary = finding.summary;
      if (truncatedSummary.length > 250) {
        const lastSpace = truncatedSummary.lastIndexOf(' ', 250);
        const cutPoint = lastSpace > 0 ? lastSpace : 250;
        truncatedSummary = truncatedSummary.substring(0, cutPoint) + '...';
      }
      lines.push(`  ${chalk.dim(`[${finding.category}]`)}${anchor} ${truncatedSummary}`);
      lines.push(`         ${chalk.gray(`From: ${finding.from}`)}`);
      lines.push('');
    }
  }

  // Build concerns
  if (result.build_concerns.length > 0) {
    lines.push('Build concerns:');
    for (const concern of result.build_concerns) {
      lines.push(`  ${concern.summary}`);
      lines.push(`         ${chalk.gray(`From: ${concern.from}`)}`);
      lines.push('');
    }
  } else if (result.findings.length > 0) {
    lines.push('No build concerns for this file.');
    lines.push('');
  }

  return lines.join('\n');
}
