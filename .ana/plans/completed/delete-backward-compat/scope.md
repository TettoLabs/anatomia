# Scope: Delete backward-compatibility code

**Created by:** Ana
**Date:** 2026-04-30

## Intent
Delete all backward-compatibility and migration code from the codebase. Zero customers, zero installed base, zero reason to maintain migration paths. The only installation is our own dogfood, which is fully migrated. Every line of backward-compat code is solving a problem for nobody.

When we DO have customers and DO need schema migrations, `ana upgrade` (ANA-CLI-012) is the right mechanism — an explicit one-time command, not a silent loop on every completion.

## Complexity Assessment
- **Size:** medium
- **Files affected:** 8 modified, 4 deleted
  - `src/commands/work.ts` — delete migration block + reopen loop
  - `src/utils/proofSummary.ts` — simplify parseFindings regex, remove status undefined guard
  - `src/engine/types/index.ts` — remove backward-compat comment
  - `src/commands/scan.ts` — delete display name re-export
  - `tests/commands/scan.test.ts` — fix import path
  - `tests/engine/backward-compat.test.ts` — delete (98 lines)
  - `tests/engine/parsed-backward-compat.test.ts` — delete (109 lines)
  - `tests/engine/patterns-backward-compat.test.ts` — delete (139 lines)
  - `tests/engine/structure-backward-compat.test.ts` — delete (72 lines)
- **Blast radius:** low. All deletions are dead code paths or tests for unused schemas. The proof chain data is already migrated (verified: 31 entries, 151 findings, zero instances of any legacy field or value).
- **Estimated effort:** 1-2 hours
- **Multi-phase:** no

## Approach
Delete dead migration code from writeProofChain, simplify backward-compat regex alternations and guards in proofSummary, remove the test-compat re-export in scan.ts, and delete 4 test files that validate a schema with zero production callers. The diff should be overwhelmingly red.

The reopen-wrongly-closed loop is actively harmful — it reopens 5 findings with `closed_reason='file removed'` on every `work complete`, then the staleness loop immediately re-closes them. Delete it.

What stays: `resolveFindingPaths` on existing entries (cheap, legitimate path resolution), staleness checks (checks current filesystem state), `AnalysisResultSchema` itself (has legitimate test consumers in `types.test.ts` and `parsed-integration.test.ts`).

## Acceptance Criteria
- AC1: `work complete` no longer iterates existing entries for migration purposes (callouts rename, status backfill, severity migration, scope_summary backfill, seal_commit deletion all removed)
- AC2: The reopen-wrongly-closed loop is deleted — no code checks `closed_by === 'mechanical'` to reopen findings
- AC3: `parseFindings` matches `## Findings` only, not `## (?:Callouts|Findings)`
- AC4: The undefined backward-compat guard on finding status in `generateActiveIssuesMarkdown` is removed — status is always checked explicitly
- AC5: The 4 backward-compat test files are deleted (418 lines total)
- AC6: `scan.ts` no longer re-exports display name functions; `scan.test.ts` imports from `displayNames.js` directly
- AC7: The backward-compat comment on `AnalysisResultSchema` (line 120) is removed or rewritten to reflect actual purpose
- AC8: `work complete` still runs `resolveFindingPaths` and staleness checks on existing entries (the legitimate parts)
- AC9: All remaining tests pass
- AC10: Build compiles
- AC11: Lint passes
- AC12: Test count decreases (this is correct — tests for unused code are not testing anything)
- AC13: The `lessonsClassified` counter is deleted — no migration code increments it after the status backfill is removed. The maintenance stats condition (`autoClosed > 0 || lessonsClassified > 0`) is simplified to `autoClosed > 0` only, and `lessons_classified` is removed from the maintenance object

## Edge Cases & Risks
- **Phase ordering comment is stale after deletion.** The comment at work.ts:879 says "Phase ordering is load-bearing: backfill -> reopen -> resolve -> stale." After deleting backfill and reopen, the remaining order is resolve -> stale. The comment must be updated or removed.
- **parseFindings docstring says "Callouts section."** Line 1190 must be updated to say "Findings section."
- **Test count decrease triggers CI failure?** vitest.config.ts may enforce coverage thresholds but not test count. Verify that CI doesn't gate on test count.

