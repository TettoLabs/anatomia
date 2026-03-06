import { describe, it, expect } from 'vitest';
import { ParserManager, extractFunctions, extractClasses, extractImports } from '../../src/parsers/treeSitter.js';

describe('AST extraction', () => {
  describe('Python extraction', () => {
    const parser = ParserManager.getInstance().getParser('python');

    it('extracts function name', () => {
      const code = 'def hello():\n    pass';
      const tree = parser.parse(code);
      const functions = extractFunctions(tree, code, 'python');

      expect(functions).toHaveLength(1);
      expect(functions[0]?.name).toBe('hello');
      expect(functions[0]?.line).toBe(1);
      expect(functions[0]?.async).toBe(false);
    });

    it('extracts async function', () => {
      const code = 'async def fetch():\n    pass';
      const tree = parser.parse(code);
      const functions = extractFunctions(tree, code, 'python');

      expect(functions).toHaveLength(1);
      expect(functions[0]?.name).toBe('fetch');
      expect(functions[0]?.async).toBe(true);
    });

    it('extracts class name', () => {
      const code = 'class User:\n    pass';
      const tree = parser.parse(code);
      const classes = extractClasses(tree, code, 'python');

      expect(classes).toHaveLength(1);
      expect(classes[0]?.name).toBe('User');
      expect(classes[0]?.line).toBe(1);
    });

    it('extracts imports', () => {
      const code = 'from fastapi import FastAPI';
      const tree = parser.parse(code);
      const imports = extractImports(tree, code, 'python');

      expect(imports).toHaveLength(1);
      expect(imports[0]?.module).toBe('fastapi');
      expect(imports[0]?.line).toBe(1);
    });
  });

  describe('TypeScript extraction', () => {
    const parser = ParserManager.getInstance().getParser('typescript');

    it('extracts function name', () => {
      const code = 'function greet(name: string): void {}';
      const tree = parser.parse(code);
      const functions = extractFunctions(tree, code, 'typescript');

      expect(functions).toHaveLength(1);
      expect(functions[0]?.name).toBe('greet');
      expect(functions[0]?.line).toBe(1);
    });

    it('extracts class name', () => {
      const code = 'class User {}';
      const tree = parser.parse(code);
      const classes = extractClasses(tree, code, 'typescript');

      expect(classes).toHaveLength(1);
      expect(classes[0]?.name).toBe('User');
      expect(classes[0]?.line).toBe(1);
    });

    it('extracts imports', () => {
      const code = 'import { Controller } from "@nestjs/common";';
      const tree = parser.parse(code);
      const imports = extractImports(tree, code, 'typescript');

      expect(imports).toHaveLength(1);
      expect(imports[0]?.module).toBe('@nestjs/common');
    });
  });

  describe('JavaScript extraction', () => {
    const parser = ParserManager.getInstance().getParser('javascript');

    it('extracts function name', () => {
      const code = 'function hello() {}';
      const tree = parser.parse(code);
      const functions = extractFunctions(tree, code, 'javascript');

      expect(functions).toHaveLength(1);
      expect(functions[0]?.name).toBe('hello');
    });

    it('extracts class name', () => {
      const code = 'class App {}';
      const tree = parser.parse(code);
      const classes = extractClasses(tree, code, 'javascript');

      expect(classes).toHaveLength(1);
      expect(classes[0]?.name).toBe('App');
    });
  });

  describe('Go extraction', () => {
    const parser = ParserManager.getInstance().getParser('go');

    it('extracts function name', () => {
      const code = 'package main\n\nfunc main() {}';
      const tree = parser.parse(code);
      const functions = extractFunctions(tree, code, 'go');

      expect(functions).toHaveLength(1);
      expect(functions[0]?.name).toBe('main');
    });

    it('extracts imports', () => {
      const code = 'package main\n\nimport "fmt"';
      const tree = parser.parse(code);
      const imports = extractImports(tree, code, 'go');

      expect(imports).toHaveLength(1);
      expect(imports[0]?.module).toBe('fmt');
    });
  });
});
