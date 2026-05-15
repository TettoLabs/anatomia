# Spec: Pipeline Concurrency Guards

**Created by:** AnaPlan
**Date:** 2026-05-15
**Scope:** .ana/plans/active/pipeline-concurrency-guards/scope.md

## Approach

Three mechanical guards that prevent concurrent pipeline sessions from corrupting each other. The root cause: the pipeline assumes one agent per stage per slug but enforces nothing. A second AnaVerify session archived a valid report, created a duplicate PR, and left recovery requiring git internals knowledge.

**Guard 1 — Concurrency guard in `startWork`:** A `checkConcurrencyGuard` helper reads a specific timestamp key from `.saves.json`, checks recency (< 1 hour), and returns a result. The guard is **per-slug AND per-phase** — it checks only the timestamp for the phase being entered. When entering Plan, check `plan_started_at`. When entering Verify (from artifact branch), check `verify_started_at` on the worktree filesystem. When entering Verify (from inside worktree), check `verify_started_at` on the local filesystem. A `--force` flag overrides all guards.

The helper accepts a filesystem path and a timestamp key. It does NOT scan all timestamps — it checks exactly the one relevant to the phase being entered. This means:
- Same slug, same phase → blocked (the incident we're preventing)
- Same slug, different phase → allowed (Build starting doesn't care about `plan_started_at`)
- Different slug → allowed (each slug has its own `.saves.json`)

**Guard 2 — PR duplicate detection in `createPr`:** Before creating a PR, run `gh pr list --head {branch} --state all --json state,url`. If any PR is MERGED, block with a message directing to `work complete`. If any PR is OPEN, block with its URL.

**Guard 3 — Merge detection resilience in `completeWork`:** Reorder the existing merge check. New order: `gh pr list --head {branch} --state merged` first (reliable for squash/rebase/force-push), `is-ancestor` second (offline fallback), remote-deleted-after-prune third (unchanged).

**`verify_started_at` force-write:** Both write sites change to `force: true` so FAIL-to-re-verify cycles and multi-phase transitions get fresh timestamps.

**New stage values:** `determineStage` returns `verify-in-progress` and `plan-in-progress` for display in `ana work status`. These are passive — informational only. The active blocking happens in `startWork`.

## Output Mockups

### Guard 1 — Concurrency block
```
Error: A verify session is already in progress for `my-feature`.
  Started: 12 minutes ago
  Use `ana work start my-feature --force` to override.
```

```
Error: A plan session is already in progress for `my-feature`.
  Started: 5 minutes ago
  Use `ana work start my-feature --force` to override.
```

### Guard 1 — Force override
```
⚠ Overriding active verify session for `my-feature` (started 12 minutes ago).
Resuming `my-feature` — Verify phase...
```

### Guard 2 — PR already merged
```
Error: A PR for `feature/my-feature` was already merged.
  Run `ana work complete my-feature` to archive this work item.
```

### Guard 2 — PR already open
```
Error: A PR for `feature/my-feature` is already open.
  https://github.com/org/repo/pull/140
```

### `ana work status` — in-progress stages
```
Pipeline Status (artifact branch: main)

  my-feature (1 phase):
    scope.md         ✓ main
    plan.md          ✓ main
    spec.md          ✓ main
    Stage: verify-in-progress
    → Verify session in progress. Use `ana work start my-feature --force` to override.
```

## File Changes

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Add `checkConcurrencyGuard` helper, integrate it at three call sites in `startWork`, add `--force` option to `startCommand`, add `verify-in-progress` and `plan-in-progress` to `determineStage` and `getNextAction`, reorder merge detection in `completeWork`, change `verify_started_at` writes to `force: true`.
**Pattern to follow:** `worktreeExists()` at line 384 for filesystem reads in `determineStage`. `completeCommand` option pattern at line 2304-2311 for `--force` flag threading. `build_started_at` force-write at line 1797 for the `force: true` precedent.
**Why:** Without these guards, concurrent sessions corrupt pipeline state — the exact incident from Learn Session 5.

### `packages/cli/src/commands/pr.ts` (modify)
**What changes:** Add `gh pr list --head {branch} --state all` check after the gh availability check (line 199), before reading any artifacts.
**Pattern to follow:** The existing gh check pattern at line 193-199 for error handling style.
**Why:** Without this guard, a second session creates a duplicate PR after the first was already merged.

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** Add test describe block for concurrency guards covering: same-slug-same-phase blocked, same-slug-different-phase allowed, different-slug allowed, force override, stale timeout expiry, missing/corrupted `.saves.json`, and the new `determineStage` stages.
**Pattern to follow:** Existing `createWorkTestProject` helper and temp directory pattern.
**Why:** Guards must be mechanically verified — "verified over trusted."

### `packages/cli/tests/commands/pr.test.ts` (modify)
**What changes:** Add test describe block for PR duplicate detection covering: merged PR blocks, open PR blocks with URL, no existing PR passes through.
**Pattern to follow:** Existing `createTestProject` and `createPipelineArtifacts` helpers.
**Why:** Guard 2 is the critical defense against the exact incident — it must have tests.

## Acceptance Criteria
- [ ] AC1: `ana work start {slug}` blocks with an error when `verify_started_at` exists in the worktree's `.saves.json` and is less than 1 hour old
- [ ] AC2: `ana work start {slug}` blocks with an error when `plan_started_at` exists in the artifact branch's `.saves.json` and is less than 1 hour old
- [ ] AC3: `ana work start {slug} --force` overrides both AC1 and AC2 guards
- [ ] AC4: `ana work status` displays `verify-in-progress` when verify guard conditions are met (worktree exists, `verify_started_at` recent, no verify report)
- [ ] AC5: `ana work status` displays `plan-in-progress` when plan guard conditions are met (`plan_started_at` recent, no spec/contract)
- [ ] AC6: `ana pr create` refuses to create a PR when a MERGED PR already exists for the branch, with a message directing to `work complete`
- [ ] AC7: `ana pr create` refuses to create a PR when an OPEN PR already exists for the branch, displaying the existing PR URL
- [ ] AC8: `ana work complete` detects a merged PR via `gh pr list --state merged` even when `is-ancestor` fails (squash merge, rebase, force-push scenarios)
- [ ] AC9: `ana work complete` falls back to `is-ancestor` when `gh` is unavailable
- [ ] AC10: `verify_started_at` is written with `force: true` so FAIL-to-re-verify cycles and multi-phase transitions get fresh timestamps
- [ ] AC11: The 1-hour timeout auto-expires stale timestamps from crashed sessions without requiring `--force`
- [ ] AC12: `getNextAction` returns appropriate guidance for `verify-in-progress` and `plan-in-progress` stages
- [ ] AC13: Same slug, same phase → blocked (concurrency guard fires)
- [ ] AC14: Same slug, different phase → allowed (guard only checks the entering phase's timestamp)
- [ ] AC15: Different slug → allowed (each slug has its own `.saves.json`)
- [ ] No build errors
- [ ] Tests pass with `(cd packages/cli && pnpm vitest run)`

## Testing Strategy

- **Unit tests for `checkConcurrencyGuard`:** Test the helper directly by writing `.saves.json` files with various timestamps and calling the function. Cover: recent timestamp blocks, expired timestamp passes, missing file passes, corrupted JSON passes, force overrides.
- **Phase isolation tests:** Three explicit test cases proving per-slug-per-phase behavior:
  1. Write `verify_started_at` 5 min ago → start verify on same slug → blocked
  2. Write `verify_started_at` 5 min ago → start build on same slug → allowed (build checks `build_started_at`, not `verify_started_at`)
  3. Write `verify_started_at` 5 min ago on slug-A → start verify on slug-B → allowed
- **`determineStage` tests:** Add cases for `verify-in-progress` and `plan-in-progress` stages. Write `.saves.json` with recent timestamps to the worktree filesystem and verify the stage string.
- **`getNextAction` tests:** Verify the guidance strings for new stages.
- **PR duplicate tests:** Mock `spawnSync` for `gh pr list` responses. Test: merged PR blocks, open PR blocks with URL, empty response allows creation.
- **Merge detection reorder tests:** Mock `gh pr list --state merged` and `git merge-base --is-ancestor` responses. Test: gh-found-merged succeeds, gh-fails-but-ancestor-succeeds (fallback), both fail blocks.
- **Edge cases:** `.saves.json` missing entirely, `.saves.json` with empty object, timestamp exactly at the 1-hour boundary, `--force` with recent timestamp.

## Dependencies

No new dependencies. Uses existing `spawnSync`, `fs`, `path`, and the project's `worktreeExists`/`getWorktreePath` utilities.

## Constraints

- `readFileOnBranch` (git show) CANNOT see uncommitted worktree content. The verify guard MUST use direct filesystem reads via `getWorktreePath`.
- `plan_started_at` IS committed, so either approach works. Use filesystem reads for consistency with the verify guard.
- `writeTimestamp`'s write-once guard silently returns without writing. The concurrency guard must read BEFORE calling `writeTimestamp`, not rely on `writeTimestamp`'s behavior.
- The `--force` flag must be threaded through `startWork`'s function signature, not read from a global. Follow the `completeWork` options pattern.

## Gotchas

- **`getNextAction` return type may change.** The `fix-work-saves-compat` scope (ready-to-merge) changes `getNextAction`'s return type from `string` to `string | string[]`. If that scope merges first, follow its pattern. If not, use single-line strings for the new stages — they're single-line anyway, so no conflict either way.
- **`determineStage` for `plan-in-progress` placement.** The plan-in-progress check must come BEFORE the existing `ready-for-plan` return at line 372. Currently, `scope && !plan` returns `ready-for-plan`. The new check: `scope && !plan && plan_started_at is recent` → `plan-in-progress`. The order matters — check in-progress first, then fall through to ready-for-plan.
- **`determineStage` for `verify-in-progress` placement.** In the single-spec path: after `hasBuildReport && !hasVerifyReport` (line 397), before returning `ready-for-verify`, check if `verify_started_at` is recent in the worktree's `.saves.json`. Same pattern for multi-phase.
- **Guard fires on `startWork` entry, before `writeTimestamp`.** The guard reads the existing timestamp, checks recency, and blocks. Only after passing the guard does `writeTimestamp` write (or overwrite) the timestamp. This ordering is critical.
- **`completeWork` merge detection — `gh pr list` vs `gh pr view`.** Current code uses `gh pr view {branch}` which finds PRs by branch but can match the wrong one. The fix uses `gh pr list --head {branch} --state merged` which is explicit about state and direction. The `--head` flag matches the PR's head branch, not the base.
- **PR duplicate guard `--state all` returns both open and merged.** Parse the JSON response and check state per PR. Don't use `--state open` and `--state merged` as separate calls — one call with `--state all` and JSON parsing is simpler and faster.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer early returns over nested conditionals.
- Explicit return types on all exported functions. Internal helpers can use inference.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Always pass `--run` with `pnpm vitest` to avoid watch mode hang.
- Tests that create git repositories must force branch name with `git branch -M main`.
- Test behavior, not implementation. Assert on what the code returns or produces.

### Pattern Extracts

**`worktreeExists` filesystem check in `determineStage` (work.ts:382-388):**
```typescript
    if (!workBranch) {
      // Check if a worktree exists — build may be in progress even without a detected branch
      if (projectRoot && worktreeExists(projectRoot, slug)) {
        return 'build-in-progress';
      }
      return 'ready-for-build';
    }
```

**`completeCommand` option threading (work.ts:2304-2311):**
```typescript
  const completeCommand = new Command('complete')
    .description('Archive completed work after PR merge, optionally merging the PR first')
    .argument('<slug>', 'Work item slug to complete')
    .option('--json', 'Output JSON format for programmatic consumption')
    .option('--merge', 'Merge the PR via GitHub CLI before completing')
    .action(async (slug: string, cmdOptions: { json?: boolean; merge?: boolean }) => {
      await completeWork(slug, cmdOptions);
    });
```

**`writeTimestamp` with `force: true` (work.ts:1816-1817):**
```typescript
          if (isFail) {
            await writeTimestamp(localActivePath, 'build_started_at', 'ana-build', true);
          }
```

**Merge detection block being reordered (work.ts:1449-1470):**
```typescript
    if (hasRemote) {
      // Remote still exists — verify with is-ancestor (regular merge)
      let merged = false;
      const ancestorResult = runGit(['merge-base', '--is-ancestor', workBranchName, 'HEAD'], { cwd: projectRoot });
      if (ancestorResult.exitCode === 0) {
        merged = true;
      } else {
        // is-ancestor failed — might be squash merge. Check via gh CLI.
        const ghResult = spawnSync('gh', ['pr', 'view', workBranchName, '--json', 'state', '-q', '.state'], {
          encoding: 'utf-8', stdio: 'pipe',
        });
        if (ghResult.status === 0 && ghResult.stdout) {
          merged = ghResult.stdout.trim() === 'MERGED';
        }
      }
      if (!merged) {
        console.error(chalk.red(`Error: \`${workBranchName}\` has not been merged into \`${artifactBranch}\`.`));
        console.error(chalk.gray('Merge the PR first, then run this command again.'));
        process.exit(1);
      }
    }
