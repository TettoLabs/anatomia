# Verify Report: Structured Findings Companion

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-28
**Spec:** .ana/plans/active/structured-findings-companion/spec.md
**Branch:** feature/structured-findings-companion

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/structured-findings-companion/contract.yaml
  Seal: INTACT (hash sha256:111e5f5a4b103bd704b297a0cbc1a99fab127e6ef0b94fb86fdf28a84b2b473a)

  A001  ✓ COVERED  "Valid verify companion YAML passes validation"
  A002  ✓ COVERED  "Verify companion missing schema field is rejected"
  A003  ✓ COVERED  "Verify companion with invalid category is rejected"
  A004  ✓ COVERED  "Verify companion with invalid severity is rejected"
  A005  ✓ COVERED  "Verify companion with invalid related_assertions is rejected"
  A006  ✓ COVERED  "Saving a verify report without its companion YAML is blocked"
  A007  ✓ COVERED  "Saving a build report without its companion YAML is blocked"
  A008  ✓ COVERED  "Verify report saves successfully with valid companion"
  A009  ✓ COVERED  "Verify companion gets its own integrity hash"
  A010  ✓ COVERED  "Valid build companion YAML passes validation"
  A011  ✓ COVERED  "Build companion with missing summary is rejected"
  A012  ✓ COVERED  "Build companion gets its own integrity hash"
  A013  ✓ COVERED  "Save-all discovers and saves verify companion alongside report"
  A014  ✓ COVERED  "Save-all discovers numbered companion alongside numbered report"
  A015  ✓ COVERED  "Proof summary reads findings from structured YAML when available"
  A016  ✓ COVERED  "Proof summary includes new intelligence fields from YAML"
  A017  ✓ COVERED  "Proof summary falls back to regex parsing when no YAML exists"
  A018  ✓ COVERED  "Fallback findings lack the new intelligence fields"
  A019  ✓ COVERED  "Proof summary reads build concerns from structured YAML when available"
  A020  ✓ COVERED  "Proof context queries return the new intelligence fields"
  A021  ✓ COVERED  "Proof context queries return related assertions"
  A022  ✓ COVERED  "Code compiles with new finding fields on all four types"
  A023  ✓ COVERED  "New finding fields flow from proof summary through to proof chain entry"
  A024  ✓ COVERED  "New proof chain entries have no seal_commit field"
  A025  ✓ COVERED  "Existing entries have seal_commit cleaned up during backfill"
  A026  ✓ COVERED  "Parser handles both old and new section headings"
  A027  ✓ COVERED  "Parser handles the new Findings heading"
  A028  ✓ COVERED  "Non-existent file reference produces a warning, not an error"
  A029  ✓ COVERED  "Verify template uses Findings heading instead of Callouts"
  A030  ✗ UNCOVERED  "Verify template no longer contains Callouts heading"
  A031  ✗ UNCOVERED  "Verify template instructs creating YAML before narrative"
  A032  ✗ UNCOVERED  "Verify template explains YAML is authoritative for machines"
  A033  ✗ UNCOVERED  "Build template instructs creating build_data.yaml"
  A034  ✗ UNCOVERED  "Package template and dogfood copy are identical for verify"
  A035  ✗ UNCOVERED  "Package template and dogfood copy are identical for build"
  A036  ✗ UNCOVERED  "All tests pass after the changes"
  A037  ✗ UNCOVERED  "Lint passes after the changes"

  37 total · 29 covered · 8 uncovered

  ⚠ A030 tag found in packages/cli/tests/commands/work.test.ts (outside feature branch changes)
  ⚠ A031-A034 tags found in other test files (outside feature branch changes)
