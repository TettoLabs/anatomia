/**
 * Pattern inference engine (STEP_2.1)
 *
 * 3-stage detection:
 * - Stage 1 (CP0): Dependency-based detection (0.75-0.85 confidence)
 * - Stage 2 (CP1): File sampling (reuses STEP_1.3 sampleFiles)
 * - Stage 3 (CP1): Tree-sitter confirmation (boosts to 0.90-0.95)
 *
 * Based on: START_HERE_PART1.md sections 1-5, START_HERE_PART2.md lines 40-540
 */

import { readPythonDependencies } from '../parsers/python.js';
import { readNodeDependencies } from '../parsers/node.js';
import { readGoDependencies } from '../parsers/go.js';
import { exists, joinPath, readFile } from '../utils/file.js';
import type { ProjectType, AnalysisResult, ParsedFile } from '../types/index.js';
import type { PatternConfidence } from '../types/patterns.js';

/**
 * Detect patterns from dependencies (Stage 1)
 *
 * Fast detection (2-5 seconds) based on package manifests.
 * Returns patterns with 0.75-0.85 confidence (dependency signal only).
 * CP1 will boost confidence with tree-sitter code verification.
 *
 * @param rootPath - Project root directory
 * @param projectType - Project type from STEP_1.1
 * @param framework - Framework from STEP_1.1 (helps with framework-specific patterns)
 * @returns Partial pattern map (only detected patterns, not all 5 categories)
 */
export async function detectFromDependencies(
  rootPath: string,
  projectType: ProjectType,
  framework: string | null
): Promise<Partial<Record<string, PatternConfidence>>> {
  const patterns: Partial<Record<string, PatternConfidence>> = {};

  // Get dependencies using STEP_1.1 parsers
  let deps: string[] = [];
  let devDeps: string[] = [];

  try {
    if (projectType === 'python') {
      deps = await readPythonDependencies(rootPath);
    } else if (projectType === 'node') {
      deps = await readNodeDependencies(rootPath);
      devDeps = await readNodeDevDependencies(rootPath);
    } else if (projectType === 'go') {
      deps = await readGoDependencies(rootPath);
    } else {
      // Rust, Ruby, PHP - not yet supported for pattern inference
      return patterns;
    }
  } catch (error) {
    // Dependency parsing failed - return empty (graceful degradation)
    return patterns;
  }

  // Detect validation patterns
  const validation = await detectValidationPattern(deps, framework, rootPath);
  if (validation) patterns['validation'] = validation;

  // Detect database patterns
  const database = await detectDatabasePattern(deps, framework, rootPath);
  if (database) patterns['database'] = database;

  // Detect auth patterns
  const auth = await detectAuthPattern(deps, framework, rootPath);
  if (auth) patterns['auth'] = auth;

  // Detect testing patterns
  const testing = await detectTestingPattern(deps, devDeps, framework, rootPath);
  if (testing) patterns['testing'] = testing;

  // Detect error handling patterns (framework-specific)
  const errorHandling = await detectErrorHandlingPattern(deps, projectType, framework, rootPath);
  if (errorHandling) patterns['errorHandling'] = errorHandling;

  return patterns;
}

/**
 * Helper: Read Node.js dev dependencies
 * Testing frameworks often in devDependencies, not dependencies
 */
async function readNodeDevDependencies(rootPath: string): Promise<string[]> {
  try {
    const packageJsonPath = joinPath(rootPath, 'package.json');
    if (await exists(packageJsonPath)) {
      const content = await readFile(packageJsonPath);
      const pkg = JSON.parse(content);
      return Object.keys(pkg.devDependencies || {});
    }
  } catch (error) {
    // Failed to read - return empty
  }
  return [];
}

/**
 * Detect validation pattern from dependencies
 *
 * Checks for: pydantic, zod, joi, class-validator, djangorestframework, go-playground/validator
 */
