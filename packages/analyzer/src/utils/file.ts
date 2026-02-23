/**
 * File system utilities for analyzer
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Check if file or directory exists
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file content (UTF-8)
 * Returns empty string if file doesn't exist (graceful)
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Check if path is a directory
 */
export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Join path segments safely (cross-platform)
 */
export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}
