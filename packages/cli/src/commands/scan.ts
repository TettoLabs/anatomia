/**
 * ana scan [path] - Zero-install project scanner
 *
 * Analyzes a project and outputs a terminal report with:
 * - Stack detection (Language, Framework, AI, Database, Auth, Testing, Payments, Workspace)
 * - File counts (source, test, config, total)
 * - Structure map (top directories with purposes)
 *
 * Read-only operation (unless --save). Works without .ana/ directory.
 *
 * Usage:
 *   ana scan           Scan current directory (deep by default)
 *   ana scan <path>    Scan specified path
 *   ana scan --json    Output JSON format
 *   ana scan --quick   Surface-tier only (skip tree-sitter)
 *   ana scan --quiet   Suppress informational stdout
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { EngineResult } from '../engine/types/engineResult.js';
import { formatNumber } from '../utils/fileCounts.js';
import { computeSkillManifest, CORE_SKILLS } from '../constants.js';

/**
 * Display names imported from shared utility
 */
/**
 * Box-drawing characters for terminal output
 */
const BOX = {
  horizontal: '\u2500',
  vertical: '\u2502',
  topLeft: '\u250C',
  topRight: '\u2510',
  bottomLeft: '\u2514',
  bottomRight: '\u2518',
};

/**
 * Relative time from ISO date string
 * @param date - ISO date string
 * @returns Human-readable relative time
 */
function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}

/**
 * Count findings for dynamic CTA (funnel context)
 * @param result - Engine analysis result
 * @returns Number of findings (blind spots + null pattern slots)
 */
function countFindings(result: EngineResult): number {
  let count = result.blindSpots.length;

  // Count null pattern slots when deep scan was attempted
  if (result.overview.depth === 'deep' && result.patterns) {
    const categories = ['errorHandling', 'validation', 'database', 'auth', 'testing'] as const;
    for (const k of categories) {
      if (!result.patterns[k]) count++;
    }
  }

  return count;
}

/**
 * Format human-readable terminal output from EngineResult
 * @param result - Engine analysis result
 * @param options - Display options
 * @param options.isFunnel - Whether in funnel context (no .ana/)
 * @returns Formatted terminal output string
 */
