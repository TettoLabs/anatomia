# Scope: Harden git commit calls

**Created by:** Ana
**Date:** 2026-04-29

## Intent

Two fixes on the same files. First: git commit messages are constructed via template literals and passed through the shell — user-controlled text in `--reason` can break commits or theoretically execute code. Replace all 5 `execSync` git commit calls with `spawnSync` so message content is never shell-interpreted. Second: the `work complete` output has a nudge block that re-reads the entire proof_chain.json to decide whether to show a recommendation. The nudge is the wrong design — it's a one-shot discoverability hack with an arbitrary threshold, not a data-driven signal. Remove it entirely and replace the chain output line with a cleaner format that includes the per-run finding delta.

This run also serves as the first post-Foundation 3 dogfood under normal conditions — a non-meta scope on hot files, testing whether Plan delivers proof context and Build acts on it.

## Complexity Assessment
- **Size:** small
- **Files affected:** `packages/cli/src/commands/proof.ts`, `packages/cli/src/commands/work.ts`, `packages/cli/src/commands/artifact.ts`, `packages/cli/src/types/proof.ts`
- **Blast radius:** Low. All changes are internal to existing commit and output paths. `ProofChainStats` gains one field (`newFindings`). The `work complete` terminal output format changes — no external consumers of the terminal format.
- **Estimated effort:** ~30 minutes build time. ~20 lines changed.
- **Multi-phase:** no

## Approach

**Fix 1 — Shell injection (INFRA-065).** Replace `execSync(`git commit -m "${commitMessage}"`)` with `spawnSync('git', ['commit', '-m', commitMessage])` at all 5 locations. Check `result.status !== 0` and throw to preserve existing error handling. Add `spawnSync` to imports in proof.ts and work.ts (artifact.ts already imports it).

Only commit calls change. Other `execSync` calls (`git add`, `git push`, `git pull`, `git remote`) don't interpolate dynamic content and are out of scope.

**Fix 2 — Remove nudge, improve output (close-the-loop-C3).** Delete the entire nudge block at work.ts:1293-1313. No re-read, no threshold, no recommendation. The nudge was a one-shot discoverability hack — it assumed a human needed to be told about `ana proof audit`, disappeared after one closure, and used an arbitrary threshold of 20. None of this holds for the platform's trajectory where AI agents operate the pipeline.

Add `newFindings: number` to `ProofChainStats` — the count of findings on the new entry. This is already known at write time (`entry.findings.length`). This field is foundation for health's trajectory computation (findings per run over last N runs).

Change the `work complete` output:
- Drop "covered" from the contract line — satisfied subsumes it at completion time
- Change the chain line from `Chain: N runs · N active findings` to `Chain: N runs · N findings (+N new)` where the delta is the new entry's finding count
- Remove the maintenance line — auto-closed counts are internal bookkeeping, not actionable at summary level
- When `newFindings` is 0, show `Chain: N runs · N findings` with no parenthetical

Output mockup:
```
✓ PASS — Harden git commit calls
  7/7 satisfied · 0 deviations
  Chain: 25 runs · 59 findings (+4 new)
```

## Acceptance Criteria
- AC1: All 5 `execSync` git commit calls replaced with `spawnSync` equivalents
- AC2: Multi-line commit messages with co-author trailers still produce correct git commits
- AC3: Commit failures still produce the same error messages and exit codes
- AC4: `ProofChainStats` has a `newFindings: number` field
- AC5: `work complete` output shows `N/N satisfied · N deviations` without "covered"
- AC6: `work complete` output shows `Chain: N runs · N findings (+N new)` using `stats.newFindings`
- AC7: When `newFindings` is 0, the delta parenthetical is omitted
- AC8: The nudge block is removed entirely — no threshold checks, no file re-reads, no recommendations
- AC9: The maintenance output line is removed
- AC10: All existing tests pass (nudge-related tests should be removed or updated to reflect removal)

## Edge Cases & Risks

