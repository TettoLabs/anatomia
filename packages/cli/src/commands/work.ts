/**
 * ana work - Manage pipeline work items
 *
 * Subcommands:
 *   ana work status         Show pipeline state for all active work items
 *   ana work complete {slug} Archive completed work after PR merge
 *
 * Exit codes:
 *   0 - Success (always for status - it's informational)
 *   1 - Error (missing .meta.json, not a git repo for complete, etc.)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { readArtifactBranch, getCurrentBranch } from './artifact.js';

/**
 * Artifact state for a work item
 */
interface ArtifactState {
  scope: ArtifactInfo;
  plan: ArtifactInfo;
  specs: SpecInfo[];
  buildReports: ReportInfo[];
  verifyReports: VerifyReportInfo[];
}

/**
 * Information about an artifact file
 */
interface ArtifactInfo {
  exists: boolean;
  location?: string;
}

/**
 * Information about a spec file
 */
interface SpecInfo {
  file: string;
  exists: boolean;
  location?: string;
}

/**
 * Information about a build/verify report
 */
interface ReportInfo {
  file: string;
  exists: boolean;
  location?: string;
}

/**
 * Information about a verify report with result
 */
interface VerifyReportInfo extends ReportInfo {
  result?: 'PASS' | 'FAIL' | 'unknown';
}

/**
 * Work item with complete state information
 */
interface WorkItem {
  slug: string;
  totalPhases: number;
  artifacts: ArtifactState;
  featureBranch: string | null;
  stage: string;
  nextAction: string;
}

/**
 * Status output structure
 */
interface StatusOutput {
  artifactBranch: string;
  currentBranch: string;
  onArtifactBranch: boolean;
  items: WorkItem[];
}

/**
 * Check if a file exists on a branch
 *
 * @param branch - Branch name (e.g., "main", "origin/main", "feature/slug")
 * @param filePath - Relative file path
 * @returns True if file exists on branch
 */
