# Spec: Harden Hot Files

**Created by:** AnaPlan
**Date:** 2026-04-30
**Scope:** .ana/plans/active/harden-hot-files/scope.md

## Approach

Five independent fixes across three source files plus one test update. Each fix addresses a proof-system finding on the three most-modified CLI files. No shared state between fixes — each is a surgical edit to an isolated code path.

**Key pattern:** All fixes follow existing conventions already present in these files. No new patterns are introduced.

**Line number warning:** The `clean-dead-migrations` scope may ship first and delete ~30 lines from work.ts. All work.ts locations must be found by code pattern, not line number.

## Output Mockups

**Fix 1 — Recovery with `--json` (before):**
```
Recovering incomplete completion — retrying commit...
{
  "command": "work complete",
  "results": { ... }
}
```

**Fix 1 — Recovery with `--json` (after):**
```
{
  "command": "work complete",
  "results": { ... }
}
```

**Fix 1 — Recovery without `--json` (unchanged):**
```
Recovering incomplete completion — retrying commit...
✓ PASS — Feature Name
  5/5 satisfied · 0 deviations
```

**Fix 2 — Audit finding display (before):**
```
    [quality] [risk · scope] Missing validation for user input
           age: 3d | anchor: ✓ | from: add-validation
           from: add-validation
```

**Fix 2 — Audit finding display (after):**
```
    [quality] [risk · scope] Missing validation for user input
           age: 3d | anchor: ✓ | from: add-validation
```

**Fix 4a — captureModulesTouched unexpected failure (new warning):**
```
⚠ Warning: Could not capture modules_touched — saving without it.
```

**Fix 4b — work.ts recovery unexpected git failure (new warning):**
```
⚠ Warning: Could not check recovery status: <error message>
```

## File Changes

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Two edits. (1) Wrap the `console.log('Recovering incomplete completion...')` line in the existing `if (!options?.json)` guard pattern. (2) Replace the empty catch at the end of the recovery `try` block — add a warning for unexpected git status failures, staying silent for `'not a git repository'`.
**Pattern to follow:** The `if (!options?.json)` guard is already used later in the same function for the terminal output section. The `chalk.yellow('Warning: ...')` pattern is used at the push failure catch in the same recovery block.
**Why:** (1) JSON consumers parsing stdout get garbage text before the envelope, breaking CI integrations. (2) Silent catch hides data corruption and misleading failures in a path that's already hard to debug.

### `packages/cli/src/commands/proof.ts` (modify)
**What changes:** Two edits. (1) Delete the duplicate `from:` line in the audit display loop. (2) Extract `SEVERITY_ORDER` to a single module-level constant, replacing all three local declarations.
**Pattern to follow:** Module-level constants are placed after imports and existing constants (like `BOX` at line ~36), before the first function definition. Use `SEVERITY_ORDER` as the name (not `SEVERITY_WEIGHT`), typed as `Record<string, number>`.
**Why:** (1) Every audit finding shows provenance twice — visual noise that undermines trust in the display. (2) Three identical maps drift independently; one constant is the "elegant solution removes" principle.

