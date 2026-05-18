# Spec: Learn Session Memory

**Created by:** AnaPlan
**Date:** 2026-05-17
**Scope:** .ana/plans/active/learn-session-memory/scope.md

## Approach

Add session memory to Learn so it can distinguish "new since last session" from "already triaged." Three coordinated changes:

1. **Init + state file.** `createDirectoryStructure` gains `learn/` with a seeded `state.json`. `preserveUserState` gains a step to preserve it on re-init. The state file is committed (not gitignored) — it's project-level, shared across machines.

2. **Audit flags + matrix enrichment.** `ana proof audit` gains `--new` and `--since` flags. Both are post-collection filters applied at the same point as `--severity` and `--entry` (~line 1844). `--new` reads `last_session_at` from state.json and internally becomes a `--since` filter. `--matrix` computes `new_since_last` inside its early-return block. Both flags are silently ignored by `--matrix` (same precedence pattern as `--severity` and `--entry`).

3. **`ana learn end` command.** New top-level `learn` command group with `end` as first subcommand. Registered under `INTELLIGENCE` group in `index.ts`. Follows the `proof close` pattern: branch enforcement, `pullBeforeRead`, write state, `commitAndPushProofChanges`, format output. Creates `.ana/learn/` if it doesn't exist (handles pre-feature projects).

4. **Template updates.** Learn template gains session-aware startup (references `--new` count) and explicit wrap-up flow (`ana learn end`).

5. **Documentation.** README command table, using-ana-learn guide, and toolbelt concept page updated to reflect new commands and flags.

**Open question resolution:** `ana learn end` lives under `ana learn` (new top-level command), not `ana proof`. Session boundary is a Learn concept — it belongs in a Learn namespace. The command registration pattern (one `registerXCommand` function per command group) supports this cleanly. Future features (`learn status`, `learn history`) have a natural home.

**`pullBeforeRead` decision:** `ana learn end` pulls before writing because state.json is project-level and committed. Another developer could have pushed a `learn end` since your last pull. Same conflict risk as proof chain modifications.

## Output Mockups

### `ana proof audit --new` (human-readable)

```
Proof Audit: 8 active findings (5 actionable, 3 monitoring) across 4 files
  2 risk · 3 debt · 3 observation
  2 risk/scope · 3 debt/scope · 3 observation/monitor

  src/commands/proof.ts (3 findings)
    [code] [risk · scope] Missing validation on audit flag combination
           age: 2d | anchor: ✓ | from: audit-matrix-orientation
    ...
```

Same output as normal audit, but filtered to findings from entries completed after `last_session_at`.

### `ana proof audit --new` with no state (null `last_session_at` or missing file)

Shows all findings — degrades to current behavior with no error.

### `ana proof audit --since 2026-05-15` (human-readable)

Same as `--new` but filtered to entries completed after the given ISO date.

### `ana proof audit --since invalid-date`

```
Error: Invalid date for --since: "invalid-date". Use ISO format (e.g., 2026-05-15).
```

### `ana proof audit --matrix` (with `last_session_at` set, human-readable)

```
Proof Orientation: 47 active findings (31 actionable, 16 monitoring)
  3 risk · 28 debt · 16 observation
  ...
  Staleness: 12 stale (4 high, 8 medium)
  New since last session: 8 findings (last session: 2026-05-15T14:30:00Z)

  Recent proofs:
    auth-refactor      PASS  3 findings  2d ago
    ...
```

### `ana proof audit --matrix` (with null `last_session_at`)

Same as current output — "New since" line is omitted entirely.

### `ana proof audit --matrix --json` (with `last_session_at` set)

Adds two fields to the existing JSON envelope:
```json
{
  "new_since_last": 8,
  "last_session_at": "2026-05-15T14:30:00Z"
}
```

### `ana learn end` (success)

```
Learn session ended.
  Timestamp: 2026-05-17T16:30:00Z
  Findings now "old" in next session: 47
```

### `ana learn end --json` (success)

```json
{
  "command": "learn end",
  "data": {
    "last_session_at": "2026-05-17T16:30:00Z",
    "findings_before_cutoff": 47
  }
}
```

### `ana learn end` (wrong branch)

```
Error: Wrong branch. Switch to `main` to end learn session.
  Run: git checkout main
```

