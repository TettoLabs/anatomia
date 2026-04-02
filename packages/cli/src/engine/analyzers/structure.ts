/**
 * Structure analysis for Anatomia
 *
 * Analyzes project directory structure to detect:
 * - Entry points (where execution starts)
 * - Test locations (where tests live)
 * - Architecture pattern (layered, domain-driven, microservices, etc.)
 * - Directory tree (ASCII representation)
 *
 * Implementation status:
 * - CP0: Interfaces and placeholders ✓
 * - CP1: Entry point detection (in progress)
 * - CP2: Architecture classification (planned)
 * - CP3: Test location + integration (planned)
 */

import { glob } from 'glob';
import { exists, readFile, joinPath, isDirectory } from '../utils/file.js';
import type { ProjectType } from '../types/index.js';
import type {
  StructureAnalysis,
  EntryPointResult,
  ArchitectureResult,
  TestLocationResult,
} from '../types/structure.js';
import { createEmptyStructureAnalysis } from '../types/structure.js';
import { basename } from 'node:path';
import { walkDirectories } from '../utils/directory.js';

/**
 * Entry point patterns per project type (priority-ordered)
 *
 * Checked in order - first match wins.
 * Percentages from analyzing 50+ real projects per framework.
 *
 * Source: START_HERE_PART1.md lines 508-599 (validated against real projects)
 */

/**
 * Directory purpose mapping (basename → purpose description)
 */
const DIRECTORY_PURPOSES: Record<string, string> = {
  // Source code
  'src': 'Source code',
  'lib': 'Library code',
  'app': 'Application code',
  'api': 'API endpoints',
  'routes': 'API routes',
  'controllers': 'Request controllers',
  'handlers': 'Request handlers',
  'models': 'Data models',
  'schemas': 'Data schemas',
  'services': 'Service modules',
  'domain': 'Domain logic',
  'core': 'Core modules',
  'utils': 'Utility functions',
  'helpers': 'Helper functions',
  'middleware': 'Request middleware',
  'middlewares': 'Request middleware',
  'config': 'Configuration',
  'shared': 'Shared utilities',
  'common': 'Common utilities',
  // Tests
  'tests': 'Tests',
  'test': 'Tests',
  '__tests__': 'Jest tests',
  'spec': 'Spec tests',
  'e2e': 'End-to-end tests',
  'integration': 'Integration tests',
  'cypress': 'Cypress tests',
  'playwright': 'Playwright tests',
  'fixtures': 'Test fixtures',
  // Documentation
  'docs': 'Documentation',
  'documentation': 'Documentation',
  // Frontend
  'components': 'UI components',
  'pages': 'Page routes',
  'views': 'View templates',
  'layouts': 'Layout components',
  'styles': 'Stylesheets',
  'css': 'Stylesheets',
  'scss': 'Sass stylesheets',
  'public': 'Public static files',
  'static': 'Static files',
  'assets': 'Assets',
  'web': 'Web assets',
  'hooks': 'React hooks',
  'store': 'State management',
  'stores': 'State management',
  // Backend
  'migrations': 'Database migrations',
  'alembic': 'Database migrations (Python)',
  'schema': 'Database schema',
  'database': 'Database code',
  'db': 'Database code',
  'seeds': 'Database seeds',
  'repositories': 'Data repositories',
  'prisma': 'Prisma schema',
  'supabase': 'Supabase config',
  'drizzle': 'Drizzle config',
  // Features/Modules (DDD)
  'features': 'Feature modules',
  'modules': 'Feature modules',
  'contexts': 'Bounded contexts',
  'domains': 'Domain modules',
  'infrastructure': 'Infrastructure code',
  // Multiple services (Microservices)
  'apps': 'Applications',
  'packages': 'Workspace packages',
  // Go-specific
  'cmd': 'CLI commands',
  'internal': 'Internal packages',
  'pkg': 'Public packages',
  // Build/Generated
  'dist': 'Build output',
  'build': 'Build output',
  'out': 'Build output',
  '.next': 'Next.js build cache',
  '.nuxt': 'Nuxt build cache',
  'target': 'Rust build output',
  // CI/CD and tooling
  '.github': 'GitHub config',
  '.vscode': 'VS Code config',
  '.idea': 'JetBrains config',
  'scripts': 'Build/utility scripts',
  'tools': 'Development tools',
  'deployments': 'Deployment configs',
  'docker': 'Docker configurations',
  'templates': 'Template files',
  'examples': 'Example code',
  'benchmarks': 'Performance benchmarks',
  // Ruby/Rails
  'concerns': 'Rails concerns',
  'mailers': 'Email mailers',
  'jobs': 'Background jobs',
  'workers': 'Worker processes',
  'tasks': 'Rake tasks',
  // PHP/Laravel
  'resources': 'Application resources',
  'providers': 'Service providers',
  // Misc
  'vendor': 'Third-party dependencies',
  'locales': 'Internationalization',
  'i18n': 'Internationalization',
  'types': 'Type definitions',
  'generated': 'Generated code',
  'protos': 'Protocol buffer definitions',
  'graphql': 'GraphQL schemas',
};

