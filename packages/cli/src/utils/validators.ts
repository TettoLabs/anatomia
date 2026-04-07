/**
 * Validation utilities for ana setup complete
 *
 * Provides helper functions for:
 * - Counting detected patterns in snapshot
 * - Extracting section headers from markdown
 * - Getting project name from config files
 * - Framework extraction from content
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { EngineResult } from '../engine/types/engineResult.js';
import {
  SCAFFOLD_MARKER,
  MIN_FILE_SIZE_WARNING,
  MAX_FILE_SIZE_WARNING,
  REQUIRED_CONTEXT_FILES,
} from '../constants.js';

/** Validation error type */
export interface ValidationError {
  type: 'BLOCKING' | 'WARNING';
  rule: string;
  file: string;
  message: string;
}

/**
 * Count how many patterns analyzer detected
 *
 * Used for BF5 validation (patterns.md must document all detected patterns)
 *
 * @param analysis - EngineResult from snapshot.json
 * @returns Number of non-null pattern categories (0-5)
 *
 * @example
 * const snapshot = { patterns: { errorHandling: {...}, validation: {...} } };
 * countDetectedPatterns(snapshot); // Returns: 2
 */
export function countDetectedPatterns(analysis: EngineResult): number {
  // Scenario B guard: analyzer may return null/undefined when tree-sitter fails
  if (!analysis || !analysis.patterns) {
    return 0;
  }

  let count = 0;
  if (analysis.patterns.errorHandling) count++;
  if (analysis.patterns.validation) count++;
  if (analysis.patterns.database) count++;
  if (analysis.patterns.auth) count++;
  if (analysis.patterns.testing) count++;

  return count;
}

/**
 * Extract documented pattern section names from patterns.md
 *
 * Used for BF5 validation (compare documented vs detected)
 *
 * @param content - patterns.md file content
 * @returns Array of pattern section names (Error Handling, Validation, etc.)
 *
 * @example
 * const content = "## Error Handling\n\n## Validation\n\n## Framework Patterns";
 * getDocumentedPatternSections(content); // Returns: ['Error Handling', 'Validation']
 */
