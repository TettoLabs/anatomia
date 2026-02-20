import { describe, it, expect, beforeAll } from 'vitest';
import { loadTemplate, renderTemplate, listTemplates } from '../../src/utils/template-loader.js';

describe('Template Loader', () => {
  beforeAll(() => {
    // Ensure test.md.hbs exists
    const templates = listTemplates();
    if (!templates.includes('test.md.hbs')) {
      throw new Error('test.md.hbs not found - run from project root or create template');
    }
  });

  describe('listTemplates', () => {
    it('should list available templates', () => {
      const templates = listTemplates();
      expect(templates).toContain('test.md.hbs');
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('loadTemplate', () => {
    it('should load and compile template', () => {
      const template = loadTemplate('test.md.hbs');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should throw error for non-existent template', () => {
      expect(() => loadTemplate('nonexistent.hbs')).toThrow(/Failed to load template/);
    });
  });

  describe('renderTemplate', () => {
    it('should render template with all variables', () => {
      const output = renderTemplate('test.md.hbs', {
        projectName: 'TestProject',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        description: 'Test description',
        federation: true,
        framework: 'fastapi',
        language: 'python',
        federationNodes: [
          { name: 'node-1', description: 'First node' },
        ],
      });

      expect(output).toContain('TestProject');
      expect(output).toContain('main');
      expect(output).toContain('fastapi');
      expect(output).toContain('Federation Enabled');
      expect(output).toContain('node-1');
    });

    it('should render template with minimal variables (undefined optionals)', () => {
      const output = renderTemplate('test.md.hbs', {
        projectName: 'MinimalProject',
        nodeId: 'test',
        timestamp: '2026-02-18T12:00:00Z',
        description: 'Minimal test',
        federation: false,
        // framework, language, notes undefined
      });

      expect(output).toContain('MinimalProject');
      expect(output).toContain('Standalone Project'); // federation: false
      expect(output).not.toContain('Federation Enabled');
      expect(output).not.toContain('undefined'); // Undefined vars → empty string
    });

    it('should handle special characters in variables (HTML escaping)', () => {
      const output = renderTemplate('test.md.hbs', {
        projectName: 'Test<Project>',
        nodeId: 'test',
        timestamp: '2026-02-18T12:00:00Z',
        description: '<script>alert("xss")</script>',
        federation: false,
      });

      // HTML should be escaped ({{var}} syntax)
      expect(output).toContain('&lt;'); // < escaped
      expect(output).not.toContain('<script>'); // Script tags escaped
    });

    it('should not include placeholder variables ({{}} replaced)', () => {
      const output = renderTemplate('test.md.hbs', {
        projectName: 'Test',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        description: 'Test',
        federation: false,
      });

      // No {{placeholder}} should remain
      expect(output).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty array in {{#each}}', () => {
      const output = renderTemplate('test.md.hbs', {
        projectName: 'Test',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        description: 'Test',
        federation: true,
        federationNodes: [], // Empty array
      });

      // Should not error, should render nothing for empty array
      expect(output).toContain('Federation Enabled');
      // But no node items (array was empty)
    });

    it('should handle boolean false in {{#if}}', () => {
      const output = renderTemplate('test.md.hbs', {
        projectName: 'Test',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        description: 'Test',
        federation: false, // Boolean false
      });

      // Federation section should not appear
      expect(output).not.toContain('Federation Enabled');
      expect(output).toContain('Standalone Project'); // Else block
    });
  });
});
