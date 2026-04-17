# Verify Report: Add README extraction to scan

**Result:** FAIL
**Created by:** AnaVerify
**Date:** 2026-04-16
**Spec:** .ana/plans/active/add-readme-extraction/spec.md
**Branch:** feature/add-readme-extraction

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/add-readme-extraction/contract.yaml
  Seal: UNVERIFIABLE (no saved contract commit)
```

Pre-check did not output per-assertion coverage. Manual grep of test files for `@ana` tags found:

- A001–A003: COVERED in `tests/engine/detectors/readme.test.ts`
- **A004: UNCOVERED** — no `@ana A004` tag in any test file for this feature
- A005–A007: COVERED in `tests/scaffolds/all-scaffolds.test.ts`
- A008–A029: COVERED in `tests/engine/detectors/readme.test.ts`

Seal is UNVERIFIABLE (no saved contract commit), not TAMPERED.

Tests: 1171 passed, 2 failed (pre-existing, `census.test.ts` — cal.com/dub monorepo detection, unrelated to this feature). Build: PASS. Lint: PASS.

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Scanning a project with a README extracts content into the readme field | ✅ SATISFIED | readme.test.ts:20-37, asserts result not null with description and setup populated |
| A002 | The readme field contains a description when a matching heading is found | ✅ SATISFIED | readme.test.ts:41-53, asserts exact description text from About heading |
| A003 | The source field indicates whether content came from headings or fallback | ✅ SATISFIED | readme.test.ts:57-67, asserts `source === 'heading'` |
| A004 | The scan JSON output includes the readme field | ❌ UNCOVERED | No `@ana A004` tag in any test file. The field IS wired in scan-engine.ts:820 and the contract test (analyzer-contract.test.ts) verifies `readme` in result fields, but no tagged test exists. |
| A005 | Project context scaffold includes README description in What This Project Does section | ✅ SATISFIED | all-scaffolds.test.ts:66-83, asserts 'readme description content' appears in section before `## Architecture` |
| A006 | Architecture content from README appears in the Architecture section | ✅ SATISFIED | all-scaffolds.test.ts:86-103, asserts 'readme architecture content' in Architecture section split |
| A007 | Setup content from README appears in the Architecture section | ✅ SATISFIED | all-scaffolds.test.ts:106-122, asserts 'readme setup content' in Architecture section split |
| A008 | Individual sections are capped at 1500 characters | ✅ SATISFIED | readme.test.ts:70-82, 2000-char input, asserts `.toBe(1500)` — matcher matches contract `equals` |
| A009 | Total README extraction is capped at 5000 characters | ❌ UNSATISFIED | readme.test.ts:86-104: (1) Matcher mismatch — contract specifies `equals`, test uses `toBeLessThanOrEqual`. (2) Test data uses `'word '.repeat(360)` (~1800 chars) across 3 sections; per-section cap reduces each to ~1499, total ~4497, so the total cap never triggers. This is a sentinel test — it passes whether or not `applyTotalCap` exists. |
| A010 | README.md is detected (exact case) | ✅ SATISFIED | readme.test.ts:108-114 |
| A011 | readme.md is detected (lowercase) | ✅ SATISFIED | readme.test.ts:117-122 |
| A012 | Readme.md is detected (mixed case) | ✅ SATISFIED | readme.test.ts:126-131 |
| A013 | README without extension is detected | ✅ SATISFIED | readme.test.ts:135-140 |
| A014 | Monorepo projects read the root README, not package READMEs | ✅ SATISFIED | readme.test.ts:144-158, creates root + package README, asserts root content via `toContain('root readme content')` |
| A015 | Projects without a README produce readme: null | ✅ SATISFIED | readme.test.ts:161-166, empty tmpDir, asserts `toBeNull()` |
| A016 | Missing README does not cause scan errors | ✅ SATISFIED | readme.test.ts:169-173, `resolves.toBeNull()` confirms no throw |
| A017 | Badge markdown patterns are stripped from extracted content | ✅ SATISFIED | readme.test.ts:176-189, `not.toContain('![badge]')` matches contract `not_contains` |
| A018 | Image markdown patterns are stripped from extracted content | ✅ SATISFIED | readme.test.ts:192-205, `not.toContain('![image]')` matches contract `not_contains` |
| A019 | HTML tags are stripped from extracted content | ✅ SATISFIED | readme.test.ts:207-220, `not.toContain('<div>')` matches contract `not_contains` |
| A020 | Installation heading maps to setup category | ✅ SATISFIED | readme.test.ts:223-235, asserts `setup === 'Run npm install.'` |
| A021 | Getting Started heading maps to setup category | ✅ SATISFIED | readme.test.ts:237-248, asserts setup `toContain('Clone the repo')` |
| A022 | About heading maps to description category | ✅ SATISFIED | readme.test.ts:251-262, asserts `description === 'This is the about section.'` |
| A023 | Architecture heading maps to architecture category | ✅ SATISFIED | readme.test.ts:265-276, asserts exact architecture text |
| A024 | README with no matching headings uses first paragraph as description | ✅ SATISFIED | readme.test.ts:279-293, README with `# Title` + paragraph + `## License`, asserts `source === 'fallback'` |
| A025 | Fallback extraction populates the description field | ✅ SATISFIED | readme.test.ts:296-309, asserts exact first-paragraph text |
| A026 | README with only badges after stripping returns null | ✅ SATISFIED | readme.test.ts:313-322, badge-only README, asserts `toBeNull()` |
| A027 | Heading matching is case-insensitive | ✅ SATISFIED | readme.test.ts:325-347, tests both INSTALLATION and installation variants |
| A028 | EngineResult includes the readme field in its type definition | ✅ SATISFIED | readme.test.ts:350-356, imports createEmptyEngineResult, asserts `toHaveProperty('readme')` |
| A029 | createEmptyEngineResult includes readme field with null default | ✅ SATISFIED | readme.test.ts:359-365, asserts `readme` is `null` |

