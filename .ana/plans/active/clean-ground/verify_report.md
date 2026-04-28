# Verify Report: Clean Ground for Foundation 3

**Result:** PASS
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
| A001 | Dead fallback removed from findings resolution on new entry | ✅ SATISFIED | work.ts:831 — `entry.findings, entry.modules_touched` passed directly, no `\|\| []` |
| A002 | Dead fallback removed from build concerns resolution on new entry | ✅ SATISFIED | work.ts:832 — `entry.build_concerns, entry.modules_touched` passed directly, no `\|\| []` |
| A003 | Backfill loop still guards against missing fields in historical entries | ✅ SATISFIED | work.ts:847-848 — `existing.findings \|\| []` and `existing.modules_touched \|\| []` retained |
| A004 | Both stale commit assertions are removed from artifact tests | ✅ SATISFIED | Grep for `.commit).toBeUndefined()` in artifact.test.ts: zero matches |
| A005 | Path resolver accepts an optional cache to avoid redundant filesystem scans | ✅ SATISFIED | proofSummary.ts:344 — `globCache: Map<string, string[]> = new Map()` as 4th param |
| A006 | Cache defaults to a new Map so existing callers work unchanged | ✅ SATISFIED | proofSummary.ts:344 — `= new Map()` default; test at line 1310 calls with 3 args, resolves correctly |
| A007 | Cached basenames skip the filesystem glob on subsequent lookups | ✅ SATISFIED | proofSummary.ts:357 — `globCache.get(basename)` checked before globSync |
| A008 | Glob results are stored in cache after first lookup | ✅ SATISFIED | proofSummary.ts:363 — `globCache.set(basename, globMatches)` after globSync |
| A009 | Proof chain writer shares one cache across all path resolution calls | ✅ SATISFIED | work.ts:828 — `const globCache = new Map<string, string[]>()` declared once, passed to all 4 `resolveFindingPaths` calls at lines 831, 832, 847, 848 |
| A010 | Repeated lookups for the same file hit the cache instead of re-scanning | ✅ SATISFIED | proofSummary.test.ts:1285 — `vi.spyOn(glob, 'globSync')` on the mocked module; line 1299 — `expect(spy).toHaveBeenCalledTimes(1)`. Spy intercepts real calls via `vi.mock('glob')` at file top (line 6). Both items resolve to `src/utils/helper.ts` but globSync fires once. |
| A011 | Calling the resolver without a cache still resolves files correctly | ✅ SATISFIED | proofSummary.test.ts:1310 — calls `resolveFindingPaths(items, [], tempDir)` with 3 args; asserts `items[0]!.file === 'src/utils/helper.ts'` |
| A012 | All pre-existing tests continue to pass after the changes | ✅ SATISFIED | `pnpm vitest run`: 1575 passed, 2 skipped. No regressions. |

## Independent Findings

The three code changes remain clean and surgical — no scope creep, no over-building. The diff since the last verification is confined to the test file: the builder added `vi.mock('glob')` at the module level and changed the spy from `vi.spyOn({ globSync }, 'globSync')` (detached object) to `vi.spyOn(glob, 'globSync')` (mocked module namespace). The call-count assertion `expect(spy).toHaveBeenCalledTimes(1)` is now present.

I verified the spy actually intercepts by tracing the chain: `vi.mock('glob', async (importOriginal) => { ...original })` replaces the `glob` module with a spread of originals (line 6-9), making all exports spyable. The test's `import * as glob from 'glob'` (line 10) gets the mocked namespace. `resolveFindingPaths` imports `{ globSync } from 'glob'` (proofSummary.ts:11) — same module, so the spy intercepts. The `spy.mockRestore()` at line 1301 cleans up after.

The mock approach is the standard Vitest pattern for ESM modules. Since `vi.mock` is hoisted before imports, and the factory spreads all original exports, existing tests that use `globSync` (e.g., the glob fallback tests at lines 1229-1276) still call the real implementation — the spy is scoped to the one test via `spyOn`/`mockRestore`.

**Proof chain context integration:** The prior finding about `entry.build_concerns || []` on a guaranteed field (from "Clear the Deck Phase 2") is directly addressed — the `|| []` is removed at line 832. The known `globSync` exception on invalid `projectRoot` (proofSummary.ts:345) remains unchanged and out of scope.

## Previous Findings Resolution

### Previously UNSATISFIED Assertions
| ID | Previous Issue | Current Status | Resolution |
|----|----------------|----------------|------------|
| A010 | Spy on detached object, no call-count assertion | ✅ SATISFIED | Builder added `vi.mock('glob')` for module-level mock, changed spy to `vi.spyOn(glob, 'globSync')`, added `expect(spy).toHaveBeenCalledTimes(1)` |

