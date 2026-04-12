/**
 * API route input validation check.
 *
 * On deep scans (parsed files available), checks which API route files
 * import validation libraries — directly (zod, yup, joi) or via shared
 * schema modules (paths containing 'schema', 'validate', 'validation').
 *
 * Only fires on deep tier. Surface scans don't parse files.
 */

import type { Finding, FindingContext } from '../index.js';

const VALIDATION_MODULES = ['zod', 'yup', 'joi', 'class-validator', 'valibot', '@sinclair/typebox'];
const VALIDATION_PATH_PATTERNS = ['schema', 'schemas', 'validate', 'validation'];

/**
 * Check API route input validation coverage.
 *
 * @param ctx - Finding context with parsed files
 * @returns Finding or null (null if no API routes or no parsed files)
 */
export function checkApiValidation(ctx: FindingContext): Finding | null {
  // Only on deep tier (need parsed file imports)
  if (ctx.parsedFiles.length === 0) return null;

  // Find parsed files that are API routes
  const apiFiles = ctx.parsedFiles.filter(f =>
    f.file.includes('/api/') && (
      f.file.endsWith('route.ts') || f.file.endsWith('route.js') ||
      f.file.endsWith('route.tsx') || f.file.endsWith('route.jsx') ||
      /pages\/api\/.*\.(ts|js|tsx|jsx)$/.test(f.file)
    )
  );

  if (apiFiles.length === 0) return null;

  // Check which import validation — directly or via shared schemas
  const validated = apiFiles.filter(f =>
    f.imports.some(imp =>
      VALIDATION_MODULES.some(v => imp.module.includes(v)) ||
      VALIDATION_PATH_PATTERNS.some(p => imp.module.toLowerCase().includes(p))
    )
  );

  if (validated.length === apiFiles.length) {
    return {
      id: 'api-validation',
      severity: 'pass',
      title: `${apiFiles.length} API routes, all validate input`,
      detail: null,
      category: 'security',
    };
  }

  const unvalidated = apiFiles.length - validated.length;
  return {
    id: 'api-validation',
    severity: 'warn',
    title: `${unvalidated}/${apiFiles.length} sampled API routes have no input validation`,
    detail: 'Routes accept unvalidated data from the network',
    category: 'security',
  };
}