**Summary:** 27/29 SATISFIED, 1 UNSATISFIED (A009), 1 UNCOVERED (A004)

## Independent Findings

### Prediction Resolution

1. **Total 5000 cap applied incorrectly — CONFIRMED.** The `applyTotalCap` function (readme.ts:132-158) is dead code. With 3 categories each capped at 1500, the mathematical maximum total is 4500, which is below TOTAL_CAP (5000). The function can never trigger. The test uses data that's already under the total cap after per-section truncation.

2. **Badge-only README returns empty object — Not found.** The code correctly returns `null` when `cleaned.length === 0` (readme.ts:185). Well handled.

3. **Scaffold tests use loose checks — Not found.** The tests use exact contract-value strings and validate section placement by splitting on heading boundaries. Solid approach.

4. **Monorepo test uses mocks — Not found.** Real filesystem test with root + package README files.

5. **Fallback includes title heading — Not found.** `extractFirstParagraph` (readme.ts:102-126) correctly skips `#` title lines.

### Surprised Finding: Branch Divergence

The feature branch was forked from `6acb76d`, before 4 features were merged to main (`monorepo-primary-agents-md`, `fix-skill-template-gaps`, `find-project-root`, `add-hook-detection`). The builder's version of `all-scaffolds.test.ts` does not contain the `generatePrimaryPackageAgentsMd` tests (13 test cases for a different completed feature). A naive merge will cause conflicts on this file — the deployer must ensure those tests survive. See Deployer Handoff.

### Code Quality

The implementation is clean and well-structured:
- **readme.ts:** 221 lines, clear separation of concerns (cleanContent, parseSections, extractFirstParagraph, truncate, applyTotalCap, detectReadme). Follows the detector signature pattern from the spec. Heading map has 18 entries as specified. Uses `| null` convention consistently.
- **engineResult.ts:** ReadmeResult type added at line 44-49 with proper JSDoc. Factory updated at line 355. CROSS-CUTTING comment honored — all 4 locations updated (type, factory, scan-engine, scaffold-generators).
- **scan-engine.ts:** 3-line addition — import, call, wire. Minimal and correct.
- **scaffold-generators.ts:** README content inserted inline after `**Detected:**` lines in both "What This Project Does" (line 81-83) and "Architecture" (lines 110-115). Follows existing conditional pattern.
- Engine purity maintained — no chalk, ora, or commander imports in readme.ts.
- All imports use `.js` extensions. `import type` used correctly for ReadmeResult.

### `cleanContent` Export

`cleanContent` is exported (readme.ts:51) but only imported by tests — no production consumer outside readme.ts itself. This is a test-access export, not a YAGNI violation — it allows testing the cleaning logic in isolation (6 unit tests in the `cleanContent` describe block).

## AC Walkthrough

- **AC1:** `ana scan` on a project with README populates `result.readme` — ✅ PASS. Detector wired in scan-engine.ts:715-716, result assigned at line 820. Tests verify extraction with real filesystem fixtures.
- **AC2:** `ana scan --json` output includes the readme field — ⚠️ PARTIAL. The field is on EngineResult and wired in scan-engine. The contract test (analyzer-contract.test.ts) verifies 'readme' in the field list. But no test specifically tagged `@ana A004` exists, and no e2e test runs `ana scan --json` to verify the actual JSON output.
- **AC3:** Scaffold uses README for "What This Project Does" — ✅ PASS. scaffold-generators.ts:81-83, tested at all-scaffolds.test.ts:66-83.
- **AC4:** Architecture/setup sections flow to scaffold — ✅ PASS. scaffold-generators.ts:110-115, tested at all-scaffolds.test.ts:86-122.
- **AC5:** Character caps enforced — ⚠️ PARTIAL. Per-section cap (1500) is verified by A008 test. Total cap (5000) is untestable as written — the math means 3 × 1500 = 4500 < 5000, so the total cap never triggers. `applyTotalCap` is dead code.
- **AC6:** README variants detected — ✅ PASS. Tests verify README.md, readme.md, Readme.md, and README (A010-A013).
- **AC7:** Monorepo reads root README only — ✅ PASS. A014 test creates root + package README, asserts root content only.
- **AC8:** No README produces null — ✅ PASS. A015-A016 verify null return and no errors.
- **AC9:** Badges, images, HTML stripped — ✅ PASS. A017-A019 verify stripping with real badge/image/HTML content.
- **All tests pass:** ✅ PASS. 1171 passed, 2 pre-existing failures unrelated to this feature.
- **No TypeScript errors:** ✅ PASS. `pnpm run build` completes successfully.
- **Lint passes:** ✅ PASS. `pnpm run lint` clean.

