import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { detectReadme, cleanContent } from '../../../src/engine/detectors/readme.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'readme-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('detectReadme', () => {
  // @ana A001
  describe('extracts README content into result.readme', () => {
    it('returns a ReadmeResult when README has matching headings', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# My Project',
        '',
        '## About',
        '',
        'A tool for scanning projects.',
        '',
        '## Installation',
        '',
        '`npm install my-project`',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.description).toBeTruthy();
      expect(result!.setup).toBeTruthy();
    });
  });

  // @ana A002
  describe('extracts description from README heading', () => {
    it('extracts About section as description', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# Title',
        '',
        '## About',
        '',
        'This is the project description from the About heading.',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.description).toBe('This is the project description from the About heading.');
    });
  });

  // @ana A003
  describe('tracks extraction source', () => {
    it('sets source to heading when headings match', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# Title',
        '## Overview',
        'Some overview content.',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.source).toBe('heading');
    });
  });

  // @ana A008
  describe('enforces per-section character cap', () => {
    it('truncates a section at 1500 characters', async () => {
      const longContent = 'A'.repeat(2000);
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# Title',
        '## About',
        longContent,
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.description!.length).toBe(1500);
    });
  });

  // @ana A009
  describe('enforces total character cap', () => {
    it('caps total extraction at 5000 characters', async () => {
      const content1800 = 'word '.repeat(360).trim(); // ~1800 chars
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# Title',
        '## About',
        content1800,
        '## Architecture',
        content1800,
        '## Installation',
        content1800,
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      const total =
        (result!.description?.length ?? 0) +
        (result!.architecture?.length ?? 0) +
        (result!.setup?.length ?? 0);
      expect(total).toBeLessThanOrEqual(5000);
    });
  });

  // @ana A010
  describe('detects README.md', () => {
    it('reads README.md (exact case)', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), '## About\nContent here.');
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
    });
  });

  // @ana A011
  describe('detects readme.md lowercase', () => {
    it('reads readme.md', async () => {
      await fs.writeFile(path.join(tmpDir, 'readme.md'), '## Overview\nLowercase readme.');
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
    });
  });

  // @ana A012
  describe('detects Readme.md mixed case', () => {
    it('reads Readme.md', async () => {
      await fs.writeFile(path.join(tmpDir, 'Readme.md'), '## About\nMixed case.');
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
    });
  });

  // @ana A013
  describe('detects README without extension', () => {
    it('reads README (no .md)', async () => {
      await fs.writeFile(path.join(tmpDir, 'README'), '## About\nNo extension.');
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
    });
  });

  // @ana A014
  describe('reads root README in monorepo', () => {
    it('reads root README content, not package READMEs', async () => {
      // Root README
      await fs.writeFile(path.join(tmpDir, 'README.md'), '## About\nroot readme content for the monorepo.');
      // Package README — should not be read since detectReadme takes rootPath
      await fs.mkdir(path.join(tmpDir, 'packages', 'api'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'packages', 'api', 'README.md'),
        '## About\npackage readme content.',
      );
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.description).toContain('root readme content');
    });
  });

  // @ana A015
  describe('returns null when no README exists', () => {
    it('returns null for directory without README', async () => {
      const result = await detectReadme(tmpDir);
      expect(result).toBeNull();
    });
  });

  // @ana A016
  describe('handles missing README gracefully', () => {
    it('does not throw when README is absent', async () => {
      await expect(detectReadme(tmpDir)).resolves.toBeNull();
    });
  });

  // @ana A017
  describe('strips badges from content', () => {
    it('removes badge markdown patterns', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# Title',
        '![badge](https://img.shields.io/badge/test-passing-green)',
        '## About',
        '![badge](https://badge.url) Real description here.',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.description).not.toContain('![badge]');
      expect(result!.description).toContain('Real description here.');
    });
  });

  // @ana A018
  describe('strips images from content', () => {
    it('removes image markdown patterns', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# Title',
        '## About',
        '![image](screenshot.png) Description after image.',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.description).not.toContain('![image]');
      expect(result!.description).toContain('Description after image.');
    });
  });

  // @ana A019
  describe('strips HTML tags from content', () => {
    it('removes HTML tags', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# Title',
        '## About',
        '<div>Some HTML</div> Plain text here.',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.description).not.toContain('<div>');
      expect(result!.description).toContain('Some HTML');
      expect(result!.description).toContain('Plain text here.');
    });
  });

  // @ana A020
  describe('maps Installation to setup', () => {
    it('extracts Installation heading as setup', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# Title',
        '## Installation',
        'Run npm install.',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.setup).toBe('Run npm install.');
    });
  });

  // @ana A021
  describe('maps Getting Started to setup', () => {
    it('extracts Getting Started heading as setup', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# Title',
        '## Getting Started',
        '1. Clone the repo\n2. Run npm install',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.setup).toContain('Clone the repo');
    });
  });

  // @ana A022
  describe('maps About to description', () => {
    it('extracts About heading as description', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# Title',
        '## About',
        'This is the about section.',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.description).toBe('This is the about section.');
    });
  });

  // @ana A023
  describe('maps Architecture to architecture', () => {
    it('extracts Architecture heading as architecture', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# Title',
        '## Architecture',
        'Three layers: commands, engine, utils.',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.architecture).toBe('Three layers: commands, engine, utils.');
    });
  });

  // @ana A024
  describe('falls back to first paragraph', () => {
    it('uses first paragraph when no headings match', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# My Unusual Project',
        '',
        'A fast, minimal HTTP framework for Node.js built on modern standards.',
        '',
        '## License',
        'MIT',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.source).toBe('fallback');
    });
  });

  // @ana A025
  describe('fallback populates description', () => {
    it('sets description from first paragraph in fallback mode', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# My Project',
        '',
        'A fast, minimal HTTP framework for Node.js.',
        '',
        '## License',
        'MIT',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.description).toBe('A fast, minimal HTTP framework for Node.js.');
    });
  });

  // @ana A026
  describe('returns null for badge-only README', () => {
    it('returns null when README is only badges', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '![badge1](https://img.shields.io/badge/a-b-green)',
        '![badge2](https://img.shields.io/badge/c-d-blue)',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).toBeNull();
    });
  });

  // @ana A027
  describe('matches headings case-insensitively', () => {
    it('matches INSTALLATION (uppercase) to setup', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# Title',
        '## INSTALLATION',
        'Run the installer.',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.setup).toBe('Run the installer.');
    });

    it('matches installation (lowercase) to setup', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), [
        '# Title',
        '## installation',
        'Run npm install.',
      ].join('\n'));
      const result = await detectReadme(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.setup).toBe('Run npm install.');
    });
  });

  // @ana A028
  describe('readme field exists on EngineResult type', () => {
    it('EngineResult includes readme field', async () => {
      const { createEmptyEngineResult } = await import('../../../src/engine/types/engineResult.js');
      const result = createEmptyEngineResult();
      expect(result).toHaveProperty('readme');
    });
  });

  // @ana A029
  describe('factory includes readme field', () => {
    it('createEmptyEngineResult has readme: null', async () => {
      const { createEmptyEngineResult } = await import('../../../src/engine/types/engineResult.js');
      const result = createEmptyEngineResult();
      expect(result.readme).toBeNull();
    });
  });
});

describe('cleanContent', () => {
  it('strips badge markdown', () => {
    const input = '![Build](https://ci.example.com/badge.svg) Hello';
    expect(cleanContent(input)).toBe('Hello');
  });

  it('strips HTML tags', () => {
    const input = '<p>Hello</p> <br/> World';
    expect(cleanContent(input)).toBe('Hello  World');
  });

  it('preserves markdown links', () => {
    const input = 'See [docs](https://example.com) for more.';
    expect(cleanContent(input)).toBe('See [docs](https://example.com) for more.');
  });

  it('preserves inline code', () => {
    const input = 'Run `npm install` to get started.';
    expect(cleanContent(input)).toBe('Run `npm install` to get started.');
  });

  it('preserves markdown lists', () => {
    const input = '- Item 1\n- Item 2\n- Item 3';
    expect(cleanContent(input)).toBe('- Item 1\n- Item 2\n- Item 3');
  });

  it('collapses multiple blank lines', () => {
    const input = 'Line 1\n\n\n\nLine 2';
    expect(cleanContent(input)).toBe('Line 1\n\nLine 2');
  });
});
