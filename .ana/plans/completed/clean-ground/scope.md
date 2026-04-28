# Scope: Clean Ground for Foundation 3

**Created by:** Ana
**Date:** 2026-04-28

## Intent

Three small code fixes before Foundation 3 builds the developer-facing CLI surface on top of `writeProofChain` and `resolveFindingPaths`. Remove dead fallbacks, delete a stale test assertion, and add a glob result cache to `resolveFindingPaths`. The pipeline run doubles as Foundation 2's first non-meta verification — entry #23 is the first time a different scope's Verify agent produces companion YAML using the Foundation 2 template. After `work complete`, audit entry #23 against the Foundation 2 verification checklist.

## Complexity Assessment
- **Size:** small
- **Files affected:** `packages/cli/src/commands/work.ts`, `packages/cli/src/utils/proofSummary.ts`, `packages/cli/tests/commands/artifact.test.ts`, `packages/cli/tests/utils/proofSummary.test.ts`
- **Blast radius:** None. All changes are internal to `writeProofChain` and `resolveFindingPaths`. No public API changes (cache parameter is optional). No downstream consumers affected.
- **Estimated effort:** ~30 minutes build time. ~12 lines changed, ~3-5 tests added.
- **Multi-phase:** no

## Approach

Three independent fixes shipped together because they share a motivation: clean the ground before Foundation 3.

1. **Remove dead `|| []` fallbacks on new entry paths.** The new entry's `modules_touched` is initialized as `[]` (work.ts:763) and `build_concerns` is guaranteed array via `?? []` (work.ts:814). The fallbacks at lines 828-829 earn nothing. The backfill loop at 843-845 keeps its `|| []` because historical JSON entries may lack these fields.

2. **Delete stale `scope.commit` assertion.** `writeSaveMetadata` no longer writes a `commit` field (removed in seal-hash-simplification). The assertion `expect(saves.scope.commit).toBeUndefined()` at artifact.test.ts:1243 tests `undefined === undefined`. The surrounding test still verifies `.saves.json` structure through the other assertions.

3. **Add glob result cache to `resolveFindingPaths`.** The function globs for each unresolved basename with no deduplication. The cache parameter is optional with a default — if omitted, the function creates a local `Map` for that call. If a shared cache is passed, it uses it. This keeps the exported API clean for future callers while enabling `writeProofChain` to share one cache across all calls (new entry at 828-829, backfill loop at 843-845). Follows the existing `globResultCache` pattern at work.ts:900-948.

## Acceptance Criteria
- AC1: `resolveFindingPaths` call at work.ts:828 passes `entry.modules_touched` directly without `|| []`
- AC2: `resolveFindingPaths` call at work.ts:829 passes `entry.build_concerns` and `entry.modules_touched` directly without `|| []`
- AC3: The `expect(saves.scope.commit).toBeUndefined()` assertion no longer exists in artifact.test.ts
- AC4: `resolveFindingPaths` accepts an optional `globCache` parameter (defaults to a new `Map<string, string[]>`)
- AC5: When `globCache` is provided, `resolveFindingPaths` checks the cache before calling `globSync` and stores results after
- AC6: `writeProofChain` creates one shared `Map<string, string[]>` and passes it to all `resolveFindingPaths` calls (new entry + backfill loop)
- AC7: A test verifies that repeated calls with the same cache reuse glob results (glob called once per unique basename, not once per finding)
- AC8: A test verifies that calling `resolveFindingPaths` without a cache parameter still resolves paths correctly (default behavior preserved)
- AC9: All existing tests pass without modification (except the deleted assertion)

## Edge Cases & Risks

- **Historical entries with missing fields.** The backfill loop's `|| []` at lines 843-845 is intentionally preserved. AnaPlan must ensure the fix targets only lines 828-829.
- **Multiple findings with same basename resolving to different files.** The glob cache stores all matches for a basename. If `globMatches.length === 1`, the finding resolves. If `> 1`, it stays unresolved. The cache doesn't change this logic — it only prevents re-running the glob.
- **Empty cache vs no cache.** Both are valid. An empty `Map` passed in works identically to the default. No special-casing needed.

## Rejected Approaches

- **Required cache parameter.** Would force every caller to create a Map. `resolveFindingPaths` is exported — future callers outside `writeProofChain` shouldn't need to know about caching. Optional with default keeps the API clean.
- **Cache at module scope.** A module-level cache would persist across calls and leak between unrelated operations. The cache should be scoped to one `writeProofChain` invocation.
- **Caching inside `resolveFindingPaths` via closure.** Would require restructuring the function or adding module state. The parameter approach is explicit and follows the established `globResultCache` pattern 70 lines below.

