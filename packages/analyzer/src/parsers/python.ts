/**
 * Python dependency parser (all formats)
 *
 * Tries: requirements.txt, pyproject.toml, Pipfile
 * Returns: Combined dependencies from all found files
 * CP3: Added error handling with DetectionCollector
 */

import * as path from 'node:path';
import { readFile, exists } from '../utils/file.js';
import { parseRequirementsTxt } from './python/requirements.js';
import { parsePyprojectToml } from './python/pyproject.js';
import { parsePipfile } from './python/Pipfile.js';
import { DetectionEngineError, ERROR_CODES, type DetectionCollector } from '../errors/index.js';

/**
 * Read Python dependencies from all available formats
 *
 * Priority: requirements.txt, pyproject.toml, Pipfile
 * Combines all found dependencies
 */
export async function readPythonDependencies(
  rootPath: string,
  collector?: DetectionCollector
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
      collector?.addWarning(
        new DetectionEngineError(
          ERROR_CODES.PARSE_ERROR,
          'Failed to parse requirements.txt',
          'warning',
          {
            file: reqPath,
            suggestion: 'Validate syntax: pip-compile --dry-run requirements.txt',
            phase: 'dependency-parsing',
            cause: error as Error,
          }
        )
      );
      // Continue to other formats
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
      collector?.addWarning(
        new DetectionEngineError(
          ERROR_CODES.PARSE_ERROR,
          'Failed to parse pyproject.toml',
          'warning',
          {
            file: pyprojectPath,
            suggestion: 'Validate TOML syntax',
            phase: 'dependency-parsing',
            cause: error as Error,
          }
        )
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
      collector?.addWarning(
        new DetectionEngineError(
          ERROR_CODES.PARSE_ERROR,
          'Failed to parse Pipfile',
          'warning',
          {
            file: pipfilePath,
            suggestion: 'Validate Pipfile format with: pipenv check',
            phase: 'dependency-parsing',
            cause: error as Error,
          }
        )
      );
    }
  }

  // If no deps found, log info
  if (deps.size === 0) {
    collector?.addInfo(
      new DetectionEngineError(
        ERROR_CODES.NO_DEPENDENCIES,
        'No Python dependency files found',
        'info',
        {
          suggestion: 'Create requirements.txt: pip freeze > requirements.txt',
          phase: 'dependency-parsing',
        }
      )
    );
  }

  return Array.from(deps);
}
