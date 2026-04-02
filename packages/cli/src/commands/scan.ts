/**
 * ana scan [path] - Zero-install project scanner
 *
 * Analyzes a project and outputs a terminal report with:
 * - Stack detection (Language, Framework, Database, Auth, Testing)
 * - File counts (source, test, config, total)
 * - Structure map (top directories with purposes)
 *
 * Read-only operation - creates no files, modifies nothing.
 * Works without .ana/ directory (no init required).
 *
 * Usage:
 *   ana scan           Scan current directory
 *   ana scan <path>    Scan specified path
 *   ana scan --json    Output JSON format
 *   ana scan --deep    Include patterns and conventions (tree-sitter)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { EngineResult } from '../engine/types/engineResult.js';
import { formatNumber } from '../utils/fileCounts.js';

/**
 * Display name mappings kept here for test exports (backward compat)
 */
const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  node: 'Node.js', python: 'Python', go: 'Go', rust: 'Rust',
  ruby: 'Ruby', php: 'PHP', java: 'Java', kotlin: 'Kotlin',
  swift: 'Swift', csharp: 'C#', cpp: 'C++', c: 'C',
  typescript: 'TypeScript', unknown: 'Unknown',
};

const FRAMEWORK_DISPLAY_NAMES: Record<string, string> = {
  nextjs: 'Next.js', react: 'React', vue: 'Vue', angular: 'Angular',
  svelte: 'Svelte', express: 'Express', fastify: 'Fastify', nestjs: 'NestJS',
  fastapi: 'FastAPI', django: 'Django', flask: 'Flask', rails: 'Rails',
  sinatra: 'Sinatra', gin: 'Gin', echo: 'Echo', fiber: 'Fiber',
  actix: 'Actix', rocket: 'Rocket', spring: 'Spring',
  laravel: 'Laravel', symfony: 'Symfony',
};

const PATTERN_DISPLAY_NAMES: Record<string, string> = {
  prisma: 'Prisma', drizzle: 'Drizzle', typeorm: 'TypeORM',
  sequelize: 'Sequelize', mongoose: 'Mongoose', sqlalchemy: 'SQLAlchemy',
  django_orm: 'Django ORM', activerecord: 'ActiveRecord', gorm: 'GORM',
  diesel: 'Diesel', nextauth: 'NextAuth', 'next-auth': 'NextAuth',
  passport: 'Passport', clerk: 'Clerk', auth0: 'Auth0',
  firebase_auth: 'Firebase Auth', supabase_auth: 'Supabase Auth',
  jwt: 'JWT', oauth: 'OAuth', vitest: 'Vitest', jest: 'Jest',
  mocha: 'Mocha', pytest: 'pytest', unittest: 'unittest',
  rspec: 'RSpec', minitest: 'Minitest', go_testing: 'Go testing',
  cargo_test: 'Cargo test', junit: 'JUnit', phpunit: 'PHPUnit',
};

/**
 * Get display name for a language/project type
 * @param projectType - Internal project type identifier
 * @returns Human-readable display name
 */
function getLanguageDisplayName(projectType: string): string {
  return LANGUAGE_DISPLAY_NAMES[projectType.toLowerCase()] || projectType;
}

/**
 * Get display name for a framework
 * @param framework - Internal framework identifier
 * @returns Human-readable display name
 */
function getFrameworkDisplayName(framework: string): string {
  return FRAMEWORK_DISPLAY_NAMES[framework.toLowerCase()] || framework;
}

/**
 * Get display name for a pattern
 * @param pattern - Internal pattern identifier
 * @returns Human-readable display name
 */
function getPatternDisplayName(pattern: string): string {
  return PATTERN_DISPLAY_NAMES[pattern.toLowerCase()] || pattern;
}

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
 * Format human-readable terminal output from EngineResult
 *
 * Renders all engine intelligence: stack, services, commands, files, git,
 * structure, packages, patterns (--deep), conventions (--deep), blind spots.
 *
 * @param result - Engine analysis result
 * @returns Formatted terminal output string
 */
