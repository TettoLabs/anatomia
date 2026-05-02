# Spec: Timing Fix

**Created by:** AnaPlan
**Date:** 2026-05-01
**Scope:** .ana/plans/active/proof-health-v2/scope.md

## Approach

Three coupled changes that fix timing accuracy:

1. **New command `ana work start {slug}`** — replaces manual `mkdir -p` in Think's template. Validates branch, slug format, slug uniqueness, pulls latest, creates directory, writes `work_started_at` to `.saves.json`.
2. **Fix `computeTiming`** — use `work_started_at` for Think time when available. Fall back to current behavior for old entries.
3. **Update Think templates** — both shipped template and dogfood copy replace Step 1 with `ana work start {slug}`.

The structural analog for the command is `completeWork` registration at work.ts:1329-1335 — same Commander subcommand pattern with argument and action. The branch validation reuses `readArtifactBranch` and `getCurrentBranch` from `utils/git-operations.ts`. The `git pull --rebase` pattern is copied from artifact.ts:971-986.

## Output Mockups

### Successful start
```
$ ana work start fix-auth-timeout
Started work item `fix-auth-timeout`. Write your scope, then run `ana artifact save scope fix-auth-timeout`.
```

### Wrong branch
```
$ ana work start fix-auth-timeout
Error: You're on `feature/other-thing`. Work items must be started on `main`.
Run: git checkout main && git pull
```

### Invalid slug format
```
$ ana work start Fix-Auth
Error: Invalid slug format. Use kebab-case: fix-auth-timeout, add-export-csv
```

### Slug already exists (active)
```
$ ana work start fix-auth-timeout
Error: Slug 'fix-auth-timeout' already exists in active plans. Choose a different name.
```

### Slug already exists (completed)
```
$ ana work start fix-auth-timeout
Error: Slug 'fix-auth-timeout' already exists in completed plans. Choose a different name.
```

### Timing display change (Phase 1's Pipeline section)
Old: `think 12m · plan 12m · build 22m · verify 8m`
New: `scope 20m · build 22m · verify 8m`

The `scope` value is `think + plan` combined. JSON keeps separate `think` and `plan` fields.

## File Changes

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Add `startWork` function and register `start` as a third subcommand alongside `status` and `complete`. The function validates branch (artifact branch required), slug format (kebab-case regex), slug uniqueness (check both `active/` and `completed/`), pulls latest via `git pull --rebase`, creates the directory, writes `work_started_at` to `.saves.json`, and confirms.
**Pattern to follow:** `completeWork` function and its Commander registration at lines 1329-1335. Branch validation from artifact.ts `validateBranch` (lines 764-786). Git pull from artifact.ts lines 971-986.
**Why:** Think agents currently do manual `mkdir -p`. Moving this to the CLI enables timing capture and input validation that agents can't reliably provide.

### `packages/cli/src/utils/proofSummary.ts` (modify)
**What changes:** Fix `computeTiming` to use `work_started_at` from `.saves.json` for Think time. When `work_started_at` exists: `think = scopeTime - workStartedTime`, `plan = contractTime - scopeTime`. When absent: fall back to current behavior (`think = plan = contractTime - scopeTime`). Also update `total_minutes` to include the think phase: `verifyTime - workStartedTime` when available, else `verifyTime - scopeTime`.
**Pattern to follow:** Existing `getTime` helper inside `computeTiming` (line 1304-1307). `work_started_at` is a top-level ISO string, not a `{ saved_at, hash }` object, so it needs its own accessor: read `saves['work_started_at']` directly as a string.
**Why:** Current code uses `contractTime - scopeTime` for both think and plan, producing identical values. The fix requires a start-of-work timestamp that `ana work start` now provides.

### `packages/cli/templates/.claude/agents/ana.md` (modify)
**What changes:** Replace Step 1 content (lines 168-173) from manual mkdir to `ana work start {slug}`.
**Pattern to follow:** The replacement text is specified in the scope.
**Why:** Shipped Think template must tell agents to use the new command.

