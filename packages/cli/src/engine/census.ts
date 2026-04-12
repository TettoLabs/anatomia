/**
 * buildCensus() — gather project-wide facts into a single value object.
 *
 * Uses @manypkg/get-packages to discover workspace packages, then walks
 * each source root for config files, framework hints, schemas, deployments,
 * and CI workflows. The resulting ProjectCensus is immutable and passed to
 * every detector as pure function input — curing Disease A (Monorepo Blindness).
 */

import * as path from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { getPackages } from '@manypkg/get-packages';
import type {
  ProjectCensus,
  SourceRoot,
  FrameworkHintEntry,
  TsconfigEntry,
  SchemaFileEntry,
  DeploymentEntry,
  CiWorkflowEntry,
} from './types/census.js';

// ── Config file patterns ───────────────────────────────────────────────

/** Files that hint at a framework being present in a source root. */
const FRAMEWORK_HINTS: Array<{ pattern: string; framework: string; check: 'file' | 'dir' }> = [
  { pattern: 'next.config.ts', framework: 'nextjs', check: 'file' },
  { pattern: 'next.config.js', framework: 'nextjs', check: 'file' },
  { pattern: 'next.config.mjs', framework: 'nextjs', check: 'file' },
  { pattern: 'app', framework: 'nextjs-app-dir', check: 'dir' },
  { pattern: 'pages', framework: 'nextjs', check: 'dir' },
  { pattern: 'remix.config.js', framework: 'remix', check: 'file' },
  { pattern: 'remix.config.ts', framework: 'remix', check: 'file' },
  { pattern: 'astro.config.mjs', framework: 'astro', check: 'file' },
  { pattern: 'astro.config.ts', framework: 'astro', check: 'file' },
  { pattern: 'src/main.ts', framework: 'nestjs', check: 'file' },
  { pattern: 'manage.py', framework: 'django', check: 'file' },
];

/** Deployment config file → platform name. */
const DEPLOYMENT_CONFIGS: Record<string, string> = {
  'vercel.json': 'Vercel',
  'Dockerfile': 'Docker',
  'docker-compose.yml': 'Docker Compose',
  'docker-compose.yaml': 'Docker Compose',
  'railway.toml': 'Railway',
  'fly.toml': 'Fly.io',
  'render.yaml': 'Render',
  'Procfile': 'Heroku',
  'netlify.toml': 'Netlify',
  'app.yaml': 'Google Cloud',
};

/** Source file extensions to count. */
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs']);
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.next', 'build', '.git', '__pycache__', '.turbo']);

// ── Primary source root selection ──────────────────────────────────────

/**
 * Select the primary source root using the locked policy:
 * 1. First root under `apps/` with framework evidence
 * 2. First root with the most files
 * 3. rootPath itself (fallback)
 */
function selectPrimary(
  roots: SourceRoot[],
  frameworkHints: FrameworkHintEntry[],
): string {
  // Policy 1: first apps/ root with framework evidence
  const hintPaths = new Set(frameworkHints.map(h => h.sourceRootPath));
  const appsWithFramework = roots.find(
    r => r.relativePath.startsWith('apps/') && hintPaths.has(r.relativePath),
  );
  if (appsWithFramework) return appsWithFramework.relativePath;

  // Policy 2: root with most files
  const sorted = [...roots].sort((a, b) => b.fileCount - a.fileCount);
  if (sorted.length > 0) return sorted[0]!.relativePath;

  // Fallback
  return '.';
}

// ── File counting ──────────────────────────────────────────────────────

function countSourceFiles(dir: string): number {
  let count = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countSourceFiles(full);
      } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        count++;
      }
    }
  } catch {
    // Permission error or similar — return what we have
  }
  return count;
}

// ── Config discovery ───────────────────────────────────────────────────

