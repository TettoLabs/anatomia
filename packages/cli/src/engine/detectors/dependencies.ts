/**
 * Dependency-based stack detection
 *
 * Detects database, auth, testing, and payment tools from package.json dependencies.
 * Primary detection path — tree-sitter enriches but doesn't lead.
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';

/**
 * Database packages for dependency detection
 */
export const DATABASE_PACKAGES: Record<string, string> = {
  '@supabase/supabase-js': 'Supabase',
  'prisma': 'Prisma', '@prisma/client': 'Prisma',
  'drizzle-orm': 'Drizzle',
  'typeorm': 'TypeORM', 'sequelize': 'Sequelize',
  'mongoose': 'Mongoose', 'knex': 'Knex',
  'pg': 'PostgreSQL', 'mysql2': 'MySQL',
  'better-sqlite3': 'SQLite', '@libsql/client': 'Turso',
  'firebase': 'Firebase', 'firebase-admin': 'Firebase',
};

/**
 * Auth packages for dependency detection
 */
export const AUTH_PACKAGES: Record<string, string> = {
  '@clerk/nextjs': 'Clerk', '@clerk/express': 'Clerk',
  'next-auth': 'NextAuth', '@auth/core': 'Auth.js',
  '@supabase/ssr': 'Supabase Auth',
  '@supabase/auth-helpers-nextjs': 'Supabase Auth',
  'passport': 'Passport',
  'lucia': 'Lucia', '@lucia-auth/adapter-prisma': 'Lucia',
  'jsonwebtoken': 'JWT', 'bcrypt': 'bcrypt', 'bcryptjs': 'bcrypt',
};

/**
 * Testing packages for dependency detection
 */
export const TESTING_PACKAGES: Record<string, string> = {
  'vitest': 'Vitest',
  'playwright': 'Playwright', '@playwright/test': 'Playwright',
  'jest': 'Jest', '@jest/globals': 'Jest',
  'cypress': 'Cypress',
  'mocha': 'Mocha',
  '@testing-library/react': 'Testing Library',
  '@testing-library/jest-dom': 'Testing Library',
  'supertest': 'Supertest',
};

/**
 * Payment packages for dependency detection
 */
export const PAYMENT_PACKAGES: Record<string, string> = {
  'stripe': 'Stripe', '@stripe/stripe-js': 'Stripe',
  '@lemonsqueezy/lemonsqueezy.js': 'Lemon Squeezy',
  'paddle-sdk': 'Paddle',
};

export interface DependencyDetectionResult {
  database: string | null;
  auth: string | null;
  testing: string | null;
  payments: string | null;
}

/**
 * Read and merge dependencies from a package.json file
 */
export async function readDependencies(
  packageJsonPath: string
): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);
    return {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
  } catch {
    return {};
  }
}

/**
 * Detect stack categories from a merged dependency map
 */
export function detectFromDeps(
  allDeps: Record<string, string>
): DependencyDetectionResult {
  const result: DependencyDetectionResult = {
    database: null,
    auth: null,
    testing: null,
    payments: null,
  };

  for (const [pkg, name] of Object.entries(DATABASE_PACKAGES)) {
    if (allDeps[pkg]) { result.database = name; break; }
  }
  for (const [pkg, name] of Object.entries(AUTH_PACKAGES)) {
    if (allDeps[pkg]) { result.auth = name; break; }
  }
  for (const [pkg, name] of Object.entries(TESTING_PACKAGES)) {
    if (allDeps[pkg]) { result.testing = name; break; }
  }
  for (const [pkg, name] of Object.entries(PAYMENT_PACKAGES)) {
    if (allDeps[pkg]) { result.payments = name; break; }
  }

  return result;
}

/**
 * Detect stack categories from package.json dependencies.
 * Only ADDS categories the analyzer didn't already detect.
 *
 * @param scanPath - Path being scanned
 * @param existingStack - Stack categories already detected by analyzer
 * @param verbose - Whether to log verbose output
 * @returns Merged stack with fallback additions
 */
export async function detectFromPackageJson(
  scanPath: string,
  existingStack: Record<string, string>,
  verbose: boolean
): Promise<Record<string, string>> {
  const stack = { ...existingStack };
  const packageJsonPath = path.join(scanPath, 'package.json');
  const allDeps = await readDependencies(packageJsonPath);

  if (Object.keys(allDeps).length === 0) return stack;

  const detected = detectFromDeps(allDeps);

  if (!stack.database && detected.database) {
    stack.database = detected.database;
    if (verbose) console.error(`Fallback: Database: ${detected.database}`);
  }
  if (!stack.auth && detected.auth) {
    stack.auth = detected.auth;
    if (verbose) console.error(`Fallback: Auth: ${detected.auth}`);
  }
  if (!stack.testing && detected.testing) {
    stack.testing = detected.testing;
    if (verbose) console.error(`Fallback: Testing: ${detected.testing}`);
  }
  if (!stack.payments && detected.payments) {
    stack.payments = detected.payments;
    if (verbose) console.error(`Fallback: Payments: ${detected.payments}`);
  }

  return stack;
}

/**
 * Aggregate dependencies from all workspace packages in a monorepo
 */
export async function aggregateMonorepoDependencies(
  rootDir: string,
  workspacePackagePaths: string[]
): Promise<Record<string, string>> {
  const rootDeps = await readDependencies(path.join(rootDir, 'package.json'));
  const aggregated = { ...rootDeps };

  for (const pkgPath of workspacePackagePaths) {
    const absPath = path.isAbsolute(pkgPath)
      ? path.join(pkgPath, 'package.json')
      : path.join(rootDir, pkgPath, 'package.json');
    const deps = await readDependencies(absPath);
    Object.assign(aggregated, deps);
  }

  return aggregated;
}
