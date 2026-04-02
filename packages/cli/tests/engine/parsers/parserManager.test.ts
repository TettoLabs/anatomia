import { describe, it, expect, beforeAll } from 'vitest';
import { ParserManager } from '../../../src/engine/parsers/treeSitter.js';

describe('ParserManager', () => {
  const manager = ParserManager.getInstance();

  beforeAll(async () => {
    await manager.initialize();
  });

  it('getInstance returns singleton', () => {
    const instance1 = ParserManager.getInstance();
    const instance2 = ParserManager.getInstance();

    expect(instance1).toBe(instance2);  // Same instance
  });

  it('isInitialized returns true after initialization', () => {
    expect(manager.isInitialized()).toBe(true);
  });

  it('creates Python parser', () => {
    const parser = manager.getParser('python');

    expect(parser).toBeDefined();
    expect(typeof parser.parse).toBe('function');
  });

  it('creates TypeScript parser', () => {
    const parser = manager.getParser('typescript');

    expect(parser).toBeDefined();
  });

  it('creates TSX parser (separate from TypeScript)', () => {
    const tsParser = manager.getParser('typescript');
    const tsxParser = manager.getParser('tsx');

    // Should return different parsers (different grammars)
    expect(tsxParser).toBeDefined();
    expect(tsxParser).not.toBe(tsParser);  // Different instances OK
  });

  it('creates JavaScript parser', () => {
    const parser = manager.getParser('javascript');

    expect(parser).toBeDefined();
  });

  it('creates Go parser', () => {
    const parser = manager.getParser('go');

    expect(parser).toBeDefined();
  });

  it('reuses parser for same language', () => {
    const parser1 = manager.getParser('python');
    const parser2 = manager.getParser('python');

    expect(parser1).toBe(parser2);  // Same instance (pooling works)
  });

  it('throws on unsupported language', () => {
    // @ts-expect-error Testing invalid language
    expect(() => manager.getParser('ruby')).toThrow('Unsupported language');
  });

  it('getLanguage returns pre-loaded language', () => {
    const pythonLang = manager.getLanguage('python');

    expect(pythonLang).toBeDefined();
    // Language should have types array (grammar metadata)
    expect(Array.isArray(pythonLang.types)).toBe(true);
  });

  it('WASM locateFile works - Language.load succeeds after Parser.init', () => {
    // SS-10 verification: If locateFile is broken, this would fail
    // The beforeAll already called initialize() which loads all languages
    // Verify each language was loaded successfully
    const languages = ['python', 'typescript', 'tsx', 'javascript', 'go'] as const;

    for (const lang of languages) {
      const loaded = manager.getLanguage(lang);
      expect(loaded).toBeDefined();
      expect(loaded.name).toBeDefined(); // WASM Language has name property
    }
  });
});
