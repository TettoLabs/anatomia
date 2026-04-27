# Scope: Fix Proof Chain Mechanical Accuracy

**Created by:** Ana
**Date:** 2026-04-27

## Intent

The proof chain's mechanical maintenance layer shipped with 57% closure accuracy. 16 of 37 closures destroyed valid observations. Three bugs: path resolution closed 4 files that exist at different monorepo paths, staleness checks overwrote 3 upstream lessons, and supersession destroyed 9 independent observations using a heuristic too coarse to distinguish same-issue from different-issue-on-same-file. Additionally, 6 findings with bare basenames (no `/`) escape staleness entirely because the syntactic gate skips them — 4 of these reference genuinely deleted files (`projectKind.ts` renamed to `applicationShape.ts` months ago).

Two independent analysts audited every closure against the filesystem. The numbers are verified. This scope repairs all three mechanisms, reopens wrongly-closed findings, closes wrongly-active ones, and adds template nudges to improve input quality at the source.

Foundation 1.5 is a repair, not a feature. The mechanical layer must be trustworthy before lifecycle commands, Ana Learn, or Foundation 2 can build on it.

## Complexity Assessment

- **Size:** small
- **Files affected:**
  - `packages/cli/src/commands/work.ts` — staleness restructure, supersession removal, reopen logic, upstream skip
  - `packages/cli/src/utils/proofSummary.ts` — `resolveFindingPaths` semantic gate
  - `packages/cli/tests/commands/work.test.ts` — new tests for corrected staleness behavior
  - `packages/cli/tests/utils/proofSummary.test.ts` — new tests for semantic path resolution
  - `packages/cli/templates/.claude/agents/ana-verify.md` — template nudges (Fix 7A, 7B)
  - `.claude/agents/ana-verify.md` — dogfood copy of template nudges
- **Blast radius:** Low. The staleness checks and `resolveFindingPaths` are called only from `writeProofChain` in `work.ts`. Template changes affect future Verify sessions only. No external API changes.
- **Estimated effort:** ~20 lines deleted, ~65 lines added, ~12 new tests. Net +45 lines. One pipeline run.
- **Multi-phase:** no

## Approach

Replace three unverified assumptions in the mechanical layer with verified checks:

1. **Path existence verification replaces syntactic path checks.** Instead of guessing whether a path is resolved based on whether it contains `/`, check whether the file exists at the declared path. Instead of closing a file as "removed" because it doesn't exist at one path, verify it's gone from the entire project via glob.

2. **Upstream findings are exempt from staleness.** Upstream observations are institutional memory about contracts, specs, and process. Their value doesn't depend on whether specific code exists. One-line skip prevents staleness from overwriting lesson status.

3. **Supersession is removed entirely.** The same-file + same-category heuristic can't distinguish same-issue from different-issue. 9 of 11 supersessions were wrong. The mechanism belongs in a judgment layer (Ana Learn) that can do semantic comparison. The mechanical layer only does what it does reliably: file-deleted and anchor-absent on verified files.

4. **Wrongly-closed findings are reopened before corrected staleness re-runs.** The corrected mechanisms then process the entire chain honestly.

5. **Template nudges improve input quality at the source.** Fix the misleading package-relative path example in the verify template. Add guidance to reference existing findings instead of re-reporting duplicates.

Design principles: *"Verified over trusted"* — every closure action is preceded by filesystem verification. *"The elegant solution is the one that removes"* — supersession is deleted, the syntactic gate is replaced. *"Do no harm"* — false inaction (stale finding stays active) is noise; false action (valid finding closed) is lost intelligence.

## Acceptance Criteria

- AC1: A finding with `file: 'src/types/contract.ts'` in a monorepo where the actual file is at `packages/cli/src/types/contract.ts` is NOT closed as "file removed"
- AC2: A finding with `file: 'projectKind.ts'` (bare basename, file genuinely deleted) IS closed as "file removed" when glob returns 0 matches
- AC3: A finding with `file: 'index.ts'` where glob returns 5+ matches is NOT closed (ambiguous basename, conservative)
- AC4: A finding with `category: 'upstream'` is never subject to file-deleted or anchor-absent staleness checks, regardless of file or anchor state
- AC5: No supersession closures occur — the supersession code is removed entirely
- AC6: Previously wrongly-closed findings (superseded, file-removed-but-exists, upstream-closed) are reopened before corrected staleness re-runs
- AC7: `resolveFindingPaths` uses `existsSync` gate instead of `includes('/')` — files that exist at declared path are skipped, files that don't exist enter resolution (suffix match, then glob fallback)
- AC8: Anchor-absent checks only run on files verified to exist at the declared path via `existsSync`
- AC9: The verify template's path example is corrected from `src/utils/helper.ts:42` to `packages/cli/src/utils/helper.ts:42` with explicit repo-relative vs package-relative distinction
- AC10: The verify template includes guidance to reference existing active findings instead of creating duplicate observations
- AC11: Both template (`packages/cli/templates/.claude/agents/ana-verify.md`) and dogfood (`.claude/agents/ana-verify.md`) copies are updated identically

