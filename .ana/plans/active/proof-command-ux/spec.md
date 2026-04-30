# Spec: Proof Command UX

**Created by:** AnaPlan
**Date:** 2026-04-30
**Scope:** .ana/plans/active/proof-command-ux/scope.md

## Approach

Two independent display enhancements that use data already in memory. No changes to computation, data models, or proof chain structure.

**Fix 1 (Audit summary):** After the audit header line at proof.ts ~line 1006, insert two summary lines before the blank separator. Count severity and action buckets by iterating the `activeFindings` array — do NOT use `computeChainHealth` meta counts which include closed/lesson findings. Handle unclassified findings (`severity: '—'` or `suggested_action: '—'`) with a simple guard: if every finding has `'—'` severity, skip both summary lines entirely. When some but not all are unclassified, include an `unclassified` bucket on the severity line. The action line only shows known action values — `'—'` actions are silently excluded.

Use a simple `Record<string, number>` counter with a `for` loop over `activeFindings`. Do not reuse `SEVERITY_WEIGHT` — it maps severity→sort-order for a different purpose.

**Fix 2 (Health nudge):** In work.ts, change `const healthLine` to `let healthLine` at ~line 1358. After constructing the base string, check `healthChange.triggers` with priority ordering: `'new_candidates'` → append ` → claude --agent ana-learn`, else `'trend_worsened'` → append ` → ana proof audit`, else no nudge. One nudge maximum.

For JSON output, add `suggested_action` to the `quality` object at ~line 1340-1344. Derive from the same trigger priority: `'new_candidates'` → `'run_learn'`, `'trend_worsened'` → `'run_audit'`, else `null`. This field is a permanent addition to the JSON contract.

## Output Mockups

### Fix 1: Audit summary (terminal)

Normal case with classified findings:
```
Proof Audit: 12 active findings across 5 files
  3 risk · 5 debt · 4 observation
  2 promote · 3 scope · 4 monitor · 3 accept (closeable)

  src/commands/proof.ts (4 findings)
    ...
```

With some unclassified:
```
Proof Audit: 8 active findings across 3 files
  1 risk · 2 debt · 3 observation · 2 unclassified
  1 promote · 2 scope · 1 monitor · 2 accept (closeable)

  src/commands/proof.ts (3 findings)
    ...
```

All unclassified — both summary lines skip:
```
Proof Audit: 4 active findings across 2 files

  src/commands/proof.ts (2 findings)
    ...
```

Zero findings — no change (existing behavior):
```
Proof chain is clean — no active findings.
```

### Fix 2: Health nudge (terminal)

With `new_candidates` trigger:
```
  Health: new promotion candidates → claude --agent ana-learn
```

With `trend_worsened` trigger (no candidates):
```
  Health: trend worsened → ana proof audit
```

With only `trend_improved` or `new_hot_module`:
```
  Health: trend improved
```

### Fix 2: JSON suggested_action

```json
{
  "quality": {
    "changed": true,
    "trajectory": { ... },
    "triggers": ["new_candidates", "trend_worsened"],
    "suggested_action": "run_learn"
  }
}
```

When no actionable trigger: `"suggested_action": null`

## File Changes

### packages/cli/src/commands/proof.ts (modify)
**What changes:** Insert two summary lines (severity breakdown + action breakdown) between the audit header and blank separator in the terminal output branch. ~15 lines of new code.
**Pattern to follow:** The existing per-file display loop at lines 1009-1021 — same `chalk.dim()` styling, 2-space indent.
**Why:** The audit header shows a total count but gives no decision surface. The summary lines transform "12 findings" into "3 risk, 2 promote" — actionable at a glance.

### packages/cli/src/commands/work.ts (modify)
**What changes:** (1) Change `const healthLine` to `let healthLine`, append nudge string based on trigger priority. (2) Add `suggested_action` field to the JSON `quality` object. ~10 lines of new code.
**Pattern to follow:** The existing health fourth line construction at lines 1356-1360 — same `chalk.gray()` styling. The JSON quality object at lines 1340-1344 — additive field alongside `changed`, `trajectory`, `triggers`.
**Why:** The health line shows trajectory data without telling the developer what to do next. The nudge connects the data to the action. The JSON field lets programmatic consumers route actions without parsing terminal strings.

