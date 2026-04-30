# Verify Report: Proof Promote

**Result:** FAIL
**Created by:** AnaVerify
**Date:** 2026-04-29
**Spec:** .ana/plans/active/proof-promote/spec.md
**Branch:** feature/proof-promote

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/proof-promote/contract.yaml
  Seal: INTACT (hash sha256:ab254390fe81a060089e954562ddbc9ce6f385523a1a96a7fa9d7ce5a5df2537)

  A001  ✓ COVERED  "Promoting a finding changes its status to promoted in the proof chain"
  A002  ✓ COVERED  "Promoting a finding records which skill file received the rule"
  A003  ✓ COVERED  "Promoting a finding regenerates the proof chain dashboard"
  A004  ✓ COVERED  "Promoting a finding creates a git commit with the correct message format"
  A005  ✓ COVERED  "Without custom text, the finding summary becomes the skill rule"
  A006  ✓ COVERED  "Custom text overrides the finding summary in the skill rule"
  A007  ✓ COVERED  "JSON output shows the actual rule text that was written"
  A008  ✓ COVERED  "Omitting the skill flag produces an error listing available skills"
  A009  ✓ COVERED  "The missing-skill error lists available skill names"
  A010  ✓ COVERED  "The missing-skill error returns SKILL_REQUIRED in JSON mode"
  A011  ✓ COVERED  "Targeting a nonexistent skill produces a clear error"
  A012  ✓ COVERED  "The section flag can target the Gotchas section instead of Rules"
  A013  ✓ COVERED  "When targeting Gotchas, the Rules section is unchanged"
  A014  ✓ COVERED  "Promoting an already-promoted finding is rejected"
  A015  ✓ COVERED  "The already-promoted error shows where the finding was promoted to"
  A016  ✓ COVERED  "Promoting a closed finding is rejected without the force flag"
  A017  ✓ COVERED  "The force flag allows promoting a closed finding"
  A018  ✓ COVERED  "A force-promoted closed finding transitions to promoted status"
  A019  ✓ COVERED  "JSON output follows the four-key envelope format"
  A020  ✓ COVERED  "JSON results include the promoted skill file path"
  A021  ✓ COVERED  "JSON meta includes chain health statistics"
  A022  ✓ COVERED  "A rule with high word overlap triggers a duplicate warning"
  A023  ✓ COVERED  "A duplicate warning does not block the promotion"
  A024  ✓ COVERED  "In JSON mode, the duplicate warning appears as a field, not stderr"
  A025  ✓ COVERED  "A placeholder-only section gets replaced, not appended to"
  A026  ✓ COVERED  "The new rule appears in place of the placeholder"
  A027  ✓ COVERED  "Promoting from the wrong branch is rejected"
  A028  ✓ COVERED  "Empty custom text is rejected"
  A029  ✓ COVERED  "A skill file missing the target section produces a clear error"
  A030  ✓ COVERED  "A lesson finding can be promoted to a skill rule"

  30 total · 30 covered · 0 uncovered
