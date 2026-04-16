/**
 * Project kind detection — classifies Node projects by interpreting signals
 * from census and framework detection.
 *
 * Pure function: receives data, returns classification. No filesystem reads.
 */

/** Closed set of project kinds. */
export type ProjectKind = 'cli' | 'library' | 'web-app' | 'api-server' | 'full-stack' | 'unknown';

/** Input signals for project kind detection. */
export interface ProjectKindInput {
  hasBin: boolean;
  hasMain: boolean;
  hasExports: boolean;
  frameworkName: string | null;
  projectType: string | null;
  deps: string[];
}

/** Detection result. */
export interface ProjectKindResult {
  kind: ProjectKind;
}

/** CLI-specific dependencies — presence of any implies a CLI tool. */
const CLI_DEPS = new Set([
  'commander',
  'yargs',
  'meow',
  'cac',
  'clipanion',
  'oclif',
  'vorpal',
  'caporal',
  'args',
  'minimist',
  'arg',
  'citty',
]);

/** Browser UI frameworks — presence implies a web-app (not an API server). */
const BROWSER_FRAMEWORKS = new Set([
  'Next.js',
  'Remix',
  'React',
  'Vue',
  'Angular',
  'Svelte',
  'Nuxt',
  'Astro',
  'SvelteKit',
  'Solid',
]);

/** Server frameworks — presence implies API server (unless browser UI also present). */
const SERVER_FRAMEWORKS = new Set([
  'Express',
  'Fastify',
  'Koa',
  'Hono',
  'NestJS',
  'Adonis',
]);

/**
 * Classify a project by its signals.
 *
 * Signal priority (highest wins):
 * 1. bin field → cli
 * 2. CLI dependency → cli
 * 3. Browser UI framework → web-app
 * 4. Server framework without browser UI deps → api-server
 * 5. Server framework WITH browser UI deps → full-stack
 * 6. Library markers (main/module/exports) without bin/framework → library
 * 7. None → unknown
 */
export function detectProjectKind(input: ProjectKindInput): ProjectKindResult {
  // Non-Node projects: short-circuit to unknown
  if (input.projectType !== null && input.projectType !== 'node') {
    return { kind: 'unknown' };
  }

  // 1. bin field → cli
  if (input.hasBin) {
    return { kind: 'cli' };
  }

  // 2. CLI dependency → cli
  if (input.deps.some(d => CLI_DEPS.has(d))) {
    return { kind: 'cli' };
  }

  // 3-5. Framework-based classification
  if (input.frameworkName !== null) {
    const isBrowser = BROWSER_FRAMEWORKS.has(input.frameworkName);
    const isServer = SERVER_FRAMEWORKS.has(input.frameworkName);

    if (isBrowser) {
      return { kind: 'web-app' };
    }

    if (isServer) {
      // Check if browser UI deps also present → full-stack
      const hasBrowserDep = input.deps.some(d => BROWSER_FRAMEWORKS.has(d) || [
        'react', 'vue', 'svelte', 'next', 'nuxt', '@angular/core', 'solid-js', 'astro',
      ].includes(d));
      return { kind: hasBrowserDep ? 'full-stack' : 'api-server' };
    }
  }

  // 6. Library markers
  if (input.hasMain || input.hasExports) {
    return { kind: 'library' };
  }

  // 7. Unknown
  return { kind: 'unknown' };
}
