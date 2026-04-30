# Verify Report: Proof Promote

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-29
**Spec:** .ana/plans/active/proof-promote/spec.md
**Branch:** feature/proof-promote

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/proof-promote/contract.yaml
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

Tests: 1733 passed, 0 failed, 2 skipped (97 test files). Build: passed. Lint: 0 errors (14 warnings, all pre-existing in unrelated files).

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
| A008 | Omitting the skill flag produces an error listing available skills | ✅ SATISFIED | proof.test.ts:1867, asserts `exitCode !== 0`. Contract: exitCode not_equals 0. |
| A009 | The missing-skill error lists available skill names | ✅ SATISFIED | proof.test.ts:1868, asserts `stderr.toContain('coding-standards')`. Contract: stderr contains `coding-standards`. The `!options.skill` guard at proof.ts:625 fires exitError('SKILL_REQUIRED', ...) which prints available skills via globSync. |
| A010 | The missing-skill error returns SKILL_REQUIRED in JSON mode | ✅ SATISFIED | proof.test.ts:1878-1879, parses `JSON.parse(stdout)`, asserts `json.error.code.toBe('SKILL_REQUIRED')`. Contract: json.error.code equals SKILL_REQUIRED. |
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

**30 SATISFIED · 0 UNSATISFIED**

## Independent Findings

The builder's fix was surgical: changed `.requiredOption('--skill <skill>', ...)` to `.option('--skill <skill>', ...)` and updated the two test assertions for A009/A010. The manual validation guard at line 624-628 (`if (!options.skill)`) now fires correctly, routing through the `exitError('SKILL_REQUIRED', ...)` path that was already fully implemented. Both the human-readable output (listing available skills) and JSON envelope (`SKILL_REQUIRED` error code) now work as specified.

The implementation is structurally sound. The close-subcommand lifecycle pattern is faithfully replicated: branch check → pull → read chain → find finding → validate → mutate → write chain → dashboard → commit → push → output. Section boundary detection, placeholder replacement, and duplicate detection logic are all clean.

**Over-building check:** No scope creep. No unused exports. The `INVALID_SECTION` error code (line 639) is defensive coding not in the contract — reasonable, not a concern. All exported functions from new code are used.

**Prediction resolution:**
1. `--skill ""` bypass — Not found. Commander passes empty string, but `!options.skill` is truthy for empty string... actually, in JS `!""` is `true`, so an empty string skill would correctly hit SKILL_REQUIRED. Safe.
2. Glob failure if no `.claude/skills/` — Not found. `globSync` returns `[]`, doesn't throw.
3. Dead `requiredOption` comments — Not found. Clean change, no leftover artifacts.
4. A009 false positive — Not found. The test fixture creates a `coding-standards` skill directory, and the glob discovers it. The stderr output contains the skill name from the available skills list.
5. Tab-only `--text` — Safe. `.trim()` handles tabs and whitespace.

## Previous Findings Resolution

### Previously UNSATISFIED Assertions
| ID | Previous Issue | Current Status | Resolution |
|----|----------------|----------------|------------|
| A009 | Test asserted `stderr.toContain('skill')` — Commander's error didn't list skill names | ✅ SATISFIED | Builder changed `requiredOption` to `option`; test now asserts `stderr.toContain('coding-standards')` (line 1868) |
| A010 | Test only checked `exitCode !== 0` — Commander exited before JSON output | ✅ SATISFIED | Builder changed `requiredOption` to `option`; test now parses JSON and asserts `json.error.code.toBe('SKILL_REQUIRED')` (line 1879) |

### Previous Findings
| Finding | Status | Notes |
|---------|--------|-------|
| Dead SKILL_REQUIRED error path (requiredOption prevented firing) | Fixed | `requiredOption` changed to `option`; manual `if (!options.skill)` guard at line 625 now reaches exitError |
| A009 test asserts wrong value | Fixed | Test now asserts `toContain('coding-standards')` matching contract |
| A010 test doesn't verify JSON | Fixed | Test now parses stdout and asserts `json.error.code === 'SKILL_REQUIRED'` |
| rule_text includes formatting prefix | Still present | Design choice matching spec mockup — accepted |
| Contract A009/A010 assume manual validation | No longer applicable | Contract and implementation now aligned after `option()` change |
| Proof chain JSON cosmetic diff | Still present | Not introduced by promote — pre-existing unicode normalization artifact |

## AC Walkthrough

