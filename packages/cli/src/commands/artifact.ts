/**
 * ana artifact save - Commit pipeline artifacts with branch validation
 *
 * Usage:
 *   ana artifact save scope my-feature
 *   ana artifact save spec-2 my-feature
 *   ana artifact save build-report my-feature
 *   ana artifact save verify-report-1 my-feature
 *
 * Exit codes:
 *   0 - Success
 *   1 - Validation error or git operation failed
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { execSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import * as yaml from 'yaml';
import { runContractPreCheck } from './verify.js';
import { findProjectRoot } from '../utils/validators.js';
// readArtifactBranch + getCurrentBranch moved to utils/git-operations.ts (Item 13).
// artifact.ts still uses them internally; pr.ts and work.ts now import directly
// from utils/ instead of cross-command-importing from here.
import { readArtifactBranch, readBranchPrefix, getCurrentBranch } from '../utils/git-operations.js';

/**
 * Save metadata entry for .saves.json
 */
interface SaveMetadata {
  saved_at: string;
  hash: string;
}

/**
 * Write save metadata to .saves.json after artifact commit
 *
 * @param slugDir - Path to the slug directory
 * @param artifactType - The artifact type key (e.g., 'scope', 'spec', 'contract')
 * @param content - The artifact content for hashing
 */
function writeSaveMetadata(slugDir: string, artifactType: string, content: string): void {
  const savesPath = path.join(slugDir, '.saves.json');

  // Read existing .saves.json or start fresh
  let saves: Record<string, SaveMetadata> = {};
  if (fs.existsSync(savesPath)) {
    try {
      saves = JSON.parse(fs.readFileSync(savesPath, 'utf-8'));
    } catch {
      // If parse fails, start fresh
      saves = {};
    }
  }

  // Compute SHA256 of content
  const hash = createHash('sha256').update(content).digest('hex');

  // Write entry for this artifact type
  saves[artifactType] = {
    saved_at: new Date().toISOString(),
    hash: `sha256:${hash}`,
  };

  fs.writeFileSync(savesPath, JSON.stringify(saves, null, 2));
}

/**
 * Artifact type information after parsing
 */
interface ArtifactTypeInfo {
  category: 'planning' | 'build-verify';
  fileName: string;
  displayName: string;
  baseType: string;
}

/**
 * Parse artifact type string and extract metadata
 *
 * @param type - Raw type string (e.g., "scope", "spec-2", "build-report", "verify-report-1", "contract")
 * @returns Parsed artifact information
 */
function parseArtifactType(type: string): ArtifactTypeInfo | null {
  // Match valid types with optional number suffix
  const match = type.match(/^(scope|plan|spec|contract|build-report|verify-report)(?:-(\d+))?$/);

  if (!match) {
    return null;
  }

  const [, baseType, number] = match;

  // Determine category
  const category = baseType === 'build-report' || baseType === 'verify-report'
    ? 'build-verify'
    : 'planning';

  // Determine file name
  let fileName: string;
  if (baseType === 'scope' || baseType === 'plan') {
    fileName = `${baseType}.md`;
  } else if (baseType === 'spec') {
    fileName = number ? `spec-${number}.md` : 'spec.md';
  } else if (baseType === 'contract') {
    fileName = 'contract.yaml';
  } else if (baseType === 'build-report') {
    fileName = number ? `build_report_${number}.md` : 'build_report.md';
  } else if (baseType === 'verify-report') {
    fileName = number ? `verify_report_${number}.md` : 'verify_report.md';
  } else {
    return null;
  }

  // Determine display name
  let displayName: string;
  if (baseType === 'scope') {
    displayName = 'Scope';
  } else if (baseType === 'plan') {
    displayName = 'Plan';
  } else if (baseType === 'spec') {
    displayName = number ? `Spec ${number}` : 'Spec';
  } else if (baseType === 'contract') {
    displayName = 'Contract';
  } else if (baseType === 'build-report') {
    displayName = number ? `Build report ${number}` : 'Build report';
  } else if (baseType === 'verify-report') {
    displayName = number ? `Verify report ${number}` : 'Verify report';
  } else {
    displayName = type;
  }

  return { category, fileName, displayName, baseType };
}

// readArtifactBranch + getCurrentBranch moved to utils/git-operations.ts
// (Item 13). Imported at the top of this file for internal use.

/**
 * Validate plan.md format
 *
 * @param filePath - Path to plan.md
 * @returns Error message if invalid, null if valid
 */
