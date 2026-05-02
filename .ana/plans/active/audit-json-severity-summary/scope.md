# Scope: Audit JSON Severity Summary

**Created by:** Ana
**Date:** 2026-05-02

## Intent

`ana proof audit --json` returns active findings grouped by file but no severity or action summary. The terminal output shows `1 risk · 22 debt · 43 observation` — the JSON response doesn't. Learn keeps pulling severity counts from health's meta block (which includes closed/lesson findings) because audit JSON doesn't provide them. This produces wrong numbers in Learn's state summary. Same bug in 3 consecutive Learn sessions despite the template explicitly saying "use audit, not meta."

The template instruction failed 3 times. The data shape needs to change.

## Complexity Assessment
- **Size:** small
- **Files affected:** `src/commands/proof.ts` (audit JSON branch), `tests/commands/proof.test.ts` (audit JSON tests)
- **Blast radius:** Additive — new fields in the JSON response. No existing fields removed or renamed. Terminal output unchanged. The `meta` block in the JSON envelope (from `wrapJsonResponse`) is unchanged.
- **Estimated effort:** <1 hour
- **Multi-phase:** no

## Approach

Move the severity/action counting logic (currently inside the terminal-only `else` branch at lines 1657-1700) to run BEFORE the `if (useJson)` fork. Include the computed counts in the JSON response alongside `total_active`, `by_file`, and `overflow_files`.

The computation already exists — it iterates `activeFindings` and counts by severity and action. Currently it's scoped to the terminal branch. Hoisting it makes it available to both branches.

Design principles applied:
- **"Verified over trusted."** Three Learn sessions proved template instruction doesn't work. Mechanical fix: put the correct data in the response so Learn can't reach for the wrong source.
- **"Solve this problem so the next solution becomes obvious."** Once audit JSON has `by_severity` and `by_action`, the Learn template instruction simplifies to "read the summary from audit" — no "compute it yourself from the findings array" caveat.
- **"The elegant solution is the one that removes."** This removes the reason Learn uses meta. It doesn't add a new data source — it exposes data the command already computes.

## Acceptance Criteria

- AC1: `ana proof audit --json` response includes `by_severity` with `{ risk, debt, observation, unclassified }` counts computed from active findings only
- AC2: `ana proof audit --json` response includes `by_action` with `{ promote, scope, monitor, accept, unclassified }` counts computed from active findings only
- AC3: `by_severity` counts match what the terminal output shows (active-only, not all-time)
- AC4: `ana proof audit --json --full` includes the same summary fields
- AC5: Terminal output is unchanged
- AC6: The `meta` block in the JSON envelope is unchanged (it still shows all-time counts — that's correct for meta)
- AC7: Existing audit tests pass, new tests verify the summary fields

## Edge Cases & Risks

- **Zero active findings.** All counts should be 0, not absent. The response should include `by_severity: { risk: 0, debt: 0, observation: 0, unclassified: 0 }` even when empty.
- **Unclassified findings.** Active findings with no severity field (from pre-enrichment entries) should be counted as `unclassified` in `by_severity`. Same pattern as the terminal display.
- **The `meta` block already has `by_severity`.** The new fields are at the `results` level, not the `meta` level. `results.by_severity` = active only. `meta.findings.by_severity` = all time. Different data, different levels, no collision.

## Rejected Approaches

- **Template instruction to compute counts from findings array.** Tried for 3 sessions. Learn ignores it and uses health meta because meta has the convenient `by_severity` object. Instruction alone doesn't fix data shape problems.
- **Add active-only counts to health meta.** Would work but health's meta is about the full chain, not active findings. Adding active-only counts to health conflates two concerns. Audit is the active findings command — it should have the active findings summary.

## Open Questions

None.

## Exploration Findings

### Patterns Discovered
- `proof.ts` lines 1657-1700: severity/action counting already implemented for terminal display. Iterates `activeFindings`, builds `severityCounts` and `actionCounts` records. Uses ordered arrays (`sevOrder`, `actOrder`) for display formatting.
- `proof.ts` lines 1636-1650: JSON branch builds `result` object with `total_active`, `by_file`, `overflow_files`. The severity/action counts are NOT included.
- `proofSummary.ts` lines 536-554: `ChainHealth.findings.by_severity` and `by_action` — the meta block shape. Same field names, different scope (all-time vs active-only). The audit JSON should use the SAME field names for consistency but at the `results` level.

### Constraints Discovered
- [TYPE-VERIFIED] The `wrapJsonResponse` envelope adds `meta` from `computeChainHealth`. This is separate from `results`. Adding fields to `results` doesn't touch `meta`.
- [OBSERVED] The severity counting handles '—' as unclassified (line 1661). The JSON fields should use the string `'unclassified'` not `'—'`.
- [OBSERVED] Terminal display only shows severity/action lines when `!allUnclassified` (line 1670). The JSON should always include the fields regardless — consumers handle empty counts.

### Test Infrastructure
- `proof.test.ts` audit tests start around line 1560. Existing JSON tests check `results.total_active`, `results.by_file`. New tests add checks for `results.by_severity` and `results.by_action`.

## For AnaPlan

### Structural Analog
The terminal severity counting at lines 1657-1700 IS the implementation. Hoist it above the `if (useJson)` fork and add the counts to the `result` object at line 1645.

### Relevant Code Paths
- `src/commands/proof.ts` lines 1636-1650 — JSON result construction (add fields here)
- `src/commands/proof.ts` lines 1657-1700 — severity/action counting (hoist this)
- `src/utils/proofSummary.ts` lines 536-554 — `ChainHealth` type (reference for field names)
- `tests/commands/proof.test.ts` ~line 1560 — audit test section

### Patterns to Follow
- Use the same field names as `ChainHealth.findings.by_severity` and `by_action` for consistency across JSON responses
- The counting logic handles `'—'` → `'unclassified'` mapping (line 1661) — preserve this

### Known Gotchas
- **TWO JSON output paths.** The zero-findings early return at line 1602 produces `{ total_active: 0, by_file: [] }`. The main path at line 1636 produces the full result. BOTH need `by_severity` and `by_action`. The zero-findings path should include all-zero counts, not omit the fields.
- The `allUnclassified` flag (line 1659) controls whether terminal severity lines are shown. The JSON should ALWAYS include the fields — don't gate on `allUnclassified`.
- The terminal counting uses string keys ('risk', 'debt', etc.) in a `Record<string, number>`. For the JSON response, use a typed object matching the `ChainHealth` shape for consistency.
- `severity` uses `'—'` for unclassified (line 1589: `finding.severity ?? '—'`). The JSON `by_severity` should use the key `'unclassified'`, not `'—'`.

### Things to Investigate
- Whether the `by_severity` and `by_action` fields need their own TypeScript interface or can reuse the shape from `ChainHealth.findings`.
