/**
 * Architecture classification tests - Microservices, Library, Monolith
 */

import { describe, it, expect } from 'vitest';
import { classifyArchitecture } from '../../../src/engine/analyzers/structure/index.js';

describe('Architecture classification - Microservices', () => {
  it('detects microservices with services/* pattern', () => {
    const dirs = ['services/auth', 'services/users', 'services/orders', 'shared'];
    const result = classifyArchitecture(dirs, ['main.go'], null, 'go');

    expect(result.architecture).toBe('microservices');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toContain('services/auth');
    expect(result.indicators).toContain('services/users');
  });

  it('detects microservices with apps/* pattern', () => {
    const dirs = ['apps/frontend', 'apps/backend', 'apps/mobile', 'packages/shared'];
    const result = classifyArchitecture(dirs, ['main.ts'], null, 'node');

    expect(result.architecture).toBe('microservices');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toContain('apps/frontend');
    expect(result.indicators).toContain('apps/backend');
  });

  it('detects Go microservices with cmd/* pattern', () => {
    const dirs = ['cmd/api', 'cmd/worker', 'cmd/scheduler', 'internal'];
    const result = classifyArchitecture(dirs, ['cmd/api/main.go'], null, 'go');

    expect(result.architecture).toBe('microservices');
    expect(result.confidence).toBe(0.85);
    expect(result.indicators).toContain('cmd/api');
    expect(result.indicators).toContain('cmd/worker');
  });

  it('does not detect microservices with single service', () => {
    const dirs = ['services/api', 'utils', 'config'];
    const result = classifyArchitecture(dirs, ['main.go'], null, 'go');

    expect(result.architecture).not.toBe('microservices');
  });
});

describe('Architecture classification - Library', () => {
  it('detects library with no entry point and lib/', () => {
    const dirs = ['lib', 'tests', 'docs'];
    const result = classifyArchitecture(dirs, [], null, 'node');

    expect(result.architecture).toBe('library');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toContain('no entry point');
    expect(result.indicators).toContain('lib/ or pkg/ directory present');
  });

  it('detects library with no entry point and pkg/', () => {
    const dirs = ['pkg/mylib', 'internal', 'tests'];
    const result = classifyArchitecture(dirs, [], null, 'go');

    expect(result.architecture).toBe('library');
    expect(result.confidence).toBe(0.90);
  });

  it('does not classify as library if entry point exists', () => {
    const dirs = ['lib', 'src', 'tests'];
    const result = classifyArchitecture(dirs, ['src/index.ts'], null, 'node');

    expect(result.architecture).not.toBe('library');
  });
});

describe('Architecture classification - Monolith (default)', () => {
  it('falls back to monolith when no patterns match', () => {
    const dirs = ['src', 'tests', 'config'];
    const result = classifyArchitecture(dirs, ['main.py'], null, 'python');

    expect(result.architecture).toBe('monolith');
    expect(result.confidence).toBe(0.70);
    expect(result.indicators).toContain('no clear architectural pattern');
  });

  it('classifies Next.js app as monolith (no layered pattern)', () => {
    const dirs = ['app', 'components', 'public', 'styles'];
    const result = classifyArchitecture(dirs, ['app/layout.tsx'], 'nextjs', 'node');

    expect(result.architecture).toBe('monolith');
    expect(result.confidence).toBe(0.70);
  });

  it('classifies empty project as monolith', () => {
    const dirs: string[] = [];
    const result = classifyArchitecture(dirs, ['main.py'], null, 'python');

    expect(result.architecture).toBe('monolith');
    expect(result.confidence).toBe(0.70);
  });
});

describe('Architecture classification - Priority', () => {
  it('microservices takes priority over layered', () => {
    const dirs = ['services/auth', 'services/users', 'models', 'api'];
    const result = classifyArchitecture(dirs, ['main.go'], null, 'go');

    expect(result.architecture).toBe('microservices');
  });
});