## Blockers

1. **A004 UNCOVERED:** No test tagged `@ana A004` for "scan JSON output includes readme field." Builder needs to add a tagged test — either in the readme detector tests or in scan.test.ts. The field IS correctly wired; the gap is the missing tagged test.

2. **A009 UNSATISFIED:** The total cap test is a sentinel — it passes whether or not `applyTotalCap` exists. Test data produces a total of ~4497 after per-section caps (3 × ~1499), which is under 5000. Additionally, `applyTotalCap` is unreachable dead code: with 3 categories each capped at 1500, the maximum possible total is 4500 < 5000. Builder should either (a) adjust SECTION_CAP/TOTAL_CAP so the total cap is reachable, or (b) accept the dead code and write a test that directly exercises `applyTotalCap` with pre-constructed data, or (c) remove `applyTotalCap` and adjust the contract assertion to acknowledge the per-section cap is the binding constraint.

## Callouts

- **Code: `applyTotalCap` is dead code** — readme.ts:132-158. With SECTION_CAP=1500 and 3 categories, max total = 4500 < TOTAL_CAP=5000. The function allocates per-field budgets and truncates, but no input can trigger it. Not harmful (it's a safety net for future categories), but it's 26 lines of untested, unreachable code. If categories are added later, this function exists and works — but it has no test coverage for its actual logic.

- **Code: `truncate` word-boundary behavior** — readme.ts:65-69. When text has no spaces before `cap`, `lastIndexOf(' ', cap)` returns -1, and `cut > 0` fails, falling back to `text.slice(0, cap)`. This means a 2000-char string with no spaces gets hard-cut at exactly 1500. Correct, but worth knowing for languages without spaces (CJK content in READMEs).

- **Test: A009 is a sentinel test** — readme.test.ts:86-104. `toBeLessThanOrEqual(5000)` with test data that produces ~4497 total. This assertion passes on ANY code that produces a number ≤ 5000, including code that doesn't cap at all. A meaningful test would require data that exceeds 5000 before capping and verify the output is exactly 5000.

- **Test: A014 monorepo test verifies intent but not mechanism** — readme.test.ts:144-158. The test proves `detectReadme(tmpDir)` reads the root README. This works because `detectReadme` takes `rootPath` as input — it has no concept of "monorepo" or "package READMEs". The test validates the design decision (detector takes rootPath, scan-engine passes rootPath) rather than testing monorepo awareness in the detector itself. This is fine architecturally, but the test would pass even if the monorepo had no packages.

- **Upstream: Contract A009 matcher/value tension** — The `says` field ("capped at 5000") suggests `<= 5000`, but `matcher: "equals"` with `value: 5000` implies `=== 5000`. The planner likely intended "when the cap is enforced, the total should be exactly 5000 (truncated to the limit)." The builder interpreted it as `toBeLessThanOrEqual`, which is reasonable for a cap, but creates a matcher mismatch.

- **Upstream: SECTION_CAP × 3 < TOTAL_CAP makes the total cap spec unverifiable** — The spec says "Per-section content is capped at 1500 characters; total README extraction capped at 5000 characters." With only 3 categories, the per-section cap is the binding constraint. The total cap spec requirement is mathematically satisfied but functionally dead. Future spec work could either adjust the numbers or acknowledge this.

## Deployer Handoff

1. **Branch divergence requires rebase before merge.** The feature branch forked from `6acb76d`, before 4 features were merged to main. `all-scaffolds.test.ts` will conflict — the builder's version doesn't include the `generatePrimaryPackageAgentsMd` tests (13 test cases from monorepo-primary-agents-md). During conflict resolution, ensure those tests survive by keeping both the builder's new README scaffold tests AND the existing AGENTS.md tests.

2. **Rebase will also pick up changes from `add-hook-detection`, `find-project-root`, and `fix-skill-template-gaps`.** Run the full test suite after rebase to verify no regressions.

3. **The 2 failing tests in `census.test.ts` are pre-existing** — cal.com and dub monorepo validation. Not introduced by this build.

## Verdict
**Shippable:** NO

2 contract assertions prevent shipping: A004 (UNCOVERED — missing tagged test for scan JSON output) and A009 (UNSATISFIED — sentinel test with matcher mismatch, plus dead `applyTotalCap` code). The implementation itself is solid — the gaps are in test coverage and a math issue with the cap constants. Quick fixes: (1) add an `@ana A004` tagged test, (2) either fix the test data for A009 to actually trigger the total cap, or adjust the approach to acknowledge the per-section cap as the binding constraint.
