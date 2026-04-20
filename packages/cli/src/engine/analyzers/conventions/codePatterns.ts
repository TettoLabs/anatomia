/**
 * Code pattern signal detection.
 *
 * Grep-based characterization of coding patterns for contradiction detection.
 * Each signal is a count/ratio that tells the setup agent whether a template
 * rule matches the project's actual patterns.
 *
 * Receives the same sampled file paths as the conventions analyzer —
 * near-zero additional I/O.
 */

import type { CodePatterns } from '../../types/conventions.js';

/**
 * Built-in Node modules that can be imported with or without the node: prefix.
 */
const NODE_BUILTINS = new Set([
  'fs', 'path', 'os', 'child_process', 'crypto', 'http', 'https', 'net',
  'stream', 'url', 'util', 'events', 'buffer', 'assert', 'readline',
  'worker_threads', 'cluster', 'dns', 'tls', 'zlib', 'querystring',
  'string_decoder', 'timers', 'console', 'process', 'perf_hooks',
  'async_hooks', 'diagnostics_channel', 'inspector', 'vm', 'v8',
  'fs/promises', 'timers/promises', 'stream/promises', 'readline/promises',
]);

/**
 * Analyze code patterns from sampled file contents.
 *
 * @param fileContents - Array of { path, content } for sampled src files
 * @returns Code pattern signals
 */
export function analyzeCodePatterns(
  fileContents: Array<{ path: string; content: string }>
): CodePatterns {
  // Filter to src files only (exclude test files for catch block analysis)
  const srcFiles = fileContents.filter(f =>
    !f.path.includes('.test.') && !f.path.includes('.spec.') &&
    !f.path.includes('__tests__') && !f.path.includes('/test/')
  );
  const allFiles = fileContents;

  return {
    jsExtensionImports: detectJsExtensions(allFiles),
    nodePrefix: detectNodePrefix(allFiles),
    emptyCatches: detectEmptyCatches(srcFiles),
    defaultExports: detectDefaultExports(allFiles),
    nullStyle: detectNullStyle(allFiles),
  };
}

/**
 * Detect .js extension usage on local imports.
 * Only counts relative imports (./  ../) — not package imports.
 */
function detectJsExtensions(files: Array<{ content: string }>): CodePatterns['jsExtensionImports'] {
  let withJs = 0;
  let totalLocal = 0;

  for (const file of files) {
    // Match local import specifiers (from './...' or require('./...'))
    const localImports = file.content.matchAll(
      /(?:from\s+|require\s*\(\s*)['"](\.[^'"]+)['"]/g
    );
    for (const match of localImports) {
      const specifier = match[1];
      if (!specifier) continue;
      totalLocal++;
      if (specifier.endsWith('.js') || specifier.endsWith('.jsx') ||
          specifier.endsWith('.ts') || specifier.endsWith('.tsx')) {
        withJs++;
      }
    }
  }

  if (totalLocal === 0) return undefined;
  return { count: withJs, total: totalLocal, ratio: withJs / totalLocal };
}

/**
 * Detect node: prefix usage on built-in imports.
 */
function detectNodePrefix(files: Array<{ content: string }>): CodePatterns['nodePrefix'] {
  let withPrefix = 0;
  let totalBuiltin = 0;

  for (const file of files) {
    // Match imports of builtins — with or without node: prefix
    const imports = file.content.matchAll(
      /(?:from|require\()\s*['"](node:)?([a-z_/]+)['"]/g
    );
    for (const match of imports) {
      const hasPrefix = !!match[1];
      const moduleName = match[2];
      if (!moduleName || !NODE_BUILTINS.has(moduleName)) continue;
      totalBuiltin++;
      if (hasPrefix) withPrefix++;
    }
  }

  if (totalBuiltin === 0) return undefined;
  return { count: withPrefix, total: totalBuiltin, ratio: withPrefix / totalBuiltin };
}

/**
 * Detect empty catch blocks. Differentiates truly empty from commented.
 * Only analyzes src files (not tests — empty catches in tests are often intentional).
 */
function detectEmptyCatches(srcFiles: Array<{ content: string }>): CodePatterns['emptyCatches'] {
  let empty = 0;
  let commented = 0;
  let total = 0;

  for (const file of srcFiles) {
    // Match catch blocks — capture the body between { }
    const catches = file.content.matchAll(
      /catch\s*(?:\([^)]*\))?\s*\{([^}]*)\}/g
    );
    for (const match of catches) {
      total++;
      const body = (match[1] ?? '').trim();
      if (body === '') {
        empty++;
      } else if (/^\s*(\/\/|\/\*).*/s.test(body) && body.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '').trim() === '') {
        // Body contains only comments
        commented++;
      }
    }
  }

  return { empty, commented, total };
}

/**
 * Detect default export usage.
 */
function detectDefaultExports(files: Array<{ content: string }>): CodePatterns['defaultExports'] {
  let count = 0;
  for (const file of files) {
    if (/export\s+default\b/.test(file.content)) {
      count++;
    }
  }
  return { count, totalFiles: files.length };
}

/**
 * Detect null vs undefined preference from type annotations.
 */
function detectNullStyle(files: Array<{ content: string }>): CodePatterns['nullStyle'] {
  let nullCount = 0;
  let optionalCount = 0;

  for (const file of files) {
    // Count `| null` in type positions
    const nullMatches = file.content.match(/\|\s*null\b/g);
    if (nullMatches) nullCount += nullMatches.length;

    // Count `?:` optional property markers
    const optionalMatches = file.content.match(/\w\s*\?:/g);
    if (optionalMatches) optionalCount += optionalMatches.length;
  }

  let preference: 'null' | 'undefined' | 'mixed' = 'mixed';
  const total = nullCount + optionalCount;
  if (total > 0) {
    if (nullCount / total > 0.7) preference = 'null';
    else if (optionalCount / total > 0.7) preference = 'undefined';
  }

  return { nullCount, optionalCount, preference };
}
