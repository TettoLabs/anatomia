import { describe, it, expect } from 'vitest';
import { generateWorkflowScaffold } from '../../src/utils/scaffold-generators.js';
import type { AnalysisResult } from './test-types.js';
import { createEmptyAnalysisResult } from './test-types.js';

describe('workflow.md scaffold', () => {
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('rich project with GitHub Actions CI', () => {
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
        configFiles: ['pyproject.toml', '.github/workflows/ci.yml', '.github/workflows/deploy.yml'],
      },
    };

    const scaffold = generateWorkflowScaffold(
      richAnalysis,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('flat project with no CI config detected', () => {
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
      structure: {
        configFiles: ['package.json', 'tsconfig.json'],
      },
    };

    const scaffold = generateWorkflowScaffold(
      flatAnalysis,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('empty analysis (analyzer failed)', () => {
    const empty = createEmptyAnalysisResult();

    const scaffold = generateWorkflowScaffold(
      empty,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });
});
