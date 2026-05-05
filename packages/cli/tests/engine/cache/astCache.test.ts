import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { writeFile, rm, mkdir, stat, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ASTCache } from '../../../src/engine/cache/astCache.js';
import type { ASTCacheEntry } from '../../../src/engine/cache/astCache.js';
import { ParserManager } from '../../../src/engine/parsers/treeSitter.js';
import { skipIfNoWasm } from '../fixtures.js';

const wasmAvailable = await skipIfNoWasm();

describe.skipIf(!wasmAvailable)('ASTCache', () => {
  let tempDir: string;
  let cache: ASTCache;
  let testFilePath: string;

  beforeAll(async () => {
    await ParserManager.getInstance().initialize();
  });

  beforeEach(async () => {
    // Create unique temp directory for each test, with .ana/ so disk caching is enabled
    tempDir = join(tmpdir(), `ana-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(join(tempDir, '.ana'), { recursive: true });

    // Create ASTCache instance
    cache = new ASTCache(tempDir);

    // Create a test file with real content
    testFilePath = join(tempDir, 'test.py');
    await writeFile(testFilePath, 'def hello():\n    print("Hello")\n', 'utf8');
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  });

  describe('Cache miss behavior', () => {
    it('get() returns null on cache miss (file not in cache)', async () => {
  
      // Given: Cache is empty
      const stats = cache.getStats();
      expect(stats.files).toBe(0);

      // When: Getting non-cached file
      const result = await cache.get(testFilePath);

      // Then: Returns null and increments misses
      expect(result).toBeNull();
      expect(cache.getStats().misses).toBe(1);
      expect(cache.getStats().hits).toBe(0);
    });
  });

  describe('Memory cache behavior', () => {
    it('set() stores data in memory cache', async () => {
  
      // Given: Cache entry data
      const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'hello', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        exports: [],
        decorators: [],
        parseTime: 42,
      };

      // When: Storing in cache
      await cache.set(testFilePath, cacheData);

      // Then: Memory cache contains the entry
      const stats = cache.getStats();
      expect(stats.files).toBe(1);
    });

    it('get() returns cached data on hit (memory cache)', async () => {
  
      // Given: Data stored in cache
      const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'hello', line: 1, async: false, decorators: [] }],
        classes: [{ name: 'World', line: 5, superclasses: [], methods: [], decorators: [] }],
        imports: [{ module: 'os', names: ['path'], line: 1 }],
        parseTime: 42,
      };
      await cache.set(testFilePath, cacheData);

      // When: Getting cached file
      const result = await cache.get(testFilePath);

      // Then: Returns cached data and increments hits
      expect(result).not.toBeNull();
      expect(result!.functions).toHaveLength(1);
      expect(result!.functions[0]!.name).toBe('hello');
      expect(result!.classes).toHaveLength(1);
      expect(result!.classes[0]!.name).toBe('World');
      expect(result!.imports).toHaveLength(1);
      expect(result!.imports[0]!.module).toBe('os');
      expect(result!.parseTime).toBe(42);
      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(0);
    });
  });

  describe('Disk cache behavior', () => {
    it('set() creates .ana/state/cache/ directory automatically', async () => {
  
      // Given: Cache directory doesn't exist
      const expectedCacheDir = join(tempDir, '.ana/state/cache');

      // When: Storing data
      const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [],
        classes: [],
        imports: [],
        parseTime: 10,
      };
      await cache.set(testFilePath, cacheData);

      // Then: Cache directory was created
      const dirStats = await stat(expectedCacheDir);
      expect(dirStats.isDirectory()).toBe(true);
    });

    it('disk cache persists across ASTCache instances', async () => {
  
      // Given: Data stored in first cache instance
      const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'persistent', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 50,
      };
      await cache.set(testFilePath, cacheData);

      // When: Creating new cache instance (simulates restart)
      const newCache = new ASTCache(tempDir);
      const result = await newCache.get(testFilePath);

      // Then: Data retrieved from disk cache
      expect(result).not.toBeNull();
      expect(result!.functions).toHaveLength(1);
      expect(result!.functions[0]!.name).toBe('persistent');
      expect(result!.parseTime).toBe(50);
      expect(newCache.getStats().hits).toBe(1);
    });

    it('memory cache checked before disk (faster)', async () => {
  
      // Given: Data stored in cache
      const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'test', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 30,
      };
      await cache.set(testFilePath, cacheData);

      // When: Getting from memory cache (first access)
      const firstResult = await cache.get(testFilePath);
      expect(firstResult).not.toBeNull();
      expect(cache.getStats().hits).toBe(1);

      // When: Getting again (should still use memory)
      const secondResult = await cache.get(testFilePath);
      expect(secondResult).not.toBeNull();
      expect(cache.getStats().hits).toBe(2);

      // Then: Both results are identical (same memory reference)
      expect(secondResult!.functions[0]!.name).toBe('test');
      expect(secondResult!.parseTime).toBe(30);
    });
  });

  describe('Cache statistics', () => {
    it('getStats() tracks hits and misses correctly', async () => {
  
      // Given: Initial stats
      let stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.files).toBe(0);

      // When: Cache miss
      await cache.get(testFilePath);
      stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);

      // When: Setting data
      const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'tracked', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 25,
      };
      await cache.set(testFilePath, cacheData);
      stats = cache.getStats();
      expect(stats.files).toBe(1);

      // When: Cache hit
      await cache.get(testFilePath);
      stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);

      // When: Another hit
      await cache.get(testFilePath);
      stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);

      // When: Cache miss on different file
      const otherFile = join(tempDir, 'other.py');
      await writeFile(otherFile, 'def other(): pass\n', 'utf8');
      await cache.get(otherFile);
      stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
    });
  });

  describe('Cache clearing', () => {
    it('clear() removes all cached data (memory + disk)', async () => {
  
      // Given: Multiple files cached
      const cacheData1: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'func1', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 20,
      };
      await cache.set(testFilePath, cacheData1);

      const testFile2 = join(tempDir, 'test2.py');
      await writeFile(testFile2, 'def world(): pass\n', 'utf8');
      const cacheData2: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'func2', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 15,
      };
      await cache.set(testFile2, cacheData2);

      // Verify cache has data
      await cache.get(testFilePath);
      let stats = cache.getStats();
      expect(stats.files).toBe(2);
      expect(stats.hits).toBe(1);

      // When: Clearing cache
      await cache.clear();

      // Then: Memory cache is empty
      stats = cache.getStats();
      expect(stats.files).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);

      // Then: Data no longer retrievable (cache miss)
      const result = await cache.get(testFilePath);
      expect(result).toBeNull();
      expect(cache.getStats().misses).toBe(1);

      // Then: Disk cache directory is removed
      const cacheDir = join(tempDir, '.ana/state/cache');
      try {
        await stat(cacheDir);
        // If we reach here, directory still exists (should not happen)
        expect.fail('Cache directory should not exist after clear()');
      } catch (error) {
        // Expected: directory doesn't exist
        expect(error).toBeDefined();
      }
    });
  });

  describe('mtime-based invalidation', () => {
    it('cache invalidates when file is modified', async () => {
  
      // Given: File cached
      const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'original', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 30,
      };
      await cache.set(testFilePath, cacheData);

      // Verify cache hit
      let result = await cache.get(testFilePath);
      expect(result).not.toBeNull();
      expect(result!.functions[0]!.name).toBe('original');
      expect(cache.getStats().hits).toBe(1);

      // When: File is modified (changing mtime)
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different mtime
      await writeFile(testFilePath, 'def modified():\n    print("Modified")\n', 'utf8');

      // Then: Cache miss (mtime mismatch)
      result = await cache.get(testFilePath);
      expect(result).toBeNull();
      expect(cache.getStats().misses).toBe(1);
    });
  });
});

describe.skipIf(!wasmAvailable)('ASTCache - invalidation scenarios', () => {
  let tempDir: string;
  let cache: ASTCache;
  let testFilePath: string;

  beforeAll(async () => {
    await ParserManager.getInstance().initialize();
  });

  beforeEach(async () => {
    // Create unique temp directory for each test, with .ana/ so disk caching is enabled
    tempDir = join(tmpdir(), `ana-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(join(tempDir, '.ana'), { recursive: true });

    // Create ASTCache instance
    cache = new ASTCache(tempDir);

    // Create a test file with real content
    testFilePath = join(tempDir, 'test.py');
    await writeFile(testFilePath, 'def hello():\n    print("Hello")\n', 'utf8');
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  });

  describe('File modification scenarios', () => {
    it('cache invalidated when file mtime changes (modify file, check null)', async () => {
  
      // Given: File cached with data
      const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'hello', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 25,
      };
      await cache.set(testFilePath, cacheData);

      // Verify cache hit
      let result = await cache.get(testFilePath);
      expect(result).not.toBeNull();
      expect(result!.functions[0]!.name).toBe('hello');

      // When: File modified (mtime changes)
      await new Promise(resolve => setTimeout(resolve, 10));
      await writeFile(testFilePath, 'def goodbye():\n    print("Goodbye")\n', 'utf8');

      // Then: Cache returns null (invalidated)
      result = await cache.get(testFilePath);
      expect(result).toBeNull();
      expect(cache.getStats().misses).toBe(1);
    });

    it('cache valid when mtime unchanged (multiple gets without modification)', async () => {
  
      // Given: File cached
      const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'stable', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 20,
      };
      await cache.set(testFilePath, cacheData);

      // When: Getting multiple times without modification
      const result1 = await cache.get(testFilePath);
      const result2 = await cache.get(testFilePath);
      const result3 = await cache.get(testFilePath);

      // Then: All return cached data (no invalidation)
      expect(result1).not.toBeNull();
      expect(result1!.functions[0]!.name).toBe('stable');
      expect(result2).not.toBeNull();
      expect(result2!.functions[0]!.name).toBe('stable');
      expect(result3).not.toBeNull();
      expect(result3!.functions[0]!.name).toBe('stable');

      // Stats show all hits, no misses
      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(0);
    });

    it('disk cache invalidated on mtime change (test across instances)', async () => {
  
      // Given: Data stored in first cache instance
      const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'original', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 30,
      };
      await cache.set(testFilePath, cacheData);

      // When: File modified
      await new Promise(resolve => setTimeout(resolve, 10));
      await writeFile(testFilePath, 'def updated():\n    print("Updated")\n', 'utf8');

      // When: New cache instance (simulates restart)
      const newCache = new ASTCache(tempDir);
      const result = await newCache.get(testFilePath);

      // Then: Disk cache also invalidated (mtime mismatch)
      expect(result).toBeNull();
      expect(newCache.getStats().misses).toBe(1);
    });
  });

  describe('Multiple files', () => {
    it('multiple files cached independently (3 files, each returns own data)', async () => {
  
      // Given: Three different files
      const file1 = join(tempDir, 'file1.py');
      const file2 = join(tempDir, 'file2.py');
      const file3 = join(tempDir, 'file3.py');

      await writeFile(file1, 'def func1(): pass\n', 'utf8');
      await writeFile(file2, 'def func2(): pass\n', 'utf8');
      await writeFile(file3, 'def func3(): pass\n', 'utf8');

      // When: Caching all three files
      await cache.set(file1, {
        functions: [{ name: 'func1', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 10,
      });
      await cache.set(file2, {
        functions: [{ name: 'func2', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 15,
      });
      await cache.set(file3, {
        functions: [{ name: 'func3', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 20,
      });

      // Then: Each file returns its own data
      const result1 = await cache.get(file1);
      const result2 = await cache.get(file2);
      const result3 = await cache.get(file3);

      expect(result1).not.toBeNull();
      expect(result1!.functions[0]!.name).toBe('func1');
      expect(result1!.parseTime).toBe(10);

      expect(result2).not.toBeNull();
      expect(result2!.functions[0]!.name).toBe('func2');
      expect(result2!.parseTime).toBe(15);

      expect(result3).not.toBeNull();
      expect(result3!.functions[0]!.name).toBe('func3');
      expect(result3!.parseTime).toBe(20);

      // Verify cache statistics
      expect(cache.getStats().files).toBe(3);
      expect(cache.getStats().hits).toBe(3);
    });
  });

  describe('Error handling', () => {
    it('cache handles missing files gracefully (delete file, get does not crash)', async () => {
  
      // Given: File cached
      const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'deleted', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 25,
      };
      await cache.set(testFilePath, cacheData);

      // When: File deleted
      await rm(testFilePath, { force: true });

      // Then: get() does not crash, returns null or throws
      await expect(cache.get(testFilePath)).rejects.toThrow();
    });

    it('cache handles corrupted JSON gracefully (corrupt disk cache, does not crash)', async () => {
  
      // Given: File cached normally
      const cacheData: Omit<ASTCacheEntry, 'mtimeMs' | 'cachedAt'> = {
        functions: [{ name: 'valid', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 30,
      };
      await cache.set(testFilePath, cacheData);

      // When: Corrupt the disk cache JSON file
      const cacheDir = join(tempDir, '.ana/state/cache');
      const files = await readdir(cacheDir);
      const cacheFile = join(cacheDir, files[0]!);
      await writeFile(cacheFile, 'CORRUPTED{invalid json', 'utf8');

      // When: New cache instance reads corrupted disk cache
      const newCache = new ASTCache(tempDir);
      const result = await newCache.get(testFilePath);

      // Then: Does not crash, returns null (cache miss)
      expect(result).toBeNull();
      expect(newCache.getStats().misses).toBe(1);
    });
  });

  describe('Cache key generation', () => {
    it('getCacheKey() generates unique keys (same filename, different directories)', async () => {
  
      // Given: Two files with same name in different directories
      const dir1 = join(tempDir, 'dir1');
      const dir2 = join(tempDir, 'dir2');
      await mkdir(dir1, { recursive: true });
      await mkdir(dir2, { recursive: true });

      const file1 = join(dir1, 'test.py');
      const file2 = join(dir2, 'test.py');

      await writeFile(file1, 'def func1(): pass\n', 'utf8');
      await writeFile(file2, 'def func2(): pass\n', 'utf8');

      // When: Caching both files
      await cache.set(file1, {
        functions: [{ name: 'func1', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 10,
      });
      await cache.set(file2, {
        functions: [{ name: 'func2', line: 1, async: false, decorators: [] }],
        classes: [],
        imports: [],
        parseTime: 15,
      });

      // Then: Each file returns correct data (no collision)
      const result1 = await cache.get(file1);
      const result2 = await cache.get(file2);

      expect(result1).not.toBeNull();
      expect(result1!.functions[0]!.name).toBe('func1');

      expect(result2).not.toBeNull();
      expect(result2!.functions[0]!.name).toBe('func2');

      // Both files cached independently
      expect(cache.getStats().files).toBe(2);
    });
  });

  describe('Integration with parseFile', () => {
    it('parseFile() uses cache correctly (parseMethod tree-sitter then cached)', async () => {
  
      // Import parseFile for integration test
      const { parseFile } = await import('../../../src/engine/parsers/treeSitter.js');

      // Given: First parse (cache miss)
      const result1 = await parseFile(testFilePath, 'python', cache);

      // Then: parseMethod is 'tree-sitter' (slow path)
      expect(result1.parseMethod).toBe('tree-sitter');
      expect(result1.functions).toHaveLength(1);
      expect(result1.functions[0]!.name).toBe('hello');

      // When: Second parse (cache hit)
      const result2 = await parseFile(testFilePath, 'python', cache);

      // Then: parseMethod is 'cached' (fast path)
      expect(result2.parseMethod).toBe('cached');
      expect(result2.functions).toHaveLength(1);
      expect(result2.functions[0]!.name).toBe('hello');

      // Cache statistics confirm hit
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });
});
