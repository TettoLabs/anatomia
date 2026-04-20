/**
 * Documentation inventory detector
 *
 * Finds documentation files via targeted path checks (not tree walk).
 * Reports paths with metadata: size, freshness, category.
 * Used by the setup agent during orientation to discover what docs exist.
 */

import { existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, relative, extname } from 'node:path';
import { glob } from 'glob';
import type { SourceRoot } from '../types/census.js';

export type DocCategory =
  | 'project-docs'
  | 'guides'
  | 'changelog'
  | 'troubleshooting'
  | 'config-examples'
  | 'templates'
  | 'api-specs';

export interface DocFile {
  path: string;
  category: DocCategory;
  sizeBytes: number;
  lastModifiedDays: number;
}

export interface DocsDirectory {
  path: string;
  fileCount: number;
  formats: string[];
  indexFile: string | null;
  framework: string | null;
}

export interface DocumentationResult {
  files: DocFile[];
  docsDirectory: DocsDirectory | null;
  landingPage: string | null;
}

/** Root-level files to check: [filename, category] */
const ROOT_DOCS: Array<[string, DocCategory]> = [
  ['README.md', 'project-docs'],
  ['README', 'project-docs'],
  ['readme.md', 'project-docs'],
  ['CONTRIBUTING.md', 'guides'],
  ['ARCHITECTURE.md', 'guides'],
  ['SECURITY.md', 'guides'],
  ['CODE_OF_CONDUCT.md', 'guides'],
  ['CHANGELOG.md', 'changelog'],
  ['HISTORY.md', 'changelog'],
  ['RELEASES.md', 'changelog'],
  ['TROUBLESHOOTING.md', 'troubleshooting'],
  ['FAQ.md', 'troubleshooting'],
  ['KNOWN_ISSUES.md', 'troubleshooting'],
  ['.env.example', 'config-examples'],
  ['.env.local.example', 'config-examples'],
  ['.env.sample', 'config-examples'],
];

/** Package-level docs to check in each source root */
const PACKAGE_DOCS: Array<[string, DocCategory]> = [
  ['README.md', 'project-docs'],
  ['ARCHITECTURE.md', 'guides'],
  ['CONTRIBUTING.md', 'guides'],
  ['CHANGELOG.md', 'changelog'],
];

/** GitHub template files/dirs */
const GITHUB_TEMPLATES: Array<[string, DocCategory]> = [
  ['.github/PULL_REQUEST_TEMPLATE.md', 'templates'],
  ['.github/ISSUE_TEMPLATE', 'templates'],
];

/** API spec filenames at root */
const API_SPECS: string[] = [
  'openapi.json', 'openapi.yaml', 'openapi.yml',
  'swagger.json', 'swagger.yaml', 'swagger.yml',
];

/** Docs framework package names → framework label */
const DOCS_FRAMEWORKS: Record<string, string> = {
  'nextra': 'nextra',
  '@docusaurus/core': 'docusaurus',
  '@mintlify/cli': 'mintlify',
  '@astrojs/starlight': 'starlight',
};

/** Known index filenames for docs directories */
const DOCS_INDEX_FILES = ['index.mdx', 'index.md', 'README.md'];

/**
 * Get last-modified days for a file using git log.
 * Falls back to fs.stat if git is unavailable.
 */
