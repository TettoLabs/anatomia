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
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { AnalysisResult } from 'anatomia-analyzer';
import { countFiles, formatNumber } from '../utils/fileCounts.js';

/**
 * Display name mapping for project types
 */
const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  node: 'Node.js',
  python: 'Python',
  go: 'Go',
  rust: 'Rust',
  ruby: 'Ruby',
  php: 'PHP',
  java: 'Java',
  kotlin: 'Kotlin',
  swift: 'Swift',
  csharp: 'C#',
  cpp: 'C++',
  c: 'C',
  typescript: 'TypeScript',
  unknown: 'Unknown',
};

/**
 * Display name mapping for frameworks
 */
const FRAMEWORK_DISPLAY_NAMES: Record<string, string> = {
  nextjs: 'Next.js',
  react: 'React',
  vue: 'Vue',
  angular: 'Angular',
  svelte: 'Svelte',
  express: 'Express',
  fastify: 'Fastify',
  nestjs: 'NestJS',
  fastapi: 'FastAPI',
  django: 'Django',
  flask: 'Flask',
  rails: 'Rails',
  sinatra: 'Sinatra',
  gin: 'Gin',
  echo: 'Echo',
  fiber: 'Fiber',
  actix: 'Actix',
  rocket: 'Rocket',
  spring: 'Spring',
  laravel: 'Laravel',
  symfony: 'Symfony',
};

/**
 * Display name mapping for patterns (database, auth, testing)
 */
const PATTERN_DISPLAY_NAMES: Record<string, string> = {
  // Database
  prisma: 'Prisma',
  drizzle: 'Drizzle',
  typeorm: 'TypeORM',
  sequelize: 'Sequelize',
  mongoose: 'Mongoose',
  sqlalchemy: 'SQLAlchemy',
  django_orm: 'Django ORM',
  activerecord: 'ActiveRecord',
  gorm: 'GORM',
  diesel: 'Diesel',
  // Auth
  nextauth: 'NextAuth',
  'next-auth': 'NextAuth',
  passport: 'Passport',
  clerk: 'Clerk',
  auth0: 'Auth0',
  firebase_auth: 'Firebase Auth',
  supabase_auth: 'Supabase Auth',
  jwt: 'JWT',
  oauth: 'OAuth',
  // Testing
  vitest: 'Vitest',
  jest: 'Jest',
  mocha: 'Mocha',
  pytest: 'pytest',
  unittest: 'unittest',
  rspec: 'RSpec',
  minitest: 'Minitest',
  go_testing: 'Go testing',
  cargo_test: 'Cargo test',
  junit: 'JUnit',
  phpunit: 'PHPUnit',
};

/**
 * Get display name for a language/project type
 *
 * @param projectType - Internal project type identifier
 * @returns Human-readable display name
 */
function getLanguageDisplayName(projectType: string): string {
  return LANGUAGE_DISPLAY_NAMES[projectType.toLowerCase()] || projectType;
}

/**
 * Get display name for a framework
 *
 * @param framework - Internal framework identifier
 * @returns Human-readable display name
 */
function getFrameworkDisplayName(framework: string): string {
  return FRAMEWORK_DISPLAY_NAMES[framework.toLowerCase()] || framework;
}

/**
 * Get display name for a pattern (database, auth, testing)
 *
 * @param pattern - Internal pattern identifier
 * @returns Human-readable display name
 */
function getPatternDisplayName(pattern: string): string {
  return PATTERN_DISPLAY_NAMES[pattern.toLowerCase()] || pattern;
}

/**
 * Box-drawing characters for terminal output
 * Compatible across iTerm, Terminal.app, VS Code terminal, Windows Terminal
 */
const BOX = {
  horizontal: '\u2500', // ─
  vertical: '\u2502', // │
  topLeft: '\u250C', // ┌
  topRight: '\u2510', // ┐
  bottomLeft: '\u2514', // └
  bottomRight: '\u2518', // ┘
};

/**
 * Scan result structure for JSON output
 */
interface ScanResult {
  project: string;
  scannedAt: string;
  stack: Record<string, string>;
  files: {
    source: number;
    test: number;
    config: number;
    total: number;
  };
  structure: Array<{ path: string; purpose: string }>;
  structureOverflow?: number;
}

/**
 * Extract stack categories from analysis result
 *
 * @param analysis - Analysis result from analyzer
 * @returns Stack categories with display names
 */
