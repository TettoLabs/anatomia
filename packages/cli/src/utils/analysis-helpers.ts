/**
 * Shared helpers for analysis formatting and scaffold generation
 *
 * Used by: format-analysis-brief.ts, scaffold-generators.ts
 */

/**
 * Convert projectType to human-readable display name
 *
 * @param type - Project type from analyzer ('node', 'python', 'go', etc.)
 * @returns Human-readable name ('JavaScript/TypeScript', 'Python', 'Go', etc.)
 *
 * @example
 * displayProjectType('node') // 'JavaScript/TypeScript'
 * displayProjectType('python') // 'Python'
 * displayProjectType('unknown') // 'Unknown'
 */
export function displayProjectType(type: string): string {
  const displayNames: Record<string, string> = {
    node: 'JavaScript/TypeScript',
    python: 'Python',
    go: 'Go',
    rust: 'Rust',
    ruby: 'Ruby',
    php: 'PHP',
    mixed: 'Mixed/Monorepo',
    unknown: 'Unknown',
  };

  return displayNames[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Pattern categories analyzed by the analyzer
 * Shared by: formatAnalysisBrief, scaffold generators
 */
export const PATTERN_CATEGORIES = [
  'errorHandling',
  'validation',
  'database',
  'auth',
  'testing',
] as const;

/**
 * Convert pattern category to human-readable section name
 *
 * @param category - Category key from analyzer patterns
 * @returns Formatted section name for markdown
 *
 * @example
 * formatCategoryName('errorHandling') // 'Error Handling'
 * formatCategoryName('database') // 'Database'
 */
export function formatCategoryName(category: string): string {
  const categoryNames: Record<string, string> = {
    errorHandling: 'Error Handling',
    validation: 'Validation',
    database: 'Database',
    auth: 'Authentication',
    testing: 'Testing',
  };

  return categoryNames[category] || category;
}
