/**
 * ana work - Manage pipeline work items
 *
 * Subcommands:
 *   ana work status         Show pipeline state for all active work items
 *   ana work complete {slug} Archive completed work after PR merge
 *
 * Exit codes:
 *   0 - Success (always for status - it's informational)
 *   1 - Error (missing ana.json, not a git repo for complete, etc.)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { readArtifactBranch, getCurrentBranch } from '../utils/git-operations.js';
import { generateProofSummary, generateActiveIssuesMarkdown, type ProofSummary } from '../utils/proofSummary.js';
import { findProjectRoot } from '../utils/validators.js';
import type { ProofChainEntry } from '../types/proof.js';

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
      if (specMatch && specMatch[1]) {
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
  if (!match || !match[1]) return 'unknown';
  return match[1].toUpperCase() as 'PASS' | 'FAIL';
}

/**
 * Discover slug directories on artifact branch
 *
 * @param artifactBranch - Artifact branch name
 * @param onArtifactBranch - Whether currently on artifact branch
 * @param projectRoot - Project root path
 * @returns Array of slug names
 */
function discoverSlugs(artifactBranch: string, onArtifactBranch: boolean, projectRoot: string): string[] {
  const plansPath = '.ana/plans/active';

  if (onArtifactBranch) {
    // Use filesystem
    const fullPath = path.join(projectRoot, plansPath);
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
 * @param projectRoot - Project root path
 * @returns Complete artifact state
 */
function gatherArtifactState(
  slug: string,
  artifactBranch: string,
  onArtifactBranch: boolean,
  projectRoot: string
): ArtifactState {
  const basePath = `.ana/plans/active/${slug}`;
  const branch = onArtifactBranch ? artifactBranch : `origin/${artifactBranch}`;

  // Check for scope, plan, spec on artifact branch
  const checkFile = (filename: string): ArtifactInfo => {
    const filePath = `${basePath}/${filename}`;
    if (onArtifactBranch) {
      const fullPath = path.join(projectRoot, filePath);
      const exists = fs.existsSync(fullPath);
      const info: ArtifactInfo = { exists };
      if (exists) info.location = artifactBranch;
      return info;
    } else {
      const exists = fileExistsOnBranch(branch, filePath);
      const info: ArtifactInfo = { exists };
      if (exists) info.location = artifactBranch;
      return info;
    }
  };

  const scope = checkFile('scope.md');
  const plan = checkFile('plan.md');

  // Read plan.md to get spec filenames
  let specs: SpecInfo[] = [];
  const planContent = onArtifactBranch
    ? (fs.existsSync(path.join(projectRoot, `${basePath}/plan.md`))
        ? fs.readFileSync(path.join(projectRoot, `${basePath}/plan.md`), 'utf-8')
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
      const result = verifyReports[0]?.result;
      if (result === 'PASS') {
        return 'ready-to-merge';
      } else if (result === 'FAIL') {
        // Check if build report was updated AFTER verify report (fixes applied)
        try {
          const basePath = `.ana/plans/active/${slug}`;
          const buildTime = execSync(
            `git log --format='%ct' -1 ${featureBranch} -- ${basePath}/build_report.md`,
            { encoding: 'utf-8', stdio: 'pipe' }
          ).trim();
          const verifyTime = execSync(
            `git log --format='%ct' -1 ${featureBranch} -- ${basePath}/verify_report.md`,
            { encoding: 'utf-8', stdio: 'pipe' }
          ).trim();
          if (buildTime && verifyTime && parseInt(buildTime) > parseInt(verifyTime)) {
            return 'ready-for-re-verify';
          }
        } catch { /* fall through to needs-fixes */ }
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
      const spec = specs[i];
      if (!spec) continue;
      const expectedBuildReport = spec.file === 'spec.md' ? 'build_report.md' : `build_report_${phaseNum}.md`;
      const expectedVerifyReport = spec.file === 'spec.md' ? 'verify_report.md' : `verify_report_${phaseNum}.md`;

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
          // Check if build report was updated after verify (fixes applied)
          try {
            const basePath = `.ana/plans/active/${slug}`;
            const expectedBuild = phaseBuildReport.file;
            const expectedVerify = phaseVerifyReport.file;
            const bTime = execSync(
              `git log --format='%ct' -1 ${featureBranch} -- ${basePath}/${expectedBuild}`,
              { encoding: 'utf-8', stdio: 'pipe' }
            ).trim();
            const vTime = execSync(
              `git log --format='%ct' -1 ${featureBranch} -- ${basePath}/${expectedVerify}`,
              { encoding: 'utf-8', stdio: 'pipe' }
            ).trim();
            if (bTime && vTime && parseInt(bTime) > parseInt(vTime)) {
              return `phase-${phaseNum}-ready-for-re-verify`;
            }
          } catch { /* fall through */ }
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

  if (stage === 'ready-for-re-verify') {
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

  if (stage.includes('ready-for-re-verify')) {
    return `git checkout feature/${slug} && claude --agent ana-verify`;
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
        const phaseSpec = item.artifacts.specs[i];
        if (!phaseSpec) continue;
        const expectedBuildReport = phaseSpec.file === 'spec.md' ? 'build_report.md' : `build_report_${phaseNum}.md`;
        const expectedVerifyReport = phaseSpec.file === 'spec.md' ? 'verify_report.md' : `verify_report_${phaseNum}.md`;

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
  const projectRoot = findProjectRoot();
  const artifactBranch = readArtifactBranch(projectRoot);
  const currentBranch = getCurrentBranch();

  if (!currentBranch) {
    console.log(chalk.yellow('Not a git repo. Showing filesystem-only status.\n'));
  }

  const onArtifactBranch = currentBranch === artifactBranch;

  // Best-effort fetch (don't fail if offline)
  if (currentBranch) {
    try {
      execSync(`git fetch origin ${artifactBranch} --quiet`, { stdio: 'pipe' });

      // Warn if local artifact branch is behind remote
      const behind = execSync(
        `git rev-list ${artifactBranch}..origin/${artifactBranch} --count`,
        { encoding: 'utf-8', stdio: 'pipe' }
      ).trim();
      if (parseInt(behind) > 0) {
        console.log(chalk.yellow(
          `ℹ ${artifactBranch} is ${behind} commit${behind === '1' ? '' : 's'} behind remote.`
        ));
      }
    } catch {
      // Silently continue with local state
    }
  }

  // Discover slugs
  const slugs = discoverSlugs(artifactBranch, onArtifactBranch, projectRoot);

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
    const artifacts = gatherArtifactState(slug, artifactBranch, onArtifactBranch, projectRoot);

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

// ProofChainEntry moved to src/types/proof.ts (Item 13).
// Imported above for internal use in this file.

/**
 * Proof chain JSON structure
 */
interface ProofChain {
  entries: ProofChainEntry[];
}

/**
 * Write proof chain files (JSON and markdown)
 *
 * @param slug - Work item slug
 * @param proof - Proof summary data
 * @param projectRoot - Project root directory
 */
async function writeProofChain(slug: string, proof: ProofSummary, projectRoot: string): Promise<void> {
  const anaDir = path.join(projectRoot, '.ana');

  // Ensure .ana directory exists
  await fsPromises.mkdir(anaDir, { recursive: true });

  // 1. Write/append to proof_chain.json
  const chainPath = path.join(anaDir, 'proof_chain.json');
  let chain: ProofChain = { entries: [] };

  if (fs.existsSync(chainPath)) {
    try {
      chain = JSON.parse(fs.readFileSync(chainPath, 'utf-8'));
      if (!Array.isArray(chain.entries)) {
        chain = { entries: [] };
      }
    } catch {
      chain = { entries: [] };
    }
  }

  // Read modules_touched from .saves.json (captured at build-report save time
  // when the feature branch definitely exists and all code is committed).
  let modulesTouched: string[] = [];
  try {
    const slugSaves = path.join(anaDir, 'plans', 'completed', slug, '.saves.json');
    if (fs.existsSync(slugSaves)) {
      const savesContent = JSON.parse(fs.readFileSync(slugSaves, 'utf-8'));
      if (Array.isArray(savesContent['modules_touched'])) {
        modulesTouched = savesContent['modules_touched'];
      }
    }
  } catch { /* fall back to empty */ }

  const entry: ProofChainEntry = {
    slug,
    feature: proof.feature,
    result: proof.result,
    author: proof.author,
    contract: proof.contract,
    assertions: proof.assertions.map(a => {
      const base: { id: string; says: string; status: string; deviation?: string } = {
        id: a.id,
        says: a.says,
        status: a.verifyStatus || a.preCheckStatus,
      };
      if (a.verifyStatus === 'DEVIATED') {
        const deviation = proof.deviations.find(d => d.contract_id === a.id)?.instead;
        if (deviation) base.deviation = deviation;
      }
      return base;
    }),
    acceptance_criteria: proof.acceptance_criteria,
    timing: proof.timing,
    hashes: proof.hashes,
    seal_commit: proof.seal_commit,
    completed_at: new Date().toISOString(),
    modules_touched: modulesTouched,
    callouts: proof.callouts,
    rejection_cycles: proof.rejection_cycles,
    previous_failures: proof.previous_failures,
  };

  chain.entries.push(entry);
  await fsPromises.writeFile(chainPath, JSON.stringify(chain, null, 2));

  // 2. Regenerate PROOF_CHAIN.md entirely from proof_chain.json
  const chainMdPath = path.join(anaDir, 'PROOF_CHAIN.md');

  // Generate Active Issues section from all entries
  const activeIssuesMd = generateActiveIssuesMarkdown(chain.entries);

  // Generate chronological history (newest first)
  const reversedEntries = [...chain.entries].reverse();
  const historyEntries: string[] = [];

  for (const historyEntry of reversedEntries) {
    const entryDate = historyEntry.completed_at.split('T')[0];

    // Handle optional fields for older entries
    const assertions = historyEntry.assertions || [];
    const contract = historyEntry.contract || { satisfied: 0, total: 0 };
    const acceptanceCriteria = historyEntry.acceptance_criteria || { met: 0, total: 0 };
    const timing = historyEntry.timing || { total_minutes: 0 };
    const modulesTouched = historyEntry.modules_touched || [];
    const rejectionCycles = historyEntry.rejection_cycles || 0;
    const previousFailures = historyEntry.previous_failures || [];
    const callouts = historyEntry.callouts || [];

    const deviationCount = assertions.filter(a => a.status === 'DEVIATED').length;
    const deviationSummary = deviationCount > 0
      ? `\nDeviations: ${assertions
          .filter(a => a.status === 'DEVIATED' && a.deviation)
          .map(a => `${a.id} — ${a.deviation}`)
          .join('; ')}`
      : '';

    const timingDetails = (timing.think != null && timing.verify != null)
      ? ` (Think ${timing.think}m, Plan ${timing.plan}m, Build ${timing.build}m, Verify ${timing.verify}m)`
      : '';

    const modulesLine = modulesTouched.length > 0
      ? `\nModules: ${modulesTouched.slice(0, 10).join(', ')}${modulesTouched.length > 10 ? ` (+${modulesTouched.length - 10} more)` : ''}`
      : '';

    const rejectionLine = rejectionCycles > 0
      ? `\nRejection cycles: ${rejectionCycles} (${previousFailures.map(f => `${f.id} ${f.summary}`).join(', ')})`
      : '';

    // Callout digest — top 5 in markdown. Priority: code > test > upstream
    const categoryOrder: Record<string, number> = { code: 0, test: 1, upstream: 2 };
    const sortedCallouts = [...callouts].sort((a, b) =>
      (categoryOrder[a.category] ?? 3) - (categoryOrder[b.category] ?? 3)
    );
    const calloutLines = sortedCallouts.length > 0
      ? '\nCallouts:\n' + sortedCallouts.slice(0, 5).map(c => `- ${c.category}: ${c.summary}`).join('\n')
      : '';

    const mdEntryText = `## ${historyEntry.feature} (${entryDate})
Result: ${historyEntry.result} | ${contract.satisfied}/${contract.total} satisfied | ${acceptanceCriteria.met}/${acceptanceCriteria.total} ACs | ${deviationCount} deviation${deviationCount !== 1 ? 's' : ''}
Pipeline: ${timing.total_minutes}m${timingDetails}${deviationSummary}${modulesLine}${rejectionLine}${calloutLines}
`;

    historyEntries.push(mdEntryText);
  }

  // Combine Active Issues + history
  const fullMd = activeIssuesMd + '\n' + historyEntries.join('\n');
  await fsPromises.writeFile(chainMdPath, fullMd);
}

/**
 * Complete a work item after PR merge
 *
 * @param slug - Work item slug to complete
 */
export async function completeWork(slug: string): Promise<void> {
  // 1. Read artifactBranch from ana.json
  const projectRoot = findProjectRoot();
  const artifactBranch = readArtifactBranch(projectRoot);

  // 2. Get current branch
  const currentBranch = getCurrentBranch();
  if (!currentBranch) {
    console.error(chalk.red('Error: Not a git repository.'));
    process.exit(1);
  }

  // 3. Verify on artifact branch
  if (currentBranch !== artifactBranch) {
    console.error(chalk.red(`Error: You're on \`${currentBranch}\`. Switch to \`${artifactBranch}\` to complete work.`));
    console.error(chalk.gray('The PR should be merged before completing.'));
    console.error(chalk.gray(`Run: git checkout ${artifactBranch} && git pull`));
    process.exit(1);
  }

  // 4. Pull latest to get merged content
  try {
    // Check if remote exists first
    const remotes = execSync('git remote', { stdio: 'pipe', encoding: 'utf-8' }).trim();
    if (remotes) {
      execSync('git pull --rebase', { stdio: 'pipe', encoding: 'utf-8' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('conflict') || errorMessage.includes('Cannot rebase')) {
      console.error(chalk.red('Error: Pull failed due to conflicts. Resolve conflicts and try again.'));
      process.exit(1);
    }
  }

  // 5. Verify slug directory exists
  const activePath = path.join(projectRoot, '.ana', 'plans', 'active', slug);
  const completedPath = path.join(projectRoot, '.ana', 'plans', 'completed', slug);

  if (!fs.existsSync(activePath)) {
    // Check if already completed
    if (fs.existsSync(completedPath)) {
      console.log(chalk.gray(`Work item \`${slug}\` was already completed.`));
      process.exit(0);
    }
    console.error(chalk.red(`Error: No active work found for \`${slug}\`.`));
    process.exit(1);
  }

  // 6. Verify feature branch was merged (optional - branch might be deleted)
  //    Prune stale remote refs — squash merge + --delete-branch removes
  //    the remote branch on GitHub but local refs persist until pruned.
  try {
    execSync('git fetch --prune origin', { stdio: 'pipe' });
  } catch { /* offline — continue with local state */ }

  const featureBranchExists = getFeatureBranch(slug);
  if (featureBranchExists) {
    // Check if remote branch still exists after prune
    const hasRemote = (() => {
      try {
        const output = execSync(`git branch -r --list "origin/feature/${slug}"`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
        return output.length > 0;
      } catch { return false; }
    })();

    if (hasRemote) {
      // Remote still exists — verify with is-ancestor (regular merge)
      let merged = false;
      try {
        execSync(`git merge-base --is-ancestor feature/${slug} HEAD`, { stdio: 'pipe' });
        merged = true;
      } catch {
        // is-ancestor failed — might be squash merge. Check via gh CLI.
        try {
          const prState = execSync(
            `gh pr view feature/${slug} --json state -q .state`,
            { encoding: 'utf-8', stdio: 'pipe' }
          ).trim();
          merged = prState === 'MERGED';
        } catch { /* gh not available or no PR — fall through to error */ }
      }
      if (!merged) {
        console.error(chalk.red(`Error: \`feature/${slug}\` has not been merged into \`${artifactBranch}\`.`));
        console.error(chalk.gray('Merge the PR first, then run this command again.'));
        process.exit(1);
      }
    }
    // else: remote deleted after prune = PR was merged (squash or regular)
  }

  // 7. Read plan.md to determine phases
  const planPath = path.join(activePath, 'plan.md');
  if (!fs.existsSync(planPath)) {
    console.error(chalk.red(`Error: No plan.md found for \`${slug}\`. Cannot determine phases.`));
    process.exit(1);
  }

  const planContent = fs.readFileSync(planPath, 'utf-8');
  const { specs } = countPhases(planContent);

  if (specs.length === 0) {
    console.error(chalk.red(`Error: No phases found in plan.md for \`${slug}\`.`));
    process.exit(1);
  }

  // 8. Verify ALL verify reports exist with PASS
  for (let i = 0; i < specs.length; i++) {
    const phaseNum = i + 1;
    const specFile = specs[i];
    if (!specFile) continue;

    // Determine verify report filename
    let verifyReportFile: string;
    if (specFile === 'spec.md') {
      verifyReportFile = 'verify_report.md';
    } else {
      const match = specFile.match(/spec-(\d+)\.md/);
      if (match) {
        verifyReportFile = `verify_report_${match[1]}.md`;
      } else {
        console.error(chalk.red(`Error: Unexpected spec filename: ${specFile}`));
        process.exit(1);
      }
    }

    const verifyReportPath = path.join(activePath, verifyReportFile);

    // Check if verify report exists
    if (!fs.existsSync(verifyReportPath)) {
      console.error(chalk.red(`Error: Phase ${phaseNum} has no verify report. Cannot complete.`));
      console.error(chalk.gray('Run `claude --agent ana-verify` to verify first.'));
      process.exit(1);
    }

    // Read and check result
    const verifyContent = fs.readFileSync(verifyReportPath, 'utf-8');
    const result = getVerifyResult(verifyContent);

    if (result === 'FAIL') {
      console.error(chalk.red(`Error: Phase ${phaseNum} verification failed (Result: FAIL).`));
      console.error(chalk.gray('Fix issues and re-verify before completing.'));
      process.exit(1);
    }

    if (result === 'unknown') {
      console.error(chalk.red(`Error: Phase ${phaseNum} verify report has no Result line.`));
      console.error(chalk.gray("Verify report must include '**Result:** PASS' or '**Result:** FAIL'."));
      process.exit(1);
    }
  }

  // 9. Move the directory
  const completedDir = path.join(projectRoot, '.ana', 'plans', 'completed');
  await fsPromises.mkdir(completedDir, { recursive: true });
  await fsPromises.cp(activePath, completedPath, { recursive: true });
  await fsPromises.rm(activePath, { recursive: true, force: true });

  // 9a. Generate proof summary and write proof chain
  const proof = generateProofSummary(completedPath);
  await writeProofChain(slug, proof, projectRoot);

  // 10. Stage and commit
  try {
    execSync('git add .ana/plans/active/ .ana/plans/completed/ .ana/proof_chain.json .ana/PROOF_CHAIN.md', { stdio: 'pipe' });
    // Read coAuthor from ana.json
    const anaJsonPath = path.join(projectRoot, '.ana', 'ana.json');
    let coAuthor = 'Ana <build@anatomia.dev>';
    try {
      const anaJsonContent = fs.readFileSync(anaJsonPath, 'utf-8');
      const config: { coAuthor?: string } = JSON.parse(anaJsonContent);
      coAuthor = config.coAuthor || 'Ana <build@anatomia.dev>';
    } catch { /* fallback to default */ }
    const commitMessage = `[${slug}] Complete — archived to plans/completed\n\nCo-authored-by: ${coAuthor}`;
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe' });
  } catch (error) {
    console.error(chalk.red(`Error: Failed to commit. ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }

  // 11. Push
  try {
    execSync('git push', { stdio: 'pipe' });
  } catch {
    console.error(chalk.yellow('Warning: Push failed. Changes committed locally. Run `git push` manually.'));
    // Don't exit - commit succeeded
  }

  // 12. Delete feature branch (cleanup)
  try {
    execSync(`git branch -d feature/${slug}`, { stdio: 'pipe' });
  } catch {
    // Silently continue if branch doesn't exist or was already deleted
  }

  try {
    execSync(`git push origin --delete feature/${slug}`, { stdio: 'pipe' });
  } catch {
    // Silently continue if remote branch doesn't exist or was already deleted
  }

  // 13. Print summary (3-line proof summary)
  const statusIcon = proof.result === 'PASS' ? '✓' : '✗';
  console.log(`\n${statusIcon} ${proof.result} — ${proof.feature}`);
  console.log(`  ${proof.contract.covered}/${proof.contract.total} covered · ${proof.contract.satisfied}/${proof.contract.total} satisfied · ${proof.deviations.length} deviation${proof.deviations.length !== 1 ? 's' : ''}`);
  console.log('  Proof saved to chain.');
}

/**
 * Register the `work` command (with `status` and `complete` sub-commands).
 *
 * @param program - Commander program instance.
 */
export function registerWorkCommand(program: Command): void {
  const workCommand = new Command('work')
    .description('Manage pipeline work items');

  const statusCommand = new Command('status')
    .description('Show pipeline state for all active work items')
    .option('--json', 'Output JSON format for programmatic consumption')
    .action((options: { json?: boolean }) => {
      getWorkStatus(options);
    });

  const completeCommand = new Command('complete')
    .description('Archive completed work after PR merge')
    .argument('<slug>', 'Work item slug to complete')
    .action(async (slug: string) => {
      await completeWork(slug);
    });

  workCommand.addCommand(statusCommand);
  workCommand.addCommand(completeCommand);

  program.addCommand(workCommand);
}
