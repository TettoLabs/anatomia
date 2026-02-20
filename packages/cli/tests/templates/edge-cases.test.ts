import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../../src/utils/template-loader.js';

describe('Template Edge Cases', () => {
  describe('Undefined variables', () => {
    it('should render undefined optional variables as empty string', () => {
      const output = renderTemplate('code.md.hbs', {
        projectName: 'Test',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        federation: false,
        // framework and language undefined
      });

      // Should not contain "undefined" text
      expect(output).not.toContain('undefined');

      // Should still render (not crash)
      expect(output).toContain('Code Mode');
    });
  });

  describe('Special characters', () => {
    it('should handle special characters in projectName', () => {
      const output = renderTemplate('ENTRY.md.hbs', {
        projectName: 'Test<Project>&Special',
        nodeId: 'test-123',
        timestamp: '2026-02-18T12:00:00Z',
        federation: false,
      });

      expect(output).toBeDefined();
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle Unicode in projectName', () => {
      const output = renderTemplate('ENTRY.md.hbs', {
        projectName: 'Tëst-Prøjéct-日本語',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        federation: false,
      });

      expect(output).toContain('Tëst-Prøjéct-日本語');
    });
  });

  describe('Boolean conditionals', () => {
    it('should show content when condition true', () => {
      const output = renderTemplate('ENTRY.md.hbs', {
        projectName: 'Test',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        federation: true,
      });

      expect(output).toContain('Federation');
    });

    it('should hide content when condition false', () => {
      const output = renderTemplate('ENTRY.md.hbs', {
        projectName: 'Test',
        nodeId: 'main',
        timestamp: '2026-02-18T12:00:00Z',
        federation: false,
      });

      expect(output).not.toContain('ana query');
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
