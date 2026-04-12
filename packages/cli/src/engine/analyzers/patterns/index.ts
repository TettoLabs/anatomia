/**
 * Pattern inference engine (Item 14a — orchestrator + public API surface).
 *
 * 3-stage detection pipeline:
 * - Stage 1 (CP0): Dependency-based detection (0.75-0.85 confidence)
 *   — dependencies.ts
 * - Stage 2 (CP1): File sampling (reuses STEP_1.3 sampleFiles)
 * - Stage 3 (CP1): Tree-sitter confirmation (boosts to 0.90-0.95)
 *   — confirmation.ts
 *
 * Post-processing (CP2-3):
 * - Confidence filtering (≥0.7 threshold) — confidence.ts
 * - Multi-pattern handling (SQLAlchemy sync + async) — confirmation.ts
 *
 * This file is the orchestrator. All heavy-lifting lives in the sibling
 * modules. Consumers import from './index.js' (or the folder name, which
 * resolves to index.ts).
 *
 * Re-exports below preserve the old patterns.ts public API so existing
 * tests and engine/index.ts dynamic imports continue to work after the
 * folder split.
 */

import type { DeepTierInput } from '../../types/index.js';
import type { PatternAnalysis } from '../../types/patterns.js';
import { createEmptyPatternAnalysis } from '../../types/patterns.js';
import { detectFromDependencies } from './dependencies.js';
import { confirmPatternsWithTreeSitter } from './confirmation.js';
import { filterByConfidence } from './confidence.js';

// ============================================================================
// MAIN ORCHESTRATOR (CP4)
// ============================================================================

/**
 * Infer patterns from project analysis (STEP_2.1 main entry point)
 *
 * @param rootPath - Project root directory
 * @param analysis - AnalysisResult from STEP_1 (includes parsed field)
 * @returns PatternAnalysis with detected patterns + metadata
 *
 * @example
 * ```typescript
 * const analysis = await analyze('/path/to/project');
 * // analysis.patterns will contain:
 * {
 *   validation: { library: 'pydantic', confidence: 0.95, evidence: [...] },
 *   database: { library: 'sqlalchemy', variant: 'async', confidence: 0.95, evidence: [...] },
 *   auth: { library: 'jwt', confidence: 0.85, evidence: [...] },
 *   testing: { library: 'pytest', confidence: 0.90, evidence: [...] },
 *   errorHandling: { library: 'exceptions', variant: 'fastapi-httpexception', confidence: 0.95, evidence: [...] },
 *   sampledFiles: 20,
 *   detectionTime: 8742,
 *   threshold: 0.7
 * }
 * ```
 */
export async function inferPatterns(
  rootPath: string,
  analysis: DeepTierInput,
  options?: { deps?: string[]; devDeps?: string[] },
): Promise<PatternAnalysis> {
  const startTime = Date.now();

  try {
    // Stage 1: Dependency-based detection (CP0)
    // Use pre-read deps from census if provided, else fall back to filesystem.
    const stage1Start = Date.now();
    const deps = options?.deps ?? [];
    const devDeps = options?.devDeps ?? [];

    const dependencyPatterns = await detectFromDependencies(
      deps,
      devDeps,
      analysis.projectType,
      analysis.framework,
      rootPath,
    );
    const stage1Duration = Date.now() - stage1Start;

    if (process.env['VERBOSE']) {
      console.log(`[Pattern Inference] Stage 1 (dependencies): ${stage1Duration}ms`);
      console.log(`[Pattern Inference] Detected ${Object.keys(dependencyPatterns).length} patterns from dependencies`);
    }

    // Stage 2: File sampling (reuses STEP_1.3 parsed files - no re-parsing)
    // Already done in STEP_1.3, data available in analysis.parsed
    const sampledFiles = analysis.parsed?.files?.length || 0;

    // Stage 3: Tree-sitter confirmation (CP1)
    const stage3Start = Date.now();
    const confirmedPatterns = await confirmPatternsWithTreeSitter(
      rootPath,
      dependencyPatterns,
      analysis
    );
    const stage3Duration = Date.now() - stage3Start;

    if (process.env['VERBOSE']) {
      console.log(`[Pattern Inference] Stage 3 (confirmation): ${stage3Duration}ms`);
    }

    // Post-processing: Confidence filtering (CP2)
    const filteredPatterns = filterByConfidence(confirmedPatterns, 0.7);

    if (process.env['VERBOSE']) {
      console.log(`[Pattern Inference] Filtered: ${Object.keys(filteredPatterns).length}/${Object.keys(confirmedPatterns).length} patterns ≥0.7 confidence`);
    }

    // Calculate total detection time
    const detectionTime = Date.now() - startTime;

    if (process.env['VERBOSE']) {
      console.log(`[Pattern Inference] Total time: ${detectionTime}ms`);
    }

    // Build PatternAnalysis result
    const result: PatternAnalysis = {
      // Spread filtered patterns into category fields
      errorHandling: filteredPatterns['errorHandling'] as PatternAnalysis['errorHandling'],
      validation: filteredPatterns['validation'] as PatternAnalysis['validation'],
      database: filteredPatterns['database'] as PatternAnalysis['database'],
      auth: filteredPatterns['auth'] as PatternAnalysis['auth'],
      testing: filteredPatterns['testing'] as PatternAnalysis['testing'],

      // Metadata
      sampledFiles,
      detectionTime,
      threshold: 0.7,
    };

    return result;

  } catch (error) {
    // Graceful degradation: If pattern inference fails, return empty result
    if (process.env['VERBOSE']) {
      console.error('[Pattern Inference] Error during inference:', error);
    }

    return createEmptyPatternAnalysis();
  }
}

// Re-export the public API so consumers that imported from patterns.ts
// (via the folder path now) keep working. Tests import directly from
// './dependencies.js', './confirmation.js', './confidence.js' as needed.
export { detectFromDependencies } from './dependencies.js';
export { confirmPatternsWithTreeSitter, detectMultipleDatabasePatterns } from './confirmation.js';
export {
  filterByConfidence,
  interpretConfidence,
  calculateECE,
  type PatternDetectionResult,
} from './confidence.js';
