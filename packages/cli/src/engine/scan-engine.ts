/**
 * scanProject() — top-level engine function
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
import { existsSync } from 'node:fs';
import { glob } from 'glob';
import type { EngineResult } from './types/engineResult.js';
import type { AnalysisResult } from './types/index.js';
import { getPatternLibrary } from './types/patterns.js';
import { readDependencies, detectFromDeps, detectServiceDeps, detectAiSdk, aggregateMonorepoDependencies } from './detectors/dependencies.js';
import { detectPackageManager } from './detectors/packageManager.js';
import { detectGitInfo } from './detectors/git.js';
import { detectCommands } from './detectors/commands.js';
import { detectDeployment, detectCI } from './detectors/deployment.js';
import { annotateServiceRoles } from './utils/serviceAnnotation.js';
import { countFiles } from '../utils/fileCounts.js';

import { getLanguageDisplayName, getFrameworkDisplayName, getPatternDisplayName } from '../utils/displayNames.js';
import { getProjectName } from '../utils/validators.js';

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
      services.push({ name: info.name, category: info.category, source: 'dependency', configFound, stackRoles: [] });
    }
  }

  return services;
}

// --- Schema detection ---

/**
 * Count unique table names from SQL files via CREATE TABLE regex
 */
async function countUniqueTables(rootPath: string, sqlFiles: string[]): Promise<number> {
  const tableNames = new Set<string>();
  const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?["']?(\w+)["']?/gi;
  for (const f of sqlFiles) {
    try {
      const content = await fs.readFile(path.join(rootPath, f), 'utf-8');
      for (const match of content.matchAll(regex)) {
        if (match[1]) tableNames.add(match[1].toLowerCase());
      }
    } catch { /* skip unreadable files */ }
  }
  return tableNames.size;
}

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
      const providerMatch = content.match(/provider\s*=\s*"(\w+)"/);
      const provider = providerMatch?.[1] || null;
      schemas['prisma'] = { found: true, path: 'prisma/schema.prisma', modelCount, provider };
    } catch {
      schemas['prisma'] = { found: false, path: null, modelCount: null };
      blindSpots.push({ area: 'Database', issue: 'Prisma dependency found but no schema.prisma', resolution: 'Create prisma/schema.prisma' });
    }
  }

  // Drizzle
  if (allDeps['drizzle-orm']) {
    try {
      const files = await glob('drizzle/**/*.ts', { cwd: rootPath });
      schemas['drizzle'] = { found: files.length > 0, path: files.length > 0 ? (files[0] ?? null) : null, modelCount: null };
    } catch {
      schemas['drizzle'] = { found: false, path: null, modelCount: null };
    }
  }

  // Supabase migrations — count unique tables, not files
  if (allDeps['@supabase/supabase-js']) {
    try {
      const migrationFiles = await glob('supabase/migrations/*.sql', { cwd: rootPath }).catch(() => [] as string[]);
      const schemaFiles = await glob('schema/**/*.sql', { cwd: rootPath }).catch(() => [] as string[]);
      const files = [...migrationFiles, ...schemaFiles];
      if (files.length > 0) {
        const modelCount = await countUniqueTables(rootPath, files);
        schemas['supabase'] = { found: true, path: migrationFiles.length > 0 ? 'supabase/migrations/' : 'schema/', modelCount };
      } else {
        schemas['supabase'] = { found: false, path: null, modelCount: null };
      }
    } catch {
      schemas['supabase'] = { found: false, path: null, modelCount: null };
    }
  }

  // Fallback: check common SQL directories for projects without standard ORM
  if (!schemas['supabase']?.found && !schemas['prisma']?.found && !schemas['drizzle']?.found) {
    for (const dir of ['database', 'db', 'migrations', 'sql', 'schema']) {
      try {
        const sqlFiles = await glob(`${dir}/**/*.sql`, { cwd: rootPath });
        if (sqlFiles.length > 0) {
          const modelCount = await countUniqueTables(rootPath, sqlFiles);
          if (modelCount > 0) {
            schemas['sql'] = { found: true, path: `${dir}/`, modelCount };
            break;
          }
        }
      } catch { /* skip */ }
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
  try {
    const rootFiles = await fs.readdir(rootPath);
    envExampleExists = rootFiles.some(f =>
      (f.startsWith('.env') && f.endsWith('.example')) || f === '.env.template'
    );
  } catch { /* readdir failed */ }
  try {
    const gitignore = await fs.readFile(path.join(rootPath, '.gitignore'), 'utf-8');
    gitignoreCoversEnv = gitignore.includes('.env');
  } catch { /* no .gitignore */ }

  return { envFileExists, envExampleExists, gitignoreCoversEnv };
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

// mapToPatternDetail + mapPatterns deleted (Item 6) — same rationale as Item 3
// for conventions. EngineResult.patterns now uses PatternAnalysis directly, so
// no translation layer. The old mapToPatternDetail coalesced `variant` to the
// empty string `''` (lossy — couldn't distinguish "no variant" from "variant is
// empty string") and discarded the MultiPattern union member entirely by only
// returning the .primary. Direct assignment preserves both.

// mapConventions + mapNaming deleted (Item 3). The analyzer's ConventionAnalysis
// type is now EngineResult.conventions directly — no translation layer that
// silently drops fields when they're added.

// --- Main function ---

export async function scanProject(
  rootPath: string,
  options: { depth: 'surface' | 'deep' } = { depth: 'deep' }
): Promise<EngineResult> {
  const projectName = await getProjectName(rootPath);
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
      analysis = await analyze(rootPath, { skipImportScan: true, maxFiles: 50 });
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

  // 5. Build stack (dependency primary, analyzer enriches).
  // All 8 fields assigned at construction time — detectAiSdk is a pure
  // function over allDeps, so inlining it here is equivalent to a later
  // assignment but keeps construction and population in one expression
  // (Item 2.1 fix + cosmetic inline).
  const stack: EngineResult['stack'] = {
    language: null,
    framework: null,
    database: depResult.database,
    auth: depResult.auth,
    testing: depResult.testing,
    payments: depResult.payments,
    workspace: mono.isMonorepo ? `${mono.tool} monorepo` : null,
    aiSdk: detectAiSdk(allDeps),
  };

  // Enrich from analyzer
  if (analysis) {
    if (analysis.projectType && analysis.projectType !== 'unknown') {
      stack.language = getLanguageDisplayName(analysis.projectType);
    }
    if (analysis.framework) {
      stack.framework = getFrameworkDisplayName(analysis.framework);
    }
    // Analyzer patterns can fill gaps — use getPatternLibrary helper to
    // handle both PatternConfidence and MultiPattern union members (Item 2.3).
    const dbLib = getPatternLibrary(analysis.patterns?.database);
    if (!stack.database && dbLib) {
      stack.database = getPatternDisplayName(dbLib);
    }
    const authLib = getPatternLibrary(analysis.patterns?.auth);
    if (!stack.auth && authLib) {
      stack.auth = getPatternDisplayName(authLib);
    }
    const testLib = getPatternLibrary(analysis.patterns?.testing);
    if (!stack.testing && testLib) {
      stack.testing = getPatternDisplayName(testLib);
    }
  }

  // TypeScript override: ONLY upgrade Node.js → TypeScript
  // Don't override null (could be Python/Go project with tsconfig for tooling)
  if (stack.language === 'Node.js') {
    const hasTsConfig = existsSync(path.join(rootPath, 'tsconfig.json'));
    const hasTsDep = allDeps['typescript'] !== undefined;
    if (hasTsConfig || hasTsDep) {
      stack.language = 'TypeScript';
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
      externalServices.push({ name: svc.name, category: svc.category, source: 'dependency', configFound: false, stackRoles: [] });
    }
  }
  const { schemas, blindSpots } = await detectSchemas(allDeps, rootPath);
  const secrets = await detectSecrets(rootPath);
  const deployment = detectDeployment(rootPath);
  const ci = detectCI(rootPath);

  // Annotate services with the stack roles they fulfill. Display code uses
  // `stackRoles.length === 0` to filter standalone services, replacing 4 copies
  // of fragile substring dedup (Item 5).
  const annotatedServices = annotateServiceRoles(
    externalServices,
    stack,
    deployment.platform
  );

  // 11. Project profile
  const browserFrameworks = ['Next.js', 'React', 'Vue', 'Angular', 'Svelte', 'Nuxt'];
  const storagePackages = ['@aws-sdk/client-s3', 'aws-sdk', '@google-cloud/storage', 'cloudinary'];
  const projectProfile: EngineResult['projectProfile'] = {
    type: analysis?.framework || analysis?.projectType || null,
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
    schemaVersion: '1.0',
    overview: { project: projectName, scannedAt: now, depth: options.depth },
    stack,
    files,
    structure: structure.items,
    structureOverflow: structure.overflow,
    commands: { ...commands, packageManager },
    git,
    monorepo: mono,
    externalServices: annotatedServices,
    schemas,
    secrets,
    projectProfile,
    blindSpots,
    // detectDeployment always returns a DetectedDeployment shape now (null
    // fields for "no deployment"), so the construction is a clean spread.
    deployment: { ...deployment, ...ci },
    patterns: (options.depth === 'deep' && analysis?.patterns) ? analysis.patterns : null,
    conventions: (options.depth === 'deep' && analysis?.conventions) ? analysis.conventions : null,
    // Phase 1+ stubs
    secretFindings: null,
    envVarMap: null,
    duplicates: null,
    circularDeps: null,
    orphanFiles: null,
    complexityHotspots: null,
    gitIntelligence: null,
    dependencyIntelligence: null,
    technicalDebtMarkers: null,
    inconsistencies: null,
    conventionBreaks: null,
    aiReadinessScore: null,
    // Reserved
    recommendations: null,
    health: null,
    readiness: null,
  };
}
