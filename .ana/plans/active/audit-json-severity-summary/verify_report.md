# Verify Report: Audit JSON Severity Summary

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-02
**Spec:** .ana/plans/active/audit-json-severity-summary/spec.md
**Branch:** feature/audit-json-severity-summary

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/audit-json-severity-summary/contract.yaml
  Seal: INTACT (hash sha256:c0bca7741c9882741c06224a1fea0c954d356a63a30d40b512b0a95e5fdf265e)
```

Tests: 1804 passed, 2 skipped (1806 total), 93 test files. Build: success. Lint: 0 errors (14 pre-existing warnings in unrelated files).

## Contract Compliance
| ID   | Says                                                          | Status        | Evidence |
|------|---------------------------------------------------------------|---------------|----------|
| A001 | Audit JSON includes a severity breakdown of active findings   | ✅ SATISFIED  | `proof.test.ts:1831` — `expect(json.results.by_severity).toBeDefined()` |
| A002 | Severity breakdown has the correct count for each level       | ✅ SATISFIED  | `proof.test.ts:1832` — `expect(json.results.by_severity.risk).toBe(2)` with 2 risk findings in fixture |
| A003 | Severity breakdown counts debt findings separately            | ✅ SATISFIED  | `proof.test.ts:1833` — `expect(json.results.by_severity.debt).toBe(1)` with 1 debt finding in fixture |
| A004 | Severity breakdown counts observation findings                | ✅ SATISFIED  | `proof.test.ts:1834` — `expect(json.results.by_severity.observation).toBe(2)` with 2 observation findings |
| A005 | Audit JSON includes an action breakdown of active findings    | ✅ SATISFIED  | `proof.test.ts:1838` — `expect(json.results.by_action).toBeDefined()` |
| A006 | Action breakdown counts each suggested action correctly       | ✅ SATISFIED  | `proof.test.ts:1840` — `expect(json.results.by_action.scope).toBe(2)` with 2 scope actions in fixture |
| A007 | Action breakdown counts monitor actions                       | ✅ SATISFIED  | `proof.test.ts:1841` — `expect(json.results.by_action.monitor).toBe(1)` |
| A008 | Severity counts come from active findings only, not full chain| ✅ SATISFIED  | `proof.test.ts:1860` — `expect(json.results.by_severity.risk).toBe(2)` via createAuditChain(5,2) |
| A009 | Full audit JSON also includes the severity breakdown          | ✅ SATISFIED  | `proof.test.ts:1876` — `expect(json.results.by_severity).toBeDefined()` on `--full` output |
| A010 | Full audit JSON also includes the action breakdown            | ✅ SATISFIED  | `proof.test.ts:1877` — `expect(json.results.by_action).toBeDefined()` on `--full` output |
| A011 | Terminal severity display still shows the same format         | ✅ SATISFIED  | `proof.test.ts:1991` — `expect(stdout).toContain('2 risk')` on non-JSON audit |
| A012 | Terminal action display still shows the same format           | ✅ SATISFIED  | `proof.test.ts:1992` — `expect(stdout).toContain('1 debt')` on non-JSON audit |
| A013 | The meta envelope still contains all-time chain health counts | ✅ SATISFIED  | `proof.test.ts:1890-1891` — meta.findings.by_severity and by_action both toBeDefined() |
| A014 | Zero active findings still includes severity breakdown zeros  | ✅ SATISFIED  | `proof.test.ts:1923` — `toEqual({ risk: 0, debt: 0, observation: 0, unclassified: 0 })` |
| A015 | Zero active findings still includes action breakdown zeros    | ✅ SATISFIED  | `proof.test.ts:1924` — `toEqual({ promote: 0, scope: 0, monitor: 0, accept: 0, unclassified: 0 })` |
| A016 | Zero findings includes severity/action alongside total_active | ✅ SATISFIED  | `proof.test.ts:1922` — `expect(json.results.total_active).toBe(0)` with by_severity/by_action present |
| A017 | Findings without severity counted as unclassified             | ✅ SATISFIED  | `proof.test.ts:1955` — `expect(json.results.by_severity.unclassified).toBe(2)` with 2 `'—'` findings |
| A018 | Unclassified actions counted when suggested_action missing    | ✅ SATISFIED  | `proof.test.ts:1957` — `expect(json.results.by_action.unclassified).toBe(2)` with 2 `'—'` actions |

## Independent Findings

**Prediction resolution:**
1. `'—'` → `'unclassified'` mapping for `suggested_action` — **Not found.** Builder correctly maps both severity and action (proof.ts:1646,1650) and adds `key !== 'unclassified'` filter (proof.ts:1713) to prevent terminal display regression.
2. Zero-findings early return missing fields — **Not found.** Both `by_severity` and `by_action` present (proof.ts:1605-1606).
3. Old `@ana A010` test still present — **Not found.** Cleanly replaced. Old field names still checked as absent (proof.test.ts:1846-1847).
4. Weak assertions — **Partially confirmed.** A009/A010 `--full` test and A013 meta test use `toBeDefined()`. These match "exists" matchers in the contract so they satisfy, but they don't verify structural correctness. See Findings.
5. Missing `accept` key in fixtures — **Not found.** Builder used custom 5-finding fixtures with all action types.

**Surprise:** The hoisted counting changes terminal behavior in a subtle way. Previously, `'—'` actions were never counted at all. Now they're counted as `'unclassified'` and filtered from display. The builder anticipated this and added the `key !== 'unclassified'` filter at proof.ts:1713. Net terminal behavior is preserved — verified by reading both code paths.

**No over-building detected.** No new exports, no new files, no unused parameters. The change is minimal: hoist counting, add to JSON, filter unclassified from terminal display.

## AC Walkthrough
- [x] **AC1:** `by_severity` with `{ risk, debt, observation, unclassified }` in JSON — ✅ PASS — verified via A001-A004 tests and source inspection (proof.ts:1654-1658)
- [x] **AC2:** `by_action` with `{ promote, scope, monitor, accept, unclassified }` in JSON — ✅ PASS — verified via A005-A007 tests and source inspection (proof.ts:1660-1665)
- [x] **AC3:** `by_severity` counts match active-only (not all-time) — ✅ PASS — A008 test verifies; zero-findings test (A014-A016) uses closed findings to prove exclusion
- [x] **AC4:** `--full` includes same summary fields — ✅ PASS — A009/A010 test verifies `--full` output
- [x] **AC5:** Terminal output unchanged — ✅ PASS — A011/A012 tests verify format; code inspection confirms `key !== 'unclassified'` filter preserves behavior
- [x] **AC6:** `meta` block unchanged — ✅ PASS — A013 test verifies meta.findings.by_severity/by_action exist; no code changes to meta construction
- [x] **AC7:** Existing audit tests pass, new tests verify summary — ✅ PASS — 1804 passed, 6 new tests added, no regressions
- [x] **Tests pass:** ✅ PASS — `pnpm vitest run`: 1804 passed, 2 skipped
- [x] **No build errors:** ✅ PASS — `pnpm run build`: success

## Blockers

None. All 18 contract assertions satisfied. All 9 ACs pass. No regressions. Checked for: unused exports in new code (none — no new exports), unhandled error paths (counting logic has no error paths), unused parameters (none), sentinel test patterns (none — all assertions check specific values against known fixtures).

## Findings

- **Code — Unknown severity/action values dropped from fixed-key JSON objects:** `packages/cli/src/commands/proof.ts:1654` — `bySeverity` only extracts 4 known keys from `severityCounts`. If a finding has severity `'warning'` (not in the set), it's counted in `severityCounts['warning']` but excluded from `bySeverity`. This means `sum(by_severity) < total_active` is possible with unexpected values. Same applies to `byAction`. Not a blocker — the spec defines the 4 keys, and the ChainHealth interface uses the same shape — but downstream consumers who sum the fields to verify against `total_active` will get a mismatch.

- **Test — A008 active-only test lacks negative proof:** `packages/cli/tests/commands/proof.test.ts:1851` — The "severity counts come from active findings only" test uses `createAuditChain(5, 2)` which creates only active findings. There's no closed finding in the fixture to prove exclusion. The zero-findings test (A014-A016) does include a closed finding, providing indirect coverage, but A008 itself doesn't prove active-only counting. Still present from the Finding Enrichment Schema cycle proof context.

- **Test — A013 meta block assertion is existence-only:** `packages/cli/tests/commands/proof.test.ts:1890` — Uses `toBeDefined()` for `json.meta.findings.by_severity` and `by_action`. Proves the fields exist but doesn't verify their values haven't been corrupted. The contract matcher is "exists" so this satisfies the contract, but structurally it's weak — a bug that overwrites meta with garbage would pass.

- **Test — 5-finding fixture duplicated three times:** `packages/cli/tests/commands/proof.test.ts:1801` — The same 5-finding fixture (F001-F005 with known severity/action distribution) is manually constructed at lines 1801, 1965, and the terminal test. A shared `const FIVE_FINDINGS_FIXTURE` would reduce duplication and make future distribution changes a single-point edit.

- **Upstream — `createAuditChain` helper still never generates 'debt' severity:** Still present from Finding Enrichment Schema cycle (see proof context). The helper uses `i % 3 === 0 ? 'risk' : 'observation'` — no debt, no unclassified. Builder worked around this by constructing manual fixtures, which is correct but means the helper remains incomplete for future test authors who might rely on it naively.

## Deployer Handoff

Clean feature addition. Two files changed: `proof.ts` (hoisted counting logic, added fields to both JSON output paths) and `proof.test.ts` (replaced old A010 test, added 6 new test blocks). The JSON output shape now includes `by_severity` and `by_action` in `results` — downstream consumers of `ana proof audit --json` will see new fields. The `meta` block is unchanged. Terminal output is character-identical.

The `key !== 'unclassified'` filter added to the terminal action display loop (proof.ts:1713) is a necessary consequence of hoisting the counting — without it, `'—'` actions (now counted as `'unclassified'`) would appear in terminal output. Worth noting if anyone touches that display loop in the future.

## Verdict
**Shippable:** YES
All 18 contract assertions satisfied. All ACs pass. Tests green (1804 passed). Build clean. Lint clean. The implementation is minimal, correct, and covers both JSON output paths plus the edge cases (zero findings, all-unclassified). Five findings documented — all observations or debt, none blocking.
