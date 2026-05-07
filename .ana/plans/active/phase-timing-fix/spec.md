# Spec: Fix Pipeline Phase Timing

**Created by:** AnaPlan
**Date:** 2026-05-07
**Scope:** .ana/plans/active/phase-timing-fix/scope.md

## Approach

Phase detection in `work start` is structurally broken when called from inside a worktree. The early-return path (work.ts ~1397-1413) detects "already in matching worktree" and returns immediately — no timestamp, no phase detection. Meanwhile, calling `work start` from main during Verify misidentifies the phase because build reports live on the feature branch, not main.

The fix has three pillars:

1. **Early-return path gets local phase detection.** When `detectWorktreeSlug() === slug`, detect the current phase using local artifact files (all visible from inside the worktree), then write the appropriate `_started_at` timestamp before returning. Mirror the artifact-check pattern already used at lines 1468-1483 but resolve paths via `findProjectRoot()`.

2. **Write-once guard on `writeTimestamp`.** Add a `force` parameter (default `false`). When `!force` and the key already exists in `.saves.json`, skip the write and return silently. The FAIL→Fix path passes `force: true`.

3. **Wire `plan_started_at` into `computeTiming`.** Follow the exact pattern used for build/verify: prefer `_started_at`, sanity-guard (before end marker, positive duration, under 24h), fall back to artifact-gap.

Template changes ensure the timestamps actually get written: Plan template adds `work start {slug}`, Verify template reorders so the agent enters the worktree before calling `work start`.

## Output Mockups

### `work start` from inside worktree (Verify phase)
```
Already in worktree for `my-feature`.
  Path: /path/to/.ana/worktrees/my-feature
  Branch: feature/my-feature
  Commits: 5 since branch point
```
(No visible change to the user — the timestamp write happens silently.)

### Write-once guard (second call)
No output change. The guard is silent — the first timestamp wins.

### FAIL→Fix path
No output change. `force: true` overwrites silently.

### Missing worktree warning
```
⚠ Worktree not found for `my-feature`. Timestamp skipped.
```

## File Changes

### `packages/cli/src/commands/work.ts` (modify)
**What changes:**
1. Early-return path (~1397-1413): After detecting `currentWorktreeSlug === slug`, resolve `projectRoot` via `findProjectRoot()`, build the local `activePath`, check local artifact files (scope, plan, spec, contract, build_report, verify_report — including numbered variants via globSync), determine phase, and call `writeTimestamp` with the correct key. Use the same variable naming and glob patterns as lines 1468-1483.
2. `writeTimestamp` (~1713-1730): Add `force` parameter (default `false`). Before writing, check if `saves[key]` exists. If it exists and `!force`, return early without writing.
3. FAIL→Fix path (~1544): Pass `true` for the new `force` parameter to `writeTimestamp`.
4. All existing `writeTimestamp` call sites for build/verify (~1512-1514, ~1578-1579): These already happen once per phase entry. The write-once guard makes them idempotent — no code change needed at these sites, the guard handles repeat calls.
5. Missing worktree warning: In the early-return phase detection, if `worktreeExists()` check fails when trying to write a timestamp, print a warning with `chalk.yellow('⚠')`.

**Pattern to follow:** Lines 1468-1483 for artifact detection. Lines 1510-1516 for Verify phase timestamp write pattern.
**Why:** Without this, `work start` from inside a worktree writes no timestamp. Phase detection from main misidentifies Verify as Build.

### `packages/cli/src/utils/proofSummary.ts` (modify)
**What changes:** In `computeTiming` (~1506-1513), read `plan_started_at` via `readRawTimestamp`. When available, compute plan as `contractTime - planStartedAt` with the same sanity guards used for build/verify (positive duration, under MAX_PHASE_MS, planStartedAt <= contractTime). Fall back to the existing `contractTime - scopeTime` when absent or insane.
**Pattern to follow:** Lines 1516-1530 — the build timing block. Identical structure: try `_started_at`, sanity-check, fall back.
**Why:** Without this, `plan_started_at` is written but never consumed — plan timing stays as artifact-gap estimate.

### `packages/cli/templates/.claude/agents/ana-plan.md` (modify)
**What changes:** In the "On Startup" section, after the step that runs `ana work status`, add an instruction: "Run `ana work start {slug}` to record the plan session start time."
**Pattern to follow:** The Think template (`ana.md`) already instructs `work start`.
**Why:** Without this instruction, the Plan agent never calls `work start`, so `plan_started_at` is never written.

### `.claude/agents/ana-plan.md` (modify)
**What changes:** Same change as the template copy — add `work start {slug}` instruction.
**Why:** Dogfood copy must match the shipped template.

### `packages/cli/templates/.claude/agents/ana-verify.md` (modify)
**What changes:** Reorder "Enter the Worktree" step. Currently: "Run `ana work start {slug}`. The CLI prints the path. `cd` to the printed path." Change to: "`ana work status` already printed the worktree path. `cd` to the worktree path, THEN run `ana work start {slug}`." The instruction must be unambiguous that `cd` happens before `work start`.
**Pattern to follow:** None — this is a template wording change.
**Why:** The early-return fix only fires from inside the worktree. If Verify calls `work start` from main, the fix doesn't help. This template reordering is load-bearing.

