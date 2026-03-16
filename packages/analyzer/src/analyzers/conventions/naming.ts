/**
 * Naming convention analyzer (STEP_2.2 CP0)
 *
 * Detects naming conventions:
 * - Files: snake_case, camelCase, kebab-case, PascalCase
 * - Variables: snake_case, camelCase
 * - Functions: snake_case, camelCase
 * - Classes: PascalCase, snake_case (Python sometimes)
 * - Constants: SCREAMING_SNAKE_CASE
 *
 * Based on: START_HERE.md lines 95-224 (regex patterns, classification algorithm)
 */

import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ParsedFile } from '../../types/parsed.js';
import type { NamingStyle } from '../../types/conventions.js';
import { queryCache } from '../../parsers/queries.js';
import { parserManager } from '../../parsers/treeSitter.js';

/**
 * Language keywords to filter out (not user-defined names)
 */
const PYTHON_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
  'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
  'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
  'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
  'while', 'with', 'yield'
]);

const TS_KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'enum', 'export', 'extends',
  'false', 'finally', 'for', 'function', 'if', 'import', 'in',
  'instanceof', 'interface', 'let', 'new', 'null', 'return', 'super',
  'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void',
  'while', 'with', 'yield', 'async', 'await', 'type', 'namespace'
]);

const GO_KEYWORDS = new Set([
  'break', 'case', 'chan', 'const', 'continue', 'default', 'defer',
  'else', 'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import',
  'interface', 'map', 'package', 'range', 'return', 'select', 'struct',
  'switch', 'type', 'var'
]);

/**
 * Classify naming style using regex patterns
 *
 * @param name - Identifier to classify (variable, function, class, or file name)
 * @returns Naming style classification
 *
 * @example
 * ```typescript
 * classifyNamingStyle('user_name')      // → 'snake_case'
 * classifyNamingStyle('userName')       // → 'camelCase'
 * classifyNamingStyle('UserName')       // → 'PascalCase'
 * classifyNamingStyle('user-name')      // → 'kebab-case'
 * classifyNamingStyle('MAX_RETRIES')    // → 'SCREAMING_SNAKE_CASE'
 * classifyNamingStyle('_private')       // → 'unknown' (strips _, then 'private' is lowercase)
 * ```
 */
export function classifyNamingStyle(name: string): NamingStyle {
  // Skip single-character names (ambiguous - could be any style)
  if (name.length <= 1) return 'unknown';

  // Strip leading/trailing underscores (Python convention: _private, __dunder__)
  // Classify the core name without decorative underscores
  const coreName = name.replace(/^_+/, '').replace(/_+$/, '');
  if (coreName.length === 0) return 'unknown';

  // Check patterns in order of specificity (most specific first)

  // SCREAMING_SNAKE_CASE (constants): MAX_RETRIES, API_KEY
  if (/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(coreName)) {
    return 'SCREAMING_SNAKE_CASE';
  }

  // PascalCase (classes, components): UserName, GetUserById
  if (/^[A-Z][a-zA-Z0-9]*$/.test(coreName)) {
    return 'PascalCase';
  }

  // kebab-case (file names only): user-name, get-user-by-id
  // Note: Hyphens invalid in variables/functions in most languages
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(coreName)) {
    return 'kebab-case';
  }

  // snake_case (Python convention): user_name, get_user_by_id
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(coreName)) {
    return 'snake_case';
  }

  // camelCase (JavaScript/TypeScript): userName, getUserById
  // Must have at least one uppercase letter (otherwise just lowercase word)
  if (/^[a-z][a-zA-Z0-9]*$/.test(coreName) && /[A-Z]/.test(coreName)) {
    return 'camelCase';
  }

  // Single lowercase word (ambiguous - no clear style)
  if (/^[a-z][a-z0-9]*$/.test(coreName)) {
    return 'unknown';  // Let statistical analysis decide majority
  }

  return 'unknown';
}

/**
 * Filter language keywords from name analysis
 *
 * @param name - Identifier to check
 * @param language - Project language
 * @returns true if keyword (should exclude), false if user-defined
 *
 * @example
 * ```typescript
 * isKeyword('class', 'python')    // → true (exclude)
 * isKeyword('User', 'python')     // → false (analyze)
 * isKeyword('const', 'typescript') // → true (exclude)
 * ```
 */
export function isKeyword(name: string, language: string): boolean {
  switch (language) {
    case 'python':
      return PYTHON_KEYWORDS.has(name);
    case 'typescript':
    case 'tsx':
    case 'javascript':
      return TS_KEYWORDS.has(name);
    case 'go':
      return GO_KEYWORDS.has(name);
    default:
      return false;
  }
}

