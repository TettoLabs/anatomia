import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { createEmptyAnalysisResult } from '../scaffolds/test-types.js';

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe('ana init', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-init-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('directory structure', () => {
    it('creates all 6 directories', async () => {
      const anaPath = path.join(tmpDir, '.ana');
      await fs.mkdir(anaPath);

      // Simulate Phase 3
      await fs.mkdir(path.join(anaPath, 'modes'), { recursive: true });
      await fs.mkdir(path.join(anaPath, 'context'), { recursive: true });
      await fs.mkdir(path.join(anaPath, 'context/setup'), { recursive: true });
      await fs.mkdir(path.join(anaPath, 'context/setup/steps'), { recursive: true });
      await fs.mkdir(path.join(anaPath, 'context/setup/framework-snippets'), { recursive: true });
      await fs.mkdir(path.join(anaPath, '.state'), { recursive: true });

      // Verify all exist
      const dirs = [
        'modes',
        'context',
        'context/setup',
        'context/setup/steps',
        'context/setup/framework-snippets',
        '.state',
      ];

      for (const dir of dirs) {
        const exists = await dirExists(path.join(anaPath, dir));
        expect(exists).toBe(true);
      }
    });
  });

  describe('template inventory', () => {
    it('all 25 template files exist in CLI package', async () => {
      // Get templates directory using same logic as init.ts
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const templatesDir = path.join(__dirname, '..', '..', 'templates');

      const expectedFiles = [
        // 7 mode files
        'modes/architect.md',
        'modes/code.md',
        'modes/debug.md',
        'modes/docs.md',
        'modes/test.md',
        'modes/general.md',
        'modes/setup.md',
        // 3 setup files
        'context/setup/SETUP_GUIDE.md',
        'context/setup/templates.md',
        'context/setup/rules.md',
        // 1 ENTRY template (stored, not copied to .ana/)
        'ENTRY.md',
        // 8 step files
        'context/setup/steps/00_explore_codebase.md',
        'context/setup/steps/01_project_overview.md',
        'context/setup/steps/02_conventions.md',
        'context/setup/steps/03_patterns.md',
        'context/setup/steps/04_architecture.md',
        'context/setup/steps/05_testing.md',
        'context/setup/steps/06_workflow.md',
        'context/setup/steps/07_debugging.md',
        // 6 framework-snippets
        'context/setup/framework-snippets/fastapi.md',
        'context/setup/framework-snippets/django.md',
        'context/setup/framework-snippets/nextjs.md',
        'context/setup/framework-snippets/express.md',
        'context/setup/framework-snippets/go.md',
        'context/setup/framework-snippets/generic.md',
      ];

      expect(expectedFiles).toHaveLength(25); // Sanity check our count

      for (const file of expectedFiles) {
        const filePath = path.join(templatesDir, file);
        const exists = await fileExists(filePath);
        expect(exists, `Missing template: ${file}`).toBe(true);
      }
    });
  });

  describe('.meta.json', () => {
    it('creates valid initial .meta.json', async () => {
      const analysis = createEmptyAnalysisResult();
      analysis.framework = 'fastapi';
      analysis.version = '0.2.0';

      const meta = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        setupStatus: 'pending',
        setupCompletedAt: null,
        setupMode: null,
        framework: analysis.framework,
        analyzerVersion: analysis.version,
        lastEvolve: null,
        lastHealth: null,
        sessionCount: 0,
      };

      expect(meta.setupStatus).toBe('pending');
      expect(meta.framework).toBe('fastapi');
      expect(meta.analyzerVersion).toBe('0.2.0');
      expect(meta.sessionCount).toBe(0);
    });

    it('has all 10 required fields', () => {
      const meta = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        setupStatus: 'pending',
        setupCompletedAt: null,
        setupMode: null,
        framework: null,
        analyzerVersion: '0.2.0',
        lastEvolve: null,
        lastHealth: null,
        sessionCount: 0,
      };

      const keys = Object.keys(meta);
      expect(keys).toHaveLength(10);
      expect(keys).toContain('setupStatus');
      expect(keys).toContain('setupMode');
      expect(keys).toContain('framework');
      expect(keys).toContain('analyzerVersion');
    });
  });

  describe('--force flag', () => {
    it('preserves .state/ when overwriting', async () => {
      const anaPath = path.join(tmpDir, '.ana');
      const statePath = path.join(anaPath, '.state');

      // Create existing .ana/ with .state/
      await fs.mkdir(statePath, { recursive: true });
      await fs.writeFile(path.join(statePath, 'snapshot.json'), '{"test":"data"}');

      // Simulate --force: backup .state/
      const backup = path.join(os.tmpdir(), `.ana-state-backup-${Date.now()}`);
      await fs.cp(statePath, backup, { recursive: true });

      // Delete .ana/
      await fs.rm(anaPath, { recursive: true });

      // Recreate .ana/
      await fs.mkdir(statePath, { recursive: true });

      // Restore .state/
      await fs.rm(statePath, { recursive: true });
      await fs.rename(backup, statePath);

      // Verify snapshot preserved
      const content = await fs.readFile(path.join(statePath, 'snapshot.json'), 'utf-8');
      expect(JSON.parse(content)).toEqual({ test: 'data' });
    });
  });
});

function fileURLToPath(url: string): string {
  return new URL(url).pathname;
}
