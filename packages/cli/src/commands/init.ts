/**
 * ana init - Initialize .ana/ context framework
 *
 * Complete rewrite for STEP 2.5 - integrates analyzer, no prompts.
 *
 * Creates:
 *   .ana/
 *   ├── modes/                    (10 mode files)
 *   ├── hooks/                    (CC hook scripts)
 *   │   ├── verify-context-file.sh
 *   │   ├── quality-gate.sh
 *   │   ├── run-check.sh
 *   │   └── subagent-verify.sh
 *   ├── context/
 *   │   ├── project-overview.md   (scaffold with 40% pre-pop)
 *   │   ├── architecture.md       (scaffold with 20% pre-pop)
 *   │   ├── patterns.md           (scaffold with 50% pre-pop)
 *   │   ├── conventions.md        (scaffold with 70% pre-pop)
 *   │   ├── workflow.md           (scaffold with 10% pre-pop)
 *   │   ├── testing.md            (scaffold with 50% pre-pop)
 *   │   ├── debugging.md          (scaffold with 5% pre-pop)
 *   │   └── setup/                (setup files)
 *   ├── docs/
 *   │   └── SCHEMAS.md            (artifact schema reference)
 *   ├── plans/
 *   │   ├── active/               (in-progress work)
 *   │   └── completed/            (completed cycles)
 *   ├── ana.json                   (framework metadata)
 *   └── state/
 *       └── snapshot.json         (analyzer baseline)
 *
 *   .claude/
 *   ├── settings.json             (hooks configuration)
 *   ├── agents/
 *   │   ├── ana.md                (main Ana agent)
 *   │   ├── ana-plan.md           (spec generator)
 *   │   ├── ana-setup.md          (interactive setup orchestrator)
 *   │   ├── ana-build.md          (builder agent)
 *   │   ├── ana-verify.md         (quality gate agent)
 *   │   ├── ana-explorer.md       (codebase scanner)
 *   │   ├── ana-question-formulator.md
 *   │   ├── ana-writer.md         (context file writer)
 *   │   └── ana-verifier.md       (citation verifier)
 *   └── skills/
 *       ├── testing-standards/SKILL.md
 *       ├── coding-standards/SKILL.md
 *       ├── git-workflow/SKILL.md
 *       ├── deployment/SKILL.md
 *       ├── design-principles/SKILL.md
 *       └── logging-standards/SKILL.md
 *
 *   CLAUDE.md                     (project entry point)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import type { EngineResult } from '../engine/types/engineResult.js';
import { dirname } from 'node:path';

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
  STEP_FILES,
  FRAMEWORK_SNIPPETS,
  AGENT_FILES,
  SKILL_DIRS,
} from '../constants.js';
import { buildSymbolIndex } from './index.js';

/** Command options */
interface InitCommandOptions {
  force?: boolean;
  skipAnalysis?: boolean;
}

/** Pre-flight validation result */
interface PreflightResult {
  canProceed: boolean;
  stateBackup?: string; // Path to state/ backup if --force used
}

/**
 * Create empty analysis result for fallback
 *
 * Used when analyzer fails or is skipped with --skip-analysis.
 * Scaffolds handle undefined optional fields gracefully.
 *
 * @returns Minimal valid EngineResult
 */
function createEmptyEngineResult(): EngineResult {
  return {
    overview: { project: 'unknown', scannedAt: new Date().toISOString(), depth: 'surface' },
    stack: { language: null, framework: null, database: null, auth: null, testing: null, payments: null, workspace: null },
    files: { source: 0, test: 0, config: 0, total: 0 },
    structure: [],
    structureOverflow: 0,
    commands: { build: null, test: null, lint: null, dev: null, packageManager: 'npm' },
    git: { head: null, branch: null, commitCount: null, lastCommitAt: null, uncommittedChanges: false, contributorCount: null },
    monorepo: { isMonorepo: false, tool: null, packages: [] },
    externalServices: [],
    schemas: {},
    secrets: { envFileExists: false, envExampleExists: false, gitignoreCoversEnv: false, hardcodedKeysFound: null, envVarReferences: null },
    projectProfile: { type: null, maturity: null, teamSize: null, hasExternalAPIs: false, hasDatabase: false, hasBrowserUI: false, hasAuthSystem: false, hasPayments: false, hasFileStorage: false },
    blindSpots: [],
    deployment: null,
    patterns: null,
    conventions: null,
    recommendations: null,
    health: {},
    readiness: {},
  };
}

/**
 * Ask for setup tier selection
 *
 * Prompts user to choose quick/guided/complete tier.
 * Defaults to guided for non-interactive environments.
 *
 * @param _options - Command options (unused)
 * @returns Selected setup tier
 */
