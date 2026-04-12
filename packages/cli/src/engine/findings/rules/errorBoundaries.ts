/**
 * Error boundary detection (Next.js App Router).
 *
 * Informational only — checks if any error.tsx exists. A single root-level
 * error.tsx covers all routes via Next.js bubbling. 4/8 well-maintained
 * YC repos have zero error boundaries — this is info, not warn.
 *
 * Only fires on Next.js projects with sampled files (deep tier).
 */

import type { Finding, FindingContext } from '../index.js';

/**
 * Check for error boundary existence in Next.js App Router projects.
 *
 * @param ctx - Finding context with sampled files and stack
 * @returns Finding or null (null if not Next.js or no sampled files)
 */
export function checkErrorBoundaries(ctx: FindingContext): Finding | null {
  if (!ctx.stack.framework?.includes('Next.js')) return null;

  const pages = ctx.sampledFiles.filter(f =>
    f.endsWith('/page.tsx') || f.endsWith('/page.jsx')
  );
  if (pages.length === 0) return null;

  // Check for ANY error.tsx — a single root-level one covers all routes
  const hasAnyErrorBoundary = ctx.sampledFiles.some(f =>
    f.endsWith('/error.tsx') || f.endsWith('/error.jsx')
  );

  if (hasAnyErrorBoundary) {
    return {
      id: 'error-boundaries',
      severity: 'pass',
      title: 'Error boundary detected',
      detail: null,
      category: 'reliability',
    };
  }

  return {
    id: 'error-boundaries',
    severity: 'info',
    title: `${pages.length} pages, no error boundaries`,
    detail: 'Consider adding app/error.tsx for graceful error handling',
    category: 'reliability',
  };
}
