import { z } from 'zod';

/**
 * Project types supported by Anatomia detection
 */
export const ProjectTypeSchema = z.enum([
  'python',
  'node',
  'go',
  'rust',
  'ruby',
  'php',
  'mixed', // Monorepo with multiple languages
  'unknown', // No indicators found
]);

export type ProjectType = z.infer<typeof ProjectTypeSchema>;

/**
 * Confidence score for a detection
 * Range: 0.0 (no confidence) to 1.0 (certain)
 */
export const ConfidenceScoreSchema = z.number().min(0.0).max(1.0);

/**
 * Analysis result from project detection
 *
 * STEP_1.1 provides: projectType, framework, confidence, indicators
 * STEP_1.2 will add: structure, entryPoints, architecture
 * STEP_1.3 will add: parsed (tree-sitter results)
 * STEP_2 will add: patterns, conventions
 */
export const AnalysisResultSchema = z.object({
  // Project identification
  projectType: ProjectTypeSchema,
  framework: z.string().nullable(), // null if no framework detected

  // Confidence scores (transparency)
  confidence: z.object({
    projectType: ConfidenceScoreSchema,
    framework: ConfidenceScoreSchema,
  }),

  // Indicators that led to detection (explainability)
  indicators: z.object({
    projectType: z.array(z.string()), // Files found: ["package.json", "package-lock.json"]
    framework: z.array(z.string()), // Signals found: ["next in dependencies", "next.config.js exists"]
  }),

  // Metadata
  detectedAt: z.string(), // ISO timestamp
  version: z.string(), // Tool version (e.g., "0.1.0-alpha")
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

/**
 * Helper to create empty AnalysisResult (for tests, placeholders)
 */
export function createEmptyAnalysisResult(): AnalysisResult {
  return {
    projectType: 'unknown',
    framework: null,
    confidence: {
      projectType: 0.0,
      framework: 0.0,
    },
    indicators: {
      projectType: [],
      framework: [],
    },
    detectedAt: new Date().toISOString(),
    version: '0.1.0-alpha',
  };
}

/**
 * Validate AnalysisResult at runtime
 * Throws ZodError if invalid
 */
export function validateAnalysisResult(data: unknown): AnalysisResult {
  return AnalysisResultSchema.parse(data);
}
