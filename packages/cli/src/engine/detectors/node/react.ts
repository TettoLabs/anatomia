/**
 * React framework detector (plain SPA, NOT Next.js)
 *
 * CRITICAL: Only detect React if Next.js NOT present
 * (Next.js includes React - disambiguation required)
 */

import { exists } from '../../utils/file.js';
import * as path from 'node:path';
import type { Detection } from '../python/fastapi.js';

/**
 * Detect React SPA (excludes Next.js)
 *
 * Only called if Next.js NOT detected (priority order enforced in orchestrator)
 *
 * @param rootPath - Project root directory
 * @param dependencies - Dependency list
 * @returns Detection result
 */
export async function detectReact(
  rootPath: string,
  dependencies: string[]
): Promise<Detection> {
  // Check React present AND Next.js absent
  const hasReact = dependencies.includes('react');
  const hasNext = dependencies.includes('next');

  if (!hasReact || hasNext) {
    return { framework: null, confidence: 0.0, indicators: [] };
  }

  const indicators: string[] = ['react in dependencies'];
  let confidence = 0.75;  // Lower base (React very common, might just be component library)

  // Verify it's actually a React app (not just using React components)
  const hasAppFile =
    (await exists(path.join(rootPath, 'src/App.tsx'))) ||
    (await exists(path.join(rootPath, 'src/App.jsx')));

  if (hasAppFile) {
    confidence = 0.90;  // Definitely a React SPA
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
