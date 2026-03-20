/**
 * ana init - Initialize .ana/ context framework
 *
 * Complete rewrite for STEP 2.5 - integrates analyzer, no prompts.
 *
 * Creates:
 *   .ana/
 *   ├── modes/                    (7 mode files)
 *   ├── context/
 *   │   ├── analysis.md           (generated from analyzer)
 *   │   ├── project-overview.md   (scaffold with 40% pre-pop)
 *   │   ├── architecture.md       (scaffold with 20% pre-pop)
 *   │   ├── patterns.md           (scaffold with 50% pre-pop)
 *   │   ├── conventions.md        (scaffold with 70% pre-pop)
 *   │   ├── workflow.md           (scaffold with 10% pre-pop)
 *   │   ├── testing.md            (scaffold with 50% pre-pop)
 *   │   ├── debugging.md          (scaffold with 5% pre-pop)
 *   │   └── setup/                (setup files)
 *   ├── .meta.json                (framework metadata)
 *   └── .state/
 *       └── snapshot.json         (analyzer baseline)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import type { AnalysisResult } from 'anatomia-analyzer';
import { formatAnalysisBrief } from '../utils/format-analysis-brief.js';
import {
  generateProjectOverviewScaffold,
  generateArchitectureScaffold,
  generatePatternsScaffold,
  generateConventionsScaffold,
  generateWorkflowScaffold,
  generateTestingScaffold,
  generateDebuggingScaffold,
} from '../utils/scaffold-generators.js';
import { getProjectName } from '../utils/validators.js';
import {
  MODE_FILES,
  SETUP_FILES,
  STEP_FILES,
  FRAMEWORK_SNIPPETS,
  META_VERSION,
} from '../constants.js';

/** Command options */
interface InitCommandOptions {
  force?: boolean;
  skipAnalysis?: boolean;
}

/** Pre-flight validation result */
interface PreflightResult {
  canProceed: boolean;
  stateBackup?: string; // Path to .state/ backup if --force used
}

/**
 * Create empty analysis result for fallback
 *
 * Used when analyzer fails or is skipped with --skip-analysis.
 * Scaffolds handle undefined optional fields gracefully.
 *
 * @returns Minimal valid AnalysisResult
 */
function createEmptyAnalysisResult(): AnalysisResult {
  return {
    projectType: 'unknown',
    framework: null,
    confidence: { projectType: 0, framework: 0 },
    indicators: { projectType: [], framework: [] },
    detectedAt: new Date().toISOString(),
    version: '0.0.0',
  } as AnalysisResult;
}

/** Create init command */
export const initCommand = new Command('init')
  .description('Initialize .ana/ context framework')
  .option('-f, --force', 'Overwrite existing .ana/ (preserves .state/)')
  .option('--skip-analysis', 'Skip analyzer, create empty scaffolds')
  .action(async (options: InitCommandOptions) => {
    const cwd = process.cwd();
    const anaPath = path.join(cwd, '.ana');

    // Phase 1: Pre-flight checks
    const preflight = await validateInitPreconditions(anaPath, options);
    if (!preflight.canProceed) {
      return; // Exit already handled in validation
    }

    // Phase 2-9: Atomic operation
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-init-'));
    const tmpAnaPath = path.join(tmpDir, '.ana');

    try {
      // All operations in temp directory
      const analysisResult = await runAnalyzer(cwd, options);
      await createDirectoryStructure(tmpAnaPath);
      await generateAnalysisMd(tmpAnaPath, analysisResult, cwd);
      await generateScaffolds(tmpAnaPath, analysisResult, cwd);
      await copyStaticFilesWithVerification(tmpAnaPath);
      await createMetaJson(tmpAnaPath, analysisResult);
      await storeSnapshot(tmpAnaPath, analysisResult);

      // Restore .state/ if --force was used
      if (preflight.stateBackup) {
        // Remove empty .state/ created by Phase 3
        const stateDir = path.join(tmpAnaPath, '.state');
        await fs.rm(stateDir, { recursive: true, force: true });
        // Move backup into place
        await fs.rename(preflight.stateBackup, stateDir);
      }

      // SUCCESS: Atomic rename
      await atomicRename(tmpAnaPath, anaPath);

      // Display success
      displaySuccessMessage(analysisResult);
    } catch (error) {
      // FAILURE: Cleanup temp, no changes made
      await fs.rm(tmpDir, { recursive: true, force: true });

      if (error instanceof Error) {
        console.error(chalk.red(`\n❌ Init failed: ${error.message}`));
        console.error(chalk.gray('No changes made to your project.'));
      }
      process.exit(1);
    }
  });

