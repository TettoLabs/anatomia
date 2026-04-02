/**
 * Monorepo detection for 5 tools + fallback
 *
 * Tools: pnpm, Nx, Turborepo, Lerna, npm/yarn workspaces
 * Fallback: Recursive package.json discovery
 *
 * Research: Monorepo configurations agent findings
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { exists, readFile } from '../utils/file.js';
import { DetectionEngineError, ERROR_CODES } from '../errors/index.js';
import type { DetectionCollector } from '../errors/DetectionCollector.js';

export interface MonorepoResult {
  isMonorepo: boolean;
  tool: 'pnpm' | 'nx' | 'turbo' | 'lerna' | 'npm-workspaces' | 'none' | null;
  workspacePatterns?: string[]; // Glob patterns from config
  packages?: string[]; // Actual package directories (if discovered)
}

/**
 * Detect monorepo configuration
 *
 * Priority order:
 * 1. pnpm-workspace.yaml (pnpm)
 * 2. turbo.json (Turborepo)
 * 3. nx.json (Nx)
 * 4. lerna.json (Lerna)
 * 5. package.json workspaces (npm/yarn)
 * 6. Fallback: recursive package.json scan
 */
export async function detectMonorepo(
  rootPath: string,
  collector: DetectionCollector
): Promise<MonorepoResult> {
  // 1. Check pnpm-workspace.yaml
  const pnpmPath = path.join(rootPath, 'pnpm-workspace.yaml');
  if (await exists(pnpmPath)) {
    try {
      const content = await readFile(pnpmPath);
      const config = yaml.load(content) as { packages?: string[] };

      const patterns = config.packages || [];

      collector.addInfo(
        new DetectionEngineError(
          ERROR_CODES.MONOREPO_DETECTED,
          `pnpm monorepo detected (${patterns.length} workspace patterns)`,
          'info',
          { file: pnpmPath, phase: 'monorepo-detection' }
        )
      );

      return {
        isMonorepo: true,
        tool: 'pnpm',
        workspacePatterns: patterns,
      };
    } catch (error) {
      collector.addWarning(
        new DetectionEngineError(
          ERROR_CODES.INVALID_YAML,
          'Failed to parse pnpm-workspace.yaml',
          'warning',
          {
            file: pnpmPath,
            suggestion: 'Check YAML syntax with yamllint',
            phase: 'monorepo-detection',
            cause: error as Error,
          }
        )
      );
      // Continue to next detector
    }
  }

  // 2. Check turbo.json
  const turboPath = path.join(rootPath, 'turbo.json');
  if (await exists(turboPath)) {
    try {
      const content = await readFile(turboPath);
      const config = JSON.parse(content);

      // Turbo infers packages from pnpm/npm workspaces
      if (config.tasks || config.pipeline) {
        collector.addInfo(
          new DetectionEngineError(
            ERROR_CODES.MONOREPO_DETECTED,
            'Turborepo monorepo detected (infers packages from workspace config)',
            'info',
            { file: turboPath, phase: 'monorepo-detection' }
          )
        );

        return {
          isMonorepo: true,
          tool: 'turbo',
          // Turbo doesn't list packages explicitly
        };
      }
    } catch (error) {
      collector.addWarning(
        new DetectionEngineError(
          ERROR_CODES.INVALID_JSON,
          'Failed to parse turbo.json',
          'warning',
          {
            file: turboPath,
            suggestion: 'Validate JSON with jsonlint',
            phase: 'monorepo-detection',
            cause: error as Error,
          }
        )
      );
    }
  }

  // 3. Check nx.json
  const nxPath = path.join(rootPath, 'nx.json');
  if (await exists(nxPath)) {
    try {
      const content = await readFile(nxPath);
      const config = JSON.parse(content);

      // Nx infers projects automatically
      if (config.targetDefaults || config.generators) {
        collector.addInfo(
          new DetectionEngineError(
            ERROR_CODES.MONOREPO_DETECTED,
            'Nx monorepo detected (infers projects automatically)',
            'info',
            { file: nxPath, phase: 'monorepo-detection' }
          )
        );

        return {
          isMonorepo: true,
          tool: 'nx',
        };
      }
    } catch (error) {
      collector.addWarning(
        new DetectionEngineError(
          ERROR_CODES.INVALID_JSON,
          'Failed to parse nx.json',
          'warning',
          {
            file: nxPath,
            suggestion: 'Validate JSON with jsonlint',
            phase: 'monorepo-detection',
            cause: error as Error,
          }
        )
      );
    }
  }

  // 4. Check lerna.json
  const lernaPath = path.join(rootPath, 'lerna.json');
  if (await exists(lernaPath)) {
    try {
      const content = await readFile(lernaPath);
      const config = JSON.parse(content) as { packages?: string[] };

      const patterns = config.packages || ['packages/*'];

      collector.addInfo(
        new DetectionEngineError(
          ERROR_CODES.MONOREPO_DETECTED,
          `Lerna monorepo detected (${patterns.length} workspace patterns)`,
          'info',
          { file: lernaPath, phase: 'monorepo-detection' }
        )
      );

      return {
        isMonorepo: true,
        tool: 'lerna',
        workspacePatterns: patterns,
      };
    } catch (error) {
      collector.addWarning(
        new DetectionEngineError(
          ERROR_CODES.INVALID_JSON,
          'Failed to parse lerna.json',
          'warning',
          {
            file: lernaPath,
            suggestion: 'Validate JSON with jsonlint',
            phase: 'monorepo-detection',
            cause: error as Error,
          }
        )
      );
    }
  }

  // 5. Check package.json workspaces
  const packagePath = path.join(rootPath, 'package.json');
  if (await exists(packagePath)) {
    try {
      const content = await readFile(packagePath);
      const pkg = JSON.parse(content);

      if (pkg.workspaces) {
        const patterns = Array.isArray(pkg.workspaces)
          ? pkg.workspaces
          : pkg.workspaces.packages || [];

        collector.addInfo(
          new DetectionEngineError(
            ERROR_CODES.MONOREPO_DETECTED,
            `npm/yarn workspaces detected (${patterns.length} patterns)`,
            'info',
            { file: packagePath, phase: 'monorepo-detection' }
          )
        );

        return {
          isMonorepo: true,
          tool: 'npm-workspaces',
          workspacePatterns: patterns,
        };
      }
    } catch (error) {
      // Already handled by main detection, don't duplicate error
    }
  }

  // 6. Fallback: Recursive package.json discovery
  const discovered = await discoverPackages(rootPath, collector);
  if (discovered.length > 1) {
    collector.addInfo(
      new DetectionEngineError(
        ERROR_CODES.MONOREPO_DETECTED,
        `Multiple packages detected without tool (${discovered.length} packages)`,
        'info',
        {
          suggestion:
            'Consider using pnpm, Nx, or Turborepo for monorepo management',
          phase: 'monorepo-detection',
        }
      )
    );

    return {
      isMonorepo: true,
      tool: 'none',
      packages: discovered,
    };
  }

  return {
    isMonorepo: false,
    tool: null,
  };
}

