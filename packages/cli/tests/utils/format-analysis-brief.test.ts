import { describe, it, expect } from 'vitest';
import { formatAnalysisBrief } from '../../src/utils/format-analysis-brief.js';
import { displayProjectType, formatCategoryName } from '../../src/utils/analysis-helpers.js';

/**
 * AnalysisResult type for testing (avoids tree-sitter dependency)
 */
interface AnalysisResult {
  projectType: string;
  framework: string | null;
  confidence: { projectType: number; framework: number };
  indicators: { projectType: string[]; framework: string[] };
  detectedAt: string;
  version: string;
  structure?: {
    architecture?: string;
    confidence?: { architecture: number };
    entryPoints?: string[];
    testLocation?: string;
    directories?: Record<string, string>;
    configFiles?: string[];
  };
  patterns?: {
    errorHandling?: PatternConfidence | MultiPattern;
    validation?: PatternConfidence | MultiPattern;
    database?: PatternConfidence | MultiPattern;
    auth?: PatternConfidence | MultiPattern;
    testing?: PatternConfidence | MultiPattern;
    sampledFiles?: number;
    detectionTime?: number;
    threshold?: number;
  };
  conventions?: {
    naming?: {
      files?: NamingConvention;
      variables?: NamingConvention;
      functions?: NamingConvention;
      classes?: NamingConvention;
      constants?: NamingConvention;
    };
    imports?: {
      style: string;
      confidence: number;
      distribution?: { absolute: number; relative: number };
    };
    indentation?: {
      style: string;
      width?: number;
      confidence: number;
    };
    sampledFiles?: number;
    detectionTime?: number;
  };
  parsed?: {
    totalFiles?: number;
    totalFunctions?: number;
    totalClasses?: number;
    parseTime?: number;
    cacheHitRate?: number;
    files?: ParsedFile[];
  };
}

interface PatternConfidence {
  library: string;
  variant?: string;
  confidence: number;
  evidence: string[];
  primary?: boolean;
}

interface MultiPattern {
  patterns: PatternConfidence[];
  primary: PatternConfidence;
  confidence: number;
}

interface NamingConvention {
  majority: string;
  confidence: number;
  mixed?: boolean;
  distribution?: Record<string, number>;
}

interface ParsedFile {
  path: string;
  functions?: { name: string }[];
  classes?: { name: string }[];
}

/**
 * Helper to create empty AnalysisResult (local version for tests)
 */
function createEmptyAnalysisResult(): AnalysisResult {
  return {
    projectType: 'unknown',
    framework: null,
    confidence: {
      projectType: 0.0,
      framework: 0.0,
    },
    indicators: {
      projectType: [],
      framework: [],
    },
    detectedAt: new Date().toISOString(),
    version: '0.1.0',
  };
}

describe('analysis-helpers', () => {
  describe('displayProjectType', () => {
    it('maps node to JavaScript/TypeScript', () => {
      expect(displayProjectType('node')).toBe('JavaScript/TypeScript');
    });

    it('maps python to Python', () => {
      expect(displayProjectType('python')).toBe('Python');
    });

    it('maps unknown to Unknown', () => {
      expect(displayProjectType('unknown')).toBe('Unknown');
    });

    it('capitalizes unrecognized types', () => {
      expect(displayProjectType('swift')).toBe('Swift');
    });
  });

  describe('formatCategoryName', () => {
    it('maps errorHandling to Error Handling', () => {
      expect(formatCategoryName('errorHandling')).toBe('Error Handling');
    });

    it('returns unrecognized categories as-is', () => {
      expect(formatCategoryName('unknown')).toBe('unknown');
    });
  });
});

