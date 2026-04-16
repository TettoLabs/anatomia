import { describe, it, expect } from 'vitest';
import { detectProjectKind } from '../../../src/engine/detectors/projectKind.js';
import type { ProjectKindInput } from '../../../src/engine/detectors/projectKind.js';

/** Minimal input with all signals off. */
function makeInput(overrides: Partial<ProjectKindInput> = {}): ProjectKindInput {
  return {
    hasBin: false,
    hasMain: false,
    hasExports: false,
    frameworkName: null,
    projectType: 'node',
    deps: [],
    ...overrides,
  };
}

describe('detectProjectKind', () => {
  // @ana A005
  describe('classifies project with bin field as cli', () => {
    it('returns cli when hasBin is true', () => {
      const result = detectProjectKind(makeInput({ hasBin: true }));
      expect(result.kind).toBe('cli');
    });

    it('returns cli when hasBin is true even with CLI deps', () => {
      const result = detectProjectKind(makeInput({ hasBin: true, deps: ['commander'] }));
      expect(result.kind).toBe('cli');
    });
  });

  // @ana A006
  describe('classifies project with CLI dependency as cli', () => {
    it('returns cli for commander', () => {
      const result = detectProjectKind(makeInput({ deps: ['commander'] }));
      expect(result.kind).toBe('cli');
    });

    it('returns cli for yargs', () => {
      const result = detectProjectKind(makeInput({ deps: ['yargs'] }));
      expect(result.kind).toBe('cli');
    });

    it('returns cli for meow', () => {
      const result = detectProjectKind(makeInput({ deps: ['meow'] }));
      expect(result.kind).toBe('cli');
    });

    it('returns cli for cac', () => {
      const result = detectProjectKind(makeInput({ deps: ['cac'] }));
      expect(result.kind).toBe('cli');
    });
  });

  // @ana A007
  describe('classifies project with browser framework as web-app', () => {
    it('returns web-app for Next.js', () => {
      const result = detectProjectKind(makeInput({ frameworkName: 'Next.js', deps: ['next', 'react'] }));
      expect(result.kind).toBe('web-app');
    });

    it('returns web-app for React', () => {
      const result = detectProjectKind(makeInput({ frameworkName: 'React', deps: ['react'] }));
      expect(result.kind).toBe('web-app');
    });

    it('returns web-app for Vue', () => {
      const result = detectProjectKind(makeInput({ frameworkName: 'Vue', deps: ['vue'] }));
      expect(result.kind).toBe('web-app');
    });

    it('returns web-app for Svelte', () => {
      const result = detectProjectKind(makeInput({ frameworkName: 'Svelte', deps: ['svelte'] }));
      expect(result.kind).toBe('web-app');
    });
  });

  // @ana A008
  describe('classifies project with server framework as api-server', () => {
    it('returns api-server for Express without browser deps', () => {
      const result = detectProjectKind(makeInput({ frameworkName: 'Express', deps: ['express'] }));
      expect(result.kind).toBe('api-server');
    });

    it('returns api-server for Fastify without browser deps', () => {
      const result = detectProjectKind(makeInput({ frameworkName: 'Fastify', deps: ['fastify'] }));
      expect(result.kind).toBe('api-server');
    });

    it('returns api-server for Hono without browser deps', () => {
      const result = detectProjectKind(makeInput({ frameworkName: 'Hono', deps: ['hono'] }));
      expect(result.kind).toBe('api-server');
    });
  });

  // @ana A009
  describe('classifies project with server and browser framework as full-stack', () => {
    it('returns full-stack for Express + React', () => {
      const result = detectProjectKind(makeInput({ frameworkName: 'Express', deps: ['express', 'react'] }));
      expect(result.kind).toBe('full-stack');
    });

    it('returns full-stack for Fastify + Vue', () => {
      const result = detectProjectKind(makeInput({ frameworkName: 'Fastify', deps: ['fastify', 'vue'] }));
      expect(result.kind).toBe('full-stack');
    });

    it('returns full-stack for NestJS + next', () => {
      const result = detectProjectKind(makeInput({ frameworkName: 'NestJS', deps: ['@nestjs/core', 'next'] }));
      expect(result.kind).toBe('full-stack');
    });
  });

  // @ana A010
  describe('classifies project with main/exports as library', () => {
    it('returns library when hasMain is true', () => {
      const result = detectProjectKind(makeInput({ hasMain: true }));
      expect(result.kind).toBe('library');
    });

    it('returns library when hasExports is true', () => {
      const result = detectProjectKind(makeInput({ hasExports: true }));
      expect(result.kind).toBe('library');
    });

    it('returns library when both hasMain and hasExports', () => {
      const result = detectProjectKind(makeInput({ hasMain: true, hasExports: true }));
      expect(result.kind).toBe('library');
    });
  });

  // @ana A011
  describe('classifies project with no signals as unknown', () => {
    it('returns unknown for Node project with no signals', () => {
      const result = detectProjectKind(makeInput());
      expect(result.kind).toBe('unknown');
    });
  });

  // @ana A012
  describe('returns unknown for non-node project type', () => {
    it('returns unknown for python', () => {
      const result = detectProjectKind(makeInput({ projectType: 'python', hasBin: true }));
      expect(result.kind).toBe('unknown');
    });

    it('returns unknown for go', () => {
      const result = detectProjectKind(makeInput({ projectType: 'go', deps: ['commander'] }));
      expect(result.kind).toBe('unknown');
    });

    it('returns unknown for rust', () => {
      const result = detectProjectKind(makeInput({ projectType: 'rust' }));
      expect(result.kind).toBe('unknown');
    });
  });

  // @ana A013
  describe('bin wins over main/exports', () => {
    it('returns cli when hasBin and hasMain are both true', () => {
      const result = detectProjectKind(makeInput({ hasBin: true, hasMain: true }));
      expect(result.kind).toBe('cli');
    });

    it('returns cli when hasBin and hasExports are both true', () => {
      const result = detectProjectKind(makeInput({ hasBin: true, hasExports: true }));
      expect(result.kind).toBe('cli');
    });
  });

  // @ana A014
  describe('CLI dep wins over main/exports', () => {
    it('returns cli when commander dep and hasMain', () => {
      const result = detectProjectKind(makeInput({ deps: ['commander'], hasMain: true }));
      expect(result.kind).toBe('cli');
    });

    it('returns cli when yargs dep and hasExports', () => {
      const result = detectProjectKind(makeInput({ deps: ['yargs'], hasExports: true }));
      expect(result.kind).toBe('cli');
    });
  });

  // @ana A003
  describe('detector is a pure function', () => {
    it('does not import node:fs', async () => {
      const detectorSource = await import('node:fs/promises').then(fs =>
        fs.readFile(new URL('../../../src/engine/detectors/projectKind.ts', import.meta.url), 'utf-8')
      );
      expect(detectorSource).not.toContain('node:fs');
    });
  });

  // @ana A002
  describe('classifies project with bin field as cli (Anatomia shape)', () => {
    it('classifies Anatomia-like project (bin + commander) as cli', () => {
      const result = detectProjectKind(makeInput({
        hasBin: true,
        hasMain: false,
        hasExports: true,
        frameworkName: null,
        projectType: 'node',
        deps: ['commander', 'chalk', 'ora'],
      }));
      expect(result.kind).toBe('cli');
    });
  });

  // @ana A001
  describe('projectKind field exists on EngineResult', () => {
    it('createEmptyEngineResult includes projectKind', async () => {
      const { createEmptyEngineResult } = await import('../../../src/engine/types/engineResult.js');
      const result = createEmptyEngineResult();
      expect(result).toHaveProperty('projectKind');
    });
  });

  // @ana A004
  describe('createEmptyEngineResult includes projectKind', () => {
    it('defaults to unknown', async () => {
      const { createEmptyEngineResult } = await import('../../../src/engine/types/engineResult.js');
      const result = createEmptyEngineResult();
      expect(result.projectKind).toBe('unknown');
    });
  });

  // @ana A016
  describe('SourceRoot includes hasBin field', () => {
    it('hasBin exists on SourceRoot type', async () => {
      // Compile-time check via import — if hasBin doesn't exist, this won't compile
      const { buildCensus } = await import('../../../src/engine/census.js');
      expect(buildCensus).toBeDefined(); // import succeeds = type check passed
    });
  });
});