/**
 * Naming convention analysis result
 */
export interface NamingConventionResult {
  majority: NamingStyle;
  confidence: number;          // 0.0-1.0 (majority percentage)
  mixed: boolean;              // true if majority < 0.7
  distribution: Record<NamingStyle, number>;  // percentages
  sampleSize: number;
}

/**
 * Analyze naming convention from classified names
 *
 * Statistical majority voting:
 * - Count each style occurrence
 * - Calculate percentages
 * - Majority = highest percentage
 * - Confidence = majority percentage
 * - Mixed = majority < 70%
 *
 * @param names - Array of names to analyze
 * @param language - Language for keyword filtering
 * @returns Convention result with majority, confidence, mixed flag, distribution
 *
 * @example Clear convention
 * ```typescript
 * analyzeNamingConvention(['user_name', 'get_data', 'api_call', ...], 'python')
 * // 43/50 snake_case →
 * {
 *   majority: 'snake_case',
 *   confidence: 0.86,
 *   mixed: false,
 *   distribution: { snake_case: 0.86, camelCase: 0.10, PascalCase: 0.04 },
 *   sampleSize: 50
 * }
 * ```
 *
 * @example Mixed convention
 * ```typescript
 * analyzeNamingConvention(['user_name', 'userName', ...], 'python')
 * // 35/50 snake_case, 15/50 camelCase →
 * {
 *   majority: 'snake_case',
 *   confidence: 0.70,
 *   mixed: true,  // Exactly at 70% threshold
 *   distribution: { snake_case: 0.70, camelCase: 0.30 },
 *   sampleSize: 50
 * }
 * ```
 */
export function analyzeNamingConvention(
  names: string[],
  language: string
): NamingConventionResult {
  const counts: Record<NamingStyle, number> = {
    snake_case: 0,
    camelCase: 0,
    PascalCase: 0,
    'kebab-case': 0,
    SCREAMING_SNAKE_CASE: 0,
    unknown: 0,
  };

  let keywordsFiltered = 0;

  // Classify each name, filter keywords
  for (const name of names) {
    // Skip language keywords
    if (isKeyword(name, language)) {
      keywordsFiltered++;
      continue;
    }

    const style = classifyNamingStyle(name);
    counts[style]++;
  }

  // Calculate total valid names (excluding keywords and unknown)
  const classifiedTotal = names.length - keywordsFiltered;
  const validTotal = classifiedTotal - counts.unknown;

  if (validTotal === 0) {
    // All names were unknown or keywords - no detectable convention
    return {
      majority: 'unknown',
      confidence: 0,
      mixed: true,
      distribution: {} as Record<NamingStyle, number>,
      sampleSize: names.length,
    };
  }

  // Calculate distribution (percentages of valid names)
  const distribution: Record<string, number> = {};
  for (const [style, count] of Object.entries(counts)) {
    if (style !== 'unknown' && count > 0) {
      distribution[style] = count / validTotal;
    }
  }

  // Find majority style (highest percentage)
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    // Should never happen since validTotal > 0, but TypeScript needs the guard
    return {
      majority: 'unknown',
      confidence: 0,
      mixed: true,
      distribution: {} as Record<NamingStyle, number>,
      sampleSize: names.length,
    };
  }

  const [majorityStyle, majorityPercent] = sorted[0]!;

  return {
    majority: majorityStyle as NamingStyle,
    confidence: majorityPercent,
    mixed: majorityPercent < 0.7,  // <70% = mixed conventions
    distribution: distribution as Record<NamingStyle, number>,
    sampleSize: names.length,
  };
}

/**
 * Extract variables from parsed files using tree-sitter queries
 *
 * Uses 'variables' and 'shortVars' queries added in Task 7.
 * Reuses QueryCache and ParserManager infrastructure from STEP_1.3.
 *
 * @param files - Parsed files from analysis.parsed.files
 * @param rootPath - Project root for file path resolution
 * @returns Array of variable names from all files
 */
