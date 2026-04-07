/**
 * Shared constants for CLI
 *
 * Centralizes magic strings and numbers for maintainability.
 *
 * === VAULT CONSTANTS (D8.5) ===
 * CONTEXT_FILES, CORE_SKILLS, CONDITIONAL_SKILL_TRIGGERS, computeSkillManifest
 * are the single source of truth for the file manifest.
 * Hooks, check.ts, init, and display code should read from these.
 * Adding a context file or skill means updating THIS file.
 */

import type { EngineResult } from './engine/types/engineResult.js';

// ============================================================
// VAULT: File Manifest (D6.1, D8.5)
// ============================================================

/** Context files in .ana/context/ (D6.1) */
export const CONTEXT_FILES = ['design-principles', 'project-context'] as const;

/** Core skills — always scaffolded (D6.1) */
export const CORE_SKILLS = [
  'coding-standards',
  'testing-standards',
  'git-workflow',
  'deployment',
  'troubleshooting',
] as const;

/**
 * Conditional skills — scaffolded only when scan detects the trigger (D6.1)
 *
 * Note: stack.aiSdk doesn't exist in EngineResult yet (D2 schema change pending).
 * Using (stack as any).aiSdk until the schema is updated in S13.
 */
export const CONDITIONAL_SKILL_TRIGGERS: Record<string, (result: EngineResult) => boolean> = {
  'ai-patterns': (r) => !!(r?.stack as Record<string, unknown>)?.aiSdk,
  'api-patterns': (r) => !!r?.stack?.framework,
  'data-access': (r) => !!r?.stack?.database,
};

/** All conditional skill names */
export const ALL_CONDITIONAL_SKILLS = Object.keys(CONDITIONAL_SKILL_TRIGGERS) as string[];

/**
 * Compute which skills to scaffold based on scan results.
 * This function IS Anatomia's adaptive intelligence. (D8.2, D8.9)
 *
 * @param engineResult - Scan engine result
 * @returns Array of skill names to scaffold
 */
export function computeSkillManifest(engineResult: EngineResult): string[] {
  const skills: string[] = [...CORE_SKILLS];
  for (const [skill, trigger] of Object.entries(CONDITIONAL_SKILL_TRIGGERS)) {
    if (trigger(engineResult)) {
      skills.push(skill);
    }
  }
  return skills;
}

// ============================================================
// LEGACY CONSTANTS (pre-vault — still referenced by current code)
// These will be migrated to vault constants as init/validators are rewritten.
// ============================================================

/** Scaffold marker (first line of every context file scaffold) */
export const SCAFFOLD_MARKER = '<!-- SCAFFOLD - Setup will fill this file -->';

/** Validation thresholds */
export const MIN_FILE_SIZE_WARNING = 20; // Lines
export const MAX_FILE_SIZE_WARNING = 1500; // Lines
export const MIN_DEBUGGING_FILE_SIZE = 15; // Lines

/** Pattern categories (synchronized with analyzer) */
export const PATTERN_CATEGORIES = [
  'errorHandling',
  'validation',
  'database',
  'auth',
  'testing',
] as const;

/** Context files required for setup complete validation */
export const REQUIRED_CONTEXT_FILES = [
  'context/project-overview.md',
  'context/architecture.md',
  'context/patterns.md',
  'context/conventions.md',
  'context/workflow.md',
  'context/testing.md',
  'context/debugging.md',
] as const;

/** Mode files */
export const MODE_FILES = [
  'architect.md',
  'code.md',
  'debug.md',
  'docs.md',
  'test.md',
  'general.md',
  'setup.md',
  'setup-quick.md',
  'setup-guided.md',
] as const;

/** Step files */
export const STEP_FILES = [
  '00_explore_codebase.md',
  '01_project_overview.md',
  '02_conventions.md',
  '03_patterns.md',
  '04_architecture.md',
  '05_testing.md',
  '06_workflow.md',
  '07_debugging.md',
] as const;

/** Framework snippet files */
export const FRAMEWORK_SNIPPETS = [
  'fastapi.md',
  'django.md',
  'nextjs.md',
  'express.md',
  'go.md',
  'generic.md',
] as const;

/** Agent definition files */
export const AGENT_FILES = [
  'ana.md',
  'ana-plan.md',
  'ana-setup.md',
  'ana-build.md',
  'ana-verify.md',
  'ana-explorer.md',
  'ana-question-formulator.md',
  'ana-writer.md',
  'ana-verifier.md',
] as const;

/** Skill directories (each contains SKILL.md) */
export const SKILL_DIRS = [
  'testing-standards',
  'coding-standards',
  'git-workflow',
  'deployment',
  'design-principles',
  'logging-standards',
] as const;

/** Valid setupMode tiers */
export const VALID_SETUP_TIERS = ['quick', 'guided'] as const;

/** ana.json version */
export const ANA_JSON_VERSION = '1.0.0';