## Edge Cases & Risks

**Glob ambiguity on common basenames.** A finding referencing `index.ts` in a Next.js project with 374 files named `index.ts` — glob returns 374 matches, file-deleted check doesn't close. The specific `index.ts` might be genuinely deleted, but the glob can't distinguish which one. These become zombies for Ana Learn. Correct tradeoff: false inaction on ambiguous basenames is damage-free.

**`.ana/` exclusion in glob ignore list.** Files that exist only in `.ana/` (like `ana.json`) get 0 glob matches because `.ana/` is excluded. These findings get closed. Acceptable — findings about Anatomia internal config are infrastructure observations, not customer code observations. One finding affected in current data.

**Sparse checkout / git-tracked files not materialized.** Both `existsSync` and glob search the filesystem, not git. In a sparse checkout, a finding about a non-materialized file would be wrongly closed. Extremely rare for the target customer (2-5 person startups). The finding would be restored when the file materializes on next `work complete`. Not worth adding `git ls-files` verification.

**Upstream findings that are genuinely invalidated.** "AC7 and AC8 are in tension" stays as `lesson` even if both ACs were rewritten. The mechanical layer can't judge semantic validity of upstream observations. Manual closure via `ana proof close` (future lifecycle commands) handles this. The asymmetry is correct: stale lesson = noise, wrongly-closed lesson = lost intelligence.

**Fix 5 ordering constraint.** Reopens MUST execute before corrected staleness re-runs. If staleness runs first on still-closed findings, it skips them (`status === 'closed' → continue`). Then reopens set them to active. Then they never get staleness-checked by the corrected logic. The execution order is: (1) reopen wrongly-closed findings, (2) run corrected `resolveFindingPaths`, (3) run corrected staleness on entire chain.

**Fix 7B and minimum callout requirement.** The template requires "minimum: one Code callout, one Test callout." A reference to an existing finding ("still present — see {finding-id}") is a callout entry in the same `- **Code —** title: file:line` format. The description references a prior finding, but it still counts toward the minimum. No conflict.

**Supersession removal creates duplicates.** The 2 semantically correct supersessions (both about the dead ternary in projectKind.ts) become two active findings about the same issue. Harmless — a developer sees both. Noise, not damage. Foundation 2 or Ana Learn handles deduplication.

## Rejected Approaches

**Tighten supersession instead of removing it.** Require same file + same category + overlapping anchor. Analysis shows this would fire on only 2 of 11 candidates (18% applicability). A feature that applies 18% of the time isn't worth the code complexity. Supersession requires semantic judgment — it belongs in Ana Learn, not the mechanical layer.

**`git ls-files` for file existence verification.** Would handle sparse checkout edge case. Adds subprocess overhead (~50ms per call), complexity, and a git dependency in the staleness path. The target customer doesn't use sparse checkout. Not worth the cost.

**Patch path resolution for known monorepo prefixes (try `packages/cli/` prefix).** Handles the immediate failure mode but is project-specific. Glob verification handles ALL monorepo structures without project-specific knowledge.

**Disable anchor-absent entirely.** The anchor check is 19/19 correct when operating on files that exist at the declared path. The check itself is reliable — the issue was running it on wrong files (file-deleted cases) or exempt findings (upstream). Fixing the preconditions preserves a reliable mechanism.

## Open Questions

None requiring design judgment. All fixes are mechanically specified.

AnaPlan should verify: the reopen logic in Fix 5 must execute in the correct position within `writeProofChain`'s flow — after backfill, before `resolveFindingPaths` and staleness checks. The current code structure (backfill loop → staleness loop → supersession loop) needs restructuring to: backfill loop → reopen loop → resolution → staleness loop. No supersession loop.

## Exploration Findings

### Patterns Discovered

