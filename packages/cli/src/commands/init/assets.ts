/**
 * Asset scaffolding for ana init (Item 14c — extracted from init.ts).
 */

import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import type { EngineResult } from '../../engine/types/engineResult.js';
import { createEmptyEngineResult } from '../../engine/types/engineResult.js';
import { getProjectName } from '../../utils/validators.js';
import {
  generateProjectContextScaffold,
  generateDesignPrinciplesTemplate,
} from '../../utils/scaffold-generators.js';
import { AGENT_FILES, getStackSummary } from '../../constants.js';
import type { InitState } from './types.js';
import { dirExists, fileExists } from './preflight.js';
import { getTemplatesDir, makeTestCommandNonInteractive } from './state.js';
import { scaffoldAndSeedSkills } from './skills.js';

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
export async function createDirectoryStructure(tmpAnaPath: string): Promise<void> {
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
export async function generateScaffolds(
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
export async function copyStaticFilesWithVerification(tmpAnaPath: string): Promise<void> {
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
export async function copyHookScripts(tmpAnaPath: string): Promise<void> {
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
export async function createClaudeConfiguration(cwd: string, engineResult: EngineResult | null, initState: InitState): Promise<void> {
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
    await copyClaudeMd(cwd, templatesDir, engineResult);
    await generateAgentsMd(cwd, engineResult);  // Cross-tool AI standard

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

  // Copy CLAUDE.md + AGENTS.md to project root (merge-not-overwrite)
  await copyClaudeMd(cwd, templatesDir, engineResult);
  await generateAgentsMd(cwd, engineResult);

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
 * Copy CLAUDE.md to project root with project name + stack interpolation
 *
 * Reads template, replaces header with project name, optionally adds stack summary.
 * Does not overwrite existing CLAUDE.md.
 *
 * @param cwd - Project root directory
 * @param templatesDir - Path to CLI templates directory
 * @param engineResult - Engine result for stack interpolation (null if skipped)
 */
async function copyClaudeMd(cwd: string, templatesDir: string, engineResult: EngineResult | null): Promise<void> {
  const destPath = path.join(cwd, 'CLAUDE.md');

  // Check if file already exists (don't overwrite)
  const exists = await fileExists(destPath);
  if (exists) {
    return;
  }

  // Read template and interpolate
  const sourcePath = path.join(templatesDir, 'CLAUDE.md');
  let content = await fs.readFile(sourcePath, 'utf-8');

  // Replace header with project name
  const projectName = await getProjectName(cwd);
  content = content.replace(/^# .*$/m, `# ${projectName}`);

  // Add stack summary after header
  if (engineResult) {
    const stackParts = getStackSummary(engineResult);
    if (stackParts.length > 0) {
      content = content.replace(/^(# .*)$/m, `$1\n\n**Stack:** ${stackParts.join(' · ')}`);
    }
  }

  await fs.writeFile(destPath, content, 'utf-8');
}

/**
 * Generate AGENTS.md for cross-tool AI coding compatibility.
 *
 * AGENTS.md is the Linux Foundation standard read by Cursor, Copilot,
 * Codex, Windsurf, and other AI coding tools. Does not overwrite existing.
 *
 * @param cwd - Project root directory
 * @param engineResult - Engine result for stack/convention interpolation
 */
async function generateAgentsMd(cwd: string, engineResult: EngineResult | null): Promise<void> {
  const destPath = path.join(cwd, 'AGENTS.md');
  if (await fileExists(destPath)) return;

  const projectName = await getProjectName(cwd);
  const lines: string[] = [];

  lines.push(`# ${projectName}`);
  lines.push('');

  if (engineResult) {
    const stackParts = getStackSummary(engineResult);
    if (stackParts.length > 0) {
      lines.push(`${stackParts.join(' · ')}`);
      lines.push('');
    }
  }

  if (engineResult) {
    const cmds = engineResult.commands;
    const cmdLines: string[] = [];
    if (cmds.build) cmdLines.push(`- Build: \`${cmds.build}\``);
    if (cmds.test) {
      const testCmd = makeTestCommandNonInteractive(cmds.test, engineResult.stack.testing);
      cmdLines.push(`- Test: \`${testCmd}\``);
    }
    if (cmds.lint) cmdLines.push(`- Lint: \`${cmds.lint}\``);
    if (cmds.dev) cmdLines.push(`- Dev: \`${cmds.dev}\``);
    if (cmdLines.length > 0) {
      lines.push('## Commands');
      lines.push(...cmdLines);
      lines.push('');
    }
  }

  if (engineResult?.conventions) {
    const convLines: string[] = [];
    const naming = engineResult.conventions.naming;
    if (naming?.functions && naming.functions.majority !== 'unknown') {
      convLines.push(`- Functions: ${naming.functions.majority}`);
    }
    if (naming?.files && naming.files.majority !== 'unknown') {
      convLines.push(`- Files: ${naming.files.majority}`);
    }
    const imp = engineResult.conventions.imports;
    if (imp) {
      const importStyle = (imp.style === 'absolute' && imp.aliasPattern)
        ? `path aliases (${imp.aliasPattern})`
        : imp.style;
      convLines.push(`- Imports: ${importStyle}`);
    }
    const indent = engineResult.conventions.indentation;
    if (indent) {
      convLines.push(`- Indentation: ${indent.style}, ${indent.width} wide`);
    }
    if (convLines.length > 0) {
      lines.push('## Conventions');
      lines.push(...convLines);
      lines.push('');
    }
  }

  // Services (from external service detection)
  if (engineResult && engineResult.externalServices.length > 0) {
    lines.push('## Services');
    for (const svc of engineResult.externalServices) {
      lines.push(`- ${svc.name} (${svc.category})`);
    }
    lines.push('');
  }

  // Scan-derived constraints
  lines.push('## Constraints');
  const constraintLines: string[] = [];
  if (engineResult?.conventions?.naming?.functions?.majority &&
      engineResult.conventions.naming.functions.majority !== 'unknown') {
    constraintLines.push(`- ${engineResult.conventions.naming.functions.majority} for function names`);
  }
  if (engineResult?.conventions?.imports?.aliasPattern) {
    constraintLines.push(`- Use ${engineResult.conventions.imports.aliasPattern} path aliases for imports`);
  }
  if (engineResult?.commands.build) {
    constraintLines.push(`- Run \`${engineResult.commands.build}\` before committing`);
  }
  if (constraintLines.length === 0) {
    constraintLines.push('- Follow existing patterns in the codebase');
  }
  constraintLines.push('- Run tests before committing');
  lines.push(...constraintLines);
  lines.push('');

  await fs.writeFile(destPath, lines.join('\n'), 'utf-8');
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
