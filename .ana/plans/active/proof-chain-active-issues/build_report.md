# Build Report: Proof chain active issues index

**Created by:** AnaBuild
**Date:** 2026-04-16
**Spec:** .ana/plans/active/proof-chain-active-issues/spec.md
**Branch:** feature/proof-chain-active-issues

## What Was Built

- **packages/cli/src/utils/proofSummary.ts** (modified): Added `extractFileRefs()` function to extract file references (e.g., `projectKind.ts:105`) from callout summary text. Added `generateActiveIssuesMarkdown()` function that groups callouts by file, caps at 20 (FIFO), and renders markdown with file headings. Callouts without file refs appear under "General".

- **packages/cli/src/commands/work.ts** (modified): Changed `writeProofChain()` from append-only to full regeneration. Now imports `generateActiveIssuesMarkdown` and rebuilds PROOF_CHAIN.md entirely from proof_chain.json on each `ana work complete`. Added defensive handling for older entries without callouts/assertions fields.

- **packages/cli/tests/utils/proofSummary.test.ts** (modified): Added 20 new tests covering all 16 contract assertions plus additional edge cases (deduplication, ordering, extension handling).

## PR Summary

- PROOF_CHAIN.md now regenerates entirely on each `ana work complete`, adding an "Active Issues" index at the top
- Callouts are grouped by file reference (extracted from summary text like `projectKind.ts:105`)
- Index caps at 20 callouts with FIFO eviction of oldest; callouts without file refs go under "General"
- Older proof chain entries without callouts/assertions fields are handled gracefully

## Acceptance Criteria Coverage

- AC1 "PROOF_CHAIN.md has an Active Issues section" → proofSummary.test.ts:561 "output starts with Active Issues heading" (1 assertion) // @ana A012
- AC2 "Active Issues groups callouts by file" → proofSummary.test.ts:518 "groups callouts by extracted file ref" (1 assertion) // @ana A007
- AC3 "Each callout shows category, summary, feature name" → proofSummary.test.ts:553 "includes feature name in each entry" + proofSummary.test.ts:583 "callout entry includes category" // @ana A011, A015
- AC4 "Maximum 20 callouts appear" → proofSummary.test.ts:534 "respects 20-callout cap" (1 assertion) // @ana A009
- AC5 "Callouts without file refs under General" → proofSummary.test.ts:528 "places callouts without refs under General" (1 assertion) // @ana A008
- AC6 "ana work complete regenerates Active Issues" → Covered by writeProofChain refactor + existing work.test.ts proof chain tests
- AC7 "Existing chronological history is preserved" → Covered by full regeneration including reversed entries
- AC8 "Empty Active Issues renders cleanly" → proofSummary.test.ts:545 "returns empty-state message when no callouts" (1 assertion) // @ana A010
- Tests pass → 1157 tests passed
- No TypeScript errors → pnpm run build succeeds
- Lint passes → pnpm run lint succeeds

## Implementation Decisions

1. **Extension ordering in regex**: Longer extensions (tsx, jsx, json, yaml) must come before shorter prefixes (ts, js, yml) to avoid partial matches. Discovered through failing tests.

2. **Optional fields handling**: Older proof chain entries may lack `callouts`, `assertions`, `timing`, etc. Added defensive defaults (`|| []`, `|| {}`) in both `generateActiveIssuesMarkdown` and `writeProofChain` to prevent crashes.

3. **FIFO ordering**: Entries are stored oldest-first in JSON. To cap at 20 most recent, we reverse the array, take slice(0, 20), then process. This keeps newest callouts.

4. **Multi-file callouts**: A callout referencing multiple files (e.g., "spans fileA.ts and fileB.ts") appears under BOTH file headings but counts as one toward the 20-cap.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  86 passed (86)
     Tests  1137 passed (1137)
  Duration  14.75s
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  86 passed (86)
     Tests  1157 passed (1157)
  Duration  17.78s
```

### Comparison
- Tests added: 20
- Tests removed: 0
- Regressions: none

### New Tests Written
- proofSummary.test.ts: 8 tests for `extractFileRefs()` (filename:line, ranges, multiple refs, various extensions, empty cases, deduplication)
- proofSummary.test.ts: 12 tests for `generateActiveIssuesMarkdown()` (grouping, General heading, cap enforcement, empty state, feature names, heading format, separator, multi-file callouts, category bold, truncation, ordering, FIFO recency)

## Verification Commands
```bash
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
5608448 [proof-chain-active-issues] Regenerate PROOF_CHAIN.md with Active Issues section
74c78d6 [proof-chain-active-issues] Add extractFileRefs and generateActiveIssuesMarkdown utilities
```

## Open Issues

None — verified by second pass.
