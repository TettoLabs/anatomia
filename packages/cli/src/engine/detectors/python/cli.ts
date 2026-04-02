/**
 * Python CLI framework detectors (Typer, Click)
 *
 * Priority: Typer before Click (Typer uses Click internally)
 */

import type { Detection } from './fastapi.js';

/**
 * Detect Python CLI frameworks
 *
 * @param dependencies - Dependency list
 * @returns Detection result (Typer or Click)
 */
export async function detectPythonCli(
  dependencies: string[]
): Promise<Detection> {
  // Typer takes priority (uses Click internally)
  if (dependencies.includes('typer')) {
    return {
      framework: 'typer',
      confidence: 0.85,
      indicators: ['typer in dependencies'],
    };
  }

  // Click (only if no Typer)
  if (dependencies.includes('click')) {
    return {
      framework: 'click',
      confidence: 0.75,  // Lower (very common, might be transitive)
      indicators: ['click in dependencies'],
    };
  }

  return { framework: null, confidence: 0.0, indicators: [] };
}
