/**
 * Convention detection types (STEP_2.2)
 *
 * Defines types for detected coding conventions:
 * - Naming (snake_case, camelCase, PascalCase, kebab-case, SCREAMING_SNAKE_CASE)
 * - Imports (absolute, relative, mixed)
 * - Type hints (always, sometimes, never - Python)
 * - Docstrings (google, numpy, rst, jsdoc, tsdoc, none)
 * - Indentation (spaces, tabs with width)
 *
 * Based on: START_HERE.md lines 874-993 (complete schema definitions)
 */

import { z } from 'zod';

/**
 * Generic convention result with distribution
 *
 * Used for any convention type that has multiple possible values.
 * Reports majority, confidence, whether mixed, and full distribution.
 *
 * @param valueSchema
 * @example Clear convention
 * ```typescript
 * {
 *   majority: 'snake_case',
 *   confidence: 0.86,
 *   mixed: false,
 *   distribution: { snake_case: 0.86, camelCase: 0.10, PascalCase: 0.04 }
 * }
 * ```
 *
 * @example Mixed convention
 * ```typescript
 * {
 *   majority: 'snake_case',
 *   confidence: 0.65,
 *   mixed: true,  // <0.7 = mixed
 *   distribution: { snake_case: 0.65, camelCase: 0.30, PascalCase: 0.05 }
 * }
 * ```
 */
export const ConventionResultSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    majority: valueSchema,
    confidence: z.number().min(0).max(1),
    mixed: z.boolean(),  // true if confidence < 0.7
    distribution: z.record(z.string(), z.number()),  // All detected values with percentages
  });

/**
 * Naming style enumeration
 */
export const NamingStyleSchema = z.enum([
  'snake_case',
  'camelCase',
  'PascalCase',
  'kebab-case',
  'SCREAMING_SNAKE_CASE',
  'lowercase',
  'unknown'
]);

export type NamingStyle = z.infer<typeof NamingStyleSchema>;

/**
 * Naming convention result for a single category (e.g., functions, variables)
 */
export const NamingConventionResultSchema = ConventionResultSchema(NamingStyleSchema);

export type NamingConventionResult = z.infer<typeof NamingConventionResultSchema>;

/**
 * Naming convention result (5 sub-categories)
 *
 * Analyzes naming across files, variables, functions, classes, and constants.
 *
 * @example Python project
 * ```typescript
 * {
 *   files: { majority: 'snake_case', confidence: 0.92, mixed: false, ... },
 *   variables: { majority: 'snake_case', confidence: 0.88, mixed: false, ... },
 *   functions: { majority: 'snake_case', confidence: 0.95, mixed: false, ... },
 *   classes: { majority: 'PascalCase', confidence: 1.0, mixed: false, ... },
 *   constants: { majority: 'SCREAMING_SNAKE_CASE', confidence: 1.0, mixed: false, ... }
 * }
 * ```
 */
export const NamingConventionSchema = z.object({
  files: NamingConventionResultSchema.optional(),
  variables: NamingConventionResultSchema.optional(),
  functions: NamingConventionResultSchema.optional(),
  classes: NamingConventionResultSchema.optional(),
  constants: NamingConventionResultSchema.optional(),
});

export type NamingConvention = z.infer<typeof NamingConventionSchema>;

/**
 * Import style enumeration
 */
export const ImportStyleSchema = z.enum(['absolute', 'relative', 'mixed']);

export type ImportStyle = z.infer<typeof ImportStyleSchema>;

/**
 * Import convention result
 *
 * @example Absolute imports
 * ```typescript
 * {
 *   style: 'absolute',
 *   confidence: 0.85,
 *   distribution: { absolute: 0.85, relative: 0.15 }
 * }
 * ```
 */
export const ImportConventionSchema = z.object({
  style: ImportStyleSchema,
  confidence: z.number().min(0).max(1),
  distribution: z.object({
    absolute: z.number(),
    relative: z.number(),
  }),
  aliasPattern: z.string().nullable().optional(),
});

export type ImportConvention = z.infer<typeof ImportConventionSchema>;

