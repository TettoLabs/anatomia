# Scope: Fix pipeline timing accuracy for multi-phase and rejection cycles

**Created by:** Ana
**Date:** 2026-05-13

## Intent

Pipeline timing records inaccurate build/verify splits for any proof with multi-phase builds or rejection cycles. A 3-phase, 108-minute pipeline run (content-pages) initially recorded 0 minutes due to a key-lookup bug. The hotfix (`getLatestTime`) fixed the lookup but still produces wrong splits: for dynamic-pages (2 phases), it records build=56m/verify=41m when the accurate values are build=46m/verify=22m. The same conflation affects all 19 rejected proofs (21% of the chain). The total is always correct — it's the build/verify attribution that's wrong, with verify time counted as build time.

This matters because timing feeds proof chain health analysis. If build time is systematically inflated and verify time deflated, trend analysis misrepresents where pipeline time actually goes.

## Complexity Assessment
- **Kind:** fix
- **Size:** medium — 2 files changed (artifact.ts, proofSummary.ts), 1 type interface updated in each, 1 new computation path
- **Files affected:**
  - `packages/cli/src/commands/artifact.ts` — `writeSaveMetadata()` (line 45-77)
  - `packages/cli/src/utils/proofSummary.ts` — `SaveEntry` interface (line 92), `SavesData` interface (line 121), `computeTiming()` (line 1501-1609)
- **Blast radius:** 4 files read saves.json (`artifact.ts`, `work.ts`, `proofSummary.ts`, `verify.ts`). Only `artifact.ts` (write path) and `proofSummary.ts` (computation) change. `work.ts` reads `build-report`/`verify-report` for completeness checks — schema is additive so no breakage. `verify.ts` reads `saves['contract'].hash` — unchanged.
- **Estimated effort:** 2-3 hours plan+build+verify
- **Multi-phase:** no

## Approach

Two changes that work together:

**Preserve timestamp history on overwrite.** When `writeSaveMetadata()` overwrites an artifact entry (rejection re-save), push the old `{ saved_at, hash }` to a `history` array on the entry before writing the new values. Old saves.json files without `history` work identically — the field is additive. This captures the data that's currently lost on rejection.

**Compute accurate build/verify splits from per-phase and per-cycle data.** Replace the endpoint-subtraction model in `computeTiming()` with segment-based computation that handles three cases:
1. Single-spec, no rejection — unchanged (no history, no numbered keys)
2. Multi-phase — sum per-phase segments from existing numbered keys (`build-report-1`, `verify-report-1`, etc.)
3. Rejection with history — reconstruct segments from history entries + current entries

Phase boundaries are derived from artifact timestamps (preceding verify-report for build start, build-report for verify start), not from `_started_at` values. The output remains the flat `{ total_minutes, think, plan, build, verify }` schema — no proof chain schema change.

## Acceptance Criteria
- AC1: `writeSaveMetadata()` preserves the previous `{ saved_at, hash }` in a `history` array when overwriting an artifact entry with different content
- AC2: `SaveEntry` type includes optional `history?: Array<{ saved_at: string; hash: string }>` in both `artifact.ts` and `proofSummary.ts`
- AC3: `computeTiming()` produces accurate build/verify splits for multi-phase builds by summing per-phase segments from numbered keys
- AC4: `computeTiming()` produces accurate build/verify splits for rejection cycles when history data is available
- AC5: `computeTiming()` falls back to existing endpoint-subtraction for old proofs without history or numbered keys (backward compatibility)
- AC6: Existing tests pass, new tests cover multi-phase timing, rejection timing with history, and mixed scenarios
- AC7: The proof chain timing schema (`{ total_minutes, think, plan, build, verify }`) is unchanged — no downstream consumer breaks

## Edge Cases & Risks

**Idempotent re-save.** `writeSaveMetadata()` already skips writes when the hash matches (line 64-66). History should NOT be appended on idempotent no-ops — only when the content actually changes. The existing hash guard handles this naturally (no overwrite = no history push).

**Multi-phase with rejection.** A phase could have its own rejection cycle (e.g., `build-report-2` re-saved after FAIL on phase 2). The history array composes: `build-report-2` would have its own `history` entry. The segment computation must handle this: check each numbered key for history.

**Missing intermediate data.** 19 existing rejected proofs have no history (timestamps already lost). The computation must fall back gracefully — these proofs keep their current (inaccurate) splits. No retroactive correction attempted.

**`build_started_at` phantom overwrite.** Known defect in work.ts resume detection: when resuming for Verify after a fix build, the code still detects the old FAIL report and force-overwrites `build_started_at` to a time after the build-report was saved. The history-based computation sidesteps this by deriving phase boundaries from artifact timestamps, not `_started_at`. This defect is not fixed in this scope — it's a separate work.ts concern.

**`verify_started_at` write-once asymmetry.** `verify_started_at` is write-once (never force-overwritten), so it always points to the first verify start. For multi-phase, it spans all subsequent phases. The new segment computation doesn't rely on `verify_started_at` for splits — it uses per-phase artifact timestamps. The `_started_at` values remain available as fallback anchors for the existing computation path.

**Phase numbering vs revision numbering.** Multi-phase uses numbered keys (`build-report-1`, `build-report-2`). The history array is per-key, not a separate numbering scheme. No namespace collision — `build-report-1.history[0]` is the previous version of phase 1's build report, not phase 0.

## Rejected Approaches

**Revision-numbered keys (`build-report-r1`).** Adds keys like `build-report-r1` for rejected artifacts. Rejected because it pollutes the key namespace and creates ambiguity between phase numbers and revision numbers (`build-report-1` vs `build-report-r1` vs `build-report-1-r1`). The history array is self-contained per key.

