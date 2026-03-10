import { z } from 'zod';
import { StructureAnalysis, StructureAnalysisSchema } from './structure.js';
import {
  ParsedAnalysis,
  ParsedAnalysisSchema,
  ParsedFile,
  ParsedFileSchema,
  FunctionInfo,
  FunctionInfoSchema,
  ClassInfo,
  ClassInfoSchema,
  ImportInfo,
  ImportInfoSchema,
  ExportInfo,
  ExportInfoSchema,
  DecoratorInfo,
  DecoratorInfoSchema,
  createEmptyParsedAnalysis,
} from './parsed.js';
import {
  PatternAnalysis,
  PatternAnalysisSchema,
  PatternConfidence,
  PatternConfidenceSchema,
  createEmptyPatternAnalysis,
} from './patterns.js';

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
 * STEP_1.2 adds: structure (entry points, architecture, tests, directory tree)
 * STEP_1.3 adds: parsed (tree-sitter results)
 * STEP_2.1 adds: patterns (pattern inference results)
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
    version: '0.1.0',
  };
}

/**
 * Validate AnalysisResult at runtime
 * Throws ZodError if invalid
 */
export function validateAnalysisResult(data: unknown): AnalysisResult {
  return AnalysisResultSchema.parse(data);
}

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
} from './patterns.js';
export {
  PatternAnalysisSchema,
  PatternConfidenceSchema,
  createEmptyPatternAnalysis,
} from './patterns.js';
