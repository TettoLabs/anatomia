# Spec: Fix --merge stdout pollution in --json mode

**Created by:** AnaPlan
**Date:** 2026-05-14
**Scope:** .ana/plans/active/fix-merge-json-pollution/scope.md

## Approach

Wrap 5 unguarded `console.log` calls in `completeWork`'s merge and pull-recovery paths with `if (!options?.json)` guards. This matches the existing pattern at work.ts line 1353 — same function, same options object, same guard shape.

The 5 unguarded calls are:
1. "PR already merged. Continuing with completion..." (already-merged path)
2. "Merging PR..." (pre-merge progress)
3. "PR merged." (post-merge confirmation)
4. Removed build/verify artifact warning (pull-recovery)
5. Removed planning artifact warning (pull-recovery)

All error paths (`console.error` + `process.exit(1)`) are correctly implemented — they write diagnostics to stderr and JSON errors to stdout. No changes needed there.

Add two test cases to `work-merge.test.ts`: one for the "already merged" path with `{ json: true, merge: true }`, one for the "merge succeeded" path. Both assert stdout is valid JSON with no preceding text.

## Output Mockups

**Before fix — broken (`ana work complete --merge --json test-slug`):**
```
PR already merged. Continuing with completion...
  ⚠ Removed 2 untracked build/verify artifact(s) from the artifact branch (always agent-written).
{
  "command": "work complete",
  "results": { ... },
  "meta": { ... }
}
```

**After fix — clean JSON:**
```
{
  "command": "work complete",
  "results": { ... },
  "meta": { ... }
}
```

**Without --json — unchanged:**
```
PR already merged. Continuing with completion...
  ⚠ Removed 2 untracked build/verify artifact(s) from the artifact branch (always agent-written).
✓ PASS — Feature name
  5/5 satisfied · 0 deviations
  Chain: 3 runs · 2 findings
```

## File Changes

### packages/cli/src/commands/work.ts (modify)
**What changes:** Wrap 5 `console.log` calls with `if (!options?.json)` guards. Three are in the merge block (lines ~1151, ~1164, ~1231), two are in the pull-recovery block (lines ~1287, ~1307).
**Pattern to follow:** The existing guard at line 1353: `if (!options?.json) { console.log(chalk.yellow('Recovering incomplete completion — retrying commit...')); }`
**Why:** Without these guards, `--merge --json` output is unparseable — `JSON.parse()` fails on the mixed stdout.

### packages/cli/tests/commands/work-merge.test.ts (modify)
**What changes:** Add two test cases exercising `{ json: true, merge: true }` — one for the "already merged" path (mock `state: 'MERGED'`), one for the "merge succeeded" path (mock `state: 'OPEN'` + successful merge). Both capture `logs` and assert the joined output parses as JSON with the expected envelope shape.
**Pattern to follow:** The existing JSON assertion pattern at `work.test.ts:2777-2788` — capture logs, join, `JSON.parse`, assert `command`, `results`, and `meta` fields.
**Why:** No existing test covers the `{ json: true, merge: true }` combination. This is the gap that let the bug ship.

## Acceptance Criteria

- [ ] AC1: `ana work complete --merge --json <slug>` produces exactly one JSON object on stdout with no preceding text, for both the "already merged" and "merge succeeded" paths.
- [ ] AC2: Pull-recovery warning messages (untracked artifact removal) do not appear on stdout when `--json` is set.
- [ ] AC3: Human-readable output (without `--json`) is unchanged — all progress messages still appear.
- [ ] AC4: A test in `work-merge.test.ts` exercises `--merge --json` and validates stdout parses as JSON.
- [ ] Tests pass with `pnpm vitest run`
- [ ] No build errors

## Testing Strategy

- **Unit tests:** Two new test cases in `work-merge.test.ts`:
  1. "already merged" + `{ json: true, merge: true }` — mock `prData.state` as `'MERGED'`, assert `logs.join('\n')` parses as JSON with `command: 'work complete'`
  2. "merge succeeded" + `{ json: true, merge: true }` — mock `state: 'OPEN'` + successful merge response, same JSON assertion