### `.claude/agents/ana-verify.md` (modify)
**What changes:** Same reordering as the template copy.
**Why:** Dogfood copy must match the shipped template.

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** Add tests for:
- Early-return path writes `build_started_at` when inside worktree during Build phase (spec + contract exist, no build_report)
- Early-return path writes `verify_started_at` when inside worktree during Verify phase (build_report exists, no verify_report)
- Early-return path writes `build_started_at` when inside worktree during Fix phase (verify_report with FAIL exists)
- Write-once guard: second call does not overwrite existing timestamp
- FAIL→Fix: `force` parameter overwrites existing timestamp
- Missing worktree produces warning
**Pattern to follow:** Existing `createStartTestProject` helper and the test structure at lines 2822-3014.
**Why:** The early-return path and write-once guard have no existing test coverage.

### `packages/cli/tests/utils/proofSummary.test.ts` (modify)
**What changes:** Add tests for:
- `plan_started_at` used for plan timing when available
- `plan_started_at` sanity guards: before contractTime, positive duration, under 24h
- Fallback to artifact-gap when `plan_started_at` absent (existing tests verify this — add one with `plan_started_at` present but insane)
- Backward compat: old entries without `plan_started_at` still produce correct plan timing
**Pattern to follow:** The `computeTiming with build_started_at and verify_started_at` describe block at lines 3281-3400. Identical structure.
**Why:** `plan_started_at` consumption has no test coverage.

## Acceptance Criteria

- [ ] AC1: `work start` from inside a worktree during Verify phase writes `verify_started_at` (not `build_started_at`)
- [ ] AC2: `work start` from inside a worktree during Build phase (resume) writes `build_started_at`
- [ ] AC3: `work start` from main during Plan phase writes `plan_started_at`
- [ ] AC4: `computeTiming` uses `plan_started_at` when available, falls back to artifact-gap when absent
- [ ] AC5: `computeTiming` uses `verify_started_at` when available (existing code — verify it works with the fix)
- [ ] AC6: Plan template instructs agent to run `work start {slug}` after `work status`
- [ ] AC7: Sanity guards on `plan_started_at`: must be before `contract.saved_at`, duration positive, under 24 hours
- [ ] AC8: Old proof chain entries without `plan_started_at` still compute plan timing via artifact-gap (backward compat)
- [ ] AC9: `build_started_at` is NOT overwritten when Verify phase runs `work start`
- [ ] AC10: `writeTimestamp` does NOT overwrite existing timestamps (write-once behavior)
- [ ] AC11: FAIL→Fix path overwrites `build_started_at` intentionally (force parameter)
- [ ] AC12: Missing worktree during Build/Verify timestamp write produces a warning, not silent skip
- [ ] Tests pass with `cd packages/cli && pnpm vitest run`
- [ ] No build errors with `pnpm run build`

## Testing Strategy

- **Unit tests (work.test.ts):** Test the early-return path by simulating worktree detection (mock `detectWorktreeSlug` to return the slug, set up local artifact files). Test write-once guard with two sequential `writeTimestamp` calls. Test force parameter overwrites. Test missing worktree warning output.
- **Unit tests (proofSummary.test.ts):** Test `computeTiming` with `plan_started_at` present — verify plan timing uses it. Test sanity guards (plan_started_at after contractTime, negative duration, >24h). Test backward compat (no plan_started_at).
- **Edge cases:**
  - `plan_started_at` exactly equal to `contractTime` (zero duration — valid, should produce 0)
  - `plan_started_at` after `contractTime` (insane — fall back to artifact-gap)
  - Numbered artifacts in early-return path (`build_report_1.md`, `verify_report_2.md`)
  - Corrupted `.saves.json` during write-once check (existing fresh-start behavior handles this)

## Dependencies

None. All changes are within existing modules.

## Constraints

- Backward compatible: old `.saves.json` entries without `plan_started_at` must produce identical timing to today.
- Write-once guard must not break existing timestamp writes — default `force: false` means existing call sites need no changes.
- Template changes must be applied to both `templates/` (shipped) and `.claude/agents/` (dogfood) copies.

## Gotchas

- **`findProjectRoot()` in the early-return path:** Use this, not `process.cwd()`. The agent may have `cd`'d to a subdirectory. `findProjectRoot()` traverses upward.
- **Template reordering is load-bearing:** If Verify runs `work start` from main, the early-return never fires. The template MUST instruct `cd` before `work start`. This is not cosmetic.
- **The FAIL→Fix `writeTimestamp` call at line 1544 needs `force: true`:** Without it, the write-once guard blocks overwriting `build_started_at` for the new build session. This is the ONE call site that must use force.
- **Don't add a `force` parameter to the Verify/Build phase detection blocks (1510-1516, 1576-1579).** These are first-write-per-phase. The write-once guard correctly makes them no-ops on repeat calls. Only the FAIL→Fix path needs force.
- **The early-return Fix phase detection:** Must read verify_report content and check for FAIL, same as lines 1520-1538. Just detecting verify_report existence isn't enough — a PASS verify_report means the work is done, not in Fix phase.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports separate from value imports.
- Explicit return types on all exported functions. Internal helpers can use inference.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Early returns over nested conditionals.
- Use `--run` flag with `pnpm vitest` to avoid watch mode hang.
- Temp directories in tests use `fs.mkdtemp` with cleanup in `afterEach`.

