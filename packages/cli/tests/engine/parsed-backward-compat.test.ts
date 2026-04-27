import { describe, it, expect } from 'vitest';
import {
  AnalysisResultSchema,
  ParsedAnalysisSchema,
  createEmptyParsedAnalysis,
} from '../../src/engine/types/index.js';

describe('STEP_1.3 backward compatibility', () => {
  it('STEP_1.1 result validates without parsed field', () => {
    // Simulate STEP_1.1 result (no structure, no parsed)
    const step11Result = {
      projectType: 'python' as const,
      framework: 'fastapi',
      confidence: {
        projectType: 1.0,
        framework: 0.95,
      },
      indicators: {
        projectType: ['requirements.txt'],
        framework: ['fastapi'],
      },
      detectedAt: new Date().toISOString(),
      version: '0.1.0-alpha',
    };

    expect(() => AnalysisResultSchema.parse(step11Result)).not.toThrow();
  });

  it('STEP_1.2 result validates without parsed field', () => {
    // Simulate STEP_1.2 result (has structure, no parsed)
    const step12Result = {
      projectType: 'python' as const,
      framework: 'fastapi',
      confidence: {
        projectType: 1.0,
        framework: 0.95,
      },
      indicators: {
        projectType: ['requirements.txt'],
        framework: ['fastapi'],
      },
      detectedAt: new Date().toISOString(),
      version: '0.1.0-alpha',
      structure: {
        directories: {},
        entryPoints: ['app/main.py'],
        testLocation: 'tests/',
        architecture: 'layered',
        directoryTree: '',
        configFiles: [],
        confidence: {
          entryPoints: 1.0,
          testLocation: 1.0,
          architecture: 0.90,
          overall: 0.95,
        },
      },
    };

    expect(() => AnalysisResultSchema.parse(step12Result)).not.toThrow();
  });

  it('STEP_1.3 result validates with parsed field', () => {
    const step13Result = {
      projectType: 'python' as const,
      framework: 'fastapi',
      confidence: {
        projectType: 1.0,
        framework: 0.95,
      },
      indicators: {
        projectType: ['requirements.txt'],
        framework: ['fastapi'],
      },
      detectedAt: new Date().toISOString(),
      version: '0.1.0-alpha',
      structure: {
        directories: {},
        entryPoints: ['app/main.py'],
        testLocation: 'tests/',
        architecture: 'layered',
        directoryTree: '',
        configFiles: [],
        confidence: {
          entryPoints: 1.0,
          testLocation: 1.0,
          architecture: 0.90,
          overall: 0.95,
        },
      },
      parsed: {
        files: [],
        totalParsed: 0,
        cacheHits: 0,
        cacheMisses: 0,
      },
    };

    expect(() => AnalysisResultSchema.parse(step13Result)).not.toThrow();
  });

  it('createEmptyParsedAnalysis returns valid ParsedAnalysis', () => {
    const empty = createEmptyParsedAnalysis();

    expect(empty.files).toEqual([]);
    expect(empty.totalParsed).toBe(0);
    expect(() => ParsedAnalysisSchema.parse(empty)).not.toThrow();
  });
});
