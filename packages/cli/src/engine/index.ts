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
 * STEP_1.1: skipImportScan
 * STEP_1.2: skipStructure
 * STEP_1.3: skipParsing, maxFiles
 * STEP_2.1: skipPatterns
 */
interface AnalyzeOptions {
  skipImportScan?: boolean;
  skipStructure?: boolean;
  skipParsing?: boolean;
  skipPatterns?: boolean;
  skipConventions?: boolean;
  maxFiles?: number;
  /** If true, rethrow on engine errors instead of returning an empty
   *  AnalysisResult. Useful for test code that wants to see real failures
   *  instead of silent fallback. Not set by the production scan path. */
  strictMode?: boolean;
}

/**
 * Legacy orchestrator for the engine's per-phase detection pipeline.
 *
 * `analyze()` is the **internal** counterpart to `scanProject()`
 * (in `./scan-engine.ts`). It returns an `AnalysisResult` — the older,
 * tree-sitter-centric shape used during engine development — while
 * `scanProject()` returns the unified `EngineResult` that every display
 * surface consumes. External callers should use `scanProject()`; `analyze()`
 * is retained because it's reached via dynamic import from `scanProject` for
 * the project-type / framework / structure / parsed / patterns / conventions
 * phases, and because 7 test files exercise it directly.
 *
 * NOTE: this function deliberately uses `await import(...)` for the
 * tree-sitter-dependent phases (parsing, patterns, conventions) instead of
 * top-of-file ESM imports. The reason is tree-sitter: `parsers/treeSitter.js`
 * (and everything that transitively imports it) loads native WASM at
 * module-evaluation time, which crashes the CLI if it runs on the
 * `ana init --help` / version-only codepaths. Dynamic-importing pushes the
 * WASM load until `analyze()` is actually called. That shape matters for
 * rename-safety: the module specifiers below are STRING LITERALS and are
 * therefore invisible to `grep`, `madge`, static refactor tooling, and most
 * IDE "find references" features. If you rename a file under parsers,
 * analyzers/patterns, or analyzers/conventions, grep by path literal
 * (`'./parsers/treeSitter.js'` etc.) to catch every dynamic site.
 *
 * @param rootPath - Absolute path to the project root.
 * @param options - Analysis options.
 * @param options.skipImportScan - Skip import-scanner-based framework
 *   disambiguation (faster, used by surface-tier scans).
 * @param options.skipStructure - Skip structure analysis (directory tree,
 *   entry points, test locations, architecture style).
 * @param options.skipParsing - Skip tree-sitter parsing entirely. Forces
 *   `parsed: undefined` and therefore `patterns`/`conventions` to
 *   `undefined` as well (those phases need parsed files as input).
 * @param options.skipPatterns - Skip pattern inference (errorHandling,
 *   validation, database, auth, testing).
 * @param options.skipConventions - Skip convention detection (naming,
 *   imports, indentation).
 * @param options.maxFiles - Cap on the number of files passed to
 *   tree-sitter sampling. Default is per-language.
 * @param options.strictMode - If true, rethrow engine errors instead of
 *   returning an empty AnalysisResult. Used by diagnostic/test callers
 *   that want to see real failures; the production scan path leaves it
 *   unset so errors fail-soft.
 * @returns An `AnalysisResult` — a narrower shape than `EngineResult` that
 *   focuses on what tree-sitter can confirm. `scanProject()` composes this
 *   with dependency detection to build the full `EngineResult`.
 */
export async function analyze(
  rootPath: string,
  options: AnalyzeOptions = {}
): Promise<import('./types/index.js').AnalysisResult> {
  const { createEmptyAnalysisResult } = await import('./types/index.js');

  try {
    // Phase 1: Project type detection
    const projectTypeResult = await detectProjectType(rootPath);

    // Phase 2: Framework detection
    const frameworkResult = await detectFramework(
      rootPath,
      projectTypeResult.type
    );

    // Phase 3: Structure analysis (STEP_1.2 - optional)
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

    // Phase 4: Tree-sitter parsing (STEP_1.3, optional)
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

    // Phase 5: Pattern inference (STEP_2.1, optional)
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

    // Phase 6: Convention detection (STEP_2.2, optional)
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
