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
import { createHash } from 'node:crypto';
import { findProjectRoot } from '../utils/validators.js';
import { readArtifactBranch } from '../utils/git-operations.js';
import type { ContractSchema } from '../types/contract.js';

/**
 * Contract pre-check result (S8+)
 */
interface ContractPreCheckResult {
  seal: 'INTACT' | 'TAMPERED' | 'UNVERIFIABLE';
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
  outOfScope: Array<{ id: string; file: string }>;
}

// ContractAssertion, ContractSchema imported from types/contract.ts

/**
 * Parse raw `git diff -U0` output and extract added comment lines per file.
 *
 * Returns a map from file path (relative, as reported by git) to an array of
 * added comment lines (with the leading `+` stripped). Only lines whose trimmed
 * content starts with `//` or `#` are included — this eliminates false positives
 * from `@ana` tags inside string literals or code.
 *
 * @param diffOutput - Raw output from `git diff <merge-base>..HEAD -U0`
 * @returns Map of file path → added comment lines
 */
export function parseDiffAddedCommentLines(diffOutput: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  let currentFile: string | null = null;

  for (const line of diffOutput.split('\n')) {
    // File header: diff --git a/path b/path
    if (line.startsWith('diff --git ')) {
      const bPathMatch = line.match(/ b\/(.+)$/);
      if (bPathMatch) {
        currentFile = bPathMatch[1]!;
        if (!result.has(currentFile)) {
          result.set(currentFile, []);
        }
      }
      continue;
    }

    // Skip diff metadata headers
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) {
      continue;
    }

    // Skip non-addition lines
    if (!line.startsWith('+')) {
      continue;
    }

    // Strip the leading +
    const content = line.slice(1);
    const trimmed = content.trimStart();

    // Only keep comment lines
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      if (currentFile) {
        result.get(currentFile)!.push(content);
      }
    }
  }

  return result;
}

/**
 * Run contract-mode pre-check (S8+)
 * Checks seal integrity and tag coverage
 *
 * @param slug - Work item slug
 * @param projectRoot - Project root path (defaults to cwd)
 * @returns Structured pre-check result
 */
