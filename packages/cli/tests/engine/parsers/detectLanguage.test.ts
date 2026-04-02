import { describe, it, expect } from 'vitest';
import { detectLanguage } from '../../../src/engine/parsers/treeSitter.js';

describe('detectLanguage', () => {
  it('detects Python from .py extension', () => {
    expect(detectLanguage('app/main.py')).toBe('python');
    expect(detectLanguage('src/utils.py')).toBe('python');
  });

  it('detects TypeScript from .ts extension', () => {
    expect(detectLanguage('src/index.ts')).toBe('typescript');
    expect(detectLanguage('lib/utils.ts')).toBe('typescript');
  });

  it('detects TSX from .tsx extension', () => {
    expect(detectLanguage('components/App.tsx')).toBe('tsx');
    expect(detectLanguage('pages/index.tsx')).toBe('tsx');
  });

  it('detects JavaScript from .js extension', () => {
    expect(detectLanguage('index.js')).toBe('javascript');
    expect(detectLanguage('app.js')).toBe('javascript');
  });

  it('detects JavaScript from .jsx extension', () => {
    expect(detectLanguage('App.jsx')).toBe('javascript');
  });

  it('detects Go from .go extension', () => {
    expect(detectLanguage('main.go')).toBe('go');
    expect(detectLanguage('cmd/server/main.go')).toBe('go');
  });

  it('returns null for unsupported extensions', () => {
    expect(detectLanguage('README.md')).toBeNull();
    expect(detectLanguage('package.json')).toBeNull();
    expect(detectLanguage('styles.css')).toBeNull();
    expect(detectLanguage('data.sql')).toBeNull();
  });

  it('handles paths without extension', () => {
    expect(detectLanguage('LICENSE')).toBeNull();
    expect(detectLanguage('Makefile')).toBeNull();
  });

  it('handles uppercase extensions', () => {
    expect(detectLanguage('App.PY')).toBe('python');  // .toLowerCase() handles this
    expect(detectLanguage('Index.TS')).toBe('typescript');
  });
});
