/**
 * Shared helpers for analysis formatting and scaffold generation
 *
 * Used by: scaffold-generators.ts
 */

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
