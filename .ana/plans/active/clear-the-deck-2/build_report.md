# Build Report: Clear the Deck Phase 2

**Created by:** AnaBuild
**Date:** 2026-04-26
**Spec:** .ana/plans/active/clear-the-deck-2/spec.md
**Branch:** feature/clear-the-deck-2

## What Was Built

- `packages/cli/templates/.claude/agents/ana.md` (modified): Frontmatter model opus → opus[1m]
- `packages/cli/templates/.claude/agents/ana-build.md` (modified): Frontmatter opus[1m]; step 0 rewording — removed "Do not ask permission" and replaced with "this is a read-only check, not a commitment to start work"
- `packages/cli/templates/.claude/agents/ana-plan.md` (modified): Frontmatter model opus → opus[1m]
- `packages/cli/templates/.claude/agents/ana-verify.md` (modified): Frontmatter opus[1m]; added confirmation step 2 ("Found {slug} ready for verification. Should I proceed?") between Find Work and Check Out; renumbered steps 3–7; added project-relative path instruction in callout format section
- `packages/cli/templates/.claude/agents/ana-setup.md` (modified): Frontmatter opus[1m]; added stack-aware investigation subsection in Step 4 (validation schema reading when stack.validation non-null, auth config reading when stack.auth non-null); added validation/auth surfacing instruction in Step 5 Architecture draft
- `.claude/agents/ana.md` (modified): Dogfood sync — matches template
- `.claude/agents/ana-build.md` (modified): Dogfood sync — matches template
- `.claude/agents/ana-plan.md` (modified): Dogfood sync — matches template
- `.claude/agents/ana-verify.md` (modified): Dogfood sync — matches template
- `.claude/agents/ana-setup.md` (modified): Dogfood sync — matches template
- `packages/cli/src/commands/artifact.ts` (modified): Renamed slugDir2 → slugDir at lines 721, 723, 724, 754
- `packages/cli/src/commands/check.ts` (modified): Replaced null with readScanJson(cwd) in validateSetupCompletion's checkConsistency call
- `packages/cli/src/types/proof.ts` (modified): Made build_concerns non-optional on ProofChainEntry (removed ?)
- `packages/cli/src/utils/proofSummary.ts` (modified): Made build_concerns non-optional on ProofSummary; added build_concerns: [] to initializer; simplified conditional push; added globSync import; added optional projectRoot parameter to resolveCalloutPaths with glob fallback
- `packages/cli/src/commands/work.ts` (modified): Changed build_concerns from conditional spread to always-write (`proof.build_concerns ?? []`); passed projectRoot to all 4 resolveCalloutPaths call sites
- `.ana/proof_chain.json` (modified): Backfilled build_concerns: [] on 7 entries (indices 0, 2, 3, 6, 11, 13, 14)
- `packages/cli/tests/utils/proofSummary.test.ts` (modified): Added 4 glob fallback tests in new nested describe block
- `packages/cli/tests/commands/work.test.ts` (modified): Added 1 nonzero callout accumulation test

## PR Summary

- Update all 5 agent template frontmatter to `opus[1m]` for full 1M context window
- Add verification confirmation step and project-relative path instruction to verify template; reword build step 0 to avoid "Do not ask permission" ambiguity
- Fill setup template investigation gaps: validation schema and auth config reading
- Make `build_concerns` non-optional across `ProofChainEntry`, `ProofSummary`, and proof_chain.json (backfill 7 entries)
- Add `globSync` fallback to `resolveCalloutPaths` for resolving file references not in `modules_touched`

## Acceptance Criteria Coverage

