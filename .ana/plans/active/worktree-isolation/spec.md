# Spec: Worktree Isolation

**Created by:** AnaPlan
**Date:** 2026-05-06
**Scope:** .ana/plans/active/worktree-isolation/scope.md

## Approach

The pipeline currently shares a single working directory and git index across all agents. Build and Verify switch branches via `git checkout`, creating 30+ lines of template instructions, stash/recover friction, and a known data-corruption incident (ANA-CLI-034).

The fix: Build and Verify operate in git worktrees. The main tree stays on the artifact branch. The worktree is on the feature branch. Isolation is topological, not instructional.

**Key design decisions:**

1. **Phase detection via artifact existence.** `startWork` checks what exists (scope, plan, spec+contract, build report, verify report) to determine the current phase. This matches how `determineStage` already works — no new state field needed. The "slug already exists" exit at work.ts:1324 becomes the entry point for phase detection.

2. **Worktree path convention.** `.ana/worktrees/{slug}/` — inside the `.ana` directory, gitignored. Consistent with `.ana/state/` for local-only data.

3. **Atomic creation with rollback.** Follow the `init/state.ts` pattern (try/catch + cleanup). On failure: remove worktree directory, delete branch (only if newly created by `-b`). The branch-already-existed check is critical — `git worktree add -b` creates a branch, but in-flight migration uses an existing branch without `-b`.

4. **`saveAllArtifacts` category filter.** When `currentBranch !== artifactBranch`, filter the artifacts list to `build-verify` category BEFORE the `hasPlanningArtifacts` check. The inherited planning artifacts from the branch point are irrelevant in worktree context.

5. **No fallback.** If `git worktree add` fails, the command errors. No dual code paths. Per scope: "Worktrees or error."

6. **`computeTiming` changes deferred.** New `_started_at` timestamps are ISO strings written to `.saves.json`. `computeTiming` already ignores unknown keys. Data accumulates now; computation changes come in a follow-up.

## Output Mockups

### `ana work start {slug}` — Build phase (new worktree)

```
Creating worktree for `payment-flow`...
  Branch: feature/payment-flow (new)
  Path: .ana/worktrees/payment-flow/
  Dependencies: installed
  Env files: .env → symlinked, .env.local → symlinked
  Context: worktree-context.md written

Worktree ready. Run:
  cd .ana/worktrees/payment-flow/
```

### `ana work start {slug}` — Verify phase (existing worktree)

```
Worktree exists for `payment-flow`.
  Path: .ana/worktrees/payment-flow/
  Branch: feature/payment-flow
  Commits: 7 since branch point

cd .ana/worktrees/payment-flow/
```

### `ana work start {slug}` — Resume (from inside the worktree)

```
Already in worktree for `payment-flow`.
  Path: /Users/dev/project/.ana/worktrees/payment-flow/
  Branch: feature/payment-flow
  Commits: 7 since branch point
```

### `ana work start {slug}` — In-flight migration (branch exists, no worktree)

```
Creating worktree for `payment-flow`...
  Branch: feature/payment-flow (existing)
  Path: .ana/worktrees/payment-flow/
  Dependencies: installed
  Env files: none detected
  Context: worktree-context.md written

Worktree ready. Run:
  cd .ana/worktrees/payment-flow/
```

### `ana work start {other-slug}` — From inside a worktree

```
Error: You're in worktree `payment-flow`. Switch to the main project directory first.
```

### `ana work status` — With worktree

```
Pipeline Status (artifact branch: main)

  payment-flow (1 phase):
    scope.md         ✓ main
    plan.md          ✓ main
    spec.md          ✓ main
    build_report.md  ✓ feature/payment-flow
    Stage: ready-for-verify
    Worktree: .ana/worktrees/payment-flow/ (7 commits, last activity 2h ago)
    → claude --agent ana-verify
```

### `ana work status` — Stale worktree

```
    Worktree: .ana/worktrees/payment-flow/ (0 commits, last activity 16d ago) ⚠ stale
```

### Guard: `ana init` from worktree

```
Error: Run init from the main project directory, not from a worktree.
```

### Guard: `ana proof close` from worktree

