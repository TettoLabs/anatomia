/**
 * Python dependency parser (all formats)
 *
 * Tries: requirements.txt, pyproject.toml, Pipfile
 * Returns: Combined dependencies from all found files
 */

import * as path from 'node:path';
import { readFile, exists } from '../utils/file.js';
import { parseRequirementsTxt } from './python/requirements.js';
import { parsePyprojectToml } from './python/pyproject.js';
import { parsePipfile } from './python/Pipfile.js';

/**
 * Read Python dependencies from all available formats
 *
 * Priority: requirements.txt, pyproject.toml, Pipfile
 * Combines all found dependencies
 */
export async function readPythonDependencies(
  rootPath: string
): Promise<string[]> {
  const deps = new Set<string>();

  // Try requirements.txt (most common)
  const reqPath = path.join(rootPath, 'requirements.txt');
  if (await exists(reqPath)) {
    try {
      const content = await readFile(reqPath);
      const reqDeps = parseRequirementsTxt(content);
      reqDeps.forEach((d) => deps.add(d));
    } catch (error) {
      // Corrupted file - continue to other formats
      console.warn(
        `Warning: Failed to parse requirements.txt: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  // Try pyproject.toml (modern standard)
  const pyprojectPath = path.join(rootPath, 'pyproject.toml');
  if (await exists(pyprojectPath)) {
    try {
      const content = await readFile(pyprojectPath);
      const tomlDeps = parsePyprojectToml(content);
      tomlDeps.forEach((d) => deps.add(d));
    } catch (error) {
      console.warn(
        `Warning: Failed to parse pyproject.toml: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  // Try Pipfile (Pipenv)
  const pipfilePath = path.join(rootPath, 'Pipfile');
  if (await exists(pipfilePath)) {
    try {
      const content = await readFile(pipfilePath);
      const pipDeps = parsePipfile(content);
      pipDeps.forEach((d) => deps.add(d));
    } catch (error) {
      console.warn(
        `Warning: Failed to parse Pipfile: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  return Array.from(deps);
}