/**
 * Discover packages via recursive scan (fallback)
 */
async function discoverPackages(
  rootPath: string,
  collector: DetectionCollector,
  depth: number = 0,
  maxDepth: number = 4,
  visited: Set<string> = new Set()
): Promise<string[]> {
  // Prevent infinite loops
  if (depth > maxDepth || visited.has(rootPath)) {
    return [];
  }
  visited.add(rootPath);

  const packages: string[] = [];

  try {
    const entries = await fs.readdir(rootPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip node_modules, .git, etc.
      if (shouldSkipDirectory(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        const entryPath = path.join(rootPath, entry.name);

        // Check if this directory has package.json
        if (await exists(path.join(entryPath, 'package.json'))) {
          packages.push(entryPath);
        }

        // Recurse into subdirectories
        const subPackages = await discoverPackages(
          entryPath,
          collector,
          depth + 1,
          maxDepth,
          visited
        );
        packages.push(...subPackages);
      }
    }
  } catch (error) {
    collector.addWarning(
      new DetectionEngineError(
        ERROR_CODES.PERMISSION_DENIED,
        `Cannot read directory: ${rootPath}`,
        'warning',
        {
          file: rootPath,
          suggestion: 'Check directory permissions',
          phase: 'package-discovery',
          cause: error as Error,
        }
      )
    );
  }

  return packages;
}

/**
 * Should skip directory during scanning
 */
function shouldSkipDirectory(name: string): boolean {
  const skipPatterns = [
    'node_modules',
    '.git',
    '.github',
    'venv',
    '.venv',
    '__pycache__',
    'dist',
    'build',
    'target',
    '.next',
    'vendor',
    'coverage',
    '.turbo',
    '.nx',
  ];

  return skipPatterns.includes(name) || name.startsWith('.');
}