describe('formatAnalysisBrief', () => {
  it('returns markdown string', () => {
    const analysis = createEmptyAnalysisResult();
    const output = formatAnalysisBrief(analysis);
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  });

  it('includes Analysis Brief header', () => {
    const analysis = createEmptyAnalysisResult();
    const output = formatAnalysisBrief(analysis);
    expect(output).toContain('# Analysis Brief');
  });

  it('includes all 6 sections', () => {
    const analysis = createEmptyAnalysisResult();
    const output = formatAnalysisBrief(analysis);
    expect(output).toContain('## Project Identity');
    expect(output).toContain('## Directory Structure');
    expect(output).toContain('## Detected Patterns');
    expect(output).toContain('## Coding Conventions');
    expect(output).toContain('## Codebase Statistics');
    expect(output).toContain('## Setup Recommendations');
  });

  it('handles minimal analysis (required fields only)', () => {
    const minimal: AnalysisResult = {
      projectType: 'node',
      framework: null,
      confidence: { projectType: 0.5, framework: 0.0 },
      indicators: { projectType: ['package.json'], framework: [] },
      detectedAt: '2026-03-19T10:00:00Z',
      version: '0.2.0',
    };

    const output = formatAnalysisBrief(minimal);
    expect(output).toContain('JavaScript/TypeScript');
    expect(output).toContain('None detected');
    expect(output).toContain('not performed or unavailable');
  });

  it('handles full analysis with all optional fields', () => {
    const full: AnalysisResult = {
      projectType: 'python',
      framework: 'fastapi',
      confidence: { projectType: 1.0, framework: 0.95 },
      indicators: {
        projectType: ['pyproject.toml'],
        framework: ['fastapi in dependencies'],
      },
      detectedAt: '2026-03-19T10:00:00Z',
      version: '0.2.0',
      structure: {
        architecture: 'layered',
        confidence: { architecture: 0.85 },
        entryPoints: ['src/main.py'],
        testLocation: 'tests/',
        directories: { src: 'src/', tests: 'tests/' },
        configFiles: ['pyproject.toml'],
      },
      patterns: {
        errorHandling: {
          library: 'exceptions',
          variant: 'fastapi',
          confidence: 0.9,
          evidence: ['HTTPException imports'],
        },
        validation: {
          library: 'pydantic',
          confidence: 0.95,
          evidence: ['BaseModel usage'],
        },
        testing: {
          library: 'pytest',
          confidence: 1.0,
          evidence: ['pytest in dependencies'],
        },
        sampledFiles: 20,
        detectionTime: 5000,
        threshold: 0.7,
      },
      conventions: {
        naming: {
          functions: {
            majority: 'snake_case',
            confidence: 0.95,
            mixed: false,
            distribution: { snake_case: 0.95, camelCase: 0.05 },
          },
        },
        imports: {
          style: 'absolute',
          confidence: 0.85,
          distribution: { absolute: 0.85, relative: 0.15 },
        },
        indentation: {
          style: 'spaces',
          width: 4,
          confidence: 1.0,
        },
        sampledFiles: 50,
        detectionTime: 2000,
      },
      parsed: {
        totalFiles: 25,
        totalFunctions: 150,
        totalClasses: 20,
        parseTime: 3000,
        cacheHitRate: 0.989,
        files: [],
      },
    };

    const output = formatAnalysisBrief(full);
    expect(output).toContain('Python');
    expect(output).toContain('fastapi');
    expect(output).toContain('0.95');
    expect(output).toContain('layered');
    expect(output).toContain('pydantic');
    expect(output).toContain('snake_case');
    expect(output.length).toBeGreaterThan(1000); // Full output is substantial
  });

  describe('edge cases', () => {
    it('handles patterns: undefined', () => {
      const analysis = createEmptyAnalysisResult();
      const output = formatAnalysisBrief(analysis);
      expect(output).toContain('Pattern inference not performed or unavailable');
    });

    it('handles individual pattern null (auth null, testing exists)', () => {
      const analysis = createEmptyAnalysisResult();
      analysis.patterns = {
        testing: { library: 'pytest', confidence: 1.0, evidence: ['pytest in deps'] },
        // auth is undefined (not detected)
        sampledFiles: 20,
        detectionTime: 5000,
        threshold: 0.7,
      };
      const output = formatAnalysisBrief(analysis);
      expect(output).toContain('### Authentication');
      expect(output).toContain('**Pattern:** Not detected');
      expect(output).toContain('### Testing');
      expect(output).toContain('pytest');
    });

    it('handles MultiPattern scenario', () => {
      const analysis = createEmptyAnalysisResult();
      analysis.patterns = {
        database: {
          patterns: [
            {
              library: 'sqlalchemy',
              variant: 'async',
              confidence: 0.95,
              evidence: ['AsyncSession in 12 files', 'asyncpg driver'],
              primary: true,
            },
            {
              library: 'sqlalchemy',
              variant: 'sync',
              confidence: 0.85,
              evidence: ['Session in 3 files'],
              primary: false,
            },
          ],
          primary: {
            library: 'sqlalchemy',
            variant: 'async',
            confidence: 0.95,
            evidence: ['AsyncSession in 12 files', 'asyncpg driver'],
            primary: true,
          },
          confidence: 0.95,
        },
        sampledFiles: 20,
        detectionTime: 5000,
        threshold: 0.7,
      };
      const output = formatAnalysisBrief(analysis);
      expect(output).toContain('**Pattern:** Multiple detected');
      expect(output).toContain('**Primary:** sqlalchemy (async)');
      expect(output).toContain('**Also detected:**');
      expect(output).toContain('sqlalchemy (sync)');
      expect(output).toContain('AsyncSession in 12 files');
    });

    it('handles structure.entryPoints empty array', () => {
      const analysis = createEmptyAnalysisResult();
      analysis.structure = {
        architecture: 'layered',
        confidence: { architecture: 0.85 },
        entryPoints: [], // Empty array
        testLocation: 'tests/',
        directories: {},
        configFiles: [],
      };
      const output = formatAnalysisBrief(analysis);
      expect(output).toContain('None detected');
    });

    it('handles conventions.naming undefined while conventions exists', () => {
      const analysis = createEmptyAnalysisResult();
      analysis.conventions = {
        // naming is undefined
        imports: {
          style: 'absolute',
          confidence: 0.85,
          distribution: { absolute: 0.85, relative: 0.15 },
        },
        sampledFiles: 50,
        detectionTime: 2000,
      };
      const output = formatAnalysisBrief(analysis);
      expect(output).toContain('*Naming conventions not analyzed*');
      expect(output).toContain('**Style:** absolute');
    });

    it('handles structure: undefined', () => {
      const analysis = createEmptyAnalysisResult();
      const output = formatAnalysisBrief(analysis);
      expect(output).toContain('Structure analysis not performed or unavailable');
    });

    it('handles conventions: undefined', () => {
      const analysis = createEmptyAnalysisResult();
      const output = formatAnalysisBrief(analysis);
      expect(output).toContain('Convention detection not performed or unavailable');
    });

    it('handles parsed: undefined', () => {
      const analysis = createEmptyAnalysisResult();
      const output = formatAnalysisBrief(analysis);
      expect(output).toContain('Parsing not performed or unavailable');
    });

    it('handles framework: null', () => {
      const analysis = createEmptyAnalysisResult();
      analysis.framework = null;
      const output = formatAnalysisBrief(analysis);
      expect(output).toContain('**Framework:** None detected');
    });

    it('formats confidence with 2 decimal places', () => {
      const analysis = createEmptyAnalysisResult();
      analysis.confidence.projectType = 0.9;
      const output = formatAnalysisBrief(analysis);
      expect(output).toContain('0.90');
    });
  });

  describe('output length', () => {
    it('minimal output is 50+ lines', () => {
      const analysis = createEmptyAnalysisResult();
      const output = formatAnalysisBrief(analysis);
      const lines = output.split('\n').length;
      expect(lines).toBeGreaterThanOrEqual(50);
    });
  });
});