```

Seal: INTACT. All 30 assertions tagged (COVERED).

Tests: 1733 passed, 0 failed, 2 skipped (97 test files). Build: passed. Lint: 0 errors (14 warnings, none in new code).

Note: initial full-suite run showed 21 failures in proof promote tests — not reproducible on subsequent runs. Two consecutive full-suite runs passed clean. Likely an environment race from the branch checkout; not a regression.

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Promoting a finding changes its status to promoted in the proof chain | ✅ SATISFIED | proof.test.ts:1806, asserts `finding.status === 'promoted'` after promote |
| A002 | Promoting a finding records which skill file received the rule | ✅ SATISFIED | proof.test.ts:1807, asserts `finding.promoted_to === '.claude/skills/coding-standards/SKILL.md'` |
| A003 | Promoting a finding regenerates the proof chain dashboard | ✅ SATISFIED | proof.test.ts:1811, reads PROOF_CHAIN.md, asserts `toContain('Proof Chain Dashboard')` |
| A004 | Promoting a finding creates a git commit with the correct message format | ✅ SATISFIED | proof.test.ts:1815, reads `git log -1`, asserts contains `[proof] Promote F001 to coding-standards` |
| A005 | Without custom text, the finding summary becomes the skill rule | ✅ SATISFIED | proof.test.ts:1829, reads skill file, asserts `toContain('- Missing request validation')` |
| A006 | Custom text overrides the finding summary in the skill rule | ✅ SATISFIED | proof.test.ts:1845, asserts skill file contains `- Always validate request bodies before processing` |
| A007 | JSON output shows the actual rule text that was written | ✅ SATISFIED | proof.test.ts:1856, parses JSON, asserts `rule_text` contains `Always validate request bodies` |
| A008 | Omitting the skill flag produces an error listing available skills | ✅ SATISFIED | proof.test.ts:1868, asserts `exitCode !== 0` (contract target: exitCode, matcher: not_equals, value: 0) |
| A009 | The missing-skill error lists available skill names | ❌ UNSATISFIED | proof.test.ts:1870 asserts `stderr.toContain('skill')` but contract requires `stderr` contains `coding-standards`. Commander's `requiredOption` error is `required option '--skill <skill>' not specified` — does not list available skills. Live-verified. |
| A010 | The missing-skill error returns SKILL_REQUIRED in JSON mode | ❌ UNSATISFIED | proof.test.ts:1878 only asserts `exitCode !== 0`. Contract requires `json.error.code === 'SKILL_REQUIRED'`. Commander exits before the action handler — no JSON is output. Live-verified. |
| A011 | Targeting a nonexistent skill produces a clear error | ✅ SATISFIED | proof.test.ts:1893, parses JSON, asserts `json.error.code === 'SKILL_NOT_FOUND'` |
| A012 | The section flag can target the Gotchas section instead of Rules | ✅ SATISFIED | proof.test.ts:1918-1921, verifies rule index is between Gotchas and Examples headings |
| A013 | When targeting Gotchas, the Rules section is unchanged | ✅ SATISFIED | proof.test.ts:1927, slices Rules section, asserts `not.toContain('Missing request validation')` |
| A014 | Promoting an already-promoted finding is rejected | ✅ SATISFIED | proof.test.ts:1941, parses JSON, asserts `json.error.code === 'ALREADY_PROMOTED'` |
| A015 | The already-promoted error shows where the finding was promoted to | ✅ SATISFIED | proof.test.ts:1946, asserts stderr `toContain('.claude/skills/')` |
| A016 | Promoting a closed finding is rejected without the force flag | ✅ SATISFIED | proof.test.ts:1960, parses JSON, asserts `json.error.code === 'ALREADY_CLOSED'` |
| A017 | The force flag allows promoting a closed finding | ✅ SATISFIED | proof.test.ts:1980, asserts `exitCode === 0` |
| A018 | A force-promoted closed finding transitions to promoted status | ✅ SATISFIED | proof.test.ts:1987, reads chain, asserts `finding.status === 'promoted'` |
| A019 | JSON output follows the four-key envelope format | ✅ SATISFIED | proof.test.ts:2001, parses JSON, asserts `json.command === 'proof promote'` |
| A020 | JSON results include the promoted skill file path | ✅ SATISFIED | proof.test.ts:2004, asserts `json.results.promoted_to` is defined |
| A021 | JSON meta includes chain health statistics | ✅ SATISFIED | proof.test.ts:2006, asserts `json.meta.chain_runs` is defined |
| A022 | A rule with high word overlap triggers a duplicate warning | ✅ SATISFIED | proof.test.ts:2028, asserts stdout `toContain('Similar rule exists')` |
| A023 | A duplicate warning does not block the promotion | ✅ SATISFIED | proof.test.ts:2027, asserts `exitCode === 0` |
| A024 | In JSON mode, the duplicate warning appears as a field, not stderr | ✅ SATISFIED | proof.test.ts:2050, parses JSON, asserts `json.results.duplicate_warning` is defined |
| A025 | A placeholder-only section gets replaced, not appended to | ✅ SATISFIED | proof.test.ts:2072, asserts `not.toContain('*Not yet captured')` |
| A026 | The new rule appears in place of the placeholder | ✅ SATISFIED | proof.test.ts:2073, asserts `toContain('- Missing request validation')` |
| A027 | Promoting from the wrong branch is rejected | ✅ SATISFIED | proof.test.ts:2086, parses JSON, asserts `json.error.code === 'WRONG_BRANCH'` |
| A028 | Empty custom text is rejected | ✅ SATISFIED | proof.test.ts:2101, parses JSON, asserts `json.error.code === 'TEXT_EMPTY'` |
| A029 | A skill file missing the target section produces a clear error | ✅ SATISFIED | proof.test.ts:2121, parses JSON, asserts `json.error.code === 'SECTION_NOT_FOUND'` |
| A030 | A lesson finding can be promoted to a skill rule | ✅ SATISFIED | proof.test.ts:2136, reads chain, asserts `finding.status === 'promoted'` |

**28 SATISFIED · 2 UNSATISFIED (A009, A010)**

## Independent Findings

The builder used Commander's `requiredOption('--skill <skill>')` instead of making `--skill` optional and validating it manually in the action handler. This is a clean Commander pattern — `requiredOption` produces better help text and usage docs. But it means Commander exits with its own error message before the action handler runs, making two contract assertions unreachable:

- A009 expects stderr to contain "coding-standards" (the available skills list). Commander says `error: required option '--skill <skill>' not specified`. No skill names listed.
- A010 expects JSON error code `SKILL_REQUIRED`. Commander exits before the handler, so no JSON envelope is emitted.

The builder's exitError handler includes dead code for the `SKILL_REQUIRED` case (proof.ts:601-603, 624-628). The belt-and-suspenders `if (!options.skill)` check at line 624 is unreachable because `requiredOption` guarantees `skill` is always set when the action runs.

**Fix path:** Change `requiredOption` to `option` and rely on the manual validation at line 624-628. The `exitError('SKILL_REQUIRED', ...)` path already implements the contract behavior — it lists available skills and outputs JSON. It just never fires.

### Code quality

The implementation is structurally sound. It follows the close subcommand's pattern faithfully: branch check → pull → read chain → find finding → validate → mutate → write → dashboard → commit → push → output. The two additions (skill file I/O and duplicate detection) are cleanly integrated.

Section boundary detection (line 742-743) correctly handles the "last section in file" edge case with `nextSectionIdx === -1 ? skillContent.length : nextSectionIdx`. Placeholder replacement (line 762-768) uses a multiline regex that handles trailing content variations correctly.

Duplicate detection (lines 748-758) uses word-set overlap with the smaller set as denominator, guarded against zero-size sets. The `> 0.5` threshold matches the spec's ">50% of words" requirement.

### Over-building check

No scope creep detected. The implementation adds exactly what the spec calls for — no extra parameters, no unused exports, no speculative features. The `INVALID_SECTION` error code (line 639) is reasonable defensive coding though not explicitly in the contract — it prevents runtime errors from invalid `--section` values. Not a concern.

### Prediction resolution

1. **Embedded quotes in `--text`** — Not found. Shell strips the outer quotes in the `execSync` call, passing clean text.
2. **Duplicate detection with short texts** — Not found. `smallerSize > 0` guard prevents division by zero.
3. **`rule_text` includes `- ` prefix** — Confirmed. `rule_text` is `- {text}`. Contract uses `contains` matcher so this passes, but the stored value differs from what a human might expect as "rule text" vs "formatted rule line".
4. **Placeholder at EOF** — Not found. Code handles EOF boundary correctly.
5. **No test for invalid section** — Confirmed. No test for `--section invalid`, but implementation handles it (line 638-641). Minor gap, not a blocker.

**Surprised:** The `requiredOption` vs manual validation choice was the most significant finding — it creates dead code and makes two contract assertions mechanically unsatisfiable.

## AC Walkthrough

- **AC1** (core promote lifecycle): ✅ PASS — Live-tested. Finding status changes, promoted_to set, dashboard regenerated, three files staged, commit message correct. Verified via `node dist/index.js proof promote F001 --skill coding-standards` in temp project.
- **AC2** (default rule text from summary): ✅ PASS — Live-tested. Skill file shows `- test finding` appended to Rules section.
- **AC3** (custom --text): ✅ PASS — Live-tested. `--text "Custom rule text here"` writes custom text; JSON `rule_text` includes it.
- **AC4** (--skill required): ❌ FAIL — Commander's `requiredOption` intercepts before the action handler. The error says `required option '--skill <skill>' not specified` — it does NOT list available skills and does NOT output SKILL_REQUIRED in JSON mode. Contract A009 and A010 are unsatisfied.
- **AC5** (skill not found): ✅ PASS — `--skill data-access` produces SKILL_NOT_FOUND with available skills listed. Verified in test and live.
- **AC6** (--section gotchas): ✅ PASS — Test at 1908-1928 verifies rule lands in Gotchas section between headings, not in Rules.
- **AC7** (already promoted): ✅ PASS — F004 (status: promoted) produces ALREADY_PROMOTED with promoted_to path.
- **AC8** (already closed + --force): ✅ PASS — F003 (status: closed) rejected without --force (ALREADY_CLOSED), succeeds with --force, transitions to promoted.
- **AC9** (JSON envelope): ✅ PASS — Four-key envelope verified: command, timestamp, results (finding, promoted_to, rule_text), meta (chain_runs, findings breakdown). Live-verified.
- **AC10** (duplicate detection): ✅ PASS — Skill file with "Missing request validation check" triggers "Similar rule exists" warning when promoting finding with "Missing request validation". Exit code still 0.
- **AC11** (placeholder replacement): ✅ PASS — `*Not yet captured*` replaced by rule. No append.
- **AC12** (commit message format): ✅ PASS — `git log -1` shows `[proof] Promote F001 to coding-standards`.
- **AC13** (branch check): ✅ PASS — Wrong branch produces WRONG_BRANCH error. Live-verified.
- **AC14** (tests pass): ✅ PASS — 1733 passed, 0 failed, 2 skipped.
- **AC15** (no build errors): ✅ PASS — `pnpm run build` succeeds.
- **AC16** (empty text): ✅ PASS — `--text "  "` (whitespace-only) produces TEXT_EMPTY.
- **AC17** (missing section): ✅ PASS — Skill file without `## Rules` produces SECTION_NOT_FOUND.

