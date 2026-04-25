# Verify Report: Add `ana proof context` query command

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-24
**Spec:** .ana/plans/active/proof-context-query/spec-2.md
**Branch:** feature/proof-context-query

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/proof-context-query/contract.yaml
  Seal: INTACT (commit e8090ba, hash sha256:dad03df125a21...)

  A001  ✓ COVERED  "A callout with a basename that matches exactly one touched module gets upgraded to the full path"
  A002  ✓ COVERED  "The resolved path matches the module from modules_touched, not a fabricated path"
  A003  ✓ COVERED  "A basename matching two or more touched modules stays as a basename"
  A004  ✓ COVERED  "A basename matching zero touched modules stays unchanged"
  A005  ✓ COVERED  "A callout file that already contains a path separator is not re-resolved"
  A006  ✓ COVERED  "Build concern file fields are resolved using the same logic as callout files"
  A007  ✓ COVERED  "Existing proof chain entries get their callout files resolved when the chain is rewritten"
  A008  ✓ COVERED  "Path boundary checking prevents a file named route.ts from matching subroute.ts"
  A009  ✓ COVERED  "Querying a file returns all callouts associated with that file"
  A010  ✓ COVERED  "Each returned callout includes its category, summary, and originating feature name"
  A011  ✓ COVERED  "The --json flag produces valid parseable JSON output"
  A012  ✓ COVERED  "JSON output includes callouts array and build_concerns array per result"
  A013  ✓ COVERED  "Querying a file with no proof data shows a clean message instead of an error"
  A014  ✓ COVERED  "The no-data message names the queried file so the user knows what was searched"
  A015  ✓ COVERED  "Querying when no proof_chain.json exists shows a clean message, not an error"
  A016  ✓ COVERED  "The query function lives in proofSummary.ts and has no CLI imports"
  A017  ✓ COVERED  "A full-path query matches a full-path callout exactly"
  A018  ✓ COVERED  "A basename query matches a full-path callout via path suffix"
  A019  ✓ COVERED  "A full-path query matches a legacy basename callout"
  A020  ✓ COVERED  "A query for route.ts does not match a callout filed under subroute.ts"
  A021  ✓ COVERED  "The result includes how many pipeline cycles touched the queried file"
  A022  ✓ COVERED  "The result includes the date of the most recent pipeline cycle for the file"
  A023  ✓ COVERED  "Callouts with null file fields are never returned by any file query"
  A024  ✓ COVERED  "Querying multiple files returns separate results for each file"

  24 total · 24 covered · 0 uncovered
