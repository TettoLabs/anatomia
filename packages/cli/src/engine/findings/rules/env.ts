/**
 * Environment variable hygiene check.
 *
 * Pure function over existing secrets data — zero I/O, zero false positives.
 * Checks for .env.example existence and .gitignore coverage.
 */

import type { Finding, FindingContext } from '../index.js';

/**
 * Check environment variable hygiene.
 *
 * @param ctx - Finding context with secrets data
 * @returns Finding with pass, warn, or info severity
 */
export function checkEnvHygiene(ctx: FindingContext): Finding {
  const s = ctx.secrets;

  // No env config at all — not applicable (might be a library, not an app)
  if (!s.envFileExists && !s.envExampleExists) {
    return {
      id: 'env-hygiene',
      severity: 'pass',
      title: 'No environment config detected',
      detail: null,
      category: 'quality',
    };
  }

  // Both present — clean
  if (s.envExampleExists && s.gitignoreCoversEnv) {
    return {
      id: 'env-hygiene',
      severity: 'pass',
      title: '.env.example exists, .gitignore covers .env',
      detail: null,
      category: 'quality',
    };
  }

  // Something is missing
  const issues: string[] = [];
  if (!s.envExampleExists) issues.push('No .env.example');
  if (!s.gitignoreCoversEnv) issues.push('.env not in .gitignore');

  return {
    id: 'env-hygiene',
    severity: 'warn',
    title: issues.join(' · '),
    detail: 'AI won\'t know what env vars this project needs without .env.example',
    category: 'quality',
  };
}
