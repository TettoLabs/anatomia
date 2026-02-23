/**
 * PHP dependency parser (composer.json)
 */

import * as path from 'node:path';
import { readFile, exists } from '../utils/file.js';

export function parseComposerJson(content: string): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const composer = JSON.parse(content);

    if (!composer || typeof composer !== 'object') {
      return [];
    }

    const deps = new Set<string>();

    if (
      composer.require &&
      typeof composer.require === 'object' &&
      !Array.isArray(composer.require)
    ) {
      Object.keys(composer.require).forEach((d) => {
        // Filter out PHP version and extensions
        if (d !== 'php' && !d.startsWith('ext-') && !d.startsWith('lib-')) {
          deps.add(d.toLowerCase());
        }
      });
    }

    if (
      composer['require-dev'] &&
      typeof composer['require-dev'] === 'object' &&
      !Array.isArray(composer['require-dev'])
    ) {
      Object.keys(composer['require-dev']).forEach((d) =>
        deps.add(d.toLowerCase())
      );
    }

    return Array.from(deps);
  } catch {
    return [];
  }
}

export async function readPhpDependencies(rootPath: string): Promise<string[]> {
  const composerPath = path.join(rootPath, 'composer.json');

  if (await exists(composerPath)) {
    const content = await readFile(composerPath);
    return parseComposerJson(content);
  }

  return [];
}
