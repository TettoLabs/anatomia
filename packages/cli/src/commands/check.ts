/**
 * ana setup check - Validate context files for quality gates
 *
 * Usage:
 *   ana setup check --json              Check all 7 context files, JSON output
 *   ana setup check project-context.md --json  Check single file, JSON output
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
import type { SymbolEntry, SymbolIndex } from './index.js';

/** Per-file configuration for structural validation (D12.3 — no line counts) */
interface FileConfig {
  expectedSections: string[];
}

/** File configurations indexed by filename (without .md) */
const FILE_CONFIGS: Record<string, FileConfig> = {
  'project-context': {
    expectedSections: [
      'What This Project Does',
      'Architecture',
      'Key Decisions',
      'Key Files',
      'Active Constraints',
      'Domain Vocabulary',
    ],
  },
  'design-principles': {
    expectedSections: [], // Optional content — any non-template content is valid
  },
};

/** All context files to check (from CONTEXT_FILES in constants.ts) */
const ALL_CONTEXT_FILES = [
  'project-context.md',
  'design-principles.md',
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

/** Citation regex patterns — match various formats the writer uses
 *
 * These patterns are intentionally strict to avoid false positives:
 * - First pattern: requires trailing colon (code block follows) OR line numbers
 * - Second pattern: parenthetical format, requires line numbers
 *
 * Casual mentions like "see `.ana/`" or "run `git status`" are NOT citations.
 */
const CITATION_PATTERNS = [
  // "Example from `file` (lines X-Y):" or "From `file`:" (colon required if no line numbers)
  /(?:Example |From |from )`([^`]+)` \(lines? (\d+)(?:-(\d+))?\)/g,
  /(?:Example |From |from )`([^`]+)`:/g,
  // "(from `file`, lines X-Y)" - parenthetical format, line numbers required
  /\(from `([^`]+)`,? lines? (\d+)(?:-(\d+))?\)/g,
];

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
  duplicates: string[];
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
  verification_level: 'full' | 'file-only';
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
 * Check line count for a file (D12.3 — no volumetric validation)
 *
 * Line counts are informational only. Always passes.
 *
 * @param content - File content
 * @returns Line count result (always passes)
 */
function checkLineCount(content: string): LineCountResult {
  const lineCount = content.split('\n').length;
  return {
    actual: lineCount,
    minimum: 0,
    maximum: 99999,
    pass: true,
  };
}

/**
 * Check expected sections are present (structural validation)
 *
 * @param content - File content
 * @param config - File config with expectedSections
 * @returns Header validation result with missing sections as duplicates
 */
function checkHeaders(content: string, config: FileConfig): HeadersResult {
  // Remove fenced code blocks before checking (headers in examples shouldn't count)
  const contentWithoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
  const headers = contentWithoutCodeBlocks.match(/^## .+$/gm) || [];

  // Check expected sections are present
  const headerTexts = headers.map(h => h.replace(/^## /, '').trim());
  const missing: string[] = [];
  for (const section of config.expectedSections) {
    if (!headerTexts.some(h => h.includes(section))) {
      missing.push(section);
    }
  }

  return {
    actual: headers.length,
    expected: config.expectedSections.length,
    pass: missing.length === 0,
    duplicates: missing, // Repurpose duplicates field for missing sections
  };
}

/**
 * Check for placeholder markers (skip matches inside fenced code blocks and inline code)
 * @param content
 * @returns {PlaceholdersResult} Placeholder validation result
 */
function checkPlaceholders(content: string): PlaceholdersResult {
  // Remove fenced code blocks before checking
  let contentToCheck = content.replace(/```[\s\S]*?```/g, '');
  // Also remove inline code (backtick-wrapped)
  contentToCheck = contentToCheck.replace(/`[^`]+`/g, '');
  const markers: string[] = [];

  for (const pattern of PLACEHOLDER_PATTERNS) {
    const matches = contentToCheck.match(new RegExp(pattern.source, 'gi'));
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
 * Check for scaffold markers (skip matches inside fenced code blocks)
 * @param content
 * @returns {ScaffoldMarkersResult} Scaffold marker validation result
 */
function checkScaffoldMarkers(content: string): ScaffoldMarkersResult {
  // Remove fenced code blocks before checking
  const contentWithoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
  const matches = contentWithoutCodeBlocks.match(/<!-- SCAFFOLD/g) || [];
  return {
    count: matches.length,
    pass: matches.length === 0,
  };
}

/**
 * Check if a path looks like a real file citation that should be validated
 *
 * Returns true for paths we should validate (full relative paths to files).
 * Returns false for things we should skip:
 * - Directories (end with /)
 * - Commands (contain spaces, start with git)
 * - Bare filenames without directory path (e.g., "test.yml" instead of ".github/workflows/test.yml")
 *   These are often shorthand references and would cause false positives.
 * @param filePath
 * @returns {boolean} True if path should be validated
 */
function isValidFilePath(filePath: string): boolean {
  // Skip directories (ending with /)
  if (filePath.endsWith('/')) return false;
  // Skip git commands and other shell commands
  if (filePath.startsWith('git ')) return false;
  // Skip paths with spaces (likely commands)
  if (filePath.includes(' ')) return false;
  // Only validate paths that have directory separators (full relative paths)
  // Bare filenames like "test.yml" or "package.json" are skipped as they're
  // often shorthand references and would need fuzzy matching to validate
  if (!filePath.includes('/')) return false;
  return true;
}

/**
 * Load symbol index if available
 * @param projectRoot
 * @returns {Promise<SymbolEntry[] | null>} Symbol entries or null if unavailable
 */
async function loadSymbolIndex(projectRoot: string): Promise<SymbolEntry[] | null> {
  const indexPath = path.join(projectRoot, '.ana', 'state', 'symbol-index.json');
  try {
    const content = await fs.readFile(indexPath, 'utf-8');
    const index: SymbolIndex = JSON.parse(content);
    return index.symbols;
  } catch {
    // No index available - fall back to file-only checks
    return null;
  }
}

/**
 * Check if file is a source code file that would have symbols indexed
 * @param filePath
 * @returns {boolean} True if file is an indexed source file
 */
function isIndexedSourceFile(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const sourceExtensions = ['ts', 'tsx', 'js', 'jsx', 'py', 'go'];
  return sourceExtensions.includes(ext || '');
}

/**
 * Check if file path is in a directory excluded from symbol indexing
 * @param filePath
 * @returns {boolean} True if file is in an excluded directory
 */
function isInExcludedDirectory(filePath: string): boolean {
  const excludedPatterns = [
    /^node_modules\//,
    /\/node_modules\//,
    /^dist\//,
    /\/dist\//,
    /^\.next\//,
    /\/\.next\//,
    /^coverage\//,
    /\/coverage\//,
    /^tests?\//,
    /\/tests?\//,
    /\/__tests__\//,
    /\.test\./,
    /\.spec\./,
  ];
  return excludedPatterns.some((pattern) => pattern.test(filePath));
}

/**
 * Extract symbol name from citation text (conservative)
 *
 * Only extracts when there's a clear, explicit pattern like:
 * - "the `functionName` function from `file`"
 * - "`ClassName` class from `file`"
 *
 * Returns null (skip symbol verification) when uncertain.
 * Conservative approach: missed fabrication < false positive blocking legitimate citations.
 * @param fullMatch
 * @param filePath
 * @returns {string | null} Symbol name or null if uncertain
 */
function extractCitedSymbol(fullMatch: string, filePath: string): string | null {
  // Only attempt symbol extraction for source files
  if (!isIndexedSourceFile(filePath)) {
    return null;
  }

  // Skip files in excluded directories (tests, node_modules, etc.)
  if (isInExcludedDirectory(filePath)) {
    return null;
  }

  // Only match very explicit patterns where a backticked identifier
  // is immediately followed by "function", "method", or "class"
  // Pattern: `symbolName` function/method/class from `file`
  const explicitPattern = /`([A-Za-z_][A-Za-z0-9_]*)`\s+(?:function|method|class)\s+from\s+`/i;
  const match = fullMatch.match(explicitPattern);
  if (match) {
    return match[1];
  }

  // Don't try to extract symbols from other patterns - too risky for false positives
  return null;
}

/**
 * Check if a symbol exists in the index for a given file
 * @param symbolIndex
 * @param symbolName
 * @param filePath
 * @param citedStartLine
 * @returns {{ found: boolean; nearLine: boolean }} Symbol existence and line proximity
 */
function findSymbolInFile(
  symbolIndex: SymbolEntry[],
  symbolName: string,
  filePath: string,
  citedStartLine: number | null
): { found: boolean; nearLine: boolean } {
  const fileSymbols = symbolIndex.filter((s) => s.file === filePath);

  // Look for exact name match
  const matches = fileSymbols.filter((s) => s.name === symbolName);

  if (matches.length === 0) {
    return { found: false, nearLine: false };
  }

  // If no line number cited, just check existence
  if (citedStartLine === null) {
    return { found: true, nearLine: true };
  }

  // Check if any match is within ±20 lines of cited line
  const LINE_TOLERANCE = 20;
  const nearLine = matches.some(
    (s) => Math.abs(s.line - citedStartLine) <= LINE_TOLERANCE
  );

  return { found: true, nearLine };
}

/**
 * Check citation validity
 * @param content
 * @param projectRoot
 * @returns {Promise<CitationsResult>} Citation validation result
 */
async function checkCitations(content: string, projectRoot: string): Promise<CitationsResult> {
  const failed: FailedCitation[] = [];
  let total = 0;
  let verified = 0;

  // Load symbol index if available
  const symbolIndex = await loadSymbolIndex(projectRoot);
  const verificationLevel: 'full' | 'file-only' = symbolIndex ? 'full' : 'file-only';

  for (const pattern of CITATION_PATTERNS) {
    const regex = new RegExp(pattern.source, 'g');
    let match;

    while ((match = regex.exec(content)) !== null) {
      const filePath = match[1];

      // Skip non-file citations (commands, directories, etc.)
      if (!isValidFilePath(filePath)) {
        continue;
      }

      total++;
      const startLine = match[2] ? parseInt(match[2], 10) : null;
      const endLine = match[3] ? parseInt(match[3], 10) : null;

      const fullPath = path.join(projectRoot, filePath);

      try {
        const fileContent = await fs.readFile(fullPath, 'utf-8');
        const fileLines = fileContent.split('\n').length;

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

        // If symbol index available, try to verify symbol name
        if (symbolIndex) {
          // Get more context around the match for symbol extraction
          const matchStart = Math.max(0, match.index - 100);
          const contextBefore = content.substring(matchStart, match.index + match[0].length);
          const citedSymbol = extractCitedSymbol(contextBefore, filePath);

          if (citedSymbol) {
            const { found, nearLine } = findSymbolInFile(
              symbolIndex,
              citedSymbol,
              filePath,
              startLine
            );

            if (!found) {
              failed.push({
                claim: `${citedSymbol} in ${filePath}`,
                file: filePath,
                reason: `symbol '${citedSymbol}' not found in file`,
              });
              continue;
            }

            if (!nearLine && startLine !== null) {
              failed.push({
                claim: `${citedSymbol} in ${filePath}`,
                file: filePath,
                reason: `symbol '${citedSymbol}' not found near line ${startLine}`,
              });
              continue;
            }
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
  }

  // Deduplicate (same file may be cited by multiple patterns)
  const seen = new Set<string>();
  const uniqueFailed: FailedCitation[] = [];
  for (const f of failed) {
    const key = `${f.file}:${f.reason}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFailed.push(f);
    }
  }

  return {
    total,
    verified,
    failed: uniqueFailed,
    pass: uniqueFailed.length === 0,
    verification_level: verificationLevel,
  };
}

