# Scope: Proof chain active issues index

**Created by:** Ana
**Date:** 2026-04-16

## Intent

Surface callouts from the proof chain in a file-organized index at the top of PROOF_CHAIN.md so agents can immediately find relevant issues when scoping work on specific files. Currently callouts are captured but buried in chronological entries — finding issues for `scan-engine.ts` requires reading through all history hoping to spot mentions.

## Complexity Assessment

- **Size:** small
- **Files affected:**
  - `packages/cli/src/commands/work.ts` (modify `writeProofChain`)
  - `packages/cli/src/utils/proofSummary.ts` (add file-ref parser, possibly)
  - `packages/cli/tests/utils/proofSummary.test.ts` or new test file
- **Blast radius:** Low. Changes are additive to the proof chain write path. No changes to how callouts are captured or stored in JSON.
- **Estimated effort:** 2-3 hours
- **Multi-phase:** no

## Approach

Parse file references from existing callout summary text and build a grouped index. On each `ana work complete`, regenerate PROOF_CHAIN.md with an "Active Issues" section at the top (grouped by file), followed by the existing chronological history. Cap the index at 20 entries using FIFO — oldest entries drop off when the cap is hit.

The index reads from `proof_chain.json` which already stores callouts with category and summary. File references are extracted via regex from the summary text (patterns like `filename.ts:123` or `filename.ts`). Callouts without parseable file refs appear under "General".

## Acceptance Criteria

- AC1: PROOF_CHAIN.md has an "Active Issues" section before the chronological entries
- AC2: Active Issues groups callouts by file, with file path as the heading
- AC3: Each callout entry shows: category, summary snippet, and source feature name
- AC4: Maximum 20 callouts appear in Active Issues (oldest drop off when cap exceeded)
- AC5: Callouts without file references appear under a "General" heading
- AC6: Running `ana work complete` regenerates the Active Issues section from proof_chain.json
- AC7: Existing chronological history is preserved below the index
- AC8: Empty Active Issues section (no callouts in chain) renders cleanly without errors

## Edge Cases & Risks

- **Multiple file refs in one callout:** Callout appears under each file it references. Display deduplicates if same callout would appear multiple times in one file group.
- **File ref parsing misses:** Regex won't catch every format. Acceptable — unmatched callouts go to General. Can refine pattern over time.
- **Very long callout summaries:** Already capped at 200 chars during capture. Index display can truncate further if needed.
- **Concurrent writes:** Not a concern — `ana work complete` is single-threaded and runs serially.
- **Large proof chain:** 20-entry cap keeps index readable regardless of history size.

## Rejected Approaches

1. **Auto-resolve callouts when file is touched** — Rejected because touching a file doesn't mean the callout was addressed. Would silently drop real issues.

2. **Capture file refs structurally at verify time** — Cleaner long-term but adds scope to AnaVerify and changes the callout data model. Parsing from text works with existing data immediately. Can add structured capture later if parsing proves too fragile.

3. **Store index separately from PROOF_CHAIN.md** — Agents already read PROOF_CHAIN.md. Adding another file fragments context. Single file is simpler.

## Open Questions

- Best regex pattern for file refs — Plan should investigate actual callout text patterns in existing verify reports.

## Exploration Findings

### Patterns Discovered

- `writeProofChain()` in work.ts (lines 699-791) currently appends to PROOF_CHAIN.md via `fsPromises.appendFile`. Will change to read-modify-write.
- Callouts are parsed in `proofSummary.ts:parseCallouts()` (lines 249-289) which extracts category and summary from verify report's `## Callouts` section.
- `ProofChainEntry` type (proof.ts:16-38) already includes `callouts: Array<{ category: string; summary: string }>`.

### Constraints Discovered

- [TYPE-VERIFIED] ProofChainEntry.callouts (proof.ts:35) — Array of {category, summary}, no file field currently
- [OBSERVED] Callout summaries include file:line refs like `projectKind.ts:105` embedded in text
- [OBSERVED] Summaries capped at 200 chars during parseCallouts()

### Test Infrastructure

- `proofSummary.test.ts` exists for parseCallouts testing
- work.test.ts covers work command but may not have proof chain write tests

## For AnaPlan

### Structural Analog

`writeProofChain()` in `packages/cli/src/commands/work.ts` — this is the exact function being modified. Current append-only pattern becomes read-modify-write.

### Relevant Code Paths

- `packages/cli/src/commands/work.ts:699-791` — writeProofChain function
- `packages/cli/src/commands/work.ts:776-782` — current callout digest logic (top 5 in markdown)
- `packages/cli/src/utils/proofSummary.ts:249-289` — parseCallouts function
- `packages/cli/src/types/proof.ts:16-38` — ProofChainEntry type

### Patterns to Follow

- Callout parsing pattern in proofSummary.ts
- File content regeneration patterns elsewhere in codebase (check init/ for examples)

### Known Gotchas

- PROOF_CHAIN.md uses `##` for entry headings — Active Issues section should use same or compatible heading level
- Existing entries are date-stamped `## Feature Name (YYYY-MM-DD)` — index section needs clear separator

### Things to Investigate

- Should the file grouping show relative paths or just filenames? (e.g., `packages/cli/src/commands/work.ts` vs `work.ts`)
- What heading level for the Active Issues section? `#` would make it top-level above all `##` entries.
