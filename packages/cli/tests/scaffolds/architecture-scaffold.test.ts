import { describe, it, expect } from 'vitest';
import { generateArchitectureScaffold } from '../../src/utils/scaffold-generators.js';
import { createEmptyEngineResult } from './test-types.js';
import type { TestEngineResult } from './test-types.js';

describe('architecture.md scaffold', () => {
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('rich Python FastAPI project with structure entries', () => {
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
        { path: 'src/models/', purpose: 'Database models' },
        { path: 'src/services/', purpose: 'Business logic layer' },
        { path: 'tests/', purpose: 'Test suite' },
      ],
      structureOverflow: 0,
      commands: {
        build: null,
        test: 'pytest',
        lint: 'ruff check .',
        dev: 'uvicorn src.main:app --reload',
        packageManager: 'pip',
      },
      monorepo: { isMonorepo: false, tool: null, packages: [] },
    };

    const scaffold = generateArchitectureScaffold(
      result as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('Node Express project with structure overflow', () => {
    const result: TestEngineResult = {
      ...createEmptyEngineResult(),
      overview: { project: projectName, scannedAt: timestamp, depth: 'surface' },
      stack: {
        language: 'JavaScript',
        framework: 'Express',
        database: null,
        auth: null,
        testing: null,
        payments: null,
        workspace: null,
      },
      files: { source: 30, test: 5, config: 4, total: 39 },
      structure: [
        { path: 'src/', purpose: 'Source files' },
        { path: 'routes/', purpose: 'Express routes' },
      ],
      structureOverflow: 12,
      commands: {
        build: null,
        test: null,
        lint: null,
        dev: 'node src/index.js',
        packageManager: 'npm',
      },
    };

    const scaffold = generateArchitectureScaffold(
      result as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('empty result (scan failed)', () => {
    const empty = createEmptyEngineResult();

    const scaffold = generateArchitectureScaffold(
      empty as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });
});
