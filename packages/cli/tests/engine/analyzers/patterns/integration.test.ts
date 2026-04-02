import { describe, it, expect } from 'vitest';
import { analyze } from '../../../../src/engine/index.js';
import { inferPatterns } from '../../../../src/engine/analyzers/patterns.js';
import { testProjects } from './fixtures/testProjects.js';
import type { AnalysisResult } from '../../../../src/engine/types/index.js';

describe('Pattern Inference Integration', () => {
  describe('analyze() integration', () => {
    it('includes patterns when skipPatterns=false', async () => {
      // Test on analyzer package itself
      const result = await analyze('.', { skipPatterns: false });

      // Should have patterns field
      expect(result.patterns).toBeDefined();
      expect(result.patterns?.threshold).toBe(0.7);
      expect(result.patterns?.sampledFiles).toBeGreaterThanOrEqual(0);
      expect(result.patterns?.detectionTime).toBeGreaterThanOrEqual(0);
    });

    it('excludes patterns when skipPatterns=true', async () => {
      const result = await analyze('.', { skipPatterns: true });

      // Should not have patterns field
      expect(result.patterns).toBeUndefined();
    });

    it('excludes patterns when skipParsing=true', async () => {
      const result = await analyze('.', { skipParsing: true, skipPatterns: false });

      // Patterns require parsed data, so should be undefined
      expect(result.patterns).toBeUndefined();
    });

    it('includes patterns by default (skipPatterns defaults to false)', async () => {
      const result = await analyze('.');

      // Default behavior should include patterns (if parsed available)
      if (result.parsed) {
        expect(result.patterns).toBeDefined();
      }
    });
  });

  describe('inferPatterns() orchestrator', () => {
    it('returns PatternAnalysis with metadata', async () => {
      // Create mock analysis
      const mockAnalysis: AnalysisResult = {
        projectType: 'python',
        framework: 'fastapi',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.1.0',
        parsed: {
          files: [],
          totalParsed: 0,
          cacheHits: 0,
          cacheMisses: 0,
        },
      };

      const patterns = await inferPatterns('.', mockAnalysis);

      expect(patterns).toBeDefined();
      expect(patterns.threshold).toBe(0.7);
      expect(patterns.sampledFiles).toBe(0);
      expect(patterns.detectionTime).toBeGreaterThanOrEqual(0);
    });

    it('filters patterns by confidence threshold', async () => {
      // This validates CP2 filtering is applied
      const mockAnalysis: AnalysisResult = {
        projectType: 'python',
        framework: 'fastapi',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.1.0',
      };

      const patterns = await inferPatterns('.', mockAnalysis);

      // All returned patterns should have confidence ≥0.7
      if (patterns.validation) {
        expect(patterns.validation.confidence).toBeGreaterThanOrEqual(0.7);
      }
      if (patterns.database) {
        expect(patterns.database.confidence).toBeGreaterThanOrEqual(0.7);
      }
      if (patterns.auth) {
        expect(patterns.auth.confidence).toBeGreaterThanOrEqual(0.7);
      }
    });

    it('handles errors gracefully (returns empty patterns)', async () => {
      // Invalid project path
      const mockAnalysis: AnalysisResult = {
        projectType: 'unknown',
        framework: null,
        confidence: { projectType: 0.0, framework: 0.0 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.1.0',
      };

      const patterns = await inferPatterns('/nonexistent/path', mockAnalysis);

      // Should return empty, not crash
      expect(patterns).toBeDefined();
      expect(patterns.sampledFiles).toBe(0);
    });
  });

  describe('Test project structure validation', () => {
    it('has 30 test projects defined', () => {
      expect(testProjects).toHaveLength(30);
    });

    it('all projects have required fields', () => {
      testProjects.forEach(project => {
        expect(project.name).toBeDefined();
        expect(project.url).toMatch(/^https:\/\/github\.com/);
        expect(project.language).toBeDefined();
        expect(project.framework).toBeDefined();
        expect(project.expected).toBeDefined();
      });
    });

    it('has Python projects (10)', () => {
      const pythonProjects = testProjects.filter(p => p.language === 'python');
      expect(pythonProjects).toHaveLength(10);
    });

    it('has Node.js projects (10)', () => {
      const nodeProjects = testProjects.filter(p => p.language === 'node');
      expect(nodeProjects).toHaveLength(10);
    });

    it('has Go projects (5)', () => {
      const goProjects = testProjects.filter(p => p.language === 'go');
      expect(goProjects).toHaveLength(5);
    });

    it('has Rust projects (5)', () => {
      const rustProjects = testProjects.filter(p => p.language === 'rust');
      expect(rustProjects).toHaveLength(5);
    });

    it('has FastAPI projects (5)', () => {
      const fastapiProjects = testProjects.filter(p => p.framework === 'fastapi');
      expect(fastapiProjects).toHaveLength(5);
    });

    it('has Next.js projects (4)', () => {
      const nextjsProjects = testProjects.filter(p => p.framework === 'nextjs');
      expect(nextjsProjects).toHaveLength(4);
    });
  });

  describe('Performance validation', () => {
    it('completes pattern inference within budget (<10s)', async () => {
      const mockAnalysis: AnalysisResult = {
        projectType: 'python',
        framework: 'fastapi',
        confidence: { projectType: 0.95, framework: 0.90 },
        indicators: { projectType: [], framework: [] },
        detectedAt: new Date().toISOString(),
        version: '0.1.0',
        parsed: {
          files: Array.from({ length: 20 }, (_, i) => ({
            file: `file${i}.py`,
            language: 'python',
            functions: [],
            classes: [],
            imports: [{ module: 'pydantic', names: ['BaseModel'], line: 1 }],
            decorators: [],
            parseTime: 0,
            parseMethod: 'cached' as const,
            errors: 0,
          })),
          totalParsed: 20,
          cacheHits: 20,
          cacheMisses: 0,
        },
      };

      const start = Date.now();
      const patterns = await inferPatterns('.', mockAnalysis);
      const duration = Date.now() - start;

      // Should complete quickly (dependency reading + confirmation)
      expect(duration).toBeLessThan(10000);  // <10s
      expect(patterns).toBeDefined();
    });
  });

  describe('Backward compatibility', () => {
    it('maintains STEP_1 compatibility (patterns optional)', async () => {
      // Analyze without pattern inference
      const result = await analyze('.', { skipPatterns: true });

      // Should still be valid AnalysisResult without patterns
      expect(result.projectType).toBeDefined();
      expect(result.framework).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.indicators).toBeDefined();
      expect(result.detectedAt).toBeDefined();
      expect(result.version).toBeDefined();
    });
  });
});