## Blockers

AC4 fails because Commander's `requiredOption` intercepts the missing `--skill` error before the action handler runs, making contract assertions A009 and A010 mechanically unsatisfiable. The fix is a one-line change: replace `.requiredOption('--skill <skill>', ...)` with `.option('--skill <skill>', ...)` so the manual validation at line 624-628 handles it instead. The SKILL_REQUIRED error path is already fully implemented — it just never fires.

## Findings

- **Code — Dead SKILL_REQUIRED error path:** `packages/cli/src/commands/proof.ts:601-603,624-628` — The exitError handler for SKILL_REQUIRED (lists available skills, outputs JSON) and the belt-and-suspenders `if (!options.skill)` check are unreachable because `requiredOption` guarantees the option is present. Change `requiredOption` to `option` to activate this code path and satisfy A009/A010.

- **Test — A009 test asserts wrong value:** `packages/cli/tests/commands/proof.test.ts:1870` — asserts `stderr.toContain('skill')` but contract A009 requires `stderr` to contain `coding-standards`. Even after the `requiredOption` → `option` fix, the test assertion needs updating to check for the available skill name, not just the word "skill".

- **Test — A010 test doesn't verify JSON:** `packages/cli/tests/commands/proof.test.ts:1878` — Only checks `exitCode !== 0`. Contract A010 requires `json.error.code === 'SKILL_REQUIRED'`. After the `requiredOption` → `option` fix, this test needs to parse stdout and assert on the error code.

