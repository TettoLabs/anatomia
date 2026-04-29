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
import { globSync } from 'glob';
import { readArtifactBranch, readBranchPrefix, getCurrentBranch } from '../utils/git-operations.js';
import { generateProofSummary, resolveFindingPaths, extractScopeSummary, generateDashboard, computeChainHealth, type ProofSummary } from '../utils/proofSummary.js';
import { findProjectRoot } from '../utils/validators.js';
import type { ProofChainEntry, ProofChain, ProofChainStats } from '../types/proof.js';

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
  workBranch: string | null;
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
 * Get work branch for a slug using the configured prefix
 *
 * @param slug - Work item slug
 * @param branchPrefix - Configured branch prefix (e.g., 'feature/', 'dev/', '')
 * @returns Branch name or null if doesn't exist
 */
function getWorkBranch(slug: string, branchPrefix: string): string | null {
  try {
    const output = execSync(`git branch -a --list "*${slug}*"`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
    if (!output) return null;

    // Parse branches — prefer local over remote
    const branches = output.split('\n').map(b => b.trim().replace(/^\* /, '').replace(/^remotes\//, ''));
    const local = branches.find(b => b === `${branchPrefix}${slug}`);
    const remote = branches.find(b => b === `origin/${branchPrefix}${slug}`);

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
 * @param branchPrefix - Configured branch prefix
 * @returns Complete artifact state
 */
function gatherArtifactState(
  slug: string,
  artifactBranch: string,
  onArtifactBranch: boolean,
  projectRoot: string,
  branchPrefix: string
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
      if (exists) {
        // Check if file is actually committed, not just on disk
        try {
          execSync(`git ls-files --error-unmatch ${filePath}`, { stdio: 'pipe', cwd: projectRoot });
          info.location = artifactBranch;
        } catch {
          info.location = 'untracked';
        }
      }
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

  // Check for build/verify reports on work branch
  const workBranch = getWorkBranch(slug, branchPrefix);
  const buildReports: ReportInfo[] = [];
  const verifyReports: VerifyReportInfo[] = [];

  if (workBranch) {
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
      const buildExists = fileExistsOnBranch(workBranch, buildReportPath);
      if (buildExists) {
        buildReports.push({
          file: buildReportFile,
          exists: true,
          location: workBranch,
        });
      }

      // Check verify report
      const verifyReportPath = `${basePath}/${verifyReportFile}`;
      const verifyExists = fileExistsOnBranch(workBranch, verifyReportPath);
      if (verifyExists) {
        const verifyContent = readFileOnBranch(workBranch, verifyReportPath);
        const result = verifyContent ? getVerifyResult(verifyContent) : 'unknown';
        verifyReports.push({
          file: verifyReportFile,
          exists: true,
          location: workBranch,
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
 * @param workBranch - Work branch name or null
 * @returns Stage name
 */
function determineStage(slug: string, artifacts: ArtifactState, workBranch: string | null): string {
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
    if (!workBranch) {
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
            `git log --format='%ct' -1 ${workBranch} -- ${basePath}/build_report.md`,
            { encoding: 'utf-8', stdio: 'pipe' }
          ).trim();
          const verifyTime = execSync(
            `git log --format='%ct' -1 ${workBranch} -- ${basePath}/verify_report.md`,
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
    if (!workBranch) {
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
              `git log --format='%ct' -1 ${workBranch} -- ${basePath}/${expectedBuild}`,
              { encoding: 'utf-8', stdio: 'pipe' }
            ).trim();
            const vTime = execSync(
              `git log --format='%ct' -1 ${workBranch} -- ${basePath}/${expectedVerify}`,
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
 * @param branchPrefix - Configured branch prefix
 * @returns Copy-pasteable command
 */
function getNextAction(stage: string, slug: string, branchPrefix: string): string {
  if (stage === 'ready-for-plan') {
    return 'claude --agent ana-plan';
  }

  if (stage === 'ready-for-build') {
    return 'claude --agent ana-build';
  }

  if (stage === 'build-in-progress') {
    return `git checkout ${branchPrefix}${slug} && claude --agent ana-build`;
  }

  if (stage === 'ready-for-verify') {
    return `git checkout ${branchPrefix}${slug} && claude --agent ana-verify`;
  }

  if (stage === 'ready-for-re-verify') {
    return `git checkout ${branchPrefix}${slug} && claude --agent ana-verify`;
  }

  if (stage === 'needs-fixes') {
    return `git checkout ${branchPrefix}${slug} && claude --agent ana-build`;
  }

  if (stage === 'ready-to-merge') {
    return `Review PR, then: ana work complete ${slug}`;
  }

  // Multi-phase stages
  if (stage.includes('ready-for-build')) {
    return `git checkout ${branchPrefix}${slug} && claude --agent ana-build`;
  }

  if (stage.includes('ready-for-re-verify')) {
    return `git checkout ${branchPrefix}${slug} && claude --agent ana-verify`;
  }

  if (stage.includes('ready-for-verify')) {
    return `git checkout ${branchPrefix}${slug} && claude --agent ana-verify`;
  }

  if (stage.includes('build-in-progress')) {
    return `git checkout ${branchPrefix}${slug} && claude --agent ana-build`;
  }

  if (stage.includes('needs-fixes')) {
    return `git checkout ${branchPrefix}${slug} && claude --agent ana-build`;
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
    const artifactMark = (a: { exists: boolean; location?: string }) =>
      !a.exists ? chalk.red('✗') : a.location === 'untracked' ? chalk.yellow('⚠') : chalk.green('✓');
    const artifactLocation = (a: { exists: boolean; location?: string }) =>
      !a.exists ? 'missing' : a.location === 'untracked' ? 'untracked (run ana artifact save-all)' : (a.location || 'missing');

    console.log(`    scope.md         ${artifactMark(item.artifacts.scope)} ${artifactLocation(item.artifacts.scope)}`);
    console.log(`    plan.md          ${artifactMark(item.artifacts.plan)} ${artifactLocation(item.artifacts.plan)}`);

    // Show specs
    for (const spec of item.artifacts.specs) {
      console.log(`    ${spec.file.padEnd(16)} ${artifactMark(spec)} ${artifactLocation(spec)}`);
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
  const branchPrefix = readBranchPrefix(projectRoot);
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
    const artifacts = gatherArtifactState(slug, artifactBranch, onArtifactBranch, projectRoot, branchPrefix);

    // Skip empty directories (no scope = not real work)
    if (!artifacts.scope.exists) {
      continue;
    }

    const workBranch = getWorkBranch(slug, branchPrefix);
    const stage = determineStage(slug, artifacts, workBranch);
    const nextAction = getNextAction(stage, slug, branchPrefix);

    items.push({
      slug,
      totalPhases: artifacts.specs.length,
      artifacts,
      workBranch,
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

// ProofChain, ProofChainStats imported from types/proof.ts

/**
 * Write proof chain files (JSON and markdown)
 *
 * @param slug - Work item slug
 * @param proof - Proof summary data
 * @param projectRoot - Project root directory
 * @returns Chain health counts: total runs and cumulative findings
 */
async function writeProofChain(slug: string, proof: ProofSummary, projectRoot: string): Promise<ProofChainStats> {
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

  // UNKNOWN result warning (AC12)
  const completedPlanDir = path.join(anaDir, 'plans', 'completed', slug);
  if (proof.result === 'UNKNOWN') {
    const verifyReportPath = path.join(completedPlanDir, 'verify_report.md');
    if (fs.existsSync(verifyReportPath)) {
      console.error(`Warning: Entry '${slug}' has result UNKNOWN but a verify report exists. Check verify_report.md for a Result line.`);
    }
  }

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
    completed_at: new Date().toISOString(),
    modules_touched: modulesTouched,
    scope_summary: proof.scope_summary,
    findings: proof.findings.map((c, i) => ({
      ...c,
      id: `${slug}-C${i + 1}`,
      status: 'active' as const,
    } as ProofChainEntry['findings'][0])),
    rejection_cycles: proof.rejection_cycles,
    previous_failures: proof.previous_failures,
    build_concerns: proof.build_concerns ?? [],
  };

  // Assign status to new findings (AC5)
  for (const finding of entry.findings) {
    if (finding.category === 'upstream') {
      finding.status = 'lesson';
    } else {
      finding.status = 'active';
    }
  }

  // Resolve finding/build_concern file fields from basenames to full paths.
  // Shared cache avoids redundant globSync calls across all resolution passes.
  const globCache = new Map<string, string[]>();

  // New entry: resolve against its own modules_touched
  resolveFindingPaths(entry.findings, entry.modules_touched, projectRoot, globCache);
  resolveFindingPaths(entry.build_concerns, entry.modules_touched, projectRoot, globCache);

  // Maintenance counters
  let autoClosed = 0;
  let lessonsClassified = 0;

  // Existing entries: backfill (idempotent — already-resolved files are skipped)
  for (const existing of chain.entries) {
    // Migration: rename callouts → findings field (AC16)
    const existingAny = existing as unknown as Record<string, unknown>;
    if (existingAny['callouts'] && !existing.findings) {
      existing.findings = existingAny['callouts'] as ProofChainEntry['findings'];
      delete existingAny['callouts'];
    }

    resolveFindingPaths(existing.findings || [], existing.modules_touched || [], projectRoot, globCache);
    resolveFindingPaths(existing.build_concerns || [], existing.modules_touched || [], projectRoot, globCache);

    // Backfill status (AC4) — idempotent
    for (const finding of existing.findings || []) {
      if (!finding.status) {
        if (finding.category === 'upstream') {
          finding.status = 'lesson';
          lessonsClassified++;
        } else {
          finding.status = 'active';
        }
      }
    }

    // Backfill scope_summary (AC11)
    if (!existing.scope_summary) {
      const scopePath = path.join(anaDir, 'plans', 'completed', existing.slug, 'scope.md');
      existing.scope_summary = extractScopeSummary(scopePath);
    }

    // Remove dead seal_commit field from existing entries (idempotent)
    delete (existing as unknown as Record<string, unknown>)['seal_commit'];
  }

  // Phase ordering is load-bearing: backfill → reopen → resolve → stale.
  // Reopen MUST happen before resolveFindingPaths and before staleness.
  // If staleness ran first on still-closed findings, it would skip them.
  // Then reopens would activate them — but they'd never get checked by
  // corrected staleness logic. The phases ensure every finding passes
  // through the corrected checks exactly once.

  // Reopen wrongly-closed findings — reverse broken mechanical closures
  for (const existing of chain.entries) {
    for (const finding of existing.findings || []) {
      if (finding.closed_by !== 'mechanical') continue;

      const reason = finding.closed_reason;
      const shouldReopen =
        (typeof reason === 'string' && reason.startsWith('superseded by')) ||
        reason === 'file removed' ||
        (reason === 'code changed, anchor absent' && finding.category === 'upstream');

      if (shouldReopen) {
        finding.status = finding.category === 'upstream' ? 'lesson' : 'active';
        delete finding.closed_reason;
        delete finding.closed_at;
        delete finding.closed_by;
      }
    }
  }

  // Staleness checks — run after path resolution, reopen, and status assignment
  // Process all entries (existing + new)
  const allEntries = [...chain.entries, entry];
  const fileContentCache = new Map<string, string | null>();
  const globResultCache = new Map<string, string[]>();

  const readFileContent = (filePath: string): string | null => {
    if (fileContentCache.has(filePath)) return fileContentCache.get(filePath)!;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      fileContentCache.set(filePath, content);
      return content;
    } catch {
      fileContentCache.set(filePath, null);
      return null;
    }
  };

  for (const chainEntry of allEntries) {
    for (const finding of chainEntry.findings || []) {
      // Skip already-closed findings
      if (finding.status === 'closed') continue;

      // Upstream findings are institutional memory — not subject to staleness
      if (finding.category === 'upstream') continue;

      // Skip findings without file reference
      if (!finding.file) continue;

      const fullPath = path.join(projectRoot, finding.file);

      if (fs.existsSync(fullPath)) {
        // File exists — run anchor-absent check
        if (finding.anchor) {
          const content = readFileContent(fullPath);
          if (content !== null && !content.includes(finding.anchor)) {
            finding.status = 'closed';
            finding.closed_reason = 'code changed, anchor absent';
            finding.closed_at = new Date().toISOString();
            finding.closed_by = 'mechanical';
            autoClosed++;
          }
        }
      } else {
        // File does NOT exist at declared path — glob for the basename
        const basename = path.basename(finding.file);
        let matches = globResultCache.get(basename);
        if (matches === undefined) {
          matches = globSync('**/' + basename, {
            cwd: projectRoot,
            ignore: ['**/node_modules/**', '**/.ana/**'],
          });
          globResultCache.set(basename, matches);
        }

        if (matches.length === 0) {
          // Genuinely deleted — no file with this name exists anywhere
          finding.status = 'closed';
          finding.closed_reason = 'file removed';
          finding.closed_at = new Date().toISOString();
          finding.closed_by = 'mechanical';
          autoClosed++;
        }
        // 1+ matches → file exists elsewhere, conservative — skip
      }
    }
  }

  // Supersession removed — same-file + same-category heuristic can't
  // distinguish same-issue from different-issue without semantic judgment.

  chain.entries.push(entry);
  await fsPromises.writeFile(chainPath, JSON.stringify(chain, null, 2));

  // 2. Regenerate PROOF_CHAIN.md as quality dashboard
  const chainMdPath = path.join(anaDir, 'PROOF_CHAIN.md');

  // Compute chain health counts via shared utility
  const health = computeChainHealth(chain);
  const { chain_runs: runs, findings: { active: activeCount, closed: closedCount, lesson: lessonsCount, promoted: promotedCount, total: totalFindings } } = health;

  const dashboardMd = generateDashboard(chain.entries, { runs, active: activeCount, lessons: lessonsCount, promoted: promotedCount, closed: closedCount });
  await fsPromises.writeFile(chainMdPath, dashboardMd);

  const stats: ProofChainStats = {
    runs,
    findings: totalFindings,
    active: activeCount,
    lessons: lessonsCount,
    promoted: promotedCount,
    closed: closedCount,
  };

  if (autoClosed > 0 || lessonsClassified > 0) {
    stats.maintenance = { auto_closed: autoClosed, lessons_classified: lessonsClassified };
  }

  return stats;
}

/**
 * Complete a work item after PR merge
 *
 * @param slug - Work item slug to complete
 */
export async function completeWork(slug: string): Promise<void> {
  // 1. Read artifactBranch, branchPrefix, and coAuthor from ana.json
  const projectRoot = findProjectRoot();
  const artifactBranch = readArtifactBranch(projectRoot);
  const branchPrefix = readBranchPrefix(projectRoot);

  // Hoist coAuthor read — shared by recovery path (step 5) and main commit path (step 10)
  const anaJsonPath = path.join(projectRoot, '.ana', 'ana.json');
  let coAuthor = 'Ana <build@anatomia.dev>';
  try {
    const anaJsonContent = fs.readFileSync(anaJsonPath, 'utf-8');
    const config: { coAuthor?: string } = JSON.parse(anaJsonContent);
    coAuthor = config.coAuthor || 'Ana <build@anatomia.dev>';
  } catch { /* fallback to default */ }

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
    const remotes = execSync('git remote', { stdio: 'pipe', encoding: 'utf-8', cwd: projectRoot }).trim();
    if (remotes) {
      execSync('git pull --rebase', { stdio: 'pipe', encoding: 'utf-8', cwd: projectRoot });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('conflict') || errorMessage.includes('Cannot rebase')) {
      console.error(chalk.red('Error: Pull failed due to conflicts. Resolve conflicts and try again.'));
      process.exit(1);
    }
    // Non-conflict failures: warn and continue (matching saveArtifact's pattern)
    if (errorMessage) {
      console.error(chalk.yellow('⚠ Warning: Pull failed (network error). Continuing with local data.'));
      console.error(chalk.yellow('  Run `git pull` manually to sync before completing.'));
    }
  }

  // 5. Verify slug directory exists — with crash recovery
  const activePath = path.join(projectRoot, '.ana', 'plans', 'active', slug);
  const completedPath = path.join(projectRoot, '.ana', 'plans', 'completed', slug);

  if (!fs.existsSync(activePath)) {
    if (fs.existsSync(completedPath)) {
      // Check for uncommitted changes — indicates a failed prior run
      try {
        const porcelain = execSync('git status --porcelain .ana/', {
          encoding: 'utf-8', stdio: 'pipe', cwd: projectRoot,
        }).trim();
        if (porcelain) {
          // Recovery: retry the commit
          console.log(chalk.yellow('Recovering incomplete completion — retrying commit...'));
          execSync('git add .ana/plans/ .ana/proof_chain.json .ana/PROOF_CHAIN.md', {
            stdio: 'pipe', cwd: projectRoot,
          });
          const commitMessage = `[${slug}] Complete — archived to plans/completed\n\nCo-authored-by: ${coAuthor}`;
          execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe', cwd: projectRoot });
          try {
            execSync('git push', { stdio: 'pipe', cwd: projectRoot });
          } catch {
            console.error(chalk.yellow('Warning: Push failed. Changes committed locally. Run `git push` manually.'));
          }

          // Print summary from completed path
          const proof = generateProofSummary(completedPath);
          const chainPath = path.join(projectRoot, '.ana', 'proof_chain.json');
          let runs = 0;
          let activeCount = 0;
          if (fs.existsSync(chainPath)) {
            try {
              const chain = JSON.parse(fs.readFileSync(chainPath, 'utf-8'));
              runs = Array.isArray(chain.entries) ? chain.entries.length : 0;
              for (const e of chain.entries || []) {
                for (const f of e.findings || []) {
                  if (f.status === 'active' || !f.status) activeCount++;
                }
              }
            } catch { /* */ }
          }
          const statusIcon = proof.result === 'PASS' ? '✓' : '✗';
          console.log(`\n${statusIcon} ${proof.result} — ${proof.feature}`);
          console.log(`  ${proof.contract.covered}/${proof.contract.total} covered · ${proof.contract.satisfied}/${proof.contract.total} satisfied · ${proof.deviations.length} deviation${proof.deviations.length !== 1 ? 's' : ''}`);
          console.log(chalk.gray(`  Chain: ${runs} ${runs !== 1 ? 'runs' : 'run'} · ${activeCount} active finding${activeCount !== 1 ? 's' : ''}`));
          return;
        }
      } catch { /* git status failed — treat as genuinely completed */ }

      console.log(chalk.gray(`Work item \`${slug}\` was already completed.`));
      process.exit(0);
    }
    console.error(chalk.red(`Error: No active work found for \`${slug}\`.`));
    process.exit(1);
  }

  // 6. Verify work branch was merged (optional - branch might be deleted)
  //    Prune stale remote refs — squash merge + --delete-branch removes
  //    the remote branch on GitHub but local refs persist until pruned.
  try {
    execSync('git fetch --prune origin', { stdio: 'pipe', cwd: projectRoot });
  } catch { /* offline — continue with local state */ }

  const workBranchName = `${branchPrefix}${slug}`;
  const workBranchExists = getWorkBranch(slug, branchPrefix);
  if (workBranchExists) {
    // Check if remote branch still exists after prune
    const hasRemote = (() => {
      try {
        const output = execSync(`git branch -r --list "origin/${workBranchName}"`, { encoding: 'utf-8', stdio: 'pipe', cwd: projectRoot }).trim();
        return output.length > 0;
      } catch { return false; }
    })();

    if (hasRemote) {
      // Remote still exists — verify with is-ancestor (regular merge)
      let merged = false;
      try {
        execSync(`git merge-base --is-ancestor ${workBranchName} HEAD`, { stdio: 'pipe', cwd: projectRoot });
        merged = true;
      } catch {
        // is-ancestor failed — might be squash merge. Check via gh CLI.
        try {
          const prState = execSync(
            `gh pr view ${workBranchName} --json state -q .state`,
            { encoding: 'utf-8', stdio: 'pipe' }
          ).trim();
          merged = prState === 'MERGED';
        } catch { /* gh not available or no PR — fall through to error */ }
      }
      if (!merged) {
        console.error(chalk.red(`Error: \`${workBranchName}\` has not been merged into \`${artifactBranch}\`.`));
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

  // 8b. Completeness check — verify both reports were saved through the pipeline
  const savesJsonPath = path.join(activePath, '.saves.json');
  let savesData: Record<string, { saved_at?: string; hash?: string }> = {};
  if (fs.existsSync(savesJsonPath)) {
    try {
      savesData = JSON.parse(fs.readFileSync(savesJsonPath, 'utf-8'));
    } catch { /* treat as empty */ }
  }

  const buildSave = savesData['build-report'];
  const verifySave = savesData['verify-report'];
  const buildMissing = !buildSave || !buildSave.saved_at || !buildSave.hash;
  const verifyMissing = !verifySave || !verifySave.saved_at || !verifySave.hash;

  if (buildMissing && verifyMissing) {
    console.error(chalk.red('Error: Artifacts not saved through the pipeline:'));
    console.error(chalk.red(`  - build-report: run \`ana artifact save build-report ${slug}\``));
    console.error(chalk.red(`  - verify-report: run \`ana artifact save verify-report ${slug}\``));
    process.exit(1);
  } else if (buildMissing) {
    console.error(chalk.red(`Error: build-report was not saved through the pipeline.`));
    console.error(chalk.red(`Run: ana artifact save build-report ${slug}`));
    process.exit(1);
  } else if (verifyMissing) {
    console.error(chalk.red(`Error: verify-report was not saved through the pipeline.`));
    console.error(chalk.red(`Run: ana artifact save verify-report ${slug}`));
    process.exit(1);
  }

  // 9. Move the directory
  const completedDir = path.join(projectRoot, '.ana', 'plans', 'completed');
  await fsPromises.mkdir(completedDir, { recursive: true });
  await fsPromises.cp(activePath, completedPath, { recursive: true });
  await fsPromises.rm(activePath, { recursive: true, force: true });

  // 9a. Generate proof summary and write proof chain
  const proof = generateProofSummary(completedPath);
  const stats = await writeProofChain(slug, proof, projectRoot);

  // 10. Stage and commit
  try {
    execSync('git add .ana/plans/ .ana/proof_chain.json .ana/PROOF_CHAIN.md', { stdio: 'pipe', cwd: projectRoot });
    const commitMessage = `[${slug}] Complete — archived to plans/completed\n\nCo-authored-by: ${coAuthor}`;
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe', cwd: projectRoot });
  } catch {
    console.error(chalk.red(`Error: Failed to commit. Run \`ana work complete ${slug}\` to retry.`));
    process.exit(1);
  }

  // 11. Push
  try {
    execSync('git push', { stdio: 'pipe', cwd: projectRoot });
  } catch {
    console.error(chalk.yellow('Warning: Push failed. Changes committed locally. Run `git push` manually.'));
    // Don't exit - commit succeeded
  }

  // 12. Delete work branch (cleanup)
  try {
    execSync(`git branch -d ${workBranchName}`, { stdio: 'pipe', cwd: projectRoot });
  } catch {
    // Silently continue if branch doesn't exist or was already deleted
  }

  try {
    execSync(`git push origin --delete ${workBranchName}`, { stdio: 'pipe', cwd: projectRoot });
  } catch {
    // Silently continue if remote branch doesn't exist or was already deleted
  }

  // 13. Print summary (3-line proof summary + optional maintenance)
  const statusIcon = proof.result === 'PASS' ? '✓' : '✗';
  console.log(`\n${statusIcon} ${proof.result} — ${proof.feature}`);
  console.log(`  ${proof.contract.covered}/${proof.contract.total} covered · ${proof.contract.satisfied}/${proof.contract.total} satisfied · ${proof.deviations.length} deviation${proof.deviations.length !== 1 ? 's' : ''}`);
  console.log(chalk.gray(`  Chain: ${stats.runs} ${stats.runs !== 1 ? 'runs' : 'run'} · ${stats.active} active finding${stats.active !== 1 ? 's' : ''}`));
  if (stats.maintenance) {
    console.log(chalk.gray(`  Maintenance: ${stats.maintenance.auto_closed} auto-closed, ${stats.maintenance.lessons_classified} classified as lessons`));
  }

  // Nudge: suggest proof audit when findings pile up AND no human closures exist
  if (stats.active > 20) {
    let hasHumanClosure = false;
    const chainPath = path.join(projectRoot, '.ana', 'proof_chain.json');
    try {
      const chainData: ProofChain = JSON.parse(fs.readFileSync(chainPath, 'utf-8'));
      for (const e of chainData.entries) {
        for (const f of e.findings || []) {
          if (f.closed_by === 'human') {
            hasHumanClosure = true;
            break;
          }
        }
        if (hasHumanClosure) break;
      }
    } catch { /* chain read failed — skip nudge */ }

    if (!hasHumanClosure) {
      console.log(chalk.cyan('→ Run `ana proof audit` to review active findings'));
    }
  }
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
