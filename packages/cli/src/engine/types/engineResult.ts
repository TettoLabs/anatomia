/**
 * EngineResult — the unified scan output schema.
 *
 * Returned by analyzeProject(). Consumed by scan.ts for terminal/JSON output
 * and by init.ts for context generation. Designed for Phase 0.5 (surface + deep)
 * with placeholder sections for Phase 1 (health) and Phase 2 (readiness).
 */

export interface EngineResult {
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
  };
  git: {
    head: string | null;
    branch: string | null;
    commitCount: number | null;
    lastCommitAt: string | null;
    uncommittedChanges: boolean;
    contributorCount: number | null;
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
  }>;
  secrets: {
    envFileExists: boolean;
    envExampleExists: boolean;
    gitignoreCoversEnv: boolean;
    hardcodedKeysFound: null;  // Phase 1
    envVarReferences: null;    // Phase 1
  };
  projectProfile: {
    type: string | null;
    maturity: null;          // future
    teamSize: null;          // future
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
  // Deep tier only (null when surface)
  patterns: any | null;
  conventions: any | null;
  // Phase 1 placeholder
  health: Record<string, never>;
  // Phase 2 placeholder
  readiness: Record<string, never>;
}
