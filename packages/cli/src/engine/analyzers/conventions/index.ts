/**
 * Convention detection orchestrator (STEP_2.2 CP3)
 *
 * Combines all 5 convention analyzers into single detectConventions() function.
 * Based on: START_HERE.md lines 1059-1098
 */

import { join, basename } from 'node:path';
import type { AnalysisResult } from '../../types/index.js';
import type { ConventionAnalysis } from '../../types/conventions.js';
import { createEmptyConventionAnalysis } from '../../types/conventions.js';
import { sampleFiles } from '../../sampling/fileSampler.js';
import { readFile } from '../../utils/file.js';
import {
  analyzeNamingConvention,
  analyzeFunctionNaming,
  analyzeClassNaming,
  analyzeVariableNaming,
  analyzeConstantNaming,
} from './naming.js';
import { analyzeImportConvention, detectProjectRoot, parseTsconfigAlias } from './imports.js';
import { analyzeTypeHints } from './typeHints.js';
import { analyzeDocstrings } from './docstrings.js';
import { analyzeIndentation } from './indentation.js';

/**
 * Detect conventions from project code
 *
 * Orchestrates all 5 convention analyzers:
 * 1. Naming (files, variables, functions, classes, constants)
 * 2. Imports (absolute vs relative)
 * 3. Type hints (Python: always/sometimes/never)
 * 4. Docstrings (Google/NumPy/JSDoc/rst/none)
 * 5. Indentation (spaces/tabs with width)
 *
 * Samples 50 files (broader than patterns' 20) for statistical validity.
 *
 * @param rootPath - Project root directory
 * @param analysis - AnalysisResult from STEP_1 + STEP_2.1 (needs parsed.files)
 * @returns Convention analysis or empty if detection fails
 *
 * @example
 * ```typescript
 * const analysis = await analyze(projectRoot);
 * const conventions = await detectConventions(projectRoot, analysis);
 *
 * console.log(conventions.naming?.files.majority);  // 'snake_case'
 * console.log(conventions.imports?.style);          // 'absolute'
 * console.log(conventions.indentation?.width);      // 4
 * ```
 */
export async function detectConventions(
  rootPath: string,
  analysis: AnalysisResult
): Promise<ConventionAnalysis> {
  const startTime = Date.now();

  try {
    // Require parsed data from STEP_1.3
    if (!analysis.parsed) {
      throw new Error('Parsed data required for convention detection');
    }

    const { files: parsedFiles } = analysis.parsed;
    const { projectType } = analysis;

    // Sample 50 files (broader than patterns' 20 - conventions span codebase)
    const sampledFilePaths = await sampleFiles(rootPath, analysis, { maxFiles: 50 });

    // File naming uses sampledFilePaths (50 files) — only needs basenames, no AST
    const fileNamingNames = sampledFilePaths.map(p => basename(p).replace(/\.[^.]+$/, ''));
    const fileNaming = analyzeNamingConvention(fileNamingNames, projectType);
    // Function/class naming uses parsedFiles (tree-sitter AST needed)
    const functionNaming = analyzeFunctionNaming(parsedFiles, projectType);
    const classNaming = analyzeClassNaming(parsedFiles, projectType);

    // Variable and constant naming (async - uses tree-sitter queries)
    const variableNaming = await analyzeVariableNaming(parsedFiles, projectType, rootPath);
    const constantNaming = await analyzeConstantNaming(parsedFiles, projectType, rootPath);

    const naming = {
      files: fileNaming,
      functions: functionNaming,
      classes: classNaming,
      variables: variableNaming,
      constants: constantNaming,
    };

    // Detect project root and tsconfig aliases for import classification
    const projectRoot = await detectProjectRoot(rootPath, projectType);
    const tsconfigAlias = projectType === 'node' ? await parseTsconfigAlias(rootPath) : null;
    const aliasPatterns = tsconfigAlias ? [`${tsconfigAlias}*`] : undefined;

    // Analyze import conventions (uses parsed imports)
    const imports = analyzeImportConvention(
      parsedFiles.flatMap(f => f.imports),
      projectType,
      projectRoot,
      aliasPatterns
    );

    // Analyze type hints (Python only)
    let typeHints: ReturnType<typeof analyzeTypeHints> | undefined;
    if (projectType === 'python') {
      const allFunctions = parsedFiles.flatMap(f => f.functions);
      typeHints = analyzeTypeHints(allFunctions);
    }

    // Analyze docstrings (all languages)
    const allFunctions = parsedFiles.flatMap(f => f.functions);
    const docstrings = analyzeDocstrings(
      allFunctions.map(f => ({ name: f.name, docstring: (f as unknown as { docstring?: string }).docstring }))
    );

    // Analyze indentation (only first 10 files for efficiency)
    const indentSamplePaths = sampledFilePaths.slice(0, 10);
    const indentContents = await Promise.all(
      indentSamplePaths.map(path => readFile(join(rootPath, path)))
    );
    const indentation = await analyzeIndentation(indentContents, rootPath);

    // Combine into ConventionAnalysis
    const detectionTime = Date.now() - startTime;

    return {
      naming,
      imports,
      typeHints,
      docstrings,
      indentation,
      sampledFiles: sampledFilePaths.length,
      detectionTime,
    };
  } catch (_error) {
    // Graceful degradation - return empty conventions
    console.error('Convention detection failed:', _error);
    return createEmptyConventionAnalysis();
  }
}
