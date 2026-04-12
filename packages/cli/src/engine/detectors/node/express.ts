/**
 * Express framework detector (plain, NOT Nest.js)
 *
 * CRITICAL: Only detect Express if Nest.js NOT present
 * (Nest.js uses Express internally - disambiguation required)
 */

import type { Detection } from '../python/fastapi.js';
import type { FrameworkHintEntry } from '../../types/census.js';

/**
 * Detect Express framework (excludes Nest.js).
 * Only called if Nest.js NOT detected (priority order enforced in orchestrator).
 */
export function detectExpress(
  dependencies: string[],
  hints: FrameworkHintEntry[]
): Detection {
  const hasExpress = dependencies.includes('express');
  const hasNest = dependencies.includes('@nestjs/core');

  if (!hasExpress || hasNest) {
    return { framework: null, confidence: 0.0, indicators: [] };
  }

  const indicators: string[] = ['express in dependencies'];
  let confidence = 0.80;

  // Check for typical Express files via census hints
  const hasServerFile = hints.some(h => h.framework === 'express');

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