async function askSetupTier(_options: InitCommandOptions): Promise<string> {
  // Default for non-interactive environments
  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    return 'guided';
  }

  console.log(chalk.cyan('\nSetup tier:'));
  console.log(chalk.gray('  1. Quick     — ~2 min, no questions, uses detected data only'));
  console.log(chalk.gray('  2. Guided    — ~5 min, asks 5-7 questions to improve accuracy'));
  console.log(chalk.gray('  3. Complete  — ~15 min, thorough Q&A for maximum accuracy'));
  console.log();

  // Simple stdin read for single character
  const readline = await import('node:readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const answer = await new Promise<string>((resolve) => {
    rl.question(chalk.cyan('  Choose (1/2/3, default 2): '), (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });

  const tierMap: Record<string, string> = { '1': 'quick', '2': 'guided', '3': 'complete' };
  const setupMode = tierMap[answer] || 'guided';
  console.log(chalk.green(`  → ${setupMode} tier selected\n`));

  return setupMode;
}

/** Create init command */
export const initCommand = new Command('init')
  .description('Initialize .ana/ context framework')
  .option('-f, --force', 'Overwrite existing .ana/ (preserves state/)')
  .option('--skip-analysis', 'Skip analyzer, create empty scaffolds')
  .action(async (options: InitCommandOptions, command: Command) => {
    // Reject positional arguments (init operates on cwd)
    if (command.args.length > 0) {
      console.error(chalk.red(`Error: ana init does not accept a path argument.`));
      console.error(chalk.gray('cd into the project directory and run: ana init'));
      process.exit(1);
    }

    const cwd = process.cwd();
    const anaPath = path.join(cwd, '.ana');

    // Phase 1: Pre-flight checks
    const preflight = await validateInitPreconditions(anaPath, options);
    if (!preflight.canProceed) {
      return; // Exit already handled in validation
    }

    // Ask for setup tier (before Phase 2)
    const setupMode = await askSetupTier(options);

    // Phase 2-9: Atomic operation
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-init-'));
    const tmpAnaPath = path.join(tmpDir, '.ana');

    try {
      // Set ASTCache to write to temp directory during analysis
      // (prevents creating .ana/ in project root before atomic rename)
      const { ASTCache } = await import('../engine/index.js');
      const tmpCacheDir = path.join(tmpAnaPath, 'state', 'cache');
      ASTCache.setCacheDir(tmpCacheDir);

      // All operations in temp directory
      const scanStart = Date.now();
      const engineResult = await runAnalyzer(cwd, options);

      // Reset cache override after analysis
      ASTCache.setCacheDir(null);
      await createDirectoryStructure(tmpAnaPath);
      await generateScaffolds(tmpAnaPath, engineResult, cwd);
      await copyStaticFilesWithVerification(tmpAnaPath);
      await copyHookScripts(tmpAnaPath);
      await saveScanJson(tmpAnaPath, engineResult);
      await createAnaJson(tmpAnaPath, engineResult, setupMode);
      await storeSnapshot(tmpAnaPath, engineResult);
      await buildSymbolIndexSafe(cwd, tmpAnaPath);
      await writeCliPath(tmpAnaPath);

      // Restore state/ if --force was used
      if (preflight.stateBackup) {
        // Remove empty state/ created by Phase 3
        const stateDir = path.join(tmpAnaPath, 'state');
        await fs.rm(stateDir, { recursive: true, force: true });
        // Move backup into place
        await fs.rename(preflight.stateBackup, stateDir);
      }

      // SUCCESS: Atomic rename
      await atomicRename(tmpAnaPath, anaPath);

      // Create .claude/ configuration (outside temp directory - handles merge)
      await createClaudeConfiguration(cwd, engineResult);

      // Display success
      const scanTime = ((Date.now() - scanStart) / 1000).toFixed(1);
      const projectName = await getProjectName(cwd);
      displaySuccessMessage(engineResult, projectName, scanTime);
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
 * - If --force: backup state/ for preservation
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

    // Check ana.json to provide better guidance
    const anaJsonPath = path.join(anaPath, 'ana.json');
    try {
      const anaJsonContent = await fs.readFile(anaJsonPath, 'utf-8');
      const config = JSON.parse(anaJsonContent);

      if (config.setupMode === 'not_started' || config.setupStatus === 'pending') {
        console.log('Setup is incomplete. Options:\n');
        console.log('  1. Resume setup: `claude --agent ana-setup`');
        console.log('  2. Start over: ana init --force\n');
      } else if (config.setupMode === 'complete' || config.setupStatus === 'complete') {
        console.log('Framework already set up. Options:\n');
        console.log('  1. Keep current: Do nothing');
        console.log('  2. Recreate: ana init --force (preserves state/)\n');
      }
    } catch {
      // ana.json missing or corrupted
      console.log('Use --force to overwrite.\n');
    }

    process.exit(0);
  }

  // --force provided: backup state/ before deletion
  const statePath = path.join(anaPath, 'state');
  let stateBackup: string | undefined;

  if (await dirExists(statePath)) {
    const timestamp = Date.now();
    stateBackup = path.join(os.tmpdir(), `.ana-state-backup-${timestamp}`);

    console.log(chalk.gray('Backing up state/ directory...'));
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
 * @returns EngineResult or null if failed/skipped
 */
async function runAnalyzer(
  rootPath: string,
  options: InitCommandOptions
): Promise<EngineResult | null> {
  // Skip if --skip-analysis flag
  if (options.skipAnalysis) {
    console.log(chalk.gray('\nSkipping analyzer (--skip-analysis flag)'));
    console.log(chalk.yellow('  Scaffolds will have no pre-populated data\n'));
    return null;
  }

  const spinner = ora('Analyzing project...').start();

  try {
    const { analyzeProject } = await import('../engine/analyze.js');
    const engineResult = await analyzeProject(rootPath, { depth: 'deep' });

    spinner.succeed('Analysis complete');
    displayDetectionSummary(engineResult);

    return engineResult;
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
function displayDetectionSummary(result: EngineResult): void {
  console.log();

  // Stack
  const stackParts = [result.stack.language, result.stack.framework, result.stack.database, result.stack.auth, result.stack.testing].filter(Boolean);
  if (stackParts.length > 0) {
    console.log(chalk.bold('  Stack: ') + chalk.cyan(stackParts.join(' · ')));
  }

  // Services
  if (result.externalServices.length > 0) {
    const names = result.externalServices.map(s => s.name).join(', ');
    console.log(chalk.bold('  Services: ') + names);
  }

  // Deployment
  if (result.deployment) {
    console.log(chalk.bold('  Deploy: ') + result.deployment.platform);
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
 * - state/
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
  await fs.mkdir(path.join(tmpAnaPath, 'docs'), { recursive: true });
  await fs.mkdir(path.join(tmpAnaPath, 'plans/active'), { recursive: true });
  await fs.mkdir(path.join(tmpAnaPath, 'plans/completed'), { recursive: true });
  await fs.mkdir(path.join(tmpAnaPath, 'state'), { recursive: true });

  // Create .gitkeep files for empty plan directories
  await fs.writeFile(path.join(tmpAnaPath, 'plans/active/.gitkeep'), '', 'utf-8');
  await fs.writeFile(path.join(tmpAnaPath, 'plans/completed/.gitkeep'), '', 'utf-8');

  // Create .gitignore for runtime state files
  const gitignoreContent = `# Anatomia runtime state — local to each developer
state/
.setup_qa_log.md
.setup_exploration.md
.setup_verification.md
.setup_state.json
.setup_tier
`;
  await fs.writeFile(path.join(tmpAnaPath, '.gitignore'), gitignoreContent, 'utf-8');

  spinner.succeed('Directory structure created');
}

/**
 * Phase 5: Generate scaffolds
 *
 * Calls all 7 scaffold generators and writes files.
 *
 * @param tmpAnaPath - Temp .ana/ path
 * @param engineResult - Engine result or null
 * @param cwd - Project root (for projectName)
 */
async function generateScaffolds(
  tmpAnaPath: string,
  engineResult: EngineResult | null,
  cwd: string
): Promise<void> {
  const spinner = ora('Generating scaffolds...').start();

  // Use empty result if analyzer failed
  const analysis = engineResult || createEmptyEngineResult();

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
    // Detect bundle vs dev context
    const moduleUrl = new URL('.', import.meta.url);
    const isBundle = !moduleUrl.pathname.includes('/src/');
    const pkgPath = isBundle
      ? new URL('../package.json', import.meta.url) // dist/index.js → ../package.json = cli/package.json
      : new URL('../../package.json', import.meta.url); // src/commands/init.ts → ../../package.json = cli/package.json

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
 * Copies 28 static template files from CLI templates/ to .ana/:
 * - 10 mode files
 * - 3 setup files (SETUP_GUIDE.md, templates.md, rules.md)
 * - 8 step files
 * - 6 framework-snippets
 * - 1 SCHEMAS.md
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

  // 10 mode files
  for (const file of MODE_FILES) {
    const sourcePath = path.join(templatesDir, 'modes', file);
    const destPath = path.join(tmpAnaPath, 'modes', file);
    await copyAndVerifyFile(sourcePath, destPath, `modes/${file}`);
  }

  // 3 setup files
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

  // SCHEMAS.md
  const schemasSource = path.join(templatesDir, '.ana/docs/SCHEMAS.md');
  const schemasDest = path.join(tmpAnaPath, 'docs/SCHEMAS.md');
  await copyAndVerifyFile(schemasSource, schemasDest, '.ana/docs/SCHEMAS.md');

  spinner.succeed('Copied and verified 28 static files');
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
 * Copy hook scripts to .ana/hooks/
 *
 * Copies hook scripts and sets executable permissions.
 *
 * @param tmpAnaPath - Temp .ana/ path
 */
async function copyHookScripts(tmpAnaPath: string): Promise<void> {
  const spinner = ora('Copying hook scripts...').start();

  const templatesDir = getTemplatesDir();
  const hooksDir = path.join(tmpAnaPath, 'hooks');

  // Create hooks directory
  await fs.mkdir(hooksDir, { recursive: true });

  // Hook scripts to copy
  const hookScripts = ['run-check.sh', 'verify-context-file.sh', 'quality-gate.sh', 'subagent-verify.sh'];

  for (const script of hookScripts) {
    const sourcePath = path.join(templatesDir, '.ana/hooks', script);
    const destPath = path.join(hooksDir, script);

    // Copy with verification
    await copyAndVerifyFile(sourcePath, destPath, `.ana/hooks/${script}`);

    // Set executable permissions (chmod +x)
    await fs.chmod(destPath, 0o755);
  }

  spinner.succeed('Copied hook scripts (4 files, executable)');
}

/**
 * Create .claude/ configuration
 *
 * Creates .claude/ directory with settings.json, agents/ directory, agent files,
 * skills directories, and CLAUDE.md at project root.
 * If .claude/ already exists, merges our hooks into existing settings.json.
 * Agent/skill files are copied without overwriting existing ones (merge-not-overwrite).
 *
 * @param cwd - Project root directory
 * @param engineResult - Engine result for skill seeding (null if skipped)
 */
async function createClaudeConfiguration(cwd: string, engineResult: EngineResult | null): Promise<void> {
  const spinner = ora('Creating .claude/ configuration...').start();

  const claudePath = path.join(cwd, '.claude');
  const settingsPath = path.join(claudePath, 'settings.json');
  const agentsPath = path.join(claudePath, 'agents');
  const skillsPath = path.join(claudePath, 'skills');
  const templatesDir = getTemplatesDir();

  // Load our template settings
  const templateSettingsPath = path.join(templatesDir, '.claude/settings.json');
  const templateContent = await fs.readFile(templateSettingsPath, 'utf-8');
  const templateSettings = JSON.parse(templateContent);

  const claudeExists = await dirExists(claudePath);

  if (!claudeExists) {
    // First run: create everything fresh
    await fs.mkdir(claudePath, { recursive: true });
    await fs.mkdir(agentsPath, { recursive: true });
    await fs.mkdir(skillsPath, { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(templateSettings, null, 2), 'utf-8');

    // Copy all agent files
    await copyAgentFiles(agentsPath, templatesDir);

    // Copy all skill files
    await copySkillFiles(skillsPath, templatesDir);

    // Seed skills with detected data
    if (engineResult) {
      await seedSkillFiles(skillsPath, engineResult);
    }

    // Copy CLAUDE.md to project root
    await copyClaudeMd(cwd, templatesDir);

    spinner.succeed('Created .claude/ configuration');
    return;
  }

  // .claude/ exists - handle merge
  const settingsExists = await fileExists(settingsPath);

  if (!settingsExists) {
    // settings.json doesn't exist - create it
    await fs.writeFile(settingsPath, JSON.stringify(templateSettings, null, 2), 'utf-8');
  } else {
    // settings.json exists - try to merge our hooks
    try {
      const existingContent = await fs.readFile(settingsPath, 'utf-8');
      const existingSettings = JSON.parse(existingContent);
      const mergedSettings = mergeHooksSettings(existingSettings, templateSettings);
      await fs.writeFile(settingsPath, JSON.stringify(mergedSettings, null, 2), 'utf-8');
    } catch {
      // Malformed JSON - warn and overwrite with our defaults
      console.log(
        chalk.yellow('\n  Warning: existing .claude/settings.json is malformed, overwriting with Anatomia defaults')
      );
      await fs.writeFile(settingsPath, JSON.stringify(templateSettings, null, 2), 'utf-8');
    }
  }

  // Create agents/ if it doesn't exist
  const agentsExists = await dirExists(agentsPath);
  if (!agentsExists) {
    await fs.mkdir(agentsPath, { recursive: true });
  }

  // Create skills/ if it doesn't exist
  const skillsExists = await dirExists(skillsPath);
  if (!skillsExists) {
    await fs.mkdir(skillsPath, { recursive: true });
  }

  // Copy agent files (merge-not-overwrite)
  await copyAgentFiles(agentsPath, templatesDir);

  // Copy skill files (merge-not-overwrite)
  await copySkillFiles(skillsPath, templatesDir);

  // Seed skills with detected data
  if (engineResult) {
    await seedSkillFiles(skillsPath, engineResult);
  }

  // Copy CLAUDE.md to project root (merge-not-overwrite)
  await copyClaudeMd(cwd, templatesDir);

  spinner.succeed('Created .claude/ configuration (merged)');
}

/**
 * Copy agent files to .claude/agents/
 *
 * Copies agent definition files from templates without overwriting existing ones.
 * This allows user customizations to persist across re-init.
 *
 * @param agentsPath - Path to .claude/agents/ directory
 * @param templatesDir - Path to CLI templates directory
 */
async function copyAgentFiles(agentsPath: string, templatesDir: string): Promise<void> {
  for (const agentFile of AGENT_FILES) {
    const sourcePath = path.join(templatesDir, '.claude/agents', agentFile);
    const destPath = path.join(agentsPath, agentFile);

    // Check if file already exists (don't overwrite)
    const exists = await fileExists(destPath);
    if (exists) {
      // Skip - don't overwrite existing agent files
      continue;
    }

    // Copy with verification
    await copyAndVerifyFile(sourcePath, destPath, `.claude/agents/${agentFile}`);
  }
}

/**
 * Copy skill files to .claude/skills/
 *
 * Copies skill definition files from templates without overwriting existing ones.
 * Each skill lives in its own directory with a SKILL.md file.
 *
 * @param skillsPath - Path to .claude/skills/ directory
 * @param templatesDir - Path to CLI templates directory
 */
async function copySkillFiles(skillsPath: string, templatesDir: string): Promise<void> {
  for (const skillDir of SKILL_DIRS) {
    const destDir = path.join(skillsPath, skillDir);
    const destPath = path.join(destDir, 'SKILL.md');

    // Check if file already exists (don't overwrite)
    const exists = await fileExists(destPath);
    if (exists) {
      // Skip - don't overwrite existing skill files
      continue;
    }

    // Create skill directory
    await fs.mkdir(destDir, { recursive: true });

    // Copy with verification
    const sourcePath = path.join(templatesDir, '.claude/skills', skillDir, 'SKILL.md');
    await copyAndVerifyFile(sourcePath, destPath, `.claude/skills/${skillDir}/SKILL.md`);
  }
}

/**
 * Seed skill files with detected data from EngineResult
 *
 * Reads each copied skill template, injects a ## Detected section
 * below the YAML frontmatter, writes back. Only enriches, never creates.
 *
 * @param skillsDir - Path to .claude/skills/ directory
 * @param result - EngineResult from engine
 */
async function seedSkillFiles(skillsDir: string, result: EngineResult): Promise<void> {
  const seeds: Record<string, string[]> = {};

  // coding-standards
  const codingLines: string[] = [];
  if (result.stack?.language) {
    codingLines.push(`- Language: ${result.stack.language}${result.stack.framework ? ` with ${result.stack.framework}` : ''}`);
  }
  if (result.conventions?.naming?.functions) {
    const f = result.conventions.naming.functions;
    codingLines.push(`- Functions: ${f.majority}${f.confidence ? ` (${(f.confidence * 100).toFixed(0)}% confidence)` : ''}`);
  }
  if (result.conventions?.naming?.files) {
    codingLines.push(`- Files: ${result.conventions.naming.files.majority}`);
  }
  if (result.conventions?.imports) {
    codingLines.push(`- Imports: ${result.conventions.imports.style}`);
  }
  if (result.conventions?.indentation) {
    const i = result.conventions.indentation;
    codingLines.push(`- Indentation: ${i.width ? `${i.width} ` : ''}${i.style}`);
  }
  if (result.patterns?.validation && !('patterns' in result.patterns.validation)) {
    codingLines.push(`- Validation: ${result.patterns.validation.library}`);
  }
  if (codingLines.length > 0) seeds['coding-standards'] = codingLines;

  // testing-standards
  const testingLines: string[] = [];
  if (result.stack?.testing) testingLines.push(`- Framework: ${result.stack.testing}`);
  if (result.commands?.test) testingLines.push(`- Test command: \`${result.commands.test}\``);
  if (result.files?.test !== undefined) testingLines.push(`- Test files: ${result.files.test}`);
  if (testingLines.length > 0) seeds['testing-standards'] = testingLines;

  // git-workflow
  const gitLines: string[] = [];
  if (result.git?.branch) gitLines.push(`- Default branch: ${result.git.branch}`);
  if (result.git?.commitCount) gitLines.push(`- Commits: ${result.git.commitCount}`);
  if (result.git?.contributorCount) gitLines.push(`- Contributors: ${result.git.contributorCount}`);
  gitLines.push('- Co-author: read from `ana.json` coAuthor field');
  if (gitLines.length > 1) seeds['git-workflow'] = gitLines; // more than just coAuthor line

  // deployment
  const deployLines: string[] = [];
  if (result.deployment?.platform) {
    deployLines.push(`- Platform: ${result.deployment.platform}${result.deployment.configFile ? ` (${result.deployment.configFile})` : ''}`);
  }
  if (result.commands?.build) deployLines.push(`- Build command: \`${result.commands.build}\``);
  if (deployLines.length > 0) seeds['deployment'] = deployLines;

  // logging-standards
  const loggingLines: string[] = [];
  const monitoringServices = result.externalServices?.filter(s =>
    s.category === 'monitoring' || s.category === 'observability' || s.category === 'analytics'
  ) || [];
  for (const svc of monitoringServices) {
    loggingLines.push(`- ${svc.category}: ${svc.name}${svc.configFound ? ' (config found)' : ''}`);
  }
  if (loggingLines.length > 0) seeds['logging-standards'] = loggingLines;

  // design-principles — skip entirely (100% human philosophy)

  // Inject ## Detected sections
  for (const [skillName, lines] of Object.entries(seeds)) {
    const filePath = path.join(skillsDir, skillName, 'SKILL.md');
    try {
      let content = await fs.readFile(filePath, 'utf-8');

      // Skip if already seeded (prevent duplicate ## Detected on reinit)
      if (content.includes('## Detected')) continue;

      const detectedSection = `\n## Detected\n${lines.join('\n')}\n`;

      // Find end of YAML frontmatter (second ---)
      const fmEnd = content.indexOf('---', content.indexOf('---') + 3);
      if (fmEnd !== -1) {
        const insertPos = content.indexOf('\n', fmEnd) + 1;
        content = content.slice(0, insertPos) + detectedSection + content.slice(insertPos);
      }

      // For testing-standards: replace commented Commands section with real commands
      if (skillName === 'testing-standards') {
        const commandsBlock = `\n## Commands\n\`\`\`bash\n# Build\n${result.commands?.build || 'your-build-command'}\n\n# Test (non-watch mode)\n${result.commands?.test || 'your-test-command'}\n\n# Lint (all source)\n${result.commands?.lint || 'your-lint-command'}\n\`\`\`\n`;

        // Replace the HTML-commented Commands section
        const cmdCommentStart = content.indexOf('## Commands');
        if (cmdCommentStart !== -1) {
          // Find the end of the commented block (closing -->)
          const commentEnd = content.indexOf('-->', cmdCommentStart);
          if (commentEnd !== -1) {
            content = content.slice(0, cmdCommentStart) + commandsBlock.trim() + '\n' + content.slice(commentEnd + 3).trimStart();
          }
        }
      }

      await fs.writeFile(filePath, content, 'utf-8');
    } catch {
      // File doesn't exist (was skipped in merge-not-overwrite) — skip seeding
    }
  }
}

/**
 * Copy CLAUDE.md to project root
 *
 * Copies CLAUDE.md entry point without overwriting existing one.
 *
 * @param cwd - Project root directory
 * @param templatesDir - Path to CLI templates directory
 */
async function copyClaudeMd(cwd: string, templatesDir: string): Promise<void> {
  const destPath = path.join(cwd, 'CLAUDE.md');

  // Check if file already exists (don't overwrite)
  const exists = await fileExists(destPath);
  if (exists) {
    // Skip - don't overwrite existing CLAUDE.md
    return;
  }

  // Copy with verification
  const sourcePath = path.join(templatesDir, 'CLAUDE.md');
  await copyAndVerifyFile(sourcePath, destPath, 'CLAUDE.md');
}

/**
 * Check if file exists
 * @param filePath - Path to check
 * @returns true if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Merge Anatomia hooks into existing settings
 *
 * Appends our hooks alongside existing ones without duplicates.
 * Uses the hook command path as the unique identifier.
 *
 * @param existing - Existing settings.json content
 * @param template - Our template settings
 * @returns Merged settings object
 */
function mergeHooksSettings(
  existing: Record<string, unknown>,
  template: Record<string, unknown>
): Record<string, unknown> {
  // Start with existing settings
  const merged = { ...existing };

  // Ensure hooks object exists
  if (!merged.hooks || typeof merged.hooks !== 'object') {
    merged.hooks = {};
  }

  const mergedHooks = merged.hooks as Record<string, unknown[]>;
  const templateHooks = (template.hooks || {}) as Record<string, unknown[]>;

  // Merge each hook type (PostToolUse, Stop, etc.)
  for (const hookType of Object.keys(templateHooks)) {
    const templateHookArray = templateHooks[hookType] as HookEntry[];
    const existingHookArray = (mergedHooks[hookType] || []) as HookEntry[];

    // Merge each hook entry
    for (const templateEntry of templateHookArray) {
      const isDuplicate = existingHookArray.some((existingEntry) =>
        hookEntryMatches(existingEntry, templateEntry)
      );

      if (!isDuplicate) {
        existingHookArray.push(templateEntry);
      }
    }

    mergedHooks[hookType] = existingHookArray;
  }

  return merged;
}

/** Hook entry type for merge logic */
interface HookEntry {
  matcher?: string;
  hooks?: Array<{ type: string; command: string; timeout?: number }>;
}

/**
 * Check if two hook entries match (by command path)
 *
 * @param a - First hook entry
 * @param b - Second hook entry
 * @returns true if entries match
 */
function hookEntryMatches(a: HookEntry, b: HookEntry): boolean {
  // Different matchers = different entries
  if (a.matcher !== b.matcher) {
    return false;
  }

  // Check if any command in a matches any command in b
  const aCommands = (a.hooks || []).map((h) => h.command);
  const bCommands = (b.hooks || []).map((h) => h.command);

  return bCommands.some((cmd) => aCommands.includes(cmd));
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
 * Save scan.json — full EngineResult for agent consumption
 *
 * @param tmpAnaPath - Temp .ana/ path
 * @param engineResult - Engine result or null
 */
async function saveScanJson(
  tmpAnaPath: string,
  engineResult: EngineResult | null
): Promise<void> {
  if (!engineResult) return;
  const spinner = ora('Saving scan.json...').start();
  const scanPath = path.join(tmpAnaPath, 'scan.json');
  await fs.writeFile(scanPath, JSON.stringify(engineResult, null, 2), 'utf-8');
  spinner.succeed('Saved scan.json');
}

/**
 * Phase 7: Create ana.json
 *
 * Creates project config with detected data:
 * - commands from EngineResult (not hardcoded)
 * - package manager, framework, language
 * - setupMode: 'not_started'
 *
 * @param tmpAnaPath - Temp .ana/ path
 * @param engineResult - Engine result or null
 * @param setupMode - User-selected setup tier
 */
async function createAnaJson(
  tmpAnaPath: string,
  engineResult: EngineResult | null,
  setupMode: string
): Promise<void> {
  const spinner = ora('Creating ana.json...').start();

  const result = engineResult || createEmptyEngineResult();

  const anaConfig = {
    name: result.overview.project,
    framework: result.stack.framework || null,
    language: result.stack.language || null,
    packageManager: result.commands.packageManager,
    commands: {
      build: result.commands.build || null,
      test: result.commands.test || null,
      lint: result.commands.lint || null,
      dev: result.commands.dev || null,
    },
    coAuthor: 'Ana <build@anatomia.dev>',
    artifactBranch: result.git?.branch || 'main',
    setupMode: setupMode === 'not_started' ? 'not_started' : setupMode,
    scanStaleDays: 7,
  };

  const anaJsonPath = path.join(tmpAnaPath, 'ana.json');
  await fs.writeFile(anaJsonPath, JSON.stringify(anaConfig, null, 2), 'utf-8');

  spinner.succeed('Created ana.json');
}

/**
 * Phase 8: Store engine snapshot
 *
 * Stores full EngineResult to state/snapshot.json.
 * Used by `ana diff` as baseline for detecting drift.
 *
 * @param tmpAnaPath - Temp .ana/ path
 * @param engineResult - Engine result or null
 */
async function storeSnapshot(
  tmpAnaPath: string,
  engineResult: EngineResult | null
): Promise<void> {
  const spinner = ora('Storing analyzer snapshot...').start();

  const result = engineResult || createEmptyEngineResult();

  const snapshotPath = path.join(tmpAnaPath, 'state/snapshot.json');
  await fs.writeFile(snapshotPath, JSON.stringify(result, null, 2), 'utf-8');

  spinner.succeed('Stored analyzer snapshot');
}

/**
 * Build symbol index with graceful failure handling
 *
 * Symbol index is optional - if it fails, citation verification
 * will fall back to file-only checks.
 *
 * @param cwd - Project root directory
 * @param tmpAnaPath - Temp .ana/ path (writes to state/)
 */
async function buildSymbolIndexSafe(cwd: string, tmpAnaPath: string): Promise<void> {
  const spinner = ora('Building symbol index...').start();

  try {
    const statePath = path.join(tmpAnaPath, 'state');
    const index = await buildSymbolIndex(cwd, statePath);
    spinner.succeed(`Symbol index built (${index.symbols.length} symbols from ${index.files_parsed} files)`);
  } catch (error) {
    // Symbol index is optional - warn but don't fail init
    spinner.warn('Symbol index generation failed — citation verification will use file-only checks');
    if (error instanceof Error) {
      console.log(chalk.gray(`  Reason: ${error.message}`));
    }
  }
}

/**
 * Write CLI path for hook scripts to find the CLI
 *
 * Writes absolute paths to node binary and CLI entry point.
 * Used by run-check.sh to invoke ana commands from external projects.
 *
 * @param tmpAnaPath - Temp .ana/ path
 */
async function writeCliPath(tmpAnaPath: string): Promise<void> {
  const stateDir = path.join(tmpAnaPath, 'state');
  await fs.mkdir(stateDir, { recursive: true });

  // Get CLI entry point path (handles both dev and built contexts)
  // import.meta.url points to the currently executing file
  const moduleUrl = fileURLToPath(import.meta.url);
  const moduleDir = dirname(moduleUrl);

  // In bundled context: dist/index.js → dist/index.js is the entry
  // In dev context: src/commands/init.ts → go up to find index.ts
  const isBundle = !moduleDir.includes('/src/');
  const cliEntry = isBundle
    ? moduleUrl // dist/index.js IS the entry
    : path.join(moduleDir, '..', 'index.js'); // src/commands/init.ts → src/index.js (compiled)

  // Store node executable path
  const nodeExec = process.execPath;

  await fs.writeFile(
    path.join(stateDir, 'cli-path'),
    JSON.stringify({ node: nodeExec, cli: cliEntry }),
    'utf-8'
  );
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
 * @param engineResult - Engine result (null if skipped)
 * @param projectName - Project name
 * @param scanTime - Scan duration in seconds
 */
function displaySuccessMessage(engineResult: EngineResult | null, projectName: string, scanTime: string): void {
  console.log('');

  if (engineResult) {
    console.log(chalk.green(`✓ Scanned ${projectName}`) + chalk.gray(` (${scanTime}s)`));
    console.log('');

    // Stack
    const stackParts: string[] = [];
    if (engineResult.stack.language) stackParts.push(engineResult.stack.language);
    if (engineResult.stack.framework) stackParts.push(engineResult.stack.framework);
    if (engineResult.stack.database) {
      let db = engineResult.stack.database;
      const prismaSchema = engineResult.schemas?.prisma;
      if (prismaSchema?.found && prismaSchema.modelCount) {
        db += ` (${prismaSchema.modelCount} models)`;
      }
      stackParts.push(db);
    }
    if (engineResult.stack.auth) stackParts.push(engineResult.stack.auth);
    if (engineResult.stack.testing) stackParts.push(engineResult.stack.testing);
    if (stackParts.length > 0) {
      console.log(`  ${chalk.bold('Stack:')}   ${stackParts.join(' · ')}`);
    }

    // Services (exclude things already in stack)
    const serviceNames = engineResult.externalServices
      .filter(s => !stackParts.some(p => p.includes(s.name)))
      .map(s => s.name);
    if (serviceNames.length > 0) {
      console.log(`  ${chalk.bold('Services:')} ${serviceNames.join(', ')}`);
    }

    // Deploy
    if (engineResult.deployment?.platform) {
      console.log(`  ${chalk.bold('Deploy:')}  ${engineResult.deployment.platform}`);
    }

    console.log('');
  }

  console.log(chalk.green('✓ Context generated → .ana/context/ (7 files)'));
  console.log(chalk.green('✓ Skills seeded → .claude/skills/ (6 files)'));
  console.log(chalk.green('✓ Scan saved → .ana/scan.json'));
  console.log(chalk.green('✓ Config written → .ana/ana.json'));
  console.log('');
  console.log('  Your AI now knows your project. Next:');
  console.log(chalk.cyan('    claude --agent ana') + '    Start working with Ana');
  console.log(chalk.cyan('    ana scan') + '              Refresh project intelligence');
  console.log(chalk.cyan('    ana setup') + '             Deepen context with your knowledge');
  console.log('');
}
