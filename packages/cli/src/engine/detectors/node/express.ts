/**
 * Express framework detector (plain, NOT Nest.js)
 *
 * CRITICAL: Only detect Express if Nest.js NOT present
 * (Nest.js uses Express internally - disambiguation required)
 */

import { exists } from '../../utils/file.js';
import * as path from 'node:path';
import type { Detection } from '../python/fastapi.js';

/**
 * Detect Express framework (excludes Nest.js)
 *
 * Only called if Nest.js NOT detected (priority order enforced in orchestrator)
 *
 * @param rootPath - Project root directory
 * @param dependencies - Dependency list
 * @returns Detection result
 */
export async function detectExpress(
  rootPath: string,
  dependencies: string[]
): Promise<Detection> {
  // Check Express present AND Nest.js absent
  const hasExpress = dependencies.includes('express');
  const hasNest = dependencies.includes('@nestjs/core');

  if (!hasExpress || hasNest) {
    return { framework: null, confidence: 0.0, indicators: [] };
  }

  const indicators: string[] = ['express in dependencies'];
  let confidence = 0.80;

  // Check for typical Express files
  const hasServerFile =
    (await exists(path.join(rootPath, 'server.js'))) ||
    (await exists(path.join(rootPath, 'src/server.js'))) ||
    (await exists(path.join(rootPath, 'app.js'))) ||
    (await exists(path.join(rootPath, 'src/app.js')));

  if (hasServerFile) {
    confidence += 0.10;
    indicators.push('server.js or app.js found');
  }

  return {
    framework: 'express',
    confidence: Math.min(1.0, confidence),
    indicators,
  };
}
