# Build Report: Proof Promote

**Created by:** AnaBuild
**Date:** 2026-04-29
**Spec:** .ana/plans/active/proof-promote/spec.md
**Branch:** feature/proof-promote

## What Was Built
- `packages/cli/src/commands/proof.ts` (modified): Added `promote` subcommand (~200 lines) after the close subcommand. Implements: command definition with `--skill`, `--text`, `--section`, `--force`, `--json` options; exitError helper with contextual help for SKILL_REQUIRED, SKILL_NOT_FOUND, SECTION_NOT_FOUND, TEXT_EMPTY, ALREADY_PROMOTED, ALREADY_CLOSED, WRONG_BRANCH, FINDING_NOT_FOUND; branch check + pull; finding lookup; skill file read + section boundary detection; duplicate detection via word overlap; placeholder replacement; rule append; chain mutation; dashboard regeneration; git stage/commit/push; human and JSON output. Added `import { globSync } from 'glob'` for skill discovery.
- `packages/cli/tests/commands/proof.test.ts` (modified): Added `Promote Subcommand Tests` section with `createPromoteTestProject` helper and 22 new test cases covering all acceptance criteria and contract assertions.

## PR Summary

- Add `ana proof promote <id> --skill <name>` subcommand that transitions findings to `promoted` status and appends rules to skill files
- Support `--text` for custom rule text, `--section` for targeting Rules or Gotchas, `--force` for overriding closed findings
- Implement duplicate detection (>50% word overlap warning), placeholder replacement (`*Not yet captured*`), and three-file git staging
- Follow close subcommand's lifecycle pattern: branch check, pull, read chain, validate, mutate, write, dashboard regen, commit, push
- 22 new tests covering success paths, all error codes, edge cases, and JSON envelope format

## Acceptance Criteria Coverage

- AC1 "promote lifecycle" -> promotes finding successfully:1949 "marks finding as promoted with skill path" (5 assertions: exitCode, stdout, chain.status, chain.promoted_to, dashboard, commit message)
- AC2 "summary as rule" -> appends finding summary as rule:1970 "appends summary as bulleted rule" (2 assertions)
- AC3 "--text override" -> uses custom text when provided:1984 "appends custom text" + :1993 "JSON output shows custom rule text" (3 assertions)
- AC4 "--skill required" -> rejects promote without skill flag:1862 "shows error listing available skills" (2 assertions: exitCode, stderr contains 'coding-standards') + :1873 "returns SKILL_REQUIRED in JSON mode" (2 assertions: exitCode, json.error.code)
- AC5 "skill not found" -> rejects nonexistent skill:1885 (2 tests, JSON + human)
- AC6 "--section gotchas" -> appends to gotchas section:1908 (4 assertions: gotchas section contains, rules section doesn't)
- AC7 "already promoted" -> rejects already-promoted finding:1935 (2 assertions: JSON code, human stderr)
- AC8 "already closed" -> rejects closed finding without force:1955 (2 tests, JSON + human)
- AC9 "JSON envelope" -> returns valid JSON envelope:1997 (6 assertions)
- AC10 "duplicate warning" -> warns on duplicate rule:2020 (1 assertion)
- AC11 "placeholder replacement" -> replaces placeholder in empty section:2065 (2 assertions)
- AC12 "commit message" -> verified in promotes finding successfully test (commit message assertion)
- AC13 "branch check" -> rejects promote from wrong branch:2080 (1 assertion)
- AC14 "tests pass" -> verified by full test suite run
- AC15 "no build errors" -> verified by build command
- AC16 "empty text" -> rejects empty text:2095 (1 assertion)
- AC17 "missing section" -> rejects skill file without target section:2110 (1 assertion)

## Implementation Decisions

- Duplicate detection uses the smaller set's size as denominator (`intersection.size / Math.min(newWords.size, existingWords.size) > 0.5`) per the spec's clarification. This means even a 3-word rule can trigger a duplicate warning if 2 of those words appear in an existing rule.
- For placeholder detection, used `/^[ \t]*\*Not yet captured[^*]*\*/m` regex to match any placeholder variant as the spec noted suffix varies between skill files.
- Shell quoting in tests: multi-word `--text` values wrapped in literal double quotes in the args array since `runProof` joins args with spaces for `execSync`. Empty text tested with space-only string `"  "` since shell drops empty string arguments.

## Fix History

**Cycle 1 (verify failure):** AnaVerify found A009 and A010 unsatisfied because Commander's `requiredOption('--skill')` intercepted before the action handler, making the SKILL_REQUIRED error path dead code. Fix: changed `requiredOption` to `option` so manual validation at line 624-628 fires. Updated test for A009 to assert `stderr.toContain('coding-standards')` and test for A010 to parse JSON and assert `json.error.code === 'SKILL_REQUIRED'`.

## Deviations from Contract

None — contract followed exactly after fix cycle.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  97 passed (97)
     Tests  1711 passed | 2 skipped (1713)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
 Test Files  97 passed (97)
      Tests  1733 passed | 2 skipped (1735)
   Start at  21:18:08
   Duration  20.46s (transform 1.94s, setup 0ms, collect 6.54s, tests 104.38s, environment 9ms, prepare 3.74s)
```

### Comparison
- Tests added: 22
- Tests removed: 0
- Regressions: none

### New Tests Written
- `packages/cli/tests/commands/proof.test.ts`: 22 tests in "Promote Subcommand Tests" section covering: success (chain mutation, dashboard regen, commit message), summary-as-rule, custom --text, --skill required, skill not found, --section gotchas, already promoted, already closed, --force override, JSON envelope, duplicate warning (human + JSON), placeholder replacement, wrong branch, empty text, missing section, lesson promotion, finding not found.

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
9196c46 [proof-promote] Fix: requiredOption → option for --skill, satisfy A009/A010
88628e6 [proof-promote] Verify report
9cd6d8d [proof-promote] Build report
6cb1e74 [proof-promote] Add promote subcommand with skill file mutation and tests
```

## Open Issues

- The `--text` option with spaces requires shell quoting. The test works around this by wrapping in literal double quotes in the args array since `runProof` joins args with spaces for `execSync`. Real CLI usage (`ana proof promote F001 --skill coding-standards --text "my rule"`) works correctly since the shell handles quoting.
- `rule_text` in JSON output includes the markdown bullet prefix (`- {text}`). The spec mockup shows this format so it matches intent, but downstream consumers will need to strip the `- ` prefix to get raw text. Design choice, not a bug.

Verified complete by second pass.
