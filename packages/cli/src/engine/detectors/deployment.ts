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
  'Procfile': 'Heroku',
  'app.yaml': 'Google Cloud',
  'firebase.json': 'Firebase',
};

/**
 * Detect deployment platform from config files in the project root.
 *
 * @param rootPath - Project root directory
 * @returns Deployment info or null if no platform detected
 */
export function detectDeployment(rootPath: string): { platform: string; configFile: string } | null {
  for (const [file, platform] of Object.entries(DEPLOYMENT_FILES)) {
    if (existsSync(join(rootPath, file))) {
      return { platform, configFile: file };
    }
  }
  return null;
}

/**
 * Detect CI system from config files. First match wins.
 *
 * @param rootPath - Project root directory
 * @returns CI info with ci name and config file path, or nulls
 */
export function detectCI(rootPath: string): { ci: string | null; ciConfigFile: string | null } {
  // GitHub Actions — check for .github/workflows/*.yml
  const workflowsDir = join(rootPath, '.github', 'workflows');
  if (existsSync(workflowsDir)) {
    try {
      const files = readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
      if (files.length > 0) {
        return { ci: 'GitHub Actions', ciConfigFile: `.github/workflows/${files[0]}` };
      }
    } catch { /* permission error or similar */ }
  }

  // GitLab CI
  if (existsSync(join(rootPath, '.gitlab-ci.yml'))) {
    return { ci: 'GitLab CI', ciConfigFile: '.gitlab-ci.yml' };
  }

  // Jenkins
  if (existsSync(join(rootPath, 'Jenkinsfile'))) {
    return { ci: 'Jenkins', ciConfigFile: 'Jenkinsfile' };
  }

  // CircleCI
  if (existsSync(join(rootPath, '.circleci', 'config.yml'))) {
    return { ci: 'CircleCI', ciConfigFile: '.circleci/config.yml' };
  }

  // Bitbucket Pipelines
  if (existsSync(join(rootPath, 'bitbucket-pipelines.yml'))) {
    return { ci: 'Bitbucket Pipelines', ciConfigFile: 'bitbucket-pipelines.yml' };
  }

  // Travis CI
  if (existsSync(join(rootPath, '.travis.yml'))) {
    return { ci: 'Travis CI', ciConfigFile: '.travis.yml' };
  }

  return { ci: null, ciConfigFile: null };
}
