/**
 * ana init - Initialize .ana/ context framework
 *
 * Complete rewrite for STEP 2.5 - integrates analyzer, no prompts.
 *
 * Creates:
 *   .ana/
 *   ├── hooks/                    (CC hook scripts)
 *   │   ├── verify-context-file.sh
 *   │   └── run-check.sh
 *   ├── context/
 *   │   ├── project-context.md    (scan-seeded D6.6 scaffold)
 *   │   ├── design-principles.md  (static human-content template)
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
 *   │   └── ana-verify.md         (quality gate agent)
 *   └── skills/
 *       ├── testing-standards/SKILL.md
 *       ├── coding-standards/SKILL.md
 *       ├── git-workflow/SKILL.md
 *       ├── deployment/SKILL.md
 *       └── troubleshooting/SKILL.md
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
import { createInterface } from 'node:readline';
import { execSync } from 'node:child_process';
import type { EngineResult } from '../engine/types/engineResult.js';

import {
  generateProjectContextScaffold,
  generateDesignPrinciplesTemplate,
} from '../utils/scaffold-generators.js';
import { getProjectName } from '../utils/validators.js';
import {
  AGENT_FILES,
  CONTEXT_FILES,
  CORE_SKILLS,
  computeSkillManifest,
} from '../constants.js';
import { buildSymbolIndex } from './symbol-index.js';

/** Command options */
interface InitCommandOptions {
  force?: boolean;
  yes?: boolean;
}

/** Installation state detected during pre-scan validation */
type InitState = 'fresh' | 'reinit' | 'upgrade' | 'corrupted';

/** Pre-flight validation result */
interface PreflightResult {
  canProceed: boolean;
  initState: InitState;
  stateBackup?: string; // Path to state/ backup if --force used
  contextBackup?: string; // Path to context/ backup if --force used
  anaJsonBackup?: string; // Path to ana.json backup if --force used
}

/**
 * Prompt user for confirmation
 *
 * If stdin is not a TTY (CI, piped input, test harness), returns the default
 * without blocking. This prevents hangs in non-interactive environments.
 *
 * @param message - Message to display before the (Y/n) or (y/N) suffix
 * @param defaultYes - If true, empty input means yes; if false, empty means no
 * @returns true if user confirmed
 */
async function confirm(message: string, defaultYes: boolean): Promise<boolean> {
  // Non-interactive (CI, piped input, test harness): proceed without blocking
  if (!process.stdin.isTTY) {
    return defaultYes;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const suffix = defaultYes ? '(Y/n)' : '(y/N)';
  return new Promise((resolve) => {
    rl.question(`${message} ${suffix} `, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === '') resolve(defaultYes);
      else resolve(trimmed === 'y' || trimmed === 'yes');
    });
  });
}

/**
 * Create empty analysis result for fallback
 *
 * Used when analyzer fails.
 * Scaffolds handle undefined optional fields gracefully.
 *
 * @returns Minimal valid EngineResult
 */
function createEmptyEngineResult(): EngineResult {
  return {
    overview: { project: 'unknown', scannedAt: new Date().toISOString(), depth: 'surface' },
    stack: { language: null, framework: null, database: null, auth: null, testing: null, payments: null, workspace: null, aiSdk: null },
    files: { source: 0, test: 0, config: 0, total: 0 },
    structure: [],
    structureOverflow: 0,
    commands: { build: null, test: null, lint: null, dev: null, packageManager: 'npm' },
    git: { head: null, branch: null, commitCount: null, lastCommitAt: null, uncommittedChanges: false, contributorCount: null, defaultBranch: null, branches: null },
    monorepo: { isMonorepo: false, tool: null, packages: [] },
    externalServices: [],
    schemas: {},
    secrets: { envFileExists: false, envExampleExists: false, gitignoreCoversEnv: false },
    projectProfile: { type: null, hasExternalAPIs: false, hasDatabase: false, hasBrowserUI: false, hasAuthSystem: false, hasPayments: false, hasFileStorage: false },
    blindSpots: [],
    deployment: { platform: null, configFile: null, ci: null, ciConfigFile: null },
    patterns: null,
    conventions: null,
    secretFindings: null,
    envVarMap: null,
    duplicates: null,
    circularDeps: null,
    orphanFiles: null,
    complexityHotspots: null,
    gitIntelligence: null,
    dependencyIntelligence: null,
    technicalDebtMarkers: null,
    inconsistencies: null,
    conventionBreaks: null,
    aiReadinessScore: null,
    recommendations: null,
    health: null,
    readiness: null,
  };
}

