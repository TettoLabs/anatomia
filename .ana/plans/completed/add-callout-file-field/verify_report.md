# Verify Report: Add file field to proof chain callouts

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-23
**Spec:** .ana/plans/active/add-callout-file-field/spec.md
**Branch:** feature/add-callout-file-field

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/add-callout-file-field/contract.yaml
  Seal: INTACT (commit b579829, hash sha256:70f1805eeba99...)

  A001  ✓ COVERED  "Parsing a callout that mentions a file stores that file reference"
  A002  ✓ COVERED  "Parsing a callout without any file reference stores null"
  A003  ✓ COVERED  "When a callout mentions multiple files, only the first is stored"
  A004  ✓ COVERED  "The callout type includes a file field"
  A005  ✓ COVERED  "Active Issues groups callouts by stored file field, not by re-parsing"
  A006  ✓ COVERED  "Callouts without a file reference appear under General"
  A007  ✓ COVERED  "The renderer does not call extractFileRefs to determine grouping"
  A008  ✓ COVERED  "The file extraction function remains available for other uses"
  A009  ✓ COVERED  "Every existing callout in the proof chain has a file field after migration"
  A010  ✓ COVERED  "All existing parseCallouts tests still pass with updated assertions"
  A011  ✓ COVERED  "All existing generateActiveIssuesMarkdown tests still pass"
  A012  ✓ COVERED  "The extractFileRefs tests are completely unchanged"
  A013  ✓ COVERED  "The 20-callout cap still works correctly with the new file field"
  A014  ✓ COVERED  "File headings are still sorted alphabetically with General last"

  14 total · 14 covered · 0 uncovered
```

Tests: 1384 passed, 0 failed, 2 skipped (pre-existing skips). Build: clean. Lint: clean.
proofSummary.test.ts: 58 tests passed (53 existing + 5 new).

## Contract Compliance
| ID   | Says                                                                      | Status         | Evidence |
|------|---------------------------------------------------------------------------|----------------|----------|
| A001 | Parsing a callout that mentions a file stores that file reference         | ✅ SATISFIED    | proofSummary.test.ts:481-489 — parses callout with `projectKind.ts:105`, asserts `callouts[0]!.file === 'projectKind.ts'` |
| A002 | Parsing a callout without any file reference stores null                  | ✅ SATISFIED    | proofSummary.test.ts:492-500 — parses callout with no file ref, asserts `callouts[0]!.file` is null |
| A003 | When a callout mentions multiple files, only the first is stored          | ✅ SATISFIED    | proofSummary.test.ts:503-511 — summary has `fileA.ts:10 and fileB.ts:20`, asserts `callouts[0]!.file === 'fileA.ts'` |
| A004 | The callout type includes a file field                                    | ✅ SATISFIED    | proofSummary.test.ts:703-716 — constructs callout with `file: 'test.ts'`, function accepts it; proof.ts:42 type includes `file: string \| null` |
| A005 | Active Issues groups callouts by stored file field, not by re-parsing     | ✅ SATISFIED    | proofSummary.test.ts:719-731 — entry with `file: 'projectKind.ts'`, output contains `## projectKind.ts` |
| A006 | Callouts without a file reference appear under General                    | ✅ SATISFIED    | proofSummary.test.ts:734-746 — entry with `file: null`, output contains `## General` |
| A007 | The renderer does not call extractFileRefs to determine grouping          | ✅ SATISFIED    | proofSummary.test.ts:683-699 — callout with `file: null` but file ref in summary text goes to General (not the file); grep confirms no `extractFileRefs(callout` in proofSummary.ts |
| A008 | The file extraction function remains available for other uses             | ✅ SATISFIED    | proofSummary.ts:249 `export function extractFileRefs`; imported and tested at proofSummary.test.ts:9,603 |
| A009 | Every existing callout in the proof chain has a file field after migration | ✅ SATISFIED   | proof_chain.json diff: all 21 callouts across 4 entries (monorepo-primary-agents-md, find-project-root, proof-chain-active-issues, add-readme-extraction) gained `file` field. Entries with empty callouts or no callouts field have nothing to backfill. |
| A010 | All existing parseCallouts tests still pass with updated assertions       | ✅ SATISFIED    | `pnpm vitest run tests/utils/proofSummary.test.ts` — 58 passed, 0 failed; parseCallouts block includes all original tests plus file assertions |
| A011 | All existing generateActiveIssuesMarkdown tests still pass               | ✅ SATISFIED    | Same test run — all generateActiveIssuesMarkdown tests pass with updated callout objects |
| A012 | The extractFileRefs tests are completely unchanged                        | ✅ SATISFIED    | `diff` of extractFileRefs describe block between main and HEAD: identical (zero differences) |
| A013 | The 20-callout cap still works correctly with the new file field          | ✅ SATISFIED    | proofSummary.test.ts:749-763 — 25 entries with `file` fields, asserts `calloutCount === 20` |
| A014 | File headings are still sorted alphabetically with General last           | ✅ SATISFIED    | proofSummary.test.ts:874-892 — entries with zebra.ts, alpha.ts, null; asserts alphaPos < zebraPos < generalPos |

