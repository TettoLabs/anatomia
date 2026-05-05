# Spec: User-Facing Improvements

**Created by:** AnaPlan
**Date:** 2026-05-04
**Scope:** .ana/plans/active/proof-intelligence-hardening/scope.md

## Approach

Four changes that improve signal quality for users and agents consuming proof intelligence:

**Audit headline split** — The current headline `"Proof Audit: 12 active findings across 8 files"` treats all findings equally. An operator needs to know: how many require action vs. how many are monitoring noise? Split into actionable (severity risk/debt OR action scope/promote) and monitoring (everything else). This gives Learn and operators a quick read on actual work remaining.

**Lesson command** — Clone the close subcommand. `ana proof lesson <ids...> --reason "..."` sets findings to `status: 'lesson'` with a git commit. Same guards: can't lesson a promoted or already-closed finding. Same `--dry-run` and `--json` support. Uses the exitError factory from Phase 2. Registered in the proof command group after close.

**Staleness normalization** — The current `subsequent_count >= 3 → high` threshold ignores file frequency. A file touched in every other pipeline run (48% frequency) will hit 3 touches quickly regardless of whether the finding is actually stale. Normalize confidence using `entries_since_finding * file_touch_rate_since_finding` as the expected touches denominator.

Formula: `expected = max(3, ceil(entries_since_finding * touch_rate))` where `touch_rate = touches_in_post_finding_window / entries_since_finding`. Confidence becomes `high` when `subsequent_count >= expected`, `medium` when `subsequent_count >= ceil(expected * 0.5)`. Minimum 5 entries since the finding before normalization applies — below that, fall back to raw `>= 3` / `>= 1`.

This means: a file with 48% touch rate across 10 subsequent entries needs ~5 touches for high confidence (ceil(10 * 0.48) = 5) instead of 3. A file with 2% touch rate keeps the floor of 3.

**Learn template edits** — Two lines in `packages/cli/templates/.claude/agents/ana-learn.md`:
- Line 68: Replace "all accept-action findings" with "all findings for a specific action type"
- Line 159: Replace "Accept-action findings are pre-classified for closure" with "Accept-action findings were classified by the verifier — validate the classification before acting"

## Output Mockups

### Audit headline (human-readable)
```
Proof Audit: 12 active (7 actionable, 5 monitoring) across 8 files
  3 risk · 4 debt · 3 observation · 2 unclassified
  4 promote · 3 scope · 3 monitor · 2 accept (closeable)
```

### Audit JSON (new fields)
```json
{
  "total_active": 12,
  "actionable_count": 7,
  "monitoring_count": 5,
  "by_severity": { "risk": 3, "debt": 4, "observation": 3, "unclassified": 2 },
  "by_action": { "promote": 4, "scope": 3, "monitor": 3, "accept": 2, "unclassified": 0 },
  "by_file": [...]
}
```

### Lesson command
```
$ ana proof lesson F012 F014 --reason "Team decided this is acceptable risk for MVP"

Lessons recorded:
  F012 [risk · code] Null check missing in payment flow — payments/intent.ts
  F014 [debt · code] Error messages not i18n-ready — lib/errors.ts

Committed: [proof] Lesson: F012, F014
```

### Staleness (behavior change, not format change)
Same output format. Fewer false positives — high-frequency files require proportionally more touches.

## File Changes

### packages/cli/src/commands/proof.ts (modify)
**What changes:**
1. Audit display: compute `actionableCount` and `monitoringCount` from the existing `severityCounts` and `actionCounts`. A finding is actionable if its severity is 'risk' or 'debt' OR its action is 'promote' or 'scope'. Update the headline string and add the two new fields to the JSON output object.
2. Lesson command: new subcommand registered after close. Clones close's structure — variadic IDs, `--reason` required, `--dry-run`, `--json`. Uses `createExitError` factory. Sets `status: 'lesson'`, adds `lesson_reason` and `lesson_at` fields to the finding. Git commit with `[proof] Lesson: {ids}` message.

**Pattern to follow:** Close subcommand (proof.ts:565-800) is the structural analog for lesson. The audit headline code is at :1696.
**Why:** Audit headline gives operators instant triage signal. Lesson command gives Learn a way to record institutional decisions without closing findings.

