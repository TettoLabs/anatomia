/**
 * Next.js framework detector
 *
 * CRITICAL: Check BEFORE React (Next.js includes React)
 */

import { exists } from '../../utils/file.js';
import * as path from 'node:path';
import type { Detection } from '../python/fastapi.js';

/**
 * Detect Next.js framework
 *
 * Priority: Must be checked BEFORE React to prevent misclassification
 *
 * @param rootPath - Project root directory
 * @param dependencies - Dependency list
 * @returns Detection result
 */
export async function detectNextjs(
  rootPath: string,
  dependencies: string[]
): Promise<Detection> {
  const dependencyFound = dependencies.includes('next');
  if (!dependencyFound) {
    return { framework: null, confidence: 0.0, indicators: [] };
  }

  const indicators: string[] = ['next in dependencies'];
  let confidence = 0.85;

  // Config file check (strong signal)
  const hasNextConfig =
    (await exists(path.join(rootPath, 'next.config.js'))) ||
    (await exists(path.join(rootPath, 'next.config.ts'))) ||
    (await exists(path.join(rootPath, 'next.config.mjs')));

  if (hasNextConfig) {
    confidence += 0.10;
    indicators.push('next.config.* found');
  }

  // Directory structure check (App Router vs Pages Router)
  const hasAppDir = await exists(path.join(rootPath, 'app'));
  const hasPagesDir = await exists(path.join(rootPath, 'pages'));

  if (hasAppDir || hasPagesDir) {
    confidence += 0.05;
    indicators.push(hasAppDir ? 'app/ directory (App Router)' : 'pages/ directory (Pages Router)');
  }

  return {
    framework: 'nextjs',
    confidence: Math.min(1.0, confidence),
    indicators,
  };
}
