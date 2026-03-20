import { describe, it, expect } from 'vitest';
import { generateArchitectureScaffold } from '../../src/utils/scaffold-generators.js';
import type { AnalysisResult } from './test-types.js';
import { createEmptyAnalysisResult } from './test-types.js';

describe('architecture.md scaffold', () => {
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('rich project with layered architecture', () => {
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
      structure: {
        architecture: 'layered',
        confidence: { architecture: 0.85 },
        entryPoints: ['src/main.py'],
        testLocation: 'tests/',
        directories: { src: 'src/', tests: 'tests/' },
        configFiles: ['pyproject.toml'],
      },
    };

    const scaffold = generateArchitectureScaffold(
      richAnalysis,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('flat project with unknown architecture', () => {
    const flatAnalysis: AnalysisResult = {
      projectType: 'node',
      framework: 'express',
      confidence: { projectType: 1.0, framework: 0.80 },
      indicators: {
        projectType: ['package.json'],
        framework: ['express in dependencies'],
      },
      detectedAt: timestamp,
      version: '0.2.0',
      structure: {
        architecture: undefined,
        confidence: { architecture: 0.0 },
        entryPoints: [],
        testLocation: undefined,
        directories: {},
        configFiles: [],
      },
    };

    const scaffold = generateArchitectureScaffold(
      flatAnalysis,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('empty analysis (analyzer failed)', () => {
    const empty = createEmptyAnalysisResult();

    const scaffold = generateArchitectureScaffold(
      empty,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });
});
