import { describe, it, expect } from 'vitest';
import { confirmPatternsWithTreeSitter } from '../../../../src/engine/analyzers/patterns.js';
import type { AnalysisResult, ParsedFile } from '../../../../src/engine/types/index.js';
import type { PatternConfidence } from '../../../../src/engine/types/patterns.js';

// Helper to create mock ParsedFile
function createMockParsedFile(
  file: string,
  language: string,
  imports: Array<{ module: string; names: string[] }> = [],
  classes: Array<{ name: string; superclasses: string[] }> = [],
  functions: Array<{ name: string; async: boolean; decorators: string[] }> = [],
  decorators: Array<{ name: string; arguments: string[]; line: number }> = []
): ParsedFile {
  return {
    file,
    language,
    functions: functions.map(f => ({ ...f, line: 1 })),
    classes: classes.map(c => ({ ...c, line: 1, methods: [], decorators: [] })),
    imports: imports.map(i => ({ ...i, line: 1 })),
    decorators,
    parseTime: 10,
    parseMethod: 'tree-sitter',
    errors: 0,
  };
}

describe('Tree-sitter Pattern Confirmation', () => {
  describe('Validation Pattern Confirmation', () => {
    it('boosts Pydantic confidence when BaseModel imports found', async () => {
      const analysis: AnalysisResult = {
        projectType: 'python',
        framework: 'fastapi',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'app/models.py',
              'python',
              [{ module: 'pydantic', names: ['BaseModel', 'Field'] }],
              [{ name: 'User', superclasses: ['BaseModel'] }]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        validation: {
          library: 'pydantic',
          confidence: 0.75,
          evidence: ['pydantic in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['validation']?.confidence).toBeGreaterThan(0.75);
      expect(confirmed['validation']?.confidence).toBeLessThanOrEqual(1.0);
      expect(confirmed['validation']?.evidence).toContain('Pydantic imports found in code');
      expect(confirmed['validation']?.evidence.some(e => e.includes('Pydantic model(s)'))).toBe(true);
    });

    it('boosts Zod confidence when zod imports found', async () => {
      const analysis: AnalysisResult = {
        projectType: 'node',
        framework: 'express',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'src/schemas.ts',
              'typescript',
              [{ module: 'zod', names: ['z'] }]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        validation: {
          library: 'zod',
          confidence: 0.75,
          evidence: ['zod in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['validation']?.confidence).toBeGreaterThanOrEqual(0.90);
      expect(confirmed['validation']?.evidence).toContain('Zod imports found in code');
    });

    it('does not boost confidence when imports not found', async () => {
      const analysis: AnalysisResult = {
        projectType: 'python',
        framework: null,
        confidence: { projectType: 0.95, framework: 0.0 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile('app/main.py', 'python', [], [], []),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        validation: {
          library: 'pydantic',
          confidence: 0.75,
          evidence: ['pydantic in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      // No boost (imports not found)
      expect(confirmed['validation']?.confidence).toBe(0.75);
      expect(confirmed['validation']?.evidence).toHaveLength(1);  // Only dependency evidence
    });

    it('confirms Joi validation library', async () => {
      const analysis: AnalysisResult = {
        projectType: 'node',
        framework: 'express',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'src/validation.js',
              'javascript',
              [{ module: 'joi', names: ['Joi'] }]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        validation: {
          library: 'joi',
          confidence: 0.75,
          evidence: ['joi in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['validation']?.confidence).toBeGreaterThanOrEqual(0.90);
      expect(confirmed['validation']?.evidence).toContain('Joi imports found in code');
    });

    it('confirms class-validator via decorators', async () => {
      const analysis: AnalysisResult = {
        projectType: 'node',
        framework: 'nestjs',
        confidence: { projectType: 0.95, framework: 0.95 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'src/dto/user.dto.ts',
              'typescript',
              [],
              [],
              [],
              [
                { name: 'IsString', arguments: [], line: 5 },
                { name: 'IsEmail', arguments: [], line: 7 },
              ]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        validation: {
          library: 'class-validator',
          confidence: 0.75,
          evidence: ['class-validator in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['validation']?.confidence).toBeGreaterThanOrEqual(0.90);
      expect(confirmed['validation']?.evidence).toContain('Validation decorators found');
    });

    it('confirms DRF serializers', async () => {
      const analysis: AnalysisResult = {
        projectType: 'python',
        framework: 'django',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'api/serializers.py',
              'python',
              [],
              [
                { name: 'UserSerializer', superclasses: ['ModelSerializer'] },
                { name: 'PostSerializer', superclasses: ['Serializer'] },
              ]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        validation: {
          library: 'drf-serializers',
          confidence: 0.80,
          evidence: ['djangorestframework in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['validation']?.confidence).toBeGreaterThanOrEqual(0.95);
      expect(confirmed['validation']?.evidence.some(e => e.includes('DRF Serializer'))).toBe(true);
    });
  });

  describe('Database Pattern Confirmation', () => {
    it('confirms SQLAlchemy async variant and boosts confidence', async () => {
      const analysis: AnalysisResult = {
        projectType: 'python',
        framework: 'fastapi',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'app/database.py',
              'python',
              [{ module: 'sqlalchemy.ext.asyncio', names: ['AsyncSession', 'create_async_engine'] }],
              [],
              [{ name: 'get_db', async: true, decorators: [] }]
            ),
            createMockParsedFile(
              'app/routes/users.py',
              'python',
              [],
              [],
              [{ name: 'get_users', async: true, decorators: ['app.get("/users")'] }]
            ),
          ],
          totalParsed: 2,
          cacheHits: 0,
          cacheMisses: 2,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        database: {
          library: 'sqlalchemy',
          variant: 'async',
          confidence: 0.80,
          evidence: ['sqlalchemy + asyncpg in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['database']?.variant).toBe('async');
      expect(confirmed['database']?.confidence).toBeGreaterThan(0.80);
      expect(confirmed['database']?.evidence).toContain('AsyncSession imports found (async variant confirmed)');
      expect(confirmed['database']?.evidence.some(e => e.includes('async route handler'))).toBe(true);
    });

    it('detects SQLAlchemy sync variant when Session imports found', async () => {
      const analysis: AnalysisResult = {
        projectType: 'python',
        framework: 'flask',
        confidence: { projectType: 0.95, framework: 0.85 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'app/database.py',
              'python',
              [{ module: 'sqlalchemy.orm', names: ['Session', 'sessionmaker'] }]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        database: {
          library: 'sqlalchemy',
          variant: 'sync',
          confidence: 0.80,
          evidence: ['sqlalchemy in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['database']?.variant).toBe('sync');
      expect(confirmed['database']?.evidence).toContain('Session imports found (sync variant confirmed)');
    });

    it('confirms Prisma when PrismaClient imports found', async () => {
      const analysis: AnalysisResult = {
        projectType: 'node',
        framework: 'nextjs',
        confidence: { projectType: 0.95, framework: 0.95 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'lib/db.ts',
              'typescript',
              [{ module: '@prisma/client', names: ['PrismaClient'] }]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        database: {
          library: 'prisma',
          confidence: 0.80,
          evidence: ['@prisma/client in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['database']?.confidence).toBeGreaterThanOrEqual(0.95);
      expect(confirmed['database']?.evidence).toContain('PrismaClient imports found');
    });

    it('confirms TypeORM', async () => {
      const analysis: AnalysisResult = {
        projectType: 'node',
        framework: 'nestjs',
        confidence: { projectType: 0.95, framework: 0.95 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'src/entities/user.entity.ts',
              'typescript',
              [{ module: 'typeorm', names: ['Entity', 'Column'] }]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        database: {
          library: 'typeorm',
          confidence: 0.75,
          evidence: ['typeorm in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['database']?.confidence).toBeGreaterThanOrEqual(0.90);
      expect(confirmed['database']?.evidence).toContain('TypeORM imports found');
    });

    it('confirms GORM for Go projects', async () => {
      const analysis: AnalysisResult = {
        projectType: 'go',
        framework: 'gin',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'models/user.go',
              'go',
              [{ module: 'gorm.io/gorm', names: ['Model'] }]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        database: {
          library: 'gorm',
          confidence: 0.85,
          evidence: ['gorm.io/gorm in go.mod'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['database']?.confidence).toBeGreaterThanOrEqual(0.95);
      expect(confirmed['database']?.evidence).toContain('GORM imports found');
    });

    it('confirms Sequelize', async () => {
      const analysis: AnalysisResult = {
        projectType: 'node',
        framework: 'express',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'models/user.js',
              'javascript',
              [{ module: 'sequelize', names: ['DataTypes', 'Model'] }]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        database: {
          library: 'sequelize',
          confidence: 0.75,
          evidence: ['sequelize in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['database']?.confidence).toBeGreaterThanOrEqual(0.90);
      expect(confirmed['database']?.evidence).toContain('Sequelize imports found');
    });
  });

  describe('Auth Pattern Confirmation', () => {
    it('confirms JWT when imports found', async () => {
      const analysis: AnalysisResult = {
        projectType: 'python',
        framework: 'fastapi',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'app/auth.py',
              'python',
              [
                { module: 'jose', names: ['jwt'] },
                { module: 'fastapi.security', names: ['OAuth2PasswordBearer'] },
              ]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        auth: {
          library: 'oauth2-jwt',
          confidence: 0.75,
          evidence: ['JWT library in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['auth']?.confidence).toBeGreaterThanOrEqual(0.90);
      expect(confirmed['auth']?.evidence).toContain('JWT library imports found in code');
    });

    it('confirms Clerk auth', async () => {
      const analysis: AnalysisResult = {
        projectType: 'node',
        framework: 'nextjs',
        confidence: { projectType: 0.95, framework: 0.95 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'app/providers.tsx',
              'tsx',
              [{ module: '@clerk/nextjs', names: ['ClerkProvider'] }]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        auth: {
          library: 'clerk',
          confidence: 0.90,
          evidence: ['@clerk/nextjs in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['auth']?.confidence).toBeGreaterThanOrEqual(0.90);
      expect(confirmed['auth']?.evidence).toContain('Auth library imports confirmed');
    });

    it('confirms Passport session auth', async () => {
      const analysis: AnalysisResult = {
        projectType: 'node',
        framework: 'express',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'src/auth/passport.js',
              'javascript',
              [{ module: 'passport', names: ['use', 'initialize'] }]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        auth: {
          library: 'passport',
          confidence: 0.80,
          evidence: ['passport in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['auth']?.confidence).toBeGreaterThanOrEqual(0.95);
      expect(confirmed['auth']?.evidence).toContain('Session auth imports found');
    });
  });

  describe('Testing Pattern Confirmation', () => {
    it('boosts testing confidence when test directory detected', async () => {
      const analysis: AnalysisResult = {
        projectType: 'python',
        framework: 'fastapi',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        structure: {
          directories: {},
          entryPoints: ['app/main.py'],
          testLocation: 'tests/',  // From STEP_1.2
          architecture: 'layered',
          directoryTree: '',
          configFiles: ['pytest.ini'],
          confidence: {
            entryPoints: 1.0,
            testLocation: 1.0,
            architecture: 0.90,
            overall: 0.95,
          },
        },
        parsed: {
          files: [],
          totalParsed: 0,
          cacheHits: 0,
          cacheMisses: 0,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        testing: {
          library: 'pytest',
          confidence: 0.75,
          evidence: ['pytest in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['testing']?.confidence).toBeGreaterThanOrEqual(0.90);
      expect(confirmed['testing']?.evidence).toContain('Test directory detected: tests/');
    });

    it('confirms jest with test imports', async () => {
      const analysis: AnalysisResult = {
        projectType: 'node',
        framework: 'express',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        structure: {
          directories: {},
          entryPoints: ['src/index.ts'],
          testLocation: '__tests__/',
          architecture: 'layered',
          directoryTree: '',
          configFiles: ['jest.config.js'],
          confidence: {
            entryPoints: 1.0,
            testLocation: 1.0,
            architecture: 0.90,
            overall: 0.95,
          },
        },
        parsed: {
          files: [
            createMockParsedFile(
              '__tests__/user.test.js',
              'javascript',
              [{ module: 'jest', names: ['describe', 'it', 'expect'] }]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        testing: {
          library: 'jest',
          confidence: 0.90,  // Already boosted by config file
          evidence: ['jest in devDependencies', 'jest.config.js found'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['testing']?.confidence).toBeGreaterThanOrEqual(0.95);
      expect(confirmed['testing']?.evidence).toContain('Test directory detected: __tests__/');
      expect(confirmed['testing']?.evidence).toContain('jest imports found');
    });

    it('confirms Go test files', async () => {
      const analysis: AnalysisResult = {
        projectType: 'go',
        framework: 'gin',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        structure: {
          directories: {},
          entryPoints: ['main.go'],
          testLocation: '*_test.go',
          architecture: 'layered',
          directoryTree: '',
          configFiles: [],
          confidence: {
            entryPoints: 1.0,
            testLocation: 1.0,
            architecture: 0.85,
            overall: 0.92,
          },
        },
        parsed: {
          files: [],
          totalParsed: 0,
          cacheHits: 0,
          cacheMisses: 0,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        testing: {
          library: 'go-test',
          confidence: 0.95,
          evidence: ['Go test convention'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['testing']?.confidence).toBe(1.0);
      expect(confirmed['testing']?.evidence.some(e => e.includes('*_test.go'))).toBe(true);
    });
  });

  describe('Error Handling Pattern Confirmation', () => {
    it('boosts confidence when route decorators found', async () => {
      const analysis: AnalysisResult = {
        projectType: 'python',
        framework: 'fastapi',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: Array.from({ length: 12 }, (_, i) =>
            createMockParsedFile(
              `app/routes/route${i}.py`,
              'python',
              [{ module: 'fastapi', names: ['FastAPI'] }],
              [],
              [{ name: `handler${i}`, async: true, decorators: [`app.get("/route${i}")`] }]
            )
          ),
          totalParsed: 12,
          cacheHits: 0,
          cacheMisses: 12,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        errorHandling: {
          library: 'exceptions',
          variant: 'fastapi-httpexception',
          confidence: 0.80,
          evidence: ['FastAPI uses HTTPException for error handling'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['errorHandling']?.confidence).toBeGreaterThan(0.80);
      expect(confirmed['errorHandling']?.evidence.some(e => e.includes('file(s) with error'))).toBe(true);
    });

    it('boosts confidence when HTTPException imports found', async () => {
      const analysis: AnalysisResult = {
        projectType: 'python',
        framework: 'fastapi',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'app/main.py',
              'python',
              [{ module: 'fastapi', names: ['FastAPI', 'HTTPException'] }]
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        errorHandling: {
          library: 'exceptions',
          variant: 'fastapi-httpexception',
          confidence: 0.80,
          evidence: ['FastAPI uses HTTPException for error handling'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['errorHandling']?.confidence).toBeGreaterThan(0.80);
      expect(confirmed['errorHandling']?.evidence).toContain('HTTPException imports found');
    });

    it('confirms Go error returns', async () => {
      const analysis: AnalysisResult = {
        projectType: 'go',
        framework: 'gin',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [],
          totalParsed: 0,
          cacheHits: 0,
          cacheMisses: 0,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        errorHandling: {
          library: 'error-returns',
          confidence: 1.0,
          evidence: ['Go uses error return values (language convention)'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      expect(confirmed['errorHandling']?.confidence).toBe(1.0);
      expect(confirmed['errorHandling']?.evidence).toContain('Go error return convention confirmed');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing parsed data gracefully', async () => {
      const analysis: AnalysisResult = {
        projectType: 'python',
        framework: null,
        confidence: { projectType: 0.95, framework: 0.0 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        // No parsed field (skipParsing:true scenario)
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        validation: {
          library: 'pydantic',
          confidence: 0.75,
          evidence: ['pydantic in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      // No boost (no parsed data available)
      expect(confirmed['validation']?.confidence).toBe(0.75);
      expect(confirmed['validation']?.evidence).toHaveLength(1);  // Only dependency evidence
    });

    it('handles empty parsed files array', async () => {
      const analysis: AnalysisResult = {
        projectType: 'python',
        framework: null,
        confidence: { projectType: 0.95, framework: 0.0 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [],  // Empty array
          totalParsed: 0,
          cacheHits: 0,
          cacheMisses: 0,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        validation: {
          library: 'zod',
          confidence: 0.75,
          evidence: ['zod in dependencies'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      // No boost (no files to analyze)
      expect(confirmed['validation']?.confidence).toBe(0.75);
    });

    it('handles patterns with no confirmation function', async () => {
      const analysis: AnalysisResult = {
        projectType: 'rust',  // Supported for detection but not parsing
        framework: 'axum',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [],
          totalParsed: 0,
          cacheHits: 0,
          cacheMisses: 0,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {};

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      // Should not crash, returns empty
      expect(Object.keys(confirmed)).toHaveLength(0);
    });

    it('caps confidence at 1.0', async () => {
      const analysis: AnalysisResult = {
        projectType: 'python',
        framework: 'fastapi',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'app/models.py',
              'python',
              [{ module: 'pydantic', names: ['BaseModel'] }],
              Array.from({ length: 20 }, (_, i) => ({
                name: `Model${i}`,
                superclasses: ['BaseModel']
              }))
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        validation: {
          library: 'pydantic',
          confidence: 0.95,  // Already high
          evidence: ['pydantic in dependencies', 'config file found'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      // Should cap at 1.0, not exceed
      expect(confirmed['validation']?.confidence).toBeLessThanOrEqual(1.0);
    });

    it('preserves patterns not found in parsed data', async () => {
      const analysis: AnalysisResult = {
        projectType: 'python',
        framework: 'fastapi',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.2.0',
        parsed: {
          files: [
            createMockParsedFile(
              'app/main.py',
              'python',
              [{ module: 'fastapi', names: ['FastAPI'] }]  // No pydantic imports
            ),
          ],
          totalParsed: 1,
          cacheHits: 0,
          cacheMisses: 1,
        },
      };

      const initialPatterns: Partial<Record<string, PatternConfidence>> = {
        validation: {
          library: 'pydantic',
          confidence: 0.75,
          evidence: ['pydantic in dependencies'],
        },
        auth: {
          library: 'oauth2-jwt',
          confidence: 0.75,
          evidence: ['FastAPI OAuth2 patterns expected'],
        },
      };

      const confirmed = await confirmPatternsWithTreeSitter('', initialPatterns, analysis);

      // Validation not boosted (no imports found)
      expect(confirmed['validation']?.confidence).toBe(0.75);
      // Auth not boosted (no imports found)
      expect(confirmed['auth']?.confidence).toBe(0.75);
      // Both patterns still present
      expect(confirmed['validation']).toBeDefined();
      expect(confirmed['auth']).toBeDefined();
    });
  });
});
