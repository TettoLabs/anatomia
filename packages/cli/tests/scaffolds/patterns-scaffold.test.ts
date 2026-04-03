import { describe, it, expect } from 'vitest';
import { generatePatternsScaffold } from '../../src/utils/scaffold-generators.js';
import { createEmptyEngineResult } from './test-types.js';
import type { TestEngineResult } from './test-types.js';

describe('patterns.md scaffold', () => {
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('rich FastAPI project with 5 patterns', () => {
    const result: TestEngineResult = {
      ...createEmptyEngineResult(),
      overview: { project: projectName, scannedAt: timestamp, depth: 'deep' },
      stack: {
        language: 'Python',
        framework: 'FastAPI',
        database: 'PostgreSQL',
        auth: 'OAuth2',
        testing: 'pytest',
        payments: null,
        workspace: null,
      },
      patterns: {
        errorHandling: {
          library: 'exceptions',
          variant: 'fastapi',
          confidence: 0.90,
          evidence: ['HTTPException imports'],
        },
        validation: {
          library: 'pydantic',
          confidence: 0.95,
          evidence: ['BaseModel usage', '7 Pydantic models'],
        },
        database: {
          patterns: [
            {
              library: 'sqlalchemy',
              variant: 'async',
              confidence: 0.95,
              evidence: ['AsyncSession in 12 files', 'asyncpg driver'],
              primary: true,
            },
            {
              library: 'sqlalchemy',
              variant: 'sync',
              confidence: 0.85,
              evidence: ['Session in 3 files'],
              primary: false,
            },
          ],
          primary: {
            library: 'sqlalchemy',
            variant: 'async',
            confidence: 0.95,
            evidence: ['AsyncSession in 12 files', 'asyncpg driver'],
            primary: true,
          },
          confidence: 0.95,
        },
        auth: {
          library: 'oauth2-jwt',
          confidence: 0.95,
          evidence: ['python-jose in dependencies', 'OAuth2PasswordBearer detected'],
        },
        testing: {
          library: 'pytest',
          confidence: 1.0,
          evidence: ['pytest in dependencies', 'pytest.ini found'],
        },
        sampledFiles: 20,
        detectionTime: 5000,
        threshold: 0.7,
      },
    };

    const scaffold = generatePatternsScaffold(
      result as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('TypeScript Next.js project with 1 pattern', () => {
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

    const scaffold = generatePatternsScaffold(
      result as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });

  it('empty result (scan failed)', () => {
    const empty = createEmptyEngineResult();

    const scaffold = generatePatternsScaffold(
      empty as any,
      projectName,
      timestamp,
      version
    );

    expect(scaffold).toMatchSnapshot();
  });
});
