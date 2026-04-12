/**
 * Deployment platform and CI detection from config files
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DEPLOYMENT_FILES: Record<string, string> = {
  'vercel.json': 'Vercel',
  'netlify.toml': 'Netlify',
  'fly.toml': 'Fly.io',
  'railway.toml': 'Railway',
  'render.yaml': 'Render',
  'Dockerfile': 'Docker',
  'docker-compose.yml': 'Docker Compose',
  'docker-compose.yaml': 'Docker Compose',
  'compose.yml': 'Docker Compose',
  'compose.yaml': 'Docker Compose',
  'Procfile': 'Heroku',
  'app.yaml': 'Google Cloud',
  'firebase.json': 'Firebase',
};

/**
 * Detected deployment platform metadata. Both fields null when no platform
 * detected — a single always-populated shape instead of `{...} | null`
 * simplifies composition at the consumer (Item 7d). scan.json output is
 * unchanged: `platform: null` was always the "no deployment" sentinel.
 */
export interface DetectedDeployment {
  platform: string | null;
  configFile: string | null;
}

/**
 * Detected CI system metadata. Both fields null when no CI detected.
 */
export interface DetectedCI {
  ci: string | null;
}

/**
 * Detect deployment platform from config files in the project root.
 *
 * @param rootPath - Project root directory
 * @returns Deployment info. Both fields null if no platform detected.
 */
export function detectDeployment(rootPath: string): DetectedDeployment {
  for (const [file, platform] of Object.entries(DEPLOYMENT_FILES)) {
    if (existsSync(join(rootPath, file))) {
      return { platform, configFile: file };
    }
  }
  return { platform: null, configFile: null };
}

/**
 * Detect CI system from config files. First match wins.
 *
 * @param rootPath - Project root directory
 * @returns CI info with ci name and config file path, or nulls
 */
export function detectCI(rootPath: string): DetectedCI {
  // GitHub Actions — check for .github/workflows/*.yml
  const workflowsDir = join(rootPath, '.github', 'workflows');
  if (existsSync(workflowsDir)) {
    try {
      const files = readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
      if (files.length > 0) {
        return { ci: 'GitHub Actions' };
      }
    } catch { /* permission error or similar */ }
  }

  // GitLab CI
  if (existsSync(join(rootPath, '.gitlab-ci.yml'))) {
    return { ci: 'GitLab CI' };
  }

  // Jenkins
  if (existsSync(join(rootPath, 'Jenkinsfile'))) {
    return { ci: 'Jenkins' };
  }

  // CircleCI
  if (existsSync(join(rootPath, '.circleci', 'config.yml'))) {
    return { ci: 'CircleCI' };
  }

  // Bitbucket Pipelines
  if (existsSync(join(rootPath, 'bitbucket-pipelines.yml'))) {
    return { ci: 'Bitbucket Pipelines' };
  }

  // Travis CI
  if (existsSync(join(rootPath, '.travis.yml'))) {
    return { ci: 'Travis CI' };
  }

  return { ci: null };
}
