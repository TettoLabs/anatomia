import { describe, it, expect } from 'vitest';
import {
  AnalysisResult,
  AnalysisResultSchema,
  createEmptyAnalysisResult,
} from '../src/types/index.js';

describe('STEP_2.1 backward compatibility', () => {
  it('validates STEP_1.1 result without structure, parsed, or patterns', () => {
    // Simulate STEP_1.1 result (only core fields)
    const step11Result = {
      projectType: 'python' as const,
      framework: 'fastapi',
      confidence: {
        projectType: 0.95,
        framework: 0.90,
      },
      indicators: {
        projectType: ['requirements.txt'],
        framework: ['fastapi in dependencies'],
      },
      detectedAt: new Date().toISOString(),
      version: '0.1.0',
    };

    // Should validate successfully (all new fields optional)
    expect(() => AnalysisResultSchema.parse(step11Result)).not.toThrow();
  });

  it('validates STEP_1.2 result without parsed or patterns', () => {
    // Simulate STEP_1.2 result (has structure, no parsed/patterns)
    const step12Result = {
      projectType: 'python' as const,
      framework: 'fastapi',
      confidence: {
        projectType: 0.95,
        framework: 0.90,
      },
      indicators: {
        projectType: [],
        framework: [],
      },
      detectedAt: new Date().toISOString(),
      version: '0.1.0',
      structure: {
        directories: { 'app/': 'Application' },
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

    expect(() => AnalysisResultSchema.parse(step12Result)).not.toThrow();
  });

  it('validates STEP_1.3 result without patterns', () => {
    // Simulate STEP_1.3 result (has structure + parsed, no patterns)
    const step13Result = {
      projectType: 'python' as const,
      framework: 'fastapi',
      confidence: {
        projectType: 0.95,
        framework: 0.90,
      },
      indicators: {
        projectType: [],
        framework: [],
      },
      detectedAt: new Date().toISOString(),
      version: '0.1.0',
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

  it('validates STEP_2.1 result with patterns field', () => {
    // Simulate STEP_2.1 result (has all fields including patterns)
    const step21Result = {
      projectType: 'python' as const,
      framework: 'fastapi',
      confidence: {
        projectType: 0.95,
        framework: 0.90,
      },
      indicators: {
        projectType: [],
        framework: [],
      },
      detectedAt: new Date().toISOString(),
      version: '0.1.0',
      patterns: {
        validation: {
          library: 'pydantic',
          confidence: 0.95,
          evidence: ['pydantic in dependencies', 'BaseModel imports found'],
        },
        database: {
          library: 'sqlalchemy',
          variant: 'async',
          confidence: 0.95,
          evidence: ['sqlalchemy + asyncpg in dependencies'],
        },
        sampledFiles: 20,
        detectionTime: 8500,
        threshold: 0.7,
      },
    };

    expect(() => AnalysisResultSchema.parse(step21Result)).not.toThrow();
    expect(step21Result.patterns.validation?.library).toBe('pydantic');
    expect(step21Result.patterns.database?.variant).toBe('async');
  });
});