```
Error: You're in a worktree. Proof commands modify the proof chain on the artifact branch. Run from the main project directory.
```

### Guard: `ana setup complete` from worktree

```
Error: Run setup from the main project directory, not from a worktree.
```

### Guard: `ana work complete` from worktree

```
Error: Run work complete from the main project directory, not from a worktree.
```

### Guard: `ana scan --save` from worktree

```
Warning: You're in a worktree. Saving scan.json here is probably not intended. Run from the main project directory to update the project scan.
```

## File Changes

### `src/utils/worktree.ts` (create)
**What changes:** New module encapsulating all worktree operations: create, remove, detect, path resolution, .env handling, context file generation, and the `isWorktreeDirectory()` guard utility.
**Pattern to follow:** Atomic operations in `init/state.ts` — same try/catch + rollback pattern. Error handling follows `proof.ts` pattern with `exitError` for structured exits.
**Why:** Centralizes worktree logic so `work.ts` calls clean utility functions rather than embedding git worktree commands inline. Every consumer (startWork, completeWork, guards) calls the same module.

### `src/commands/work.ts` (modify)
**What changes:** `startWork` transforms from new-slug-only to phase-aware universal entry. Phase detection determines Think/Plan/Build/Verify/Fix phase from artifact existence. Build phase calls `worktree.ts` to create a worktree. Verify/Fix phases print existing worktree path. `completeWork` gains worktree removal before branch delete. `getNextAction` drops `git checkout` prefixes from 7 return paths. `printHumanReadable` gains worktree info display (path, commits, staleness). `determineStage` is unchanged — it already detects phases correctly.
**Pattern to follow:** Existing `startWork` structure for validation, pull, timestamp. Existing `getWorkBranch` for branch detection.
**Why:** `startWork` is the universal entry point per the scope. Every agent calls it. The CLI detects phase and does the right thing.

### `src/commands/artifact.ts` (modify)
**What changes:** `saveAllArtifacts` — when `currentBranch !== artifactBranch`, filter the artifacts list to `build-verify` category before the `hasPlanningArtifacts` check at line 1295. This is a targeted 3-4 line change inside `saveAllArtifacts`.
**Pattern to follow:** The existing `typeInfo.category` classification at artifact.ts:196.
**Why:** Without this fix, `saveAllArtifacts` from a worktree falsely rejects because inherited planning artifacts trigger `hasPlanningArtifacts`. Build can't save its work.

### `src/commands/proof.ts` (modify)
**What changes:** 5 `WRONG_BRANCH` `formatHint` locations (close, lesson, promote, strengthen, and their formatDetails) gain worktree-aware error messages. When `isWorktreeDirectory()` is true, the hint says "You're in a worktree. Proof commands modify the proof chain on the artifact branch. Run from the main project directory." instead of the current `Run: git checkout {artifactBranch}`.
**Pattern to follow:** The existing `formatHint` pattern with code-based dispatch.
**Why:** Telling a worktree user to `git checkout main` is actively harmful — it produces a fatal error.

### `src/utils/proofSummary.ts` (modify)
**What changes:** No changes. `computeTiming` already ignores unknown `.saves.json` keys. The new `_started_at` timestamps are additive. Deferred to follow-up scope.
**Pattern to follow:** N/A
**Why:** Confirmed safe — the `getTime` helper reads named keys and the `typeof === 'string'` pattern handles raw ISO strings.

### `src/commands/init/index.ts` (modify)
**What changes:** Add worktree guard at the top of the init action handler. If `isWorktreeDirectory()`, print error and exit.
**Pattern to follow:** The existing branch validation pattern in `startWork` — early return with chalk.red error.
**Why:** Running `ana init` from a worktree would create `.ana/` inside the worktree, corrupting the project structure.

### `src/commands/init/assets.ts` (modify)
**What changes:** Add `worktrees/` to the hardcoded `.gitignore` content at line 73-75.
**Pattern to follow:** The existing `state/` entry in the same template.
**Why:** Worktrees are local-only. They must not be committed.

### `src/commands/setup.ts` (modify)
**What changes:** Add worktree guard at the top of the `setup complete` action handler. Same pattern as init guard.
**Pattern to follow:** Same pattern as the init guard.
**Why:** `setup complete` writes to context files on the artifact branch. Running from a worktree writes to the wrong location.

