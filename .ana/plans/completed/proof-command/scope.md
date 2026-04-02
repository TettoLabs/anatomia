# Scope: ana proof {slug}

**Created by:** Ana
**Date:** 2026-04-01

## Intent
Add a command that renders a terminal card showing the proof summary for a completed work item. After `ana work complete` archives a slug, developers and stakeholders need a quick way to see what was verified — contract compliance, timing, and any deviations. The card should be readable by a founder who's never seen the contract file: human-readable `says` text leads, not assertion IDs.

## Complexity Assessment
- **Size:** small
- **Files affected:** 2-3 files (new command file, index.ts registration, test file)
- **Blast radius:** None — new command, no modifications to existing behavior
- **Estimated effort:** 1-2 hours
- **Multi-phase:** no

## Approach
New standalone command `ana proof {slug}` following the `ana scan` terminal styling pattern. Reads `.ana/proof_chain.json`, finds the entry matching the slug, and renders a box-drawn card with:
- Header with command name + feature name + completion date
- Contract section: assertions listed by `says` text with status icons (✓/✗/⚠)
- Summary line: X/Y satisfied, N deviations
- Timing section: total pipeline time + per-phase breakdown if available
- Deviations section (if any): what was done instead, per deviation

The `--json` flag outputs the raw entry from proof_chain.json for programmatic use.

## Acceptance Criteria
- AC1: `ana proof {slug}` reads proof_chain.json and displays a terminal card for the matching entry
- AC2: Assertions display with `says` text as headline, status icon prefix (✓ SATISFIED, ✗ UNSATISFIED, ⚠ DEVIATED)
- AC3: Contract summary shows satisfied/total count and deviation count
- AC4: Timing section shows total_minutes and per-phase breakdown when available
- AC5: Deviations section lists each deviation with contract says text and "instead" description
- AC6: `--json` flag outputs the raw proof chain entry as JSON
- AC7: Helpful error when slug not found or proof_chain.json missing
- AC8: Terminal styling matches ana scan (box-drawing chars, chalk colors, section headers with horizontal rules)

## Edge Cases & Risks
- **Slug not found:** Entry may not exist — return clear error with guidance
- **Empty proof_chain.json:** File exists but entries array is empty — same as "not found"
- **Missing optional fields:** timing breakdown fields are optional — render gracefully when absent
- **Zero deviations:** Don't show deviations section if none exist
- **Long says text:** May need truncation or wrapping for very long assertion descriptions

## Rejected Approaches
- **Subcommand of `ana work`:** `ana work proof {slug}` is longer and conceptually wrong — proof is a view into history, not work management. Standalone `ana proof` is cleaner.
- **Support `--latest` flag:** Would show most recent entry. Adds complexity, can extend later if needed. Slug-only matches how we reference work elsewhere.
- **Read from completed directory:** Could parse artifacts directly, but proof_chain.json already contains the aggregated summary — don't duplicate work.

## Open Questions
None — data format is documented in SCHEMAS.md, styling reference is clear in scan.ts.

## Exploration Findings

### Patterns Discovered
- `scan.ts` (lines 197-204): BOX constant with box-drawing characters for terminal cards
- `scan.ts` (lines 541-652): `formatHumanReadable()` pattern — builds lines array, uses chalk for colors, sections with headers and horizontal rules
- `work.ts` (lines 652-676): `ProofChainEntry` interface matches proof_chain.json structure
- `proofSummary.ts` (lines 16-69): `ProofSummary` and related interfaces define all the data fields

### Constraints Discovered
- [TYPE-VERIFIED] ProofChainEntry (work.ts:652-676) — exact structure of proof_chain.json entries including assertions array with id/says/status/deviation fields
- [TYPE-VERIFIED] Assertions have `says` field (string) and `status` field (SATISFIED/UNSATISFIED/DEVIATED/UNCOVERED)
- [OBSERVED] proof_chain.json location is `.ana/proof_chain.json` (work.ts:691)

### Test Infrastructure
- `scan.test.ts`: Uses temp directories, `runScan()` helper executes CLI via execSync, tests both terminal and JSON output modes
- Pattern: `createTestFiles()` helper, separate describe blocks for each feature area

## For AnaPlan

### Structural Analog
`scan.ts` — standalone read-only command with terminal card output, `--json` flag, box-drawing styling, chalk colors, section-based layout. Same I/O pattern: read data source, format for display, no side effects.

### Relevant Code Paths
- `packages/cli/src/commands/scan.ts` — terminal card formatting, BOX constant, chalk usage
- `packages/cli/src/commands/work.ts` — ProofChainEntry interface, proof_chain.json path
- `packages/cli/src/utils/proofSummary.ts` — ProofSummary interface (though we read from JSON, not generate)
- `packages/cli/src/index.ts` — command registration pattern

### Patterns to Follow
- BOX constant for box-drawing characters (scan.ts:197-204)
- `formatHumanReadable()` style: build lines array, join at end (scan.ts:541-652)
- Chalk usage: `chalk.cyan()` for box, `chalk.bold()` for headers, `chalk.gray()` for secondary text
- Section pattern: bold header, gray horizontal rule, content lines
- JSON output: separate format function, `JSON.stringify(entry, null, 2)`

### Known Gotchas
- proof_chain.json may not exist if no work has been completed yet
- Entry assertions array may be empty if contract had no assertions (edge case)
- timing fields (think/plan/build/verify) are optional — only total_minutes is guaranteed

### Things to Investigate
- Whether to import ProofChainEntry from work.ts or define locally (recommend import for DRY)
- Exact card width — scan.ts uses 71 chars, confirm this works for says text display
