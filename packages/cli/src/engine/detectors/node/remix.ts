/**
 * Remix / React Router v7 framework detector.
 *
 * React Router v7 is the merged successor of Remix + React Router v6.
 * Both names are still in active use:
 *   - Legacy Remix installs use `@remix-run/*` packages
 *   - React Router v7 installs use `@react-router/dev`
 * Same underlying framework going forward; we report the name that
 * matches the packages the project actually uses.
 *
 * Priority: Must be checked BEFORE plain React — Remix bundles React
 * as a transitive dependency, so any Remix project would otherwise
 * be misclassified as a React SPA.
 *
 * CRITICAL: bare `react-router` (the client-side routing library,
 * not the framework) does NOT count. Many React SPAs use react-router
 * for routing without being Remix/React-Router-v7 apps. Only
 * `@react-router/dev` (the build plugin that makes it a framework)
 * and `@remix-run/*` packages are positive signals.
 */

import type { Detection } from '../python/fastapi.js';
import type { FrameworkHintEntry } from '../../types/census.js';

/**
 * Detect Remix / React Router v7.
 */
export function detectRemix(
  dependencies: string[],
  _hints: FrameworkHintEntry[]
): Detection {
  // React Router v7 (the new name) — check first, this is the forward path
  if (dependencies.includes('@react-router/dev')) {
    return {
      framework: 'react-router',
      confidence: 0.90,
      indicators: ['@react-router/dev in dependencies'],
    };
  }

  // Legacy Remix installs
  const remixPackage = dependencies.find(d => d.startsWith('@remix-run/'));
  if (remixPackage) {
    return {
      framework: 'remix',
      confidence: 0.90,
      indicators: [`${remixPackage} in dependencies`],
    };
  }

  return { framework: null, confidence: 0.0, indicators: [] };
}