## File Changes

### `packages/cli/src/commands/learn.ts` (create)

**What changes:** New command module. Registers `ana learn` with `end` subcommand. Follows `proof close` command shape: branch enforcement via `readArtifactBranch` + `getCurrentBranch`, `pullBeforeRead`, read/write state.json, `commitAndPushProofChanges`, JSON + human output.

**Pattern to follow:** `proof close` in `proof.ts:744-936` — same branch check, pull, mutate, commit+push, format output flow. Simpler — no finding lookup, no dry-run, no variadic IDs.

**Why:** Session boundary needs a CLI command so the Learn template can invoke it mechanically. Must be a separate module (not added to `proof.ts`) because sessions are a Learn concept, not a proof concept.

### `packages/cli/src/commands/init/assets.ts` (modify)

**What changes:** Add `learn/` directory creation in `createDirectoryStructure`. One `mkdir` for the directory, one `writeFile` to seed `state.json` with `{ "last_session_at": null }`.

**Pattern to follow:** Lines 63-70 — the existing directory creation block. Same `fs.mkdir` + `fs.writeFile` pattern.

**Why:** New projects need the directory and seed file from first init. Without it, `--new` degrades to "show all" (acceptable) but `ana learn end` would need to create the directory on first use (which it does anyway for old projects, but fresh init should include it).

### `packages/cli/src/commands/init/state.ts` (modify)

**What changes:** Add step 7 to `preserveUserState` — copy `learn/` directory if it exists. Same pattern as step 4 (proof chain preservation): `access` + `cp` with catch fallback.

**Pattern to follow:** Lines 584-594 — proof chain file preservation. But `learn/` is a directory, so use the directory copy pattern from step 5 (lines 596-607): `stat` → `isDirectory` → `rm` + `cp`.

**Why:** Re-init must not reset the session timestamp. A developer who runs `ana init` to refresh scan data should not lose their Learn session boundary.

### `packages/cli/src/commands/proof.ts` (modify)

**What changes:** Three additions:
1. Add `--new` and `--since` options to audit command registration (~line 1578).
2. Add `--new`/`--since` filter logic after `--entry` filter (~line 1860). `--new` reads state.json, extracts `last_session_at`, and filters entries by `completed_at`. `--since` uses the provided date directly. Both filter the `activeFindings` array by checking `entry.completed_at > threshold` — but since `activeFindings` items carry `entry_slug` (not `completed_at`), the filter needs to resolve each finding's entry. Build a `Map<string, string>` of `slug → completed_at` from `chain.entries` before the filter block, then filter by looking up the finding's `entry_slug`.
3. Add `new_since_last` counter inside `--matrix` block (~line 1672). Read state.json, and if `last_session_at` is non-null, count active findings from entries with `completed_at > last_session_at`. Add `new_since_last` and `last_session_at` to JSON output. Add a "New since last session" line to human-readable output between staleness and recent proofs.

**Pattern to follow:** `--severity` filter at lines 1844-1853 — same post-collection `.filter()` pattern.

**Why:** The audit command is where findings are displayed. Session-aware filtering belongs here, composed with existing filters.

### `packages/cli/src/index.ts` (modify)

**What changes:** Import and register `registerLearnCommand`. Place it in the `INTELLIGENCE` group after `registerProofCommand`.

**Pattern to follow:** Lines 57-59 — the existing `INTELLIGENCE` group registration.

**Why:** `ana learn` is an intelligence command (same domain as `proof` and `agents`). Registration order determines `--help` display order.

### `packages/cli/templates/.claude/agents/ana-learn.md` (modify)

**What changes:** Two additions to the template:
1. **Startup enrichment** (~after line 84, "Present State" section): After presenting the `--matrix` output, if the matrix includes `new_since_last > 0`, add a session-aware line: "{N} new findings since last session." If no `last_session_at`, omit (first session or pre-feature project).
2. **Wrap-up enrichment** (~after line 468, "Session Wrap-Up" section): Add explicit session boundary flow. After presenting the delta, Learn says "Ready to wrap up? I'll present the session delta and run `ana learn end` to mark the timestamp." User confirms. Learn presents the delta, runs the command, shows the confirmation.
3. **Startup expectation-setting** (~after the menu in "Present State"): One sentence after the menu: "When we're done, I'll run `ana learn end` to mark the session boundary — next time I'll know what's new."
4. **Reference section** (~line 486): Add `ana learn end` to the commands list.

