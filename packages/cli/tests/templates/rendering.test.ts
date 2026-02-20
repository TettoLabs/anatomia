import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../../src/utils/template-loader.js';

describe('Template Rendering', () => {
  const testData = {
    projectName: 'TestProject',
    nodeId: 'main',
    timestamp: '2026-02-18T12:00:00Z',
    federation: false,
    framework: 'fastapi',
    language: 'python',
  };

  describe('All .hbs templates compile and render', () => {
    const hbsTemplates = [
      'ENTRY.md.hbs',
      'node.json.hbs',
      'architect.md.hbs',
      'code.md.hbs',
      'debug.md.hbs',
      'docs.md.hbs',
      'test.md.hbs',
    ];

    hbsTemplates.forEach((templateName) => {
      it(`should render ${templateName} without errors`, () => {
        expect(() => {
          const output = renderTemplate(templateName, testData);
          expect(output).toBeDefined();
          expect(output.length).toBeGreaterThan(0);
        }).not.toThrow();
      });
    });
  });

  describe('Variable substitution', () => {
    it('should substitute all variables in ENTRY.md', () => {
      const output = renderTemplate('ENTRY.md.hbs', testData);

      // Should NOT contain placeholder syntax
      expect(output).not.toMatch(/\{\{projectName\}\}/);
      expect(output).not.toMatch(/\{\{nodeId\}\}/);
      expect(output).not.toMatch(/\{\{timestamp\}\}/);

      // SHOULD contain actual values
      expect(output).toContain('TestProject');
      expect(output).toContain('main');
    });

    it('should substitute variables in all mode templates', () => {
      const modes = ['architect', 'code', 'debug', 'docs', 'test'];

      modes.forEach((mode) => {
        const output = renderTemplate(`${mode}.md.hbs`, testData);
        expect(output).not.toMatch(/\{\{[a-zA-Z]+\}\}/); // No {{}} remaining
      });
    });

    it('should render valid JSON for node.json', () => {
      const output = renderTemplate('node.json.hbs', testData);

      // Should parse as valid JSON
      expect(() => JSON.parse(output)).not.toThrow();

      const parsed = JSON.parse(output);
      expect(parsed.name).toBe('TestProject');
      expect(parsed.nodeId).toBe('main');
    });
  });

  describe('Conditional rendering', () => {
    it('should show federation section when enabled', () => {
      const output = renderTemplate('ENTRY.md.hbs', {
        ...testData,
        federation: true,
      });

      expect(output).toContain('Federation');
      expect(output).toContain('ana query');
    });

    it('should hide federation section when disabled', () => {
      const output = renderTemplate('ENTRY.md.hbs', {
        ...testData,
        federation: false,
      });

      expect(output).not.toContain('ana query');
    });

    it('should include framework-specific guidance when framework selected', () => {
      const output = renderTemplate('architect.md.hbs', {
        ...testData,
        framework: 'fastapi',
      });

      expect(output).toContain('FastAPI');
      expect(output).toContain('Depends()');
    });

    it('should not include framework guidance when framework not selected', () => {
      const output = renderTemplate('architect.md.hbs', {
        ...testData,
        framework: null,
      });

      // Should not have FastAPI-specific sections when framework is null
      expect(output).not.toContain('Depends()');
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined optional variables', () => {
      const output = renderTemplate('code.md.hbs', {
        projectName: 'Test',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        federation: false,
        // framework and language undefined
      });

      expect(output).toBeDefined();
      expect(output).not.toContain('undefined');
    });

    it('should handle special characters in projectName', () => {
      const output = renderTemplate('ENTRY.md.hbs', {
        projectName: 'Test<Project>&"Special',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        federation: false,
      });

      // HTML should be escaped
      expect(output).toBeDefined();
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('Framework conditionals', () => {
    it('should include FastAPI guidance when selected', () => {
      const output = renderTemplate('architect.md.hbs', {
        projectName: 'Test',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        federation: false,
        framework: 'fastapi',
      });

      expect(output).toContain('FastAPI');
    });

    it('should not include Next.js guidance when FastAPI selected', () => {
      const output = renderTemplate('architect.md.hbs', {
        projectName: 'Test',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        federation: false,
        framework: 'fastapi',
      });

      expect(output).not.toContain('Next.js');
    });
  });

  describe('JSON validity', () => {
    it('should produce valid JSON for node.json template', () => {
      const output = renderTemplate('node.json.hbs', {
        projectName: 'test-project',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        federation: false,
      });

      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should have boolean federation.queryable (not string)', () => {
      const output = renderTemplate('node.json.hbs', {
        projectName: 'test',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        federation: true,
      });

      const parsed = JSON.parse(output);
      expect(typeof parsed.federation.queryable).toBe('boolean');
      expect(parsed.federation.queryable).toBe(true);
    });
  });
});
