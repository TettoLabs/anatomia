/**
 * Parse package-lock.json as fallback
 *
 * Used when: package.json is corrupted or invalid JSON
 * Supports: v1, v2, v3 formats
 */

export function parsePackageLock(content: string): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const lock = JSON.parse(content);

    if (!lock || typeof lock !== 'object') {
      return [];
    }

    // package-lock v2/v3 format
    if (
      lock.packages &&
      typeof lock.packages === 'object' &&
      !Array.isArray(lock.packages)
    ) {
      return Object.keys(lock.packages)
        .filter((pkg) => pkg.startsWith('node_modules/'))
        .map((pkg) => pkg.replace('node_modules/', '').toLowerCase());
    }

    // package-lock v1 format
    if (
      lock.dependencies &&
      typeof lock.dependencies === 'object' &&
      !Array.isArray(lock.dependencies)
    ) {
      return Object.keys(lock.dependencies).map((d) => d.toLowerCase());
    }

    return [];
  } catch {
    return [];
  }
}
