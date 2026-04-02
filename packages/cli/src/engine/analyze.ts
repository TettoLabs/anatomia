/**
 * analyzeProject() — top-level engine function
 *
 * Composes EngineResult from multiple detection sources:
 * 1. Dependency detection (primary — always runs)
 * 2. Structure/file analysis (always runs)
 * 3. Git detection (always runs)
 * 4. Command detection (always runs)
 * 5. External services, schemas, secrets (always runs)
 * 6. Tree-sitter deep analysis (only when depth === 'deep')
 *
 * The existing analyze() in index.ts is called for deep tier only.
 * It has 503 tests — we wrap it, not rewrite it.
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { glob } from 'glob';
import type { EngineResult } from './types/engineResult.js';
import type { AnalysisResult } from './types/index.js';
import { readDependencies, detectFromDeps, detectServiceDeps, aggregateMonorepoDependencies, DATABASE_PACKAGES, AUTH_PACKAGES, TESTING_PACKAGES, PAYMENT_PACKAGES } from './detectors/dependencies.js';
import { detectPackageManager } from './detectors/packageManager.js';
import { detectGitInfo } from './detectors/git.js';
import { detectCommands } from './detectors/commands.js';
import { detectDeployment } from './detectors/deployment.js';
import { countFiles } from '../utils/fileCounts.js';

// Display name mappings (moved from scan.ts to be shared)
const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  node: 'Node.js', python: 'Python', go: 'Go', rust: 'Rust',
  ruby: 'Ruby', php: 'PHP', java: 'Java', kotlin: 'Kotlin',
  swift: 'Swift', csharp: 'C#', cpp: 'C++', c: 'C',
  typescript: 'TypeScript', unknown: 'Unknown',
};

const FRAMEWORK_DISPLAY_NAMES: Record<string, string> = {
  nextjs: 'Next.js', react: 'React', vue: 'Vue', angular: 'Angular',
  svelte: 'Svelte', express: 'Express', fastify: 'Fastify', nestjs: 'NestJS',
  fastapi: 'FastAPI', django: 'Django', flask: 'Flask', rails: 'Rails',
  sinatra: 'Sinatra', gin: 'Gin', echo: 'Echo', fiber: 'Fiber',
  actix: 'Actix', rocket: 'Rocket', spring: 'Spring',
  laravel: 'Laravel', symfony: 'Symfony',
};

const PATTERN_DISPLAY_NAMES: Record<string, string> = {
  prisma: 'Prisma', drizzle: 'Drizzle', typeorm: 'TypeORM',
  sequelize: 'Sequelize', mongoose: 'Mongoose', sqlalchemy: 'SQLAlchemy',
  django_orm: 'Django ORM', activerecord: 'ActiveRecord', gorm: 'GORM',
  diesel: 'Diesel', nextauth: 'NextAuth', 'next-auth': 'NextAuth',
  passport: 'Passport', clerk: 'Clerk', auth0: 'Auth0',
  firebase_auth: 'Firebase Auth', supabase_auth: 'Supabase Auth',
  jwt: 'JWT', oauth: 'OAuth', vitest: 'Vitest', jest: 'Jest',
  mocha: 'Mocha', pytest: 'pytest', unittest: 'unittest',
  rspec: 'RSpec', minitest: 'Minitest', go_testing: 'Go testing',
  cargo_test: 'Cargo test', junit: 'JUnit', phpunit: 'PHPUnit',
};

function displayName(map: Record<string, string>, key: string): string {
  return map[key.toLowerCase()] || key;
}

interface MonorepoInfo {
  isMonorepo: boolean;
  tool: string | null;
  packages: Array<{ name: string; path: string }>;
}

async function detectMonorepoInfo(rootPath: string): Promise<MonorepoInfo> {
  // Check pnpm-workspace.yaml
  try {
    const content = await fs.readFile(path.join(rootPath, 'pnpm-workspace.yaml'), 'utf-8');
    const patterns: string[] = [];
    const lines = content.split('\n');
    let inPackages = false;
    for (const line of lines) {
      if (line.trim() === 'packages:') { inPackages = true; continue; }
      if (inPackages && line.trim().startsWith('-')) {
        patterns.push(line.trim().slice(1).trim().replace(/['"]/g, ''));
      } else if (inPackages && line.trim() && !line.trim().startsWith('#')) {
        inPackages = false;
      }
    }
    const packages = await findWorkspacePackages(rootPath, patterns);
    return { isMonorepo: true, tool: 'pnpm', packages };
  } catch { /* not pnpm */ }

  // Check package.json workspaces
  try {
    const content = await fs.readFile(path.join(rootPath, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content);
    if (pkg.workspaces) {
      const patterns = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages || [];
      const packages = await findWorkspacePackages(rootPath, patterns);
      return { isMonorepo: true, tool: 'npm/yarn', packages };
    }
  } catch { /* not npm/yarn workspaces */ }

  // Check lerna.json
  try {
    await fs.access(path.join(rootPath, 'lerna.json'));
    return { isMonorepo: true, tool: 'Lerna', packages: [] };
  } catch { /* not lerna */ }

  // Check nx.json
  try {
    await fs.access(path.join(rootPath, 'nx.json'));
    return { isMonorepo: true, tool: 'Nx', packages: [] };
  } catch { /* not nx */ }

  return { isMonorepo: false, tool: null, packages: [] };
}