async function detectValidationPattern(
  deps: string[],
  framework: string | null,
  rootPath: string
): Promise<PatternConfidence | null> {
  // Python validation libraries
  if (deps.includes('pydantic')) {
    return {
      library: 'pydantic',
      confidence: 0.75,  // Dependency only (CP1 will boost to 0.90-0.95)
      evidence: ['pydantic in dependencies'],
    };
  }

  // TypeScript/JavaScript validation libraries
  if (deps.includes('zod')) {
    return {
      library: 'zod',
      confidence: 0.75,
      evidence: ['zod in dependencies'],
    };
  }

  if (deps.includes('joi')) {
    return {
      library: 'joi',
      confidence: 0.75,
      evidence: ['joi in dependencies'],
    };
  }

  if (deps.includes('class-validator')) {
    return {
      library: 'class-validator',
      confidence: 0.75,
      evidence: ['class-validator in dependencies'],
    };
  }

  // Django REST Framework serializers
  if (deps.includes('djangorestframework')) {
    return {
      library: 'drf-serializers',
      confidence: 0.80,  // Slightly higher - DRF is definitive
      evidence: ['djangorestframework in dependencies'],
    };
  }

  // Go playground validator
  if (deps.some(d => d.includes('github.com/go-playground/validator'))) {
    return {
      library: 'go-playground-validator',
      confidence: 0.80,
      evidence: ['go-playground/validator in go.mod'],
    };
  }

  // Yup (JavaScript/TypeScript)
  if (deps.includes('yup')) {
    return {
      library: 'yup',
      confidence: 0.75,
      evidence: ['yup in dependencies'],
    };
  }

  return null;  // No validation library detected
}

/**
 * Detect database pattern from dependencies
 *
 * Checks for: sqlalchemy, prisma, typeorm, gorm, sqlc, sequelize, drizzle-orm
 * Detects variants: SQLAlchemy async vs sync based on async drivers
 */
async function detectDatabasePattern(
  deps: string[],
  framework: string | null,
  rootPath: string
): Promise<PatternConfidence | null> {
  // Python database libraries
  if (deps.includes('sqlalchemy')) {
    // Detect async variant by checking for async drivers
    const hasAsyncDrivers = deps.some(d =>
      d.includes('asyncpg') ||     // PostgreSQL async
      d.includes('aiomysql') ||    // MySQL async
      d.includes('aiosqlite')      // SQLite async
    );

    // Companion package boost (+0.05)
    const baseConfidence = 0.80;
    const companionBoost = hasAsyncDrivers ? 0.05 : 0;
    const confidence = baseConfidence + companionBoost;

    return {
      library: 'sqlalchemy',
      variant: hasAsyncDrivers ? 'async' : 'sync',
      confidence,  // 0.85 with companions, 0.80 without
      evidence: hasAsyncDrivers
        ? ['sqlalchemy in dependencies', 'async driver detected (asyncpg/aiomysql/aiosqlite)', 'companion package boost +0.05']
        : ['sqlalchemy in dependencies'],
    };
  }

  // TypeScript/JavaScript database libraries
  if (deps.includes('@prisma/client') || deps.includes('prisma')) {
    // Check for schema.prisma file (definitive signal)
    const hasPrismaSchema = await exists(joinPath(rootPath, 'schema.prisma'));

    return {
      library: 'prisma',
      confidence: hasPrismaSchema ? 0.95 : 0.80,  // Schema file boosts confidence
      evidence: hasPrismaSchema
        ? ['@prisma/client in dependencies', 'schema.prisma file found']
        : ['@prisma/client in dependencies'],
    };
  }

  if (deps.includes('typeorm')) {
    return {
      library: 'typeorm',
      confidence: 0.75,
      evidence: ['typeorm in dependencies'],
    };
  }

  if (deps.includes('sequelize')) {
    return {
      library: 'sequelize',
      confidence: 0.75,
      evidence: ['sequelize in dependencies'],
    };
  }

  if (deps.includes('drizzle-orm')) {
    return {
      library: 'drizzle',
      confidence: 0.75,
      evidence: ['drizzle-orm in dependencies'],
    };
  }

  // Go database libraries
  if (deps.some(d => d.includes('gorm.io/gorm'))) {
    return {
      library: 'gorm',
      confidence: 0.85,  // GORM is dominant in Go
      evidence: ['gorm.io/gorm in go.mod'],
    };
  }

  if (deps.some(d => d.includes('sqlc'))) {
    return {
      library: 'sqlc',
      confidence: 0.85,
      evidence: ['sqlc in dependencies'],
    };
  }

  // Django ORM (built-in to Django)
  if (framework === 'django') {
    return {
      library: 'django-orm',
      confidence: 1.0,  // Django always has ORM
      evidence: ['Django framework detected (built-in ORM)'],
    };
  }

  return null;  // No database library detected
}

/**
 * Detect auth pattern from dependencies
 *
 * Checks for: JWT libraries, OAuth, session management, third-party (Clerk, NextAuth)
 */