/**
 * Phase 1: Pre-flight validation
 *
 * Checks:
 * - Directory exists and is readable
 * - .ana/ doesn't exist OR --force provided
 * - If --force: backup .state/ for preservation
 *
 * @param anaPath - Path to .ana/ directory
 * @param options - Command options
 * @returns Preflight result (canProceed + optional stateBackup path)
 */
async function validateInitPreconditions(
  anaPath: string,
  options: InitCommandOptions
): Promise<PreflightResult> {
  const cwd = process.cwd();

  // Check directory exists
  try {
    await fs.access(cwd, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    console.error(chalk.red('Error: Cannot read/write current directory'));
    console.error(chalk.gray('Check permissions: ls -la .'));
    process.exit(1);
  }

  // Check if .ana/ exists
  const anaExists = await dirExists(anaPath);

  if (!anaExists) {
    // First run - proceed
    return { canProceed: true };
  }

  // .ana/ exists - check --force
  if (!options.force) {
    console.log(chalk.yellow('\n.ana/ directory already exists.\n'));

    // Check .meta.json to provide better guidance
    const metaPath = path.join(anaPath, '.meta.json');
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);

      if (meta.setupStatus === 'pending') {
        console.log('Setup is incomplete. Options:\n');
        console.log('  1. Resume setup: @.ana/modes/setup.md');
        console.log('  2. Start over: ana init --force\n');
      } else if (meta.setupStatus === 'complete') {
        console.log('Framework already set up. Options:\n');
        console.log('  1. Keep current: Do nothing');
        console.log('  2. Recreate: ana init --force (preserves .state/)\n');
      }
    } catch {
      // .meta.json missing or corrupted
      console.log('Use --force to overwrite.\n');
    }

    process.exit(0);
  }

  // --force provided: backup .state/ before deletion
  const statePath = path.join(anaPath, '.state');
  let stateBackup: string | undefined;

  if (await dirExists(statePath)) {
    const timestamp = Date.now();
    stateBackup = path.join(os.tmpdir(), `.ana-state-backup-${timestamp}`);

    console.log(chalk.gray('Backing up .state/ directory...'));
    await fs.cp(statePath, stateBackup, { recursive: true });
  }

  // Delete existing .ana/
  console.log(chalk.gray('Removing existing .ana/...'));
  await fs.rm(anaPath, { recursive: true, force: true });

  return {
    canProceed: true,
    stateBackup,
  };
}

/**
 * Check if directory exists
 * @param dirPath - Path to check
 * @returns true if directory exists
 */
async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Phase 2: Run analyzer
 *
 * Runs analyzer with spinner, displays detection summary.
 * Graceful degradation: if analyzer fails, returns null (empty scaffolds created).
 *
 * @param rootPath - Project root directory
 * @param options - Command options
 * @returns AnalysisResult or null if failed/skipped
 */
async function runAnalyzer(
  rootPath: string,
  options: InitCommandOptions
): Promise<AnalysisResult | null> {
  // Skip if --skip-analysis flag
  if (options.skipAnalysis) {
    console.log(chalk.gray('\nSkipping analyzer (--skip-analysis flag)'));
    console.log(chalk.yellow('  Scaffolds will have no pre-populated data\n'));
    return null;
  }

  const spinner = ora('Analyzing project...').start();

  try {
    // Dynamic import - only loads analyzer when actually needed
    const { analyze } = await import('anatomia-analyzer');

    const result = await analyze(rootPath, {
      skipImportScan: false,
      strictMode: false,
      verbose: false,
    });

    spinner.succeed('Analysis complete');

    // Display detection summary
    displayDetectionSummary(result);

    return result;
  } catch (error) {
    spinner.warn('Analyzer failed — continuing with empty scaffolds');
    console.log(chalk.yellow('  Setup will work but scaffolds will have no pre-populated data'));

    if (error instanceof Error) {
      console.log(chalk.gray(`  Reason: ${error.message}`));
    }
    console.log();

    return null;
  }
}

/**
 * Display detection summary after analysis
 * @param result
 */
