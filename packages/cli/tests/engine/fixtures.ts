/**
 * Fixture loader utility for parser tests
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load fixture file content
 */
export async function loadFixture(
  language: string,
  format: string,
  name: string
): Promise<string> {
  const fixturePath = path.join(
    __dirname,
    'fixtures',
    language,
    format,
    `${name}.txt`
  );

  try {
    return await fs.readFile(fixturePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to load fixture: ${fixturePath}`);
  }
}
