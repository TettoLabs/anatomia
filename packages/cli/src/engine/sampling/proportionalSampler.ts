/**
 * Proportional file sampler — Disease B cure.
 *
 * Replaces the alphabetical-50 flat sampler with source-root-weighted
 * allocation. Every source root gets representation proportional to its
 * file count, with a floor of 1 file per root (no source root invisible).
 *
 * Within each root: depth-first then alpha (shallow files first for
 * signal density, alpha for determinism).
 */

import { glob } from 'glob';
import * as path from 'node:path';
import type { ProjectCensus } from '../types/census.js';

const SOURCE_EXTENSIONS = '{ts,tsx,js,jsx,py,go,rs}';

const GLOB_IGNORE = [
  '**/node_modules/**',
  '**/vendor/**',
  '**/venv/**',
  '**/.venv/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.svelte-kit/**',
  '**/target/**',
  '**/__pycache__/**',
  '**/.pytest_cache/**',
  '**/coverage/**',
  '**/.ana/**',
  '**/.claude/**',
  '**/*.d.ts',
  '**/.git/**',
  '**/.turbo/**',
  '**/*.min.js',
  '**/*.bundle.js',
];

const TEST_PATTERNS = [
  '.test.',
  '.spec.',
  'test_',
  '_test.',
  '__tests__/',
];

function isTestFile(file: string): boolean {
  return TEST_PATTERNS.some(p => file.includes(p));
}

/** Sort by depth (shallow first), then alphabetically. */
function depthThenAlpha(a: string, b: string): number {
  const depthA = a.split('/').length;
  const depthB = b.split('/').length;
  if (depthA !== depthB) return depthA - depthB;
  return a.localeCompare(b);
}

/**
 * Sample files proportionally across source roots.
 *
 * @param census - Project census with source root info
 * @param budget - Maximum total files to sample (default: 500)
 * @returns Deterministic list of relative file paths
 */
export async function sampleFilesProportional(
  census: ProjectCensus,
  budget: number = 500,
): Promise<string[]> {
  const roots = census.sourceRoots.filter(r => r.fileCount > 0);
  if (roots.length === 0) {
    // Fallback: glob from rootPath if no source roots have files
    return globFromDir(census.rootPath, census.rootPath, budget);
  }

  const totalFiles = roots.reduce((sum, r) => sum + r.fileCount, 0);
  if (totalFiles === 0) return [];

  // Allocate budget proportionally with floor of 1 per root
  const allocations: Array<{ root: typeof roots[0]; allocation: number }> = [];
  let remaining = budget;

  // First pass: assign floor of 1 to each root
  for (const root of roots) {
    allocations.push({ root, allocation: 1 });
    remaining--;
  }

  // Second pass: distribute remaining proportionally
  if (remaining > 0) {
    let distributed = 0;
    for (const entry of allocations) {
      const proportion = entry.root.fileCount / totalFiles;
      const extra = Math.floor(proportion * remaining);
      entry.allocation += extra;
      distributed += extra;
    }
    // Assign leftover to the largest root (rounding residual)
    const leftover = remaining - distributed;
    if (leftover > 0) {
      const largest = allocations.reduce((a, b) =>
        a.root.fileCount > b.root.fileCount ? a : b
      );
      largest.allocation += leftover;
    }
  }

  // Glob and sample from each root
  const allFiles: string[] = [];
  for (const { root, allocation } of allocations) {
    const files = await globFromDir(root.absolutePath, census.rootPath, allocation);
    allFiles.push(...files);
  }

  // Final trim to budget (in case of rounding overshoot)
  return allFiles.slice(0, budget);
}

async function globFromDir(
  dir: string,
  rootPath: string,
  limit: number,
): Promise<string[]> {
  try {
    const pattern = `**/*.${SOURCE_EXTENSIONS}`;
    const matches = await glob(pattern, {
      cwd: dir,
      absolute: false,
      ignore: GLOB_IGNORE,
    });

    const nonTest = matches.filter(f => !isTestFile(f));
    const sorted = nonTest.sort(depthThenAlpha);
    const sampled = sorted.slice(0, limit);

    // Convert to rootPath-relative paths
    const relDir = path.relative(rootPath, dir);
    return sampled.map(f => (relDir ? path.join(relDir, f) : f).replace(/\\/g, '/'));
  } catch {
    return [];
  }
}