### `packages/cli/src/commands/artifact.ts` (modify)
**What changes:** Restructure `captureModulesTouched` with two try blocks. Inner try wraps only the `execSync` merge-base call and catches silently (expected failure on first commit or no remote). Outer try wraps everything else — the diff call, `.saves.json` read/write — and logs a warning on failure.
**Pattern to follow:** The `chalk.yellow('Warning: ...')` pattern from work.ts push failure handling. Import `chalk` if not already imported.
**Why:** The current single catch swallows all errors identically. A merge-base failure on a new repo is expected. A `.saves.json` corruption or diff failure is unexpected and should surface.

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** In the recovery JSON test, replace `JSON.parse(output.substring(output.indexOf('{')))` with `JSON.parse(output)`. Remove the intermediate `jsonLine` check (the lines that find a line containing `"command"` and assert it's defined) — they're now redundant since the entire output is valid JSON.
**Pattern to follow:** Direct `JSON.parse(output)` is used throughout the test file for JSON mode tests.
**Why:** The `indexOf('{')` workaround existed to skip garbage text before the JSON envelope. After Fix 1, the output is clean. The simplified assertion is the proof that Fix 1 worked.

## Acceptance Criteria

- [ ] AC1: Recovery path with `--json` produces clean JSON output — no "Recovering..." text before the envelope
- [ ] AC2: Recovery path without `--json` still shows the "Recovering..." message
- [ ] AC3: Audit display shows each finding's `from:` exactly once
- [ ] AC4: `SEVERITY_ORDER` is a single module-level constant in proof.ts (not exported), replacing all 3 local declarations
- [ ] AC5: `captureModulesTouched` returns silently when merge-base fails (expected on new repos)
- [ ] AC6: `captureModulesTouched` logs a warning when diff, file ops, or other unexpected operations fail
- [ ] AC7: Recovery catch in work.ts logs a warning on unexpected git status failures
- [ ] AC8: Recovery catch stays silent when git status reports "not a git repository"
- [ ] AC9: Recovery JSON test asserts `JSON.parse(output)` directly, not via `indexOf('{')` workaround
- [ ] AC10: All existing tests pass
- [ ] AC11: Lint passes

## Testing Strategy

- **Unit tests:** No new test files needed. The existing recovery tests in work.test.ts cover Fix 1 (both JSON and non-JSON paths). Fix 5 (the test update) IS the test for Fix 1.
- **Edge cases:** The non-JSON recovery test (search for `'non-JSON output unchanged'` or `'Recovering'` assertion without `json: true`) must continue passing — it proves Fix 1 didn't over-suppress.
- **Manual verification:** After all changes, run `pnpm vitest run tests/commands/work.test.ts --run` and the full suite to confirm no regressions.

## Dependencies

None. All fixes target existing code paths with no external dependencies.

## Constraints

- `SEVERITY_ORDER` must NOT be exported — no consumer exists outside proof.ts.
- `captureModulesTouched` must never throw or block artifact saves. `modules_touched` is supplementary data.
- The `chalk` import must exist in artifact.ts before using `chalk.yellow`. Check for existing import; add if missing.

## Gotchas

- **Line numbers will shift.** If `clean-dead-migrations` merges first, ~30 lines are deleted from work.ts. Every fix location must be found by searching for the surrounding code pattern, not by line number.
- **`readArtifactBranch` never throws.** It calls `process.exit(1)` on failure. The inner try in Fix 4a only needs to wrap the merge-base `execSync` — not the `readArtifactBranch` call. Place `readArtifactBranch` before the inner try, inside the outer try.
- **Fix 4b catch needs the error object.** The current catch is `catch { /* */ }`. Change to `catch (err)` to inspect the error message. Cast or check with `err instanceof Error` before accessing `.message`.
- **The recovery JSON test has intermediate assertions.** Lines that check for `jsonLine` containing `"command"` must be removed — they assert on the old shape where JSON was mixed with text. Leaving them in would be dead code that passes vacuously.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Constants use `SCREAMING_SNAKE_CASE` (convention: 100% of 94 sampled constants).
- Prefer early returns over nested conditionals.
- Always pass `--run` with `pnpm vitest` to avoid watch mode hang.
- Error handling in commands: `chalk.yellow` warnings for non-fatal, `chalk.red` + `process.exit(1)` for fatal.

### Pattern Extracts

**JSON guard pattern (work.ts, recovery block):**
```typescript
// Line ~1108 — the existing guard for terminal vs JSON output
if (options?.json) {
  const jsonResults = { ... };
  console.log(JSON.stringify(wrapJsonResponse('work complete', jsonResults, recoveryChain), null, 2));
} else {
  const statusIcon = proof.result === 'PASS' ? '✓' : '✗';
  console.log(`\n${statusIcon} ${proof.result} — ${proof.feature}`);
  ...
}
```

**Warning pattern (work.ts push failure):**
```typescript
// Line ~1088
} catch {
  console.error(chalk.yellow('Warning: Push failed. Changes committed locally. Run `git push` manually.'));
}
```

**Module-level constant placement (proof.ts):**
```typescript
// After BOX constant (~line 43), before first function (~line 51)
const BOX = {
  horizontal: '\u2500',
  ...
};

// SEVERITY_ORDER goes here

function getStatusIcon(status: string): string {
```

**SEVERITY_ORDER value (from all three declarations — identical):**
```typescript
const SEVERITY_ORDER: Record<string, number> = { risk: 0, debt: 1, observation: 2 };
```

### Proof Context
No active proof findings for affected files.

### Checkpoint Commands
- After Fix 1 + test update: `(cd packages/cli && pnpm vitest run tests/commands/work.test.ts --run)` — Expected: 90 tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 1733 tests pass (no new tests added)
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1733 passed, 2 skipped (97 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: 1733 tests in 97 files (no new tests — only modifying one existing test)
- Regression focus: `tests/commands/work.test.ts` (recovery tests), `tests/commands/proof.test.ts` (if audit tests exist)
