# Spec: Health Display Polish

**Created by:** AnaPlan
**Date:** 2026-05-01
**Scope:** .ana/plans/active/health-display-polish/scope.md

## Approach

Rewrite the terminal display block of the health subcommand (lines 1599–1676 in `proof.ts`). The computation layer (`computeHealthReport`) is untouched. JSON output is untouched. `detectHealthChange` is untouched. The `work complete` fourth-line nudge is untouched.

The rewrite follows `formatHumanReadable` (lines 80–221 in `proof.ts`) as the structural analog: accumulate a `lines: string[]` array, use `BOX` constants for the header, `chalk.bold` for section headings, `chalk.gray` for dividers, `chalk.cyan` for the box border. Join with `\n` and `console.log` the result.

The zero-runs path has TWO branches — "file doesn't exist" (line 1565) and "exists but 0 runs" (line 1603). Both must produce the box header with `0 runs` and `No data.` underneath.

The current code uses a hardcoded `${10}` instead of importing `MIN_ENTRIES_FOR_TREND` from `proofSummary.ts`. The rewrite imports and uses the constant. This fixes a known proof finding.

## Output Mockups

### Normal case (runs > 0, all sections populated)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ana proof health                                                   │
│  34 runs                                            2026-05-01     │
└─────────────────────────────────────────────────────────────────────┘

  Trajectory
  ──────────
  Trend:      improving
  Risks/run:  0.2 (last 5) · 0.2 (all)

  Hot Modules
  ───────────
  proof.ts                12 findings (6 debt, 6 obs)     7 runs
  proofSummary.test.ts    10 findings (4 debt, 6 obs)     6 runs
  work.ts                  7 findings (2 risk, 2 debt)    6 runs

  Promote
  ───────
  [debt · promote] options.skill typed as non-optional... — proof.ts
  [debt · promote] ProofSummary.result still typed as... — proofSummary.ts

  Recurring
  ─────────
  [debt] options.skill typing — proof.ts (4 entries)
  [debt] conditional assertion passes vacuously — proof.ts (4 entries)

  Promotions
  ──────────
  [debt] options.skill typing  tracking... (3 entries, need 5)
  [debt] another promoted rule  effective (85% reduction)
```

### Trajectory with unclassified > 0

```
  Trend:      stable
  Risks/run:  0.2 (last 5) · 0.2 (all)  (62 unclassified excluded)
```

### Trajectory with insufficient_data

```
  Trend:      insufficient data (need 10+ runs)
  Risks/run:  0 (last 5) · 0 (all)
```

### Trajectory with no_classified_data

```
  Trend:      no classified data
  Risks/run:  no classified data
```

### Zero runs (chain missing or empty)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ana proof health                                                   │
│  0 runs                                             2026-05-01     │
└─────────────────────────────────────────────────────────────────────┘

  No data.
```

### Sections with no content

Omitted entirely — no heading, no divider, no "No candidates." text. Only the zero-runs case shows `No data.`

## File Changes

### `packages/cli/src/commands/proof.ts` (modify)

**What changes:** The terminal display block inside the health subcommand action handler (lines 1599–1676) is replaced. The zero-runs terminal path (lines 1574–1579) is also replaced. Both become box-header displays using the `lines[]` accumulation pattern.

Additionally: add `import { MIN_ENTRIES_FOR_TREND } from '../utils/proofSummary.js'` — check whether this import already exists; if `computeHealthReport` is already imported from that module, add `MIN_ENTRIES_FOR_TREND` to the existing import.

**Pattern to follow:** `formatHumanReadable` at lines 80–221 in the same file. Same `boxWidth = 71`, same `BOX` constants, same chalk color choices, same divider pattern (`chalk.gray('  ' + BOX.horizontal.repeat(N))` where N = heading text length).

**Why:** The health command is the most visible proof command and currently looks like debug output next to designed surfaces. Matching the design language creates visual consistency across all proof commands.

### `packages/cli/tests/commands/proof.test.ts` (modify)

**What changes:** Health display tests (lines 1843–2090) are updated to match the new output format. JSON tests (A007–A012) are unchanged — their assertions check JSON structure, not terminal format.

