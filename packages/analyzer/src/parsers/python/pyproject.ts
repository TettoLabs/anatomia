/**
 * Parse Python pyproject.toml file content
 * Supports: PEP 621 (standard) and Poetry format
 *
 * Based on: PEP 621, Poetry dependency specification
 * Research: START_HERE.md lines 222-291
 */

/**
 * Parse pyproject.toml dependencies
 *
 * Handles:
 * - PEP 621: [project] dependencies = ["package>=version"]
 * - Poetry: [tool.poetry.dependencies] package = "^version"
 *
 * Note: Poetry 2.0+ prefers PEP 621 format, but legacy format still common
 */
export function parsePyprojectToml(content: string): string[] {
  const deps: string[] = [];

  // Strategy 1: PEP 621 dependencies array
  // Pattern: dependencies = ["package>=version", "package2"]
  const pep621Match = content.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
  if (pep621Match && pep621Match[1]) {
    const arrayContent = pep621Match[1];
    // Extract package names from strings
    const pkgMatches = arrayContent.matchAll(/"([a-zA-Z0-9][\w.-]*)[\[\]>=<\s]/g);
    for (const match of pkgMatches) {
      if (match[1]) {
        deps.push(match[1].toLowerCase());
      }
    }
  }

  // Strategy 2: Poetry dependencies table
  // Pattern: package = "^version" or package = {version = "^version"}
  const poetrySection = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\[|$)/);
  if (poetrySection && poetrySection[1]) {
    const tableContent = poetrySection[1];
    const pkgMatches = tableContent.matchAll(/^([a-zA-Z0-9][\w.-]*)\s*=/gm);
    for (const match of pkgMatches) {
      const pkg = match[1]?.toLowerCase();
      // Skip Python version line
      if (pkg && pkg !== 'python') {
        deps.push(pkg);
      }
    }
  }

  // Also check [tool.poetry.group.dev.dependencies] (Poetry 1.2+)
  const poetryDevSection = content.match(/\[tool\.poetry\.group\.dev\.dependencies\]([\s\S]*?)(?=\[|$)/);
  if (poetryDevSection && poetryDevSection[1]) {
    const tableContent = poetryDevSection[1];
    const pkgMatches = tableContent.matchAll(/^([a-zA-Z0-9][\w.-]*)\s*=/gm);
    for (const match of pkgMatches) {
      const pkg = match[1]?.toLowerCase();
      if (pkg) {
        deps.push(pkg);
      }
    }
  }

  return Array.from(new Set(deps));
}