function discoverFrameworkHints(
  rootPath: string,
  roots: Array<{ absolutePath: string; relativePath: string }>,
): FrameworkHintEntry[] {
  const hints: FrameworkHintEntry[] = [];
  for (const root of roots) {
    for (const { pattern, framework, check } of FRAMEWORK_HINTS) {
      const full = path.join(root.absolutePath, pattern);
      if (existsSync(full)) {
        const isDir = check === 'dir';
        try {
          // Verify the check type matches reality
          const stat = existsSync(full) && (isDir
            ? readdirSync(full).length > 0  // non-empty dir
            : true);  // file exists
          if (stat) {
            hints.push({
              framework,
              sourceRootPath: root.relativePath,
              path: path.relative(rootPath, full),
            });
          }
        } catch {
          // Skip inaccessible entries
        }
      }
    }
  }
  return hints;
}

function discoverTsconfigs(
  rootPath: string,
  roots: Array<{ absolutePath: string; relativePath: string }>,
): TsconfigEntry[] {
  const entries: TsconfigEntry[] = [];
  for (const root of roots) {
    const tsconfigPath = path.join(root.absolutePath, 'tsconfig.json');
    if (existsSync(tsconfigPath)) {
      let paths: Record<string, string[]> | null = null;
      let baseUrl: string | null = null;
      try {
        const raw = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
        if (raw.compilerOptions?.paths) paths = raw.compilerOptions.paths;
        if (raw.compilerOptions?.baseUrl) baseUrl = raw.compilerOptions.baseUrl;
      } catch {
        // Malformed tsconfig — record it exists but skip paths
      }
      entries.push({
        sourceRootPath: root.relativePath,
        path: path.relative(rootPath, tsconfigPath),
        paths,
        baseUrl,
      });
    }
  }
  return entries;
}

function discoverSchemas(
  rootPath: string,
  roots: Array<{ absolutePath: string; relativePath: string }>,
): SchemaFileEntry[] {
  const entries: SchemaFileEntry[] = [];
  for (const root of roots) {
    // Prisma
    const prismaPath = path.join(root.absolutePath, 'prisma', 'schema.prisma');
    if (existsSync(prismaPath)) {
      entries.push({
        orm: 'prisma',
        sourceRootPath: root.relativePath,
        path: path.relative(rootPath, prismaPath),
      });
    }
    // Drizzle
    const drizzlePath = path.join(root.absolutePath, 'drizzle');
    if (existsSync(drizzlePath)) {
      entries.push({
        orm: 'drizzle',
        sourceRootPath: root.relativePath,
        path: path.relative(rootPath, drizzlePath),
      });
    }
  }
  return entries;
}

function discoverDeployments(
  rootPath: string,
  roots: Array<{ absolutePath: string; relativePath: string }>,
): DeploymentEntry[] {
  const entries: DeploymentEntry[] = [];
  for (const root of roots) {
    for (const [file, platform] of Object.entries(DEPLOYMENT_CONFIGS)) {
      const full = path.join(root.absolutePath, file);
      if (existsSync(full)) {
        entries.push({
          platform,
          sourceRootPath: root.relativePath,
          path: path.relative(rootPath, full),
        });
      }
    }
  }
  return entries;
}

function discoverCiWorkflows(rootPath: string): CiWorkflowEntry[] {
  const entries: CiWorkflowEntry[] = [];

  // GitHub Actions — at repo root, not per source root
  const workflowsDir = path.join(rootPath, '.github', 'workflows');
  if (existsSync(workflowsDir)) {
    try {
      const files = readdirSync(workflowsDir).filter(
        f => f.endsWith('.yml') || f.endsWith('.yaml'),
      );
      if (files.length > 0) {
        entries.push({ system: 'GitHub Actions', workflowFiles: files });
      }
    } catch {
      // Permission error
    }
  }

  // GitLab CI
  if (existsSync(path.join(rootPath, '.gitlab-ci.yml'))) {
    entries.push({ system: 'GitLab CI', workflowFiles: ['.gitlab-ci.yml'] });
  }

  return entries;
}

// ── Main ───────────────────────────────────────────────────────────────