function extractStack(analysis: AnalysisResult): Record<string, string> {
  const stack: Record<string, string> = {};

  // Language (always present if detected)
  if (analysis.projectType && analysis.projectType !== 'unknown') {
    stack.language = getLanguageDisplayName(analysis.projectType);
  }

  // Framework
  if (analysis.framework) {
    stack.framework = getFrameworkDisplayName(analysis.framework);
  }

  // Database, Auth, Testing from patterns
  if (analysis.patterns) {
    if (analysis.patterns.database?.library) {
      stack.database = getPatternDisplayName(analysis.patterns.database.library);
    }
    if (analysis.patterns.auth?.library) {
      stack.auth = getPatternDisplayName(analysis.patterns.auth.library);
    }
    if (analysis.patterns.testing?.library) {
      stack.testing = getPatternDisplayName(analysis.patterns.testing.library);
    }
  }

  return stack;
}

/**
 * Extract structure from analysis result
 * Returns max 10 directories with overflow count
 *
 * @param analysis - Analysis result from analyzer
 * @returns Structure items and overflow count
 */
function extractStructure(
  analysis: AnalysisResult
): { items: Array<{ path: string; purpose: string }>; overflow: number } {
  if (analysis.structure?.directories) {
    const directories = analysis.structure.directories;

    // Filter to top-level directories and exclude "Unknown" purposes
    const entries = Object.entries(directories)
      .filter(([dirPath, purpose]) => {
        // Only include top-level directories (no nested paths)
        const depth = dirPath.split('/').filter(Boolean).length;
        return depth === 1 && purpose && purpose !== 'Unknown';
      })
      .map(([dirPath, purpose]) => ({
        path: dirPath.endsWith('/') ? dirPath : `${dirPath}/`,
        purpose,
      }));

    // Sort by path for consistent ordering
    entries.sort((a, b) => a.path.localeCompare(b.path));

    const maxItems = 10;
    const overflow = Math.max(0, entries.length - maxItems);

    return {
      items: entries.slice(0, maxItems),
      overflow,
    };
  }

  return { items: [], overflow: 0 };
}

/**
 * Format human-readable terminal output
 *
 * @param projectName - Name of the project
 * @param analysis - Analysis result from analyzer
 * @param fileCounts - File count totals
 * @param fileCounts.source - Source file count
 * @param fileCounts.test - Test file count
 * @param fileCounts.config - Config file count
 * @param fileCounts.total - Total file count
 * @returns Formatted terminal output string
 */
function formatHumanReadable(
  projectName: string,
  analysis: AnalysisResult,
  fileCounts: { source: number; test: number; config: number; total: number }
): string {
  const lines: string[] = [];
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5);
  const timestamp = `${dateStr} ${timeStr}`;

  // Box width (fits in 80 columns)
  const boxWidth = 71;
  const innerWidth = boxWidth - 2;

  // Header box
  const titleLine = `  ana scan`;
  const projectLine = `  ${projectName}`;
  const padding = innerWidth - projectLine.length - timestamp.length;
  const projectWithTimestamp = `${projectLine}${' '.repeat(Math.max(1, padding))}${timestamp}`;

  lines.push(chalk.cyan(BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight));
  lines.push(chalk.cyan(BOX.vertical) + chalk.bold(titleLine.padEnd(innerWidth)) + chalk.cyan(BOX.vertical));
  lines.push(chalk.cyan(BOX.vertical) + projectWithTimestamp.padEnd(innerWidth) + chalk.cyan(BOX.vertical));
  lines.push(chalk.cyan(BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight));

  lines.push('');

  // Stack section
  const stack = extractStack(analysis);
  lines.push(chalk.bold('  Stack'));
  lines.push(chalk.gray('  ' + BOX.horizontal.repeat(5)));

  if (Object.keys(stack).length === 0) {
    lines.push(chalk.gray('  No code detected'));
  } else {
    const stackOrder = ['language', 'framework', 'database', 'auth', 'testing'];
    const stackLabels: Record<string, string> = {
      language: 'Language',
      framework: 'Framework',
      database: 'Database',
      auth: 'Auth',
      testing: 'Testing',
    };

    for (const key of stackOrder) {
      if (stack[key]) {
        const label = stackLabels[key].padEnd(12);
        lines.push(`  ${chalk.gray(label)} ${stack[key]}`);
      }
    }
  }

  lines.push('');

  // Files section
  lines.push(chalk.bold('  Files'));
  lines.push(chalk.gray('  ' + BOX.horizontal.repeat(5)));
  lines.push(`  ${chalk.gray('Source'.padEnd(12))} ${formatNumber(fileCounts.source)}`);
  lines.push(`  ${chalk.gray('Tests'.padEnd(12))} ${formatNumber(fileCounts.test)}`);
  lines.push(`  ${chalk.gray('Config'.padEnd(12))} ${formatNumber(fileCounts.config)}`);
  lines.push(`  ${chalk.gray('Total'.padEnd(12))} ${formatNumber(fileCounts.total)}`);

  lines.push('');

  // Structure section
  const structure = extractStructure(analysis);
  lines.push(chalk.bold('  Structure'));
  lines.push(chalk.gray('  ' + BOX.horizontal.repeat(9)));

  if (structure.items.length === 0) {
    lines.push(chalk.gray('  (empty)'));
  } else {
    for (const item of structure.items) {
      const pathStr = item.path.padEnd(18);
      lines.push(`  ${chalk.cyan(pathStr)}${chalk.gray(item.purpose)}`);
    }
    if (structure.overflow > 0) {
      lines.push(chalk.gray(`  +${structure.overflow} more directories`));
    }
  }

  lines.push('');

  // Footer CTA
  lines.push(chalk.gray('Run `ana init` to generate full context for your AI.'));

  return lines.join('\n');
}

