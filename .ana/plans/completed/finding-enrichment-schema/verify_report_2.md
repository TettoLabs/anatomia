# Verify Report: Finding Enrichment Schema — Phase 2

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-29
**Spec:** .ana/plans/active/finding-enrichment-schema/spec-2.md
**Branch:** feature/finding-enrichment-schema

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/finding-enrichment-schema/contract.yaml
  Seal: INTACT (hash sha256:00d755c62292eacb7737c06f0e93b2c062bc3d023cdae2e30b0e6b682c40d59e)

  A001  ✓ COVERED  "Findings can be classified by impact: risk, debt, or observation"
  A002  ✓ COVERED  "Findings include a recommended next action"
  A003  ✓ COVERED  "Proof summary findings carry the same classification fields"
  A004  ✓ COVERED  "Verification results use exact status values, not open strings"
  A005  ✓ COVERED  "Assertion statuses use exact values, not open strings"
  A006  ✓ COVERED  "Finding categories use exact values, not open strings"
  A007  ✓ COVERED  "The proof chain tracks its schema version for future migrations"
  A008  ✓ COVERED  "Only the new severity values are accepted — old values are rejected"
  A009  ✓ COVERED  "The four recommended actions are the only accepted values"
  A010  ✓ COVERED  "Saving a finding without severity is blocked with a clear error"
  A011  ✓ COVERED  "Saving a finding without a recommended action is blocked"
  A012  ✓ COVERED  "Saving a finding with an invalid severity value is blocked"
  A013  ✓ COVERED  "Saving a finding with an invalid action value is blocked"
  A014  ✓ COVERED  "Build concerns also require severity classification"
  A015  ✓ COVERED  "Build concerns also require a recommended action"
  A016  ✓ COVERED  "The YAML reader correctly parses the recommended action from companion files"
  A017  ✓ COVERED  "Proof context lookups include the recommended action when available"
  A018  ✓ COVERED  "Proof context omits the action field when the finding predates enrichment"
  A016b  ✓ COVERED  "Build concern classification survives the YAML reader without being silently dropped"
  A019  ✓ COVERED  "Old blocker findings are automatically reclassified as risk"
  A020  ✓ COVERED  "Old note findings are automatically reclassified as observation"
  A021  ✓ COVERED  "Severity migration is safe to run repeatedly without changing results"
  A022  ✓ COVERED  "The verify agent template teaches the new severity vocabulary"
  A023  ✓ COVERED  "The verify agent template requires both classification fields"
  A024  ✓ COVERED  "The build agent template teaches concern classification"
  A025  ✓ COVERED  "Dogfood agent copies match the templates exactly"
  A026  ✓ COVERED  "Health statistics break down findings by impact severity"
  A027  ✓ COVERED  "Health statistics break down findings by recommended action"
  A028  ✓ COVERED  "Findings without severity are counted as unclassified, not lost"
  A029  ✓ COVERED  "Findings without an action are counted as unclassified, not lost"
  A030  ✓ COVERED  "JSON API responses include the severity breakdown"
  A031  ✓ COVERED  "Audit shows each finding's severity and action at a glance"
  A032  ✓ COVERED  "Audit JSON includes the recommended action for each finding"
  A033  ✓ COVERED  "Audit surfaces the most critical findings first within each file"

  34 total · 34 covered · 0 uncovered