function formatHumanReadable(result: EngineResult, options: { isFunnel: boolean }): string {
  const lines: string[] = [];
  const dateStr = result.overview.scannedAt.split('T')[0];
  const timeStr = new Date(result.overview.scannedAt).toTimeString().slice(0, 5);
  const timestamp = `${dateStr} ${timeStr}`;

  const boxWidth = 71;
  const innerWidth = boxWidth - 2;

  // Header
  const titleLine = `  ana scan`;
  const projectLine = `  ${result.overview.project}`;
  const padding = innerWidth - projectLine.length - timestamp.length;
  const projectWithTimestamp = `${projectLine}${' '.repeat(Math.max(1, padding))}${timestamp}`;

  lines.push(chalk.cyan(BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight));
  lines.push(chalk.cyan(BOX.vertical) + chalk.bold(titleLine.padEnd(innerWidth)) + chalk.cyan(BOX.vertical));
  lines.push(chalk.cyan(BOX.vertical) + projectWithTimestamp.padEnd(innerWidth) + chalk.cyan(BOX.vertical));
  lines.push(chalk.cyan(BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight));
  lines.push('');

  // Stack — D3 order: Language, Framework, AI, Database, Auth, Testing, Payments, Workspace
  lines.push(chalk.bold('  Stack'));
  lines.push(chalk.gray('  ' + BOX.horizontal.repeat(5)));

  const stackItems: Array<[string, string | null]> = [
    ['Language', result.stack.language],
    ['Framework', result.stack.framework],
    ['AI', result.stack.aiSdk],
    ['Database', result.stack.database],
    ['Auth', result.stack.auth],
    ['Testing', result.stack.testing],
    ['Payments', result.stack.payments],
    ['Workspace', result.stack.workspace],
  ];

  let hasStack = false;
  for (const [label, value] of stackItems) {
    if (!value) continue;
    hasStack = true;
    let display = value;

    // Enrich database with model count from schemas
    if (label === 'Database') {
      const schemaKey = Object.keys(result.schemas).find(k =>
        result.schemas[k].found
      );
      if (schemaKey) {
        const schema = result.schemas[schemaKey];
        if (schema.provider) {
          const providerNames: Record<string, string> = {
            postgresql: 'PostgreSQL', mysql: 'MySQL', sqlite: 'SQLite',
            mongodb: 'MongoDB', cockroachdb: 'CockroachDB', sqlserver: 'SQL Server',
          };
          const providerDisplay = providerNames[schema.provider] || schema.provider;
          display = `${value} → ${providerDisplay}`;
        }
        if (schema.modelCount) {
          display += ` (${schema.modelCount} models)`;
        }
      }
    }
    lines.push(`  ${chalk.gray(label.padEnd(12))} ${display}`);
  }
  if (!hasStack) {
    lines.push(chalk.gray('  No code detected'));
  }

  // Services + Deployment (rendered as one block).
  // Dedup is annotated at detection via annotateServiceRoles (Item 5) — if a
  // service fulfills any stack role (database, auth, payments, aiSdk, deployment)
  // it is filtered here. Replaces the old substring-matching `stackValues.some(v => v.includes(svc.name))`
  // pattern that failed when one stack name was a prefix of another.
  const filteredServices = result.externalServices.filter(svc => svc.stackRoles.length === 0);
  const hasServices = filteredServices.length > 0;
  const hasDeploy = result.deployment.platform !== null;
  if (hasServices || hasDeploy) {
    lines.push('');
    lines.push(chalk.bold('  Services'));
    lines.push(chalk.gray('  ' + BOX.horizontal.repeat(8)));
    if (hasServices) {
      const byCategory = new Map<string, string[]>();
      for (const svc of filteredServices) {
        const list = byCategory.get(svc.category) || [];
        list.push(svc.name);
        byCategory.set(svc.category, list);
      }
      const categoryLabels: Record<string, string> = {
        ai: 'AI', payments: 'Payments', email: 'Email', monitoring: 'Monitoring',
        backend: 'Backend', storage: 'Storage', hosting: 'Hosting',
        analytics: 'Analytics', jobs: 'Jobs', cloud: 'Cloud',
      };
      for (const [cat, names] of byCategory) {
        const label = (categoryLabels[cat] || cat).padEnd(12);
        lines.push(`  ${chalk.gray(label)} ${names.join(', ')}`);
      }
    }
    if (hasDeploy) {
      lines.push(`  ${chalk.gray('Deploy'.padEnd(12))} ${result.deployment.platform} ${chalk.gray(`(${result.deployment.configFile})`)}`);
    }
  }

  // CI in deployment
  if (result.deployment.ci) {
    if (!hasServices && !hasDeploy) {
      lines.push('');
      lines.push(chalk.bold('  Services'));
      lines.push(chalk.gray('  ' + BOX.horizontal.repeat(8)));
    }
    lines.push(`  ${chalk.gray('CI'.padEnd(12))} ${result.deployment.ci} ${chalk.gray(`(${result.deployment.ciConfigFile})`)}`);
  }

  // Commands (only if any detected)
  const cmdEntries = [
    ['Build', result.commands.build],
    ['Test', result.commands.test],
    ['Lint', result.commands.lint],
    ['Dev', result.commands.dev],
  ].filter(([, v]) => v) as [string, string][];

  if (cmdEntries.length > 0) {
    lines.push('');
    lines.push(chalk.bold('  Commands'));
    lines.push(chalk.gray('  ' + BOX.horizontal.repeat(8)));
    for (const [label, cmd] of cmdEntries) {
      lines.push(`  ${chalk.gray(label.padEnd(12))} ${cmd}`);
    }
  }

  lines.push('');

  // Files + Git
  if (result.git.head) {
    const commitInfo = `${formatNumber(result.git.commitCount || 0)} commits`;
    const contribInfo = result.git.contributorCount ? ` · ${result.git.contributorCount} contributor${result.git.contributorCount === 1 ? '' : 's'}` : '';
    const branchInfo = result.git.branch || 'detached';
    const lastCommit = result.git.lastCommitAt ? ` · ${timeAgo(result.git.lastCommitAt)}` : '';

    lines.push(chalk.bold('  Files') + '                          ' + chalk.bold('Git'));
    lines.push(chalk.gray('  ' + BOX.horizontal.repeat(5)) + '                          ' + chalk.gray(BOX.horizontal.repeat(3)));
    lines.push(
      `  ${chalk.gray('Source')}  ${formatNumber(result.files.source).padEnd(6)}` +
      `${chalk.gray('Config')}  ${formatNumber(result.files.config).padEnd(10)}` +
      `${commitInfo}${contribInfo}`
    );
    lines.push(
      `  ${chalk.gray('Tests')}   ${formatNumber(result.files.test).padEnd(6)}` +
      `${chalk.gray('Total')}   ${formatNumber(result.files.total).padEnd(10)}` +
      `${branchInfo}${lastCommit}`
    );
  } else {
    lines.push(chalk.bold('  Files'));
    lines.push(chalk.gray('  ' + BOX.horizontal.repeat(5)));
    lines.push(`  ${chalk.gray('Source'.padEnd(12))} ${formatNumber(result.files.source)}`);
    lines.push(`  ${chalk.gray('Tests'.padEnd(12))} ${formatNumber(result.files.test)}`);
    lines.push(`  ${chalk.gray('Config'.padEnd(12))} ${formatNumber(result.files.config)}`);
    lines.push(`  ${chalk.gray('Total'.padEnd(12))} ${formatNumber(result.files.total)}`);
  }

  lines.push('');

  // Structure
  lines.push(chalk.bold('  Structure'));
  lines.push(chalk.gray('  ' + BOX.horizontal.repeat(9)));

  if (result.structure.length === 0) {
    lines.push(chalk.gray('  (empty)'));
  } else {
    for (const item of result.structure) {
      const pathStr = item.path.padEnd(18);
      lines.push(`  ${chalk.cyan(pathStr)}${chalk.gray(item.purpose)}`);
    }
    if (result.structureOverflow > 0) {
      lines.push(chalk.gray(`  +${result.structureOverflow} more directories`));
    }
  }

  // Monorepo packages
  if (result.monorepo.isMonorepo && result.monorepo.packages.length > 0) {
    lines.push('');
    lines.push(chalk.bold('  Packages'));
    lines.push(chalk.gray('  ' + BOX.horizontal.repeat(8)));
    for (const pkg of result.monorepo.packages.slice(0, 10)) {
      const pathStr = pkg.path.padEnd(18);
      lines.push(`  ${chalk.cyan(pathStr)}${chalk.gray(pkg.name)}`);
    }
    if (result.monorepo.packages.length > 10) {
      lines.push(chalk.gray(`  +${result.monorepo.packages.length - 10} more packages`));
    }
  }

  // Patterns (deep only)
  if (result.patterns) {
    const threshold = result.patterns.threshold ?? 0.7;
    const patternEntries: Array<[string, { library: string; variant: string; confidence: number; evidence: string[] }]> = [];
    const patternLabels: Record<string, string> = {
      errorHandling: 'Errors', validation: 'Validation', testing: 'Testing',
      database: 'Database', auth: 'Auth',
    };
    const categories = ['errorHandling', 'validation', 'database', 'auth', 'testing'] as const;
    for (const k of categories) {
      const p = result.patterns[k];
      if (p && p.confidence >= threshold) {
        patternEntries.push([k, p]);
      }
    }
    if (patternEntries.length > 0) {
      lines.push('');
      lines.push(chalk.bold('  Patterns'));
      lines.push(chalk.gray('  ' + BOX.horizontal.repeat(8)));
      for (const [k, p] of patternEntries) {
        const label = (patternLabels[k] || k).padEnd(12);
        const lib = p.library || p.variant || k;
        lines.push(`  ${chalk.gray(label)} ${lib} ${chalk.gray(`(${Math.round(p.confidence * 100)}%)`)}`);
      }
    }
  }

  // Conventions (deep only)
  if (result.conventions) {
    const conv = result.conventions;
    const convLines: string[] = [];

    const functions = conv.naming?.functions;
    if (functions && functions.majority !== 'unknown') {
      const pct = Math.round(functions.confidence * 100);
      convLines.push(`  ${chalk.gray('Functions'.padEnd(12))} ${functions.majority} (${pct}%)`);
    }
    if (conv.imports) {
      const imp = conv.imports;
      const importLabel = (imp.style === 'absolute' && imp.aliasPattern)
        ? `path aliases (${imp.aliasPattern})`
        : imp.style;
      convLines.push(`  ${chalk.gray('Imports'.padEnd(12))} ${importLabel}`);
    }
    if (conv.indentation) {
      const indent = conv.indentation;
      const width = indent.width ? `${indent.width} ` : '';
      convLines.push(`  ${chalk.gray('Indentation'.padEnd(12))} ${width}${indent.style}`);
    }
    // Docstring display removed — phantom analyzer deleted (Item 4).

    if (convLines.length > 0) {
      lines.push('');
      lines.push(chalk.bold('  Conventions'));
      lines.push(chalk.gray('  ' + BOX.horizontal.repeat(11)));
      lines.push(...convLines);
    }
  }

  // Blind Spots (only if non-empty)
  if (result.blindSpots.length > 0) {
    lines.push('');
    lines.push(chalk.bold('  Blind Spots'));
    lines.push(chalk.gray('  ' + BOX.horizontal.repeat(11)));
    for (const spot of result.blindSpots) {
      lines.push(`  ${chalk.yellow(spot.area.padEnd(12))} ${spot.issue}`);
    }
  }

  // Env security warning
  if (result.secrets.envFileExists && !result.secrets.gitignoreCoversEnv) {
    lines.push(chalk.yellow('  ⚠ .env is not in .gitignore — secrets may be committed'));
  }

  lines.push('');

  // Footer CTA — dynamic in funnel context
  if (options.isFunnel) {
    const findings = countFindings(result);
    if (findings === 0) {
      lines.push(chalk.gray('Your project looks clean. Run `ana init` to get started.'));
    } else if (findings <= 2) {
      lines.push(chalk.gray('Found issues your AI assistant will miss. Run `ana init` to fix them.'));
    } else {
      lines.push(chalk.gray('Found ' + findings + ' issues your AI will get wrong. Run `ana init` to fix them.'));
    }
  } else {
    // Dynamic footer: preview what init would create
    const skills = computeSkillManifest(result);
    const conditional = skills.filter((s: string) => !(CORE_SKILLS as readonly string[]).includes(s));
    const stackParts = [result.stack.language, result.stack.framework, result.stack.database].filter(Boolean);

    lines.push('');
    lines.push(chalk.bold('Run `ana init` to give your AI:'));
    if (conditional.length > 0) {
      lines.push(`  ✓ ${skills.length} tailored skills (${CORE_SKILLS.length} core + ${conditional.join(', ')})`);
    } else {
      lines.push(`  ✓ ${skills.length} skills for ${stackParts.join(' · ')}`);
    }
    if (result.externalServices.length > 0) {
      // Dedup via annotated stackRoles (Item 5 — same as the body filter).
      const footerServices = result.externalServices.filter(svc => svc.stackRoles.length === 0);
      if (footerServices.length > 0) {
        const MAX_DISPLAY = 4;
        const svcNames = footerServices.length > MAX_DISPLAY
          ? footerServices.slice(0, MAX_DISPLAY).map((s: { name: string }) => s.name).join(', ') + `, and ${footerServices.length - MAX_DISPLAY} more`
          : footerServices.map((s: { name: string }) => s.name).join(', ');
        lines.push(`  ✓ ${svcNames} integration context`);
      }
    }
  }

  if (result.monorepo.isMonorepo && result.monorepo.packages.length > 0) {
    const firstPkg = result.monorepo.packages[0].path;
    lines.push(chalk.gray(`Scan individual packages: ana scan ${firstPkg}`));
  }

  return lines.join('\n');
}

