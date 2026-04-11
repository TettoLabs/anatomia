/**
 * Runtime utilities + state/display for ana init (Item 14c — extracted from init.ts).
 *
 * confirm lives here (not in preflight.ts) so preflight.ts can import it
 * without a cycle: preflight → state is one-way.
 */

import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import type { EngineResult } from '../../engine/types/engineResult.js';
import { createEmptyEngineResult } from '../../engine/types/engineResult.js';
import { getStackSummary, CONTEXT_FILES, CORE_SKILLS, computeSkillManifest } from '../../constants.js';
import { matchGotchas } from '../../utils/gotchas.js';
import { buildSymbolIndex } from '../symbol-index.js';

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
export async function confirm(message: string, defaultYes: boolean): Promise<boolean> {
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
 * Phase 2: Run analyzer
 *
 * Runs analyzer with spinner, displays detection summary.
 * Graceful degradation: if analyzer fails, returns null (empty scaffolds created).
 *
 * @param rootPath - Project root directory
 * @returns EngineResult or null if failed
 */
export async function runAnalyzer(
  rootPath: string
): Promise<EngineResult | null> {
  const spinner = ora('Analyzing project...').start();

  try {
    const { scanProject } = await import('../../engine/scan-engine.js');
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
export function displayDetectionSummary(result: EngineResult): void {
  console.log();

  // Stack
  const stackParts = getStackSummary(result);
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

  // Services (deduped against stack + deployment via annotated stackRoles, Item 5).
  if (result.externalServices.length > 0) {
    const dedupedSvcs = result.externalServices.filter(svc => svc.stackRoles.length === 0);
    if (dedupedSvcs.length > 0) {
      const MAX_DISPLAY = 4;
      const names = dedupedSvcs.length > MAX_DISPLAY
        ? dedupedSvcs.slice(0, MAX_DISPLAY).map(s => s.name).join(', ') + `, and ${dedupedSvcs.length - MAX_DISPLAY} more`
        : dedupedSvcs.map(s => s.name).join(', ');
      console.log(chalk.green('  ✓ Services: ') + names);
    }
  }

  console.log();
}

/**
 * Get CLI version from package.json
 * @returns CLI version string
 */
export async function getCliVersion(): Promise<string> {
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
export function getTemplatesDir(): string {
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
export async function saveScanJson(
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
export function makeTestCommandNonInteractive(
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
export async function createAnaJson(
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
export async function buildSymbolIndexSafe(cwd: string, tmpAnaPath: string): Promise<void> {
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
 * Phase 9: Atomic rename
 *
 * Moves temp .ana/ to final location atomically.
 * Handles cross-filesystem scenario (EXDEV error).
 *
 * @param tmpAnaPath - Temp .ana/ path
 * @param anaPath - Final .ana/ path
 */
export async function atomicRename(tmpAnaPath: string, anaPath: string): Promise<void> {
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
export function displaySuccessMessage(engineResult: EngineResult | null, projectName: string, scanTime: string): void {
  console.log('');

  if (engineResult) {
    console.log(chalk.green(`✓ Scanned ${projectName}`) + chalk.gray(` (${scanTime}s)`));
    console.log('');

    // Stack summary (shared definition in constants.ts)
    const stackParts = getStackSummary(engineResult);
    if (stackParts.length > 0) {
      console.log(`  ${chalk.bold('Stack:')}    ${stackParts.join(' · ')}`);
    }
    if (engineResult.deployment?.platform) {
      console.log(`  ${chalk.bold('Deploy:')}   ${engineResult.deployment.platform}`);
    }
    // Services (deduped via annotated stackRoles, Item 5).
    if (engineResult.externalServices.length > 0) {
      const uniqueServices = engineResult.externalServices.filter(svc => svc.stackRoles.length === 0);
      if (uniqueServices.length > 0) {
        const MAX_DISPLAY = 4;
        const names = uniqueServices.length > MAX_DISPLAY
          ? uniqueServices.slice(0, MAX_DISPLAY).map((s: { name: string }) => s.name).join(', ') + `, and ${uniqueServices.length - MAX_DISPLAY} more`
          : uniqueServices.map((s: { name: string }) => s.name).join(', ');
        console.log(`  ${chalk.bold('Services:')} ${names}`);
      }
    }
    console.log('');
  }

  // Context files
  console.log(chalk.green(`✓ Context → .ana/context/ (${CONTEXT_FILES.length} files)`));

  // Skills — dynamic count with Core/Detected breakdown
  if (engineResult) {
    const analysis = engineResult;
    const manifest = computeSkillManifest(analysis);
    // Widen coreSkills to string[] so .includes() accepts the any-string
    // manifest entries (Item 2.6 — CORE_SKILLS is a readonly literal union
    // tuple, .includes() expects its narrow union, manifest is string[]).
    const coreSkills: string[] = [...CORE_SKILLS];
    const conditionalSkills = manifest.filter(s => !coreSkills.includes(s));

    console.log(chalk.green(`✓ Skills → .claude/skills/ (${manifest.length} skills)`));
    console.log(`    ${chalk.gray('Core:')}      ${coreSkills.join(', ')}`);
    if (conditionalSkills.length > 0) {
      console.log(`    ${chalk.gray('Detected:')}  ${conditionalSkills.join(', ')}`);
    }

    // Gotcha count
    const gotchas = matchGotchas(engineResult);
    const totalGotchas = Array.from(gotchas.values()).reduce((sum, arr) => sum + arr.length, 0);
    if (totalGotchas > 0) {
      console.log(chalk.green(`  ✓ ${totalGotchas} gotcha${totalGotchas > 1 ? 's' : ''} pre-populated`));
    }
  }

  // Cross-tool files
  console.log(chalk.green('  ✓ Cross-tool: CLAUDE.md + AGENTS.md'));

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
