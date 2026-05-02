# Spec: Audit JSON Severity Summary

**Created by:** AnaPlan
**Date:** 2026-05-02
**Scope:** .ana/plans/active/audit-json-severity-summary/scope.md

## Approach

Hoist the severity/action counting logic from the terminal-only branch to run before the `if (useJson)` fork. Add the computed counts to the JSON result object as `by_severity` and `by_action`.

Two JSON output paths need the new fields:
1. **Zero-findings early return** (line 1602) — hardcode all-zero objects.
2. **Main result construction** (line 1645) — include the hoisted counts.

The field names match `ChainHealth.findings.by_severity` and `by_action` from `proofSummary.ts` for consistency across JSON responses. The difference: `results.by_severity` = active findings only; `meta.findings.by_severity` = all-time counts. Different scope, same shape, no collision.

The `'—'` → `'unclassified'` mapping (used for display in terminal) applies to both severity and action in the JSON. Terminal shows `'—'`; JSON uses `'unclassified'`.

No new TypeScript interfaces needed. The result object is built ad-hoc in the command. Using the same key names as `ChainHealth` is sufficient for consistency.

## Output Mockups

**`ana proof audit --json` (with findings):**
```json
{
  "command": "proof audit",
  "timestamp": "2026-05-02T12:00:00.000Z",
  "results": {
    "total_active": 5,
    "by_severity": {
      "risk": 2,
      "debt": 1,
      "observation": 2,
      "unclassified": 0
    },
    "by_action": {
      "promote": 1,
      "scope": 2,
      "monitor": 1,
      "accept": 1,
      "unclassified": 0
    },
    "by_file": [ ... ],
    "overflow_files": 0
  },
  "meta": { ... }
}
```

**`ana proof audit --json` (zero findings):**
```json
{
  "command": "proof audit",
  "timestamp": "2026-05-02T12:00:00.000Z",
  "results": {
    "total_active": 0,
    "by_severity": {
      "risk": 0,
      "debt": 0,
      "observation": 0,
      "unclassified": 0
    },
    "by_action": {
      "promote": 0,
      "scope": 0,
      "monitor": 0,
      "accept": 0,
      "unclassified": 0
    },
    "by_file": []
  },
  "meta": { ... }
}
```

**Terminal output: unchanged.**

## File Changes

### `src/commands/proof.ts` (modify)
**What changes:** Hoist severity/action counting above the `if (useJson)` fork. Add `by_severity` and `by_action` to both JSON output paths (zero-findings early return and main result).

**Pattern to follow:** The existing counting logic at lines 1657–1668. Move the iteration and counting to run unconditionally after `activeFindings` is populated, before the `if (useJson)` check. The terminal branch continues using the counts for display. The JSON branch includes them in the result object.

**Specifics:**
- The zero-findings early return at line 1602 currently emits `{ total_active: 0, by_file: [] }`. Add `by_severity` and `by_action` with all-zero values. The counting code won't have run (early return happens before it), so hardcode the zero objects inline.
- The main result at line 1645 currently has `total_active`, `by_file`, `overflow_files`. Add `by_severity` and `by_action` from the hoisted counts.
- For `by_severity`: keys are `risk`, `debt`, `observation`, `unclassified`. Initialize all to 0, then count. Map `'—'` to `'unclassified'`.
- For `by_action`: keys are `promote`, `scope`, `monitor`, `accept`, `unclassified`. Initialize all to 0, then count. Map `'—'` to `'unclassified'`.
- The terminal display logic (`allUnclassified` gating, ordered display) stays exactly as-is. It can read from the same count variables.

**Why:** Without this, Learn pulls severity counts from health's meta block (all-time) instead of audit (active-only), producing wrong numbers.

### `tests/commands/proof.test.ts` (modify)
**What changes:** Update the `@ana A010` test (line 1798) which asserts `severity_summary` and `action_summary` are undefined. Replace it with tests that assert `by_severity` and `by_action` ARE present with correct values. Add new tests for the summary fields.

**Pattern to follow:** The existing `@ana A020, A021` test at line 1490 — it parses `--json` output, checks `json.results.*` fields. Same structure for the new assertions.

**Why:** The A010 test's intent ("no summary in JSON") is inverted by this feature. The new tests verify the summary fields exist and contain correct counts.

## Acceptance Criteria

