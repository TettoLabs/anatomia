import { describe, it, expect } from 'vitest';
import { checkApiValidation } from '../../../src/engine/findings/rules/validation.js';
import type { FindingContext } from '../../../src/engine/findings/index.js';
import type { ProjectCensus } from '../../../src/engine/types/census.js';
import type { ParsedFile } from '../../../src/engine/types/parsed.js';

function makeParsedFile(file: string, imports: Array<{ module: string }>): ParsedFile {
  return {
    file,
    language: 'typescript',
    functions: [],
    classes: [],
    imports: imports.map(i => ({ module: i.module, names: [], line: 1 })),
    parseTime: 0,
    parseMethod: 'cached' as const,
    errors: 0,
  };
}

function makeContext(parsedFiles: ParsedFile[]): FindingContext {
  return {
    census: { allDeps: {}, rootDevDeps: {} } as ProjectCensus,
    stack: { language: 'TypeScript', framework: 'Next.js', database: null, auth: null, testing: [], payments: null, workspace: null, aiSdk: null, uiSystem: null },
    secrets: { envFileExists: false, envExampleExists: false, gitignoreCoversEnv: false },
    rootPath: '/tmp',
    sampledFiles: [],
    parsedFiles,
  };
}

describe('API validation rule', () => {
  it('returns null when no parsed files (surface tier)', () => {
    expect(checkApiValidation(makeContext([]))).toBeNull();
  });

  it('returns null when no API routes in parsed files', () => {
    const files = [makeParsedFile('src/utils.ts', [{ module: 'zod' }])];
    expect(checkApiValidation(makeContext(files))).toBeNull();
  });

  it('passes when all API routes import validation', () => {
    const files = [
      makeParsedFile('app/api/users/route.ts', [{ module: 'zod' }]),
      makeParsedFile('app/api/posts/route.ts', [{ module: 'yup' }]),
    ];
    const result = checkApiValidation(makeContext(files));
    expect(result?.severity).toBe('pass');
    expect(result?.title).toContain('2 API routes, all validate');
  });

  it('warns when some API routes lack validation', () => {
    const files = [
      makeParsedFile('app/api/users/route.ts', [{ module: 'zod' }]),
      makeParsedFile('app/api/posts/route.ts', [{ module: 'next/server' }]),
      makeParsedFile('app/api/health/route.ts', []),
    ];
    const result = checkApiValidation(makeContext(files));
    expect(result?.severity).toBe('warn');
    expect(result?.title).toContain('2/3');
  });

  it('detects validation via shared schema imports', () => {
    const files = [
      makeParsedFile('app/api/users/route.ts', [{ module: '@/lib/schemas/user' }]),
      makeParsedFile('app/api/posts/route.ts', [{ module: '@/features/validation' }]),
    ];
    const result = checkApiValidation(makeContext(files));
    expect(result?.severity).toBe('pass');
  });

  it('detects pages/api routes', () => {
    const files = [
      makeParsedFile('pages/api/webhook.ts', [{ module: 'next' }]),
    ];
    const result = checkApiValidation(makeContext(files));
    expect(result?.severity).toBe('warn');
    expect(result?.title).toContain('1/1');
  });
});
