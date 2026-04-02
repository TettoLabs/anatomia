/**
 * Docstring format analyzer (STEP_2.2 CP2)
 *
 * Detects docstring formats via regex patterns.
 * Based on: START_HERE.md lines 576-686
 */

import type { DocstringConvention, DocstringFormat } from '../../types/conventions.js';

/**
 * Regex patterns for docstring format detection
 */
const GOOGLE_PATTERN = /(?:Args|Returns|Yields|Raises|Example|Note|Attributes):\s*\n/;
const NUMPY_PATTERN = /(?:Parameters|Returns|Yields|Raises|Notes|Examples)\s*\n\s*-{3,}/;
const RST_PATTERN = /:(param|type|returns|rtype|raises)\s*\w*:/;
const JSDOC_PATTERN = /@(param|returns?|throws?|example)/;

/**
 * Classify docstring format using regex patterns
 *
 * Priority order: NumPy > rst > JSDoc > Google > none
 * (NumPy most distinctive with underlines)
 *
 * @param docstring - Docstring content
 * @returns Format classification
 *
 * @example
 * ```typescript
 * classifyDocstringFormat(`
 *   Summary.
 *
 *   Args:
 *       param1: Description
 *   Returns:
 *       Result
 * `)  // → 'google'
 * ```
 */
export function classifyDocstringFormat(docstring: string): DocstringFormat {
  if (!docstring || docstring.trim() === '') {
    return 'none';
  }

  // Priority 1: NumPy (most distinctive - has underlines)
  if (NUMPY_PATTERN.test(docstring)) {
    return 'numpy';
  }

  // Priority 2: reStructuredText (colon-prefixed directives)
  if (RST_PATTERN.test(docstring)) {
    return 'rst';
  }

  // Priority 3: JSDoc (@ tags)
  if (JSDOC_PATTERN.test(docstring)) {
    return 'jsdoc';
  }

  // Priority 4: Google (Args:/Returns:)
  if (GOOGLE_PATTERN.test(docstring)) {
    return 'google';
  }

  // Has content but no recognized format
  return 'none';
}

/**
 * Function with docstring (temporary interface until FunctionInfo extended)
 */
export interface FunctionWithDocstring {
  name: string;
  docstring?: string;
}

/**
 * Analyze docstring convention across functions
 *
 * Calculates format distribution, coverage, majority format.
 * <20% coverage → convention is "none" (project doesn't use docstrings).
 *
 * @param functions - Functions with docstrings
 * @returns Docstring convention
 *
 * @example
 * ```typescript
 * {
 *   format: 'google',
 *   confidence: 0.90,
 *   coverage: 0.75  // 75% of functions have docstrings
 * }
 * ```
 */
export function analyzeDocstrings(
  functions: FunctionWithDocstring[]
): DocstringConvention {
  if (functions.length === 0) {
    return {
      format: 'none',
      confidence: 0.95,
      coverage: 0,
    };
  }

  const formatCounts: Record<string, number> = {};
  let withDocstring = 0;

  // Classify each docstring
  for (const func of functions) {
    if (func.docstring) {
      withDocstring++;
      const format = classifyDocstringFormat(func.docstring);
      formatCounts[format] = (formatCounts[format] || 0) + 1;
    }
  }

  const coverage = withDocstring / functions.length;

  // Coverage threshold: <20% → convention is "none"
  if (coverage < 0.2) {
    return {
      format: 'none',
      confidence: 0.95,
      coverage,
    };
  }

  // Find majority format from those that have docstrings
  const sorted = Object.entries(formatCounts).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return {
      format: 'none',
      confidence: 0.95,
      coverage,
    };
  }

  const [majorityFormat, count] = sorted[0]!;

  const confidence = withDocstring > 0 ? count / withDocstring : 0;

  return {
    format: majorityFormat as DocstringFormat,
    confidence,
    coverage,
  };
}