export function getDocumentedPatternSections(content: string): string[] {
  const headers = content.match(/^## (.+)$/gm) || [];
  return headers
    .map((h) => h.replace('## ', '').trim())
    .filter((h) => h !== 'Framework Patterns'); // Exclude meta-section
}

/**
 * Get missing patterns (detected but not documented)
 *
 * @param analysis - EngineResult from snapshot
 * @param documented - Section names from patterns.md
 * @returns Array of pattern category names that are missing
 */
export function getMissingPatterns(
  analysis: EngineResult,
  documented: string[]
): string[] {
  // Scenario B guard: analyzer may return null/undefined when tree-sitter fails
  if (!analysis || !analysis.patterns) {
    return [];
  }

  const categoryMap: Record<string, string> = {
    errorHandling: 'Error Handling',
    validation: 'Validation',
    database: 'Database',
    auth: 'Authentication',
    testing: 'Testing',
  };

  const missing: string[] = [];
  const categories = ['errorHandling', 'validation', 'database', 'auth', 'testing'] as const;

  for (const cat of categories) {
    if (analysis.patterns[cat]) {
      const sectionName = categoryMap[cat];
      if (!documented.includes(sectionName)) {
        missing.push(sectionName);
      }
    }
  }

  return missing;
}

/**
 * Extract framework name from project-overview.md content
 *
 * Used for BF6 validation (framework consistency check)
 *
 * @param content - project-overview.md file content
 * @returns Framework name or null if not found
 *
 * @example
 * const content = "**Framework:** FastAPI\n";
 * extractFrameworkFromContent(content); // Returns: 'fastapi'
 */
export function extractFrameworkFromContent(content: string): string | null {
  // Match: **Framework:** [name]
  const match = content.match(/\*\*Framework:\*\*\s+([^\n]+)/);
  if (!match || !match[1]) {
    return null;
  }

  const framework = match[1].trim();

  // Normalize: "None detected", "None", "none" → null
  // Scenario B: analyzer may return framework: "none" as a string
  const frameworkLower = framework.toLowerCase();
  if (framework === 'None detected' || framework === 'None' || frameworkLower === 'none') {
    return null;
  }

  // Normalize for comparison: lowercase, strip spaces/dots/dashes, strip parentheticals
  // "Next.js (App Router)" → "nextjs", "FastAPI" → "fastapi"
  return framework
    .toLowerCase()
    .replace(/[.\s-]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim();
}

/**
 * Get project name from config files with priority fallback
 *
 * Priority:
 * 1. package.json → name field (Node)
 * 2. pyproject.toml → [project] name (Python)
 * 3. go.mod → module basename (Go)
 * 4. Directory name (fallback)
 *
 * @param rootPath - Project root directory
 * @returns Project name
 */
export async function getProjectName(rootPath: string): Promise<string> {
  // Try package.json
  const pkgPath = path.join(rootPath, 'package.json');
  try {
    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    if (pkg.name && typeof pkg.name === 'string') {
      // Handle scoped packages (@scope/name) - keep full name
      return pkg.name;
    }
  } catch {
    // File doesn't exist or invalid JSON - try next source
  }

  // Try pyproject.toml
  const pyprojectPath = path.join(rootPath, 'pyproject.toml');
  try {
    const content = await fs.readFile(pyprojectPath, 'utf-8');
    // Match: [project]\nname = "package-name"
    const match = content.match(/\[project\][\s\S]*?name\s*=\s*"([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }
  } catch {
    // Try next source
  }

  // Try go.mod
  const goModPath = path.join(rootPath, 'go.mod');
  try {
    const content = await fs.readFile(goModPath, 'utf-8');
    // Match: module github.com/user/package-name
    const match = content.match(/module\s+([^\s]+)/);
    if (match && match[1]) {
      // Extract basename from module path
      const modulePath = match[1];
      return path.basename(modulePath);
    }
  } catch {
    // Fallback to directory name
  }

  // Fallback: Use directory name
  return path.basename(rootPath);
}

/**
 * Check if file exists
 *
 * @param filePath - Path to file
 * @returns true if file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// inferSetupModeFromQuality() REMOVED - executive decision: no inference
// Priority: CLI --mode flag → .setup_tier file → existing ana.json setupMode → error

/**
 * Validate structural requirements (BF1, BF2, BF3)
 *
 * Checks:
 * - BF1: No scaffold markers remaining
 * - BF2: All required files exist
 * - BF3: No empty files
 *
 * @param anaPath - Path to .ana/ directory
 * @returns Array of blocking errors (empty if valid)
 */
export async function validateStructure(anaPath: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  const requiredFiles = REQUIRED_CONTEXT_FILES;

  // Pre-check: Detect if setup not run yet (all files still scaffolded)
  let scaffoldCount = 0;
  for (const file of requiredFiles) {
    const filePath = path.join(anaPath, file);
    if (await fileExists(filePath)) {
      const content = await fs.readFile(filePath, 'utf-8');
      if (content.includes(SCAFFOLD_MARKER)) {
        scaffoldCount++;
      }
    }
  }

  // If ALL files have scaffold markers, setup hasn't been run
  if (scaffoldCount === requiredFiles.length) {
    return [
      {
        type: 'BLOCKING',
        rule: 'BF1',
        file: 'all',
        message:
          'Setup not yet run. All context files still have scaffold markers.\n' +
          '       Run `claude --agent ana-setup` first.',
      },
    ];
  }

  // Per-file validation
  for (const file of requiredFiles) {
    const filePath = path.join(anaPath, file);

    // BF2: Check file exists
    if (!(await fileExists(filePath))) {
      errors.push({
        type: 'BLOCKING',
        rule: 'BF2',
        file,
        message: `Required context file missing: ${file}`,
      });
      continue; // Can't check content if file doesn't exist
    }

    const content = await fs.readFile(filePath, 'utf-8');

    // BF1: Check scaffold marker removed
    // Strip fenced code blocks first to avoid false positives from code citations
    // (e.g., test files that check for the scaffold marker string)
    const contentWithoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
    if (contentWithoutCodeBlocks.includes(SCAFFOLD_MARKER)) {
      errors.push({
        type: 'BLOCKING',
        rule: 'BF1',
        file,
        message: `${file} still has scaffold marker. Setup not completed.`,
      });
    }

    // BF3: Check not empty
    const cleaned = content.replace(/<!-- SCAFFOLD.*?-->\n?/g, '').trim();
    if (cleaned.length === 0) {
      errors.push({
        type: 'BLOCKING',
        rule: 'BF3',
        file,
        message: `${file} is empty. No content written.`,
      });
    }
  }

  return errors;
}

/**
 * Validate content requirements (BF4)
 *
 * Checks project-context.md has required sections (D6.6 format).
 *
 * @param anaPath - Path to .ana/ directory
 * @returns Array of blocking errors (empty if valid)
 */
export async function validateContent(anaPath: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  const contextPath = path.join(anaPath, 'context/project-context.md');

  try {
    const content = await fs.readFile(contextPath, 'utf-8');

    // BF4: Check project context header
    if (!content.includes('# Project Context')) {
      errors.push({
        type: 'BLOCKING',
        rule: 'BF4',
        file: 'project-context.md',
        message: 'project-context.md missing: "# Project Context" header',
      });
    }

    // BF4: Check required section
    if (!content.includes('## What This Project Does')) {
      errors.push({
        type: 'BLOCKING',
        rule: 'BF4',
        file: 'project-context.md',
        message: 'project-context.md missing: "## What This Project Does" section',
      });
    }
  } catch (_error) {
    // File read failed - already caught by BF2
  }

  return errors;
}

/**
 * Validate cross-references between context files and analyzer snapshot (BF5, BF6)
 *
 * Checks:
 * - BF5: patterns.md documents all detected patterns
 * - BF6: Framework in project-overview.md matches analyzer
 *
 * @param anaPath - Path to .ana/ directory
 * @param snapshot - EngineResult from state/snapshot.json
 * @returns Array of blocking errors (empty if valid)
 */
export async function validateCrossReferences(
  anaPath: string,
  snapshot: EngineResult
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Scenario B guard: skip all cross-reference checks if snapshot is null/undefined
  // This happens when tree-sitter fails and analyzer returns no data
  if (!snapshot) {
    return errors;
  }

  // BF5: Pattern count check — removed, patterns now in skill templates (S15)

  // BF6: Framework consistency — removed, framework now in project-context.md Detected lines (S15)

  return errors;
}

/**
 * Validate quality heuristics (SW1, SW2, SW3, SW4)
 *
 * Checks file sizes and content quality.
 * These are soft warnings - noted but don't block.
 *
 * @param anaPath - Path to .ana/ directory
 * @returns Array of warnings (never blocks validation)
 */
export async function validateQuality(anaPath: string): Promise<ValidationError[]> {
  const warnings: ValidationError[] = [];

  const contextFiles = REQUIRED_CONTEXT_FILES;

  // SW1, SW2: Line count checks
  for (const file of contextFiles) {
    const filePath = path.join(anaPath, file);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').length;

      // SW1: Too thin
      if (lines < MIN_FILE_SIZE_WARNING) {
        warnings.push({
          type: 'WARNING',
          rule: 'SW1',
          file,
          message: `⚠️  ${file} is thin (${lines} lines). Consider re-running setup for this file.`,
        });
      }

      // SW2: Too verbose
      if (lines > MAX_FILE_SIZE_WARNING) {
        warnings.push({
          type: 'WARNING',
          rule: 'SW2',
          file,
          message: `⚠️  ${file} is verbose (${lines} lines). Consider trimming or compressing content.`,
        });
      }

      // SW3/SW4: removed — workflow.md and debugging.md consolidated to skills in S15
    } catch {
      // File missing - already caught by BF2
    }
  }

  return warnings;
}