/**
 * Run all checks on a single file
 * @param filename
 * @param contextPath
 * @param projectRoot
 * @returns {Promise<FileCheckResult>} Complete file validation result
 */
async function checkFile(filename: string, contextPath: string, projectRoot: string): Promise<FileCheckResult> {
  const baseName = filename.replace('.md', '');
  const config = FILE_CONFIGS[baseName];

  if (!config) {
    throw new Error(`Unknown context file: ${filename}`);
  }

  const filePath = path.join(contextPath, filename);
  const content = await fs.readFile(filePath, 'utf-8');

  const lineCount = checkLineCount(content);

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
 * @param result
 * @returns {void}
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
  if (result.headers.duplicates && result.headers.duplicates.length > 0) {
    console.log(chalk.gray(`   Duplicates: ${result.headers.duplicates.join(', ')}`));
  }

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
 * @returns {Command} Commander command instance
 */
export function createCheckCommand(): Command {
  return new Command('check')
    .description('Validate context files for quality gates')
    .argument('[filename]', 'Specific file to check (e.g., project-context.md)')
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
                headers: { actual: 0, expected: config.expectedHeaders, pass: false, duplicates: [] },
                placeholders: { count: 0, markers: [], pass: true },
                scaffold_markers: { count: 0, pass: true },
                citations: { total: 0, verified: 0, failed: [], pass: true, verification_level: 'file-only' },
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
