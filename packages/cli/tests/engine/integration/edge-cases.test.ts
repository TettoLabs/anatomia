/**
 * Integration tests for framework detection + performance edge cases.
 *
 * Real file operations in temp directories for isolation.
 *
 * History: this file previously also covered file-system errors, monorepo
 * detection, and error-collection flows — all exercised through the
 * DetectionCollector chain in engine/errors/. NEW-003 (S19 Lane 2) deleted
 * that chain entirely, and those three describe blocks went with it (they
 * were testing the collector's own sentinel output, not user-visible
 * behaviour). The two blocks below test real detector behaviour and stay.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

import { readPythonDependencies } from '../../../src/engine/parsers/python.js';
import { detectFramework } from '../../../src/engine/detectors/framework.js';

describe('Edge Case Integration Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'anatomia-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // ============================================================
  // FRAMEWORK DETECTION (3 tests)
  // ============================================================

  describe('Framework Detection Edge Cases', () => {
    it('handles library project with no web framework', async () => {
      // Create Python library with only utility packages
      const projectDir = path.join(tempDir, 'library-project');
      await fs.mkdir(projectDir);

      const reqContent = `pytest==7.4.0
black==23.0.0
mypy==1.5.0
`;
      await fs.writeFile(
        path.join(projectDir, 'requirements.txt'),
        reqContent
      );

      // Detect framework
      const result = await detectFramework(projectDir, 'python');

      // Should return null, not crash
      expect(result.framework).toBe(null);
      expect(result.confidence).toBe(0.0);
      expect(result.indicators).toEqual([]);
    });

    it('handles multiple frameworks in dependencies', async () => {
      // Create Python project with both Flask and FastAPI
      const projectDir = path.join(tempDir, 'multi-framework-project');
      await fs.mkdir(projectDir);

      const reqContent = `flask==2.3.0
fastapi==0.100.0
uvicorn==0.23.0
`;
      await fs.writeFile(
        path.join(projectDir, 'requirements.txt'),
        reqContent
      );

      // Detect framework (should pick one based on priority)
      const result = await detectFramework(projectDir, 'python');

      // FastAPI has higher priority in detection order
      expect(result.framework).toBe('fastapi');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('disambiguates Django vs Django REST Framework', async () => {
      // Create Django project with DRF
      const projectDir = path.join(tempDir, 'django-drf-project');
      await fs.mkdir(projectDir);

      const reqContent = `django==4.2.0
djangorestframework==3.14.0
`;
      await fs.writeFile(
        path.join(projectDir, 'requirements.txt'),
        reqContent
      );

      // Create manage.py (Django project indicator)
      const managePyContent = `#!/usr/bin/env python
import os
import sys

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)
`;
      await fs.writeFile(path.join(projectDir, 'manage.py'), managePyContent);

      // Detect framework
      const result = await detectFramework(projectDir, 'python');

      // Should detect as django-drf, not plain django
      expect(result.framework).toBe('django-drf');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.indicators).toContain('djangorestframework detected (API framework)');
    });
  });

  // ============================================================
  // PERFORMANCE & CROSS-PLATFORM (2 tests)
  // ============================================================

  describe('Performance and Cross-Platform Edge Cases', () => {
    it('handles large project with many files (sampling works)', async () => {
      // Create project with many Python files
      const projectDir = path.join(tempDir, 'large-project');
      await fs.mkdir(projectDir);

      // Create requirements.txt
      await fs.writeFile(
        path.join(projectDir, 'requirements.txt'),
        'fastapi==0.100.0'
      );

      // Create many Python files (simulate large codebase)
      const srcDir = path.join(projectDir, 'src');
      await fs.mkdir(srcDir);

      // Create 100 Python files
      for (let i = 0; i < 100; i++) {
        const filePath = path.join(srcDir, `module_${i}.py`);
        const content = i < 5
          ? 'from fastapi import FastAPI\n\napp = FastAPI()\n'
          : '# Utility module\n';
        await fs.writeFile(filePath, content);
      }

      // Should complete without timeout or crash
      const startTime = Date.now();
      const result = await detectFramework(projectDir, 'python');
      const duration = Date.now() - startTime;

      expect(result.framework).toBe('fastapi');
      // Should complete reasonably fast (under 5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    it('handles paths with spaces in directory names', async () => {
      // Create directory with spaces
      const spacedDir = path.join(tempDir, 'project with spaces');
      await fs.mkdir(spacedDir);

      const reqContent = `flask==2.3.0
sqlalchemy==2.0.0
`;
      await fs.writeFile(path.join(spacedDir, 'requirements.txt'), reqContent);

      // Should handle spaces correctly
      const deps = await readPythonDependencies(spacedDir);

      expect(deps).toContain('flask');
      expect(deps).toContain('sqlalchemy');

      // Detect framework with spaced path
      const result = await detectFramework(spacedDir, 'python');
      expect(result.framework).toBe('flask');
    });
  });
});
