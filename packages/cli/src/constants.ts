/**
 * Shared constants for CLI
 *
 * Centralizes magic strings and numbers for maintainability.
 */

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
  'setup-complete.md',
] as const;

/** Setup files */
export const SETUP_FILES = [
  'SETUP_GUIDE.md',
  'templates.md',
  'rules.md',
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
export const VALID_SETUP_TIERS = ['quick', 'guided', 'complete'] as const;

/** .meta.json version */
export const META_VERSION = '1.0.0';
