import { describe, it, expect, beforeAll } from 'vitest';
import { loadTemplate, renderTemplate, listTemplates } from '../../src/utils/template-loader.js';

describe('Template Loader', () => {
  beforeAll(() => {
    // Ensure ENTRY.md.hbs exists for testing
    const templates = listTemplates();
    if (!templates.includes('ENTRY.md.hbs')) {
      throw new Error('ENTRY.md.hbs not found - run from project root or create template');
    }
  });

  describe('listTemplates', () => {
    it('should list available templates', () => {
      const templates = listTemplates();
      expect(templates).toContain('ENTRY.md.hbs');
      expect(templates.length).toBeGreaterThanOrEqual(7); // ENTRY, node.json, 5 modes
    });
  });

  describe('loadTemplate', () => {
    it('should load and compile template', () => {
      const template = loadTemplate('ENTRY.md.hbs');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should throw error for non-existent template', () => {
      expect(() => loadTemplate('nonexistent.hbs')).toThrow(/Failed to load template/);
    });
  });

  describe('renderTemplate', () => {
    it('should render template with all variables', () => {
      const output = renderTemplate('ENTRY.md.hbs', {
        projectName: 'TestProject',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        federation: true,
      });

      expect(output).toContain('TestProject');
      expect(output).toContain('main');
      expect(output).toContain('Federation (Multi-Service Context)'); // federation: true
    });

    it('should render template with minimal variables (undefined optionals)', () => {
      const output = renderTemplate('ENTRY.md.hbs', {
        projectName: 'MinimalProject',
        nodeId: 'test',
        timestamp: '2026-02-18T12:00:00Z',
        federation: false,
      });

      expect(output).toContain('MinimalProject');
      expect(output).not.toContain('Federation (Multi-Service Context)'); // federation: false
      expect(output).not.toContain('undefined'); // Undefined vars → empty string
    });

    it('should handle special characters in variables (HTML escaping)', () => {
      const output = renderTemplate('ENTRY.md.hbs', {
        projectName: 'Test<Project>',
        nodeId: 'test',
        timestamp: '2026-02-18T12:00:00Z',
        federation: false,
      });

      // HTML should be escaped ({{var}} syntax)
      expect(output).toContain('&lt;'); // < escaped
      expect(output).not.toContain('<Project>'); // Angle brackets escaped
    });

    it('should not include placeholder variables ({{}} replaced)', () => {
      const output = renderTemplate('ENTRY.md.hbs', {
        projectName: 'Test',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        federation: false,
      });

      // No {{placeholder}} should remain
      expect(output).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle boolean true in {{#if}}', () => {
      const output = renderTemplate('ENTRY.md.hbs', {
        projectName: 'Test',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        federation: true,
      });

      // Federation section should appear
      expect(output).toContain('Federation (Multi-Service Context)');
    });

    it('should handle boolean false in {{#if}}', () => {
      const output = renderTemplate('ENTRY.md.hbs', {
        projectName: 'Test',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        federation: false,
      });

      // Federation section should not appear
      expect(output).not.toContain('Federation (Multi-Service Context)');
    });
  });
});
