# Verify Report: Clear the Deck Phase 2

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-26
**Spec:** .ana/plans/active/clear-the-deck-2/spec.md
**Branch:** feature/clear-the-deck-2

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/clear-the-deck-2/contract.yaml
  Seal: INTACT (hash sha256:e0f767bf92303cc146d8d7c4d50541438f39b1278f44175dc0ebd57f35d15673)

  A001  ✓ COVERED  "Every agent session gets the full 1M context window"
  A002  ✓ COVERED  "Verify asks the developer before starting verification"
  A003  ✓ COVERED  "Build no longer tells agents to skip asking permission"
  A004  ✓ COVERED  "Verify callouts use project-relative paths for better data quality"
  A005  ✓ COVERED  "Setup reads validation schema files to understand project patterns"
  A006  ✓ COVERED  "Setup surfaces validation and test findings in the context draft"
  A007  ✓ COVERED  "Setup reads auth config when the project has authentication"
  A008  ✓ COVERED  "The confusing slugDir2 variable name is cleaned up"
  A009  ✓ COVERED  "Setup validation checks use real scan data instead of null"
  A010  ✓ COVERED  "Build concerns are always present on proof chain entries"
  A011  ✓ COVERED  "ProofSummary build concerns are always present"
  A012  ✓ COVERED  "Completed work always records build concerns, even when empty"
  A013  ✓ COVERED  "All historical proof chain entries have consistent data"
  A014  ✓ COVERED  "File references resolve even when the file wasn't modified in the build"
  A015  ✓ COVERED  "Ambiguous file references stay unresolved rather than guessing wrong"
  A016  ✓ COVERED  "File resolution ignores dependency folders to avoid false matches"
  A017  ✓ COVERED  "File resolution ignores Anatomia's own data to avoid self-matching"
  A018  ✓ COVERED  "All proof chain write paths pass project root for file resolution"
  A019  ✓ COVERED  "Proof chain accumulation correctly counts callouts across pipeline runs"
  A020  ✓ COVERED  "All existing tests continue to pass after the changes"
  A021  ✓ COVERED  "Code meets lint standards with no new violations"

  21 total · 21 covered · 0 uncovered