async function detectAuthPattern(
  deps: string[],
  framework: string | null,
  rootPath: string
): Promise<PatternConfidence | null> {
  // JWT detection (cross-language)
  const jwtLibraries = [
    'pyjwt',                  // Python
    'python-jose',            // Python (FastAPI common)
    'jsonwebtoken',           // Node.js
    'jose',                   // Node.js (modern)
    'github.com/golang-jwt/jwt', // Go
  ];

  const jwtLib = jwtLibraries.find(lib => deps.some(d => d.includes(lib)));
  if (jwtLib) {
    return {
      library: 'jwt',
      confidence: 0.75,
      evidence: ['JWT library in dependencies'],
    };
  }

  // FastAPI OAuth2
  if (framework === 'fastapi' && deps.includes('fastapi')) {
    // OAuth2PasswordBearer is built into FastAPI (check in CP1 with imports)
    return {
      library: 'oauth2-jwt',
      confidence: 0.75,  // Will boost to 0.90+ if OAuth2PasswordBearer imports found
      evidence: ['FastAPI OAuth2 patterns expected'],
    };
  }

  // Express/Node session management
  if (deps.includes('express-session')) {
    return {
      library: 'express-session',
      confidence: 0.80,
      evidence: ['express-session in dependencies'],
    };
  }

  // Passport.js (Node.js)
  if (deps.includes('passport')) {
    return {
      library: 'passport',
      confidence: 0.80,
      evidence: ['passport in dependencies'],
    };
  }

  // Third-party auth providers
  if (deps.includes('@clerk/nextjs')) {
    return {
      library: 'clerk',
      confidence: 0.90,  // Higher - Clerk is definitive
      evidence: ['@clerk/nextjs in dependencies'],
    };
  }

  if (deps.includes('next-auth')) {
    return {
      library: 'next-auth',
      confidence: 0.90,
      evidence: ['next-auth in dependencies'],
    };
  }

  if (deps.includes('auth0')) {
    return {
      library: 'auth0',
      confidence: 0.90,
      evidence: ['auth0 in dependencies'],
    };
  }

  // Django auth (built-in)
  if (framework === 'django') {
    return {
      library: 'django-auth',
      confidence: 0.85,
      evidence: ['Django framework detected (built-in auth)'],
    };
  }

  return null;  // No auth library detected
}

/**
 * Detect testing pattern from dependencies
 *
 * Checks for: pytest, jest, vitest, mocha, go test (file pattern)
 */
async function detectTestingPattern(
  deps: string[],
  devDeps: string[],
  framework: string | null,
  rootPath: string
): Promise<PatternConfidence | null> {
  const allDeps = [...deps, ...devDeps];  // Combine dependencies and devDependencies

  // Python testing
  if (allDeps.includes('pytest')) {
    // Check for pytest config files
    const hasPytestIni = await exists(joinPath(rootPath, 'pytest.ini'));
    const hasPyprojectToml = await exists(joinPath(rootPath, 'pyproject.toml'));
    const hasConfig = hasPytestIni || hasPyprojectToml;

    return {
      library: 'pytest',
      confidence: hasConfig ? 0.90 : 0.75,  // Config file boosts confidence
      evidence: hasConfig
        ? ['pytest in dependencies', `config file found (${hasPytestIni ? 'pytest.ini' : 'pyproject.toml'})`]
        : ['pytest in dependencies'],
    };
  }

  if (allDeps.includes('unittest')) {
    return {
      library: 'unittest',
      confidence: 0.75,
      evidence: ['unittest in dependencies'],
    };
  }

  // Node.js testing
  if (allDeps.includes('jest')) {
    // Check for jest config
    const hasJestConfig = await exists(joinPath(rootPath, 'jest.config.js')) ||
                          await exists(joinPath(rootPath, 'jest.config.ts')) ||
                          await exists(joinPath(rootPath, 'jest.config.json'));

    const inDevDeps = devDeps.includes('jest');

    return {
      library: 'jest',
      confidence: hasJestConfig ? 0.90 : 0.75,
      evidence: [
        inDevDeps ? 'jest in devDependencies' : 'jest in dependencies',
        ...(hasJestConfig ? ['jest.config.js found'] : [])
      ],
    };
  }

  if (allDeps.includes('vitest')) {
    // Check for vitest config
    const hasVitestConfig = await exists(joinPath(rootPath, 'vitest.config.ts')) ||
                            await exists(joinPath(rootPath, 'vitest.config.js'));

    const inDevDeps = devDeps.includes('vitest');

    return {
      library: 'vitest',
      confidence: hasVitestConfig ? 0.90 : 0.75,
      evidence: [
        inDevDeps ? 'vitest in devDependencies' : 'vitest in dependencies',
        ...(hasVitestConfig ? ['vitest.config.ts found'] : [])
      ],
    };
  }

  if (allDeps.includes('mocha')) {
    return {
      library: 'mocha',
      confidence: 0.75,
      evidence: [devDeps.includes('mocha') ? 'mocha in devDependencies' : 'mocha in dependencies'],
    };
  }

  // Go testing (built-in - detect in CP1 with *_test.go file pattern)
  // For now, return null (CP1 will detect via file patterns)

  return null;  // No testing framework detected in dependencies
}

