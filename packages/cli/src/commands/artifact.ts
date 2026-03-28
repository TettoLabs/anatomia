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
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Artifact type information after parsing
 */
interface ArtifactTypeInfo {
  category: 'planning' | 'build-verify';
  fileName: string;
  displayName: string;
}

/**
 * Parse artifact type string and extract metadata
 *
 * @param type - Raw type string (e.g., "scope", "spec-2", "build-report", "verify-report-1")
 * @returns Parsed artifact information
 */
function parseArtifactType(type: string): ArtifactTypeInfo | null {
  // Match valid types with optional number suffix
  const match = type.match(/^(scope|plan|spec|build-report|verify-report)(?:-(\d+))?$/);

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
  } else if (baseType === 'build-report') {
    displayName = number ? `Build report ${number}` : 'Build report';
  } else if (baseType === 'verify-report') {
    displayName = number ? `Verify report ${number}` : 'Verify report';
  } else {
    displayName = type;
  }

  return { category, fileName, displayName };
}

/**
 * Read artifactBranch from .ana/.meta.json
 *
 * @returns The artifact branch name
 */
function readArtifactBranch(): string {
  const metaPath = path.join(process.cwd(), '.ana', '.meta.json');

  // Check if file exists
  if (!fs.existsSync(metaPath)) {
    console.error(chalk.red('Error: No .ana/.meta.json found. Run `ana init` first.'));
    process.exit(1);
  }

  // Read and parse
  let meta: Record<string, unknown>;
  try {
    const content = fs.readFileSync(metaPath, 'utf-8');
    meta = JSON.parse(content);
  } catch {
    console.error(chalk.red('Error: Failed to read .ana/.meta.json. File may be corrupted.'));
    process.exit(1);
  }

  // Check artifactBranch field outside try/catch
  if (!meta.artifactBranch) {
    console.error(chalk.red('Error: No artifactBranch configured in .meta.json. Run `ana init` first.'));
    process.exit(1);
  }

  return meta.artifactBranch as string;
}

/**
 * Get current git branch name
 *
 * @returns Current branch name
 */
function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.error(chalk.red('Error: Not a git repository. `ana artifact save` requires git.'));
    process.exit(1);
  }
}

/**
 * Validate that we're on the correct branch for this artifact type
 *
 * @param typeInfo - Parsed artifact type information
 * @param currentBranch - Current git branch
 * @param artifactBranch - Configured artifact branch from .meta.json
 * @param slug - Work item slug
 */
function validateBranch(
  typeInfo: ArtifactTypeInfo,
  currentBranch: string,
  artifactBranch: string,
  slug: string
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
      console.error(chalk.gray(`Run: git checkout feature/${slug}`));
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
    console.error(chalk.gray('Valid types: scope, plan, spec, spec-N, build-report, build-report-N, verify-report, verify-report-N'));
    process.exit(1);
  }

  // 2. Read artifactBranch from .meta.json
  const artifactBranch = readArtifactBranch();

  // 3. Get current branch
  const currentBranch = getCurrentBranch();

  // 4. Validate branch
  validateBranch(typeInfo, currentBranch, artifactBranch, slug);

  // 5. Resolve file path
  const filePath = path.join('.ana', 'plans', 'active', slug, typeInfo.fileName);

  // 6. Verify file exists
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`Error: No ${typeInfo.displayName.toLowerCase()} found at \`${filePath}\`.`));
    console.error(chalk.gray('Write the file first, then run this command.'));
    process.exit(1);
  }

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

  // 8. Stage the file(s)
  try {
    // Always stage the artifact file
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

  // 9. Commit
  const commitMessage = `[${slug}] ${typeInfo.displayName}\n\nCo-authored-by: Ana <build@anatomia.dev>`;
  try {
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe' });
  } catch (error) {
    console.error(chalk.red(`Error: Commit failed. ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }

  // 10. Push (artifact branch only)
  if (typeInfo.category === 'planning') {
    try {
      execSync('git push', { stdio: 'pipe' });
    } catch (error) {
      console.error(chalk.yellow('Warning: Push failed. Artifact committed locally. Run `git push` manually.'));
      // Don't exit - commit succeeded
    }
  }

  // 11. Print success
  if (typeInfo.category === 'planning') {
    console.log(chalk.green(`✓ Saved ${typeInfo.displayName} for \`${slug}\` to \`${artifactBranch}\`.`));
  } else {
    console.log(chalk.green(`✓ Saved ${typeInfo.displayName} for \`${slug}\` on \`${currentBranch}\`.`));
  }
}

/**
 * Command definition for artifact management
 */
export const artifactCommand = new Command('artifact')
  .description('Manage pipeline artifacts');

const saveCommand = new Command('save')
  .description('Commit a pipeline artifact to the correct branch')
  .argument('<type>', 'Artifact type: scope, plan, spec, spec-N, build-report, build-report-N, verify-report, verify-report-N')
  .argument('<slug>', 'Work item slug (e.g., add-status-command)')
  .action((type: string, slug: string) => {
    saveArtifact(type, slug);
  });

artifactCommand.addCommand(saveCommand);