## Independent Findings

**Prediction resolution:**
1. "Builder missed one of four cross-cutting type locations" → **Not found.** All four updated: `ProofChainEntry` (proof.ts:42), `ProofSummary` (proofSummary.ts:70), `CalloutWithFeature` (proofSummary.ts:273), `ProofChainEntryForIndex` (proofSummary.ts:283).
2. "Some test callout objects still lack `file`" → **Not found.** Diff shows every inline callout object gained `file`. The builder was thorough — no missed objects.
3. "Backfill file values might be incorrect" → **Not found.** All backfill values match what `extractFileRefs` would produce, including the known limitation where `findProjectRoot.test.ts` extracts as `test.ts` (dotted filename regex quirk, pre-existing issue).
4. "Builder left extractFileRefs in the renderer" → **Not found.** Renderer now uses `callout.file ?? 'General'` — clean simplification.
5. "extractFileRefs called on wrong string" → **Not found.** Called on the truncated summary (post `substring(0, 200).trim()`), which is the stored value. Correct design — file ref matches what the summary contains.

**Surprise:** The `@ana A012` tag (extractFileRefs tests unchanged) is placed on the `parseCallouts` describe block (line 324), not on the `extractFileRefs` describe block (line 602). Pre-check counts it as COVERED because the tag exists in the file, but it's semantically misplaced. Not a blocker — the assertion is verified independently via diff.

**Over-building check:** No new files created. No new exports. No extra parameters or utility functions. The migration script was created and deleted as specified. Changes are precisely scoped to the four type locations, the two functions, the tests, and the data backfill. No YAGNI violations.

**Code quality:** The renderer simplification from 13 lines to 4 lines (removing the `extractFileRefs` call, if/else branching, and `fileRefs[0]!` access) is a clean improvement. The `flushCallout()` change adds 3 lines (`extractFileRefs` call + `file` field + closing brace) — minimal and well-placed.

**proof_chain.json trailing newline:** The backfill added a trailing newline to proof_chain.json (previously missing). Hygiene fix, not over-building.

## AC Walkthrough

- **AC1:** `parseCallouts()` returns `Array<{ category: string; summary: string; file: string | null }>` — file is the first file ref from the summary text, or null when no file ref is found.
  ✅ PASS — Return type at proofSummary.ts:397. New tests at lines 481-511 verify first-ref and null cases. Existing tests at lines 341, 344, 347 add `file` assertions to the em-dash format test.

- **AC2:** `ProofChainEntry.callouts` type includes `file: string | null`.
  ✅ PASS — proof.ts:42 `callouts: Array<{ category: string; summary: string; file: string | null }>`.

- **AC3:** `generateActiveIssuesMarkdown()` groups callouts by `callout.file` instead of calling `extractFileRefs()`.
  ✅ PASS — proofSummary.ts:345 `const key = callout.file ?? 'General'`. No `extractFileRefs` call in the renderer. Behavioral test at line 683-699 proves callout.file is used (not re-derived).