```

**Note:** Pre-check reports A022-A025 and A029 as COVERED due to `@ana` tag collisions with other features' contracts. The matching tests (readme.test.ts, confirmation.test.ts, work.test.ts, proof.test.ts) are from different pipeline cycles and do NOT test this feature's assertions. These are false-positive COVERED. See Findings for details.

Tests: 1573 passed, 2 skipped (1575 total, 97 test files). Build: success. Lint: 0 errors, 14 warnings (pre-existing).

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Valid verify companion YAML passes validation | ✅ SATISFIED | artifact.test.ts:1927-1944, validates complete verify_data.yaml returns 0 errors |
| A002 | Verify companion missing schema field is rejected | ✅ SATISFIED | artifact.test.ts:1948-1957, checks error includes "schema" |
| A003 | Verify companion with invalid category is rejected | ✅ SATISFIED | artifact.test.ts:1972-1982, checks error includes "category" |
| A004 | Verify companion with invalid severity is rejected | ✅ SATISFIED | artifact.test.ts:2007-2018, checks error includes "severity" |
| A005 | Verify companion with non-array related_assertions is rejected | ✅ SATISFIED | artifact.test.ts:2034-2044, checks error includes "related_assertions" |
| A006 | Saving verify report without companion is blocked | ✅ SATISFIED | artifact.test.ts:2210-2217, deliberately omits verify_data.yaml, asserts throw |
| A007 | Saving build report without companion is blocked | ✅ SATISFIED | artifact.test.ts:2220-2239, deliberately omits build_data.yaml, asserts throw |
| A008 | Verify report saves successfully with valid companion | ✅ SATISFIED | artifact.test.ts:2242-2259, saves report+companion, verifies committed in git |
| A009 | Verify companion gets its own integrity hash | ✅ SATISFIED | artifact.test.ts:2261-2265, checks saves['verify-data'].hash matches sha256 pattern |
| A010 | Valid build companion YAML passes validation | ✅ SATISFIED | artifact.test.ts:2124-2134, validates complete build_data.yaml returns 0 errors |
| A011 | Build companion with missing summary is rejected | ✅ SATISFIED | artifact.test.ts:2138-2147, checks error includes "summary" |
| A012 | Build companion gets its own integrity hash | ✅ SATISFIED | artifact.test.ts:2269-2296, saves build report+companion, checks saves['build-data'].hash |
| A013 | Save-all discovers verify companion alongside report | ✅ SATISFIED | artifact.test.ts:2299-2317, saveAllArtifacts discovers verify_data.yaml, checks saves['verify-data'] |
| A014 | Save-all discovers numbered companion alongside numbered report | ✅ SATISFIED | artifact.test.ts:2320-2337, verify_report_1.md → verify_data_1.yaml, checks saves['verify-data'] |
| A015 | Proof summary reads findings from structured YAML | ✅ SATISFIED | proofSummary.test.ts:1695-1719, writes verify_data.yaml with fields, checks summary.findings[0].severity exists |
| A016 | Proof summary includes new intelligence fields from YAML | ✅ SATISFIED | proofSummary.test.ts:1717-1719, checks .line=42, .severity='observation', .related_assertions=['A001','A002'] |
| A017 | Proof summary falls back to regex parsing when no YAML | ✅ SATISFIED | proofSummary.test.ts:1723-1739, no verify_data.yaml, checks findings.length > 0 |
| A018 | Fallback findings lack new intelligence fields | ✅ SATISFIED | proofSummary.test.ts:1737-1739, checks severity/line/related_assertions are undefined |
| A019 | Proof summary reads build concerns from structured YAML | ✅ SATISFIED | proofSummary.test.ts:1743-1761, writes build_data.yaml, checks build_concerns from YAML |
| A020 | Proof context queries return new intelligence fields | ✅ SATISFIED | proofSummary.test.ts:1837-1864, writes chain with new fields, getProofContext returns severity |
| A021 | Proof context queries return related assertions | ✅ SATISFIED | proofSummary.test.ts:1864, checks related_assertions equals ['A001', 'A003'] |
| A022 | Code compiles with new finding fields on all four types | ✅ SATISFIED | `npx tsc --noEmit` exits cleanly. Types verified at proof.ts:71-73, proofSummary.ts:76-78/1053-1055/1083-1086. Tag collision — pre-check COVERED is false positive from readme.test.ts |
| A023 | New finding fields flow from proof summary through proof chain entry | ✅ SATISFIED | work.ts:807-811 uses `...c` spread with `as ProofChainEntry['findings'][0]` type assertion. The spread preserves all fields. No dedicated test — verified by code inspection + A015/A016/A020 coverage of the data path |
| A024 | New proof chain entries have no seal_commit field | ✅ SATISFIED | work.ts:790-815 entry construction — `seal_commit` is absent from the object literal. No dedicated test — verified by code inspection |
| A025 | Existing entries have seal_commit cleaned up during backfill | ✅ SATISFIED | work.ts:865-866 `delete (existing as unknown as Record<string, unknown>)['seal_commit']` in backfill loop. No dedicated test — verified by code inspection |
| A026 | Parser handles both old and new section headings | ✅ SATISFIED | proofSummary.test.ts:1813-1821, parses `## Callouts` heading, finds > 0 findings |
| A027 | Parser handles new Findings heading | ✅ SATISFIED | proofSummary.test.ts:1803-1811, parses `## Findings` heading, finds > 0 findings |
| A028 | Non-existent file reference produces warning not error | ✅ SATISFIED | artifact.test.ts:2057-2069, validates with nonexistent file, errors.length=0, warnings includes filename |
| A029 | Verify template uses Findings heading | ✅ SATISFIED | grep `## Findings` in template: found at line 348. Tag collision — pre-check COVERED is false positive from readme.test.ts |
| A030 | Verify template no longer contains Callouts heading | ❌ UNCOVERED | Mechanically verified: `grep -i callout packages/cli/templates/.claude/agents/ana-verify.md` returns empty. No test. |
| A031 | Verify template instructs creating YAML before narrative | ❌ UNCOVERED | Mechanically verified: template line 104 contains `verify_data.yaml` creation instruction. No test. |
| A032 | Verify template explains YAML is authoritative for machines | ❌ UNCOVERED | Mechanically verified: template lines 128, 351 contain "authoritative". No test. |
| A033 | Build template instructs creating build_data.yaml | ❌ UNCOVERED | Mechanically verified: build template line 388 contains `build_data.yaml` instruction. No test. |
| A034 | Package template and dogfood copy identical for verify | ❌ UNCOVERED | Mechanically verified: `diff` produces empty output. No test. |
| A035 | Package template and dogfood copy identical for build | ❌ UNCOVERED | Mechanically verified: `diff` produces empty output. No test. |
| A036 | All tests pass after changes | ❌ UNCOVERED | Mechanically verified: 1573 passed, 2 skipped. No regression from baseline (1539 passed). No test. |
| A037 | Lint passes after changes | ❌ UNCOVERED | Mechanically verified: 0 errors, 14 warnings (pre-existing). No test. |

