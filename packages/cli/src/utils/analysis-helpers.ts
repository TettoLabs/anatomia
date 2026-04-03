/**
 * Shared helpers for analysis formatting and scaffold generation
 *
 * Used by: scaffold-generators.ts
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

// Re-export PATTERN_CATEGORIES from constants for backward compatibility
export { PATTERN_CATEGORIES } from '../constants.js';

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
