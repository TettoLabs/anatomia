/**
 * Intelligent file sampling for tree-sitter parsing
 *
 * Uses STEP_1.2 entry point detection to prioritize files:
 * - Tier 1: Entry points (highest value - always parse)
 * - Tier 2: src/ directory (application code)
 * - Tier 3: Root level files (simple projects)
 *
 * Excludes:
 * - Test files (using structure.testLocation)
 * - Build outputs (dist/, build/, .next/, target/)
 * - Dependencies (node_modules, vendor/, venv/)
 *
 * Limit: Max 20 files (performance budget ≤5s)
 */

import { glob } from 'glob';
import type { AnalysisResult } from '../types/index.js';

/**
 * Sampling options
 */
export interface SamplingOptions {
  maxFiles?: number;        // Default: 20
  minConfidence?: number;   // Default: 0.8 for entry points
  includeTests?: boolean;   // Default: false
}

/**
 * Sample files for parsing using STEP_1.2 entry points
 *
 * Three-tier sampling:
 * 1. Entry points (confidence ≥ minConfidence) - ALWAYS parse
 * 2. src/ directory files - Sample 10-15 application code files
 * 3. Root level files - Sample 3-5 for simple projects
 *
 * Excludes:
 * - Tests (using structure.testLocation)
 * - Build outputs (dist/, build/, .next/, target/)
 * - Dependencies (node_modules, vendor/, venv/)
 *
 * @param projectRoot - Absolute path to project root
 * @param analysis - AnalysisResult with structure field from STEP_1.2
 * @param options - Sampling configuration
 * @returns Array of file paths to parse (max maxFiles)
 *
 * @throws Error if analysis.structure is undefined
 *
 * @example
 * ```typescript
 * const analysis = await analyze(rootPath);
 * const files = await sampleFiles(rootPath, analysis, { maxFiles: 20 });
 * // → ['app/main.py', 'src/models/user.py', 'src/routes/auth.py', ...]
 * ```
 */
export async function sampleFiles(
  projectRoot: string,
  analysis: AnalysisResult,
  options: SamplingOptions = {}
): Promise<string[]> {
  const { maxFiles = 20, minConfidence = 0.8, includeTests = false } = options;

  // Require structure analysis (STEP_1.2)
  if (!analysis.structure) {
    throw new Error(
      'Structure analysis required for intelligent sampling. ' +
      'Call analyze() with skipStructure: false.'
    );
  }

  const files: string[] = [];
  const structure = analysis.structure;

  // Tier 1: Entry points (confidence >= minConfidence)
  // These are CRITICAL files - always parse
  if (structure.confidence.entryPoints >= minConfidence) {
    files.push(...structure.entryPoints);
  }

  // Tier 2: src/ and app/ directory sampling (application code)
  // app/ is for Next.js App Router projects (majority of target market)
  try {
    const srcPattern = '{src,app}/**/*.{ts,tsx,js,jsx,py,go}';
    const srcFiles = await glob(srcPattern, {
      cwd: projectRoot,
      absolute: false,  // Return relative paths
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/target/**',
        '**/venv/**',
        '**/.venv/**',
        '**/vendor/**',
        '**/__pycache__/**',
      ],
    });

    // Exclude test files
    const testPattern = structure.testLocation;
    const filtered = srcFiles.filter(file => {
      if (includeTests) return true;
      if (!testPattern) return true;

      // Check multiple test patterns
      return (
        !file.startsWith(testPattern) &&
        !file.includes('.test.') &&
        !file.includes('.spec.') &&
        !file.includes('test_') &&
        !file.includes('_test.') &&
        !file.includes('__tests__/')
      );
    });

    // Random sample 10-15 files from src/
    const sampled = filtered
      .sort(() => Math.random() - 0.5)
      .slice(0, 15);

    files.push(...sampled);
  } catch {
    // src/ directory doesn't exist, skip tier 2
  }

  // Tier 3: Root level files (simple projects)
  try {
    const rootPattern = '*.{ts,tsx,js,jsx,py,go}';
    const rootFiles = await glob(rootPattern, {
      cwd: projectRoot,
      absolute: false,
    });

    // Sample 3-5 files from root
    const sampled = rootFiles.slice(0, 5);
    files.push(...sampled);
  } catch {
    // No root files, skip tier 3
  }

  // Deduplicate (entry point might also be in src/)
  const unique = [...new Set(files)];

  // Enforce limit
  return unique.slice(0, maxFiles);
}