```

Tests: 1467 passed, 0 failed, 2 skipped (96 test files). Build: success. Lint: clean.

## Contract Compliance

A001–A008 were verified in phase 1 (verify_report_1.md, PASS). Phase 2 adds A009–A024. Rows below cover the full contract — phase 1 assertions marked with prior verification reference.

| ID   | Says                                           | Status       | Evidence |
|------|------------------------------------------------|--------------|----------|
| A001 | basename → full path upgrade                   | ✅ SATISFIED  | Phase 1 verified; proofSummary.test.ts:1130 |
| A002 | resolved path matches modules_touched          | ✅ SATISFIED  | Phase 1 verified; proofSummary.test.ts:1137 |
| A003 | ambiguous basename stays                       | ✅ SATISFIED  | Phase 1 verified; proofSummary.test.ts:1144 |
| A004 | no-match basename stays                        | ✅ SATISFIED  | Phase 1 verified; proofSummary.test.ts:1155 |
| A005 | file with separator not re-resolved            | ✅ SATISFIED  | Phase 1 verified; proofSummary.test.ts:1168 |
| A006 | build concerns resolved same way               | ✅ SATISFIED  | Phase 1 verified; proofSummary.test.ts:1181 |
| A007 | backfill existing entries                       | ✅ SATISFIED  | Phase 1 verified; proofSummary.test.ts:778 |
| A008 | path boundary prevents false matches           | ✅ SATISFIED  | Phase 1 verified; proofSummary.test.ts:1190 |
| A009 | Querying a file returns callouts               | ✅ SATISFIED  | proofSummary.test.ts:1222, asserts `callouts.length > 0`; proof.test.ts:335, asserts exit 0 and stdout contains callout text |
| A010 | Callout includes category, summary, from       | ✅ SATISFIED  | proofSummary.test.ts:1228-1230, asserts `.from`, `.category`, `.summary` on result |
| A011 | --json produces valid JSON                     | ✅ SATISFIED  | proof.test.ts:349-352, `JSON.parse(stdout)` succeeds, asserts `json.results` defined |
| A012 | JSON has callouts and build_concerns arrays    | ✅ SATISFIED  | proof.test.ts:354-356, asserts both `.callouts` and `.build_concerns` defined |
| A013 | No-data file shows clean message, not error    | ✅ SATISFIED  | proof.test.ts:366-367, asserts exit 0; proofSummary.test.ts:1303-1307 asserts empty arrays |
| A014 | No-data message names the queried file         | ✅ SATISFIED  | proof.test.ts:368, `stdout.toContain('No proof context')`; live test confirms "No proof context found for nonexistent-file.ts" |
| A015 | Missing proof_chain.json shows clean message   | ✅ SATISFIED  | proof.test.ts:378-380, asserts exit 0 and "No proof chain found"; proofSummary.test.ts:1312-1315 returns empty result without error |
| A016 | getProofContext has no CLI imports              | ✅ SATISFIED  | proofSummary.test.ts:1359-1366, reads source, asserts `not.toContain("from 'chalk")` and `not.toContain("from 'commander")`. Independently verified: grep for chalk/commander/ora in proofSummary.ts → no matches |
| A017 | Full-path query matches full-path callout      | ✅ SATISFIED  | proofSummary.test.ts:1223-1231, queries `packages/cli/src/engine/census.ts` against full-path callout, asserts match found |
| A018 | Basename query matches full-path callout       | ✅ SATISFIED  | proofSummary.test.ts:1234-1238, queries `census.ts` against full-path callout, asserts match and file is full path |
| A019 | Full-path query matches legacy basename callout| ✅ SATISFIED  | proofSummary.test.ts:1241-1253, creates legacy callout with file `census.ts`, queries with full path, asserts match |
| A020 | route.ts does not match subroute.ts            | ✅ SATISFIED  | proofSummary.test.ts:1268-1278, callout filed under `packages/cli/src/subroute.ts`, queries `route.ts`, asserts 0 matches |
| A021 | Result includes touch count                    | ✅ SATISFIED  | proofSummary.test.ts:1329-1341, two entries touching census.ts, asserts `touch_count === 2` |
| A022 | Result includes last touched date              | ✅ SATISFIED  | proofSummary.test.ts:1344-1356, two entries with different dates, asserts `last_touched === '2026-04-24T10:00:00Z'` (the newer one) |
| A023 | Null-file callouts never returned              | ✅ SATISFIED  | proofSummary.test.ts:1281-1290, callout with `file: null`, queries any file, asserts 0 matches |
| A024 | Multiple files return separate results         | ✅ SATISFIED  | proofSummary.test.ts:1319-1326, queries two files, asserts `results.length === 2` with correct query fields; proof.test.ts:390-393 integration test |

## Independent Findings

**Prediction resolution:**

1. **Basename query matching too broadly** — Confirmed by design, not a bug. `fileMatches` at proofSummary.ts:872 uses `path.basename` as the first filter after exact match, then checks path suffixes. A query for "census.ts" matches ANY callout whose path ends with "/census.ts". The spec explicitly describes this three-tier strategy. Noted as a callout.

2. **Touch count double-counting** — Not found. At proofSummary.ts:932-968, `entryTouches` is a single boolean per entry. If the same file appears in both callouts and build_concerns of one entry, it still counts as one touch. Correct.

3. **Weak test assertions where specific values are known** — Confirmed. proofSummary.test.ts:1227 uses `toBeGreaterThan(0)` when baseEntry has exactly 2 callouts for census.ts; line 1296 uses `toBeGreaterThan(0)` for build_concerns when count is 1. The contract specifies `greater: 0` so the tests match the contract, but stronger assertions would catch more regressions.

4. **`completed_at` guard for undated entries** — Not found. The builder handled this well: proofSummary.ts:934 uses `entry.completed_at ?? ''`, and line 967 checks `if (entryTouches && entryDate)` — empty string is falsy, so undated entries don't contribute to touchDates. An explicit test at line 1368 verifies this.

5. **CLI formatter doesn't truncate long summaries** — Confirmed. `formatContextResult` at proof.ts:345-387 outputs full callout summaries. Live test shows callout text >200 chars in a single line. The spec doesn't require truncation, so not a violation — but it affects terminal readability.

**Surprise finding:** The `fileMatches` function (proofSummary.ts:882-886) has a subtle overmatch case: if stored=`packages/a/census.ts` and queried=`packages/b/census.ts`, basenames match, and stored ends with `/census.ts`, so line 883 returns true — even though these are different files. In practice this is extremely unlikely in proof chain data (callout paths are unique within a feature), and the spec's matching strategy intentionally favors recall over precision. Noted as a callout.

**Code quality:** The `getProofContext` function is 78 lines (proofSummary.ts:905-983), clean structure, early returns for missing chain file. The `fileMatches` helper is 20 lines with good comments. `ProofContextResult` interface is well-defined with all fields typed. `ProofChainEntryForContext` is a minimal projection interface — consistent with the existing `ProofChainEntryForIndex` pattern. The `formatContextResult` function in proof.ts is 42 lines, uses chalk.dim and chalk.gray appropriately for visual hierarchy. JSDoc tags present on all exported functions.

**Over-building check:** No extra parameters, functions, or code paths beyond what the spec requires. The `ProofChainEntryForContext` interface is a necessary projection type. No YAGNI violations detected — all exports (`getProofContext`, `ProofContextResult`) are imported in proof.ts and test files.

## AC Walkthrough

- ✅ AC5: `ana proof context census.ts` returns callouts and build concerns. Verified by live CLI test — output includes callout text with categories, anchors, "From:" lines, touch count, and "No build concerns for this file." for full-path query. For basename query, same callouts returned.
- ✅ AC6: `ana proof context census.ts --json` returns structured JSON. Verified by live CLI test — valid JSON with `results[0].callouts` array, `.build_concerns` array, `.touch_count`, `.last_touched`.
- ✅ AC7: Querying file with no data shows clean message. Verified by live test: `node dist/index.js proof context nonexistent-file.ts` → "No proof context found for nonexistent-file.ts", exit 0.
- ✅ AC8: Querying when no proof_chain.json exists shows clean message. Integration test proof.test.ts:373-381 verifies exit 0 and "No proof chain found" message. Code at proof.ts:309-312 handles this case before calling `getProofContext`.
- ✅ AC9: Query function importable without CLI dependencies. proofSummary.ts has zero chalk/commander/ora imports (verified by grep). Test at proofSummary.test.ts:1359 reads source and asserts absence.
- ✅ AC10: Matching handles all path forms with boundary checks. Unit tests cover: full→full (1222), basename→full (1233), full→basename (1241), basename→basename (1255), boundary prevention (1267). `fileMatches` at proofSummary.ts:872 uses `path.basename` comparison as first filter, preventing `route.ts` from matching `subroute.ts`.
- ✅ Tests pass: 1467 passed, 0 failed, 2 skipped. Phase 2 tests: ~9 unit tests in `proofSummary.test.ts` + ~5 integration tests in `proof.test.ts` = 14 new tests.
- ✅ No build errors: `pnpm run build` succeeds with clean output.

## Blockers

No blockers found. All 24 contract assertions satisfied (A001–A008 from phase 1, A009–A024 verified this phase). All 8 acceptance criteria pass. No regressions — test suite at 1467 (up from ~1448 baseline per spec). Searched for: unused exports in new code (none — `getProofContext` and `ProofContextResult` both imported), unused function parameters (none), unhandled error paths (chain parse failure handled at proofSummary.ts:923, missing chain file at 908-916), sentinel tests (none — all assertions test real behavior).

## Callouts

- **Code — `fileMatches` overmatch on same-basename different-directory paths:** `proofSummary.ts:883` — If stored=`packages/a/census.ts` and queried=`packages/b/census.ts`, the function returns true because both paths end with `/census.ts`. The spec's three-tier matching intentionally prioritizes recall over precision, so this is by design. In practice, proof chain callouts rarely have duplicate basenames across different directories. If this becomes noisy, a future cycle could add exact-path-prefix matching as tier 1.5.

- **Code — No truncation on callout summaries in terminal output:** `proof.ts:367` — `formatContextResult` outputs full callout summaries, which can be 200+ characters per line. Live test shows long lines wrapping awkwardly. The spec mockup shows truncated summaries (`...`) but the spec text doesn't list truncation as a requirement. For terminal aesthetics, consider truncating summaries to ~120 chars in a future cycle.

- **Test — Weak matchers where specific counts are known:** `proofSummary.test.ts:1227,1296` — Uses `toBeGreaterThan(0)` for callout count and build concern count when test data has exactly 2 and 1 entries respectively. The contract specifies `greater: 0` so the tests match, but `toBe(2)` / `toBe(1)` would catch regressions that drop items. Pattern matches the existing A009 callout from Fix Prisma (scanProject.test.ts:199).

- **Test — Integration test for A014 checks substring not specific file name:** `proof.test.ts:368` — Asserts `stdout.toContain('No proof context')` but doesn't verify the queried filename appears in the message. The contract says "names the queried file." Live test confirms the output is "No proof context found for nonexistent-file.ts" — so the message DOES include the filename. The test just doesn't assert on it. A more precise assertion would be `toContain('No proof context found for unknown-file.ts')`.

- **Upstream — Contract `@ana` tags shared across two phases in same file:** `proof.test.ts:425-658` — The existing proof list/detail tests have `@ana A001`–`@ana A023` tags from the original proof-list-view feature's contract. Pre-check reports COVERED for all 24 assertions, but 8 of those (A001–A008) are phase 1 tags in `proofSummary.test.ts`, while the original proof.test.ts tags (like `@ana A001` at line 425 for "displays proof card") are from a completely different feature's contract. This doesn't cause errors — pre-check correctly finds the phase 2 tags in proofSummary.test.ts. But it's confusing for a human reader scanning the file.

## Deployer Handoff

- **New command:** `ana proof context <files...> [--json]` — queries the proof chain for callouts associated with specific files. Works with full paths, basenames, and legacy data. Exit 0 for all queries including no-match.
- **No migration needed.** The command reads existing `proof_chain.json` data — both old basename-only callouts and new full-path callouts (from phase 1's `resolveCalloutPaths`).
- **Phase 1 dependency:** Phase 1 added `resolveCalloutPaths` which upgrades basenames to full paths at write time. Phase 2 queries against both forms. Both phases must be merged together.
- **Test count:** 1467 (up from ~1448 after phase 1). 14 new tests: 9 unit + 5 integration.

## Verdict
**Shippable:** YES

All 16 phase-2 assertions (A009–A024) SATISFIED with real test evidence. All 8 acceptance criteria pass. Live CLI tests confirm the command works on real proof chain data — callouts render correctly, JSON parses cleanly, error cases produce clean messages. No regressions. Code is clean, well-structured, and follows existing patterns. Callouts are minor quality observations, not shipping blockers.