export function runContractPreCheck(slug: string, projectRoot: string = findProjectRoot()): ContractPreCheckResult {
  const slugDir = path.join(projectRoot, '.ana', 'plans', 'active', slug);
  const savesPath = path.join(slugDir, '.saves.json');
  const contractPath = path.join(slugDir, 'contract.yaml');

  // Check if contract exists
  if (!fs.existsSync(contractPath)) {
    return {
      seal: 'UNVERIFIABLE',
      assertions: [],
      summary: { total: 0, covered: 0, uncovered: 0 },
      outOfScope: [],
    };
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
    return {
      seal: 'UNVERIFIABLE',
      assertions: [],
      summary: { total: 0, covered: 0, uncovered: 0 },
      outOfScope: [],
    };
  }

  // Seal check: compare current contract hash against saved hash
  const currentContent = fs.readFileSync(contractPath, 'utf-8');
  const currentHash = `sha256:${createHash('sha256').update(currentContent).digest('hex')}`;
  const seal: 'INTACT' | 'TAMPERED' = currentHash === sealHash ? 'INTACT' : 'TAMPERED';

  // Parse current contract for assertions
  let contract: ContractSchema;
  try {
    contract = yaml.parse(fs.readFileSync(contractPath, 'utf-8'));
  } catch {
    return {
      seal,
      sealHash,
      assertions: [],
      summary: { total: 0, covered: 0, uncovered: 0 },
      outOfScope: [],
    };
  }

  if (!contract.assertions || !Array.isArray(contract.assertions)) {
    return {
      seal,
      sealHash,
      assertions: [],
      summary: { total: 0, covered: 0, uncovered: 0 },
      outOfScope: [],
    };
  }

  // Scope tag search to added comment lines in the diff from merge-base to HEAD.
  // Only lines added on the feature branch are searched, eliminating false COVEREDs
  // from stale @ana tags in prior features. Falls back to global search if merge-base
  // is unavailable.
  let scopedCommentLines: Map<string, string[]> | null = null;
  let testFiles: string[] = [];
  let scopedSearch = false;
  try {
    const artBranch = readArtifactBranch(projectRoot);
    const mergeBase = execSync(
      `git merge-base ${artBranch} HEAD`,
      { encoding: 'utf-8', cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    const diffOutput = execSync(
      `git diff ${mergeBase}..HEAD -U0`,
      { encoding: 'utf-8', cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    scopedCommentLines = parseDiffAddedCommentLines(diffOutput);
    // Derive testFiles from map keys for the global fallback's outsideScope filter
    testFiles = [...scopedCommentLines.keys()].map(f => path.join(projectRoot, f));
    scopedSearch = scopedCommentLines.size > 0;
  } catch {
    // git diff failed — fall through to global search
  }
  if (!scopedSearch) {
    const testPatterns = ['**/*.test.*', '**/*.spec.*', '**/test_*.*', '**/*_test.*'];
    testFiles = glob.sync(testPatterns, {
      cwd: projectRoot,
      ignore: ['**/node_modules/**', '**/.ana/**'],
      absolute: true,
    });
  }

  // Check tag coverage for each assertion
  const assertions: ContractPreCheckResult['assertions'] = [];

  for (const assertion of contract.assertions) {
    if (!assertion.id || !assertion.says) continue;

    const pattern = new RegExp(`@ana\\s+[\\w,\\s]*\\b${assertion.id}\\b`);
    let found = false;

    if (scopedCommentLines && scopedSearch) {
      // Search only added comment lines from the diff
      for (const lines of scopedCommentLines.values()) {
        for (const line of lines) {
          if (pattern.test(line)) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
    } else {
      // Global fallback: read full file content
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
    }

    assertions.push({
      id: assertion.id,
      says: assertion.says,
      status: found ? 'COVERED' : 'UNCOVERED',
    });
  }

  // If scoped search found UNCOVERED assertions, check if tags exist globally
  // (outside the feature branch diff). This catches the case where Build tagged
  // a test file it didn't modify — visible diagnostic, not silent failure.
  const outOfScope: Array<{ id: string; file: string }> = [];
  if (scopedSearch) {
    const uncoveredAssertions = assertions.filter(a => a.status === 'UNCOVERED');
    if (uncoveredAssertions.length > 0) {
      const globalTestPatterns = ['**/*.test.*', '**/*.spec.*', '**/test_*.*', '**/*_test.*'];
      const allTestFiles = glob.sync(globalTestPatterns, {
        cwd: projectRoot,
        ignore: ['**/node_modules/**', '**/.ana/**'],
        absolute: true,
      });
      const outsideScope = allTestFiles.filter(f => !testFiles.includes(f));
      for (const assertion of uncoveredAssertions) {
        const pattern = new RegExp(`@ana\\s+[\\w,\\s]*\\b${assertion.id}\\b`);
        for (const testFile of outsideScope) {
          try {
            const content = fs.readFileSync(testFile, 'utf-8');
            if (pattern.test(content)) {
              outOfScope.push({ id: assertion.id, file: path.relative(projectRoot, testFile) });
              break;
            }
          } catch { /* skip */ }
        }
      }
    }
  }

  const covered = assertions.filter(a => a.status === 'COVERED').length;
  const uncovered = assertions.filter(a => a.status === 'UNCOVERED').length;

  return {
    seal,
    sealHash,
    assertions,
    summary: {
      total: assertions.length,
      covered,
      uncovered,
    },
    outOfScope,
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
    console.log(`  Seal: ${chalk.yellow('UNVERIFIABLE')} (no saved contract hash)`);
    return;
  }

  const sealColor = result.seal === 'INTACT' ? chalk.green : chalk.red;
  console.log(`  Seal: ${sealColor(result.seal)} (hash ${result.sealHash})`);
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

  if (result.outOfScope.length > 0) {
    console.log();
    for (const oos of result.outOfScope) {
      console.log(chalk.yellow(`  ⚠ ${oos.id} tag found in ${oos.file} (outside feature branch changes)`));
    }
  }
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
