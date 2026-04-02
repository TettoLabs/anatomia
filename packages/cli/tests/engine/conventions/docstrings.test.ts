import { describe, it, expect } from 'vitest';
import { classifyDocstringFormat, analyzeDocstrings } from '../../../src/engine/analyzers/conventions/docstrings.js';

describe('classifyDocstringFormat', () => {
  it('detects Google style', () => {
    const docstring = `
      Summary.

      Args:
          param1: Description
      Returns:
          Result
    `;
    expect(classifyDocstringFormat(docstring)).toBe('google');
  });

  it('detects NumPy style', () => {
    const docstring = `
      Summary.

      Parameters
      ----------
      param1 : int
          Description
    `;
    expect(classifyDocstringFormat(docstring)).toBe('numpy');
  });

  it('detects rst style', () => {
    const docstring = `
      Summary.

      :param param1: Description
      :returns: Result
    `;
    expect(classifyDocstringFormat(docstring)).toBe('rst');
  });

  it('detects JSDoc style', () => {
    const docstring = `
      Summary.
      @param param1 Description
      @returns Result
    `;
    expect(classifyDocstringFormat(docstring)).toBe('jsdoc');
  });

  it('priority order: NumPy over Google', () => {
    // Docstring with both NumPy underlines AND Google Args:
    const docstring = `
      Parameters
      ----------
      Args:
          param: Description
    `;
    // NumPy checked first (has underlines) - should win
    expect(classifyDocstringFormat(docstring)).toBe('numpy');
  });

  it('returns none for empty', () => {
    expect(classifyDocstringFormat('')).toBe('none');
    expect(classifyDocstringFormat('   ')).toBe('none');
  });

  it('returns none for unrecognized format', () => {
    const docstring = 'Just a summary, no parameters section.';
    expect(classifyDocstringFormat(docstring)).toBe('none');
  });
});

describe('analyzeDocstrings', () => {
  it('detects Google majority with 75% coverage', () => {
    const functions = [
      { name: 'f1', docstring: 'Summary.\n\nArgs:\n    x: Desc' },  // Google
      { name: 'f2', docstring: 'Summary.\n\nArgs:\n    y: Desc' },  // Google
      { name: 'f3', docstring: 'Summary.\n\nArgs:\n    z: Desc' },  // Google
      { name: 'f4' },  // No docstring
    ];

    const result = analyzeDocstrings(functions);

    expect(result.format).toBe('google');
    expect(result.coverage).toBe(0.75);  // 3/4
    expect(result.confidence).toBe(1.0);  // 3/3 with docstrings are Google
  });

  it('returns none when coverage <20%', () => {
    const functions = [
      { name: 'f1', docstring: 'Summary.' },  // 1 with docstring
      ...Array(9).fill({ name: 'f' }),  // 9 without (10% coverage)
    ];

    const result = analyzeDocstrings(functions);

    expect(result.format).toBe('none');
    expect(result.coverage).toBe(0.1);
    expect(result.confidence).toBe(0.95);  // High confidence that convention is "none"
  });

  it('handles empty function list', () => {
    const result = analyzeDocstrings([]);

    expect(result.format).toBe('none');
    expect(result.coverage).toBe(0);
    expect(result.confidence).toBe(0.95);
  });
});