### packages/cli/src/utils/proofSummary.ts (modify)
**What changes:** `computeStaleness` gains frequency normalization. For each finding, compute `entries_since_finding` (chain entries after the finding's entry), `touches_since_finding` (how many of those entries touched the file), `touch_rate = touches / entries_since`. Then `expected = max(3, ceil(entries_since * touch_rate))`. Confidence: high if `subsequent_count >= expected`, medium if `subsequent_count >= ceil(expected * 0.5)`, otherwise skip (not stale). Gate: if `entries_since_finding < 5`, use raw thresholds (>= 3 high, >= 1 medium).
**Pattern to follow:** The existing loop structure at :1099-1141. The normalization adds computation inside the inner loop after `subsequentSlugs` is populated.
**Why:** 78% false positive rate. High-frequency files like work.ts (48% touch rate) always hit 3 touches quickly, making every finding in them appear stale.

### packages/cli/templates/.claude/agents/ana-learn.md (modify)
**What changes:** Two text replacements:
- Line 68: "all accept-action findings, all findings for a specific module" → "all findings for a specific action type, all findings for a specific module"
- Line 159: "Accept-action findings are pre-classified for closure." → "Accept-action findings were classified by the verifier — validate the classification before acting."

**Pattern to follow:** Surrounding text style — instructional, concise.
**Why:** The current language frames accept-action as pre-approved for closure, which causes Learn to rubber-stamp instead of validate.

## Acceptance Criteria

- [ ] AC2: computeStaleness normalizes confidence by file touch frequency — a file touched in 48% of entries requires significantly more subsequent touches to reach "high confidence" than a file touched in 2% of entries
- [ ] AC8: Audit headline distinguishes actionable findings (risk/debt severity OR scope/promote action) from monitoring findings
- [ ] AC9: `ana proof lesson <ids...> --reason "..."` sets findings to status 'lesson' with git commit — same UX pattern as close
- [ ] AC10: Learn template lines 68 and 159 no longer contain language that encourages batch closure of accept-action findings
- [ ] Tests pass with `pnpm vitest run`
- [ ] No TypeScript errors (`pnpm run build`)

## Testing Strategy

- **Unit tests (proofSummary.test.ts):** computeStaleness normalization:
  - Chain with 10 entries after finding, file touched in 5 of them (50% rate) — needs 5 touches for high, gets 5 → high confidence
  - Same setup but only 3 touches → medium (3 >= ceil(5*0.5)=3)
  - Chain with 10 entries, file touched in 1 (10% rate) — expected stays at floor 3, so 3 touches → high
  - Chain with only 4 entries after finding — uses raw thresholds (below minimum)
  - Existing staleness tests updated to reflect new thresholds

- **Integration tests (proof.test.ts):** Lesson command:
  - Successful lesson with valid IDs and reason
  - Missing --reason exits with REASON_REQUIRED
  - Already-closed finding is rejected
  - Already-promoted finding is rejected
  - Non-existent ID returns FINDING_NOT_FOUND
  - `--dry-run` shows what would happen without mutating
  - `--json` returns structured response

- **Unit tests (proof.test.ts):** Audit headline:
  - Verify "actionable" and "monitoring" appear in human output
  - Verify JSON contains `actionable_count` and `monitoring_count`

## Dependencies

Phase 2 must be complete (exitError factory available for lesson command, truncateSummary available).

## Constraints

- Staleness normalization must not break the StaleFinding type — same fields, same structure, just different confidence assignment logic.
- Lesson command must commit to git — same pattern as close. Test with a real git repo in temp dir (same pattern as existing close tests).
- The `lesson` status must be recognized by `computeChainHealth` — check that the existing function handles it (it does: :1170 counts `lesson` status).
- Audit JSON is a public interface for agents — adding fields is non-breaking, but existing fields must not change shape.

## Gotchas

- The lesson command needs the `ProofChainEntry` type's findings to accept `status: 'lesson'`. Verify this is already in the type definition (it is — proofSummary.ts and proof types already reference 'lesson' status).
- Staleness test fixtures will break — existing tests assert specific findings as high/medium confidence with the old `>= 3` threshold. Update fixtures to match the new normalized thresholds.
- The audit "actionable" classification uses OR logic (severity risk/debt OR action scope/promote). A finding that is `observation` severity but `promote` action IS actionable. A finding that is `risk` severity but `accept` action IS actionable. This prevents severity and action from fighting — either signal is enough.
- **Out of scope (noted per scope open questions):** proof-health-v1-C5 "worsening label misleading" — the half-split trend comparison at proofSummary.ts:690-699 reports worsening for near-zero rates. Future work. audit-json-severity-summary-C1 "unknown severity silently dropped" — findings with novel severity values not in the bySeverity keys get excluded from that object. Low-priority.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions
- Named exports, no defaults
- Explicit return types on exported functions
- JSDoc `@param` and `@returns` on exported functions
- Use `| null` for checked-and-empty, `?:` for maybe-not-checked
- Error handling: commands surface with chalk.red + process.exit(1)

### Pattern Extracts

Close command structure (proof.ts:565-571) — clone for lesson:
```typescript
const closeCommand = new Command('close')
  .description('Close active findings with a reason')
  .argument('<ids...>', 'Finding IDs to close (e.g., F003 or F001 F002 F003)')
  .option('--reason <reason>', 'Why these findings no longer apply')
  .option('--dry-run', 'Show what would happen without making changes')
  .option('--json', 'Output JSON format')
  .action(async (ids: string[], options: { reason?: string; dryRun?: boolean; json?: boolean }) => {
```

Close's finding mutation (proof.ts:680-691):
```typescript
      foundFinding.status = 'closed';
      foundFinding.closed_at = new Date().toISOString();
      foundFinding.closed_reason = options.reason;
      if (dryRun) {
        foundFinding.closed_by = 'human (dry-run)';
      } else {
        foundFinding.closed_by = 'human';
      }
```

Staleness inner loop (proofSummary.ts:1112-1133):
```typescript
      const subsequentSlugs: string[] = [];
      for (let j = i + 1; j < chain.entries.length; j++) {
        const laterEntry = chain.entries[j]!;
        const touched = laterEntry.modules_touched || [];
        if (touched.includes(f.file)) {
          subsequentSlugs.push(laterEntry.slug || `entry-${j}`);
        }
      }

      if (subsequentSlugs.length === 0) continue;

      const staleFinding: import('../types/proof.js').StaleFinding = {
        ...
        confidence: subsequentSlugs.length >= 3 ? 'high' : 'medium',
      };
```

### Checkpoint Commands

- After staleness normalization: `(cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts)` — Expected: staleness tests pass with updated assertions
- After lesson command: `(cd packages/cli && pnpm vitest run tests/commands/proof.test.ts)` — Expected: new lesson tests + existing tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 1855+ tests pass
- Build: `pnpm run build`
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: Phase 2 baseline (~1847)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After this phase: expected 1860+ tests (staleness normalization + lesson command + audit headline)
- Regression focus: `tests/utils/proofSummary.test.ts` (staleness tests), `tests/commands/proof.test.ts` (new lesson + audit headline)
