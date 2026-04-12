/**
 * Next.js framework detector
 *
 * CRITICAL: Check BEFORE React (Next.js includes React)
 */

import type { Detection } from '../python/fastapi.js';
import type { FrameworkHintEntry } from '../../types/census.js';

/**
 * Detect Next.js framework from dependencies and census hints.
 *
 * Priority: Must be checked BEFORE React to prevent misclassification.
 */
export function detectNextjs(
  dependencies: string[],
  hints: FrameworkHintEntry[]
): Detection {
  const dependencyFound = dependencies.includes('next');
  if (!dependencyFound) {
    return { framework: null, confidence: 0.0, indicators: [] };
  }

  const indicators: string[] = ['next in dependencies'];
  let confidence = 0.85;

  // Config file check via census hints (replaces rootPath filesystem check)
  const hasNextConfig = hints.some(h => h.framework === 'nextjs' && (
    h.path.endsWith('next.config.js') ||
    h.path.endsWith('next.config.ts') ||
    h.path.endsWith('next.config.mjs')
  ));

  if (hasNextConfig) {
    confidence += 0.10;
    indicators.push('next.config.* found');
  }

  // Directory structure check via census hints (App Router vs Pages Router)
  const hasAppDir = hints.some(h => h.framework === 'nextjs-app-dir');
  const hasPagesDir = hints.some(h => h.framework === 'nextjs' && (h.path.endsWith('/pages') || h.path === 'pages'));

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
