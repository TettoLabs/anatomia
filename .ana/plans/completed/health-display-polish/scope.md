# Scope: Health Display Polish

**Created by:** Ana
**Date:** 2026-05-01

## Intent

Make `ana proof health` match the design language of every other proof command. The data is correct — `computeHealthReport` is solid. The terminal display is debug output next to the proof card's designed surface. This is pure craft: box header, section dividers, truncated paths, one-line summaries, trend-first hierarchy. The developer who runs `ana proof health` should see a dashboard, not a data dump.

## Complexity Assessment
- **Size:** small-medium
- **Files affected:** `src/commands/proof.ts` (health terminal display block, lines 1599-1676), `tests/commands/proof.test.ts` (health display tests, lines 1843+)
- **Blast radius:** Display-only change in one command. `computeHealthReport` untouched. `--json` output untouched. `detectHealthChange` untouched. `work complete` fourth-line nudge untouched.
- **Estimated effort:** 1 day
- **Multi-phase:** no

## Approach

Rewrite the terminal display block of the health subcommand (lines 1599-1676 in proof.ts). Keep the JSON path unchanged. The computation layer (`computeHealthReport` in proofSummary.ts) is not modified — this scope only changes how the report is formatted for the terminal.

Full requirements with mockup, design decisions, and design language reference are in `anatomia_reference/PROOF_SYSTEM/HEALTH_DISPLAY_POLISH_REQUIREMENTS.md`.

## Acceptance Criteria

- AC1: Health output has a box header matching the proof card pattern (BOX constants, command name + run count + date)
- AC2: Sections use `────────` dividers with length matching the heading text
- AC3: Trajectory shows trend FIRST, risks/run second. Unclassified is an inline parenthetical only when > 0
- AC4: Hot module file paths are truncated to basename (disambiguated with parent directory when basenames collide)
- AC5: `observation` abbreviated to `obs` in hot module severity counts
- AC6: Promote section shows only `suggested_action: promote` findings as one-line truncated summaries with `[severity · promote]` badges
- AC7: Recurring section shows only `scope`-action findings with `recurrence_count >= 2` as one-line truncated summaries with `[severity]` badges and `(N entries)` suffix
- AC8: Sections with no content are omitted (no "No candidates." text)
- AC9: Zero-runs case shows box header with `0 runs` and `No data.` — no section omission
- AC10: Promotions effectiveness section retains current behavior with box/divider treatment, only appears when promoted findings exist
- AC11: `--json` output is completely unchanged
- AC12: `work complete` fourth-line health nudge is completely unchanged
- AC13: All display tests updated, no regressions

## Edge Cases & Risks

- **Hot module basename collision.** Two hot modules like `src/commands/proof.ts` and `src/engine/proof.ts` share basename `proof.ts`. Truncation rule: `path.basename()` if unique in the list, last two path segments if ambiguous. Need to check whether real hot modules ever collide — current data has `proof.ts`, `proofSummary.ts`, `work.ts`, `proof.test.ts`, `proofSummary.test.ts`, `work.test.ts`. No collisions. But the code must handle it.
- **Long truncated summaries.** Promote/Recurring summaries are truncated to ~100 chars. Some summaries start with `A013 conditional assertion passes vacuously when...` — the assertion ID is noise in the health dashboard. Truncation should produce readable one-liners. The builder decides the truncation approach (substring + `...` or smarter word-boundary truncation).
- **No promote candidates in current chain.** All 4 current candidates are `scope`-action recurring, not `promote`-action. The Promote section will be empty and omitted. Only Recurring shows. Tests need to cover both cases (promote candidates present, promote candidates absent).
- **Trajectory special cases.** `no_classified_data`, `insufficient_data` — these exist in the current display and must be preserved in the new format. The mockup shows `improving` but the new display must handle all 5 trend values.
- **Existing health tests assert on output strings.** Tests at lines 1919+ check for `Proof Health:`, `28`, `Trajectory`, etc. All need updating to match new format (box header, dividers, truncated paths).

## Rejected Approaches