/**
 * Map directory paths to purpose descriptions
 * @param directories
 */
function mapDirectoriesToPurposes(directories: string[]): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const dir of directories) {
    const base = basename(dir);
    mapped[dir] = DIRECTORY_PURPOSES[base] || 'Unknown';
  }
  return mapped;
}

/**
 * Detect layered architecture pattern
 * @param directories
 */
function isLayeredArchitecture(directories: string[]): {
  match: boolean;
  confidence: number;
  indicators: string[];
} {
  const indicators: string[] = [];

  const hasModels = directories.some(d => d.includes('models'));
  if (hasModels) indicators.push('models/');

  const hasServices = directories.some(d =>
    d.includes('services') || d.includes('domain') || d.includes('business')
  );
  if (hasServices) indicators.push('services/ or domain/');

  const hasApi = directories.some(d =>
    d.includes('api') || d.includes('routes') || d.includes('controllers') || d.includes('handlers')
  );
  if (hasApi) indicators.push('api/ or routes/ or controllers/');

  if (hasModels && hasServices && hasApi) {
    return { match: true, confidence: 0.95, indicators };
  }
  if ((hasModels && hasServices) || (hasServices && hasApi) || (hasModels && hasApi)) {
    return { match: true, confidence: 0.85, indicators };
  }
  if (hasModels || hasServices || hasApi) {
    return { match: true, confidence: 0.70, indicators };
  }
  return { match: false, confidence: 0.0, indicators: [] };
}

/**
 * Detect domain-driven design pattern
 * @param directories
 * @param framework
 */
function isDomainDriven(directories: string[], framework: string | null): {
  match: boolean;
  confidence: number;
  indicators: string[];
} {
  const featurePattern = /^(features|modules|contexts|domains)\/\w+/;
  const domainDirs = directories.filter(d => featurePattern.test(d));

  if (domainDirs.length >= 3) {
    return { match: true, confidence: 0.90, indicators: domainDirs.slice(0, 5) };
  }
  if (domainDirs.length === 2) {
    return { match: true, confidence: 0.80, indicators: domainDirs };
  }

  // NestJS special case
  if (framework?.toLowerCase() === 'nestjs') {
    const nestModulePattern = /^src\/modules\/\w+/;
    const nestModules = directories.filter(d => nestModulePattern.test(d));
    if (nestModules.length >= 2) {
      return { match: true, confidence: 0.85, indicators: ['NestJS modules/', ...nestModules.slice(0, 3)] };
    }
  }

  return { match: false, confidence: 0.0, indicators: [] };
}

/**
 * Detect microservices architecture
 * @param directories
 * @param projectType
 */