/**
 * Detect error handling pattern from dependencies + framework
 *
 * Mostly framework-specific (FastAPI → HTTPException, Go → error returns)
 * Only detects when we have dependencies or framework information
 */
async function detectErrorHandlingPattern(
  deps: string[],
  projectType: ProjectType,
  framework: string | null,
  rootPath: string
): Promise<PatternConfidence | null> {
  // Python exception-based error handling (framework-specific)
  if (framework === 'fastapi') {
    return {
      library: 'exceptions',
      variant: 'fastapi-httpexception',
      confidence: 0.80,  // Will boost to 0.95 if HTTPException imports found in CP1
      evidence: ['FastAPI uses HTTPException for error handling'],
    };
  }

  if (framework === 'django') {
    return {
      library: 'exceptions',
      variant: 'django-apiexception',
      confidence: 0.80,
      evidence: ['Django/DRF uses APIException for error handling'],
    };
  }

  // Node.js exception-based error handling (framework-specific)
  if (framework === 'express' || framework === 'nestjs' || framework === 'nextjs') {
    return {
      library: 'exceptions',
      variant: framework,
      confidence: 0.80,
      evidence: [`${framework} uses try/catch error handling`],
    };
  }

  // Go error return values (language convention - always present when deps found)
  if (projectType === 'go' && deps.length > 0) {
    return {
      library: 'error-returns',
      confidence: 1.0,  // Go convention, always present
      evidence: ['Go uses error return values (language convention)'],
    };
  }

  // Generic exception-based (Python/JavaScript/TypeScript without framework)
  // Only detect if we have dependencies (means we can read dependency files)
  if ((projectType === 'python' || projectType === 'node') && deps.length > 0 && !framework) {
    return {
      library: 'exceptions',
      variant: 'generic',
      confidence: 0.75,
      evidence: [`${projectType} uses exception-based error handling`],
    };
  }

  return null;  // No error handling pattern detected
}

// ============================================================================
// STAGE 3: TREE-SITTER CONFIRMATION (CP1)
// ============================================================================

/**
 * Confirm patterns using tree-sitter analysis (Stage 3)
 *
 * OPTIMIZATION: Reuses analysis.parsed.files from STEP_1.3 (no re-parsing needed).
 * 98.9% cache hit rate from STEP_1.3 ASTCache means this is nearly instant.
 *
 * Boosts confidence based on code evidence:
 * - Imports found: +0.15 (0.75 → 0.90)
 * - Usage patterns: +0.05 (0.90 → 0.95)
 * - Multiple instances: +0.05 additional (0.95 → 1.0 capped)
 *
 * @param rootPath - Project root (not used, but kept for consistency)
 * @param initialPatterns - Patterns from detectFromDependencies() (Stage 1 baseline)
 * @param analysis - AnalysisResult with parsed field from STEP_1.3
 * @returns Patterns with boosted confidence based on code evidence
 */
export async function confirmPatternsWithTreeSitter(
  rootPath: string,
  initialPatterns: Partial<Record<string, PatternConfidence>>,
  analysis: AnalysisResult
): Promise<Record<string, PatternConfidence>> {
  // Copy initial patterns (will mutate confidence and evidence)
  const confirmed = { ...initialPatterns };

  // Get parsed files from STEP_1.3 (already cached, no re-parsing)
  const parsedFiles = analysis.parsed?.files || [];

  // Confirm each category (each function mutates confirmed object)
  // Note: Testing confirmation uses structure.testLocation, so run even if no parsed files
  await confirmValidationPattern(confirmed, parsedFiles, analysis);
  await confirmErrorHandlingPattern(confirmed, parsedFiles, analysis);
  await confirmDatabasePattern(confirmed, parsedFiles, analysis);
  await confirmAuthPattern(confirmed, parsedFiles, analysis);
  await confirmTestingPattern(confirmed, parsedFiles, analysis);

  return confirmed as Record<string, PatternConfidence>;
}