### packages/cli/tests/commands/proof.test.ts (modify)
**What changes:** Add tests for severity/action summary lines in audit output. Tests for: normal classified findings, mixed classified/unclassified, all unclassified (both lines skip), zero findings (unchanged behavior), and JSON output unchanged.
**Pattern to follow:** The existing audit test structure starting at line 1176 — `createAuditChain` helper, `runProof(['audit'])`, assertions on `stdout`.
**Why:** The summary lines have conditional display logic (skip when all unclassified) that must be regression-tested.

### packages/cli/tests/commands/work.test.ts (modify)
**What changes:** Add tests for health nudge in terminal output and `suggested_action` in JSON output. Tests for: `new_candidates` nudge, `trend_worsened` nudge, no nudge on informational triggers, priority when both fire, and JSON field values.
**Pattern to follow:** The existing `health fourth line` describe block at line 2177 — `createMergedProject`, console.log capture, assertions on output string.
**Why:** The nudge has priority logic (candidates > worsened) and the JSON field is a permanent contract addition — both need test coverage.

## Acceptance Criteria

- [ ] AC1: `ana proof audit` displays severity summary line between header and first file group: `N risk · N debt · N observation`
- [ ] AC2: `ana proof audit` displays action summary line: `N promote · N scope · N monitor · N accept (closeable)`
- [ ] AC3: Summary counts are from active findings only, not from `computeChainHealth` meta
- [ ] AC4: With zero active findings, the summary lines do not appear
- [ ] AC5: When all active findings have unclassified severity (`'—'`), both summary lines are skipped
- [ ] AC6: When some findings are unclassified, the severity line includes an `unclassified` bucket
- [ ] AC7: `--json` output is unchanged — summary is terminal display only
- [ ] AC8: `work complete` health fourth line appends `→ claude --agent ana-learn` when `new_candidates` trigger fires
- [ ] AC9: `work complete` health fourth line appends `→ ana proof audit` when `trend_worsened` trigger fires (and no `new_candidates`)
- [ ] AC10: `work complete` health fourth line has NO nudge when only `trend_improved` or `new_hot_module` fires
- [ ] AC11: When multiple triggers fire, only the highest-priority nudge appears (candidates > worsened)
- [ ] AC12: `work complete --json` `results.quality` gains `suggested_action` field: `'run_learn'` | `'run_audit'` | `null`
- [ ] AC13: `suggested_action` is `null` when no actionable trigger fires
- [ ] AC14: All existing tests pass
- [ ] AC15: Lint passes

## Testing Strategy

- **Unit tests (proof.test.ts):** Extend the audit test section. Create chain fixtures with known severity/action distributions and assert on the exact summary line text in stdout. Need fixtures for: all classified, mixed classified/unclassified, all unclassified, and zero findings. The existing `createAuditChain` helper generates findings with `i % 3 === 0 ? 'risk' : 'observation'` and `i % 2 === 0 ? 'scope' : 'monitor'` — for new tests, write chain fixtures directly (like the severity sort test at line 1378) to control exact severity/action distributions.
- **Unit tests (work.test.ts):** Extend the `health fourth line` describe block. The existing tests use `createMergedProject` + manual chain construction. For nudge tests, build chains with 10+ entries that produce specific triggers (the existing test at line 2182 shows the pattern). Assert `output.toContain('→ claude --agent ana-learn')` for candidates, `→ ana proof audit` for worsened.
- **JSON tests (work.test.ts):** Extend the existing JSON test at line 2257 to check `quality.suggested_action` field exists and has correct values.
- **Edge cases:** All-unclassified findings (severity `'—'`), single finding, zero severity buckets for a known type (e.g., no debt findings — bucket should not appear), nudge when `changed: false` (no health line → no nudge possible).

## Dependencies

None. Both fixes use data already computed and in memory.

## Constraints

- Summary lines are terminal-only. No changes to the audit JSON response structure.
- `suggested_action` JSON values are `'run_learn'` | `'run_audit'` | `null` — permanent contract. No command strings in JSON.
- Summary line formatting uses `chalk.dim` with 2-space indent to match existing audit display.
- Nudge formatting uses `chalk.gray` to match existing health line.

