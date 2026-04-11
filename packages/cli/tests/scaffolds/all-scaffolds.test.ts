import { describe, it, expect } from 'vitest';
import {
  generateProjectContextScaffold,
  generateDesignPrinciplesTemplate,
} from '../../src/utils/scaffold-generators.js';
import { createEmptyEngineResult } from '../../src/engine/types/engineResult.js';

describe('scaffold generators (S15 consolidated: 2 generators)', () => {
  const result = createEmptyEngineResult();

  describe('generateProjectContextScaffold', () => {
    it('produces scaffold with D6.6 sections', () => {
      const output = generateProjectContextScaffold(result);
      expect(output).toContain('<!-- SCAFFOLD');
      expect(output).toContain('# Project Context');
      expect(output).toContain('## What This Project Does');
      expect(output).toContain('## Architecture');
      expect(output).toContain('## Key Decisions');
      expect(output).toContain('## Key Files');
      expect(output).toContain('## Active Constraints');
      expect(output).toContain('## Domain Vocabulary');
    });

    it('has 6 sections', () => {
      const output = generateProjectContextScaffold(result);
      const sections = (output.match(/^## /gm) || []).length;
      expect(sections).toBe(6);
    });

    it('includes Detected lines when stack data present', () => {
      const richResult = {
        ...result,
        stack: { ...result.stack, language: 'TypeScript', framework: 'Next.js', database: 'PostgreSQL' },
        externalServices: [{ name: 'Stripe', category: 'Payments', source: 'dependency', configFound: false, stackRoles: [] }],
        commands: { ...result.commands, build: 'pnpm build', test: 'vitest' },
      };

      const output = generateProjectContextScaffold(richResult);
      expect(output).toContain('**Detected:** TypeScript · Next.js · PostgreSQL');
      expect(output).toContain('**Detected services:** Stripe');
      expect(output).toContain('**Detected commands:**');
    });

    it('omits Detected lines when data is null', () => {
      const output = generateProjectContextScaffold(result);
      // Empty result should have no Detected lines for stack (all null)
      expect(output).not.toMatch(/\*\*Detected:\*\* null/);
    });

    it('includes monorepo info when detected', () => {
      const monoResult = {
        ...result,
        monorepo: { isMonorepo: true, tool: 'pnpm', packages: [{ name: 'api', path: 'packages/api' }, { name: 'web', path: 'packages/web' }] },
      };

      const output = generateProjectContextScaffold(monoResult);
      expect(output).toContain('pnpm · 2 packages');
    });
  });

  describe('generateDesignPrinciplesTemplate', () => {
    it('returns static template with no scan data', () => {
      const output = generateDesignPrinciplesTemplate();
      expect(output).toContain('# Design Principles');
      expect(output).toContain('What does your team believe');
      expect(output).not.toContain('**Detected:**');
    });

    it('is pure placeholder content', () => {
      const output = generateDesignPrinciplesTemplate();
      // Should be entirely HTML comments (placeholder) plus the heading
      expect(output).toContain('<!--');
      expect(output).toContain('-->');
    });
  });
});
