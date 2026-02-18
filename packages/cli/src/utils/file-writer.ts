/**
 * FileWriter - Cross-platform file operations utility
 *
 * Uses Node.js fs/promises for async operations.
 * All paths are normalized using path.join() for Windows/Mac/Linux compatibility.
 *
 * @example
 * const writer = new FileWriter();
 * await writer.createDir('/path/to/.ana');
 * await writer.writeFile('/path/to/.ana/node.json', '{}');
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface WriteFileOptions {
  encoding?: BufferEncoding;
  mode?: number;
}

export class FileWriter {
  /**
   * Check if a file or directory exists
   * @param filePath - Absolute or relative path to check
   * @returns true if exists, false otherwise
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create directory recursively (like mkdir -p)
   * @param dirPath - Directory path to create
   * @throws Error if creation fails (e.g., permission denied)
   */
  async createDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create directory '${dirPath}': ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Write content to file, creating parent directories if needed
   * @param filePath - Absolute path to file
   * @param content - Content to write
   * @param options - Optional encoding and mode settings
   * @throws Error if write fails
   */
  async writeFile(
    filePath: string,
    content: string,
    options: WriteFileOptions = {}
  ): Promise<void> {
    const { encoding = 'utf-8', mode = 0o644 } = options;

    try {
      // Ensure parent directory exists
      const dir = path.dirname(filePath);
      await this.createDir(dir);

      // Write file
      await fs.writeFile(filePath, content, { encoding, mode });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to write file '${filePath}': ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Read file content
   * @param filePath - Path to file
   * @returns File content as string
   * @throws Error if read fails
   */
  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read file '${filePath}': ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Remove directory recursively (like rm -rf)
   * @param dirPath - Directory to remove
   * @throws Error if removal fails
   */
  async removeDir(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to remove directory '${dirPath}': ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Join path segments using platform-specific separator
   * @param segments - Path segments to join
   * @returns Joined path
   */
  joinPath(...segments: string[]): string {
    return path.join(...segments);
  }

  /**
   * Get current working directory
   * @returns Current working directory path
   */
  getCwd(): string {
    return process.cwd();
  }
}

// Default instance for convenience
export const fileWriter = new FileWriter();
