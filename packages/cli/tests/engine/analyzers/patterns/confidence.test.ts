import { describe, it, expect } from 'vitest';
import {
  filterByConfidence,
  interpretConfidence,
  calculateECE,
  type PatternDetectionResult,
} from '../../../../src/engine/analyzers/patterns.js';
import type { PatternConfidence } from '../../../../src/engine/types/patterns.js';

describe('Confidence Scoring and Filtering', () => {
  describe('filterByConfidence', () => {
    it('includes patterns ≥ threshold', () => {
      const patterns: Partial<Record<string, PatternConfidence>> = {
        validation: { library: 'pydantic', confidence: 0.95, evidence: [] },
        database: { library: 'sqlalchemy', confidence: 0.70, evidence: [] },  // Exactly at threshold
        auth: { library: 'jwt', confidence: 0.80, evidence: [] },
      };

      const filtered = filterByConfidence(patterns, 0.7);

      expect(filtered['validation']).toBeDefined();  // 0.95 ≥ 0.7 ✓
      expect(filtered['database']).toBeDefined();    // 0.70 ≥ 0.7 ✓ (edge case)
      expect(filtered['auth']).toBeDefined();        // 0.80 ≥ 0.7 ✓
    });

    it('excludes patterns < threshold', () => {
      const patterns: Partial<Record<string, PatternConfidence>> = {
        validation: { library: 'pydantic', confidence: 0.95, evidence: [] },
        database: { library: 'sqlalchemy', confidence: 0.68, evidence: [] },
        auth: { library: 'jwt', confidence: 0.45, evidence: [] },
      };

      const filtered = filterByConfidence(patterns, 0.7);

      expect(filtered['validation']).toBeDefined();    // 0.95 ≥ 0.7 ✓
      expect(filtered['database']).toBeUndefined();    // 0.68 < 0.7 ✗
      expect(filtered['auth']).toBeUndefined();        // 0.45 < 0.7 ✗
    });

    it('handles empty patterns object', () => {
      const patterns: Partial<Record<string, PatternConfidence>> = {};
      const filtered = filterByConfidence(patterns, 0.7);

      expect(Object.keys(filtered)).toHaveLength(0);
    });

    it('handles custom threshold', () => {
      const patterns: Partial<Record<string, PatternConfidence>> = {
        validation: { library: 'pydantic', confidence: 0.85, evidence: [] },
        database: { library: 'prisma', confidence: 0.88, evidence: [] },
      };

      const filtered = filterByConfidence(patterns, 0.9);  // Higher threshold

      expect(filtered['validation']).toBeUndefined();  // 0.85 < 0.9
      expect(filtered['database']).toBeUndefined();    // 0.88 < 0.9
    });

    it('handles threshold edge cases (floating point)', () => {
      const patterns: Partial<Record<string, PatternConfidence>> = {
        validation: { library: 'pydantic', confidence: 0.6999999, evidence: [] },
        database: { library: 'prisma', confidence: 0.7000001, evidence: [] },
      };

      const filtered = filterByConfidence(patterns, 0.7);

      expect(filtered['validation']).toBeUndefined();  // 0.6999999 < 0.7
      expect(filtered['database']).toBeDefined();      // 0.7000001 ≥ 0.7
    });

    it('handles confidence = 1.0 correctly', () => {
      const patterns: Partial<Record<string, PatternConfidence>> = {
        perfect: { library: 'test', confidence: 1.0, evidence: [] },
      };

      const filtered = filterByConfidence(patterns, 0.7);
      expect(filtered['perfect']).toBeDefined();  // 1.0 ≥ 0.7 ✓
    });

    it('handles confidence = 0.0 correctly', () => {
      const patterns: Partial<Record<string, PatternConfidence>> = {
        none: { library: 'test', confidence: 0.0, evidence: [] },
      };

      const filtered = filterByConfidence(patterns, 0.7);
      expect(filtered['none']).toBeUndefined();  // 0.0 < 0.7 ✗
    });
  });

  describe('interpretConfidence', () => {
    it('interprets high confidence (≥0.90) correctly', () => {
      const result = interpretConfidence(0.95);

      expect(result.level).toBe('high');
      expect(result.action).toBe('auto-apply');
      expect(result.expectedAccuracy).toBe('≥95%');
      expect(result.message).toContain('95');
    });

    it('interprets moderate confidence (0.70-0.89) correctly', () => {
      const result = interpretConfidence(0.75);

      expect(result.level).toBe('moderate');
      expect(result.action).toBe('verify');
      expect(result.expectedAccuracy).toBe('≥85%');
    });

    it('interprets low confidence (0.50-0.69) correctly', () => {
      const result = interpretConfidence(0.55);

      expect(result.level).toBe('low');
      expect(result.action).toBe('confirm');
      expect(result.expectedAccuracy).toBe('≥70%');
    });

    it('interprets uncertain confidence (<0.50) correctly', () => {
      const result = interpretConfidence(0.25);

      expect(result.level).toBe('uncertain');
      expect(result.action).toBe('flag-manual');
      expect(result.expectedAccuracy).toBe('<70%');
    });

    it('handles bucket boundaries correctly', () => {
      expect(interpretConfidence(0.90).level).toBe('high');       // ≥0.90
      expect(interpretConfidence(0.89).level).toBe('moderate');   // <0.90
      expect(interpretConfidence(0.70).level).toBe('moderate');   // ≥0.70
      expect(interpretConfidence(0.69).level).toBe('low');        // <0.70
      expect(interpretConfidence(0.50).level).toBe('low');        // ≥0.50
      expect(interpretConfidence(0.49).level).toBe('uncertain');  // <0.50
    });

    it('formats percentage in message', () => {
      const result = interpretConfidence(0.856);
      expect(result.message).toContain('86');  // Rounds 85.6% → 86%
    });

    it('handles confidence = 1.0', () => {
      const result = interpretConfidence(1.0);
      expect(result.level).toBe('high');
      expect(result.message).toContain('100');
    });

    it('handles confidence = 0.0', () => {
      const result = interpretConfidence(0.0);
      expect(result.level).toBe('uncertain');
      expect(result.message).toContain('0');
    });
  });

  describe('calculateECE', () => {
    it('calculates correct ECE for well-calibrated data', () => {
      const results: PatternDetectionResult[] = [
        // High bucket: 100% accuracy at ~0.93 confidence (well-calibrated)
        { project: 'p1', category: 'validation', detected: 'pydantic', confidence: 0.95, correct: true },
        { project: 'p2', category: 'database', detected: 'prisma', confidence: 0.92, correct: true },

        // Moderate bucket: 100% accuracy at ~0.775 confidence (well-calibrated)
        { project: 'p3', category: 'validation', detected: 'zod', confidence: 0.75, correct: true },
        { project: 'p4', category: 'auth', detected: 'jwt', confidence: 0.80, correct: true },
      ];

      const ece = calculateECE(results);

      // High bucket: avg=0.935, accuracy=1.0, gap=0.065
      // Moderate bucket: avg=0.775, accuracy=1.0, gap=0.225
      // ECE = (0.065 + 0.225) / 2 = 0.145
      expect(ece).toBeLessThan(0.20);
      expect(ece).toBeGreaterThan(0.10);
    });

    it('calculates correct ECE for poorly calibrated data', () => {
      const results: PatternDetectionResult[] = [
        // High bucket: 50% accuracy (overconfident - bad calibration)
        { project: 'p1', category: 'validation', detected: 'pydantic', confidence: 0.95, correct: true },
        { project: 'p2', category: 'database', detected: 'wrong', confidence: 0.95, correct: false },
        { project: 'p3', category: 'auth', detected: 'wrong', confidence: 0.92, correct: false },
        { project: 'p4', category: 'testing', detected: 'pytest', confidence: 0.90, correct: true },
      ];

      const ece = calculateECE(results);

      // High bucket: avg=0.93, accuracy=0.5, gap=0.43 (poor calibration)
      expect(ece).toBeGreaterThan(0.30);  // High ECE indicates poor calibration
    });

    it('handles empty results gracefully', () => {
      const results: PatternDetectionResult[] = [];
      const ece = calculateECE(results);

      expect(ece).toBe(0.0);  // No data, no error
    });

    it('handles single bucket correctly', () => {
      const results: PatternDetectionResult[] = [
        { project: 'p1', category: 'validation', detected: 'pydantic', confidence: 0.95, correct: true },
        { project: 'p2', category: 'database', detected: 'prisma', confidence: 0.92, correct: true },
      ];

      const ece = calculateECE(results);

      // Only high bucket populated
      // avg=0.935, accuracy=1.0, gap=0.065
      // ECE = 0.065 / 1 bucket = 0.065
      expect(ece).toBeCloseTo(0.065, 2);
    });

    it('groups results into correct buckets', () => {
      const results: PatternDetectionResult[] = [
        // High: 0.95, 0.90
        { project: 'p1', category: 'validation', detected: 'pydantic', confidence: 0.95, correct: true },
        { project: 'p2', category: 'database', detected: 'prisma', confidence: 0.90, correct: true },
        // Moderate: 0.80, 0.70
        { project: 'p3', category: 'validation', detected: 'zod', confidence: 0.80, correct: true },
        { project: 'p4', category: 'auth', detected: 'jwt', confidence: 0.70, correct: false },
        // Low: 0.60
        { project: 'p5', category: 'database', detected: 'gorm', confidence: 0.60, correct: true },
      ];

      const ece = calculateECE(results);

      // Should compute across 3 buckets (high, moderate, low)
      expect(ece).toBeGreaterThan(0);
      expect(ece).toBeLessThan(0.30);  // Reasonable range
    });

    it('handles all correct in bucket', () => {
      const results: PatternDetectionResult[] = [
        { project: 'p1', category: 'validation', detected: 'pydantic', confidence: 0.95, correct: true },
        { project: 'p2', category: 'database', detected: 'prisma', confidence: 0.93, correct: true },
        { project: 'p3', category: 'auth', detected: 'jwt', confidence: 0.91, correct: true },
      ];

      const ece = calculateECE(results);

      // avg ~0.93, accuracy=1.0, gap ~0.07
      expect(ece).toBeCloseTo(0.07, 1);
    });

    it('handles all incorrect in bucket', () => {
      const results: PatternDetectionResult[] = [
        { project: 'p1', category: 'validation', detected: 'wrong', confidence: 0.95, correct: false },
        { project: 'p2', category: 'database', detected: 'wrong', confidence: 0.92, correct: false },
      ];

      const ece = calculateECE(results);

      // avg=0.935, accuracy=0.0, gap=0.935
      expect(ece).toBeCloseTo(0.935, 2);
    });
  });

  describe('Threshold filtering edge cases', () => {
    it('handles exactly 0.7 threshold correctly', () => {
      const patterns: Partial<Record<string, PatternConfidence>> = {
        exact: { library: 'test', confidence: 0.7, evidence: [] },
      };

      const filtered = filterByConfidence(patterns, 0.7);
      expect(filtered['exact']).toBeDefined();  // 0.70 ≥ 0.70 ✓
    });

    it('preserves pattern properties when filtering', () => {
      const patterns: Partial<Record<string, PatternConfidence>> = {
        validation: {
          library: 'pydantic',
          variant: 'async',
          confidence: 0.95,
          evidence: ['dep', 'imports', 'usage'],
          primary: true,
        },
      };

      const filtered = filterByConfidence(patterns, 0.7);

      expect(filtered['validation']?.library).toBe('pydantic');
      expect(filtered['validation']?.variant).toBe('async');
      expect(filtered['validation']?.evidence).toHaveLength(3);
      expect(filtered['validation']?.primary).toBe(true);
    });

    it('handles all patterns below threshold', () => {
      const patterns: Partial<Record<string, PatternConfidence>> = {
        validation: { library: 'pydantic', confidence: 0.45, evidence: [] },
        database: { library: 'sqlalchemy', confidence: 0.32, evidence: [] },
      };

      const filtered = filterByConfidence(patterns, 0.7);

      expect(Object.keys(filtered)).toHaveLength(0);  // All excluded
    });

    it('handles all patterns above threshold', () => {
      const patterns: Partial<Record<string, PatternConfidence>> = {
        validation: { library: 'pydantic', confidence: 0.95, evidence: [] },
        database: { library: 'sqlalchemy', confidence: 0.80, evidence: [] },
        auth: { library: 'jwt', confidence: 0.75, evidence: [] },
      };

      const filtered = filterByConfidence(patterns, 0.7);

      expect(Object.keys(filtered)).toHaveLength(3);  // All included
    });
  });
});