## Open Questions

None. All three fixes are mechanically specified. AnaPlan determines implementation sequencing.

## Exploration Findings

### Patterns Discovered
- work.ts:900 — `globResultCache = new Map<string, string[]>()` created by caller, used in staleness loop at 942-948. Exact structural analog for the `resolveFindingPaths` cache.
- proofSummary.ts:345-362 — `resolveFindingPaths` function body. The glob call at line 355 is the only uncached glob in the proof chain write path.
- work.ts:763 — `let modulesTouched: string[] = []` guarantees the variable is always an array before entry construction.
- work.ts:814 — `build_concerns: proof.build_concerns ?? []` guarantees the field is always an array on the new entry.

### Constraints Discovered
- [TYPE-VERIFIED] modules_touched guaranteed array (work.ts:763) — initialized as `[]`, conditionally populated from `.saves.json` at 768, assigned to entry at 805
- [TYPE-VERIFIED] build_concerns guaranteed array (work.ts:814) — `proof.build_concerns ?? []` at entry construction
- [OBSERVED] backfill loop needs `|| []` (work.ts:843-845) — historical entries from JSON may lack `findings`, `build_concerns`, or `modules_touched`
- [OBSERVED] `writeSaveMetadata` has no `commit` field — removed in seal-hash-simplification, confirmed by reading artifact.ts

### Test Infrastructure
- artifact.test.ts — uses `createTestProject` and `createArtifact` helpers, file-system-based integration tests
- proofSummary.test.ts — unit tests for proof chain utilities, uses temp directories and fixture data

## For AnaPlan

### Structural Analog
work.ts:900-948 — the `globResultCache` pattern for staleness checks. Same data structure (`Map<string, string[]>`), same lifecycle (created by `writeProofChain`, consumed in a loop), same glob call shape (`globSync('**/' + basename, ...)`). The cache for `resolveFindingPaths` is a mirror of this pattern with one difference: it's passed as an optional parameter rather than declared inline, because the function is exported.

### Relevant Code Paths
- `packages/cli/src/commands/work.ts:826-829` — new entry `resolveFindingPaths` calls (remove `|| []`)
- `packages/cli/src/commands/work.ts:843-845` — backfill loop `resolveFindingPaths` calls (pass shared cache, keep `|| []`)
- `packages/cli/src/utils/proofSummary.ts:339-364` — `resolveFindingPaths` function (add optional cache parameter)
- `packages/cli/tests/commands/artifact.test.ts:1243` — stale assertion (delete)
- `packages/cli/tests/utils/proofSummary.test.ts` — existing tests for `resolveFindingPaths`

### Patterns to Follow
- work.ts:900-948 for cache lifecycle and glob deduplication
- The optional-parameter-with-default pattern: `globCache: Map<string, string[]> = new Map()`

### Known Gotchas
- Lines 828-829 vs 843-845: only 828-829 lose the `|| []`. The backfill loop keeps them. Off-by-one on which lines to edit is the only real risk.
- The `globSync` call in `resolveFindingPaths` uses the same options (`cwd: projectRoot, ignore: [...]`) as the staleness glob. The cache key is the basename string. Make sure the cache key matches between calls — same basename must produce the same cache hit regardless of which entry's finding triggered it.

### Things to Investigate
- Review existing `resolveFindingPaths` tests in proofSummary.test.ts to determine which tests need the new cache parameter and which should test default behavior.

## Foundation 2 Verification Protocol

Not a code requirement. After `work complete` produces entry #23, audit against this checklist:

- [ ] Verify agent produced `verify_data.yaml`
- [ ] Produced on first try (not after save-block retry)
- [ ] `verify_data.yaml` has `schema: 1`
- [ ] Each finding has `category` and `summary`
- [ ] `related_assertions` populated on at least some findings
- [ ] `severity` populated on at least some findings
- [ ] File paths resolve from project root
- [ ] Build agent produced `build_data.yaml`
- [ ] Companion hashes (`verify-data`, `build-data`) present in `.saves.json`
- [ ] `generateProofSummary` read from YAML (new fields present on entry #23)
- [ ] `getProofContext` returns findings with `severity` and `related_assertions` fields

If any item fails, Foundation 2's template or validation needs adjustment before Foundation 3.
