/**
 * Contract matrix for `makeTestCommandNonInteractive` (SCAN-050 / absorbed INFRA-008).
 *
 * The function transforms a raw `package.json` test script into a form safe
 * to run in CI / pipeline contexts (no watch mode, no interactive prompts).
 *
 * 15 cases locked in the SCAN-050 vault:
 *   1-6   Vitest variants (watch default + subcommand + flag + wrappers)
 *   7-9   Jest variants (default + --watch + --watchAll)
 *   10-11 Mocha variants (--watch + default)
 *   12    pytest passthrough
 *   13    go test (no framework detected)
 *   14    multi-framework Jest + Playwright
 *   15    `pnpm run test -- --run` — protects Anatomia's own CI command
 *
 * The multi-framework case is the SCAN-050 behaviour change: the function
 * now accepts `string[]` and uses `.includes()` for membership so projects
 * with both Jest and Playwright still get the Jest transform without the
 * Playwright membership mis-routing the call.
 */

import { describe, it, expect } from 'vitest';
import { makeTestCommandNonInteractive } from '../../../src/commands/init/state.js';

describe('makeTestCommandNonInteractive', () => {
  it.each([
    // [description, input command, frameworks, expected output]
    ['Vitest bare — needs --run',       'vitest',                    ['Vitest'],            'vitest -- --run'],
    ['Vitest run subcommand — already non-interactive',
                                        'vitest run',                ['Vitest'],            'vitest run'],
    ['Vitest --run flag — already non-interactive',
                                        'vitest --run',              ['Vitest'],            'vitest --run'],
    ['Vitest run --coverage — subcommand present, coverage preserved',
                                        'vitest run --coverage',     ['Vitest'],            'vitest run --coverage'],
    ['npx vitest — wrapped, needs run',
                                        'npx vitest',                ['Vitest'],            'npx vitest -- --run'],
    ['npx vitest run — wrapped + subcommand',
                                        'npx vitest run',            ['Vitest'],            'npx vitest run'],
    ['Jest bare — non-interactive by default',
                                        'jest',                      ['Jest'],              'jest'],
    ['Jest --watch — disable via passthrough',
                                        'jest --watch',              ['Jest'],              'jest --watch -- --watchAll=false'],
    ['Jest --watchAll — disable via passthrough',
                                        'jest --watchAll',           ['Jest'],              'jest --watchAll -- --watchAll=false'],
    ['Mocha --watch — disable via passthrough',
                                        'mocha --watch',             ['Mocha'],             'mocha --watch -- --watch=false'],
    ['Mocha bare — non-interactive by default',
                                        'mocha',                     ['Mocha'],             'mocha'],
    ['pytest passthrough',              'pytest',                    ['pytest'],            'pytest'],
    ['go test — no framework detected, passthrough',
                                        'go test',                   [],                    'go test'],
    ['multi-framework Jest + Playwright — no watch flags, no change',
                                        'jest',                      ['Jest', 'Playwright'], 'jest'],
    ['pnpm run test -- --run — protects Anatomia\'s own CI command',
                                        'pnpm run test -- --run',    ['Vitest'],            'pnpm run test -- --run'],
  ])('%s', (_name, input, frameworks, expected) => {
    expect(makeTestCommandNonInteractive(input, frameworks)).toBe(expected);
  });

  it('returns null when testCommand is null', () => {
    expect(makeTestCommandNonInteractive(null, ['Vitest'])).toBeNull();
  });

  it('Jest rawScript --watchAll — wrapper clean, raw script has flag', () => {
    // The real-world case: npm test wrapper, jest --watchAll in package.json scripts
    expect(makeTestCommandNonInteractive('npm test', ['Jest'], 'jest --watchAll'))
      .toBe('npm test -- --watchAll=false');
  });

  it('Jest rawScript --watch — wrapper clean, raw script has flag', () => {
    expect(makeTestCommandNonInteractive('npm test', ['Jest'], 'jest --watch'))
      .toBe('npm test -- --watchAll=false');
  });

  it('Mocha rawScript --watch — wrapper clean, raw script has flag', () => {
    expect(makeTestCommandNonInteractive('pnpm run test', ['Mocha'], 'mocha --watch'))
      .toBe('pnpm run test -- --watch=false');
  });
});
