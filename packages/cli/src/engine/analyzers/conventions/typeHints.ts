/**
 * Type hint usage analyzer (STEP_2.2 CP1)
 *
 * Python-only analyzer. TypeScript inherently typed, skip for TS projects.
 * Based on: START_HERE.md lines 515-558
 */

import type { FunctionInfo } from '../../types/parsed.js';
import type { TypeHintConvention } from '../../types/conventions.js';

/**
 * Analyze type hint usage across functions
 *
 * Categories:
 * - always: ≥90% functions have type hints
 * - sometimes: 50-90% functions have type hints
 * - never: <50% functions have type hints
 *
 * Confidence:
 * - 0.95 if clear (≥90% or ≤10%)
 * - 0.75 if moderate (between extremes)
 *
 * @param functions - Functions from analysis.parsed.files
 * @returns Type hint usage result
 *
 * @example Always typed
 * ```typescript
 * {
 *   usage: 'always',
 *   confidence: 0.95,
 *   percentage: 0.98  // 98% of functions typed
 * }
 * ```
 */
export function analyzeTypeHints(functions: FunctionInfo[]): TypeHintConvention {
  if (functions.length === 0) {
    return {
      usage: 'never',
      confidence: 0.95,
      percentage: 0,
    };
  }

  // Count functions with type annotations
  // Note: FunctionInfo from STEP_1.3 doesn't have returnType/parameters yet
  // Using (func as any) to access fields that might be added later
  let withTypes = 0;

  for (const func of functions) {
    // Check if function has return type OR parameter types
    const hasReturnType = (func as any).returnType !== undefined;
    const hasParamTypes = (func as any).parameters?.some((p: any) => p.type) ?? false;

    if (hasReturnType || hasParamTypes) {
      withTypes++;
    }
  }

  const percentage = withTypes / functions.length;

  // Classify usage based on percentage
  let usage: 'always' | 'sometimes' | 'never';
  if (percentage >= 0.9) {
    usage = 'always';
  } else if (percentage >= 0.5) {
    usage = 'sometimes';
  } else {
    usage = 'never';
  }

  // Confidence: high if clear (≥90% or ≤10%), moderate otherwise
  const confidence = (percentage >= 0.9 || percentage <= 0.1) ? 0.95 : 0.75;

  return {
    usage,
    confidence,
    percentage,
  };
}
