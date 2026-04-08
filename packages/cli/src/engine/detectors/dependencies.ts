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
  // ORMs first — they represent what the code queries through
  'prisma': 'Prisma', '@prisma/client': 'Prisma',
  'drizzle-orm': 'Drizzle',
  'typeorm': 'TypeORM', 'sequelize': 'Sequelize',
  'mongoose': 'Mongoose', 'knex': 'Knex',
  // BaaS / serverless databases
  'convex': 'Convex',
  '@supabase/supabase-js': 'Supabase',
  '@neondatabase/serverless': 'Neon',
  '@planetscale/database': 'PlanetScale',
  'firebase': 'Firebase', 'firebase-admin': 'Firebase',
  // Raw drivers last
  'pg': 'PostgreSQL', 'mysql2': 'MySQL',
  'better-sqlite3': 'SQLite', '@libsql/client': 'Turso',
};

/**
 * Auth packages for dependency detection
 */
export const AUTH_PACKAGES: Record<string, string> = {
  '@clerk/nextjs': 'Clerk', '@clerk/express': 'Clerk', '@clerk/clerk-react': 'Clerk',
  'next-auth': 'NextAuth', '@auth/core': 'Auth.js',
  'better-auth': 'Better Auth',
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
  '@lemonsqueezy/lemonsqueezy.js': 'LemonSqueezy',
  '@polar-sh/sdk': 'Polar',
  'paddle-sdk': 'Paddle',
};

/**
 * AI/LLM packages
 */
export const AI_PACKAGES: Record<string, string> = {
  '@anthropic-ai/sdk': 'Anthropic',
  'openai': 'OpenAI',
  '@google/generative-ai': 'Google AI',
  'ai': 'Vercel AI SDK',
  '@ai-sdk/anthropic': 'Vercel AI (Anthropic)',
  '@ai-sdk/openai': 'Vercel AI (OpenAI)',
  '@ai-sdk/google': 'Vercel AI (Google)',
  'ollama': 'Ollama',
  'replicate': 'Replicate',
};

/**
 * Email packages
 */
export const EMAIL_PACKAGES: Record<string, string> = {
  'resend': 'Resend',
  '@sendgrid/mail': 'SendGrid',
  'postmark': 'Postmark',
  'nodemailer': 'Nodemailer',
  '@react-email/components': 'React Email',
};

/**
 * Monitoring/analytics packages
 */
export const MONITORING_PACKAGES: Record<string, string> = {
  'posthog-js': 'PostHog', 'posthog-node': 'PostHog',
  '@sentry/nextjs': 'Sentry', '@sentry/node': 'Sentry', '@sentry/react': 'Sentry',
  'logrocket': 'LogRocket',
  '@amplitude/analytics-browser': 'Amplitude',
};

/**
 * Background jobs/queue packages
 */
export const JOBS_PACKAGES: Record<string, string> = {
  'inngest': 'Inngest',
  '@trigger.dev/sdk': 'Trigger.dev',
  '@upstash/qstash': 'Upstash QStash',
  'bullmq': 'BullMQ',
  '@upstash/redis': 'Upstash Redis',
};

/**
 * AI SDK detection — branded case values for stack.aiSdk
 * Order defines precedence when multiple SDKs detected.
 */
const AI_SDK_PACKAGES: Array<[string, string]> = [
  ['@anthropic-ai/sdk', 'Anthropic'],
  ['openai', 'OpenAI'],
  ['@ai-sdk/core', 'Vercel AI'],
  ['ai', 'Vercel AI'],
  ['@google/generative-ai', 'Google AI'],
  ['langchain', 'LangChain'],
  ['@langchain/core', 'LangChain'],
  ['@ai-sdk/anthropic', 'Vercel AI'],
  ['@ai-sdk/openai', 'Vercel AI'],
  ['@ai-sdk/google', 'Vercel AI'],
  ['@ai-sdk/mistral', 'Vercel AI'],
];

/**
 * Detect the primary AI SDK from dependencies.
 * Returns branded name of the first/primary match, or null.
 */
export function detectAiSdk(allDeps: Record<string, string>): string | null {
  for (const [pkg, name] of AI_SDK_PACKAGES) {
    if (allDeps[pkg]) return name;
  }
  return null;
}

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
 * Detect services from new category maps.
 * Returns entries for externalServices in EngineResult.
 */
export function detectServiceDeps(
  allDeps: Record<string, string>
): Array<{ name: string; category: string }> {
  const services: Array<{ name: string; category: string }> = [];
  const seen = new Set<string>();

  const maps: Array<[Record<string, string>, string]> = [
    [AI_PACKAGES, 'ai'],
    [EMAIL_PACKAGES, 'email'],
    [MONITORING_PACKAGES, 'monitoring'],
    [JOBS_PACKAGES, 'jobs'],
  ];

  for (const [map, category] of maps) {
    for (const [pkg, name] of Object.entries(map)) {
      if (allDeps[pkg] && !seen.has(name)) {
        seen.add(name);
        services.push({ name, category });
      }
    }
  }

  return services;
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