function isMicroservices(directories: string[], projectType: string): {
  match: boolean;
  confidence: number;
  indicators: string[];
} {
  const servicePattern = /^services\/\w+/;
  const services = directories.filter(d => servicePattern.test(d));
  if (services.length >= 2) {
    return { match: true, confidence: 0.90, indicators: services.slice(0, 5) };
  }

  const appPattern = /^apps\/\w+/;
  const apps = directories.filter(d => appPattern.test(d));
  if (apps.length >= 2) {
    return { match: true, confidence: 0.90, indicators: apps.slice(0, 5) };
  }

  if (projectType === 'go') {
    const cmdPattern = /^cmd\/\w+/;
    const cmds = directories.filter(d => cmdPattern.test(d));
    if (cmds.length >= 2) {
      return { match: true, confidence: 0.85, indicators: cmds.slice(0, 5) };
    }
  }

  return { match: false, confidence: 0.0, indicators: [] };
}

const ENTRY_POINT_PATTERNS: Record<string, string[]> = {
  python: [
    'manage.py', // Django (100% - ALWAYS at root)
    'app/main.py', // FastAPI (85% - official pattern)
    'main.py', // Simple projects (60%)
    'app.py', // Flask (70%)
    'src/main.py', // Module-based (30%)
    'src/app.py', // Module-based Flask (20%)
    '__main__.py', // Package entry point (15%)
    'cli.py', // CLI tools (Typer, Click) (10%)
    'wsgi.py', // WSGI server entry (secondary)
    'asgi.py', // ASGI server entry (secondary)
  ],
  node: [
    // Note: package.json "main"/"exports" checked separately (authoritative)
    'src/main.ts', // NestJS (100%)
    'app/layout.tsx', // Next.js App Router (60% of Next.js)
    'pages/_app.tsx', // Next.js Pages Router (40% of Next.js)
    'app.js', // Express (40% - express-generator default)
    'server.js', // Express (30% - emphasizes server role)
    'index.js', // npm default (30%)
    'index.ts', // TypeScript default
    'src/index.ts', // TypeScript with src/
    'src/index.js', // JavaScript with src/
    'src/server.ts', // TypeScript + Express
    'src/app.ts', // TypeScript + Express (app pattern)
  ],
  go: [
    'cmd/*/main.go', // Standard layout (95% - GLOB PATTERN)
    'main.go', // Simple projects (5%)
  ],
  rust: [
    'src/main.rs', // Binary/application
    'src/lib.rs', // Library
  ],
  // Ruby, PHP deferred to STEP_2 (not core focus)
  ruby: [],
  php: [],
  mixed: [], // Monorepo - no single entry point
  unknown: [], // Can't detect
};

/**
 * Get entry point from package.json "main" or "exports" field
 *
 * Resolution priority (Node.js spec):
 * 1. "exports" field (modern, takes precedence)
 * 2. "main" field (legacy, fallback)
 * 3. "module" field (ESM-specific, some tools check this)
 *
 * exports field can be:
 * - String: Direct entry point
 * - Object with ".": Main export using dot notation
 * - Object with conditional exports: Extract "default" or "import"
 *
 * @param rootPath - Absolute path to project root
 * @returns Entry point path (relative to rootPath) or null if not found
 *
 * @example
 * ```typescript
 * // package.json: { "main": "./dist/index.js" }
 * await getPackageJsonEntry('/path') // → './dist/index.js'
 *
 * // package.json: { "exports": "./lib/index.js" }
 * await getPackageJsonEntry('/path') // → './lib/index.js'
 *
 * // package.json: { "exports": { ".": "./dist/index.js" } }
 * await getPackageJsonEntry('/path') // → './dist/index.js'
 *
 * // package.json: { "exports": { ".": { "import": "./esm/index.mjs", "default": "./index.js" } } }
 * await getPackageJsonEntry('/path') // → './index.js' (default fallback)
 * ```
 *
 * Sources:
 * - Node.js Modules spec: https://nodejs.org/api/packages.html#exports
 * - Research: Web search on exports field resolution (2026-02-26)
 * - Priority: exports > main > module (when multiple present)
 */