**Pattern to follow:** The existing template voice and formatting. Additive — no existing text removed.

**Why:** The template is what makes session tracking mechanical. Learn invokes `ana learn end` automatically during wrap-up, so the developer doesn't need to remember.

### `README.md` (modify)

**What changes:** Add a "Learn" command section after the existing "Proof" section (after line 187). One row: `ana learn end` with description "Mark session boundary — next Learn session knows what's new." Also update the `ana proof audit` row description to note `--new` and `--since` flags.

**Pattern to follow:** The existing command table format at lines 178-187.

**Why:** A new CLI command that doesn't appear in the README is invisible to users browsing GitHub.

### `website/content/docs/guides/using-ana-learn.mdx` (modify)

**What changes:** Three additions:
1. Update the session startup example (~line 15): Add a "New since last session: 8 findings" line to the mock `--matrix` output.
2. Update the session delta section (~line 90): Mention that Learn runs `ana learn end` at wrap-up to set the session boundary. Brief — one sentence explaining that the next session will know what's new.
3. Reference `--new` in the session flow description (~line 19): Note that `--new` filters to only findings since the last session.

**Pattern to follow:** The existing MDX formatting with inline styles. Keep edits minimal — this is additive context, not a rewrite.

**Why:** The guide teaches users how Learn works. Session memory changes the session flow — users should see it in the guide.

### `website/content/docs/concepts/toolbelt.mdx` (modify)

**What changes:** Update the `ana-learn` row in the toolbelt table (~line 41). Add `ana learn end` to the command list and note `--new` on audit.

**Pattern to follow:** The existing table format at lines 35-42.

**Why:** The toolbelt page is the canonical reference for what each agent runs. `ana learn end` is now part of Learn's toolbelt.

### `packages/cli/tests/commands/learn.test.ts` (create)

**What changes:** Tests for `ana learn end` command. Follows the `proof close` test pattern in `proof.test.ts`.

**Pattern to follow:** `createCloseTestProject` helper at proof.test.ts:941-966 — git init, ana.json, branch setup. The learn tests need a similar helper that also creates `.ana/learn/state.json`.

**Why:** New command needs test coverage.

### `packages/cli/tests/commands/proof.test.ts` (modify)

**What changes:** Add test cases for `--new` and `--since` flags on audit, and `new_since_last` on matrix output. Test cases:
- `--new` with `last_session_at` set filters correctly
- `--new` with null `last_session_at` shows all findings
- `--new` with missing state.json shows all findings
- `--since` with valid ISO date filters correctly
- `--since` with invalid date shows error
- `--since` with future date shows zero findings
- `--new` composes with `--severity` and `--entry`
- `--matrix` ignores `--new` and `--since`
- `--matrix` includes `new_since_last` when `last_session_at` set
- `--matrix` omits `new_since_last` when `last_session_at` null
- `--new` and `--since` work with `--json`

**Pattern to follow:** Existing audit filter tests at proof.test.ts:4242-4345 — `createProofChain` with entries having different `completed_at` values, then run audit with flags and check output.

**Why:** New flags need test coverage for both filtering behavior and composition with existing flags.

### `packages/cli/tests/commands/init.test.ts` (modify)

**What changes:** Add test cases for learn directory creation in init and preservation on re-init. Test cases:
- Init creates `.ana/learn/state.json` with `{ "last_session_at": null }`
- Re-init preserves existing `.ana/learn/state.json` with a non-null timestamp

**Pattern to follow:** Existing init tests in the same file — look for tests that verify directory creation and `preserveUserState` behavior.

**Why:** Init changes need test coverage.

## Acceptance Criteria

