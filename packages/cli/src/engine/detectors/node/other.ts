/**
 * Other Node.js framework detectors (Fastify, Koa, Hono)
 *
 * Catch-all for dep-only framework detection where no filesystem probes
 * are needed. A framework graduates to its own file only when it needs
 * more than a dependency check (e.g., config file presence, entry point
 * inspection) — see detectReact / detectNextjs for that shape.
 */

import type { Detection } from '../python/fastapi.js';

/**
 * Detect simpler Node frameworks (Fastify, Koa, Hono)
 *
 * @param _rootPath - Project root (unused today; kept for signature uniformity
 *   with the other Node detectors in NODE_FRAMEWORK_DETECTORS so the registry
 *   can iterate them without per-detector dispatch wrappers — Item 17).
 * @param dependencies - Dependency list
 * @returns Detection result
 */
export async function detectOtherNodeFrameworks(
  _rootPath: string,
  dependencies: string[]
): Promise<Detection> {
  // Fastify
  if (dependencies.includes('fastify')) {
    return {
      framework: 'fastify',
      confidence: 0.85,
      indicators: ['fastify in dependencies'],
    };
  }

  // Koa
  if (dependencies.includes('koa')) {
    return {
      framework: 'koa',
      confidence: 0.85,
      indicators: ['koa in dependencies'],
    };
  }

  // Hono — lightweight web framework for edge runtimes (Cloudflare Workers,
  // Deno, Bun, Node). S19/SCAN-041.
  if (dependencies.includes('hono')) {
    return {
      framework: 'hono',
      confidence: 0.85,
      indicators: ['hono in dependencies'],
    };
  }

  return { framework: null, confidence: 0.0, indicators: [] };
}
