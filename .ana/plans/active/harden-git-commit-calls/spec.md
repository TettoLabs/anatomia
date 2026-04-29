# Spec: Harden git commit calls

**Created by:** AnaPlan
**Date:** 2026-04-28
**Scope:** .ana/plans/active/harden-git-commit-calls/scope.md

## Approach

Two fixes on the same files.

**Fix 1 — Shell injection.** Replace all 5 `execSync(`git commit -m "${commitMessage}"`)` calls with `spawnSync('git', ['commit', '-m', commitMessage], { stdio: 'pipe', cwd })`. Each location has different error handling — preserve each one exactly:

- **proof.ts:469** — catch block prints error with `chalk.red`, calls `process.exit(1)`. Replace `execSync` inside the existing try block. Check `result.status !== 0` and throw to trigger the existing catch.
- **artifact.ts:1034** — catch block prints error with message extraction, calls `process.exit(1)`. Same pattern: check status, throw to trigger catch.
- **artifact.ts:1356** — identical pattern to artifact.ts:1034.
- **work.ts:1072** — recovery path. catch block is the outer recovery catch. Same pattern.
- **work.ts:1257** — main complete path. catch block prints error, calls `process.exit(1)`. Same pattern.

For each: `const result = spawnSync('git', ['commit', '-m', commitMessage], { stdio: 'pipe', cwd: X });` then `if (result.status !== 0) throw new Error(result.stderr?.toString() || 'Commit failed');`. The thrown error flows into the existing catch block unchanged.

Add `spawnSync` to the `import { execSync } from 'node:child_process'` line in proof.ts and work.ts. artifact.ts already imports it.

**Fix 2 — Output cleanup.** Three changes in work.ts:

1. **Add `newFindings: number` to `ProofChainStats`** in types/proof.ts. Compute it as `entry.findings.length` and add to the stats construction block in work.ts (after line 989).

2. **Reformat the `work complete` output** (lines 1284-1291):
   - Contract line drops "covered": `N/N satisfied · N deviations`
   - Chain line changes from `N active findings` to `N findings (+N new)` using `stats.newFindings`
   - When `newFindings === 0`, omit the parenthetical: `Chain: N runs · N findings`
   - Delete the maintenance line (lines 1289-1291)

3. **Delete the nudge block** (lines 1293-1313). Remove the `ProofChain` type from the `import type` statement on line 23 — it becomes unused.

4. **Update the recovery path output** (lines 1095-1098) to match the new format. The recovery path doesn't have `newFindings` available (it manually counts from the chain file), so it shows `Chain: N runs · N findings` without a delta parenthetical.

## Output Mockups

Normal completion with new findings:
```
✓ PASS — Harden git commit calls
  7/7 satisfied · 0 deviations
  Chain: 25 runs · 59 findings (+4 new)
```

Normal completion with zero new findings:
```
✓ PASS — Clean Ground
  12/12 satisfied · 0 deviations
  Chain: 26 runs · 59 findings
```

Recovery path (no delta available):
```
✓ PASS — Some Feature
  5/5 satisfied · 0 deviations
  Chain: 10 runs · 12 findings
```

## File Changes

### `packages/cli/src/commands/proof.ts` (modify)
**What changes:** Replace `execSync` git commit call with `spawnSync`. Add `spawnSync` to import.
**Pattern to follow:** artifact.ts:939 — `spawnSync('git', [...], { cwd, stdio: 'pipe' })` with `.status` check.
**Why:** User-controlled `--reason` text is interpolated into a shell command. Shell metacharacters in the reason could break commits or execute code.