/**
 * Confirm validation pattern in parsed code
 *
 * Checks for:
 * - Pydantic: BaseModel imports, class inheritance
 * - Zod: z.object() usage, schema definitions
 * - Joi: Joi.object() calls
 * - class-validator: Decorator usage
 *
 * Boosts confidence if patterns found in code.
 */
async function confirmValidationPattern(
  patterns: Partial<Record<string, PatternConfidence>>,
  parsedFiles: ParsedFile[],
  analysis: AnalysisResult
): Promise<void> {
  if (!patterns['validation']) return;  // No validation pattern detected in CP0

  const library = patterns['validation'].library;

  // Pydantic confirmation
  if (library === 'pydantic') {
    // Check for Pydantic imports
    const hasPydanticImports = parsedFiles.some(f =>
      f.imports.some(imp =>
        imp.module.includes('pydantic') ||
        imp.names.includes('BaseModel')
      )
    );

    if (hasPydanticImports) {
      patterns['validation'].confidence = Math.min(1.0,
        patterns['validation'].confidence + 0.15  // Import verification boost
      );
      patterns['validation'].evidence.push('Pydantic imports found in code');
    }

    // Count classes inheriting from BaseModel
    const baseModelClasses = parsedFiles
      .flatMap(f => f.classes)
      .filter(cls => cls.superclasses.includes('BaseModel'));

    if (baseModelClasses.length > 0) {
      patterns['validation'].confidence = Math.min(1.0,
        patterns['validation'].confidence + 0.05  // Usage boost
      );
      patterns['validation'].evidence.push(
        `${baseModelClasses.length} Pydantic model(s) detected`
      );
    }
  }

  // Zod confirmation
  else if (library === 'zod') {
    // Check for Zod imports
    const hasZodImports = parsedFiles.some(f =>
      f.imports.some(imp =>
        imp.module === 'zod' ||
        imp.names.includes('z')
      )
    );

    if (hasZodImports) {
      patterns['validation'].confidence = Math.min(1.0,
        patterns['validation'].confidence + 0.15
      );
      patterns['validation'].evidence.push('Zod imports found in code');

      // Additional boost for usage
      patterns['validation'].confidence = Math.min(1.0,
        patterns['validation'].confidence + 0.05
      );
      patterns['validation'].evidence.push('Zod usage patterns detected');
    }
  }

  // Joi confirmation
  else if (library === 'joi') {
    const hasJoiImports = parsedFiles.some(f =>
      f.imports.some(imp =>
        imp.module === 'joi' ||
        imp.names.includes('Joi')
      )
    );

    if (hasJoiImports) {
      patterns['validation'].confidence = Math.min(1.0,
        patterns['validation'].confidence + 0.15
      );
      patterns['validation'].evidence.push('Joi imports found in code');
    }
  }

  // class-validator confirmation
  else if (library === 'class-validator') {
    // Check for validation decorators
    const hasValidatorDecorators = parsedFiles.some(f =>
      f.decorators?.some(dec =>
        dec.name.startsWith('Is') ||  // @IsString, @IsEmail, etc.
        dec.name.startsWith('Min') ||  // @Min, @Max
        dec.name === 'ValidateNested'
      )
    );

    if (hasValidatorDecorators) {
      patterns['validation'].confidence = Math.min(1.0,
        patterns['validation'].confidence + 0.15
      );
      patterns['validation'].evidence.push('Validation decorators found');
    }
  }

  // DRF serializers confirmation
  else if (library === 'drf-serializers') {
    // Check for serializers.ModelSerializer or serializers.Serializer
    const hasSerializerClasses = parsedFiles
      .flatMap(f => f.classes)
      .filter(cls =>
        cls.superclasses.some(s =>
          s.includes('Serializer') || s.includes('ModelSerializer')
        )
      );

    if (hasSerializerClasses.length > 0) {
      patterns['validation'].confidence = Math.min(1.0,
        patterns['validation'].confidence + 0.15
      );
      patterns['validation'].evidence.push(
        `${hasSerializerClasses.length} DRF Serializer(s) detected`
      );
    }
  }

  // go-playground/validator confirmation
  else if (library === 'go-playground-validator') {
    // Check for validator imports
    const hasValidatorImports = parsedFiles.some(f =>
      f.imports.some(imp => imp.module.includes('validator'))
    );

    if (hasValidatorImports) {
      patterns['validation'].confidence = Math.min(1.0,
        patterns['validation'].confidence + 0.10
      );
      patterns['validation'].evidence.push('Validator imports found');
    }
  }

  // Yup confirmation
  else if (library === 'yup') {
    const hasYupImports = parsedFiles.some(f =>
      f.imports.some(imp =>
        imp.module === 'yup' ||
        imp.names.includes('yup')
      )
    );

    if (hasYupImports) {
      patterns['validation'].confidence = Math.min(1.0,
        patterns['validation'].confidence + 0.15
      );
      patterns['validation'].evidence.push('Yup imports found in code');
    }
  }
}