```

Tests: 1623 passed, 2 skipped (1625 total). Build: success. Lint: 0 errors (14 pre-existing warnings in ai-sdk-detection.test.ts).

## Contract Compliance

Phase 2 assertions only (A026–A033). Phase 1 assertions (A001–A025) were verified in verify_report_1.md.

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A026 | Health statistics break down findings by impact severity | ✅ SATISFIED | proofSummary.test.ts:2020 — creates chain with 2 risk, 1 debt, 1 observation; asserts `health.findings.by_severity` equals `{ risk: 2, debt: 1, observation: 1, unclassified: 0 }` with `toEqual` |
| A027 | Health statistics break down findings by recommended action | ✅ SATISFIED | proofSummary.test.ts:2037 — same chain; asserts `health.findings.by_action` equals `{ promote: 1, scope: 1, monitor: 1, accept: 1, unclassified: 0 }` with `toEqual` |
| A028 | Findings without severity are counted as unclassified, not lost | ✅ SATISFIED | proofSummary.test.ts:2055 — chain with 1 risk + 2 without severity; asserts `by_severity.unclassified` is `2` and `by_severity.risk` is `1` |
| A029 | Findings without an action are counted as unclassified, not lost | ✅ SATISFIED | proofSummary.test.ts:2071 — chain with 1 promote + 2 without action; asserts `by_action.unclassified` is `2` and `by_action.promote` is `1` |
| A030 | JSON API responses include the severity breakdown | ✅ SATISFIED | proofSummary.test.ts:2108 — creates chain with mixed findings; verifies `by_severity` counts alongside existing status counts. Live verification: `proof audit --json` returns `meta.findings.by_severity` and `meta.findings.by_action` objects with correct keys |
| A031 | Audit shows each finding's severity and action at a glance | ✅ SATISFIED | proof.test.ts:1194 — creates 3-finding chain via `createAuditChain`; asserts stdout contains `[risk · scope]` and `[observation · monitor]`. Live verification: `proof audit` shows `[severity · action]` badges on every finding line |
| A032 | Audit JSON includes the recommended action for each finding | ✅ SATISFIED | proof.test.ts:1176 — creates 3-finding chain; iterates JSON findings and asserts each has `suggested_action` defined as string. Live verification: `proof audit --json` shows `suggested_action` key on every finding object |
| A033 | Audit surfaces the most critical findings first within each file | ✅ SATISFIED | proof.test.ts:1209 — creates chain with findings in order [observation, risk, debt] in same file; asserts output order is risk < debt < observation by line index. Implementation at proof.ts:619-631 uses `SEVERITY_WEIGHT` map: `{ risk: 0, debt: 1, observation: 2 }`, default 3 for unclassified |

## Independent Findings

### Prediction Resolution

1. **Duplicate `from:` line in audit display** — CONFIRMED. proof.ts:660 includes `from: ${f.entry_feature}` in the metadata line (alongside age and anchor), and proof.ts:661 prints `from: ${f.entry_feature}` again as a standalone line. Live output confirms every finding shows the feature name twice. The old display had `severity: ${f.severity}` on the second metadata line — the builder replaced that with the `[severity · action]` badge on the first line (correct) but didn't remove the second `from:` line. The spec mockup shows only one `from:` per finding.

2. **`createAuditChain` never generates `debt` severity** — CONFIRMED. Line 1025: `severity: i % 3 === 0 ? 'risk' : 'observation'`. Only risk and observation are produced. The A031 badge test only checks for `[risk · scope]` and `[observation · monitor]` — a `[debt · X]` badge is never tested in human-readable display. The A033 sort test (proof.test.ts:1209) DOES exercise all three severities because it constructs its own fixture rather than using the helper. So sort coverage is fine; badge display coverage has a gap.

3. **A032 test uses toBeDefined() rather than specific value** — CONFIRMED. proof.test.ts:1188 asserts `f.suggested_action` is defined and is a string, but doesn't check the actual value matches what `createAuditChain` generates (`scope` or `monitor`). The test would pass even if `suggested_action` were an empty string. Low risk — the field flows through from chain data — but a weaker assertion than testing-standards recommend.

4. **`wrapJsonError` null-chain fallback wasn't updated** — NOT FOUND. proofSummary.ts:798-802 includes `by_severity` and `by_action` with all-zero objects in the null-chain fallback. Builder got this right.

5. **`work.ts` destructuring breaks with new return shape** — NOT FOUND. work.ts:986 destructures only `{ chain_runs, findings: { active, closed, lesson, promoted, total } }` — the new `by_severity`/`by_action` fields are ignored by the destructuring. No TypeScript error because they're additive. Confirmed by clean build.

### Surprised Finding

**Duplicate `from:` line is the clear miss.** The spec mockup at lines 53-59 shows one metadata line per finding with `age: | anchor: | from:`. The builder correctly moved severity/action into the badge and replaced the old `severity: ${f.severity}` metadata line — but the replacement was incomplete. The old second line (`from: ${f.entry_feature}`) was left intact, and the builder grafted `from:` onto the first line too. The live output confirms every finding displays `from:` twice. This isn't a contract failure (A031 says "shows badges at a glance" — it does) but it's a display defect.

### Production Risk

**Display noise from duplicate line is the only production-facing issue.** The `computeChainHealth` and JSON changes are clean. The data layer works correctly — only the terminal display has this cosmetic problem.

## AC Walkthrough

- AC15: `computeChainHealth` returns `by_severity: { risk, debt, observation, unclassified }` and `by_action: { promote, scope, monitor, accept, unclassified }` — ✅ PASS — proofSummary.ts:748-754; verified by unit tests and live `proof audit --json`
- AC16: `ChainHealth` interface includes `by_severity` and `by_action` types — ✅ PASS — proofSummary.ts:652-664
- AC17: Every `--json` meta block includes severity and action breakdowns — ✅ PASS — `wrapJsonResponse` at line 772 calls `computeChainHealth`; `wrapJsonError` at line 794-802 includes full breakdown. Live: `proof audit --json` meta includes both objects
- AC22: Audit display shows `[severity · action]` badges; findings sorted by severity — ✅ PASS — proof.ts:658 shows `[${f.severity} · ${f.suggested_action}]`; sort at proof.ts:624-631 uses SEVERITY_WEIGHT map; live output confirms badges and sort order
- AC23: Audit `--json` output includes `suggested_action` on each finding — ✅ PASS — proof.ts:550 type includes `suggested_action`; proof.ts:587 sets it from `finding.suggested_action ?? '—'`; live JSON output confirms key present
- AC28: Tests pass — ✅ PASS — 1623 passed, 2 skipped (up from 1612 in Phase 1)
- AC29: Lint passes — ✅ PASS — 0 errors, 14 pre-existing warnings

## Blockers

No blockers. All 8 Phase 2 contract assertions satisfied. All 7 acceptance criteria pass. The duplicate `from:` line is a display defect but not a contract violation — A031 requires badges at a glance, which are present. The defect is cosmetic — it adds noise but doesn't break functionality. Checked: no unused exports in new code (`SEVERITY_WEIGHT` is used in the sort comparator at same scope), no unhandled error paths (the sort and badge logic are inside an existing try/catch-guarded block), no external state assumptions (all new code operates on in-memory chain data).

## Findings

- **Code — Duplicate `from:` metadata line in audit display:** `packages/cli/src/commands/proof.ts:661` — Line 660 already outputs `age: Xd | anchor: Y | from: {feature}`. Line 661 then outputs `from: {feature}` again. Every finding in the live audit display shows the feature name twice. The spec mockup shows a single `from:` per finding. The builder correctly moved severity/action into the `[severity · action]` badge on the first content line (658) and replaced `severity:` in the metadata line with `from:` (660), but left the old standalone `from:` line (661) in place. Fix: delete line 661.

- **Test — `createAuditChain` fixture lacks `debt` severity coverage:** `packages/cli/tests/commands/proof.test.ts:1025` — `severity: i % 3 === 0 ? 'risk' : 'observation'` never produces `debt`. The A031 badge test only verifies `[risk · scope]` and `[observation · monitor]` in stdout. A `[debt · X]` badge is never tested in human-readable output. The A033 sort test exercises all three severities using its own fixture, so sort behavior has full coverage.

- **Test — A032 weak assertion on `suggested_action`:** `packages/cli/tests/commands/proof.test.ts:1188` — `expect(f.suggested_action).toBeDefined()` plus `typeof` check. Testing-standards say "assert on specific expected values from real inputs." Since `createAuditChain` generates deterministic values (`scope` or `monitor`), the test could assert on those specific strings. Current assertion passes even if `suggested_action` were empty string.

- **Code — `SEVERITY_WEIGHT` map is locally scoped:** `packages/cli/src/commands/proof.ts:619` — The severity weight ordering `{ risk: 0, debt: 1, observation: 2 }` is defined inline in the audit command block. If severity-based sorting is needed elsewhere (e.g., dashboard, proof list), this map would need to be duplicated or extracted. Currently single-use, so not a problem today — noting for future awareness.

- **Upstream — Pre-check tag collision on Phase 2 assertions:** A026-A033 tags exist in `readme.test.ts`, `dependencies.test.ts`, `work.test.ts` from other features' contracts that reuse the same assertion IDs. Pre-check reports COVERED for all 8 assertions, but some matches are from unrelated tests. The real Phase 2 tests are in `proofSummary.test.ts:2019-2143` and `proof.test.ts:1176-1258`. Same limitation noted in Phase 1 verify report — namespaced assertion IDs would fix this.

## Deployer Handoff

This completes Phase 2 of 2 for Finding Enrichment Schema.

Key things for the merger:
- **Duplicate `from:` line:** Every audit finding displays the source feature name twice in terminal output. Cosmetic only — no data or JSON impact. One-line fix: delete proof.ts:661.
- **Additive JSON contract:** `by_severity` and `by_action` are new keys in the `meta.findings` object. Existing JSON consumers that parse `meta.findings.active` etc. are unaffected — the new keys are additive.
- **Audit sort changes existing output order:** Findings within file groups now sort by severity (risk → debt → observation → unclassified) instead of chain insertion order. This is spec-designed behavior, not a regression. Any scripts that depend on audit display order should be aware.
- **Test count:** 1623 passed (up from 1612 in Phase 1, +11 new tests for health and audit).
- **`work.ts` compatible:** The `computeChainHealth` return type expansion is backward-compatible with work.ts destructuring — new fields are ignored.

## Verdict
**Shippable:** YES

All 8 Phase 2 contract assertions satisfied. All 7 ACs pass. 1623 tests pass. Build and lint clean. The duplicate `from:` line is a genuine cosmetic defect but not a contract violation — A031 requires severity/action badges at a glance, which are present and correct. The `computeChainHealth` expansion, JSON meta propagation, and severity sort are all clean. I'd ship this with a follow-up note to delete the duplicate line.
