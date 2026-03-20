import { describe, it, expect } from 'vitest';
import { generateConventionsScaffold } from '../../src/utils/scaffold-generators.js';
import type { AnalysisResult } from './test-types.js';
import { createEmptyAnalysisResult } from './test-types.js';

describe('conventions.md scaffold', () => {
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('rich Python project with full conventions', () => {
    const richAnalysis: AnalysisResult = {
      projectType: 'python',
      framework: 'fastapi',
      confidence: { projectType: 1.0, framework: 0.95 },
      indicators: {
        projectType: ['pyproject.toml'],
        framework: ['fastapi in dependencies'],
      },
      detectedAt: timestamp,
      version: '0.2.0',
      conventions: {
        naming: {
          files: {
            majority: 'snake_case',
            confidence: 0.98,
            mixed: false,
            distribution: { snake_case: 0.98, kebab_case: 0.02 },
          },
          variables: {
            majority: 'snake_case',
            confidence: 0.95,
            mixed: false,
          },
          functions: {
            majority: 'snake_case',
            confidence: 0.97,
            mixed: false,
          },
          classes: {
            majority: 'PascalCase',
            confidence: 1.0,
            mixed: false,
          },
          constants: {
            majority: 'SCREAMING_SNAKE_CASE',
            confidence: 0.90,
            mixed: true,
            distribution: { SCREAMING_SNAKE_CASE: 0.90, UPPER_CASE: 0.10 },
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

    const scaffold = generateConventionsScaffold(
      richAnalysis,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('flat Node project with partial conventions', () => {
    const flatAnalysis: AnalysisResult = {
      projectType: 'node',
      framework: 'nextjs',
      confidence: { projectType: 1.0, framework: 0.88 },
      indicators: {
        projectType: ['package.json'],
        framework: ['next in dependencies'],
      },
      detectedAt: timestamp,
      version: '0.2.0',
      conventions: {
        naming: {
          functions: {
            majority: 'camelCase',
            confidence: 0.92,
            mixed: false,
          },
        },
        imports: {
          style: 'relative',
          confidence: 0.75,
        },
        sampledFiles: 20,
      },
    };

    const scaffold = generateConventionsScaffold(
      flatAnalysis,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('empty analysis (analyzer failed)', () => {
    const empty = createEmptyAnalysisResult();

    const scaffold = generateConventionsScaffold(
      empty,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });
});
