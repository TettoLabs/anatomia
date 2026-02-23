import { describe, it, expect } from 'vitest';
import {
  AnalysisResult,
  AnalysisResultSchema,
  ProjectType,
  createEmptyAnalysisResult,
  validateAnalysisResult,
} from '../src/types/index.js';

describe('AnalysisResult types', () => {
  describe('createEmptyAnalysisResult', () => {
    it('creates valid empty result', () => {
      const result = createEmptyAnalysisResult();

      expect(result.projectType).toBe('unknown');
      expect(result.framework).toBeNull();
      expect(result.confidence.projectType).toBe(0.0);
      expect(result.confidence.framework).toBe(0.0);
      expect(result.indicators.projectType).toEqual([]);
      expect(result.indicators.framework).toEqual([]);
      expect(result.version).toBe('0.1.0-alpha');
    });

    it('includes valid ISO timestamp', () => {
      const result = createEmptyAnalysisResult();
      const parsedDate = new Date(result.detectedAt);
      expect(parsedDate.toISOString()).toBe(result.detectedAt);
    });
  });

  describe('AnalysisResultSchema validation', () => {
    it('validates correct AnalysisResult', () => {
      const result: AnalysisResult = {
        projectType: 'python',
        framework: 'fastapi',
        confidence: {
          projectType: 1.0,
          framework: 0.95,
        },
        indicators: {
          projectType: ['requirements.txt', 'pyproject.toml'],
          framework: ['fastapi in dependencies', 'FastAPI imports found'],
        },
        detectedAt: new Date().toISOString(),
        version: '0.1.0-alpha',
      };

      expect(() => validateAnalysisResult(result)).not.toThrow();
    });

    it('rejects invalid project type', () => {
      const invalid = {
        projectType: 'invalid-type', // Not in enum
        framework: null,
        confidence: { projectType: 1.0, framework: 0.0 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.1.0-alpha',
      };

      expect(() => validateAnalysisResult(invalid)).toThrow();
    });

    it('rejects out-of-range confidence', () => {
      const invalid = {
        projectType: 'python',
        framework: null,
        confidence: { projectType: 1.5, framework: 0.0 }, // Out of range
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.1.0-alpha',
      };

      expect(() => validateAnalysisResult(invalid)).toThrow();
    });

    it('accepts all valid project types', () => {
      const validTypes: ProjectType[] = [
        'python',
        'node',
        'go',
        'rust',
        'ruby',
        'php',
        'mixed',
        'unknown',
      ];

      for (const type of validTypes) {
        const result = createEmptyAnalysisResult();
        result.projectType = type;
        expect(() => validateAnalysisResult(result)).not.toThrow();
      }
    });
  });
});