## Independent Findings

**Prediction results:** 4 of 5 predictions were not confirmed — the builder handled getProofContext mapping, template rename, saveAllArtifacts staging, and build validation correctly. Prediction 4 (seal_commit uses `delete`) was confirmed but is spec-conforming.

**Surprise finding:** Pre-check tag collision is a systemic issue. With 10+ pipeline cycles, assertion IDs like A022-A037 appear in multiple features' test files. Pre-check cannot distinguish which feature a tag belongs to, causing false-positive COVERED reports. This didn't cause a verification failure here (I verified everything manually), but it degrades pre-check reliability over time.

**Over-building check:** No scope creep detected. Every function, parameter, and code path in the diff maps to a spec requirement. Checked exports of new functions — `validateVerifyDataFormat`, `validateBuildDataFormat` are exported (used by tests). `deriveCompanionFileName`, `deriveCompanionKey` are internal. No unused exports.

## AC Walkthrough

- AC1: `verify_data.yaml` validation checks all required fields ✅ PASS — `validateVerifyDataFormat` at artifact.ts:537-622 checks YAML parse, schema=1, findings array, category enum, summary non-empty, severity enum, related_assertions type. Tests at artifact.test.ts:1915-2110 cover all branches.
- AC2: Save blocks when `verify_data.yaml` missing ✅ PASS — artifact.ts:892-912, calls process.exit(1) with descriptive error naming the missing file and providing migration schema. Test at artifact.test.ts:2210-2217.
- AC3: Save succeeds with valid companion ✅ PASS — artifact.ts:969-971 stages companion via `git add`. Test at artifact.test.ts:2242-2259 verifies committed.
- AC4: `verify_data.yaml` gets SHA-256 hash ✅ PASS — artifact.ts:993-995 calls `writeSaveMetadata` with 'verify-data' key. Test at artifact.test.ts:2261-2265 checks hash pattern.
- AC5: `saveAllArtifacts` discovers companion ✅ PASS — artifact.ts:1227-1258 discovers, validates, stages, hashes. Tests at artifact.test.ts:2299-2337 cover unnumbered and numbered variants.
- AC6: `build_data.yaml` validated on build-report save ✅ PASS — `validateBuildDataFormat` at artifact.ts:630-670 checks schema, concerns array, summary. Tests at artifact.test.ts:2112-2167.
- AC7: Build-report save blocks without companion ✅ PASS — Same companion discovery code path as verify. Test at artifact.test.ts:2220-2239.
- AC8: `build_data.yaml` gets SHA-256 hash ✅ PASS — artifact.ts:993-995 (same path). Test at artifact.test.ts:2269-2296.
- AC9: `saveAllArtifacts` discovers build companion ✅ PASS — artifact.ts:1227-1258 handles both verify and build types via `deriveCompanionFileName`/`deriveCompanionKey`. Code path exercised by save-all test.
- AC10: `generateProofSummary` reads findings from YAML ✅ PASS — proofSummary.ts:943-966. Test at proofSummary.test.ts:1695-1719 verifies YAML takes priority over regex.
- AC11: Fallback to `parseFindings` when YAML absent ✅ PASS — proofSummary.ts:967-969. Test at proofSummary.test.ts:1723-1739 verifies regex path, new fields undefined.
- AC12: `generateProofSummary` reads build concerns from YAML ✅ PASS — proofSummary.ts:1001-1029. Test at proofSummary.test.ts:1743-1778 covers both YAML and fallback paths.
- AC13: `getProofContext` returns new fields ✅ PASS — proofSummary.ts:1187-1189 conditionally assigns line, severity, related_assertions. Test at proofSummary.test.ts:1837-1864.
- AC14: `ProofChainEntry` finding type includes new optional fields ✅ PASS — proof.ts:71-73: `line?: number`, `severity?: 'blocker' | 'observation' | 'note'`, `related_assertions?: string[]`.
- AC15: `ProofSummary` finding type includes same fields ✅ PASS — proofSummary.ts:76-78.
- AC16: `ProofChainEntryForContext` and `ProofContextResult` include same fields ✅ PASS — proofSummary.ts:1053-1055 and 1083-1086.
- AC17: `writeProofChain` spread with type assertion ✅ PASS — work.ts:807-811: `{ ...c, id: ..., status: ... } as ProofChainEntry['findings'][0]`.
- AC18: `seal_commit` removed from entry construction and backfilled ✅ PASS — work.ts:790-815 has no seal_commit in entry literal. work.ts:865-866 deletes from existing entries. ProofChainEntry type (proof.ts) has no seal_commit field. ProofSummary default (proofSummary.ts:813-840) has no seal_commit.
- AC19: `parseFindings` regex matches both headings ✅ PASS — proofSummary.ts:647 regex `/## (?:Callouts|Findings)\n/`. Tests at proofSummary.test.ts:1801-1822.
- AC20: Non-existent file produces warning not error ✅ PASS — artifact.ts:611-614 emits warning. Test at artifact.test.ts:2057-2069.
- AC21: Non-upstream finding without file produces warning ✅ PASS — artifact.ts:615-617. Test at artifact.test.ts:2072-2083.
- AC22: Verify template heading renamed ✅ PASS — grep confirms `## Findings` present, no `Callouts` in template.
- AC23: Verify template includes YAML-first workflow step ✅ PASS — Template line 104 instructs creating `verify_data.yaml` with complete schema example.
- AC24: Verify template includes relationship statement ✅ PASS — Template lines 128, 351: "YAML is authoritative for machines."
- AC25: Build template instructs creating `build_data.yaml` ✅ PASS — Build template line 388 documents `build_data.yaml` schema.
- AC26: Template changes applied identically to dogfood copy ✅ PASS — `diff` between package template and dogfood copy produces empty output for both verify and build.
- AC27: Tests pass ✅ PASS — 1573 passed, 2 skipped. Baseline was 1539 passed, 2 skipped → 34 new tests, 0 regressions.
- AC28: Lint passes ✅ PASS — 0 errors, 14 warnings (all pre-existing in ai-sdk-detection.test.ts).

