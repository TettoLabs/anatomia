/**
 * Match pre-populated gotchas against detected stack.
 * Returns a map of skill name → gotcha texts.
 */

import { GOTCHAS } from '../data/gotchas.js';
import type { EngineResult } from '../engine/types/engineResult.js';

/**
 * Find gotchas that match the detected stack.
 * A gotcha matches if ALL its trigger conditions are satisfied.
 *
 * @param result - Scan engine result
 * @returns Map of skill name → array of gotcha texts
 */
export function matchGotchas(result: EngineResult): Map<string, string[]> {
  const matched = new Map<string, string[]>();

  for (const gotcha of GOTCHAS) {
    const allMatch = Object.entries(gotcha.triggers).every(([key, value]) => {
      const stackValue = (result.stack as Record<string, string | null>)[key];
      return stackValue === value;
    });

    if (allMatch) {
      const existing = matched.get(gotcha.skill) || [];
      existing.push(gotcha.text);
      matched.set(gotcha.skill, existing);
    }
  }

  return matched;
}
