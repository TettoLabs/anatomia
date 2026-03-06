import { describe, it, expect } from 'vitest';
import { performance } from 'node:perf_hooks';
import { analyze } from '../../src/index.js';
import { parseFile, detectLanguage } from '../../src/parsers/treeSitter.js';
import { sampleFiles } from '../../src/sampling/fileSampler.js';
import { ASTCache } from '../../src/cache/astCache.js';
import { joinPath } from '../../src/utils/file.js';

describe('Tree-sitter performance', () => {
  it('parses 20 files in ≤5 seconds', async () => {
    // Use actual project for realistic benchmark
    const projectRoot = process.cwd();
    const analysis = await analyze(projectRoot, { skipParsing: true });

    if (!analysis.structure) {
      console.log('⏭️  Skipping (no structure analysis available for current project)');
      return;
    }

    const files = await sampleFiles(projectRoot, analysis, { maxFiles: 20 });

    if (files.length === 0) {
      console.log('⏭️  Skipping (no parseable files found)');
      return;
    }

    const startTime = performance.now();

    for (const file of files) {
      const absolutePath = joinPath(projectRoot, file);
      const language = detectLanguage(absolutePath);
      if (language) {
        try {
          await parseFile(absolutePath, language);
        } catch {
          // Skip files that fail to parse
          continue;
        }
      }
    }

    const elapsed = performance.now() - startTime;

    console.log(`\n📊 Performance Benchmark:`);
    console.log(`   Files parsed: ${files.length}`);
    console.log(`   Total time: ${elapsed.toFixed(0)}ms`);
    console.log(`   Average: ${(elapsed / files.length).toFixed(1)}ms per file`);
    console.log(`   Target: ≤5000ms (5 seconds)`);
    console.log(`   Result: ${elapsed < 5000 ? '✅ PASS' : '❌ FAIL'}`);

    expect(elapsed).toBeLessThan(5000);  // Strict gate
  }, 10000);  // 10s timeout

  it('achieves ≥80% cache speedup on second run', async () => {
    const projectRoot = process.cwd();
    const cache = new ASTCache(projectRoot);

    // Clear cache for clean test
    await cache.clear();

    const analysis = await analyze(projectRoot, { skipParsing: true });
    if (!analysis.structure) {
      console.log('⏭️  Skipping (no structure)');
      return;
    }

    const files = await sampleFiles(projectRoot, analysis, { maxFiles: 20 });
    if (files.length === 0) {
      console.log('⏭️  Skipping (no files)');
      return;
    }

    // Run 1: Cold (no cache)
    const start1 = performance.now();
    for (const file of files) {
      const absolutePath = joinPath(projectRoot, file);
      const language = detectLanguage(absolutePath);
      if (language) {
        try {
          await parseFile(absolutePath, language, cache);
        } catch {
          continue;
        }
      }
    }
    const run1Time = performance.now() - start1;
    const stats1 = cache.getStats();

    // Run 2: Warm (with cache)
    const start2 = performance.now();
    for (const file of files) {
      const absolutePath = joinPath(projectRoot, file);
      const language = detectLanguage(absolutePath);
      if (language) {
        try {
          await parseFile(absolutePath, language, cache);
        } catch {
          continue;
        }
      }
    }
    const run2Time = performance.now() - start2;
    const stats2 = cache.getStats();

    const speedup = run1Time > 0 ? (run1Time - run2Time) / run1Time : 0;

    console.log(`\n📊 Cache Performance:`);
    console.log(`   Run 1 (cold): ${run1Time.toFixed(0)}ms - ${stats1.hits} hits, ${stats1.misses} misses`);
    console.log(`   Run 2 (warm): ${run2Time.toFixed(0)}ms - ${stats2.hits} hits, ${stats2.misses} misses`);
    console.log(`   Speedup: ${(speedup * 100).toFixed(1)}% (target: ≥80%)`);
    console.log(`   Result: ${speedup >= 0.80 ? '✅ PASS' : '❌ FAIL'}`);

    expect(speedup).toBeGreaterThanOrEqual(0.80);
  }, 15000);  // 15s timeout

  it('memory usage stays ≤500MB during parsing', async () => {
    const projectRoot = process.cwd();
    const analysis = await analyze(projectRoot, { skipParsing: true });
    if (!analysis.structure) {
      console.log('⏭️  Skipping (no structure)');
      return;
    }

    const files = await sampleFiles(projectRoot, analysis, { maxFiles: 20 });
    if (files.length === 0) {
      console.log('⏭️  Skipping (no files)');
      return;
    }

    // Force GC if available
    if (global.gc) global.gc();

    const memBefore = process.memoryUsage().heapUsed;

    // Parse all files
    for (const file of files) {
      const absolutePath = joinPath(projectRoot, file);
      const language = detectLanguage(absolutePath);
      if (language) {
        try {
          await parseFile(absolutePath, language);
        } catch {
          continue;
        }
      }
    }

    const memAfter = process.memoryUsage().heapUsed;
    const memUsedMB = (memAfter - memBefore) / 1024 / 1024;

    console.log(`\n📊 Memory Usage:`);
    console.log(`   Before: ${(memBefore / 1024 / 1024).toFixed(1)}MB`);
    console.log(`   After: ${(memAfter / 1024 / 1024).toFixed(1)}MB`);
    console.log(`   Used: ${memUsedMB.toFixed(1)}MB (target: ≤500MB)`);
    console.log(`   Result: ${memUsedMB < 500 ? '✅ PASS' : '❌ FAIL'}`);

    expect(memUsedMB).toBeLessThan(500);
  }, 10000);
});
