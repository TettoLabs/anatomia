/**
 * ana setup check - Validate context files for quality gates
 *
 * Usage:
 *   ana setup check --json              Check all 7 context files, JSON output
 *   ana setup check patterns.md --json  Check single file, JSON output
 *   ana setup check                     Human-readable colored output
 *
 * Exit codes:
 *   0 - All checks pass
 *   1 - One or more checks fail
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

/** Per-file configuration for validation */
interface FileConfig {
  minLines: number;
  maxLines: number;
  expectedHeaders: number;
}

/** File configurations indexed by filename (without .md) */
const FILE_CONFIGS: Record<string, FileConfig> = {
  'project-overview': { minLines: 200, maxLines: 700, expectedHeaders: 4 },
  'conventions': { minLines: 300, maxLines: 850, expectedHeaders: 4 },
  'patterns': { minLines: 550, maxLines: 1400, expectedHeaders: 6 },
  'architecture': { minLines: 200, maxLines: 700, expectedHeaders: 4 },
  'testing': { minLines: 250, maxLines: 850, expectedHeaders: 6 },
  'workflow': { minLines: 400, maxLines: 1000, expectedHeaders: 6 },
  'debugging': { minLines: 200, maxLines: 700, expectedHeaders: 5 },
};

/** All context files to check */
const ALL_CONTEXT_FILES = [
  'project-overview.md',
  'conventions.md',
  'patterns.md',
  'architecture.md',
  'testing.md',
  'workflow.md',
  'debugging.md',
];