export async function buildCensus(rootPath: string): Promise<ProjectCensus> {
  const start = Date.now();
  const normalizedRoot = path.resolve(rootPath).replace(/\/+$/, '');

  // @manypkg/get-packages throws if no package.json exists (Python, Go, Rust,
  // empty directories). Fall back to a single source root with no deps.
  let result: Awaited<ReturnType<typeof getPackages>> | null = null;
  try {
    result = await getPackages(normalizedRoot);
  } catch {
    // Non-Node project or empty directory — continue with fallback
  }

  const isSingleRepo = !result || result.tool.type === 'root';

  // Project name from root package.json or directory name
  const projectName = result?.rootPackage?.packageJson?.name ?? path.basename(normalizedRoot);

  // Build source roots
  let sourceRoots: SourceRoot[];
  if (!result) {
    // No package.json — single root with no deps
    sourceRoots = [{
      absolutePath: normalizedRoot,
      relativePath: '.',
      packageName: null,
      fileCount: countSourceFiles(normalizedRoot),
      isPrimary: true,
      deps: {},
      devDeps: {},
    }];
  } else if (isSingleRepo) {
    const pkg = result.rootPackage!;
    sourceRoots = [{
      absolutePath: normalizedRoot,
      relativePath: '.',
      packageName: pkg.packageJson.name ?? null,
      fileCount: countSourceFiles(normalizedRoot),
      isPrimary: true,
      deps: (pkg.packageJson.dependencies ?? {}) as Record<string, string>,
      devDeps: (pkg.packageJson.devDependencies ?? {}) as Record<string, string>,
    }];
  } else {
    sourceRoots = result.packages.map(pkg => {
      const abs = pkg.dir;
      const rel = path.relative(normalizedRoot, abs);
      return {
        absolutePath: abs,
        relativePath: rel,
        packageName: pkg.packageJson.name ?? null,
        fileCount: countSourceFiles(abs),
        isPrimary: false, // set below after primary selection
        deps: (pkg.packageJson.dependencies ?? {}) as Record<string, string>,
        devDeps: (pkg.packageJson.devDependencies ?? {}) as Record<string, string>,
      };
    });
  }

  // Build deps maps
  const allDeps: Record<string, string> = {};
  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {};
  for (const root of sourceRoots) {
    Object.assign(deps, root.deps);
    Object.assign(devDeps, root.devDeps);
  }
  Object.assign(allDeps, deps, devDeps);

  // Discover configs (pass all roots for per-root discovery)
  const rootDescriptors = sourceRoots.map(r => ({
    absolutePath: r.absolutePath,
    relativePath: r.relativePath,
  }));
  const frameworkHints = discoverFrameworkHints(normalizedRoot, rootDescriptors);
  const tsconfigs = discoverTsconfigs(normalizedRoot, rootDescriptors);
  const schemas = discoverSchemas(normalizedRoot, rootDescriptors);
  const deployments = discoverDeployments(normalizedRoot, rootDescriptors);
  const ciWorkflows = discoverCiWorkflows(normalizedRoot);

  // Select primary source root (monorepo only — single-repo already has isPrimary=true)
  let primarySourceRoot: string;
  if (isSingleRepo) {
    primarySourceRoot = '.';
  } else {
    primarySourceRoot = selectPrimary(sourceRoots, frameworkHints);
    // Set isPrimary on the selected root
    for (const root of sourceRoots) {
      root.isPrimary = root.relativePath === primarySourceRoot;
    }
    // Sort: primary first
    sourceRoots.sort((a, b) => (a.isPrimary ? -1 : 0) - (b.isPrimary ? -1 : 0));
  }

  const monorepoTool = (isSingleRepo || !result) ? null : result.tool.type;

  return {
    rootPath: normalizedRoot,
    projectName,
    layout: isSingleRepo ? 'single-repo' : 'monorepo',
    monorepoTool,
    sourceRoots,
    primarySourceRoot,
    allDeps,
    deps,
    devDeps,
    configs: {
      frameworkHints,
      tsconfigs,
      schemas,
      deployments,
      ciWorkflows,
    },
    builtAt: new Date().toISOString(),
    buildDurationMs: Date.now() - start,
  };
}
