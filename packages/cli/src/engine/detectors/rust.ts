/**
 * Rust framework detection (Axum, Actix, Rocket, Clap)
 */

import type { Detection } from './python/fastapi.js';

/**
 * Detect Rust framework
 *
 * @param dependencies - Dependency list from Cargo.toml
 * @returns Detection result
 */
export async function detectRustFramework(
  dependencies: string[]
): Promise<Detection> {
  // Axum (check for Tokio/Tower ecosystem)
  if (dependencies.includes('axum')) {
    const hasTokio = dependencies.includes('tokio');
    const hasTower = dependencies.includes('tower');

    return {
      framework: 'axum',
      confidence: (hasTokio || hasTower) ? 0.95 : 0.85,
      indicators: [
        'axum in Cargo.toml',
        ...(hasTokio ? ['tokio async runtime'] : []),
        ...(hasTower ? ['tower middleware'] : []),
      ],
    };
  }

  // Actix Web
  if (dependencies.includes('actix-web')) {
    return {
      framework: 'actix-web',
      confidence: 0.90,
      indicators: ['actix-web in Cargo.toml'],
    };
  }

  // Rocket
  if (dependencies.includes('rocket')) {
    return {
      framework: 'rocket',
      confidence: 0.90,
      indicators: ['rocket in Cargo.toml'],
    };
  }

  // Clap CLI
  if (dependencies.includes('clap')) {
    return {
      framework: 'clap-cli',
      confidence: 0.80,
      indicators: ['clap in Cargo.toml (CLI framework)'],
    };
  }

  return { framework: null, confidence: 0.0, indicators: [] };
}
