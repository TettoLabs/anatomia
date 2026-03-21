import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  countDetectedPatterns,
  getMissingPatterns,
  getDocumentedPatternSections,
  extractFrameworkFromContent,
  validateCrossReferences,
} from '../../src/utils/validators.js';

/**
 * Minimal AnalysisResult type for testing (avoids tree-sitter dependency)
 */
interface AnalysisResult {
  projectType: string;
  framework: string | null;
  confidence: { projectType: number; framework: number };
  indicators: { projectType: string[]; framework: string[] };
  detectedAt: string;
  version: string;
  patterns?: {
    errorHandling?: { library: string; confidence: number; evidence: string[] };
    validation?: { library: string; confidence: number; evidence: string[] };
    database?: { library: string; confidence: number; evidence: string[] };
    auth?: { library: string; confidence: number; evidence: string[] };
    testing?: { library: string; confidence: number; evidence: string[] };
  };
}

/**
 * Create minimal AnalysisResult for Scenario B testing
 * Simulates what analyzer returns when tree-sitter fails
 */
function createScenarioBSnapshot(): AnalysisResult {
  return {
    projectType: 'unknown',
    framework: null,
    confidence: { projectType: 0, framework: 0 },
    indicators: { projectType: [], framework: [] },
    detectedAt: new Date().toISOString(),
    version: '0.1.0',
    // patterns: undefined - not present
  };
}

/**
 * Create AnalysisResult with framework = "none" (string)
 */
function createFrameworkNoneSnapshot(): AnalysisResult {
  return {
    projectType: 'node',
    framework: 'none',
    confidence: { projectType: 0.5, framework: 0 },
    indicators: { projectType: ['package.json'], framework: [] },
    detectedAt: new Date().toISOString(),
    version: '0.1.0',
  };
}