### Pattern Extracts

**Artifact detection pattern (work.ts:1468-1483) — reuse in early-return path:**
```typescript
  // Slug exists — determine phase from artifacts
  const hasScope = fs.existsSync(path.join(activePath, 'scope.md'));
  const hasPlan = fs.existsSync(path.join(activePath, 'plan.md'));
  const hasSpec = fs.existsSync(path.join(activePath, 'spec.md'));
  const hasContract = fs.existsSync(path.join(activePath, 'contract.yaml'));
  const hasBuildReport = fs.existsSync(path.join(activePath, 'build_report.md'));
  const hasVerifyReport = fs.existsSync(path.join(activePath, 'verify_report.md'));

  // Check for numbered specs/reports too
  const hasNumberedSpec = globSync(path.join(activePath, 'spec-*.md')).length > 0;
  const hasNumberedBuildReport = globSync(path.join(activePath, 'build_report_*.md')).length > 0;
  const hasNumberedVerifyReport = globSync(path.join(activePath, 'verify_report_*.md')).length > 0;

  const specExists = hasSpec || hasNumberedSpec;
  const buildReportExists = hasBuildReport || hasNumberedBuildReport;
  const verifyReportExists = hasVerifyReport || hasNumberedVerifyReport;
```

**Verify phase timestamp write pattern (work.ts:1510-1516) — structural analog for early-return:**
```typescript
  // Phase: build report exists, no verify report → Verify (print worktree)
  if (buildReportExists && !verifyReportExists) {
    // Write timestamp to worktree (not main) to avoid dirty .saves.json blocking git pull
    if (worktreeExists(projectRoot, slug)) {
      const wtPlanDir = path.join(getWorktreePath(projectRoot, slug), '.ana', 'plans', 'active', slug);
      await writeTimestamp(wtPlanDir, 'verify_started_at', 'ana-verify');
    }
    return printExistingWorktree(projectRoot, slug, branchPrefix, artifactBranch, 'Verify');
  }
```

**Build timing in computeTiming (proofSummary.ts:1516-1530) — follow for plan_started_at:**
```typescript
  // Build duration: prefer _started_at over artifact-gap timing
  const MAX_PHASE_MS = 24 * 60 * 60 * 1000; // 24 hours
  if (buildTime && contractTime) {
    let usedStartedAt = false;
    if (buildStartedAt !== null && buildStartedAt <= buildTime) {
      const durationMs = buildTime - buildStartedAt;
      if (durationMs >= 0 && durationMs <= MAX_PHASE_MS) {
        timing.build = Math.round(durationMs / 60000);
        usedStartedAt = true;
      }
    }
    if (!usedStartedAt) {
      timing.build = Math.round((buildTime - contractTime) / 60000);
    }
  }
```

**Test helper pattern (work.test.ts:2840-2890) — follow for new tests:**
```typescript
  async function createStartTestProject(options?: {
    artifactBranch?: string;
    currentBranch?: string;
    activeSlugs?: string[];
    completedSlugs?: string[];
  }): Promise<void> {
    const artifactBranch = options?.artifactBranch || 'main';
    // Init git
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });
    // Create .ana/ana.json
    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(
      path.join(anaDir, 'ana.json'),
      JSON.stringify({ artifactBranch }),
      'utf-8'
    );
    // Initial commit
    execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });
    execSync(`git branch -M ${artifactBranch}`, { cwd: tempDir, stdio: 'ignore' });
    // ...
  }
```

### Proof Context

**work.ts:**
- `[test] Phase detection logic (A001-A003, A006-A011) has no dedicated tagged tests` — directly relevant. The new tests for early-return phase detection should be tagged with contract assertion IDs.
- `process.exit in startWork prevents unit testing phase detection` — known limitation. Early-return path doesn't call `process.exit`, so the new tests can test it directly.

**proofSummary.ts:**
- No active findings relevant to `computeTiming` changes.

### Checkpoint Commands

- After `writeTimestamp` changes: `(cd packages/cli && pnpm vitest run --run -t "work start")` — Expected: existing tests still pass
- After `computeTiming` changes: `(cd packages/cli && pnpm vitest run --run -t "computeTiming")` — Expected: existing timing tests still pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: all tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1998 passed, 2 skipped (2000 total)
- Current test files: 96
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~2010-2015 tests in 96 test files (new tests added to existing files)
- Regression focus: `work.test.ts` (existing phase detection tests), `proofSummary.test.ts` (existing computeTiming tests)