function displayDetectionSummary(result: AnalysisResult): void {
  console.log();

  // Framework
  if (result.framework) {
    console.log(chalk.bold('  Framework: ') + chalk.cyan(result.framework));
  } else {
    console.log(chalk.gray('  Framework: None detected'));
  }

  // Patterns
  if (result.patterns) {
    const detectedPatterns: string[] = [];
    if (result.patterns.errorHandling) detectedPatterns.push('error handling');
    if (result.patterns.validation) detectedPatterns.push('validation');
    if (result.patterns.database) detectedPatterns.push('database');
    if (result.patterns.auth) detectedPatterns.push('auth');
    if (result.patterns.testing) detectedPatterns.push('testing');

    if (detectedPatterns.length > 0) {
      console.log(chalk.bold('  Patterns: ') + detectedPatterns.join(', '));
    }
  }

  // Conventions (sample)
  if (result.conventions?.naming?.functions) {
    const funcNaming = result.conventions.naming.functions;
    console.log(
      chalk.bold('  Conventions: ') +
        `${funcNaming.majority} functions` +
        (funcNaming.mixed ? chalk.gray(' (mixed)') : '')
    );
  }

  console.log();
}

/**
 * Phase 3: Create directory structure
 *
 * Creates all required directories for .ana/ framework:
 * - modes/
 * - context/
 * - context/setup/
 * - context/setup/steps/
 * - context/setup/framework-snippets/
 * - .state/
 *
 * @param tmpAnaPath - Path to temp .ana/ directory
 */
async function createDirectoryStructure(tmpAnaPath: string): Promise<void> {
  const spinner = ora('Creating directory structure...').start();

  // Create directories (recursive: true creates parents)
  await fs.mkdir(path.join(tmpAnaPath, 'modes'), { recursive: true });
  await fs.mkdir(path.join(tmpAnaPath, 'context'), { recursive: true });
  await fs.mkdir(path.join(tmpAnaPath, 'context/setup'), { recursive: true });
  await fs.mkdir(path.join(tmpAnaPath, 'context/setup/steps'), { recursive: true });
  await fs.mkdir(path.join(tmpAnaPath, 'context/setup/framework-snippets'), { recursive: true });
  await fs.mkdir(path.join(tmpAnaPath, '.state'), { recursive: true });

  spinner.succeed('Directory structure created');
}

/**
 * Phase 4: Generate analysis.md
 *
 * Calls formatAnalysisBrief() and writes to context/analysis.md
 *
 * @param tmpAnaPath - Temp .ana/ path
 * @param analysisResult - Analyzer result or null
 * @param cwd - Project root (for projectName)
 */
async function generateAnalysisMd(
  tmpAnaPath: string,
  analysisResult: AnalysisResult | null,
  cwd: string
): Promise<void> {
  const spinner = ora('Generating analysis.md...').start();

  // Use empty result if analyzer failed
  const analysis = analysisResult || createEmptyAnalysisResult();

  // Generate markdown
  const markdown = formatAnalysisBrief(analysis);

  // Write to context/analysis.md
  const analysisPath = path.join(tmpAnaPath, 'context/analysis.md');
  await fs.writeFile(analysisPath, markdown, 'utf-8');

  // Display file size
  const lines = markdown.split('\n').length;
  spinner.succeed(`Generated analysis.md (${lines} lines)`);
}

/**
 * Phase 5: Generate scaffolds
 *
 * Calls all 7 scaffold generators and writes files.
 *
 * @param tmpAnaPath - Temp .ana/ path
 * @param analysisResult - Analyzer result or null
 * @param cwd - Project root (for projectName)
 */
async function generateScaffolds(
  tmpAnaPath: string,
  analysisResult: AnalysisResult | null,
  cwd: string
): Promise<void> {
  const spinner = ora('Generating scaffolds...').start();

  // Use empty result if analyzer failed
  const analysis = analysisResult || createEmptyAnalysisResult();

  // Get metadata
  const projectName = await getProjectName(cwd);
  const timestamp = new Date().toISOString();
  const version = await getCliVersion();

  // Generate all 7 scaffolds
  const scaffolds = [
    { name: 'project-overview.md', generator: generateProjectOverviewScaffold },
    { name: 'architecture.md', generator: generateArchitectureScaffold },
    { name: 'patterns.md', generator: generatePatternsScaffold },
    { name: 'conventions.md', generator: generateConventionsScaffold },
    { name: 'workflow.md', generator: generateWorkflowScaffold },
    { name: 'testing.md', generator: generateTestingScaffold },
    { name: 'debugging.md', generator: generateDebuggingScaffold },
  ];

  let totalLines = 0;

  for (const scaffold of scaffolds) {
    const content = scaffold.generator(analysis, projectName, timestamp, version);
    const filePath = path.join(tmpAnaPath, 'context', scaffold.name);
    await fs.writeFile(filePath, content, 'utf-8');
    totalLines += content.split('\n').length;
  }

  spinner.succeed(`Generated 7 scaffolds (${totalLines} lines total)`);
}

