# Verify Report: Work Complete JSON + Proof Card Findings

**Result:** FAIL
**Created by:** AnaVerify
**Date:** 2026-04-29
**Spec:** .ana/plans/active/work-complete-json-proof-card/spec.md
**Branch:** feature/work-complete-json-proof-card

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/work-complete-json-proof-card/contract.yaml
  Seal: INTACT (hash sha256:a4e10906e29ae3ad08a92f75d34fb634554de96d6be1c954e24077a46a5921dd)

  A001  ✓ COVERED  "Work complete accepts a JSON output flag"
  A002  ✓ COVERED  "Completing work with JSON flag produces a structured envelope"
  A003  ✓ COVERED  "JSON output includes a timestamp for audit trails"
  A004  ✓ COVERED  "JSON output includes results with completion summary"
  A005  ✓ COVERED  "JSON output includes chain health metadata"
  A006  ✓ COVERED  "JSON results include the work item slug"
  A007  ✓ COVERED  "JSON results include the feature name"
  A008  ✓ COVERED  "JSON results include the verification result"
  A009  ✓ COVERED  "JSON results include contract satisfaction counts"
  A010  ✓ COVERED  "JSON results include new findings count"
  A011  ✓ COVERED  "JSON results include rejection cycle count"
  A012  ✓ COVERED  "Chain health metadata includes severity breakdowns from Phase B"
  A013  ✓ COVERED  "Chain health metadata includes action breakdowns from Phase B"
  A014  ✓ COVERED  "Recovery path produces the same JSON envelope as the main path"
  A015  ✓ COVERED  "Recovery path JSON includes chain health metadata"
  A016  ✓ COVERED  "Recovery path reports zero new findings since it replays a completed state"
  A017  ✓ COVERED  "Completing work without JSON flag produces the same console output as before"
  A018  ✓ COVERED  "Proof card shows findings with severity and action badges"
  A019  ✓ COVERED  "Proof card findings show the action in the badge"
  A020  ✓ COVERED  "Findings are sorted so risk items appear before debt and observation"
  A021  ✓ COVERED  "Only the top five findings are shown with a count of remaining"
  A022  ✓ COVERED  "Proof card shows build concerns with the same badge format"
  A023  ✓ COVERED  "Build concerns use severity and action badges"
  A024  ✓ COVERED  "Findings without severity display without crashing or showing undefined"
  A025  ✓ COVERED  "Findings without severity still show their summary text"
  A026  ✓ COVERED  "Proof card with no findings omits the Findings section entirely"
  A027  ✓ COVERED  "JSON contract object contains only the four expected fields"

  27 total · 27 covered · 0 uncovered