- **AC1** (core promote lifecycle): ✅ PASS — Test at 1794-1816 verifies status→promoted, promoted_to set, dashboard regenerated, commit message correct. All assertions verified against contract.
- **AC2** (default rule text from summary): ✅ PASS — Test at 1821-1832 verifies `- Missing request validation` appended to Rules section, existing rule preserved.
- **AC3** (custom --text): ✅ PASS — Test at 1837-1857 verifies custom text in skill file and JSON `rule_text` field.
- **AC4** (--skill required): ✅ PASS — Tests at 1861-1881 verify: non-zero exit code, stderr contains `coding-standards` (available skill name), and JSON mode returns `SKILL_REQUIRED` error code. The `option()` + manual validation approach satisfies all three contract assertions (A008, A009, A010).
- **AC5** (skill not found): ✅ PASS — Test at 1884-1903 verifies SKILL_NOT_FOUND in JSON and human error message.
- **AC6** (--section gotchas): ✅ PASS — Test at 1907-1928 verifies rule lands in Gotchas section between headings, not in Rules.
- **AC7** (already promoted): ✅ PASS — Test at 1932-1947 verifies ALREADY_PROMOTED with promoted_to path in stderr.
- **AC8** (already closed + --force): ✅ PASS — Tests at 1951-1988 verify ALREADY_CLOSED without force, success with --force, status transitions to promoted.
- **AC9** (JSON envelope): ✅ PASS — Test at 1992-2007 verifies four-key envelope: command, timestamp, results.promoted_to, meta.chain_runs.
- **AC10** (duplicate detection): ✅ PASS — Tests at 2011-2051 verify warning emitted on >50% word overlap, exit code 0, and JSON mode includes duplicate_warning field.
- **AC11** (placeholder replacement): ✅ PASS — Test at 2055-2074 verifies `*Not yet captured*` replaced, rule appears in its place.
- **AC12** (commit message format): ✅ PASS — Test at 1814-1815 verifies `[proof] Promote F001 to coding-standards`.
- **AC13** (branch check): ✅ PASS — Test at 2078-2088 verifies WRONG_BRANCH error code.
- **AC14** (tests pass): ✅ PASS — 1733 passed, 0 failed, 2 skipped.
- **AC15** (no build errors): ✅ PASS — `pnpm run build` succeeds with full TURBO cache.
- **AC16** (empty text): ✅ PASS — Test at 2092-2103 verifies TEXT_EMPTY error code with whitespace-only text.
- **AC17** (missing section): ✅ PASS — Test at 2107-2122 verifies SECTION_NOT_FOUND error code.

## Blockers

No blockers. All 30 contract assertions satisfied, all 17 acceptance criteria pass. The two previously-UNSATISFIED assertions (A009, A010) are now SATISFIED after the `requiredOption → option` fix. Checked for: unused exports in new code (none — promote is registered via `addCommand`), unhandled error paths (all error codes have test coverage), sentinel tests (every tagged test asserts specific values matching contract matchers), unused parameters in the action handler (all used), and assumptions about external state (git remote check handles no-remote case gracefully).

## Findings

- **Code — `options.skill` typed as non-optional string despite being optional:** `packages/cli/src/commands/proof.ts:578` — The action handler signature types `skill` as `string`, but after changing from `requiredOption` to `option`, it can be `undefined`. The `if (!options.skill)` guard at line 625 catches this at runtime, but TypeScript's type system doesn't know — `skill` should be typed as `string | undefined` for correctness. Currently safe because the guard fires before any use, but a future refactor that moves the guard could introduce a runtime error without a type error.

- **Code — `rule_text` includes `- ` markdown prefix in JSON output:** `packages/cli/src/commands/proof.ts:841` — `rule_text` is set to `ruleLine` which includes the `- ` bullet prefix. The spec mockup shows this format (`"rule_text": "- Missing request validation"`), so it matches intent. Downstream consumers that want the raw text will need to strip the prefix. Design choice, not a bug — noted for API documentation. Still present from previous verification.

- **Test — A006 custom text test uses shell-escaped quotes:** `packages/cli/tests/commands/proof.test.ts:1841` — The `--text` value is passed as `'"Always validate request bodies before processing"'`, wrapping the text in double quotes that survive into the assertion. The test still satisfies A006 because the contract matcher is `contains` and the value matches. But it means the test exercises the quoted-string path rather than raw text. Minor — the assertion is correct.

- **Code — No summary truncation in human-readable promote output:** `packages/cli/src/commands/proof.ts:853` — Long finding summaries (up to 1000 chars) render untruncated in the `✓ Promoted {id}` output line. Known issue from proof chain context (also affects audit and health commands). Not a crash risk but degrades terminal readability for verbose findings.

- **Upstream — Proof chain JSON cosmetic diff from unicode em-dash normalization:** `.ana/proof_chain.json` — Still present from previous verification. Pre-existing artifact from JSON parse/serialize, not introduced by promote. Produces diff noise but no functional impact.

## Deployer Handoff

The promote subcommand is complete and all contract assertions are satisfied. The `requiredOption → option` fix from the previous rejection is clean — one command definition change and two test assertion updates, no side effects.

Test count: 1733 passed (up from 1657 baseline — 76 new tests for promote). No regressions. Build and lint clean.

The `options.skill` type mismatch (typed as `string` but can be `undefined`) is worth a follow-up type fix but doesn't affect runtime safety — the guard at line 625 catches it before any use.

## Verdict

**Shippable:** YES

30 of 30 contract assertions satisfied. 17 of 17 acceptance criteria pass. Both previously-UNSATISFIED assertions (A009, A010) now satisfied after the builder's fix. Tests pass, build clean, lint clean. No regressions. The implementation faithfully follows the close subcommand's lifecycle pattern with clean additions for skill file mutation and duplicate detection.