```

**gh availability check in pr.ts (pr.ts:193-199):**
```typescript
  // 3. Check gh CLI availability
  const ghCheck = spawnSync('gh', ['--version'], { stdio: 'pipe' });
  if (ghCheck.status !== 0) {
    console.error(chalk.red('Error: GitHub CLI (gh) not found.'));
    console.error(chalk.gray('Install from https://cli.github.com/'));
    process.exit(1);
  }
```

### Proof Context

Top findings for affected files:

- **(fix-merge-json-pollution-C3)** Pull-recovery guards (2 of 5) not directly exercised by any test — not relevant to this build but be aware recovery paths exist.
- **(upstream-finding-resolution-C1)** work.ts duplicates resolves counting logic — unrelated, don't touch.
- **commitSaves silently swallows commit failures** — existing behavior, don't change. The concurrency guard doesn't depend on commit success since it reads filesystem, not git.

No active findings overlap with this build's contract assertions.

### Checkpoint Commands

- After `checkConcurrencyGuard` helper added: `(cd packages/cli && pnpm vitest run tests/commands/work.test.ts --run)` — Expected: existing tests still pass
- After all `work.ts` changes: `(cd packages/cli && pnpm vitest run tests/commands/work.test.ts --run)` — Expected: existing + new tests pass
- After `pr.ts` changes: `(cd packages/cli && pnpm vitest run tests/commands/pr.test.ts --run)` — Expected: existing + new tests pass
- Full suite: `(cd packages/cli && pnpm vitest run)` — Expected: all tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 2320 passed, 2 skipped (2322 total)
- Current test files: 104 passed (104)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expect ~2345-2355 tests in 104 files (new tests added to existing files)
- Regression focus: `tests/commands/work.test.ts` (determineStage tests, startWork tests), `tests/commands/pr.test.ts` (happy path, guard ordering)
