import { describe, it, expect } from 'vitest';
import { ParserManager } from '../../src/parsers/treeSitter.js';

describe('ParserManager', () => {
  it('getInstance returns singleton', () => {
    const instance1 = ParserManager.getInstance();
    const instance2 = ParserManager.getInstance();

    expect(instance1).toBe(instance2);  // Same instance
  });

  it('creates Python parser', () => {
    const manager = ParserManager.getInstance();
    const parser = manager.getParser('python');

    expect(parser).toBeDefined();
    expect(typeof parser.parse).toBe('function');
  });

  it('creates TypeScript parser', () => {
    const manager = ParserManager.getInstance();
    const parser = manager.getParser('typescript');

    expect(parser).toBeDefined();
  });

  it('creates TSX parser (separate from TypeScript)', () => {
    const manager = ParserManager.getInstance();
    const tsParser = manager.getParser('typescript');
    const tsxParser = manager.getParser('tsx');

    // Should return different parsers (different grammars)
    expect(tsxParser).toBeDefined();
    expect(tsxParser).not.toBe(tsParser);  // Different instances OK
  });

  it('creates JavaScript parser', () => {
    const manager = ParserManager.getInstance();
    const parser = manager.getParser('javascript');

    expect(parser).toBeDefined();
  });

  it('creates Go parser', () => {
    const manager = ParserManager.getInstance();
    const parser = manager.getParser('go');

    expect(parser).toBeDefined();
  });

  it('reuses parser for same language', () => {
    const manager = ParserManager.getInstance();
    const parser1 = manager.getParser('python');
    const parser2 = manager.getParser('python');

    expect(parser1).toBe(parser2);  // Same instance (pooling works)
  });

  it('throws on unsupported language', () => {
    const manager = ParserManager.getInstance();

    // @ts-expect-error Testing invalid language
    expect(() => manager.getParser('ruby')).toThrow('Unsupported language');
  });
});