function fileExistsOnBranch(branch: string, filePath: string): boolean {
  try {
    execSync(`git show ${branch}:${filePath}`, { stdio: 'pipe', encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file content from a branch
 *
 * @param branch - Branch name
 * @param filePath - Relative file path
 * @returns File content or null if doesn't exist
 */
function readFileOnBranch(branch: string, filePath: string): string | null {
  try {
    return execSync(`git show ${branch}:${filePath}`, { stdio: 'pipe', encoding: 'utf-8' });
  } catch {
    return null;
  }
}

/**
 * Get feature branch for a slug
 *
 * @param slug - Work item slug
 * @returns Branch name or null if doesn't exist
 */
function getFeatureBranch(slug: string): string | null {
  try {
    const output = execSync(`git branch -a --list "*${slug}*"`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
    if (!output) return null;

    // Parse branches — prefer local over remote
    const branches = output.split('\n').map(b => b.trim().replace(/^\* /, '').replace(/^remotes\//, ''));
    const local = branches.find(b => b === `feature/${slug}`);
    const remote = branches.find(b => b === `origin/feature/${slug}`);

    return local || remote || null;
  } catch {
    return null;
  }
}

/**
 * Count phases and extract spec filenames from plan.md
 *
 * @param planContent - Content of plan.md
 * @returns Phase count and spec filenames
 */
function countPhases(planContent: string): { total: number; specs: string[] } {
  const lines = planContent.split('\n');
  const specs: string[] = [];
  let inPhases = false;

  for (const line of lines) {
    if (line.trim() === '## Phases') {
      inPhases = true;
      continue;
    }
    if (inPhases && line.startsWith('## ')) {
      break; // next section
    }
    if (inPhases) {
      const specMatch = line.match(/Spec:\s*(spec(?:-\d+)?\.md)/);
      if (specMatch) {
        specs.push(specMatch[1]);
      }
    }
  }

  return { total: specs.length, specs };
}

/**
 * Extract verify result from verify report content
 *
 * @param content - Content of verify report
 * @returns PASS, FAIL, or unknown
 */
function getVerifyResult(content: string): 'PASS' | 'FAIL' | 'unknown' {
  const match = content.match(/\*\*Result:\*\*\s*(PASS|FAIL)/i);
  if (!match) return 'unknown';
  return match[1].toUpperCase() as 'PASS' | 'FAIL';
}

/**
 * Discover slug directories on artifact branch
 *
 * @param artifactBranch - Artifact branch name
 * @param onArtifactBranch - Whether currently on artifact branch
 * @returns Array of slug names
 */
function discoverSlugs(artifactBranch: string, onArtifactBranch: boolean): string[] {
  const plansPath = '.ana/plans/active';

  if (onArtifactBranch) {
    // Use filesystem
    const fullPath = path.join(process.cwd(), plansPath);
    if (!fs.existsSync(fullPath)) {
      return [];
    }
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .filter(entry => entry.name !== '.DS_Store' && entry.name !== '.gitkeep')
      .map(entry => entry.name);
  } else {
    // Use git ls-tree with trailing slash to get directory contents
    try {
      const output = execSync(`git ls-tree --name-only origin/${artifactBranch} ${plansPath}/`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      }).trim();
      if (!output) return [];
      // Output will be like ".ana/plans/active/slug-name", extract just the slug
      return output
        .split('\n')
        .filter(Boolean)
        .map(line => path.basename(line))
        .filter(name => name !== '.DS_Store' && name !== '.gitkeep');
    } catch {
      return [];
    }
  }
}

/**
 * Gather artifact state for a slug
 *
 * @param slug - Work item slug
 * @param artifactBranch - Artifact branch name
 * @param onArtifactBranch - Whether currently on artifact branch
 * @returns Complete artifact state
 */
function gatherArtifactState(
  slug: string,
  artifactBranch: string,
  onArtifactBranch: boolean
): ArtifactState {
  const basePath = `.ana/plans/active/${slug}`;
  const branch = onArtifactBranch ? artifactBranch : `origin/${artifactBranch}`;

  // Check for scope, plan, spec on artifact branch
  const checkFile = (filename: string): ArtifactInfo => {
    const filePath = `${basePath}/${filename}`;
    if (onArtifactBranch) {
      const fullPath = path.join(process.cwd(), filePath);
      const exists = fs.existsSync(fullPath);
      return { exists, location: exists ? artifactBranch : undefined };
    } else {
      const exists = fileExistsOnBranch(branch, filePath);
      return {
        exists,
        location: exists ? artifactBranch : undefined,
      };
    }
  };

  const scope = checkFile('scope.md');
  const plan = checkFile('plan.md');

  // Read plan.md to get spec filenames
  let specs: SpecInfo[] = [];
  const planContent = onArtifactBranch
    ? (fs.existsSync(path.join(process.cwd(), `${basePath}/plan.md`))
        ? fs.readFileSync(path.join(process.cwd(), `${basePath}/plan.md`), 'utf-8')
        : null)
    : readFileOnBranch(branch, `${basePath}/plan.md`);

  if (planContent) {
    const { specs: specFiles } = countPhases(planContent);
    specs = specFiles.map(specFile => ({
      file: specFile,
      ...checkFile(specFile),
    }));
  } else {
    // No plan.md, check for default spec.md
    const specInfo = checkFile('spec.md');
    if (specInfo.exists) {
      specs = [{ file: 'spec.md', ...specInfo }];
    }
  }

  // Check for build/verify reports on feature branch
  const featureBranch = getFeatureBranch(slug);
  const buildReports: ReportInfo[] = [];
  const verifyReports: VerifyReportInfo[] = [];

  if (featureBranch) {
    for (const spec of specs) {
      // Determine report filenames from spec filename
      let buildReportFile: string;
      let verifyReportFile: string;

      if (spec.file === 'spec.md') {
        buildReportFile = 'build_report.md';
        verifyReportFile = 'verify_report.md';
      } else {
        const match = spec.file.match(/spec-(\d+)\.md/);
        if (match) {
          const num = match[1];
          buildReportFile = `build_report_${num}.md`;
          verifyReportFile = `verify_report_${num}.md`;
        } else {
          continue;
        }
      }

      // Check build report
      const buildReportPath = `${basePath}/${buildReportFile}`;
      const buildExists = fileExistsOnBranch(featureBranch, buildReportPath);
      if (buildExists) {
        buildReports.push({
          file: buildReportFile,
          exists: true,
          location: featureBranch,
        });
      }

      // Check verify report
      const verifyReportPath = `${basePath}/${verifyReportFile}`;
      const verifyExists = fileExistsOnBranch(featureBranch, verifyReportPath);
      if (verifyExists) {
        const verifyContent = readFileOnBranch(featureBranch, verifyReportPath);
        const result = verifyContent ? getVerifyResult(verifyContent) : 'unknown';
        verifyReports.push({
          file: verifyReportFile,
          exists: true,
          location: featureBranch,
          result,
        });
      }
    }
  }

  return {
    scope,
    plan,
    specs,
    buildReports,
    verifyReports,
  };
}

/**
 * Determine pipeline stage for a work item
 *
 * @param slug - Work item slug
 * @param artifacts - Artifact state
 * @param featureBranch - Feature branch name or null
 * @returns Stage name
 */
function determineStage(slug: string, artifacts: ArtifactState, featureBranch: string | null): string {
  const { scope, plan, specs, buildReports, verifyReports } = artifacts;
  const totalPhases = specs.length;

  // Scope only → ready for plan
  if (scope.exists && !plan.exists) {
    return 'ready-for-plan';
  }

  // No specs → ready for plan
  if (specs.length === 0) {
    return 'ready-for-plan';
  }

  // Single-spec workflow
  if (totalPhases === 1) {
    if (!featureBranch) {
      return 'ready-for-build';
    }

    const hasBuildReport = buildReports.length > 0;
    const hasVerifyReport = verifyReports.length > 0;

    if (!hasBuildReport) {
      return 'build-in-progress';
    }

    if (hasBuildReport && !hasVerifyReport) {
      return 'ready-for-verify';
    }

    if (hasVerifyReport) {
      const result = verifyReports[0].result;
      if (result === 'PASS') {
        return 'ready-to-merge';
      } else if (result === 'FAIL') {
        return 'needs-fixes';
      } else {
        return 'verify-status-unknown';
      }
    }
  }

  // Multi-spec workflow
  if (totalPhases > 1) {
    if (!featureBranch) {
      return 'phase-1-ready-for-build';
    }

    // Determine which phase we're on
    for (let i = 0; i < totalPhases; i++) {
      const phaseNum = i + 1;
      const expectedBuildReport = specs[i].file === 'spec.md' ? 'build_report.md' : `build_report_${phaseNum}.md`;
      const expectedVerifyReport = specs[i].file === 'spec.md' ? 'verify_report.md' : `verify_report_${phaseNum}.md`;

      const phaseBuildReport = buildReports.find(r => r.file === expectedBuildReport);
      const phaseVerifyReport = verifyReports.find(r => r.file === expectedVerifyReport);

      if (!phaseBuildReport) {
        // This phase not built yet
        if (phaseNum === 1) {
          return 'phase-1-build-in-progress';
        } else {
          return `phase-${phaseNum}-ready-for-build`;
        }
      }

      if (phaseBuildReport && !phaseVerifyReport) {
        // This phase built but not verified
        return `phase-${phaseNum}-ready-for-verify`;
      }

      if (phaseVerifyReport) {
        const result = phaseVerifyReport.result;
        if (result === 'FAIL') {
          return `phase-${phaseNum}-needs-fixes`;
        } else if (result === 'PASS') {
          // This phase passed, continue to next phase
          continue;
        } else {
          return `phase-${phaseNum}-verify-status-unknown`;
        }
      }
    }

    // All phases passed
    return 'ready-to-merge';
  }

  return 'unknown';
}

/**
 * Determine next action command for a stage
 *
 * @param stage - Pipeline stage
 * @param slug - Work item slug
 * @returns Copy-pasteable command
 */
function getNextAction(stage: string, slug: string): string {
  if (stage === 'ready-for-plan') {
    return 'claude --agent ana-plan';
  }

  if (stage === 'ready-for-build') {
    return 'claude --agent ana-build';
  }

  if (stage === 'build-in-progress') {
    return `git checkout feature/${slug} && claude --agent ana-build`;
  }

  if (stage === 'ready-for-verify') {
    return `git checkout feature/${slug} && claude --agent ana-verify`;
  }

  if (stage === 'needs-fixes') {
    return `git checkout feature/${slug} && claude --agent ana-build`;
  }

  if (stage === 'ready-to-merge') {
    return `Review PR, then: ana work complete ${slug}`;
  }

  // Multi-phase stages
  if (stage.includes('ready-for-build')) {
    return `git checkout feature/${slug} && claude --agent ana-build`;
  }

  if (stage.includes('ready-for-verify')) {
    return `git checkout feature/${slug} && claude --agent ana-verify`;
  }

  if (stage.includes('needs-fixes')) {
    return `git checkout feature/${slug} && claude --agent ana-build`;
  }

  return '(unknown stage)';
}

/**
 * Print human-readable status output
 *
 * @param output - Status output structure
 */
function printHumanReadable(output: StatusOutput): void {
  console.log(chalk.bold(`\nPipeline Status (artifact branch: ${output.artifactBranch})\n`));

  if (!output.onArtifactBranch) {
    console.log(chalk.yellow(`ℹ You're on ${output.currentBranch}. Artifact branch is ${output.artifactBranch}.`));
    console.log(chalk.yellow(`  To switch: git checkout ${output.artifactBranch} && git pull\n`));
  }

  if (output.items.length === 0) {
    console.log(chalk.gray('No active work. Run: claude --agent ana to scope new work.'));
    return;
  }

  for (const item of output.items) {
    console.log(chalk.bold(`  ${item.slug} (${item.totalPhases} phase${item.totalPhases === 1 ? '' : 's'}):`));

    // Show planning artifacts
    const scopeMark = item.artifacts.scope.exists ? chalk.green('✓') : chalk.red('✗');
    const scopeLocation = item.artifacts.scope.location || 'missing';
    console.log(`    scope.md         ${scopeMark} ${scopeLocation}`);

    const planMark = item.artifacts.plan.exists ? chalk.green('✓') : chalk.red('✗');
    const planLocation = item.artifacts.plan.location || 'missing';
    console.log(`    plan.md          ${planMark} ${planLocation}`);

    // Show specs
    for (const spec of item.artifacts.specs) {
      const specMark = spec.exists ? chalk.green('✓') : chalk.red('✗');
      const specLocation = spec.location || 'missing';
      console.log(`    ${spec.file.padEnd(16)} ${specMark} ${specLocation}`);
    }

    // Show phase status for multi-spec
    if (item.totalPhases > 1) {
      for (let i = 0; i < item.totalPhases; i++) {
        const phaseNum = i + 1;
        const expectedBuildReport = item.artifacts.specs[i].file === 'spec.md' ? 'build_report.md' : `build_report_${phaseNum}.md`;
        const expectedVerifyReport = item.artifacts.specs[i].file === 'spec.md' ? 'verify_report.md' : `verify_report_${phaseNum}.md`;

        const hasBuild = item.artifacts.buildReports.some(r => r.file === expectedBuildReport);
        const verify = item.artifacts.verifyReports.find(r => r.file === expectedVerifyReport);

        const buildStatus = hasBuild ? chalk.green('✓ built') : 'not started';
        const verifyStatus = verify
          ? verify.result === 'PASS'
            ? chalk.green('✓ verified')
            : verify.result === 'FAIL'
            ? chalk.red('✗ failed')
            : 'verify pending'
          : chalk.red('✗ not verified');

        console.log(`    Phase ${phaseNum}: ${buildStatus} ${verifyStatus}`);
      }
    } else {
      // Show build/verify for single-spec
      for (const report of item.artifacts.buildReports) {
        const mark = chalk.green('✓');
        console.log(`    ${report.file.padEnd(16)} ${mark} ${report.location}`);
      }

      for (const report of item.artifacts.verifyReports) {
        const mark = report.result === 'PASS' ? chalk.green('✓') : chalk.red('✗');
        console.log(`    ${report.file.padEnd(16)} ${mark} ${report.location}`);
      }
    }

    // Show stage and next action
    console.log(`    ${chalk.bold('Stage:')} ${item.stage}`);
    console.log(chalk.cyan(`    → ${item.nextAction}\n`));
  }

  console.log(chalk.gray('Scope new work: claude --agent ana'));
}

/**
 * Get work status across all active work items
 *
 * @param options - Command options
 * @param options.json - Output JSON format instead of human-readable
 */
export function getWorkStatus(options: { json?: boolean }): void {
  const artifactBranch = readArtifactBranch();
  const currentBranch = getCurrentBranch();

  if (!currentBranch) {
    console.log(chalk.yellow('Not a git repo. Showing filesystem-only status.\n'));
  }

  const onArtifactBranch = currentBranch === artifactBranch;

  // Best-effort fetch (don't fail if offline)
  if (currentBranch) {
    try {
      execSync(`git fetch origin ${artifactBranch} --quiet`, { stdio: 'pipe' });
    } catch {
      // Silently continue with local state
    }
  }

  // Discover slugs
  const slugs = discoverSlugs(artifactBranch, onArtifactBranch);

  if (slugs.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({
        artifactBranch,
        currentBranch: currentBranch || 'unknown',
        onArtifactBranch,
        items: [],
      }, null, 2));
    } else {
      console.log(chalk.gray('\nNo active work. Run: claude --agent ana to scope new work.'));
    }
    return;
  }

  // Gather state for each slug
  const items: WorkItem[] = [];
  for (const slug of slugs) {
    const artifacts = gatherArtifactState(slug, artifactBranch, onArtifactBranch);

    // Skip empty directories (no scope = not real work)
    if (!artifacts.scope.exists) {
      continue;
    }

    const featureBranch = getFeatureBranch(slug);
    const stage = determineStage(slug, artifacts, featureBranch);
    const nextAction = getNextAction(stage, slug);

    items.push({
      slug,
      totalPhases: artifacts.specs.length,
      artifacts,
      featureBranch,
      stage,
      nextAction,
    });
  }

  const output: StatusOutput = {
    artifactBranch,
    currentBranch: currentBranch || 'unknown',
    onArtifactBranch,
    items,
  };

  if (options.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    printHumanReadable(output);
  }
}

/**
 * Command definition for work management
 */
export const workCommand = new Command('work')
  .description('Manage pipeline work items');

const statusCommand = new Command('status')
  .description('Show pipeline state for all active work items')
  .option('--json', 'Output JSON format for programmatic consumption')
  .action((options: { json?: boolean }) => {
    getWorkStatus(options);
  });

workCommand.addCommand(statusCommand);