describe('Scenario B — analyzer returned no/minimal data', () => {
  describe('countDetectedPatterns', () => {
    it('returns 0 when analysis is null', () => {
      // @ts-expect-error - testing null input
      expect(countDetectedPatterns(null)).toBe(0);
    });

    it('returns 0 when analysis is undefined', () => {
      // @ts-expect-error - testing undefined input
      expect(countDetectedPatterns(undefined)).toBe(0);
    });

    it('returns 0 when analysis.patterns is undefined', () => {
      const snapshot = createScenarioBSnapshot();
      expect(countDetectedPatterns(snapshot as never)).toBe(0);
    });

    it('returns 0 when analysis.patterns is null', () => {
      const snapshot = createScenarioBSnapshot();
      // @ts-expect-error - testing null patterns
      snapshot.patterns = null;
      expect(countDetectedPatterns(snapshot as never)).toBe(0);
    });

    it('returns 0 when analysis.patterns is empty object', () => {
      const snapshot = createScenarioBSnapshot();
      snapshot.patterns = {};
      expect(countDetectedPatterns(snapshot as never)).toBe(0);
    });
  });

  describe('getMissingPatterns', () => {
    it('returns empty array when analysis is null', () => {
      // @ts-expect-error - testing null input
      expect(getMissingPatterns(null, ['Error Handling'])).toEqual([]);
    });

    it('returns empty array when analysis is undefined', () => {
      // @ts-expect-error - testing undefined input
      expect(getMissingPatterns(undefined, ['Error Handling'])).toEqual([]);
    });

    it('returns empty array when analysis.patterns is undefined', () => {
      const snapshot = createScenarioBSnapshot();
      expect(getMissingPatterns(snapshot as never, ['Error Handling'])).toEqual([]);
    });

    it('returns empty array when analysis.patterns is null', () => {
      const snapshot = createScenarioBSnapshot();
      // @ts-expect-error - testing null patterns
      snapshot.patterns = null;
      expect(getMissingPatterns(snapshot as never, [])).toEqual([]);
    });
  });

  describe('extractFrameworkFromContent', () => {
    it('returns null for "None detected"', () => {
      const content = '**Framework:** None detected\n';
      expect(extractFrameworkFromContent(content)).toBeNull();
    });

    it('returns null for "None"', () => {
      const content = '**Framework:** None\n';
      expect(extractFrameworkFromContent(content)).toBeNull();
    });

    it('returns null for "none" (lowercase)', () => {
      const content = '**Framework:** none\n';
      // After normalization, "none" should be treated as no framework
      const result = extractFrameworkFromContent(content);
      // Current behavior returns "none" - we need to fix this
      expect(result).toBeNull();
    });
  });

  describe('validateCrossReferences — BF5 with no patterns', () => {
    let tempDir: string;
    let anaPath: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'validators-test-'));
      anaPath = tempDir;
      await fs.mkdir(path.join(anaPath, 'context'), { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('passes when snapshot is null (skips cross-reference check)', async () => {
      // Create minimal patterns.md
      await fs.writeFile(
        path.join(anaPath, 'context/patterns.md'),
        '# Patterns\n\nNo patterns detected by analyzer.\n'
      );
      await fs.writeFile(
        path.join(anaPath, 'context/project-overview.md'),
        '# Project Overview\n\n**Framework:** None detected\n'
      );

      // @ts-expect-error - testing null snapshot
      const errors = await validateCrossReferences(anaPath, null);
      expect(errors).toEqual([]);
    });

    it('passes when snapshot is undefined (skips cross-reference check)', async () => {
      await fs.writeFile(
        path.join(anaPath, 'context/patterns.md'),
        '# Patterns\n\nNo patterns detected.\n'
      );
      await fs.writeFile(
        path.join(anaPath, 'context/project-overview.md'),
        '# Project Overview\n\n**Framework:** None detected\n'
      );

      // @ts-expect-error - testing undefined snapshot
      const errors = await validateCrossReferences(anaPath, undefined);
      expect(errors).toEqual([]);
    });

    it('passes when snapshot.patterns is undefined and patterns.md has no sections', async () => {
      await fs.writeFile(
        path.join(anaPath, 'context/patterns.md'),
        '# Patterns\n\nNo patterns detected by analyzer.\n'
      );
      await fs.writeFile(
        path.join(anaPath, 'context/project-overview.md'),
        '# Project Overview\n\n**Framework:** None detected\n'
      );

      const snapshot = createScenarioBSnapshot();
      const errors = await validateCrossReferences(anaPath, snapshot as never);
      expect(errors).toEqual([]);
    });

    it('passes when detected patterns count is 0', async () => {
      await fs.writeFile(
        path.join(anaPath, 'context/patterns.md'),
        '# Patterns\n\n## Error Handling\n\nManual patterns documented.\n'
      );
      await fs.writeFile(
        path.join(anaPath, 'context/project-overview.md'),
        '# Project Overview\n\n**Framework:** None detected\n'
      );

      const snapshot = createScenarioBSnapshot();
      snapshot.patterns = {}; // Empty patterns object
      const errors = await validateCrossReferences(anaPath, snapshot as never);
      expect(errors).toEqual([]);
    });
  });

  describe('validateCrossReferences — BF6 framework matching', () => {
    let tempDir: string;
    let anaPath: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'validators-test-'));
      anaPath = tempDir;
      await fs.mkdir(path.join(anaPath, 'context'), { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('passes when snapshot.framework is "none" and overview says "None detected"', async () => {
      await fs.writeFile(
        path.join(anaPath, 'context/patterns.md'),
        '# Patterns\n\nNo patterns.\n'
      );
      await fs.writeFile(
        path.join(anaPath, 'context/project-overview.md'),
        '# Project Overview\n\n**Framework:** None detected\n'
      );

      const snapshot = createFrameworkNoneSnapshot();
      const errors = await validateCrossReferences(anaPath, snapshot as never);

      // Should NOT have a BF6 error - "none" and "None detected" should match
      const bf6Errors = errors.filter(e => e.rule === 'BF6');
      expect(bf6Errors).toEqual([]);
    });

    it('passes when snapshot.framework is "none" and overview says "None"', async () => {
      await fs.writeFile(
        path.join(anaPath, 'context/patterns.md'),
        '# Patterns\n\nNo patterns.\n'
      );
      await fs.writeFile(
        path.join(anaPath, 'context/project-overview.md'),
        '# Project Overview\n\n**Framework:** None\n'
      );

      const snapshot = createFrameworkNoneSnapshot();
      const errors = await validateCrossReferences(anaPath, snapshot as never);

      const bf6Errors = errors.filter(e => e.rule === 'BF6');
      expect(bf6Errors).toEqual([]);
    });

    it('passes when both snapshot.framework and overview are null/none', async () => {
      await fs.writeFile(
        path.join(anaPath, 'context/patterns.md'),
        '# Patterns\n\nNo patterns.\n'
      );
      await fs.writeFile(
        path.join(anaPath, 'context/project-overview.md'),
        '# Project Overview\n\n**Framework:** None detected\n'
      );

      const snapshot = createScenarioBSnapshot(); // framework: null
      const errors = await validateCrossReferences(anaPath, snapshot as never);

      const bf6Errors = errors.filter(e => e.rule === 'BF6');
      expect(bf6Errors).toEqual([]);
    });

    it('still catches real mismatches (fastapi vs nextjs)', async () => {
      await fs.writeFile(
        path.join(anaPath, 'context/patterns.md'),
        '# Patterns\n\nNo patterns.\n'
      );
      await fs.writeFile(
        path.join(anaPath, 'context/project-overview.md'),
        '# Project Overview\n\n**Framework:** FastAPI\n'
      );

      const snapshot = createScenarioBSnapshot();
      snapshot.framework = 'nextjs';
      const errors = await validateCrossReferences(anaPath, snapshot as never);

      const bf6Errors = errors.filter(e => e.rule === 'BF6');
      expect(bf6Errors.length).toBe(1);
      expect(bf6Errors[0].message).toContain('mismatch');
    });
  });
});