function validatePlanFormat(filePath: string): string | null {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Check for ## Phases heading
  if (!content.includes('## Phases')) {
    return "Missing '## Phases' heading. Plan must contain a '## Phases' section with checkbox items.";
  }

  // Check for at least one checkbox
  const checkboxPattern = /- \[([ x])\]/;
  if (!checkboxPattern.test(content)) {
    return "No checkbox items found. Plan must contain at least one '- [ ]' or '- [x]' checkbox.";
  }

  // Check that checkbox lines contain Spec: reference
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue; // noUncheckedIndexedAccess guard
    if (checkboxPattern.test(line)) {
      // Check this line and next 2 lines for Spec: reference
      const nextLines = lines.slice(i, i + 3).join('\n');
      if (!nextLines.includes('Spec:')) {
        return `Checkbox item "${line.trim()}" is missing a 'Spec:' reference. Each phase must reference its spec file.`;
      }
    }
  }

  return null; // valid
}

/**
 * Validate verify report format
 *
 * @param filePath - Path to verify_report.md
 * @returns Error message if invalid, null if valid
 */
function validateVerifyReportFormat(filePath: string): string | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Check first 10 lines for Result line
  const firstTenLines = lines.slice(0, 10).join('\n');
  const resultPattern = /\*\*Result:\*\*\s*(PASS|FAIL)/i;

  if (!resultPattern.test(firstTenLines)) {
    return "Missing '**Result:** PASS' or '**Result:** FAIL' in the first 10 lines.\nThe Result line is machine-parsed by the pipeline. It must be present.";
  }

  return null; // valid
}

/**
 * Validate scope format
 *
 * @param filePath - Path to scope.md
 * @returns Error message if invalid, null if valid
 */