### `templates/.claude/agents/ana-build.md` (modify)
**What changes:** 5 edits per `TEMPLATE_CHANGES.md`: reword line 30 (remove branch mention), replace lines 53-59 (worktree-aware stage descriptions), replace lines 105-127 (new "Enter the Worktree" section), replace line 434 (multi-phase checkout → work start), reword line 537 (branch naming note). Net: -13 lines.
**Pattern to follow:** Exact edit operations from `anatomia_reference/WORKTREE_DEEP_INVESTIGATION/TEMPLATE_CHANGES.md`. The "Exact Edit Operations" section at the end of that document has find/replace pairs.
**Why:** Templates are the primary interface between the CLI and Build/Verify agents. Branch management instructions must be replaced with worktree awareness.

### `templates/.claude/agents/ana-verify.md` (modify)
**What changes:** 2 edits per `TEMPLATE_CHANGES.md`: replace line 43 (worktree reference), replace lines 53-60 (new "Enter the Worktree" section). Net: -4 lines.
**Pattern to follow:** Same `TEMPLATE_CHANGES.md` reference.
**Why:** Same as Build — Verify must enter the worktree, not checkout a branch.

### `.claude/agents/ana-build.md` (modify)
**What changes:** Byte-identical to the template changes above.
**Pattern to follow:** Must be identical to `templates/.claude/agents/ana-build.md` after changes.
**Why:** Dogfood copies must match templates. AC28.

### `.claude/agents/ana-verify.md` (modify)
**What changes:** Byte-identical to the template changes above.
**Pattern to follow:** Must be identical to `templates/.claude/agents/ana-verify.md` after changes.
**Why:** Same as above.

## Acceptance Criteria

Copied from scope, expanded:

- [ ] AC1: `ana work start {slug}` on a new slug creates the directory and records `work_started_at` (existing Think behavior, unchanged)
- [ ] AC2: `ana work start {slug}` on an existing slug with scope (no plan) records `plan_started_at`, validates artifact branch
- [ ] AC3: `ana work start {slug}` on an existing slug with spec+contract (no build report) creates a worktree at `.ana/worktrees/{slug}/`, installs deps, symlinks .env files, writes worktree-context.md, records `build_started_at` on artifact branch before creation, and prints a rich summary
- [ ] AC4: `ana work start {slug}` on an existing slug with build report (no verify report) prints the existing worktree path and records `verify_started_at` in the worktree
- [ ] AC5: `ana work start {slug}` on an existing slug with verify report (FAIL) prints the existing worktree path and records `build_started_at` (Build fix phase)
- [ ] AC6: `ana work start {slug}` on an existing slug from inside the worktree for that same slug prints the path and records the appropriate timestamp (resume case)
- [ ] AC7: `ana work start {other-slug}` from inside a worktree exits with "You're in worktree {current-slug}. Switch to the main project directory first."
- [ ] AC8: Worktree creation is atomic — if any step fails (git worktree add, dep install, .env link, context file, submodule init), rollback removes the worktree directory AND the branch created by `-b` (only if newly created)
- [ ] AC9: In-flight migration: when `feature/{slug}` branch exists but no worktree, `work start` creates a worktree from the existing branch (no `-b`)
- [ ] AC10: `ana work complete {slug}` removes the worktree (from main tree, never from inside), archives the plan, writes the proof chain entry with worktree metadata (`used`, `created_at`, `completed_at`, `commit_count`), commits, pushes, deletes the branch
- [ ] AC11: `work complete` handles the case where the worktree was already removed manually — skips removal silently
- [ ] AC12: `work complete` verifies `.saves.json` completeness after directory move — checks expected keys, logs warning if missing, proceeds with available data
- [ ] AC13: `getNextAction` returns agent commands without `git checkout` prefixes for all worktree-aware stages
- [ ] AC14: `ana work status` shows worktree path, commit count, and last activity when a worktree exists; flags worktrees with 0 commits and 14+ days as stale
- [ ] AC15: `isWorktreeDirectory()` utility correctly detects worktree context by checking `.git` is a file, not a directory
- [ ] AC16: `ana init` from a worktree exits with "Run init from the main project directory, not from a worktree."
- [ ] AC17: `ana scan --save` from a worktree warns that saving to the worktree's scan.json is probably not intended
- [ ] AC18: `ana proof close/lesson/promote/strengthen` from a worktree exits with "You're in a worktree. Proof commands modify the proof chain on the artifact branch. Run from the main project directory."
- [ ] AC19: `ana setup complete` from a worktree exits with "Run setup from the main project directory, not from a worktree."
- [ ] AC20: `ana work complete` from a worktree exits with "Run work complete from the main project directory, not from a worktree."
- [ ] AC21: `saveAllArtifacts` from a non-artifact branch (worktree) filters to build-verify category artifacts only, skipping the planning-artifacts-require-artifact-branch check for artifacts that are build-verify category
- [ ] AC22: `.ana/.gitignore` includes `worktrees/` in the hardcoded template at init/assets.ts; worktree creation also ensures the entry exists for projects that haven't re-run init
- [ ] AC23: Worktree-context.md written inside the worktree at creation contains: contract assertions, proof findings for target files, one-paragraph summary of what Build is expected to do
- [ ] AC24: .env files (`.env*` patterns) detected in main tree are symlinked into the worktree; on symlink failure (Windows without developer mode), falls back to copy
- [ ] AC25: Submodule handling: if `.gitmodules` exists, `git submodule update --init --recursive` runs in the worktree after creation
- [ ] AC26: Build template removes ~28 lines of branch management, adds ~15 lines of worktree awareness per TEMPLATE_CHANGES.md
- [ ] AC27: Verify template removes ~9 lines, adds ~5 lines per TEMPLATE_CHANGES.md
- [ ] AC28: Dogfood copies (`.claude/agents/`) are byte-identical to templates after changes
- [ ] AC29: All existing tests pass; ~50-55 new tests cover worktree lifecycle, phase detection, guards, rollback, resume, migration, and template verification
- [ ] AC30: Test cleanup calls `git worktree remove` BEFORE `fs.rm(tempDir)` to prevent dangling worktree metadata
- [ ] Tests pass with `(cd packages/cli && pnpm vitest run)`
- [ ] No build errors with `pnpm run build`
- [ ] Lint passes with `pnpm run lint`

