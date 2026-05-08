# Build Report: Ship Log Polish

**Created by:** AnaBuild
**Date:** 2026-05-08
**Spec:** .ana/plans/active/ship-log-polish/spec.md
**Branch:** feature/ship-log-polish

## What Was Built

- `packages/cli/src/types/proof.ts` (modified): Added `kind?: 'feature' | 'fix' | 'chore' | undefined` to `ProofChainEntry` interface next to `scope_summary`
- `packages/cli/src/utils/proofSummary.ts` (modified): Added `kind` to `ProofSummary` interface, added `extractScopeKind()` function following `extractScopeSummary()` pattern, wired `extractScopeKind()` call in `generateProofSummary()`
- `packages/cli/src/commands/work.ts` (modified): Added `kind: proof.kind` to entry construction next to `scope_summary`
- `website/lib/copy.ts` (modified): Updated `headTitle` to "Every change has *receipts*.", `footSource` to "PROOF_CHAIN.md", `footLink` to point to GitHub blob URL with "Full proof chain →" label
- `website/components/proof-feed/ProofFeed.tsx` (modified): Added `kindLabel()` function (feature→"feature", fix→"fix", chore→"improve"), updated collapsed header to "{n} verified changes", replaced tag display to use `kindLabel()`
- `website/components/proof-feed/proof-feed.module.css` (modified): Widened kind column from 54px to 62px in both desktop and mobile grid-template-columns
- `website/lib/proof-feed.ts` (modified): Added `kind?: string` to `ProofChainEntry` interface, added `resolveKind()` helper that prefers explicit kind and falls back to slug heuristic
- `packages/cli/templates/.claude/agents/ana.md` (modified): Added `- **Kind:** feature / fix / chore` as first bullet in Complexity Assessment
- `.claude/agents/ana.md` (modified): Same Kind line added to dogfood copy

## PR Summary

- Add `kind` classification field to the proof chain, parsed from scope.md's `**Kind:**` line at scope time
- Update ship log copy: "receipts" not "commits", link to PROOF_CHAIN.md, tags display as feature/fix/improve
- Wire kind through ProofSummary → ProofChainEntry → website display with slug-heuristic fallback for old entries
- Add 7 unit tests for `extractScopeKind()` parser covering valid values, case insensitivity, and error cases

## Acceptance Criteria Coverage

- AC1 "headTitle reads 'Every change has receipts'" → copy.ts line 224, verified via build (no test — website has no test suite)
- AC2 "Source of truth link points to PROOF_CHAIN.md" → copy.ts line 228, href contains "PROOF_CHAIN.md"
- AC3 "Tags display as feature/fix/improve, never 'new'" → ProofFeed.tsx kindLabel() function
- AC4 "Expanded header says '{n} verified changes'" → ProofFeed.tsx line 43
- AC5 "template includes Kind in Complexity Assessment" → packages/cli/templates/.claude/agents/ana.md line 189
- AC6 "dogfood copy has same Kind line" → .claude/agents/ana.md line 189
- AC7 "extractScopeKind() exists, returns parsed kind or undefined" → proofSummary.ts:423-441, tested in proofSummary.test.ts
- AC8 "ProofSummary has kind field" → proofSummary.ts line 67
- AC9 "ProofChainEntry has kind field" → proof.ts line 66
- AC10 "writeProofChain writes kind" → work.ts line 839 `kind: proof.kind`
- AC11 "generateProofSummary calls extractScopeKind" → proofSummary.ts line 1814
- AC12 "scope with Kind: fix → kind: 'fix'" → proofSummary.test.ts "parses fix from Kind line"
- AC13 "scope missing Kind → kind: undefined" → proofSummary.test.ts "returns undefined when Kind line is missing"
- AC14 "existing entries without kind still display" → proof-feed.ts resolveKind() falls back to slug heuristic
- AC15 "mapEntry prefers explicit kind" → proof-feed.ts resolveKind() checks entry.kind first
- AC16 "kindLabel mapping" → ProofFeed.tsx kindLabel()
- AC17 "ProofEntry interface includes kind" → proof-feed.ts line 146 `kind?: string`
- Tests pass ✅ (2020 passed)
- No build errors ✅

## Implementation Decisions

- Created `resolveKind()` as a separate helper in proof-feed.ts rather than inlining the logic in `mapEntry()`. Follows separation of concerns and makes the fallback behavior explicit and testable if website tests are added later.
- Used a line-based regex `\*\*Kind:\*\*\s*(.+)` rather than section-scoped matching for `extractScopeKind()`. The spec noted this is acceptable ("if the regex is line-based this is acceptable to match anywhere — document the choice"). Simpler and still correct since `**Kind:**` is only expected in the Complexity Assessment section.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
 Test Files  96 passed (96)
      Tests  2013 passed | 2 skipped (2015)
   Duration  36.20s
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
 Test Files  96 passed (96)
      Tests  2020 passed | 2 skipped (2022)
   Duration  35.48s
```

### Comparison
- Tests added: 7
- Tests removed: 0
- Regressions: none

### New Tests Written
- `packages/cli/tests/utils/proofSummary.test.ts`: extractScopeKind describe block — parses feature/fix/chore, case-insensitive handling, rejects invalid values, handles missing Kind line, handles missing scope file

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
de10619 [ship-log-polish] Add Kind classification to scope templates
15c04ad [ship-log-polish] Update website copy, tags, and kind resolution
1d4a658 [ship-log-polish] Add extractScopeKind unit tests
6e95e7c [ship-log-polish] Add kind field to CLI types, parser, and wiring
```

## Open Issues

- `extractScopeKind()` regex matches `**Kind:**` anywhere in the file, not scoped to the Complexity Assessment section. If `**Kind:**` appears in another section (unlikely given template structure), it would still match. Spec explicitly permits this ("if the regex is line-based this is acceptable").
- Pre-existing lint warning in `git-operations.ts:169` (unused eslint-disable directive) — not introduced by this build.
- Website has no test suite. AC1-AC5, AC14-AC16, AC20-AC22 are verified by successful build and code inspection only.

Verified complete by second pass.
