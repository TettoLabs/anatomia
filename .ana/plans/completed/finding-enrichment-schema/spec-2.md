# Spec: Finding Enrichment Schema — Phase 2 (Health Expansion + Audit Display)

**Created by:** AnaPlan
**Date:** 2026-04-29
**Scope:** .ana/plans/active/finding-enrichment-schema/scope.md

## Approach

Phase 1 delivered the enriched data model — every finding now has `severity` and `suggested_action` on the type. Phase 2 consumes those fields in two places: `computeChainHealth` (adds `by_severity` and `by_action` breakdowns to every `--json` meta block) and the audit display (shows `[severity · action]` badges, sorts by severity within file groups).

Both changes are additive. The `ChainHealth` interface expands. The audit display gains badges and reordering. No type definitions change — Phase 1 already set those up.

**Key decisions:**

- **`computeChainHealth` structural type parameter** widens to include `severity?: string` and `suggested_action?: string` alongside existing `status?: string`. No concrete type import — the function stays loosely coupled and easy to test.
- **`unclassified` counts** in both breakdowns. Findings without `severity` (46 existing, per scope) count as `unclassified` in `by_severity`. Findings without `suggested_action` count as `unclassified` in `by_action`. This is the correct representation — old data is unclassified, not miscategorized.
- **Audit severity sort is intentional display reorder.** Currently findings within each file group appear in chain order. After this change, findings within each file group sort by severity: risk → debt → observation → unclassified. **This changes existing display output and is by design** — severity-first ordering surfaces the most important findings first. Verify should treat the changed ordering as an improvement, not a regression.

## Output Mockups

### `computeChainHealth` output (new fields)

```json
{
  "chain_runs": 5,
  "findings": {
    "active": 12,
    "closed": 3,
    "lesson": 2,
    "promoted": 1,
    "total": 18,
    "by_severity": {
      "risk": 4,
      "debt": 5,
      "observation": 3,
      "unclassified": 6
    },
    "by_action": {
      "promote": 2,
      "scope": 6,
      "monitor": 3,
      "accept": 1,
      "unclassified": 6
    }
  }
}
```

### Audit display with badges (human-readable)

```
  src/api/payments.ts (3 findings)
    [code] [risk · scope] Missing request validation
           age: 5d | anchor: ✓ | from: Fix Input Validation
    [code] [debt · monitor] Redundant import statement
           age: 5d | anchor: — | from: Fix Input Validation
    [test] [observation · accept] Edge case not covered
           age: 3d | anchor: ✓ | from: Add Tests
```

### Audit display JSON (new field on findings)

Each finding object in the audit JSON gains `suggested_action`:
```json
{
  "id": "F001",
  "category": "validation",
  "summary": "Missing request validation",
  "file": "src/api/payments.ts",
  "severity": "risk",
  "suggested_action": "scope",
  "age_days": 5,
  "anchor_present": true,
  "entry_slug": "fix-validation",
  "entry_feature": "Fix Input Validation"
}
```

## File Changes

### `packages/cli/src/utils/proofSummary.ts` (modify)
**What changes:**
1. **`ChainHealth` interface (~line 638):** Add `by_severity: { risk: number; debt: number; observation: number; unclassified: number }` and `by_action: { promote: number; scope: number; monitor: number; accept: number; unclassified: number }` inside the `findings` object.
2. **`computeChainHealth` function (~line 682):** Widen the parameter type's findings array to include `severity?: string` and `suggested_action?: string`. Add counters for each severity and action value. Count inside the existing findings loop. Return the new breakdown objects alongside existing counts.
3. **`computeChainHealth` parameter type on `wrapJsonResponse` and `wrapJsonError`** — these pass the chain to `computeChainHealth` internally. Check that their parameter types are compatible with the widened `computeChainHealth` signature. They use the same structural type at ~line 718 — widen to match.
**Pattern to follow:** The existing status counting switch at proofSummary.ts:693-699 — severity and action counting follows the same switch-with-default pattern.
**Why:** Every `--json` meta block includes `computeChainHealth` output. Without the expansion, downstream consumers (Learn, CI gates) can't see signal quality breakdowns.

