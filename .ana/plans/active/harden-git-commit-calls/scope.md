# Scope: Harden git commit calls

**Created by:** Ana
**Date:** 2026-04-29

## Intent

Two fixes on the same files. First: git commit messages are constructed via template literals and passed through the shell — user-controlled text in `--reason` can break commits or theoretically execute code. Replace all 5 `execSync` git commit calls with `spawnSync` so message content is never shell-interpreted. Second: the `work complete` nudge re-reads and re-parses the entire proof_chain.json to check one boolean, immediately after `writeProofChain` already iterated every finding. Thread the answer through the return value instead.

This run also serves as the first post-Foundation 3 dogfood under normal conditions — a non-meta scope on hot files, testing whether Plan delivers proof context and Build acts on it.

## Complexity Assessment
- **Size:** small
- **Files affected:** `packages/cli/src/commands/proof.ts`, `packages/cli/src/commands/work.ts`, `packages/cli/src/commands/artifact.ts`, `packages/cli/src/types/proof.ts`
- **Blast radius:** Low. All changes are internal to existing commit and nudge paths. No public API changes. `ProofChainStats` gains one optional boolean field — additive, no consumers break.
- **Estimated effort:** ~30 minutes build time. ~20 lines changed.
- **Multi-phase:** no

## Approach

**Fix 1 — Shell injection (INFRA-065).** Replace `execSync(`git commit -m "${commitMessage}"`)` with `spawnSync('git', ['commit', '-m', commitMessage])` at all 5 locations. Check `result.status !== 0` and throw to preserve existing error handling. Add `spawnSync` to imports in proof.ts and work.ts (artifact.ts already imports it).

Only commit calls change. Other `execSync` calls (`git add`, `git push`, `git pull`, `git remote`) don't interpolate dynamic content and are out of scope.

**Fix 2 — Nudge re-read (close-the-loop-C3).** Add `hasManagedClosure: boolean` to `ProofChainStats`. During `writeProofChain`'s existing iteration over all findings, set a flag when `closed_by !== 'mechanical'` is encountered — this covers human closures, agent closures, and future Learn closures. The distinction matters: mechanical closures (file-deleted, anchor-absent) happen automatically without anyone choosing to manage the chain. Any other closure means someone or something is actively managing quality. The nudge should disappear when the chain is managed, regardless of who's managing it. Return the flag in stats. Replace the 12-line file re-read block at work.ts:1295-1308 with `if (!stats.hasManagedClosure)`.

## Acceptance Criteria
- AC1: All 5 `execSync` git commit calls replaced with `spawnSync` equivalents
- AC2: Multi-line commit messages with co-author trailers still produce correct git commits
- AC3: Commit failures still produce the same error messages and exit codes
- AC4: `ProofChainStats` has a `hasManagedClosure` boolean field — true when any finding has `closed_by !== 'mechanical'` (covers human, agent, and future Learn closures)
- AC5: `writeProofChain` populates `hasManagedClosure` from existing iteration — no additional file reads
- AC6: The nudge block no longer reads proof_chain.json from disk
- AC7: Nudge still appears when active > 20 and no managed closures exist (chain unmanaged)
- AC8: Nudge disappears when any intentional closure exists — human, agent, or Learn (chain managed)
- AC9: All existing tests pass without modification

## Edge Cases & Risks

- **Multi-line messages.** 4 of 5 commit messages contain `\n\nCo-authored-by:`. Verified that `spawnSync('git', ['commit', '-m', msg])` handles embedded newlines correctly — git receives the full multi-line string as a single argument.
- **Error handling difference.** `execSync` throws on non-zero exit. `spawnSync` returns an object. The try/catch blocks around each call need adjustment to check `result.status !== 0` and throw or exit accordingly.
- **`hasManagedClosure` on first run.** A fresh proof chain has zero findings. `hasManagedClosure` defaults to `false`. The nudge fires if active > 20 — which can't happen on first run. No edge case.

