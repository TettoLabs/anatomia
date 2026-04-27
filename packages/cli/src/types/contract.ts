/**
 * Contract types (clear-the-deck).
 *
 * Single source of truth for contract structures used by artifact.ts
 * and verify.ts. Extracted from duplicate local interfaces where
 * artifact.ts had `id?: string` (lied) while verify.ts had `id: string`
 * (truth). Runtime validation at artifact.ts line 367 enforces id as
 * required — the type now agrees.
 */

/**
 * Contract assertion from YAML
 */
export interface ContractAssertion {
  id: string;
  says: string;
  block?: string;
  target?: string;
  matcher?: string;
  value?: unknown;
}

/**
 * Contract file change structure
 */
export interface ContractFileChange {
  path?: string;
  action?: string;
}

/**
 * Contract schema structure
 */
export interface ContractSchema {
  version?: string;
  sealed_by?: string;
  feature?: string;
  assertions?: ContractAssertion[];
  file_changes?: ContractFileChange[];
}
