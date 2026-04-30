import { z } from 'zod';
import { StructureAnalysisSchema } from './structure.js';
import { ParsedAnalysisSchema } from './parsed.js';
import { PatternAnalysisSchema } from './patterns.js';
import { ConventionAnalysisSchema } from './conventions.js';

/**
 * Project types supported by Anatomia detection.
 *
 * Internal — only the derived `ProjectType` union is exported. The schema
 * itself has zero external consumers; keeping it `export` invited dead
 * references (INFRA-014 audit). Re-export the schema the day something
 * outside this file needs to validate a project type at runtime.
 */
const ProjectTypeSchema = z.enum([
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
 * Confidence score for a detection (internal).
 *
 * Range: 0.0 (no confidence) to 1.0 (certain). Internal — consumers that
 * need a runtime-validated confidence score get it transitively through
 * `AnalysisResultSchema`. INFRA-014 audit found zero external consumers.
 */
const ConfidenceScoreSchema = z.number().min(0.0).max(1.0);

/**
 * Analysis result from project detection
 *
 * STEP_1.1 provides: projectType, framework, confidence, indicators
 * STEP_1.2 adds: structure (entry points, architecture, tests, directory tree)
 * STEP_1.3 adds: parsed (tree-sitter results)
 * STEP_2.1 adds: patterns (pattern inference results)
 * STEP_2.2 adds: conventions (convention detection results)
 */
export const AnalysisResultSchema = z.object({
  // Project identification (STEP_1.1)
  projectType: ProjectTypeSchema,
  framework: z.string().nullable(), // null if no framework detected

  // Confidence scores (STEP_1.1)
  confidence: z.object({
    projectType: ConfidenceScoreSchema,
    framework: ConfidenceScoreSchema,
  }),

  // Indicators (STEP_1.1)
  indicators: z.object({
    projectType: z.array(z.string()), // Files found: ["package.json", "package-lock.json"]
    framework: z.array(z.string()), // Signals found: ["next in dependencies", "next.config.js exists"]
  }),

  // Metadata (STEP_1.1)
  detectedAt: z.string(), // ISO timestamp
  version: z.string(), // Tool version (e.g., "0.1.0-alpha")

  // STEP_1.2 adds structure analysis (optional field)
  structure: StructureAnalysisSchema.optional(),

  // STEP_1.3 adds tree-sitter parsing (optional field)
  parsed: ParsedAnalysisSchema.optional(),

  // STEP_2.1 adds pattern inference (optional field)
  patterns: PatternAnalysisSchema.optional(),

  // STEP_2.2 adds convention detection (optional field)
  conventions: ConventionAnalysisSchema.optional(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

/**
 * Minimal input for the deep-tier pipeline (parsing → patterns → conventions).
 *
 * Replaces AnalysisResult as the function parameter type for parseProjectFiles,
 * inferPatterns, and detectConventions. Only includes the fields those functions
 * actually read — no confidence, indicators, detectedAt, or version.
 *
 * S20 Disease E: eliminates the `as AnalysisResult` type casts in scan-engine.ts.
 */
export interface DeepTierInput {
  projectType: ProjectType;
  framework: string | null;
  structure?: import('./structure.js').StructureAnalysis | undefined;
  parsed?: import('./parsed.js').ParsedAnalysis | undefined;
  patterns?: import('./patterns.js').PatternAnalysis | undefined;
}

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
    version: '0.2.0',
  };
}

// validateAnalysisResult DELETED — S20 cleanup. Zero production callers.
// AnalysisResultSchema used by types.test.ts and parsed-integration.test.ts for shape validation.

// Export structure analysis types (STEP_1.2)
export type {
  StructureAnalysis,
  EntryPointResult,
  ArchitectureResult,
  TestLocationResult,
} from './structure.js';
export {
  StructureAnalysisSchema,
  EntryPointResultSchema,
  ArchitectureResultSchema,
  TestLocationResultSchema,
  createEmptyStructureAnalysis,
} from './structure.js';

// Export parsed analysis types (STEP_1.3)
export type {
  ParsedAnalysis,
  ParsedFile,
  FunctionInfo,
  ClassInfo,
  ImportInfo,
  ExportInfo,
  DecoratorInfo,
} from './parsed.js';
export {
  ParsedAnalysisSchema,
  ParsedFileSchema,
  FunctionInfoSchema,
  ClassInfoSchema,
  ImportInfoSchema,
  ExportInfoSchema,
  DecoratorInfoSchema,
  createEmptyParsedAnalysis,
} from './parsed.js';

// Export pattern analysis types (STEP_2.1)
export type {
  PatternAnalysis,
  PatternConfidence,
  MultiPattern,  // CP3
} from './patterns.js';
export {
  PatternAnalysisSchema,
  PatternConfidenceSchema,
  MultiPatternSchema,  // CP3
  createEmptyPatternAnalysis,
  isMultiPattern,  // CP3 - type guard
} from './patterns.js';

// Export convention analysis types (STEP_2.2)
// typeHints + docstrings exports removed — phantom analyzers deleted (Item 4).
export type {
  ConventionAnalysis,
  NamingConvention,
  ImportConvention,
  IndentationConvention,
  NamingStyle,
  ImportStyle,
  IndentStyle,
} from './conventions.js';
export {
  ConventionAnalysisSchema,
  NamingConventionSchema,
  ImportConventionSchema,
  IndentationConventionSchema,
  NamingStyleSchema,
  ImportStyleSchema,
  IndentStyleSchema,
  createEmptyConventionAnalysis,
} from './conventions.js';
