/**
 * Shared types for scaffold tests
 * Local definitions to avoid tree-sitter native module dependency
 */

export interface AnalysisResult {
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

export interface PatternConfidence {
  library: string;
  variant?: string;
  confidence: number;
  evidence: string[];
  primary?: boolean;
}

export interface MultiPattern {
  patterns: PatternConfidence[];
  primary: PatternConfidence;
  confidence: number;
}

export interface NamingConvention {
  majority: string;
  confidence: number;
  mixed?: boolean;
  distribution?: Record<string, number>;
}

export interface ParsedFile {
  path: string;
  functions?: { name: string }[];
  classes?: { name: string }[];
}

export function createEmptyAnalysisResult(): AnalysisResult {
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
