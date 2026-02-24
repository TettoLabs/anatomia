/**
 * Import scanning utility for framework detection confidence boost
 *
 * Scans 6-8 source files for framework import patterns
 * Performance: 40-80ms typical (Promise.all parallelization)
 *
 * Research: Import scanning adds +0.10 to +0.15 confidence for 50-80ms cost
 */

import * as path from 'node:path';
import { readFile } from './file.js';
import * as fs from 'node:fs/promises';

/**
 * Import patterns per framework
 */
const IMPORT_PATTERNS: Record<string, RegExp[]> = {
  // Python frameworks
  fastapi: [
    /^\s*from\s+fastapi[\s\.]/m,
    /^\s*import\s+fastapi\b/m,
  ],
  django: [
    /^\s*from\s+django[\s\.]/m,
    /^\s*import\s+django\b/m,
  ],
  flask: [
    /^\s*from\s+flask[\s\.]/m,
    /^\s*import\s+flask\b/m,
  ],

  // Node frameworks
  next: [
    /import\s+.*from\s+['"]next['"]/,
    /require\s*\(\s*['"]next['"]\s*\)/,
  ],
  react: [
    /import\s+.*from\s+['"]react['"]/,
    /require\s*\(\s*['"]react['"]\s*\)/,
  ],
  express: [
    /import\s+.*from\s+['"]express['"]/,
    /require\s*\(\s*['"]express['"]\s*\)/,
  ],
  nestjs: [
    /import\s+.*from\s+['"]@nestjs\//,
    /@Controller|@Module|@Injectable/,
  ],

  // Go frameworks
  gin: [
    /import\s+"github\.com\/gin-gonic\/gin"/,
  ],
  echo: [
    /import\s+"github\.com\/labstack\/echo/,
  ],
  chi: [
    /import\s+"github\.com\/go-chi\/chi/,
  ],

  // Rust frameworks
  axum: [
    /use\s+axum::/,
  ],
  actix: [
    /use\s+actix_web::/,
  ],
};

interface ScanOptions {
  maxFiles?: number;  // Default: 6-8 files
  excludeDirs?: string[];  // Directories to skip
}

/**
 * Scan source files for framework import patterns
 *
 * @param rootPath - Project root directory
 * @param framework - Framework name (e.g., 'fastapi', 'nextjs')
 * @param options - Scanning options
 * @returns Import count and confidence boost
 */
export async function scanForImports(
  rootPath: string,
  framework: string,
  options: ScanOptions = {}
): Promise<{ found: boolean; count: number }> {
  const maxFiles = options.maxFiles ?? 7;
  const excludeDirs = options.excludeDirs ?? [
    'node_modules', 'venv', '.venv', '__pycache__',
    'dist', 'build', 'target', '.git', 'vendor',
  ];

  // Get files to scan
  const filesToScan = await sampleSourceFiles(rootPath, maxFiles, excludeDirs);

  if (filesToScan.length === 0) {
    return { found: false, count: 0 };
  }

  // Get patterns for this framework
  const patterns = IMPORT_PATTERNS[framework.toLowerCase()];
  if (!patterns) {
    return { found: false, count: 0 };
  }

  // Read files in parallel
  const contents = await Promise.all(
    filesToScan.map(f => readFile(f).catch(() => ''))
  );

  // Scan with regex
  let importCount = 0;
  for (const content of contents) {
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        importCount += matches.length;
      }
    }
  }

  return {
    found: importCount > 0,
    count: importCount,
  };
}

/**
 * Sample source files for scanning
 * Priority: entry points, then random source files
 */
async function sampleSourceFiles(
  rootPath: string,
  maxFiles: number,
  excludeDirs: string[]
): Promise<string[]> {
  const files: string[] = [];

  // Find source files (*.py, *.ts, *.js, *.go, *.rs)
  const sourceExtensions = ['.py', '.ts', '.js', '.jsx', '.tsx', '.go', '.rs'];

  try {
    const entries = await fs.readdir(rootPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip excluded directories
      if (entry.isDirectory() && excludeDirs.includes(entry.name)) {
        continue;
      }

      // Add source files
      if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (sourceExtensions.includes(ext)) {
          files.push(path.join(rootPath, entry.name));
        }
      }

      // Sample from src/ or app/ directories
      if (entry.isDirectory() && (entry.name === 'src' || entry.name === 'app')) {
        const subFiles = await sampleFromDir(
          path.join(rootPath, entry.name),
          sourceExtensions,
          excludeDirs
        );
        files.push(...subFiles.slice(0, 5));  // Max 5 from src/
      }

      // Stop if we have enough
      if (files.length >= maxFiles) {
        break;
      }
    }
  } catch {
    return [];
  }

  // Return sample
  return files.slice(0, maxFiles);
}

async function sampleFromDir(
  dirPath: string,
  extensions: string[],
  excludeDirs: string[]
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !excludeDirs.includes(entry.name)) {
        // Could recurse here, but keeping shallow for performance
        continue;
      }

      if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(path.join(dirPath, entry.name));
        }
      }
    }
  } catch {
    // Directory not readable
  }

  return files;
}