### `.claude/agents/ana.md` (modify)
**What changes:** Same Step 1 replacement as the shipped template.
**Pattern to follow:** Must match the shipped template exactly.
**Why:** Dogfood copy must stay in sync with shipped template.

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** Add tests for `ana work start` — happy path, wrong branch, invalid slug, duplicate slug (active and completed), `.saves.json` content verification.
**Pattern to follow:** Existing test patterns in the same file — `createMergedProject` helper for setup, direct function calls to `startWork`.
**Why:** New command needs coverage for all validation paths.

### `packages/cli/tests/utils/proofSummary.test.ts` (modify)
**What changes:** Add tests for `computeTiming` with `work_started_at` present (different think/plan values) and absent (fallback to identical values).
**Pattern to follow:** Existing test patterns in the file.
**Why:** Timing fix is the core bug — needs explicit assertion that think !== plan when `work_started_at` exists.

## Acceptance Criteria

- [ ] AC9: `ana work start {slug}` creates the plan directory
- [ ] AC10: `ana work start` rejects non-kebab-case slugs
- [ ] AC11: `ana work start` rejects slugs that exist in active or completed plans
- [ ] AC12: `ana work start` validates artifact branch
- [ ] AC13: `ana work start` writes `work_started_at` to `.saves.json`
- [ ] AC14: `computeTiming` uses `work_started_at` for Think when available
- [ ] AC15: Think and Plan show different timing values for new entries
- [ ] AC16: Old entries without `work_started_at` fall back to current behavior
- [ ] AC17: Think template Step 1 uses `ana work start` instead of `mkdir`
- [ ] AC18: Dogfood Think template matches shipped template
- [ ] Tests pass with `(cd packages/cli && pnpm vitest run)`
- [ ] No build errors with `pnpm run build`

## Testing Strategy

- **Unit tests for `startWork`:**
  - Happy path: creates directory, writes `.saves.json` with `work_started_at`
  - Rejects uppercase slug (`Fix-Auth`)
  - Rejects double-hyphen (`fix--auth`)
  - Rejects leading hyphen (`-fix-auth`)
  - Rejects trailing hyphen (`fix-auth-`)
  - Allows single-letter slug (`a`), numeric segments (`fix-v2`), long slug (`add-a-thing`)
  - Errors on active slug collision
  - Errors on completed slug collision
  - Errors on wrong branch (mock `getCurrentBranch` to return non-artifact branch)
- **Unit tests for `computeTiming`:**
  - With `work_started_at`: think !== plan, think = scopeTime - workStartedTime
  - Without `work_started_at`: think === plan (backward compat)
  - With `work_started_at`: total_minutes includes think phase
- **Template verification:** Assert shipped and dogfood templates contain `ana work start` and do not contain `mkdir -p .ana/plans/active`

## Dependencies

Phase 1 must be complete (HealthReport type changes).

## Constraints

- `work_started_at` is a top-level ISO string in `.saves.json`, NOT inside a `{ saved_at, hash }` artifact entry. The key is set once by `ana work start` and never updated by `writeSaveMetadata`.
- Kebab-case regex: `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` — starts with lowercase letter, segments separated by single hyphens, alphanumeric only. Allows: `fix-v2`, `a`, `add-export-csv`. Rejects: `Fix-Auth` (uppercase), `fix--double` (double hyphen), `-leading-dash`, `trailing-dash-`.
- `git pull --rebase` must handle: no remotes (skip pull), conflicts (error with clear message), no upstream configured (skip pull). Copy the error handling from artifact.ts lines 971-986.

## Gotchas

- `work_started_at` goes in `.saves.json` as a top-level key, NOT inside a `{ saved_at, hash }` object. The `writeSaveMetadata` function is hash-gated and writes `{ saved_at, hash }` per artifact type. `work_started_at` is NOT an artifact — it's written directly with `JSON.parse → add key → JSON.stringify → writeFile`.
- `computeTiming`'s `getTime` helper (line 1304-1307) reads `saves[key].saved_at` — it expects a `{ saved_at, hash }` object. `work_started_at` is a plain ISO string, so you need a different accessor. Read `saves['work_started_at']` directly as a string and parse with `new Date().getTime()`.
- The Think template has TWO copies: `packages/cli/templates/.claude/agents/ana.md` (shipped to users on `ana init`) and `.claude/agents/ana.md` (dogfood, used by this repo). Both must be updated with identical Step 1 text.
- `startWork` must import `readArtifactBranch`, `getCurrentBranch` from `../utils/git-operations.js`. These are already imported by work.ts — check the existing import line and add if missing.
- The `git pull --rebase` in `startWork` should only run when on the artifact branch (which it always is, since we validated). But the remote check must happen first — repos with no remotes (e.g., tests) should skip pull silently.

