/**
 * ana setup - Setup-related commands
 *
 * Subcommands:
 * - complete: Validate context files and generate ENTRY.md
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { AnalysisResult } from 'anatomia-analyzer';
import {
  validateStructure,
  validateContent,
  validateCrossReferences,
  validateQuality,
  getProjectName,
  fileExists,
  type ValidationError,
} from '../utils/validators.js';
import { VALID_SETUP_TIERS, META_VERSION } from '../constants.js';
import { createCheckCommand } from './check.js';
import { createIndexCommand } from './index.js';

interface SetupCompleteOptions {
  mode?: string;
}

/**
 * Type guard to check if string is valid setup tier
 * @param tier - Setup tier to validate
 * @returns true if valid setup tier
 */
function isValidSetupTier(tier: string): tier is typeof VALID_SETUP_TIERS[number] {
  return VALID_SETUP_TIERS.includes(tier as typeof VALID_SETUP_TIERS[number]);
}

/** Create setup parent command */
export const setupCommand = new Command('setup').description(
  'Setup-related commands'
);

/** Add 'check' subcommand */
setupCommand.addCommand(createCheckCommand());

/** Add 'index' subcommand */
setupCommand.addCommand(createIndexCommand());

/** Add 'complete' subcommand */
setupCommand
  .command('complete')
  .description('Validate context files and generate ENTRY.md')
  .option(
    '--mode <tier>',
    'Setup tier used (quick|guided|complete) - overrides auto-detection'
  )
  .action(async (options: SetupCompleteOptions) => {
    const cwd = process.cwd();
    const anaPath = path.join(cwd, '.ana');

    console.log(chalk.blue('\n🔍 Validating setup...\n'));

    // Check .ana/ exists
    if (!(await fileExists(anaPath))) {
      console.error(chalk.red('Error: .ana/ directory not found'));
      console.error(
        chalk.gray('Run `ana init` first to create .ana/ structure.')
      );
      process.exit(1);
    }

    // Load snapshot for cross-reference validation
    const snapshotPath = path.join(anaPath, '.state/snapshot.json');
    if (!(await fileExists(snapshotPath))) {
      console.error(chalk.red('Error: snapshot.json not found'));
      console.error(
        chalk.gray('Run `ana init` to recreate .ana/ with snapshot.')
      );
      process.exit(1);
    }

    let snapshot: AnalysisResult;
    try {
      const content = await fs.readFile(snapshotPath, 'utf-8');
      snapshot = JSON.parse(content);
    } catch (error) {
      console.error(chalk.red('Error: Failed to parse snapshot.json'));
      if (error instanceof Error) {
        console.error(chalk.gray(error.message));
      }
      process.exit(1);
    }

    // Phase 1: Structural validation
    console.log(chalk.gray('Checking file structure...'));
    const structuralErrors = await validateStructure(anaPath);

    // Phase 2: Content validation
    console.log(chalk.gray('Checking required sections...'));
    const contentErrors = await validateContent(anaPath);

    // Phase 3: Cross-reference validation
    console.log(chalk.gray('Cross-referencing with analyzer data...'));
    const crossRefErrors = await validateCrossReferences(anaPath, snapshot);

    // Phase 4: Quality checks
    console.log(chalk.gray('Running quality checks...'));
    const warnings = await validateQuality(anaPath);

    // Check for blocking failures
    const allErrors = [...structuralErrors, ...contentErrors, ...crossRefErrors];

    if (allErrors.length > 0) {
      console.log(chalk.red('\n❌ Validation failed\n'));
      displayValidationFailures(allErrors);
      process.exit(1);
    }

    // Display soft warnings (don't block)
    if (warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Quality warnings:\n'));
      warnings.forEach((w) => {
        console.log(chalk.yellow(`  ${w.message}`));
      });
      console.log();
    }

    // All validation passed - proceed with generation
    console.log(chalk.green('✅ All validations passed\n'));

    // Phase 5: Generate ENTRY.md
    console.log(chalk.gray('Generating ENTRY.md...'));
    await generateEntryMd(anaPath, cwd);

    // Phase 6: Generate/update CLAUDE.md
    console.log(chalk.gray('Updating CLAUDE.md...'));
    await generateClaudeMd(cwd, anaPath);

    // Phase 7: Update .meta.json
    console.log(chalk.gray('Updating .meta.json...'));
    await updateMetaJson(anaPath, cwd, options);

    // Success
    console.log(chalk.green('\n✅ Setup complete!\n'));
    console.log('Framework is ready. Reference @.ana/ENTRY.md to begin.');
    console.log();

    // What's Next guidance
    console.log(chalk.bold('📋 What\'s Next\n'));
    console.log('  1. Commit your context:');
    console.log('     git add .ana/ CLAUDE.md && git commit -m "Add Anatomia context framework"');
    console.log();
    console.log('  2. Start your next session:');
    console.log('     Open Claude Code and load @.ana/ENTRY.md — Ana will greet you');
    console.log('     and suggest the right mode for your task.');
    console.log();
    console.log('  3. Share with your team:');
    console.log('     Push to your branch. Teammates get the same context on pull.');
    console.log('     Each person can re-run setup to add their own Q&A responses.');
    console.log();
    console.log(chalk.dim('  💡 Context stays accurate with: ana diff (coming soon)'));
    console.log();
  });

