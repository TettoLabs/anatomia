/**
 * Deployment platform detection from config files
 */

import { existsSync } from 'node:fs';
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