### `packages/cli/src/commands/proof.ts` (modify)
**What changes:**
1. **Audit finding type (~line 540-553):** Add `suggested_action: string` to the `activeFindings` array element type.
2. **Audit finding construction (~line 577-591):** Add `suggested_action: finding.suggested_action ?? '—'` to the `auditFinding` construction, same pattern as `severity` at line 585.
3. **Audit JSON output:** `suggested_action` is already on the finding objects — flows through to JSON naturally via the type addition.
4. **Audit human-readable display (~line 646-649):** Change the badge line from `[${f.category}]` to `[${f.category}] [${f.severity} · ${f.suggested_action}]`. The severity/action badge replaces the separate `severity: ${f.severity}` in the metadata line below.
5. **Audit sort within file groups (~line 617-619):** After grouping by file but before display, sort each file group's findings by severity: risk first, then debt, then observation, then unclassified (`—`). Use a severity weight map for sort comparator.
**Pattern to follow:** Existing audit display formatting at proof.ts:646-649.
**Why:** The badges make severity and action visible at a glance. Sorting surfaces risk findings first.

### Test files (modify/create)

**`tests/utils/proofSummary.test.ts`:**
- Add tests for `computeChainHealth` with severity and action breakdowns: chain with mixed severity values returns correct `by_severity` counts. Chain with mixed `suggested_action` values returns correct `by_action` counts. Chain with findings missing severity/action counts them as `unclassified`. Empty chain returns all zeros.

**`tests/commands/proof.test.ts`:**
- Update existing audit test fixtures to include `suggested_action` field.
- Add test: audit JSON output includes `suggested_action` on findings.
- Add test: audit human-readable output shows `[severity · action]` badges.
- Add test: audit findings within a file group are sorted by severity (risk before debt before observation).

## Acceptance Criteria

- [ ] AC15: `computeChainHealth` returns `by_severity: { risk, debt, observation, unclassified }` and `by_action: { promote, scope, monitor, accept, unclassified }` in the `findings` object
- [ ] AC16: `ChainHealth` interface includes `by_severity` and `by_action` types
- [ ] AC17: Every `--json` meta block includes severity and action breakdowns (via `computeChainHealth`)
- [ ] AC22: Audit display shows `[severity · action]` badges inline on each finding. Findings within each file group sorted by severity (risk → debt → observation → unclassified)
- [ ] AC23: Audit `--json` output includes `suggested_action` on each finding object
- [ ] AC28: Tests pass: `(cd packages/cli && pnpm vitest run)`
- [ ] AC29: Lint passes: `pnpm lint`

## Testing Strategy

- **Unit tests (proofSummary.test.ts):** `computeChainHealth` with severity/action breakdowns — mixed values, missing values (unclassified), empty chain. These are the first tests for `computeChainHealth` in the test suite (none exist currently).
- **Unit tests (proof.test.ts):** Audit output format assertions — JSON includes `suggested_action`, human-readable includes badges, sort order within file groups.
- **Edge cases:** `computeChainHealth` on chain where all findings lack severity/action — all go to `unclassified`. Chain with single entry, single finding. The `wrapJsonResponse`/`wrapJsonError` callers pass the full chain object — verify the parameter type compatibility with the wider signature.

## Dependencies

Phase 1 must be complete. This spec assumes:
- `ChainHealth` interface exists at proofSummary.ts:638
- `computeChainHealth` function exists at proofSummary.ts:682
- `ProofChainEntry` findings have `severity` and `suggested_action` optional fields
- Audit command exists at proof.ts:510 with the current structure

## Constraints

