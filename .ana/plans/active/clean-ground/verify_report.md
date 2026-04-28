# Verify Report: Clean Ground for Foundation 3

**Result:** FAIL
**Created by:** AnaVerify
**Date:** 2026-04-28
**Spec:** .ana/plans/active/clean-ground/spec.md
**Branch:** feature/clean-ground

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/clean-ground/contract.yaml
  Seal: INTACT (hash sha256:95003ecb75f0dfb3ef2ffa3de1d5a7a1c84c6ff8da50a3f609b71fc3370e5adb)

  A001  ✓ COVERED  "Dead fallback removed from findings resolution on new entry"
  A002  ✓ COVERED  "Dead fallback removed from build concerns resolution on new entry"
  A003  ✓ COVERED  "Backfill loop still guards against missing fields in historical entries"
  A004  ✓ COVERED  "Both stale commit assertions are removed from artifact tests"
  A005  ✓ COVERED  "Path resolver accepts an optional cache to avoid redundant filesystem scans"
  A006  ✓ COVERED  "Cache defaults to a new Map so existing callers work unchanged"
  A007  ✓ COVERED  "Cached basenames skip the filesystem glob on subsequent lookups"
  A008  ✓ COVERED  "Glob results are stored in cache after first lookup"
  A009  ✓ COVERED  "Proof chain writer shares one cache across all path resolution calls"
  A010  ✓ COVERED  "Repeated lookups for the same file hit the cache instead of re-scanning"
  A011  ✓ COVERED  "Calling the resolver without a cache still resolves files correctly"
  A012  ✓ COVERED  "All pre-existing tests continue to pass after the changes"

  12 total · 12 covered · 0 uncovered
