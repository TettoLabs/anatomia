# Spec: Health Stats Polish

**Created by:** AnaPlan
**Date:** 2026-05-01
**Scope:** .ana/plans/active/proof-health-v2/scope.md

## Approach

Reshape the health dashboard terminal display. No data model changes for existing computation. Two new computation functions in proofSummary.ts feed two new sections. The `HealthReport` type gets two new optional fields. The `--json` path returns early at proof.ts line 1596 — display changes don't affect JSON output structure, but the new fields appear in the JSON because they're part of HealthReport.

Three categories of change:

1. **Renames.** "Trajectory" → "Quality", "Hot Modules" → "Hot Spots". String changes in `formatHealthDisplay`.
2. **Removals.** Remove unclassified parenthetical from Quality section. Remove Promotions effectiveness section from terminal (keep in `--json` via HealthReport).
3. **Additions.** New "Verification" section (first-pass rate + catch count). New "Pipeline" section (median timing). Merge Promote + Recurring → "Next Actions".

The structural analog is the existing `formatHealthDisplay` function (proof.ts:233-380) — same file, same display rewrite pattern used in the health-display-polish scope.

## Output Mockups

### Full dashboard (new sections highlighted)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ana proof health                                                       │
│  40 runs                                                    2026-05-01 │
└─────────────────────────────────────────────────────────────────────────┘

  Quality
  ──────────
  Trend:      improving
  Risks/run:  0.8 (last 5) · 1.2 (all)

  Verification
  ──────────
  First-pass:  78% (31 of 40)
  Caught:      12 issues before shipping

  Pipeline
  ──────────
  Median:  53m (scope 8m · build 22m · verify 12m)

  Hot Spots
  ──────────
  proof.ts                3 findings (2 risk, 1 debt)       4 runs
  work.ts                 2 findings (1 risk, 1 obs)        3 runs

  Next Actions
  ──────────
  Fix: anchor stripping regex false-positives — proof.ts (3 entries)
  Fix: SEVERITY_ORDER duplication across blocks — proof.ts (2 entries)
  Promote: [debt] exitError helper duplicated inline — proof.ts
```

### Dashboard with insufficient pipeline data (< 3 entries)

Pipeline section is omitted entirely. No placeholder text.

### Dashboard with zero rejection data

```
  Verification
  ──────────
  First-pass:  100% (5 of 5)
  Caught:      0 issues before shipping
