# Scope: V1 Code Changes

**Created by:** Ana
**Date:** 2026-05-03

## Intent

Surgical code changes preparing for 1.0.0. Remove dead references, fix a parser coupling bug, standardize CLI output, clean build config. No new features. Every change is a fix, removal, or standardization. This is the second of two scopes — the first (v1-documentation-overhaul) handles docs. This scope handles code.

## Complexity Assessment

- **Size:** medium
- **Files affected:** scan.ts, init/index.ts, setup.ts, index.ts, proof.ts (descriptions only), artifact.ts (descriptions only), work.ts (descriptions only), verify.ts (descriptions only), pr.ts (chalk only), agents.ts (chalk only), proofSummary.ts (parser fix), tsup.config.ts, .husky/pre-commit, docs/TROUBLESHOOTING.md, templates/.claude/agents/ana-verify.md, .claude/agents/ana-verify.md (dogfood)
- **Blast radius:** The parser fix in proofSummary.ts is HIGH risk — it touches the path that every `ana work complete` uses. All other items are LOW risk (string changes, config line removals, description rewrites). See detailed blast radius analysis in the requirements doc.
- **Estimated effort:** 2-3 hours
- **Multi-phase:** no, but ordering constraint: item 19 (parser fix) MUST complete and pass tests before item 19b (template symbol change)

## Approach

11 items, ordered by risk. The parser fix goes first because it's the hardest and everything else is safe to ship regardless. Three adversarial code reviewers verified every change against the actual codebase. Their findings are in the requirements doc — AnaPlan should read it.

**AnaPlan: before writing the spec, read the requirements file.** It contains per-item file paths, exact line numbers, blast radius analysis, reviewer findings (including one BLOCKER that was resolved), and critical warnings about the parser fix.

- `../../anatomia_reference/v1_Release/CODE_CHANGES_REQUIREMENTS.md`

## Acceptance Criteria

- AC1: `--verbose` flag removed from scan — does not appear in `ana scan --help`, all 9 references in `docs/TROUBLESHOOTING.md` updated or removed
- AC2: Zero decorative emoji in CLI error/status output — `❌` removed from init/index.ts, `🔍` removed from setup.ts (grep `src/commands/` for `❌|🔍` — zero matches, excluding pr.ts verify protocol display)
- AC3: `parseACResults` in proofSummary.ts matches on status WORDS not emoji codepoints — regex anchors to bullet-list prefix (`^\s*-\s+`), does NOT false-match on `**Result:** PASS`, handles all three real-world formats (Format A: `- ✅ PASS: AC1`, Format B: `- **AC1:** ✅ PASS —`, Format C: `→ ✅ PASS` at end of line)
- AC4: All existing proofSummary.test.ts tests pass WITHOUT modifying existing test fixtures (the emoji in fixtures stay — the new regex must match them)
- AC5: New test cases added for Format B and Format C AC walkthrough patterns using actual text from completed verify reports
- AC6: All existing work.test.ts tests pass (these exercise writeProofChain → computeProofSummary → parseACResults)
- AC7: `🔍 UNVERIFIABLE` replaced with `-- UNVERIFIABLE` (or similar non-emoji marker) in verify template and dogfood copy — done AFTER parser fix passes tests
- AC8: `ana --version` outputs `anatomia-cli/{version}` not bare version number
- AC9: All `--help` descriptions are clear to a stranger — no "Setup-related commands," "Verification tools," "surface-tier analysis," or "contract seal verification." All start with capital letter.
- AC10: `chalk.dim` in error/warning hints changed to `chalk.gray` — ONLY in agents.ts:65, pr.ts:174/191/206/223, artifact.ts:852. NOT in scan.ts formatHumanReadable, NOT in proof.ts display formatting, NOT in agents.ts:74 "(none)" display
- AC11: `⚠` in proof.ts:64 DEVIATED status icon preserved (tested by proof.test.ts:660) — warning prefix standardization does NOT touch this
- AC12: `tsup.config.ts` has no `external` key and no `dts` key
- AC13: `.husky/pre-commit` comment references no sprint jargon ("Item 20" removed)
- AC14: `pnpm build` succeeds, `npm pack --dry-run` produces expected file list (minus `dist/index.d.ts` after dts removal)
- AC15: Full test suite passes: `cd packages/cli && pnpm vitest run`

## Edge Cases & Risks

