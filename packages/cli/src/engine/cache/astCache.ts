/**
 * AST caching system for tree-sitter extraction
 *
 * Caches extracted code elements (functions, classes, imports) to avoid
 * reparsing unchanged files. Uses mtime-based invalidation.
 *
 * Performance: 80-90% speedup on second run (500ms → 50-100ms for 20 files)
 *
 * CRITICAL: Cache extracted DATA (JavaScript objects), NOT tree objects
 * (prevents memory leak from tree-sitter research)
 */

import { readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import type {
  FunctionInfo,
  ClassInfo,
  ImportInfo,
  ExportInfo,
  DecoratorInfo,
} from '../types/parsed.js';

/**
 * Cache entry schema
 *
 * Stores extracted data + metadata for cache invalidation.
 *
 * IMPORTANT: Does NOT store tree objects (memory leak risk)
 */
export interface ASTCacheEntry {
  mtimeMs: number;                    // File modification timestamp (invalidation key)
  functions: FunctionInfo[];          // Extracted functions
  classes: ClassInfo[];               // Extracted classes
  imports: ImportInfo[];              // Extracted imports
  exports?: ExportInfo[];             // TypeScript/JavaScript only
  decorators?: DecoratorInfo[];       // Python/TypeScript only
  parseTime: number;                  // Parse duration (for metrics)
  cachedAt: string;                   // ISO timestamp (debugging)
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;      // Cache hits (fast path)
  misses: number;    // Cache misses (slow path - had to parse)
  files: number;     // Files in memory cache
}

/**
 * AST cache with mtime-based invalidation
 *
 * Two-tier cache:
 * - Memory: Fast access (Map<filePath, entry>)
 * - Disk: Persistent across runs (JSON files in .ana/state/cache/)
 *
 * Invalidation: mtime-based (if file.mtimeMs !== cached.mtimeMs → reparse)
 *
 * Performance:
 * - Cache hit: 5-10ms (read JSON)
 * - Cache miss: 50-150ms (parse + extract)
 * - Speedup: 80-90% on second run
 *
 * @example
 * ```typescript
 * const cache = new ASTCache('/path/to/project');
 *
 * // First run (cache miss)
 * const entry = await cache.get('src/index.ts');  // null
 * // Parse file...
 * await cache.set('src/index.ts', { functions, classes, imports, parseTime });
 *
 * // Second run (cache hit)
 * const entry2 = await cache.get('src/index.ts');  // Returns cached data
 * ```
 */
export class ASTCache {
  private memoryCache = new Map<string, ASTCacheEntry>();
  private cacheDir: string;
  private diskEnabled: boolean;
  private stats = { hits: 0, misses: 0 };

  /** Static override for cache directory (used during init to write to temp) */
  private static cacheOverrideDir: string | null = null;

  /**
   * Set cache directory override
   *
   * Used during `ana init` to write cache to temp directory instead of
   * project root (avoids creating .ana/ before atomic rename).
   *
   * @param dir - Override directory, or null to reset
   */
  static setCacheDir(dir: string | null): void {
    ASTCache.cacheOverrideDir = dir;
  }

  /**
   * Create cache instance
   *
   * @param projectRoot - Absolute path to project root
   */
  constructor(projectRoot: string) {
    // Use override if set, otherwise default
    this.cacheDir = ASTCache.cacheOverrideDir || join(projectRoot, '.ana/state/cache');
    // Skip disk caching when .ana/ doesn't exist (funnel scan — no init yet).
    // Prevents standalone `ana scan` from creating .ana/state/cache/ as a side
    // effect, which poisons the isFunnel check in scan.ts.
    this.diskEnabled = !!ASTCache.cacheOverrideDir || existsSync(join(projectRoot, '.ana'));
  }

  /**
   * Get cached data for file
   *
   * Checks memory cache first (fast), then disk cache (slower), returns null on miss.
   * Validates mtime matches (invalidates if file changed).
   *
   * @param filePath - Absolute path to source file
   * @returns Cached entry or null if invalid/missing
   */
  async get(filePath: string): Promise<ASTCacheEntry | null> {
    // Check memory cache first
    if (this.memoryCache.has(filePath)) {
      const cached = this.memoryCache.get(filePath)!;
      const stats = await stat(filePath);

      if (cached.mtimeMs === stats.mtimeMs) {
        this.stats.hits++;
        return cached;  // Valid cache hit
      }

      // File changed, invalidate memory cache
      this.memoryCache.delete(filePath);
    }

    // Check disk cache
    const cacheKey = this.getCacheKey(filePath, await this.getMtime(filePath));
    const cachePath = join(this.cacheDir, `${cacheKey}.json`);

    try {
      const diskData = JSON.parse(await readFile(cachePath, 'utf8')) as ASTCacheEntry;
      const stats = await stat(filePath);

      if (diskData.mtimeMs === stats.mtimeMs) {
        // Restore to memory cache for next access
        this.memoryCache.set(filePath, diskData);
        this.stats.hits++;
        return diskData;
      }

      // Disk cache stale (file changed), will be overwritten on next set
    } catch {
      // Disk cache miss or corrupted
    }

    this.stats.misses++;
    return null;  // Cache miss - must parse
  }

  /**
   * Store extracted data in cache
   *
   * Stores in both memory (fast next access) and disk (persistent across runs).
   * Includes current mtime for invalidation.
   *
   * @param filePath - Absolute path to source file
   * @param data - Extracted data (without mtimeMs, cachedAt)
   */
  async set(
    filePath: string,
    data: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'>
  ): Promise<void> {
    const stats = await stat(filePath);
    const entry: ASTCacheEntry = {
      ...data,
      mtimeMs: stats.mtimeMs,
      cachedAt: new Date().toISOString(),
    };

    // Store in memory cache (always — valid for this session)
    this.memoryCache.set(filePath, entry);

    // Store on disk only when .ana/ exists or override is set (init).
    if (this.diskEnabled) {
      const cacheKey = this.getCacheKey(filePath, stats.mtimeMs);
      const cachePath = join(this.cacheDir, `${cacheKey}.json`);
      await mkdir(this.cacheDir, { recursive: true });
      await writeFile(cachePath, JSON.stringify(entry, null, 2));
    }
  }

  /**
   * Clear all cache (memory + disk)
   *
   * Useful for testing or manual cache invalidation.
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.stats = { hits: 0, misses: 0 };

    try {
      await rm(this.cacheDir, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist or can't be removed, OK
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Hits, misses, files in memory cache
   */
  getStats(): CacheStats {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      files: this.memoryCache.size,
    };
  }

  /**
   * Generate cache key from file path and mtime
   *
   * Pattern: {filename}_{mtime}.json
   * Example: main_py_1709654321000.json
   *
   * @param filePath - Absolute file path
   * @param mtime - Modification time (ms)
   * @returns Cache key string (safe for filename)
   */
  private getCacheKey(filePath: string, mtime: number): string {
    const filename = basename(filePath).replace(/\W/g, '_');  // Replace non-word chars
    return `${filename}_${mtime}`;
  }

  /**
   * Get file modification time
   *
   * @param filePath - Absolute file path
   * @returns Modification time in milliseconds
   */
  private async getMtime(filePath: string): Promise<number> {
    const stats = await stat(filePath);
    return stats.mtimeMs;
  }
}