- **AC4:** `.ana/proof_chain.json` entries are backfilled — every existing callout has a `file` field.
  ✅ PASS — Diff verified: all 21 callouts across 4 entries have `file` field. Values match `extractFileRefs` output.

- **AC5:** All existing `parseCallouts` and `generateActiveIssuesMarkdown` tests pass with updated assertions.
  ✅ PASS — `pnpm vitest run tests/utils/proofSummary.test.ts` → 58 passed, 0 failed.

- **AC6:** `extractFileRefs` remains exported and its tests unchanged.
  ✅ PASS — proofSummary.ts:249 still exports `extractFileRefs`. Diff of extractFileRefs describe block: zero changes.

- **AC7:** No build errors (`pnpm run build`).
  ✅ PASS — Build clean, no errors. TypeScript typecheck passed.

- **AC8:** All proofSummary tests pass (`cd packages/cli && pnpm vitest run`).
  ✅ PASS — 1384 passed, 0 failed, 2 skipped (pre-existing). proofSummary.test.ts: 58 passed.

## Blockers

No blockers. All 14 contract assertions satisfied. All 8 acceptance criteria pass. No regressions (1384 tests pass, same as baseline minus the 5 new tests). Build and lint clean.

Checked for: unused exports in new code (none — no new exports added), unused parameters (none — file field is consumed by renderer and tests), error paths that swallow silently (none — extractFileRefs gracefully returns empty array on no matches, null propagates cleanly), sentinel test patterns (none — all new assertions check specific values), assumptions about external state (none — backfill is committed, no runtime migration).

## Callouts

- **Code — File extraction runs on truncated summary:** `proofSummary.ts:412-415` — `extractFileRefs` is called on `summary` after `substring(0, 200).trim()`. If a callout's only file reference appears after character 200, `file` will be null. Practically unlikely (AnaVerify format puts file refs in the first ~80 chars), but the stored `file` is permanently null for those cases — unlike the old re-derivation approach where fixing the regex would fix all callouts. Design trade-off the spec intended, but worth knowing.

- **Code — `@ana A012` tag misplaced:** `proofSummary.test.ts:324` — Tag `@ana A012` ("extractFileRefs tests unchanged") is on the `parseCallouts` describe block, not the `extractFileRefs` describe block at line 602. Pre-check counts it as COVERED since the tag exists in the file. Verified independently via diff, but the tag's semantic placement is wrong. A future tag-only search would find A012 covering parseCallouts, not extractFileRefs.

- **Test — A009 backfill verification is indirect:** `proofSummary.test.ts:748-763` — The `@ana A009` tag is on the "respects 20-callout cap" test, which exercises `file` fields in the cap logic. It doesn't directly verify that proof_chain.json was backfilled. The backfill was verified manually by reading the diff. A direct test (e.g., reading proof_chain.json and asserting every callout has `file`) would be more robust, but the migration is a one-time operation and the backfill is already committed.

- **Upstream — Known extractFileRefs limitation propagated to stored data:** The existing regex limitation where `findProjectRoot.test.ts` extracts as `test.ts` (dotted filenames lose their prefix) is now permanently stored in proof_chain.json `file` fields. Previously, a regex fix in `extractFileRefs` would retroactively fix all groupings. Now the incorrect `file: "test.ts"` values are baked into the data. If `extractFileRefs` is ever fixed, a second backfill of proof_chain.json would be needed. This was already flagged in the proof chain active issues index cycle.

## Deployer Handoff

Clean merge. The proof_chain.json backfill is the only data change — verify it renders correctly by running `ana proof` after merge to confirm Active Issues grouping looks right. No new dependencies, no config changes, no environment requirements.

The `file` field on callouts is now the source of truth for grouping in Active Issues. Future verify reports will automatically populate it via `parseCallouts()`. No manual migration steps needed going forward.

## Verdict
**Shippable:** YES

All 14 contract assertions satisfied. All 8 acceptance criteria pass. 1384 tests green, build clean, lint clean. The implementation is precisely scoped — four type updates, two function changes, test updates, and a data backfill. No over-building, no regressions, no surprises. The callouts above are informational — none prevent shipping.