/**
 * Get CLI version from package.json
 * @returns CLI version string
 */
async function getCliVersion(): Promise<string> {
  try {
    const pkgPath = new URL('../../package.json', import.meta.url);
    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version || '0.2.0';
  } catch {
    return '0.2.0';
  }
}

/**
 * Phase 6: Copy static files with SHA-256 verification
 *
 * Copies 24 static template files from CLI templates/ to .ana/:
 * - 7 mode files
 * - 3 setup files (SETUP_GUIDE.md, templates.md, rules.md)
 * - 8 step files
 * - 6 framework-snippets
 *
 * ENTRY.md template stays in CLI package (used by ana setup complete).
 *
 * Each file verified with SHA-256 hash after copy.
 *
 * @param tmpAnaPath - Temp .ana/ path
 */
async function copyStaticFilesWithVerification(tmpAnaPath: string): Promise<void> {
  const spinner = ora('Copying static files...').start();

  const templatesDir = getTemplatesDir();

  // 7 mode files
  for (const file of MODE_FILES) {
    const sourcePath = path.join(templatesDir, 'modes', file);
    const destPath = path.join(tmpAnaPath, 'modes', file);
    await copyAndVerifyFile(sourcePath, destPath, `modes/${file}`);
  }

  // 3 setup files (ENTRY.md stays in templates, not copied to .ana/)
  const setupFiles = [
    { source: 'context/setup/SETUP_GUIDE.md', dest: 'context/setup/SETUP_GUIDE.md' },
    { source: 'context/setup/templates.md', dest: 'context/setup/templates.md' },
    { source: 'context/setup/rules.md', dest: 'context/setup/rules.md' },
  ];

  for (const file of setupFiles) {
    const sourcePath = path.join(templatesDir, file.source);
    const destPath = path.join(tmpAnaPath, file.dest);
    await copyAndVerifyFile(sourcePath, destPath, file.source);
  }

  // 8 step files
  for (const file of STEP_FILES) {
    const sourcePath = path.join(templatesDir, 'context/setup/steps', file);
    const destPath = path.join(tmpAnaPath, 'context/setup/steps', file);
    await copyAndVerifyFile(sourcePath, destPath, `context/setup/steps/${file}`);
  }

  // 6 framework-snippets
  for (const file of FRAMEWORK_SNIPPETS) {
    const sourcePath = path.join(templatesDir, 'context/setup/framework-snippets', file);
    const destPath = path.join(tmpAnaPath, 'context/setup/framework-snippets', file);
    await copyAndVerifyFile(sourcePath, destPath, `context/setup/framework-snippets/${file}`);
  }

  spinner.succeed('Copied and verified 24 static files');
}

/**
 * Copy file with SHA-256 integrity verification
 *
 * Copies file and verifies hash matches after copy.
 * Throws if hashes don't match (file corruption).
 *
 * @param sourcePath - Source file path
 * @param destPath - Destination file path
 * @param fileName - Display name for errors
 */
async function copyAndVerifyFile(
  sourcePath: string,
  destPath: string,
  fileName: string
): Promise<void> {
  // Hash source before copy
  const sourceContent = await fs.readFile(sourcePath);
  const sourceHash = createHash('sha256').update(sourceContent).digest('hex');

  // Copy file
  await fs.copyFile(sourcePath, destPath);

  // Hash destination after copy
  const destContent = await fs.readFile(destPath);
  const destHash = createHash('sha256').update(destContent).digest('hex');

  // Verify hashes match
  if (sourceHash !== destHash) {
    throw new Error(
      `File integrity check failed: ${fileName}\n` +
        `Expected: ${sourceHash}\n` +
        `Got: ${destHash}\n` +
        'File may be corrupted during copy.'
    );
  }
}