- `writeProofChain` in work.ts is a single function with three sequential phases: backfill (lines 835-864), staleness (lines 866-911), supersession (lines 915-935). Each phase iterates all entries. The restructuring adds a reopen phase between backfill and staleness, and deletes the supersession phase.
- `resolveFindingPaths` in proofSummary.ts:330-355 is a pure function that mutates items in place. The gate change at line 337 is a one-line replacement (`existsSync` for `includes('/')`), but the function signature needs `projectRoot` to be required (currently optional).
- The verify template and dogfood copy are identical (diff produces no output). Both must be updated in lockstep.

### Constraints Discovered

- [TYPE-VERIFIED] `globSync` import — already imported in proofSummary.ts (used in the else-branch of `resolveFindingPaths`). Needs to be imported in work.ts for the staleness glob check. (proofSummary.ts:346, work.ts needs new import)
- [OBSERVED] File content cache — work.ts:869-881 caches `readFileSync` results. The staleness restructuring must preserve this cache for anchor-absent checks on verified files.
- [OBSERVED] `resolveFindingPaths` projectRoot parameter — currently optional (`projectRoot?: string`). With the `existsSync` gate, projectRoot becomes required for correct behavior. The function is called at work.ts:844-845 with projectRoot always provided.
- [TYPE-VERIFIED] Finding type — `ProofChainEntry['findings'][0]` includes `status`, `closed_reason`, `closed_at`, `closed_by` fields. The reopen logic clears these. No type changes needed.

### Test Infrastructure

- `packages/cli/tests/commands/work.test.ts` — uses `tmp` directories with synthesized proof chain data. The existing staleness tests (search for "staleness" or "file removed") create files, write proof_chain.json entries, and assert closure behavior. New tests should follow this pattern but with the specific failure modes: partial paths in monorepo structure, bare basenames with 0/1/5 glob matches, upstream findings with absent anchors.
- `packages/cli/tests/utils/proofSummary.test.ts` — tests `resolveFindingPaths` directly with mock items and modules arrays. The semantic gate tests need a real temp directory with actual files (for `existsSync`), not just string matching.

## For AnaPlan

### Structural Analog

`packages/cli/src/commands/work.ts` lines 835-935 — the existing backfill + staleness + supersession flow IS the code being modified. The restructured version follows the same pattern (iterate entries, iterate findings, check conditions, mutate) with different conditions and an additional reopen phase.

### Relevant Code Paths

- `packages/cli/src/commands/work.ts:835-935` — the entire maintenance section of `writeProofChain`. Backfill (835-864), staleness (866-911), supersession (915-935).
- `packages/cli/src/utils/proofSummary.ts:330-355` — `resolveFindingPaths`. The `includes('/')` gate at line 337. Suffix matching at 340. Glob fallback at 344-353.
- `packages/cli/templates/.claude/agents/ana-verify.md:323` — the misleading path example in the Callouts section.
- `packages/cli/templates/.claude/agents/ana-verify.md:98` — the proof context instruction where Fix 7B text goes.

### Patterns to Follow

- The existing staleness loop structure (work.ts:883-911) — iterate entries, iterate findings, check preconditions, mutate. The restructured version follows the same shape.
- The existing `resolveFindingPaths` approach (proofSummary.ts:330-355) — gate check, then resolution attempts in priority order.

### Known Gotchas

- **Execution order is load-bearing.** The phases must execute in this order: (1) backfill status, (2) reopen wrongly-closed, (3) `resolveFindingPaths`, (4) staleness checks. Getting this wrong silently produces incorrect closures — exactly the disease being fixed. The spec should include a code comment documenting the ordering constraint and why.
- **`globSync` performance.** Each finding that fails `existsSync` triggers a glob call. With 93 findings, worst case is 93 glob calls (~9 seconds at 100ms each). In practice, most findings will hit the fast path (file exists, skip). But if a customer has hundreds of findings with bad paths, this could be slow. Consider: should there be a basename → glob result cache? The existing `fileContentCache` pattern at work.ts:869 suggests caching is expected here.
- **Template changes are verbatim copies.** The template file and the dogfood file must contain identical text after modification. The safest approach: modify the template, then copy the entire file to the dogfood location.

### Things to Investigate

- Whether `globSync` needs a result cache for the staleness glob check. If the same basename appears in multiple findings (e.g., 4 findings on `projectKind.ts`), the glob runs 4 times with the same query. A `Map<string, string[]>` cache would reduce this to 1 call. Investigate whether the current data has enough basename repetition to justify the cache.