function validateScopeFormat(filePath: string): string | null {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Check for at least 3 acceptance criteria
  const acPattern = /^-\s+(AC\d+|##?\s*AC|\*\*AC)/mi;
  const acMatches = content.match(new RegExp(acPattern.source, 'gmi'));
  if (!acMatches || acMatches.length < 3) {
    return "Missing acceptance criteria. Scope must contain at least 3 acceptance criteria (lines starting with '- AC').";
  }

  // Check for Structural Analog section
  if (!content.match(/###?\s+Structural\s+Analog/i)) {
    return "Missing 'Structural Analog' section. Every scope needs a structural analog to guide implementation.";
  }

  // Check for Intent section with content
  if (!content.match(/###?\s+Intent/i)) {
    return "Missing 'Intent' section. Scope must explain the purpose of this work.";
  }

  // Extract content between Intent heading and next section
  const lines = content.split('\n');
  let inIntent = false;
  const intentLines: string[] = [];
  for (const line of lines) {
    if (/^##\s+Intent/i.test(line)) {
      inIntent = true;
      continue;
    }
    if (inIntent) {
      if (/^##/.test(line)) break; // Next section starts
      intentLines.push(line);
    }
  }
  const intentContent = intentLines.join('\n').trim();
  if (!intentContent) {
    return "Empty 'Intent' section. Scope must explain the purpose of this work.";
  }

  return null; // valid
}

/**
 * Validate spec format
 *
 * @param filePath - Path to spec.md or spec-N.md
 * @returns Error message if invalid, null if valid, or warning string for non-blocking issues
 */
function validateSpecFormat(filePath: string): { error?: string; warning?: string } {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Note: file_changes has moved to contract.yaml in S8 — no longer required in spec

  // Check for Build Brief section
  if (!content.match(/###?\s+Build\s+Brief/i)) {
    return { error: "Missing 'Build Brief' section. Spec must include build guidance for the implementer." };
  }

  // Check for approximate baseline (warning only)
  const baselinePattern = /(Current\s+test|Current\s+tests)/i;
  const hasBaseline = baselinePattern.test(content);
  if (hasBaseline) {
    const approximatePattern = /[~]|approx/i;
    const lines = content.split('\n');
    for (const line of lines) {
      if (baselinePattern.test(line) && approximatePattern.test(line)) {
        return { warning: "Build baseline contains approximations (~). Run the test command to get exact counts." };
      }
    }
  }

  return {}; // valid
}


/**
 * Valid matchers for contract assertions
 */
const VALID_MATCHERS = ['equals', 'exists', 'contains', 'greater', 'truthy', 'not_equals', 'not_contains'];
const VALUE_REQUIRED_MATCHERS = ['equals', 'contains', 'greater', 'not_equals', 'not_contains'];

/**
 * Contract assertion structure
 */
interface ContractAssertion {
  id?: string;
  says?: string;
  block?: string;
  target?: string;
  matcher?: string;
  value?: unknown;
}

/**
 * Contract file change structure
 */
interface ContractFileChange {
  path?: string;
  action?: string;
}

/**
 * Contract schema structure
 */
interface ContractSchema {
  version?: string;
  sealed_by?: string;
  feature?: string;
  assertions?: ContractAssertion[];
  file_changes?: ContractFileChange[];
}

/**
 * Validate contract format
 *
 * @param filePath - Path to contract.yaml
 * @returns Array of error messages, empty if valid
 */
function validateContractFormat(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const errors: string[] = [];

  // 1. Parse YAML
  let contract: ContractSchema;
  try {
    contract = yaml.parse(content);
  } catch (e) {
    return [`YAML parse error: ${e instanceof Error ? e.message : 'Invalid YAML'}`];
  }

  if (!contract || typeof contract !== 'object') {
    return ['Contract must be a YAML object'];
  }

  // 2. Header fields
  if (!contract.version) {
    errors.push('Missing "version" field');
  }
  if (!contract.sealed_by) {
    errors.push('Missing "sealed_by" field');
  }
  if (!contract.feature || typeof contract.feature !== 'string' || !contract.feature.trim()) {
    errors.push('Missing or empty "feature" field');
  }

  // 3. Assertions array
  if (!contract.assertions) {
    errors.push('Missing "assertions" array');
  } else if (!Array.isArray(contract.assertions)) {
    errors.push('"assertions" must be an array');
  } else if (contract.assertions.length === 0) {
    errors.push('"assertions" array cannot be empty');
  } else {
    // Track IDs for uniqueness check
    const seenIds = new Set<string>();

    for (let i = 0; i < contract.assertions.length; i++) {
      const assertion = contract.assertions[i];
      if (!assertion) continue; // noUncheckedIndexedAccess guard
      const prefix = assertion.id ? `Assertion ${assertion.id}` : `Assertion ${i + 1}`;

      // Required fields
      if (!assertion.id || typeof assertion.id !== 'string') {
        errors.push(`${prefix}: missing or invalid "id" field`);
      } else {
        if (seenIds.has(assertion.id)) {
          errors.push(`Duplicate assertion ID: ${assertion.id}`);
        }
        seenIds.add(assertion.id);
      }

      if (!assertion.says || typeof assertion.says !== 'string' || !assertion.says.trim()) {
        errors.push(`${prefix}: missing or empty "says" field`);
      }

      if (!assertion.block || typeof assertion.block !== 'string') {
        errors.push(`${prefix}: missing "block" field`);
      }

      if (!assertion.target || typeof assertion.target !== 'string') {
        errors.push(`${prefix}: missing "target" field`);
      }

      // Matcher validation
      if (!assertion.matcher) {
        errors.push(`${prefix}: missing "matcher" field`);
      } else if (!VALID_MATCHERS.includes(assertion.matcher)) {
        errors.push(`${prefix}: unknown matcher "${assertion.matcher}" (valid: ${VALID_MATCHERS.join(', ')})`);
      } else if (VALUE_REQUIRED_MATCHERS.includes(assertion.matcher) && assertion.value === undefined) {
        errors.push(`${prefix}: matcher "${assertion.matcher}" requires "value" field`);
      }
    }
  }

  // 4. File changes
  if (!contract.file_changes) {
    errors.push('Missing "file_changes" array');
  } else if (!Array.isArray(contract.file_changes)) {
    errors.push('"file_changes" must be an array');
  } else if (contract.file_changes.length === 0) {
    errors.push('"file_changes" array cannot be empty');
  } else {
    const validActions = ['create', 'modify', 'delete'];
    for (let i = 0; i < contract.file_changes.length; i++) {
      const change = contract.file_changes[i];
      if (!change) continue; // noUncheckedIndexedAccess guard
      const prefix = `file_changes[${i}]`;

      if (!change.path || typeof change.path !== 'string') {
        errors.push(`${prefix}: missing "path" field`);
      }

      if (!change.action || !validActions.includes(change.action)) {
        errors.push(`${prefix}: invalid "action" (must be: ${validActions.join(', ')})`);
      }
    }
  }

  return errors;
}

/**
 * Validate build report format
 *
 * @param filePath - Path to build_report.md or build_report_N.md
 * @returns Error message if invalid, null if valid
 */
function validateBuildReportFormat(filePath: string): string | null {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Check for required sections
  const requiredSections = [
    { pattern: /###?\s+Deviation/i, name: 'Deviations' },
    { pattern: /###?\s+Open\s+Issue/i, name: 'Open Issues' },
    { pattern: /###?\s+(Acceptance\s+Criteria|AC\s+Coverage|Criteria\s+Coverage)/i, name: 'AC Coverage' },
    { pattern: /###?\s+PR\s+Summary/i, name: 'PR Summary' }
  ];

  for (const section of requiredSections) {
    if (!section.pattern.test(content)) {
      return `Missing '${section.name}' section. Build report must document all required sections.`;
    }
  }

  return null; // valid
}

/**
 * Validate that we're on the correct branch for this artifact type
 *
 * @param typeInfo - Parsed artifact type information
 * @param currentBranch - Current git branch
 * @param artifactBranch - Configured artifact branch from ana.json
 * @param slug - Work item slug
 * @param branchPrefix - Configured branch prefix
 */
function validateBranch(
  typeInfo: ArtifactTypeInfo,
  currentBranch: string,
  artifactBranch: string,
  slug: string,
  branchPrefix: string
): void {
  if (typeInfo.category === 'planning') {
    // Planning artifacts must be on artifact branch
    if (currentBranch !== artifactBranch) {
      console.error(chalk.red(`Error: You're on \`${currentBranch}\`. ${typeInfo.displayName} must be saved to \`${artifactBranch}\`.`));
      console.error(chalk.gray(`Run: git checkout ${artifactBranch} && git pull`));
      process.exit(1);
    }
  } else {
    // Build/verify artifacts must NOT be on artifact branch
    if (currentBranch === artifactBranch) {
      console.error(chalk.red(`Error: You're on \`${artifactBranch}\`. ${typeInfo.displayName} belongs on a feature branch.`));
      console.error(chalk.gray(`Run: git checkout ${branchPrefix}${slug}`));
      process.exit(1);
    }
  }
}

/**
 * Save an artifact to git with appropriate validation and commit
 *
 * @param type - Artifact type (e.g., "scope", "spec-2", "build-report")
 * @param slug - Work item slug (e.g., "add-status-command")
 */
export function saveArtifact(type: string, slug: string): void {
  // 1. Parse type
  const typeInfo = parseArtifactType(type);
  if (!typeInfo) {
    console.error(chalk.red(`Error: Unknown artifact type \`${type}\`.`));
    console.error(chalk.gray('Valid types: scope, plan, spec, spec-N, contract, build-report, build-report-N, verify-report, verify-report-N'));
    process.exit(1);
  }

  // 2. Resolve project root early — needed for readArtifactBranch and throughout
  const projectRoot = findProjectRoot();

  // 3. Read artifactBranch and branchPrefix from ana.json
  const artifactBranch = readArtifactBranch(projectRoot);
  const branchPrefix = readBranchPrefix(projectRoot);

  // 4. Get current branch
  const currentBranch = getCurrentBranch();
  if (!currentBranch) {
    console.error(chalk.red('Error: Not a git repository. `ana artifact save` requires git.'));
    process.exit(1);
  }

  // 5. Validate branch
  validateBranch(typeInfo, currentBranch, artifactBranch, slug, branchPrefix);

  // 6. Resolve file path
  let filePath = path.join('.ana', 'plans', 'active', slug, typeInfo.fileName);

  // 6a. Auto-rename fallback for multi-spec: if build_report_1.md doesn't exist
  // but build_report.md does, rename it. Same for verify_report. Build agents
  // commonly write the default filename instead of the phase-numbered one.
  const isNumbered = typeInfo.fileName.match(/_\d+\.md$/);
  if (!fs.existsSync(filePath) && isNumbered) {
    const defaultName = typeInfo.baseType === 'build-report' ? 'build_report.md'
      : typeInfo.baseType === 'verify-report' ? 'verify_report.md' : null;
    if (defaultName) {
      const defaultPath = path.join('.ana', 'plans', 'active', slug, defaultName);
      if (fs.existsSync(defaultPath)) {
        fs.renameSync(defaultPath, filePath);
        console.log(chalk.gray(`Renamed ${defaultName} → ${typeInfo.fileName}`));
      }
    }
  }

  // 6b. Verify file exists
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`Error: No ${typeInfo.displayName.toLowerCase()} found at \`${filePath}\`.`));
    console.error(chalk.gray('Write the file first, then run this command.'));
    process.exit(1);
  }

  // 6a. Validate format for all artifact types
  if (typeInfo.baseType === 'plan') {
    const error = validatePlanFormat(filePath);
    if (error) {
      console.error(chalk.red(`Error: plan.md format invalid.\n${error}`));
      console.error(chalk.dim("Run 'ana work status' to see the expected format."));
      process.exit(1);
    }
  }

  if (typeInfo.baseType === 'verify-report') {
    const error = validateVerifyReportFormat(filePath);
    if (error) {
      console.error(chalk.red(`Error: verify_report.md format invalid.\n${error}`));
      process.exit(1);
    }

    // Auto pre-check for contract mode
    const slugDir = path.join(projectRoot, '.ana', 'plans', 'active', slug);
    const contractPath = path.join(slugDir, 'contract.yaml');

    if (fs.existsSync(contractPath)) {
      const preCheckResult = runContractPreCheck(slug, projectRoot);

      // TAMPERED blocks save
      if (preCheckResult.seal === 'TAMPERED') {
        console.error(chalk.red('ERROR: Contract tampered since plan commit. Cannot save verify report.'));
        console.error(chalk.gray('The contract was modified after it was sealed by the planner.'));
        console.error(chalk.gray('This invalidates the verification. Re-plan or restore the contract.'));
        process.exit(1);
      }

      // UNCOVERED warns but proceeds
      if (preCheckResult.summary.uncovered > 0) {
        console.warn(chalk.yellow(`WARNING: ${preCheckResult.summary.uncovered} contract assertions uncovered:`));
        preCheckResult.assertions
          .filter(a => a.status === 'UNCOVERED')
          .forEach(a => console.warn(chalk.yellow(`  ${a.id}  ✗ UNCOVERED  "${a.says}"`)));
        console.warn(chalk.gray('Verify report saved. Uncovered assertions will appear in the proof.'));
      }

      // Store pre-check results in .saves.json
      const savesPath = path.join(slugDir, '.saves.json');
      let saves: Record<string, unknown> = {};
      if (fs.existsSync(savesPath)) {
        try {
          saves = JSON.parse(fs.readFileSync(savesPath, 'utf-8'));
        } catch {
          // Ignore parse errors
        }
      }

      saves['pre-check'] = {
        seal: preCheckResult.seal,
        seal_hash: preCheckResult.sealHash,
        assertions: preCheckResult.assertions,
        covered: preCheckResult.summary.covered,
        uncovered: preCheckResult.summary.uncovered,
        run_at: new Date().toISOString(),
      };

      fs.writeFileSync(savesPath, JSON.stringify(saves, null, 2));
    }
  }

  if (typeInfo.baseType === 'scope') {
    const error = validateScopeFormat(filePath);
    if (error) {
      console.error(chalk.red(`Error: scope.md format invalid.\n${error}`));
      process.exit(1);
    }
  }

  if (typeInfo.baseType === 'spec') {
    const result = validateSpecFormat(filePath);
    if (result.error) {
      console.error(chalk.red(`Error: spec.md format invalid.\n${result.error}`));
      process.exit(1);
    }
    if (result.warning) {
      console.warn(chalk.yellow(`Warning: ${result.warning}`));
    }
  }

  if (typeInfo.baseType === 'build-report') {
    const error = validateBuildReportFormat(filePath);
    if (error) {
      console.error(chalk.red(`Error: build_report.md format invalid.\n${error}`));
      process.exit(1);
    }
  }

  if (typeInfo.baseType === 'contract') {
    const errors = validateContractFormat(filePath);
    if (errors.length > 0) {
      console.error(chalk.red('Contract validation failed:'));
      for (const error of errors) {
        console.error(chalk.red(`  - ${error}`));
      }
      process.exit(1);
    }
  }

  // 7b. Check if file is tracked (before staging, for create vs update message)
  const isTracked = spawnSync('git', ['ls-files', '--error-unmatch', filePath], {
    cwd: projectRoot,
    stdio: 'pipe'
  }).status === 0;

  // 7. Pull before commit (artifact branch only)
  if (typeInfo.category === 'planning') {
    try {
      // Check if remote exists first
      const remotes = execSync('git remote', { stdio: 'pipe', encoding: 'utf-8' }).trim();
      if (remotes) {
        execSync('git pull --rebase', { stdio: 'pipe', encoding: 'utf-8' });
      }
      // If no remotes, skip pull (e.g., in tests or new repos)
    } catch (error) {
      // Only error if it's an actual conflict, not a "no remote" error
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('conflict') || errorMessage.includes('Cannot rebase')) {
        console.error(chalk.red('Error: Pull failed due to conflicts. Resolve conflicts and try again.'));
        process.exit(1);
      }
      // Otherwise, continue (e.g., no upstream branch configured yet)
    }
  }

  // 8. Stage the artifact file(s)
  try {
    execSync(`git add ${filePath}`, { stdio: 'pipe' });

    // Special case: verify-report also stages plan.md if it exists
    if (type.startsWith('verify-report')) {
      const planPath = path.join('.ana', 'plans', 'active', slug, 'plan.md');
      if (fs.existsSync(planPath)) {
        execSync(`git add ${planPath}`, { stdio: 'pipe' });
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error: Failed to stage files. ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }

  // 8a. Check if there are staged changes
  const diffResult = spawnSync('git', ['diff', '--staged', '--quiet'], { cwd: projectRoot });
  if (diffResult.status === 0) {
    // status 0 means no differences — nothing to commit
    console.log(chalk.yellow('No changes to save — artifact is already up to date.'));
    process.exit(0);
  }

  // 8b. Write .saves.json and stage it alongside the artifact.
  // Done AFTER the no-changes check so unchanged artifacts don't trigger
  // a commit just from .saves.json metadata.
  const slugDir2 = path.join(projectRoot, '.ana', 'plans', 'active', slug);
  const artifactContent = fs.readFileSync(filePath, 'utf-8');
  writeSaveMetadata(slugDir2, typeInfo.baseType, artifactContent);
  const savesPath = path.join(slugDir2, '.saves.json');
  if (fs.existsSync(savesPath)) {
    try { execSync(`git add ${savesPath}`, { stdio: 'pipe' }); } catch { /* */ }
  }

  // 9. Commit
  // Read coAuthor from ana.json
  const anaJsonPath = path.join(projectRoot, '.ana', 'ana.json');
  let coAuthor = 'Ana <build@anatomia.dev>';
  try {
    const anaJsonContent = fs.readFileSync(anaJsonPath, 'utf-8');
    const config: { coAuthor?: string } = JSON.parse(anaJsonContent);
    coAuthor = config.coAuthor || 'Ana <build@anatomia.dev>';
  } catch {
    // Use fallback if ana.json can't be read
  }

  const prefix = isTracked ? 'Update: ' : '';
  const commitMessage = `[${slug}] ${prefix}${typeInfo.displayName}\n\nCo-authored-by: ${coAuthor}`;
  try {
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe' });
  } catch (error) {
    console.error(chalk.red(`Error: Commit failed. ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }

  // 9b. Capture modules_touched at build-report time (when the feature branch
  // definitely exists and all code is committed). Stored in .saves.json for
  // proof chain to read at work-complete time.
  if (typeInfo.baseType === 'build-report') {
    try {
      const artBranch = readArtifactBranch(projectRoot);
      const mergeBase = execSync(
        `git merge-base ${artBranch} HEAD`,
        { encoding: 'utf-8', cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      const diffOutput = execSync(
        `git diff ${mergeBase} --name-only -- . ':!.ana'`,
        { encoding: 'utf-8', cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      const modulesList = diffOutput ? diffOutput.split('\n').filter(Boolean) : [];

      const savesPath2 = path.join(slugDir2, '.saves.json');
      let savesData: Record<string, unknown> = {};
      if (fs.existsSync(savesPath2)) {
        try { savesData = JSON.parse(fs.readFileSync(savesPath2, 'utf-8')); } catch { /* */ }
      }
      savesData['modules_touched'] = modulesList;
      fs.writeFileSync(savesPath2, JSON.stringify(savesData, null, 2));
    } catch { /* merge-base or diff failed — modules_touched stays empty */ }
  }

  // 10. Push (artifact branch only)
  if (typeInfo.category === 'planning') {
    try {
      execSync('git push', { stdio: 'pipe' });
    } catch (_error) {
      console.error(chalk.yellow('Warning: Push failed. Artifact committed locally. Run `git push` manually.'));
      // Don't exit - commit succeeded
    }
  }

  // Push build-verify artifacts to feature branch
  if (typeInfo.category === 'build-verify') {
    try {
      execSync('git push', { stdio: 'pipe' });
    } catch (_error) {
      console.error(chalk.yellow(
        'Warning: Push failed. Artifact committed locally. Run `git push` manually.'
      ));
    }
  }

  // 11. Print success
  if (typeInfo.category === 'planning') {
    console.log(chalk.green(`✓ Saved ${typeInfo.displayName} for \`${slug}\` to \`${artifactBranch}\`.`));

    // 11a. Warn about unsaved siblings in the same plan directory
    const planDir = path.join(projectRoot, '.ana', 'plans', 'active', slug);
    if (fs.existsSync(planDir)) {
      const PLANNING_ARTIFACTS = ['scope.md', 'plan.md', 'spec.md', 'contract.yaml'];
      const unsaved: string[] = [];
      for (const name of PLANNING_ARTIFACTS) {
        const filePath = path.join(planDir, name);
        if (fs.existsSync(filePath) && name !== path.basename(typeInfo.fileName)) {
          try {
            execSync(`git ls-files --error-unmatch ${path.relative(projectRoot, filePath)}`, { stdio: 'pipe', cwd: projectRoot });
          } catch {
            unsaved.push(name);
          }
        }
      }
      // Also check for numbered specs (spec-1.md, spec-2.md, etc.)
      try {
        const entries = fs.readdirSync(planDir);
        for (const entry of entries) {
          if (entry.match(/^spec-\d+\.md$/) && entry !== path.basename(typeInfo.fileName)) {
            const filePath = path.join(planDir, entry);
            try {
              execSync(`git ls-files --error-unmatch ${path.relative(projectRoot, filePath)}`, { stdio: 'pipe', cwd: projectRoot });
            } catch {
              unsaved.push(entry);
            }
          }
        }
      } catch { /* readdir failed */ }

      if (unsaved.length > 0) {
        console.log(chalk.yellow(`⚠ ${unsaved.length} unsaved artifact${unsaved.length > 1 ? 's' : ''} in plan directory: ${unsaved.join(', ')}`));
        console.log(chalk.yellow(`  Run \`ana artifact save-all ${slug}\` to save everything.`));
      }
    }
  } else {
    console.log(chalk.green(`✓ Saved ${typeInfo.displayName} for \`${slug}\` on \`${currentBranch}\`.`));
  }
}

/**
 * Save all artifacts in a plan directory atomically
 *
 * @param slug - Work item slug
 */
export function saveAllArtifacts(slug: string): void {
  const projectRoot = findProjectRoot();
  const planDir = path.join(projectRoot, '.ana/plans/active', slug);

  // 1. Verify plan directory exists
  if (!fs.existsSync(planDir)) {
    console.error(chalk.red(`Error: No active work found for '${slug}'.`));
    console.error(chalk.gray('Run `ana work status` to see active work items.'));
    process.exit(1);
  }

  // 2. Scan for artifacts
  const artifacts: Array<{ file: string; type: string; typeInfo: ArtifactTypeInfo; path: string }> = [];
  const entries = fs.readdirSync(planDir);

  for (const entry of entries) {
    // Match recognized artifact patterns
    let type: string | null = null;

    if (entry === 'plan.md') {
      type = 'plan';
    } else if (entry === 'spec.md') {
      type = 'spec';
    } else if (entry.match(/^spec-\d+\.md$/)) {
      const num = entry.match(/^spec-(\d+)\.md$/)?.[1];
      type = `spec-${num}`;
    } else if (entry === 'contract.yaml') {
      type = 'contract';
    } else if (entry === 'build_report.md') {
      type = 'build-report';
    } else if (entry.match(/^build_report_\d+\.md$/)) {
      const num = entry.match(/^build_report_(\d+)\.md$/)?.[1];
      type = `build-report-${num}`;
    } else if (entry === 'verify_report.md') {
      type = 'verify-report';
    } else if (entry.match(/^verify_report_\d+\.md$/)) {
      const num = entry.match(/^verify_report_(\d+)\.md$/)?.[1];
      type = `verify-report-${num}`;
    }

    if (type) {
      const typeInfo = parseArtifactType(type);
      if (typeInfo) {
        artifacts.push({
          file: entry,
          type,
          typeInfo,
          path: path.join(planDir, entry)
        });
      }
    }
  }

  if (artifacts.length === 0) {
    console.error(chalk.red('Error: No artifacts found in plan directory.'));
    process.exit(1);
  }

  // 3. Validate all artifacts
  for (const artifact of artifacts) {
    if (artifact.typeInfo.baseType === 'plan') {
      const error = validatePlanFormat(artifact.path);
      if (error) {
        console.error(chalk.red(`Error: ${artifact.file} format invalid.\n${error}`));
        console.error(chalk.gray('Fix the validation error and try again.'));
        process.exit(1);
      }
    }

    if (artifact.typeInfo.baseType === 'verify-report') {
      const error = validateVerifyReportFormat(artifact.path);
      if (error) {
        console.error(chalk.red(`Error: ${artifact.file} format invalid.\n${error}`));
        process.exit(1);
      }
    }

    if (artifact.typeInfo.baseType === 'scope') {
      const error = validateScopeFormat(artifact.path);
      if (error) {
        console.error(chalk.red(`Error: ${artifact.file} format invalid.\n${error}`));
        process.exit(1);
      }
    }

    if (artifact.typeInfo.baseType === 'spec') {
      const result = validateSpecFormat(artifact.path);
      if (result.error) {
        console.error(chalk.red(`Error: ${artifact.file} format invalid.\n${result.error}`));
        process.exit(1);
      }
      if (result.warning) {
        console.warn(chalk.yellow(`Warning: ${result.warning}`));
      }
    }

    if (artifact.typeInfo.baseType === 'build-report') {
      const error = validateBuildReportFormat(artifact.path);
      if (error) {
        console.error(chalk.red(`Error: ${artifact.file} format invalid.\n${error}`));
        process.exit(1);
      }
    }

    if (artifact.typeInfo.baseType === 'contract') {
      const errors = validateContractFormat(artifact.path);
      if (errors.length > 0) {
        console.error(chalk.red('Contract validation failed:'));
        for (const error of errors) {
          console.error(chalk.red(`  - ${error}`));
        }
        process.exit(1);
      }
    }
  }

  // 4. Validate branch — planning artifacts must be on artifact branch
  const artifactBranch = readArtifactBranch(projectRoot);
  const currentBranch = getCurrentBranch();
  const hasPlanningArtifacts = artifacts.some(a => a.typeInfo.category === 'planning');
  if (hasPlanningArtifacts && currentBranch && currentBranch !== artifactBranch) {
    console.error(chalk.red(`Error: Planning artifacts must be saved on \`${artifactBranch}\`. You're on \`${currentBranch}\`.`));
    console.error(chalk.gray(`Run: git checkout ${artifactBranch} && git pull`));
    process.exit(1);
  }

  // 5. Read ana.json for coAuthor
  const anaJsonPath = path.join(projectRoot, '.ana', 'ana.json');
  let coAuthor = 'Ana <build@anatomia.dev>';
  try {
    const anaJsonContent = fs.readFileSync(anaJsonPath, 'utf-8');
    const config: { coAuthor?: string } = JSON.parse(anaJsonContent);
    coAuthor = config.coAuthor || 'Ana <build@anatomia.dev>';
  } catch {
    // Use fallback
  }

  // 5. Check if any artifacts are new (for create vs update message)
  const artifactPaths = artifacts.map(a => path.relative(projectRoot, a.path));
  const trackedStatus = artifactPaths.map(p => {
    return spawnSync('git', ['ls-files', '--error-unmatch', p], {
      cwd: projectRoot,
      stdio: 'pipe'
    }).status === 0;
  });
  const allTracked = trackedStatus.every(t => t);

  // 6. Stage all artifacts
  try {
    for (const artifactPath of artifactPaths) {
      execSync(`git add ${artifactPath}`, { stdio: 'pipe', cwd: projectRoot });
    }

    // Special case: if verify-report exists, also stage plan.md
    if (artifacts.some(a => a.typeInfo.baseType === 'verify-report')) {
      const planPath = path.join(planDir, 'plan.md');
      if (fs.existsSync(planPath) && !artifactPaths.includes(path.relative(projectRoot, planPath))) {
        execSync(`git add ${planPath}`, { stdio: 'pipe', cwd: projectRoot });
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error: Failed to stage files. ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }

  // 7. Check if there are staged changes
  const diffResult = spawnSync('git', ['diff', '--staged', '--quiet'], { cwd: projectRoot });
  if (diffResult.status === 0) {
    console.log(chalk.yellow('No changes to save — artifacts are already up to date.'));
    process.exit(0);
  }

  // 7b. Write .saves.json and stage it alongside artifacts.
  for (const artifact of artifacts) {
    const content = fs.readFileSync(artifact.path, 'utf-8');
    writeSaveMetadata(planDir, artifact.typeInfo.baseType, content);
  }
  const savesPathAll = path.join(planDir, '.saves.json');
  if (fs.existsSync(savesPathAll)) {
    try {
      execSync(`git add ${path.relative(projectRoot, savesPathAll)}`, { stdio: 'pipe', cwd: projectRoot });
    } catch { /* */ }
  }

  // 8. Commit
  const typeNames = artifacts.map(a => a.typeInfo.displayName).join(', ');
  const action = allTracked ? 'Update' : 'Save';
  const commitMessage = `[${slug}] ${action}: ${typeNames}\n\nCo-authored-by: ${coAuthor}`;

  try {
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe', cwd: projectRoot });
  } catch (error) {
    console.error(chalk.red(`Error: Commit failed. ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }

  // 9. Push (planning artifacts only)
  if (currentBranch === artifactBranch) {
    try {
      execSync('git push', { stdio: 'pipe', cwd: projectRoot });
    } catch (_error) {
      console.error(chalk.yellow('Warning: Push failed. Artifacts committed locally. Run `git push` manually.'));
      // Don't exit - commit succeeded
    }
  }

  // Also push if we saved build-verify artifacts on a feature branch
  if (currentBranch !== artifactBranch && artifacts.some(a => a.typeInfo.category === 'build-verify')) {
    try {
      execSync('git push', { stdio: 'pipe', cwd: projectRoot });
    } catch (_error) {
      console.error(chalk.yellow(
        'Warning: Push failed. Artifacts committed locally. Run `git push` manually.'
      ));
    }
  }

  // 10. Success message
  console.log(chalk.green(`✓ Saved ${artifacts.length} artifact${artifacts.length > 1 ? 's' : ''} for \`${slug}\``));
  console.log(chalk.gray(`  ${typeNames}`));
}

/**
 * Register the `artifact` command (with `save` and `save-all` sub-commands).
 *
 * @param program - Commander program instance.
 */
export function registerArtifactCommand(program: Command): void {
  const artifactCommand = new Command('artifact')
    .description('Manage pipeline artifacts');

  const saveCommand = new Command('save')
    .description('Commit a pipeline artifact to the correct branch')
    .argument('<type>', 'Artifact type: scope, plan, spec, spec-N, contract, build-report, build-report-N, verify-report, verify-report-N')
    .argument('<slug>', 'Work item slug (e.g., add-status-command)')
    .action((type: string, slug: string) => {
      saveArtifact(type, slug);
    });

  const saveAllCommand = new Command('save-all')
    .description('Commit all artifacts in a plan directory atomically')
    .argument('<slug>', 'Work item slug (e.g., add-status-command)')
    .action((slug: string) => {
      saveAllArtifacts(slug);
    });

  artifactCommand.addCommand(saveCommand);
  artifactCommand.addCommand(saveAllCommand);

  program.addCommand(artifactCommand);
}
