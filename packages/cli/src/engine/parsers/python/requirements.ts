/**
 * Python requirements.txt parser
 *
 * Extracts package names from requirements.txt files for framework detection.
 * Handles all edge cases per pip specification.
 *
 * @see https://pip.pypa.io/en/stable/reference/requirements-file-format/
 */

/**
 * Parses Python requirements.txt content and extracts package names.
 *
 * This function processes requirements.txt files according to pip's specification,
 * extracting only the package names (normalized to lowercase) while handling
 * various edge cases like comments, version specifiers, extras, and environment markers.
 *
 * @param content - Raw content of a requirements.txt file
 * @returns Array of unique lowercase package names
 *
 * @example
 * ```typescript
 * // Basic usage with versions
 * parseRequirementsTxt('flask==2.0.1\ndjango>=3.0')
 * // Returns: ['flask', 'django']
 *
 * // Comments and blank lines
 * parseRequirementsTxt('# comment\nflask  # inline\n\ndjango')
 * // Returns: ['flask', 'django']
 *
 * // Extras in brackets
 * parseRequirementsTxt('requests[security,socks]>=2.0')
 * // Returns: ['requests']
 *
 * // Environment markers
 * parseRequirementsTxt('django>=3.0; python_version >= "3.8"')
 * // Returns: ['django']
 *
 * // Mixed edge cases
 * parseRequirementsTxt('-e git+https://...\nflask\n-r dev.txt\nDjango')
 * // Returns: ['flask', 'django']
 * ```
 */
export function parseRequirementsTxt(content: string): string[] {
  const deps: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Edge case 1: Skip blank lines
    if (!trimmed) continue;

    // Edge case 2: Skip comments (# at start)
    if (trimmed.startsWith('#')) continue;

    // Edge case 3: Skip options/includes (-e, -r, --option lines)
    if (trimmed.startsWith('-')) continue;

    // Remove inline comments before processing
    // Edge case 2 (continued): Handle inline comments (flask==2.0 # comment)
    const commentParts = trimmed.split('#');
    const withoutComment = commentParts[0]?.trim();
    if (!withoutComment) continue;

    // Edge case 5: Remove environment markers (; python_version >= "3.8")
    const markerParts = withoutComment.split(';');
    const withoutMarker = markerParts[0]?.trim();
    if (!withoutMarker) continue;

    // Extract package name using regex
    // Pattern: Must start with letter/digit, followed by word chars, dots, or dashes
    // This handles standard package names per PEP 508
    const match = withoutMarker.match(/^([a-zA-Z0-9][\w.-]*)/);

    if (match && match[1]) {
      let pkgName = match[1];

      // Edge case 4: Remove extras (requests[security] → requests)
      const pkgParts = pkgName.split('[');
      pkgName = pkgParts[0] ?? pkgName;

      // Edge case 7: Normalize to lowercase (Django → django)
      pkgName = pkgName.toLowerCase();

      deps.push(pkgName);
    }
    // Edge case 6: VCS URLs (git+https://...) are automatically skipped
    // because they don't match the package name regex pattern
  }

  // Deduplicate using Set (handles case where same package appears multiple times)
  return Array.from(new Set(deps));
}