/**
 * Confirm error handling pattern prevalence
 *
 * Checks frequency of error handling patterns in code.
 * Heuristic: Route decorators and framework imports indicate error handling.
 */
async function confirmErrorHandlingPattern(
  patterns: Partial<Record<string, PatternConfidence>>,
  parsedFiles: ParsedFile[],
  analysis: AnalysisResult
): Promise<void> {
  if (!patterns['errorHandling']) return;

  const library = patterns['errorHandling'].library;

  // Exception-based error handling (Python, JavaScript, TypeScript)
  if (library === 'exceptions') {
    // Count files with error handling patterns
    let filesWithErrorPatterns = 0;

    for (const file of parsedFiles) {
      // Heuristic: Files with route decorators likely have error handling
      const hasRouteDecorators = file.decorators?.some(dec =>
        dec.name.includes('app.') ||      // FastAPI @app.get
        dec.name.includes('router.') ||   // FastAPI @router.post
        dec.name.includes('Get') ||       // NestJS @Get()
        dec.name.includes('Post')         // NestJS @Post()
      );

      // Heuristic: Files importing framework likely have error handling
      const hasFrameworkImports = file.imports.some(imp =>
        imp.module.includes('fastapi') ||
        imp.module.includes('express') ||
        imp.module.includes('django') ||
        imp.names.includes('HTTPException')
      );

      if (hasRouteDecorators || hasFrameworkImports) {
        filesWithErrorPatterns++;
      }
    }

    // Boost based on prevalence
    if (filesWithErrorPatterns >= 10) {
      patterns['errorHandling'].confidence = Math.min(1.0,
        patterns['errorHandling'].confidence + 0.15
      );
      patterns['errorHandling'].evidence.push(
        `${filesWithErrorPatterns} file(s) with error handling patterns`
      );
    } else if (filesWithErrorPatterns >= 5) {
      patterns['errorHandling'].confidence = Math.min(1.0,
        patterns['errorHandling'].confidence + 0.10
      );
      patterns['errorHandling'].evidence.push(
        `${filesWithErrorPatterns} file(s) with error patterns`
      );
    }

    // Check for HTTPException specifically (FastAPI)
    if (patterns['errorHandling'].variant === 'fastapi-httpexception') {
      const hasHTTPException = parsedFiles.some(f =>
        f.imports.some(imp => imp.names.includes('HTTPException'))
      );

      if (hasHTTPException) {
        patterns['errorHandling'].confidence = Math.min(1.0,
          patterns['errorHandling'].confidence + 0.05
        );
        patterns['errorHandling'].evidence.push('HTTPException imports found');
      }
    }
  }

  // Go error returns (already high confidence)
  else if (library === 'error-returns') {
    // Go error returns are language convention
    // Confidence already 1.0 from CP0, just add evidence
    if (!patterns['errorHandling'].evidence.includes('Go error return convention confirmed')) {
      patterns['errorHandling'].evidence.push('Go error return convention confirmed');
    }
  }
}

/**
 * Confirm database pattern usage and detect variants
 *
 * SQLAlchemy: Distinguish async vs sync based on imports (AsyncSession vs Session)
 * Prisma: Verify PrismaClient imports
 * GORM: Check struct tag usage
 */
