import { describe, it, expect } from 'vitest';
import { generateDebuggingScaffold } from '../../src/utils/scaffold-generators.js';
import { createEmptyEngineResult } from './test-types.js';
import type { TestEngineResult } from './test-types.js';

describe('debugging.md scaffold', () => {
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('rich FastAPI project with stack and structure data', () => {
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
      files: { source: 80, test: 20, config: 8, total: 108 },
      structure: [
        { path: 'src/', purpose: 'Application source' },
        { path: 'src/api/', purpose: 'API routes' },
        { path: 'tests/', purpose: 'Test suite' },
      ],
      commands: {
        build: null,
        test: 'pytest',
        lint: 'ruff check .',
        dev: 'uvicorn src.main:app --reload',
        packageManager: 'pip',
      },
    };

    const scaffold = generateDebuggingScaffold(
      result as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('TypeScript Next.js project (no debugging-specific data)', () => {
    const result: TestEngineResult = {
      ...createEmptyEngineResult(),
      overview: { project: projectName, scannedAt: timestamp, depth: 'surface' },
      stack: {
        language: 'TypeScript',
        framework: 'Next.js',
        database: null,
        auth: null,
        testing: 'Vitest',
        payments: null,
        workspace: null,
      },
      commands: {
        build: 'npm run build',
        test: 'npm run test',
        lint: 'npm run lint',
        dev: 'npm run dev',
        packageManager: 'npm',
      },
    };

    const scaffold = generateDebuggingScaffold(
      result as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('empty result (scan failed)', () => {
    const empty = createEmptyEngineResult();

    const scaffold = generateDebuggingScaffold(
      empty as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });
});