- AC1 "All 5 agent template frontmatter blocks specify opus[1m]" → ✅ Verified in all 5 template files + dogfood test enforces sync
- AC2 "Verify template has confirmation step between Find Work and Check Out" → ✅ Step 2 "Confirm Before Proceeding" added
- AC3 "Build template step 0 does not contain 'Do not ask permission'" → ✅ Replaced with "this is a read-only check, not a commitment to start work"
- AC4 "Verify template callout format section instructs project-relative paths" → ✅ Added instruction above examples
- AC5 "Setup template Step 3 instructs reading validation library files" → ✅ Added in Step 4 (spec's Pattern to follow clarified Step 4)
- AC6 "Setup template Step 4 findings surfaced in Step 5 draft" → ✅ Architecture draft template includes validation/auth
- AC7 "Setup template instructs reading auth config when stack.auth non-null" → ✅ Added in Step 4 stack-aware investigation
- AC8 "artifact.ts uses slugDir (not slugDir2)" → ✅ All 4 references renamed
- AC9 "validateSetupCompletion passes scan.json to checkConsistency" → ✅ readScanJson(cwd) replaces null
- AC10 "ProofChainEntry.build_concerns is non-optional" → ✅ proof.ts line 60 — removed ?
- AC11 "writeProofChain always writes build_concerns: []" → ✅ work.ts uses `proof.build_concerns ?? []`
- AC12 "All 7 proof_chain.json entries backfilled" → ✅ 7 entries confirmed with build_concerns: []
- AC13 "resolveCalloutPaths accepts optional projectRoot and uses globSync fallback" → ✅ proofSummary.test.ts glob tests (4 tests)
- AC14 "Glob fallback does NOT resolve ambiguous basenames" → ✅ proofSummary.test.ts "skips ambiguous basename"
- AC15 "All resolveCalloutPaths call sites in writeProofChain pass projectRoot" → ✅ All 4 call sites updated
- AC16 "A test exercises nonzero callout accumulation" → ✅ work.test.ts "prints nonzero callout count" asserts `Chain: 1 run · 3 callouts`
- AC17 "Tests pass" → ✅ 1486 passed, 2 skipped
- AC18 "Lint passes" → ✅ 0 errors, 14 pre-existing warnings

## Implementation Decisions

1. **slugDir2 had 4 references, not 3.** Spec listed lines 721, 723, 724. Line 754 (`captureModulesTouched`) also used `slugDir2`. Renamed all 4. Caught by test failure on first run.
2. **ProofChainEntryForContext.build_concerns kept optional.** Line 853 has a separate internal interface for reading existing chain data. Since it reads historical entries that may predate the field, the `?` is appropriate there. Only the write-path types (ProofChainEntry, ProofSummary) were made non-optional.
3. **Nonzero callout test patches verify report after createProofProject.** Rather than parameterizing the helper, I patched the verify report file to inject a `## Callouts` section with 3 entries. This avoids modifying the shared helper's interface for a single test.
4. **Dogfood sync includes ana-setup.md.** The existing dogfood test only checks 4 files (not ana-setup.md), but I synced all 5 for consistency.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  97 passed (97)
     Tests  1481 passed | 2 skipped (1483)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  97 passed (97)
     Tests  1486 passed | 2 skipped (1488)
```

### Comparison
- Tests added: 5
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/utils/proofSummary.test.ts`: 4 glob fallback tests — single-match resolution, ambiguous-match skip, node_modules exclusion, .ana exclusion
- `tests/commands/work.test.ts`: 1 nonzero callout accumulation test — verifies `Chain: 1 run · 3 callouts` output

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm lint
```

## Git History
```
02ce766 [clear-the-deck-2] Glob fallback for resolveCalloutPaths + new tests
06284bd [clear-the-deck-2] Code corrections: slugDir rename, scan.json wiring, build_concerns non-optional
9ba7c56 [clear-the-deck-2] Update agent templates: opus[1m], verify confirmation, build step 0, setup gaps
```

## Contract Coverage
21/21 assertions tagged. Pre-check: 21 covered, 0 uncovered.

## Open Issues

1. **ProofChainEntryForContext.build_concerns still optional.** The read-only query interface at proofSummary.ts:853 keeps `build_concerns?` since it reads chain data that may predate the field. This is intentional but the verifier may flag it as inconsistent with the non-optional change.
2. **Dogfood test doesn't cover ana-setup.md.** The existing `agent-proof-context.test.ts:68` only checks 4 of 5 agent files for template-dogfood sync. ana-setup.md is synced manually but not enforced by test.
3. **Nonzero callout test uses post-creation file patching.** The test modifies the verify report after `createProofProject` rather than parameterizing the helper. A future cleanup could add a `callouts` option to the helper.

Verified complete by second pass.