**Pattern to follow:** Existing health test structure using `makeHealthEntry` helper and `createProofChain`. The helper is reusable as-is.

**Why:** Terminal format assertions like `toContain('Proof Health:')` will break with the box header. Tests must verify the new format while maintaining the same coverage.

## Acceptance Criteria

- [x] AC1: Health output has a box header matching the proof card pattern (BOX constants, command name + run count + date)
- [x] AC2: Sections use `────────` dividers with length matching the heading text
- [x] AC3: Trajectory shows trend FIRST, risks/run second. Unclassified is an inline parenthetical only when > 0
- [x] AC4: Hot module file paths are truncated to basename (disambiguated with parent directory when basenames collide)
- [x] AC5: `observation` abbreviated to `obs` in hot module severity counts
- [x] AC6: Promote section shows only `suggested_action: promote` findings as one-line truncated summaries with `[severity · promote]` badges
- [x] AC7: Recurring section shows only `scope`-action findings with `recurrence_count >= 2` as one-line truncated summaries with `[severity]` badges and `(N entries)` suffix
- [x] AC8: Sections with no content are omitted (no "No candidates." text)
- [x] AC9: Zero-runs case shows box header with `0 runs` and `No data.` — no section omission
- [x] AC10: Promotions effectiveness section retains current behavior with box/divider treatment, only appears when promoted findings exist
- [x] AC11: `--json` output is completely unchanged
- [x] AC12: `work complete` fourth-line health nudge is completely unchanged
- [x] AC13: All display tests updated, no regressions
- [x] AC14: Tests pass with `(cd packages/cli && pnpm vitest run)`
- [x] AC15: No build errors
- [x] AC16: `MIN_ENTRIES_FOR_TREND` imported from proofSummary.ts instead of hardcoded `10`

## Testing Strategy

- **Unit tests:** Update the 8 existing terminal display tests (A001–A006, empty chain, missing chain) to assert against new output format. Add new tests for:
  - Trajectory condensed format (trend first, risks/run second, inline unclassified)
  - Hot module basename truncation (unique basenames)
  - Hot module basename disambiguation (colliding basenames)
  - `observation` → `obs` abbreviation in hot modules
  - Promote section with `suggested_action: promote` candidates
  - Recurring section with `scope`-action candidates, `recurrence_count >= 2`
  - Empty section omission (no Promote heading when 0 promote candidates)
  - Zero-runs box header format
  - `insufficient_data` and `no_classified_data` trend display
  - Promotions effectiveness section with box/divider treatment

- **Integration tests:** JSON tests (A007–A012) remain unchanged — they verify JSON output is unaffected.

- **Edge cases:**
  - Hot module list where two files share a basename (e.g., `src/commands/proof.ts` and `src/engine/proof.ts`)
  - Promote candidate with summary > 100 chars (verify truncation with `...`)
  - Chain with only `scope`-action candidates (Promote section omitted, Recurring shown)
  - Chain with only `promote`-action candidates (Recurring section omitted, Promote shown)
  - `risks_per_run_last5` or `risks_per_run_all` is `null`

## Dependencies

None — all computation exists in `computeHealthReport`. This is display-only.

## Constraints

- `boxWidth = 71` — must match `formatHumanReadable` for visual consistency across proof commands.
- `chalk.cyan` for box border — matches proof card.
- No changes to `proofSummary.ts` — computation layer is untouched.
- No changes to `--json` output structure.
- No changes to `detectHealthChange` or `work complete` nudge logic.

## Gotchas

