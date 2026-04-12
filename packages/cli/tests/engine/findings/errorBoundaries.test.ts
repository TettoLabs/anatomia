import { describe, it, expect } from 'vitest';
import { checkErrorBoundaries } from '../../../src/engine/findings/rules/errorBoundaries.js';
import type { FindingContext } from '../../../src/engine/findings/index.js';
import type { ProjectCensus } from '../../../src/engine/types/census.js';

function makeContext(framework: string | null, sampledFiles: string[]): FindingContext {
  return {
    census: { allDeps: {}, rootDevDeps: {} } as ProjectCensus,
    stack: { language: 'TypeScript', framework, database: null, auth: null, testing: [], payments: null, workspace: null, aiSdk: null, uiSystem: null },
    secrets: { envFileExists: false, envExampleExists: false, gitignoreCoversEnv: false },
    rootPath: '/tmp',
    sampledFiles,
    parsedFiles: [],
  };
}

describe('Error boundaries rule', () => {
  it('returns null when not Next.js', () => {
    expect(checkErrorBoundaries(makeContext('Express', ['app/page.tsx']))).toBeNull();
  });

  it('returns null when no pages in sample', () => {
    expect(checkErrorBoundaries(makeContext('Next.js', ['src/utils.ts']))).toBeNull();
  });

  it('passes when error.tsx exists', () => {
    const result = checkErrorBoundaries(makeContext('Next.js', [
      'app/page.tsx',
      'app/dashboard/page.tsx',
      'app/error.tsx',
    ]));
    expect(result?.severity).toBe('pass');
    expect(result?.title).toBe('Error boundary detected');
  });

  it('shows info when no error boundaries', () => {
    const result = checkErrorBoundaries(makeContext('Next.js', [
      'app/page.tsx',
      'app/dashboard/page.tsx',
      'app/settings/page.tsx',
    ]));
    expect(result?.severity).toBe('info');
    expect(result?.title).toContain('3 pages, no error boundaries');
    expect(result?.detail).toContain('app/error.tsx');
  });
});
