/**
 * Confidence scoring utilities
 *
 * Based on multi-signal approach:
 * - Dependency: 80% (authoritative)
 * - Imports: 15% (verification)
 * - Config: 5% (bonus)
 * - Patterns: 5% (bonus)
 *
 * Design: /ATLAS3/efforts/STEP_1_1_DETECTION/artifacts/CP2_confidence_algorithm.md
 */

export interface ConfidenceSignals {
  dependencyFound: boolean;
  importsFound: boolean;
  configFilesFound: boolean;
  frameworkSpecificPatterns?: boolean;
}

/**
 * Calculate framework detection confidence
 *
 * @param signals - Detection signals
 * @returns Confidence score 0.0-1.0
 *
 * @example
 * const confidence = calculateConfidence({
 *   dependencyFound: true,           // +0.80
 *   importsFound: true,              // +0.15
 *   configFilesFound: false,         // +0.00
 *   frameworkSpecificPatterns: true  // +0.05
 * });
 * // Returns: 1.00
 */
export function calculateConfidence(signals: ConfidenceSignals): number {
  let confidence = 0.0;

  if (signals.dependencyFound) confidence += 0.80;
  if (signals.importsFound) confidence += 0.15;
  if (signals.configFilesFound) confidence += 0.05;
  if (signals.frameworkSpecificPatterns) confidence += 0.05;

  return Math.min(1.0, confidence);
}

/**
 * Interpret confidence level for user display
 *
 * Based on calibration targets:
 * - High (≥0.80): Safe for auto-template application
 * - Moderate (0.50-0.79): Recommend verification
 * - Low (0.30-0.49): Require manual confirmation
 * - Uncertain (<0.30): Flag for manual review
 */
export function interpretConfidence(confidence: number): {
  level: 'high' | 'moderate' | 'low' | 'uncertain';
  message: string;
} {
  if (confidence >= 0.80) {
    return { level: 'high', message: 'High confidence - safe for auto-apply' };
  }
  if (confidence >= 0.50) {
    return { level: 'moderate', message: 'Moderate confidence - verification recommended' };
  }
  if (confidence >= 0.30) {
    return { level: 'low', message: 'Low confidence - manual confirmation required' };
  }
  return { level: 'uncertain', message: 'Uncertain - manual review needed' };
}
