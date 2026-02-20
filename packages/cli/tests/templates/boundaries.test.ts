import { describe, it, expect, beforeEach } from 'vitest';
import { renderTemplate } from '../../src/utils/template-loader.js';

describe('Mode Boundary Examples', () => {
  const testData = {
    projectName: 'Test',
    nodeId: 'main',
    timestamp: '2026-02-18T12:00:00Z',
    federation: false,
  };

  const modes = ['architect', 'code', 'debug', 'docs', 'test'];

  modes.forEach((mode) => {
    describe(`${mode}.md.hbs`, () => {
      let output: string;

      beforeEach(() => {
        output = renderTemplate(`${mode}.md.hbs`, testData);
      });

      it('should have Purpose section', () => {
        expect(output).toContain('## Purpose');
      });

      it('should have What This Mode Produces section', () => {
        expect(output).toContain('## What This Mode Produces');
      });

      it('should have What This Mode Delegates section', () => {
        expect(output).toContain('## What This Mode Delegates');
      });

      it('should have Hard Constraints section', () => {
        expect(output).toContain('## Hard Constraints');
      });

      it('should have Good Examples section', () => {
        expect(output).toContain('## Good Examples');
        // Should have at least 3 good examples (target is 5)
        const goodSection = output.split('## Good Examples')[1]?.split('##')[0] || '';
        const exampleCount = (goodSection.match(/\*\*Example \d:/g) || []).length;
        expect(exampleCount).toBeGreaterThanOrEqual(3);
      });

      it('should have Bad Examples section', () => {
        expect(output).toContain('## Bad Examples');
        // Should have at least 3 bad examples (target is 5)
        const badSection = output.split('## Bad Examples')[1]?.split('##')[0] || '';
        const exampleCount = (badSection.match(/\*\*Example \d:/g) || []).length;
        expect(exampleCount).toBeGreaterThanOrEqual(3);
      });

      it('should use strong constraint language', () => {
        // Should include at least one strong prohibition
        const hasStrong =
          output.includes('NEVER') ||
          output.includes('MUST NOT') ||
          output.includes('ALWAYS') ||
          output.includes('MUST');
        expect(hasStrong).toBe(true);
      });

      it('should reference other modes in delegation', () => {
        // Delegation section should mention other modes
        const delegatesSection = output.split('## What This Mode Delegates')[1]?.split('##')[0] || '';
        const mentionsOtherMode =
          delegatesSection.includes('architect mode') ||
          delegatesSection.includes('code mode') ||
          delegatesSection.includes('debug mode') ||
          delegatesSection.includes('docs mode') ||
          delegatesSection.includes('test mode');
        expect(mentionsOtherMode).toBe(true);
      });
    });
  });
});
