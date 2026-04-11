/**
 * Match pre-populated gotchas against detected stack.
 * Returns a map of skill name → gotcha texts.
 */

import { GOTCHAS } from '../data/gotchas.js';
import type { EngineResult } from '../engine/types/engineResult.js';

/**
 * Find gotchas that match the detected stack.
 *
 * A gotcha matches if ALL its trigger conditions are satisfied. A trigger
 * entry `[key, value]` matches when EITHER:
 *
 *   1. `result.stack[key] === value` (primary stack field match, e.g.
 *      `{ framework: 'Next.js' }` or `{ database: 'Prisma' }`), OR
 *   2. `result.externalServices` contains a service with
 *      `category === key && name === value` (service-category match, e.g.
 *      `{ jobs: 'Inngest' }` matches an externalService with
 *      category='jobs' and name='Inngest').
 *
 * The service-category path (S19/SETUP-042) lets gotchas target services
 * that live in externalServices/JOBS_PACKAGES/EMAIL_PACKAGES/etc. instead
 * of primary stack fields. Before this, a gotcha for Inngest could not
 * fire because there's no `stack.jobs` field — the gotcha system could
 * only reach primary stack types. This extension unlocks the whole class.
 *
 * @param result - Scan engine result
 * @returns Map of skill name → array of gotcha texts
 */
export function matchGotchas(result: EngineResult): Map<string, string[]> {
  const matched = new Map<string, string[]>();

  for (const gotcha of GOTCHAS) {
    const allMatch = Object.entries(gotcha.triggers).every(([key, value]) => {
      // Primary stack field match
      const stackValue = (result.stack as Record<string, string | null>)[key];
      if (stackValue === value) return true;
      // Service category match (S19/SETUP-042)
      if (result.externalServices.some(svc => svc.category === key && svc.name === value)) {
        return true;
      }
      return false;
    });

    if (allMatch) {
      const existing = matched.get(gotcha.skill) || [];
      existing.push(gotcha.text);
      matched.set(gotcha.skill, existing);
    }
  }

  return matched;
}
