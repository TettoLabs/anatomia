/**
 * Unit tests for Node.js framework detectors
 *
 * Tests Next.js, React, Nest.js, Express, and other Node frameworks with mocked I/O.
 * Includes CRITICAL disambiguation tests to verify detection priority.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectNextjs } from '../../src/detectors/node/nextjs';
import { detectReact } from '../../src/detectors/node/react';
import { detectNestjs } from '../../src/detectors/node/nestjs';
import { detectExpress } from '../../src/detectors/node/express';
import { detectOtherNodeFrameworks } from '../../src/detectors/node/other';

// Mock modules
vi.mock('../../src/utils/importScanner.js', () => ({
  scanForImports: vi.fn(),
}));

vi.mock('../../src/utils/file.js', () => ({
  exists: vi.fn(),
}));

// Import mocked functions
import { scanForImports } from '../../src/utils/importScanner.js';
import { exists } from '../../src/utils/file.js';

const mockScanForImports = vi.mocked(scanForImports);
const mockExists = vi.mocked(exists);

describe('Next.js detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null with 0.0 confidence when next not in dependencies', async () => {
    const result = await detectNextjs('/test/project', ['react', 'express']);

    expect(result.framework).toBe(null);
    expect(result.confidence).toBe(0.0);
    expect(result.indicators).toEqual([]);
    expect(mockExists).not.toHaveBeenCalled();
  });

  it('detects nextjs with dependency only (baseline 0.85 confidence)', async () => {
    mockExists.mockResolvedValue(false);

    const result = await detectNextjs('/test/project', ['next']);

    expect(result.framework).toBe('nextjs');
    expect(result.confidence).toBe(0.85);
    expect(result.indicators).toEqual(['next in dependencies']);
  });

  it('detects nextjs with next.config.js (0.95 confidence)', async () => {
    mockExists.mockImplementation(async (path: string) => {
      return path === '/test/project/next.config.js';
    });

    const result = await detectNextjs('/test/project', ['next']);

    expect(result.framework).toBe('nextjs');
    expect(result.confidence).toBeCloseTo(0.95, 2);
    expect(result.indicators).toContain('next in dependencies');
    expect(result.indicators).toContain('next.config.* found');
  });

  it('detects nextjs with next.config.ts (0.95 confidence)', async () => {
    mockExists.mockImplementation(async (path: string) => {
      return path === '/test/project/next.config.ts';
    });

    const result = await detectNextjs('/test/project', ['next']);

    expect(result.framework).toBe('nextjs');
    expect(result.confidence).toBeCloseTo(0.95, 2);
    expect(result.indicators).toContain('next.config.* found');
  });

  it('detects nextjs with app directory - App Router (1.0 confidence)', async () => {
    mockExists.mockImplementation(async (path: string) => {
      return path === '/test/project/next.config.js' || path === '/test/project/app';
    });

    const result = await detectNextjs('/test/project', ['next']);

    expect(result.framework).toBe('nextjs');
    expect(result.confidence).toBe(1.0);
    expect(result.indicators).toContain('next in dependencies');
    expect(result.indicators).toContain('next.config.* found');
    expect(result.indicators).toContain('app/ directory (App Router)');
  });

  it('detects nextjs with pages directory - Pages Router (1.0 confidence)', async () => {
    mockExists.mockImplementation(async (path: string) => {
      return path === '/test/project/next.config.js' || path === '/test/project/pages';
    });

    const result = await detectNextjs('/test/project', ['next']);

    expect(result.framework).toBe('nextjs');
    expect(result.confidence).toBe(1.0);
    expect(result.indicators).toContain('pages/ directory (Pages Router)');
  });

  it('prefers app directory over pages when both present', async () => {
    mockExists.mockImplementation(async (path: string) => {
      return path === '/test/project/app' || path === '/test/project/pages';
    });

    const result = await detectNextjs('/test/project', ['next']);

    expect(result.framework).toBe('nextjs');
    expect(result.indicators).toContain('app/ directory (App Router)');
  });
});

describe('React detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null with 0.0 confidence when react not in dependencies', async () => {
    const result = await detectReact('/test/project', ['express', 'fastify']);

    expect(result.framework).toBe(null);
    expect(result.confidence).toBe(0.0);
    expect(result.indicators).toEqual([]);
  });

  it('returns null when next is present (disambiguation)', async () => {
    const result = await detectReact('/test/project', ['react', 'next']);

    expect(result.framework).toBe(null);
    expect(result.confidence).toBe(0.0);
    expect(result.indicators).toEqual([]);
  });

  it('detects react with dependency only (baseline 0.75 confidence)', async () => {
    mockExists.mockResolvedValue(false);

    const result = await detectReact('/test/project', ['react']);

    expect(result.framework).toBe('react');
    expect(result.confidence).toBe(0.75);
    expect(result.indicators).toEqual(['react in dependencies']);
  });

  it('detects react with App.tsx (0.90 confidence)', async () => {
    mockExists.mockImplementation(async (path: string) => {
      return path === '/test/project/src/App.tsx';
    });

    const result = await detectReact('/test/project', ['react']);

    expect(result.framework).toBe('react');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toContain('react in dependencies');
    expect(result.indicators).toContain('App.tsx/jsx found (React SPA)');
  });

  it('detects react with App.jsx (0.90 confidence)', async () => {
    mockExists.mockImplementation(async (path: string) => {
      return path === '/test/project/src/App.jsx';
    });

    const result = await detectReact('/test/project', ['react']);

    expect(result.framework).toBe('react');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toContain('App.tsx/jsx found (React SPA)');
  });

  it('detects react with Vite (0.85 confidence)', async () => {
    mockExists.mockResolvedValue(false);

    const result = await detectReact('/test/project', ['react', 'vite']);

    expect(result.framework).toBe('react');
    expect(result.confidence).toBe(0.85);
    expect(result.indicators).toContain('react in dependencies');
    expect(result.indicators).toContain('Vite (React build tool)');
  });

  it('detects react with Create React App (0.90 confidence)', async () => {
    mockExists.mockResolvedValue(false);

    const result = await detectReact('/test/project', ['react', 'react-scripts']);

    expect(result.framework).toBe('react');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toContain('react in dependencies');
    expect(result.indicators).toContain('Create React App');
  });

  it('detects react with App.tsx and Vite (0.90 confidence max)', async () => {
    mockExists.mockImplementation(async (path: string) => {
      return path === '/test/project/src/App.tsx';
    });

    const result = await detectReact('/test/project', ['react', 'vite']);

    expect(result.framework).toBe('react');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toContain('App.tsx/jsx found (React SPA)');
    expect(result.indicators).toContain('Vite (React build tool)');
  });
});

describe('Nest.js detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null with 0.0 confidence when @nestjs/core not in dependencies', async () => {
    const result = await detectNestjs('/test/project', ['express', 'react']);

    expect(result.framework).toBe(null);
    expect(result.confidence).toBe(0.0);
    expect(result.indicators).toEqual([]);
    expect(mockScanForImports).not.toHaveBeenCalled();
  });

  it('detects nestjs with dependency only (baseline 0.90 confidence)', async () => {
    mockExists.mockResolvedValue(false);
    mockScanForImports.mockResolvedValue({ found: false, count: 0 });

    const result = await detectNestjs('/test/project', ['@nestjs/core']);

    expect(result.framework).toBe('nestjs');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toEqual(['@nestjs/core in dependencies']);
  });

  it('detects nestjs with src/main.ts (0.95 confidence)', async () => {
    mockExists.mockImplementation(async (path: string) => {
      return path === '/test/project/src/main.ts';
    });
    mockScanForImports.mockResolvedValue({ found: false, count: 0 });

    const result = await detectNestjs('/test/project', ['@nestjs/core']);

    expect(result.framework).toBe('nestjs');
    expect(result.confidence).toBeCloseTo(0.95, 2);
    expect(result.indicators).toContain('@nestjs/core in dependencies');
    expect(result.indicators).toContain('src/main.ts found');
    expect(mockExists).toHaveBeenCalledWith('/test/project/src/main.ts');
  });

  it('detects nestjs with decorators (0.95 confidence)', async () => {
    mockExists.mockResolvedValue(false);
    mockScanForImports.mockResolvedValue({ found: true, count: 4 });

    const result = await detectNestjs('/test/project', ['@nestjs/core']);

    expect(result.framework).toBe('nestjs');
    expect(result.confidence).toBeCloseTo(0.95, 2);
    expect(result.indicators).toContain('@nestjs/core in dependencies');
    expect(result.indicators).toContain('NestJS decorators found (4 occurrences)');
    expect(mockScanForImports).toHaveBeenCalledWith('/test/project', 'nestjs');
  });

  it('detects nestjs with all signals (1.0 confidence)', async () => {
    mockExists.mockImplementation(async (path: string) => {
      return path === '/test/project/src/main.ts';
    });
    mockScanForImports.mockResolvedValue({ found: true, count: 8 });

    const result = await detectNestjs('/test/project', ['@nestjs/core']);

    expect(result.framework).toBe('nestjs');
    expect(result.confidence).toBe(1.0);
    expect(result.indicators).toHaveLength(3);
    expect(result.indicators).toContain('@nestjs/core in dependencies');
    expect(result.indicators).toContain('src/main.ts found');
    expect(result.indicators).toContain('NestJS decorators found (8 occurrences)');
  });
});

describe('Express detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null with 0.0 confidence when express not in dependencies', async () => {
    const result = await detectExpress('/test/project', ['react', 'fastify']);

    expect(result.framework).toBe(null);
    expect(result.confidence).toBe(0.0);
    expect(result.indicators).toEqual([]);
  });

  it('returns null when @nestjs/core is present (disambiguation)', async () => {
    const result = await detectExpress('/test/project', ['express', '@nestjs/core']);

    expect(result.framework).toBe(null);
    expect(result.confidence).toBe(0.0);
    expect(result.indicators).toEqual([]);
  });

  it('detects express with dependency only (baseline 0.80 confidence)', async () => {
    mockExists.mockResolvedValue(false);

    const result = await detectExpress('/test/project', ['express']);

    expect(result.framework).toBe('express');
    expect(result.confidence).toBe(0.80);
    expect(result.indicators).toEqual(['express in dependencies']);
  });

  it('detects express with server.js (0.90 confidence)', async () => {
    mockExists.mockImplementation(async (path: string) => {
      return path === '/test/project/server.js';
    });

    const result = await detectExpress('/test/project', ['express']);

    expect(result.framework).toBe('express');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toContain('express in dependencies');
    expect(result.indicators).toContain('server.js or app.js found');
  });

  it('detects express with src/server.js (0.90 confidence)', async () => {
    mockExists.mockImplementation(async (path: string) => {
      return path === '/test/project/src/server.js';
    });

    const result = await detectExpress('/test/project', ['express']);

    expect(result.framework).toBe('express');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toContain('server.js or app.js found');
  });

  it('detects express with app.js (0.90 confidence)', async () => {
    mockExists.mockImplementation(async (path: string) => {
      return path === '/test/project/app.js';
    });

    const result = await detectExpress('/test/project', ['express']);

    expect(result.framework).toBe('express');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toContain('server.js or app.js found');
  });

  it('detects express with src/app.js (0.90 confidence)', async () => {
    mockExists.mockImplementation(async (path: string) => {
      return path === '/test/project/src/app.js';
    });

    const result = await detectExpress('/test/project', ['express']);

    expect(result.framework).toBe('express');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toContain('server.js or app.js found');
  });
});

describe('Other Node frameworks detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null with 0.0 confidence when no supported framework in dependencies', async () => {
    const result = await detectOtherNodeFrameworks(['react', 'express']);

    expect(result.framework).toBe(null);
    expect(result.confidence).toBe(0.0);
    expect(result.indicators).toEqual([]);
  });

  it('detects fastify with 0.85 confidence', async () => {
    const result = await detectOtherNodeFrameworks(['fastify']);

    expect(result.framework).toBe('fastify');
    expect(result.confidence).toBe(0.85);
    expect(result.indicators).toEqual(['fastify in dependencies']);
  });

  it('detects koa with 0.85 confidence', async () => {
    const result = await detectOtherNodeFrameworks(['koa']);

    expect(result.framework).toBe('koa');
    expect(result.confidence).toBe(0.85);
    expect(result.indicators).toEqual(['koa in dependencies']);
  });

  it('prioritizes fastify over koa when both present', async () => {
    const result = await detectOtherNodeFrameworks(['koa', 'fastify']);

    expect(result.framework).toBe('fastify');
    expect(result.confidence).toBe(0.85);
    expect(result.indicators).toEqual(['fastify in dependencies']);
  });
});

describe('CRITICAL: Disambiguation tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Next.js vs React disambiguation', () => {
    it('should NOT detect React when both Next.js and React deps are present', async () => {
      mockExists.mockResolvedValue(false);

      const reactResult = await detectReact('/test/project', ['next', 'react']);

      expect(reactResult.framework).toBe(null);
      expect(reactResult.confidence).toBe(0.0);
      expect(reactResult.indicators).toEqual([]);
    });

    it('should detect Next.js when both Next.js and React deps are present', async () => {
      mockExists.mockResolvedValue(false);

      const nextResult = await detectNextjs('/test/project', ['next', 'react']);

      expect(nextResult.framework).toBe('nextjs');
      expect(nextResult.confidence).toBeGreaterThanOrEqual(0.85);
      expect(nextResult.indicators).toContain('next in dependencies');
    });

    it('should detect Next.js even when React signals are stronger', async () => {
      mockExists.mockImplementation(async (path: string) => {
        // React has App.tsx but Next.js also present
        return path === '/test/project/src/App.tsx';
      });

      const nextResult = await detectNextjs('/test/project', ['next', 'react', 'vite']);
      const reactResult = await detectReact('/test/project', ['next', 'react', 'vite']);

      expect(nextResult.framework).toBe('nextjs');
      expect(nextResult.confidence).toBeGreaterThanOrEqual(0.85);
      expect(reactResult.framework).toBe(null);
      expect(reactResult.confidence).toBe(0.0);
    });

    it('should detect React when Next.js is absent', async () => {
      mockExists.mockImplementation(async (path: string) => {
        return path === '/test/project/src/App.tsx';
      });

      const reactResult = await detectReact('/test/project', ['react', 'vite']);

      expect(reactResult.framework).toBe('react');
      expect(reactResult.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('Nest.js vs Express disambiguation', () => {
    it('should NOT detect Express when both Nest.js and Express deps are present', async () => {
      mockExists.mockResolvedValue(false);

      const expressResult = await detectExpress('/test/project', ['@nestjs/core', 'express']);

      expect(expressResult.framework).toBe(null);
      expect(expressResult.confidence).toBe(0.0);
      expect(expressResult.indicators).toEqual([]);
    });

    it('should detect Nest.js when both Nest.js and Express deps are present', async () => {
      mockExists.mockResolvedValue(false);
      mockScanForImports.mockResolvedValue({ found: false, count: 0 });

      const nestResult = await detectNestjs('/test/project', ['@nestjs/core', 'express']);

      expect(nestResult.framework).toBe('nestjs');
      expect(nestResult.confidence).toBeGreaterThanOrEqual(0.90);
      expect(nestResult.indicators).toContain('@nestjs/core in dependencies');
    });

    it('should detect Nest.js even when Express signals are stronger', async () => {
      mockExists.mockImplementation(async (path: string) => {
        // Express has server.js but Nest.js also present
        return path === '/test/project/server.js' || path === '/test/project/src/main.ts';
      });
      mockScanForImports.mockResolvedValue({ found: false, count: 0 });

      const nestResult = await detectNestjs('/test/project', ['@nestjs/core', 'express']);
      const expressResult = await detectExpress('/test/project', ['@nestjs/core', 'express']);

      expect(nestResult.framework).toBe('nestjs');
      expect(nestResult.confidence).toBeGreaterThanOrEqual(0.90);
      expect(expressResult.framework).toBe(null);
      expect(expressResult.confidence).toBe(0.0);
    });

    it('should detect Express when Nest.js is absent', async () => {
      mockExists.mockImplementation(async (path: string) => {
        return path === '/test/project/server.js';
      });

      const expressResult = await detectExpress('/test/project', ['express']);

      expect(expressResult.framework).toBe('express');
      expect(expressResult.confidence).toBeGreaterThanOrEqual(0.80);
    });
  });

  describe('Complex multi-framework scenarios', () => {
    it('should handle project with Next.js, React, and multiple other frameworks', async () => {
      mockExists.mockResolvedValue(false);
      mockScanForImports.mockResolvedValue({ found: false, count: 0 });

      const nextResult = await detectNextjs('/test/project', ['next', 'react', 'express', 'fastify']);
      const reactResult = await detectReact('/test/project', ['next', 'react', 'express', 'fastify']);
      const expressResult = await detectExpress('/test/project', ['next', 'react', 'express', 'fastify']);
      const fastifyResult = await detectOtherNodeFrameworks(['next', 'react', 'express', 'fastify']);

      expect(nextResult.framework).toBe('nextjs');
      expect(reactResult.framework).toBe(null);
      expect(expressResult.framework).toBe('express');
      expect(fastifyResult.framework).toBe('fastify');
    });

    it('should handle project with Nest.js, Express, and React', async () => {
      mockExists.mockResolvedValue(false);
      mockScanForImports.mockResolvedValue({ found: false, count: 0 });

      const nestResult = await detectNestjs('/test/project', ['@nestjs/core', 'express', 'react']);
      const expressResult = await detectExpress('/test/project', ['@nestjs/core', 'express', 'react']);
      const reactResult = await detectReact('/test/project', ['@nestjs/core', 'express', 'react']);

      expect(nestResult.framework).toBe('nestjs');
      expect(expressResult.framework).toBe(null);
      expect(reactResult.framework).toBe('react');
    });
  });
});
