/**
 * ana analyze [directory] - Analyze project and output detection results
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { analyze, type AnalysisResult } from '@anatomia/analyzer';

interface AnalyzeCommandOptions {
  output?: string;
  json?: boolean;
  verbose?: boolean;
  skipImportScan?: boolean;
  strict?: boolean;
}

export const analyzeCommand = new Command('analyze')
  .description('Analyze project and detect type/framework')
  .argument('[directory]', 'Directory to analyze (default: current directory)', '.')
  .option('-o, --output <file>', 'Write output to file')
  .option('--json', 'Output JSON format')
  .option('-v, --verbose', 'Show all signals and details')
  .option('--skip-import-scan', 'Skip import analysis (faster)')
  .option('--strict', 'Fail on low confidence (<0.5)')
  .action(
    async (directory: string, options: AnalyzeCommandOptions) => {
      const rootPath = path.resolve(directory);

      // Validate directory exists
      try {
        const stats = await fs.stat(rootPath);
        if (!stats.isDirectory()) {
          console.error(chalk.red(`Error: Not a directory: ${rootPath}`));
          process.exit(1);
        }
      } catch (error) {
        console.error(chalk.red(`Error: Directory not found: ${rootPath}`));
        process.exit(1);
      }

      const spinner = options.json ? null : ora('Analyzing project...').start();

      try {
        // Run analysis
        const result = await analyze(rootPath, {
          skipImportScan: options.skipImportScan,
          strictMode: options.strict,
          verbose: options.verbose,
        });

        if (spinner) {
          spinner.succeed('Analysis complete');
        }

        // Check strict mode
        if (options.strict && result.confidence.framework < 0.5) {
          console.error(
            chalk.red(
              `\nError: Low confidence (${result.confidence.framework.toFixed(2)})`
            )
          );
          process.exit(1);
        }

        // Format output
        const output = options.json
          ? JSON.stringify(result, null, 2)
          : formatHumanReadable(result, options.verbose);

        // Display
        console.log(output);

        // Write to file if requested
        if (options.output) {
          const outputPath = path.resolve(options.output);
          await fs.writeFile(outputPath, output);
          console.log(chalk.gray(`\n✓ Written to ${outputPath}`));
        }
      } catch (error) {
        if (spinner) {
          spinner.fail('Analysis failed');
        }
        if (error instanceof Error) {
          console.error(chalk.red(`\nError: ${error.message}`));
          if (options.verbose) {
            console.error(chalk.gray(error.stack));
          }
        }
        process.exit(1);
      }
    }
  );

/**
 * Format analysis result as human-readable text
 */
function formatHumanReadable(
  result: AnalysisResult,
  verbose?: boolean
): string {
  const lines: string[] = [];

  lines.push(chalk.blue.bold('\n📊 Analysis Results\n'));

  // Project type
  lines.push(chalk.bold('Project Type:') + ` ${result.projectType}`);
  lines.push(
    chalk.gray(
      `  Confidence: ${(result.confidence.projectType * 100).toFixed(0)}%`
    )
  );
  if (verbose && result.indicators.projectType.length > 0) {
    lines.push(
      chalk.gray(`  Indicators: ${result.indicators.projectType.join(', ')}`)
    );
  }

  // Framework
  lines.push('');
  if (result.framework) {
    lines.push(chalk.bold('Framework:') + ` ${result.framework}`);
    lines.push(
      chalk.gray(
        `  Confidence: ${(result.confidence.framework * 100).toFixed(0)}%`
      )
    );
    if (verbose && result.indicators.framework.length > 0) {
      lines.push(
        chalk.gray(`  Indicators: ${result.indicators.framework.join(', ')}`)
      );
    }
  } else {
    lines.push(chalk.bold('Framework:') + ` ${chalk.gray('None detected')}`);
  }

  // Metadata
  if (verbose) {
    lines.push('');
    lines.push(chalk.gray(`Detected at: ${result.detectedAt}`));
    lines.push(chalk.gray(`Version: ${result.version}`));
  }

  lines.push('');
  return lines.join('\n');
}
