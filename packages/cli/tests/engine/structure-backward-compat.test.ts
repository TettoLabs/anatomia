import { describe, it, expect } from 'vitest';
import {
  AnalysisResult,
  AnalysisResultSchema,
  createEmptyAnalysisResult,
} from '../../src/engine/types/index.js';

describe('STEP_1.2 backward compatibility', () => {
  it('STEP_1.1 result validates without structure field', () => {
    // Simulate STEP_1.1 result (no structure field)
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

    // Should validate successfully (structure is optional)
    expect(() => AnalysisResultSchema.parse(step11Result)).not.toThrow();
  });

  it('STEP_1.2 result validates with structure field', () => {
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
        directories: { 'app/': 'Application code' },
        entryPoints: ['app/main.py'],
        testLocation: 'tests/',
        architecture: 'layered',
        directoryTree: 'project/\n  app/\n  tests/',
        configFiles: ['.env'],
        confidence: {
          entryPoints: 1.0,
          testLocation: 1.0,
          architecture: 0.90,
          overall: 0.95,
        },
      },
    };

    // Should validate successfully
    expect(() => AnalysisResultSchema.parse(step12Result)).not.toThrow();
  });

  it('createEmptyAnalysisResult still works without structure', () => {
    const empty = createEmptyAnalysisResult();

    // Should not have structure field (undefined, not present)
    expect(empty.structure).toBeUndefined();

    // Should still validate
    expect(() => AnalysisResultSchema.parse(empty)).not.toThrow();
  });
});