export async function extractVariables(
  files: ParsedFile[],
  rootPath: string
): Promise<string[]> {
  const variables: string[] = [];

  for (const file of files) {
    const { language } = file;

    // Get parser and query for this language
    const parser = parserManager.getParser(language as any);

    if (!parser) continue;

    // Check if variables query exists for this language
    const languageQueries = queryCache as any;
    let variableQuery;
    try {
      variableQuery = queryCache.getQuery(language as any, 'variables');
    } catch {
      // Language doesn't have variables query, skip
      continue;
    }

    // Read file content
    const filePath = join(rootPath, file.file);
    let content: string;
    try {
      content = await readFile(filePath, 'utf-8');
    } catch {
      // File not readable, skip
      continue;
    }

    // Parse and run query
    const tree = parser.parse(content);
    const captures = variableQuery.captures(tree.rootNode);

    // Extract variable names from captures
    for (const capture of captures) {
      const varName = capture.node.text;
      if (varName) {
        variables.push(varName);
      }
    }

    // For Go, also run shortVars query
    if (language === 'go') {
      try {
        const shortVarQuery = queryCache.getQuery('go' as any, 'shortVars');
        const shortCaptures = shortVarQuery.captures(tree.rootNode);

        for (const capture of shortCaptures) {
          const varName = capture.node.text;
          if (varName) {
            variables.push(varName);
          }
        }
      } catch {
        // shortVars query not available, skip
      }
    }
  }

  return variables;
}

/**
 * Analyze file naming convention
 *
 * Extracts file names from parsed files, classifies with regex, determines majority.
 *
 * @param files - Parsed files from STEP_1.3
 * @param language - Project language for keyword filtering
 * @returns File naming convention with confidence
 *
 * @example
 * ```typescript
 * // Files: user_service.py, auth_middleware.py, api_response.py
 * {
 *   majority: 'snake_case',
 *   confidence: 1.0,
 *   mixed: false,
 *   distribution: { snake_case: 1.0 }
 * }
 * ```
 */
export function analyzeFileNaming(
  files: ParsedFile[],
  language: string
): NamingConventionResult {
  // Extract file names (without extension)
  const fileNames = files.map(f => {
    const base = basename(f.file);  // 'user_service.py' → 'user_service.py'
    return base.replace(/\.[^.]+$/, '');  // Remove extension: 'user_service'
  });

  return analyzeNamingConvention(fileNames, language);
}

/**
 * Analyze function naming convention
 *
 * Uses function names from STEP_1.3 parsed.files (already extracted).
 *
 * @param files - Parsed files from STEP_1.3
 * @param language - Project language
 * @returns Function naming convention
 *
 * @example
 * ```typescript
 * // Functions: get_user, create_user, delete_user
 * {
 *   majority: 'snake_case',
 *   confidence: 1.0,
 *   mixed: false,
 *   distribution: { snake_case: 1.0 }
 * }
 * ```
 */
export function analyzeFunctionNaming(
  files: ParsedFile[],
  language: string
): NamingConventionResult {
  // Extract function names from all files
  const functionNames = files.flatMap(f => f.functions.map(fn => fn.name));

  return analyzeNamingConvention(functionNames, language);
}

/**
 * Analyze class naming convention
 *
 * Uses class names from STEP_1.3 parsed.files.
 *
 * @param files - Parsed files
 * @param language - Project language
 * @returns Class naming convention (usually PascalCase)
 */
export function analyzeClassNaming(
  files: ParsedFile[],
  language: string
): NamingConventionResult {
  const classNames = files.flatMap(f => f.classes.map(c => c.name));

  return analyzeNamingConvention(classNames, language);
}

/**
 * Analyze variable naming convention
 *
 * Extracts variables using tree-sitter queries, classifies, determines majority.
 *
 * @param files - Parsed files
 * @param language - Project language
 * @param rootPath - Project root for file reading
 * @returns Variable naming convention
 *
 * @example
 * ```typescript
 * // Variables: user_data, api_response, config_settings
 * {
 *   majority: 'snake_case',
 *   confidence: 1.0,
 *   mixed: false
 * }
 * ```
 */
export async function analyzeVariableNaming(
  files: ParsedFile[],
  language: string,
  rootPath: string
): Promise<NamingConventionResult> {
  // Extract variables using queries
  const variableNames = await extractVariables(files, rootPath);

  return analyzeNamingConvention(variableNames, language);
}

/**
 * Analyze constant naming convention
 *
 * Filters for SCREAMING_SNAKE_CASE from variables.
 *
 * @param files - Parsed files
 * @param language - Project language
 * @param rootPath - Project root
 * @returns Constant naming convention (should be SCREAMING_SNAKE_CASE)
 */
export async function analyzeConstantNaming(
  files: ParsedFile[],
  language: string,
  rootPath: string
): Promise<NamingConventionResult> {
  // Extract all variables first
  const variableNames = await extractVariables(files, rootPath);

  // Filter for constants (SCREAMING_SNAKE_CASE pattern)
  const constants = variableNames.filter(name => {
    const style = classifyNamingStyle(name);
    return style === 'SCREAMING_SNAKE_CASE';
  });

  return analyzeNamingConvention(constants, language);
}

