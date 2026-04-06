/**
 * Shared types for scaffold tests
 * Local definitions to avoid tree-sitter native module dependency
 */

/**
 * EngineResult shape for scaffold tests
 */
export interface TestEngineResult {
  overview: { project: string; scannedAt: string; depth: string };
  stack: { language: string | null; framework: string | null; database: string | null; auth: string | null; testing: string | null; payments: string | null; workspace: string | null };
  files: { source: number; test: number; config: number; total: number };
  structure: Array<{ path: string; purpose: string }>;
  structureOverflow: number;
  commands: { build: string | null; test: string | null; lint: string | null; dev: string | null; packageManager: string };
  git: { head: string | null; branch: string | null; commitCount: number | null; lastCommitAt: string | null; uncommittedChanges: boolean; contributorCount: number | null };
  monorepo: { isMonorepo: boolean; tool: string | null; packages: Array<{ name: string; path: string }> };
  externalServices: Array<{ name: string; category: string; source: string; configFound: boolean }>;
  schemas: Record<string, { found: boolean; path: string | null; modelCount: number | null; provider?: string | null }>;
  secrets: { envFileExists: boolean; envExampleExists: boolean; gitignoreCoversEnv: boolean; hardcodedKeysFound: null; envVarReferences: null };
  projectProfile: { type: string | null; maturity: null; teamSize: null; hasExternalAPIs: boolean; hasDatabase: boolean; hasBrowserUI: boolean; hasAuthSystem: boolean; hasPayments: boolean; hasFileStorage: boolean };
  blindSpots: Array<{ area: string; issue: string; resolution: string }>;
  deployment: { platform: string; configFile: string } | null;
  patterns: any | null;
  conventions: any | null;
  recommendations: any | null;
  health: Record<string, never>;
  readiness: Record<string, never>;
}

export function createEmptyEngineResult(): TestEngineResult {
  return {
    overview: { project: 'unknown', scannedAt: new Date().toISOString(), depth: 'surface' },
    stack: { language: null, framework: null, database: null, auth: null, testing: null, payments: null, workspace: null },
    files: { source: 0, test: 0, config: 0, total: 0 },
    structure: [],
    structureOverflow: 0,
    commands: { build: null, test: null, lint: null, dev: null, packageManager: 'npm' },
    git: { head: null, branch: null, commitCount: null, lastCommitAt: null, uncommittedChanges: false, contributorCount: null },
    monorepo: { isMonorepo: false, tool: null, packages: [] },
    externalServices: [],
    schemas: {},
    secrets: { envFileExists: false, envExampleExists: false, gitignoreCoversEnv: false, hardcodedKeysFound: null, envVarReferences: null },
    projectProfile: { type: null, maturity: null, teamSize: null, hasExternalAPIs: false, hasDatabase: false, hasBrowserUI: false, hasAuthSystem: false, hasPayments: false, hasFileStorage: false },
    blindSpots: [],
    deployment: null,
    patterns: null,
    conventions: null,
    recommendations: null,
    health: {},
    readiness: {},
  };
}
