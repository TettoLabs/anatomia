/**
 * Contract tests between CLI and engine packages
 *
 * Validates that CLI scaffold generators accept EngineResult correctly.
 * If the EngineResult shape changes incompatibly, these tests fail.
 *
 * Run on every CI build.
 */

import { describe, it, expect } from 'vitest';
import { generatePatternsScaffold } from '../../src/utils/scaffold-generators.js';
import { createEmptyEngineResult } from '../scaffolds/test-types.js';
import type { TestEngineResult } from '../scaffolds/test-types.js';

describe('Engine Interface Contract', () => {
  describe('required fields access', () => {
    it('accesses core EngineResult fields without errors', () => {
      const result = createEmptyEngineResult();

      // Should not throw — proves all required fields accessible
      expect(result.overview.project).toBe('unknown');
      expect(result.stack.language).toBeNull();
      expect(result.stack.framework).toBeNull();
      expect(result.commands.packageManager).toBe('npm');
      expect(result.files.total).toBe(0);
    });

    it('catches field renames at compile time', () => {
      const result: TestEngineResult = createEmptyEngineResult();

      // Required field access — TypeScript will fail if these are renamed
      const _project: string = result.overview.project;
      const _scannedAt: string = result.overview.scannedAt;
      const _language: string | null = result.stack.language;
      const _framework: string | null = result.stack.framework;
      const _packageManager: string = result.commands.packageManager;
      const _total: number = result.files.total;
      const _structure: Array<{ path: string; purpose: string }> = result.structure;

      expect(_project).toBeDefined();
      expect(_scannedAt).toBeDefined();
      expect(_language).toBeNull();
      expect(_framework).toBeNull();
      expect(_packageManager).toBe('npm');
      expect(_total).toBe(0);
      expect(_structure).toHaveLength(0);
    });
  });

  describe('optional fields access', () => {
    it('handles full EngineResult with patterns and conventions', () => {
      const result: TestEngineResult = {
        ...createEmptyEngineResult(),
        overview: { project: 'test', scannedAt: '2026-03-19T10:00:00Z', depth: 'deep' },
        stack: {
          language: 'Python',
          framework: 'FastAPI',
          database: 'PostgreSQL',
          auth: null,
          testing: 'pytest',
          payments: null,
          workspace: null,
        },
        patterns: {
          errorHandling: { library: 'exceptions', confidence: 0.9, evidence: [] },
          validation: { library: 'pydantic', confidence: 0.95, evidence: [] },
          testing: { library: 'pytest', confidence: 1.0, evidence: [] },
          sampledFiles: 20,
          detectionTime: 5000,
          threshold: 0.7,
        },
        conventions: {
          naming: {
            functions: {
              majority: 'snake_case',
              confidence: 0.95,
              mixed: false,
              distribution: { snake_case: 0.95 },
            },
          },
          imports: {
            style: 'absolute',
            confidence: 0.85,
            distribution: { absolute: 0.85, relative: 0.15 },
          },
          indentation: {
            style: 'spaces',
            width: 4,
            confidence: 1.0,
          },
          sampledFiles: 50,
          detectionTime: 2000,
        },
      };

      // Should not throw — proves scaffold generators accept EngineResult shape
      expect(() =>
        generatePatternsScaffold(result as any, 'test', '2026-03-19T10:00:00Z', '1.0.0')
      ).not.toThrow();
    });
  });

  describe('field count validation', () => {
    it('EngineResult has all expected top-level keys', () => {
      const result = createEmptyEngineResult();
      const keys = Object.keys(result);

      const expectedKeys = [
        'overview',
        'stack',
        'files',
        'structure',
        'structureOverflow',
        'commands',
        'git',
        'monorepo',
        'externalServices',
        'schemas',
        'secrets',
        'projectProfile',
        'blindSpots',
        'deployment',
        'patterns',
        'conventions',
        'secretFindings',
        'envVarMap',
        'duplicates',
        'circularDeps',
        'orphanFiles',
        'complexityHotspots',
        'gitIntelligence',
        'dependencyIntelligence',
        'technicalDebtMarkers',
        'inconsistencies',
        'conventionBreaks',
        'aiReadinessScore',
        'recommendations',
        'health',
        'readiness',
      ];

      for (const key of expectedKeys) {
        expect(keys, `Missing top-level key: ${key}`).toContain(key);
      }

      expect(keys).toHaveLength(expectedKeys.length);
    });
  });
});
