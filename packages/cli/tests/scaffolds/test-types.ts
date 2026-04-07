/**
 * Shared types for scaffold tests
 * Local definitions to avoid tree-sitter native module dependency
 */

/**
 * EngineResult shape for scaffold tests — D2 compliant
 */
export interface TestEngineResult {
  overview: { project: string; scannedAt: string; depth: string };
  stack: { language: string | null; framework: string | null; database: string | null; auth: string | null; testing: string | null; payments: string | null; workspace: string | null; aiSdk: string | null };
  files: { source: number; test: number; config: number; total: number };
  structure: Array<{ path: string; purpose: string }>;
  structureOverflow: number;
  commands: { build: string | null; test: string | null; lint: string | null; dev: string | null; packageManager: string };
  git: { head: string | null; branch: string | null; commitCount: number | null; lastCommitAt: string | null; uncommittedChanges: boolean; contributorCount: number | null; defaultBranch: string | null; branches: string[] | null };
  monorepo: { isMonorepo: boolean; tool: string | null; packages: Array<{ name: string; path: string }> };
  externalServices: Array<{ name: string; category: string; source: string; configFound: boolean }>;
  schemas: Record<string, { found: boolean; path: string | null; modelCount: number | null; provider?: string | null }>;
  secrets: { envFileExists: boolean; envExampleExists: boolean; gitignoreCoversEnv: boolean };
  projectProfile: { type: string | null; hasExternalAPIs: boolean; hasDatabase: boolean; hasBrowserUI: boolean; hasAuthSystem: boolean; hasPayments: boolean; hasFileStorage: boolean };
  blindSpots: Array<{ area: string; issue: string; resolution: string }>;
  deployment: { platform: string | null; configFile: string | null; ci: string | null; ciConfigFile: string | null };
  patterns: {
    errorHandling: { library: string; variant: string; confidence: number; evidence: string[] } | null;
    validation: { library: string; variant: string; confidence: number; evidence: string[] } | null;
    database: { library: string; variant: string; confidence: number; evidence: string[] } | null;
    auth: { library: string; variant: string; confidence: number; evidence: string[] } | null;
    testing: { library: string; variant: string; confidence: number; evidence: string[] } | null;
    sampledFiles: number;
    detectionTime: number;
    threshold: number;
  } | null;
  conventions: {
    naming: {
      files: { majority: string; confidence: number; mixed: boolean; distribution: Record<string, number>; sampleSize: number };
      functions: { majority: string; confidence: number; mixed: boolean; distribution: Record<string, number>; sampleSize: number };
      classes: { majority: string; confidence: number; mixed: boolean; distribution: Record<string, number>; sampleSize: number };
      variables: { majority: string; confidence: number; mixed: boolean; distribution: Record<string, number>; sampleSize: number };
      constants: { majority: string; confidence: number; mixed: boolean; distribution: Record<string, number>; sampleSize: number };
    };
    imports: { style: string; confidence: number; distribution: Record<string, number> };
    docstrings: { format: string; confidence: number; coverage: number };
    indentation: { style: string; width: number; confidence: number };
    sampledFiles: number;
    detectionTime: number;
  } | null;
  secretFindings: null;
  envVarMap: null;
  duplicates: null;
  circularDeps: null;
  orphanFiles: null;
  complexityHotspots: null;
  gitIntelligence: null;
  dependencyIntelligence: null;
  technicalDebtMarkers: null;
  inconsistencies: null;
  conventionBreaks: null;
  aiReadinessScore: null;
  recommendations: null;
  health: null;
  readiness: null;
}

export function createEmptyEngineResult(): TestEngineResult {
  return {
    overview: { project: 'unknown', scannedAt: new Date().toISOString(), depth: 'surface' },
    stack: { language: null, framework: null, database: null, auth: null, testing: null, payments: null, workspace: null, aiSdk: null },
    files: { source: 0, test: 0, config: 0, total: 0 },
    structure: [],
    structureOverflow: 0,
    commands: { build: null, test: null, lint: null, dev: null, packageManager: 'npm' },
    git: { head: null, branch: null, commitCount: null, lastCommitAt: null, uncommittedChanges: false, contributorCount: null, defaultBranch: null, branches: null },
    monorepo: { isMonorepo: false, tool: null, packages: [] },
    externalServices: [],
    schemas: {},
    secrets: { envFileExists: false, envExampleExists: false, gitignoreCoversEnv: false },
    projectProfile: { type: null, hasExternalAPIs: false, hasDatabase: false, hasBrowserUI: false, hasAuthSystem: false, hasPayments: false, hasFileStorage: false },
    blindSpots: [],
    deployment: { platform: null, configFile: null, ci: null, ciConfigFile: null },
    patterns: null,
    conventions: null,
    secretFindings: null,
    envVarMap: null,
    duplicates: null,
    circularDeps: null,
    orphanFiles: null,
    complexityHotspots: null,
    gitIntelligence: null,
    dependencyIntelligence: null,
    technicalDebtMarkers: null,
    inconsistencies: null,
    conventionBreaks: null,
    aiReadinessScore: null,
    recommendations: null,
    health: null,
    readiness: null,
  };
}