/** Placeholder patterns to detect (case-insensitive) */
const PLACEHOLDER_PATTERNS = [
  /\bTODO\b/i,
  /\bPLACEHOLDER\b/i,
  /\bTBD\b/i,
  /\bFIXME\b/i,
  /\[INSERT/i,
  /\[ADD/i,
  /\[FILL/i,
];

/** Citation regex pattern */
const CITATION_REGEX = /Example from `([^`]+)`(?: \(lines (\d+)-(\d+)\))?:/g;

/** Result types for JSON output */
interface LineCountResult {
  actual: number;
  minimum: number;
  maximum: number;
  pass: boolean;
}

interface HeadersResult {
  actual: number;
  expected: number;
  pass: boolean;
}

interface PlaceholdersResult {
  count: number;
  markers: string[];
  pass: boolean;
}

interface ScaffoldMarkersResult {
  count: number;
  pass: boolean;
}

interface FailedCitation {
  claim: string;
  file: string;
  reason: string;
}

interface CitationsResult {
  total: number;
  verified: number;
  failed: FailedCitation[];
  pass: boolean;
}

interface FileCheckResult {
  file: string;
  line_count: LineCountResult;
  headers: HeadersResult;
  placeholders: PlaceholdersResult;
  scaffold_markers: ScaffoldMarkersResult;
  citations: CitationsResult;
  overall: boolean;
}

interface AllFilesResult {
  files: FileCheckResult[];
  overall: boolean;
}

/**
 * Check line count for a file
 */
function checkLineCount(content: string, config: FileConfig): LineCountResult {
  const lineCount = content.split('\n').length;
  return {
    actual: lineCount,
    minimum: config.minLines,
    maximum: config.maxLines,
    pass: lineCount >= config.minLines && lineCount <= config.maxLines,
  };
}

/**
 * Check H2 header count
 */
function checkHeaders(content: string, config: FileConfig): HeadersResult {
  const headers = content.match(/^## .+$/gm) || [];
  return {
    actual: headers.length,
    expected: config.expectedHeaders,
    pass: headers.length >= config.expectedHeaders,
  };
}

/**
 * Check for placeholder markers
 */
function checkPlaceholders(content: string): PlaceholdersResult {
  const markers: string[] = [];

  for (const pattern of PLACEHOLDER_PATTERNS) {
    const matches = content.match(new RegExp(pattern.source, 'gi'));
    if (matches) {
      markers.push(...matches);
    }
  }

  return {
    count: markers.length,
    markers: markers.slice(0, 10), // Limit to first 10
    pass: markers.length === 0,
  };
}

/**
 * Check for scaffold markers
 */
function checkScaffoldMarkers(content: string): ScaffoldMarkersResult {
  const matches = content.match(/<!-- SCAFFOLD/g) || [];
  return {
    count: matches.length,
    pass: matches.length === 0,
  };
}

/**
 * Check citation validity
 */
async function checkCitations(content: string, projectRoot: string): Promise<CitationsResult> {
  const failed: FailedCitation[] = [];
  let total = 0;
  let verified = 0;

  // Reset regex lastIndex for fresh matching
  const regex = new RegExp(CITATION_REGEX.source, 'g');
  let match;

  while ((match = regex.exec(content)) !== null) {
    total++;
    const filePath = match[1];
    const startLine = match[2] ? parseInt(match[2], 10) : null;
    const endLine = match[3] ? parseInt(match[3], 10) : null;

    // Resolve file path relative to project root
    const fullPath = path.join(projectRoot, filePath);

    try {
      const fileContent = await fs.readFile(fullPath, 'utf-8');
      const fileLines = fileContent.split('\n').length;

      // If line numbers specified, verify they're in range
      if (startLine !== null && endLine !== null) {
        if (endLine > fileLines) {
          failed.push({
            claim: filePath,
            file: filePath,
            reason: `line range out of bounds (file has ${fileLines} lines)`,
          });
          continue;
        }
      }

      verified++;
    } catch {
      failed.push({
        claim: filePath,
        file: filePath,
        reason: 'file not found',
      });
    }
  }

  return {
    total,
    verified,
    failed,
    pass: failed.length === 0,
  };
}

/**
 * Run all checks on a single file
 */
async function checkFile(filename: string, contextPath: string, projectRoot: string): Promise<FileCheckResult> {
  const baseName = filename.replace('.md', '');
  const config = FILE_CONFIGS[baseName];

  if (!config) {
    throw new Error(`Unknown context file: ${filename}`);
  }

  const filePath = path.join(contextPath, filename);
  const content = await fs.readFile(filePath, 'utf-8');

  const lineCount = checkLineCount(content, config);
  const headers = checkHeaders(content, config);
  const placeholders = checkPlaceholders(content);
  const scaffoldMarkers = checkScaffoldMarkers(content);
  const citations = await checkCitations(content, projectRoot);

  const overall = lineCount.pass && headers.pass && placeholders.pass && scaffoldMarkers.pass && citations.pass;

  return {
    file: filename,
    line_count: lineCount,
    headers,
    placeholders,
    scaffold_markers: scaffoldMarkers,
    citations,
    overall,
  };
}

/**
 * Display human-readable results for a single file
 */
function displayFileResult(result: FileCheckResult): void {
  console.log(chalk.bold(`\n${result.file}`));
  console.log('─'.repeat(40));

  // Line count
  const lineIcon = result.line_count.pass ? chalk.green('✓') : chalk.red('✗');
  const lineStatus = result.line_count.pass ? 'pass' : 'fail';
  console.log(`${lineIcon} Line count: ${result.line_count.actual} (${result.line_count.minimum}-${result.line_count.maximum}) [${lineStatus}]`);

  // Headers
  const headerIcon = result.headers.pass ? chalk.green('✓') : chalk.red('✗');
  const headerStatus = result.headers.pass ? 'pass' : 'fail';
  console.log(`${headerIcon} Headers: ${result.headers.actual} (expected ${result.headers.expected}) [${headerStatus}]`);

  // Placeholders
  const placeholderIcon = result.placeholders.pass ? chalk.green('✓') : chalk.red('✗');
  const placeholderStatus = result.placeholders.pass ? 'pass' : 'fail';
  console.log(`${placeholderIcon} Placeholders: ${result.placeholders.count} found [${placeholderStatus}]`);
  if (!result.placeholders.pass && result.placeholders.markers.length > 0) {
    console.log(chalk.gray(`   Found: ${result.placeholders.markers.join(', ')}`));
  }

  // Scaffold markers
  const scaffoldIcon = result.scaffold_markers.pass ? chalk.green('✓') : chalk.red('✗');
  const scaffoldStatus = result.scaffold_markers.pass ? 'pass' : 'fail';
  console.log(`${scaffoldIcon} Scaffold markers: ${result.scaffold_markers.count} found [${scaffoldStatus}]`);

  // Citations
  const citationIcon = result.citations.pass ? chalk.green('✓') : chalk.red('✗');
  const citationStatus = result.citations.pass ? 'pass' : 'fail';
  console.log(`${citationIcon} Citations: ${result.citations.verified}/${result.citations.total} verified [${citationStatus}]`);
  if (!result.citations.pass) {
    for (const f of result.citations.failed) {
      console.log(chalk.gray(`   Failed: ${f.file} — ${f.reason}`));
    }
  }

  // Summary
  const passedChecks = [
    result.line_count.pass,
    result.headers.pass,
    result.placeholders.pass,
    result.scaffold_markers.pass,
    result.citations.pass,
  ].filter(Boolean).length;

  console.log();
  if (result.overall) {
    console.log(chalk.green(`${result.file}: 5/5 checks passed`));
  } else {
    console.log(chalk.red(`${result.file}: ${passedChecks}/5 checks passed`));
  }
}

/**
 * Create the check command
 */
export function createCheckCommand(): Command {
  return new Command('check')
    .description('Validate context files for quality gates')
    .argument('[filename]', 'Specific file to check (e.g., patterns.md)')
    .option('--json', 'Output results as JSON')
    .action(async (filename: string | undefined, options: { json?: boolean }) => {
      const cwd = process.cwd();
      const contextPath = path.join(cwd, '.ana', 'context');

      // Check if .ana/context/ exists
      try {
        await fs.access(contextPath);
      } catch {
        if (options.json) {
          console.log(JSON.stringify({ error: '.ana/context/ directory not found. Run `ana init` first.' }));
        } else {
          console.error(chalk.red('Error: .ana/context/ directory not found'));
          console.error(chalk.gray('Run `ana init` first to create .ana/ structure.'));
        }
        process.exit(1);
      }

      try {
        if (filename) {
          // Single file mode
          let normalizedFilename = filename.endsWith('.md') ? filename : `${filename}.md`;
          normalizedFilename = normalizedFilename.replace(/^\.ana\/context\//, '');

          // Check file exists
          const filePath = path.join(contextPath, normalizedFilename);
          try {
            await fs.access(filePath);
          } catch {
            if (options.json) {
              console.log(JSON.stringify({ error: `File not found: ${normalizedFilename}` }));
            } else {
              console.error(chalk.red(`Error: File not found: ${normalizedFilename}`));
            }
            process.exit(1);
          }

          const result = await checkFile(normalizedFilename, contextPath, cwd);

          if (options.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            displayFileResult(result);
          }

          process.exit(result.overall ? 0 : 1);
        } else {
          // All files mode
          const results: FileCheckResult[] = [];

          for (const file of ALL_CONTEXT_FILES) {
            const filePath = path.join(contextPath, file);
            try {
              await fs.access(filePath);
              const result = await checkFile(file, contextPath, cwd);
              results.push(result);
            } catch {
              // File doesn't exist - create a failed result
              const baseName = file.replace('.md', '');
              const config = FILE_CONFIGS[baseName];
              results.push({
                file,
                line_count: { actual: 0, minimum: config.minLines, maximum: config.maxLines, pass: false },
                headers: { actual: 0, expected: config.expectedHeaders, pass: false },
                placeholders: { count: 0, markers: [], pass: true },
                scaffold_markers: { count: 0, pass: true },
                citations: { total: 0, verified: 0, failed: [], pass: true },
                overall: false,
              });
            }
          }

          const overallPass = results.every((r) => r.overall);
          const output: AllFilesResult = { files: results, overall: overallPass };

          if (options.json) {
            console.log(JSON.stringify(output, null, 2));
          } else {
            for (const result of results) {
              displayFileResult(result);
            }

            const passedCount = results.filter((r) => r.overall).length;
            console.log();
            if (overallPass) {
              console.log(chalk.green(`\n${passedCount} of ${results.length} files passed`));
            } else {
              console.log(chalk.red(`\n${passedCount} of ${results.length} files passed`));
            }
          }

          process.exit(overallPass ? 0 : 1);
        }
      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
        } else {
          console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
        process.exit(1);
      }
    });
}