```

### Next Actions merge logic

Promote candidates get action verb "Promote:" with severity badge. Recurring scope candidates get "Fix:" with entry count. Combined list sorted by recurrence count descending (promote candidates use recurrence_count 1 as baseline). Capped at 5 items.

## File Changes

### `packages/cli/src/types/proof.ts` (modify)
**What changes:** Extend `HealthReport` interface with two new optional fields: `verification` and `pipeline`.
**Pattern to follow:** Existing optional fields on HealthReport (e.g., `promotions` is already an array that can be empty).
**Why:** Without the type, TypeScript rejects the new fields in computeHealthReport's return and formatHealthDisplay's consumption.

### `packages/cli/src/utils/proofSummary.ts` (modify)
**What changes:** Add `computeFirstPassRate` function that reads `rejection_cycles` and `previous_failures` from proof chain entries. Add pipeline timing computation inside `computeHealthReport` that extracts medians from entry timing data. Both feed the new HealthReport fields.
**Pattern to follow:** Existing computation functions in the same file — `computeHealthReport` already iterates entries. Add the new computation alongside the trajectory/hot_modules/promotions logic.
**Why:** Health computation belongs in proofSummary.ts (engine-adjacent). Display belongs in proof.ts. This maintains the existing separation.

### `packages/cli/src/commands/proof.ts` (modify)
**What changes:** Rewrite `formatHealthDisplay` to rename sections, add Verification and Pipeline display, merge Promote+Recurring into Next Actions, remove unclassified parenthetical, remove Promotions effectiveness from terminal.
**Pattern to follow:** Existing section rendering pattern in the same function — chalk.bold for headers, BOX.horizontal for dividers, conditional omission of empty sections.
**Why:** This is the terminal display layer. All user-visible output changes happen here.

### `packages/cli/tests/commands/proof.test.ts` (modify)
**What changes:** Update existing health display tests to match new section names. Add tests for Verification section, Pipeline section, Next Actions merge, and removed sections.
**Pattern to follow:** Existing `makeHealthEntry` helper and `runProof(['health'])` pattern in the same describe block (line 1843+).
**Why:** Display text changes break string assertions in existing tests. New sections need coverage.

## Acceptance Criteria

- [ ] AC1: Health display section "Trajectory" is renamed to "Quality"
- [ ] AC2: Health display section "Hot Modules" is renamed to "Hot Spots"
- [ ] AC3: "Recurring" and "Promote" sections are merged into "Next Actions"
- [ ] AC4: "Verification" section shows first-pass rate and total issues caught
- [ ] AC5: "Pipeline" section shows median total time with phase breakdown
- [ ] AC6: `(N unclassified excluded)` parenthetical is removed from Quality section
- [ ] AC7: Promotion Effectiveness section does not appear on default output
- [ ] AC8: `--json` output structure is unchanged (new fields additive)
- [ ] Tests pass with `(cd packages/cli && pnpm vitest run)`
- [ ] No build errors with `pnpm run build`

## Testing Strategy

- **Unit tests:** Update every existing health display test that asserts on renamed section text ("Trajectory" → "Quality", "Hot Modules" → "Hot Spots", "Promote" → gone, "Recurring" → gone). Add tests for "Next Actions" combined output. Add tests for "Verification" section with known rejection data. Add tests for "Pipeline" section with known timing data.
- **Edge cases:**
  - Verification with 0 rejection cycles shows "100% (N of N)" and "0 issues"
  - Pipeline omitted when fewer than 3 entries have timing data
  - Next Actions capped at 5 items
  - Next Actions empty when no promote or recurring candidates
  - Entries with `total_minutes === 0` excluded from pipeline median

## Dependencies

None. Phase 1 is display-only with new computation functions.

## Constraints

- `--json` backward compatibility: existing field names and structure must not change. New fields are additive.
- Section divider pattern must use `BOX.horizontal` (established in health-display-polish).
- Engine files have zero CLI dependencies — the new computation functions in proofSummary.ts must not import chalk or commander.

## Gotchas

- The `--json` path returns early at proof.ts line 1596. Display changes in `formatHealthDisplay` don't affect JSON. But the new HealthReport fields (`verification`, `pipeline`) DO appear in JSON because they're part of the object returned by `computeHealthReport`, which is serialized before the early return. This is correct behavior — new data should appear in `--json`.
- Existing tests assert on exact strings like "Hot Modules", "Promote", "Recurring", "unclassified excluded". All of these will fail after the rename/removal. Update them first or they'll mask real test failures.
- `computeHealthReport` takes a chain parameter with inline type annotation (line 604-618). The entries in this type don't include `rejection_cycles` or `timing`. You need to widen the entry type to include these fields for the new computation. Add them as optional to maintain backward compatibility.
- The Promotions effectiveness section stays in HealthReport (and thus `--json`) — it's only removed from the terminal display in `formatHealthDisplay`.
- Median computation: for an even-count array, use the lower of the two middle values (floor median). This avoids fractional minutes.

## Build Brief

### Rules That Apply
- ESM imports with `.js` extension for all relative imports
- `import type` for type-only imports, separate from value imports
- Engine/utils files have zero CLI dependencies — no chalk in proofSummary.ts
- Explicit return types on exported functions with `@param` and `@returns` JSDoc
- Early returns over nested conditionals
- Always use `--run` with vitest to avoid watch mode

### Pattern Extracts

Existing section rendering pattern (proof.ts:266-292):
```typescript
  // Trajectory section
  lines.push('');
  lines.push(chalk.bold('  Trajectory'));
  lines.push(chalk.gray('  ' + BOX.horizontal.repeat(10)));

  if (report.trajectory.trend === 'no_classified_data') {
    lines.push('  Trend:      no classified data');
    lines.push('  Risks/run:  no classified data');
  } else {
    const trendDisplay = report.trajectory.trend === 'insufficient_data'
      ? `insufficient data (need ${MIN_ENTRIES_FOR_TREND}+ runs)`
      : report.trajectory.trend;
    lines.push(`  Trend:      ${trendDisplay}`);
    // ...
  }
```

Existing Next Actions merge candidates — Promote section (proof.ts:325-339):
```typescript
  const promoteCandidates = report.promotion_candidates.filter(c => c.suggested_action === 'promote');
  if (promoteCandidates.length > 0) {
    lines.push('');
    lines.push(chalk.bold('  Promote'));
    lines.push(chalk.gray('  ' + BOX.horizontal.repeat(7)));
    for (const c of promoteCandidates) {
      const MAX_SUMMARY = 100;
      const summary = c.summary.length > MAX_SUMMARY
        ? c.summary.slice(0, MAX_SUMMARY) + '...'
        : c.summary;
      const fileSuffix = c.file ? ` \u2014 ${path.basename(c.file)}` : '';
      lines.push(`  [${c.severity} \u00b7 promote] ${summary}${fileSuffix}`);
    }
  }
```

Test helper pattern (proof.test.ts:1847-1909):
```typescript
    function makeHealthEntry(opts: {
      slug: string;
      risks?: number;
      debts?: number;
      observations?: number;
      file?: string;
      action?: string;
    }): Record<string, unknown> {
      // ... creates entries with findings for health testing
    }
```

### Proof Context

Top findings for affected files:
- **proof.ts:** SEVERITY_ORDER duplication across audit/findings blocks (debt, pre-existing). Promotion candidate display has no summary truncation (observation, addressed by this spec's Next Actions cap).
- **proofSummary.ts:** No active findings from recent cycles.

### Checkpoint Commands

- After section renames: `(cd packages/cli && pnpm vitest run tests/commands/proof.test.ts --run)` — Expected: existing health tests updated and passing
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: all tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1762 passed, 2 skipped (93 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1780+ tests (existing health tests updated + ~18 new tests for Verification, Pipeline, Next Actions, removals)
- Regression focus: `tests/commands/proof.test.ts` (health display tests will break on renames — update them)
