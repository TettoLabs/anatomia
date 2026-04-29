# Build Report: Harden git commit calls

**Created by:** AnaBuild
**Date:** 2026-04-28
**Spec:** .ana/plans/active/harden-git-commit-calls/spec.md
**Branch:** feature/harden-git-commit-calls

## What Was Built
- `packages/cli/src/commands/proof.ts` (modified): Added `spawnSync` to import. Replaced `execSync` git commit call with `spawnSync('git', ['commit', '-m', commitMessage])` + status check. Existing catch block preserved.
- `packages/cli/src/commands/artifact.ts` (modified): Replaced 2 `execSync` git commit calls with `spawnSync` equivalents. Both inside try/catch blocks that print error and `process.exit(1)`.
- `packages/cli/src/commands/work.ts` (modified): Added `spawnSync` to import. Replaced 2 `execSync` git commit calls (recovery path + main complete path). Added `newFindings` computation from `entry.findings.length`. Reformatted contract line to drop "covered". Reformatted chain line to show total findings with `(+N new)` delta. Deleted nudge block (20 lines). Updated recovery path output to new format.
- `packages/cli/src/types/proof.ts` (modified): Added `newFindings: number` to `ProofChainStats` interface.
- `packages/cli/tests/commands/work.test.ts` (modified): Updated output format assertions (removed "covered", "active findings"). Deleted 2 nudge test blocks (A028, A029). Added 2 new tests: delta shown when newFindings > 0, delta omitted when 0.

## PR Summary

- Replace 5 `execSync` git commit calls with `spawnSync` array-arg equivalents across proof.ts, artifact.ts, and work.ts — eliminates shell interpolation of user-controlled content (commit messages containing slugs, reasons, type names)
- Add `newFindings: number` to `ProofChainStats` for finding delta display
- Reformat `work complete` output: contract line drops "covered" (now `N/N satisfied · N deviations`), chain line shows total findings with `(+N new)` delta parenthetical
- Remove nudge block entirely — threshold checks, file re-reads, and audit recommendations deleted
- Remove maintenance output line from completion summary

## Acceptance Criteria Coverage

- AC1 "All 5 execSync git commit calls replaced with spawnSync" → proof.ts:469, artifact.ts:1034, artifact.ts:1356, work.ts:1072, work.ts:1257 — all replaced. Verified by existing integration tests passing (commits still succeed in temp repos).
- AC2 "Multi-line commit messages with co-author trailers still produce correct git commits" → Existing work.test.ts integration tests exercise commit paths with co-author trailers. All pass.
- AC3 "Commit failures still produce the same error messages and exit codes" → Each replacement preserves the existing try/catch structure. status !== 0 throws into the same catch blocks.
- AC4 "ProofChainStats has a newFindings: number field" → types/proof.ts line 40 ✅
- AC5 "work complete output shows N/N satisfied · N deviations without covered" → work.test.ts:1110 `expect(output).not.toContain('covered')` + `expect(output).toContain('2/2 satisfied')` ✅
- AC6 "work complete output shows Chain: N runs · N findings (+N new)" → work.test.ts new delta test `expect(output).toContain('(+3 new)')` ✅
- AC7 "When newFindings is 0, the delta parenthetical is omitted" → work.test.ts new test `expect(output).not.toContain('(+')` ✅
- AC8 "The nudge block is removed entirely" → Deleted lines 1294-1313 of work.ts. Deleted nudge test blocks. ✅
- AC9 "The maintenance output line is removed" → Deleted maintenance console.log. Test updated to `expect(output).not.toContain('Maintenance:')` ✅
- AC10 "All tests pass" → 1599 passed, 2 skipped ✅

## Implementation Decisions

1. **ProofChain import retained.** Spec said to remove `ProofChain` from the type import (line 23) since the nudge was the only consumer. But `ProofChain` is also used on line 748 (`let chain: ProofChain = { entries: [] }`). Kept the import.

2. **Recovery path counts total findings, not active.** The recovery path manually counts findings from the chain file. Changed from counting only `status === 'active'` to counting all findings (matching `stats.findings` semantics from `computeChainHealth`).

3. **IIFE removed in recovery path.** Initially wrote an IIFE for counting findings in recovery path; simplified to inline loop matching existing code style.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
 Test Files  97 passed (97)
      Tests  1599 passed | 2 skipped (1601)
   Duration  17.35s
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
 Test Files  97 passed (97)
      Tests  1599 passed | 2 skipped (1601)
   Duration  17.37s
```

### Comparison
- Tests added: 2 (delta shown, delta omitted)
- Tests removed: 2 (nudge shown, nudge hidden)
- Regressions: none

### New Tests Written
- `work.test.ts`: "shows finding delta when new findings exist" — creates verify report with 3 callouts, asserts `(+3 new)` in output
- `work.test.ts`: "omits finding delta when zero new findings" — no callouts, asserts `(+` not in output

## Verification Commands
```bash
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
5ab526f [harden-git-commit-calls] Reformat output, add newFindings, remove nudge
83cffec [harden-git-commit-calls] Replace execSync git commits with spawnSync
```

## Open Issues

The recovery path (work.ts ~line 1082-1098) counts total findings by iterating all entries inline. This is duplicated logic from `computeChainHealth`. A future cleanup could extract a shared counting utility, but the recovery path doesn't have the `stats` object available (it's a different code path that doesn't call `writeProofChain`).

Verified complete by second pass.
