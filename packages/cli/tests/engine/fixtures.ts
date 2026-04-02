/**
 * Fixture loader utility for parser tests
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ParserManager } from '../../src/engine/parsers/treeSitter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if WASM tree-sitter parsers are available.
 * Call once at top of test file, use result to skip tests.
 */
let _wasmAvailable: boolean | null = null;

export async function isWasmAvailable(): Promise<boolean> {
  if (_wasmAvailable !== null) return _wasmAvailable;
  const manager = ParserManager.getInstance();
  _wasmAvailable = await manager.tryInitialize();
  return _wasmAvailable;
}

/**
 * Use in describe/beforeAll to skip entire suites when WASM is unavailable.
 * Example: const wasm = await skipIfNoWasm(); // returns false if skipped
 */
export async function skipIfNoWasm(): Promise<boolean> {
  const available = await isWasmAvailable();
  if (!available) {
    console.warn('Tree-sitter WASM unavailable — skipping WASM-dependent tests');
  }
  return available;
}

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