- [ ] AC1: `ana init` creates `.ana/learn/` directory containing `state.json` seeded with `{ "last_session_at": null }`
- [ ] AC2: `ana init` on an existing project preserves `.ana/learn/state.json` (re-init does not reset the timestamp)
- [ ] AC3: `ana proof audit --new` shows only active findings from entries with `completed_at` after `last_session_at` in state.json
- [ ] AC4: When `last_session_at` is null or state.json doesn't exist, `--new` shows all active findings (same as omitting the flag)
- [ ] AC5: `ana proof audit --since 2026-05-15` filters to active findings from entries completed after the given ISO date
- [ ] AC6: `--new` composes with `--severity`, `--entry`, and `--full` (filters are additive)
- [ ] AC7: `--matrix` silently ignores `--new` and `--since` (matrix is always full orientation, same precedence pattern as --severity and --entry)
- [ ] AC8: When `last_session_at` is non-null, `--matrix` output includes `new_since_last` count and `last_session_at` timestamp (both JSON and human-readable)
- [ ] AC9: When `last_session_at` is null, `--matrix` omits the "new since" line entirely
- [ ] AC10: `ana learn end` writes `last_session_at` to `.ana/learn/state.json` with the current ISO timestamp, commits the file, and pushes
- [ ] AC11: `ana learn end` enforces artifact branch (same pattern as proof close/promote)
- [ ] AC12: `ana learn end` outputs confirmation with the timestamp and a count of findings that will be "old" in the next session
- [ ] AC13: Learn template startup references `--new` count from `--matrix` output for session orientation ("N new findings since last session")
- [ ] AC14: Learn template communicates session boundaries at startup (brief expectation-setting) and wrap-up (explicit `ana learn end` invocation with developer confirmation)
- [ ] AC15: `--new` and `--since` work in both `--json` and human-readable output modes
- [ ] Tests pass with `(cd packages/cli && pnpm vitest run)`
- [ ] No build errors with `(cd packages/cli && pnpm run build)`
- [ ] Lint passes with `pnpm run lint`
- [ ] README, using-ana-learn guide, and toolbelt concept page updated

## Testing Strategy

- **Unit tests for `ana learn end`:** New test file `tests/commands/learn.test.ts`. Same git-based test setup as `proof close` tests — `git init`, create ana.json, create state.json, set branch. Test: success writes timestamp and commits, wrong branch rejects, creates directory if missing, JSON output format.
- **Unit tests for `--new`/`--since` on audit:** Added to existing `proof.test.ts`. Use `createProofChain` with entries at different `completed_at` timestamps. Create `.ana/learn/state.json` with a `last_session_at` between the entries. Verify filtering works for human and JSON output.
- **Unit tests for `--matrix` enrichment:** Added to existing `proof.test.ts`. Verify `new_since_last` appears in JSON when `last_session_at` is set, omitted when null.
- **Unit tests for init:** Added to existing `init.test.ts`. Verify directory and seed file creation, and preservation on re-init.
- **Edge cases to test:**
  - `--since` with invalid date string → error exit
  - `--since` with future date → zero findings (not an error)
  - `--new` with missing `.ana/learn/` directory → shows all (no error)
  - `--new` with `last_session_at: null` → shows all
  - `--new --severity risk` → intersection of both filters
  - `--matrix --new` → matrix ignores `--new`
  - `ana learn end` on project without `.ana/learn/` → creates it
  - `ana learn end --json` → JSON envelope output

## Dependencies

- `commitAndPushProofChanges` from `proof.ts` must be exported (or extracted to a shared module). Currently it's a module-level function — not exported. The builder should either export it from `proof.ts` or extract it to `git-operations.ts` (where `runGit`, `readArtifactBranch`, `getCurrentBranch`, `readCoAuthor` already live). Extraction is cleaner — the function has no proof-specific logic.
- `pullBeforeRead` from `proof.ts` — same situation. Consider extracting alongside `commitAndPushProofChanges`.
- `wrapJsonResponse`, `wrapJsonError` from `proofSummary.ts` — already exported.
- `findProjectRoot`, `isWorktreeDirectory` — already exported from validators and worktree utilities.

## Constraints

- `learn/` directory must NOT be added to `.ana/.gitignore` — it's committed and shared. The current gitignore only ignores `state/` and `worktrees/` (literal names, no wildcards), so `learn/` is safe without any gitignore changes.
- `state.json` schema is minimal: `{ "last_session_at": string | null }`. No `session_count` or history — the scope explicitly rejected dead fields.
- `--new` and `--since` filter on `entry.completed_at`, not on finding creation time. Each finding inherits its entry's timestamp.
- `--matrix` computes `new_since_last` inside its early-return block (before ~line 1783). It must NOT depend on the filter logic that runs after the matrix return.

