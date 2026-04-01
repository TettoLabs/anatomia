/**
 * Generate proof summary from pipeline artifacts
 *
 * Reads artifacts from a slug directory (active or completed) and returns
 * a structured summary for proof chain and PR generation.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';

/**
 * Per-assertion proof data
 */
export interface ProofAssertion {
  id: string;
  says: string;
  preCheckStatus: 'COVERED' | 'UNCOVERED';
  verifyStatus?: 'SATISFIED' | 'UNSATISFIED' | 'DEVIATED' | null;
  evidence?: string;
}

/**
 * Deviation from contract
 */
export interface ProofDeviation {
  contract_id: string;
  says: string;
  instead: string | null;
  reason: string | null;
  outcome: string | null;
}

/**
 * Complete proof summary
 */
export interface ProofSummary {
  feature: string;
  result: string;
  author: {
    name: string;
    email: string;
  };
  assertions: ProofAssertion[];
  contract: {
    total: number;
    covered: number;
    uncovered: number;
    satisfied: number;
    unsatisfied: number;
    deviated: number;
  };
  acceptance_criteria: {
    total: number;
    met: number;
  };
  timing: {
    total_minutes: number;
    think?: number;
    plan?: number;
    build?: number;
    verify?: number;
  };
  deviations: ProofDeviation[];
  hashes: Record<string, string>;
  seal_commit: string | null;
  completed_at: string;
}

/**
 * Save metadata entry structure
 */
interface SaveEntry {
  saved_at?: string;
  commit?: string;
  hash?: string;
}

/**
 * Pre-check assertion from .saves.json
 */
interface PreCheckAssertion {
  id: string;
  says: string;
  status: 'COVERED' | 'UNCOVERED';
}

/**
 * Pre-check metadata structure
 */
interface PreCheckData {
  seal?: string;
  seal_commit?: string;
  assertions?: PreCheckAssertion[];
  covered?: number;
  uncovered?: number;
}

/**
 * Saves.json structure
 */
interface SavesData {
  scope?: SaveEntry;
  contract?: SaveEntry;
  'build-report'?: SaveEntry;
  'verify-report'?: SaveEntry;
  'pre-check'?: PreCheckData;
  [key: string]: SaveEntry | PreCheckData | undefined;
}

/**
 * Contract YAML structure
 */
interface ContractYaml {
  feature?: string;
  assertions?: Array<{ id: string; says: string }>;
}

/**
 * Parse Contract Compliance table from verify report
 *
 * @param content - Verify report content
 * @returns Array of compliance rows with id, says, status, evidence
 */
function parseComplianceTable(content: string): Array<{
  id: string;
  says: string;
  status: string;
  evidence: string;
}> {
  const results: Array<{ id: string; says: string; status: string; evidence: string }> = [];

  // Find the Contract Compliance table
  const tableMatch = content.match(/## Contract Compliance[\s\S]*?\|[\s\S]*?\n([\s\S]*?)(?=\n##|\n---|\n\n\n|$)/);
  if (!tableMatch) return results;

  const tableSection = tableMatch[0];
  const lines = tableSection.split('\n');

  for (const line of lines) {
    // Skip header and separator lines
    if (!line.startsWith('|') || line.includes('----') || line.includes('Says') || line.includes('Status')) {
      continue;
    }

    // Parse table row: | ID | Says | Status | Evidence |
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 3) {
      const id = cells[0];
      const says = cells[1];
      // Extract status from emoji + text (e.g., "✅ SATISFIED")
      const statusCell = cells[2];
      const statusMatch = statusCell.match(/(SATISFIED|UNSATISFIED|DEVIATED|UNCOVERED)/i);
      const status = statusMatch ? statusMatch[1].toUpperCase() : 'UNKNOWN';
      const evidence = cells[3] || '';

      results.push({ id, says, status, evidence });
    }
  }

  return results;
}

/**
 * Parse Result line from verify report
 *
 * @param content - Verify report content
 * @returns PASS, FAIL, or UNKNOWN
 */
function parseResult(content: string): string {
  const match = content.match(/\*\*Result:\*\*\s*(PASS|FAIL)/i);
  return match ? match[1].toUpperCase() : 'UNKNOWN';
}