/** Create init command */
export const initCommand = new Command('init')
  .description('Initialize .ana/ context framework')
  .option('-f, --force', 'Overwrite existing .ana/ (preserves state/)')
  .option('-y, --yes', 'Skip confirmation prompts (non-interactive mode)')
  .action(async (options: InitCommandOptions, command: Command) => {
    // Reject positional arguments (init operates on cwd)
    if (command.args.length > 0) {
      console.error(chalk.red(`Error: ana init does not accept a path argument.`));
      console.error(chalk.gray('cd into the project directory and run: ana init'));
      process.exit(1);
    }

    const cwd = process.cwd();
    const anaPath = path.join(cwd, '.ana');

    // Phase 1: Pre-scan validation (D7)
    const preflight = await validateInitPreconditions(cwd, anaPath, options);
    if (!preflight.canProceed) {
      return; // Exit already handled in validation
    }

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
      const engineResult = await runAnalyzer(cwd);

      // Reset cache override after analysis
      ASTCache.setCacheDir(null);
      await createDirectoryStructure(tmpAnaPath);
      await generateScaffolds(tmpAnaPath, engineResult);
      await copyStaticFilesWithVerification(tmpAnaPath);
      await copyHookScripts(tmpAnaPath);
      await saveScanJson(tmpAnaPath, engineResult);
      await createAnaJson(tmpAnaPath, engineResult);
      // snapshot.json removed (S18/D5 — orphaned, nothing reads it)
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

      // Restore context/ if --force was used
      if (preflight.contextBackup) {
        const contextDir = path.join(tmpAnaPath, 'context');
        await fs.rm(contextDir, { recursive: true, force: true }).catch(() => {});
        await fs.rename(preflight.contextBackup, contextDir);
      }

      // Restore ana.json then overwrite mechanical fields
      if (preflight.anaJsonBackup) {
        const newAnaJsonPath = path.join(tmpAnaPath, 'ana.json');
        let restoredJson: Record<string, unknown>;
        try {
          restoredJson = JSON.parse(await fs.readFile(preflight.anaJsonBackup, 'utf-8'));
        } catch {
          // Backup is corrupt — skip restore, keep freshly generated ana.json
          restoredJson = {};
        }
        if (Object.keys(restoredJson).length > 0) {
          let newJson: Record<string, unknown>;
          try {
            newJson = JSON.parse(await fs.readFile(newAnaJsonPath, 'utf-8'));
          } catch {
            newJson = {};
          }
          // Preserve user fields from backup, overwrite only mechanical fields from new
          const merged = {
            ...restoredJson,
            ...(newJson.anaVersion != null ? { anaVersion: newJson.anaVersion } : {}),
            ...(newJson.lastScanAt != null ? { lastScanAt: newJson.lastScanAt } : {}),
          };
          await fs.writeFile(newAnaJsonPath, JSON.stringify(merged, null, 2) + '\n');
        }
        await fs.rm(preflight.anaJsonBackup).catch(() => {});
      }

      // SUCCESS: Atomic rename
      await atomicRename(tmpAnaPath, anaPath);

      // Create .claude/ configuration (outside temp directory - handles merge)
      await createClaudeConfiguration(cwd, engineResult, preflight.initState);

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
 * Phase 1: Pre-scan validation (D7)
 *
 * Validates project environment before scanning:
 * 7.1 — Project root detection
 * 7.2 — Existing installation detection (fresh/reinit/upgrade/corrupted)
 * 7.4 — Git validation (4 states)
 * 7.5 — Package manager check
 *
 * @param cwd - Current working directory
 * @param anaPath - Path to .ana/ directory
 * @param options - Command options
 * @returns Preflight result (canProceed, initState, optional stateBackup path)
 */
async function validateInitPreconditions(
  cwd: string,
  anaPath: string,
  options: InitCommandOptions
): Promise<PreflightResult> {
  const autoYes = options.yes || options.force;

  // Check directory is readable/writable
  try {
    await fs.access(cwd, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    console.error(chalk.red('Error: Cannot read/write current directory'));
    console.error(chalk.gray('Check permissions: ls -la .'));
    process.exit(1);
  }

  // 7.1 — Project root detection
  const rootIndicators = ['package.json', 'go.mod', 'Cargo.toml', 'pyproject.toml', '.git'];
  const hasRoot = await Promise.all(
    rootIndicators.map(f => fileExists(path.join(cwd, f)))
  ).then(results => results.some(Boolean));

  if (!hasRoot) {
    console.error(chalk.red('No project root detected in this directory.'));
    console.error(chalk.gray("Run `ana init` from your project's root directory."));
    process.exit(1);
  }

  // 7.2 — Existing installation detection (4 states)
  const anaExists = await dirExists(anaPath);
  let initState: InitState = 'fresh';
  let stateBackup: string | undefined;
  let contextBackup: string | undefined;
  let anaJsonBackup: string | undefined;

  if (anaExists) {
    const anaJsonPath = path.join(anaPath, 'ana.json');
    const cliVersion = await getCliVersion();

    try {
      const anaJsonContent = await fs.readFile(anaJsonPath, 'utf-8');
      const config = JSON.parse(anaJsonContent);

      if (config.anaVersion && config.anaVersion !== cliVersion) {
        // Upgrade: version mismatch
        initState = 'upgrade';
        console.log(`\nAnatomia installation detected (v${config.anaVersion}).`);
        console.log(`Current CLI version: v${cliVersion}.\n`);
        console.log('Re-initializing will update scan data and skill detection.');
        console.log('Your confirmed rules, gotchas, and context files are preserved.\n');

        if (!autoYes) {
          const proceed = await confirm('Continue?', true);
          if (!proceed) { process.exit(0); }
        }
      } else {
        // Re-init: same version (or no anaVersion field yet)
        initState = 'reinit';
        console.log('\nExisting Anatomia installation detected.\n');
        console.log('This will:');
        console.log('  ✓ Refresh scan data');
        console.log('  ✓ Update skill ## Detected sections');
        console.log('  ✓ Add new skills if stack changes detected');
        console.log('  ✗ Will NOT touch your confirmed rules, gotchas, or context files\n');

        if (!autoYes) {
          const proceed = await confirm('Continue?', true);
          if (!proceed) { process.exit(0); }
        }
      }
    } catch {
      // Corrupted: .ana/ exists but no valid ana.json
      initState = 'corrupted';
      console.log(chalk.yellow('\nFound .ana/ directory but no valid ana.json.'));
      console.log('Treating as fresh initialization. Existing files may be overwritten.\n');

      if (!autoYes) {
        const proceed = await confirm('Continue?', true);
        if (!proceed) { process.exit(0); }
      }
    }

    // Backup before deletion for reinit/upgrade/corrupted
    const timestamp = Date.now();
    const statePath = path.join(anaPath, 'state');
    if (await dirExists(statePath)) {
      stateBackup = path.join(os.tmpdir(), `.ana-state-backup-${timestamp}`);
      console.log(chalk.gray('Backing up state/ directory...'));
      await fs.cp(statePath, stateBackup, { recursive: true });
    }

    // Back up context/ (user-enriched files)
    const contextPath = path.join(anaPath, 'context');
    if (await dirExists(contextPath)) {
      contextBackup = path.join(os.tmpdir(), `.ana-context-backup-${timestamp}`);
      console.log(chalk.gray('Backing up context/ directory...'));
      await fs.cp(contextPath, contextBackup, { recursive: true });
    }

    // Back up ana.json (user fields like setupMode, coAuthor)
    const anaJsonBackupPath = path.join(anaPath, 'ana.json');
    try {
      await fs.access(anaJsonBackupPath);
      anaJsonBackup = path.join(os.tmpdir(), `.ana-json-backup-${timestamp}`);
      await fs.cp(anaJsonBackupPath, anaJsonBackup);
    } catch { /* no ana.json to back up */ }

    // Delete existing .ana/
    console.log(chalk.gray('Removing existing .ana/...'));
    await fs.rm(anaPath, { recursive: true, force: true });
  }

  // 7.4 — Git validation (4 states)
  const hasGit = await dirExists(path.join(cwd, '.git'));

  if (!hasGit) {
    // No git at all — strong warning, default NO
    console.log(chalk.yellow('\n⚠ No git repository detected.\n'));
    console.log("Anatomia's pipeline requires git for:");
    console.log('  • Feature branching (ana work start)');
    console.log('  • Artifact commits (ana artifact save)');
    console.log('  • Pull requests (ana pr create)');
    console.log('  • Proof chain tracking\n');
    console.log('Init will continue but pipeline commands will not function.');
    console.log('Scan, skills, and context files will still work.\n');

    if (!autoYes) {
      const proceed = await confirm('Initialize without git?', false);
      if (!proceed) { process.exit(0); }
    }
  } else {
    // Git exists — check remote and commits
    try {
      const hasCommits = gitHasCommits(cwd);
      const hasRemote = gitHasRemote(cwd);

      if (hasCommits && !hasRemote) {
        console.log(chalk.blue('ℹ No remote detected. artifactBranch will use local branch names. ana pr create won\'t function until a remote is added.'));
      } else if (!hasCommits) {
        console.log(chalk.yellow('⚠ Empty git repository. Some scan data will be limited. Commit at least once before running the pipeline.'));
      }
      // Git + remote + commits = happy path, proceed silently
    } catch {
      // Git check failed — proceed with warning
      console.log(chalk.yellow('⚠ Git validation failed. Proceeding with limited git detection.'));
    }
  }

  // 7.5 — Package manager check
  const hasPackageJson = await fileExists(path.join(cwd, 'package.json'));
  const hasGoMod = await fileExists(path.join(cwd, 'go.mod'));
  const hasCargo = await fileExists(path.join(cwd, 'Cargo.toml'));
  const hasPyproject = await fileExists(path.join(cwd, 'pyproject.toml'));
  const hasPackageManifest = hasPackageJson || hasGoMod || hasCargo || hasPyproject;

  if (!hasPackageManifest) {
    console.log(chalk.yellow('⚠ No package.json (or equivalent) found. Stack detection will be limited.'));
  } else if (hasPackageJson) {
    const hasNodeModules = await dirExists(path.join(cwd, 'node_modules'));
    if (!hasNodeModules) {
      // Detect package manager for the message
      let pkgMgr = 'npm';
      if (await fileExists(path.join(cwd, 'pnpm-lock.yaml'))) pkgMgr = 'pnpm';
      else if (await fileExists(path.join(cwd, 'yarn.lock'))) pkgMgr = 'yarn';
      else if (await fileExists(path.join(cwd, 'bun.lockb'))) pkgMgr = 'bun';
      console.log(chalk.blue(`ℹ Dependencies not installed. Convention detection may be limited. Run ${pkgMgr} install for deeper detection.`));
    }
  }

  return {
    canProceed: true,
    initState,
    stateBackup,
    contextBackup,
    anaJsonBackup,
  };
}

/**
 * Check if git repository has any commits
 * @param cwd - Working directory
 * @returns true if HEAD exists (has commits)
 */
function gitHasCommits(cwd: string): boolean {
  try {
    execSync('git rev-parse --verify HEAD', { cwd, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if git repository has a remote configured
 * @param cwd - Working directory
 * @returns true if at least one remote exists
 */
function gitHasRemote(cwd: string): boolean {
  try {
    const output = execSync('git remote', { cwd, stdio: 'pipe', encoding: 'utf-8' });
    return output.trim().length > 0;
  } catch {
    return false;
  }
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
 * @returns EngineResult or null if failed
 */
async function runAnalyzer(
  rootPath: string
): Promise<EngineResult | null> {
  const spinner = ora('Analyzing project...').start();

  try {
    const { scanProject } = await import('../engine/scan-engine.js');
    const engineResult = await scanProject(rootPath, { depth: 'deep' });

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
 * Display scan progress after analysis (D7.6)
 *
 * Shows incremental detection results. Null values skipped.
 *
 * @param result - Engine result from scan
 */
function displayDetectionSummary(result: EngineResult): void {
  console.log();

  // Stack
  const stackParts = [result.stack.language, result.commands.packageManager, result.stack.testing].filter(Boolean);
  if (stackParts.length > 0) {
    console.log(chalk.green('  ✓ Stack: ') + stackParts.join(' · '));
  }

  // Files
  if (result.files.source > 0 || result.files.test > 0) {
    console.log(chalk.green('  ✓ Files: ') + `${result.files.source} source, ${result.files.test} tests`);
  }

  // Git
  const gitParts: string[] = [];
  if (result.git.defaultBranch) gitParts.push(`${result.git.defaultBranch} branch`);
  if (result.git.commitCount !== null) gitParts.push(`${result.git.commitCount} commits`);
  if (result.git.contributorCount !== null) gitParts.push(`${result.git.contributorCount} contributors`);
  if (gitParts.length > 0) {
    console.log(chalk.green('  ✓ Git: ') + gitParts.join(', '));
  }

  // Patterns
  if (result.patterns) {
    const categories = ['errorHandling', 'validation', 'database', 'auth', 'testing'] as const;
    const detected = categories.filter(c => result.patterns?.[c] != null).length;
    const depth = result.overview.depth === 'deep' ? 'deep scan' : 'surface tier';
    console.log(chalk.green('  ✓ Patterns: ') + `${detected} detected (${depth})`);
  }

  // Services
  if (result.externalServices.length > 0) {
    const names = result.externalServices.map(s => s.name).join(', ');
    console.log(chalk.green('  ✓ Services: ') + names);
  }

  console.log();
}

/**
 * Phase 3: Create directory structure
 *
 * Creates all required directories for .ana/ framework:
 * - context/
 * - docs/
 * - plans/active/, plans/completed/
 * - state/
 *
 * Step files and framework-snippets directories removed (D10.9).
 *
 * @param tmpAnaPath - Path to temp .ana/ directory
 */
async function createDirectoryStructure(tmpAnaPath: string): Promise<void> {
  const spinner = ora('Creating directory structure...').start();

  // Create directories (recursive: true creates parents)
  await fs.mkdir(path.join(tmpAnaPath, 'context'), { recursive: true });
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
`;
  await fs.writeFile(path.join(tmpAnaPath, '.gitignore'), gitignoreContent, 'utf-8');

  spinner.succeed('Directory structure created');
}

/**
 * Phase 5: Generate context scaffolds (D8.3 — consolidated 7→2)
 *
 * Writes 2 context files:
 * - project-context.md: scan-seeded D6.6 format with 6 sections
 * - design-principles.md: static human-content template
 *
 * @param tmpAnaPath - Temp .ana/ path
 * @param engineResult - Engine result or null
 */
async function generateScaffolds(
  tmpAnaPath: string,
  engineResult: EngineResult | null,
): Promise<void> {
  const spinner = ora('Generating context scaffolds...').start();

  // Use empty result if analyzer failed
  const analysis = engineResult || createEmptyEngineResult();

  // Generate 2 context files
  const projectContext = generateProjectContextScaffold(analysis);
  const designPrinciples = generateDesignPrinciplesTemplate();

  await fs.writeFile(path.join(tmpAnaPath, 'context', 'project-context.md'), projectContext, 'utf-8');
  await fs.writeFile(path.join(tmpAnaPath, 'context', 'design-principles.md'), designPrinciples, 'utf-8');

  const totalLines = projectContext.split('\n').length + designPrinciples.split('\n').length;
  spinner.succeed(`Generated 2 context scaffolds (${totalLines} lines total)`);
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
 * Copies static template files from CLI templates/ to .ana/:
 * - 9 mode files
 * - 1 SCHEMAS.md
 *
 * Step files, framework-snippets, templates.md, SETUP_GUIDE.md, rules.md removed (D10.9).
 *
 * Each file verified with SHA-256 hash after copy.
 *
 * @param tmpAnaPath - Temp .ana/ path
 */
async function copyStaticFilesWithVerification(tmpAnaPath: string): Promise<void> {
  const spinner = ora('Copying static files...').start();

  const templatesDir = getTemplatesDir();

  // SCHEMAS.md
  const schemasSource = path.join(templatesDir, '.ana/docs/SCHEMAS.md');
  const schemasDest = path.join(tmpAnaPath, 'docs/SCHEMAS.md');
  await copyAndVerifyFile(schemasSource, schemasDest, '.ana/docs/SCHEMAS.md');

  spinner.succeed('Copied static files');
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
  const hookScripts = ['run-check.sh', 'verify-context-file.sh'];

  for (const script of hookScripts) {
    const sourcePath = path.join(templatesDir, '.ana/hooks', script);
    const destPath = path.join(hooksDir, script);

    // Copy with verification
    await copyAndVerifyFile(sourcePath, destPath, `.ana/hooks/${script}`);

    // Set executable permissions (chmod +x)
    await fs.chmod(destPath, 0o755);
  }

  spinner.succeed('Copied hook scripts (2 files, executable)');
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
 * @param initState - Installation state from pre-scan validation
 */
async function createClaudeConfiguration(cwd: string, engineResult: EngineResult | null, initState: InitState): Promise<void> {
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

    // Copy and seed skill files (dynamic manifest)
    await scaffoldAndSeedSkills(skillsPath, templatesDir, engineResult, 'fresh');

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

  // Copy and seed skill files (dynamic manifest, re-init aware)
  await scaffoldAndSeedSkills(skillsPath, templatesDir, engineResult, initState);

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
 * Scaffold and seed skill files using dynamic manifest (D8.2, D8.9)
 *
 * Uses computeSkillManifest() to determine which skills to scaffold.
 * Fresh init: copy template + inject Detected.
 * Re-init: read existing file, REPLACE ## Detected section, preserve human content.
 * Custom user skills (not in manifest) are never touched.
 *
 * @param skillsPath - Path to .claude/skills/ directory
 * @param templatesDir - Path to CLI templates directory
 * @param engineResult - Engine result for skill seeding (null if skipped)
 * @param initState - Installation state (fresh/reinit/upgrade/corrupted)
 */
async function scaffoldAndSeedSkills(
  skillsPath: string,
  templatesDir: string,
  engineResult: EngineResult | null,
  initState: InitState
): Promise<void> {
  const analysis = engineResult || createEmptyEngineResult();
  const skillsToScaffold = computeSkillManifest(analysis);
  const isReinit = initState === 'reinit' || initState === 'upgrade';

  for (const skillName of skillsToScaffold) {
    const destDir = path.join(skillsPath, skillName);
    const destPath = path.join(destDir, 'SKILL.md');
    const sourcePath = path.join(templatesDir, '.claude/skills', skillName, 'SKILL.md');

    // Check if template exists
    const templateExists = await fileExists(sourcePath);
    if (!templateExists) continue;

    const existingSkill = await fileExists(destPath);

    let content: string;
    if (existingSkill && isReinit) {
      // Re-init: read existing file, REPLACE ## Detected only
      content = await fs.readFile(destPath, 'utf-8');
    } else if (existingSkill) {
      // Fresh/corrupted but file exists — refresh Detected section only (D8)
      content = await fs.readFile(destPath, 'utf-8');
      if (engineResult) {
        const injector = SKILL_INJECTORS[skillName];
        if (injector) {
          const detectedContent = injector(engineResult);
          content = replaceDetectedSection(content, detectedContent);
        }
      }
      await fs.writeFile(destPath, content, 'utf-8');
      continue;
    } else {
      // New skill: copy from template
      await fs.mkdir(destDir, { recursive: true });
      content = await fs.readFile(sourcePath, 'utf-8');
    }

    // Inject Detected content
    if (engineResult) {
      const injector = SKILL_INJECTORS[skillName];
      if (injector) {
        const detectedContent = injector(engineResult);
        content = replaceDetectedSection(content, detectedContent);
      }
    }

    await fs.writeFile(destPath, content, 'utf-8');
  }
}

// ============================================================
// Skill Detected Injection (D6.5, D8.2)
// ============================================================

type DetectedInjector = (result: EngineResult) => string;

const SKILL_INJECTORS: Record<string, DetectedInjector> = {
  'coding-standards': injectCodingStandards,
  'testing-standards': injectTestingStandards,
  'git-workflow': injectGitWorkflow,
  'deployment': injectDeployment,
  'troubleshooting': () => '',
  'ai-patterns': injectAiPatterns,
  'api-patterns': injectApiPatterns,
  'data-access': injectDataAccess,
};

function injectCodingStandards(result: EngineResult): string {
  const lines: string[] = [];
  if (result.stack.language) {
    lines.push(`- Language: ${result.stack.language}${result.stack.framework ? ` with ${result.stack.framework}` : ''}`);
  }
  if (result.conventions) {
    const naming = result.conventions.naming;
    if (naming?.functions?.confidence > 0) {
      lines.push(`- Functions: ${naming.functions.majority} (${Math.round(naming.functions.confidence * 100)}%)`);
    }
    if (naming?.classes?.confidence > 0) {
      lines.push(`- Classes: ${naming.classes.majority} (${Math.round(naming.classes.confidence * 100)}%)`);
    }
    if (naming?.files?.confidence > 0) {
      lines.push(`- Files: ${naming.files.majority} (${Math.round(naming.files.confidence * 100)}%)`);
    }
    if (result.conventions.imports?.style) {
      lines.push(`- Imports: ${result.conventions.imports.style} (${Math.round(result.conventions.imports.confidence * 100)}%)`);
    }
    if (result.conventions.indentation?.style) {
      const indent = result.conventions.indentation;
      lines.push(`- Indentation: ${indent.style === 'tabs' ? 'tabs' : `${indent.style}, ${indent.width} wide`}`);
    }
  }
  if (result.patterns?.errorHandling) {
    const eh = result.patterns.errorHandling;
    const variant = eh.variant ? ` (${eh.variant})` : '';
    lines.push(`- Error handling: ${eh.library}${variant}`);
  }
  return lines.join('\n');
}

function injectTestingStandards(result: EngineResult): string {
  const lines: string[] = [];
  if (result.stack.testing) lines.push(`- Framework: ${result.stack.testing}`);
  if (result.files.test > 0) lines.push(`- Test files: ${result.files.test}`);
  if (result.commands.test) lines.push(`- Test command: ${result.commands.test}`);
  if (result.patterns?.testing) {
    const t = result.patterns.testing;
    const variant = t.variant ? ` (${t.variant})` : '';
    lines.push(`- Testing patterns: ${t.library}${variant}`);
  }
  return lines.join('\n');
}

function injectGitWorkflow(result: EngineResult): string {
  const lines: string[] = [];
  if (result.git.defaultBranch) lines.push(`- Default branch: ${result.git.defaultBranch}`);
  if (result.git.branch) lines.push(`- Current branch: ${result.git.branch}`);
  if (result.git.commitCount !== null) lines.push(`- Commits: ${result.git.commitCount}`);
  if (result.git.contributorCount !== null) lines.push(`- Contributors: ${result.git.contributorCount}`);
  return lines.join('\n');
}

function injectDeployment(result: EngineResult): string {
  const lines: string[] = [];
  if (result.deployment.platform) lines.push(`- Platform: ${result.deployment.platform}`);
  if (result.deployment.configFile) lines.push(`- Config: ${result.deployment.configFile}`);
  if (result.deployment.ci) lines.push(`- CI: ${result.deployment.ci}`);
  return lines.join('\n');
}

function injectAiPatterns(result: EngineResult): string {
  if (result.stack.aiSdk) return `- AI SDK: ${result.stack.aiSdk}`;
  return '';
}

function injectApiPatterns(result: EngineResult): string {
  if (result.stack.framework) return `- Framework: ${result.stack.framework}`;
  return '';
}

function injectDataAccess(result: EngineResult): string {
  const lines: string[] = [];
  if (result.stack.database) lines.push(`- Database: ${result.stack.database}`);
  const schemaEntries = Object.entries(result.schemas).filter(([, s]) => s.found);
  for (const [name, schema] of schemaEntries) {
    const parts = [name];
    if (schema.modelCount !== null) parts.push(`${schema.modelCount} models`);
    if (schema.path) parts.push(schema.path);
    lines.push(`- Schema: ${parts.join(', ')}`);
  }
  return lines.join('\n');
}

/**
 * Replace ## Detected section content while preserving all other sections (D6.13)
 *
 * Machine/human boundary: ## Detected is machine-owned (auto-refreshable),
 * ## Rules, ## Gotchas, ## Examples are human-owned (never overwritten).
 *
 * @param fileContent - Full file content
 * @param newDetectedContent - New content for the Detected section (lines only, no heading)
 * @returns Updated file content
 */
function replaceDetectedSection(fileContent: string, newDetectedContent: string): string {
  const detectedIdx = fileContent.indexOf('## Detected');
  if (detectedIdx === -1) return fileContent;

  // Find the next ## heading after ## Detected
  const afterDetected = fileContent.indexOf('\n## ', detectedIdx + 1);
  const endIdx = afterDetected === -1 ? fileContent.length : afterDetected;

  const before = fileContent.slice(0, detectedIdx);
  const after = afterDetected === -1 ? '' : fileContent.slice(endIdx);

  const trimmed = newDetectedContent.trim();
  const body = trimmed ? trimmed + '\n' : '';

  return before + '## Detected\n' + body + after;
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
 * Make test command non-interactive for pipeline use
 *
 * Vitest runs in watch mode by default — append --run to disable.
 * Jest --watch is removed for CI compatibility.
 *
 * @param testCommand - Raw test command from package.json
 * @param testingFramework - Detected testing framework
 * @returns Non-interactive test command or null
 */
function makeTestCommandNonInteractive(
  testCommand: string | null,
  testingFramework: string | null
): string | null {
  if (!testCommand) return null;
  if (testingFramework === 'Vitest' && !testCommand.includes('--run')) {
    return `${testCommand} -- --run`;
  }
  if (testingFramework === 'Jest' && testCommand.includes('--watch')) {
    return testCommand.replace('--watch', '').trim();
  }
  return testCommand;
}

/**
 * Phase 7: Create ana.json (D1 schema)
 *
 * Creates project config with detected data. Every field is a contract
 * consumed by pipeline agents — see D1 for the canonical schema.
 *
 * @param tmpAnaPath - Temp .ana/ path
 * @param engineResult - Engine result or null
 */
async function createAnaJson(
  tmpAnaPath: string,
  engineResult: EngineResult | null
): Promise<void> {
  const spinner = ora('Creating ana.json...').start();

  const result = engineResult || createEmptyEngineResult();
  const cliVersion = await getCliVersion();

  const anaConfig = {
    anaVersion: cliVersion,
    name: result.overview.project,
    language: result.stack.language || null,
    framework: result.stack.framework || null,
    packageManager: result.commands.packageManager,
    commands: {
      build: result.commands.build || null,
      test: makeTestCommandNonInteractive(result.commands.test, result.stack.testing),
      lint: result.commands.lint || null,
      dev: result.commands.dev || null,
    },
    coAuthor: 'Ana <build@anatomia.dev>',
    artifactBranch: result.git.defaultBranch ?? result.git.branch ?? 'main',
    setupMode: 'not_started',
    setupCompletedAt: null,
    lastScanAt: result.overview.scannedAt,
  };

  const anaJsonPath = path.join(tmpAnaPath, 'ana.json');
  await fs.writeFile(anaJsonPath, JSON.stringify(anaConfig, null, 2), 'utf-8');

  spinner.succeed('Created ana.json');
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
  const moduleDir = path.dirname(moduleUrl);

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
 * Display completion UX after init (D8.8)
 *
 * Dynamic skill counts, conditional callout, two-path next steps.
 * Null values skipped throughout.
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

    // Stack summary
    const stackParts = [engineResult.stack.language, engineResult.stack.framework, engineResult.stack.database].filter(Boolean);
    if (stackParts.length > 0) {
      console.log(`  ${chalk.bold('Stack:')}    ${stackParts.join(' · ')}`);
    }
    if (engineResult.stack.aiSdk) {
      console.log(`  ${chalk.bold('AI:')}       ${engineResult.stack.aiSdk}`);
    }
    if (engineResult.stack.testing) {
      console.log(`  ${chalk.bold('Testing:')}  ${engineResult.stack.testing}`);
    }
    if (engineResult.deployment?.platform) {
      console.log(`  ${chalk.bold('Deploy:')}   ${engineResult.deployment.platform}`);
    }
    if (engineResult.externalServices.length > 0) {
      const names = engineResult.externalServices.map((s: { name: string }) => s.name).join(', ');
      console.log(`  ${chalk.bold('Services:')} ${names}`);
    }
    console.log('');
  }

  // Context files
  console.log(chalk.green(`✓ Context → .ana/context/ (${CONTEXT_FILES.length} files)`));

  // Skills — dynamic count with Core/Detected breakdown
  if (engineResult) {
    const analysis = engineResult;
    const manifest = computeSkillManifest(analysis);
    const coreSkills = [...CORE_SKILLS];
    const conditionalSkills = manifest.filter(s => !coreSkills.includes(s));

    console.log(chalk.green(`✓ Skills → .claude/skills/ (${manifest.length} skills)`));
    console.log(`    ${chalk.gray('Core:')}      ${coreSkills.join(', ')}`);
    if (conditionalSkills.length > 0) {
      console.log(`    ${chalk.gray('Detected:')}  ${conditionalSkills.join(', ')}`);
    }
  }

  console.log('');

  // Config values
  if (engineResult) {
    const artifactBranch = engineResult.git.defaultBranch ?? engineResult.git.branch ?? 'main';
    console.log(`  ${chalk.bold('Branch:')}   ${artifactBranch}`);
    const displayTest = makeTestCommandNonInteractive(engineResult.commands.test, engineResult.stack.testing);
    if (displayTest) {
      console.log(`  ${chalk.bold('Test:')}     ${displayTest}`);
    }
    if (engineResult.commands.build) {
      console.log(`  ${chalk.bold('Build:')}    ${engineResult.commands.build}`);
    }
    console.log('');
  }

  // Two-path next steps
  console.log('  Next:');
  console.log(chalk.cyan('    claude --agent ana') + '          Start working (Ana knows your stack)');
  console.log(chalk.cyan('    claude --agent ana-setup') + '    Enrich with your team\'s knowledge (optional, ~10 min)');
  console.log('');
}
