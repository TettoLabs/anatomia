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

/**
 * Detect Remix / React Router v7.
 *
 * @param _rootPath - Project root (unused; kept for signature uniformity
 *   with NODE_FRAMEWORK_DETECTORS — Item 17)
 * @param dependencies - Dependency list
 * @returns Detection result with framework name 'react-router' (v7) or
 *   'remix' (legacy), null if neither
 */
export async function detectRemix(
  _rootPath: string,
  dependencies: string[]
): Promise<Detection> {
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