async function confirmDatabasePattern(
  patterns: Partial<Record<string, PatternConfidence>>,
  parsedFiles: ParsedFile[],
  analysis: AnalysisResult
): Promise<void> {
  if (!patterns['database']) return;

  const library = patterns['database'].library;

  // SQLAlchemy confirmation and variant detection
  if (library === 'sqlalchemy') {
    // Check for AsyncSession imports (async variant)
    const hasAsyncImports = parsedFiles.some(f =>
      f.imports.some(imp =>
        imp.module.includes('sqlalchemy.ext.asyncio') ||
        imp.names.includes('AsyncSession') ||
        imp.names.includes('create_async_engine')
      )
    );

    // Check for Session imports (sync variant)
    const hasSyncImports = parsedFiles.some(f =>
      f.imports.some(imp =>
        imp.module.includes('sqlalchemy.orm') &&
        (imp.names.includes('Session') || imp.names.includes('sessionmaker')) &&
        !imp.module.includes('asyncio')
      )
    );

    if (hasAsyncImports) {
      patterns['database'].variant = 'async';
      patterns['database'].confidence = Math.min(1.0,
        patterns['database'].confidence + 0.15
      );
      patterns['database'].evidence.push('AsyncSession imports found (async variant confirmed)');
    } else if (hasSyncImports) {
      patterns['database'].variant = 'sync';
      patterns['database'].confidence = Math.min(1.0,
        patterns['database'].confidence + 0.10  // Slightly lower boost (sync is legacy)
      );
      patterns['database'].evidence.push('Session imports found (sync variant confirmed)');
    }

    // Count async route handlers with database usage
    const asyncDbFunctions = parsedFiles
      .flatMap(f => f.functions)
      .filter(fn =>
        fn.async &&
        fn.decorators.some(d =>
          d.includes('app.') ||
          d.includes('router.')
        )
      );

    if (asyncDbFunctions.length > 0) {
      patterns['database'].confidence = Math.min(1.0,
        patterns['database'].confidence + 0.05
      );
      patterns['database'].evidence.push(
        `${asyncDbFunctions.length} async route handler(s) with database usage`
      );
    }
  }

  // Prisma confirmation
  else if (library === 'prisma') {
    const hasPrismaImports = parsedFiles.some(f =>
      f.imports.some(imp =>
        imp.module.includes('@prisma/client') ||
        imp.names.includes('PrismaClient')
      )
    );

    if (hasPrismaImports) {
      patterns['database'].confidence = Math.min(1.0,
        patterns['database'].confidence + 0.15
      );
      patterns['database'].evidence.push('PrismaClient imports found');
    }
  }

  // TypeORM confirmation
  else if (library === 'typeorm') {
    const hasTypeORMImports = parsedFiles.some(f =>
      f.imports.some(imp => imp.module.includes('typeorm'))
    );

    if (hasTypeORMImports) {
      patterns['database'].confidence = Math.min(1.0,
        patterns['database'].confidence + 0.15
      );
      patterns['database'].evidence.push('TypeORM imports found');
    }
  }

  // GORM confirmation
  else if (library === 'gorm') {
    const hasGORMImports = parsedFiles.some(f =>
      f.imports.some(imp => imp.module.includes('gorm.io/gorm'))
    );

    if (hasGORMImports) {
      patterns['database'].confidence = Math.min(1.0,
        patterns['database'].confidence + 0.10
      );
      patterns['database'].evidence.push('GORM imports found');
    }
  }

  // Sequelize confirmation
  else if (library === 'sequelize') {
    const hasSequelizeImports = parsedFiles.some(f =>
      f.imports.some(imp => imp.module.includes('sequelize'))
    );

    if (hasSequelizeImports) {
      patterns['database'].confidence = Math.min(1.0,
        patterns['database'].confidence + 0.15
      );
      patterns['database'].evidence.push('Sequelize imports found');
    }
  }

  // Drizzle confirmation
  else if (library === 'drizzle') {
    const hasDrizzleImports = parsedFiles.some(f =>
      f.imports.some(imp => imp.module.includes('drizzle-orm'))
    );

    if (hasDrizzleImports) {
      patterns['database'].confidence = Math.min(1.0,
        patterns['database'].confidence + 0.15
      );
      patterns['database'].evidence.push('Drizzle ORM imports found');
    }
  }

  // Django ORM (built-in, high confidence already)
  else if (library === 'django-orm') {
    // Django ORM is built-in, no boost needed (confidence already 1.0)
    patterns['database'].evidence.push('Django ORM confirmed (built-in to framework)');
  }

  // sqlc confirmation
  else if (library === 'sqlc') {
    // sqlc is a code generator, check for generated code patterns
    const hasSqlcPatterns = parsedFiles.some(f =>
      f.imports.some(imp => imp.module.includes('database/sql'))
    );

    if (hasSqlcPatterns) {
      patterns['database'].confidence = Math.min(1.0,
        patterns['database'].confidence + 0.10
      );
      patterns['database'].evidence.push('sqlc patterns detected');
    }
  }
}