## Testing Strategy

- **Unit tests for `worktree.ts`:** Test each function in isolation. `isWorktreeDirectory` with mock `.git` file vs directory. `createWorktree` with real git repos in temp directories (the existing `createWorkTestProject` helper creates temp repos). Rollback tests: simulate failure at each step and verify cleanup. `.env` symlink tests with real files. Context file generation with mock contract/findings data.

- **Phase detection tests in `work.test.ts`:** Extend the existing `createWorkTestProject` helper. Add test cases for each phase transition: new slug → Think, scope-only → Plan, spec+contract → Build (worktree created), build-report → Verify (worktree printed), verify-FAIL → Fix (worktree printed). Resume from inside worktree. Cross-slug guard from inside worktree.

- **`getNextAction` simplification tests:** Verify all 9+ return paths no longer include `git checkout`. The `ready-to-merge` path stays unchanged.

- **`completeWork` worktree cleanup tests:** Worktree removal before branch delete. Handle already-removed worktree. Worktree metadata in proof chain entry.

- **Guard tests:** `isWorktreeDirectory` → init refuses, proof refuses, setup refuses, work complete refuses, scan warns.

- **`saveAllArtifacts` filter test:** From a non-artifact branch with inherited planning artifacts, only build-verify artifacts proceed.

- **Template verification tests:** Verify `ana-build.md` contains no `git checkout` (except in NEVER warning). Verify `ana-verify.md` contains no `git checkout` (except in NEVER warning). Verify dogfood copies match templates.

- **Edge cases:**
  - In-flight migration: branch exists but no worktree — creates worktree from existing branch
  - `work complete` when worktree was manually deleted
  - Worktree creation when `.ana/worktrees/` doesn't exist yet
  - `.env` symlink failure → copy fallback
  - Stale worktree detection (0 commits, 14+ days)

