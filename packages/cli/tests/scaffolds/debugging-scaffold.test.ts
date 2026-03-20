import { describe, it, expect } from 'vitest';
import { generateDebuggingScaffold } from '../../src/utils/scaffold-generators.js';
import type { AnalysisResult } from './test-types.js';
import { createEmptyAnalysisResult } from './test-types.js';

describe('debugging.md scaffold', () => {
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('rich FastAPI project (no debugging-specific data)', () => {
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
        entryPoints: ['src/main.py'],
        testLocation: 'tests/',
      },
    };

    const scaffold = generateDebuggingScaffold(
      richAnalysis,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('flat Next.js project (no debugging-specific data)', () => {
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

    const scaffold = generateDebuggingScaffold(
      flatAnalysis,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('empty analysis (analyzer failed)', () => {
    const empty = createEmptyAnalysisResult();

    const scaffold = generateDebuggingScaffold(
      empty,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });
});
