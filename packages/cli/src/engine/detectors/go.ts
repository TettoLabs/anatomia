/**
 * Go framework detection (Gin, Echo, Chi, Cobra, Fiber)
 *
 * Go frameworks are clean - full module paths, no ambiguity
 */

import type { Detection } from './python/fastapi.js';

/**
 * Detect Go framework
 *
 * @param dependencies - Dependency list from go.mod
 * @returns Detection result
 */
export async function detectGoFramework(
  dependencies: string[]
): Promise<Detection> {
  // Check in priority order (most common first)

  if (dependencies.includes('github.com/gin-gonic/gin')) {
    return {
      framework: 'gin',
      confidence: 0.90,
      indicators: ['gin-gonic/gin in go.mod'],
    };
  }

  if (dependencies.includes('github.com/labstack/echo')) {
    return {
      framework: 'echo',
      confidence: 0.90,
      indicators: ['labstack/echo in go.mod'],
    };
  }

  // Handle version suffixes (/v5)
  const chiDep = dependencies.find(d => d.startsWith('github.com/go-chi/chi'));
  if (chiDep) {
    return {
      framework: 'chi',
      confidence: 0.85,
      indicators: [`${chiDep} in go.mod`],
    };
  }

  if (dependencies.includes('github.com/spf13/cobra')) {
    return {
      framework: 'cobra-cli',
      confidence: 0.90,
      indicators: ['spf13/cobra in go.mod (CLI framework)'],
    };
  }

  const fiberDep = dependencies.find(d => d.startsWith('github.com/gofiber/fiber'));
  if (fiberDep) {
    return {
      framework: 'fiber',
      confidence: 0.90,
      indicators: [`${fiberDep} in go.mod`],
    };
  }

  return { framework: null, confidence: 0.0, indicators: [] };
}
