import { describe, it, expect } from 'vitest';
import { checkEnvHygiene } from '../../../src/engine/findings/rules/env.js';
import type { FindingContext } from '../../../src/engine/findings/index.js';
import type { ProjectCensus } from '../../../src/engine/types/census.js';

function makeContext(secrets: { envFileExists: boolean; envExampleExists: boolean; gitignoreCoversEnv: boolean }): FindingContext {
  return {
    census: { allDeps: {}, rootDevDeps: {} } as ProjectCensus,
    stack: { language: null, framework: null, database: null, auth: null, testing: [], payments: null, workspace: null, aiSdk: null, uiSystem: null },
    secrets,
    rootPath: '/tmp',
    sampledFiles: [],
    parsedFiles: [],
  };
}

describe('Env hygiene rule', () => {
  it('passes when .env.example exists and .gitignore covers .env', () => {
    const result = checkEnvHygiene(makeContext({ envFileExists: true, envExampleExists: true, gitignoreCoversEnv: true }));
    expect(result.severity).toBe('pass');
    expect(result.title).toContain('.env.example exists');
  });

  it('warns when .env.example is missing', () => {
    const result = checkEnvHygiene(makeContext({ envFileExists: true, envExampleExists: false, gitignoreCoversEnv: true }));
    expect(result.severity).toBe('warn');
    expect(result.title).toContain('No .env.example');
  });

  it('warns when .gitignore does not cover .env', () => {
    const result = checkEnvHygiene(makeContext({ envFileExists: true, envExampleExists: true, gitignoreCoversEnv: false }));
    expect(result.severity).toBe('warn');
    expect(result.title).toContain('.env not in .gitignore');
  });

  it('warns with both issues when both missing', () => {
    const result = checkEnvHygiene(makeContext({ envFileExists: true, envExampleExists: false, gitignoreCoversEnv: false }));
    expect(result.severity).toBe('warn');
    expect(result.title).toContain('No .env.example');
    expect(result.title).toContain('.env not in .gitignore');
  });

  it('passes when no env config exists at all', () => {
    const result = checkEnvHygiene(makeContext({ envFileExists: false, envExampleExists: false, gitignoreCoversEnv: false }));
    expect(result.severity).toBe('pass');
    expect(result.title).toContain('No environment config detected');
  });
});