- **Pattern grouping for promote candidates.** Deferred — proof chain doesn't store pattern metadata. Heuristic word overlap doesn't work on real candidates. One-line truncated summaries per candidate instead.
- **New `groupPromotionCandidates` function in proofSummary.ts.** Killed — no new computation needed. Display formatting stays in proof.ts.
- **Coloring severity in hot modules.** Considered risk in red, debt in yellow. Terminal color support varies. The ordering (risk first when present) provides the signal without color dependency.

## Open Questions

None — requirements are fully specified in the requirements doc.

## Exploration Findings

### Patterns Discovered
- `proof.ts`: BOX constants already defined at line 36 (`topLeft`, `topRight`, `bottomLeft`, `bottomRight`, `horizontal`, `vertical`). Used by `formatHumanReadable` for the proof card. Health display reuses these.
- `proof.ts`: `formatHumanReadable` (lines 80-221) is the proof card renderer. It builds `lines: string[]` then joins with `\n`. Health display should follow the same pattern for consistency.
- `proof.ts`: The health display block (lines 1599-1676) is self-contained — all formatting logic is inline in the action handler. No shared formatting functions. The rewrite replaces this block.

### Constraints Discovered
- [TYPE-VERIFIED] `HealthReport` type (proof.ts imports from types/proof.ts) has `hot_modules: HotModule[]` with `file: string` (full path). Path truncation is display-only — the type doesn't change.
- [TYPE-VERIFIED] `PromotionCandidate` has `suggested_action: string`. Filtering promote vs scope candidates uses this field.
- [OBSERVED] Current health tests use `stdout.toContain('Proof Health:')` — will need updating to match box header format.

### Test Infrastructure
- `proof.test.ts`: `makeHealthEntry` helper (lines 1847-1909) creates synthetic chain entries for health testing. Reusable for new display tests.
- `proof.test.ts`: `createProofChain` helper writes entries to temp dir. Used by all health tests.
- Health test section starts at line 1843 with 4 existing tests.

## For AnaPlan

### Structural Analog
`formatHumanReadable` in proof.ts (lines 80-221) is the structural analog. It's the proof card renderer: builds a `lines[]` array, uses BOX constants for the header, uses `chalk.bold` for section headings, `chalk.gray` for dividers and metadata, `chalk.dim` for secondary info. The health display rewrite follows this exact pattern.

### Relevant Code Paths
- `src/commands/proof.ts` lines 1554-1679 — health subcommand (registration + action handler)
- `src/commands/proof.ts` lines 1599-1676 — terminal display block (the rewrite target)
- `src/commands/proof.ts` lines 80-221 — `formatHumanReadable` (proof card — the pattern to follow)
- `src/commands/proof.ts` lines 36-43 — BOX constants
- `src/types/proof.ts` — `HealthReport`, `HotModule`, `PromotionCandidate`, `PromotionEffectiveness` types
- `tests/commands/proof.test.ts` lines 1843-2000+ — health tests

### Patterns to Follow
- `formatHumanReadable` in proof.ts for box header construction, section divider pattern, `lines[]` accumulation
- Proof card's truncation pattern for findings (5 max, overflow count) — adapt for promote/recurring sections

### Known Gotchas
- The `boxWidth` in `formatHumanReadable` is hardcoded to 71 (`const boxWidth = 71`). Health should use the same width for visual consistency.
- `chalk.cyan` is used for the proof card box. Health box should match.
- Health test at line 1919 uses `stdout.toContain('Proof Health:')` — this will break with box header. Update to check for run count inside the box.
- The zero-runs path (lines 1574-1579 for terminal, 1603-1607 for post-chain-read) has TWO branches — one when the file doesn't exist, one when it exists but has 0 runs. Both need the box header treatment.
- `report.trajectory.trend` has 5 possible values: `improving`, `worsening`, `stable`, `insufficient_data`, `no_classified_data`. All must display correctly.

### Things to Investigate
- Whether `path.basename()` is sufficient for hot module truncation or whether a custom function is needed for the disambiguation case. Check if any real chain data has basename collisions in hot modules.