## Gotchas

- **`commitAndPushProofChanges` and `pullBeforeRead` are not exported.** They're module-scope functions in `proof.ts`. The builder needs to extract or export them before `learn.ts` can use them. The cleanest approach is extraction to `git-operations.ts` since they have no proof-specific logic — they stage files, commit with a message, and push.
- **`--new` filter needs entry `completed_at`, but `activeFindings` items carry `entry_slug` not `completed_at`.** Build a `Map<string, string>` of `slug → completed_at` from `chain.entries` before the filter section. Then filter by `entryCompletedMap.get(finding.entry_slug) > threshold`.
- **`--matrix` early-returns at line 1783.** The `new_since_last` computation must happen inside the matrix block (before the return), not in the filter section that comes after.
- **Init writes `state.json` as a file, not a directory.** The seed content is JSON, written with `fs.writeFile`. Don't use `fs.mkdir` for the file itself — `mkdir` for `learn/`, `writeFile` for `learn/state.json`.
- **`ana learn end` must handle missing directory.** Projects initialized before this feature won't have `.ana/learn/`. The command should `mkdir({ recursive: true })` before writing, just like `createDirectoryStructure` does.
- **Template changes are to `packages/cli/templates/.claude/agents/ana-learn.md`**, not `.claude/agents/ana-learn.md` (the dogfood installation). Template changes ship to all customers. Dogfood changes affect only this repo.
- **`--since` date validation:** Use `new Date(value)` and check `isNaN(d.getTime())`. Don't try to validate ISO format with regex — `Date` constructor handles multiple formats and the scope only requires "ISO date" (which `Date` parses).
- **`wrapJsonResponse` and `wrapJsonError` expect a chain parameter for envelope metadata.** For `learn end`, pass `null` or `{ entries: [] }` — the learn command doesn't have a chain context. Check which is accepted.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer named exports. No default exports.
- Error handling in commands: `chalk.red` message + `process.exit(1)`. Use `createExitError` for structured JSON error support.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Use `| null` for checked-and-empty fields, `?:` for not-yet-checked.
- Always use `--run` flag with `pnpm vitest` to avoid watch mode hang.

### Pattern Extracts

**`proof close` command structure (proof.ts:745-805) — structural analog for `learn end`:**

```typescript
const closeCommand = new Command('close')
    .description('Close active findings with a reason')
    .argument('<ids...>', 'Finding IDs to close (e.g., F003 or F001 F002 F003)')
    .option('--reason <reason>', 'Why these findings no longer apply')
    .option('--dry-run', 'Show what would happen without making changes')
    .option('--json', 'Output JSON format')
    .action(async (ids: string[], options: { reason?: string; dryRun?: boolean; json?: boolean }) => {
      const proofRoot = findProjectRoot();
      const proofChainPath = path.join(proofRoot, '.ana', 'proof_chain.json');
      const parentOpts = proofCommand.opts();
      const useJson = options.json || parentOpts['json'];

      // ... exitError setup ...

      // Branch check: must be on artifact branch (skip for dry-run — it's read-only)
      if (!options.dryRun) {
        const artifactBranch = readArtifactBranch(proofRoot);
        const currentBranch = getCurrentBranch();
        if (currentBranch !== artifactBranch) {
          exitError('WRONG_BRANCH', `Wrong branch. Switch to \`${artifactBranch}\` to close findings.`);
          return;
        }

        pullBeforeRead(proofRoot);
      }
```

**Audit filter composition (proof.ts:1844-1860) — pattern for `--new`/`--since`:**

```typescript
      // Apply --severity filter (post-collection, before grouping)
      if (options.severity) {
        const allowedSeverities = new Set(options.severity.split(',').map(s => s.trim()));
        const matchesSeverity = (sev: string): boolean => {
          if (allowedSeverities.has(sev)) return true;
          if (sev === '—' && allowedSeverities.has('unclassified')) return true;
          return false;
        };
        activeFindings = activeFindings.filter(f => matchesSeverity(f.severity));
      }

      // Apply --entry filter (post-collection, before grouping)
      if (options.entry) {
        const entrySlug = options.entry;
        activeFindings = activeFindings.filter(f => f.entry_slug === entrySlug);
      }
