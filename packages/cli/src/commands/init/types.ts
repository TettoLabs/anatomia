/**
 * Shared types for the init command (Item 14c — extracted from init.ts).
 *
 * These types are used across multiple split files: index.ts (action
 * handler), preflight.ts (validateInitPreconditions), and potentially
 * scaffold helpers. Putting them in their own file avoids a
 * cross-file cycle between index.ts and preflight.ts.
 */

/** Command options */
export interface InitCommandOptions {
  force?: boolean;
  yes?: boolean;
}

/** Installation state detected during pre-scan validation */
export type InitState = 'fresh' | 'reinit' | 'upgrade' | 'corrupted';

/** Pre-flight validation result */
export interface PreflightResult {
  canProceed: boolean;
  initState: InitState;
  stateBackup?: string | undefined; // Path to state/ backup if --force used
  contextBackup?: string | undefined; // Path to context/ backup if --force used
  anaJsonBackup?: string | undefined; // Path to ana.json backup if --force used
}
