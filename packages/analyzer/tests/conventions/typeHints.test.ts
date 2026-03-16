import { describe, it, expect } from 'vitest';
import { analyzeTypeHints } from '../../src/analyzers/conventions/typeHints.js';

describe('analyzeTypeHints', () => {
  it('detects always usage (98% typed)', () => {
    const functions = [
      ...Array(49).fill({ name: 'f', line: 1, async: false, decorators: [], returnType: 'int' }),
      { name: 'untyped', line: 2, async: false, decorators: [] },  // 1 untyped
    ];

    const result = analyzeTypeHints(functions);

    expect(result.usage).toBe('always');
    expect(result.percentage).toBeCloseTo(0.98, 2);
    expect(result.confidence).toBe(0.95);  // Clear (≥90%)
  });

  it('detects sometimes usage (60% typed)', () => {
    const functions = [
      ...Array(30).fill({ name: 'f', line: 1, async: false, decorators: [], returnType: 'int' }),
      ...Array(20).fill({ name: 'untyped', line: 2, async: false, decorators: [] }),
    ];

    const result = analyzeTypeHints(functions);

    expect(result.usage).toBe('sometimes');
    expect(result.percentage).toBe(0.6);
    expect(result.confidence).toBe(0.75);  // Moderate (between extremes)
  });

  it('detects never usage (5% typed)', () => {
    const functions = [
      ...Array(2).fill({ name: 'f', line: 1, async: false, decorators: [], returnType: 'int' }),
      ...Array(38).fill({ name: 'untyped', line: 2, async: false, decorators: [] }),
    ];

    const result = analyzeTypeHints(functions);

    expect(result.usage).toBe('never');
    expect(result.percentage).toBeCloseTo(0.05, 2);
    expect(result.confidence).toBe(0.95);  // Clear (≤10%)
  });

  it('handles empty function list', () => {
    const result = analyzeTypeHints([]);

    expect(result.usage).toBe('never');
    expect(result.confidence).toBe(0.95);
    expect(result.percentage).toBe(0);
  });

  it('detects at 90% threshold (exactly always)', () => {
    const functions = [
      ...Array(45).fill({ name: 'f', line: 1, async: false, decorators: [], returnType: 'int' }),
      ...Array(5).fill({ name: 'untyped', line: 2, async: false, decorators: [] }),
    ];

    const result = analyzeTypeHints(functions);

    expect(result.usage).toBe('always');
    expect(result.percentage).toBe(0.9);
    expect(result.confidence).toBe(0.95);
  });

  it('detects at 50% threshold (exactly sometimes)', () => {
    const functions = [
      ...Array(25).fill({ name: 'f', line: 1, async: false, decorators: [], returnType: 'int' }),
      ...Array(25).fill({ name: 'untyped', line: 2, async: false, decorators: [] }),
    ];

    const result = analyzeTypeHints(functions);

    expect(result.usage).toBe('sometimes');
    expect(result.percentage).toBe(0.5);
    expect(result.confidence).toBe(0.75);
  });
});