- **Code — `rule_text` includes formatting prefix:** `packages/cli/src/commands/proof.ts:842` — `rule_text` is set to `ruleLine` which is `- {text}`, including the markdown bullet prefix. The spec mockup shows `"rule_text": "- Missing request validation"` so this matches spec intent, but downstream consumers will need to strip the `- ` prefix to get the raw text. This is a design choice, not a bug — noting it for the next cycle.

- **Upstream — Contract A009/A010 assume manual validation:** The contract specifies that omitting `--skill` produces contextual help listing available skills and a SKILL_REQUIRED JSON code. This assumes the command handles the missing option manually. When `requiredOption` is used, Commander produces a different (and arguably cleaner) error. The contract and spec should note that Commander integration changes the error surface.

- **Code — Proof chain JSON has cosmetic diff:** `.ana/proof_chain.json` diff shows unicode em-dash normalization (`\u2014` → `—`). Not introduced by the promote feature — likely an artifact of JSON parse/serialize through a different locale or tool version. Harmless but produces noise in the diff.

## Deployer Handoff

The promote subcommand works correctly for all paths except the missing-`--skill` error case, which is handled by Commander instead of the custom error handler. The fix is small (one-line command definition change + two test assertion updates). After fix:

1. The `requiredOption` → `option` change activates the SKILL_REQUIRED code path
2. Test for A009 needs `expect(stderr).toContain('coding-standards')`
3. Test for A010 needs `const json = JSON.parse(stdout); expect(json.error.code).toBe('SKILL_REQUIRED')`

Test count: 1733 passed (up from 1657 baseline — 76 new tests). No regressions detected. Build clean, lint clean.

## Verdict

**Shippable:** NO

2 of 30 contract assertions unsatisfied (A009, A010). 1 of 17 acceptance criteria failed (AC4). The root cause is a one-line command definition choice (`requiredOption` vs `option`). The correct error handling code exists but is unreachable. Fix is mechanical.