async function getPackageJsonEntry(rootPath: string): Promise<string | null> {
  const pkgPath = joinPath(rootPath, 'package.json');

  // Check package.json exists
  if (!(await exists(pkgPath))) {
    return null;
  }

  try {
    const content = await readFile(pkgPath);
    const pkg = JSON.parse(content);

    // Priority 1: "exports" field (modern Node.js, takes precedence)
    if (pkg.exports) {
      // Case 1: Direct string value
      // { "exports": "./dist/index.js" }
      if (typeof pkg.exports === 'string') {
        return pkg.exports;
      }

      // Case 2: Object with "." key (main export)
      // { "exports": { ".": "./dist/index.js" } }
      if (typeof pkg.exports === 'object' && pkg.exports['.']) {
        const dotExport = pkg.exports['.'];

        // Case 2a: Dot export is string
        if (typeof dotExport === 'string') {
          return dotExport;
        }

        // Case 2b: Dot export is object with conditional exports
        // { ".": { "import": "./esm/index.mjs", "require": "./cjs/index.js", "default": "./index.js" } }
        if (typeof dotExport === 'object') {
          // Try conditions in priority order
          return dotExport.default || dotExport.import || dotExport.require || null;
        }
      }
    }

    // Priority 2: "main" field (legacy, widely supported)
    if (pkg.main) {
      return pkg.main;
    }

    // Priority 3: "module" field (ESM-specific, some bundlers check this)
    if (pkg.module) {
      return pkg.module;
    }

    // No entry point specified
    return null;
  } catch (_error) {
    // Corrupted package.json - graceful degradation
    // Will fallback to convention-based detection
    return null;
  }
}

/**
 * Analyze project directory structure
 *
 * @param rootPath - Absolute path to project root
 * @param projectType - Detected project type (from STEP_1.1)
 * @param framework - Detected framework (from STEP_1.1, can be null)
 * @returns Complete structure analysis
 *
 * Implementation: CP3
 */
export async function analyzeStructure(
  rootPath: string,
  projectType: ProjectType,
  framework: string | null
): Promise<StructureAnalysis> {
  try {
    // Step 1: Find entry points
    const entryPointResult = await findEntryPoints(rootPath, projectType, framework);

    // Step 2: Find test locations
    const testLocationResult = await findTestLocations(rootPath, projectType, framework);

    // Step 3: Walk directories
    const directories = await walkDirectories(rootPath, 4);

    // Step 4: Classify architecture
    const architectureResult = classifyArchitecture(
      directories,
      entryPointResult.entryPoints,
      framework,
      projectType
    );

    // Step 5: Build ASCII tree
    const directoryTree = await buildAsciiTree(rootPath, 4, 40);

    // Step 6: Find config files
    const configFiles = await findConfigFiles(rootPath, projectType);

    // Step 7: Map directories to purposes
    const directoryPurposes = mapDirectoriesToPurposes(directories);

    // Step 8: Calculate overall confidence (weighted)
    const overallConfidence = (
      entryPointResult.confidence * 0.50 +
      testLocationResult.confidence * 0.25 +
      architectureResult.confidence * 0.25
    );

    return {
      directories: directoryPurposes,
      entryPoints: entryPointResult.entryPoints,
      testLocation: testLocationResult.testLocations[0] || null,
      architecture: architectureResult.architecture,
      directoryTree,
      configFiles,
      confidence: {
        entryPoints: entryPointResult.confidence,
        testLocation: testLocationResult.confidence,
        architecture: architectureResult.confidence,
        overall: overallConfidence,
      },
    };
  } catch (_error) {
    return createEmptyStructureAnalysis();
  }
}

/**
 * Find entry points (where code execution starts)
 *
 * Uses framework-aware priority lists and package.json "main" field.
 *
 * @param rootPath - Absolute path to project root
 * @param projectType - Project type (python, node, go, rust)
 * @param framework - Framework (can be null)
 * @returns Entry point detection result
 *
 * @example
 * ```typescript
 * const result = await findEntryPoints('/path', 'python', 'django');
 * // → { entryPoints: ['manage.py'], confidence: 1.0, source: 'framework-convention' }
 * ```
 *
 * Implementation: CP1
 */