/**
 * Get templates directory (handles dev vs built contexts)
 *
 * Build structure (verified):
 * - dist/index.js (bundled entry point)
 * - dist/templates/ (copied from templates/)
 *
 * Dev structure:
 * - src/commands/init.ts
 * - templates/ (at project root)
 *
 * @returns Absolute path to templates/ directory
 */
function getTemplatesDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Check if running from dist/ or src/
  const isCompiled = __dirname.includes('dist');

  return isCompiled
    ? path.join(__dirname, 'templates') // dist/ → dist/templates/
    : path.join(__dirname, '..', '..', 'templates'); // src/commands/ → templates/
}

/**
 * Phase 7: Create .meta.json
 *
 * Creates framework metadata file with initial state:
 * - setupStatus: 'pending' (setup not run yet)
 * - setupMode: null (set by ana setup complete)
 * - framework: from analyzer
 * - analyzerVersion: from analyzer
 *
 * @param tmpAnaPath - Temp .ana/ path
 * @param analysisResult - Analyzer result or null
 */
async function createMetaJson(
  tmpAnaPath: string,
  analysisResult: AnalysisResult | null
): Promise<void> {
  const spinner = ora('Creating .meta.json...').start();

  const analysis = analysisResult || createEmptyAnalysisResult();

  const meta = {
    version: META_VERSION,
    createdAt: new Date().toISOString(),
    setupStatus: 'pending',
    setupCompletedAt: null,
    setupMode: null,
    framework: analysis.framework,
    analyzerVersion: analysis.version,
    lastEvolve: null,
    lastHealth: null,
    sessionCount: 0,
  };

  const metaPath = path.join(tmpAnaPath, '.meta.json');
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

  spinner.succeed('Created .meta.json');
}

/**
 * Phase 8: Store analyzer snapshot
 *
 * Stores raw AnalysisResult to .state/snapshot.json.
 * Used by `ana diff` (STEP 3) as baseline for detecting drift.
 *
 * @param tmpAnaPath - Temp .ana/ path
 * @param analysisResult - Analyzer result or null
 */
async function storeSnapshot(
  tmpAnaPath: string,
  analysisResult: AnalysisResult | null
): Promise<void> {
  const spinner = ora('Storing analyzer snapshot...').start();

  const analysis = analysisResult || createEmptyAnalysisResult();

  const snapshotPath = path.join(tmpAnaPath, '.state/snapshot.json');
  await fs.writeFile(snapshotPath, JSON.stringify(analysis, null, 2), 'utf-8');

  spinner.succeed('Stored analyzer snapshot');
}

/**
 * Phase 9: Atomic rename
 *
 * Moves temp .ana/ to final location atomically.
 * Handles cross-filesystem scenario (EXDEV error).
 *
 * @param tmpAnaPath - Temp .ana/ path
 * @param anaPath - Final .ana/ path
 */
async function atomicRename(tmpAnaPath: string, anaPath: string): Promise<void> {
  try {
    // Try atomic rename (works if same filesystem)
    await fs.rename(tmpAnaPath, anaPath);
  } catch (error) {
    // Handle cross-filesystem case
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EXDEV') {
      // Rename failed - different filesystems
      // Fallback: recursive copy + delete temp
      await fs.cp(tmpAnaPath, anaPath, { recursive: true });
      await fs.rm(path.dirname(tmpAnaPath), { recursive: true, force: true });
    } else {
      // Other error - rethrow
      throw error;
    }
  }
}

/**
 * Display success message after init completes
 *
 * Shows what was created and next steps.
 *
 * @param analysisResult - Analyzer result (may be null)
 */
function displaySuccessMessage(analysisResult: AnalysisResult | null): void {
  console.log(chalk.green('\n✅ .ana/ framework initialized\n'));

  console.log(chalk.bold('Created:'));
  console.log('  • 7 mode files');
  console.log('  • 7 context scaffolds (with analyzer data)');
  console.log('  • analysis.md');
  console.log('  • Setup files (orchestrator, templates, rules, 8 steps)');
  console.log();

  console.log(chalk.bold('Next: ') + 'Run this in Claude Code:');
  console.log(chalk.cyan('  @.ana/modes/setup.md'));
  console.log();

  console.log(chalk.gray('Setup will detect your project maturity and guide you through'));
  console.log(chalk.gray('filling context files (~2-15 min depending on tier).'));
  console.log();
}