async function findWorkspacePackages(
  rootPath: string,
  patterns: string[]
): Promise<Array<{ name: string; path: string }>> {
  const packages: Array<{ name: string; path: string }> = [];
  for (const pattern of patterns) {
    try {
      const matches = await glob(pattern, { cwd: rootPath, absolute: false });
      for (const match of matches) {
        try {
          const content = await fs.readFile(path.join(rootPath, match, 'package.json'), 'utf-8');
          const pkg = JSON.parse(content);
          if (pkg.name) packages.push({ name: pkg.name, path: match });
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  return packages;
}

// --- External services detection ---

const EXTERNAL_SERVICE_PACKAGES: Record<string, { name: string; category: string }> = {
  'stripe': { name: 'Stripe', category: 'payments' },
  '@stripe/stripe-js': { name: 'Stripe', category: 'payments' },
  '@supabase/supabase-js': { name: 'Supabase', category: 'backend' },
  'firebase': { name: 'Firebase', category: 'backend' },
  'firebase-admin': { name: 'Firebase', category: 'backend' },
  '@sendgrid/mail': { name: 'SendGrid', category: 'email' },
  'aws-sdk': { name: 'AWS', category: 'cloud' },
  '@aws-sdk/client-s3': { name: 'AWS S3', category: 'storage' },
  'nodemailer': { name: 'Nodemailer', category: 'email' },
  '@vercel/analytics': { name: 'Vercel', category: 'hosting' },
  'resend': { name: 'Resend', category: 'email' },
  '@sentry/node': { name: 'Sentry', category: 'monitoring' },
  '@sentry/nextjs': { name: 'Sentry', category: 'monitoring' },
  'posthog-js': { name: 'PostHog', category: 'analytics' },
  '@lemonsqueezy/lemonsqueezy.js': { name: 'Lemon Squeezy', category: 'payments' },
  'openai': { name: 'OpenAI', category: 'ai' },
  '@anthropic-ai/sdk': { name: 'Anthropic', category: 'ai' },
};

const SERVICE_CONFIG_CHECKS: Record<string, string[]> = {
  'Stripe': ['STRIPE_'],
  'Supabase': ['supabase/config.toml', 'SUPABASE_URL'],
  'Firebase': ['.firebaserc', 'firebase.json'],
  'AWS': ['.aws/', 'AWS_'],
  'AWS S3': ['AWS_'],
  'Vercel': ['vercel.json'],
  'Sentry': ['.sentryclirc', 'SENTRY_DSN'],
};

async function detectExternalServices(
  allDeps: Record<string, string>,
  rootPath: string
): Promise<EngineResult['externalServices']> {
  const services: EngineResult['externalServices'] = [];
  const seen = new Set<string>();

  for (const [pkg, info] of Object.entries(EXTERNAL_SERVICE_PACKAGES)) {
    if (allDeps[pkg] && !seen.has(info.name)) {
      seen.add(info.name);
      const configPatterns = SERVICE_CONFIG_CHECKS[info.name] || [];
      let configFound = false;
      for (const pattern of configPatterns) {
        if (pattern.endsWith('_')) {
          // Check .env files for prefix
          try {
            const envContent = await fs.readFile(path.join(rootPath, '.env'), 'utf-8');
            if (envContent.includes(pattern)) { configFound = true; break; }
          } catch { /* no .env */ }
          try {
            const envContent = await fs.readFile(path.join(rootPath, '.env.local'), 'utf-8');
            if (envContent.includes(pattern)) { configFound = true; break; }
          } catch { /* no .env.local */ }
        } else {
          try {
            await fs.access(path.join(rootPath, pattern));
            configFound = true;
            break;
          } catch { /* not found */ }
        }
      }
      services.push({ name: info.name, category: info.category, source: 'dependency', configFound });
    }
  }

  return services;
}

// --- Schema detection ---

async function detectSchemas(
  allDeps: Record<string, string>,
  rootPath: string
): Promise<{ schemas: EngineResult['schemas']; blindSpots: EngineResult['blindSpots'] }> {
  const schemas: EngineResult['schemas'] = {};
  const blindSpots: EngineResult['blindSpots'] = [];

  // Prisma
  const hasPrisma = allDeps['prisma'] || allDeps['@prisma/client'];
  if (hasPrisma) {
    const schemaPath = path.join(rootPath, 'prisma', 'schema.prisma');
    try {
      const content = await fs.readFile(schemaPath, 'utf-8');
      const modelCount = (content.match(/^model\s+/gm) || []).length;
      schemas['prisma'] = { found: true, path: 'prisma/schema.prisma', modelCount };
    } catch {
      schemas['prisma'] = { found: false, path: null, modelCount: null };
      blindSpots.push({ area: 'Database', issue: 'Prisma dependency found but no schema.prisma', resolution: 'Create prisma/schema.prisma' });
    }
  }

  // Drizzle
  if (allDeps['drizzle-orm']) {
    try {
      const files = await glob('drizzle/**/*.ts', { cwd: rootPath });
      schemas['drizzle'] = { found: files.length > 0, path: files.length > 0 ? files[0] : null, modelCount: null };
    } catch {
      schemas['drizzle'] = { found: false, path: null, modelCount: null };
    }
  }

  // Supabase migrations
  if (allDeps['@supabase/supabase-js']) {
    try {
      const files = await glob('supabase/migrations/*.sql', { cwd: rootPath });
      schemas['supabase'] = { found: files.length > 0, path: files.length > 0 ? 'supabase/migrations/' : null, modelCount: files.length };
    } catch {
      schemas['supabase'] = { found: false, path: null, modelCount: null };
    }
  }

  return { schemas, blindSpots };
}

// --- Secrets detection ---

async function detectSecrets(rootPath: string): Promise<EngineResult['secrets']> {
  let envFileExists = false;
  let envExampleExists = false;
  let gitignoreCoversEnv = false;

  for (const f of ['.env', '.env.local', '.env.production']) {
    try { await fs.access(path.join(rootPath, f)); envFileExists = true; break; } catch { /* nope */ }
  }
  for (const f of ['.env.example', '.env.template']) {
    try { await fs.access(path.join(rootPath, f)); envExampleExists = true; break; } catch { /* nope */ }
  }
  try {
    const gitignore = await fs.readFile(path.join(rootPath, '.gitignore'), 'utf-8');
    gitignoreCoversEnv = gitignore.includes('.env');
  } catch { /* no .gitignore */ }

  return { envFileExists, envExampleExists, gitignoreCoversEnv, hardcodedKeysFound: null, envVarReferences: null };
}

// --- Structure extraction from AnalysisResult ---

function extractStructure(
  analysis: AnalysisResult | null
): { items: Array<{ path: string; purpose: string }>; overflow: number } {
  if (!analysis?.structure?.directories) return { items: [], overflow: 0 };
  const directories = analysis.structure.directories;
  const entries = Object.entries(directories)
    .filter(([dirPath, purpose]) => {
      const depth = dirPath.split('/').filter(Boolean).length;
      return depth === 1 && purpose && purpose !== 'Unknown';
    })
    .map(([dirPath, purpose]) => ({
      path: dirPath.endsWith('/') ? dirPath : `${dirPath}/`,
      purpose,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const maxItems = 10;
  const overflow = Math.max(0, entries.length - maxItems);
  return { items: entries.slice(0, maxItems), overflow };
}

// --- Main function ---

export async function analyzeProject(
  rootPath: string,
  options: { depth: 'surface' | 'deep' } = { depth: 'surface' }
): Promise<EngineResult> {
  const projectName = path.basename(rootPath);
  const now = new Date().toISOString();

  // 1. Monorepo detection
  const mono = await detectMonorepoInfo(rootPath);

  // 2. Package manager
  const packageManager = await detectPackageManager(rootPath);

  // 3. Dependency detection (aggregate if monorepo)
  let allDeps: Record<string, string>;
  if (mono.isMonorepo && mono.packages.length > 0) {
    allDeps = await aggregateMonorepoDependencies(rootPath, mono.packages.map(p => p.path));
  } else {
    allDeps = await readDependencies(path.join(rootPath, 'package.json'));
  }
  const depResult = detectFromDeps(allDeps);

  // 4. Run existing analyze() for project type, framework, structure (and deep tier)
  let analysis: AnalysisResult | null = null;
  try {
    const { analyze } = await import('./index.js');
    if (options.depth === 'deep') {
      analysis = await analyze(rootPath, { skipImportScan: true });
    } else {
      // Surface: skip tree-sitter parsing, patterns, conventions
      analysis = await analyze(rootPath, {
        skipImportScan: true,
        skipParsing: true,
        skipPatterns: true,
        skipConventions: true,
      });
    }
  } catch {
    // Engine failure — continue with dependency detection only
  }

  // 5. Build stack (dependency primary, analyzer enriches)
  const stack: EngineResult['stack'] = {
    language: null,
    framework: null,
    database: depResult.database,
    auth: depResult.auth,
    testing: depResult.testing,
    payments: depResult.payments,
    workspace: mono.isMonorepo ? `${mono.tool} monorepo` : null,
  };

  // Enrich from analyzer
  if (analysis) {
    if (analysis.projectType && analysis.projectType !== 'unknown') {
      stack.language = displayName(LANGUAGE_DISPLAY_NAMES, analysis.projectType);
    }
    if (analysis.framework) {
      stack.framework = displayName(FRAMEWORK_DISPLAY_NAMES, analysis.framework);
    }
    // Analyzer patterns can fill gaps
    if (!stack.database && analysis.patterns?.database?.library) {
      stack.database = displayName(PATTERN_DISPLAY_NAMES, analysis.patterns.database.library);
    }
    if (!stack.auth && analysis.patterns?.auth?.library) {
      stack.auth = displayName(PATTERN_DISPLAY_NAMES, analysis.patterns.auth.library);
    }
    if (!stack.testing && analysis.patterns?.testing?.library) {
      stack.testing = displayName(PATTERN_DISPLAY_NAMES, analysis.patterns.testing.library);
    }
  }

  // 6. File counts
  const files = await countFiles(rootPath);

  // 7. Structure
  const structure = extractStructure(analysis);

  // 8. Commands
  const commands = await detectCommands(rootPath, packageManager);

  // 9. Git
  const git = await detectGitInfo(rootPath);

  // 10. External services (existing + new categories), schemas, secrets, deployment
  const externalServices = await detectExternalServices(allDeps, rootPath);
  // Add services from new category maps (AI, email, monitoring, jobs)
  for (const svc of detectServiceDeps(allDeps)) {
    if (!externalServices.some(s => s.name === svc.name)) {
      externalServices.push({ name: svc.name, category: svc.category, source: 'dependency', configFound: false });
    }
  }
  const { schemas, blindSpots } = await detectSchemas(allDeps, rootPath);
  const secrets = await detectSecrets(rootPath);
  const deployment = detectDeployment(rootPath);

  // 11. Project profile
  const browserFrameworks = ['Next.js', 'React', 'Vue', 'Angular', 'Svelte', 'Nuxt'];
  const storagePackages = ['@aws-sdk/client-s3', 'aws-sdk', '@google-cloud/storage', 'cloudinary'];
  const projectProfile: EngineResult['projectProfile'] = {
    type: analysis?.framework || analysis?.projectType || null,
    maturity: null,
    teamSize: null,
    hasExternalAPIs: externalServices.length > 0,
    hasDatabase: stack.database !== null,
    hasBrowserUI: stack.framework !== null && browserFrameworks.includes(stack.framework),
    hasAuthSystem: stack.auth !== null,
    hasPayments: stack.payments !== null,
    hasFileStorage: storagePackages.some(p => allDeps[p]),
  };

  // 12. Additional blind spots
  if (!git.head) {
    blindSpots.push({ area: 'Git', issue: 'No git repository detected', resolution: 'Run git init' });
  }
  if (secrets.envFileExists && !secrets.gitignoreCoversEnv) {
    blindSpots.push({ area: 'Secrets', issue: '.env file exists but .gitignore may not cover it', resolution: 'Add .env to .gitignore' });
  }

  return {
    overview: { project: projectName, scannedAt: now, depth: options.depth },
    stack,
    files,
    structure: structure.items,
    structureOverflow: structure.overflow,
    commands: { ...commands, packageManager },
    git,
    monorepo: mono,
    externalServices,
    schemas,
    secrets,
    projectProfile,
    blindSpots,
    deployment,
    patterns: options.depth === 'deep' && analysis?.patterns ? analysis.patterns : null,
    conventions: options.depth === 'deep' && analysis?.conventions ? analysis.conventions : null,
    recommendations: null, // S11: populated by recommendation engine
    health: {} as Record<string, never>,
    readiness: {} as Record<string, never>,
  };
}
