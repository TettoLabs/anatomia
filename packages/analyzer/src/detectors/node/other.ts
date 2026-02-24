/**
 * Other Node.js framework detectors (Fastify, Koa)
 */

import type { Detection } from '../python/fastapi.js';

/**
 * Detect simpler Node frameworks (Fastify, Koa)
 *
 * @param dependencies - Dependency list
 * @returns Detection result
 */
export async function detectOtherNodeFrameworks(
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

  return { framework: null, confidence: 0.0, indicators: [] };
}