### `packages/cli/src/commands/artifact.ts` (modify)
**What changes:** Replace 2 `execSync` git commit calls with `spawnSync`. Import already exists.
**Pattern to follow:** Same file, lines 939 and 1012 — existing `spawnSync` usage.
**Why:** Commit messages contain user-controlled slug and type names. Same structural vulnerability as proof.ts.

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Replace 2 `execSync` git commit calls with `spawnSync`. Add `spawnSync` to import. Add `newFindings` to stats construction. Reformat output lines 1284-1291. Delete nudge block lines 1293-1313. Update recovery output lines 1095-1098. Remove `ProofChain` from type import.
**Pattern to follow:** artifact.ts:939 for spawnSync pattern. Scope output mockup for format.
**Why:** Same shell injection fix. Nudge is a one-shot discoverability hack incompatible with AI-operated pipeline trajectory. Output format cleanup drops noise (covered, maintenance) and adds signal (finding delta).

### `packages/cli/src/types/proof.ts` (modify)
**What changes:** Add `newFindings: number` to `ProofChainStats` interface.
**Pattern to follow:** Existing interface shape — non-optional numeric field like `runs`, `findings`, `active`.
**Why:** Foundation for health trajectory computation. The count is already known at write time.

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** Update output format assertions. Delete nudge test blocks. Delete maintenance output assertion. Add new-findings delta tests.
**Pattern to follow:** Existing `completeWork` test structure in the same file.
**Why:** Tests must match new output format. Dead tests for removed behavior must be deleted.

## Acceptance Criteria
- [ ] AC1: All 5 `execSync` git commit calls replaced with `spawnSync` equivalents
- [ ] AC2: Multi-line commit messages with co-author trailers still produce correct git commits
- [ ] AC3: Commit failures still produce the same error messages and exit codes
- [ ] AC4: `ProofChainStats` has a `newFindings: number` field
- [ ] AC5: `work complete` output shows `N/N satisfied · N deviations` without "covered"
- [ ] AC6: `work complete` output shows `Chain: N runs · N findings (+N new)` using `stats.newFindings`
- [ ] AC7: When `newFindings` is 0, the delta parenthetical is omitted
- [ ] AC8: The nudge block is removed entirely — no threshold checks, no file re-reads, no recommendations
- [ ] AC9: The maintenance output line is removed
- [ ] AC10: All tests pass

## Testing Strategy

- **Unit tests:** No new unit tests for spawnSync replacement — the existing integration tests in work.test.ts, proof.test.ts, and artifact.test.ts exercise the commit paths through temp git repos. If commits break, these tests fail.
- **Output format tests:** Update existing assertions in work.test.ts that check `covered` and `active findings` format. Add two new test cases: one where `newFindings > 0` asserts `(+N new)` is present, one where `newFindings === 0` asserts no parenthetical.
- **Dead test removal:** Delete the "work complete shows audit nudge" and "nudge disappears after human close" describe blocks entirely. Delete the `Maintenance:` assertion from the auto-closed test.

## Dependencies

None. All changes are internal to existing modules.

## Constraints

- `execSync` must NOT be removed from imports — it's still used for `git add`, `git push`, `git pull`, `git remote`, `git status`, `git branch` calls that don't interpolate dynamic content.
- The `maintenance` field on `ProofChainStats` stays — it's still computed and returned. Only the terminal output line is removed.
- Recovery path output uses the simplified chain format (no delta) since it doesn't have access to `ProofChainStats`.

## Gotchas

- **Error handling differs per location.** proof.ts exits with `process.exit(1)`. artifact.ts prints the error message detail. work.ts recovery path has a different catch structure. Don't unify them — each replacement must preserve its location's specific error behavior.
- **Don't remove `execSync` from imports.** It's still used for `git add`, `git push`, etc. in all three files.
- **The recovery path (work.ts:1060-1099) has its own output formatting.** It's a separate code path that doesn't go through the main output block. Both must be updated.
- **`ProofChain` type removal.** After deleting the nudge, `ProofChain` is only used in the `import type` statement on line 23. Remove it from the import. `ProofChainEntry` and `ProofChainStats` are still used — keep those.
- **Test file uses `execSync` in setup code** (e.g., `git add -A && git commit -m "init"`). These are test infrastructure, not the code under test. Don't change them.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions: `import { spawnSync } from 'node:child_process'` uses `node:` prefix (already correct in source).
- Use `import type` for type-only imports, separate from value imports.
- Prefer early returns over nested conditionals.
- Error handling: commands surface errors to user with `chalk.red` + `process.exit(1)`.
- Always use `--run` with `pnpm vitest` to avoid watch mode hang.

