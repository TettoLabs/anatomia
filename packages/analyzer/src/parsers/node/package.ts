/**
 * Node.js package.json parser
 *
 * Extracts package names from package.json files for framework detection.
 * Handles all dependency sections per npm specification.
 *
 * @see https://docs.npmjs.com/cli/v10/configuring-npm/package-json
 */

/**
 * Parses Node.js package.json content and extracts package names.
 *
 * This function processes package.json files according to npm's specification,
 * extracting package names from all dependency sections (dependencies, devDependencies,
 * peerDependencies). Package names are normalized to lowercase and scoped packages
 * (e.g., @nestjs/core) preserve their @ symbol for accurate framework detection.
 *
 * @param content - Raw content of a package.json file
 * @returns Array of unique lowercase package names
 *
 * @example
 * ```typescript
 * // Basic usage with dependencies
 * parsePackageJson(JSON.stringify({
 *   dependencies: { "express": "^4.18.0", "next": "15.0.0" }
 * }))
 * // Returns: ['express', 'next']
 *
 * // Scoped packages (preserve @ symbol)
 * parsePackageJson(JSON.stringify({
 *   dependencies: { "@nestjs/core": "^10.0.0", "@types/node": "^20.0.0" }
 * }))
 * // Returns: ['@nestjs/core', '@types/node']
 *
 * // All dependency sections
 * parsePackageJson(JSON.stringify({
 *   dependencies: { "express": "^4.18.0" },
 *   devDependencies: { "vitest": "^2.0.0", "typescript": "^5.7.0" },
 *   peerDependencies: { "react": ">=18.0.0" }
 * }))
 * // Returns: ['express', 'vitest', 'typescript', 'react']
 *
 * // Malformed JSON
 * parsePackageJson('{ invalid json }')
 * // Returns: []
 *
 * // Empty or missing sections
 * parsePackageJson(JSON.stringify({ name: "my-app" }))
 * // Returns: []
 * ```
 */
export function parsePackageJson(content: string): string[] {
  try {
    // Parse JSON content
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pkg = JSON.parse(content);

    // Validate that we got an object
    if (!pkg || typeof pkg !== 'object') {
      return [];
    }

    const deps = new Set<string>();

    // Extract from dependencies section
    if (
      pkg.dependencies &&
      typeof pkg.dependencies === 'object' &&
      !Array.isArray(pkg.dependencies)
    ) {
      Object.keys(pkg.dependencies).forEach((dep) => {
        // Normalize to lowercase while preserving @ for scoped packages
        deps.add(dep.toLowerCase());
      });
    }

    // Extract from devDependencies section
    // Critical: Frameworks like Vite, TypeScript, testing tools often appear here
    if (
      pkg.devDependencies &&
      typeof pkg.devDependencies === 'object' &&
      !Array.isArray(pkg.devDependencies)
    ) {
      Object.keys(pkg.devDependencies).forEach((dep) => {
        deps.add(dep.toLowerCase());
      });
    }

    // Extract from peerDependencies section
    if (
      pkg.peerDependencies &&
      typeof pkg.peerDependencies === 'object' &&
      !Array.isArray(pkg.peerDependencies)
    ) {
      Object.keys(pkg.peerDependencies).forEach((dep) => {
        deps.add(dep.toLowerCase());
      });
    }

    // Return deduplicated array
    return Array.from(deps);
  } catch (error) {
    // Graceful degradation: Return empty array on any error
    // This handles:
    // - SyntaxError from JSON.parse
    // - Any other unexpected errors
    return [];
  }
}
