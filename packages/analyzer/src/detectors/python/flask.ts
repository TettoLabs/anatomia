/**
 * Flask framework detector
 */

import { scanForImports } from '../../utils/importScanner.js';
import { calculateConfidence } from '../../utils/confidence.js';
import { exists } from '../../utils/file.js';
import * as path from 'node:path';
import type { Detection } from './fastapi.js';

/**
 * Detect Flask framework
 *
 * @param rootPath - Project root directory
 * @param dependencies - Dependency list
 * @returns Detection result
 */
export async function detectFlask(
  rootPath: string,
  dependencies: string[]
): Promise<Detection> {
  const dependencyFound = dependencies.includes('flask');
  if (!dependencyFound) {
    return { framework: null, confidence: 0.0, indicators: [] };
  }

  const indicators: string[] = ['flask in dependencies'];

  // Scan for imports
  const importScan = await scanForImports(rootPath, 'flask');
  if (importScan.found) {
    indicators.push(`flask imports found (${importScan.count} occurrences)`);
  }

  // Check for app.py (common Flask convention)
  const hasAppPy = await exists(path.join(rootPath, 'app.py'));
  if (hasAppPy) {
    indicators.push('app.py found');
  }

  const confidence = calculateConfidence({
    dependencyFound: true,
    importsFound: importScan.found,
    configFilesFound: hasAppPy,
  });

  return {
    framework: 'flask',
    confidence,
    indicators,
  };
}