- **Two zero-runs branches.** The "file doesn't exist" path (line 1565) and the "exists but 0 runs" path (line 1603) both need box header treatment. Missing either one produces inconsistent zero-state display.
- **The divider length pattern.** In `formatHumanReadable`, the divider repeat count matches the heading text length: "Contract" → 8, "Assertions" → 10, "Timing" → 6. Health sections must follow the same rule: "Trajectory" → 10, "Hot Modules" → 11, "Promote" → 7, "Recurring" → 9, "Promotions" → 10.
- **`computeHealthReport` returns ALL candidates in `promotion_candidates`.** The display must filter by `suggested_action` to split Promote vs Recurring. `promote`-action → Promote section. `scope`-action with `recurrence_count >= 2` → Recurring section. Candidates that don't match either filter are omitted from display (they're still in `--json`).
- **`observation` abbreviation is ONLY in hot modules.** Don't abbreviate in Promote/Recurring severity badges.
- **Promotions effectiveness section uses `report.promotions`** — a separate field from `report.promotion_candidates`. `promotions` contains `PromotionEffectiveness` objects. Don't confuse the two arrays.
- **`import type` separation.** If `MIN_ENTRIES_FOR_TREND` is added to an existing value import from `proofSummary.js`, that's fine. Don't mix it into a `type`-only import.
- **`risks_per_run_last5` and `risks_per_run_all` can be `null`.** The condensed trajectory line must handle nulls — display `no data` when null.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions: `import { MIN_ENTRIES_FOR_TREND } from '../utils/proofSummary.js'`
- Use `import type` for type-only imports, separate from value imports
- Prefer early returns over nested conditionals
- Named exports only — no default exports
- `node:` prefix for built-in modules (`import * as path from 'node:path'`)
- Error handling in commands: `chalk.red` + `process.exit(1)` (already present in the health parse error path)
- Use `--run` flag with `pnpm vitest` to avoid watch mode hang

### Pattern Extracts

**Box header construction** (proof.ts lines 89–103):
```typescript
  // Box width (fits in 80 columns)
  const boxWidth = 71;
  const innerWidth = boxWidth - 2;

  // Header box
  const titleLine = `  ana proof`;
  const featureLine = `  ${entry.feature}`;
  const padding = innerWidth - featureLine.length - timestamp.length;
  const featureWithTimestamp = `${featureLine}${' '.repeat(Math.max(1, padding))}${timestamp}`;

  lines.push(chalk.cyan(BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight));
  lines.push(chalk.cyan(BOX.vertical) + chalk.bold(titleLine.padEnd(innerWidth)) + chalk.cyan(BOX.vertical));
  lines.push(chalk.cyan(BOX.vertical) + featureWithTimestamp.padEnd(innerWidth) + chalk.cyan(BOX.vertical));
  lines.push(chalk.cyan(BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight));
```

**Section divider pattern** (proof.ts lines 113–114):
```typescript
  lines.push(chalk.bold('  Contract'));
  lines.push(chalk.gray('  ' + BOX.horizontal.repeat(8)));
```

**Severity badge pattern** (proof.ts lines 165–169):
```typescript
      if (finding.severity && finding.suggested_action) {
        lines.push(`  [${finding.severity} · ${finding.suggested_action}] ${finding.summary}`);
      } else {
        lines.push(`  ${finding.summary}`);
      }
```

### Proof Context

Relevant active findings for `proof.ts`:
- **[code] Hardcoded 10 in trend display instead of using MIN_ENTRIES_FOR_TREND constant.** Directly relevant — this build fixes it by importing and using the constant.
- **[code] Promotion candidate display has no summary truncation.** Directly relevant — this build fixes it with ~100 char truncation.
- **[code] SEVERITY_ORDER duplication across blocks.** Pre-existing, not in scope — don't introduce new duplication but don't refactor existing either.

No active proof findings for `proof.test.ts` relevant to this build.

### Checkpoint Commands

- After box header works: `(cd packages/cli && pnpm vitest run --run tests/commands/proof.test.ts)` — Expected: health tests that check run count pass
- After all changes: `(cd packages/cli && pnpm vitest run --run)` — Expected: all 1757 tests pass (existing) + new health display tests
- Lint: `pnpm run lint`

### Build Baseline

- Current tests: 1757 passed, 2 skipped (1759 total)
- Current test files: 93 passed
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected 1757 + ~10 new tests (trajectory condensed, basename truncation, basename collision, obs abbreviation, promote section, recurring section, empty section omission, zero-runs box, insufficient_data trend, no_classified_data trend, promotions effectiveness with dividers)
- Regression focus: existing health tests (lines 1843–2090), JSON health tests (must remain unchanged)
