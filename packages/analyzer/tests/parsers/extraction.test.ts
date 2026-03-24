import { describe, it, expect, beforeAll } from 'vitest';
import { ParserManager, extractFunctions, extractClasses, extractImports } from '../../src/parsers/treeSitter.js';

describe('AST extraction', () => {
  const manager = ParserManager.getInstance();

  beforeAll(async () => {
    await manager.initialize();
  });

  describe('Python extraction', () => {
    it('extracts function name', () => {
      const parser = manager.getParser('python');
      const code = 'def hello():\n    pass';
      const tree = parser.parse(code);

      expect(tree).not.toBeNull();
      const functions = extractFunctions(tree!, code, 'python');

      expect(functions).toHaveLength(1);
      expect(functions[0]?.name).toBe('hello');
      expect(functions[0]?.line).toBe(1);
      expect(functions[0]?.async).toBe(false);
      tree!.delete();
    });

    it('extracts async function', () => {
      const parser = manager.getParser('python');
      const code = 'async def fetch():\n    pass';
      const tree = parser.parse(code);

      expect(tree).not.toBeNull();
      const functions = extractFunctions(tree!, code, 'python');

      expect(functions).toHaveLength(1);
      expect(functions[0]?.name).toBe('fetch');
      expect(functions[0]?.async).toBe(true);
      tree!.delete();
    });

    it('extracts class name', () => {
      const parser = manager.getParser('python');
      const code = 'class User:\n    pass';
      const tree = parser.parse(code);

      expect(tree).not.toBeNull();
      const classes = extractClasses(tree!, code, 'python');

      expect(classes).toHaveLength(1);
      expect(classes[0]?.name).toBe('User');
      expect(classes[0]?.line).toBe(1);
      tree!.delete();
    });

    it('extracts imports', () => {
      const parser = manager.getParser('python');
      const code = 'from fastapi import FastAPI';
      const tree = parser.parse(code);

      expect(tree).not.toBeNull();
      const imports = extractImports(tree!, code, 'python');

      expect(imports).toHaveLength(1);
      expect(imports[0]?.module).toBe('fastapi');
      expect(imports[0]?.line).toBe(1);
      tree!.delete();
    });
  });

  describe('TypeScript extraction', () => {
    it('extracts function name', () => {
      const parser = manager.getParser('typescript');
      const code = 'function greet(name: string): void {}';
      const tree = parser.parse(code);

      expect(tree).not.toBeNull();
      const functions = extractFunctions(tree!, code, 'typescript');

      expect(functions).toHaveLength(1);
      expect(functions[0]?.name).toBe('greet');
      expect(functions[0]?.line).toBe(1);
      tree!.delete();
    });

    it('extracts class name', () => {
      const parser = manager.getParser('typescript');
      const code = 'class User {}';
      const tree = parser.parse(code);

      expect(tree).not.toBeNull();
      const classes = extractClasses(tree!, code, 'typescript');

      expect(classes).toHaveLength(1);
      expect(classes[0]?.name).toBe('User');
      expect(classes[0]?.line).toBe(1);
      tree!.delete();
    });

    it('extracts imports', () => {
      const parser = manager.getParser('typescript');
      const code = 'import { Controller } from "@nestjs/common";';
      const tree = parser.parse(code);

      expect(tree).not.toBeNull();
      const imports = extractImports(tree!, code, 'typescript');

      expect(imports).toHaveLength(1);
      expect(imports[0]?.module).toBe('@nestjs/common');
      tree!.delete();
    });
  });

  describe('JavaScript extraction', () => {
    it('extracts function name', () => {
      const parser = manager.getParser('javascript');
      const code = 'function hello() {}';
      const tree = parser.parse(code);

      expect(tree).not.toBeNull();
      const functions = extractFunctions(tree!, code, 'javascript');

      expect(functions).toHaveLength(1);
      expect(functions[0]?.name).toBe('hello');
      tree!.delete();
    });

    it('extracts class name', () => {
      const parser = manager.getParser('javascript');
      const code = 'class App {}';
      const tree = parser.parse(code);

      expect(tree).not.toBeNull();
      const classes = extractClasses(tree!, code, 'javascript');

      expect(classes).toHaveLength(1);
      expect(classes[0]?.name).toBe('App');
      tree!.delete();
    });
  });

  describe('Go extraction', () => {
    it('extracts function name', () => {
      const parser = manager.getParser('go');
      const code = 'package main\n\nfunc main() {}';
      const tree = parser.parse(code);

      expect(tree).not.toBeNull();
      const functions = extractFunctions(tree!, code, 'go');

      expect(functions).toHaveLength(1);
      expect(functions[0]?.name).toBe('main');
      tree!.delete();
    });

    it('extracts imports', () => {
      const parser = manager.getParser('go');
      const code = 'package main\n\nimport "fmt"';
      const tree = parser.parse(code);

      expect(tree).not.toBeNull();
      const imports = extractImports(tree!, code, 'go');

      expect(imports).toHaveLength(1);
      expect(imports[0]?.module).toBe('fmt');
      tree!.delete();
    });
  });
});