- **Multi-line messages.** 4 of 5 commit messages contain `\n\nCo-authored-by:`. Verified that `spawnSync('git', ['commit', '-m', msg])` handles embedded newlines correctly — git receives the full multi-line string as a single argument.
- **Error handling difference.** `execSync` throws on non-zero exit. `spawnSync` returns an object. The try/catch blocks around each call need adjustment to check `result.status !== 0` and throw or exit accordingly.
- **Existing nudge tests.** Tests at work.test.ts that verify nudge presence/absence need to be removed or updated. The nudge no longer exists — these tests become dead.
- **Maintenance line removal.** Tests that assert on the maintenance output line need updating. The information still exists in `stats.maintenance` — it's just not printed.

## Rejected Approaches

- **Extract a `gitCommit(message, cwd)` helper.** Would centralize all 5 calls into one function. Correct long-term direction, but changes the scope from "fix injection" to "refactor git operations." The pattern isn't recurring fast enough to justify the abstraction yet. If a sixth commit location appears, revisit.
- **Fix only the user-controlled location (proof.ts:469).** Addresses the immediate risk but leaves the structural vulnerability in 4 other locations. The disease is the pattern, not the one instance.
- **Change `delete` to explicit `undefined` in work.ts:891-894.** Investigated — both produce identical behavior for optional properties. Finding closed as accepted, not fixed.
- **`hasManagedClosure` boolean on ProofChainStats.** Originally proposed to thread a "has anyone intentionally closed a finding" flag through stats so the nudge could check it without re-reading the file. Rejected because the nudge itself was the wrong design — a one-shot discoverability hack with an arbitrary threshold, incompatible with the platform's trajectory toward AI-operated pipelines. Removing the nudge entirely eliminates the need for the boolean.
- **Keep the nudge with a smarter trigger.** Considered replacing the arbitrary threshold with data-driven logic. Rejected because the right place for intelligent recommendations is `ana proof health`, not `work complete`. When health exists, `work complete` gets a health-informed line. Until then, the output presents data without advice.

## Open Questions

None.

## Exploration Findings

### Patterns Discovered
- artifact.ts:17 already imports `spawnSync` alongside `execSync` — used for `git ls-files` and `git diff --staged` checks
- artifact.ts:939, 1012 — existing `spawnSync` usage with `status` check pattern: `if (result.status === 0)`. Same pattern needed for commit calls but inverted: `if (result.status !== 0) throw`
- work.ts:983-996 — `ProofChainStats` construction, returned to `completeWork` which formats the output
- The new entry's findings count is known at work.ts:970 when `chain.entries.push(entry)` runs — `entry.findings.length` is the `newFindings` value

### Constraints Discovered
- [TYPE-VERIFIED] `ProofChainStats` defined in types/proof.ts:33-44 — adding `newFindings: number` is additive
- [OBSERVED] The contract line currently shows `covered/total covered · satisfied/total satisfied · N deviations`. The `covered` metric comes from `proof.contract.covered` — dropping it means not referencing that field in the output format
- [OBSERVED] The maintenance line at work.ts:1289-1291 checks `stats.maintenance` and prints auto-closed and lessons-classified counts. Removing this line doesn't affect `stats.maintenance` — the field still exists for other consumers

### Test Infrastructure
- proof.test.ts — close tests use temp git repos, verify commit behavior
- work.test.ts — `completeWork` tests at lines 1608+ and 2008+ test nudge behavior and output format, use temp git repos with proof chain fixtures
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
- `packages/cli/src/commands/work.ts:1285-1313` — output formatting and nudge block (rewrite output, delete nudge)
- `packages/cli/src/types/proof.ts:33-44` — ProofChainStats interface (add `newFindings`)
- `packages/cli/src/commands/work.ts:983-996` — stats construction (add `newFindings` from entry)

### Patterns to Follow
- artifact.ts:939 for `spawnSync` + status check pattern
- clean-ground scope for the `ProofChainStats` expansion pattern (that scope added `maintenance?` to stats)

### Known Gotchas
- The error handling differs per location. proof.ts exits with `process.exit(1)`. artifact.ts prints the error message. work.ts recovery path has a different catch structure. Each replacement must preserve its location's specific error behavior.
- Import additions: proof.ts and work.ts need `spawnSync` added to existing `execSync` import. Don't remove `execSync` — it's still used for `git add`, `git push`, etc.
- Existing tests for the nudge and maintenance line need removal or update. Don't leave dead test assertions that verify removed behavior.

### Things to Investigate
- Review the existing output format tests in work.test.ts to determine which assertions need updating for the new chain line format and the removed maintenance/nudge lines.