/**
 * Display validation failures in readable format
 * @param errors - Array of validation errors to display
 */
function displayValidationFailures(errors: ValidationError[]): void {
  errors.forEach((error) => {
    console.log(chalk.red(`  [${error.rule}] ${error.file}`));
    console.log(chalk.gray(`      ${error.message}`));
    console.log();
  });

  console.log(chalk.gray('Fix the issues above and run `ana setup complete` again.'));
  console.log();
}

/**
 * Generate ENTRY.md from template
 *
 * Replaces 3 variables:
 * - {{projectName}} - from package.json or directory
 * - {{timestamp}} - current ISO timestamp
 * - {{version}} - CLI version from package.json
 *
 * @param anaPath - Path to .ana/ directory
 * @param cwd - Project root (for getProjectName)
 */
async function generateEntryMd(anaPath: string, cwd: string): Promise<void> {
  // Get project name (priority: package.json → pyproject.toml → go.mod → dirname)
  const projectName = await getProjectName(cwd);

  // Get CLI version - detect bundle vs dev context
  const moduleUrl = new URL('.', import.meta.url);
  const isBundle = !moduleUrl.pathname.includes('/src/');
  const cliPkgPath = isBundle
    ? new URL('../package.json', import.meta.url) // dist/index.js → ../package.json = cli/package.json
    : new URL('../../package.json', import.meta.url); // src/commands/setup.ts → ../../package.json = cli/package.json
  const cliPkgContent = await fs.readFile(cliPkgPath, 'utf-8');
  const cliPkg = JSON.parse(cliPkgContent);
  const cliVersion = cliPkg.version || '0.2.0';

  // Get timestamp
  const timestamp = new Date().toISOString();

  // Get template directory (handles dev vs built)
  const templatesDir = getTemplatesDir();
  const templatePath = path.join(templatesDir, 'ENTRY.md');

  // Read template
  const template = await fs.readFile(templatePath, 'utf-8');

  // Replace variables (simple string replacement, not Handlebars)
  const generated = template
    .replace(/\{\{projectName\}\}/g, projectName)
    .replace(/\{\{timestamp\}\}/g, timestamp)
    .replace(/\{\{version\}\}/g, cliVersion);

  // Write to .ana/ENTRY.md
  const entryPath = path.join(anaPath, 'ENTRY.md');
  await fs.writeFile(entryPath, generated, 'utf-8');
}

/**
 * Get templates directory (handles dev vs built contexts)
 *
 * Build structure (verified):
 * - dist/index.js (bundled entry point)
 * - dist/templates/ (copied from templates/)
 *
 * Dev structure:
 * - src/commands/setup.ts
 * - templates/ (at project root)
 *
 * @returns Path to templates/ directory
 */
function getTemplatesDir(): string {
  const fileUrl = import.meta.url;
  const __filename = new URL(fileUrl).pathname;
  const __dirname = path.dirname(__filename);

  const isBuilt = __dirname.includes('dist');

  return isBuilt
    ? path.join(__dirname, 'templates') // dist/ → dist/templates/
    : path.join(__dirname, '..', '..', 'templates'); // src/commands/ → templates/
}

/**
 * Generate or update CLAUDE.md with Anatomia section
 *
 * Merge strategy:
 * 1. If marker found: replace section between markers
 * 2. If no marker: append section at end
 * 3. If no file: create with section only
 *
 * @param cwd - Project root directory
 * @param anaPath - Path to .ana/ directory
 */
