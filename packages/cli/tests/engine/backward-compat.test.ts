import { describe, it, expect } from 'vitest';
import { AnalysisResultSchema } from '../../src/engine/types/index.js';

describe('Backward Compatibility - STEP_2.2 conventions field', () => {
  it('validates STEP_1.1 result (no structure, parsed, patterns, conventions)', () => {
    const step11Result = {
      projectType: 'python' as const,
      framework: 'fastapi',
      confidence: { projectType: 0.95, framework: 0.95 },
      indicators: { projectType: ['requirements.txt'], framework: ['fastapi in dependencies'] },
      detectedAt: '2026-02-24T00:00:00.000Z',
      version: '0.1.0',
      // No structure, parsed, patterns, conventions fields
    };

    expect(() => AnalysisResultSchema.parse(step11Result)).not.toThrow();
    const validated = AnalysisResultSchema.parse(step11Result);
    expect(validated.conventions).toBeUndefined();
  });

  it('validates STEP_1.2 result (structure, no parsed/patterns/conventions)', () => {
    const step12Result = {
      projectType: 'python' as const,
      framework: 'fastapi',
      confidence: { projectType: 0.95, framework: 0.95 },
      indicators: { projectType: ['requirements.txt'], framework: ['fastapi in dependencies'] },
      detectedAt: '2026-02-26T00:00:00.000Z',
      version: '0.1.0',
      structure: {
        directories: { 'app/': 'Application', 'tests/': 'Tests' },
        entryPoints: ['app/main.py'],
        testLocation: 'tests/',
        architecture: 'monolith',
        directoryTree: 'project/\n  app/\n  tests/',
        configFiles: ['.env'],
        confidence: { entryPoints: 1.0, testLocation: 0.95, architecture: 0.70, overall: 0.88 },
      },
      // No parsed, patterns, conventions
    };

    expect(() => AnalysisResultSchema.parse(step12Result)).not.toThrow();
    const validated = AnalysisResultSchema.parse(step12Result);
    expect(validated.conventions).toBeUndefined();
  });

  it('validates STEP_1.3 result (structure + parsed, no patterns/conventions)', () => {
    const step13Result = {
      projectType: 'python' as const,
      framework: 'fastapi',
      confidence: { projectType: 0.95, framework: 0.95 },
      indicators: { projectType: ['requirements.txt'], framework: ['fastapi in dependencies'] },
      detectedAt: '2026-03-06T00:00:00.000Z',
      version: '0.1.0',
      structure: {
        directories: { 'app/': 'Application', 'tests/': 'Tests' },
        entryPoints: ['app/main.py'],
        testLocation: 'tests/',
        architecture: 'monolith',
        directoryTree: 'project/\n  app/\n  tests/',
        configFiles: ['.env'],
        confidence: { entryPoints: 1.0, testLocation: 0.95, architecture: 0.70, overall: 0.88 }
      },
      parsed: { files: [], totalParsed: 0, cacheHits: 0, cacheMisses: 0 },
      // No patterns, conventions
    };

    expect(() => AnalysisResultSchema.parse(step13Result)).not.toThrow();
    const validated = AnalysisResultSchema.parse(step13Result);
    expect(validated.conventions).toBeUndefined();
  });

  it('validates STEP_2.1 result (structure + parsed + patterns, no conventions)', () => {
    const step21Result = {
      projectType: 'python' as const,
      framework: 'fastapi',
      confidence: { projectType: 0.95, framework: 0.95 },
      indicators: { projectType: ['requirements.txt'], framework: ['fastapi in dependencies'] },
      detectedAt: '2026-03-10T00:00:00.000Z',
      version: '0.1.0',
      structure: {
        directories: { 'app/': 'Application', 'tests/': 'Tests' },
        entryPoints: ['app/main.py'],
        testLocation: 'tests/',
        architecture: 'monolith',
        directoryTree: 'project/\n  app/\n  tests/',
        configFiles: ['.env'],
        confidence: { entryPoints: 1.0, testLocation: 0.95, architecture: 0.70, overall: 0.88 }
      },
      parsed: { files: [], totalParsed: 0, cacheHits: 0, cacheMisses: 0 },
      patterns: { sampledFiles: 20, detectionTime: 7500, threshold: 0.7 },
      // No conventions
    };

    expect(() => AnalysisResultSchema.parse(step21Result)).not.toThrow();
    const validated = AnalysisResultSchema.parse(step21Result);
    expect(validated.conventions).toBeUndefined();
  });
});