/**
 * Parse AC walkthrough and count results
 *
 * @param content - Verify report content
 * @returns Object with total and met AC counts
 */
function parseACResults(content: string): { total: number; met: number } {
  // Count all AC markers
  const passCount = (content.match(/✅\s*PASS/g) || []).length;
  const failCount = (content.match(/❌\s*FAIL/g) || []).length;
  const partialCount = (content.match(/⚠️?\s*PARTIAL/g) || []).length;
  const unverifiableCount = (content.match(/🔍\s*UNVERIFIABLE/g) || []).length;

  const total = passCount + failCount + partialCount + unverifiableCount;
  const met = passCount;

  return { total: total || 0, met };
}

/**
 * Parse deviations from build report
 *
 * @param content - Build report content
 * @returns Array of parsed deviations
 */
function parseDeviations(content: string): ProofDeviation[] {
  const deviations: ProofDeviation[] = [];

  // Match deviation blocks: ### A{ID}: {says}
  const deviationPattern = /### (A\d+): ([^\n]+)\n([\s\S]*?)(?=\n### |## |$)/g;
  let match;

  while ((match = deviationPattern.exec(content)) !== null) {
    const contractId = match[1];
    const says = match[2].trim();
    const body = match[3];

    // Extract Instead, Reason, Outcome
    const insteadMatch = body.match(/\*\*Instead:\*\*\s*([^\n]+)/);
    const reasonMatch = body.match(/\*\*Reason:\*\*\s*([^\n]+)/);
    const outcomeMatch = body.match(/\*\*Outcome:\*\*\s*([^\n]+)/);

    deviations.push({
      contract_id: contractId,
      says,
      instead: insteadMatch ? insteadMatch[1].trim() : null,
      reason: reasonMatch ? reasonMatch[1].trim() : null,
      outcome: outcomeMatch ? outcomeMatch[1].trim() : null,
    });
  }

  return deviations;
}

/**
 * Compute timing from save timestamps
 *
 * @param saves - Saves data from .saves.json
 * @returns Timing breakdown in minutes
 */
function computeTiming(saves: SavesData): ProofSummary['timing'] {
  const getTime = (key: string): number | null => {
    const entry = saves[key] as SaveEntry | undefined;
    return entry?.saved_at ? new Date(entry.saved_at).getTime() : null;
  };

  const scopeTime = getTime('scope');
  const contractTime = getTime('contract');
  const buildTime = getTime('build-report');
  const verifyTime = getTime('verify-report');

  const totalMs = (verifyTime && scopeTime) ? verifyTime - scopeTime : 0;

  return {
    total_minutes: Math.round(totalMs / 60000),
    think: (contractTime && scopeTime) ? Math.round((contractTime - scopeTime) / 60000) : undefined,
    plan: (contractTime && scopeTime) ? Math.round((contractTime - scopeTime) / 60000) : undefined,
    build: (buildTime && contractTime) ? Math.round((buildTime - contractTime) / 60000) : undefined,
    verify: (verifyTime && buildTime) ? Math.round((verifyTime - buildTime) / 60000) : undefined,
  };
}

/**
 * Get git author info
 *
 * @returns Object with name and email from git config
 */