export async function findEntryPoints(
  rootPath: string,
  projectType: ProjectType,
  framework: string | null
): Promise<EntryPointResult> {
  // Step 1: Framework-specific shortcuts (check these FIRST for high accuracy)
  const frameworkLower = framework?.toLowerCase() || '';

  // Django: Always manage.py at root (100% convention)
  if (frameworkLower === 'django') {
    const managePy = joinPath(rootPath, 'manage.py');
    if (await exists(managePy)) {
      return {
        entryPoints: ['manage.py'],
        confidence: 1.0,
        source: 'framework-convention',
      };
    }
  }

  // NestJS: Always src/main.ts (100% convention)
  if (frameworkLower === 'nestjs' || frameworkLower === 'nest') {
    const mainTs = joinPath(rootPath, 'src/main.ts');
    if (await exists(mainTs)) {
      return {
        entryPoints: ['src/main.ts'],
        confidence: 1.0,
        source: 'framework-convention',
      };
    }
  }

  // FastAPI: Prefer app/main.py (85% convention)
  if (frameworkLower === 'fastapi') {
    const appMainPy = joinPath(rootPath, 'app/main.py');
    if (await exists(appMainPy)) {
      return {
        entryPoints: ['app/main.py'],
        confidence: 1.0,
        source: 'framework-convention',
      };
    }
    // Fallback to priority list handled below
  }

  // Flask: Prefer app.py (70% convention)
  if (frameworkLower === 'flask') {
    const appPy = joinPath(rootPath, 'app.py');
    if (await exists(appPy)) {
      return {
        entryPoints: ['app.py'],
        confidence: 1.0,
        source: 'framework-convention',
      };
    }
    // Fallback to priority list handled below
  }

  // Next.js: Check App Router (app/layout.tsx) or Pages Router (pages/_app.tsx)
  if (frameworkLower === 'nextjs' || frameworkLower === 'next.js' || frameworkLower === 'next') {
    const appLayout = joinPath(rootPath, 'app/layout.tsx');
    const pagesApp = joinPath(rootPath, 'pages/_app.tsx');

    if (await exists(appLayout)) {
      return {
        entryPoints: ['app/layout.tsx'],
        confidence: 1.0,
        source: 'framework-convention',
      };
    }

    if (await exists(pagesApp)) {
      return {
        entryPoints: ['pages/_app.tsx'],
        confidence: 1.0,
        source: 'framework-convention',
      };
    }
    // Fallback to priority list handled below
  }

  // Step 2: Node package.json parsing (authoritative for ALL Node projects)
  if (projectType === 'node') {
    const pkgEntry = await getPackageJsonEntry(rootPath);
    if (pkgEntry) {
      // Remove leading './' if present for consistency
      const normalizedEntry = pkgEntry.startsWith('./') ? pkgEntry.slice(2) : pkgEntry;

      // Determine source based on which field was found
      const pkgPath = joinPath(rootPath, 'package.json');
      let source: 'package.json-main' | 'package.json-exports' = 'package.json-main';

      try {
        const content = await readFile(pkgPath);
        const pkg = JSON.parse(content);
        if (pkg.exports) {
          source = 'package.json-exports';
        }
      } catch {
        // If we can't read package.json, default to main (getPackageJsonEntry already succeeded)
      }

      return {
        entryPoints: [normalizedEntry],
        confidence: 1.0,
        source,
      };
    }
  }

  // Step 3: Priority list iteration (convention-based detection)
  const patterns = ENTRY_POINT_PATTERNS[projectType] || [];
  const foundEntryPoints: string[] = [];

  for (const pattern of patterns) {
    // Check if pattern is a glob (contains * wildcard)
    if (pattern.includes('*')) {
      // Use glob for patterns like 'cmd/*/main.go'
      try {
        const matches = await glob(pattern, {
          cwd: rootPath,
          absolute: false,
          nodir: true,
        });

        if (matches.length > 0) {
          // Found one or more matches
          foundEntryPoints.push(...matches);

          // For Go microservices (multiple cmd/*/main.go), return all with high confidence
          if (projectType === 'go' && matches.length >= 1) {
            return {
              entryPoints: matches,
              confidence: matches.length === 1 ? 0.95 : 1.0,
              source: 'convention',
            };
          }
        }
      } catch {
        // Glob pattern failed, continue to next pattern
        continue;
      }
    } else {
      // Simple file path check
      const filePath = joinPath(rootPath, pattern);
      if (await exists(filePath)) {
        foundEntryPoints.push(pattern);

        // First match wins for non-glob patterns
        // Check if more patterns might match (Express ambiguity case)
        const nextMatches: string[] = [];
        for (let i = patterns.indexOf(pattern) + 1; i < patterns.length; i++) {
          const nextPattern = patterns[i];
          if (nextPattern && !nextPattern.includes('*')) {
            const nextPath = joinPath(rootPath, nextPattern);
            if (await exists(nextPath)) {
              nextMatches.push(nextPattern);
            }
          }
        }

        if (nextMatches.length > 0) {
          // Multiple ambiguous files found (e.g., Express app.js + server.js)
          return {
            entryPoints: [pattern, ...nextMatches],
            confidence: 0.75,
            source: 'convention',
          };
        }

        // Single match - high confidence
        return {
          entryPoints: [pattern],
          confidence: 0.95,
          source: 'convention',
        };
      }
    }
  }

  // Step 4: No entry point found (library project or undetected pattern)
  if (foundEntryPoints.length > 0) {
    // Found via glob but didn't return early
    return {
      entryPoints: foundEntryPoints,
      confidence: 0.95,
      source: 'convention',
    };
  }

  // No entry point detected
  return {
    entryPoints: [],
    confidence: 0.0,
    source: 'not-found',
  };
}