async function generateClaudeMd(cwd: string, anaPath: string): Promise<void> {
  const claudeMdPath = path.join(cwd, 'CLAUDE.md');
  const contextDir = path.join(anaPath, 'context');

  // Count verified context files
  let contextFileCount = 0;
  try {
    const files = await fs.readdir(contextDir);
    contextFileCount = files.filter((f) => f.endsWith('.md') && f !== 'analysis.md').length;
  } catch {
    contextFileCount = 7; // default
  }

  const today = new Date().toISOString().split('T')[0];

  const anatomiaSection = [
    '<!-- Anatomia Context Framework — do not edit this section -->',
    `<!-- Last setup: ${today} | Run \`ana setup\` to update -->`,
    '',
    `This project uses Anatomia for AI context management (${contextFileCount} verified context files).`,
    '',
    'Available modes: @.ana/modes/code.md · @.ana/modes/debug.md · @.ana/modes/test.md · @.ana/modes/architect.md',
    '',
    'For full context and all modes: @.ana/ENTRY.md',
    '<!-- End Anatomia section -->',
  ].join('\n');

  const startMarker = '<!-- Anatomia Context Framework';
  const endMarker = '<!-- End Anatomia section -->';

  let finalContent: string;

  try {
    const existing = await fs.readFile(claudeMdPath, 'utf-8');
    const startIdx = existing.indexOf(startMarker);
    const endIdx = existing.indexOf(endMarker);

    if (startIdx !== -1 && endIdx !== -1) {
      // Replace existing Anatomia section
      finalContent =
        existing.substring(0, startIdx) +
        anatomiaSection +
        existing.substring(endIdx + endMarker.length);
    } else {
      // Append to existing file
      finalContent = existing.trimEnd() + '\n\n' + anatomiaSection + '\n';
    }
  } catch {
    // No existing file — create new
    finalContent = anatomiaSection + '\n';
  }

  try {
    await fs.writeFile(claudeMdPath, finalContent, 'utf-8');
    console.log(chalk.green('  ✅ CLAUDE.md updated (Anatomia section)'));
  } catch (error) {
    // CLAUDE.md is nice-to-have, not a gate
    console.log(chalk.yellow('  ⚠️  Could not update CLAUDE.md (non-fatal)'));
    if (error instanceof Error) {
      console.log(chalk.gray(`     ${error.message}`));
    }
  }
}

/**
 * Update .meta.json after successful validation
 *
 * Sets:
 * - setupStatus: 'complete'
 * - setupCompletedAt: current timestamp
 * - setupMode: Priority: CLI --mode flag (highest) → .setup_tier file → error (no inference)
 *
 * @param anaPath - Path to .ana/ directory
 * @param cwd - Project root
 * @param options - Command options (may have --mode flag)
 */
async function updateMetaJson(
  anaPath: string,
  cwd: string,
  options: SetupCompleteOptions
): Promise<void> {
  const metaPath = path.join(anaPath, '.meta.json');

  // Read existing .meta.json
  let meta: Record<string, unknown>;
  try {
    const content = await fs.readFile(metaPath, 'utf-8');
    meta = JSON.parse(content);
  } catch (error) {
    // If .meta.json doesn't exist or is corrupt, create minimal
    meta = {
      version: META_VERSION,
      createdAt: new Date().toISOString(),
    };
  }

  // Determine setupMode (priority order)
  let setupMode: string;

  // Priority 1: CLI flag (explicit override)
  if (options.mode) {
    setupMode = options.mode;

    // Validate tier value
    if (!isValidSetupTier(setupMode)) {
      console.error(chalk.red(`Error: Invalid --mode value: ${setupMode}`));
      console.error(chalk.gray(`Valid values: ${VALID_SETUP_TIERS.join(', ')}`));
      process.exit(1);
    }
  }
  // Priority 2: Handoff file from CC
  else {
    const handoffPath = path.join(anaPath, '.setup_tier');
    if (await fileExists(handoffPath)) {
      try {
        setupMode = (await fs.readFile(handoffPath, 'utf-8')).trim();

        // Cleanup handoff file
        await fs.unlink(handoffPath);
      } catch (error) {
        // File read failed - error, don't fall back
        console.error(chalk.red('Error: Failed to read .setup_tier file'));
        if (error instanceof Error) {
          console.error(chalk.gray(error.message));
        }
        console.error(chalk.gray('Run with --mode <quick|guided|complete> to specify manually.'));
        process.exit(1);
      }
    }
    // Priority 3: Error if no handoff file
    else {
      console.error(chalk.red('Error: Cannot determine setup tier.'));
      console.error(chalk.gray('Setup should have written .ana/.setup_tier file.'));
      console.error(chalk.gray('Run with --mode <quick|guided|complete> to specify manually.'));
      process.exit(1);
    }
  }

  // Update meta fields
  meta.setupStatus = 'complete';
  meta.setupCompletedAt = new Date().toISOString();
  meta.setupMode = setupMode;

  // Write back to file (formatted JSON)
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

  console.log(chalk.gray(`  Setup mode: ${setupMode}`));
}
