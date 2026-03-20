import { describe, it, expect } from 'vitest';
import { generateProjectOverviewScaffold } from '../../src/utils/scaffold-generators.js';
import type { AnalysisResult } from './test-types.js';
import { createEmptyAnalysisResult } from './test-types.js';

describe('project-overview.md scaffold', () => {
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('rich FastAPI project with full structure', () => {
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
        entryPoints: ['src/main.py', 'src/api/app.py'],
        testLocation: 'tests/',
        directories: { src: 'src/', tests: 'tests/', api: 'src/api/' },
        configFiles: ['pyproject.toml', 'pytest.ini'],
      },
      patterns: {
        testing: {
          library: 'pytest',
          confidence: 1.0,
          evidence: ['pytest in dependencies'],
        },
        sampledFiles: 20,
        detectionTime: 5000,
        threshold: 0.7,
      },
    };

    const scaffold = generateProjectOverviewScaffold(
      richAnalysis,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('flat Next.js project with minimal data', () => {
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
    };

    const scaffold = generateProjectOverviewScaffold(
      flatAnalysis,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('empty analysis (analyzer failed)', () => {
    const empty = createEmptyAnalysisResult();

    const scaffold = generateProjectOverviewScaffold(
      empty,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });
});
