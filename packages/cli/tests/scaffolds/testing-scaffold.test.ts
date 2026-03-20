import { describe, it, expect } from 'vitest';
import { generateTestingScaffold } from '../../src/utils/scaffold-generators.js';
import type { AnalysisResult } from './test-types.js';
import { createEmptyAnalysisResult } from './test-types.js';

describe('testing.md scaffold', () => {
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('rich project with pytest testing', () => {
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
        testLocation: 'tests/',
        entryPoints: ['src/main.py'],
        directories: { src: 'src/', tests: 'tests/' },
        configFiles: ['pytest.ini'],
      },
      patterns: {
        testing: {
          library: 'pytest',
          confidence: 1.0,
          evidence: ['pytest in dependencies', 'pytest.ini found', 'tests/ directory'],
        },
        sampledFiles: 20,
        detectionTime: 5000,
        threshold: 0.7,
      },
    };

    const scaffold = generateTestingScaffold(
      richAnalysis,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('flat project with vitest but no test location', () => {
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
      patterns: {
        testing: {
          library: 'vitest',
          confidence: 0.92,
          evidence: ['vitest in dependencies'],
        },
        sampledFiles: 15,
        detectionTime: 3000,
        threshold: 0.7,
      },
    };

    const scaffold = generateTestingScaffold(
      flatAnalysis,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('empty analysis (analyzer failed)', () => {
    const empty = createEmptyAnalysisResult();

    const scaffold = generateTestingScaffold(
      empty,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });
});
