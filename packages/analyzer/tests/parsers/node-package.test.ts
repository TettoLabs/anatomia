import { describe, it, expect } from 'vitest';
import { parsePackageJson } from '../../src/parsers/node/package.js';

describe('parsePackageJson', () => {
  describe('basic parsing', () => {
    it('extracts dependencies', () => {
      const content = JSON.stringify({
        name: 'my-app',
        dependencies: {
          express: '^4.18.0',
          next: '15.0.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toHaveLength(2);
      expect(result).toContain('express');
      expect(result).toContain('next');
    });

    it('extracts devDependencies', () => {
      const content = JSON.stringify({
        name: 'my-app',
        devDependencies: {
          vitest: '^2.0.0',
          typescript: '^5.7.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toHaveLength(2);
      expect(result).toContain('vitest');
      expect(result).toContain('typescript');
    });

    it('extracts peerDependencies', () => {
      const content = JSON.stringify({
        name: 'my-app',
        peerDependencies: {
          react: '>=18.0.0',
          'react-dom': '>=18.0.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toHaveLength(2);
      expect(result).toContain('react');
      expect(result).toContain('react-dom');
    });

    it('combines all dependency sections', () => {
      const content = JSON.stringify({
        name: 'my-app',
        dependencies: {
          express: '^4.18.0',
        },
        devDependencies: {
          vitest: '^2.0.0',
          typescript: '^5.7.0',
        },
        peerDependencies: {
          react: '>=18.0.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toHaveLength(4);
      expect(result).toContain('express');
      expect(result).toContain('vitest');
      expect(result).toContain('typescript');
      expect(result).toContain('react');
    });
  });

  describe('scoped packages', () => {
    it('preserves @ symbol in scoped packages', () => {
      const content = JSON.stringify({
        dependencies: {
          '@nestjs/core': '^10.0.0',
          '@types/node': '^20.0.0',
          '@anthropic-ai/sdk': '>=0.32.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toHaveLength(3);
      expect(result).toContain('@nestjs/core');
      expect(result).toContain('@types/node');
      expect(result).toContain('@anthropic-ai/sdk');
    });

    it('handles mixed scoped and non-scoped packages', () => {
      const content = JSON.stringify({
        dependencies: {
          express: '^4.18.0',
          '@nestjs/core': '^10.0.0',
          next: '15.0.0',
          '@types/node': '^20.0.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toHaveLength(4);
      expect(result).toContain('express');
      expect(result).toContain('@nestjs/core');
      expect(result).toContain('next');
      expect(result).toContain('@types/node');
    });
  });

  describe('lowercase normalization', () => {
    it('converts uppercase packages to lowercase', () => {
      const content = JSON.stringify({
        dependencies: {
          Express: '^4.18.0',
          NEXT: '15.0.0',
          TypeScript: '^5.7.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toHaveLength(3);
      expect(result).toContain('express');
      expect(result).toContain('next');
      expect(result).toContain('typescript');
      expect(result).not.toContain('Express');
      expect(result).not.toContain('NEXT');
      expect(result).not.toContain('TypeScript');
    });

    it('preserves @ in scoped packages while lowercasing', () => {
      const content = JSON.stringify({
        dependencies: {
          '@NestJS/Core': '^10.0.0',
          '@TYPES/Node': '^20.0.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toHaveLength(2);
      expect(result).toContain('@nestjs/core');
      expect(result).toContain('@types/node');
    });
  });

  describe('deduplication', () => {
    it('deduplicates same package in multiple sections', () => {
      const content = JSON.stringify({
        dependencies: {
          typescript: '^5.7.0',
        },
        devDependencies: {
          typescript: '^5.7.0',
        },
        peerDependencies: {
          typescript: '>=5.0.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toHaveLength(1);
      expect(result).toContain('typescript');
    });

    it('deduplicates case-insensitive duplicates', () => {
      const content = JSON.stringify({
        dependencies: {
          Express: '^4.18.0',
        },
        devDependencies: {
          express: '^4.18.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toHaveLength(1);
      expect(result).toContain('express');
    });
  });

  describe('error handling', () => {
    it('returns empty array for invalid JSON', () => {
      const content = '{ invalid json }';

      const result = parsePackageJson(content);

      expect(result).toEqual([]);
    });

    it('returns empty array for malformed JSON', () => {
      const content = '{ "name": "test", "dependencies": { "express": }';

      const result = parsePackageJson(content);

      expect(result).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      const content = '';

      const result = parsePackageJson(content);

      expect(result).toEqual([]);
    });

    it('returns empty array for non-object JSON', () => {
      const content = JSON.stringify(['not', 'an', 'object']);

      const result = parsePackageJson(content);

      expect(result).toEqual([]);
    });

    it('returns empty array for null', () => {
      const content = 'null';

      const result = parsePackageJson(content);

      expect(result).toEqual([]);
    });

    it('returns empty array for primitive values', () => {
      expect(parsePackageJson('42')).toEqual([]);
      expect(parsePackageJson('"string"')).toEqual([]);
      expect(parsePackageJson('true')).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles empty package.json', () => {
      const content = JSON.stringify({});

      const result = parsePackageJson(content);

      expect(result).toEqual([]);
    });

    it('handles package.json without dependencies', () => {
      const content = JSON.stringify({
        name: 'my-app',
        version: '1.0.0',
        description: 'My app',
      });

      const result = parsePackageJson(content);

      expect(result).toEqual([]);
    });

    it('handles empty dependency sections', () => {
      const content = JSON.stringify({
        name: 'my-app',
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
      });

      const result = parsePackageJson(content);

      expect(result).toEqual([]);
    });

    it('handles workspace packages', () => {
      const content = JSON.stringify({
        dependencies: {
          '@anatomia/shared': 'workspace:*',
          '@anatomia/core': 'workspace:^1.0.0',
          express: '^4.18.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toHaveLength(3);
      expect(result).toContain('@anatomia/shared');
      expect(result).toContain('@anatomia/core');
      expect(result).toContain('express');
    });

    it('handles file: and link: protocols', () => {
      const content = JSON.stringify({
        dependencies: {
          'local-pkg': 'file:../local-pkg',
          'linked-pkg': 'link:../linked-pkg',
          express: '^4.18.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toHaveLength(3);
      expect(result).toContain('local-pkg');
      expect(result).toContain('linked-pkg');
      expect(result).toContain('express');
    });

    it('handles git URLs as versions', () => {
      const content = JSON.stringify({
        dependencies: {
          'my-package': 'git+https://github.com/user/repo.git',
          express: '^4.18.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toHaveLength(2);
      expect(result).toContain('my-package');
      expect(result).toContain('express');
    });

    it('handles dependencies as array (invalid but should not crash)', () => {
      const content = JSON.stringify({
        dependencies: ['express', 'next'],
      });

      const result = parsePackageJson(content);

      expect(result).toEqual([]);
    });

    it('handles dependencies as string (invalid but should not crash)', () => {
      const content = JSON.stringify({
        dependencies: 'express',
      });

      const result = parsePackageJson(content);

      expect(result).toEqual([]);
    });
  });

  describe('real-world examples', () => {
    it('parses Next.js app package.json', () => {
      const content = JSON.stringify({
        name: 'nextjs-app',
        version: '0.1.0',
        dependencies: {
          next: '15.0.0',
          react: '^18.0.0',
          'react-dom': '^18.0.0',
        },
        devDependencies: {
          '@types/node': '^20.0.0',
          '@types/react': '^18.0.0',
          typescript: '^5.7.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toContain('next');
      expect(result).toContain('react');
      expect(result).toContain('react-dom');
      expect(result).toContain('@types/node');
      expect(result).toContain('@types/react');
      expect(result).toContain('typescript');
    });

    it('parses NestJS app package.json', () => {
      const content = JSON.stringify({
        name: 'nestjs-app',
        dependencies: {
          '@nestjs/common': '^10.0.0',
          '@nestjs/core': '^10.0.0',
          '@nestjs/platform-express': '^10.0.0',
          rxjs: '^7.8.0',
        },
        devDependencies: {
          '@nestjs/cli': '^10.0.0',
          '@nestjs/testing': '^10.0.0',
          typescript: '^5.7.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toContain('@nestjs/common');
      expect(result).toContain('@nestjs/core');
      expect(result).toContain('@nestjs/platform-express');
      expect(result).toContain('@nestjs/cli');
      expect(result).toContain('@nestjs/testing');
    });

    it('parses Express app package.json', () => {
      const content = JSON.stringify({
        name: 'express-app',
        dependencies: {
          express: '^4.18.0',
          cors: '^2.8.5',
          dotenv: '^16.0.0',
        },
        devDependencies: {
          nodemon: '^3.0.0',
          '@types/express': '^4.17.0',
          typescript: '^5.7.0',
        },
      });

      const result = parsePackageJson(content);

      expect(result).toContain('express');
      expect(result).toContain('cors');
      expect(result).toContain('nodemon');
      expect(result).toContain('@types/express');
    });
  });
});