## Rejected Approaches
- **Keep migrations but gate them behind a flag.** No. The data is migrated. The code is dead. A flag adds complexity to manage nothing.
- **Delete AnalysisResultSchema entirely.** The schema has zero production callers, but `types.test.ts` and `parsed-integration.test.ts` use it for legitimate schema validation. The schema is cheap to keep and those tests verify the type system, not backward compatibility.
- **Delete resolveFindingPaths on existing entries.** Technically redundant with staleness (both check `fs.existsSync`), but serves a different purpose (path resolution vs. closure) and costs one stat call per finding. Keep for robustness; flag as future optimization if proof chain grows to thousands of entries.
- **Delete fileMatches basename match for "legacy data" (proofSummary.ts:1692).** It's in a query function, not the hot path. Adds robustness for findings without full paths. Leave it.

## Open Questions
None. All claims verified against proof_chain.json and source code.

## Exploration Findings

### Patterns Discovered
- work.ts:838-904 — migration block iterates all existing entries through 6 checks that match zero data, plus a reopen loop that actively churns 5 findings every run
- work.ts:836,1001-1003 — `lessonsClassified` counter declared at line 836, only incremented inside the status backfill block being deleted. The maintenance stats condition at line 1001 checks `lessonsClassified > 0` which is always false after deletion. Dead variable and dead branch.
- proofSummary.ts:1207 — regex alternation `(?:Callouts|Findings)` where the `Callouts` branch can never match on new reports
- proofSummary.ts:417-418 — undefined guard with comment acknowledging it's backward-compat
- engine/types/index.ts:120 — comment explicitly says "retained for backward-compat tests"
- scan.ts:466-467 — re-export with comment "for test backward compatibility"

### Constraints Discovered
- [TYPE-VERIFIED] All migrations complete (proof_chain.json) — 0 callouts fields, 0 missing status, 0 blocker/note severity, 0 seal_commit, 0 missing scope_summary, 0 superseded closures
- [OBSERVED] Reopen loop actively harmful — 5 findings with closed_reason='file removed' get reopened then re-closed every run
- [OBSERVED] AnalysisResultSchema has zero production callers — only test imports (backward-compat tests, types.test.ts, parsed-integration.test.ts)
- [OBSERVED] scan.test.ts is the sole consumer of the scan.ts display name re-export

### Test Infrastructure
- tests/engine/backward-compat.test.ts (98 lines) — validates AnalysisResultSchema parse for steps 1.1-2.1
- tests/engine/parsed-backward-compat.test.ts (109 lines) — validates parsed field shapes through schema
- tests/engine/patterns-backward-compat.test.ts (139 lines) — validates pattern field shapes through schema
- tests/engine/structure-backward-compat.test.ts (72 lines) — validates structure field shapes through schema
- All four test the same schema that has zero production callers. types.test.ts and parsed-integration.test.ts cover the schema adequately.

## For AnaPlan

### Structural Analog
`src/commands/work.ts` staleness check loop (lines 906-972) — same structure as the migration loop being deleted (iterates chain.entries, processes findings), but serves a live purpose. Shows the pattern that should remain after the dead code is removed.

### Relevant Code Paths
- `src/commands/work.ts:836` — `lessonsClassified` declaration (dead after status backfill deletion)
- `src/commands/work.ts:838-904` — the migration block and reopen loop to delete
- `src/commands/work.ts:906-972` — staleness checks that stay
- `src/commands/work.ts:1001-1003` — maintenance stats condition referencing `lessonsClassified` (simplify to `autoClosed > 0`, remove `lessons_classified` from object)
- `src/commands/work.ts:830-832` — new entry path resolution that stays
- `src/utils/proofSummary.ts:1203-1210` — parseFindings with Callouts regex
- `src/utils/proofSummary.ts:414-427` — generateActiveIssuesMarkdown with undefined guard
- `src/engine/types/index.ts:46-80,120` — AnalysisResultSchema definition and comment
- `src/commands/scan.ts:466-467` — display name re-export
- `tests/commands/scan.test.ts:15-18` — import to fix

### Patterns to Follow
- The staleness loop in work.ts shows how the existing-entry iteration should look after cleanup: resolve paths, then check staleness. No migration, no reopen.

### Known Gotchas
- The "phase ordering is load-bearing" comment (work.ts:879-884) becomes stale after deletion. It describes a 4-phase pipeline (backfill -> reopen -> resolve -> stale) that becomes 2-phase (resolve -> stale). Update or remove.
- parseFindings has a docstring (line 1190) that says "Callouts section" — must update to "Findings section."
- The `for...of chain.entries` loop at line 839 currently does both migration AND resolveFindingPaths. After deleting migration code, the loop body is just resolveFindingPaths. Keep the loop, delete the migration lines inside it.

### Things to Investigate
- Whether the phase ordering comment should become a simpler inline comment or be removed entirely — judgment call for the planner based on how much context the remaining code needs.
