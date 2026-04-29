/**
 * Proof chain types (Item 13).
 *
 * Extracted from commands/work.ts so proof.ts can import without a
 * cross-command dependency. The types are pure — they reference
 * ProofSummary from utils/proofSummary.js for sub-field types, but
 * that's a clean utils → types → commands layering (commands depend
 * on both utils and types, neither depends on commands).
 */

import type { ProofSummary } from '../utils/proofSummary.js';

/**
 * Proof chain JSON entry — one completed slug's verification record.
 *
 * CROSS-CUTTING: Adding a field requires changes in 4+ locations:
 *   1. Type definition below
 *   2. Default in generateProofSummary() (utils/proofSummary.ts)
 *   3. Entry construction in writeProofChain() (commands/work.ts)
 *   4. Display in formatHumanReadable() or formatListTable() (commands/proof.ts)
 * Old entries in proof_chain.json may lack new fields — consumers must handle undefined.
 */
/**
 * Proof chain JSON structure — the top-level container.
 */
export interface ProofChain {
  schema?: number;
  entries: ProofChainEntry[];
}

/**
 * Health stats returned by writeProofChain.
 */
export interface ProofChainStats {
  runs: number;
  findings: number;
  active: number;
  lessons: number;
  promoted: number;
  closed: number;
  newFindings: number;
  maintenance?: {
    auto_closed: number;
    lessons_classified: number;
  };
}

export interface ProofChainEntry {
  slug: string;
  feature: string;
  result: 'PASS' | 'FAIL' | 'UNKNOWN';
  author: { name: string; email: string };
  contract: ProofSummary['contract'];
  assertions: Array<{
    id: string;
    says: string;
    status: 'SATISFIED' | 'UNSATISFIED' | 'DEVIATED' | 'UNCOVERED';
    deviation?: string;
  }>;
  acceptance_criteria: ProofSummary['acceptance_criteria'];
  timing: ProofSummary['timing'];
  hashes: Record<string, string>;
  completed_at: string;
  // S23 pipeline hardening — intelligence capture
  modules_touched: string[];
  scope_summary?: string | undefined;
  findings: Array<{
    id: string;
    category: 'code' | 'test' | 'upstream';
    summary: string;
    file: string | null;
    anchor: string | null;
    line?: number; // Display only. NOT used for matching or staleness.
    severity?: 'risk' | 'debt' | 'observation';
    suggested_action?: 'promote' | 'scope' | 'monitor' | 'accept';
    related_assertions?: string[];
    status?: 'active' | 'lesson' | 'promoted' | 'closed';
    closed_reason?: string;
    closed_at?: string;
    closed_by?: 'mechanical' | 'human' | 'agent';
    promoted_to?: string;
  }>;
  rejection_cycles: number;
  previous_failures: Array<{ id: string; summary: string }>;
  build_concerns: Array<{
    summary: string;
    file: string | null;
    severity?: 'risk' | 'debt' | 'observation';
    suggested_action?: 'promote' | 'scope' | 'monitor' | 'accept';
  }>;
}