```

Tests: 1575 passed, 2 skipped (1577 total). Build: clean. Lint: 0 errors (14 pre-existing warnings in ai-sdk-detection.test.ts).

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Dead fallback removed from findings resolution on new entry | ✅ SATISFIED | work.ts diff: `entry.modules_touched || []` removed → now `entry.modules_touched` directly at line 831 |
| A002 | Dead fallback removed from build concerns resolution on new entry | ✅ SATISFIED | work.ts diff: `entry.build_concerns || []` removed → now `entry.build_concerns` directly at line 832 |
| A003 | Backfill loop still guards against missing fields in historical entries | ✅ SATISFIED | work.ts lines 847-848: `existing.findings || []` and `existing.modules_touched || []` retained |
| A004 | Both stale commit assertions are removed from artifact tests | ✅ SATISFIED | artifact.test.ts diff: two `.commit).toBeUndefined()` lines deleted (former lines 1243, 1707). Grep confirms zero remaining matches. |
| A005 | Path resolver accepts an optional cache to avoid redundant filesystem scans | ✅ SATISFIED | proofSummary.ts:344 — `globCache: Map<string, string[]> = new Map()` as 4th param |
| A006 | Cache defaults to a new Map so existing callers work unchanged | ✅ SATISFIED | proofSummary.ts:344 — `= new Map()` default; test at line 1298 calls with 3 args and resolves correctly |
| A007 | Cached basenames skip the filesystem glob on subsequent lookups | ✅ SATISFIED | proofSummary.ts:357 — `globCache.get(basename)` checked before globSync |
| A008 | Glob results are stored in cache after first lookup | ✅ SATISFIED | proofSummary.ts:363 — `globCache.set(basename, globMatches)` after globSync |
| A009 | Proof chain writer shares one cache across all path resolution calls | ✅ SATISFIED | work.ts:828 — `const globCache = new Map<string, string[]>()` declared once, passed to all 4 `resolveFindingPaths` calls (lines 831, 832, 847, 848) |
| A010 | Repeated lookups for the same file hit the cache instead of re-scanning | ❌ UNSATISFIED | Test at proofSummary.test.ts:1275 is tagged `@ana A010` but does not assert call count. Contract requires `test.globSpy.callCount equals 1`. The spy is also non-functional — `vi.spyOn({ globSync }, 'globSync')` targets a fresh anonymous object, not the module import used by `resolveFindingPaths`. See Findings. |
| A011 | Calling the resolver without a cache still resolves files correctly | ✅ SATISFIED | proofSummary.test.ts:1298 — calls `resolveFindingPaths(items, [], tempDir)` with 3 args; asserts `items[0]!.file === 'src/utils/helper.ts'` |
| A012 | All pre-existing tests continue to pass after the changes | ✅ SATISFIED | `pnpm vitest run`: 1575 passed, 2 skipped. No regressions. |

## Independent Findings

The three code changes (dead fallback removal, stale assertion deletion, glob cache) are clean and well-structured. The implementation closely follows the spec's pattern references and the existing `globResultCache` in the staleness loop. The diff is surgical — no scope creep, no over-building, no YAGNI violations.

The A010 test is the one problem. It has the right structure and intent but the spy mechanism is broken and the critical assertion is missing. The test currently proves the cache *stores* values (via `sharedCache.get('helper.ts')` assertion) and that both items resolve correctly — but it cannot prove the second call *reads* from the cache instead of re-globbing, because:

1. The spy `vi.spyOn({ globSync }, 'globSync')` creates a spy on a throwaway object literal. This spy never intercepts calls to the actual `globSync` imported by `proofSummary.ts`. It's dead code.
2. Even if the spy worked, there's no `expect(spy).toHaveBeenCalledTimes(1)` or equivalent assertion. The contract specifies `test.globSpy.callCount equals 1`.

The test as written would pass identically if the cache logic were removed entirely (both calls would just re-glob and resolve the same file). The `sharedCache.get` assertion catches cache-store but not cache-read.

**Proof chain context integration:** The proof chain records a prior finding about `entry.build_concerns || []` being a defensive fallback on a guaranteed field (from "Clear the Deck Phase 2"). This build directly addresses that finding — the `|| []` is removed at line 832. The known issue about `globSync` throwing on invalid `projectRoot` (proofSummary.ts:345) remains — this build doesn't change that path and it's out of scope.

## AC Walkthrough

- **AC1:** `resolveFindingPaths` call at work.ts:831 passes `entry.modules_touched` directly without `|| []` — ✅ PASS (verified via diff)
- **AC2:** `resolveFindingPaths` call at work.ts:832 passes `entry.build_concerns` and `entry.modules_touched` directly without `|| []` — ✅ PASS (verified via diff)
- **AC3:** Both stale commit assertions removed from artifact.test.ts — ✅ PASS (grep confirms zero `.commit).toBeUndefined()` matches)
- **AC4:** `resolveFindingPaths` accepts optional `globCache` parameter defaulting to `new Map<string, string[]>` — ✅ PASS (proofSummary.ts:344)
- **AC5:** `resolveFindingPaths` checks cache before `globSync` and stores after — ✅ PASS (proofSummary.ts:357-363)
- **AC6:** `writeProofChain` creates one shared Map and passes to all calls — ✅ PASS (work.ts:828, passed to lines 831, 832, 847, 848)
- **AC7:** Test verifies repeated calls with same cache reuse glob results — ❌ FAIL — Test at proofSummary.test.ts:1275 does not assert glob call count. The spy is non-functional and no call-count assertion exists. The test proves cache-store but not cache-read.
- **AC8:** Test verifies default behavior without cache parameter — ✅ PASS (proofSummary.test.ts:1298, calls with 3 args, resolves correctly)
- **AC9:** All existing tests pass — ✅ PASS (1575 passed, 2 skipped, no regressions)
- **Tests pass:** ✅ PASS — `cd packages/cli && pnpm vitest run`: 1577 total, 1575 passed, 2 skipped
- **No build errors:** ✅ PASS — `pnpm run build` clean
- **No lint errors:** ✅ PASS — `pnpm run lint` 0 errors (14 pre-existing warnings)

## Blockers

A010 UNSATISFIED — the cache-reuse test does not assert `globSync` call count. The contract requires `test.globSpy.callCount equals 1`. The test has a spy that never intercepts calls (attached to a throwaway object) and no call-count assertion. Fix: spy on the actual `glob` module import and add `expect(spy).toHaveBeenCalledTimes(1)`.

## Findings

- **Test — Dead spy on detached object:** `packages/cli/tests/utils/proofSummary.test.ts:1277` — `vi.spyOn({ globSync }, 'globSync')` creates a spy on a fresh object literal, not on the `glob` module that `resolveFindingPaths` imports. The spy never intercepts any calls. To spy on ESM module exports, the builder needs to spy on the module object itself (e.g., `const glob = await import('glob'); vi.spyOn(glob, 'globSync')`).

- **Test — Missing call-count assertion:** `packages/cli/tests/utils/proofSummary.test.ts:1275` — The contract requires `test.globSpy.callCount equals 1`. No such assertion exists. The test proves cache-store (line 1292 asserts `sharedCache.get`) but not cache-read. Without a call-count check, the test passes even if the cache logic is deleted.

- **Test — Pre-check tag collision for A001-A009:** `packages/cli/tests/utils/proofSummary.test.ts` — Pre-check reports A001-A009 as COVERED, but the matching `@ana` tags are from prior contracts (parseFindings, extractFileRefs, generateActiveIssuesMarkdown). The builder didn't add new tags for this contract's A001-A009 assertions. The code changes themselves are correct and exercised by existing writeProofChain integration tests, but the tag linkage is coincidental. Systemic limitation — see prior proof chain note about tag collisions.

- **Code — Cache parameter widens exported function API:** `packages/cli/src/utils/proofSummary.ts:344` — `globCache` is an optional parameter with a default, so backward-compatible. But it exposes `Map<string, string[]>` as part of the public API of an exported function. Callers could pass unexpected Map implementations. Low risk — the only caller is `writeProofChain` — but worth noting for future API surface audits.

- **Code — Cache never invalidated within session:** `packages/cli/src/utils/proofSummary.ts:357-363` — The cache assumes glob results are stable for the lifetime of one `writeProofChain` call. If a file is created or deleted between `resolveFindingPaths` calls within the same invocation, stale results would be used. Practically impossible (writeProofChain doesn't create files between resolution calls) but architecturally notable as the cache grows if this function is ever called in a loop with changing filesystem state.

## Deployer Handoff

Three independent fixes. The dead fallback removal (A001-A002) and stale assertion deletion (A004) are pure cleanup — no behavioral change. The glob cache (A005-A009) is an optimization that reduces redundant filesystem scans during proof chain writes. All existing tests pass. The only issue is the A010 test which needs a working spy and call-count assertion before this ships. After that fix, this is ready to merge to main.

## Verdict
**Shippable:** NO
One contract assertion (A010) is UNSATISFIED. The glob cache implementation is correct — the test just doesn't prove it. The builder needs to fix the spy mechanism (spy on the actual module, not a detached object) and add a call-count assertion (`expect(spy).toHaveBeenCalledTimes(1)`). The remaining 11 assertions are satisfied and all other acceptance criteria pass.