- **Test cleanup pattern:** Every test that creates a worktree MUST call `git worktree remove` before `fs.rm(tempDir)`. Add this to `afterEach` in the test helper.

## Dependencies

- Git ≥ 2.15 (worktree support). All modern systems have this.
- Existing `createWorkTestProject` test helper (work.test.ts:33-98).
- `runGit` utility in `git-operations.ts`.
- `findProjectRoot` in `validators.ts` (already handles worktree `.git` files).

## Constraints

- Backward compatibility: existing `work start` for new slugs (Think phase) must be unchanged.
- No configuration flag. No fallback. Worktrees or error.
- `computeTiming` changes are deferred — new `_started_at` fields accumulate but are not consumed.
- Template changes must produce byte-identical dogfood copies.
- Test count must not decrease. CI runs across 3 OS × 2 Node versions.

## Gotchas

1. **`git worktree add -b` creates both worktree AND branch.** Rollback must delete the branch too — but only if newly created. Check branch existence BEFORE `git worktree add` and store the flag. If the branch already existed (in-flight migration), rollback removes only the worktree directory, not the branch.

2. **`saveAllArtifacts` false positive from worktree.** The worktree inherits scope.md, spec.md, contract.yaml from the branch point. The `hasPlanningArtifacts` check at artifact.ts:1295 triggers because these planning artifacts exist on disk. Fix: when on a non-artifact branch, filter the artifact list to only `build-verify` category items before the branch check runs.

3. **`git checkout {artifactBranch}` from inside worktree.** Produces `fatal: '{artifactBranch}' is already checked out at '/path/to/main'`. Templates must include "NEVER run git checkout" warning. This is the #1 production bug both Risk agents identified.

4. **Nested worktrees.** Claude Code's `isolation: "worktree"` creates its own worktrees. Templates must warn: "Do not use `isolation: 'worktree'` for subagent calls."

5. **pnpm workspace resolution.** The worktree at `.ana/worktrees/{slug}/` is physically inside the outer project's directory tree. pnpm may walk up and find the outer `pnpm-workspace.yaml`. If `pnpm install` installs into the wrong location, the fix is `pnpm install --ignore-workspace` or setting `PNPM_WORKSPACE_ROOT` env var. Test empirically during build — if it works, leave it. If it doesn't, apply the fix.

6. **Test cleanup order.** `git worktree remove` MUST run before `fs.rm(tempDir)`. If the temp dir is deleted first, git's worktree metadata becomes dangling and subsequent `git worktree` commands in the same repo fail.

7. **The `.ana/.gitignore` has no merge logic.** It's hardcoded and overwritten on every init (confirmed at init/state.ts:430-506 — `preserveUserState` does NOT preserve `.gitignore`). Adding `worktrees/` to the template at assets.ts:73 is sufficient for new inits. For existing projects that haven't re-run init, worktree creation must also ensure the gitignore entry exists.

8. **`startWork` currently exits on "slug already exists."** Line 1324-1326 is `if (fs.existsSync(activePath)) { process.exit(1) }`. Phase detection must replace this exit with detection logic while preserving Think phase behavior for new slugs where the directory doesn't exist yet.

9. **Push commands stay.** `git push -u origin {branchPrefix}{slug}` in the Build template still works from the worktree — git resolves the `.git` file to the actual repo. Do not remove push commands.

10. **`completeWork` must run from main tree.** Worktree removal requires running `git worktree remove` from outside the worktree. The existing branch check at work.ts:972 catches this, but the error message must be worktree-aware.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer named exports. No default exports.
- Prefer early returns over nested conditionals.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Error handling: commands surface errors with `chalk.red` + `process.exit(1)`. Engine functions catch internally.
- Always use `--run` flag with `pnpm vitest` to avoid watch mode hang.
- Co-author trailer: `Ana <build@anatomia.dev>`.

### Pattern Extracts

