/**
 * FastAPI framework detector for Python projects
 *
 * Uses multi-signal confidence scoring to identify FastAPI in Python projects.
 * Combines dependency checks, import scanning, and companion package detection.
 *
 * @example
 * const result = await detectFastAPI('/path/to/project', ['fastapi', 'uvicorn']);
 * // Returns: { framework: 'fastapi', confidence: 0.95, indicators: ['fastapi in dependencies', 'imports found', 'uvicorn detected'] }
 */

import { scanForImports } from '../../utils/importScanner.js';
import { calculateConfidence } from '../../utils/confidence.js';

export interface Detection {
  framework: string | null;
  confidence: number;
  indicators: string[];
}

/**
 * Detect FastAPI framework in a Python project
 *
 * Detection logic:
 * 1. Check if 'fastapi' exists in dependencies (primary signal)
 * 2. If not present, return null with 0.0 confidence
 * 3. Scan source files for FastAPI imports (verification signal)
 * 4. Check for companion packages: uvicorn (ASGI server), pydantic (validation)
 * 5. Calculate confidence using multi-signal scoring
 *
 * Confidence weights:
 * - Dependency found: 0.80 (authoritative)
 * - Imports found: 0.15 (verification)
 * - Companion packages: 0.05 (bonus)
 *
 * @param rootPath - Absolute path to project root
 * @param dependencies - List of dependency names from requirements.txt/pyproject.toml
 * @returns Detection result with framework, confidence, and indicators
 */
export async function detectFastAPI(
  rootPath: string,
  dependencies: string[]
): Promise<Detection> {
  const indicators: string[] = [];

  // Primary signal: Check if fastapi in dependencies
  const dependencyFound = dependencies.includes('fastapi');
  if (!dependencyFound) {
    return {
      framework: null,
      confidence: 0.0,
      indicators: [],
    };
  }

  indicators.push('fastapi in dependencies');

  // Secondary signal: Scan for imports
  const importScan = await scanForImports(rootPath, 'fastapi');
  const importsFound = importScan.found;
  if (importsFound) {
    indicators.push(`imports found (${importScan.count} occurrences)`);
  }

  // Bonus signal: Check for companion packages
  const companionPackages = ['uvicorn', 'pydantic'];
  const companionsFound = companionPackages.filter(pkg => dependencies.includes(pkg));
  const hasCompanions = companionsFound.length > 0;

  if (hasCompanions) {
    indicators.push(`companion packages: ${companionsFound.join(', ')}`);
  }

  // Calculate confidence score
  const confidence = calculateConfidence({
    dependencyFound,
    importsFound,
    configFilesFound: false, // FastAPI doesn't require config files
    frameworkSpecificPatterns: hasCompanions,
  });

  return {
    framework: 'fastapi',
    confidence,
    indicators,
  };
}