```

Tests: 1486 passed, 0 failed, 2 skipped. Build: clean. Lint: 0 errors, 14 warnings (all pre-existing `@typescript-eslint/no-explicit-any` in test files — none introduced by this build).

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Every agent session gets the full 1M context window | ✅ SATISFIED | All 5 templates verified: `ana.md:3`, `ana-build.md:3`, `ana-plan.md:3`, `ana-verify.md:3`, `ana-setup.md:3` — all read `model: opus[1m]` |
| A002 | Verify asks the developer before starting verification | ✅ SATISFIED | `ana-verify.md:47-51` — new "### 2. Confirm Before Proceeding" section with "Found {slug} ready for verification. Should I proceed?" |
| A003 | Build no longer tells agents to skip asking permission | ✅ SATISFIED | `ana-build.md:30` — "Do not ask permission" replaced with "this is a read-only check, not a commitment to start work". Grep confirmed zero matches for "Do not ask permission" in build template. Plan template correctly retains it (line 32). |
| A004 | Verify callouts use project-relative paths for better data quality | ✅ SATISFIED | `ana-verify.md:323` — "Use project-relative paths in file references (e.g., `src/utils/helper.ts:42` not `helper.ts:42`). Basenames without paths degrade proof chain data quality." |
| A005 | Setup reads validation schema files to understand project patterns | ✅ SATISFIED | `ana-setup.md:228` — "If `stack.validation` is non-null, read up to 3 schema files to understand validation patterns and conventions" in Step 4 Codebase Investigation |
| A006 | Setup surfaces validation and test findings in the context draft | ✅ SATISFIED | `ana-setup.md:261` — "Include validation patterns and auth setup if discovered in Step 4." in Step 5 Architecture draft |
| A007 | Setup reads auth config when the project has authentication | ✅ SATISFIED | `ana-setup.md:230` — "If `stack.auth` is non-null, read auth configuration files — middleware, providers, session config" |
| A008 | The confusing slugDir2 variable name is cleaned up | ✅ SATISFIED | `packages/cli/src/commands/artifact.ts:721,723,724,754` — all `slugDir2` occurrences renamed to `slugDir`. Grep confirmed zero `slugDir2` remaining in file. |
| A009 | Setup validation checks use real scan data instead of null | ✅ SATISFIED | `packages/cli/src/commands/check.ts:1315-1316` — `const scanJson = await readScanJson(cwd);` then passed to `checkConsistency`. Null literal removed. |
| A010 | Build concerns are always present on proof chain entries | ✅ SATISFIED | `packages/cli/src/types/proof.ts:60` — `build_concerns: Array<{ summary: string; file: string \| null }>` (no `?`) |
| A011 | ProofSummary build concerns are always present | ✅ SATISFIED | `packages/cli/src/utils/proofSummary.ts:74` — `build_concerns: Array<{ summary: string; file: string \| null }>` (no `?`) |
| A012 | Completed work always records build concerns, even when empty | ✅ SATISFIED | `packages/cli/src/commands/work.ts:803` — `build_concerns: proof.build_concerns ?? [],` — always writes the field |
| A013 | All historical proof chain entries have consistent data | ✅ SATISFIED | Node verification: 0 of 17 entries missing `build_concerns`. All 7 backfilled entries (indices 0, 2, 3, 6, 11, 13, 14) have `"build_concerns": []` placed after `previous_failures`. |
| A014 | File references resolve even when the file wasn't modified in the build | ✅ SATISFIED | `packages/cli/tests/utils/proofSummary.test.ts:1202-1208` — creates `src/utils/helper.ts` in temp dir, calls `resolveCalloutPaths(items, [], tempDir)`, asserts `items[0].file === 'src/utils/helper.ts'` (contains `/`) |
| A015 | Ambiguous file references stay unresolved rather than guessing wrong | ✅ SATISFIED | `packages/cli/tests/utils/proofSummary.test.ts:1212-1221` — creates `src/a/index.ts` and `src/b/index.ts`, asserts file stays `'index.ts'` (no `/`) |
| A016 | File resolution ignores dependency folders to avoid false matches | ✅ SATISFIED | `packages/cli/tests/utils/proofSummary.test.ts:1224-1231` — creates only `node_modules/pkg/helper.ts`, asserts file stays `'helper.ts'` |
| A017 | File resolution ignores Anatomia's own data to avoid self-matching | ✅ SATISFIED | `packages/cli/tests/utils/proofSummary.test.ts:1234-1241` — creates only `.ana/plans/spec.md`, asserts file stays `'spec.md'` |
| A018 | All proof chain write paths pass project root for file resolution | ✅ SATISFIED | `packages/cli/src/commands/work.ts:808,809,813,814` — all 4 `resolveCalloutPaths` calls now include `projectRoot` as third argument |
| A019 | Proof chain accumulation correctly counts callouts across pipeline runs | ✅ SATISFIED | `packages/cli/tests/commands/work.test.ts:1097-1131` — patches verify report with 3 callouts, asserts `Chain: 1 run · 3 callouts` |
| A020 | All existing tests continue to pass after the changes | ✅ SATISFIED | 1486 passed, 0 failed, 2 skipped (baseline was 1481 + 5 new = 1486) |
| A021 | Code meets lint standards with no new violations | ✅ SATISFIED | 0 errors, 14 warnings — all pre-existing `@typescript-eslint/no-explicit-any` in unchanged test files |

## Independent Findings

**Predictions resolved:**

1. **"Template assertions tested loosely"** — Confirmed. A001-A007 target template content (text files). Pre-check reports COVERED because `@ana A001` tags from OTHER features' contracts exist in test files — not because there are tests for the template frontmatter. However, templates are text-only, not executable code. I verified all 5 templates by reading them directly. The coverage system's tag collision is a known limitation, not a build deficiency.

2. **"Verify template step cross-references broken after renumbering"** — Not found. On Startup steps renumbered correctly (1→1, new 2, 2→3, 3→4, 4→5, 5→6, 6→7). The Verification Process section (Steps 1-8) is independent and internally consistent: Step 3 predictions → resolved in Step 5, Step 4 reads code, all references checked.

3. **"Glob fallback tests use mocks"** — Not found. All 4 glob tests use real temp directories via `fs.promises.mkdtemp`, matching the spec pattern and project testing standards.

4. **"build_concerns fixtures missed in other test files"** — Not found. 1486 tests pass including all fixtures. TypeScript compilation succeeded (build clean), so all ProofChainEntry/ProofSummary object literals compile with the non-optional field.

5. **"proof_chain.json backfill placement inconsistent"** — Not found. All 7 backfilled entries have `build_concerns` after `previous_failures`, matching existing entry ordering. Entry 0 lacks `previous_failures` (pre-existing — spec says leave other missing fields as-is).

**Surprise finding:** None. The build was clean and focused.

**Over-building check:** No extra code, parameters, or features beyond the spec. All diffs map directly to specified file changes. Grep for new exports in changed files found nothing unspecified.

## AC Walkthrough

- [x] AC1: All 5 agent template frontmatter blocks specify `model: opus[1m]`. ✅ PASS — Verified by reading all 5 template files.
- [x] AC2: Verify template has a confirmation step between Find Work and Check Out. ✅ PASS — `ana-verify.md:47-51`, new step 2 "Confirm Before Proceeding".
- [x] AC3: Build template step 0 does not contain "Do not ask permission." ✅ PASS — Grep returns zero matches. Replaced with "read-only check" wording.
- [x] AC4: Verify template callout format section instructs project-relative paths. ✅ PASS — `ana-verify.md:323`, explicit instruction with example.
- [x] AC5: Setup template Step 3 instructs reading validation library files when detected. ✅ PASS — `ana-setup.md:228` in Step 4 "Stack-aware investigation" (spec File Changes section clarifies Step 4, not Step 3).
- [x] AC6: Setup template Step 4 findings for test patterns and schema files surfaced in Step 5 draft. ⚠️ PARTIAL — `ana-setup.md:261` surfaces "validation patterns and auth setup" but does not mention "test patterns" specifically. Contract assertion A006 (matcher: contains "validation") is mechanically satisfied. The AC's mention of "test patterns" is not represented in the template.
- [x] AC7: Setup template instructs reading auth config when `stack.auth` is non-null. ✅ PASS — `ana-setup.md:230`.
- [x] AC8: `artifact.ts` uses `slugDir` (not `slugDir2`) at the post-validation metadata write site. ✅ PASS — Lines 721, 723, 724, 754. Zero `slugDir2` remaining.
- [x] AC9: `validateSetupCompletion` passes scan.json to `checkConsistency` instead of null. ✅ PASS — `check.ts:1315-1316`.
- [x] AC10: `ProofChainEntry.build_concerns` is non-optional. ✅ PASS — `proof.ts:60`, no `?`.
- [x] AC11: `writeProofChain` always writes `build_concerns: []` when no concerns exist. ✅ PASS — `work.ts:803`, `proof.build_concerns ?? []`.
- [x] AC12: All 7 proof_chain.json entries backfilled with `"build_concerns": []`. ✅ PASS — Node verification: 0 entries without `build_concerns` across all 17 entries.
- [x] AC13: `resolveCalloutPaths` accepts optional `projectRoot` and uses `globSync` fallback. ✅ PASS — `proofSummary.ts:329-352`, new parameter and glob fallback with node_modules/.ana exclusion.
- [x] AC14: Glob fallback does NOT resolve ambiguous basenames (2+ matches). ✅ PASS — `proofSummary.ts:349` only resolves when `globMatches.length === 1`. Test at `proofSummary.test.ts:1212-1221`.
- [x] AC15: All `resolveCalloutPaths` call sites in `writeProofChain` pass `projectRoot`. ✅ PASS — `work.ts:808,809,813,814`, all 4 call sites include `projectRoot`.
- [x] AC16: A test exercises nonzero callout accumulation with M > 0 in output. ✅ PASS — `work.test.ts:1097-1131`, patches verify report with 3 callouts, asserts `Chain: 1 run · 3 callouts`.
- [x] AC17: Tests pass. ✅ PASS — 1486 passed, 0 failed, 2 skipped.
- [x] AC18: Lint passes. ✅ PASS — 0 errors, 14 pre-existing warnings.

## Blockers

No blockers. All 21 contract assertions satisfied. 17 of 18 ACs pass, 1 partial (AC6 — mechanically satisfied, missing "test patterns" mention is a minor scope gap in the template wording). No regressions. Checked for: unused exports in new code (none — resolveCalloutPaths parameter addition, no new exports), sentinel test patterns (all 5 new tests assert specific values not just existence), error paths that swallow silently (globSync has no try/catch — if projectRoot doesn't exist it will throw, but this is consistent with the existing pattern where projectRoot is validated upstream), and unhandled edge cases from the spec (none found beyond the globSync performance note below).

## Callouts

- **Code — Defensive `|| []` on guaranteed field:** `packages/cli/src/commands/work.ts:809` — `entry.build_concerns || []` is passed to `resolveCalloutPaths` even though `build_concerns` is set to `proof.build_concerns ?? []` two lines above (line 803). The `|| []` is dead code for the new entry path. For existing entries at line 814, `|| []` remains useful since chain data from JSON could theoretically lack the field despite backfill. Harmless but slightly misleading on line 809.

- **Code — globSync has no performance guard:** `packages/cli/src/utils/proofSummary.ts:345-349` — `globSync('**/' + basename, { cwd: projectRoot, ... })` traverses the entire project tree synchronously for each unresolved basename. Called up to 4 times per `writeProofChain` invocation (2 for new entry, 2 for each existing entry). On large monorepos this could be slow. No timeout, no file count limit, no early termination. Currently harmless — callout counts are small — but worth noting if the proof chain grows to dozens of entries with unresolved basenames.

- **Test — Template assertions rely on tag collision for coverage:** Contract assertions A001-A007 target template content. Pre-check reports COVERED because `@ana A001` etc. tags exist in test files from OTHER features. No test in this build actually verifies template frontmatter values or template content. Templates are text-only, so manual verification (which I performed) is the correct approach, but the coverage signal is misleading.

- **Upstream — AC6 mentions "test patterns" but template omits them:** The spec says "validation schemas and test patterns surfaced in Step 5 draft." The template at `packages/cli/templates/.claude/agents/ana-setup.md:261` says "Include validation patterns and auth setup" — no mention of test patterns. The contract assertion (A006) only checks for "validation" so it passes, but the next spec for setup should consider whether test pattern surfacing belongs in the architecture draft.

- **Code — globSync exception if projectRoot is invalid:** `packages/cli/src/utils/proofSummary.ts:345` — If `projectRoot` points to a non-existent directory, `globSync` will throw. The callers in `work.ts` pass `projectRoot` from `writeProofChain`'s parameter, which comes from `findProjectRoot()` — a validated path. But `resolveCalloutPaths` doesn't validate its own input. Consistent with the existing pattern (no defensive validation in utility functions), but worth knowing.

## Deployer Handoff

Clean merge. No migration steps — proof_chain.json backfill is already committed. No environment changes. No new dependencies (glob was already in package.json).

The template changes take effect when `ana init` or `ana setup` scaffolds new projects. Existing projects using the old templates won't auto-update — they keep their current agent templates until re-scaffolded. This is expected behavior, not an issue.

The `build_concerns` type change (non-optional) is backward-compatible with existing proof_chain.json files because:
1. All 17 entries in this project's chain are backfilled
2. The `|| []` fallbacks in work.ts remain for entries read from JSON (runtime safety)
3. TypeScript only enforces at compile time — JSON parsing doesn't check types

## Verdict

**Shippable:** YES

All 21 contract assertions satisfied. 1486 tests pass. Build and lint clean. Template changes verified by direct reading — all 5 frontmatter blocks, confirmation step, step 0 rewording, callout path instruction, validation/auth investigation, all correct. Code corrections verified by diff review and runtime checks. Glob fallback tested with real temp directories. Proof chain backfill verified by parsing all 17 entries. No regressions, no over-building, no guardrail violations. The AC6 partial (missing "test patterns" in template wording) is a minor spec-to-implementation gap that doesn't affect functionality — noted as upstream callout for next cycle.
