import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectFromDependencies } from '../../../../src/engine/analyzers/patterns/index.js';
import { writeFile, mkdir, mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Dependency-based pattern detection', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'pattern-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('FastAPI project patterns', () => {
    it('detects pydantic, sqlalchemy async, pytest, JWT auth, HTTPException', async () => {
      const deps = [
        'fastapi', 'pydantic', 'sqlalchemy', 'asyncpg', 'pytest',
        'python-jose', 'uvicorn',
      ];

      const patterns = await detectFromDependencies(deps, [], 'python', 'fastapi', testDir);

      expect(patterns['validation']?.library).toBe('pydantic');
      expect(patterns['validation']?.confidence).toBe(0.75);
      expect(patterns['validation']?.evidence).toContain('pydantic in dependencies');

      expect(patterns['database']?.library).toBe('sqlalchemy');
      expect(patterns['database']?.variant).toBe('async');
      expect(patterns['database']?.confidence).toBeCloseTo(0.85, 2);
      expect(patterns['database']?.evidence.some(e => e.includes('async driver'))).toBe(true);

      expect(patterns['auth']?.library).toBe('jwt');
      expect(patterns['auth']?.confidence).toBe(0.75);

      expect(patterns['testing']?.library).toBe('pytest');
      expect(patterns['testing']?.confidence).toBe(0.75);

      expect(patterns['errorHandling']?.library).toBe('exceptions');
      expect(patterns['errorHandling']?.variant).toBe('fastapi-httpexception');
      expect(patterns['errorHandling']?.confidence).toBe(0.80);
    });
  });

  describe('Express project patterns', () => {
    it('detects zod, prisma, jest, JWT auth, exceptions', async () => {
      const deps = ['express', 'zod', '@prisma/client', 'jsonwebtoken'];
      const devDeps = ['jest'];

      const patterns = await detectFromDependencies(deps, devDeps, 'node', 'express', testDir);

      expect(patterns['validation']?.library).toBe('zod');
      expect(patterns['validation']?.confidence).toBe(0.75);

      expect(patterns['database']?.library).toBe('prisma');
      expect(patterns['database']?.confidence).toBe(0.80);

      expect(patterns['auth']?.library).toBe('jwt');
      expect(patterns['testing']?.library).toBe('jest');
      expect(patterns['errorHandling']?.library).toBe('exceptions');
      expect(patterns['errorHandling']?.variant).toBe('express');
    });
  });

  describe('Next.js project patterns', () => {
    it('detects zod, prisma, vitest, Clerk auth', async () => {
      const deps = ['next', 'react', 'zod', '@prisma/client', '@clerk/nextjs'];
      const devDeps = ['vitest'];

      const patterns = await detectFromDependencies(deps, devDeps, 'node', 'nextjs', testDir);

      expect(patterns['validation']?.library).toBe('zod');
      expect(patterns['database']?.library).toBe('prisma');
      expect(patterns['auth']?.library).toBe('clerk');
      expect(patterns['auth']?.confidence).toBe(0.90);
      expect(patterns['testing']?.library).toBe('vitest');
    });
  });

  describe('Django project patterns', () => {
    it('detects DRF serializers, Django ORM, pytest, django-auth', async () => {
      const deps = ['Django', 'djangorestframework', 'pytest', 'pytest-django'];

      const patterns = await detectFromDependencies(deps, [], 'python', 'django', testDir);

      expect(patterns['validation']?.library).toBe('drf-serializers');
      expect(patterns['validation']?.confidence).toBe(0.80);

      expect(patterns['database']?.library).toBe('django-orm');
      expect(patterns['database']?.confidence).toBe(1.0);

      expect(patterns['auth']?.library).toBe('django-auth');
      expect(patterns['auth']?.confidence).toBe(0.85);

      expect(patterns['testing']?.library).toBe('pytest');
    });
  });

  describe('Go project patterns', () => {
    it('detects validator, gorm, JWT, error returns', async () => {
      const deps = [
        'github.com/gin-gonic/gin',
        'github.com/go-playground/validator/v10',
        'gorm.io/gorm',
        'github.com/golang-jwt/jwt/v5',
      ];

      const patterns = await detectFromDependencies(deps, [], 'go', 'gin', testDir);

      expect(patterns['validation']?.library).toBe('go-playground-validator');
      expect(patterns['validation']?.confidence).toBe(0.80);

      expect(patterns['database']?.library).toBe('gorm');
      expect(patterns['database']?.confidence).toBe(0.85);

      expect(patterns['auth']?.library).toBe('jwt');

      expect(patterns['errorHandling']?.library).toBe('error-returns');
      expect(patterns['errorHandling']?.confidence).toBe(1.0);
    });
  });

  describe('Generic project patterns', () => {
    it('detects language-level patterns when no framework', async () => {
      const deps = ['requests', 'pytest'];

      const patterns = await detectFromDependencies(deps, [], 'python', null, testDir);

      expect(patterns['testing']?.library).toBe('pytest');
      expect(patterns['errorHandling']?.library).toBe('exceptions');
      expect(patterns['errorHandling']?.variant).toBe('generic');
      expect(patterns['errorHandling']?.confidence).toBe(0.75);
      expect(patterns['validation']).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('returns empty patterns when no dependencies provided', async () => {
      const patterns = await detectFromDependencies([], [], 'python', null, testDir);
      // No deps → no error handling pattern (needs deps.length > 0)
      // No deps → no testing, no validation, no database, no auth
      expect(Object.keys(patterns)).toHaveLength(0);
    });

    it('detects framework-based patterns even with empty deps', async () => {
      // Error handling still detected from framework knowledge
      const patterns = await detectFromDependencies([], [], 'node', 'express', testDir);
      expect(patterns['errorHandling']?.library).toBe('exceptions');
      expect(patterns['errorHandling']?.variant).toBe('express');
      expect(patterns['validation']).toBeUndefined();
      expect(patterns['database']).toBeUndefined();
    });

    it('detects mixed dependencies correctly', async () => {
      const deps = ['joi', 'zod'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['validation']).toBeDefined();
      expect(['zod', 'joi']).toContain(patterns['validation']?.library);
    });

    it('handles unknown project type gracefully', async () => {
      const patterns = await detectFromDependencies([], [], 'rust', null, testDir);
      expect(Object.keys(patterns)).toHaveLength(0);
    });

    it('detects SQLAlchemy sync variant when no async drivers', async () => {
      const deps = ['sqlalchemy', 'psycopg2-binary'];
      const patterns = await detectFromDependencies(deps, [], 'python', null, testDir);

      expect(patterns['database']?.library).toBe('sqlalchemy');
      expect(patterns['database']?.variant).toBe('sync');
      expect(patterns['database']?.confidence).toBe(0.80);
      expect(patterns['database']?.evidence.some(e => e.includes('async driver'))).toBe(false);
    });

    it('Prisma schema from census boosts confidence', async () => {
      const deps = ['@prisma/client'];
      const schemaFiles = [{ orm: 'prisma', sourceRootPath: '.', path: 'prisma/schema.prisma' }];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir, schemaFiles);

      expect(patterns['database']?.library).toBe('prisma');
      expect(patterns['database']?.confidence).toBe(0.95);
      expect(patterns['database']?.evidence).toContain('schema.prisma file found');
    });
  });
});
