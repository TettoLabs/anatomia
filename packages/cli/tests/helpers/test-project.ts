/**
 * Shared test utility: create a minimal .ana/ project structure.
 *
 * Sets up the minimum viable project that satisfies findProjectRoot()
 * and readArtifactBranch(). Tests that need additional fixtures (git
 * repos, proof chains, specific ana.json fields) add them after calling
 * this utility.
 *
 * Tests that intentionally verify behavior WITHOUT .ana/ (e.g., "should
 * error when not initialized") should NOT call this utility.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Create a minimal .ana/ directory with ana.json and .git/ in a temp dir.
 *
 * Includes .git/ because findProjectRoot() requires it for containment
 * (a directory with .ana/ but no .git/ is not treated as a project root).
 *
 * @param tempDir - Root of the test project (usually from fs.mkdtemp)
 */
export async function createTestProject(tempDir: string): Promise<void> {
  const anaDir = path.join(tempDir, '.ana');
  await fs.mkdir(anaDir, { recursive: true });
  await fs.writeFile(
    path.join(anaDir, 'ana.json'),
    JSON.stringify({
      anaVersion: '1.0.0',
      name: 'test-project',
      language: 'TypeScript',
      artifactBranch: 'main',
    }, null, 2)
  );
  // Create .git/ for findProjectRoot() containment check
  await fs.mkdir(path.join(tempDir, '.git'), { recursive: true });
}