**Atomic operation pattern from init/state.ts:430-506:**
```typescript
// init/state.ts:430-434
export async function preserveUserState(
  existingAnaPath: string,
  tmpAnaPath: string,
  newAnaConfig: Record<string, unknown>
): Promise<void> {
  // 1. Copy context/ wholesale (overwriting the fresh scaffolds)
  const contextSrc = path.join(existingAnaPath, 'context');
  const contextDst = path.join(tmpAnaPath, 'context');
  try {
    const stats = await fs.stat(contextSrc);
    if (stats.isDirectory()) {
      await fs.rm(contextDst, { recursive: true, force: true });
      await fs.cp(contextSrc, contextDst, { recursive: true });
    }
  } catch {
    // context/ missing on the existing install — keep the fresh scaffold
  }
```

**Error message pattern from proof.ts:729-732 (WRONG_BRANCH formatHint):**
```typescript
// proof.ts:729-732
if (code === 'WRONG_BRANCH') {
  const artifactBranch = readArtifactBranch(proofRoot);
  return [`  Run: git checkout ${artifactBranch}`];
}
```

**Timestamp write pattern from work.ts:1352-1363:**
```typescript
// work.ts:1352-1363
const savesPath = path.join(activePath, '.saves.json');
let saves: Record<string, unknown> = {};
if (fs.existsSync(savesPath)) {
  try {
    saves = JSON.parse(fs.readFileSync(savesPath, 'utf-8'));
  } catch {
    // Start fresh if corrupted
  }
}
saves['work_started_at'] = new Date().toISOString();
await fsPromises.writeFile(savesPath, JSON.stringify(saves, null, 2), 'utf-8');
```

**`getNextAction` current structure (work.ts:481-531):**
```typescript
// work.ts:481-531
function getNextAction(stage: string, slug: string, branchPrefix: string): string {
  if (stage === 'ready-for-plan') {
    return 'claude --agent ana-plan';
  }
  if (stage === 'ready-for-build') {
    return 'claude --agent ana-build';
  }
  if (stage === 'build-in-progress') {
    return `git checkout ${branchPrefix}${slug} && claude --agent ana-build`;
  }
  if (stage === 'ready-for-verify') {
    return `git checkout ${branchPrefix}${slug} && claude --agent ana-verify`;
  }
  // ... 5 more paths with git checkout prefixes
  if (stage === 'ready-to-merge') {
    return `Review PR, then: ana work complete ${slug}`;
  }
  // ... multi-phase variants with git checkout prefixes
}
```

**`.gitignore` template from init/assets.ts:72-76:**
```typescript
// init/assets.ts:72-76
const gitignoreContent = `# Anatomia runtime state — local to each developer
state/
`;
await fs.writeFile(path.join(tmpAnaPath, '.gitignore'), gitignoreContent, 'utf-8');
```

**`findProjectRoot` worktree handling from validators.ts:174-175:**
```typescript
// validators.ts:174-175
// Containment check: a project root must also have a .git directory (or file, for worktrees)
if (!fsSync.existsSync(path.join(current, '.git'))) {
```

### Proof Context

**work.ts (6 pipeline cycles):**
- `startWork` uses `process.exit(1)` for validation errors, requiring mock-heavy test setup — known concern, not a blocker
- Untested defensive branches in startWork (not a git repo, git pull conflict) — existing gap, not introduced by this change

**artifact.ts (1 pipeline cycle):**
- Double YAML parse in companion success message — unrelated to this change

**proof.ts (9 pipeline cycles):**
- 5 `WRONG_BRANCH` formatHint locations need worktree-aware messages — directly affected

**init/assets.ts (1 pipeline cycle):**
- No active findings relevant to `.gitignore` template change

### Checkpoint Commands

- After `worktree.ts` created and tests added: `(cd packages/cli && pnpm vitest run --run)` — Expected: all existing tests pass + new worktree utility tests pass
- After `startWork` phase detection: `(cd packages/cli && pnpm vitest run --run)` — Expected: existing startWork tests still pass + phase detection tests pass
- After all changes: `(cd packages/cli && pnpm vitest run --run)` — Expected: 1883+ existing tests pass + ~50-55 new tests
- Build: `pnpm run build` — Expected: clean build
- Lint: `pnpm run lint` — Expected: no errors

### Build Baseline
- Current tests: 1883 passed, 2 skipped (1885 total)
- Current test files: 94 passed
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1933-1938 tests in ~95-96 test files
- Regression focus: `work.test.ts` (phase detection changes), `artifact.test.ts` (category filter)
