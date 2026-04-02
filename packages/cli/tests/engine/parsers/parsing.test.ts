import { describe, it, expect, beforeAll } from 'vitest';
import { ParserManager } from '../../../src/engine/parsers/treeSitter.js';
import { skipIfNoWasm } from '../fixtures.js';

const wasmAvailable = await skipIfNoWasm();

describe.skipIf(!wasmAvailable)('Tree-sitter parsing', () => {
  const manager = ParserManager.getInstance();

  beforeAll(async () => {
    await ParserManager.getInstance().initialize();
  });

  it('parses Python code', () => {

    const parser = manager.getParser('python');
    const code = 'def hello():\n    pass';
    const tree = parser.parse(code);

    expect(tree).not.toBeNull();
    expect(tree!.rootNode.type).toBe('module');
    expect(tree!.rootNode.hasError).toBe(false);  // Property syntax (0.25.0)
    tree!.delete(); // Free WASM memory
  });

  it('parses TypeScript code', () => {

    const parser = manager.getParser('typescript');
    const code = 'function greet(name: string): void {}';
    const tree = parser.parse(code);

    expect(tree).not.toBeNull();
    expect(tree!.rootNode.type).toBe('program');
    expect(tree!.rootNode.hasError).toBe(false);
    tree!.delete();
  });

  it('parses TSX code', () => {

    const parser = manager.getParser('tsx');
    const code = 'const Comp = () => <div>Hello</div>;';
    const tree = parser.parse(code);

    expect(tree).not.toBeNull();
    expect(tree!.rootNode.type).toBe('program');
    expect(tree!.rootNode.hasError).toBe(false);
    tree!.delete();
  });

  it('parses JavaScript code', () => {

    const parser = manager.getParser('javascript');
    const code = 'const x = 42;';
    const tree = parser.parse(code);

    expect(tree).not.toBeNull();
    expect(tree!.rootNode.type).toBe('program');
    expect(tree!.rootNode.hasError).toBe(false);
    tree!.delete();
  });

  it('parses Go code', () => {

    const parser = manager.getParser('go');
    const code = 'package main\n\nfunc main() {}';
    const tree = parser.parse(code);

    expect(tree).not.toBeNull();
    expect(tree!.rootNode.type).toBe('source_file');
    expect(tree!.rootNode.hasError).toBe(false);
    tree!.delete();
  });

  it('detects syntax errors (hasError property)', () => {

    const parser = manager.getParser('python');
    const malformed = 'def broken(\n    pass';  // Missing closing paren
    const tree = parser.parse(malformed);

    expect(tree).not.toBeNull();
    // Tree-sitter doesn't throw - returns tree with ERROR nodes
    expect(tree!.rootNode.type).toBe('module');
    expect(tree!.rootNode.hasError).toBe(true);  // Property (not method!)
    tree!.delete();
  });

  it('handles empty code', () => {

    const parser = manager.getParser('python');
    const tree = parser.parse('');

    expect(tree).not.toBeNull();
    expect(tree!.rootNode.type).toBe('module');
    expect(tree!.rootNode.hasError).toBe(false);
    tree!.delete();
  });
});