**Event log model.** A top-level `events` array recording every timestamp in order. Conceptually simpler but changes the saves.json model from "current state with keys" to "event stream." Every reader would need to understand the new model. The history array preserves the key-based model — readers that don't know about history still work.

**Per-phase `_started_at` timestamps.** Adding `build_started_at_1`, `build_started_at_2` etc. Rejected because artifact `saved_at` timestamps from the preceding phase provide the same information without new recording. `contract.saved_at` anchors the first build start; `verify-report-N.saved_at` anchors the next build start.

**Fix `build_started_at` phantom overwrite in this scope.** The resume detection in work.ts:1725-1744 overwrites `build_started_at` even when the fix build is already complete. Deferred because the history-based computation sidesteps it, and the fix involves work.ts resume logic which is a separate blast radius.

**Backfill old rejected proofs from git history.** Intermediate timestamps exist in git commits (`git show <sha>:.saves.json`). Rejected because extraction is fragile, the inaccuracy in old proofs is minor, and the effort isn't justified for historical data.

## Open Questions

None — all questions from the requirements doc are resolved:
1. Per-phase `_started_at` → derive from preceding artifact (rejected approach above)
2. History depth cap → no cap needed (rejections are rare, data is ~100 bytes per cycle)
3. Always attempt accurate computation → yes, with graceful fallback for old entries
4. Backfill old proofs → no (data lost, not worth git archaeology)
5. Gantt expansion → separate scope (Layer 3, depends on this scope)

## Exploration Findings

### Patterns Discovered
- `writeSaveMetadata()` (artifact.ts:45-77): read-modify-write with hash-based idempotency. The overwrite happens at line 70 — simple `saves[artifactType] = { saved_at, hash }`. History push inserts before this line.
- `computeTiming()` (proofSummary.ts:1501-1609): three-tier computation — `_started_at` preferred, artifact-gap fallback, with `MAX_PHASE_MS` (24h) sanity guard. The `getLatestTime` hotfix at line 1515-1531 correctly handles multi-phase key lookup but only returns the latest timestamp, losing per-phase granularity.
- `archivePreviousVersion()` (artifact.ts:183-231): preserves report FILE content as `_r1`, `_r2` etc. Complementary to history array — archives content, history tracks timestamps.

### Constraints Discovered
- [TYPE-VERIFIED] SaveEntry duplicated (proofSummary.ts:92, artifact.ts:31) — two independent interfaces for the same shape. Both need `history` field added.
- [TYPE-VERIFIED] SavesData index signature (proofSummary.ts:127) — `[key: string]: SaveEntry | PreCheckData | undefined`. History on SaveEntry flows through automatically.
- [OBSERVED] `_started_at` are raw ISO strings, not SaveEntry objects — history array doesn't apply to them. Segment computation uses artifact timestamps instead.
- [OBSERVED] 19 rejected proofs have 1 cycle each, none have 2+. Max realistic history depth is 1-2 entries.

### Test Infrastructure
- `packages/cli/tests/utils/proofSummary.test.ts` — timing tests use mock saves.json objects passed to computeTiming. New test cases add numbered keys and history arrays to mock data.

## For AnaPlan

### Structural Analog
`archivePreviousVersion()` in artifact.ts:183-231 — same shape: detect a previous version exists, preserve it before overwriting. Different mechanism (file copy vs array push), same intent (don't lose data on replacement).

### Relevant Code Paths
- `packages/cli/src/commands/artifact.ts:45-77` — `writeSaveMetadata()`, the single write path for artifact entries. History push goes here.
- `packages/cli/src/commands/artifact.ts:31-34` — `SaveMetadata` interface, needs `history` field.
- `packages/cli/src/utils/proofSummary.ts:92-96` — `SaveEntry` interface, needs `history` field.
- `packages/cli/src/utils/proofSummary.ts:1501-1609` — `computeTiming()`, the full timing computation. New multi-phase and rejection segment logic goes here.
- `packages/cli/src/utils/proofSummary.ts:1515-1531` — `getLatestTime()` hotfix. Plan decides: keep alongside new computation, or subsume.

### Patterns to Follow
- `writeSaveMetadata()` existing read-modify-write pattern with idempotent hash check
- `computeTiming()` existing fallback chain (`_started_at` → artifact-gap → skip)
- Test mocks in `proofSummary.test.ts` — construct saves data objects inline

### Known Gotchas
- `SaveMetadata` (artifact.ts:31) and `SaveEntry` (proofSummary.ts:92) are separate types for the same shape. Both must gain `history`. Consider whether Plan should unify them or keep them separate (they're in different packages/layers — artifact is write-side, proofSummary is read-side).
- The `getLatestTime` regex at line 1523 (`key.startsWith(baseKey + '-') && /\d+$/.test(key)`) would also match hypothetical keys like `build-report-data-1`. Currently no such keys exist, but if Plan consolidates lookup logic, verify the regex is specific enough.
- `build-data-N` and `verify-data-N` keys exist in saves.json (companion data files). These are NOT timing-relevant — they share the same `saved_at` as their parent report. Don't include them in segment computation.

### Things to Investigate
- Should the multi-phase segment computation handle the case where phase N has a rejection cycle (numbered key with history)? The scope says yes, but Plan should assess whether this combination actually occurs in practice and decide how much defensive code to write vs. handling it when it happens.
- The `MAX_PHASE_MS` (24h) sanity guard — should it apply to individual segments or only to the total? A segment > 24h probably indicates stale data, not a real 24-hour build.