/**
 * Type hint usage enumeration (Python gradual typing)
 */
export const TypeHintUsageSchema = z.enum(['always', 'sometimes', 'never']);

export type TypeHintUsage = z.infer<typeof TypeHintUsageSchema>;

/**
 * Type hint convention result (Python-specific)
 *
 * @example Always typed
 * ```typescript
 * {
 *   usage: 'always',
 *   confidence: 0.95,
 *   percentage: 0.98  // 98% of functions have type hints
 * }
 * ```
 */
export const TypeHintConventionSchema = z.object({
  usage: TypeHintUsageSchema,
  confidence: z.number().min(0).max(1),
  percentage: z.number().min(0).max(1),
});

export type TypeHintConvention = z.infer<typeof TypeHintConventionSchema>;

/**
 * Docstring format enumeration
 */
export const DocstringFormatSchema = z.enum([
  'google',
  'numpy',
  'rst',
  'jsdoc',
  'tsdoc',
  'none'
]);

export type DocstringFormat = z.infer<typeof DocstringFormatSchema>;

/**
 * Docstring convention result
 *
 * @example Google style
 * ```typescript
 * {
 *   format: 'google',
 *   confidence: 0.90,
 *   coverage: 0.75  // 75% of functions have docstrings
 * }
 * ```
 */
export const DocstringConventionSchema = z.object({
  format: DocstringFormatSchema,
  confidence: z.number().min(0).max(1),
  coverage: z.number().min(0).max(1),  // % of functions with docstrings
});

export type DocstringConvention = z.infer<typeof DocstringConventionSchema>;

/**
 * Indentation style enumeration
 */
export const IndentStyleSchema = z.enum(['spaces', 'tabs', 'mixed']);

export type IndentStyle = z.infer<typeof IndentStyleSchema>;

/**
 * Indentation convention result
 *
 * @example 4-space indentation
 * ```typescript
 * {
 *   style: 'spaces',
 *   width: 4,
 *   confidence: 1.0
 * }
 * ```
 */
export const IndentationConventionSchema = z.object({
  style: IndentStyleSchema,
  width: z.number().optional(),  // 2, 4, or 8 if spaces
  confidence: z.number().min(0).max(1),
});

export type IndentationConvention = z.infer<typeof IndentationConventionSchema>;

/**
 * Complete convention analysis result
 *
 * Contains detected conventions for all 5 categories (all optional).
 * Includes metadata about detection process (files sampled, time taken).
 *
 * @example TypeScript project
 * ```typescript
 * {
 *   naming: {
 *     files: { majority: 'kebab-case', confidence: 0.90, mixed: false, ... },
 *     variables: { majority: 'camelCase', confidence: 0.95, mixed: false, ... },
 *     functions: { majority: 'camelCase', confidence: 0.92, mixed: false, ... },
 *     classes: { majority: 'PascalCase', confidence: 1.0, mixed: false, ... },
 *   },
 *   imports: { style: 'absolute', confidence: 0.85, distribution: { absolute: 0.85, relative: 0.15 } },
 *   indentation: { style: 'spaces', width: 2, confidence: 1.0 },
 *   sampledFiles: 50,
 *   detectionTime: 2340
 * }
 * ```
 */
export const ConventionAnalysisSchema = z.object({
  // 5 convention categories (all optional - may not detect all)
  naming: NamingConventionSchema.optional(),
  imports: ImportConventionSchema.optional(),
  typeHints: TypeHintConventionSchema.optional(),
  docstrings: DocstringConventionSchema.optional(),
  indentation: IndentationConventionSchema.optional(),

  // Metadata
  sampledFiles: z.number(),
  detectionTime: z.number(),  // milliseconds
});

export type ConventionAnalysis = z.infer<typeof ConventionAnalysisSchema>;

/**
 * Helper to create empty ConventionAnalysis (for tests, errors, graceful degradation)
 */
export function createEmptyConventionAnalysis(): ConventionAnalysis {
  return {
    sampledFiles: 0,
    detectionTime: 0,
  };
}
