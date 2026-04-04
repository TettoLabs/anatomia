import { describe, it, expect } from 'vitest';
import { generateWorkflowScaffold } from '../../src/utils/scaffold-generators.js';
import { createEmptyEngineResult } from './test-types.js';
import type { TestEngineResult } from './test-types.js';

describe('workflow.md scaffold', () => {
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('rich project with full deployment and CI config', () => {
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
      structure: [
        { path: 'src/', purpose: 'Application source' },
        { path: 'tests/', purpose: 'Test suite' },
        { path: '.github/workflows/', purpose: 'CI/CD workflows' },
      ],
      commands: {
        build: 'docker build .',
        test: 'pytest',
        lint: 'ruff check .',
        dev: 'uvicorn src.main:app --reload',
        packageManager: 'pip',
      },
      deployment: { platform: 'AWS', configFile: '.github/workflows/deploy.yml' },
      git: {
        head: 'abc1234',
        branch: 'main',
        commitCount: 142,
        lastCommitAt: '2026-03-18T15:30:00Z',
        uncommittedChanges: false,
        contributorCount: 4,
      },
    };

    const scaffold = generateWorkflowScaffold(
      result as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('TypeScript project with Vercel deployment and no CI config', () => {
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
      structure: [
        { path: 'src/', purpose: 'Application source' },
        { path: 'public/', purpose: 'Static assets' },
      ],
      commands: {
        build: 'npm run build',
        test: 'npm run test',
        lint: 'npm run lint',
        dev: 'npm run dev',
        packageManager: 'npm',
      },
      deployment: { platform: 'Vercel', configFile: 'vercel.json' },
    };

    const scaffold = generateWorkflowScaffold(
      result as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('empty result (scan failed)', () => {
    const empty = createEmptyEngineResult();

    const scaffold = generateWorkflowScaffold(
      empty as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });
});
