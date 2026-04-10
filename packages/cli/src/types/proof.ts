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
 */
export interface ProofChainEntry {
  slug: string;
  feature: string;
  result: string;
  author: { name: string; email: string };
  contract: ProofSummary['contract'];
  assertions: Array<{
    id: string;
    says: string;
    status: string;
    deviation?: string;
  }>;
  acceptance_criteria: ProofSummary['acceptance_criteria'];
  timing: ProofSummary['timing'];
  hashes: Record<string, string>;
  seal_commit: string | null;
  completed_at: string;
}
