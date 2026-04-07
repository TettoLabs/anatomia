/**
 * ana setup check - Project health dashboard
 *
 * Usage:
 *   ana setup check                          ✓/○/✗ dashboard (default)
 *   ana setup check project-context.md       Single file detail
 *   ana setup check --json                   JSON output (context files)
 *
 * Exit codes:
 *   0 - All checks pass (no ✗)
 *   1 - One or more ✗ found
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { SymbolEntry, SymbolIndex } from './symbol-index.js';

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

// ============================================================
// S16: Setup Dashboard — ✓/○/✗ display
// ============================================================

/** Setup progress phase */
export interface PhaseStatus {
  completed: boolean;
  timestamp?: string;
}

/** Setup progress file schema */
export interface SetupProgress {
  phases: {
    confirm?: PhaseStatus;
    enrich?: PhaseStatus;
    principles?: PhaseStatus;
  };
}

/** Skill check result */
interface SkillCheckResult {
  name: string;
  symbol: string; // ✓, ○, or ✗
  description: string;
  detectedCount: number;
  rulesCount: number;
}

/** Consistency check result */
interface ConsistencyResult {
  symbol: string;
  label: string;
  detail: string;
}

/**
 * Read setup-progress.json — try .ana/state/ path
 * @param cwd - Project root directory
 * @returns Setup progress or null if not found
 */
