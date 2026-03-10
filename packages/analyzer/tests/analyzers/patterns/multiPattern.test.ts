import { describe, it, expect } from 'vitest';
import { detectMultipleDatabasePatterns } from '../../../src/analyzers/patterns.js';
import { isMultiPattern } from '../../../src/types/patterns.js';
import type { ParsedFile } from '../../../src/types/index.js';
import type { MultiPattern, PatternConfidence } from '../../../src/types/patterns.js';

// Helper to create mock ParsedFile
function createMockFiles(
  count: number,
  language: string,
  imports: Array<{ module: string; names: string[] }>
): ParsedFile[] {
  return Array.from({ length: count }, (_, i) => ({
    file: `file${i}.${language === 'python' ? 'py' : 'ts'}`,
    language,
    imports: imports.map(imp => ({ ...imp, line: 1 })),
    functions: [],
    classes: [],
    decorators: [],
    parseTime: 0,
    parseMethod: 'tree-sitter' as const,
    errors: 0,
  }));
}

describe('Multi-Pattern Handling', () => {
  describe('SQLAlchemy sync + async detection', () => {
    it('detects both sync and async SQLAlchemy patterns', async () => {
      const parsedFiles: ParsedFile[] = [
        // 8 files with AsyncSession
        ...createMockFiles(8, 'python', [
          { module: 'sqlalchemy.ext.asyncio', names: ['AsyncSession'] }
        ]),
        // 2 files with sync Session
        ...createMockFiles(2, 'python', [
          { module: 'sqlalchemy.orm', names: ['Session'] }
        ])
      ];

      const result = await detectMultipleDatabasePatterns(parsedFiles);

      expect(result).toBeDefined();
      expect(isMultiPattern(result)).toBe(true);  // MultiPattern structure

      const multiPattern = result as MultiPattern;
      expect(multiPattern.patterns).toHaveLength(2);
      expect(multiPattern.primary.variant).toBe('async');  // 8 > 2, async is primary
      expect(multiPattern.primary.primary).toBe(true);
      expect(multiPattern.confidence).toBe(multiPattern.primary.confidence);

      // Verify both patterns present
      const asyncPattern = multiPattern.patterns.find(p => p.variant === 'async');
      const syncPattern = multiPattern.patterns.find(p => p.variant === 'sync');
      expect(asyncPattern).toBeDefined();
      expect(syncPattern).toBeDefined();
      expect(asyncPattern?.primary).toBe(true);
      expect(syncPattern?.primary).toBe(false);
    });

    it('returns single pattern when only async detected', async () => {
      const parsedFiles: ParsedFile[] = createMockFiles(10, 'python', [
        { module: 'sqlalchemy.ext.asyncio', names: ['AsyncSession'] }
      ]);

      const result = await detectMultipleDatabasePatterns(parsedFiles);

      expect(result).toBeDefined();
      expect(isMultiPattern(result)).toBe(false);  // Single PatternConfidence

      const singlePattern = result as PatternConfidence;
      expect(singlePattern.variant).toBe('async');
      expect(singlePattern.library).toBe('sqlalchemy');
      expect(singlePattern.confidence).toBeGreaterThan(0.80);
      expect(singlePattern.primary).toBe(true);
    });

    it('returns single pattern when only sync detected', async () => {
      const parsedFiles: ParsedFile[] = createMockFiles(10, 'python', [
        { module: 'sqlalchemy.orm', names: ['Session'] }
      ]);

      const result = await detectMultipleDatabasePatterns(parsedFiles);

      expect(result).toBeDefined();
      expect(isMultiPattern(result)).toBe(false);

      const singlePattern = result as PatternConfidence;
      expect(singlePattern.variant).toBe('sync');
      expect(singlePattern.library).toBe('sqlalchemy');
      expect(singlePattern.primary).toBe(true);
    });

    it('identifies primary pattern correctly when async has more files', async () => {
      const parsedFiles: ParsedFile[] = [
        // 12 async files
        ...createMockFiles(12, 'python', [
          { module: 'sqlalchemy.ext.asyncio', names: ['AsyncSession'] }
        ]),
        // 3 sync files
        ...createMockFiles(3, 'python', [
          { module: 'sqlalchemy.orm', names: ['Session'] }
        ])
      ];

      const result = await detectMultipleDatabasePatterns(parsedFiles);

      expect(isMultiPattern(result)).toBe(true);
      const multiPattern = result as MultiPattern;

      expect(multiPattern.primary.variant).toBe('async');
      expect(multiPattern.primary.primary).toBe(true);

      const syncPattern = multiPattern.patterns.find(p => p.variant === 'sync');
      expect(syncPattern?.primary).toBe(false);
    });

    it('identifies primary pattern correctly when sync has more files', async () => {
      const parsedFiles: ParsedFile[] = [
        // 2 async files
        ...createMockFiles(2, 'python', [
          { module: 'sqlalchemy.ext.asyncio', names: ['AsyncSession'] }
        ]),
        // 10 sync files
        ...createMockFiles(10, 'python', [
          { module: 'sqlalchemy.orm', names: ['Session'] }
        ])
      ];

      const result = await detectMultipleDatabasePatterns(parsedFiles);

      expect(isMultiPattern(result)).toBe(true);
      const multiPattern = result as MultiPattern;

      expect(multiPattern.primary.variant).toBe('sync');  // More files = primary
      expect(multiPattern.primary.primary).toBe(true);
    });

    it('prefers async when frequency is tied', async () => {
      const parsedFiles: ParsedFile[] = [
        // 5 files async
        ...createMockFiles(5, 'python', [
          { module: 'sqlalchemy.ext.asyncio', names: ['AsyncSession'] }
        ]),
        // 5 files sync (tied)
        ...createMockFiles(5, 'python', [
          { module: 'sqlalchemy.orm', names: ['Session'] }
        ])
      ];

      const result = await detectMultipleDatabasePatterns(parsedFiles);

      expect(isMultiPattern(result)).toBe(true);
      const multiPattern = result as MultiPattern;

      // When tied, prefer async (modern pattern)
      expect(multiPattern.primary.variant).toBe('async');
      expect(multiPattern.primary.primary).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('returns null when no database patterns detected', async () => {
      const parsedFiles: ParsedFile[] = createMockFiles(10, 'python', [
        { module: 'fastapi', names: ['FastAPI'] }  // No database imports
      ]);

      const result = await detectMultipleDatabasePatterns(parsedFiles);

      expect(result).toBeNull();
    });

    it('handles empty parsed files array', async () => {
      const parsedFiles: ParsedFile[] = [];

      const result = await detectMultipleDatabasePatterns(parsedFiles);

      expect(result).toBeNull();
    });

    it('boosts confidence when ≥5 files use pattern', async () => {
      const parsedFiles4 = createMockFiles(4, 'python', [
        { module: 'sqlalchemy.ext.asyncio', names: ['AsyncSession'] }
      ]);
      const parsedFiles5 = createMockFiles(5, 'python', [
        { module: 'sqlalchemy.ext.asyncio', names: ['AsyncSession'] }
      ]);

      const result4 = await detectMultipleDatabasePatterns(parsedFiles4);
      const result5 = await detectMultipleDatabasePatterns(parsedFiles5);

      const confidence4 = (result4 as PatternConfidence).confidence;
      const confidence5 = (result5 as PatternConfidence).confidence;

      // ≥5 files gets 0.15 boost vs 0.10 boost
      expect(confidence5).toBeGreaterThan(confidence4);
    });

    it('excludes AsyncSession from sync count', async () => {
      const parsedFiles: ParsedFile[] = [
        // 5 async files
        ...createMockFiles(5, 'python', [
          { module: 'sqlalchemy.ext.asyncio', names: ['AsyncSession'] }
        ]),
        // File with both imports (should NOT count as sync due to asyncio check)
        {
          file: 'app/mixed.py',
          language: 'python',
          imports: [
            { module: 'sqlalchemy.ext.asyncio', names: ['AsyncSession'], line: 1 },
            { module: 'sqlalchemy.orm', names: ['Session'], line: 2 }
          ],
          functions: [], classes: [], decorators: [],
          parseTime: 0, parseMethod: 'tree-sitter', errors: 0
        }
      ];

      const result = await detectMultipleDatabasePatterns(parsedFiles);

      // Should detect only async (sync import in same file as asyncio excluded)
      expect(isMultiPattern(result)).toBe(false);
      const single = result as PatternConfidence;
      expect(single.variant).toBe('async');
    });
  });
});