## Gotchas

- **Active-only counts.** `computeChainHealth`'s `by_severity` and `by_action` in the meta count ALL findings including closed/lesson. The audit summary must count from the `activeFindings` array built at proof.ts:894-949. Do not import or call `computeChainHealth` for this.
- **`const` → `let` for healthLine.** Line 1358 declares `const healthLine`. The nudge append requires `let`. Missing this produces a TypeScript error.
- **Open `string` type on severity/action.** These are typed as `string`, not a union. The fallback `'—'` at lines 941-942 means any value is possible. The summary must handle `'—'` explicitly and gracefully handle unknown values (count them as `unclassified` for severity, exclude from action line).
- **Zero-count buckets.** Don't display buckets with zero count. `0 risk · 3 debt · 2 observation` is noisy — show `3 debt · 2 observation`. Build the severity/action strings by filtering to non-zero counts.
- **The `createAuditChain` helper's severity distribution.** It assigns `i % 3 === 0 ? 'risk' : 'observation'` — no `debt`, no `'—'`. New tests that need specific distributions should create chain fixtures directly rather than using `createAuditChain`.
- **Health line only appears when `healthChange.changed && healthChange.details.length > 0`.** The nudge is appended inside this existing conditional. If there's no health line, there's no nudge. This is correct by construction.
- **Trigger array can have multiple values.** `healthChange.triggers` is `Array<...>`. Check with `.includes()`, not equality. Priority: check `new_candidates` first, then `trend_worsened`.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer early returns over nested conditionals.
- Explicit return types on all exported functions.
- Engine files have zero CLI dependencies — but these changes are in `commands/`, so chalk is fine.
- Always run `pnpm vitest run` with `--run` to avoid watch mode hang.

### Pattern Extracts

**Audit header + blank separator (proof.ts:1004-1007) — Fix 1 insertion point:**
```typescript
      } else {
        // Human-readable output
        const totalFiles = fileGroups.size;
        console.log(`\nProof Audit: ${activeFindings.length} active finding${activeFindings.length !== 1 ? 's' : ''} across ${totalFiles} file${totalFiles !== 1 ? 's' : ''}`);
        console.log('');
```
Summary lines go between line 1006 and line 1007 (between the header and the blank line).

**Per-file display styling (proof.ts:1012-1013) — style reference for summary lines:**
```typescript
          for (const f of displayed) {
            console.log(`    ${chalk.dim(`[${f.category}]`)} ${chalk.dim(`[${f.severity} · ${f.suggested_action}]`)} ${f.summary}`);
```

**Health fourth line (work.ts:1356-1360) — Fix 2 insertion point:**
```typescript
    // Fourth line: health change notification
    if (healthChange.changed && healthChange.details.length > 0) {
      const healthLine = `  Health: ${healthChange.details.join(' · ')}`;
      console.log(chalk.gray(healthLine));
    }
```

**JSON quality object (work.ts:1340-1344) — Fix 2 additive field:**
```typescript
      quality: {
        changed: healthChange.changed,
        trajectory: healthChange.trajectory,
        triggers: healthChange.triggers,
      },
```

**HealthChange interface (types/proof.ts:168-173):**
```typescript
export interface HealthChange {
  changed: boolean;
  trajectory: TrajectoryData;
  triggers: Array<'trend_improved' | 'trend_worsened' | 'new_hot_module' | 'new_candidates'>;
  details: string[];
}
```

### Proof Context

No active proof findings for affected files.

### Checkpoint Commands

- After proof.ts changes: `(cd packages/cli && pnpm vitest run tests/commands/proof.test.ts --run)` — Expected: existing audit tests still pass
- After work.ts changes: `(cd packages/cli && pnpm vitest run tests/commands/work.test.ts --run)` — Expected: existing health tests still pass
- After all changes: `(cd packages/cli && pnpm vitest run --run)` — Expected: 1733+ tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1733 passed, 2 skipped (1735 total)
- Current test files: 97
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1745+ tests in 97 files (12+ new tests across 2 test files)
- Regression focus: proof.test.ts audit tests, work.test.ts health fourth line tests
