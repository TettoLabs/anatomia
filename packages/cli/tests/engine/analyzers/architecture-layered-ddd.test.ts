/**
 * Architecture classification tests - Layered and Domain-Driven patterns
 */

import { describe, it, expect } from 'vitest';
import { classifyArchitecture } from '../../../src/engine/analyzers/structure/index.js';

describe('Architecture classification - Layered', () => {
  it('detects layered with all 3 layers (models + services + api)', () => {
    const dirs = ['api', 'models', 'services'];
    const result = classifyArchitecture(dirs, ['main.py'], null, 'python');

    expect(result.architecture).toBe('layered');
    expect(result.confidence).toBe(0.95);
    expect(result.indicators).toContain('models/');
    expect(result.indicators).toContain('services/ or domain/');
    expect(result.indicators).toContain('api/ or routes/ or controllers/');
  });

  it('detects layered with 2 layers (models + services, no api)', () => {
    const dirs = ['models', 'services', 'utils'];
    const result = classifyArchitecture(dirs, ['main.py'], null, 'python');

    expect(result.architecture).toBe('layered');
    expect(result.confidence).toBe(0.85);
  });

  it('detects layered with 2 layers (services + api)', () => {
    const dirs = ['api', 'services', 'config'];
    const result = classifyArchitecture(dirs, ['main.py'], null, 'python');

    expect(result.architecture).toBe('layered');
    expect(result.confidence).toBe(0.85);
  });

  it('detects weak layered with only models/', () => {
    const dirs = ['models', 'utils', 'config'];
    const result = classifyArchitecture(dirs, ['main.py'], null, 'python');

    expect(result.architecture).toBe('layered');
    expect(result.confidence).toBe(0.70);
  });

  it('detects layered with routes + controllers + models + services', () => {
    const dirs = ['routes', 'controllers', 'models', 'services', 'middleware'];
    const result = classifyArchitecture(dirs, ['app.js'], null, 'node');

    expect(result.architecture).toBe('layered');
    expect(result.confidence).toBe(0.95);
  });
});

describe('Architecture classification - Domain-Driven', () => {
  it('detects DDD with 3+ feature modules', () => {
    const dirs = ['features/auth', 'features/users', 'features/products', 'features/orders'];
    const result = classifyArchitecture(dirs, ['main.py'], null, 'python');

    expect(result.architecture).toBe('domain-driven');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toContain('features/auth');
    expect(result.indicators).toContain('features/users');
  });

  it('detects DDD with 2 feature modules (lower confidence)', () => {
    const dirs = ['features/auth', 'features/users', 'utils'];
    const result = classifyArchitecture(dirs, ['main.py'], null, 'python');

    expect(result.architecture).toBe('domain-driven');
    expect(result.confidence).toBe(0.80);
  });

  it('detects DDD with modules/ pattern', () => {
    const dirs = ['modules/billing', 'modules/inventory', 'modules/shipping'];
    const result = classifyArchitecture(dirs, ['main.ts'], null, 'node');

    expect(result.architecture).toBe('domain-driven');
    expect(result.confidence).toBe(0.90);
  });

  it('detects NestJS DDD pattern with src/modules/', () => {
    const dirs = ['src/modules/users', 'src/modules/posts', 'src/common'];
    const result = classifyArchitecture(dirs, ['src/main.ts'], 'nestjs', 'node');

    expect(result.architecture).toBe('domain-driven');
    expect(result.confidence).toBe(0.85);
    expect(result.indicators).toContain('NestJS modules/');
  });

  it('falls back to monolith with single feature module', () => {
    const dirs = ['features/auth', 'utils', 'config'];
    const result = classifyArchitecture(dirs, ['main.py'], null, 'python');

    expect(result.architecture).toBe('monolith');
    expect(result.confidence).toBe(0.70);
  });
});
