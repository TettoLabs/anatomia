// Export types
export type { AnalysisResult, ProjectType } from './types/index.js';
export {
  AnalysisResultSchema,
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
  parseProjectFiles,
} from './parsers/treeSitter.js';
export type { Language } from './parsers/treeSitter.js';

// Export sampling functions (STEP_1.3 CP3)
export { sampleFiles } from './sampling/fileSampler.js';


// Export caching system (STEP_1.3 CP2)
export { ASTCache } from './cache/astCache.js';
export type { ASTCacheEntry } from './cache/astCache.js';

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

// Export pattern analysis functions (STEP_2.1)
export {
  detectFromDependencies,
  confirmPatternsWithTreeSitter,    // CP1
  filterByConfidence,               // CP2
  interpretConfidence,              // CP2
  calculateECE,                     // CP2
  detectMultipleDatabasePatterns,   // CP3
} from './analyzers/patterns.js';
export type { PatternDetectionResult } from './analyzers/patterns.js';

// Export pattern types (STEP_2.1)
export type {
  PatternAnalysis,
  PatternConfidence,
  MultiPattern,
} from './types/patterns.js';
export {
  PatternAnalysisSchema,
  PatternConfidenceSchema,
  MultiPatternSchema,
  createEmptyPatternAnalysis,
  isMultiPattern,
} from './types/patterns.js';

// Export convention analysis functions (STEP_2.2 - NEW)
export { detectConventions } from './analyzers/conventions/index.js';
export {
  classifyNamingStyle,
  analyzeNamingConvention,
} from './analyzers/conventions/naming.js';
export {
  classifyPythonImport,
  classifyTSImport,
  classifyGoImport,
} from './analyzers/conventions/imports.js';

// Convention types already exported via types/index.ts import/export chain
// (ConventionAnalysis, NamingConvention, etc. exported from types/index.ts which imports from types/conventions.ts)

// Export EngineResult and analyzeProject
export type { EngineResult } from './types/engineResult.js';
export { analyzeProject } from './analyze.js';

// Version constant
const VERSION = '0.2.0';

/**
 * Analysis options
 *
 * STEP_1.1: skipImportScan, skipMonorepo
 * STEP_1.2: skipStructure
 * STEP_1.3: skipParsing, maxFiles
 * STEP_2.1: skipPatterns (NEW)
 */
interface AnalyzeOptions {
  skipImportScan?: boolean;
  skipMonorepo?: boolean;
  skipStructure?: boolean;
  skipParsing?: boolean;      // Skip tree-sitter parsing (STEP_1.3)
  skipPatterns?: boolean;     // Skip pattern inference (STEP_2.1)
  skipConventions?: boolean;  // Skip convention detection (STEP_2.2 - NEW)
  maxFiles?: number;          // Max files to parse (default: 20)
  strictMode?: boolean;
  verbose?: boolean;
}

/**
 * Analyze a project directory and return detection results
 *
 * Orchestrates all detection phases:
 * 1. Monorepo detection (STEP_1.1)
 * 2. Project type detection (STEP_1.1)
 * 3. Framework detection (STEP_1.1)
 * 4. Structure analysis (STEP_1.2)
 * 5. Tree-sitter parsing (STEP_1.3)
 * 6. Pattern inference (STEP_2.1)
 * 7. Convention detection (STEP_2.2 - NEW)
 *
 * @param rootPath - Absolute path to project root
 * @param options - Analysis options
 * @returns Analysis results with project type, framework, structure, parsed code, patterns, and conventions
 *
 * @example
 * ```typescript
 * const result = await analyze('/path/to/project');
 * console.log(result.projectType);             // 'python' | 'node' | etc.
 * console.log(result.framework);               // 'fastapi' | 'nextjs' | etc.
 * console.log(result.structure?.entryPoints);  // ['app/main.py']
 * console.log(result.parsed?.files.length);    // 15 (STEP_1.3)
 * console.log(result.patterns?.validation);    // { library: 'pydantic', confidence: 0.95, ... } (STEP_2.1)
 * console.log(result.conventions?.naming);     // { files: {...}, functions: {...}, ... } (STEP_2.2 - NEW)
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

    // Build intermediate result for STEP_1.3
    const intermediateResult: import('./types/index.js').AnalysisResult = {
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

    // Phase 5: Tree-sitter parsing (STEP_1.3, optional)
    // Wrapped in try-catch for graceful degradation (e.g., npx scenario where tree-sitter fails)
    let parsed: import('./types/parsed.js').ParsedAnalysis | undefined;
    if (!options.skipParsing && structure) {
      try {
        const { parseProjectFiles } = await import('./parsers/treeSitter.js');
        parsed = await parseProjectFiles(rootPath, intermediateResult, options);
      } catch {
        // Tree-sitter failed (e.g., WASM not available in npx temp directory)
        // Continue with partial results - projectType, framework, structure are preserved
        parsed = undefined;
      }
    }

    // Build intermediate result with parsed data (needed for pattern inference)
    const withParsed: import('./types/index.js').AnalysisResult = {
      ...intermediateResult,
      parsed,
    };

    // Phase 6: Pattern inference (STEP_2.1, optional)
    // Wrapped in try-catch for graceful degradation
    let patterns: import('./types/patterns.js').PatternAnalysis | undefined;
    if (!options.skipPatterns && parsed) {
      try {
        const { inferPatterns } = await import('./analyzers/patterns.js');
        patterns = await inferPatterns(rootPath, withParsed);
      } catch {
        // Pattern inference failed - continue with partial results
        patterns = undefined;
      }
    }

    // Build result with patterns
    const withPatterns: import('./types/index.js').AnalysisResult = {
      ...withParsed,
      patterns,
    };

    // Phase 7: Convention detection (STEP_2.2 - NEW, optional)
    // Wrapped in try-catch for graceful degradation
    let conventions: import('./types/conventions.js').ConventionAnalysis | undefined;
    if (!options.skipConventions && parsed) {
      try {
        const { detectConventions } = await import('./analyzers/conventions/index.js');
        conventions = await detectConventions(rootPath, withPatterns);
      } catch {
        // Convention detection failed - continue with partial results
        conventions = undefined;
      }
    }

    // Return complete result (with whatever we successfully detected)
    return {
      ...withPatterns,
      conventions,
    };
  } catch (_error) {
    // Critical failure - return empty result
    if (options.strictMode) {
      throw _error;
    }
    return createEmptyAnalysisResult();
  }
}
