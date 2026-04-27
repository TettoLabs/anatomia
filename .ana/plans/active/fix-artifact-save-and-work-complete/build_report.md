# Build Report: Fix artifact save bypass, cwd bug, and work complete crash recovery

**Created by:** AnaBuild
**Date:** 2026-04-27
**Spec:** .ana/plans/active/fix-artifact-save-and-work-complete/spec.md
**Branch:** feature/fix-artifact-save-and-work-complete

## What Was Built

- `packages/cli/src/commands/artifact.ts` (modified): Made `writeSaveMetadata` idempotent (returns boolean, skips write when hash matches). Reordered `saveArtifact` flow to write metadata + capture modules_touched + stage .saves.json BEFORE the no-changes check. Removed post-commit `captureModulesTouched`. Added `cwd: projectRoot` to all git calls. Changed `filePath` to absolute for fs operations with relative `relFilePath` for git.
- `packages/cli/src/commands/work.ts` (modified): Hoisted `coAuthor` read to top of `completeWork`. Added crash recovery (detects uncommitted `.ana/` changes when completedPath exists but activePath doesn't). Added completeness check (verifies `.saves.json` has both `build-report` and `verify-report` entries before directory move). Added `cwd: projectRoot` to all git calls. Updated commit failure error to include retry command.
- `packages/cli/tests/commands/artifact.test.ts` (modified): Added 6 new tests: idempotent re-save (A005), preserved saved_at (A006), preserves existing entries (A007), bypass recovery with metadata+modules_touched+commit (A001-A003), no spurious commit on re-save (A004), subdirectory cwd (A008).
- `packages/cli/tests/commands/work.test.ts` (modified): Added 8 new tests: completeness check blocks on missing build-report (A010, A015), missing verify-report (A011), both missing (A012, A013), proceeds when complete (A014), crash recovery (A016, A017), already completed (A018), double recovery (A019), commit failure error (A020), subdirectory cwd (A009). Updated existing test helpers (`createMergedProject`, branchPrefix test) to write `.saves.json`.

## PR Summary

- Fix silent artifact save bypass (INFRA-060): restructure save flow so `.saves.json` metadata is always written before the no-changes check, with idempotent hash comparison preventing spurious commits
- Fix subdirectory failures (INFRA-061): add `cwd: projectRoot` to every git call in `saveArtifact` and `completeWork`, resolve file paths against project root for fs operations
- Add completeness check: `work complete` now verifies both `build-report` and `verify-report` entries exist in `.saves.json` before the irreversible directory move
- Add crash recovery (INFRA-062): `work complete` detects a previously failed completion (directory moved but not committed) and automatically retries the commit
- Hoist coAuthor read and improve error messages with retry guidance

## Acceptance Criteria Coverage

- AC1 "artifact committed outside save writes metadata" → artifact.test.ts "writes metadata when artifact was committed outside save" (3 assertions)
- AC2 "re-save exits with already up to date" → artifact.test.ts "exits with already up to date on unchanged re-save" (1 assertion)
- AC3 "artifact save from subdirectory succeeds" → artifact.test.ts "saveArtifact succeeds from subdirectory" (1 assertion)
- AC4 "work complete from subdirectory succeeds" → work.test.ts "completeWork succeeds from subdirectory" (1 assertion)
- AC5 "failed completion recovers automatically" → work.test.ts "recovers from failed completion" (2 assertions)
- AC6 "recovery commits proof chain and archive" → work.test.ts "recovers from failed completion" — commit message contains "Complete" (1 assertion)
- AC7 "all existing tests pass" → ✅ 1529 passed, 0 failed
- AC8 "commit failure error directs to retry" → work.test.ts "commit failure error includes retry command" (2 assertions)
- AC9 "completeness check blocks missing reports" → work.test.ts 4 tests covering missing build-report, missing verify-report, both missing, proceeds when complete (6 assertions)

## Implementation Decisions

- Used absolute `filePath` for all fs operations and a separate `relFilePath` for git commands. The spec said "add cwd: projectRoot to every git call" but fs.existsSync and fs.readFileSync also fail from subdirectories with relative paths. This was necessary for AC3 to pass.
- Recovery path reads existing proof chain from disk to reconstruct the summary line, rather than re-generating the proof summary. The proof chain was already written during the failed first attempt.
- The `saveAllArtifacts` reorder preserves the existing `captureModulesTouched` call at step 3c — no duplication needed, matching the spec's note.
- Double recovery test simulates a second incomplete state by adding a file to the completed directory. This is a valid scenario (manual edit after first recovery, interrupted push, etc).

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  97 passed (97)
     Tests  1514 passed | 2 skipped (1516)
  Duration  13.65s
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  97 passed (97)
     Tests  1529 passed | 2 skipped (1531)
  Duration  14.98s
```

### Comparison
- Tests added: 15 (6 in artifact.test.ts, 9 in work.test.ts)
- Tests removed: 0
- Regressions: none

### New Tests Written
- `packages/cli/tests/commands/artifact.test.ts`: writeSaveMetadata idempotency (3 tests), save bypass recovery (2 tests), subdirectory cwd (1 test)
- `packages/cli/tests/commands/work.test.ts`: completeness check (4 tests), crash recovery (3 tests), commit failure error message (1 test), subdirectory cwd (1 test)

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
12ecfcc [fix-artifact-save-and-work-complete] Add completeness check, crash recovery, cwd fixes to work complete
58e2e34 [fix-artifact-save-and-work-complete] Make writeSaveMetadata idempotent and reorder save flow
```

## Open Issues

- The `saveArtifact` function now resolves `filePath` as absolute but the error message at step 6b still shows the relative `relFilePath` for user-facing output. This is intentional (users see paths relative to project root, not absolute paths), but worth noting.
- Pre-existing lint warnings (14 warnings across 4 test files: `@typescript-eslint/no-explicit-any`) — not introduced by this build.
- The `saveAllArtifacts` function's file path handling still uses relative paths via `artifact.path` (which is already absolute via `path.join(planDir, entry)`). Its git calls already had `cwd: projectRoot`. No changes needed there per spec, but `saveAllArtifacts` wasn't tested for subdirectory cwd in this build.
- Recovery path's summary line reconstructs chain stats from disk rather than receiving them from `writeProofChain`. If the proof chain file was corrupted between the failed attempt and the recovery, the stats could be wrong. This is unlikely in practice.

Verified complete by second pass.