/**
 * Format JSON output
 *
 * @param projectName - Name of the project
 * @param analysis - Analysis result from analyzer
 * @param fileCounts - File count totals
 * @param fileCounts.source - Source file count
 * @param fileCounts.test - Test file count
 * @param fileCounts.config - Config file count
 * @param fileCounts.total - Total file count
 * @returns JSON string output
 */
function formatJson(
  projectName: string,
  analysis: AnalysisResult,
  fileCounts: { source: number; test: number; config: number; total: number }
): string {
  const stack = extractStack(analysis);
  const structure = extractStructure(analysis);

  const result: ScanResult = {
    project: projectName,
    scannedAt: new Date().toISOString(),
    stack,
    files: {
      source: fileCounts.source,
      test: fileCounts.test,
      config: fileCounts.config,
      total: fileCounts.total,
    },
    structure: structure.items,
  };

  if (structure.overflow > 0) {
    result.structureOverflow = structure.overflow;
  }

  return JSON.stringify(result, null, 2);
}

/**
 * Scan command definition
 */
export const scanCommand = new Command('scan')
  .description('Scan project and display tech stack, file counts, and structure')
  .argument('[path]', 'Directory to scan (default: current directory)', '.')
  .option('--json', 'Output JSON format for programmatic consumption')
  .option('--verbose', 'Show detailed analyzer output')
  .action(async (targetPath: string, options: { json?: boolean; verbose?: boolean }) => {
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

    // Suppress spinner for JSON or verbose output
    const spinner = options.json || options.verbose ? null : ora('Scanning project...').start();

    try {
      // Dynamic import to avoid WASM crash at module level
      const { analyze } = await import('anatomia-analyzer');

      // Run analysis
      const analysis = await analyze(rootPath, {
        skipImportScan: true, // Speed optimization
      });

      // Verbose logging
      if (options.verbose) {
        console.error(chalk.dim('\n=== VERBOSE ANALYZER OUTPUT ==='));
        console.error(chalk.dim('Scan path:'), rootPath);
        console.error(chalk.dim('Options:'), { skipImportScan: true });
        console.error(chalk.dim('\nAnalysis result:'));
        console.error(chalk.dim('  projectType:'), analysis.projectType || chalk.gray('undefined'));
        console.error(chalk.dim('  framework:'), analysis.framework || chalk.gray('undefined'));
        console.error(chalk.dim('  patterns:'), analysis.patterns ? JSON.stringify(analysis.patterns, null, 2) : chalk.gray('undefined'));
        console.error(chalk.dim('  conventions:'), analysis.conventions ? `${Object.keys(analysis.conventions).length} items` : chalk.gray('undefined'));
        console.error(chalk.dim('  structure.directories:'), analysis.structure?.directories ? `${Object.keys(analysis.structure.directories).length} items` : chalk.gray('undefined'));
        console.error(chalk.dim('===============================\n'));
      }

      // Count files
      const fileCounts = await countFiles(rootPath);

      // Get project name from directory
      const projectName = path.basename(rootPath);

      if (spinner) {
        spinner.stop();
      }

      // Format output
      const output = options.json
        ? formatJson(projectName, analysis, fileCounts)
        : formatHumanReadable(projectName, analysis, fileCounts);

      console.log(output);
    } catch (error) {
      if (spinner) {
        spinner.fail('Scan failed');
      }
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });

// Export helper functions for testing
export { getLanguageDisplayName, getFrameworkDisplayName, getPatternDisplayName, formatNumber };
