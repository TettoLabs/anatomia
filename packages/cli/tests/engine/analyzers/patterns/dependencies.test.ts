import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectFromDependencies } from '../../../../src/engine/analyzers/patterns/index.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { rm } from 'fs/promises';

describe('Dependency-based pattern detection', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temp directory for each test
    testDir = await mkdtemp(join(tmpdir(), 'pattern-test-'));
  });

  afterEach(async () => {
    // Cleanup
    await rm(testDir, { recursive: true, force: true });
  });

  describe('FastAPI project patterns', () => {
    it('detects pydantic, sqlalchemy async, pytest, JWT auth, HTTPException', async () => {
      // Create requirements.txt with FastAPI dependencies
      await writeFile(
        join(testDir, 'requirements.txt'),
        `fastapi==0.115.0
pydantic==2.10.0
sqlalchemy==2.0.36
asyncpg==0.30.0
pytest==8.3.4
python-jose[cryptography]==3.3.0
uvicorn==0.34.0`
      );

      const patterns = await detectFromDependencies(testDir, 'python', 'fastapi');

      // Validation pattern
      expect(patterns['validation']).toBeDefined();
      expect(patterns['validation']?.library).toBe('pydantic');
      expect(patterns['validation']?.confidence).toBe(0.75);
      expect(patterns['validation']?.evidence).toContain('pydantic in dependencies');

      // Database pattern with async variant
      expect(patterns['database']).toBeDefined();
      expect(patterns['database']?.library).toBe('sqlalchemy');
      expect(patterns['database']?.variant).toBe('async');  // asyncpg detected
      expect(patterns['database']?.confidence).toBeCloseTo(0.85, 2);  // With companion boost (floating point tolerance)
      expect(patterns['database']?.evidence.some(e => e.includes('async driver'))).toBe(true);

      // Auth pattern
      expect(patterns['auth']).toBeDefined();
      expect(patterns['auth']?.library).toBe('jwt');
      expect(patterns['auth']?.confidence).toBe(0.75);

      // Testing pattern
      expect(patterns['testing']).toBeDefined();
      expect(patterns['testing']?.library).toBe('pytest');
      expect(patterns['testing']?.confidence).toBe(0.75);

      // Error handling pattern
      expect(patterns['errorHandling']).toBeDefined();
      expect(patterns['errorHandling']?.library).toBe('exceptions');
      expect(patterns['errorHandling']?.variant).toBe('fastapi-httpexception');
      expect(patterns['errorHandling']?.confidence).toBe(0.80);
    });
  });

  describe('Express project patterns', () => {
    it('detects zod, prisma, jest, JWT auth, exceptions', async () => {
      // Create package.json with Express dependencies
      const packageJson = {
        name: 'express-api',
        dependencies: {
          express: '^4.21.2',
          zod: '^3.24.1',
          '@prisma/client': '^6.1.0',
          jsonwebtoken: '^9.0.2',
        },
        devDependencies: {
          jest: '^29.7.0',
        },
      };

      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const patterns = await detectFromDependencies(testDir, 'node', 'express');

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
      const packageJson = {
        name: 'nextjs-app',
        dependencies: {
          next: '^15.1.6',
          react: '^19.0.0',
          zod: '^3.24.1',
          '@prisma/client': '^6.1.0',
          '@clerk/nextjs': '^6.10.2',
        },
        devDependencies: {
          vitest: '^4.1.0',
        },
      };

      await writeFile(join(testDir, 'package.json'), JSON.stringify(packageJson));

      const patterns = await detectFromDependencies(testDir, 'node', 'nextjs');

      expect(patterns['validation']?.library).toBe('zod');
      expect(patterns['database']?.library).toBe('prisma');
      expect(patterns['auth']?.library).toBe('clerk');
      expect(patterns['auth']?.confidence).toBe(0.90);  // Higher for third-party
      expect(patterns['testing']?.library).toBe('vitest');
    });
  });

  describe('Django project patterns', () => {
    it('detects DRF serializers, Django ORM, pytest, django-auth', async () => {
      await writeFile(
        join(testDir, 'requirements.txt'),
        `Django==5.1.0
djangorestframework==3.15.2
pytest==8.3.4
pytest-django==4.9.0`
      );

      const patterns = await detectFromDependencies(testDir, 'python', 'django');

      expect(patterns['validation']?.library).toBe('drf-serializers');
      expect(patterns['validation']?.confidence).toBe(0.80);

      expect(patterns['database']?.library).toBe('django-orm');
      expect(patterns['database']?.confidence).toBe(1.0);  // Built-in

      expect(patterns['auth']?.library).toBe('django-auth');
      expect(patterns['auth']?.confidence).toBe(0.85);

      expect(patterns['testing']?.library).toBe('pytest');
    });
  });

  describe('Go project patterns', () => {
    it('detects validator, gorm, JWT, error returns', async () => {
      await writeFile(
        join(testDir, 'go.mod'),
        `module github.com/user/project

go 1.22

require (
  github.com/gin-gonic/gin v1.10.0
  github.com/go-playground/validator/v10 v10.24.0
  gorm.io/gorm v1.25.12
  github.com/golang-jwt/jwt/v5 v5.2.1
)`
      );

      const patterns = await detectFromDependencies(testDir, 'go', 'gin');

      expect(patterns['validation']?.library).toBe('go-playground-validator');
      expect(patterns['validation']?.confidence).toBe(0.80);

      expect(patterns['database']?.library).toBe('gorm');
      expect(patterns['database']?.confidence).toBe(0.85);

      expect(patterns['auth']?.library).toBe('jwt');

      expect(patterns['errorHandling']?.library).toBe('error-returns');
      expect(patterns['errorHandling']?.confidence).toBe(1.0);  // Go convention
    });
  });

  describe('Generic project patterns', () => {
    it('detects language-level patterns when no framework', async () => {
      await writeFile(
        join(testDir, 'requirements.txt'),
        `requests==2.32.3
pytest==8.3.4`
      );

      const patterns = await detectFromDependencies(testDir, 'python', null);

      // Should detect testing even without framework
      expect(patterns['testing']?.library).toBe('pytest');

      // Should detect generic error handling for Python
      expect(patterns['errorHandling']?.library).toBe('exceptions');
      expect(patterns['errorHandling']?.variant).toBe('generic');
      expect(patterns['errorHandling']?.confidence).toBe(0.75);

      // Should NOT detect framework-specific patterns (no pydantic, no fastapi)
      expect(patterns['validation']).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('returns empty patterns when no dependency files exist', async () => {
      // Empty directory - no requirements.txt, package.json, go.mod
      const patterns = await detectFromDependencies(testDir, 'python', null);

      expect(Object.keys(patterns)).toHaveLength(0);
    });

    it('handles malformed dependency files gracefully', async () => {
      // Corrupted JSON
      await writeFile(join(testDir, 'package.json'), '{ invalid json }');

      const patterns = await detectFromDependencies(testDir, 'node', 'express');

      // Should not crash
      expect(patterns).toBeDefined();
      // Error handling still detected from framework knowledge (doesn't require deps)
      expect(patterns['errorHandling']?.library).toBe('exceptions');
      expect(patterns['errorHandling']?.variant).toBe('express');
      // But other patterns not detected (require valid dependency parsing)
      expect(patterns['validation']).toBeUndefined();
      expect(patterns['database']).toBeUndefined();
    });

    it('detects mixed dependencies correctly', async () => {
      // Project with both Joi AND Zod (migration scenario)
      const packageJson = {
        dependencies: {
          joi: '^17.13.3',
          zod: '^3.24.1',
        },
      };

      await writeFile(join(testDir, 'package.json'), JSON.stringify(packageJson));

      const patterns = await detectFromDependencies(testDir, 'node', null);

      // Should detect Zod (checked first in current implementation)
      expect(patterns['validation']).toBeDefined();
      expect(['zod', 'joi']).toContain(patterns['validation']?.library);
    });

    it('handles unknown project type gracefully', async () => {
      const patterns = await detectFromDependencies(testDir, 'rust', null);

      // Unsupported project type - returns empty
      expect(Object.keys(patterns)).toHaveLength(0);
    });

    it('detects SQLAlchemy sync variant when no async drivers', async () => {
      await writeFile(
        join(testDir, 'requirements.txt'),
        `sqlalchemy==2.0.36
psycopg2-binary==2.9.10`  // Sync driver, not asyncpg
      );

      const patterns = await detectFromDependencies(testDir, 'python', null);

      expect(patterns['database']?.library).toBe('sqlalchemy');
      expect(patterns['database']?.variant).toBe('sync');  // No async driver
      expect(patterns['database']?.confidence).toBe(0.80);  // No companion boost
      expect(patterns['database']?.evidence.some(e => e.includes('async driver'))).toBe(false);
    });
  });
});
