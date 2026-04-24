# Scope: Add file field to proof chain callouts

**Created by:** Ana
**Date:** 2026-04-23

## Intent
File association for callouts is derived from summary text via regex (`extractFileRefs`) every time the renderer groups callouts for Active Issues. The parser sees the full callout context but throws away file information. The renderer re-derives it. Downstream features (proof file queries, proof learn matching, resolution detection) would all need the same regex inference.

Store `file: string | null` on each callout at parse time. The renderer reads the field directly. A one-time dev-time migration backfills existing `proof_chain.json` entries. No backward compatibility — we migrate once and only support the new format.

## Complexity Assessment
- **Size:** small
- **Files affected:** 4 source files, 1 test file, 1 data file
  - `packages/cli/src/utils/proofSummary.ts` — `parseCallouts()` return type, `CalloutWithFeature`, `ProofChainEntryForIndex`, `generateActiveIssuesMarkdown()`
  - `packages/cli/src/types/proof.ts` — `ProofChainEntry.callouts` type
  - `packages/cli/tests/utils/proofSummary.test.ts` — `parseCallouts` and `generateActiveIssuesMarkdown` test updates
  - `.ana/proof_chain.json` — backfilled with `file` field on existing callouts
- **Blast radius:** Low. The callout type is used in `proofSummary.ts`, `proof.ts` (types), and `work.ts` (entry construction). No external consumers.
- **Estimated effort:** ~1 hour
- **Multi-phase:** no

## Approach
Extract file association once at parse time instead of re-deriving it at render time. `parseCallouts()` calls `extractFileRefs()` on each assembled summary and stores the first match (or null) as `file`. The renderer switches from calling `extractFileRefs(callout.summary)` to reading `callout.file`. Migration is a dev-time script run once against our `proof_chain.json`, committed as part of this change.

## Acceptance Criteria
- AC1: `parseCallouts()` returns `Array<{ category: string; summary: string; file: string | null }>` — file is the first file ref from the summary text, or null when no file ref is found.
- AC2: `ProofChainEntry.callouts` type includes `file: string | null`.
- AC3: `generateActiveIssuesMarkdown()` groups callouts by `callout.file` (falling back to "General" when null) instead of calling `extractFileRefs()`.
- AC4: `.ana/proof_chain.json` entries are backfilled — every existing callout has a `file` field.
- AC5: All existing `parseCallouts` and `generateActiveIssuesMarkdown` tests pass with updated assertions.
- AC6: `extractFileRefs` remains exported and its tests unchanged.

## Edge Cases & Risks
- Callouts with multiple file refs: `parseCallouts` takes the first ref (matching current `generateActiveIssuesMarkdown` behavior at line 353). The summary still contains all refs as text.
- Callouts with no file refs in summary text: `file` is `null`. Renderer groups these under "General" — same as current behavior.
- `extractFileRefs` regex edge cases (URL-like paths, bare filenames) are already handled and don't change — the function is reused, not rewritten.

## Rejected Approaches
- **Lazy caching on read:** Keep current structure, cache `extractFileRefs` results in the renderer. Avoids schema change but is scaffolding — downstream features still need the field. Delays the real fix without saving meaningful work.
- **Runtime migration in `work complete`:** Detect old-format callouts at write time and backfill. Unnecessary complexity — we control the data, can migrate once, and never ship old-format entries to users.
- **Separate `ana proof migrate` CLI command:** Over-engineering for a one-time dev operation on a single JSON file.

## Open Questions
None. Migration strategy is confirmed: dev-time one-liner, committed with the change.

## Exploration Findings

### Patterns Discovered
- `parseCallouts()` (proofSummary.ts:406-466): line-by-line parser with `flushCallout()` accumulator. File extraction fits naturally at flush time — call `extractFileRefs()` on the assembled summary before pushing to results.
- `extractFileRefs()` (proofSummary.ts:249-264): already exists, exported, tested independently. Matches `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.yaml`, `.yml`, `.md` with optional line numbers. Returns unique filenames. Takes first match — same semantics needed here.
- `generateActiveIssuesMarkdown()` (proofSummary.ts:294-390): calls `extractFileRefs(callout.summary)` at line 343 to group callouts by file. This is the call that becomes a field read.
- `CalloutWithFeature` (proofSummary.ts:270-274): internal interface used by renderer. Needs `file` field added.
- `ProofChainEntryForIndex` (proofSummary.ts:279-283): minimal interface for renderer input. Needs callout type updated.

### Constraints Discovered
- [TYPE-VERIFIED] `ProofChainEntry.callouts` (types/proof.ts:42) — `Array<{ category: string; summary: string }>`. The cross-cutting comment at line 17-22 documents that adding a field requires changes in 4+ locations.
- [OBSERVED] `ProofSummary.callouts` (proofSummary.ts:70) — same type, defined independently on the `ProofSummary` interface. Must stay in sync with `ProofChainEntry.callouts`.
- [OBSERVED] Existing proof_chain.json has 8 entries, 4 with callouts (21 total callouts). Migration is trivial.

### Test Infrastructure
- `proofSummary.test.ts`: 15 tests for `parseCallouts`, 15 tests for `generateActiveIssuesMarkdown`. Tests construct inline callout objects with `{ category, summary }` — all need `file` field added. `parseCallouts` tests verify against parsed output — assertions need to check `file` values.

## For AnaPlan

### Structural Analog
`parseRejectionCycles()` in the same file (proofSummary.ts:468+) — same pattern of parsing a verify report section and returning structured data. But the closer analog for the change shape is the `proof-chain-active-issues` completed plan — it added `callouts`, `rejection_cycles`, and `previous_failures` fields to the same type in the same cross-cutting pattern.

### Relevant Code Paths
- `packages/cli/src/utils/proofSummary.ts:249-264` — `extractFileRefs()`, reused by `parseCallouts`
- `packages/cli/src/utils/proofSummary.ts:266-390` — `CalloutWithFeature`, `ProofChainEntryForIndex`, `generateActiveIssuesMarkdown()`
- `packages/cli/src/utils/proofSummary.ts:406-466` — `parseCallouts()`
- `packages/cli/src/utils/proofSummary.ts:70` — `ProofSummary.callouts` type
- `packages/cli/src/types/proof.ts:42` — `ProofChainEntry.callouts` type
- `packages/cli/src/commands/work.ts:20` — imports `generateActiveIssuesMarkdown`
- `.ana/proof_chain.json` — 8 entries, 21 callouts to backfill

### Patterns to Follow
- Cross-cutting field addition pattern documented in `types/proof.ts:17-22`
- `flushCallout()` accumulator pattern in `parseCallouts()` — add `extractFileRefs` call inside flush

### Known Gotchas
- `ProofSummary.callouts` (proofSummary.ts:70) and `ProofChainEntry.callouts` (types/proof.ts:42) define the same shape independently. Both must be updated. The cross-cutting comment only mentions `ProofChainEntry`.
- Test callout objects are constructed inline throughout `generateActiveIssuesMarkdown` tests — ~15 instances of `{ category: string, summary: string }` that all need `file` added.

### Things to Investigate
- Whether `generateActiveIssuesMarkdown` should use `callout.file ?? extractFileRefs(callout.summary)[0]` as a defensive fallback, or trust the field unconditionally. Scope says trust unconditionally (no backward compat), but Plan should confirm this is safe given the test infrastructure.