interface ScanOptions {
  json?: boolean;
  verbose?: boolean;
  save?: boolean;
  quiet?: boolean;
  quick?: boolean;
}

/**
 * Scan command definition
 */
export const scanCommand = new Command('scan')
  .description('Scan project and display tech stack, file counts, and structure')
  .argument('[path]', 'Directory to scan (default: current directory)', '.')
  .option('--json', 'Output JSON format for programmatic consumption')
  .option('--verbose', 'Show detailed analyzer output')
  .option('--save', 'Save scan results to .ana/scan.json')
  .option('-q, --quiet', 'Suppress informational stdout')
  .option('--quick', 'Force surface-tier analysis (skip tree-sitter)')
  .action(async (targetPath: string, options: ScanOptions) => {
    const rootPath = path.resolve(targetPath);

    // Path + --save guard
    if (targetPath !== '.' && options.save) {
      console.error(chalk.red('Error: Cannot combine path argument with --save. Use --json and pipe to a file for subdirectory results.'));
      process.exit(1);
    }

    // Validate directory exists
    try {
      const stats = await fs.stat(rootPath);
      if (!stats.isDirectory()) {
        console.error(chalk.red(`Error: Not a directory: ${rootPath}`));
        process.exit(1);
      }
    } catch {
      console.error(chalk.red(`Error: Path not found: ${rootPath}`));
      process.exit(1);
    }

    // --save creates .ana/ if needed
    if (options.save) {
      const anaDir = path.join(rootPath, '.ana');
      if (!existsSync(anaDir)) {
        await fs.mkdir(anaDir, { recursive: true });
      }
    }

    const spinner = options.json || options.verbose || options.quiet ? null : ora('Scanning project...').start();

    try {
      // Dynamic import to avoid WASM crash at module level
      const { scanProject } = await import('../engine/scan-engine.js');

      const depth = options.quick ? 'surface' as const : 'deep' as const;
      const result = await scanProject(rootPath, { depth });

      if (spinner) spinner.stop();

      // Verbose output (stderr — visible with --quiet)
      if (options.verbose) {
        console.error(chalk.dim('\n=== ENGINE RESULT ==='));
        console.error(chalk.dim('Stack:'), JSON.stringify(result.stack));
        console.error(chalk.dim('Commands:'), JSON.stringify(result.commands));
        console.error(chalk.dim('Git:'), JSON.stringify(result.git));
        console.error(chalk.dim('External services:'), result.externalServices.length);
        console.error(chalk.dim('Blind spots:'), result.blindSpots.length);
        console.error(chalk.dim('====================\n'));
      }

      // Output (stdout — suppressed by --quiet unless --json)
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (!options.quiet) {
        const isFunnel = !existsSync(path.join(rootPath, '.ana'));
        console.log(formatHumanReadable(result, { isFunnel }));
      }

      // Save
      if (options.save) {
        const anaDir = path.join(rootPath, '.ana');
        try {
          await fs.writeFile(path.join(anaDir, 'scan.json'), JSON.stringify(result, null, 2), 'utf-8');
          if (!options.quiet) {
            console.log(chalk.gray('Scan saved to .ana/scan.json'));
          }

          // Update lastScanAt in ana.json
          const anaJsonPath = path.join(anaDir, 'ana.json');
          if (existsSync(anaJsonPath)) {
            try {
              const anaJson = JSON.parse(readFileSync(anaJsonPath, 'utf-8'));
              anaJson.lastScanAt = new Date().toISOString();
              writeFileSync(anaJsonPath, JSON.stringify(anaJson, null, 2) + '\n');
            } catch {
              // ana.json parse/write error — skip silently
            }
          }

          // checkDrift removed (S18/D13)
        } catch (writeError) {
          console.error(chalk.yellow(`Warning: Failed to save scan results. ${writeError instanceof Error ? writeError.message : ''}`));
        }
      }
    } catch (error) {
      if (spinner) spinner.fail('Scan failed');
      if (error instanceof Error) console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Re-export display names for test backward compatibility
export { getLanguageDisplayName, getFrameworkDisplayName, getPatternDisplayName } from '../utils/displayNames.js';
