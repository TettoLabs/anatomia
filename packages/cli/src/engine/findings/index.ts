/**
 * Findings — deterministic checks that surface what AI got wrong.
 *
 * Each finding is produced by a rule function that receives scan context
 * and returns observations. Rules don't read the filesystem (except the
 * secrets rule which needs to scan all source files). Rules don't call
 * external services. Rules don't use LLMs.
 *
 * Adding a new rule: write a function matching FindingRule.check, add it
 * to the FINDING_RULES array. That's it.
 */

import type { ProjectCensus } from '../types/census.js';
import type { EngineResult } from '../types/engineResult.js';
import type { ParsedFile } from '../types/parsed.js';

// ── Types ──────────────────────────────────────────────────────────────

export interface Finding {
  id: string;
  severity: 'critical' | 'warn' | 'info' | 'pass';
  title: string;
  detail: string | null;
  category: 'security' | 'reliability' | 'quality';
}

export interface FindingContext {
  census: ProjectCensus;
  stack: EngineResult['stack'];
  secrets: EngineResult['secrets'];
  rootPath: string;
  sampledFiles: string[];
  parsedFiles: ParsedFile[];
}

export interface FindingRule {
  id: string;
  check: (ctx: FindingContext) => Finding | Finding[] | null | Promise<Finding | Finding[] | null>;
}

// ── Rules ──────────────────────────────────────────────────────────────

import { checkHardcodedSecrets } from './rules/secrets.js';
import { checkEnvHygiene } from './rules/env.js';

const FINDING_RULES: FindingRule[] = [
  { id: 'hardcoded-secrets', check: checkHardcodedSecrets },
  { id: 'env-hygiene', check: checkEnvHygiene },
];

// ── Generator ──────────────────────────────────────────────────────────

export async function generateFindings(ctx: FindingContext): Promise<Finding[]> {
  const findings: Finding[] = [];

  for (const rule of FINDING_RULES) {
    try {
      const result = await rule.check(ctx);
      if (result === null) continue;
      if (Array.isArray(result)) {
        findings.push(...result);
      } else {
        findings.push(result);
      }
    } catch {
      // A broken rule must not break the scan. Skip silently.
    }
  }

  // Sort: critical first, then warn, then info, then pass
  const order: Record<string, number> = { critical: 0, warn: 1, info: 2, pass: 3 };
  findings.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

  return findings;
}