- **Existing tests:** All 11 existing tests in `work-merge.test.ts` must continue passing (they don't use `json: true`, so the guards don't affect them)
- **Edge cases:** The pull-recovery guards (lines ~1287, ~1307) are not directly testable without simulating an untracked-file pull conflict, which requires complex filesystem state. The guard pattern is identical to the other 3 and is verified by code review.

## Dependencies

None. The fix modifies existing code with an existing pattern.

## Constraints

- `console.error` calls in error paths must NOT be suppressed — they write to stderr, which doesn't pollute JSON stdout.
- The recovery path guard at line 1353 is already correct. Don't touch it.

## Gotchas

- The `options` parameter is typed `{ json?: boolean; merge?: boolean }` — always use `options?.json` (optional chaining) since the entire options object may be undefined.
- The test file captures `console.log` via array push in `beforeEach`. The new tests use the same `logs` array — no additional capture setup needed.
- When testing the "merge succeeded" path with `json: true`, the completion flow continues past the merge block into archival, proof chain, and JSON output. The mock must handle `gh --version` and `gh pr view` and `gh pr merge` calls.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `if (!options?.json)` — optional chaining on `options` since it may be undefined.
- Early returns over nested conditionals — but here the pattern is a simple guard wrap, not a refactor.
- Tests use `vi.mock` at module level for `node:child_process`. New tests go in the existing `describe` block.

### Pattern Extracts

Guard pattern (work.ts:1352-1355):
```typescript
          if (!options?.json) {
            console.log(chalk.yellow('Recovering incomplete completion — retrying commit...'));
          }
```

JSON assertion pattern (work.test.ts:2777-2788):
```typescript
        await completeWork('recovery-json', { json: true });

        console.log = originalLog;
        const output = logs.join('\n');

        // Should be clean JSON — no human-readable text before the envelope
        const json = JSON.parse(output);
        expect(json.command).toBe('work complete');
        expect(json.results.new_findings).toBe(0);
        expect(json.meta).toBeTypeOf('object');
```

Test mock pattern for "already merged" (work-merge.test.ts:254-260):
```typescript
    mockGh((args) => {
      if (args[0] === '--version') return { status: 0, stdout: 'gh version 2.0.0', stderr: '' };
      if (args[0] === 'pr' && args[1] === 'view' && args.includes('state,baseRefName')) {
        return { status: 0, stdout: JSON.stringify({ state: 'MERGED', baseRefName: 'main' }), stderr: '' };
      }
      return { status: 1, stdout: '', stderr: '' };
    });
```

### Proof Context

Relevant active findings for affected files:
- **[code] "Auto-merge enabled path writes plain text to stdout before JSON output — pollutes stdout for --json consumers"** — This IS the bug being fixed. Close after build.
- **[code] "Recovery path leaks non-JSON 'Recovering...' text to stdout before JSON envelope when --json is passed"** — Already guarded at line 1353. No action needed.
- **[test] "No tests verify --json output for any of the 7 merge failure paths"** — This spec adds coverage for the 2 success paths. Failure path JSON coverage is a separate scope (error paths write JSON to stdout correctly but stderr diagnostics are not suppressed — by design).

### Checkpoint Commands

- After guarding the 5 console.log calls: `(cd packages/cli && pnpm vitest run tests/commands/work-merge.test.ts --run)` — Expected: 11 tests pass (existing tests unaffected)
- After adding new tests: `(cd packages/cli && pnpm vitest run tests/commands/work-merge.test.ts --run)` — Expected: 13 tests pass
- Full suite: `(cd packages/cli && pnpm vitest run)` — Expected: all pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 2254 passed, 2 skipped (2256 total)
- Current test files: 101 passed
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected 2256 passed + 2 new = 2258 total in 101 test files
- Regression focus: `work-merge.test.ts` (direct changes), `work.test.ts` (shares `completeWork` — verify existing JSON tests still pass)
