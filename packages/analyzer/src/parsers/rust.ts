/**
 * Rust dependency parser (Cargo.toml)
 */

import * as path from 'node:path';
import { readFile, exists } from '../utils/file.js';

export function parseCargoToml(content: string): string[] {
  const deps: string[] = [];

  // [dependencies] section
  const depsSection = content.match(/\[dependencies\]([\s\S]*?)(?=\[|$)/);
  if (depsSection && depsSection[1]) {
    const tableContent = depsSection[1];
    const matches = tableContent.matchAll(/^([a-zA-Z0-9][\w-]*)\s*=/gm);
    for (const match of matches) {
      if (match[1]) {
        deps.push(match[1].toLowerCase());
      }
    }
  }

  // [dev-dependencies] section
  const devSection = content.match(/\[dev-dependencies\]([\s\S]*?)(?=\[|$)/);
  if (devSection && devSection[1]) {
    const tableContent = devSection[1];
    const matches = tableContent.matchAll(/^([a-zA-Z0-9][\w-]*)\s*=/gm);
    for (const match of matches) {
      if (match[1]) {
        deps.push(match[1].toLowerCase());
      }
    }
  }

  return Array.from(new Set(deps));
}

export async function readRustDependencies(
  rootPath: string
): Promise<string[]> {
  const cargoPath = path.join(rootPath, 'Cargo.toml');

  if (await exists(cargoPath)) {
    const content = await readFile(cargoPath);
    return parseCargoToml(content);
  }

  return [];
}
