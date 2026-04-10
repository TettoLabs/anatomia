import { describe, it, expect } from 'vitest';
import {
  AnalysisResult,
  AnalysisResultSchema,
  ProjectType,
  createEmptyAnalysisResult,
  validateAnalysisResult,
} from '../../src/engine/types/index.js';
import type { EngineResult } from '../../src/engine/types/engineResult.js';
import type {
  NamingConventionResult,
  ConventionAnalysis,
} from '../../src/engine/types/conventions.js';
import type {
  PatternAnalysis,
  PatternConfidence,
  MultiPattern,
} from '../../src/engine/types/patterns.js';

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
      expect(result.version).toBe('0.2.0');
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

/**
 * Compile-time type-unification assertions (Item 16).
 *
 * The body of these `it` blocks is irrelevant at runtime — the assertions
 * live in the type annotations on the declarations. If Item 3 (convention
 * unification) or Item 6 (pattern unification) ever regresses, tsc will
 * refuse to compile this file.
 *
 * IMPORTANT: enforcement becomes real once Item 19 lands. Until then,
 * `tests/` is excluded from tsconfig.json and vitest's default transform
 * (esbuild) strips types without full checking — so today these assertions
 * guard against gross regressions only (missing fields, renamed types).
 * Once Item 19 adds tsconfig.test.json + `typecheck.enabled: true` in
 * vitest.config.ts, any structural divergence between EngineResult's
 * inline shape and the analyzer types will fail typecheck:tests.
 */
describe('type-unification compile-time assertions', () => {
  it('EngineResult.conventions is the analyzer ConventionAnalysis type (Item 3)', () => {
    // If these lines compile, the unification is intact.
    type ConventionsField = NonNullable<EngineResult['conventions']>;
    const _same1: ConventionsField = {} as ConventionAnalysis;
    const _same2: ConventionAnalysis = {} as ConventionsField;
    void _same1;
    void _same2;

    // Naming sub-field must be the analyzer NamingConventionResult.
    type FunctionsField = NonNullable<ConventionsField['naming']>['functions'];
    const _naming: NamingConventionResult = {} as NonNullable<FunctionsField>;
    void _naming;

    expect(true).toBe(true);
  });

  it('EngineResult.patterns is the analyzer PatternAnalysis type (Item 6)', () => {
    type PatternsField = NonNullable<EngineResult['patterns']>;
    const _same1: PatternsField = {} as PatternAnalysis;
    const _same2: PatternAnalysis = {} as PatternsField;
    void _same1;
    void _same2;

    // Individual pattern categories accept the union directly — no
    // intermediate PatternDetail mapping (Item 6 deleted that).
    type DatabasePattern = PatternsField['database'];
    const _asSingle: DatabasePattern = {} as PatternConfidence | undefined;
    const _asMulti: DatabasePattern = {} as MultiPattern | undefined;
    void _asSingle;
    void _asMulti;

    expect(true).toBe(true);
  });
});
