/**
 * Python CLI framework detectors (Typer, Click)
 *
 * Priority: Typer before Click (Typer uses Click internally)
 */

import type { Detection } from './fastapi.js';
import type { FrameworkHintEntry } from '../../types/census.js';

/**
 * Detect Python CLI frameworks.
 */
export function detectPythonCli(
  dependencies: string[],
  _hints: FrameworkHintEntry[]
): Detection {
  if (dependencies.includes('typer')) {
    return { framework: 'typer', confidence: 0.85, indicators: ['typer in dependencies'] };
  }
  if (dependencies.includes('click')) {
    return { framework: 'click', confidence: 0.75, indicators: ['click in dependencies'] };
  }
  return { framework: null, confidence: 0.0, indicators: [] };
}