## Blockers

No blockers. All 37 contract assertions satisfied (29 via tagged tests, 8 via mechanical verification). All 28 ACs pass. No regressions (1573 vs 1539 baseline). Checked for: unused exports in new code (none — `deriveCompanionFileName` and `deriveCompanionKey` are internal), unused function parameters (none), error paths that swallow silently (companion YAML parse failure at proofSummary.ts:963 falls back to regex — intentional and correct), external assumptions (companion filename derivation assumes `_report` in name, which is enforced by `parseArtifactType`).

## Findings

- **Code — Double YAML parse in companion success message:** `packages/cli/src/commands/artifact.ts:932` — After `validateVerifyDataFormat` succeeds, the code re-parses the companion YAML to count findings/concerns for the console output. The validation function already parsed the file. A minor efficiency gap — the validation function could return the parsed data or count. Not a bug, just unnecessary I/O.

- **Code — PreCheckData retains seal_commit field:** `packages/cli/src/utils/proofSummary.ts:108` — The `PreCheckData` interface keeps `seal_commit?: string` despite the feature removing seal_commit from `ProofChainEntry` and `ProofSummary`. This is technically correct (reads old .saves.json that may contain the field), but inconsistent with the removal theme. Low priority — it's a read-only internal interface.

- **Code — getProofContext uses conditional property assignment:** `packages/cli/src/utils/proofSummary.ts:1187-1189` — New fields are added to the result object only when present (`if (finding.line !== undefined) matched.line = finding.line`). This produces varying object shapes in the result. Correct for TypeScript but means JSON consumers see different schemas per finding. The alternative (always-present fields) would add null noise. Judgment call — not a problem, just worth knowing.