- [ ] AC1: `ana proof audit --json` response includes `by_severity` with `{ risk, debt, observation, unclassified }` counts computed from active findings only
- [ ] AC2: `ana proof audit --json` response includes `by_action` with `{ promote, scope, monitor, accept, unclassified }` counts computed from active findings only
- [ ] AC3: `by_severity` counts match what the terminal output shows (active-only, not all-time)
- [ ] AC4: `ana proof audit --json --full` includes the same summary fields
- [ ] AC5: Terminal output is unchanged
- [ ] AC6: The `meta` block in the JSON envelope is unchanged (it still shows all-time counts — that's correct for meta)
- [ ] AC7: Existing audit tests pass, new tests verify the summary fields
- [ ] Tests pass with `pnpm vitest run`
- [ ] No build errors

## Testing Strategy

- **Unit tests:** Add tests within the existing audit `describe` blocks in `proof.test.ts`. Use the `createAuditChain` helper and manual entry construction (for controlled severity/action distributions).
- **Test matrix:**
  - JSON output includes `by_severity` with correct counts for mixed severities
  - JSON output includes `by_action` with correct counts for mixed actions
  - Zero findings path includes all-zero `by_severity` and `by_action`
  - `--full` flag includes the same summary fields
  - All-unclassified findings produce correct counts (unclassified > 0, others 0)
  - The `@ana A010` test is replaced — `severity_summary` remains absent (old field name), but `by_severity` is present
- **Edge cases:**
  - Zero active findings: all counts 0, fields present
  - All unclassified: `by_severity.unclassified` equals total, rest 0
  - Findings with `'—'` action: counted as `unclassified` in `by_action`
- **Regression:** Terminal output tests (severity summary line tests at ~line 1596) must continue passing unchanged.

## Dependencies

None. The counting logic already exists in the terminal branch.

## Constraints

- The `meta` block must not change. `meta.findings.by_severity` is all-time counts from `computeChainHealth`. The new `results.by_severity` is active-only. Both coexist.
- No new dependencies or imports needed.
- Terminal output must be character-identical before and after this change.

## Gotchas

- **Two JSON output paths.** The zero-findings early return at line 1602 and the main path at line 1645 BOTH need the new fields. Missing the early return path means zero-findings JSON lacks the summary — Learn would get `undefined` and fall back to meta.
- **`'—'` mapping.** Both `severity` and `suggested_action` use `'—'` for unclassified. Map both to `'unclassified'` in the JSON counts. The terminal display continues using `'—'`.
- **Don't gate on `allUnclassified`.** The terminal display skips the severity line when all findings are unclassified (line 1670). The JSON must ALWAYS include all fields regardless. Don't reuse the `allUnclassified` flag for JSON output.
- **Existing test `@ana A010` (line 1798).** This test asserts `severity_summary` is undefined. The NEW field names are `by_severity` and `by_action` — different from `severity_summary`. The test still passes as-is because the field name differs. BUT the test's intent ("no summary in JSON audit") is now wrong. Replace it with a test asserting the new fields ARE present.
- **`createAuditChain` severity distribution.** The helper assigns severity as `i % 3 === 0 ? 'risk' : 'observation'` — no debt, no unclassified. For tests that need specific distributions, construct the entry manually (like the summary line tests at line 1596).

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer early returns over nested conditionals.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Always use `--run` with `pnpm vitest` to avoid watch mode hang.

### Pattern Extracts

**Existing severity/action counting (proof.ts lines 1657–1668) — the logic to hoist:**
```typescript
// proof.ts:1657-1668
const severityCounts: Record<string, number> = {};
const actionCounts: Record<string, number> = {};
let allUnclassified = true;
for (const f of activeFindings) {
  const sev = f.severity === '—' ? 'unclassified' : f.severity;
  severityCounts[sev] = (severityCounts[sev] || 0) + 1;
  if (f.severity !== '—') allUnclassified = false;

  if (f.suggested_action !== '—') {
    actionCounts[f.suggested_action] = (actionCounts[f.suggested_action] || 0) + 1;
  }
}
```

**Existing JSON result construction (proof.ts lines 1645–1649) — add fields here:**
```typescript
// proof.ts:1645-1649
const result = {
  total_active: activeFindings.length,
  by_file: byFile,
  overflow_files: overflowFiles,
};
```

**Zero-findings early return (proof.ts lines 1602–1603) — add fields here:**
```typescript
// proof.ts:1602-1603
if (useJson) {
  console.log(JSON.stringify(wrapJsonResponse('proof audit', { total_active: 0, by_file: [] }, chain), null, 2));
}
```

**ChainHealth shape for reference (proofSummary.ts lines 542–554):**
```typescript
// proofSummary.ts:542-554
by_severity: {
  risk: number;
  debt: number;
  observation: number;
  unclassified: number;
};
by_action: {
  promote: number;
  scope: number;
  monitor: number;
  accept: number;
  unclassified: number;
};
```

**Existing JSON audit test pattern (proof.test.ts lines 1496–1506):**
```typescript
// proof.test.ts:1496-1506
const { stdout, exitCode } = runProof(['audit', '--json']);
expect(exitCode).toBe(0);

const json = JSON.parse(stdout);
expect(json.command).toBe('proof audit');
expect(json.results.total_active).toBe(5);
expect(json.results.by_file).toBeDefined();
```

### Proof Context
- **proof.ts:** "Audit severity sort also affects JSON output order" — relevant: the severity sort runs before JSON emission, which is fine. The new by_severity counts are order-independent.
- **proof.ts:** "Zero-run JSON path hardcodes verification defaults inline" — same pattern as our zero-findings path. Acceptable for a 4-key object.
- No active proof findings for `proof.test.ts` that overlap with this work.

### Checkpoint Commands

- After modifying `proof.ts`: `cd packages/cli && pnpm vitest run --testPathPattern proof` — Expected: existing audit tests pass (the A010 test may need updating first)
- After all changes: `cd packages/cli && pnpm vitest run` — Expected: all 1798+ tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1798 passed, 2 skipped (1800 total)
- Current test files: 93 passed
- Command used: `cd packages/cli && pnpm vitest run`
- After build: ~1804+ tests (adding ~6 new tests for summary fields)
- Regression focus: existing audit tests in `proof.test.ts` — especially the terminal summary line tests (~line 1596) and the `@ana A010` test (line 1798)
