/**
 * EngineResult — the unified scan output schema.
 *
 * Returned by scanProject(). Consumed by scan.ts for terminal/JSON output
 * and by init.ts for context generation. D2-compliant schema with typed
 * patterns, conventions, deployment, and Phase 1+ null stubs.
 */

import type { ConventionAnalysis } from './conventions.js';
import type { PatternAnalysis } from './patterns.js';
import type { DetectedCommands } from '../detectors/commands.js';

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
  // Composed from the detector's DetectedCommands (Item 7a) — adding a field
  // to DetectedCommands now flows through automatically. The only extra field
  // scan-engine appends on top is packageManager.
  commands: DetectedCommands & { packageManager: string };
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
    // Stack roles the service fulfills. Empty array = service is not part of
    // the stack (e.g., a standalone analytics service). Populated by
    // annotateServiceRoles() at scan time. Consumers filter for display with
    // `stackRoles.length === 0` instead of fragile substring matching
    // (Item 5 — replaced 4 copies of `!stackValues.some(v => v.includes(svc.name))`).
    stackRoles: string[];
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
  // Deep tier only (null when surface). Item 6 unification: pattern detection
  // uses the analyzer's PatternAnalysis type directly — previously there was a
  // duplicate PatternDetail-based inline type and a mapToPatternDetail wash in
  // scan-engine that coalesced `variant` to `''` (lossy) and dropped MultiPattern
  // information entirely. Same mapping-trap pattern as Item 3 (conventions).
  patterns: PatternAnalysis | null;
  // Convention analysis uses the analyzer's type directly (Item 3 unification —
  // previously had a duplicate ConventionDetail-based inline type and a
  // mapConventions wash in scan-engine that dropped fields when they were added.)
  conventions: ConventionAnalysis | null;

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
