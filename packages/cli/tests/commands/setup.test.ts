import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  validateStructure,
  validateContent,
  validateCrossReferences,
  validateQuality,
  countDetectedPatterns,
  getDocumentedPatternSections,
  getMissingPatterns,
  extractFrameworkFromContent,
  getProjectName,
} from '../../src/utils/validators.js';
import type { TestEngineResult } from '../scaffolds/test-types.js';
import { createEmptyEngineResult } from '../scaffolds/test-types.js';

describe('validators', () => {
  let tmpDir: string;
  let anaPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-test-'));
    anaPath = path.join(tmpDir, '.ana');
    await fs.mkdir(anaPath, { recursive: true });
    await fs.mkdir(path.join(anaPath, 'context'), { recursive: true });
    await fs.mkdir(path.join(anaPath, 'state'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('countDetectedPatterns', () => {
    it('returns 0 when patterns undefined', () => {
      const analysis = createEmptyEngineResult();
      expect(countDetectedPatterns(analysis)).toBe(0);
    });

    it('counts non-null pattern categories', () => {
      const analysis: TestEngineResult = {
        ...createEmptyEngineResult(),
        patterns: {
          errorHandling: { library: 'exceptions', confidence: 0.9, evidence: [] },
          validation: { library: 'pydantic', confidence: 0.9, evidence: [] },
          testing: { library: 'pytest', confidence: 1.0, evidence: [] },
          sampledFiles: 20,
          detectionTime: 5000,
          threshold: 0.7,
        },
      };
      expect(countDetectedPatterns(analysis)).toBe(3);
    });
  });

  describe('getDocumentedPatternSections', () => {
    it('extracts ## headers', () => {
      const content = '## Error Handling\n\n## Validation\n\n## Framework Patterns\n';
      const sections = getDocumentedPatternSections(content);
      expect(sections).toEqual(['Error Handling', 'Validation']);
    });

    it('excludes Framework Patterns meta-section', () => {
      const content = '## Error Handling\n\n## Framework Patterns\n';
      const sections = getDocumentedPatternSections(content);
      expect(sections).toEqual(['Error Handling']);
    });
  });

  describe('extractFrameworkFromContent', () => {
    it('extracts framework name', () => {
      const content = '**Framework:** FastAPI\n';
      expect(extractFrameworkFromContent(content)).toBe('fastapi');
    });

    it('returns null for "None detected"', () => {
      const content = '**Framework:** None detected\n';
      expect(extractFrameworkFromContent(content)).toBe(null);
    });

    it('normalizes framework names', () => {
      expect(extractFrameworkFromContent('**Framework:** Next.js (App Router)\n')).toBe('nextjs');
      expect(extractFrameworkFromContent('**Framework:** Fast API\n')).toBe('fastapi');
    });
  });

  describe('validateStructure - BF1', () => {
    it('fails when scaffold marker present', async () => {
      const file = path.join(anaPath, 'context/project-context.md');
      await fs.writeFile(file, '<!-- SCAFFOLD - Setup will fill this file -->\n\nContent here');
      await fs.writeFile(path.join(anaPath, 'context/design-principles.md'), 'Content');

      const errors = await validateStructure(anaPath);
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe('BF1');
      expect(errors[0].file).toBe('context/project-context.md');
    });

    it('detects when all files have scaffold markers', async () => {
      const files = ['project-context', 'design-principles'];
      for (const f of files) {
        await fs.writeFile(
          path.join(anaPath, `context/${f}.md`),
          '<!-- SCAFFOLD - Setup will fill this file -->\n\nContent'
        );
      }

      const errors = await validateStructure(anaPath);
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe('BF1');
      expect(errors[0].file).toBe('all');
      expect(errors[0].message).toContain('Setup not yet run');
    });
  });

  describe('validateStructure - BF2', () => {
    it('fails when file missing', async () => {
      // Create one file but not both
      await fs.writeFile(path.join(anaPath, 'context/project-context.md'), 'Content');

      const errors = await validateStructure(anaPath);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.rule === 'BF2')).toBe(true);
    });
  });

  describe('validateStructure - BF3', () => {
    it('fails when file empty after marker removal', async () => {
      const file = path.join(anaPath, 'context/project-context.md');
      await fs.writeFile(file, '   \n\n   \n');
      await fs.writeFile(path.join(anaPath, 'context/design-principles.md'), 'Content');

      const errors = await validateStructure(anaPath);
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe('BF3');
    });
  });

  describe('validateContent - BF4', () => {
    it('fails when Project Context header missing', async () => {
      await fs.writeFile(
        path.join(anaPath, 'context/project-context.md'),
        '## What This Project Does\n\nContent'
      );

      const errors = await validateContent(anaPath);
      expect(errors.some(e => e.rule === 'BF4' && e.message.includes('Project Context'))).toBe(true);
    });

    it('fails when What This Project Does section missing', async () => {
      await fs.writeFile(
        path.join(anaPath, 'context/project-context.md'),
        '# Project Context\n\nContent'
      );

      const errors = await validateContent(anaPath);
      expect(errors.some(e => e.rule === 'BF4' && e.message.includes('What This Project Does'))).toBe(true);
    });
  });

  describe('validateCrossReferences', () => {
    it('returns empty errors for any snapshot (BF5/BF6 removed in S15)', async () => {
      const snapshot: TestEngineResult = {
        ...createEmptyEngineResult(),
        patterns: {
          errorHandling: { library: 'exceptions', confidence: 0.9, evidence: [] },
          testing: { library: 'pytest', confidence: 1.0, evidence: [] },
          sampledFiles: 20,
          detectionTime: 5000,
          threshold: 0.7,
        },
      };

      const errors = await validateCrossReferences(anaPath, snapshot);
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateQuality - SW1', () => {
    it('warns when file too thin', async () => {
      await fs.writeFile(path.join(anaPath, 'context/project-context.md'), '# Short\n\n');
      await fs.writeFile(path.join(anaPath, 'context/design-principles.md'), 'Content\n'.repeat(30));

      const warnings = await validateQuality(anaPath);
      expect(warnings.some(w => w.rule === 'SW1')).toBe(true);
    });
  });
});

describe('getProjectName', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('reads from package.json (priority 1)', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'my-package' })
    );
    const name = await getProjectName(tmpDir);
    expect(name).toBe('my-package');
  });

  it('reads from pyproject.toml (priority 2)', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'pyproject.toml'),
      '[project]\nname = "my-python-package"\n'
    );
    const name = await getProjectName(tmpDir);
    expect(name).toBe('my-python-package');
  });

  it('reads from go.mod (priority 3)', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'go.mod'),
      'module github.com/user/my-go-package\n'
    );
    const name = await getProjectName(tmpDir);
    expect(name).toBe('my-go-package');
  });

  it('falls back to directory name (priority 4)', async () => {
    const name = await getProjectName(tmpDir);
    expect(name).toBe(path.basename(tmpDir));
  });

  it('package.json takes priority over pyproject.toml', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'from-package-json' })
    );
    await fs.writeFile(
      path.join(tmpDir, 'pyproject.toml'),
      '[project]\nname = "from-pyproject"\n'
    );
    const name = await getProjectName(tmpDir);
    expect(name).toBe('from-package-json');
  });

  it('handles scoped package names', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: '@scope/my-package' })
    );
    const name = await getProjectName(tmpDir);
    expect(name).toBe('@scope/my-package');
  });
});
