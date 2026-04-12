/**
 * React framework detector (plain SPA, NOT Next.js)
 *
 * CRITICAL: Only detect React if Next.js NOT present
 * (Next.js includes React - disambiguation required)
 */

import type { Detection } from '../python/fastapi.js';
import type { FrameworkHintEntry } from '../../types/census.js';

/**
 * Detect React SPA (excludes Next.js).
 * Only called if Next.js NOT detected (priority order enforced in orchestrator).
 */
export function detectReact(
  dependencies: string[],
  hints: FrameworkHintEntry[]
): Detection {
  const hasReact = dependencies.includes('react');
  const hasNext = dependencies.includes('next');

  if (!hasReact || hasNext) {
    return { framework: null, confidence: 0.0, indicators: [] };
  }

  const indicators: string[] = ['react in dependencies'];
  let confidence = 0.75;

  // Verify it's actually a React app via census hints
  const hasAppFile = hints.some(h => h.framework === 'react');

  if (hasAppFile) {
    confidence = 0.90;
    indicators.push('App.tsx/jsx found (React SPA)');
  }

  // Check for React build tools
  const hasVite = dependencies.includes('vite');
  const hasCRA = dependencies.includes('react-scripts');

  if (hasVite) {
    indicators.push('Vite (React build tool)');
    confidence = Math.max(confidence, 0.85);
  } else if (hasCRA) {
    indicators.push('Create React App');
    confidence = Math.max(confidence, 0.90);
  }

  return {
    framework: 'react',
    confidence,
    indicators,
  };
}
