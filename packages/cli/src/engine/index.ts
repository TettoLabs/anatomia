// Consumed re-exports (verified S18 — only these have callers)
export type { EngineResult } from './types/engineResult.js';
export { scanProject } from './scan-engine.js';
export { ASTCache } from './cache/astCache.js';
export { ParserManager } from './parsers/treeSitter.js';

// Internal imports for analyze()
import { detectProjectType } from './detectors/projectType.js';
import { detectFramework } from './detectors/framework.js';
import { analyzeStructure } from './analyzers/structure/index.js';

// Version constant
const VERSION = '0.2.0';

/**
 * Analysis options
 *
 * STEP_1.1: skipImportScan, skipMonorepo
 * STEP_1.2: skipStructure
 * STEP_1.3: skipParsing, maxFiles
 * STEP_2.1: skipPatterns
 */
interface AnalyzeOptions {
  skipImportScan?: boolean;
  skipMonorepo?: boolean;
  skipStructure?: boolean;
  skipParsing?: boolean;
  skipPatterns?: boolean;
  skipConventions?: boolean;
  maxFiles?: number;
  strictMode?: boolean;
  verbose?: boolean;
}

/**
 * Analyze a project directory and return detection results
 *
 * Orchestrates all detection phases (consumed by 7 test files).
 *
 * NOTE: this function deliberately uses `await import(...)` for every engine
 * module below instead of top-of-file ESM imports. The reason is tree-sitter:
 * `parsers/treeSitter.js` (and everything that transitively imports it) loads
 * native WASM at module-evaluation time, which crashes the CLI if it runs on
 * the `ana init --help` / version-only codepaths. Dynamic-importing pushes
 * the WASM load until `analyze()` is actually called. That shape matters for
 * rename-safety: the module specifiers below are STRING LITERALS and are
 * therefore invisible to `grep`, `madge`, static refactor tooling, and most
 * IDE "find references" features. If you rename a file here, grep by path
 * literal (`'./detectors/monorepo.js'` etc.) to catch every dynamic site.
 * Sites: lines 47-49 plus phases 5-7 below.
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

    // Build intermediate result
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
    let parsed: import('./types/parsed.js').ParsedAnalysis | undefined;
    if (!options.skipParsing && structure) {
      try {
        const { parseProjectFiles } = await import('./parsers/treeSitter.js');
        parsed = await parseProjectFiles(rootPath, intermediateResult, options);
      } catch {
        parsed = undefined;
      }
    }

    const withParsed: import('./types/index.js').AnalysisResult = {
      ...intermediateResult,
      parsed,
    };

    // Phase 6: Pattern inference (STEP_2.1, optional)
    let patterns: import('./types/patterns.js').PatternAnalysis | undefined;
    if (!options.skipPatterns && parsed) {
      try {
        const { inferPatterns } = await import('./analyzers/patterns/index.js');
        patterns = await inferPatterns(rootPath, withParsed);
      } catch {
        patterns = undefined;
      }
    }

    const withPatterns: import('./types/index.js').AnalysisResult = {
      ...withParsed,
      patterns,
    };

    // Phase 7: Convention detection (STEP_2.2, optional)
    let conventions: import('./types/conventions.js').ConventionAnalysis | undefined;
    if (!options.skipConventions && parsed) {
      try {
        const { detectConventions } = await import('./analyzers/conventions/index.js');
        conventions = await detectConventions(rootPath, withPatterns);
      } catch {
        conventions = undefined;
      }
    }

    return {
      ...withPatterns,
      conventions,
    };
  } catch (_error) {
    if (options.strictMode) {
      throw _error;
    }
    return createEmptyAnalysisResult();
  }
}