```

**`commitAndPushProofChanges` (proof.ts:156-197) — reuse for learn end:**

```typescript
function commitAndPushProofChanges(options: {
  proofRoot: string;
  files: string[];
  message: string;
  coAuthor: string;
}): void {
  runGit(['add', ...options.files], { cwd: options.proofRoot });
  const commitMessage = `${options.message}\n\nCo-authored-by: ${options.coAuthor}`;
  const commitResult = spawnSync('git', ['commit', '-m', commitMessage, '--', ...options.files], { stdio: 'pipe', cwd: options.proofRoot });
  // ... error handling, push with retry ...
}
```

**Init directory creation (assets.ts:59-70):**

```typescript
export async function createDirectoryStructure(tmpAnaPath: string): Promise<void> {
  const spinner = ora('Creating directory structure...').start();
  await fs.mkdir(path.join(tmpAnaPath, 'context'), { recursive: true });
  await fs.mkdir(path.join(tmpAnaPath, 'plans/active'), { recursive: true });
  await fs.mkdir(path.join(tmpAnaPath, 'plans/completed'), { recursive: true });
  await fs.mkdir(path.join(tmpAnaPath, 'state'), { recursive: true });
  await fs.writeFile(path.join(tmpAnaPath, 'plans/active/.gitkeep'), '', 'utf-8');
  await fs.writeFile(path.join(tmpAnaPath, 'plans/completed/.gitkeep'), '', 'utf-8');
  // ...
}
```

**Re-init preservation — directory copy (state.ts:596-607):**

```typescript
  // 5. Copy plans/completed/ (archived pipeline artifacts — user data)
  const completedSrc = path.join(existingAnaPath, 'plans', 'completed');
  const completedDst = path.join(tmpAnaPath, 'plans', 'completed');
  try {
    const stats = await fs.stat(completedSrc);
    if (stats.isDirectory()) {
      await fs.rm(completedDst, { recursive: true, force: true });
      await fs.cp(completedSrc, completedDst, { recursive: true });
    }
  } catch {
    // No completed plans — keep the fresh .gitkeep
  }
```

**Test helper for git-based command tests (proof.test.ts:941-966):**

```typescript
  async function createCloseTestProject(entries: unknown[], options?: { branch?: string }): Promise<void> {
    const branch = options?.branch ?? 'main';
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });
    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(
      path.join(anaDir, 'ana.json'),
      JSON.stringify({ artifactBranch: 'main' }),
    );
    await fs.writeFile(
      path.join(anaDir, 'proof_chain.json'),
      JSON.stringify({ entries }, null, 2),
    );
    execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });
    execSync(`git branch -M ${branch}`, { cwd: tempDir, stdio: 'ignore' });
  }
```

### Proof Context

**`packages/cli/src/commands/proof.ts`** — 10 pipeline cycles touched this file. Key findings:
- Duplicated zero-entry JSON payload (identical object literal at two call sites for `--matrix` with empty chain). The `--new`/`--since` filter must not add a third copy.
- SEVERITY_ORDER map duplicated in findings and build concerns blocks. Don't duplicate it further.

No active proof findings for `assets.ts`, `state.ts`, `init.test.ts`, or `ana-learn.md`.

### Checkpoint Commands

- After `assets.ts` + `state.ts` changes: `(cd packages/cli && pnpm vitest run tests/commands/init.test.ts)` — Expected: existing init tests pass + new learn directory tests pass
- After `proof.ts` audit flag changes: `(cd packages/cli && pnpm vitest run tests/commands/proof.test.ts)` — Expected: existing audit tests pass + new flag tests pass
- After `learn.ts` + `learn.test.ts`: `(cd packages/cli && pnpm vitest run tests/commands/learn.test.ts)` — Expected: learn end tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: all tests pass
- Build: `(cd packages/cli && pnpm run build)`
- Lint: `pnpm run lint`

### Build Baseline

- Current tests: 2458 passed, 2 skipped (2460 total) across 107 test files
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~2490+ tests in 108 test files (1 new: `learn.test.ts`)
- Regression focus: `tests/commands/proof.test.ts` (audit filter tests, matrix tests), `tests/commands/init.test.ts` (directory creation, preservation)
