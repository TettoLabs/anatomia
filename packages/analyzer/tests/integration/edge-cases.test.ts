/**
 * Integration tests for 12 critical edge cases
 *
 * Validates graceful error handling across:
 * - File system errors (5 tests)
 * - Monorepo detection (2 tests)
 * - Framework detection (3 tests)
 * - Performance/Cross-platform (2 tests)
 *
 * Uses real file operations with temp directories for isolation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

// Import detection functions
import { readPythonDependencies } from '../../src/parsers/python.js';
import { readNodeDependencies } from '../../src/parsers/node.js';
import { detectMonorepo } from '../../src/detectors/monorepo.js';
import { detectFramework } from '../../src/detectors/framework.js';
import { DetectionCollector } from '../../src/errors/DetectionCollector.js';
import { exists, readFile } from '../../src/utils/file.js';

describe('Edge Case Integration Tests', () => {
  let tempDir: string;
  let collector: DetectionCollector;

  beforeEach(async () => {
    // Create isolated temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'anatomia-test-'));
    collector = new DetectionCollector();
  });

  afterEach(async () => {
    // Cleanup temp directory (force + recursive)
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // ============================================================
  // FILE SYSTEM ERRORS (5 tests)
  // ============================================================

  describe('File System Edge Cases', () => {
    it('handles empty directory with no dependency files', async () => {
      // Create empty directory
      const emptyDir = path.join(tempDir, 'empty-project');
      await fs.mkdir(emptyDir);

      // Should not crash, return empty array
      const pythonDeps = await readPythonDependencies(emptyDir, collector);
      expect(pythonDeps).toEqual([]);

      const nodeDeps = await readNodeDependencies(emptyDir);
      expect(nodeDeps).toEqual([]);

      // Check that info message was logged
      const info = collector.getInfo();
      expect(info.some(e => e.code === 'NO_DEPENDENCIES')).toBe(true);
    });

    it('handles permission denied on package.json', async () => {
      // Create package.json with valid content
      const projectDir = path.join(tempDir, 'restricted-project');
      await fs.mkdir(projectDir);
      const packagePath = path.join(projectDir, 'package.json');
      await fs.writeFile(
        packagePath,
        JSON.stringify({ dependencies: { express: '^4.0.0' } })
      );

      // Make file unreadable (chmod 000)
      await fs.chmod(packagePath, 0o000);

      try {
        // Should handle gracefully, not crash
        const deps = await readNodeDependencies(projectDir);

        // Should return empty array due to permission error
        expect(deps).toEqual([]);
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(packagePath, 0o644);
      }
    });

    it('handles empty file (0-byte requirements.txt)', async () => {
      // Create 0-byte requirements.txt
      const projectDir = path.join(tempDir, 'empty-file-project');
      await fs.mkdir(projectDir);
      const reqPath = path.join(projectDir, 'requirements.txt');
      await fs.writeFile(reqPath, '');

      // Should not crash, return empty array
      const deps = await readPythonDependencies(projectDir, collector);
      expect(deps).toEqual([]);

      // File exists but has no content
      const fileExists = await exists(reqPath);
      expect(fileExists).toBe(true);

      const content = await readFile(reqPath);
      expect(content).toBe('');
    });

    it('handles corrupted JSON in package.json', async () => {
      // Create package.json with invalid JSON
      const projectDir = path.join(tempDir, 'corrupted-json-project');
      await fs.mkdir(projectDir);
      const packagePath = path.join(projectDir, 'package.json');
      await fs.writeFile(packagePath, '{invalid json}');

      // Should handle gracefully with error collection
      const deps = await readNodeDependencies(projectDir);

      // Should return empty array, not crash
      expect(deps).toEqual([]);
    });

    it('handles directory read as file', async () => {
      // Create a directory named "package.json" (edge case)
      const projectDir = path.join(tempDir, 'dir-as-file-project');
      await fs.mkdir(projectDir);
      const packageDir = path.join(projectDir, 'package.json');
      await fs.mkdir(packageDir);

      // Should handle gracefully (file read will fail on directory)
      const deps = await readNodeDependencies(projectDir);

      // Should return empty array, not crash
      expect(deps).toEqual([]);
    });
  });

  // ============================================================
  // MONOREPO DETECTION (2 tests)
  // ============================================================

  describe('Monorepo Edge Cases', () => {
    it('detects monorepo with pnpm-workspace.yaml', async () => {
      // Create pnpm monorepo structure
      const projectDir = path.join(tempDir, 'pnpm-monorepo');
      await fs.mkdir(projectDir);

      // Create pnpm-workspace.yaml
      const workspaceContent = `packages:
  - 'packages/*'
  - 'apps/*'
`;
      await fs.writeFile(
        path.join(projectDir, 'pnpm-workspace.yaml'),
        workspaceContent
      );

      // Detect monorepo
      const result = await detectMonorepo(projectDir, collector);

      expect(result.isMonorepo).toBe(true);
      expect(result.tool).toBe('pnpm');
      expect(result.workspacePatterns).toEqual(['packages/*', 'apps/*']);

      // Check info message
      const info = collector.getInfo();
      expect(info.some(e => e.code === 'MONOREPO_DETECTED')).toBe(true);
    });

    it('detects monorepo without tool (fallback discovery)', async () => {
      // Create multiple package.json files without workspace config
      const projectDir = path.join(tempDir, 'no-tool-monorepo');
      await fs.mkdir(projectDir);

      // Root package.json (no workspaces)
      await fs.writeFile(
        path.join(projectDir, 'package.json'),
        JSON.stringify({ name: 'root' })
      );

      // Create packages directory with multiple packages
      const packagesDir = path.join(projectDir, 'packages');
      await fs.mkdir(packagesDir);

      const pkg1Dir = path.join(packagesDir, 'pkg1');
      await fs.mkdir(pkg1Dir);
      await fs.writeFile(
        path.join(pkg1Dir, 'package.json'),
        JSON.stringify({ name: 'pkg1' })
      );

      const pkg2Dir = path.join(packagesDir, 'pkg2');
      await fs.mkdir(pkg2Dir);
      await fs.writeFile(
        path.join(pkg2Dir, 'package.json'),
        JSON.stringify({ name: 'pkg2' })
      );

      // Detect monorepo
      const result = await detectMonorepo(projectDir, collector);

      expect(result.isMonorepo).toBe(true);
      expect(result.tool).toBe('none');
      expect(result.packages).toBeDefined();
      expect(result.packages!.length).toBeGreaterThanOrEqual(2);

      // Check suggestion to use monorepo tool
      const info = collector.getInfo();
      const monorepoInfo = info.find(e => e.code === 'MONOREPO_DETECTED');
      expect(monorepoInfo?.suggestion).toContain('pnpm');
    });
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
      const deps = await readPythonDependencies(spacedDir, collector);

      expect(deps).toContain('flask');
      expect(deps).toContain('sqlalchemy');

      // Detect framework with spaced path
      const result = await detectFramework(spacedDir, 'python');
      expect(result.framework).toBe('flask');
    });
  });

  // ============================================================
  // ERROR COLLECTION VALIDATION
  // ============================================================

  describe('Error Collection and Graceful Degradation', () => {
    it('collects errors without crashing on multiple failures', async () => {
      const projectDir = path.join(tempDir, 'error-collection-project');
      await fs.mkdir(projectDir);

      // Create corrupted pnpm-workspace.yaml
      await fs.writeFile(
        path.join(projectDir, 'pnpm-workspace.yaml'),
        'invalid: yaml: content: here'
      );

      // Create corrupted package.json
      await fs.writeFile(
        path.join(projectDir, 'package.json'),
        '{broken json'
      );

      // Should collect warnings, not crash
      const result = await detectMonorepo(projectDir, collector);

      // Still returns a result (graceful degradation)
      expect(result).toBeDefined();
      expect(result.isMonorepo).toBe(false);

      // Check warnings were collected
      const warnings = collector.getWarnings();
      expect(warnings.length).toBeGreaterThan(0);

      // Should have YAML parse warning
      expect(warnings.some(w => w.code === 'INVALID_YAML')).toBe(true);
    });

    it('never crashes on any edge case combination', async () => {
      const projectDir = path.join(tempDir, 'chaos-project');
      await fs.mkdir(projectDir);

      // Create multiple problematic files
      await fs.writeFile(path.join(projectDir, 'requirements.txt'), '');
      await fs.writeFile(path.join(projectDir, 'package.json'), 'null');
      await fs.writeFile(path.join(projectDir, 'Pipfile'), '[invalid');

      // All operations should complete without throwing
      await expect(
        readPythonDependencies(projectDir, collector)
      ).resolves.toBeDefined();

      await expect(
        readNodeDependencies(projectDir)
      ).resolves.toBeDefined();

      await expect(
        detectMonorepo(projectDir, collector)
      ).resolves.toBeDefined();

      // Collector should have captured issues
      const allErrors = collector.getAllErrors();
      expect(allErrors.length).toBeGreaterThan(0);
    });
  });
});