describe('validators — normal operation', () => {
  describe('countDetectedPatterns', () => {
    it('counts single pattern', () => {
      const snapshot = createScenarioBSnapshot();
      snapshot.patterns = {
        errorHandling: { library: 'try-catch', confidence: 0.9, evidence: ['found'] },
      };
      expect(countDetectedPatterns(snapshot as never)).toBe(1);
    });

    it('counts multiple patterns', () => {
      const snapshot = createScenarioBSnapshot();
      snapshot.patterns = {
        errorHandling: { library: 'try-catch', confidence: 0.9, evidence: ['found'] },
        validation: { library: 'zod', confidence: 0.95, evidence: ['found'] },
        testing: { library: 'vitest', confidence: 1.0, evidence: ['found'] },
      };
      expect(countDetectedPatterns(snapshot as never)).toBe(3);
    });

    it('counts all 5 pattern categories', () => {
      const snapshot = createScenarioBSnapshot();
      snapshot.patterns = {
        errorHandling: { library: 'try-catch', confidence: 0.9, evidence: ['found'] },
        validation: { library: 'zod', confidence: 0.95, evidence: ['found'] },
        database: { library: 'prisma', confidence: 0.9, evidence: ['found'] },
        auth: { library: 'jwt', confidence: 0.85, evidence: ['found'] },
        testing: { library: 'vitest', confidence: 1.0, evidence: ['found'] },
      };
      expect(countDetectedPatterns(snapshot as never)).toBe(5);
    });
  });

  describe('getDocumentedPatternSections', () => {
    it('extracts section headers', () => {
      const content = '# Patterns\n\n## Error Handling\n\nContent.\n\n## Validation\n\nMore content.';
      expect(getDocumentedPatternSections(content)).toEqual(['Error Handling', 'Validation']);
    });

    it('excludes Framework Patterns section', () => {
      const content = '## Error Handling\n\n## Framework Patterns\n\n## Validation';
      expect(getDocumentedPatternSections(content)).toEqual(['Error Handling', 'Validation']);
    });

    it('returns empty array for no sections', () => {
      const content = '# Patterns\n\nNo patterns documented.';
      expect(getDocumentedPatternSections(content)).toEqual([]);
    });
  });

  describe('extractFrameworkFromContent', () => {
    it('extracts FastAPI', () => {
      const content = '**Framework:** FastAPI\n';
      expect(extractFrameworkFromContent(content)).toBe('fastapi');
    });

    it('extracts Next.js and normalizes', () => {
      const content = '**Framework:** Next.js (App Router)\n';
      expect(extractFrameworkFromContent(content)).toBe('nextjs');
    });

    it('returns null when no framework line', () => {
      const content = '# Project Overview\n\nSome content without framework.';
      expect(extractFrameworkFromContent(content)).toBeNull();
    });
  });
});
