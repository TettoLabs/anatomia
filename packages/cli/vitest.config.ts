import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Item 19: type tests (`.test-d.ts` / `assertType()` calls) are opt-in.
    // For ambient type checking of all test files, the authoritative path is
    // `pnpm typecheck:tests` (runs tsc against tsconfig.test.json). Vitest's
    // typecheck mode is kept disabled because enabling it re-runs tsc on
    // every `pnpm test`, doubling test duration without catching errors
    // that the dedicated `typecheck:tests` script doesn't already catch.
    // typecheck: { enabled: true, tsconfig: './tsconfig.test.json' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'dist/**',
        '**/*.test.ts',
        'src/test-*.ts', // Validation scripts
        'src/index.ts',  // CLI entry (just imports)
      ],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
});