## Build Brief

### Rules That Apply
- ESM imports with `.js` extension for all relative imports
- `import type` for type-only imports, separate from value imports
- Explicit return types on exported functions with `@param` and `@returns` JSDoc
- `process.exit(1)` for user-facing errors in commands, with `chalk.red` for error and `chalk.gray` for guidance
- Always use `--run` with vitest to avoid watch mode
- Use `| null` for checked-and-empty, `?:` for unchecked

### Pattern Extracts

Commander subcommand registration (work.ts:1329-1335):
```typescript
  const completeCommand = new Command('complete')
    .description('Archive completed work after PR merge')
    .argument('<slug>', 'Work item slug to complete')
    .option('--json', 'Output JSON format for programmatic consumption')
    .action(async (slug: string, cmdOptions: { json?: boolean }) => {
      await completeWork(slug, cmdOptions);
    });
```

Branch validation from artifact.ts (lines 764-777):
```typescript
function validateBranch(
  typeInfo: ArtifactTypeInfo,
  currentBranch: string,
  artifactBranch: string,
  slug: string,
  branchPrefix: string
): void {
  if (typeInfo.category === 'planning') {
    if (currentBranch !== artifactBranch) {
      console.error(chalk.red(`Error: You're on \`${currentBranch}\`. ${typeInfo.displayName} must be saved to \`${artifactBranch}\`.`));
      console.error(chalk.gray(`Run: git checkout ${artifactBranch} && git pull`));
      process.exit(1);
    }
  }
```

Git pull pattern from artifact.ts (lines 971-986):
```typescript
    try {
      const remotes = execSync('git remote', { stdio: 'pipe', encoding: 'utf-8', cwd: projectRoot }).trim();
      if (remotes) {
        execSync('git pull --rebase', { stdio: 'pipe', encoding: 'utf-8', cwd: projectRoot });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('conflict') || errorMessage.includes('Cannot rebase')) {
        console.error(chalk.red('Error: Pull failed due to conflicts. Resolve conflicts and try again.'));
        process.exit(1);
      }
    }
```

computeTiming current implementation (proofSummary.ts:1303-1330):
```typescript
function computeTiming(saves: SavesData): ProofSummary['timing'] {
  const getTime = (key: string): number | null => {
    const entry = saves[key] as SaveEntry | undefined;
    return entry?.saved_at ? new Date(entry.saved_at).getTime() : null;
  };

  const scopeTime = getTime('scope');
  const contractTime = getTime('contract');
  const buildTime = getTime('build-report');
  const verifyTime = getTime('verify-report');

  const totalMs = (verifyTime && scopeTime) ? verifyTime - scopeTime : 0;

  const timing: ProofSummary['timing'] = {
    total_minutes: Math.round(totalMs / 60000),
  };
  if (contractTime && scopeTime) {
    timing.think = Math.round((contractTime - scopeTime) / 60000);
    timing.plan = Math.round((contractTime - scopeTime) / 60000);
  }
```

### Proof Context

No active proof findings for affected files (work.ts, proofSummary.ts).

### Checkpoint Commands

- After `startWork` implementation: `(cd packages/cli && pnpm vitest run tests/commands/work.test.ts --run)` — Expected: new start tests pass
- After `computeTiming` fix: `(cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts --run)` — Expected: timing tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: all tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1762 passed, 2 skipped (93 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1775+ tests (new start command tests + timing fix tests + template assertion tests)
- Regression focus: `tests/commands/work.test.ts`, `tests/utils/proofSummary.test.ts`
