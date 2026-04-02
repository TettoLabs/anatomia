/**
 * Ruby dependency parser (Gemfile)
 */

import * as path from 'node:path';
import { readFile, exists } from '../utils/file.js';

export function parseGemfile(content: string): string[] {
  const deps: string[] = [];

  // Match: gem 'package' or gem "package"
  // Fixed regex (no space in /g flag)
  const matches = content.matchAll(/gem\s+['"]([a-zA-Z0-9][\w-]*)['"]/g);
  for (const match of matches) {
    if (match[1]) {
      deps.push(match[1].toLowerCase());
    }
  }

  return Array.from(new Set(deps));
}

export async function readRubyDependencies(
  rootPath: string
): Promise<string[]> {
  const gemfilePath = path.join(rootPath, 'Gemfile');

  if (await exists(gemfilePath)) {
    const content = await readFile(gemfilePath);
    return parseGemfile(content);
  }

  return [];
}