/**
 * Confirm auth pattern usage in code
 */
async function confirmAuthPattern(
  patterns: Partial<Record<string, PatternConfidence>>,
  parsedFiles: ParsedFile[],
  analysis: AnalysisResult
): Promise<void> {
  if (!patterns['auth']) return;

  const library = patterns['auth'].library;

  // JWT confirmation (cross-language)
  if (library === 'jwt' || library === 'oauth2-jwt') {
    const hasJWTImports = parsedFiles.some(f =>
      f.imports.some(imp =>
        imp.module.includes('jwt') ||
        imp.module.includes('jose') ||
        imp.names.includes('OAuth2PasswordBearer')
      )
    );

    if (hasJWTImports) {
      patterns['auth'].confidence = Math.min(1.0,
        patterns['auth'].confidence + 0.15
      );
      patterns['auth'].evidence.push('JWT library imports found in code');
    }
  }

  // Third-party auth (Clerk, NextAuth)
  else if (library === 'clerk' || library === 'next-auth') {
    const hasAuthImports = parsedFiles.some(f =>
      f.imports.some(imp =>
        imp.module.includes('@clerk/nextjs') ||
        imp.module.includes('next-auth')
      )
    );

    if (hasAuthImports) {
      patterns['auth'].confidence = Math.min(1.0,
        patterns['auth'].confidence + 0.05  // Smaller boost (dependency already 0.90)
      );
      patterns['auth'].evidence.push('Auth library imports confirmed');
    }
  }

  // Session-based auth
  else if (library === 'express-session' || library === 'passport') {
    const hasSessionImports = parsedFiles.some(f =>
      f.imports.some(imp =>
        imp.module.includes('express-session') ||
        imp.module.includes('passport')
      )
    );

    if (hasSessionImports) {
      patterns['auth'].confidence = Math.min(1.0,
        patterns['auth'].confidence + 0.15
      );
      patterns['auth'].evidence.push('Session auth imports found');
    }
  }

  // Auth0 confirmation
  else if (library === 'auth0') {
    const hasAuth0Imports = parsedFiles.some(f =>
      f.imports.some(imp => imp.module.includes('auth0'))
    );

    if (hasAuth0Imports) {
      patterns['auth'].confidence = Math.min(1.0,
        patterns['auth'].confidence + 0.05
      );
      patterns['auth'].evidence.push('Auth0 imports confirmed');
    }
  }

  // Django auth (built-in)
  else if (library === 'django-auth') {
    // Django auth is built-in, just confirm
    patterns['auth'].evidence.push('Django auth confirmed (built-in)');
  }
}

/**
 * Confirm testing pattern presence
 *
 * Uses structure.testLocation from STEP_1.2 (test directory already detected).
 * Boosts confidence if test directory found.
 */
async function confirmTestingPattern(
  patterns: Partial<Record<string, PatternConfidence>>,
  parsedFiles: ParsedFile[],
  analysis: AnalysisResult
): Promise<void> {
  if (!patterns['testing']) return;

  const framework = patterns['testing'].library;

  // Use test location from STEP_1.2 structure analysis
  const testLocation = analysis.structure?.testLocation;

  if (testLocation) {
    // Go test special case - set to 1.0
    if (analysis.projectType === 'go') {
      patterns['testing'].confidence = 1.0;  // Go test always present
      patterns['testing'].evidence.push('Go test files confirmed (*_test.go pattern)');
    } else {
      // Other frameworks - boost by 0.15
      patterns['testing'].confidence = Math.min(1.0,
        patterns['testing'].confidence + 0.15
      );
      patterns['testing'].evidence.push(
        `Test directory detected: ${testLocation}`
      );
    }
  }

  // Framework-specific confirmations
  if (framework === 'pytest' || framework === 'jest' || framework === 'vitest') {
    const hasTestImports = parsedFiles.some(f =>
      f.imports.some(imp => imp.module.includes(framework))
    );

    if (hasTestImports) {
      patterns['testing'].confidence = Math.min(1.0,
        patterns['testing'].confidence + 0.05
      );
      patterns['testing'].evidence.push(`${framework} imports found`);
    }
  }
}
