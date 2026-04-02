import { describe, it, expect } from 'vitest';
import { analyzeIndentation } from '../../../src/engine/analyzers/conventions/indentation.js';

describe('analyzeIndentation', () => {
  it('detects 4-space indentation', async () => {
    const files = [
      '    line1\n    line2\n        nested',
      '    another\n        nested',
    ];

    const result = await analyzeIndentation(files, '/tmp');

    expect(result.style).toBe('spaces');
    expect(result.width).toBe(4);
    expect(result.confidence).toBeCloseTo(1.0, 2);
  });

  it('detects 2-space indentation', async () => {
    const files = [
      '  line1\n  line2\n    nested',
      '  another\n    nested',
    ];

    const result = await analyzeIndentation(files, '/tmp');

    expect(result.style).toBe('spaces');
    expect(result.width).toBe(2);
    expect(result.confidence).toBe(1.0);
  });

  it('detects tab indentation', async () => {
    const files = [
      '\tline1\n\tline2',
      '\tanother\n\t\tnested',
    ];

    const result = await analyzeIndentation(files, '/tmp');

    expect(result.style).toBe('tabs');
    expect(result.width).toBeUndefined();  // No width for tabs
    expect(result.confidence).toBe(1.0);
  });

  it('detects mixed indentation', async () => {
    const files = [
      '    spaces',  // Spaces
      '\ttabs',      // Tabs
    ];

    const result = await analyzeIndentation(files, '/tmp');

    expect(result.style).toBe('mixed');
    expect(result.confidence).toBeLessThan(0.7);
  });

  it('GCD algorithm detects base width', async () => {
    // Mix of 2-space and 4-space (GCD = 2)
    const files = ['  line\n    nested\n      double'];

    const result = await analyzeIndentation(files, '/tmp');

    expect(result.width).toBe(2);  // GCD of [2, 4, 6] = 2
  });

  it('handles no indentation (returns default)', async () => {
    const files = ['line1\nline2\nline3'];

    const result = await analyzeIndentation(files, '/tmp');

    expect(result.style).toBe('spaces');
    expect(result.width).toBe(4);
    expect(result.confidence).toBe(0.5);
  });
});
