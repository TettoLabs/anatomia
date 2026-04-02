import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliRoot = path.join(__dirname, '..', '..');

describe('old template system removed', () => {
  describe('source files deleted', () => {
    it('template-loader.ts does not exist', async () => {
      const filePath = path.join(cliRoot, 'src/utils/template-loader.ts');
      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('test-template-loader.ts does not exist', async () => {
      const filePath = path.join(cliRoot, 'src/test-template-loader.ts');
      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('test-templates.ts does not exist', async () => {
      const filePath = path.join(cliRoot, 'src/test-templates.ts');
      await expect(fs.access(filePath)).rejects.toThrow();
    });
  });

  describe('template files deleted', () => {
    const deletedTemplates = [
      'ENTRY.md.hbs',
      'node.json.hbs',
      'architect.md.hbs',
      'code.md.hbs',
      'debug.md.hbs',
      'docs.md.hbs',
      'test.md.hbs',
      'main.md',
      'patterns.md',
      'conventions.md',
    ];

    it.each(deletedTemplates)('%s does not exist', async (file) => {
      const filePath = path.join(cliRoot, 'templates', file);
      await expect(fs.access(filePath)).rejects.toThrow();
    });
  });

  describe('test files deleted', () => {
    it('template-loader.test.ts does not exist', async () => {
      const filePath = path.join(cliRoot, 'tests/utils/template-loader.test.ts');
      await expect(fs.access(filePath)).rejects.toThrow();
    });

    const deletedTests = [
      'entry.test.ts',
      'rendering.test.ts',
      'boundaries.test.ts',
      'edge-cases.test.ts',
    ];

    it.each(deletedTests)('tests/templates/%s does not exist', async (file) => {
      const filePath = path.join(cliRoot, 'tests/templates', file);
      await expect(fs.access(filePath)).rejects.toThrow();
    });
  });

  describe('cross-platform.test.ts preserved', () => {
    it('cross-platform.test.ts still exists', async () => {
      const filePath = path.join(cliRoot, 'tests/templates/cross-platform.test.ts');
      await fs.access(filePath); // Should not throw
      const stats = await fs.stat(filePath);
      expect(stats.isFile()).toBe(true);
    });
  });

  describe('dependencies removed', () => {
    it('package.json does not contain handlebars or inquirer', async () => {
      const pkgPath = path.join(cliRoot, 'package.json');
      const content = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(content);

      // Check dependencies
      expect(pkg.dependencies?.handlebars).toBeUndefined();
      expect(pkg.dependencies?.inquirer).toBeUndefined();

      // Check devDependencies
      expect(pkg.devDependencies?.['@types/handlebars']).toBeUndefined();
      expect(pkg.devDependencies?.['@types/inquirer']).toBeUndefined();
    });

    it('package.json kept dependencies intact', async () => {
      const pkgPath = path.join(cliRoot, 'package.json');
      const content = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(content);

      // Verify kept dependencies (analyzer absorbed into CLI in S10)
      expect(pkg.dependencies?.chalk).toBeDefined();
      expect(pkg.dependencies?.commander).toBeDefined();
      expect(pkg.dependencies?.glob).toBeDefined();
      expect(pkg.dependencies?.ora).toBeDefined();
      // Engine dependencies (from absorbed analyzer)
      expect(pkg.dependencies?.['web-tree-sitter']).toBeDefined();
      expect(pkg.dependencies?.zod).toBeDefined();
    });
  });
});
