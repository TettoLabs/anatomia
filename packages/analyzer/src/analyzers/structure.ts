/**
 * Structure analysis for Anatomia
 *
 * Analyzes project directory structure to detect:
 * - Entry points (where execution starts)
 * - Test locations (where tests live)
 * - Architecture pattern (layered, domain-driven, microservices, etc.)
 * - Directory tree (ASCII representation)
 *
 * Implementation status:
 * - CP0: Interfaces and placeholders ✓
 * - CP1: Entry point detection (planned)
 * - CP2: Architecture classification (planned)
 * - CP3: Test location + integration (planned)
 */

import type { ProjectType } from '../types/index.js';
import type {
  StructureAnalysis,
  EntryPointResult,
  ArchitectureResult,
  TestLocationResult,
} from '../types/structure.js';
import { createEmptyStructureAnalysis } from '../types/structure.js';

/**
 * Analyze project directory structure
 *
 * @param rootPath - Absolute path to project root
 * @param projectType - Detected project type (from STEP_1.1)
 * @param framework - Detected framework (from STEP_1.1, can be null)
 * @returns Complete structure analysis
 *
 * Implementation: CP3 (currently placeholder)
 */
export async function analyzeStructure(
  rootPath: string,
  projectType: ProjectType,
  framework: string | null
): Promise<StructureAnalysis> {
  // TODO: CP3 - Implement orchestrator that calls all functions below
  return createEmptyStructureAnalysis();
}

/**
 * Find entry points (where code execution starts)
 *
 * Uses framework-aware priority lists and package.json "main" field.
 *
 * @param rootPath - Absolute path to project root
 * @param projectType - Project type (python, node, go, rust)
 * @param framework - Framework (can be null)
 * @returns Entry point detection result
 *
 * @example
 * ```typescript
 * const result = await findEntryPoints('/path', 'python', 'django');
 * // → { entryPoints: ['manage.py'], confidence: 1.0, source: 'framework-convention' }
 * ```
 *
 * Implementation: CP1
 */
export async function findEntryPoints(
  rootPath: string,
  projectType: ProjectType,
  framework: string | null
): Promise<EntryPointResult> {
  // TODO: CP1 - Implement entry point detection
  return {
    entryPoints: [],
    confidence: 0.0,
    source: 'not-found',
  };
}

/**
 * Classify project architecture pattern
 *
 * Uses directory structure heuristics to identify:
 * - Layered (models/, services/, api/)
 * - Domain-driven (features/*, modules/*)
 * - Microservices (apps/*, services/*, cmd/* with ≥2)
 * - Monolith (default/fallback)
 * - Library (no entry point)
 *
 * @param directories - List of directories in project
 * @param entryPoints - Detected entry points (empty for libraries)
 * @param framework - Framework (affects classification - NestJS modules/ = DDD)
 * @returns Architecture classification result
 *
 * Implementation: CP2
 */
export function classifyArchitecture(
  directories: string[],
  entryPoints: string[],
  framework: string | null
): ArchitectureResult {
  // TODO: CP2 - Implement architecture classification
  return {
    architecture: 'monolith',
    confidence: 0.70,
    indicators: [],
  };
}

/**
 * Find test locations (where tests live)
 *
 * Detects test framework and locations using:
 * - pytest: tests/ directory + test_*.py pattern
 * - Jest/Vitest: __tests__/ or *.test.ts pattern
 * - go test: *_test.go colocated with source
 *
 * @param rootPath - Absolute path to project root
 * @param projectType - Project type
 * @param framework - Framework (null if unknown)
 * @returns Test location detection result
 *
 * Implementation: CP3
 */
export async function findTestLocations(
  rootPath: string,
  projectType: ProjectType,
  framework: string | null
): Promise<TestLocationResult> {
  // TODO: CP3 - Implement test location detection
  return {
    testLocations: [],
    confidence: 0.0,
    framework: 'unknown',
  };
}

/**
 * Build ASCII directory tree
 *
 * Generates clean tree representation for context files.
 *
 * @param rootPath - Absolute path to project root
 * @param maxDepth - Maximum depth (default: 4 levels)
 * @param maxDirs - Maximum directories to show (default: 40)
 * @returns ASCII tree string (max 50 lines)
 *
 * Implementation: CP2
 */
export async function buildAsciiTree(
  rootPath: string,
  maxDepth: number = 4,
  maxDirs: number = 40
): Promise<string> {
  // TODO: CP2 - Implement ASCII tree generation
  return '';
}

/**
 * Find config files (.env, tsconfig.json, settings.py, etc.)
 *
 * @param rootPath - Absolute path to project root
 * @param projectType - Project type (affects which configs to look for)
 * @returns Array of config file paths found
 *
 * Implementation: CP3
 */
export async function findConfigFiles(
  rootPath: string,
  projectType: ProjectType
): Promise<string[]> {
  // TODO: CP3 - Implement config file detection
  return [];
}