- **Parser fix is highest risk.** Three independent reviewers flagged it. The current regex `✅\s*PASS` is "accidentally robust" — it matches all three real-world AC formats because it searches globally. The replacement must be equally loose. A regex that anchors too tightly (e.g., requiring a colon after PASS) will silently break on Format B (`- **AC1:** ✅ PASS —`) and the work.test.ts fixture (`- ✅ PASS Item` with no colon). Tests would still pass because fixtures only cover Format A.
- **The `**Result:** PASS` false-match.** `parseACResults` receives the ENTIRE verify report, which contains `**Result:** PASS` parsed by a different function. The new regex must NOT match this line. The current emoji regex avoids it because `**Result:**` has no `✅` prefix. The new regex needs equivalent specificity — anchoring to bullet-list format (`^\s*-\s+`) is the recommended approach.
- **`proof.ts:64` uses `⚠` as a DEVIATED status icon** tested by `proof.test.ts:660`. The warning prefix standardization must NOT touch this. It's a status indicator, not a warning message.
- **`chalk.dim` in proof.ts is intentional display hierarchy** (11 usages for category/severity labels). Changing these to `chalk.gray` would alter the proof command's visual output. Only error HINT usages should change.
- **TROUBLESHOOTING.md has 9 `--verbose` references.** Removing the flag without updating the doc creates broken troubleshooting instructions.

## Rejected Approaches

- **Full emoji removal from verify pipeline (Option A).** 4 of 5 reviewers chose B-refined over A. The parser fix decouples the emoji from parsing logic. After that, ✅/❌ in verify templates and PR output are pure display — changeable anytime as a cosmetic decision with zero blast radius. Doing the 54-location replacement now is churn without functional benefit.
- **Mechanical chalk.dim→chalk.gray find-and-replace.** Three reviewers flagged this would break proof.ts display formatting (11 usages) and remove the `⚠` status icon tested by proof.test.ts:660. Requires per-occurrence judgment.

## Open Questions

None. All design decisions resolved in the requirements doc with reviewer consensus.

## Exploration Findings

### Constraints Discovered
- [TYPE-VERIFIED] `parseAssertionResults` at proofSummary.ts:171 already matches on words correctly — `parseACResults` at line 201 is the inconsistent one
- [TYPE-VERIFIED] Real verify reports use 3 different AC formats — test fixtures only cover Format A
- [TYPE-VERIFIED] work.test.ts:1102 uses `- ✅ PASS Item` with NO colon — regex cannot require colon
- [TYPE-VERIFIED] proof.test.ts:660 asserts `expect(stdout).toContain('⚠')` — the DEVIATED status icon
- [TYPE-VERIFIED] `package.json` has no `types` field — that part of a previous requirement was stale
- [TYPE-VERIFIED] `anatomia-analyzer` has zero references anywhere, and a test at old-system-removed.test.ts already asserts it's absent from deps

### Test Infrastructure
- proofSummary.test.ts — the primary test file for the parser fix. Existing fixtures use Format A only.
- work.test.ts — exercises writeProofChain → computeProofSummary → parseACResults
- proof.test.ts:660 — the `⚠` status icon assertion that must not break

## For AnaPlan

### Structural Analog
`strengthen-weak-test-assertions` — that scope was surgical fixes across multiple test files, each with specific blast radius analysis. Same pattern: many small changes, one high-risk change, detailed per-item verification.

### Relevant Code Paths
- `src/utils/proofSummary.ts` lines 195-210 — `parseACResults`, the parser being fixed
- `src/utils/proofSummary.ts` line 171 — `parseAssertionResults`, the model for the correct approach
- `src/commands/scan.ts` lines 341-411 — the `--verbose` code being removed
- `src/commands/proof.ts` line 64 — the `⚠` DEVIATED icon that must NOT be touched

### Patterns to Follow
- `parseAssertionResults` at line 171 is the pattern: match on the word, ignore the prefix. Apply the same philosophy to `parseACResults` but adapted for full-content (not table-cell) context.

### Known Gotchas
- Do NOT require a colon after PASS/FAIL in the regex. work.test.ts fixtures have no colon.
- Do NOT change chalk.dim in proof.ts or scan.ts formatHumanReadable. Only change error HINT usages.
- Do NOT remove the `⚠` from proof.ts:64. It's a status icon, not a warning prefix.
- Do NOT change test fixtures for item 19. The new regex must match the existing emoji format. Only item 19b changes fixtures (for 🔍→-- replacement).
- The ordering constraint is real: parser fix (19) must pass tests before template change (19b).
- Do NOT forget TROUBLESHOOTING.md when removing --verbose. 9 references.

### Things to Investigate
- The exact regex for parseACResults. The requirement specifies the constraints (match 3 formats, exclude `**Result:**`, anchor to bullet prefix, no colon requirement). AnaPlan designs the regex. Recommended starting point: `/^\s*-\s+.*?\b(PASS)\b/gm` for PASS, and similar for FAIL/PARTIAL/UNVERIFIABLE. But verify against all 3 formats and the `**Result:**` line before committing.