### Pattern Extracts

**artifact.ts:938-942 — spawnSync with status check (structural analog):**
```typescript
  // 7b. Check if file is tracked (before staging, for create vs update message)
  const isTracked = spawnSync('git', ['ls-files', '--error-unmatch', relFilePath], {
    cwd: projectRoot,
    stdio: 'pipe'
  }).status === 0;
```

**artifact.ts:1031-1038 — commit call to replace (one of 5):**
```typescript
  const prefix = isTracked ? 'Update: ' : '';
  const commitMessage = `[${slug}] ${prefix}${typeInfo.displayName}\n\nCo-authored-by: ${coAuthor}`;
  try {
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe', cwd: projectRoot });
  } catch (error) {
    console.error(chalk.red(`Error: Commit failed. ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
```

**work.ts:983-996 — stats construction (add newFindings here):**
```typescript
  const stats: ProofChainStats = {
    runs,
    findings: totalFindings,
    active: activeCount,
    lessons: lessonsCount,
    promoted: promotedCount,
    closed: closedCount,
  };

  if (autoClosed > 0 || lessonsClassified > 0) {
    stats.maintenance = { auto_closed: autoClosed, lessons_classified: lessonsClassified };
  }

  return stats;
```

**work.ts:1284-1313 — output block + nudge to rewrite/delete:**
```typescript
  // 13. Print summary (3-line proof summary + optional maintenance)
  const statusIcon = proof.result === 'PASS' ? '✓' : '✗';
  console.log(`\n${statusIcon} ${proof.result} — ${proof.feature}`);
  console.log(`  ${proof.contract.covered}/${proof.contract.total} covered · ${proof.contract.satisfied}/${proof.contract.total} satisfied · ${proof.deviations.length} deviation${proof.deviations.length !== 1 ? 's' : ''}`);
  console.log(chalk.gray(`  Chain: ${stats.runs} ${stats.runs !== 1 ? 'runs' : 'run'} · ${stats.active} active finding${stats.active !== 1 ? 's' : ''}`));
  if (stats.maintenance) {
    console.log(chalk.gray(`  Maintenance: ${stats.maintenance.auto_closed} auto-closed, ${stats.maintenance.lessons_classified} classified as lessons`));
  }

  // Nudge: suggest proof audit when findings pile up AND no human closures exist
  if (stats.active > 20) {
    ...21 lines of nudge logic...
  }
```

### Proof Context
- **proof.ts:** Shell injection in close commit message — user-controlled `--reason` interpolated into shell command. This is exactly what Fix 1 addresses.
- **work.ts:** Unnecessary disk re-read for nudge human closure check. Nudge re-reads `proof_chain.json` instead of threading chain object. Both eliminated by Fix 2 (nudge deleted entirely).
- **artifact.ts:** No findings relevant to this build.

### Checkpoint Commands

- After spawnSync replacements: `(cd packages/cli && pnpm vitest run)` — Expected: existing tests still pass (commit paths exercised by integration tests)
- After output changes + test updates: `(cd packages/cli && pnpm vitest run)` — Expected: 1599 passing tests (minus 2 deleted nudge tests, plus 2 new delta tests = same count)
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1599 passed, 2 skipped (1601 total) across 97 test files
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1599 tests in 97 files (2 nudge tests removed, 2 delta tests added)
- Regression focus: `tests/commands/work.test.ts` (output format assertions), `tests/commands/proof.test.ts` (commit path), `tests/commands/artifact.test.ts` (commit path)
