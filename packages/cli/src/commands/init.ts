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
 *   │   ├── analysis.md           (generated from analyzer)
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
import type { AnalysisResult } from '../engine/index.js';
import { dirname } from 'node:path';
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
  STEP_FILES,
  FRAMEWORK_SNIPPETS,
  AGENT_FILES,
  SKILL_DIRS,
  META_VERSION,
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
  .action(async (options: InitCommandOptions) => {
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
      const analysisResult = await runAnalyzer(cwd, options);

      // Reset cache override after analysis
      ASTCache.setCacheDir(null);
      await createDirectoryStructure(tmpAnaPath);
      await generateAnalysisMd(tmpAnaPath, analysisResult, cwd);
      await generateScaffolds(tmpAnaPath, analysisResult, cwd);
      await copyStaticFilesWithVerification(tmpAnaPath);
      await copyHookScripts(tmpAnaPath);
      await createAnaJson(tmpAnaPath, analysisResult, setupMode);
      await storeSnapshot(tmpAnaPath, analysisResult);
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
      await createClaudeConfiguration(cwd);

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
    const metaPath = path.join(anaPath, 'ana.json');
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);

      if (meta.setupStatus === 'pending') {
        console.log('Setup is incomplete. Options:\n');
        console.log('  1. Resume setup: `claude --agent ana-setup`');
        console.log('  2. Start over: ana init --force\n');
      } else if (meta.setupStatus === 'complete') {
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
    // Use the new engine's analyzeProject() — runs deep for init (Decision 13)
    const { analyzeProject } = await import('../engine/analyze.js');
    const engineResult = await analyzeProject(rootPath, { depth: 'deep' });

    // Map EngineResult back to AnalysisResult shape for downstream consumers
    // This adapter is temporary — removed in S11 when init is redesigned
    const result: AnalysisResult = {
      projectType: engineResult.stack.language
        ? Object.entries({
            'Node.js': 'node', 'Python': 'python', 'Go': 'go', 'Rust': 'rust',
            'Ruby': 'ruby', 'PHP': 'php', 'TypeScript': 'node',
          }).find(([display]) => display === engineResult.stack.language)?.[1] || 'unknown'
        : 'unknown',
      framework: engineResult.stack.framework
        ? Object.entries({
            'Next.js': 'nextjs', 'React': 'react', 'Vue': 'vue', 'Express': 'express',
            'NestJS': 'nestjs', 'FastAPI': 'fastapi', 'Django': 'django', 'Flask': 'flask',
            'Rails': 'rails', 'Svelte': 'svelte', 'Angular': 'angular',
          }).find(([display]) => display === engineResult.stack.framework)?.[1] || engineResult.stack.framework.toLowerCase()
        : null,
      confidence: { projectType: 0.9, framework: engineResult.stack.framework ? 0.9 : 0 },
      indicators: { projectType: [], framework: [] },
      detectedAt: engineResult.overview.scannedAt,
      version: '0.2.0',
      patterns: engineResult.patterns || undefined,
      conventions: engineResult.conventions || undefined,
    };

    spinner.succeed('Analysis complete');
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
 * Phase 4: Generate analysis.md
 *
 * Calls formatAnalysisBrief() and writes to context/analysis.md
 *
 * @param tmpAnaPath - Temp .ana/ path
 * @param analysisResult - Analyzer result or null
 * @param _cwd - Project root (unused)
 */
async function generateAnalysisMd(
  tmpAnaPath: string,
  analysisResult: AnalysisResult | null,
  _cwd: string
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
 */
async function createClaudeConfiguration(cwd: string): Promise<void> {
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
 * Phase 7: Create ana.json
 *
 * Creates framework metadata file with initial state:
 * - setupStatus: 'pending' (setup not run yet)
 * - setupMode: from user selection
 * - framework: from analyzer
 * - analyzerVersion: from analyzer
 *
 * @param tmpAnaPath - Temp .ana/ path
 * @param analysisResult - Analyzer result or null
 * @param setupMode - User-selected setup tier
 */
async function createAnaJson(
  tmpAnaPath: string,
  analysisResult: AnalysisResult | null,
  setupMode: string
): Promise<void> {
  const spinner = ora('Creating ana.json...').start();

  const analysis = analysisResult || createEmptyAnalysisResult();

  const meta = {
    version: META_VERSION,
    createdAt: new Date().toISOString(),
    artifactBranch: 'main',
    commands: {
      build: 'npm run build',
      test: 'npm test',
      lint: 'npm run lint'
    },
    coAuthor: 'Ana <build@anatomia.dev>',
    setupStatus: 'pending',
    setupCompletedAt: null,
    setupMode,
    framework: analysis.framework,
    analyzerVersion: analysis.version,
    lastEvolve: null,
    lastHealth: null,
    sessionCount: 0,
  };

  const metaPath = path.join(tmpAnaPath, 'ana.json');
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

  spinner.succeed('Created ana.json');
}

/**
 * Phase 8: Store analyzer snapshot
 *
 * Stores raw AnalysisResult to state/snapshot.json.
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

  const snapshotPath = path.join(tmpAnaPath, 'state/snapshot.json');
  await fs.writeFile(snapshotPath, JSON.stringify(analysis, null, 2), 'utf-8');

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
 * @param _analysisResult - Analyzer result (unused)
 */
function displaySuccessMessage(_analysisResult: AnalysisResult | null): void {
  console.log(chalk.green('\n✅ .ana/ framework initialized\n'));

  console.log(chalk.bold('Created:'));
  console.log('  • 7 context scaffolds (with analyzer data)');
  console.log('  • 9 agents — Ana, AnaPlan, AnaBuild, AnaVerify, Setup + 4 sub-agents (.claude/agents/)');
  console.log('  • 6 team-editable skills (.claude/skills/)');
  console.log('  • SCHEMAS.md artifact reference (.ana/docs/)');
  console.log('  • Plan directories (.ana/plans/)');
  console.log('  • Hook scripts (.ana/hooks/)');
  console.log('  • CLAUDE.md entry point');
  console.log();

  console.log(chalk.bold('Next: ') + 'Complete setup in Claude Code:');
  console.log(chalk.cyan('  claude --agent ana-setup'));
  console.log();

  console.log(chalk.gray('Setup fills your context files through codebase exploration and targeted questions (~5-15 min).'));
  console.log(chalk.gray('After setup: claude --agent ana'));
  console.log();
}