function getLastModifiedDays(filePath: string, rootPath: string): number {
  const relativePath = relative(rootPath, filePath);
  try {
    const output = execSync(`git log --format="%ct" -1 -- "${relativePath}"`, {
      cwd: rootPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (output) {
      const timestamp = parseInt(output, 10);
      return Math.floor((Date.now() / 1000 - timestamp) / 86400);
    }
  } catch {
    // Git unavailable or file never committed
  }
  // Fallback: fs.stat mtime
  try {
    const stat = statSync(filePath);
    return Math.floor((Date.now() - stat.mtimeMs) / 86400000);
  } catch {
    return -1;
  }
}

/**
 * Check if a path exists and build a DocFile entry if it does.
 */
function checkFile(
  rootPath: string,
  relativePath: string,
  category: DocCategory,
): DocFile | null {
  const fullPath = join(rootPath, relativePath);
  if (!existsSync(fullPath)) return null;
  // For directories (like .github/ISSUE_TEMPLATE), report existence
  const stat = statSync(fullPath);
  return {
    path: relativePath,
    category,
    sizeBytes: stat.isDirectory() ? 0 : stat.size,
    lastModifiedDays: getLastModifiedDays(fullPath, rootPath),
  };
}

/**
 * Detect docs/ directory metadata.
 */
function detectDocsDirectory(
  rootPath: string,
  deps: Record<string, string>,
): DocsDirectory | null {
  const docsPath = join(rootPath, 'docs');
  if (!existsSync(docsPath)) return null;

  const stat = statSync(docsPath);
  if (!stat.isDirectory()) return null;

  // Count doc files and detect formats
  let fileCount = 0;
  const formatSet = new Set<string>();
  try {
    const files = glob.sync('docs/**/*.{md,mdx,rst,txt}', { cwd: rootPath });
    fileCount = files.length;
    for (const f of files) {
      const ext = extname(f).slice(1); // remove leading dot
      if (ext) formatSet.add(ext);
    }
  } catch {
    // Glob failed — report directory exists but no count
  }

  // Find index file
  let indexFile: string | null = null;
  for (const name of DOCS_INDEX_FILES) {
    if (existsSync(join(docsPath, name))) {
      indexFile = `docs/${name}`;
      break;
    }
  }

  // Detect docs framework from deps
  let framework: string | null = null;
  for (const [pkg, label] of Object.entries(DOCS_FRAMEWORKS)) {
    if (deps[pkg]) {
      framework = label;
      break;
    }
  }

  return {
    path: 'docs/',
    fileCount,
    formats: [...formatSet].sort(),
    indexFile,
    framework,
  };
}

/**
 * Detect landing page path based on framework.
 */
function detectLandingPage(rootPath: string, framework: string | null): string | null {
  if (!framework) return null;

  const candidates: string[] = [];
  const lowerFramework = framework.toLowerCase();

  if (lowerFramework.includes('next')) {
    // App Router first, then Pages Router
    candidates.push('app/page.tsx', 'app/page.jsx', 'app/page.ts', 'app/page.js');
    candidates.push('pages/index.tsx', 'pages/index.jsx', 'pages/index.ts', 'pages/index.js');
  } else if (lowerFramework === 'remix' || lowerFramework === 'react router' || lowerFramework === 'react-router') {
    candidates.push('app/root.tsx', 'app/root.jsx');
  } else if (lowerFramework === 'react' || lowerFramework.includes('react')) {
    candidates.push('src/App.tsx', 'src/App.jsx', 'src/App.ts', 'src/App.js');
  } else if (lowerFramework === 'vue' || lowerFramework.includes('vue') || lowerFramework.includes('nuxt')) {
    candidates.push('src/App.vue', 'app.vue', 'pages/index.vue');
  } else if (lowerFramework === 'svelte' || lowerFramework.includes('svelte')) {
    candidates.push('src/App.svelte', 'src/routes/+page.svelte');
  }

  for (const candidate of candidates) {
    if (existsSync(join(rootPath, candidate))) {
      return candidate;
    }
  }

  return null;
}

/**
 * Detect documentation files in a project.
 *
 * Strategy: targeted path checks at known locations, not a tree walk.
 * Uses census sourceRoots for monorepo package docs.
 *
 * @param rootPath - Absolute path to project root
 * @param sourceRoots - Census source roots (for monorepo package docs)
 * @param framework - Detected framework name (for landing page detection)
 * @param deps - All project dependencies (for docs framework detection)
 */
export function detectDocumentation(
  rootPath: string,
  sourceRoots: SourceRoot[],
  framework: string | null,
  deps: Record<string, string>,
): DocumentationResult {
  const files: DocFile[] = [];
  // Use lowercase for dedup to handle case-insensitive filesystems (macOS)
  const seenPaths = new Set<string>();

  // 1. Root-level docs
  for (const [filename, category] of ROOT_DOCS) {
    const entry = checkFile(rootPath, filename, category);
    if (entry && !seenPaths.has(entry.path.toLowerCase())) {
      seenPaths.add(entry.path.toLowerCase());
      files.push(entry);
    }
  }

  // 2. GitHub templates
  for (const [relativePath, category] of GITHUB_TEMPLATES) {
    const entry = checkFile(rootPath, relativePath, category);
    if (entry && !seenPaths.has(entry.path.toLowerCase())) {
      seenPaths.add(entry.path.toLowerCase());
      files.push(entry);
    }
  }

  // 3. API specs at root
  for (const filename of API_SPECS) {
    const entry = checkFile(rootPath, filename, 'api-specs');
    if (entry && !seenPaths.has(entry.path.toLowerCase())) {
      seenPaths.add(entry.path.toLowerCase());
      files.push(entry);
    }
  }

  // 4. Package-level docs (monorepo)
  for (const root of sourceRoots) {
    // Skip the root package (already checked above)
    if (root.relativePath === '.') continue;
    for (const [filename, category] of PACKAGE_DOCS) {
      const relativePath = join(root.relativePath, filename);
      const entry = checkFile(rootPath, relativePath, category);
      if (entry && !seenPaths.has(entry.path)) {
        seenPaths.add(entry.path);
        files.push(entry);
      }
    }
  }

  // 5. Docs directory
  const docsDirectory = detectDocsDirectory(rootPath, deps);

  // 6. Landing page
  const landingPage = detectLandingPage(rootPath, framework);

  return { files, docsDirectory, landingPage };
}