### Previous Findings
| Finding | Status | Notes |
|---------|--------|-------|
| Dead spy on detached object (proofSummary.test.ts:1277) | Fixed | Now uses `vi.spyOn(glob, 'globSync')` on mocked module namespace |
| Missing call-count assertion (proofSummary.test.ts:1275) | Fixed | `expect(spy).toHaveBeenCalledTimes(1)` added at line 1299 |
| Pre-check tag collision for A001-A009 | Still present | Systemic limitation — tags from prior contracts match this contract's IDs |
| Cache parameter widens exported function API | Still present | Low risk — single caller, optional param with default |
| Cache never invalidated within session | Still present | Architecturally notable, practically impossible to trigger |

## AC Walkthrough

- **AC1:** `resolveFindingPaths` call at work.ts:831 passes `entry.modules_touched` directly without `|| []` — ✅ PASS
- **AC2:** `resolveFindingPaths` call at work.ts:832 passes `entry.build_concerns` and `entry.modules_touched` directly without `|| []` — ✅ PASS
- **AC3:** Both stale commit assertions removed from artifact.test.ts — ✅ PASS (grep confirms zero `.commit).toBeUndefined()` matches)
- **AC4:** `resolveFindingPaths` accepts optional `globCache` parameter defaulting to `new Map<string, string[]>` — ✅ PASS (proofSummary.ts:344)
- **AC5:** `resolveFindingPaths` checks cache before `globSync` and stores after — ✅ PASS (proofSummary.ts:357-363)
- **AC6:** `writeProofChain` creates one shared `Map<string, string[]>` and passes to all calls — ✅ PASS (work.ts:828, passed to lines 831, 832, 847, 848)
- **AC7:** Test verifies repeated calls with same cache reuse glob results — ✅ PASS — `vi.spyOn(glob, 'globSync')` intercepts real calls; `expect(spy).toHaveBeenCalledTimes(1)` confirms second call hits cache (proofSummary.test.ts:1285-1299)
- **AC8:** Test verifies default behavior without cache parameter — ✅ PASS (proofSummary.test.ts:1310, calls with 3 args, resolves correctly)
- **AC9:** All existing tests pass — ✅ PASS (1575 passed, 2 skipped, no regressions)
- **Tests pass:** ✅ PASS — `cd packages/cli && pnpm vitest run`: 1577 total, 1575 passed, 2 skipped
- **No build errors:** ✅ PASS — `pnpm run build` clean
- **No lint errors:** ✅ PASS — `pnpm run lint` 0 errors (14 pre-existing warnings)

## Blockers

No blockers. All 12 contract assertions satisfied, all 12 ACs pass, no regressions. Checked for: unused exports in new code (globCache param is used by writeProofChain — the only intended caller), sentinel test patterns (A010 test now has real spy + real assertion), error paths that swallow silently (cache miss falls through to globSync — same behavior as before, just cached), unused parameters (globCache consumed in function body at lines 357-363).

## Findings

- **Test — Pre-check tag collision for A001-A009:** `packages/cli/tests/utils/proofSummary.test.ts` — Tags `@ana A001`–`@ana A009` in this file belong to prior contracts (parseFindings, extractFileRefs, generateActiveIssuesMarkdown). Pre-check reports COVERED for this contract's A001-A009 by coincidence. The actual code changes for those assertions are in `work.ts` and `artifact.test.ts` and are exercised by integration tests — but the tag linkage is accidental. Systemic limitation, noted in prior verification.

- **Code — Cache parameter widens exported function API:** `packages/cli/src/utils/proofSummary.ts:344` — `globCache` is optional with a default, so backward-compatible. But it exposes `Map<string, string[]>` as part of the public signature. Single caller today (`writeProofChain`), but worth noting if this function gains external consumers.

- **Code — Cache never invalidated within session:** `packages/cli/src/utils/proofSummary.ts:357-363` — Cache assumes glob results are stable for the lifetime of one `writeProofChain` call. If files were created between resolution calls, stale results would be served. Practically impossible — `writeProofChain` doesn't create files between resolution passes — but architecturally notable if usage patterns change.

- **Test — File-level vi.mock adds implicit coupling:** `packages/cli/tests/utils/proofSummary.test.ts:6-9` — `vi.mock('glob', ...)` at file scope means every test in this file uses the mocked (though real-behavior) glob module. The spread of originals makes this transparent today, but a future test that adds `.mockImplementation()` without cleanup could leak. The builder's `spy.mockRestore()` is correct practice.

## Deployer Handoff

Three independent fixes: dead fallback removal (work.ts lines 831-832), stale assertion deletion (artifact.test.ts), and glob cache optimization (proofSummary.ts + work.ts). No behavioral changes visible to users. The glob cache reduces redundant filesystem scans during proof chain writes — performance improvement on projects with many findings. The `vi.mock('glob')` in the test file is a standard Vitest ESM spy pattern; it spreads originals so all existing tests still use real globSync.

## Verdict
**Shippable:** YES
All 12 contract assertions satisfied. The previous FAIL (A010 — broken spy, missing call-count assertion) is fully resolved. The builder added the correct ESM mock pattern (`vi.mock` + spread originals + `vi.spyOn` on module namespace) and the required `toHaveBeenCalledTimes(1)` assertion. Tests pass, build clean, lint clean, no regressions.