/**
 * Classify project architecture pattern
 *
 * Uses directory structure heuristics to identify:
 * - Layered (models/, services/, api/)
 * - Domain-driven (features/*, modules/*)
 * - Microservices (apps/*, services/*, cmd/* with ≥2)
 * - Monolith (default/fallback)
 * - Library (no entry point)
 *
 * @param directories - List of directories in project
 * @param entryPoints - Detected entry points (empty for libraries)
 * @param framework - Framework (affects classification - NestJS modules/ = DDD)
 * @param projectType
 * @returns Architecture classification result
 *
 * Implementation: CP2
 */
export function classifyArchitecture(
  directories: string[],
  entryPoints: string[],
  framework: string | null,
  projectType: string = 'unknown'
): ArchitectureResult {
  // 1. Check microservices (highest specificity)
  const microservices = isMicroservices(directories, projectType);
  if (microservices.match) {
    return {
      architecture: 'microservices',
      confidence: microservices.confidence,
      indicators: microservices.indicators,
    };
  }

  // 2. Check domain-driven (features/*, modules/*)
  const ddd = isDomainDriven(directories, framework);
  if (ddd.match) {
    return {
      architecture: 'domain-driven',
      confidence: ddd.confidence,
      indicators: ddd.indicators,
    };
  }

  // 3. Check layered (models + services + api)
  const layered = isLayeredArchitecture(directories);
  if (layered.match) {
    return {
      architecture: 'layered',
      confidence: layered.confidence,
      indicators: layered.indicators,
    };
  }

  // 4. Check library (no entry point + lib/ or pkg/)
  if (entryPoints.length === 0) {
    const hasLib = directories.some(d => {
      const base = basename(d);
      // Check if directory is lib/ or pkg/ or starts with them
      return base === 'lib' || base === 'pkg' || d.startsWith('lib/') || d.startsWith('pkg/');
    });
    if (hasLib) {
      return {
        architecture: 'library',
        confidence: 0.90,
        indicators: ['no entry point', 'lib/ or pkg/ directory present'],
      };
    }
  }

  // 5. Default: Monolith (no clear pattern)
  return {
    architecture: 'monolith',
    confidence: 0.70,
    indicators: ['no clear architectural pattern'],
  };
}

/**
 * Find pytest test location (Python)
 * @param rootPath
 */
