/**
 * ana pr create - Create GitHub PR from pipeline artifacts
 *
 * Usage:
 *   ana pr create {slug}
 *
 * Exit codes:
 *   0 - Success (PR created)
 *   1 - Error (missing files, verification not PASS, gh not available)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { readArtifactBranch, getCurrentBranch } from './artifact.js';

/**
 * Extract PR Summary section from build report
 *
 * @param content - Build report content
 * @returns PR Summary bullets or fallback text
 */
function extractPrSummary(content: string): string {
  const match = content.match(/## PR Summary\s*\n([\s\S]*?)(?=\n## |$)/);
  if (match && match[1].trim()) {
    return match[1].trim();
  }
  return 'See build report for details.';
}

/**
 * Extract Result line from verify report
 *
 * @param content - Verify report content
 * @returns Result (PASS/FAIL) or null
 */
function extractVerifyResult(content: string): string | null {
  const match = content.match(/\*\*Result:\*\*\s*(PASS|FAIL)/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Extract test count info from verify report
 *
 * @param content - Verify report content
 * @returns Test count line or fallback
 */
function extractTestInfo(content: string): string {
  const match = content.match(/Tests:\s*(\d+\s+passed[^\\n]*)/i);
  return match ? match[1] : 'See verify report';
}

/**
 * Count phases from plan.md
 *
 * @param content - Plan.md content
 * @returns Number of phases
 */
function countPhases(content: string): number {
  const matches = content.match(/Spec:/g);
  return matches ? matches.length : 1;
}

/**
 * Extract title from scope.md
 *
 * @param content - Scope.md content
 * @returns Title string
 */
function extractTitle(content: string): string {
  // Try first # heading
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim().replace(/^Scope:\s*/i, '');
  }

  // Try ## Intent section first line
  const intentMatch = content.match(/## Intent\s*\n(.+)/);
  if (intentMatch) {
    return intentMatch[1].trim();
  }

  return 'See scope for details';
}

/**
 * Create a GitHub PR from pipeline artifacts
 *
 * @param slug - Work item slug
 */
export function createPr(slug: string): void {
  const projectRoot = process.cwd();

  // 1. Read artifactBranch from .meta.json
  const artifactBranch = readArtifactBranch();

  // 2. Get current branch and derive slug if needed
  const currentBranch = getCurrentBranch();
  if (!currentBranch) {
    console.error(chalk.red('Error: Not a git repository.'));
    process.exit(1);
  }

  // Warn if not on a feature branch (but don't block)
  if (!currentBranch.startsWith('feature/')) {
    console.log(chalk.yellow(`Warning: Current branch is '${currentBranch}' (expected 'feature/{slug}').`));
  }

  // 3. Check gh CLI availability
  const ghCheck = spawnSync('gh', ['--version'], { stdio: 'pipe' });
  if (ghCheck.status !== 0) {
    console.error(chalk.red('Error: GitHub CLI (gh) not found.'));
    console.error(chalk.dim('Install from https://cli.github.com/'));
    process.exit(1);
  }

  // 4. Read verify report
  const verifyReportPath = path.join(projectRoot, '.ana/plans/active', slug, 'verify_report.md');
  if (!fs.existsSync(verifyReportPath)) {
    console.error(chalk.red('No verify report found.'));
    console.error(chalk.dim('Run `claude --agent ana-verify` first.'));
    process.exit(1);
  }

  const verifyContent = fs.readFileSync(verifyReportPath, 'utf-8');
  const result = extractVerifyResult(verifyContent);

  if (!result) {
    console.error(chalk.red('Error: Verify report has no Result line.'));
    process.exit(1);
  }

  if (result !== 'PASS') {
    console.error(chalk.red(`Cannot create PR — verification result is ${result}.`));
    console.error(chalk.dim('Fix issues and re-verify before creating PR.'));
    process.exit(1);
  }

  const testInfo = extractTestInfo(verifyContent);

  // 5. Read build report
  const buildReportPath = path.join(projectRoot, '.ana/plans/active', slug, 'build_report.md');
  if (!fs.existsSync(buildReportPath)) {
    console.error(chalk.red('No build report found.'));
    console.error(chalk.dim('Run `claude --agent ana-build` first.'));
    process.exit(1);
  }

  const buildContent = fs.readFileSync(buildReportPath, 'utf-8');
  const prSummary = extractPrSummary(buildContent);

  // 6. Read plan.md to count phases
  const planPath = path.join(projectRoot, '.ana/plans/active', slug, 'plan.md');
  let phaseCount = 1;
  if (fs.existsSync(planPath)) {
    const planContent = fs.readFileSync(planPath, 'utf-8');
    phaseCount = countPhases(planContent);
  }

  // 7. Read scope.md to extract title
  const scopePath = path.join(projectRoot, '.ana/plans/active', slug, 'scope.md');
  let title = slug;
  if (fs.existsSync(scopePath)) {
    const scopeContent = fs.readFileSync(scopePath, 'utf-8');
    title = extractTitle(scopeContent);
  }

  // 8. Build PR body
  const prBody = `## Summary
${prSummary}

## Pipeline Artifacts
- Scope: \`.ana/plans/active/${slug}/scope.md\`
- Spec: \`.ana/plans/active/${slug}/spec.md\`
- Build Report: \`.ana/plans/active/${slug}/build_report.md\`
- Verify Report: \`.ana/plans/active/${slug}/verify_report.md\`

## Verification
- **Result:** ${result}
- Phases: ${phaseCount} verified
- Tests: ${testInfo}

Co-authored-by: Ana <build@anatomia.dev>`;

  // 9. Create PR
  const prTitle = `[${slug}] ${title}`;
  const ghResult = spawnSync(
    'gh',
    ['pr', 'create', '--base', artifactBranch, '--head', currentBranch, '--title', prTitle, '--body', prBody],
    { cwd: projectRoot, stdio: 'pipe', encoding: 'utf-8' }
  );

  if (ghResult.status !== 0) {
    const errorOutput = ghResult.stderr || ghResult.stdout || '';

    // Check if PR already exists
    if (errorOutput.includes('already exists')) {
      console.log(chalk.yellow('PR already exists for this branch.'));

      // Try to get existing PR URL
      const viewResult = spawnSync('gh', ['pr', 'view', '--json', 'url', '-q', '.url'], {
        cwd: projectRoot,
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      if (viewResult.status === 0 && viewResult.stdout.trim()) {
        console.log(chalk.cyan(`PR URL: ${viewResult.stdout.trim()}`));
        process.exit(0);
      }
    }

    // Other error - show it
    console.error(chalk.red('Error: Failed to create PR.'));
    console.error(errorOutput);
    process.exit(1);
  }

  // Success - extract URL from output
  const prUrl = ghResult.stdout.trim();
  console.log(chalk.green('✓ PR created'));
  console.log(chalk.cyan(prUrl));
}

/**
 * Register pr command with the CLI
 *
 * @param program - Commander program instance
 */
export function registerPrCommand(program: Command): void {
  const prCommand = new Command('pr')
    .description('Manage pull requests');

  prCommand
    .command('create')
    .description('Create GitHub PR from pipeline artifacts')
    .argument('<slug>', 'Work item slug (e.g., add-status-command)')
    .action((slug: string) => {
      createPr(slug);
    });

  program.addCommand(prCommand);
}