export async function readSetupProgress(cwd: string): Promise<SetupProgress | null> {
  const paths = [
    path.join(cwd, '.ana', 'state', 'setup-progress.json'),
  ];
  for (const p of paths) {
    try {
      const content = await fs.readFile(p, 'utf-8');
      return JSON.parse(content);
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Read scan.json — try .ana/scan.json first, fall back to .ana/state/scan.json
 * @param cwd - Project root directory
 * @returns Parsed scan data or null if not found
 */
async function readScanJson(cwd: string): Promise<Record<string, unknown> | null> {
  const paths = [
    path.join(cwd, '.ana', 'scan.json'),
    path.join(cwd, '.ana', 'state', 'scan.json'),
  ];
  for (const p of paths) {
    try {
      const content = await fs.readFile(p, 'utf-8');
      return JSON.parse(content);
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Read ana.json
 * @param cwd - Project root directory
 * @returns Parsed ana.json or null if not found
 */
async function readAnaJson(cwd: string): Promise<Record<string, unknown> | null> {
  try {
    const content = await fs.readFile(path.join(cwd, '.ana', 'ana.json'), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Count list entries (lines starting with "- ") between a heading and the next ## heading
 * @param content - File content
 * @param sectionName - Section heading text (without ##)
 * @returns Number of list entries
 */
export function countEntriesInSection(content: string, sectionName: string): number {
  const lines = content.split('\n');
  let inSection = false;
  let count = 0;
  for (const line of lines) {
    if (line.startsWith(`## ${sectionName}`)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith('## ')) {
      break;
    }
    if (inSection && line.trimStart().startsWith('- ')) {
      count++;
    }
  }
  return count;
}

/**
 * Check if a skill file has all 4 required sections in order
 * @param content - Skill file content
 * @returns Validation result with missing section names
 */
export function checkSkillSections(content: string): { valid: boolean; missing: string[] } {
  const required = ['Detected', 'Rules', 'Gotchas', 'Examples'];
  const found: string[] = [];
  for (const line of content.split('\n')) {
    const match = line.match(/^## (.+)$/);
    if (match) {
      const name = match[1].trim();
      if (required.includes(name)) {
        found.push(name);
      }
    }
  }
  const missing = required.filter(s => !found.includes(s));
  // Check order: each found section should appear in the same order as required
  const orderedCorrectly = found.every((s, i) => {
    if (i === 0) return true;
    return required.indexOf(s) > required.indexOf(found[i - 1]);
  });
  return { valid: missing.length === 0 && orderedCorrectly, missing };
}

/**
 * Check if content has non-template text (not just comments/placeholders)
 * @param content - File content
 * @param sectionName - Section heading text (without ##)
 * @returns True if section has real content
 */
function hasNonTemplateContent(content: string, sectionName: string): boolean {
  const lines = content.split('\n');
  let inSection = false;
  for (const line of lines) {
    if (line.startsWith(`## ${sectionName}`)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith('## ')) {
      break;
    }
    if (inSection) {
      const trimmed = line.trim();
      // Skip empty lines, HTML comments, and placeholder patterns
      if (trimmed === '' || trimmed.startsWith('<!--') || trimmed.startsWith('-->')) continue;
      // Has real content
      return true;
    }
  }
  return false;
}

/**
 * Discover skill directories dynamically
 * @param cwd - Project root directory
 * @returns Sorted array of skill directory names
 */
async function discoverSkills(cwd: string): Promise<string[]> {
  const skillsDir = path.join(cwd, '.claude', 'skills');
  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  } catch {
    return [];
  }
}

/**
 * Check a single skill file
 * @param cwd - Project root directory
 * @param skillName - Skill directory name
 * @returns Skill check result with symbol and description
 */
export async function checkSkill(cwd: string, skillName: string): Promise<SkillCheckResult> {
  const filePath = path.join(cwd, '.claude', 'skills', skillName, 'SKILL.md');
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const sections = checkSkillSections(content);
    const detectedCount = countEntriesInSection(content, 'Detected');
    const rulesCount = countEntriesInSection(content, 'Rules');

    if (!sections.valid) {
      return {
        name: skillName,
        symbol: chalk.red('✗'),
        description: `missing sections: ${sections.missing.join(', ')}`,
        detectedCount,
        rulesCount,
      };
    }

    if (skillName === 'troubleshooting') {
      return {
        name: skillName,
        symbol: chalk.yellow('○'),
        description: 'stub (grows over time)',
        detectedCount,
        rulesCount,
      };
    }

    if (detectedCount > 0 || rulesCount > 0) {
      return {
        name: skillName,
        symbol: chalk.green('✓'),
        description: `Detected: ${detectedCount} facts, Rules: ${rulesCount} entries`,
        detectedCount,
        rulesCount,
      };
    }

    return {
      name: skillName,
      symbol: chalk.yellow('○'),
      description: `Detected: 0 facts, Rules: 0 entries`,
      detectedCount,
      rulesCount,
    };
  } catch {
    return {
      name: skillName,
      symbol: chalk.red('✗'),
      description: 'file not found',
      detectedCount: 0,
      rulesCount: 0,
    };
  }
}

/**
 * Check context file for dashboard display
 * @param cwd - Project root directory
 * @param filename - Context filename (e.g., project-context.md)
 * @returns Symbol and description for dashboard display
 */
export async function checkContextForDashboard(cwd: string, filename: string): Promise<{ symbol: string; description: string }> {
  const filePath = path.join(cwd, '.ana', 'context', filename);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const baseName = filename.replace('.md', '');
    const config = FILE_CONFIGS[baseName];

    if (baseName === 'design-principles') {
      // Any non-template content = ✓, else ○
      // Strip HTML comments (including multiline) before checking
      const stripped = content.replace(/<!--[\s\S]*?-->/g, '');
      const lines = stripped.split('\n').filter(l => {
        const t = l.trim();
        return t !== '' && !t.startsWith('#');
      });
      if (lines.length > 0) {
        return { symbol: chalk.green('✓'), description: 'populated' };
      }
      return { symbol: chalk.yellow('○'), description: 'empty (optional — add anytime)' };
    }

    if (baseName === 'project-context' && config) {
      const headers = checkHeaders(content, config);
      if (!headers.pass) {
        return { symbol: chalk.red('✗'), description: `missing sections: ${headers.duplicates.join(', ')}` };
      }
      // Check if "What This Project Does" has non-template content
      if (hasNonTemplateContent(content, 'What This Project Does')) {
        return { symbol: chalk.green('✓'), description: `${headers.actual} sections populated` };
      }
      return { symbol: chalk.yellow('○'), description: 'scaffold (setup will enrich)' };
    }

    return { symbol: chalk.yellow('○'), description: 'unknown format' };
  } catch {
    return { symbol: chalk.red('✗'), description: 'file not found' };
  }
}

/**
 * Run cross-reference consistency checks
 * @param cwd - Project root directory
 * @param anaJson - Parsed ana.json content
 * @param scanJson - Parsed scan.json content or null
 * @returns Array of consistency check results
 */
export async function checkConsistency(cwd: string, anaJson: Record<string, unknown>, scanJson: Record<string, unknown> | null): Promise<ConsistencyResult[]> {
  const results: ConsistencyResult[] = [];

  // Check ana.json ↔ skills alignment
  const mismatches: string[] = [];
  const language = anaJson.language as string | undefined;
  const artifactBranch = anaJson.artifactBranch as string | undefined;
  const commands = anaJson.commands as Record<string, string> | undefined;

  // Read skill Detected sections for cross-reference
  const skillsDir = path.join(cwd, '.claude', 'skills');

  if (language) {
    try {
      const coding = await fs.readFile(path.join(skillsDir, 'coding-standards', 'SKILL.md'), 'utf-8');
      const detectedSection = extractSection(coding, 'Detected');
      if (detectedSection && detectedSection.trim() !== '' && !detectedSection.includes('<!--')) {
        if (!detectedSection.toLowerCase().includes(language.toLowerCase())) {
          mismatches.push(`language: ana.json says "${language}", coding-standards Detected doesn't mention it`);
        }
      }
    } catch { /* skill not found — skip */ }
  }

  if (artifactBranch) {
    try {
      const git = await fs.readFile(path.join(skillsDir, 'git-workflow', 'SKILL.md'), 'utf-8');
      const detectedSection = extractSection(git, 'Detected');
      if (detectedSection && detectedSection.trim() !== '' && !detectedSection.includes('<!--')) {
        if (!detectedSection.toLowerCase().includes(artifactBranch.toLowerCase())) {
          mismatches.push(`branch: ana.json says "${artifactBranch}", git-workflow Detected doesn't mention it`);
        }
      }
    } catch { /* skip */ }
  }

  if (commands?.test) {
    try {
      const testing = await fs.readFile(path.join(skillsDir, 'testing-standards', 'SKILL.md'), 'utf-8');
      const detectedSection = extractSection(testing, 'Detected');
      if (detectedSection && detectedSection.trim() !== '' && !detectedSection.includes('<!--')) {
        // Check if test command or framework mentioned
        const testCmd = commands.test.toLowerCase();
        const detectedLower = detectedSection.toLowerCase();
        // Look for framework name (vitest, jest, pytest, etc.)
        const frameworks = ['vitest', 'jest', 'mocha', 'pytest', 'go test'];
        const hasFramework = frameworks.some(f => testCmd.includes(f) || detectedLower.includes(f));
        if (!hasFramework && detectedLower.trim() !== '') {
          mismatches.push(`testing: ana.json test command doesn't align with testing-standards Detected`);
        }
      }
    } catch { /* skip */ }
  }

  if (mismatches.length > 0) {
    results.push({
      symbol: chalk.red('✗'),
      label: 'ana.json ↔ skills',
      detail: `mismatch — ${mismatches[0]}`,
    });
  } else {
    results.push({
      symbol: chalk.green('✓'),
      label: 'ana.json ↔ skills',
      detail: 'aligned',
    });
  }

  // Check Detected ↔ scan.json freshness
  if (scanJson) {
    const lastScanAt = anaJson.lastScanAt as string | undefined;
    const overview = scanJson.overview as Record<string, string> | undefined;
    const scanTimestamp = overview?.scannedAt;

    if (lastScanAt && scanTimestamp && lastScanAt !== scanTimestamp) {
      results.push({
        symbol: chalk.red('✗'),
        label: 'Detected ↔ scan.json',
        detail: 'stale (scan newer than last setup)',
      });
    } else {
      results.push({
        symbol: chalk.green('✓'),
        label: 'Detected ↔ scan.json',
        detail: 'current',
      });
    }
  }

  return results;
}

/**
 * Extract content of a section (between ## heading and next ## heading)
 * @param content - File content
 * @param sectionName - Section heading text (without ##)
 * @returns Section content or null if not found
 */
function extractSection(content: string, sectionName: string): string | null {
  const lines = content.split('\n');
  let inSection = false;
  const sectionLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith(`## ${sectionName}`)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith('## ')) {
      break;
    }
    if (inSection) {
      sectionLines.push(line);
    }
  }
  return inSection ? sectionLines.join('\n') : null;
}

// --- Setup Completion Validation (D12.3) ---

export interface SetupValidationResult {
  setupMode: 'partial' | 'complete';
  warnings: string[];
  stats: {
    skillsCalibrated: number;
    contextSections: { populated: number; total: number };
    principlesCaptured: boolean;
  };
}

/**
 * Check if a section has non-template content (strict).
 * Template = headings, HTML comments, **Detected:** lines, blank lines.
 * Everything else = content.
 * @param content - File content
 * @param sectionName - Section heading text (without ##)
 * @returns True if section has real content
 */
function hasRealContent(content: string, sectionName: string): boolean {
  const lines = content.split('\n');
  let inSection = false;
  let inComment = false;
  for (const line of lines) {
    if (line.startsWith(`## ${sectionName}`)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith('## ')) break;
    if (inSection) {
      const trimmed = line.trim();
      // Track multiline HTML comments
      if (trimmed.startsWith('<!--') && !trimmed.includes('-->')) {
        inComment = true;
        continue;
      }
      if (inComment) {
        if (trimmed.includes('-->')) inComment = false;
        continue;
      }
      // Skip template lines
      if (trimmed === '') continue;
      if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) continue;
      if (trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('**Detected:**') || trimmed.startsWith('**Detected:')) continue;
      // Real content found
      return true;
    }
  }
  return false;
}

/**
 * Check if a file has any non-template content at all.
 * Strips headings, HTML comments (including multiline), blank lines.
 * @param content - File content
 * @returns True if file has real content beyond template
 */
function fileHasRealContent(content: string): boolean {
  const stripped = content.replace(/<!--[\s\S]*?-->/g, '');
  return stripped.split('\n').some(l => {
    const t = l.trim();
    return t !== '' && !t.startsWith('#');
  });
}

/**
 * Validate setup completion state (D12.3 criteria).
 * Used by both `ana setup complete` CLI and referenced by orchestrator Step 17.
 *
 * @param cwd - Project root directory
 * @returns Validation result with setupMode determination
 */
export async function validateSetupCompletion(cwd: string): Promise<SetupValidationResult> {
  const warnings: string[] = [];
  const contextPath = path.join(cwd, '.ana', 'context');
  const claudePath = path.join(cwd, '.claude');

  // --- 1. CRITICAL: "What This Project Does" has real content ---
  let criticalSectionPopulated = false;
  let architectureExists = false;
  let populatedCount = 0;
  const totalSections = 6;
  const projectContextSections = [
    'What This Project Does', 'Architecture', 'Key Decisions',
    'Key Files', 'Active Constraints', 'Domain Vocabulary',
  ];

  try {
    const pcContent = await fs.readFile(path.join(contextPath, 'project-context.md'), 'utf-8');
    criticalSectionPopulated = hasRealContent(pcContent, 'What This Project Does');
    architectureExists = pcContent.includes('## Architecture');

    for (const section of projectContextSections) {
      if (hasRealContent(pcContent, section)) populatedCount++;
    }
  } catch {
    warnings.push('project-context.md not found');
  }

  if (!criticalSectionPopulated) {
    warnings.push('## What This Project Does has no content (critical)');
  }
  if (!architectureExists) {
    warnings.push('## Architecture heading missing from project-context.md');
  }

  // --- 2. Design principles (optional) ---
  let principlesCaptured = false;
  try {
    const dpContent = await fs.readFile(path.join(contextPath, 'design-principles.md'), 'utf-8');
    principlesCaptured = fileHasRealContent(dpContent);
  } catch {
    // File missing is fine — principles are optional
  }

  // --- 3. Skill format (D6.4) ---
  let skillsCalibrated = 0;
  const skills = await discoverSkills(cwd);
  skillsCalibrated = skills.length;

  for (const skill of skills) {
    const filePath = path.join(claudePath, 'skills', skill, 'SKILL.md');
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { valid, missing } = checkSkillSections(content);
      if (!valid) {
        warnings.push(`skill ${skill}: missing sections — ${missing.join(', ')}`);
      }
    } catch {
      warnings.push(`skill ${skill}: SKILL.md not found`);
    }
  }

  // --- 4. Cross-reference (ana.json ↔ skill Detected) ---
  try {
    const anaJsonContent = await fs.readFile(path.join(cwd, '.ana', 'ana.json'), 'utf-8');
    const anaJson = JSON.parse(anaJsonContent) as Record<string, unknown>;
    const crossRefResults = await checkConsistency(cwd, anaJson, null);
    for (const r of crossRefResults) {
      if (r.detail.startsWith('mismatch')) {
        warnings.push(`cross-reference: ${r.detail}`);
      }
    }
  } catch {
    // ana.json missing handled upstream
  }

  // --- Determine setupMode ---
  // Phase 2 at least partially done = critical section has content
  // Phase 3 skip = still complete
  const setupMode: 'partial' | 'complete' = criticalSectionPopulated ? 'complete' : 'partial';

  return {
    setupMode,
    warnings,
    stats: {
      skillsCalibrated,
      contextSections: { populated: populatedCount, total: totalSections },
      principlesCaptured,
    },
  };
}

/**
 * Display the full ✓/○/✗ setup dashboard
 * @param cwd - Project root directory
 * @returns True if no errors (no ✗ symbols)
 */
async function displaySetupDashboard(cwd: string): Promise<boolean> {
  let hasErrors = false;

  // --- Setup Status ---
  const progress = await readSetupProgress(cwd);
  console.log(chalk.bold('\nSetup Status'));
  console.log('────────────');

  const phases = [
    { key: 'confirm', label: 'Phase 1 (confirm)' },
    { key: 'enrich', label: 'Phase 2 (enrich)' },
    { key: 'principles', label: 'Phase 3 (principles)' },
  ] as const;

  for (const phase of phases) {
    const status = progress?.phases?.[phase.key];
    if (status?.completed && status.timestamp) {
      const date = new Date(status.timestamp).toLocaleDateString();
      console.log(`  ${chalk.green('✓')} ${phase.label}: completed ${date}`);
    } else {
      console.log(`  ${chalk.yellow('○')} ${phase.label}: not started`);
    }
  }

  // --- File Health ---
  console.log(chalk.bold('\nFile Health'));
  console.log('───────────');

  // Context files
  console.log(chalk.gray('Context:'));
  for (const file of ALL_CONTEXT_FILES) {
    const result = await checkContextForDashboard(cwd, file);
    const name = file.replace('.md', '').padEnd(22);
    console.log(`  ${result.symbol} ${name}${result.description}`);
    if (result.symbol.includes('✗')) hasErrors = true;
  }

  // Skills
  console.log(chalk.gray('Skills:'));
  const skills = await discoverSkills(cwd);
  if (skills.length === 0) {
    console.log(chalk.gray('  No skills found in .claude/skills/'));
  } else {
    for (const skill of skills) {
      const result = await checkSkill(cwd, skill);
      const name = result.name.padEnd(22);
      console.log(`  ${result.symbol} ${name}${result.description}`);
      if (result.symbol.includes('✗')) hasErrors = true;
    }
  }

  // --- Consistency ---
  const anaJson = await readAnaJson(cwd);
  if (anaJson) {
    const scanJson = await readScanJson(cwd);
    const consistencyResults = await checkConsistency(cwd, anaJson, scanJson);

    console.log(chalk.bold('\nConsistency'));
    console.log('───────────');
    for (const r of consistencyResults) {
      console.log(`  ${r.symbol} ${r.label}: ${r.detail}`);
      if (r.symbol.includes('✗')) hasErrors = true;
    }
  }

  console.log();
  return !hasErrors;
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

      // Dashboard mode: no filename, no --json → ✓/○/✗ display
      if (!filename && !options.json) {
        try {
          const pass = await displaySetupDashboard(cwd);
          process.exit(pass ? 0 : 1);
        } catch (error) {
          console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
          process.exit(1);
        }
        return;
      }

      // Check if .ana/context/ exists (needed for single-file and --json modes)
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
                line_count: { actual: 0, minimum: 0, maximum: 99999, pass: true },
                headers: { actual: 0, expected: config?.expectedSections?.length ?? 0, pass: false, duplicates: [] },
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