async function findPytestLocation(rootPath: string): Promise<TestLocationResult> {
  const testsDir = joinPath(rootPath, 'tests');
  if (await exists(testsDir) && await isDirectory(testsDir)) {
    return { testLocations: ['tests/'], confidence: 1.0, framework: 'pytest' };
  }

  const testDir = joinPath(rootPath, 'test');
  if (await exists(testDir) && await isDirectory(testDir)) {
    return { testLocations: ['test/'], confidence: 1.0, framework: 'pytest' };
  }

  const pytestIni = joinPath(rootPath, 'pytest.ini');
  const pyprojectToml = joinPath(rootPath, 'pyproject.toml');
  if (await exists(pytestIni) || await exists(pyprojectToml)) {
    return { testLocations: ['test_*.py', '*_test.py'], confidence: 0.80, framework: 'pytest' };
  }

  return { testLocations: [], confidence: 0.0, framework: 'unknown' };
}

/**
 * Find Jest/Vitest test location (Node)
 * @param rootPath
 */
async function findJestVitestLocation(rootPath: string): Promise<TestLocationResult> {
  const jestTestsDir = joinPath(rootPath, '__tests__');
  if (await exists(jestTestsDir) && await isDirectory(jestTestsDir)) {
    return { testLocations: ['__tests__/'], confidence: 1.0, framework: 'jest' };
  }

  const testsDir = joinPath(rootPath, 'tests');
  if (await exists(testsDir) && await isDirectory(testsDir)) {
    return { testLocations: ['tests/'], confidence: 1.0, framework: 'jest' };
  }

  const testDir = joinPath(rootPath, 'test');
  if (await exists(testDir) && await isDirectory(testDir)) {
    return { testLocations: ['test/'], confidence: 1.0, framework: 'jest' };
  }

  const vitestConfig = joinPath(rootPath, 'vitest.config.ts');
  if (await exists(vitestConfig)) {
    return { testLocations: ['*.test.ts', '*.spec.ts'], confidence: 0.85, framework: 'vitest' };
  }

  const jestConfig = joinPath(rootPath, 'jest.config.js');
  if (await exists(jestConfig)) {
    return { testLocations: ['*.test.ts', '*.spec.ts', '*.test.js', '*.spec.js'], confidence: 0.85, framework: 'jest' };
  }

  const pkgPath = joinPath(rootPath, 'package.json');
  if (await exists(pkgPath)) {
    try {
      const content = await readFile(pkgPath);
      const pkg = JSON.parse(content);
      if (pkg.jest) {
        return { testLocations: ['*.test.ts', '*.spec.ts'], confidence: 0.85, framework: 'jest' };
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { testLocations: [], confidence: 0.0, framework: 'unknown' };
}

/**
 * Find go test location (Go)
 */
function findGoTestLocation(): TestLocationResult {
  return {
    testLocations: ['*_test.go'],
    confidence: 1.0,
    framework: 'go-test',
  };
}

/**
 * Find Rust test location
 * @param rootPath
 */
async function findRustTestLocation(rootPath: string): Promise<TestLocationResult> {
  const testsDir = joinPath(rootPath, 'tests');
  if (await exists(testsDir) && await isDirectory(testsDir)) {
    return { testLocations: ['tests/'], confidence: 1.0, framework: 'cargo-test' };
  }
  return { testLocations: [], confidence: 0.0, framework: 'unknown' };
}

/**
 * Find test locations (where tests live)
 *
 * Detects test framework and locations using:
 * - pytest: tests/ directory + test_*.py pattern
 * - Jest/Vitest: __tests__/ or *.test.ts pattern
 * - go test: *_test.go colocated with source
 *
 * @param rootPath - Absolute path to project root
 * @param projectType - Project type
 * @param framework - Framework (null if unknown)
 * @returns Test location detection result
 *
 * Implementation: CP3
 */
export async function findTestLocations(
  rootPath: string,
  projectType: ProjectType,
  framework: string | null
): Promise<TestLocationResult> {
  if (projectType === 'python') {
    return await findPytestLocation(rootPath);
  }

  if (projectType === 'node') {
    return await findJestVitestLocation(rootPath);
  }

  if (projectType === 'go') {
    return findGoTestLocation();
  }

  if (projectType === 'rust') {
    return await findRustTestLocation(rootPath);
  }

  return { testLocations: [], confidence: 0.0, framework: 'unknown' };
}

/**
 * Build ASCII directory tree
 *
 * Generates clean tree representation for context files.
 *
 * @param rootPath - Absolute path to project root
 * @param maxDepth - Maximum depth (default: 4 levels)
 * @param maxDirs - Maximum directories to show (default: 40)
 * @returns ASCII tree string (max 50 lines)
 *
 * Implementation: CP2
 */
export async function buildAsciiTree(
  rootPath: string,
  maxDepth: number = 4,
  maxDirs: number = 40
): Promise<string> {
  const { walkDirectories } = await import('../utils/directory.js');

  const directories = await walkDirectories(rootPath, maxDepth);

  // Sort alphabetically with priority dirs first
  const priorityDirs = ['src', 'lib', 'app', 'tests', 'docs'];
  const sorted = directories.sort((a, b) => {
    const aBase = basename(a);
    const bBase = basename(b);
    const aPriority = priorityDirs.indexOf(aBase);
    const bPriority = priorityDirs.indexOf(bBase);
    if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
    if (aPriority !== -1) return -1;
    if (bPriority !== -1) return 1;
    return a.localeCompare(b);
  });

  const limited = sorted.slice(0, maxDirs);
  const remaining = sorted.length - maxDirs;

  const projectName = basename(rootPath);
  let tree = `${projectName}/\n`;

  for (const dir of limited) {
    const depth = dir.split('/').length;
    const indent = '  '.repeat(depth);
    const dirName = basename(dir);
    tree += `${indent}${dirName}/\n`;
  }

  if (remaining > 0) {
    tree += `  ... ${remaining} more director${remaining === 1 ? 'y' : 'ies'}\n`;
  }

  return tree;
}

/**
 * Find config files (.env, tsconfig.json, settings.py, etc.)
 *
 * @param rootPath - Absolute path to project root
 * @param projectType - Project type (affects which configs to look for)
 * @returns Array of config file paths found
 *
 * Implementation: CP3
 */
export async function findConfigFiles(
  rootPath: string,
  projectType: ProjectType
): Promise<string[]> {
  const configs: string[] = [];

  const commonConfigs = [
    '.env',
    '.env.local',
    '.env.example',
    '.gitignore',
    'README.md',
    'LICENSE',
  ];

  const jsConfigs = [
    'tsconfig.json',
    'jsconfig.json',
    'package.json',
    'eslint.config.mjs',
    '.eslintrc.js',
    '.prettierrc',
    'vite.config.ts',
    'vitest.config.ts',
    'jest.config.js',
    'next.config.js',
    'nest-cli.json',
  ];

  const pythonConfigs = [
    'pyproject.toml',
    'setup.py',
    'requirements.txt',
    'Pipfile',
    'pytest.ini',
    'setup.cfg',
    '.flake8',
    'mypy.ini',
  ];

  const goConfigs = [
    'go.mod',
    'go.sum',
    '.golangci.yml',
  ];

  const rustConfigs = [
    'Cargo.toml',
    'Cargo.lock',
    'rust-toolchain.toml',
  ];

  let configsToCheck = commonConfigs;

  if (projectType === 'node') {
    configsToCheck = [...commonConfigs, ...jsConfigs];
  } else if (projectType === 'python') {
    configsToCheck = [...commonConfigs, ...pythonConfigs];
  } else if (projectType === 'go') {
    configsToCheck = [...commonConfigs, ...goConfigs];
  } else if (projectType === 'rust') {
    configsToCheck = [...commonConfigs, ...rustConfigs];
  }

  for (const configFile of configsToCheck) {
    const configPath = joinPath(rootPath, configFile);
    if (await exists(configPath)) {
      configs.push(configFile);
    }
  }

  return configs;
}
