import { describe, it, expect } from 'vitest';
import { generateProjectOverviewScaffold } from '../../src/utils/scaffold-generators.js';
import { createEmptyEngineResult } from './test-types.js';
import type { TestEngineResult } from './test-types.js';

describe('project-overview.md scaffold', () => {
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('rich TypeScript Next.js project with full data', () => {
    const result: TestEngineResult = {
      ...createEmptyEngineResult(),
      overview: { project: projectName, scannedAt: timestamp, depth: 'deep' },
      stack: {
        language: 'TypeScript',
        framework: 'Next.js',
        database: 'PostgreSQL',
        auth: 'NextAuth',
        testing: 'Vitest',
        payments: 'Stripe',
        workspace: null,
      },
      files: { source: 120, test: 35, config: 18, total: 173 },
      structure: [
        { path: 'src/app', purpose: 'Next.js app directory' },
        { path: 'src/components', purpose: 'React components' },
        { path: 'src/lib', purpose: 'Shared utilities' },
        { path: 'tests', purpose: 'Test files' },
      ],
      structureOverflow: 0,
      commands: {
        build: 'npm run build',
        test: 'npm run test',
        lint: 'npm run lint',
        dev: 'npm run dev',
        packageManager: 'npm',
      },
      deployment: { platform: 'Vercel', configFile: 'vercel.json' },
      externalServices: [
        { name: 'Stripe', category: 'payments', source: 'package.json', configFound: true },
        { name: 'SendGrid', category: 'email', source: 'package.json', configFound: false },
      ],
    };

    const scaffold = generateProjectOverviewScaffold(
      result as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('Python FastAPI project with minimal data', () => {
    const result: TestEngineResult = {
      ...createEmptyEngineResult(),
      overview: { project: projectName, scannedAt: timestamp, depth: 'surface' },
      stack: {
        language: 'Python',
        framework: 'FastAPI',
        database: null,
        auth: null,
        testing: 'pytest',
        payments: null,
        workspace: null,
      },
      files: { source: 45, test: 12, config: 5, total: 62 },
      commands: {
        build: null,
        test: 'pytest',
        lint: null,
        dev: 'uvicorn src.main:app --reload',
        packageManager: 'pip',
      },
    };

    const scaffold = generateProjectOverviewScaffold(
      result as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('empty result (scan failed)', () => {
    const empty = createEmptyEngineResult();

    const scaffold = generateProjectOverviewScaffold(
      empty as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });
});
