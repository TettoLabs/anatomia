/**
 * Main framework detector (dispatches to language-specific registries).
 *
 * Item 17: per-language detector order used to live here as hand-rolled
 * `if (x.framework) return x` chains, duplicating the priority chain that
 * was also implicit in each detector file's companion comment. The order
 * now lives in `detectors/node/framework-registry.ts` and
 * `detectors/python/framework-registry.ts` as an array of detector
 * references. Adding or reordering a detector is a single-file edit in
 * the registry; this file just iterates.
 *
 * Go and Rust don't need registries yet: each language has a SINGLE
 * detector function that handles all frameworks internally. When either
 * language grows to multiple detector files, add a similar registry.
 */

import type { ProjectType } from '../types/index.js';
import { readPythonDependencies } from '../parsers/python.js';
import { readNodeDependencies } from '../parsers/node.js';
import { readGoDependencies } from '../parsers/go.js';
import { readRustDependencies } from '../parsers/rust.js';

import { NODE_FRAMEWORK_DETECTORS } from './node/framework-registry.js';
import { PYTHON_FRAMEWORK_DETECTORS } from './python/framework-registry.js';
import { detectGoFramework } from './go.js';
import { detectRustFramework } from './rust.js';

export interface FrameworkResult {
  framework: string | null;
  confidence: number;
  indicators: string[];
}

/**
 * Detect framework for a project.
 *
 * Dispatches to the per-language registry (Node/Python) or the single
 * detector function (Go/Rust) based on project type.
 *
 * @param rootPath - Project root directory
 * @param projectType - Detected project type
 * @returns Framework detection result with confidence
 */
export async function detectFramework(
  rootPath: string,
  projectType: ProjectType
): Promise<FrameworkResult> {
  switch (projectType) {
    case 'python':
      return detectPythonFramework(rootPath);
    case 'node':
      return detectNodeFramework(rootPath);
    case 'go':
      return detectGoFrameworkFromProject(rootPath);
    case 'rust':
      return detectRustFrameworkFromProject(rootPath);
    default:
      return { framework: null, confidence: 0.0, indicators: [] };
  }
}

const NOT_FOUND: FrameworkResult = {
  framework: null,
  confidence: 0.0,
  indicators: [],
};

/**
 * @param rootPath
 */
async function detectPythonFramework(rootPath: string): Promise<FrameworkResult> {
  const deps = await readPythonDependencies(rootPath);
  for (const detect of PYTHON_FRAMEWORK_DETECTORS) {
    const result = await detect(rootPath, deps);
    if (result.framework) return result;
  }
  return NOT_FOUND;
}

/**
 * @param rootPath
 */
async function detectNodeFramework(rootPath: string): Promise<FrameworkResult> {
  const deps = await readNodeDependencies(rootPath);
  for (const detect of NODE_FRAMEWORK_DETECTORS) {
    const result = await detect(rootPath, deps);
    if (result.framework) return result;
  }
  return NOT_FOUND;
}

/**
 * @param rootPath
 */
async function detectGoFrameworkFromProject(rootPath: string): Promise<FrameworkResult> {
  const deps = await readGoDependencies(rootPath);
  return detectGoFramework(deps);
}

/**
 * @param rootPath
 */
async function detectRustFrameworkFromProject(rootPath: string): Promise<FrameworkResult> {
  const deps = await readRustDependencies(rootPath);
  return detectRustFramework(deps);
}
