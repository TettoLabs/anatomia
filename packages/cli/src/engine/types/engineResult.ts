/**
 * EngineResult — the unified scan output schema.
 *
 * Returned by scanProject(). Consumed by scan.ts for terminal/JSON output
 * and by init.ts for context generation. D2-compliant schema with typed
 * patterns, conventions, deployment, and Phase 1+ null stubs.
 */

export interface PatternDetail {
  library: string;
  variant: string;
  confidence: number;
  evidence: string[];
}

export interface ConventionDetail {
  majority: string;
  confidence: number;
  mixed: boolean;
  distribution: Record<string, number>;
  sampleSize: number;
}

export interface EngineResult {
  schemaVersion: string;
  overview: {
    project: string;
    scannedAt: string;
    depth: 'surface' | 'deep';
  };
  stack: {
    language: string | null;
    framework: string | null;
    database: string | null;
    auth: string | null;
    testing: string | null;
    payments: string | null;
    workspace: string | null;
    aiSdk: string | null;
  };
  files: {
    source: number;
    test: number;
    config: number;
    total: number;
  };
  structure: Array<{ path: string; purpose: string }>;
  structureOverflow: number;
  commands: {
    build: string | null;
    test: string | null;
    lint: string | null;
    dev: string | null;
    packageManager: string;
    all: Record<string, string>;
  };
  git: {
    head: string | null;
    branch: string | null;
    commitCount: number | null;
    lastCommitAt: string | null;
    uncommittedChanges: boolean;
    contributorCount: number | null;
    defaultBranch: string | null;
    branches: string[] | null;
  };
  monorepo: {
    isMonorepo: boolean;
    tool: string | null;
    packages: Array<{ name: string; path: string }>;
  };
  externalServices: Array<{
    name: string;
    category: string;
    source: string;
    configFound: boolean;
  }>;
  schemas: Record<string, {
    found: boolean;
    path: string | null;
    modelCount: number | null;
    provider?: string | null;
  }>;
  secrets: {
    envFileExists: boolean;
    envExampleExists: boolean;
    gitignoreCoversEnv: boolean;
  };
  projectProfile: {
    type: string | null;
    hasExternalAPIs: boolean;
    hasDatabase: boolean;
    hasBrowserUI: boolean;
    hasAuthSystem: boolean;
    hasPayments: boolean;
    hasFileStorage: boolean;
  };
  blindSpots: Array<{
    area: string;
    issue: string;
    resolution: string;
  }>;
  deployment: {
    platform: string | null;
    configFile: string | null;
    ci: string | null;
    ciConfigFile: string | null;
  };
  // Deep tier only (null when surface)
  patterns: {
    errorHandling: PatternDetail | null;
    validation: PatternDetail | null;
    database: PatternDetail | null;
    auth: PatternDetail | null;
    testing: PatternDetail | null;
    sampledFiles: number;
    detectionTime: number;
    threshold: number;
  } | null;
  conventions: {
    naming: {
      files: ConventionDetail;
      functions: ConventionDetail;
      classes: ConventionDetail;
      variables: ConventionDetail;
      constants: ConventionDetail;
    };
    imports: {
      style: string;
      confidence: number;
      distribution: Record<string, number>;
      aliasPattern: string | null;
    };
    docstrings: {
      format: string;
      confidence: number;
      coverage: number;
    };
    indentation: {
      style: string;
      width: number;
      confidence: number;
    };
    sampledFiles: number;
    detectionTime: number;
  } | null;

  // Phase 1: Secret Intelligence
  secretFindings: Array<{
    type: string;
    file: string;
    line: number;
    severity: 'critical' | 'high' | 'medium';
    redacted: string;
  }> | null;
  envVarMap: Array<{
    name: string;
    files: string[];
    inExample: boolean;
    isSecret: boolean;
  }> | null;

  // Phase 1: Code Intelligence
  duplicates: {
    totalClones: number;
    totalDuplicateLines: number;
    clones: Array<{
      fileA: string;
      fileB: string;
      linesA: [number, number];
      linesB: [number, number];
      duplicateLines: number;
    }>;
  } | null;
  circularDeps: Array<{
    cycle: string[];
    length: number;
  }> | null;
  orphanFiles: string[] | null;
  complexityHotspots: Array<{
    function: string;
    file: string;
    line: number;
    cyclomatic: number;
    cognitive: number;
  }> | null;

  // Phase 1: Git Intelligence (grouped)
  gitIntelligence: {
    churnHotspots: Array<{
      file: string;
      changeCount: number;
      period: string;
    }> | null;
    busFactor: Array<{
      directory: string;
      contributors: number;
      primaryAuthor: string;
    }> | null;
    coChangeCoupling: Array<{
      fileA: string;
      fileB: string;
      coChangePercentage: number;
      hasImportRelationship: boolean;
    }> | null;
    bugMagnetFiles: Array<{
      file: string;
      bugCommitCount: number;
      totalCommitCount: number;
      ratio: number;
    }> | null;
  } | null;

  // Phase 1: Dependency Intelligence (grouped)
  dependencyIntelligence: {
    health: Array<{
      name: string;
      installedVersion: string;
      latestVersion: string | null;
      lastPublished: string | null;
      vulnerabilities: number;
      deprecated: boolean;
    }> | null;
    overlaps: Array<{
      category: string;
      packages: string[];
    }> | null;
    versionBreaks: Array<{
      name: string;
      installedVersion: string;
      breakVersion: string;
      description: string;
      aiImpact: string;
    }> | null;
  } | null;

  // Phase 1: Decision Archaeology
  technicalDebtMarkers: {
    total: number;
    byType: Record<string, number>;
    locations: Array<{
      type: string;
      file: string;
      line: number;
      text: string;
    }>;
  } | null;

  // Phase 2: AI Readiness
  inconsistencies: Array<{
    category: string;
    variants: Array<{
      pattern: string;
      percentage: number;
      fileCount: number;
    }>;
  }> | null;
  conventionBreaks: Array<{
    convention: string;
    expected: string;
    file: string;
    actual: string;
  }> | null;
  aiReadinessScore: {
    score: number;
    breakdown: {
      duplicates: number;
      inconsistencies: number;
      complexity: number;
      circularDeps: number;
      deadCode: number;
    };
  } | null;

  // Reserved
  recommendations: null;
  health: null;
  readiness: null;
}