function getAuthor(): { name: string; email: string } {
  try {
    const name = execSync('git config user.name', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const email = execSync('git config user.email', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    return { name: name || 'Unknown', email: email || 'unknown@example.com' };
  } catch {
    return { name: 'Unknown', email: 'unknown@example.com' };
  }
}

/**
 * Generate proof summary from a slug directory
 *
 * @param slugDir - Path to the slug directory (active or completed)
 * @returns ProofSummary with all available data
 */
export function generateProofSummary(slugDir: string): ProofSummary {
  const slug = path.basename(slugDir);

  // Initialize with defaults
  const summary: ProofSummary = {
    feature: slug,
    result: 'UNKNOWN',
    author: getAuthor(),
    assertions: [],
    contract: {
      total: 0,
      covered: 0,
      uncovered: 0,
      satisfied: 0,
      unsatisfied: 0,
      deviated: 0,
    },
    acceptance_criteria: {
      total: 0,
      met: 0,
    },
    timing: {
      total_minutes: 0,
    },
    deviations: [],
    hashes: {},
    seal_commit: null,
    completed_at: new Date().toISOString(),
  };

  // Source 1: .saves.json
  const savesPath = path.join(slugDir, '.saves.json');
  let saves: SavesData = {};
  if (fs.existsSync(savesPath)) {
    try {
      saves = JSON.parse(fs.readFileSync(savesPath, 'utf-8'));

      // Extract hashes
      for (const [key, value] of Object.entries(saves)) {
        if (key !== 'pre-check' && value && typeof value === 'object' && 'hash' in value) {
          const entry = value as SaveEntry;
          if (entry.hash) {
            summary.hashes[key] = entry.hash;
          }
        }
      }

      // Extract timing
      summary.timing = computeTiming(saves);

      // Extract pre-check data
      const preCheck = saves['pre-check'] as PreCheckData | undefined;
      if (preCheck) {
        summary.seal_commit = preCheck.seal_commit || null;

        // Build assertions from pre-check
        if (preCheck.assertions && Array.isArray(preCheck.assertions)) {
          summary.assertions = preCheck.assertions.map(a => ({
            id: a.id,
            says: a.says,
            preCheckStatus: a.status,
            verifyStatus: null,
            evidence: undefined,
          }));

          summary.contract.total = preCheck.assertions.length;
          summary.contract.covered = preCheck.covered || preCheck.assertions.filter(a => a.status === 'COVERED').length;
          summary.contract.uncovered = preCheck.uncovered || preCheck.assertions.filter(a => a.status === 'UNCOVERED').length;
        }
      }
    } catch {
      // Continue with defaults
    }
  }

  // Source 2: contract.yaml (for feature name fallback)
  const contractPath = path.join(slugDir, 'contract.yaml');
  if (fs.existsSync(contractPath)) {
    try {
      const contract: ContractYaml = yaml.parse(fs.readFileSync(contractPath, 'utf-8'));
      if (contract.feature) {
        summary.feature = contract.feature;
      }

      // If no pre-check data, build assertions from contract
      if (summary.assertions.length === 0 && contract.assertions) {
        summary.assertions = contract.assertions.map(a => ({
          id: a.id,
          says: a.says,
          preCheckStatus: 'UNCOVERED' as const,
          verifyStatus: null,
          evidence: undefined,
        }));
        summary.contract.total = contract.assertions.length;
        summary.contract.uncovered = contract.assertions.length;
      }
    } catch {
      // Continue with defaults
    }
  }

  // Source 3: verify_report.md
  const verifyPath = path.join(slugDir, 'verify_report.md');
  if (fs.existsSync(verifyPath)) {
    try {
      const verifyContent = fs.readFileSync(verifyPath, 'utf-8');

      // Parse result
      summary.result = parseResult(verifyContent);

      // Parse AC results
      summary.acceptance_criteria = parseACResults(verifyContent);

      // Parse compliance table and overlay on assertions
      const complianceRows = parseComplianceTable(verifyContent);
      for (const row of complianceRows) {
        const assertion = summary.assertions.find(a => a.id === row.id);
        if (assertion) {
          assertion.verifyStatus = row.status as 'SATISFIED' | 'UNSATISFIED' | 'DEVIATED';
          assertion.evidence = row.evidence;
        }
      }

      // Update contract counts from verify statuses
      summary.contract.satisfied = summary.assertions.filter(a => a.verifyStatus === 'SATISFIED').length;
      summary.contract.unsatisfied = summary.assertions.filter(a => a.verifyStatus === 'UNSATISFIED').length;
      summary.contract.deviated = summary.assertions.filter(a => a.verifyStatus === 'DEVIATED').length;
    } catch {
      // Continue with defaults
    }
  }

  // Source 4: build_report.md (for deviations)
  const buildPath = path.join(slugDir, 'build_report.md');
  if (fs.existsSync(buildPath)) {
    try {
      const buildContent = fs.readFileSync(buildPath, 'utf-8');
      summary.deviations = parseDeviations(buildContent);
    } catch {
      // Continue with defaults
    }
  }

  return summary;
}
