import { describe, it, expect } from 'vitest';
import { generateTestingScaffold } from '../../src/utils/scaffold-generators.js';
import { createEmptyEngineResult } from './test-types.js';
import type { TestEngineResult } from './test-types.js';

describe('testing.md scaffold', () => {
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('rich project with pytest testing and test structure', () => {
    const result: TestEngineResult = {
      ...createEmptyEngineResult(),
      overview: { project: projectName, scannedAt: timestamp, depth: 'deep' },
      stack: {
        language: 'Python',
        framework: 'FastAPI',
        database: 'PostgreSQL',
        auth: null,
        testing: 'pytest',
        payments: null,
        workspace: null,
      },
      files: { source: 80, test: 25, config: 8, total: 113 },
      structure: [
        { path: 'src/', purpose: 'Application source' },
        { path: 'tests/', purpose: 'Test suite' },
        { path: 'tests/unit/', purpose: 'Unit tests' },
        { path: 'tests/integration/', purpose: 'Integration tests' },
      ],
      commands: {
        build: null,
        test: 'pytest',
        lint: 'ruff check .',
        dev: 'uvicorn src.main:app --reload',
        packageManager: 'pip',
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
      result as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('TypeScript Next.js project with vitest', () => {
    const result: TestEngineResult = {
      ...createEmptyEngineResult(),
      overview: { project: projectName, scannedAt: timestamp, depth: 'deep' },
      stack: {
        language: 'TypeScript',
        framework: 'Next.js',
        database: null,
        auth: null,
        testing: 'Vitest',
        payments: null,
        workspace: null,
      },
      files: { source: 50, test: 10, config: 6, total: 66 },
      commands: {
        build: 'npm run build',
        test: 'npm run test',
        lint: 'npm run lint',
        dev: 'npm run dev',
        packageManager: 'npm',
      },
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
      result as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('empty result (scan failed)', () => {
    const empty = createEmptyEngineResult();

    const scaffold = generateTestingScaffold(
      empty as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });
});