## Rejected Approaches

- **Extract a `gitCommit(message, cwd)` helper.** Would centralize all 5 calls into one function. Correct long-term direction, but changes the scope from "fix injection" to "refactor git operations." The pattern isn't recurring fast enough to justify the abstraction yet. If a sixth commit location appears, revisit.
- **Fix only the user-controlled location (proof.ts:469).** Addresses the immediate risk but leaves the structural vulnerability in 4 other locations. The disease is the pattern, not the one instance.
- **Change `delete` to explicit `undefined` in work.ts:891-894.** Investigated — both produce identical behavior for optional properties. Finding closed as accepted, not fixed.

## Open Questions

None.

## Exploration Findings

### Patterns Discovered
- artifact.ts:17 already imports `spawnSync` alongside `execSync` — used for `git ls-files` and `git diff --staged` checks
- artifact.ts:939, 1012 — existing `spawnSync` usage with `status` check pattern: `if (result.status === 0)`. Same pattern needed for commit calls but inverted: `if (result.status !== 0) throw`
- work.ts:983-996 — `ProofChainStats` construction, returned to `completeWork` which runs the nudge at 1293-1313

### Constraints Discovered
- [TYPE-VERIFIED] `ProofChainStats` defined in types/proof.ts:33-44 — adding `hasManagedClosure?: boolean` is additive
- [OBSERVED] `computeChainHealth` at proofSummary.ts:682 iterates all findings but uses a loose type — not the right place for `hasManagedClosure`. The check belongs in `writeProofChain` which has the full `ProofChainEntry` type.
- [OBSERVED] The nudge code at work.ts:1294-1312 runs inside `completeWork`, after `writeProofChain` returns stats. The threading path is: writeProofChain loop → stats.hasManagedClosure → completeWork nudge check.

### Test Infrastructure
- proof.test.ts — close tests use temp git repos, verify commit behavior
- work.test.ts — `completeWork` tests at lines 1608+ and 2008+ test nudge behavior, use temp git repos with proof chain fixtures
- artifact.test.ts — save tests at lines 56+ use temp git repos, verify commit messages

## For AnaPlan

### Structural Analog
artifact.ts:939 and 1012 — existing `spawnSync` usage for git operations with status checking. Same file, same pattern, different git subcommand. The commit calls should mirror this established pattern.

### Relevant Code Paths
- `packages/cli/src/commands/proof.ts:466-479` — close command git block (1 commit call)
- `packages/cli/src/commands/artifact.ts:1033-1038` — saveArtifact commit (1 commit call)
- `packages/cli/src/commands/artifact.ts:1355-1360` — saveAllArtifacts commit (1 commit call)
- `packages/cli/src/commands/work.ts:1071-1072` — recovery path commit (1 commit call)
- `packages/cli/src/commands/work.ts:1256-1257` — main complete path commit (1 commit call)
- `packages/cli/src/commands/work.ts:1293-1313` — nudge block (re-read to eliminate)
- `packages/cli/src/commands/work.ts:850-860` — writeProofChain backfill loop (add hasManagedClosure flag)
- `packages/cli/src/types/proof.ts:33-44` — ProofChainStats interface (add field)

### Patterns to Follow
- artifact.ts:939 for `spawnSync` + status check pattern
- clean-ground scope for the `ProofChainStats` expansion pattern (that scope added `maintenance?` to stats)

### Known Gotchas
- The error handling differs per location. proof.ts exits with `process.exit(1)`. artifact.ts prints the error message. work.ts recovery path has a different catch structure. Each replacement must preserve its location's specific error behavior.
- Import additions: proof.ts and work.ts need `spawnSync` added to existing `execSync` import. Don't remove `execSync` — it's still used for `git add`, `git push`, etc.

### Things to Investigate
- Review the existing nudge tests in work.test.ts to determine how `hasManagedClosure` should be verified — whether the tests mock writeProofChain or run the full flow.