function formatHumanReadable(result: EngineResult): string {
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

  // Stack
  lines.push(chalk.bold('  Stack'));
  lines.push(chalk.gray('  ' + BOX.horizontal.repeat(5)));

  const stackOrder = ['language', 'framework', 'database', 'auth', 'testing', 'workspace'] as const;
  const stackLabels: Record<string, string> = {
    language: 'Language', framework: 'Framework', database: 'Database',
    auth: 'Auth', testing: 'Testing', workspace: 'Workspace',
  };

  let hasStack = false;
  for (const key of stackOrder) {
    const value = result.stack[key];
    if (value) {
      hasStack = true;
      const label = stackLabels[key].padEnd(12);
      // Enrich database with model count from schemas
      let display = value;
      if (key === 'database') {
        const schemaKey = Object.keys(result.schemas).find(k =>
          result.schemas[k].found && result.schemas[k].modelCount
        );
        if (schemaKey && result.schemas[schemaKey].modelCount) {
          display = `${value} (${result.schemas[schemaKey].modelCount} models)`;
        }
      }
      lines.push(`  ${chalk.gray(label)} ${display}`);
    }
  }
  if (!hasStack) {
    lines.push(chalk.gray('  No code detected'));
  }

  // Services + Deployment (rendered as one block)
  const hasServices = result.externalServices.length > 0;
  const hasDeploy = result.deployment !== null;
  if (hasServices || hasDeploy) {
    lines.push('');
    lines.push(chalk.bold('  Services'));
    lines.push(chalk.gray('  ' + BOX.horizontal.repeat(8)));
    if (hasServices) {
      const byCategory = new Map<string, string[]>();
      for (const svc of result.externalServices) {
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
      lines.push(`  ${chalk.gray('Deploy'.padEnd(12))} ${result.deployment!.platform} ${chalk.gray(`(${result.deployment!.configFile})`)}`);
    }
  }

  // Commands (only if any detected)
  const cmdEntries = [
    ['Build', result.commands.build],
    ['Test', result.commands.test],
    ['Lint', result.commands.lint],
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
  if (result.patterns && typeof result.patterns === 'object') {
    const patternKeys = Object.keys(result.patterns).filter(k =>
      !['sampledFiles', 'detectionTime', 'threshold'].includes(k)
    );
    const threshold = result.patterns.threshold ?? 0.7;
    const visible = patternKeys.filter(k => {
      const p = result.patterns[k];
      return p && typeof p === 'object' && p.confidence >= threshold;
    });
    if (visible.length > 0) {
      lines.push('');
      lines.push(chalk.bold('  Patterns'));
      lines.push(chalk.gray('  ' + BOX.horizontal.repeat(8)));
      const patternLabels: Record<string, string> = {
        errorHandling: 'Errors', validation: 'Validation', testing: 'Testing',
        database: 'Database', auth: 'Auth', api: 'API',
      };
      for (const k of visible) {
        const p = result.patterns[k];
        const label = (patternLabels[k] || k).padEnd(12);
        const lib = p.library || p.variant || k;
        lines.push(`  ${chalk.gray(label)} ${lib} ${chalk.gray(`(${p.confidence.toFixed(2)})`)}`);
      }
    }
  }

  // Conventions (deep only)
  if (result.conventions && typeof result.conventions === 'object') {
    const conv = result.conventions;
    const convLines: string[] = [];

    if (conv.naming?.functions?.majority && conv.naming.functions.majority !== 'unknown') {
      const pct = Math.round(conv.naming.functions.confidence * 100);
      convLines.push(`  ${chalk.gray('Functions'.padEnd(12))} ${conv.naming.functions.majority} (${pct}%)`);
    }
    if (conv.imports?.style) {
      convLines.push(`  ${chalk.gray('Imports'.padEnd(12))} ${conv.imports.style}`);
    }
    if (conv.indentation?.style) {
      const width = conv.indentation.width ? `${conv.indentation.width} ` : '';
      convLines.push(`  ${chalk.gray('Indentation'.padEnd(12))} ${width}${conv.indentation.style}`);
    }
    if (conv.docstrings && conv.docstrings.coverage > 0) {
      convLines.push(`  ${chalk.gray('Docstrings'.padEnd(12))} ${Math.round(conv.docstrings.coverage * 100)}% coverage`);
    }

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

  lines.push('');

  // Footer CTA
  lines.push(chalk.gray('Run `ana init` to generate full context for your AI.'));
  if (result.monorepo.isMonorepo && result.monorepo.packages.length > 0) {
    const firstPkg = result.monorepo.packages[0].path;
    lines.push(chalk.gray(`Scan individual packages: ana scan ${firstPkg}`));
  }

  return lines.join('\n');
}

/**
 * Scan command definition
 */
export const scanCommand = new Command('scan')
  .description('Scan project and display tech stack, file counts, and structure')
  .argument('[path]', 'Directory to scan (default: current directory)', '.')
  .option('--json', 'Output JSON format for programmatic consumption')
  .option('--deep', 'Include patterns and conventions from tree-sitter analysis')
  .option('--verbose', 'Show detailed analyzer output')
  .option('--save', 'Save scan results to .ana/scan.json')
  .action(async (targetPath: string, options: { json?: boolean; deep?: boolean; verbose?: boolean; save?: boolean }) => {
    const rootPath = path.resolve(targetPath);

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

    const spinner = options.json || options.verbose ? null : ora('Scanning project...').start();

    try {
      // Dynamic import to avoid WASM crash at module level
      const { analyzeProject } = await import('../engine/analyze.js');

      const depth = options.deep ? 'deep' as const : 'surface' as const;
      const result = await analyzeProject(rootPath, { depth });

      if (spinner) spinner.stop();

      // Verbose output
      if (options.verbose) {
        console.error(chalk.dim('\n=== ENGINE RESULT ==='));
        console.error(chalk.dim('Stack:'), JSON.stringify(result.stack));
        console.error(chalk.dim('Commands:'), JSON.stringify(result.commands));
        console.error(chalk.dim('Git:'), JSON.stringify(result.git));
        console.error(chalk.dim('External services:'), result.externalServices.length);
        console.error(chalk.dim('Blind spots:'), result.blindSpots.length);
        console.error(chalk.dim('====================\n'));
      }

      // Output
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatHumanReadable(result));
      }

      // Save
      if (options.save) {
        const anaDir = path.join(rootPath, '.ana');
        try {
          await fs.mkdir(anaDir, { recursive: true });
          await fs.writeFile(path.join(anaDir, 'scan.json'), JSON.stringify(result, null, 2), 'utf-8');
          console.log(chalk.gray('Scan saved to .ana/scan.json'));
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

// Export helper functions for testing
export { getLanguageDisplayName, getFrameworkDisplayName, getPatternDisplayName, formatNumber };