```

Seal: INTACT. All 27 assertions tagged.

Tests: 1657 passed, 2 skipped (97 files). Build: success. Lint: 0 errors, 14 warnings (pre-existing in ai-sdk-detection.test.ts).

## Contract Compliance
| ID   | Says                                           | Status       | Evidence |
|------|------------------------------------------------|--------------|----------|
| A001 | Work complete accepts a JSON output flag | ✅ SATISFIED | `work.test.ts:1981` reads source, confirms `option('--json'` exists. Weak (source-read not behavioral) but satisfies the contract target `completeCommand.options` contains `--json`. |
| A002 | Completing work with JSON flag produces a structured envelope | ✅ SATISFIED | `work.test.ts:1990` parses stdout JSON, asserts `json.command === 'work complete'` |
| A003 | JSON output includes a timestamp for audit trails | ✅ SATISFIED | `work.test.ts:2001` asserts `json.timestamp` is defined |
| A004 | JSON output includes results with completion summary | ✅ SATISFIED | `work.test.ts:2002` asserts `json.results` is defined |
| A005 | JSON output includes chain health metadata | ✅ SATISFIED | `work.test.ts:2003` asserts `json.meta` is defined |
| A006 | JSON results include the work item slug | ✅ SATISFIED | `work.test.ts:2018` asserts `json.results.slug === 'fields-test'` |
| A007 | JSON results include the feature name | ✅ SATISFIED | `work.test.ts:2019` asserts `json.results.feature` is defined |
| A008 | JSON results include the verification result | ❌ UNSATISFIED | `work.test.ts:2020` asserts `json.results.result` with `toBeDefined()`. Contract: `matcher: "contains"`, `value: "PASS"`. Test would pass even if `result` were `"FAIL"`. Needs `expect(json.results.result).toContain('PASS')` or `toBe('PASS')`. |
| A009 | JSON results include contract satisfaction counts | ✅ SATISFIED | `work.test.ts:2021-2024` asserts all four contract subfields defined |
| A010 | JSON results include new findings count | ✅ SATISFIED | `work.test.ts:2025-2026` asserts `new_findings` defined and is number |
| A011 | JSON results include rejection cycle count | ✅ SATISFIED | `work.test.ts:2027-2028` asserts `rejection_cycles` defined and is number |
| A012 | Chain health metadata includes severity breakdowns | ✅ SATISFIED | `work.test.ts:2051` asserts `json.meta.findings.by_severity` defined |
| A013 | Chain health metadata includes action breakdowns | ✅ SATISFIED | `work.test.ts:2052` asserts `json.meta.findings.by_action` defined |
| A014 | Recovery path produces the same JSON envelope | ✅ SATISFIED | `work.test.ts:2138-2141` parses recovery JSON, asserts `json.command === 'work complete'` |
| A015 | Recovery path JSON includes chain health metadata | ✅ SATISFIED | `work.test.ts:2142` asserts `json.meta` defined |
| A016 | Recovery path reports zero new findings | ✅ SATISFIED | `work.test.ts:2141` asserts `json.results.new_findings === 0` |
| A017 | Non-JSON output unchanged | ✅ SATISFIED | `work.test.ts:2159` asserts output does not contain `'"command"'`, contains `'PASS'` and `'satisfied'` |
| A018 | Proof card shows findings with severity and action badges | ✅ SATISFIED | `proof.test.ts:318` asserts stdout contains `[risk` |
| A019 | Proof card findings show the action in the badge | ✅ SATISFIED | `proof.test.ts:319` asserts stdout contains `promote]` |
| A020 | Findings sorted by severity | ✅ SATISFIED | `proof.test.ts:340-345` provides out-of-order findings, asserts risk index < debt < observation |
| A021 | Top five findings with truncation | ✅ SATISFIED | `proof.test.ts:365` asserts `... and 2 more` with 7 findings |
| A022 | Build concerns section with badge format | ✅ SATISFIED | `proof.test.ts:399` asserts stdout contains `Build Concerns` |
| A023 | Build concerns use severity and action badges | ✅ SATISFIED | `proof.test.ts:400-401` asserts stdout contains `[debt` and `[observation` |
| A024 | Findings without severity display without crash | ✅ SATISFIED | `proof.test.ts:418` asserts stdout does not contain `undefined` |
| A025 | Findings without severity show summary text | ✅ SATISFIED | `proof.test.ts:417` asserts stdout contains `Legacy finding without classification` |
| A026 | No findings omits section entirely | ✅ SATISFIED | `proof.test.ts:427` asserts stdout does not contain `Findings` using default sampleEntry (no findings) |
| A027 | Contract shape is clean | ✅ SATISFIED | `work.test.ts:2043` asserts contract does not have `covered` or `uncovered` properties |

**Summary:** 26 SATISFIED, 1 UNSATISFIED (A008).

## Independent Findings

The implementation is clean and well-structured. Both work.ts and proof.ts changes follow existing patterns. The `--json` flag wiring in `registerWorkCommand` is identical to the `getWorkStatus` pattern. The proof card findings display correctly follows the section pattern (chalk.bold header, gray underline, indented content). The `wrapJsonResponse` + `computeChainHealth` delegation is correct.

**Step 3 prediction resolutions:**
1. **A001 source-code test** — Confirmed. Same anti-pattern as `@ana A020` in proof context. The contract target is `completeCommand.options` which is literally about the option registration, so SATISFIED, but it's a pattern debt.
2. **A008 toBeDefined()** — Confirmed. The tagged test only checks existence, not value. Contract requires `contains "PASS"`.
3. **SEVERITY_ORDER duplication** — Confirmed. Lines 147 and 176 in proof.ts define identical `{ risk: 0, debt: 1, observation: 2 }` maps. Matches the known proof context finding about `SEVERITY_WEIGHT` being local in the audit command block.
4. **Recovery path stdout pollution** — Confirmed. Line 1078 prints `"Recovering incomplete completion — retrying commit..."` via `console.log` before the JSON check on line 1108. A JSON consumer parsing stdout will get parse errors.
5. **Main path chain re-read** — Confirmed at line 1318. Necessary because `writeProofChain` returns `ProofChainStats` not the chain object. Matches known build concern about nudge re-read pattern.

**Surprised:** The recovery path JSON test (`work.test.ts:2145`) explicitly works around the stdout pollution with `output.substring(output.indexOf('{'))`. The test knows there's extra text before the JSON and skips past it. This masks a real issue.

**Over-building check:** No scope creep detected. All new code serves contract assertions. No unused exports — `completeWork` is the existing export with a backward-compatible signature change. No new utility functions or abstractions were introduced. The `SEVERITY_ORDER` constant is duplicated rather than extracted, which is under-building if anything.

## AC Walkthrough

- **AC1:** `work complete` accepts `--json` flag — ✅ PASS. `registerWorkCommand` adds `.option('--json', ...)` at line 1370. Verified in source.
- **AC2:** Main path outputs four-key JSON envelope — ✅ PASS. Lines 1316-1339 emit `{ command, timestamp, results, meta }` via `wrapJsonResponse`. Test at line 1990 verifies all four keys.
- **AC3:** `results` includes all expected fields — ⚠️ PARTIAL. Fields are present (slug, feature, result, contract, new_findings, rejection_cycles) at lines 1326-1337. But A008 test doesn't verify `result` contains "PASS" per contract.
- **AC4:** `meta` uses `computeChainHealth` — ✅ PASS. Line 1339 calls `wrapJsonResponse` which delegates to `computeChainHealth`. Test at line 2051 verifies `by_severity` and `by_action`.
- **AC5:** Recovery path outputs same envelope — ✅ PASS. Lines 1108-1122 construct identical envelope structure on recovery path. Test at line 2138 verifies.
- **AC6:** Recovery `new_findings` is 0 — ✅ PASS. Line 1119 hardcodes `new_findings: 0`. Test at line 2141 asserts `toBe(0)`.
- **AC7:** Non-JSON output unchanged — ✅ PASS. Lines 1340-1347 preserve original output in `else` branch. Test at line 2159 confirms no JSON keys in output.
- **AC8:** Proof card findings with badges — ✅ PASS. Lines 156-160 in proof.ts format `[severity · action]` badges. Test at line 318.
- **AC9:** Findings sorted by severity — ✅ PASS. Lines 148-152 sort by severity lookup. Test at line 340 verifies risk < debt < observation.
- **AC10:** Top 5 with truncation — ✅ PASS. Lines 154-166 slice to 5 and add `... and N more`. Tests at lines 365 and 382.
- **AC11:** Build concerns with badges — ✅ PASS. Lines 170-196 mirror findings section. Test at line 399.
- **AC12:** Pre-Phase B graceful degradation — ✅ PASS. Lines 157-161 guard on `severity && suggested_action`. Test at line 417 confirms no `undefined`.
- **AC13:** Tests pass — ✅ PASS. 1657 passed, 2 skipped, 0 failed.
- **AC14:** Lint passes — ✅ PASS. 0 errors, 14 warnings (pre-existing).

## Blockers

A008 UNSATISFIED. The test tagged `@ana A008` at `packages/cli/tests/commands/work.test.ts:2020` asserts `toBeDefined()` on `json.results.result`. The contract specifies `matcher: "contains"`, `value: "PASS"`. The assertion passes regardless of the result value — it would pass on `"FAIL"` or `"UNKNOWN"`. Fix: `expect(json.results.result).toContain('PASS')`.

This is a one-line test fix.

## Findings

- **Test — A008 assertion checks existence not correctness:** `packages/cli/tests/commands/work.test.ts:2020` — uses `toBeDefined()` when the contract requires `contains "PASS"`. Test passes on broken AND working code. This is the blocker.

- **Code — Recovery path leaks non-JSON text to stdout before JSON envelope:** `packages/cli/src/commands/work.ts:1078` — `console.log(chalk.yellow('Recovering incomplete completion — retrying commit...'))` prints to stdout before the JSON check on line 1108. A CI consumer doing `JSON.parse(stdout)` on the recovery path will fail. The spec says `--json` suppresses ALL console output. Not a contract failure (no assertion covers stdout cleanliness on recovery), but a real production risk. The test at line 2145 masks this by using `output.indexOf('{')` to skip past the text.

- **Code — SEVERITY_ORDER constant duplicated:** `packages/cli/src/commands/proof.ts:147` and `:176` — identical `{ risk: 0, debt: 1, observation: 2 }` map defined in both the Findings and Build Concerns blocks. Still present — see proof context finding about `SEVERITY_WEIGHT map is local to audit command block`.

- **Test — A001 uses source-code reading instead of behavioral test:** `packages/cli/tests/commands/work.test.ts:1981` — reads `work.ts` source and checks for `option('--json'` string. Same anti-pattern as the proof context finding on A020. Passes even if the option registration is syntactically wrong.

- **Code — Main path re-reads proof_chain.json after writeProofChain:** `packages/cli/src/commands/work.ts:1318` — `writeProofChain` returns `ProofChainStats` but not the chain object, so re-read is necessary for `computeChainHealth`. Matches known build concern about nudge re-read pattern. Not blocking — the interface doesn't expose the chain object.

- **Test — Recovery JSON test masks stdout pollution with indexOf:** `packages/cli/tests/commands/work.test.ts:2145` — `JSON.parse(output.substring(output.indexOf('{')))` explicitly skips non-JSON text. If the recovery path ever emits a `{` in its status message, this parsing breaks silently.

## Deployer Handoff

One-line fix needed before merge: change `expect(json.results.result).toBeDefined()` to `expect(json.results.result).toContain('PASS')` in `work.test.ts:2020`. The recovery path stdout pollution (non-JSON text before JSON on recovery with `--json`) is a real issue for CI consumers but has no contract assertion — scope it as follow-up work. The `SEVERITY_ORDER` duplication in proof.ts is minor debt — scope for extraction when severity sort is needed in a third location.

## Verdict
**Shippable:** NO
A008 UNSATISFIED — the test doesn't verify what the contract requires. One-line fix: `expect(json.results.result).toContain('PASS')`. Everything else is solid. 26 of 27 assertions satisfied, all ACs pass except the A008 gap, implementation follows existing patterns, no regressions.
