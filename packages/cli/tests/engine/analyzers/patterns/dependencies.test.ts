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

    it('detects vee-validate for form handling', async () => {
      const deps = ['vue', 'vee-validate'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['formHandling']?.library).toBe('vee-validate');
      expect(patterns['formHandling']?.confidence).toBe(0.75);
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

  // @ana A004, A011
  describe('Data fetching pattern detection', () => {
    it('detects @tanstack/react-query as dataFetching', async () => {
      const deps = ['react', '@tanstack/react-query'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['dataFetching']?.library).toBe('react-query');
      expect(patterns['dataFetching']?.confidence).toBe(0.75);
      expect(patterns['dataFetching']?.evidence).toContain('@tanstack/react-query in dependencies');
    });

    // @ana A005
    it('detects swr as dataFetching', async () => {
      const deps = ['react', 'swr'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['dataFetching']?.library).toBe('swr');
      expect(patterns['dataFetching']?.confidence).toBe(0.75);
      expect(patterns['dataFetching']?.evidence).toContain('swr in dependencies');
    });

    it('detects @nuxtjs/composition-api as nuxt-composables', async () => {
      const deps = ['nuxt', '@nuxtjs/composition-api'];
      const patterns = await detectFromDependencies(deps, [], 'node', 'nuxt', testDir);

      expect(patterns['dataFetching']?.library).toBe('nuxt-composables');
      expect(patterns['dataFetching']?.confidence).toBe(0.75);
    });

    it('detects apollo-client as dataFetching', async () => {
      const deps = ['react', '@apollo/client'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['dataFetching']?.library).toBe('apollo');
    });

    it('does not detect dataFetching with no relevant deps', async () => {
      const deps = ['react', 'express'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['dataFetching']).toBeUndefined();
    });
  });

  // @ana A006
  describe('State management pattern detection', () => {
    it('detects zustand as stateManagement', async () => {
      const deps = ['react', 'zustand'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['stateManagement']?.library).toBe('zustand');
      expect(patterns['stateManagement']?.confidence).toBe(0.75);
      expect(patterns['stateManagement']?.evidence).toContain('zustand in dependencies');
    });

    it('detects jotai as stateManagement', async () => {
      const deps = ['react', 'jotai'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['stateManagement']?.library).toBe('jotai');
      expect(patterns['stateManagement']?.confidence).toBe(0.75);
    });

    it('detects recoil as stateManagement', async () => {
      const deps = ['react', 'recoil'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['stateManagement']?.library).toBe('recoil');
    });

    // @ana A007
    it('detects pinia as stateManagement', async () => {
      const deps = ['vue', 'pinia'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['stateManagement']?.library).toBe('pinia');
      expect(patterns['stateManagement']?.confidence).toBe(0.75);
      expect(patterns['stateManagement']?.evidence).toContain('pinia in dependencies');
    });

    it('detects @pinia/nuxt as stateManagement', async () => {
      const deps = ['nuxt', '@pinia/nuxt'];
      const patterns = await detectFromDependencies(deps, [], 'node', 'nuxt', testDir);

      expect(patterns['stateManagement']?.library).toBe('pinia');
    });

    // @ana A008
    it('detects @reduxjs/toolkit as stateManagement', async () => {
      const deps = ['react', '@reduxjs/toolkit'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['stateManagement']?.library).toBe('redux-toolkit');
      expect(patterns['stateManagement']?.confidence).toBe(0.75);
      expect(patterns['stateManagement']?.evidence).toContain('@reduxjs/toolkit in dependencies');
    });

    it('detects vuex as stateManagement', async () => {
      const deps = ['vue', 'vuex'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['stateManagement']?.library).toBe('vuex');
    });

    it('does not detect stateManagement with no relevant deps', async () => {
      const deps = ['react', 'express'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['stateManagement']).toBeUndefined();
    });
  });

  // @ana A009
  describe('Form handling pattern detection', () => {
    it('detects react-hook-form as formHandling', async () => {
      const deps = ['react', 'react-hook-form'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['formHandling']?.library).toBe('react-hook-form');
      expect(patterns['formHandling']?.confidence).toBe(0.75);
      expect(patterns['formHandling']?.evidence).toContain('react-hook-form in dependencies');
    });

    // @ana A010
    it('detects formik as formHandling', async () => {
      const deps = ['react', 'formik'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['formHandling']?.library).toBe('formik');
      expect(patterns['formHandling']?.confidence).toBe(0.75);
      expect(patterns['formHandling']?.evidence).toContain('formik in dependencies');
    });

    it('detects vee-validate as formHandling', async () => {
      const deps = ['vue', 'vee-validate'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['formHandling']?.library).toBe('vee-validate');
      expect(patterns['formHandling']?.confidence).toBe(0.75);
    });

    it('does not detect formHandling with no relevant deps', async () => {
      const deps = ['react', 'express'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['formHandling']).toBeUndefined();
    });
  });

  // @ana A031, A032, A033
  describe('Combined deep-tier detection', () => {
    it('detects all three categories in a React project', async () => {
      const deps = ['react', '@tanstack/react-query', 'zustand', 'react-hook-form'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['dataFetching']?.library).toBe('react-query');
      expect(patterns['stateManagement']?.library).toBe('zustand');
      expect(patterns['formHandling']?.library).toBe('react-hook-form');
    });

    it('detects Vue ecosystem libraries', async () => {
      const deps = ['vue', 'pinia', 'vee-validate'];
      const patterns = await detectFromDependencies(deps, [], 'node', null, testDir);

      expect(patterns['stateManagement']?.library).toBe('pinia');
      expect(patterns['formHandling']?.library).toBe('vee-validate');
    });

    it('returns no hook patterns when deps are empty', async () => {
      const patterns = await detectFromDependencies([], [], 'node', null, testDir);

      expect(patterns['dataFetching']).toBeUndefined();
      expect(patterns['stateManagement']).toBeUndefined();
      expect(patterns['formHandling']).toBeUndefined();
    });
  });
});