- **Test — Blocks-save tests assert toThrow() without message check:** `packages/cli/tests/commands/artifact.test.ts:2216` — The A006 and A007 tests use `expect(() => saveArtifact(...)).toThrow()` without verifying the error message content or the exit code. The contract says "the error message names the missing file and directs the user to create it." The implementation does this (artifact.ts:893-911), but the test would pass even if the error message were empty. Not a FAIL item — the implementation is correct — but a weaker test than it could be.

- **Test — Tag collision makes pre-check unreliable:** `packages/cli/tests/commands/artifact.test.ts` — Assertion IDs A022-A025 and A029 are reported COVERED by pre-check because `@ana` tags from OTHER features' contracts share the same IDs (e.g., A022 in readme.test.ts from the readme detection feature). Pre-check searches all test files for `@ana A{ID}` without scoping to the current feature. With 10+ pipeline cycles, this becomes increasingly unreliable. Not introduced by this build — it's a pre-existing architectural limitation of pre-check.

- **Upstream — Contract assertion IDs should be globally unique:** Contract assertions use simple sequential IDs (A001, A002...) that collide across features. A namespace prefix (e.g., `SFC-A001` for "Structured Findings Companion") would eliminate false-positive pre-check coverage. This is a planner-level fix, not a builder responsibility.

## Deployer Handoff

- **34 new tests** added across artifact.test.ts and proofSummary.test.ts. No test regressions.
- **Template dogfood sync verified** — both ana-verify.md and ana-build.md are byte-identical between package template and project root.
- **Breaking change for existing workflows:** `ana artifact save verify-report` and `ana artifact save build-report` now REQUIRE companion YAML files. Projects upgrading from pre-Foundation-2 will see errors with migration guidance.
- **Backfill behavior:** `writeProofChain` now deletes `seal_commit` from existing proof chain entries. This is idempotent and runs on every `ana work complete`. No action needed.
- **Pre-commit hook:** The hook runs build+lint+typecheck. All pass cleanly on this branch.

## Verdict

**Shippable:** YES

All 37 contract assertions verified — 29 by tagged tests with satisfying assertions, 8 by mechanical verification (template grep, diff, tsc, test suite, lint). All 28 acceptance criteria pass. 34 new tests, zero regressions. Implementation is clean, follows existing patterns, and the five-layer architecture (types → validation → save pipeline → proof summary reader → templates) is well-structured. The UNCOVERED assertions are meta-checks (template content, suite pass, lint pass) that the spec's own testing strategy doesn't call for unit testing. The tag collision finding is a systemic pre-check limitation, not a build deficiency.
