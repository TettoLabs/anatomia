/**
 * Nest.js framework detector
 *
 * CRITICAL: Check BEFORE Express (Nest.js uses Express internally)
 */

import { scanForImports } from '../../utils/importScanner.js';
import { exists } from '../../utils/file.js';
import * as path from 'node:path';
import type { Detection } from '../python/fastapi.js';

/**
 * Detect Nest.js framework
 *
 * Priority: Must be checked BEFORE Express
 *
 * @param rootPath - Project root directory
 * @param dependencies - Dependency list
 * @returns Detection result
 */
export async function detectNestjs(
  rootPath: string,
  dependencies: string[]
): Promise<Detection> {
  const dependencyFound = dependencies.includes('@nestjs/core');
  if (!dependencyFound) {
    return { framework: null, confidence: 0.0, indicators: [] };
  }

  const indicators: string[] = ['@nestjs/core in dependencies'];
  let confidence = 0.90;

  // Check for main.ts (Nest.js convention)
  const hasMainTs = await exists(path.join(rootPath, 'src/main.ts'));
  if (hasMainTs) {
    confidence = Math.min(1.0, confidence + 0.05);
    indicators.push('src/main.ts found');
  }

  // Scan for decorators
  const importScan = await scanForImports(rootPath, 'nestjs');
  if (importScan.found) {
    confidence = Math.min(1.0, confidence + 0.05);
    indicators.push(`NestJS decorators found (${importScan.count} occurrences)`);
  }

  return {
    framework: 'nestjs',
    confidence,
    indicators,
  };
}