- **Additive JSON contract.** New fields in `computeChainHealth` output are additive. Existing scripts parsing the meta block must not break — `by_severity` and `by_action` are new keys that old consumers ignore.
- **Audit display reorder is intentional.** Severity-first sort within file groups changes existing output order. This is designed behavior, not a regression. The scope explicitly chose to surface risk findings first.
- **`unclassified` must be present even when count is 0.** Downstream consumers can rely on the field always existing in the breakdown objects.

## Gotchas

- **`wrapJsonResponse` and `wrapJsonError` have their own structural type parameters.** At proofSummary.ts:718, `wrapJsonResponse` accepts `chain: { entries: Array<{ findings?: Array<{ status?: string }> }> }`. This must be widened to include `severity?` and `suggested_action?` to match `computeChainHealth`'s widened parameter. Otherwise TypeScript will narrow the type and the new fields won't reach the counter.
- **Audit severity sort changes display output.** Existing tests that assert on audit output order will break if they assumed chain order. Check proof.test.ts for order-dependent assertions in audit tests and update them.
- **`computeChainHealth` is called in two files.** Both `proof.ts` (line 454) and `work.ts` (line 977) call it. The `work.ts` call destructures the result — `{ chain_runs: runs, findings: { active: activeCount, ... } }`. The new `by_severity`/`by_action` fields don't need destructuring there (work.ts doesn't use them), but the return type change must not break the destructuring.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Constants use `SCREAMING_SNAKE_CASE`.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Always use `--run` with `pnpm vitest` to avoid watch mode hang.
- Use `chalk.dim()` for secondary information in terminal display.

### Pattern Extracts

**computeChainHealth status counting — proofSummary.ts:690-701:**
```typescript
  for (const e of chain.entries) {
    for (const f of e.findings || []) {
      total++;
      switch (f.status) {
        case 'active': active++; break;
        case 'lesson': lesson++; break;
        case 'promoted': promoted++; break;
        case 'closed': closed++; break;
        default: active++; break; // undefined = active
      }
    }
  }
```
Severity and action counting goes inside this same loop. Use the same switch pattern with `default: unclassified++`.

**Audit finding construction — proof.ts:577-591:**
```typescript
          const auditFinding: typeof activeFindings[0] = {
            id: finding.id,
            category: finding.category,
            summary: finding.summary,
            file: finding.file,
            anchor: finding.anchor,
            anchor_present: anchorPresent,
            age_days: ageDays,
            severity: finding.severity ?? '—',
            entry_slug: entry.slug,
            entry_feature: entry.feature,
          };
          if (finding.line !== undefined) auditFinding.line = finding.line;
          if (finding.related_assertions !== undefined) auditFinding.related_assertions = finding.related_assertions;
```

**Audit display line — proof.ts:646-649:**
```typescript
          for (const f of displayed) {
            console.log(`    ${chalk.dim(`[${f.category}]`)} ${f.summary}`);
            const anchorIcon = f.anchor ? (f.anchor_present ? '✓' : '✗') : '—';
            console.log(`           age: ${f.age_days}d | anchor: ${anchorIcon} | severity: ${f.severity}`);
```

### Proof Context

- **proofSummary.ts:** Known concerns about dashboard duplication and `fileMatches` overmatch — neither affects `computeChainHealth` expansion.
- **proof.ts:** Known concern about shell injection in close commit message and anchor stripping regex — neither affects audit display changes.
- No active findings directly overlap with this phase's changes.

### Checkpoint Commands

- After `computeChainHealth` changes: `(cd packages/cli && npx tsc --noEmit)` — Expected: clean compile. Destructuring in work.ts still works (new fields are additive).
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: all tests pass.
- Lint: `pnpm lint`

### Build Baseline
- Current tests: Phase 1 baseline (1612+ expected after Phase 1)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1622+ tests (adding ~10 health and audit tests)
- Regression focus: `proofSummary.test.ts` (health function), `proof.test.ts` (audit display)
