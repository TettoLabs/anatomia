/**
 * @anatomia/analyzer
 * Code analysis engine for Anatomia CLI
 *
 * Detects project type, framework, and structure from codebase.
 *
 * Implementation status:
 * - CP0: Types and infrastructure ✓
 * - CP1: Dependency parsers (planned)
 * - CP2: Framework detection (planned)
 * - CP3: Edge case handling (planned)
 * - CP4: CLI integration (planned)
 */

// Export types
export type { AnalysisResult, ProjectType } from './types/index.js';
export {
  AnalysisResultSchema,
  ProjectTypeSchema,
  ConfidenceScoreSchema,
  createEmptyAnalysisResult,
  validateAnalysisResult,
} from './types/index.js';

// Import for internal use
import { detectProjectType } from './detectors/projectType.js';
import { detectFramework } from './detectors/framework.js';
import { analyzeStructure } from './analyzers/structure.js';

// Export detectors
export { detectProjectType } from './detectors/projectType.js';
export type { ProjectTypeResult } from './detectors/projectType.js';
export { detectFramework } from './detectors/framework.js';
export type { FrameworkResult } from './detectors/framework.js';

// Export parsers (placeholders for CP1)
export {
  readPythonDependencies,
  readNodeDependencies,
  readGoDependencies,
  readRustDependencies,
  readRubyDependencies,
  readPhpDependencies,
} from './parsers/index.js';

// Export utilities
export { exists, readFile, isDirectory, joinPath } from './utils/file.js';

// Export structure analysis functions (STEP_1.2)
export {
  analyzeStructure,
  findEntryPoints,
  classifyArchitecture,
  findTestLocations,
  buildAsciiTree,
  findConfigFiles,
} from './analyzers/structure.js';

// Export parsed analysis functions (STEP_1.3)
export {
  parseFile,
  detectLanguage,
  ParserManager,
  parserManager,
} from './parsers/treeSitter.js';
export type { Language } from './parsers/treeSitter.js';

// Export parsed analysis types (STEP_1.3)
export type {
  ParsedAnalysis,
  ParsedFile,
  FunctionInfo,
  ClassInfo,
  ImportInfo,
  ExportInfo,
  DecoratorInfo,
} from './types/parsed.js';

// Version constant
export const VERSION = '0.1.0-alpha';

/**
 * Analysis options
 */
export interface AnalyzeOptions {
  skipImportScan?: boolean;
  skipMonorepo?: boolean;
  skipStructure?: boolean;
  maxFiles?: number;
  strictMode?: boolean;
  verbose?: boolean;
}

/**
 * Analyze a project directory and return detection results
 *
 * Orchestrates all detection phases:
 * 1. Monorepo detection
 * 2. Project type detection
 * 3. Framework detection
 * 4. Confidence scoring
 *
 * @param rootPath - Absolute path to project root
 * @param options - Analysis options
 * @returns Analysis results with project type and framework
 *
 * @example
 * ```typescript
 * const result = await analyze('/path/to/project');
 * console.log(result.projectType); // 'python' | 'node' | etc.
 * console.log(result.framework);   // 'fastapi' | 'nextjs' | etc.
 * console.log(result.confidence);  // { projectType: 0.95, framework: 0.90 }
 * ```
 */
export async function analyze(
  rootPath: string,
  options: AnalyzeOptions = {}
): Promise<import('./types/index.js').AnalysisResult> {
  const { createEmptyAnalysisResult } = await import('./types/index.js');
  const { DetectionCollector } = await import('./errors/DetectionCollector.js');
  const { detectMonorepo } = await import('./detectors/monorepo.js');

  const collector = new DetectionCollector();

  try {
    // Phase 1: Monorepo detection
    const monorepoResult = options.skipMonorepo
      ? { isMonorepo: false, tool: null }
      : await detectMonorepo(rootPath, collector);

    // If monorepo, handle specially (for MVP: detect but continue as single project)
    if (monorepoResult.isMonorepo && options.verbose) {
      // Log monorepo info in verbose mode
    }

    // Phase 2: Project type detection
    const projectTypeResult = await detectProjectType(rootPath);

    // Phase 3: Framework detection
    const frameworkResult = await detectFramework(
      rootPath,
      projectTypeResult.type
    );

    // Phase 4: Structure analysis (STEP_1.2 - optional)
    const structure = options.skipStructure
      ? undefined
      : await analyzeStructure(rootPath, projectTypeResult.type, frameworkResult.framework);

    // Build result
    return {
      projectType: projectTypeResult.type,
      framework: frameworkResult.framework,
      confidence: {
        projectType: projectTypeResult.confidence,
        framework: frameworkResult.confidence,
      },
      indicators: {
        projectType: projectTypeResult.indicators,
        framework: frameworkResult.indicators,
      },
      detectedAt: new Date().toISOString(),
      version: VERSION,
      structure,
    };
  } catch (error) {
    // Critical failure - return empty result
    if (options.strictMode) {
      throw error;
    }
    return createEmptyAnalysisResult();
  }
}
